import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { originalRepeatContext, repeatEligibility, movementStepCheck,
  heldFollowUpEligibility, repeatAreaAttack, useHeldFollowUp,confirmRepeatedAttackDamage,confirmHeldHellfireHealthDamage } from '../scripts/repeat-power-attacks.mjs';
import { rollSignature } from '../scripts/multi-target-combat.mjs';
import { getPowerDamageFactor, calculatePowerDamage } from '../scripts/power-fantastic-damage.mjs';
const powers=JSON.parse(fs.readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const power=n=>powers.find(x=>x.name===n);
const names=['Unstoppable Assault','Unrelenting Smash','Hellfire Chains','Coiling Crush'];
const SYS='multiverse-d616';
const fakeToken=(id,actor,x=0)=>({id,uuid:`Scene.s.Token.${id}`,parent:{id:'s'},x,y:0,width:1,height:1,actor,name:id});
function env(){
 const actor={id:'hero',uuid:'Actor.hero',system:{focus:{value:55},attributes:{rank:{value:5}},abilities:{mle:{damageMultiplier:5},ego:{damageMultiplier:4}}},
  items:new Map(),effects:[],flags:{},testUserPermission(){return true;},getRollData(){return {abilities:{mle:{value:5},ego:{value:4}}};},
  getFlag(s,k){return this.flags[k];},async setFlag(s,k,v){this.flags[k]=v;},async update(data){if('system.focus.value'in data)this.system.focus.value=data['system.focus.value'];}};
 const tok=fakeToken('hero',actor,0);
 const enemy={id:'enemy',uuid:'Actor.enemy',effects:[],system:{abilities:{res:{defense:15},mle:{defense:15}}}};
 const t1=fakeToken('v1',enemy,100),t2=fakeToken('v2',enemy,200);
 const scene={id:'s',grid:{size:100,distance:5},tokens:new Map([['hero',tok],['v1',t1],['v2',t2]])};
 const c={id:'cHero',tokenId:'hero',actor};
 const combat={id:'c',started:true,round:2,turn:0,combatant:c,combatants:[c]};
 const state={actionUsed:1,actionMax:1,reactionUsed:0,reactionMax:1,movementUsed:0,movementMax:5};
 const tracker={getState(){return state;},async consumeMovement(){state.movementUsed=5;return true;}};
 globalThis.game={user:{id:'p',isGM:false},combat,scenes:new Map([['s',scene]]),actors:new Map([['hero',actor]]),messages:new Map(),
  settings:{get(scope,key){return key==='disableAllAutomations'?false:true;}},multiverseD616:{turnTracker:tracker}};
 globalThis.canvas={grid:{size:100},scene,tokens:{controlled:[{document:tok,actor}]}};
 globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
 for(const name of names){const p=power(name);assert.ok(p,name);const item={...p,id:name,name,type:'power',actor,system:{...p.system},getRollData(){return actor.getRollData();}};actor.items.set(name,item);}
 return {actor,tok,t1,t2,scene,combat,c,state,tracker};
}
function originalMsg(e,itemName,targets=[e.t1]){
 const flags={itemId:itemName,damageMultiplier:{base:4,finalDM:4},focusDamageBonus:0,repeatAttack:{...originalRepeatContext(e.actor.items.get(itemName),e.actor,targets,e.tok),movementAtRoll:0}};
 const msg={id:'orig',speaker:{scene:'s',token:'hero',actor:'hero'},rolls:[{total:15}],flags,
  getFlag(s,k){return flags[k];},async setFlag(s,k,v){flags[k]=v;},async unsetFlag(s,k){delete flags[k];}};
 game.messages.set(msg.id,msg);return msg;
}
test('catálogo: poderes de repetição têm custos, movimento e turnos específicos',()=>{
 const text=p=>String(power(p)?.system?.effect??'');
 for(const name of ['Unstoppable Assault','Unrelenting Smash']){
   assert.match(text(name),/15/);assert.match(text(name),/Focus/);assert.match(text(name),/metade/i);
 }
 assert.match(text('Hellfire Chains'),/Resilience|Resistência/i);
 assert.match(text('Coiling Crush'),/a[cç][aã]o de movimento/i);
});
test('dano especial: esmagar inicial não fere no comum; repetição usa fórmula normal; ambos os ataques de área metade/integral',()=>{
 assert.equal(getPowerDamageFactor('Coiling Crush',{fantastic:false,enabled:true}),0);
 assert.equal(getPowerDamageFactor('Coiling Crush',{fantastic:true,enabled:true}),1);
 for(const name of ['Unstoppable Assault','Unrelenting Smash']){
   assert.equal(getPowerDamageFactor(name,{fantastic:false,enabled:true}),0.5,name);
   assert.equal(getPowerDamageFactor(name,{fantastic:true,enabled:true}),1,name);
 }
 assert.equal(getPowerDamageFactor(null,{fantastic:false}),1);
 assert.equal(getPowerDamageFactor(null,{fantastic:true}),2);
});
test('mesmo turno, alvo novo e Focus + Movimento disponível são obrigatórios',()=>{
 const e=env();const source=originalMsg(e,'Unrelenting Smash');
 const base={item:e.actor.items.get('Unrelenting Smash'),chain:source.flags.repeatAttack,
  actor:e.actor,combat:e.combat,combatant:e.c,state:e.state};
 assert.equal(repeatEligibility({...base,targets:[e.t2]}).ok,true);
 assert.match(repeatEligibility({...base,targets:[e.t1]}).reason,/uma vez/i);
 e.actor.system.focus.value=14;assert.match(repeatEligibility({...base,targets:[e.t2]}).reason,/15 Focus/);
 e.actor.system.focus.value=60;e.state.movementUsed=5;assert.match(repeatEligibility({...base,targets:[e.t2]}).reason,/Movimento/);
 e.state.movementUsed=0;e.combat.round=3;assert.match(repeatEligibility({...base,targets:[e.t2]}).reason,/mesmo turno/);
});
test('entre repetições: no máximo metade da velocidade e não aceitar movimento não registrado',()=>{
 const e=env(),chain=originalRepeatContext(e.actor.items.get('Unstoppable Assault'),e.actor,[e.t1],e.tok);
 const okay=movementStepCheck(chain,e.tok,e.state,e.scene,canvas.grid);assert.equal(okay.ok,true);
 e.tok.x=100;
 assert.equal(movementStepCheck(chain,e.tok,e.state,e.scene,canvas.grid).ok,false);
 e.state.movementUsed=2;
 assert.equal(movementStepCheck(chain,e.tok,e.state,e.scene,canvas.grid).ok,true);
 e.state.movementUsed=3;
 assert.equal(movementStepCheck(chain,e.tok,e.state,e.scene,canvas.grid).ok,false);
});
test('repetir ataques gasta +15 Focus sem nova Ação Padrão e gera alvo distinto',async()=>{
 const e=env(),original=originalMsg(e,'Unrelenting Smash');
 original.flags.repeatAttackReady={confirmed:true,rollSignature:rollSignature(original.rolls[0])};
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{constructor(formula,data,options){this.formula=formula;this.data=data;this.options=options;}
  async evaluate(){this.total=20;return this;}
  async toMessage({flags}){assert.equal(flags[SYS].repeatAttack.step,1);assert.equal(flags[SYS].focusSpent,15);
   assert.deepEqual(flags[SYS].targets.map(x=>x.uuid),[e.t2.uuid]);return {id:'next'};}}}};
 globalThis.ChatMessage={getSpeaker:()=>({scene:'s',token:'hero',actor:'hero'})};
 e.tok.x=100;e.state.movementUsed=1;
 const base=await repeatAreaAttack(original,{targets:[e.t2]});
 assert.equal(base.id,'next');assert.equal(e.actor.system.focus.value,40);
 assert.equal(e.state.actionUsed,1);
 assert.equal(original.flags.repeatAttackConsumed,true);
 await assert.rejects(()=>repeatAreaAttack(original,{targets:[e.t2]}),/já foi repetido/i);
});
test('Hellfire Chains exige alvo realmente preso, concentração viva e rodada seguinte',()=>{
 const e=env(),actor=e.actor;
 const source=originalMsg(e,'Hellfire Chains',[e.t1]);source.flags.repeatInitial={combatId:'c',round:2};
 const flags={powerCondition:{messageId:source.id,sourceActorUuid:actor.uuid,sourceItemId:'Hellfire Chains',
   powerName:'Hellfire Chains',recipientUuid:e.t1.uuid,status:'grabbed',concentrationEffectId:'con1'}};
 e.t1.actor.effects=[{id:'cond',disabled:false,flags:{[SYS]:flags}}];
 actor.effects=[{id:'con1',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'Hellfire Chains'}}}}];
 const args={actor,token:e.tok,target:e.t1,powerName:'Hellfire Chains',combat:e.combat,tracker:e.tracker};
 assert.match(heldFollowUpEligibility(args).reason,/rodada seguinte/);
 e.combat.round=3;assert.equal(heldFollowUpEligibility(args).ok,true);
 actor.effects=[];assert.match(heldFollowUpEligibility(args).reason,/Concentra/);
});
test('Coiling Crush só consome Movimento em turno posterior com alvo imobilizado pelo poder',()=>{
 const e=env(),actor=e.actor;
 const source=originalMsg(e,'Coiling Crush',[e.t1]);source.flags.repeatInitial={combatId:'c',round:1};
 e.t1.actor.effects=[{disabled:false,flags:{[SYS]:{powerCondition:{messageId:source.id,sourceActorUuid:actor.uuid,
   sourceItemId:'Coiling Crush',powerName:'Coiling Crush',recipientUuid:e.t1.uuid,status:'paralyzed',concentrationEffectId:'conc'}}}}];
 actor.effects=[{id:'conc',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'Coiling Crush'}}}}];
 const args={actor,token:e.tok,target:e.t1,powerName:'Coiling Crush',combat:e.combat,tracker:e.tracker};
 assert.equal(heldFollowUpEligibility(args).ok,true);
 e.state.movementUsed=5;assert.match(heldFollowUpEligibility(args).reason,/Movimento/);
});
function holdFixture(name){
 const e=env(),source=originalMsg(e,name,[e.t1]);source.flags.repeatInitial={combatId:'c',round:1};
 const status=name==='Coiling Crush'?'paralyzed':'grabbed';
 const conc='conc-'+name;
 e.t1.actor.effects=[{id:'status',disabled:false,flags:{[SYS]:{powerCondition:{messageId:source.id,sourceActorUuid:e.actor.uuid,
   sourceItemId:name,powerName:name,recipientUuid:e.t1.uuid,status,concentrationEffectId:conc}}}}];
 e.actor.effects=[{id:conc,disabled:false,flags:{[SYS]:{concentrationPower:{itemId:name}}}}];
 let rolled=0,focusCards=[];
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{
   constructor(formula,data,options){this.formula=formula;this.options=options;}
   async evaluate(){this.total=20;this.terms=[{rolls:[{dice:[{results:[{result:3,active:true}]}]},{dice:[{results:[{result:2,active:true}]}]},{dice:[{results:[{result:3,active:true}]}]}]}];rolled++;return this;}
   async toMessage({flags}){assert.equal(flags[SYS].attackTarget,'res');assert.equal(flags[SYS].skipPowerConditions,true);
     return {id:'roll-'+rolled,speaker:{scene:'s',token:'hero',actor:'hero'},rolls:[this],flags,getFlag(s,k){return flags[SYS][k];}};}
 }}};
 globalThis.ChatMessage={getSpeaker:()=>({scene:'s',token:'hero',actor:'hero'}),async create(data){focusCards.push(data);return data;}};
 return {...e,source,get rolled(){return rolled;},focusCards};
}
test('Hellfire Chains: um teste adicional na rodada seguinte gera dano Health e Focus separados, sem pagar outra ativação',async()=>{
 const e=holdFixture('Hellfire Chains');
 const rolled=await useHeldFollowUp(e.actor,'Hellfire Chains',{targets:[e.t1]});
 assert.ok(rolled?.id);assert.equal(e.rolled,1,'só uma rolagem avaliada');
 assert.equal(e.focusCards.length,0,'Focus não aparece antes de confirmar o primeiro dano');
 game.messages.set(rolled.id,rolled);
 const dmg={id:'health-confirm',flags:{sourceMessageId:rolled.id},getFlag(s,k){return this.flags[k];},async setFlag(s,k,v){this.flags[k]=v;},async unsetFlag(s,k){delete this.flags[k];}};
 game.user.isGM=true;
 assert.equal(await confirmHeldHellfireHealthDamage(dmg,'full',[{targetUuid:e.t1.uuid,blocked:false,heal:false}]),true);
 assert.equal(e.focusCards.length,1,'Focus aparece só depois de DAMAGE de Health');
 assert.equal(await confirmHeldHellfireHealthDamage(dmg,'full',[{targetUuid:e.t1.uuid,blocked:false,heal:false}]),false,'não duplicar card');
 assert.equal(e.focusCards[0].flags[SYS].damageType,'focus');
 assert.doesNotMatch(e.focusCards[0].content,/sofre \d+ de dano/i,'não anunciar Focus aplicado antes da confirmação');
 assert.ok(!e.focusCards[0].rolls?.length,'Focus não dispara segunda animação de dados');
 assert.equal(e.focusCards[0].flags[SYS].damageApplication.entries[0].category,'focus');
 assert.equal(e.actor.system.focus.value,55,'sem novo gasto Focus');
 assert.equal(e.state.actionUsed,1,'nenhuma outra ação padrão');
 await assert.rejects(()=>useHeldFollowUp(e.actor,'Hellfire Chains',{targets:[e.t1]}),/Já executou/);
});
test('Coiling Crush: ataque posterior usa movimento inteiro, um teste Melee vs Resilience e nenhum custo de Focus extra',async()=>{
 const e=holdFixture('Coiling Crush');
 const rolled=await useHeldFollowUp(e.actor,'Coiling Crush',{targets:[e.t1]});
 assert.ok(rolled?.id);assert.equal(e.rolled,1);
 assert.equal(e.state.movementUsed,5);
 assert.equal(e.actor.system.focus.value,55);
 assert.equal(e.focusCards.length,0);
 await assert.rejects(()=>useHeldFollowUp(e.actor,'Coiling Crush',{targets:[e.t1]}),/Já executou/);
});

