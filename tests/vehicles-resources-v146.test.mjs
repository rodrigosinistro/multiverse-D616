import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  vehicleResourceMaximum, actorResourceBases,
  initialActorResourcePatch, actorResourceUpdatePatch,
  prepareActorResourceBase, finalizeActorResourceMaximums,
} from '../scripts/vehicles/vehicle-resources.mjs';
const source=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const model=(res=2,vig=2)=>({abilities:{res:{value:res},vig:{value:vig}},health:{max:500,value:55},focus:{max:500,value:45}});

test('0.2.147 formulas apply to every D616 Actor and preserve minimum 10',()=>{
  assert.equal(vehicleResourceMaximum(3),90);
  assert.equal(vehicleResourceMaximum(0),10);
  assert.equal(vehicleResourceMaximum(-3),10);
  assert.deepEqual(actorResourceBases({res:{value:6},vig:{value:2}}),{health:180,focus:60});
});
test('0.2.147 derive maximum before Active Effects, retain additive Extra Focus',()=>{
  const m=model(3,4);
  prepareActorResourceBase(m);
  assert.equal(m.health.max,90);assert.equal(m.focus.max,120);
  m.focus.max+=30;
  finalizeActorResourceMaximums(m);
  assert.equal(m.focus.max,150);
  assert.equal(m.health.value,55);
  assert.equal(m.focus.value,45);
});
test('0.2.147 bonuses to Attributes and maxima coexist without stacking on rerender',()=>{
  const m=model(2,2);
  prepareActorResourceBase(m);
  m.abilities.res.value+=2;m.abilities.vig.value+=1;
  m.health.max+=15;m.focus.max+=30;
  finalizeActorResourceMaximums(m);
  assert.equal(m.health.max,135);assert.equal(m.focus.max,120);
  // New Foundry preparation starts from raw data once again.
  m.abilities.res.value=2;m.abilities.vig.value=2;
  prepareActorResourceBase(m);finalizeActorResourceMaximums(m);
  assert.equal(m.health.max,60);assert.equal(m.focus.max,60);
});
test('0.2.147 actor creation initializes empty pools or preserves imported damage',()=>{
  const p=initialActorResourcePatch({system:{health:{max:0,value:0},focus:{max:0,value:0}}},model(2,3));
  assert.equal(p['system.health.max'],60);assert.equal(p['system.health.value'],60);
  assert.equal(p['system.focus.max'],90);assert.equal(p['system.focus.value'],90);
  const imported=initialActorResourcePatch({system:{abilities:{res:{value:6},vig:{value:6}},health:{max:200,value:175},focus:{max:100,value:40}}});
  assert.equal(imported['system.health.max'],180);
  assert.equal(imported['system.health.value'],155);
  assert.equal(imported['system.focus.value'],120);
});
test('0.2.147 ability updates preserve spent resources on all 3 actor types',()=>{
  for(const type of ['character','npc','vehicle']) {
    const actor={type,_source:{system:{abilities:{res:{value:2},vig:{value:3}}}},
      system:{abilities:{res:{value:2},vig:{value:3}},health:{max:60,value:45},focus:{max:90,value:55}}};
    const p=actorResourceUpdatePatch(actor,{'system.abilities.res.value':3,'system.abilities.vig.value':2});
    assert.equal(p['system.health.max'],90);
    assert.equal(p['system.focus.max'],60);
    assert.equal(p['system.health.value'],75);
    assert.equal(p['system.focus.value'],25);
    assert.equal(actorResourceUpdatePatch(actor,{'system.health.value':42,'system.abilities.res.value':3})?.['system.health.value'],undefined);
  }
});
test('0.2.147 direct max edits cannot replace formula',()=>{
  const actor={type:'npc',system:{abilities:{res:{value:4},vig:{value:5}},health:{max:120,value:90},focus:{max:150,value:100}}};
  const p=actorResourceUpdatePatch(actor,{'system.health.max':900});
  assert.equal(p['system.health.max'],120);
  assert.equal(p['system.health.value'],undefined);
});
test('0.2.147 all three schemas use same resource preparation; no toggle',()=>{
  const main=source('../multiverse-d616.mjs');
  const vehicle=source('../templates/actor/actor-vehicle-sheet.hbs');
  const npc=source('../templates/actor/actor-npc-sheet.hbs');
  const pc=source('../templates/actor/actor-character-sheet.hbs');
  assert.match(main,/class MarvelMultiverseActorBase[\s\S]*?prepareBaseData\(\)\s*\{\s*super\.prepareBaseData\(\);\s*prepareActorResourceBase\(this\)/);
  assert.match(main,/finalizeActorResourceMaximums\(this\)/);
  assert.doesNotMatch(vehicle,/name="system\.autoResources"/);
  for(const html of [vehicle,npc,pc]){
    assert.doesNotMatch(html,/name="system\.health\.max"/);
    assert.doesNotMatch(html,/name="system\.focus\.max"/);
    assert.match(html,/system\.health\.max/);
    assert.match(html,/system\.focus\.max/);
  }
});

test('0.2.147 migration of legacy actor does not heal/lose spent Focus and is one-time',async()=>{
 const {legacyActorResourceMigrationPatch,migrateLegacyActorResources}=await import('../scripts/vehicles/vehicle-resources.mjs');
 const actor={type:'vehicle',name:'Blackbird',_source:{system:{abilities:{res:{value:6},vig:{value:6}},
  health:{max:200,value:175},focus:{max:180,value:120}}},system:{health:{max:180,value:175},focus:{max:180,value:120}},
  getFlag(){return this.migrated??false},async update(p){this.last=p;this.migrated=true}};
 const p=legacyActorResourceMigrationPatch(actor);
 assert.equal(p['system.health.max'],180);
 assert.equal(p['system.health.value'],155); // 25 damage preserved
 assert.equal(p['system.focus.value'],undefined); // 60 Focus already spent
 assert.equal(await migrateLegacyActorResources([actor],true),1);
 assert.equal(await migrateLegacyActorResources([actor],true),0);
});
