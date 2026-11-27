import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeReactionScopes,nativeScopedReactionDecision,nativeReactionUsage,nativeRefundReactionHistory}
  from '../scripts/combat/native-scoped-reactions.mjs';
import {actorReactionMaximum,genericReactionMaximum,resolveTurnResourceState}
  from '../scripts/combat/reaction-limits.mjs';
import {sanitizeTurnState,consumeTurnResources,resetTurnState}
  from '../scripts/combat/turn-tracker-core.mjs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';

const P=(id,name,powerSet,action='Reaction')=>({id,type:'power',name,system:{powerSet,action:{value:action}}});
const T=name=>({type:'trait',name});
const actor=(...items)=>({items:new Map(items.map((item,index)=>[item.id??`t${index}`,item]))});
const martial=()=>P('martial','Always Ready','Martial Arts','Permanent');
const ranged=()=>P('ranged','Fast Hands','Ranged Weapons','Permanent');
const mReaction=()=>P('mReact','Brace for Impact','Martial Arts');
const rReaction=()=>P('rReact','Point-Blank Parry','Ranged Weapons');
const wrong=()=>P('wrong','Shield Deflection','Shield Bearer');
const check=(a,used,history,itemId)=>nativeScopedReactionDecision({actor:a,
  state:{reactionUsed:used,scopedReactionUsed:history},itemId,
  genericMax:genericReactionMaximum(a)});

test('v208 official passives grant one extra Reaction restricted to their own Power Set',()=>{
  assert.deepEqual(nativeReactionScopes(actor()),[]);
  assert.equal(actorReactionMaximum(actor()),1);
  assert.deepEqual(nativeReactionScopes(actor(martial())),['Martial Arts']);
  assert.deepEqual(nativeReactionScopes(actor(ranged())),['Ranged Weapons']);
  assert.equal(actorReactionMaximum(actor(martial())),2);
  assert.equal(actorReactionMaximum(actor(ranged())),2);
  assert.deepEqual(nativeReactionScopes(actor(martial(),ranged())),['Martial Arts','Ranged Weapons']);
  assert.equal(actorReactionMaximum(actor(martial(),ranged())),3);
  assert.equal(genericReactionMaximum(actor(martial(),ranged(),T('Combat Reflexes'))),2);
  assert.equal(actorReactionMaximum(actor(martial(),ranged(),T('Combat Reflexes'))),4);
  assert.deepEqual(nativeReactionScopes(actor(P('a','Fast Hands','Basic','Permanent'),P('b','Always Ready','Ranged Weapons','Permanent'))),[]);
});

test('v208 ordinary Reaction is generic; the class extra requires a real owned Reaction power',()=>{
  const a=actor(martial(),mReaction(),wrong(),rReaction());
  assert.equal(check(a,0,[],'wrong').ok,true); // generic standard slot
  assert.equal(check(a,1,[],'wrong').ok,false);
  assert.equal(check(a,1,[],'rReact').ok,false);
  assert.equal(check(a,1,[],'not-owned').ok,false);
  assert.deepEqual(check(a,1,[],'mReact'),{ok:true,scope:'Martial Arts'});
  assert.equal(check(a,2,['Martial Arts'],'mReact').ok,false);
  assert.equal(check(a,1,[],martial().id).ok,false); // passive itself cannot consume
});

test('v208 two extras do not cross-spend, reuse or stack when actor has both',()=>{
  const a=actor(martial(),ranged(),mReaction(),rReaction(),wrong());
  assert.equal(check(a,0,[],'wrong').ok,true);
  assert.deepEqual(check(a,1,[],'rReact'),{ok:true,scope:'Ranged Weapons'});
  assert.equal(check(a,2,['Ranged Weapons'],'rReact').ok,false);
  assert.deepEqual(check(a,2,['Ranged Weapons'],'mReact'),{ok:true,scope:'Martial Arts'});
  assert.equal(check(a,3,['Ranged Weapons','Martial Arts'],'mReact').ok,false);
  assert.equal(check(a,2,[],'mReact').ok,false); // fail closed on migrated state
  assert.deepEqual(nativeReactionUsage(['Martial Arts','Ranged Weapons','Any']),['Martial Arts','Ranged Weapons']);
});

test('v208 refund and turn reset free appropriate scoped Reaction slot',()=>{
  const a=actor(martial(),ranged(),mReaction(),rReaction());
  const base=genericReactionMaximum(a);
  assert.deepEqual(nativeRefundReactionHistory({state:{reactionUsed:3,scopedReactionUsed:['Martial Arts','Ranged Weapons']},genericMax:base}),['Martial Arts']);
  assert.deepEqual(nativeRefundReactionHistory({state:{reactionUsed:1,scopedReactionUsed:[]},genericMax:base}),[]);
  const live=resolveTurnResourceState(sanitizeTurnState({reactionUsed:0,reactionMax:1},5),a);
  assert.equal(live.reactionMax,3);
  const used=consumeTurnResources(live,['reaction'],5);
  assert.equal(used.reactionUsed,1);
  assert.equal(resetTurnState({...used,scopedReactionUsed:['Martial Arts']},'combat:2:1',5).reactionUsed,0);
});

test('v208 GM tracker validates actual item ID and saves scope together with spend',()=>{
  const source=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  assert.match(source,/nativeScopedReactionDecision\(\{actor,state:current,/);
  assert.match(source,/itemId:payload\.itemId,genericMax:genericReactionMaximum\(actor\)/);
  assert.match(source,/\[\.\.\.current\.reactionSpendOrder,scopeToSpend\?\?GENERIC_REACTION\]/);
  assert.match(source,/scopedReactionUsed:\[\]/);
  assert.match(source,/itemId:item\?\.id/);
  assert.match(source,/waitForAck:resources\.includes\('reaction'\)/);
  assert.match(source,/JSON\.stringify\(nativeReactionUsage\(left\?\.scopedReactionUsed\)\)/);
});

test('v208 generic Reaction reserves before Focus and skips duplicate turn spend',()=>{
  const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const reserve=source.indexOf('if(scopedReaction){');
  const spend=source.indexOf('const focusCommitted = await mmCommitFocusForPowerUse');
  assert.ok(reserve>0&&spend>reserve);
  assert.match(source,/if\(!scopedReserved\)\{[\s\S]*?trackItemUse\?\.\(this\)/);
  assert.match(source,/if \(!focusCommitted\)\{await refundScoped\(\);return;\}/);
  assert.match(source,/Nenhum Focus gasto/);
});

test('v208 registered 150 macros with two scoped passives, without duplicates',()=>{
  assert.equal(REGISTERED_AUTOMATIONS.length,162);
  const entries=REGISTERED_AUTOMATIONS.filter(x=>x.handlerId==='scoped-reaction');
  assert.deepEqual(entries.map(x=>`${x.powerSet}::${x.powerName}`).sort(),[
    'Martial Arts::Always Ready','Ranged Weapons::Fast Hands']);
  assert.ok(entries.every(x=>x.status==='native-active'));
  assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
});
