import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation,planNativePowerDispatch} from '../scripts/native-power-automations.mjs';
import {isNativeReactiveDodge,checkNativeReactiveDodgeUse,reactiveDodgeChatData,
  declareNativeReactiveDodge,legacyPreparedDodgeIds} from '../scripts/native-power-spider-defenses.mjs';
import {nativeSenseOwnSources} from '../scripts/native-power-senses.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
const NS='multiverse-d616';
const P=(set,name)=>({id:'pow',type:'power',name,system:{powerSet:set,action:'Reaction',
  description:`Descrição oficial ${name}`,effect:`Efeito oficial ${name}`,
  trigger:'Inimigo faz um ataque',duration:'Instant'},img:`${name}.svg`});
const actor=(id='a')=>({id,uuid:`Actor.${id}`,items:{contents:[]},effects:[],statuses:new Set()});
const combat=(round=2,turn=1)=>({id:'combat',started:true,round,turn,
 combatants:[{id:'c1',actorId:'a',actor:actor(),tokenId:'t1'}],
 turns:[{actorId:'a',id:'c1'},{actorId:'b',id:'c2'}]});
function withGlobals(game,fn){
 const oldGame=globalThis.game,oldCanvas=globalThis.canvas;
 globalThis.game=game;globalThis.canvas={tokens:{controlled:[]}};
 const result=()=>fn();
 return Promise.resolve().then(result).finally(()=>{globalThis.game=oldGame;globalThis.canvas=oldCanvas;});
}
function env({used=0,limit=1,accept=true,failChat=false}={}){
 const calls={consume:0,refund:0,messages:[]};
 const a=actor(),c=combat();c.combatants[0].actor=a;
 const tracker={getState:()=>({reactionUsed:used,reactionMax:limit}),
  async trackItemUse(){calls.consume++;return accept;},
  async refundReaction(){calls.refund++;return true;}};
 const game={combat:c,multiverseD616:{turnTracker:tracker}};
 return {a,c,tracker,game,calls,
  options:{combat:c,tracker,speaker:()=>({alias:'Zima'}),applyMode:data=>data,
   createMessage:async data=>{if(failChat)throw new Error('Falha no ChatMessage');calls.messages.push(data);return data;}}};
}
test('v205: only the two official triggered dodges use the reactive text-only handler',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 for(const [set,name] of [['Basic','Slow-Motion Dodge'],['Spider-Powers','Spider-Dodge']]){
  const item=P(set,name),entry=resolveNativePowerAutomation(item);
  assert.equal(isNativeReactiveDodge(item),true);
  assert.equal(entry?.handlerId,'reactive-dodge');
  assert.equal(entry.status,'native-partial');
  assert.equal(planNativePowerDispatch(item).matched,true);
 }
 assert.equal(isNativeReactiveDodge(P('Magic','Spider-Dodge')),false);
 assert.equal(isNativeReactiveDodge(P('Super-Speed','Blur')),false);
 assert.equal(isNativeReactiveDodge(P('Tactics','Scatter')),false);
});
test('v205: no advance preparation: trigger is an attack, card tells attacker to click TROUBLE manually',()=>{
 for(const [set,name] of [['Basic','Slow-Motion Dodge'],['Spider-Powers','Spider-Dodge']]){
  const card=reactiveDodgeChatData(P(set,name));
  assert.match(card.content,/Descrição oficial/);
  assert.match(card.content,/Efeito oficial/);
  assert.match(card.content,/Gatilho:/);
  assert.match(card.content,/Duração:/);
  assert.match(card.content,/card original/);
  assert.match(card.content,/TROUBLE/);
  assert.match(card.content,/não faça uma nova rolagem/);
 }
 assert.match(reactiveDodgeChatData(P('Basic','Slow-Motion Dodge')).content,/Defesa de Agility/);
 assert.match(reactiveDodgeChatData(P('Spider-Powers','Spider-Dodge')).content,/ataque foi feito com Agility/);
 assert.equal(reactiveDodgeChatData(P('Super-Speed','Blur')),null);
});
test('v205: available Reaction is consumed once, then official description is published; no targeting or effect',async()=>{
 const e=env(),item=P('Spider-Powers','Spider-Dodge');item.actor=e.a;
 await withGlobals(e.game,async()=>{
  const check=checkNativeReactiveDodgeUse(e.a,item);
  assert.equal(check.ok,true);
  await declareNativeReactiveDodge(item,e.options);
 });
 assert.equal(e.calls.consume,1);
 assert.equal(e.calls.messages.length,1);
 assert.equal(e.calls.refund,0);
 assert.deepEqual(e.a.effects,[]);
 assert.match(e.calls.messages[0].content,/Efeito oficial Spider-Dodge/);
 assert.equal(e.calls.messages[0].speaker.alias,'Zima');
});
test('v205: no active combat, missing combatant or exhausted Reaction prevents chat and expenditure',async()=>{
 const e=env({used:1}),item=P('Basic','Slow-Motion Dodge');item.actor=e.a;
 await withGlobals(e.game,async()=>{
  assert.match(checkNativeReactiveDodgeUse(e.a,item).reason,/Reação disponível/);
  await assert.rejects(declareNativeReactiveDodge(item,e.options),/Reação disponível/);
  assert.equal(checkNativeReactiveDodgeUse(e.a,item,{started:false}).ok,false);
  assert.equal(checkNativeReactiveDodgeUse(actor('outside'),item).ok,false);
 });
 assert.equal(e.calls.consume,0);assert.equal(e.calls.messages.length,0);
});
test('v205: failed Reaction consumption blocks card; failed chat creation refunds exactly once',async()=>{
 const e=env({accept:false}),item=P('Basic','Slow-Motion Dodge');item.actor=e.a;
 await withGlobals(e.game,async()=>{
  await assert.rejects(declareNativeReactiveDodge(item,e.options),/Não foi possível consumir/);
 });
 assert.equal(e.calls.consume,1);assert.equal(e.calls.messages.length,0);assert.equal(e.calls.refund,0);
 const f=env({failChat:true}),another=P('Spider-Powers','Spider-Dodge');another.actor=f.a;
 await withGlobals(f.game,async()=>{
  await assert.rejects(declareNativeReactiveDodge(another,f.options),/Falha no ChatMessage/);
 });
 assert.equal(f.calls.consume,1);assert.equal(f.calls.refund,1);assert.equal(f.calls.messages.length,0);
});
test('v205: no longer injects Trouble into an already-published attack or creates prepared flags',async()=>{
 const e=env(),item=P('Spider-Powers','Spider-Dodge');item.actor=e.a;
 const obsolete={id:'old-prepared',flags:{[NS]:{nativePreparedDodge:{version:1,powerName:'Spider-Dodge'}}}};
 e.a.effects.push(obsolete);
 assert.deepEqual(legacyPreparedDodgeIds(e.a),['old-prepared']);
 await withGlobals(e.game,async()=>{
  const attacking=actor('opponent');
  const result=resolveConditionEdges({actor:attacking,targetActors:[e.a],ability:'agl',attack:true,targeted:true,
   item:{type:'power',name:'Razorwebs',system:{attackTarget:'mle'}},kind:'ranged'});
  assert.equal(result.sources.some(s=>s.source.includes('Spider-Dodge')),false);
  await declareNativeReactiveDodge(item,e.options);
 });
 assert.deepEqual(e.a.effects,[obsolete]);
 const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.ok(source.indexOf('if(isNativeReactiveDodge(this))')<source.indexOf('if (!powerControlSelection && (isDispelSpell(this)||shouldPromptForTargets(this,resolvePowerRoll(this))))'));
 assert.ok(source.indexOf('if(isNativeReactiveDodge(this))')<source.indexOf('const preFocus = await mmPreSpendFocusForPowerUse'));
 assert.match(source,/await declareNativeReactiveDodge\(this/);
 assert.doesNotMatch(source,/nativeEffect\?\.kind==='prepared-dodge'/);
});
test('v205: Spider-Pheromones conditional social Edge still only applies under Concentration',()=>{
 const a=actor();a.items.contents=[P('Spider-Powers','Spider-Pheromones')];a.items.contents[0].id='pow1';
 a.items.get=id=>a.items.contents.find(x=>x.id===id);
 assert.equal(nativeSenseOwnSources({actor:a,ability:'ego'}).length,0);
 a.effects=[{id:'c',disabled:false,flags:{[NS]:{concentrationPower:{itemId:'pow1',transient:true}}}}];
 assert.equal(nativeSenseOwnSources({actor:a,ability:'ego'}).length,1);
 assert.equal(nativeSenseOwnSources({actor:a,ability:'ego',attack:true}).length,0);
 a.effects=[];assert.equal(nativeSenseOwnSources({actor:a,ability:'ego'}).length,0);
});
