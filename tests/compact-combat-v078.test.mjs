import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  availableTurnIcons, movementArrowFill, combatantsInInitiativeOrder, canDisplayCombatToken,
} from '../scripts/combat/compact-combat-core.mjs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('action and reaction indicators disappear as resources are consumed', () => {
  const state = {actionMax:1, actionUsed:0, reactionMax:2, reactionUsed:0};
  assert.equal(availableTurnIcons(state,'action'),1);
  assert.equal(availableTurnIcons(state,'reaction'),2);
  state.actionUsed=1;state.reactionUsed=1;
  assert.equal(availableTurnIcons(state,'action'),0);
  assert.equal(availableTurnIcons(state,'reaction'),1);
  state.reactionUsed=5;
  assert.equal(availableTurnIcons(state,'reaction'),0);
});
test('four movement arrows preserve exact quarters and partial moves', () => {
  assert.deepEqual(movementArrowFill({movementMax:8,movementUsed:0}),[1,1,1,1]);
  assert.deepEqual(movementArrowFill({movementMax:8,movementUsed:2}),[1,1,1,0]);
  assert.deepEqual(movementArrowFill({movementMax:8,movementUsed:3}),[1,1,.5,0]);
  assert.deepEqual(movementArrowFill({movementMax:8,movementUsed:8}),[0,0,0,0]);
  assert.deepEqual(movementArrowFill({movementMax:8,movementUsed:20}),[0,0,0,0]);
  assert.deepEqual(movementArrowFill({movementMax:0,movementUsed:0}),[0,0,0,0]);
});
test('top initiative row obeys order, hidden combatants and pre-combat state', () => {
  const first={id:'a',initiative:20,hidden:false};
  const secret={id:'b',initiative:18,hidden:true};
  const last={id:'c',initiative:3,hidden:false};
  const combat={turns:[first,secret,last]};
  assert.deepEqual(combatantsInInitiativeOrder(combat,false).map(c=>c.id),['a','c']);
  assert.deepEqual(combatantsInInitiativeOrder(combat,true).map(c=>c.id),['a','b','c']);
});
test('token overlay only appears on visible combat tokens in active scene',()=>{
  const combat={started:true,scene:{id:'scene1'}};
  const token={visible:true,document:{parent:{id:'scene1'},hidden:false}};
  assert.equal(canDisplayCombatToken(combat,token,false),true);
  token.document.hidden=true;
  assert.equal(canDisplayCombatToken(combat,token,false),false);
  token.document.hidden=false; token.document.parent.id='scene2';
  assert.equal(canDisplayCombatToken(combat,token,true),false);
  combat.started=false;
  assert.equal(canDisplayCombatToken(combat,token,true),false);
});
test('Foundry v14 wires compact mode to the existing authoritative tracker',()=>{
  const manifest=JSON.parse(read('../system.json'));
  assert.equal(manifest.version,'0.2.84');
  assert.equal(manifest.compatibility.minimum,'14');
  assert.ok(manifest.esmodules.includes('scripts/combat/compact-combat-display.mjs'));
  assert.ok(manifest.styles.includes('styles/compact-combat-display.css'));
  const old=read('../scripts/combat/turn-tracker.mjs');
  assert.match(old,/setCompactMode: \(compact\)/);
  assert.match(old,/controlCombat: \(action\) => runCombatControl\(action\)/);
  assert.match(old,/if \(compactModeEnabled\(\)\) return false;/);
  const compact=read('../scripts/combat/compact-combat-display.mjs');
  assert.match(compact,/getState\?\.\(combatant\)/);
  assert.match(compact,/requestAnimationFrame/);
  assert.match(compact,/Hooks\.on\('canvasPan', scheduleRender\)/);
  assert.match(compact,/scope: 'client', config: true, type: Boolean, default: true/);
});
