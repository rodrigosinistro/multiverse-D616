import test from 'node:test';
import assert from 'node:assert/strict';
import {
  upgradeChangesForPower,
  needsFlexibleBones2Effect,
  flexibleBones2Effect,
  migrateOwnedPermanentPowers,
  upgradeMovementChangesForPower,
  outdatedSpeedRun2,
  SPEED_RUN_2_EFFECT,
} from '../scripts/migrations/v022-power-effects.mjs';

const families = { Mighty: 'mle', Accuracy: 'agl', Brilliance: 'log', Discipline: 'ego' };
function effectFor(family, level, mode = 'add', format='v14') {
  const base = `system.abilities.${families[family]}`;
  const changes = ['damageMultiplier','noncom'].map(x=>({ key: `${base}.${x}`, value: format==='v14'? level : String(level), ...(format==='v14'?{type:mode}:{mode:mode==='add'?2:4}) }));
  return { id: `${family}${level}`, transfer:true, disabled:false, ...(format==='v14'?{system:{changes}}:{changes}) };
}
function actorItem(family, level, format='v14') {
  const item = { type:'power', name:`${family} ${level}`, system:{powerSet:'Basic'}, effects:[effectFor(family,level,'add',format)] };
  item.updateEmbeddedDocuments = async (_,updates) => {
    for (const u of updates) {
      const e=item.effects.find(e=>e.id===u._id);
      if('system.changes' in u) e.system.changes = u['system.changes'];
      else e.changes=u.changes;
    }
  };
  return item;
}

for (const [family,ability] of Object.entries(families)) {
  test(`${family}: all four versions are max-only for damage and non-combat`, async () => {
    const items=[1,2,3,4].map(level=>actorItem(family,level));
    const actor={items};
    const stats=await migrateOwnedPermanentPowers(actor);
    assert.deepEqual(stats,{powers:4,effects:4,added:0});
    for (const item of items) {
      const changes=item.effects[0].system.changes;
      assert.deepEqual(changes.map(c=>c.type),['upgrade','upgrade']);
    }
    // Model the defined v14 UPGRADE semantics on top of base initial zero.
    const dm=Math.max(0, ...items.map(x=>Number(x.effects[0].system.changes[0].value)));
    const noncom=Math.max(0, ...items.map(x=>Number(x.effects[0].system.changes[1].value)));
    assert.equal(4+dm,8);
    assert.equal(5+noncom,9);
    assert.equal(Math.max(dm,2),4); // weapon +2 must not stack
    assert.equal(Math.max(dm,5),5); // stronger weapon +5 wins
    assert.equal(await migrateOwnedPermanentPowers(actor).then(x=>x.effects),0); // idempotent
  });
}
test('Old v13 effects are migrated too', async () => {
  const item=actorItem('Mighty',2,'v13');
  const stats=await migrateOwnedPermanentPowers({items:[item]});
  assert.equal(stats.effects,1);
  assert.deepEqual(item.effects[0].changes.map(x=>x.mode),[4,4]);
});
test('Unrelated powers and custom nonmatching values remain unchanged', () => {
  assert.equal(upgradeChangesForPower({type:'power',name:'Sturdy 4',system:{powerSet:'Basic'}},effectFor('Mighty',4)),null);
  const item=actorItem('Mighty',2);
  item.effects[0].system.changes[0].value=8;
  const out=upgradeChangesForPower(item,item.effects[0]);
  assert.equal(out.changes[0].type,'add');
  assert.equal(out.changes[1].type,'upgrade');
});
test('Flexible Bones 2 gains DR2 once', async () => {
  const item={id:'fake',uuid:'Actor.fake.Item.fake',type:'power',name:'Flexible Bones 2',system:{powerSet:'Plasticity'},effects:[]};
  item.createEmbeddedDocuments=async (_,[effect])=>item.effects.push(effect);
  assert.equal(needsFlexibleBones2Effect(item),true);
  assert.equal(flexibleBones2Effect(item).system.changes[0].type,'upgrade');
  const n=await migrateOwnedPermanentPowers({items:[item]});
  assert.equal(n.added,1);
  assert.equal(needsFlexibleBones2Effect(item),false);
  assert.equal((await migrateOwnedPermanentPowers({items:[item]})).added,0);
});

for (const fmt of ['v14','v13']) {
  test(`Movement non-stacking migration ${fmt}`, async () => {
    const defs=[['Flight 1','Basic','flight',3],['Flight 2','Basic','flight',50],
      ['Speed Run 1','Super-Speed','run',3],['Speed Run 2','Super-Speed','run',50]];
    const items=defs.map(([name,set,key,fac])=>{
      const changes=[{key:`system.movement.${key}.calc`,value:'rank'},
        {key:`system.movement.${key}.noncom`,value:fmt==='v14'?3:'3',
        ...(fmt==='v14'?{type:'multiply'}:{mode:1})}];
      const e={id:name,transfer:true, ...(fmt==='v14'?{system:{changes}}:{changes})};
      const item={name,type:'power',system:{powerSet:set,prerequisites:name==='Speed Run 2'?'Speed Run 1, Rank 2':'',
        effect:name==='Speed Run 2'?'Fora de combate, ele pode se mover três vezes mais rápido.':''},effects:[e]};
      item.updateEmbeddedDocuments=async (_,updates)=>{
        for (const u of updates) {if(u['system.changes'])e.system.changes=u['system.changes'];else e.changes=u.changes;}
      };
      item.update=async u=>{for (const [k,v] of Object.entries(u))item.system[k.split('.')[1]]=v;};
      return item;
    });
    const actor={items};
    const changed=await migrateOwnedPermanentPowers(actor);
    assert.equal(changed.effects,4);
    assert.equal(changed.powers,4);
    for (const [i,[name,_,key,fac]] of defs.entries()) {
      const changes=items[i].effects[0]?.system?.changes??items[i].effects[0].changes;
      assert.equal(changes[1].key,`system.movement.${key}.noncomFactor`);
      assert.equal(Number(changes[1].value),fac);
      assert.equal(fmt==='v14'?changes[1].type:changes[1].mode,fmt==='v14'?'upgrade':4);
      assert.equal(upgradeMovementChangesForPower(items[i],items[i].effects[0]),null);
    }
    assert.equal(items[3].system.prerequisites,'Speed Run 1, Rank 3');
    assert.equal(items[3].system.effect,SPEED_RUN_2_EFFECT);
    assert.equal(outdatedSpeedRun2(items[3]),false);
    assert.equal((await migrateOwnedPermanentPowers(actor)).effects,0);
  });
}

test('Flight 2 does not disable Jump on existing imported v13/v14 character',async()=>{
 for(const fmt of ['v13','v14']){
  const ch=[{key:'system.movement.jump.active',value:fmt==='v13'?'false':false, ...(fmt==='v13'?{mode:5}:{type:'override'})},
   {key:'system.movement.flight.noncomFactor',value:fmt==='v13'?'50':50,...(fmt==='v13'?{mode:4}:{type:'upgrade'})}];
  const e={transfer:true, ...(fmt==='v13'?{changes:ch}:{system:{changes:ch}})};
  const doc={type:'power',name:'Flight 2',system:{powerSet:'Basic'}};
  const upd=upgradeMovementChangesForPower(doc,e);
  assert.ok(upd);
  assert.ok(upd.changes.every(c=>c.key!=='system.movement.jump.active'));
  assert.equal(upgradeMovementChangesForPower(doc,{...e,...(fmt==='v13'?{changes:upd.changes}:{system:{changes:upd.changes}})}),null);
 }
});
