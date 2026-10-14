import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeModePowerEffect, makeOwnedJumpEffect,needsOwnedJumpEffect,migrateOwnedPermanentPowers,upgradeShieldEffect,shieldStatusModifiers,upgradeExtendedReachEffect} from '../scripts/migrations/v022-power-effects.mjs';
// Concentration registers hooks at module import time; provide an inert Foundry test shim.
globalThis.Hooks ??= {once(){},on(){}};
const {bodySheetConcentrationChanges,concentrationPowerEffectData,shieldConcentrationChanges} = await import('../scripts/concentration.js');
const {hasActiveBodySheet,isAttackItem} = await import('../scripts/activated-movement-powers.mjs');
function item(name,set, rawEffects, format='v14') {
 const effects=rawEffects.map((cs,i)=>({id:`ae${i}`,transfer:true,
   ...(format==='v14'?{system:{changes:cs}}:{changes:cs})}));
 const doc={type:'power',id:'123',uuid:'Actor.one.Item.123',name,system:{powerSet:set,duration:name==='Stilt Steps'?'Concentration':'Permanent'},effects};
 doc.updateEmbeddedDocuments=async(_,changes)=>{for(const c of changes){const e=effects.find(x=>x.id===c._id);if('system.changes'in c)e.system.changes=c['system.changes'];else if(c.changes)e.changes=c.changes;if('transfer'in c)e.transfer=c.transfer;}};
 doc.createEmbeddedDocuments=async(_,list)=>{for(const e of list)effects.push({id:`new${effects.length}`,...e});};
 doc.update=async u=>{for(const [key,value] of Object.entries(u))doc.system[key.split('.')[1]]=value;};
 return doc;
}
test('Speed Swim upgrades old AE, is idempotent (v14)',async()=>{
 const d=item('Speed Swim','Super-Speed',[[{key:'system.movement.swim.calc',value:'rank',type:'override'},
  {key:'system.movement.swim.noncom',value:3,type:'multiply'}]]);
 const first=await migrateOwnedPermanentPowers({items:[d]});assert.equal(first.effects,1);
 assert.equal(d.effects[0].system.changes[0].value,'rank-swim');
 assert.equal(d.effects[0].system.changes[1].key,'system.movement.swim.noncomFactor');
 assert.equal(d.effects[0].system.changes[1].type,'upgrade');
 assert.equal((await migrateOwnedPermanentPowers({items:[d]})).effects,0);
});
test('Jump 2/3 effects added once (both power sets)', async()=>{
 const docs=[];for(const set of ['Spider-Powers','Super-Strength'])for(const level of [2,3])docs.push(item(`Jump ${level}`,set,[]));
 const result=await migrateOwnedPermanentPowers({items:docs});
 assert.equal(result.added,4);
 for(const d of docs){assert.equal(d.effects.length,1);assert.equal(needsOwnedJumpEffect(d),false);
  assert.equal(d.effects[0].system.changes[2].value,d.name.endsWith('2')?3:50);}
 assert.equal((await migrateOwnedPermanentPowers({items:docs})).added,0);
});
for(const fmt of ['v14','v13']) {
 test(`Stilt Steps permanent on sheet with numeric movement formulas (${fmt})`,async()=>{
  const legacy=fmt==='v14' ? (key)=>({key,type:'multiply',value:'2'}) : (key)=>({key,mode:1,value:'2'});
  const d=item('Stilt Steps','Plasticity',[[legacy('system.movement.run.calc')],[legacy('system.movement.climb.calc')]],fmt);
  const result=await migrateOwnedPermanentPowers({items:[d]});assert.equal(result.effects,2);
  assert.equal(d.system.duration,'Permanent');
  assert.ok(d.effects.every(e=>e.transfer===true));
  assert.deepEqual(d.effects.map(e=>(e.system?.changes??e.changes)[0].value),['double','double-climb']);
  assert.equal((await migrateOwnedPermanentPowers({items:[d]})).effects,0);
 });
 test(`Body Sheet does not transfer while not concentrating (${fmt})`,async()=>{
  const cc=fmt==='v14'?(key,value,type)=>({key,value,type}):(key,value,type)=>({key,value:String(value),mode:type==='multiply'?1:5});
  const d=item('Body Sheet','Plasticity',[
   [cc('system.healthDamageReduction',3,'upgrade')],
   [cc('system.movement.glide.active',true,'override'),cc('system.movement.glide.calc','runspeed','override'),cc('system.movement.glide.calc','2','multiply')]
  ],fmt);
  const result=await migrateOwnedPermanentPowers({items:[d]});assert.equal(result.effects,2);
  assert.ok(d.effects.every(e=>e.transfer===false));
  const active=bodySheetConcentrationChanges(d);assert.equal(active.length,3);
  assert.ok(active.some(e=>e.key==='system.movement.glide.calc' && e.value==='run-double'));
  assert.equal((await migrateOwnedPermanentPowers({items:[d]})).effects,0);
 });
}
test('Body Sheet only restricts attacks while concentration effect exists',()=>{
 const focused={name:'Body Sheet',disabled:false,flags:{'multiverse-d616':{concentrationPower:{transient:true}}},statuses:[]};
 assert.equal(hasActiveBodySheet({effects:[focused]}),true);
 assert.equal(hasActiveBodySheet({effects:[{...focused,disabled:true}]}),false);
 assert.equal(isAttackItem({type:'weapon'}),true);
 assert.equal(isAttackItem({type:'power',system:{formula:'3d6',ability:'agl',attackTarget:'agl'}}),true);
 assert.equal(isAttackItem({type:'power',system:{formula:'',ability:''}}),false);
});
test('Body Sheet condition carries modifiers only on activation; unrelated concentration remains ordinary',()=>{
 const d=item('Body Sheet','Plasticity',[[{key:'system.healthDamageReduction',value:3,type:'upgrade'}],
  [{key:'system.movement.glide.active',value:true,type:'override'},
   {key:'system.movement.glide.calc',value:'run-double',type:'override'}]]);
 const transient=concentrationPowerEffectData(d,true);
 assert.equal(transient.system.changes.length,3);
 assert.ok(transient.system.changes.some(c=>c.key==='system.healthDamageReduction' && c.value===3));
 assert.ok(transient.system.changes.some(c=>c.key==='system.movement.glide.calc' && c.value==='run-double'));
 assert.equal(transient.statuses[0],`mmrpg.concentration-power.${d.id}`);
 const another=concentrationPowerEffectData({id:'any',name:'Other Power',system:{powerSet:'Magic'}},true);
 assert.deepEqual(another.system.changes,[]);
});

