import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation} from '../scripts/native-power-automations.mjs';
import {isNativeReactiveDodge} from '../scripts/native-power-spider-defenses.mjs';
import {nativeSupportRule} from '../scripts/native-power-support.mjs';
import {nativeGuardReactionRule,checkNativeGuardReaction,nativeGuardReactionCard,
  declareNativeGuardReaction} from '../scripts/native-power-reactive-guards.mjs';
const cases=[
  ['Shield Bearer','Shield Deflection','trouble',0],
  ['Shield Bearer','Hurled Shield Deflection','trouble-ally',5],
  ['Shield Bearer','Immovable','knockback',0],
  ['Super-Strength','Immovable','knockback',0],
  ['Shield Bearer','Brace for Impact','brace',5],
  ['Martial Arts','Brace for Impact','brace',5],
];
const actor=(id='a')=>({id,uuid:`Actor.${id}`,
  system:{attributes:{rank:{value:4}},focus:{value:20,max:30}},
  async update(patch){this.system.focus.value=patch['system.focus.value'];this.updates.push(patch);},updates:[]});
const item=(set,name,a=actor())=>({type:'power',id:'someitem',name,actor:a,img:`${name}.svg`,
  system:{powerSet:set,action:'Reaction',description:`Descrição oficial ${name}`,
    effect:`Efeito oficial ${name}`,duration:'Instant',trigger:'Após ataque'}});
