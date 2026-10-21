import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ricoOriginalContext,ricoEligibility,ricoTargetCheck,confirmRicoShieldDamage,
  useRicoShieldBounce,isRicochetPower } from '../scripts/rico-shield-chain.mjs';
import { resolvePowerRoll } from '../scripts/power-rolls.mjs';
import { rollSignature } from '../scripts/multi-target-combat.mjs';
const powers=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
function fixturePower(name){return powers.find(i=>i.name===name);}
const face=(n)=>({results:[{active:true,result:n}]});
function dice(total=21,marvel=1){
 const md={constructor:{name:'MarvelDie'},results:[{active:true,result:marvel}]};
 return {total,isFantastic:marvel===1,options:{},dice:[],terms:[{roll:{terms:[{rolls:[{dice:[face(3)]},{dice:[md]},{dice:[face(2)]}]}]}}]};
}
function mock(name='Rico-Shield',fantastic=true){
 const sourceActor={id:'a1',uuid:'Actor.a1',name:'Escudeiro',system:{attributes:{rank:{value:3}}},
  items:new Map(),effects:[],statuses:[],testUserPermission(){return true}};
 const item={id:'power1',type:'power',name,system:{...fixturePower(name).system},actor:sourceActor,
  getRollData(){return {formula:'{1d6,1dm,1d6}+@agl.value',actor:{agl:{value:4}}}}};
 sourceActor.items.set(item.id,item);
 const mkTok=(id,x,actor)=>({id,uuid:`Scene.scene.Token.${id}`,documentName:'Token',x,y:0,width:1,height:1,
  actor,texture:{src:'foo.webp'},parent:{id:'scene'},name:id});
 const attackToken=mkTok('attacker',0,sourceActor);
 const tActors=[{id:'v1',uuid:'Actor.v1',name:'Primeiro'},{id:'v2',uuid:'Actor.v2',name:'Segundo'},
  {id:'v3',uuid:'Actor.v3',name:'Terceiro'}].map(a=>({...a,system:{abilities:{agl:{defense:14}}},effects:[],statuses:[]}));
 const t1=mkTok('one',100,tActors[0]),t2=mkTok('two',200,tActors[1]),t3=mkTok('three',300,tActors[2]);
 const scene={id:'scene',grid:{size:100,distance:5},tokens:new Map([[attackToken.id,attackToken],[t1.id,t1],[t2.id,t2],[t3.id,t3]])};
 const combat={id:'combat',started:true,round:1,turn:0};
 const flags={itemId:item.id,ability:'agl',attackTarget:'agl',damageType:'health',
  damageMultiplier:{base:4,finalDM:4},focusDamageBonus:0,
  ricoShield:{step:0,visited:[t1.uuid],lastTargetUuid:t1.uuid,traveledSpaces:1,combatId:'combat',round:1,turn:0}};
 const original={id:'message0',author:{id:'player'},speaker:{scene:'scene',token:'attacker',actor:'a1'},
  rolls:[dice(21,fantastic?1:2)],getFlag(_sys,key){return flags[key]},
  async setFlag(_sys,key,value){flags[key]=value;return value},async unsetFlag(_sys,key){delete flags[key]}};
 let created=[];
 globalThis.game={user:{id:'player',isGM:false},settings:{get:(scope,key)=>scope==='core'?'public':undefined},combat,
  scenes:new Map([[scene.id,scene]]),actors:new Map([[sourceActor.id,sourceActor]]),messages:new Map([[original.id,original]])};
 globalThis.canvas={grid:{size:100},scene};
 globalThis.foundry={utils:{escapeHTML:s=>s}};
 globalThis.fromUuid=async uuid=>[attackToken,t1,t2,t3].find(t=>t.uuid===uuid)??null;
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{
  constructor(formula,data,options){this.formula=formula;this.data=data;this.options=options;}
  async toMessage(messageData){created.push(messageData);const data=messageData.flags['multiverse-d616'];
   const next={id:`bounce${created.length}`,author:{id:game.user.id},speaker:messageData.speaker,rolls:[dice()],
     getFlag:(_ns,k)=>data[k],async setFlag(_ns,k,value){data[k]=value},async unsetFlag(_ns,k){delete data[k]}};
   game.messages.set(next.id,next);return next;}
 }}};
 return {item,sourceActor,flags,scene,original,combat,attackToken,t1,t2,t3,created,
  ready:()=>({rollSignature:rollSignature(original.rolls[0]),targetUuid:t1.uuid,confirmed:true}),
  confirmMessage:()=>({getFlag(_ns,key){return {
   sourceMessageId:original.id,damageApplication:{rollSignature:rollSignature(original.rolls[0])}}[key]}})};
}
test('auditoria: Rico-Shield e Elemental Ricochet repetem em Fantástico; poderes de gasto adicional são distintos',()=>{
 for(const n of ['Rico-Shield','Elemental Ricochet'])assert.ok(isRicochetPower({type:'power',name:n}));
 for(const n of ['Unstoppable Assault','Unrelenting Smash','Hellfire Chains'])assert.equal(isRicochetPower({type:'power',name:n}),false);
 assert.equal(resolvePowerRoll(fixturePower('Elemental Ricochet')).attack,true,'legado attack:false corrigido apenas em runtime');
});
test('primeiro ataque registra alvo e trajetória, sem fabricar alvo extra',()=>{
 const f=mock();const state=ricoOriginalContext(f.item,f.sourceActor,[{uuid:f.t1.uuid}],f.attackToken,f.scene,canvas.grid);
 assert.deepEqual(state.visited,[f.t1.uuid]);assert.equal(state.traveledSpaces,1);
 assert.equal(ricoOriginalContext(f.item,f.sourceActor,[],f.attackToken,f.scene,canvas.grid),null);
 assert.equal(ricoOriginalContext(f.item,f.sourceActor,[{uuid:f.t1.uuid},{uuid:f.t2.uuid}],f.attackToken,f.scene,canvas.grid),null);
});
test('só o Mestre confirma um acerto Fantástico; sem dano confirmado, nenhum botão',async()=>{
 const f=mock();assert.equal(ricoEligibility({source:f.original,actor:f.sourceActor,item:f.item,user:game.user,combat:f.combat}).ok,false);
 assert.equal(await confirmRicoShieldDamage(f.confirmMessage(),'full',[{targetUuid:f.t1.uuid,blocked:false}]),false,'jogador não confirma');
 game.user={id:'gm',isGM:true};
 assert.equal(await confirmRicoShieldDamage(f.confirmMessage(),'full',[{targetUuid:f.t1.uuid,blocked:false}]),true);
 assert.equal(f.flags.ricoShieldReady.targetUuid,f.t1.uuid);
 assert.equal(ricoEligibility({source:f.original,ready:f.flags.ricoShieldReady,actor:f.sourceActor,item:f.item,user:game.user,combat:f.combat}).ok,true);
});
test('falha/fantástico sem acerto/proteção que absorveu bloqueia ricochete',async()=>{
 for(const {total,marvel,blocked} of [{total:21,marvel:2,blocked:false},{total:4,marvel:1,blocked:false},{total:21,marvel:1,blocked:true}]){
  const f=mock();f.original.rolls=[dice(total,marvel)];game.user={id:'gm',isGM:true};
  assert.equal(await confirmRicoShieldDamage(f.confirmMessage(),'full',[{targetUuid:f.t1.uuid,blocked}]),false);
  assert.equal(f.flags.ricoShieldReady,undefined);
 }
});
test('alcance acumulado, alvos distintos e cena são verificados',()=>{
 const f=mock();const c=f.flags.ricoShield;
 assert.equal(ricoTargetCheck({chain:c,newTarget:f.t1,lastTarget:f.t1,scene:f.scene,sourceToken:f.attackToken,maxRange:30}).ok,false);
 const yes=ricoTargetCheck({chain:c,newTarget:f.t2,lastTarget:f.t1,scene:f.scene,sourceToken:f.attackToken,maxRange:30});
 assert.equal(yes.ok,true);assert.equal(yes.travel,2);
 const tooFar=ricoTargetCheck({chain:{...c,traveledSpaces:29.5},newTarget:f.t2,lastTarget:f.t1,scene:f.scene,sourceToken:f.attackToken,maxRange:30});
 assert.equal(tooFar.ok,false);
});
test('novo ricochete cria rolagem independente sem novo Focus, ação ou Shield Thrown',async()=>{
 const f=mock();f.flags.ricoShieldReady=f.ready();
 const next=await useRicoShieldBounce(f.original,{targets:[f.t2]});
 assert.equal(f.created.length,1);assert.equal(next.getFlag(null,'ricoShield').step,1);
 assert.equal(next.getFlag(null,'ricoShield').traveledSpaces,2);
 assert.deepEqual(next.getFlag(null,'ricoShield').visited,[f.t1.uuid,f.t2.uuid]);
 assert.equal(next.getFlag(null,'focusSpent'),0);
 assert.equal(next.getFlag(null,'focusAuto'),true);
 assert.equal(next.getFlag(null,'targets')[0].uuid,f.t2.uuid);
 assert.ok(f.flags.ricoShieldConsumed);
 await assert.rejects(useRicoShieldBounce(f.original,{targets:[f.t3]}),/já foi realizado/);
});
test('retorno de turno interrompe sequência; desligar grupo interrompe apenas ricochetes',async()=>{
 const f=mock();f.flags.ricoShieldReady=f.ready();f.combat.turn=1;
 await assert.rejects(useRicoShieldBounce(f.original,{targets:[f.t2]}),/deve continuar/);
 f.combat.turn=0;
 const orig=game.settings.get;game.settings.get=(_sys,key)=>key==='automation_extraAttacks'?false:undefined;
 await assert.rejects(useRicoShieldBounce(f.original,{targets:[f.t2]}),/desativados/);
 game.settings.get=orig;
});
test('Elemental Ricochet mantém metadados elementais sem taxa extra',async()=>{
 const f=mock('Elemental Ricochet');f.flags.ricoShieldReady=f.ready();
 f.flags.elementalFantastic={key:'ice',label:'Ice',text:'Congela'};
 const next=await useRicoShieldBounce(f.original,{targets:[f.t2]});
 assert.deepEqual(next.getFlag(null,'elementalFantastic'),f.flags.elementalFantastic);
 assert.equal(next.getFlag(null,'focusSpent'),0);
});
test('o botão no card realmente despacha o ricochete; não aparece antes da confirmação',async()=>{
 const f=mock();
 const hooks=new Map();const listeners=new Map();
 globalThis.HTMLElement=class {};
 const container={children:[],appendChild(c){this.children.push(c)}};
 const html=new HTMLElement();html.querySelector=selector=>selector==='.message-content'?container:null;
 globalThis.document={createElement:()=>({dataset:{},disabled:false}),addEventListener:(event,cb)=>listeners.set(event,cb)};
 globalThis.Hooks={on:(event,cb)=>hooks.set(event,cb)};
 globalThis.ui={notifications:{warn(str){throw Error(str)}}};
 const {registerRicoShieldHooks}=await import('../scripts/rico-shield-chain.mjs');
 registerRicoShieldHooks();
 hooks.get('renderChatMessageHTML')(f.original,html);
 assert.equal(container.children.length,0,'sem Fantástico confirmado não existe botão');
 f.flags.ricoShieldReady=f.ready();
 hooks.get('renderChatMessageHTML')(f.original,html);
 assert.equal(container.children.length,1);
 const button=container.children[0];assert.equal(button.dataset.messageId,f.original.id);
 assert.match(button.textContent,/Rico-Shield/);
 game.user.targets=new Set([f.t2]);
 await listeners.get('click')({target:{closest(selector){return selector==='.m616-rico-follow-up'?button:null}},
   preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(f.created.length,1,'clicar no botão cria o ataque extra');
 assert.equal(f.flags.ricoShieldConsumed.targetUuid,f.t2.uuid);
});
test('integração dos pontos de entrada registra confirmação do GM e hook do HUD',()=>{
 const code=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
 assert.match(code('../scripts/damage-reduction-helper.js'),/await confirmRicoShieldDamage\(message,action,results\)/);
 assert.match(code('../multiverse-d616.mjs'),/registerRicoShieldHooks\(\)/);
 assert.match(code('../multiverse-d616.mjs'),/ricoOriginalContext\(/);
});
test('Elemental Ricochet bloqueia próximo alvo atrás de parede comprovada pelo Foundry',async()=>{
 const f=mock('Elemental Ricochet');f.flags.ricoShieldReady=f.ready();
 globalThis.foundry.canvas={geometry:{PointSourcePolygon:{testCollision:()=>true}}};
 await assert.rejects(useRicoShieldBounce(f.original,{targets:[f.t2]}),/linha de visão/);
 assert.equal(f.created.length,0,'não rola quando a linha de visão está efetivamente bloqueada');
 delete globalThis.foundry.canvas;
});

test('cadeia completa: dois Fantásticos confirmados permitem 2 ricochetes; sucesso comum interrompe',async()=>{
 const f=mock();f.flags.ricoShieldReady=f.ready();
 const second=await useRicoShieldBounce(f.original,{targets:[f.t2]});
 game.user={id:'gm',isGM:true};
 const secondDamage={getFlag(_ns,k){return {sourceMessageId:second.id,
  damageApplication:{rollSignature:rollSignature(second.rolls[0])}}[k]}};
 assert.equal(await confirmRicoShieldDamage(secondDamage,'full',[{targetUuid:f.t2.uuid,blocked:false}]),true);
 game.user={id:'player',isGM:false};
 const third=await useRicoShieldBounce(second,{targets:[f.t3]});
 assert.equal(third.getFlag(null,'ricoShield').step,2);
 assert.equal(third.getFlag(null,'ricoShield').traveledSpaces,3);
 third.rolls=[dice(21,2)];game.user={id:'gm',isGM:true};
 const thirdDamage={getFlag(_ns,k){return {sourceMessageId:third.id,
  damageApplication:{rollSignature:rollSignature(third.rolls[0])}}[k]}};
 assert.equal(await confirmRicoShieldDamage(thirdDamage,'full',[{targetUuid:f.t3.uuid,blocked:false}]),false);
 assert.equal(third.getFlag(null,'ricoShieldReady'),undefined);
});
