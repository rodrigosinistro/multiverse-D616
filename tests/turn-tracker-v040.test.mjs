import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { actorReactionMaximum, hasCombatReflexes, resolveTurnResourceState } from '../scripts/combat/reaction-limits.mjs';
import { sanitizeTurnState, consumeTurnResources, resetTurnState } from '../scripts/combat/turn-tracker-core.mjs';

const asActor = (items) => ({ items });
const trait = (name) => ({ type: 'trait', name });

test('Combat Reflexes grants two Reactions, other traits and powers do not', () => {
  assert.equal(actorReactionMaximum(asActor([])), 1);
  assert.equal(actorReactionMaximum(asActor([trait('Combat Reflexes')])), 2);
  assert.equal(actorReactionMaximum(asActor([trait('Reflexos de Combate')])), 2);
  assert.equal(actorReactionMaximum(asActor([trait('Reflexos de Combate'), trait('Combat Reflexes')])), 2);
  assert.equal(actorReactionMaximum(asActor([{ type: 'power', name: 'Combat Reflexes' }])), 1);
  assert.equal(actorReactionMaximum(asActor([trait('Combat Reflex') ])), 1);
  assert.equal(hasCombatReflexes(asActor([trait('Combat Reflexes')])), true);
});

test('collection .values() works as on Foundry Actor.items', () => {
  const collection = new Map([['a', trait('Combat Reflexes')]]);
  assert.equal(actorReactionMaximum(asActor(collection)), 2);
});

test('old saved reaction maximum is reconciled without migration or lost actions', () => {
  const flagged = sanitizeTurnState({reactionMax:1,reactionUsed:1,actionUsed:1,movementUsed:2},6);
  const live = resolveTurnResourceState(flagged, asActor([trait('Combat Reflexes')]));
  assert.equal(live.reactionMax, 2);
  assert.equal(live.reactionUsed, 1);
  assert.equal(live.actionUsed, 1);
  assert.equal(live.movementUsed, 2);
  const spent = consumeTurnResources(live,['reaction'],6);
  assert.equal(spent.reactionUsed, 2);
  assert.equal(spent.reactionMax, 2);
  const reset = resetTurnState(spent,'combat:3:2',6);
  assert.equal(reset.reactionUsed,0);
  assert.equal(reset.reactionMax,2);
  assert.equal(resolveTurnResourceState(reset,asActor([])).reactionMax,1);
});

test('new hooks refresh tracker when Combat Reflexes changes in another client', () => {
  const code = readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  assert.match(code,/resolveTurnResourceState\(sanitizeTurnState\(/);
  assert.match(code,/Hooks\.on\("updateActor", refreshIfCombatActor\)/);
  assert.match(code,/"createItem", "updateItem", "deleteItem"/);
  assert.match(code,/refreshIfCombatActor\(item\?\.parent\)/);
  assert.match(code,/schedulePopupRender\(\{ force: true \}\)/);
  assert.match(code,/m616-popup-resource.*is-exhausted/s);
  assert.match(code,/formatValue\(maximum\)/);
});

test('HUD retains scroll and refreshes for nested power effects', () => {
  const code=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
  assert.match(code,/const previousScroll = body\.scrollTop/);
  assert.match(code,/if \(previousTab === tab\) body\.scrollTop = previousScroll/);
  assert.match(code,/this\.isSelectedActor\(parent\?\.actor \?\? parent\)/);
});

test('failure ACK is sent when GM rejects by exception', () => {
 const code=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
 assert.match(code,/payload\.type === "turnTrackerRequest" && payload\.requestId/);
 assert.match(code,/userId: requestingUser\.id, success: false/);
});