function fixture({used=0,limit=1,accepted=true,failMessage=false,failUpdate=false}={}){
  const a=actor();const c={id:'C1',started:true,combatants:[{id:'c1',actorId:a.id,actor:a,tokenId:'t1'}]};
  const metrics={take:0,refund:0,card:[],focusUpdates:0};
  if(failUpdate)a.update=async()=>{throw new Error('Failed to update Focus');};
  else a.update=async patch=>{metrics.focusUpdates++;a.system.focus.value=patch['system.focus.value'];a.updates.push(patch);};
  const tracker={getState:()=>({reactionUsed:used,reactionMax:limit}),
    trackItemUse:async()=>{metrics.take++;return accepted;},
    refundReaction:async()=>{metrics.refund++;return true;}};
  const options={combat:c,tracker,createMessage:async data=>{if(failMessage)throw new Error('Chat failure');metrics.card.push(data);return data;},
    applyMode:data=>data,speaker:()=>({alias:'Hero'})};
  return {a,c,tracker,metrics,options};
}
test('v207 registry retains seven reactions including one targeted Hurled Shield Block, plus four Shield references',()=>{
  assert.equal(REGISTERED_AUTOMATIONS.length,162);
  assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
  for(const [set,name,effect] of cases){
    const p=item(set,name);assert.equal(nativeGuardReactionRule(p)?.effect,effect);
    assert.equal(resolveNativePowerAutomation(p).status,'native-partial');
    assert.equal(resolveNativePowerAutomation(p).handlerId,'reactive-guard');
  }
  assert.equal(nativeGuardReactionRule(item('Shield Bearer','Hurled Shield Block')),null);
  assert.equal(nativeSupportRule(item('Shield Bearer','Hurled Shield Block'))?.kind,'shield-block');
  for(let i=1;i<=4;i++){
    const p=item('Shield Bearer',`Shield ${i}`);
    assert.equal(resolveNativePowerAutomation(p).handlerId,'shield-concentration-dr');
    assert.equal(resolveNativePowerAutomation(p).status,'reference-existing');
  }
});
test('v206 same-named reactions in different sets remain separate, and v205 dodge does not change',()=>{
  assert.notEqual(resolveNativePowerAutomation(item('Shield Bearer','Immovable')).powerId,
    resolveNativePowerAutomation(item('Super-Strength','Immovable')).powerId);
  assert.equal(nativeGuardReactionRule(item('Melee Weapons','Immovable')),null);
  assert.equal(nativeGuardReactionRule(item('Spider-Powers','Spider-Dodge')),null);
  assert.equal(isNativeReactiveDodge(item('Spider-Powers','Spider-Dodge')),true);
  assert.equal(nativeGuardReactionRule(item('Shield Bearer','Shield 2')),null);
});
test('v206 every reaction displays original Item description and manual adjudication, no auto-reroll',()=>{
  for(const [set,name,effect,focus] of cases){
    const data=nativeGuardReactionCard(item(set,name),focus);
    assert.match(data.content,/Descrição oficial/);
    assert.match(data.content,/Efeito oficial/);
    assert.match(data.content,/Gatilho:/);
    assert.match(data.content,/Reação declarada após o gatilho/);
    assert.match(data.content,/não executa rerolls/);
  }
  assert.match(nativeGuardReactionCard(item('Shield Bearer','Hurled Shield Deflection'),5).content,/TROUBLE/);
  assert.match(nativeGuardReactionCard(item('Martial Arts','Brace for Impact'),15).content,/15 pontos de dano/);
  assert.match(nativeGuardReactionCard(item('Super-Strength','Immovable'),0).content,/recuo/);
});
test('v206 no-Focus Shield Deflection consumes one Reaction, posts no attack roll or condition',async()=>{
  const e=fixture(),p=item('Shield Bearer','Shield Deflection',e.a);
  await declareNativeGuardReaction(p,e.options);
  assert.deepEqual([e.metrics.take,e.metrics.refund,e.metrics.focusUpdates,e.metrics.card.length],[1,0,0,1]);
  assert.equal(e.a.system.focus.value,20);
});
test('v206 Hurled Shield Deflection costs exactly 5 Focus and one Reaction',async()=>{
  const e=fixture(),p=item('Shield Bearer','Hurled Shield Deflection',e.a);
  await declareNativeGuardReaction(p,e.options);
  assert.equal(e.a.system.focus.value,15);
  assert.deepEqual([e.metrics.take,e.metrics.refund,e.metrics.card.length],[1,0,1]);
  assert.match(e.metrics.card[0].content,/5\. <strong>Reação/);
});
test('v207 Hurled Shield Block is no longer a purely descriptive guard',()=>{
  const e=fixture(),p=item('Shield Bearer','Hurled Shield Block',e.a);
  assert.equal(nativeGuardReactionRule(p),null);
  assert.equal(nativeSupportRule(p)?.action,'reaction');
  assert.equal(e.metrics.card.length,0);
});
test('v206 both Immovable variants consume Reaction without changing Health/Focus',async()=>{
  for(const set of ['Super-Strength','Shield Bearer']){
    const e=fixture(),p=item(set,'Immovable',e.a);
    await declareNativeGuardReaction(p,e.options);
    assert.equal(e.metrics.take,1);assert.equal(e.a.system.focus.value,20);
    assert.equal(e.metrics.card.length,1);
  }
});
test('v206 Brace chooses variable Focus BEFORE consuming, applying 1:1 physical Health prevention note',async()=>{
  const e=fixture(),p=item('Martial Arts','Brace for Impact',e.a);
  const calls=[];
  await declareNativeGuardReaction(p,{...e.options,chooseFocus:async args=>{calls.push(args);return 15;}});
  assert.equal(calls[0].min,5);assert.equal(calls[0].maxTotal,20);
  assert.equal(e.a.system.focus.value,5);
  assert.equal(e.metrics.take,1);assert.equal(e.metrics.card.length,1);
  assert.match(e.metrics.card[0].content,/15 pontos de dano de Health/);
});
test('v206 cancel variable Focus selection spends neither Focus nor Reaction',async()=>{
  const e=fixture(),p=item('Shield Bearer','Brace for Impact',e.a);
  const result=await declareNativeGuardReaction(p,{...e.options,chooseFocus:async()=>null});
  assert.equal(result,null);assert.deepEqual([e.metrics.take,e.metrics.focusUpdates,e.metrics.card.length],[0,0,0]);
});
test('v206 invalid Focus, exceeds rank cap, and missing Reaction block without side effects',async()=>{
  const e=fixture({used:1}),p=item('Shield Bearer','Hurled Shield Deflection',e.a);
  const check=checkNativeGuardReaction(e.a,p,{combat:e.c,tracker:e.tracker});
  assert.equal(check.ok,false);assert.match(check.reason,/Reação disponível/);
  await assert.rejects(declareNativeGuardReaction(p,e.options),/Reação disponível/);
  assert.deepEqual([e.metrics.take,e.metrics.card.length],[0,0]);
  const f=fixture(),q=item('Shield Bearer','Brace for Impact',f.a);
  await assert.rejects(declareNativeGuardReaction(q,{...f.options,chooseFocus:async()=>25}),/Limite de 20 Focus/);
  assert.equal(f.metrics.take,0);
  await assert.rejects(declareNativeGuardReaction(q,{...f.options,chooseFocus:async()=>4}),/Custo de Focus inválido/);
  assert.equal(f.metrics.take,0);
});
test('v206 denied Reaction never spends Focus or posts a card',async()=>{
  const e=fixture({accepted:false}),p=item('Shield Bearer','Hurled Shield Deflection',e.a);
  await assert.rejects(declareNativeGuardReaction(p,e.options),/não foi autorizada/);
  assert.deepEqual([e.metrics.take,e.metrics.refund,e.metrics.focusUpdates,e.metrics.card.length],[1,0,0,0]);
});
test('v206 Focus update failure refunds Reaction without chat',async()=>{
  const e=fixture({failUpdate:true}),p=item('Shield Bearer','Hurled Shield Deflection',e.a);
  await assert.rejects(declareNativeGuardReaction(p,e.options),/Failed to update Focus/);
  assert.equal(e.a.system.focus.value,20);
  assert.deepEqual([e.metrics.take,e.metrics.refund,e.metrics.card.length],[1,1,0]);
});
test('v206 failed chat restores both own Focus and Reaction',async()=>{
  const e=fixture({failMessage:true}),p=item('Shield Bearer','Hurled Shield Deflection',e.a);
  await assert.rejects(declareNativeGuardReaction(p,e.options),/Chat failure/);
  assert.equal(e.a.system.focus.value,20);
  assert.deepEqual([e.metrics.take,e.metrics.refund,e.metrics.focusUpdates,e.metrics.card.length],[1,1,2,0]);
});
test('v206 in-flight duplicate click is rejected, without consuming twice',async()=>{
  const e=fixture(),p=item('Shield Bearer','Brace for Impact',e.a);
  let release;
  const waiting=new Promise(resolve=>{release=resolve;});
  const options={...e.options,chooseFocus:async()=>{await waiting;return 5;}};
  const first=declareNativeGuardReaction(p,options);
  await assert.rejects(declareNativeGuardReaction(p,options),/sendo processada/);
  release();await first;
  assert.equal(e.metrics.take,1);
  assert.equal(e.a.system.focus.value,15);
});
