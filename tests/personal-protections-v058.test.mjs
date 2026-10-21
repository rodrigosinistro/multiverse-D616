import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  personalProtectionSpec,activeElementalGuards,selectGuard,selectElementalDefense,
  assessGuardHit,consumeGuard,
} from '../scripts/elemental-shields.mjs';
const SYS='multiverse-d616';
const makeActor=(...names)=>{
  const items=new Map(),effects=[];
  for(const [index,name] of names.entries()){
    const id=`p${index}`;
    items.set(id,{id,name,type:'power'});
    effects.push({id:`e${index}`,disabled:false,flags:{[SYS]:{concentrationPower:{itemId:id}}}});
  }
  return {items,effects,deleteEmbeddedDocuments:async(type,ids)=>{
    assert.equal(type,'ActiveEffect');
    assert.ok(ids.every(id=>effects.some(e=>e.id===id)));
    for(const id of ids)effects.splice(effects.findIndex(e=>e.id===id),1);
  }};
};
test('all nine canonical personal absorbers have the correct thresholds',()=>{
  for(const family of ['Elemental Protection','Telekinetic Protection']){
    for(let level=1;level<=4;level++){
      assert.equal(personalProtectionSpec(`${family} ${level}`).threshold,10*level);
      assert.equal(activeElementalGuards(makeActor(`${family} ${level}`))[0].threshold,10*level);
    }
  }
  assert.equal(personalProtectionSpec('Shield of the Seraphim').threshold,20);
  assert.equal(activeElementalGuards(makeActor('Shield of the Seraphim'))[0].threshold,20);
});
test('DR shields and narrative barriers never become automatic personal protection',()=>{
  for(const name of ['Shield 1','Shield 2','Shield 3','Shield 4',
    'Telekinetic Barrier','Telekinetic Sphere','Elemental Barrier','Protection Hex','Environmental Protection']){
    assert.equal(personalProtectionSpec(name),null,name);
    assert.equal(selectElementalDefense({actor:makeActor(name)}),null,name);
  }
});
test('Telekinetic Protection intercepts complete hits, only breaks above threshold',async()=>{
  const actor=makeActor('Telekinetic Protection 2');
  let guard=selectElementalDefense({actor})?.guard;
  assert.equal(guard?.name,'Telekinetic Protection 2');
  const atThreshold=assessGuardHit(20,guard);
  assert.equal(atThreshold.blocked,true);assert.equal(atThreshold.destroyed,false);
  await consumeGuard(actor,guard,atThreshold);
  assert.equal(actor.effects.length,1);
  const over=assessGuardHit(24,guard);
  assert.equal(over.damageToTarget,0);assert.equal(over.destroyed,true);
  await consumeGuard(actor,guard,over);
  assert.equal(actor.effects.length,0);
  assert.equal(selectElementalDefense({actor}),null);
});
test('GM bypass, interrupted Concentration, prior defenses and strongest protection',()=>{
  const actor=makeActor('Elemental Protection 1','Telekinetic Protection 2','Telekinetic Protection 4');
  assert.equal(selectElementalDefense({actor})?.guard.threshold,40);
  assert.equal(selectElementalDefense({actor,mode:'bypass'}),null);
  const owner=makeActor('Elemental Sphere');
  const boundary={actor:owner,guard:{name:'Elemental Sphere',kind:'structure',threshold:30}};
  assert.equal(selectElementalDefense({actor,boundary})?.guard.threshold,30);
  actor.effects[2].disabled=true;
  assert.equal(selectElementalDefense({actor})?.guard.name,'Telekinetic Protection 2');
  actor.effects[1].disabled=true;
  assert.equal(selectElementalDefense({actor})?.guard.name,'Elemental Protection 1');
});
test('Seraphim blocks physical Health damage but not psychic Focus; Elemental remains available',()=>{
  const seraphim=makeActor('Shield of the Seraphim');
  assert.equal(selectGuard(activeElementalGuards(seraphim),'auto','health')?.threshold,20);
  assert.equal(selectGuard(activeElementalGuards(seraphim),'auto','focus'),null);
  const both=makeActor('Elemental Protection 1','Shield of the Seraphim');
  assert.equal(selectElementalDefense({actor:both,category:'health'}).guard.name,'Shield of the Seraphim');
  assert.equal(selectElementalDefense({actor:both,category:'focus'}).guard.name,'Elemental Protection 1');
});
test('existing modern and legacy damage paths share protection selection and per-target resolution',()=>{
  const source=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
  assert.match(source,/selectGuard\(guards,'auto',entry\.category\)/);
  assert.match(source,/selectElementalDefense\(\{actor,boundary,mode,category:entry\.category\}\)/);
  assert.match(source,/await consumeGuard\(guardOwner,guard,guarded\)/);
  assert.match(source,/guarded\?\.blocked \? 0/);
  assert.match(source,/return applyExactEntries\(normalized,action,modes,message\)/);
});