test('v0.2.66: repetição liberada apenas pelo card de dano confirmado pelo Mestre',async()=>{
 const e=env(),source=originalMsg(e,'Unstoppable Assault');
 const sig=rollSignature(source.rolls[0]);
 const damage={id:'damage1',flags:{damageApplication:{rollSignature:sig}},
   getFlag(s,k){return this.flags[k];},async setFlag(s,k,v){this.flags[k]=v;}};
 game.user.isGM=true;
 const separateFollowUps=[];
 globalThis.ChatMessage={async create(data){separateFollowUps.push(data);return {id:'followup-1'};}};
 assert.equal(await confirmRepeatedAttackDamage(damage,'full',[{targetUuid:e.t1.uuid,blocked:false,heal:false}]),false,'sem vinculo ao ataque original');
 damage.flags.sourceMessageId=source.id;
 assert.equal(await confirmRepeatedAttackDamage(damage,'heal',[{targetUuid:e.t1.uuid,heal:true}]),false);
 assert.equal(await confirmRepeatedAttackDamage(damage,'full',[{targetUuid:e.t1.uuid,blocked:true,heal:false}]),false);
 assert.equal(await confirmRepeatedAttackDamage(damage,'full',[{targetUuid:e.t1.uuid,blocked:false,heal:false}]),true);
 assert.equal(source.flags.repeatAttackReady.damageMessageId,'damage1');
 assert.equal(source.flags.repeatAttackReady.followUpCardId,'followup-1');
 assert.equal(separateFollowUps.length,1);
 assert.equal(separateFollowUps[0].flags[SYS].repeatAttackFollowUpReady.sourceMessageId,source.id);
 assert.equal(separateFollowUps[0].flags[SYS].repeatAttackFollowUpReady.rollSignature,sig);
 assert.equal(damage.flags.repeatAttackFollowUpReady,undefined,'the DAMAGE card itself must not contain repeat control');
});

