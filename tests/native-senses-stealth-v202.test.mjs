import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {heightenedSensesTier,concentratedStealthPower,nativeSenseOwnSources,nativeSenseOpponentSources} from '../scripts/native-power-senses.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
const SYS='multiverse-d616';
const P=(set,name,id)=>({type:'power',name,id:id||`${set}-${name}`,system:{powerSet:set}});
const A=(powers=[],concentration='')=>{
 const items=powers.map(([set,name])=>P(set,name));
 if(concentration)items.push(P('Illusion',concentration,'illusion-power'));
 return {items:{contents:items,get:id=>items.find(i=>i.id===id)},statuses:new Set(),effects:
 concentration?[{id:'concentration-1',disabled:false,duration:{expired:false},flags:{[SYS]:{concentrationPower:{transient:true,itemId:'illusion-power'}}}}]:[]};
};
test('v202: bounded 150-entry registry, exactly four newly conditional sources',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
 for(const [set,name] of [['Basic','Heightened Senses 1'],['Basic','Heightened Senses 2'],['Illusion','Invisibility'],['Illusion','Silence Self']]){
  const entry=REGISTERED_AUTOMATIONS.find(x=>x.powerSet===set&&x.powerName===name);
  assert.equal(entry?.status,'native-partial');assert.equal(entry?.handlerId,'sense-stealth');
 }
 for(const [set,name] of [['Illusion','Dazzle'],['Illusion','Deafen'],['Illusion','Flare'],['Healing','Cure-All'],['Healing','Restore']]){
  assert.equal(REGISTERED_AUTOMATIONS.find(x=>x.powerSet===set&&x.powerName===name)?.status,'reference-existing');
 }
});
test('v202: Heightened Senses 2 supersedes 1 and never triple-counts',()=>{
 const a=A([['Basic','Heightened Senses 1'],['Basic','Heightened Senses 2']]);
 assert.equal(heightenedSensesTier(a),2);
 const result=resolveConditionEdges({actor:a,ability:'vig',attack:false});
 assert.equal(result.edges,2);assert.equal(result.net,2);assert.equal(result.autoCount,0);
 assert.equal(result.requiresDecision,true);
 assert.equal(resolveConditionEdges({actor:a,ability:'ego',attack:false}).net,0);
 assert.equal(resolveConditionEdges({actor:a,ability:'vig',attack:true}).net,0);
 assert.equal(resolveConditionEdges({actor:A([['Basic','Heightened Senses 1']]),ability:'vig',attack:false}).net,1);
});
test('v202: stealth versus observer is only a possible nonattack, explicitly targeted modifier',()=>{
 const observer=A([['Basic','Heightened Senses 2']]),sneak=A();
 assert.equal(resolveConditionEdges({actor:sneak,targetActors:[observer],ability:'agl',attack:false}).net,-2);
 assert.equal(resolveConditionEdges({actor:sneak,targetActors:[observer],ability:'agl',attack:true}).net,0);
 assert.equal(resolveConditionEdges({actor:sneak,targetActors:[],ability:'agl',attack:false}).net,0);
 assert.equal(resolveConditionEdges({actor:sneak,targetActors:[observer,A()],ability:'agl',attack:false}).net,0);
 assert.match(nativeSenseOpponentSources({target:observer,ability:'agl'})[0].reason,/Mestre confirma/);
});
test('v202: Silence Self and Invisibility require the actual live concentration, not merely owning the power',()=>{
 for(const power of ['Silence Self','Invisibility']){
  const a=A([],power);
  assert.equal(concentratedStealthPower(a),power);
  assert.equal(resolveConditionEdges({actor:a,ability:'agl',attack:false}).net,1);
  assert.equal(resolveConditionEdges({actor:A(),targetActors:[a],ability:'vig',attack:false}).net,-1);
  assert.equal(resolveConditionEdges({actor:a,ability:'agl',attack:true}).net,0);
  a.effects[0].disabled=true;
  assert.equal(concentratedStealthPower(a),null);
  assert.equal(resolveConditionEdges({actor:a,ability:'agl',attack:false}).net,0);
  a.effects[0].disabled=false;a.effects[0].duration.expired=true;
  assert.equal(resolveConditionEdges({actor:a,ability:'agl',attack:false}).net,0);
 }
 const ownedOnly=A([['Illusion','Invisibility']]);
 assert.equal(nativeSenseOwnSources({actor:ownedOnly,ability:'agl'}).length,0);
});
test('v202: each source says GM validates applicability, no forced rerolls or resource side effects',()=>{
 const a=A([['Basic','Heightened Senses 1']],'Silence Self');
 for(const ability of ['vig','agl']){
  const result=resolveConditionEdges({actor:a,ability,attack:false});
  assert.equal(result.autoCount,0);
  assert.ok(result.sources.every(s=>s.reason.includes('Mestre confirma')));
 }
 assert.equal(a.effects.length,1);
});
