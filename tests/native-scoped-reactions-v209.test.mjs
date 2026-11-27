import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GENERIC_REACTION,nativeReactionScopes,nativeScopedReactionDecision,
  nativeReactionSpendOrder,nativeReactionUsage,nativeRefundReactionHistory,
} from '../scripts/combat/native-scoped-reactions.mjs';
import {genericReactionMaximum,actorReactionMaximum} from '../scripts/combat/reaction-limits.mjs';
import {consumeTurnResources,resetTurnState} from '../scripts/combat/turn-tracker-core.mjs';

const power=(id,name,powerSet,action='Reaction')=>({id,name,type:'power',system:{powerSet,action:{value:action}}});
const a=(...items)=>({items:new Map(items.map(x=>[x.id,x]))});
const martial=power('ready','Always Ready','Martial Arts','Permanent');
const ranged=power('hands','Fast Hands','Ranged Weapons','Permanent');
const brace=power('brace','Brace for Impact','Martial Arts');
const parry=power('parry','Point-Blank Parry','Ranged Weapons');
const shield=power('shield','Shield Deflection','Shield Bearer');
const speed=power('speed','Slow-Motion Dodge','Basic');
function decision(actor,state,itemId){return nativeScopedReactionDecision({actor,state,itemId,genericMax:genericReactionMaximum(actor)});}
function spent(actor,state,itemId){
  const result=decision(actor,state,itemId);
  if(!result.ok)return {result,state};
  const order=nativeReactionSpendOrder({state});
  const next=consumeTurnResources({...state,reactionMax:actorReactionMaximum(actor)},['reaction']);
  const reactionSpendOrder=[...order,result.scope??GENERIC_REACTION];
  return {result,state:{...next,reactionSpendOrder,
    scopedReactionUsed:nativeReactionUsage(reactionSpendOrder)}};
}
function refunded(state){
  const reactionSpendOrder=nativeReactionSpendOrder({state}).slice(0,-1);
  return {...state,reactionUsed:Math.max(0,state.reactionUsed-1),
    reactionSpendOrder,scopedReactionUsed:nativeReactionUsage(reactionSpendOrder)};
}
const initial=()=>({reactionUsed:0,reactionMax:1,scopedReactionUsed:[],reactionSpendOrder:[]});

test('v209: Martial Arts extra spent BEFORE general; Shield Deflection works afterward',()=>{
  const hero=a(martial,brace,shield);
  const first=spent(hero,initial(),'brace');
  assert.deepEqual(first.result,{ok:true,scope:'Martial Arts'});
  assert.deepEqual(first.state.reactionSpendOrder,['Martial Arts']);
  assert.equal(first.state.reactionUsed,1);
  const second=spent(hero,first.state,'shield');
  assert.deepEqual(second.result,{ok:true,scope:null});
  assert.deepEqual(second.state.reactionSpendOrder,['Martial Arts','general']);
  assert.equal(second.state.reactionUsed,2);
  assert.equal(decision(hero,second.state,'shield').ok,false);
  assert.equal(decision(hero,second.state,'brace').ok,false);
});

test('v209: Ranged Weapons first preserves general for shield or Basic reaction',()=>{
  const hero=a(ranged,parry,shield,speed);
  const first=spent(hero,initial(),'parry');
  assert.deepEqual(first.result,{ok:true,scope:'Ranged Weapons'});
  assert.equal(decision(hero,first.state,'speed').ok,true);
  const second=spent(hero,first.state,'shield');
  assert.deepEqual(second.result,{ok:true,scope:null});
  assert.equal(decision(hero,second.state,'speed').ok,false);
});

