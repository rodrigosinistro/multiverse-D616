import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listConditionRecoveryActions, attemptConditionRecovery, resolveConditionRecoveryMessage,
  captureHealthBeforeUpdate, removeBleedingOnHeal, observeHealth } from '../scripts/condition-actions.mjs';
import { choosePowerEscape, availableEscapeModes } from '../scripts/power-escapes.mjs';
import { offerPoisonCheck, resolvePoisonCheck, attemptPoisonCheck, poisonTurnKey } from '../scripts/poisoned-turn.mjs';

function actorFixture({status='mmrpg.bleeding',health=80}={}){
  const effects=[{id:'fx1',disabled:false,statuses:new Set([status]),flags:{}}];
  const actor={id:'hero',uuid:'Actor.hero',name:'Herói',effects,
    system:{abilities:{log:{value:3},agl:{value:4},res:{value:3},mle:{value:4}},health:{value:health}},
    getRollData(){return {abilities:this.system.abilities};},testUserPermission(){return true;},
    async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');ids.forEach(id=>{
      const i=effects.findIndex(e=>e.id===id);if(i>=0)effects.splice(i,1);
    });},
    async update(change){if(change['system.health.value']!==undefined)this.system.health.value=change['system.health.value'];},
  };
  return actor;
}
function basics(actor,{player=false,turn=true}={}){
  const gm={id:'gm',isGM:true,active:true},user={id:'p',isGM:false,active:true};
  globalThis.game={user:player?user:gm,users:{activeGM:gm,contents:[gm,user],get:id=>id==='gm'?gm:user},
    actors:new Map([['hero',actor]]),messages:new Map(),scenes:new Map(),settings:{get:()=>0}};
  const c={id:'combatant',actor,tokenId:'token',sceneId:'scene'};
  game.combat={started:true,id:'combat',round:2,turn:1,combatant:turn?c:{id:'other'},combatants:[c]};
  globalThis.canvas={tokens:{controlled:[{actor,document:{id:'token',parent:{id:'scene'}}}]}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
  globalThis.ui={notifications:{warn(){},error(){}}};
  globalThis.ChatMessage={getSpeaker:()=>({actor:'hero'}),create:async d=>d};
  globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{
    async evaluate(){return this;}
    async toMessage(data){globalThis._lastRoll=data;return {rolls:[{total:20}],id:'out'};}
  }}};
  globalThis.fromUuid=async uuid=>uuid===actor.uuid?actor:null;
  globalThis.foundry={utils:{escapeHTML:v=>v}};
  return {c,gm,user};
}
function flagged(id,flagName,flag,roll,{user='p',fantastic=false}={}){
  const flags={[flagName]:flag};
  return {id,author:{id:user},rolls:roll?[{total:roll,isFantastic:fantastic,terms:[]}]:[],
    getFlag:(_system,key)=>flags[key],async setFlag(_system,key,value){flags[key]=value;},flags};
}

