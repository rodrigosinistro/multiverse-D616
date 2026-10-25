import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorRankForMovement,teleportPowerGrant,movementPreviewNotice,recordMovementDistance} from '../scripts/combat/turn-tracker-core.mjs';

const actor={system:{attributes:{rank:{value:6}},movement:{run:{value:6}}}};

test('v083 Teleport 1 on actual D616 actor Rank 6 creates 60 spaces',()=>{
  assert.equal(actorRankForMovement(actor),6);
  assert.deepEqual(teleportPowerGrant({type:'power',name:'Teleport 1',actor}),{powerName:'Teleport 1',maximum:60});
  assert.deepEqual(teleportPowerGrant({type:'power',name:'Teleport 2',actor}),{powerName:'Teleport 2',maximum:60});
  assert.deepEqual(teleportPowerGrant({type:'power',name:'Teleport Blind',actor}),{powerName:'Teleport Blind',maximum:60});
  assert.deepEqual(teleportPowerGrant({type:'power',name:'Blink',actor}),{powerName:'Blink',maximum:6});
});

test('v083 actor Rank lookup tolerates legacy shape but ignores nonexistent rank',()=>{
  assert.equal(actorRankForMovement({system:{rank:{value:3}}}),3);
  assert.equal(actorRankForMovement({system:{attributes:{rank:4}}}),4);
  assert.equal(actorRankForMovement({system:{rank:{value:'NaN'}}}),0);
  assert.equal(teleportPowerGrant({type:'power',name:'Teleport Object',actor}),null);
  assert.equal(teleportPowerGrant({type:'weapon',name:'Teleport 1',actor}),null);
});

test('v083 show exact notice before drop when extra movement can spend action',()=>{
  const available={movementUsed:4,actionUsed:0,actionMax:1,movementExtraActionUsed:false};
  assert.equal(movementPreviewNotice(available,6,2),null);
  const notice=movementPreviewNotice(available,6,4);
  assert.deepEqual(notice,{kind:'action',text:'Esse Movimento usará também sua Ação Padrão.'});
  const move=recordMovementDistance(available,4,6);
  assert.equal(move.actionSpent,true);
  assert.equal(move.state.actionUsed,1);
  assert.equal(move.state.movementUsed,8);
});

test('v083 do not promise second action when already consumed or doubled limit',()=>{
  const spent={movementUsed:4,actionUsed:1,actionMax:1};
  assert.equal(movementPreviewNotice(spent,6,3)?.kind,'exceeded');
  assert.equal(movementPreviewNotice({movementUsed:5,actionUsed:0,actionMax:1},6,8)?.kind,'exceeded');
  assert.equal(movementPreviewNotice({movementUsed:7,actionUsed:1,actionMax:1,movementExtraActionUsed:true},6,2),null);
  assert.equal(movementPreviewNotice({movementUsed:11,actionUsed:1,actionMax:1,movementExtraActionUsed:true},6,2)?.kind,'exceeded');
});

test('v083 label is a second line and teleport effect not momentarily expired',()=>{
  const renderer=readFileSync(new URL('../scripts/combat/native-distance-display.mjs',import.meta.url),'utf8');
  const tracker=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('../styles/native-distance-display.css',import.meta.url),'utf8');
  assert.match(renderer,/movementPreviewNotice\(state, result.maximum, distance\)/);
  assert.match(renderer,/secondary\.textContent = secondaryText/);
  assert.match(css,/\.m616-distance-secondary \{display:block/);
  assert.match(tracker,/const power = teleportPowerGrant\(item\)/);
  assert.match(tracker,/duration:\{\},transfer:false/);
  assert.match(tracker,/grantMovementPower\(combatant,payload\)/);
  assert.match(tracker,/clearMovementGrant\(combatant\)/);
});
