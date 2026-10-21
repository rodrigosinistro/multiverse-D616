import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {checkPowerOutcome} from '../scripts/power-rolls.mjs';
import {adjudicateTargetOutcome, targetResultsReady} from '../scripts/multi-target-combat.mjs';

const actor=(...statuses)=>({statuses:new Set(statuses.map(s=>`mmrpg.${s}`)),effects:[]});
const resolve=(targets,{attacker=actor(),kind='close',baseMode=0}={})=>resolveConditionEdges({
  actor:attacker,targetActors:targets,ability:'mle',attack:true,kind,targeted:true,baseMode,
});

test('same +1 Edge from different target conditions needs no Narrator intervention',()=>{
  const r=resolve([actor('prone'),actor('blinded'),actor('restrained')]);
  assert.equal(r.net,1);
  assert.equal(r.edgeMode,1);
  assert.equal(r.ambiguousTargets,false);
  assert.equal(r.targetSourcesDiffer,true);
  assert.equal(r.autoCount,1);
  assert.equal(r.requiresDecision,false);
  assert.ok(r.sources.some(s=>s.source.includes('modificador equivalente')));
  assert.ok(!r.sources.some(s=>s.source.includes('Caído')),'shared note must not mislabel all targets as prone');
  const outcomes=[12,15,19].map(defense=>adjudicateTargetOutcome(checkPowerOutcome(18,defense),{
    requiresReview:r.ambiguousTargets,
  }));
  assert.equal(targetResultsReady(outcomes),true);
  assert.deepEqual(outcomes.map(x=>x.success),[true,true,false]);
});

test('same net zero despite different cancelling conditions is not ambiguous',()=>{
  const r=resolve([actor('prone','blinded'),actor()],{kind:'ranged'});
  assert.equal(r.net,0);
  assert.equal(r.ambiguousTargets,false);
  assert.equal(r.targetSourcesDiffer,true);
  assert.equal(r.autoCount,0);
  assert.equal(r.edgeMode,0);
});

test('common attacker Trouble cancels equal different target Edge without extra rerolls',()=>{
  const r=resolve([actor('prone'),actor('blinded')],{attacker:actor('demoralized')});
  assert.equal(r.net,0);
  assert.equal(r.troubles,1);
  assert.equal(r.edges,1);
  assert.equal(r.autoCount,0);
});

test('true mixed net +1 versus 0 remains blocked until per-target Narrator decisions',()=>{
  const r=resolve([actor('prone'),actor()]);
  assert.equal(r.ambiguousTargets,true);
  assert.equal(r.requiresDecision,true);
  assert.equal(r.autoCount,0);
  const check=checkPowerOutcome(16,14,{fantastic:true});
  const a=adjudicateTargetOutcome(check,{requiresReview:r.ambiguousTargets});
  const b=adjudicateTargetOutcome(check,{requiresReview:r.ambiguousTargets,decision:'miss'});
  assert.equal(a.pending,true);
  assert.equal(b.pending,false);
  assert.equal(targetResultsReady([a,b]),false);
});

test('equal stacked +2 Edge still requires Narrator to arbitrate reroll count',()=>{
  const r=resolve([actor('prone','blinded'),actor('restrained','blinded')]);
  assert.equal(r.ambiguousTargets,false);
  assert.equal(r.net,2);
  assert.equal(r.targetSourcesDiffer,true);
  assert.equal(r.requiresDecision,true);
  assert.equal(r.autoCount,0);
});

test('single target or identical status origins do not create false equivalence warnings',()=>{
  assert.equal(resolve([actor('prone')]).targetSourcesDiffer,false);
  assert.equal(resolve([actor('prone'),actor('prone')]).targetSourcesDiffer,false);
});

test('roll card persists per-target modifier snapshots and shows them without forcing review',()=>{
  const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const edge=readFileSync(new URL('../scripts/condition-edge.mjs',import.meta.url),'utf8');
  assert.match(main,/conditionEdges\.ambiguousTargets \|\| conditionEdges\.targetSourcesDiffer/);
  assert.match(main,/systemFlags\.targetConditionEdges=separate/);
  assert.match(main,/const reviewControls=result\?\.pending && isGM/);
  assert.match(main,/\$\{separateModifier\}\$\{decisionNote\}/);
  assert.match(edge,/Condições diferentes, mas mesmo modificador líquido/);
});