for (const fmt of ['v14','v13']) {
 test(`Shield 1-4: non-transferred DR and Concentração condition (${fmt})`,async()=>{
  const shields=[];
  for(let i=1;i<=4;i++){
   const c={key:'system.healthDamageReduction',value:fmt==='v14'?i:String(i),...(fmt==='v14'?{type:'upgrade'}:{mode:4})};
   const d=item(`Shield ${i}`,'Shield Bearer',[[c]],fmt);shields.push(d);
   assert.equal(upgradeShieldEffect(d,d.effects[0]).transfer,false);
   assert.equal(shieldConcentrationChanges(d)[0].value,i);
   assert.equal(shieldStatusModifiers(d)['system.changes'][0].value,i);
  }
  const result=await migrateOwnedPermanentPowers({items:shields});
  assert.equal(result.effects,4);
  assert.ok(shields.every(d=>d.effects[0].transfer===false));
  assert.equal((await migrateOwnedPermanentPowers({items:shields})).effects,0);
  for (const d of shields) {
   const cc=concentrationPowerEffectData(d,true);
   assert.equal(cc.system.changes.length,1);
   assert.equal(cc.system.changes[0].value,Number(d.name.at(-1)));
  }
 });
 test(`Extended Reach 1-2 migration max-only (${fmt})`,async()=>{
  const docs=[];
  for(const [level,value] of [[1,4],[2,10]]){
   const c={key:'system.reach',value:fmt==='v14'?value:String(value),...(fmt==='v14'?{type:'multiply'}:{mode:1})};
   const d=item(`Extended Reach ${level}`,'Plasticity',[[c]],fmt);docs.push(d);
   assert.ok(upgradeExtendedReachEffect(d,d.effects[0]));
  }
  const result=await migrateOwnedPermanentPowers({items:docs});assert.equal(result.effects,2);
  for(const d of docs){const change=(d.effects[0].system?.changes??d.effects[0].changes)[0];
   assert.equal(change.key,'system.reachFactor');
   assert.equal(fmt==='v14'?change.type:change.mode,fmt==='v14'?'upgrade':4);}
  assert.equal((await migrateOwnedPermanentPowers({items:docs})).effects,0);
 });
}
test('Current Shield Concentration receives DR during migration; Stilt temporary cleaned',async()=>{
 const d=item('Shield 3','Shield Bearer',[[{key:'system.healthDamageReduction',value:3,type:'upgrade'}]]);
 const temporary={id:'st1',flags:{'multiverse-d616':{temporaryStiltSteps:{combatId:'cmb',turn:1,round:1}}}};
 const focused={id:'focus',name:'Shield 3',disabled:false,flags:{'multiverse-d616':{concentrationPower:{itemId:'123',transient:true}}},system:{changes:[]}};
 const actor={items:[d],effects:[temporary,focused],
  deleteEmbeddedDocuments:async(_,ids)=>{assert.deepEqual(ids,['st1']);actor.effects=actor.effects.filter(e=>!ids.includes(e.id));},
  updateEmbeddedDocuments:async(_,updates)=>{assert.equal(updates.length,1);Object.assign(focused,updates[0]);focused.system.changes=updates[0]['system.changes'];}};
 await migrateOwnedPermanentPowers(actor);
 assert.equal(actor.effects.length,1);
 assert.equal(focused.system.changes[0].value,3);
});
