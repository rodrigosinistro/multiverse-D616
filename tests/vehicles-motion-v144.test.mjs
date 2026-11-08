import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {followVehicleDuringMovement, registerVehicleHooks} from '../scripts/vehicles/vehicle-system.mjs';

const scope='multiverse-d616';
function setup(mode='visible', isGM=true) {
  const callbacks=new Set(),updates=[],shipFlags={},tokenFlags={};
  const ticker={add(f){callbacks.add(f)},remove(f){callbacks.delete(f)}};
  const shipPos={x:100,y:100};
  const memberPos={x:100,y:100,set(x,y){this.x=x;this.y=y;}};
  const scene={id:'scene',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id)}},
    async updateEmbeddedDocuments(type,changes,options){
      updates.push({type,changes,options});
      for (const change of changes){const t=this.tokens.get(change._id);Object.assign(t,change);}
    }};
  const actor={id:'vehicle',type:'vehicle',getFlag(_s,k){if(k==='vehicleCrewVisibility')return mode; return shipFlags[k]}};
  const memberActor={id:'member',type:'character'};
  const ship={id:'ship',actorId:'vehicle',actor,x:100,y:100,width:2,height:2,elevation:0,parent:scene,
    object:{position:shipPos},getFlag(_s,k){if(k==='vehicleCrew')return [{tokenId:'crew',role:'pilot',actorId:'member'}];return shipFlags[k];}};
  const member={id:'crew',actorId:'member',actor:memberActor,x:100,y:100,hidden:mode!=='visible',
    object:{position:memberPos},parent:scene,getFlag(_s,k){return tokenFlags[k]}};
  scene.tokens.contents.push(ship,member);
  globalThis.canvas={scene,app:{ticker},tokens:{get(id){return scene.tokens.get(id)?.object},grid:{size:100}}};
  globalThis.game={user:{id:isGM?'gm':'player',isGM},users:{activeGM:{id:'gm'}}};
  let resolveEnd;
  const movement={destination:{x:500,y:300,elevation:4},animation:{duration:1000,ended:new Promise(r=>resolveEnd=r)}};
  return {callbacks,updates,ship,member,shipPos,memberPos,movement,resolveEnd};
}
const spin=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

test('Vehicle 1.2 visible crew follows rendered ship every frame and only persists after it ends',async()=>{
  const f=setup();
  followVehicleDuringMovement(f.ship,f.movement);
  assert.equal(f.callbacks.size,1);
  assert.equal(f.updates.length,0,'no late independent document animation');
  f.shipPos.x=325;f.shipPos.y=215;
  for(const tick of f.callbacks)tick();
  assert.deepEqual([f.memberPos.x,f.memberPos.y],[325,215], 'crew rendered with the ship, no latency');
  f.shipPos.x=500;f.shipPos.y=300;
  for(const tick of f.callbacks)tick();
  assert.equal(f.memberPos.x,500);
  f.resolveEnd();await spin();
  assert.equal(f.callbacks.size,0,'ticker stopped after animation');
  assert.equal(f.updates.length,1);
  assert.deepEqual([f.updates[0].changes[0].x,f.updates[0].changes[0].y],[500,300]);
  assert.equal(f.updates[0].options.animate,false,'do not start a second animation');
  assert.equal(f.updates[0].options.d616VehicleSync,true);
});

test('Vehicle 1.3 hidden crew also visually follows the ship for the GM',async()=>{
  const f=setup('hidden');
  followVehicleDuringMovement(f.ship,f.movement);
  assert.equal(f.callbacks.size,1,'GM sees hidden tokens; they must not trail behind');
  f.shipPos.x=200; f.shipPos.y=400;
  for (const tick of f.callbacks) tick();
  assert.deepEqual([f.memberPos.x,f.memberPos.y],[200,400]);
  assert.equal(f.updates.length,0);
  f.resolveEnd();await spin();
  assert.equal(f.updates.length,1);
  assert.equal(f.updates[0].changes[0].hidden,true);
});

test('Vehicle 1.2 non-GM clients follow visuals but cannot write crew document updates',async()=>{
  const f=setup('visible',false);
  followVehicleDuringMovement(f.ship,f.movement);
  f.shipPos.x=240;for(const tick of f.callbacks)tick();
  assert.equal(f.memberPos.x,240);
  f.resolveEnd();await spin();
  assert.equal(f.callbacks.size,0);
  assert.equal(f.updates.length,0);
});

test('Vehicle 1.2 superseded move does not write stale positions',async()=>{
  const f=setup();
  followVehicleDuringMovement(f.ship,f.movement);
  let resolveEnd2;
  const m2={destination:{x:750,y:600},animation:{ended:new Promise(r=>resolveEnd2=r)}};
  followVehicleDuringMovement(f.ship,m2);
  assert.equal(f.callbacks.size,1);
  f.resolveEnd();await spin();
  assert.equal(f.updates.length,0,'old segment cannot teleport passengers back');
  resolveEnd2();await spin();
  assert.equal(f.updates.length,1);
  assert.equal(f.updates[0].changes[0].x,750);
});

test('Vehicle 1.2 movement panel displays active modes and live movement fields below damage',()=>{
  const template=readFileSync(new URL('../templates/actor/actor-vehicle-sheet.hbs',import.meta.url),'utf8');
  const styles=readFileSync(new URL('../styles/vehicle-sheet.css',import.meta.url),'utf8');
  assert.match(template,/<div class="m616-vehicle-right-column">/);
  assert.ok(template.indexOf('mm-v2-damage')<template.indexOf('m616-vehicle-movement'));
  assert.match(template, /{{#each system\.movement as \|speed key\|}}/);
  assert.match(template, /{{#if speed\.active}}/);
  assert.match(template, /{{speed\.noncom}}/);
  assert.match(styles,/\.m616-vehicle-right-column/);
});

test('Vehicle 1.2 registers v14 moveToken and does not double sync ordinary x/y changes',()=>{
  const callbacks={};
  globalThis.Hooks={on(event,callback){callbacks[event]=callback}};
  globalThis.game={user:{isGM:true},multiverseD616:{}};
  registerVehicleHooks();
  assert.equal(typeof callbacks.moveToken,'function');
  const f=setup('visible');
  callbacks.updateToken(f.ship,{x:500},{d616VehicleSync:false});
  assert.equal(f.updates.length,0);
  callbacks.moveToken(f.ship,f.movement);
  assert.equal(f.callbacks.size,1);
  f.resolveEnd();
});
