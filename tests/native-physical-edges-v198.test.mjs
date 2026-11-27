import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {physicalPassiveRollSources,spiderSenseTargetTrouble} from '../scripts/native-power-physical-edges.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
const power=(set,name)=>({type:'power',name,system:{powerSet:set}});
const actor=(powers=[])=>({items:{contents:powers.map(([set,name])=>power(set,name))},statuses:new Set(),effects:[]});
test('v198: 88 bounded macros including 3 physical passives, with distinct scoped identities',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>`${x.powerSet}/${x.powerName}`)).size,162);
 for(const [set,name,status] of [['Basic','Additional Limbs','native-active'],
  ['Super-Speed','Blazing Fast Fists','native-active'],['Spider-Powers','Spider Sense','native-partial']]){
   assert.equal(REGISTERED_AUTOMATIONS.find(x=>x.powerSet===set&&x.powerName===name)?.status,status);
 }
});
test('v198: Additional Limbs gives a single Edge in Melee and Agility action checks',()=>{
 const a=actor([['Basic','Additional Limbs']]);
 for(const ability of ['mle','agl']){
  const e=resolveConditionEdges({actor:a,ability,attack:false});assert.equal(e.net,1);assert.equal(e.autoCount,0);
 }
 assert.equal(resolveConditionEdges({actor:a,ability:'ego',attack:false}).net,0);
 assert.equal(resolveConditionEdges({actor:actor(),ability:'mle',attack:false}).net,0);
});
test('v198: Blazing Fast Fists works in close Melee attacks; old Central rule is not duplicated',()=>{
 const a=actor([['Super-Speed','Blazing Fast Fists']]);
 assert.equal(resolveConditionEdges({actor:a,ability:'mle',kind:'close',attack:true}).net,1);
 assert.equal(resolveConditionEdges({actor:a,ability:'mle',kind:'melee',attack:true}).net,1);
 assert.equal(resolveConditionEdges({actor:a,ability:'mle',kind:'close',attack:false}).net,0);
 assert.equal(resolveConditionEdges({actor:a,ability:'agl',kind:'ranged',attack:true}).net,0);
 assert.equal(physicalPassiveRollSources({actor:a,attack:true,ability:'mle',kind:'close',
  existingSources:[{source:'Automação: Blazing Fast Fists (Blazing Fast Fists)',sign:1}]}).length,0);
});
test('v198: Spider Sense imposes Trouble only on Agility targeting Vigilance',()=>{
 const target=actor([['Spider-Powers','Spider Sense']]);
 const p={type:'power',name:'Test Attack',system:{ability:'agl',attackTarget:'vig',attack:true,powerSet:'Basic'}};
 assert.equal(spiderSenseTargetTrouble(target,{attack:true,ability:'agl',attackTarget:'vig'})?.sign,-1);
 assert.equal(resolveConditionEdges({actor:actor(),targetActors:[target],item:p,ability:'agl',attack:true,targeted:true}).net,-1);
 assert.equal(resolveConditionEdges({actor:actor(),targetActors:[target],item:{...p,system:{...p.system,attackTarget:'agl'}},ability:'agl',attack:true,targeted:true}).net,0);
 assert.equal(spiderSenseTargetTrouble(target,{attack:false,ability:'agl',attackTarget:'vig'}),null);
});
