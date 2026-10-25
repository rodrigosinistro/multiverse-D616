import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validInitiativeStripPosition,clampInitiativeStripPosition} from '../scripts/combat/compact-combat-position.mjs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
test('floating initiative position sanitizes and clamps to viewport', () => {
  assert.equal(validInitiativeStripPosition({}),false);
  assert.equal(validInitiativeStripPosition({left:10,top:20}),true);
  assert.equal(validInitiativeStripPosition({left:'10',top:20}),false);
  assert.deepEqual(clampInitiativeStripPosition({left:100,top:50},{width:350,height:60},1600,900),{left:100,top:50});
  assert.deepEqual(clampInitiativeStripPosition({left:2000,top:900},{width:350,height:60},1600,900),{left:1250,top:840});
  assert.deepEqual(clampInitiativeStripPosition({left:-100,top:-80},{width:350,height:60},1600,900),{left:0,top:0});
  assert.deepEqual(clampInitiativeStripPosition({left:200,top:200},{width:350,height:60},200,40),{left:0,top:0});
});
test('initiative bar supports mouse/touch drag and client-side persistence', () => {
  const source=read('../scripts/combat/compact-combat-display.mjs');
  assert.match(source,/pointerdown.*onStripPointerDown/);
  assert.match(source,/pointermove.*onStripPointerMove/);
  assert.match(source,/pointerup.*onStripPointerUp/);
  assert.match(source,/pointercancel.*onStripPointerCancel/);
  assert.match(source,/closest\?\.\('\.m616-compact-drag-handle'\)/);
  assert.match(source,/scope: 'client', config: false, type: Object, default: \{\}/);
  assert.match(source,/game.settings.set\(SYSTEM, POSITION_SETTING, clamped\)/);
  assert.match(source,/window.addEventListener\('resize', repositionOnResize\)/);
  assert.match(source,/if \(!strip \|\| stripDrag\) return/);
});
test('end combat is GM-only and uses existing tracker confirmation',()=>{
  const source=read('../scripts/combat/compact-combat-display.mjs');
  const tracker=read('../scripts/combat/turn-tracker.mjs');
  assert.match(source,/gm && combat.started \? `<button[^`]+data-m616-compact-control="end"/);
  assert.match(source,/await tracker\?\.controlCombat\?\.\(action\)/);
  assert.match(tracker,/if \(action === "end"\) \{/);
  assert.match(tracker,/await confirmEndCombat\(combat\)/);
  assert.match(tracker,/await combat.endCombat\(\)/);
});