test('HUD oferece Logic TN10 e Agility TN10 apenas enquanto as condições estão presentes',()=>{
  const a=actorFixture();
  assert.deepEqual(listConditionRecoveryActions(a).map(x=>[x.id,x.ability,x.tn]),[['mmrpg.bleeding','log',10]]);
  a.effects.push({id:'fx2',disabled:false,statuses:new Set(['mmrpg.ablaze'])});
  assert.deepEqual(listConditionRecoveryActions(a).map(x=>x.id),['mmrpg.bleeding','mmrpg.ablaze']);
});
test('Sangrando exige turno próprio e Ação; sucesso remove apenas a condição correspondente',async()=>{
  const a=actorFixture();const {c,user}=basics(a,{player:true});let spent=0;
  game.multiverseD616={turnTracker:{getState:()=>({actionUsed:0,actionMax:1}),consumeAction:async()=>{spent++;return true;}}};
  assert.equal(await attemptConditionRecovery(a,'mmrpg.bleeding'),true);
  assert.equal(spent,1);
  assert.equal(globalThis._lastRoll.flags['multiverse-d616'].conditionRecoveryAttempt.tn,10);
  game.user=game.users.activeGM;
  const m=flagged('r1','conditionRecoveryAttempt',{version:1,actorUuid:a.uuid,conditionId:'mmrpg.bleeding',tn:10},15);
  assert.equal(await resolveConditionRecoveryMessage(m),true);
  assert.equal(a.effects.length,0);
  assert.equal(m.flags.conditionRecoveryResult.label,'CONDIÇÃO REMOVIDA');
});
test('Falha no teste de Logic preserva Sangrando e recuperação de Health remove somente Sangrando',async()=>{
  const a=actorFixture({health:40});basics(a);a.effects.push({id:'fx2',disabled:false,statuses:new Set(['mmrpg.poisoned'])});
  const m=flagged('r2','conditionRecoveryAttempt',{version:1,actorUuid:a.uuid,conditionId:'mmrpg.bleeding',tn:10},6);
  await resolveConditionRecoveryMessage(m);
  assert.equal(a.effects.length,2);
  captureHealthBeforeUpdate(a,{'system.health.value':41});a.system.health.value=41;
  assert.equal(await removeBleedingOnHeal(a,{'system.health.value':41}),true);
  assert.deepEqual(a.effects.map(x=>x.id),['fx2']);
});
test('controle de Grab oferece Ação e Reação no próprio turno; apenas Reação fora do turno',()=>{
  const a=actorFixture();const {c}=basics(a);
  game.multiverseD616={turnTracker:{getState:()=>({actionUsed:0,actionMax:1,reactionUsed:0,reactionMax:1}),consumeAction:()=>{},consumeReaction:()=>{}}};
  assert.deepEqual(availableEscapeModes(a),['action','reaction']);
  game.combat.combatant={id:'other'};
  assert.deepEqual(availableEscapeModes(a),['reaction']);
});
test('Envenenado gera um único pedido a cada início de turno e respeita o TN18',async()=>{
  const a=actorFixture({status:'mmrpg.poisoned'});basics(a);
  const chat=[];ChatMessage.create=async data=>{chat.push(data);game.messages.set(`p${chat.length}`,{getFlag:(_s,k)=>data.flags?.['multiverse-d616']?.[k]});game.messages.contents=[...game.messages.values()];return data;};
  const key=poisonTurnKey(game.combat);
  assert.match(key,/combat\|2\|1\|combatant/);
  assert.equal(await offerPoisonCheck(game.combat),true);
  assert.equal(await offerPoisonCheck(game.combat),false,'não deve repetir pedido no mesmo turno');
  assert.equal(chat.length,1);
  assert.equal(chat[0].flags['multiverse-d616'].poisonTurnPrompt.tn,18);
  assert.ok(chat[0].content.includes('Rolar Resilience TN 18'));
});
test('Poison: falha perde somente 1 Health; fantástico bem-sucedido cura; repetição não aplica duas vezes',async()=>{
  const a=actorFixture({status:'mmrpg.poisoned',health:40});basics(a);
  const turnKey=poisonTurnKey(game.combat),prompt=flagged('prompt','poisonTurnPrompt',
    {version:1,actorUuid:a.uuid,turnKey,combatantId:'combatant',tn:18});
  game.messages=new Map([['prompt',prompt]]);
  const check=flagged('check','poisonTurnCheck',{version:1,promptId:'prompt',actorUuid:a.uuid,turnKey,tn:18},13);
  assert.equal(await resolvePoisonCheck(check),true);
  assert.equal(a.system.health.value,39);assert.equal(a.effects.length,1);
  assert.equal(await resolvePoisonCheck(check),false);
  assert.equal(a.system.health.value,39);
  const b=actorFixture({status:'mmrpg.poisoned',health:90});basics(b);
  const second=flagged('prompt2','poisonTurnPrompt',
    {version:1,actorUuid:b.uuid,turnKey:poisonTurnKey(game.combat),combatantId:'combatant',tn:18});
  game.messages=new Map([['prompt2',second]]);
  const fantastic=flagged('check2','poisonTurnCheck',
    {version:1,promptId:'prompt2',actorUuid:b.uuid,turnKey:poisonTurnKey(game.combat),tn:18},22,{fantastic:true});
  assert.equal(await resolvePoisonCheck(fantastic),true);
  assert.equal(b.effects.length,0);assert.equal(b.system.health.value,90);
});
test('recurso não pode ser gasto fora do turno e console v14 não recebe async:true',async()=>{
  const a=actorFixture();basics(a,{player:true,turn:false});let consumed=0;
  game.multiverseD616={turnTracker:{getState:()=>({actionUsed:0,actionMax:1}),consumeAction:async()=>{consumed++;return true;}}};
  assert.equal(await attemptConditionRecovery(a,'mmrpg.bleeding'),false);assert.equal(consumed,0);
  const source=readFileSync(new URL('../scripts/conditions-hud.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/roll\.evaluate\(\{\s*async:\s*true\s*\}\)/);
});

test('Envenenado: dono do personagem usa botão no chat sem consumir Ação Padrão',async()=>{
  const actor=actorFixture({status:'mmrpg.poisoned'});basics(actor,{player:true});
  const key=poisonTurnKey(game.combat);
  const prompt=flagged('px','poisonTurnPrompt',
    {version:1,actorUuid:actor.uuid,turnKey:key,combatantId:'combatant',tn:18});
  let spending=0;game.multiverseD616={turnTracker:{consumeAction:()=>spending++}};
  assert.equal(await attemptPoisonCheck(prompt),true);
  assert.equal(globalThis._lastRoll.flags['multiverse-d616'].poisonTurnCheck.promptId,'px');
  assert.equal(spending,0);
});
test('cura por Health reconhecida no cliente do Mestre mesmo quando preUpdateActor ocorreu apenas no cliente do jogador',async()=>{
  const actor=actorFixture({health:50});basics(actor);
  observeHealth(actor);
  actor.system.health.value=52;
  assert.equal(await removeBleedingOnHeal(actor,{'system.health.value':52}),true);
  assert.equal(actor.effects.length,0);
});
test('Envenenado: resultados simultâneos do mesmo pedido não aplicam dano duplo',async()=>{
  const a=actorFixture({status:'mmrpg.poisoned',health:15});basics(a);
  const turnKey=poisonTurnKey(game.combat),prompt=flagged('px3','poisonTurnPrompt',
    {version:1,actorUuid:a.uuid,turnKey,combatantId:'combatant',tn:18});
  game.messages=new Map([['px3',prompt]]);
  const req={version:1,promptId:'px3',actorUuid:a.uuid,turnKey,tn:18};
  const a1=flagged('c1','poisonTurnCheck',req,9),a2=flagged('c2','poisonTurnCheck',req,8);
  const results=await Promise.all([resolvePoisonCheck(a1),resolvePoisonCheck(a2)]);
  assert.deepEqual(results.sort(),[false,true]);
  assert.equal(a.system.health.value,14);
});
