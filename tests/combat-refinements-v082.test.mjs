import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordMovementDistance,resetTurnState} from '../scripts/combat/turn-tracker-core.mjs';
const read = p => readFileSync(new URL(p,import.meta.url),'utf8');

test('v082: bonus round and round 1 use distinct keys and reset on transition', () => {
  const source=read('../scripts/combat/turn-tracker.mjs');
  assert.match(source, /bonusRound\(combat\) \? "bonus" : "regular"/);
  assert.match(source, /await resetActiveCombatant\(combat\)/);
  const acted={actionUsed:1,reactionUsed:1,movementUsed:4,movementExtraActionUsed:true};
  const fresh=resetTurnState(acted,'combat:regular:1:0:actor',5);
  assert.deepEqual([fresh.actionUsed,fresh.reactionUsed,fresh.movementUsed,fresh.movementExtraActionUsed],[0,0,0,false]);
});

test('v082: crossing speed spends standard action exactly once, up to twice movement speed',()=>{
  let current={actionUsed:0,actionMax:1,movementUsed:0};
  let result=recordMovementDistance(current,3,5);
  assert.equal(result.actionSpent,false);
  assert.equal(result.state.movementUsed,3);
  result=recordMovementDistance(result.state,3,5);
  assert.equal(result.actionSpent,true);
  assert.equal(result.state.actionUsed,1);
  assert.equal(result.state.movementExtraActionUsed,true);
  assert.equal(result.exceeded,false);
  result=recordMovementDistance(result.state,4,5);
  assert.equal(result.actionSpent,false);
  assert.equal(result.state.movementUsed,10);
  assert.equal(result.exceeded,false);
  result=recordMovementDistance(result.state,1,5);
  assert.equal(result.actionSpent,false);
  assert.equal(result.exceeded,true);
  assert.equal(result.state.actionUsed,1);
});

test('v082: movement cannot borrow already consumed standard action',()=>{
  const spentAttack={actionUsed:1,actionMax:1,movementUsed:5,movementExtraActionUsed:false};
  const extra=recordMovementDistance(spentAttack,1,5);
  assert.equal(extra.actionSpent,false);
  assert.equal(extra.exceeded,true);
  assert.equal(extra.state.actionUsed,1);
  assert.equal(extra.state.movementExtraActionUsed,false);
});

test('v082: teleport creates and consumes temporary Active Effect, preserving normal movement pool',()=>{
  const tracker=read('../scripts/combat/turn-tracker.mjs');
  const renderer=read('../scripts/combat/native-distance-display.mjs');
  assert.match(tracker,/name:`Movimento Temporário — \$\{name\}/);
  assert.match(tracker,/temporaryMovementPower/);
  assert.match(tracker,/createEmbeddedDocuments\('ActiveEffect'/);
  assert.match(tracker,/clearMovementGrant\(combatant\)/);
  assert.match(tracker,/movementIsTeleport\(movement\)/);
  assert.match(renderer,/temporaryTeleport/);
  assert.match(renderer,/remaining:Math\.max\(0,Number\(grant\.maximum\)-distance\)/);
  assert.match(read('../scripts/combat/turn-tracker-core.mjs'),/maximum:10\*rank/);
});

test('v082: distance label stays above token overlays',()=>{
  const css=read('../styles/native-distance-display.css');
  assert.match(css,/#m616-native-distance \{[^\n]*z-index:2147483000/);
  assert.match(css,/\.m616-distance-pill \{[^\n]*z-index:2147483001/);
  assert.match(css,/#m616-native-distance \{[^\n]*pointer-events:none/);
});
