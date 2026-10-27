import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPermanentAttachedPower,permanentPowerFamily,resolveEquipmentPermanentEffects}
  from '../scripts/equipment-permanent-effects.mjs';

const NS='multiverse-d616';
const eff=(key,value,type='upgrade')=>({name:'Bônus permanente',transfer:true,disabled:false,
  duration:{value:'Permanent'},type:'base',system:{changes:[{key,value,type,phase:'initial'}]}});
const ownedPower=(name,key,value,set='Basic')=>({id:`owned${name}`,type:'power',name,
  system:{powerSet:set,duration:'Permanent'},effects:[eff(key,value)]});
const equipment=(type,name,equipped=true)=>({id:`item${name}`,type,name,system:{equipped},
  flags:{[NS]:{attachedPowers:[]}},uuid:`Actor.A.Item.${name}`,actor:null});
const append=(carrier,name,key,value,set='Basic')=>{
  const entry={id:`ap${name}`,name,data:{type:'power',name,
    system:{powerSet:set,duration:'Permanent'},effects:[eff(key,value)]}};
  carrier.flags[NS].attachedPowers.push(entry);
  return entry;
};
const actor=(...items)=>{
  const a={items:new Map(items.map(i=>[i.id,i]))};
  for(const i of items) i.actor=a;
  return a;
};
const nativeEffects=(a)=>[...a.items.values()].filter(i=>i.type==='power')
  .flatMap(p=>p.effects.map(e=>({...e,parent:p})));
const make=(data)=>({...data,parent:{type:'actor'}});
const collect=(a,additional=[])=>resolveEquipmentPermanentEffects(a,[...nativeEffects(a),...additional],make);
const valuesFor=(list,key)=>list.flatMap(e=>e.system?.changes??[]).filter(c=>c.key===key).map(c=>Number(c.value));
const DR='system.healthDamageReduction';
const FOCUS='system.focusDamageReduction';

test('v075: intrinsic power vs stronger weapon: only highest Sturdy applies',()=>{
  const intrinsic=ownedPower('Sturdy 2',DR,2);
  const sword=equipment('weapon','Sword');append(sword,'Sturdy 4',DR,4);
  const a=actor(intrinsic,sword),result=collect(a);
  assert.deepEqual(valuesFor(result,DR),[4]);
  assert.equal(result[0].flags[NS].equipmentPermanent.carrierId,sword.id);
  assert.equal(intrinsic.effects[0].system.changes[0].value,2); // no persistent mutation
  sword.system.equipped=false;
  assert.deepEqual(valuesFor(collect(a),DR),[2]);
});

test('v075: stronger intrinsic power wins, ties prefer owner and do not add duplicate',()=>{
  const innate=ownedPower('Uncanny 4',FOCUS,4);
  const sword=equipment('weapon','Sword');append(sword,'Uncanny 2',FOCUS,2);
  const a=actor(innate,sword);
  assert.deepEqual(valuesFor(collect(a),FOCUS),[4]);
  sword.flags[NS].attachedPowers=[];
  append(sword,'Uncanny 4',FOCUS,4);
  assert.deepEqual(valuesFor(collect(a),FOCUS),[4]);
  assert.equal(collect(a)[0].parent,innate);
});

test('v075: multiple owned items are valid, highest across equipped weapons and ordinary items',()=>{
  const mace=equipment('weapon','Mace');append(mace,'Mighty 2','system.abilities.mle.damageMultiplier',2);
  const ring=equipment('item','Ring',false);append(ring,'Mighty 4','system.abilities.mle.damageMultiplier',4);
  const sword=equipment('weapon','Sword',false);append(sword,'Mighty 5','system.abilities.mle.damageMultiplier',5);
  const a=actor(mace,ring,sword);
  const path='system.abilities.mle.damageMultiplier';
  assert.deepEqual(valuesFor(collect(a),path),[4]);
  sword.system.equipped=true;
  assert.deepEqual(valuesFor(collect(a),path),[5]);
  sword.system.equipped=false;
  a.items.delete(ring.id);
  assert.deepEqual(valuesFor(collect(a),path),[2]);
});

test('v075: Health and Focus reductions, different power families, unrelated statuses unaffected',()=>{
  const helm=equipment('item','Helmet');append(helm,'Sturdy 2',DR,2);append(helm,'Uncanny 3',FOCUS,3);
  const actorStatus={id:'status',parent:{type:'actor'},name:'Proteção temporária',system:{changes:[{key:DR,value:1,type:'add'}]}};
  const a=actor(helm);
  const es=collect(a,[actorStatus]);
  assert.deepEqual(valuesFor(es,DR),[1,2]);
  assert.deepEqual(valuesFor(es,FOCUS),[3]);
  assert.equal(es.includes(actorStatus),true);
});

test('v075: same-named different Power Set remains independent; cannot transfer nonpermanent, disabled, or non-transfer AEs',()=>{
  const helm=equipment('item','Helmet');
  append(helm,'Mighty 2','system.abilities.mle.noncom',2,'Basic');
  append(helm,'Mighty 3','system.abilities.mle.damageMultiplier',3,'Custom');
  const inactive=append(helm,'Shield 3',DR,3);
  inactive.data.system.duration='Concentration';
  const nontransfer=append(helm,'Uncanny 3',FOCUS,3);nontransfer.data.effects[0].transfer=false;
  const disabled=append(helm,'Sturdy 2',DR,2);disabled.data.effects[0].disabled=true;
  const a=actor(helm);const effects=collect(a);
  assert.equal(effects.length,2);
  assert.deepEqual(valuesFor(effects,'system.abilities.mle.damageMultiplier'),[3]);
  assert.deepEqual(valuesFor(effects,'system.abilities.mle.noncom'),[2]);
  assert.deepEqual(valuesFor(effects,DR),[]);
  assert.equal(isPermanentAttachedPower({system:{duration:'Permanente'}}),true);
  assert.equal(permanentPowerFamily({name:'Sturdy 4',system:{duration:'Permanent',powerSet:'Basic'}}).level,4);
});