test('v209: both extras can be used in any order, with one generic final reaction',()=>{
  const hero=a(martial,ranged,brace,parry,shield);
  const s1=spent(hero,initial(),'parry').state;
  const s2=spent(hero,s1,'brace').state;
  assert.deepEqual(s2.scopedReactionUsed,['Ranged Weapons','Martial Arts']);
  assert.equal(s2.reactionUsed,2);
  const s3=spent(hero,s2,'shield').state;
  assert.equal(s3.reactionUsed,3);
  assert.deepEqual(s3.reactionSpendOrder,['Ranged Weapons','Martial Arts','general']);
  assert.equal(decision(hero,s3,'parry').ok,false);
  assert.equal(decision(hero,s3,'brace').ok,false);
});

test('v209: last spend refund is exact for both scoped-first and generic-last',()=>{
  const hero=a(martial,brace,shield);
  const s1=spent(hero,initial(),'brace').state;
  assert.equal(refunded(s1).reactionUsed,0);
  assert.deepEqual(refunded(s1).scopedReactionUsed,[]);
  assert.deepEqual(refunded(s1).reactionSpendOrder,[]);
  const s2=spent(hero,s1,'shield').state;
  const rollback=refunded(s2);
  assert.deepEqual(rollback.reactionSpendOrder,['Martial Arts']);
  assert.deepEqual(rollback.scopedReactionUsed,['Martial Arts']);
  assert.deepEqual(decision(hero,rollback,'shield'),{ok:true,scope:null});
  assert.deepEqual(nativeRefundReactionHistory({state:s2}),['Martial Arts']);
  const r=refunded(rollback);
  assert.equal(r.reactionUsed,0);
  assert.deepEqual(r.scopedReactionUsed,[]);
});

test('v209: legacy native controllers may spend only GENERIC without an itemId',()=>{
  const hero=a(martial,brace,shield);
  const s1=spent(hero,initial(),'brace').state;
  assert.deepEqual(decision(hero,s1,undefined),{ok:true,scope:null});
  const s2=spent(hero,s1,undefined).state;
  assert.deepEqual(s2.reactionSpendOrder,['Martial Arts','general']);
  const denied=decision(hero,s2,undefined);
  assert.equal(denied.ok,false);
  assert.match(denied.reason,/Reação comum/);
  assert.equal(decision(hero,initial(),'nonexistent').ok,false);
  assert.equal(decision(hero,initial(),'ready').ok,false);
});

test('v209: v208 flags migrate preserving prior generic-first spends and resets',()=>{
  const legacy={reactionUsed:2,scopedReactionUsed:['Martial Arts']};
  assert.deepEqual(nativeReactionSpendOrder({state:legacy}),['general','Martial Arts']);
  assert.deepEqual(nativeRefundReactionHistory({state:legacy}),[]);
  assert.deepEqual(nativeReactionSpendOrder({state:{reactionUsed:1,scopedReactionUsed:[]}}),['general']);
  const hero=a(martial,ranged,brace,parry,shield);
  assert.deepEqual(decision(hero,legacy,'parry'),{ok:true,scope:'Ranged Weapons'});
  assert.equal(resetTurnState({...legacy,reactionSpendOrder:['general','Martial Arts']},'next',5).reactionUsed,0);
});

test('v209: GM tracker persists ordered ledger, resets, and limits generic HUD spend',()=>{
  const src=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  assert.match(src,/reactionSpendOrder:\[\]/);
  assert.match(src,/\[\.\.\.current\.reactionSpendOrder,scopeToSpend\?\?GENERIC_REACTION\]/);
  assert.match(src,/genericUsed\+delta>genericReactionMaximum\(actor\)/);
  assert.match(src,/order\.slice\(0,Math\.max\(0,next\.reactionUsed\)\)/);
  assert.match(src,/next\.scopedReactionUsed=nativeReactionUsage\(next\.reactionSpendOrder\)/);
  assert.match(src,/itemId:payload\.itemId,genericMax:genericReactionMaximum\(actor\)/);
  assert.match(src,/waitForAck:resources\.includes\('reaction'\)/);
  assert.match(src,/scopedReactionUsed:\[\],reactionSpendOrder:\[\]/);
});
