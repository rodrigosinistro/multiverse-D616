import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  actorMovementForAction, combatantMovementMaximum, combatantMovementInfo,
  movementModeForAction, sanitizeTurnState,
} from '../scripts/combat/turn-tracker-core.mjs';
import {sceneDistanceSpaces,euclideanSpaces,distanceStatus,remainingSpaces,canShowTokenToUser} from '../scripts/combat/native-distance-core.mjs';
import {movementArrowFill as arrows} from '../scripts/combat/compact-combat-core.mjs';
const text = path => readFileSync(new URL(path,import.meta.url),'utf8');
const character={system:{movement:{
 run:{value:5,active:true,noncom:250},flight:{value:30,active:true,noncom:1500},
 climb:{value:3,active:true},swim:{value:4,active:true},jump:{value:6,active:true},
 glide:{value:8,active:true},swingline:{value:11,active:true},levitation:{value:7,active:true},
}}};
const combatant = mode=>({actor:character,token:{movementAction:mode}});
test('flight uses 30 spaces selected on Foundry token instead of walking 5',()=>{
 assert.equal(combatantMovementMaximum(combatant('fly')),30);
 assert.equal(combatantMovementMaximum(combatant('walk')),5);
 assert.equal(combatantMovementMaximum(combatant(null)),5);
 assert.deepEqual(combatantMovementInfo(combatant('fly')),{mode:'flight',maximum:30});
 const state=sanitizeTurnState({movementUsed:6},combatantMovementMaximum(combatant('fly')));
 assert.equal(state.movementUsed,6);
 assert.equal(state.movementMax,30);
 assert.deepEqual(arrows(state).map(v=>Math.round(v*100)),[100,100,100,20]);
});
test('other selected modes map to real combat speeds',()=>{
 for(const [action,maximum] of [['swim',4],['climb',3],['jump',6],['glide',8],['swing',11],['levitate',7],['fly',30]]){
  assert.equal(combatantMovementMaximum(combatant(action)),maximum,action);
 }
 assert.equal(movementModeForAction('FLY'),'flight');
 assert.equal(movementModeForAction('unknown'),'run');
});
test('teleport is not a movement bank, unavailable powers are not granted',()=>{
 assert.equal(actorMovementForAction(character,'teleport').maximum,0);
 assert.equal(actorMovementForAction({system:{movement:{run:{value:5},flight:{value:30,active:false}}}},'fly').maximum,0);
 assert.equal(actorMovementForAction({system:{movement:{run:{value:5},flight:{value:30}}}},'fly').maximum,30);
});
test('changing mode keeps used movement; fresh 4-arrow scale is recomputed without bonus',()=>{
 const spent=7;
 const walk=sanitizeTurnState({movementUsed:spent},combatantMovementMaximum(combatant('walk')));
 const fly=sanitizeTurnState(walk,combatantMovementMaximum(combatant('fly')));
 assert.equal(fly.movementUsed,spent);
 assert.equal(fly.movementMax,30);
 assert.equal(walk.movementMax,5);
 assert.deepEqual(arrows(walk),[0,0,0,0]);
 assert.deepEqual(arrows(fly).map(v=>Math.round(v*100)),[100,100,100,7]);
});
test('grid-measured distance in spaces, fallback Euclidean and elevation',()=>{
 const a={x:0,y:0,elevation:0},b={x:300,y:400,elevation:0};
 assert.equal(sceneDistanceSpaces({grid:{distance:5,size:100}},a,b,{measurePath:()=>({spaces:7})}),7);
 assert.equal(sceneDistanceSpaces({grid:{distance:5,size:100}},a,b,{measurePath:()=>({distance:20})}),4);
 assert.equal(sceneDistanceSpaces({grid:{distance:5,size:100}},a,b,{}),5);
 assert.equal(euclideanSpaces(a,{x:0,y:0,elevation:15},100,5),3);
});
test('distance remaining uses combat speed, never noncom',()=>{
 const stat=distanceStatus({actor:character,action:'fly',used:12,proposal:10});
 assert.deepEqual(stat,{mode:'flight',maximum:30,used:12,proposal:10,remaining:8,exceeds:false});
 assert.equal(distanceStatus({actor:character,action:'fly',used:22,proposal:10}).exceeds,true);
 assert.equal(remainingSpaces(5,6),0);
});
test('hidden target is never exposed to players',()=>{
 const token={visible:true,document:{hidden:true}};
 assert.equal(canShowTokenToUser(token,false),false);
 assert.equal(canShowTokenToUser(token,true),true);
 assert.equal(canShowTokenToUser({visible:false,document:{hidden:false}},true),false);
});
test('tracker reads combatant current movement action everywhere',()=>{
 const tracker=text('../scripts/combat/turn-tracker.mjs');
 assert.match(tracker,/combatantMovementMaximum\(combatant\)/);
 assert.doesNotMatch(tracker,/actorMovementMaximum\(combatantActor\(combatant\)\)/);
 assert.match(tracker,/Hooks\.on\("moveToken"/);
 const compact=text('../scripts/combat/compact-combat-display.mjs');
 assert.match(compact,/combatantMovementInfo\(c\)/);
 assert.match(compact,/getState\(c\)\?\.movementMax/);
});
test('native mode listens hover, drag, move, pan and can be disabled',()=>{
 const src=text('../scripts/combat/native-distance-display.mjs');
 assert.match(src,/Hooks\.on\('hoverToken'/);
 assert.match(src,/Hooks\.on\('moveToken'/);
 assert.match(src,/Hooks\.on\('canvasPan'/);
 assert.match(src,/canvas\?\.tokens\?\._draggedToken/);
 assert.match(src,/scope:'client',config:true,type:Boolean,default:true/);
 assert.match(src,/canShowTokenToUser\(t,!!game.user\?\.isGM\)/);
 assert.match(text('../styles/native-distance-display.css'),/pointer-events:none/);
});
test('manifest and README policy, versioned release',()=>{
 const manifest=JSON.parse(text('../system.json'));
 assert.equal(manifest.version,'0.2.99');
 assert.ok(manifest.esmodules.includes('scripts/combat/native-distance-display.mjs'));
 assert.ok(manifest.styles.includes('styles/native-distance-display.css'));
 assert.ok(text('../CHANGELOG.md').startsWith('## v0.2.99'));
 assert.ok(!text('../README.md').includes('v0.2.90'));
});