test('v075: activated powers with a Permanent result are never granted passively',()=>{
  const item=equipment('item','Ring');
  for(const power of ['Grow 2','Shrink 3','Domination','Resize Other'])
    append(item,power,DR,10,'Resize');
  const a=actor(item);
  assert.equal(collect(a).length,0);
});

test('v075: stronger Flight and Mighty tier replaces the weaker without multiplying or adding',()=>{
  const flight=ownedPower('Flight 1','system.movement.flight.noncomFactor',3);
  const mighty=ownedPower('Mighty 1','system.abilities.mle.damageMultiplier',1);
  const suit=equipment('item','Suit');
  append(suit,'Flight 2','system.movement.flight.noncomFactor',50);
  append(suit,'Mighty 4','system.abilities.mle.damageMultiplier',4);
  const es=collect(actor(flight,mighty,suit));
  assert.deepEqual(valuesFor(es,'system.movement.flight.noncomFactor'),[50]);
  assert.deepEqual(valuesFor(es,'system.abilities.mle.damageMultiplier'),[4]);
});

test('v075: imported legacy effect gets v14 schema; illegal duration normalized; originals intact',()=>{
  const helm=equipment('item','Helmet');
  const power=append(helm,'Sturdy 3',DR,3);
  power.data.effects=[{name:'RD',transfer:true,disabled:false,duration:{value:'Permanent'},
    changes:[{key:DR,value:'3',mode:4}]}];
  const a=actor(helm);
  const result=collect(a);
  assert.deepEqual(valuesFor(result,DR),[3]);
  assert.equal(result[0].system.changes[0].type,'upgrade');
  assert.equal(result[0].duration.value,null);
  assert.equal(power.data.effects[0].duration.value,'Permanent');
});

test('v075: integrates into V14 Actor allApplicableEffects, no changes to source equipment flags or actor item power list',()=>{
  const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(main,/\*allApplicableEffects\(\)/);
  assert.match(main,/resolveEquipmentPermanentEffects\(this,super\.allApplicableEffects\(\)/);
  assert.match(main,/new CONFIG\.ActiveEffect\.documentClass\(data,\{parent:this\}\)/);
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.2.99');
});

test('v075: Flexible Bones 2 and Jump 3 from compendium without AEs receive legacy-compatible passive bonus',()=>{
  const belt=equipment('item','Belt');append(belt,'Flexible Bones 2',DR,0,'Plasticity').data.effects=[];
  const boots=equipment('item','Boots');append(boots,'Jump 3',DR,0,'Super-Strength').data.effects=[];
  const a=actor(belt,boots);const effects=collect(a);
  assert.deepEqual(valuesFor(effects,DR),[2]);
  assert.deepEqual(valuesFor(effects,'system.movement.jump.noncomFactor'),[50]);
  assert.deepEqual(valuesFor(effects,'system.movement.jump.active'),[1]);
  assert.equal(belt.flags[NS].attachedPowers[0].data.effects.length,0);
});

test('v075: Healing Factor and Evasion/Wisdom with no Active Effects are still granted by owned equipment',async()=>{
  const {hasEquipmentPermanentPower}=await import('../scripts/equipment-permanent-effects.mjs');
  const sword=equipment('weapon','Sword',false);
  const ring=equipment('item','Ring');
  for(const n of ['Healing Factor','Evasion','Wisdom','Danger Sense']){
    const x=append(sword,n,DR,0);x.data.effects=[];
  }
  const a=actor(sword,ring);
  assert.equal(hasEquipmentPermanentPower(a,'Evasion'),false);
  sword.system.equipped=true;
  assert.equal(hasEquipmentPermanentPower(a,'Evasion'),true);
  assert.equal(hasEquipmentPermanentPower(a,'Healing Factor'),true);
  assert.equal(hasEquipmentPermanentPower(a,'Wisdom'),true);
  assert.equal(hasEquipmentPermanentPower(a,'Danger Sense'),true);
  a.items.delete(sword.id);
  assert.equal(hasEquipmentPermanentPower(a,'Danger Sense'),false);
});

test('v075: legacy Mighty ADD becomes highest tier UPGRADE, old Flight 2 ×3 becomes ×50 safely',()=>{
  const ring=equipment('item','Ring');
  const m=append(ring,'Mighty 4','system.abilities.mle.damageMultiplier',4);
  m.data.effects[0].system.changes=[{key:'system.abilities.mle.damageMultiplier',value:4,type:'add',phase:'initial'},
    {key:'system.abilities.mle.noncom',value:4,type:'add',phase:'initial'}];
  const f=append(ring,'Flight 2','system.movement.flight.noncom',3);
  f.data.effects[0].system.changes=[{key:'system.movement.flight.noncom',value:3,type:'multiply',phase:'initial'},
    {key:'system.movement.jump.active',value:false,type:'override',phase:'initial'}];
  const result=collect(actor(ring));
  assert.equal(result.length,2);
  assert.deepEqual(result[0].system.changes.map(c=>c.type),['upgrade','upgrade']);
  assert.deepEqual(result[1].system.changes.map(c=>[c.key,c.value,c.type]),
    [['system.movement.flight.noncomFactor',50,'upgrade']]);
  assert.equal(m.data.effects[0].system.changes[0].type,'add');
  assert.equal(f.data.effects[0].system.changes[0].value,3);
});
