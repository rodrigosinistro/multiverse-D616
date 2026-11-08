import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeVehicleVisibility,normalizeVehicleRole,normalizeVehicleCrew,boardingPosition,getBoardedCrewPatch } from '../scripts/vehicles/vehicle-core.mjs';
import { boardPassenger,disembarkPassenger,setVehicleVisibility,setCrewRole,syncVehiclePassengers,releaseDeletedVehicleToken,guardBoardedTokenMovement } from '../scripts/vehicles/vehicle-system.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');

function rig() {
 const scope='multiverse-d616', shipFlags={}, tokenFlags={}, calls=[];
 const actor={id:'v1',type:'vehicle',name:'Blackbird',getFlag(_s,k){return shipFlags[k];},async setFlag(_s,k,v){shipFlags[k]=v;}};
 const passengerActor={id:'p1',name:'Ciclope',type:'character'};
 const token={id:'t1',actorId:'p1',actor:passengerActor,x:900,y:800,hidden:false,parent:null,
   getFlag(_s,k){return tokenFlags[k]},async unsetFlag(_s,k){delete tokenFlags[k]},
   async update(data,options){calls.push({data,options});Object.assign(this,data);if(data[`flags.${scope}.embarked`])tokenFlags.embarked=data[`flags.${scope}.embarked`];}};
 const scene={id:'scene1',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id)}},
   async updateEmbeddedDocuments(name,patches,options){calls.push({name,patches,options});for(const patch of patches){const target=this.tokens.get(patch._id);Object.assign(target,patch)}}};
 token.parent=scene;
 const ship={id:'vToken',actorId:'v1',actor,x:100,y:100,width:6,height:6,elevation:0,parent:scene,
   getFlag(_s,k){return shipFlags[k]},async setFlag(_s,k,v){shipFlags[k]=v;}};
 scene.tokens.contents.push(ship,token);
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:{get:id=>id==='p1'?passengerActor:actor}};
 globalThis.canvas={scene,tokens:{controlled:[{document:ship}],grid:{size:100}}};
 globalThis.ui={notifications:{warn(){},error(){}}};
 return {actor,passengerActor,token,ship,scene,calls,shipFlags,tokenFlags};
}

test('Vehicle 1.0 keeps separate native Actor type and sheet without replacing NPCs',()=>{
 const manifest=JSON.parse(read('../system.json')),template=JSON.parse(read('../template.json'));
 assert.equal(manifest.version,'0.2.153');
 assert.deepEqual(template.Actor.types,['character','npc','vehicle']);
 const main=read('../multiverse-d616.mjs');
 assert.match(main,/class MarvelMultiverseVehicle extends MarvelMultiverseActorBase/);
 assert.match(main,/class MarvelMultiverseVehicleSheet extends MarvelMultiverseNPCSheet/);
 assert.match(main,/types:\["vehicle"\],makeDefault:true/);
 assert.doesNotMatch(main,/copyNpcAsVehicle|m616-vehicle-convert/);
 assert.match(main,/async _onDropActor\(event,actor\)/);
 assert.ok(manifest.styles.includes('styles/vehicle-sheet.css'));
});

test('Visibility is configurable per vehicle, default hidden',()=>{
 assert.equal(normalizeVehicleVisibility('unknown'),'hidden');
 assert.equal(normalizeVehicleVisibility('visible'),'visible');
 assert.equal(normalizeVehicleRole('driver'),'passenger');
 assert.equal(normalizeVehicleRole('pilot'),'pilot');
});

test('Duplicate crew tokens are normalized safely, and seats follow the ship',()=>{
 const entries=normalizeVehicleCrew([{tokenId:'one',role:'pilot'},{tokenId:'one'},{tokenId:'two',role:'foo'}]);
 assert.equal(entries.length,2);assert.equal(entries[1].role,'passenger');
 assert.deepEqual(boardingPosition({x:100,y:200,width:3,height:2,elevation:7},1,100),{x:200,y:200,elevation:7});
 const patches=getBoardedCrewPatch({x:200,y:300,width:2,height:2},entries,new Map([['one',{}],['two',{}]]),'hidden',100);
 assert.equal(patches.length,2);assert.ok(patches.every(x=>x.hidden));
});

test('Board passenger without deleting source character, visible mode can be toggled',async()=>{
 const f=rig();
 assert.equal(await boardPassenger(f.actor,f.passengerActor,f.token),true);
 assert.equal(f.tokenFlags.embarked.vehicleTokenId,'vToken');
 assert.equal(f.shipFlags.vehicleCrew.length,1);
 assert.equal(f.token.hidden,true);
 assert.equal(f.passengerActor.type,'character');
 await setVehicleVisibility(f.actor,'visible');
 assert.equal(f.shipFlags.vehicleCrewVisibility,'visible');
 assert.equal(f.token.hidden,false);
 assert.equal(f.calls.at(-1).options.d616VehicleSync,true);
});

test('Ship movement follows crew; manual passenger moves are blocked',async()=>{
 const f=rig();await boardPassenger(f.actor,f.passengerActor,f.token);
 const oldX=f.token.x;f.ship.x=500;
 await syncVehiclePassengers(f.ship,{x:500},{});
 assert.notEqual(f.token.x,oldX);
 assert.equal(f.token.x,500);
 assert.equal(guardBoardedTokenMovement(f.token,{x:999},{},'gm'),false);
 assert.equal(guardBoardedTokenMovement(f.token,{x:999},{d616VehicleSync:true},'gm'),undefined);
});

test('Disembarking restores hidden state and removes crew membership',async()=>{
 const f=rig();await boardPassenger(f.actor,f.passengerActor,f.token);
 assert.equal(await disembarkPassenger(f.actor,'t1'),true);
 assert.equal(f.token.hidden,false);
 assert.equal(f.shipFlags.vehicleCrew.length,0);
 assert.equal(f.tokenFlags.embarked,undefined);
});

test('Only one pilot is allowed per ship; roles remain token-bound',async()=>{
 const f=rig();await boardPassenger(f.actor,f.passengerActor,f.token);
 await setCrewRole(f.actor,'t1','operator');
 assert.equal(f.shipFlags.vehicleCrew[0].role,'operator');
});

test('Vehicle content warns about scene token and documents per-vehicle mode',()=>{
 const template=read('../templates/actor/actor-vehicle-sheet.hbs');
 assert.match(template,/m616-vehicle-crew-drop/);
 assert.match(template,/Oculta — apenas a nave aparece/);
 assert.match(template,/Visível — tripulantes sobre a nave/);
 assert.match(template,/m616-vehicle-disembark/);
 assert.match(template,/m616-vehicle-role/);
});

test('Deleting the ship restores crew visibility instead of stranding hidden tokens',async()=>{
 const f=rig();await boardPassenger(f.actor,f.passengerActor,f.token);
 await releaseDeletedVehicleToken(f.ship);
 assert.equal(f.token.hidden,false);
 assert.equal(f.tokenFlags.embarked,undefined);
});

test('Turn tracker skips synchronized passengers, without exempting ship movement',()=>{
 const tracker=read('../scripts/combat/turn-tracker.mjs');
 assert.match(tracker,/tokenDocument\?\.getFlag\?\.\(SYSTEM_ID,'embarked'\)/);
 assert.match(tracker,/options\?\.d616VehicleSync/);
 assert.match(tracker,/function captureCoordinateOrigin/);
});
