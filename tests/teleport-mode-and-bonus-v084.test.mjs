import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resetTurnState,actorMovementForAction,teleportPowerGrant} from '../scripts/combat/turn-tracker-core.mjs';
const read = (file) => readFileSync(new URL(file,import.meta.url),'utf8');

test('v084: temporary Teleport keeps Foundry v14 movementAction unchanged', () => {
  const tracker = read('../scripts/combat/turn-tracker.mjs');
  assert.match(tracker,/kind:'teleport',maximum,powerName:name/);
  assert.match(tracker,/await combatant.setFlag\(SYSTEM_ID,TEMP_MOVEMENT_FLAG/);
  assert.match(tracker,/await combatant.unsetFlag\(SYSTEM_ID, TEMP_MOVEMENT_FLAG\)/);
  assert.match(tracker,/deleteEmbeddedDocuments\('ActiveEffect'/);
  assert.doesNotMatch(tracker,/update\(\{movementAction\s*:\s*['"]teleport['"]/);
  assert.match(read('../scripts/combat/native-distance-display.mjs'),/temporaryTeleport/);
});

test('v084: teleport reserve uses Rank and does not replace ordinary Fly speed', () => {
  const actor={ system:{ attributes:{ rank:{value:3} }, movement:{run:{value:6},flight:{value:30,active:true}} } };
  assert.deepEqual(teleportPowerGrant({name:'Teleport 1',type:'power',actor}),{powerName:'Teleport 1',maximum:30});
  assert.equal(actorMovementForAction(actor,'fly').maximum,30);
  assert.equal(actorMovementForAction(actor,'walk').maximum,6);
});

test('v084: resources reset at the start of the next turn, not simply on bonus-round end', () => {
  const tracker = read('../scripts/combat/turn-tracker.mjs');
  assert.match(tracker,/bonusRound\(combat\) \? "bonus" : "regular"/);
  assert.match(tracker,/if \(!key \|\| current.resetKey === key\) return;/);
  const spent={actionUsed:1,reactionUsed:1,movementUsed:6,movementExtraActionUsed:true};
  const next=resetTurnState(spent,'encounter:regular:1:2:zima',6);
  assert.equal(next.actionUsed,0);
  assert.equal(next.reactionUsed,0);
  assert.equal(next.movementUsed,0);
  assert.equal(next.movementExtraActionUsed,false);
});
