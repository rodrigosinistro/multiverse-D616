import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crewInitiativeEntries,duplicateCrewCombatantIds,vehicleCrewCombatant} from '../scripts/vehicles/vehicle-combat-core.mjs';
import {addVehicleCrewToCombat,rollVehicleCrewInitiative} from '../scripts/vehicles/vehicle-system.mjs';

const actor=id=>({id,type:'character',testUserPermission:(u,n)=>u?.id==='player'&&id==='override'&&n===3});
function scenario(){
  const override={id:'embarked-override',actorId:'override',actor:actor('override')};
  const copy={id:'another-override-token',actorId:'override',actor:override.actor};
  const zima={id:'zima-token',actorId:'zima',actor:actor('zima')};
  const crew=[{actorId:'override',tokenId:override.id,role:'pilot'},
    {actorId:'zima',tokenId:zima.id,role:'passenger'}];
  const ship={id:'ship-token',actorId:'ship',actor:{type:'vehicle',id:'ship'},
    getFlag:(_scope,key)=>key==='vehicleCrew'?crew:null};
  const scene={id:'scene',tokens:{contents:[ship,override,copy,zima],get(id){return this.contents.find(t=>t.id===id)}}};
  ship.parent=scene;
  return {ship,scene,crew,override,copy,zima};
}

test('Do not add a second Override when a different token of the same Actor is already in initiative',()=>{
  const {ship,scene}=scenario();
  const entries=crewInitiativeEntries(ship,scene,[{id:'combat-one',tokenId:'another-override-token',actorId:'override'}]);
  assert.deepEqual(entries,[{tokenId:'zima-token',actorId:'zima',hidden:false}]);
});

test('Do not add a second Override even when an actor-only Combatant has no token',()=>{
  const {ship,scene}=scenario();
  assert.deepEqual(crewInitiativeEntries(ship,scene,[{id:'actor-combatant',actor:{id:'override'}}]),
    [{tokenId:'zima-token',actorId:'zima',hidden:false}]);
});

test('Two seats referencing one Actor produce just one Override combatant',()=>{
  const {ship,scene,crew}=scenario();
  crew.push({actorId:'override',tokenId:'another-override-token',role:'passenger'});
  const entries=crewInitiativeEntries(ship,scene,[]);
  assert.equal(entries.length,2);
  assert.deepEqual(entries.map(c=>c.actorId),['override','zima']);
});

test('Existing duplicated combatants get cleaned up only for crew, never unrelated NPC enemies',()=>{
  const {ship,scene}=scenario();
  const before=[
    {id:'offboard',tokenId:'another-override-token',actorId:'override',initiative:null},
    {id:'onboard',tokenId:'embarked-override',actorId:'override',initiative:15},
    {id:'sentinel-1',tokenId:'sentinel-a',actorId:'sentinel'},
    {id:'sentinel-2',tokenId:'sentinel-b',actorId:'sentinel'},
  ];
  assert.deepEqual(duplicateCrewCombatantIds(ship,scene,before),['offboard']);
  assert.deepEqual(duplicateCrewCombatantIds(ship,scene,before,'offboard'),['onboard'],
    'never delete the currently acting Combatant');
});

test('Adding a vehicle to a combat already containing two Override entries cleans only the extra entry',async()=>{
  const {ship,scene}=scenario();
  const records=new Map([
    ['offboard',{id:'offboard',tokenId:'another-override-token',actorId:'override',initiative:null}],
    ['onboard',{id:'onboard',tokenId:'embarked-override',actorId:'override',initiative:12}],
    ['sentinel-1',{id:'sentinel-1',tokenId:'sentinel-a',actorId:'sentinel'}],
    ['sentinel-2',{id:'sentinel-2',tokenId:'sentinel-b',actorId:'sentinel'}],
  ]);
  const removed=[];
  const combat={id:'combat',scene,combatants:records,
    async deleteEmbeddedDocuments(_type,ids){removed.push(...ids);for(const id of ids)records.delete(id);},
    async createEmbeddedDocuments(_type,entries){for(const e of entries)records.set(e.tokenId,{...e,id:e.tokenId});return entries;}};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};
  const created=await addVehicleCrewToCombat(combat,ship);
  assert.deepEqual(removed,['offboard']);
  assert.deepEqual(created,[{actorId:'zima',tokenId:'zima-token',hidden:false}]);
  assert.equal(records.has('onboard'),true);
  assert.equal(records.has('sentinel-1'),true);
  assert.equal(records.has('sentinel-2'),true);
});

test('Vehicle power action recognizes existing character Combatant with alternate token ID',()=>{
  const {ship,scene}=scenario();
  const alt={id:'other-combatant',tokenId:'another-override-token',actorId:'override',actor:actor('override')};
  const combat={scene,combatants:new Map([['other-combatant',alt]]),combatant:alt};
  assert.equal(vehicleCrewCombatant(combat,ship,{id:'player',character:{id:'override'}}),alt);
});

test('Native create and post-create hooks keep passengers unique without restricting unrelated NPCs',()=>{
  const src=fs.readFileSync(new URL('../scripts/vehicles/vehicle-system.mjs',import.meta.url),'utf8');
  assert.match(src,/Hooks\.on\('preCreateCombatant'/);
  assert.match(src,/current\.some\(c=>combatantActorId\(c,scene\)===String\(actorId\)\)/);
  assert.match(src,/Hooks\.on\('createCombatant'/);
  assert.match(src,/duplicateCrewCombatantIds\(ship,scene,current/);
});

test('Vehicle initiative button can roll existing unrolled Override represented by another token',async()=>{
  const {ship,scene}=scenario();
  const record={id:'different-token',tokenId:'another-override-token',actorId:'override',initiative:null};
  const rolls=[];
  const combat={id:'combat',scene,combatants:new Map([[record.id,record]]),
    async deleteEmbeddedDocuments(_type,ids){for(const id of ids)this.combatants.delete(id);},
    async createEmbeddedDocuments(_type,entries){for(const e of entries)this.combatants.set(e.tokenId,{...e,id:e.tokenId,initiative:null});return entries;},
    async rollInitiative(ids){rolls.push(...ids);}};
  globalThis.canvas={scene,tokens:{controlled:[{document:ship}]}};
  globalThis.game={user:{id:'gm',isGM:true},combat,users:{activeGM:{id:'gm'}}};
  await rollVehicleCrewInitiative(ship.actor);
  assert.deepEqual(rolls,['different-token','zima-token']);
  assert.equal(combat.combatants.size,2);
});
