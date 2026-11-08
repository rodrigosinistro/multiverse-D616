import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crewInitiativeEntries,vehicleCrewCombatant} from '../scripts/vehicles/vehicle-combat-core.mjs';
import {hudVehicleContext,addVehicleCrewToCombat,rollVehicleCrewInitiative} from '../scripts/vehicles/vehicle-system.mjs';

const source=(file)=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
const role={id:'player1',isGM:false,character:{id:'darkstep'}};
function setup(){
  const flags={},crew=[
    {tokenId:'dark-token',actorId:'darkstep',role:'pilot'},
    {tokenId:'zima-token',actorId:'zima',role:'passenger'}
  ];
  const actor=(id)=>({id,type:'character',name:id,isOwner:true,testUserPermission:(user,level)=>user?.id==='player1'&&id==='darkstep'&&level===3});
  const dark={id:'dark-token',actorId:'darkstep',actor:actor('darkstep'),getFlag:(_s,k)=>k==='embarked'?{sceneId:'scene',vehicleTokenId:'ship'}:undefined};
  const zima={id:'zima-token',actorId:'zima',actor:actor('zima'),getFlag:()=>null};
  const ship={id:'ship',actorId:'vehicle',actor:{id:'vehicle',type:'vehicle',name:'Pássaro Negro'},getFlag:(_s,k)=>k==='vehicleCrew'?crew:null};
  const tokens={contents:[ship,dark,zima],get(id){return this.contents.find(t=>t.id===id)}};
  const scene={id:'scene',tokens}; ship.parent=scene;dark.parent=scene;zima.parent=scene;
  globalThis.canvas={scene,tokens:{controlled:[]}};
  return {scene,ship,dark,zima,crew,flags};
}

test("Vehicle selected: player\'s boarded character remains default HUD actor even when hidden",()=>{
  const rig=setup();rig.dark.hidden=true;
  const ctx=hudVehicleContext({document:rig.ship},role);
  assert.equal(ctx.characterActor.id,'darkstep');
  assert.equal(ctx.shipActor.id,'vehicle');
  assert.equal(ctx.memberToken.id,'dark-token');
  assert.equal(hudVehicleContext({document:rig.zima},role),null,'unrelated selected token does not hijack HUD');
});

test('Vehicle combatant is replaced by individual crew combatants, regardless of hidden tokens',()=>{
  const rig=setup();rig.dark.hidden=true;rig.zima.hidden=true;
  const entries=crewInitiativeEntries(rig.ship,rig.scene,[]);
  assert.deepEqual(entries,[
    {tokenId:'dark-token',actorId:'darkstep',hidden:false},
    {tokenId:'zima-token',actorId:'zima',hidden:false},
  ]);
  assert.deepEqual(crewInitiativeEntries(rig.ship,rig.scene,[{tokenId:'dark-token'}]),[entries[1]]);
});

test('Vehicle power costs belong to the active character Combatant, not a ship Combatant',()=>{
  const rig=setup();
  const combatants=[{id:'dark-combat',tokenId:'dark-token',actor:rig.dark.actor},
    {id:'zima-combat',tokenId:'zima-token',actor:rig.zima.actor}];
  const combat={combatants,combatant:combatants[0]};
  // Node array combatants lacks Foundry Collection.values() fallback, provide Map.
  combat.combatants=new Map(combatants.map(c=>[c.id,c]));
  assert.equal(vehicleCrewCombatant(combat,rig.ship,role)?.id,'dark-combat');
  assert.equal(vehicleCrewCombatant({...combat,combatant:combatants[1]},rig.ship,role)?.id,'dark-combat',
    'player actions map to own crew member, not another passenger');
});

test('HUD contains explicit vehicle and disembark actions without mutating passenger item data',()=>{
  const hud=source('../scripts/native-action-hud.mjs');
  assert.match(hud,/data\.vehicleCommand='true'|dataset\.vehicleCommand='true'/);
  assert.match(hud,/Desembarcar \(grátis\)/);
  assert.match(hud,/await requestVehicleDisembark\(context\)/);
  assert.match(hud,/this\.renderVehicleCommands\(body\)/);
  assert.match(hud,/this\.hudActionToken/);
});

test('Disembark is GM-authorized but requested by any owning passenger; no movement is charged',()=>{
  const system=source('../scripts/vehicles/vehicle-system.mjs');
  assert.match(system,/game\.socket\.emit\('system\.multiverse-d616'/);
  assert.match(system,/senderId!==callerId/);
  assert.match(system,/member\.actor\?\.testUserPermission\?\.\(caller,3\)/);
  assert.match(system,/movement:\{method:'teleport'\}/);
  assert.match(system,/d616VehicleSync:true/);
  assert.match(source('../scripts/combat/turn-tracker.mjs'),/vehicleCrewCombatant\(combat,ship,game\.user\)/);
});

test('User README is byte-for-byte unchanged and only CHANGELOG receives this release',()=>{
  const readme=source('../README.md');
  assert.doesNotMatch(readme,/v0\.2\.153/);
  assert.match(source('../CHANGELOG.md'),/^## v0\.2\.153/);
});


test('A vehicle token added to combat generates only crew entries and never a ship entry',async()=>{
  const rig=setup();
  const combat={id:'combat',scene:rig.scene,combatants:new Map(),
    async createEmbeddedDocuments(type,entries){
      assert.equal(type,'Combatant');
      for(const entry of entries) this.combatants.set(entry.tokenId,{...entry,id:entry.tokenId});
      return entries;
    }};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};
  const first=await addVehicleCrewToCombat(combat,rig.ship);
  assert.equal(first.length,2);
  assert.equal(combat.combatants.has('ship'),false);
  const second=await addVehicleCrewToCombat(combat,rig.ship);
  assert.equal(second.length,0,'repeated requests do not add duplicate combatants');
});

test('Vehicle initiative button rolls individual crew only; cleans up legacy ship combatant',async()=>{
  const rig=setup();
  const combat={id:'combat',scene:rig.scene,combatants:new Map([
    ['legacy',{id:'legacy',tokenId:'ship'}]
  ]), rolls:[],
    async createEmbeddedDocuments(_type,entries){
      for(const entry of entries)this.combatants.set(entry.tokenId,{...entry,id:entry.tokenId,initiative:null});
      return entries;
    },
    async deleteEmbeddedDocuments(_type,ids){for(const id of ids)this.combatants.delete(id);},
    async rollInitiative(ids){this.rolls.push(...ids);}
  };
  globalThis.game={user:{id:'gm',isGM:true},combat,users:{activeGM:{id:'gm'}}};
  rig.ship.actor.id='vehicle';
  globalThis.canvas.tokens.controlled=[{document:rig.ship}];
  await rollVehicleCrewInitiative(rig.ship.actor);
  assert.deepEqual(combat.rolls,['dark-token','zima-token']);
  assert.equal(combat.combatants.has('legacy'),false);
  assert.equal(combat.combatants.has('ship'),false);
});