test('v0.2.66: botão de repetição pertence ao card de DANO, nunca à rolagem original',()=>{
 const code=fs.readFileSync(new URL('../scripts/repeat-power-attacks.mjs',import.meta.url),'utf8');
 assert.match(code,/repeatAttackFollowUpReady/);
 assert.match(code,/followUpCardId/);
 assert.match(code,/ChatMessage.create/);
 assert.match(code,/chooseSmartTargets\(actorItem,\{force:true\}\)/);
 assert.match(code,/repeatAttackReady/);
 const main=fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/repeatedOrHeld/);
});

test('v0.2.66: o card de Focus de Hellfire Chains tem dano estruturado, sem rolar outra vez',()=>{
 const code=fs.readFileSync(new URL('../scripts/repeat-power-attacks.mjs',import.meta.url),'utf8');
 assert.match(code,/heldFocusDamageCardData/);
 assert.match(code,/damageApplication:\{version:1/);
 assert.doesNotMatch(code,/rolls:\[message\.rolls\[0\]\]/);
});

test('v0.2.66: Cancelar Combate Inteligente controla verificação de alcance dos ataques seguintes',async()=>{
 const e=env(),original=originalMsg(e,'Unstoppable Assault');
 original.flags.repeatAttackReady={confirmed:true,rollSignature:rollSignature(original.rolls[0])};
 e.t2.x=1200;
 let created=0;
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{
   async evaluate(){return this;}
   async toMessage(){created++;return {id:'new-roll'};}
 }}};
 globalThis.ChatMessage={getSpeaker:()=>({scene:'s',token:'hero',actor:'hero'})};
 // Mestre assinalou a opção: não bloquear o alcance.
 game.settings.get=(sys,key)=>key==='disableAllAutomations'?false:true;
 assert.equal((await repeatAreaAttack(original,{targets:[e.t2]}))?.id,'new-roll');
 assert.equal(created,1);
 // Novo ataque, agora com Combate Inteligente ligado: deve avisar sobre alcance.
 const again=originalMsg(e,'Unstoppable Assault');
 again.flags.repeatAttackReady={confirmed:true,rollSignature:rollSignature(again.rolls[0])};
 e.actor.system.focus.value=55;
 game.settings.get=(sys,key)=>key==='cancelarCombateInteligente'?false:key==='disableAllAutomations'?false:true;
 await assert.rejects(()=>repeatAreaAttack(again,{targets:[e.t2]}),/fora do alcance/i);
 assert.equal(created,1);
});
