import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  adjudicateTargetOutcome, filterHitTargets, targetResultsReady,
  normalizeTargetDecision, rollSignature, damageCardStillCurrent,
} from '../scripts/multi-target-combat.mjs';
import {checkPowerOutcome} from '../scripts/power-rolls.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';
import {normalizeConditionDefense, conditionsForOutcome} from '../scripts/power-conditions.mjs';

const folder=new URL('../',import.meta.url);
const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const dr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
const pc=readFileSync(new URL('../scripts/power-conditions.mjs',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));

test('v0.2.44 installer and dedicated multi-target module',()=>{
  assert.equal(manifest.version,'0.2.106');
  assert.match(main,/scripts\/multi-target-combat\.mjs/);
});

test('same attack distinguishes hit, miss and Fantastic failure per defense',()=>{
  const a=checkPowerOutcome(16,13,{fantastic:true});
  const b=checkPowerOutcome(16,19,{fantastic:true});
  assert.equal(a.success,true);assert.equal(a.fantastic,true);
  assert.equal(b.success,false);assert.equal(b.fantastic,true);
  assert.deepEqual([a,b].map(o=>adjudicateTargetOutcome(o).success),[true,false]);
});

test('only hit targets proceed to damage (same roll, no reroll or Focus spending)',()=>{
  const targets=[{ref:{uuid:'A'}},{ref:{uuid:'B'}},{ref:{uuid:'C'}}];
  const decisions=new Map([['A',{success:true}],['B',{success:false}],['C',{success:true}]]);
  assert.deepEqual(filterHitTargets(targets,decisions).map(x=>x.ref.uuid),['A','C']);
  assert.match(main,/filterHitTargets\(resolvedTargets,outcomes\)/);
  assert.match(main,/return ChatMessageMarvel\.create\(mmApplyMessageMode\(msgData\)\)/);
});

test('power checks respect Evasion defensive swap (Melee to Agility)',()=>{
  const defender={items:[{type:'power',name:'Evasion'}]};
  assert.equal(normalizeConditionDefense('mle',defender),'agl');
  assert.equal(normalizeConditionDefense('log',defender),'log');
  assert.match(main,/normalizeConditionDefense\(attackTarget,target\)/);
});

test('unresolved different Edge/Trouble prevents damage and on-hit conditions',()=>{
  const result=adjudicateTargetOutcome(checkPowerOutcome(19,15),{requiresReview:true});
  assert.equal(result.pending,true);assert.equal(result.success,false);
  assert.equal(targetResultsReady([result]),false);
  assert.match(main,/Há alvos com Edge\/Trouble diferentes/);
  assert.match(pc,/if\(outcome\.pending\)/);
});

test('GM can adjudicate each target without affecting a different target',()=>{
  const base=checkPowerOutcome(13,17,{fantastic:true});
  const a=adjudicateTargetOutcome(base,{requiresReview:true,decision:'hit'});
  const b=adjudicateTargetOutcome(base,{requiresReview:true,decision:'miss'});
  assert.equal(a.success,true);assert.equal(a.fantastic,true);
  assert.equal(b.success,false);assert.equal(b.fantastic,true);
  assert.equal(normalizeTargetDecision('fake'),null);
  assert.equal(targetResultsReady([a,b]),true);
  assert.match(main,/data-target-decision="hit"/);
  assert.match(main,/data-target-decision="miss"/);
});

test('individual health and focus DR are independent on the same attack',()=>{
  const x=calculateD616Damage({marvelDie:5,damageMultiplier:4,damageReduction:2,ability:3});
  const y=calculateD616Damage({marvelDie:5,damageMultiplier:4,damageReduction:8,ability:3});
  assert.notEqual(x.damage,y.damage);
  assert.match(main,/target\.system\?\.focusDamageReduction/);
  assert.match(main,/target\.system\?\.healthDamageReduction/);
});

test('Fantastic effects only arise from a successful Fantastic target',()=>{
  const failed=adjudicateTargetOutcome(checkPowerOutcome(13,18,{fantastic:true}));
  const hit=adjudicateTargetOutcome(checkPowerOutcome(20,18,{fantastic:true}));
  assert.equal(conditionsForOutcome('Elemental Push',failed).length,0);
  assert.ok(conditionsForOutcome('Elemental Push',hit).length>0);
  assert.match(pc,/const outcome=adjudicateTargetOutcome/);
});

test('roll card fingerprint changes when retro Edge/Trouble changes the kept die',()=>{
  const mk=(face)=>({total:17,terms:[{rolls:[{terms:[{results:[{active:true,result:2}]}]},
    {terms:[{results:[{active:true,result:face}]}]},
    {terms:[{results:[{active:true,result:3}]}]}]}]});
  const original=mk(4), next=mk(5);
  assert.notEqual(rollSignature(original),rollSignature(next));
  assert.equal(damageCardStillCurrent({rollSignature:rollSignature(original)},original),true);
  assert.equal(damageCardStillCurrent({rollSignature:rollSignature(original)},next),false);
  assert.match(dr,/damageCardStillCurrent/);
});

test('changing target decisions invalidates old damage cards',()=>{
  const roll={total:20,terms:[]};
  const flags={rollSignature:rollSignature(roll),targetDecisionSignature:JSON.stringify({A:'hit'})};
  assert.equal(damageCardStillCurrent(flags,roll,{A:'hit'}),true);
  assert.equal(damageCardStillCurrent(flags,roll,{A:'miss'}),false);
});

test('source power conditions sync again when GM records per-target decisions',()=>{
  assert.match(pc,/changedDecisions/);
  assert.match(main,/multiTargetDecisionRollSignature/);
  assert.match(main,/targetConditionEdges/);
});

test('damage cards retain per-target structured hit results and DR',()=>{
  assert.match(main,/hit: true/);
  assert.match(main,/damageReduction,/);
  assert.match(main,/damageApplication: \{/);
  assert.match(main,/rollSignature: rollSignature\(roll\)/);
  assert.match(dr,/getStructuredEntries/);
});
