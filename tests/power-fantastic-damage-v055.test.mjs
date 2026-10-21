import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HALF_TO_FULL_POWERS, POWER_DAMAGE_FACTORS, getPowerDamageFactor, calculatePowerDamage } from '../scripts/power-fantastic-damage.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url),'utf8')).items;
const items=new Map(catalog.map(i=>[i.name,i]));
const opts={marvelDie:6,damageMultiplier:4,damageReduction:2,ability:3,bonus:0}; // normal 6*2+3=15, raw=27

test('v0.2.55: every override names a real power and avoids free-form guessing',()=>{
 assert.equal(catalog.length,398);
 for(const name of Object.keys(POWER_DAMAGE_FACTORS))assert.ok(items.has(name),name);
 assert.equal(getPowerDamageFactor('Poder caseiro',{fantastic:true,enabled:true}),2);
 assert.equal(getPowerDamageFactor('Poder caseiro',{fantastic:false,enabled:true}),1);
 assert.equal(HALF_TO_FULL_POWERS.length,12);
});
test('v0.2.55: Venom Burst only deals half normal Health damage on Fantastic',()=>{
 let r=calculatePowerDamage({powerName:'Venom Burst',fantastic:false,...opts,enabled:true});
 assert.equal(r.damage,0); assert.equal(r.rawDamage,0);
 r=calculatePowerDamage({powerName:'Venom Burst',fantastic:true,...opts,enabled:true});
 assert.equal(r.damage,8);assert.equal(r.rawDamage,14);assert.equal(r.damageReduction,2);
});
test('v0.2.55: 11 powers deal half on ordinary hit, full (not double) on Fantastic',()=>{
 for(const name of HALF_TO_FULL_POWERS){
  assert.equal(calculatePowerDamage({powerName:name,fantastic:false,...opts,enabled:true}).damage,8,name);
  assert.equal(calculatePowerDamage({powerName:name,fantastic:true,...opts,enabled:true}).damage,15,name);
 }
});
test('v0.2.55: Headshot doubles normal and triples Fantastic without double-doubling',()=>{
 assert.equal(calculatePowerDamage({powerName:'Headshot',fantastic:false,...opts,enabled:true}).damage,30);
 assert.equal(calculatePowerDamage({powerName:'Headshot',fantastic:true,...opts,enabled:true}).damage,45);
});
test('v0.2.55: Fantastic that only imposes a condition does not duplicate damage',()=>{
 for(const name of ['Banging Heads','Leg Sweep','Rico-Shield']){
  assert.equal(calculatePowerDamage({powerName:name,fantastic:true,...opts,enabled:true}).damage,15,name);
 }
});
test('v0.2.55: standard Fantastic remains double and advanced suppression remains intact',()=>{
 assert.equal(calculatePowerDamage({powerName:'Venom Bash',fantastic:true,...opts,enabled:true}).damage,30);
 assert.equal(calculatePowerDamage({powerName:'Poder de jogador',fantastic:true,...opts,enabled:true}).damage,30);
 assert.equal(calculatePowerDamage({powerName:'Elemental Push',fantastic:true,suppressFantastic:true,...opts,enabled:true}).damage,15);
 assert.equal(calculatePowerDamage({powerName:'Flare',fantastic:false,...opts,enabled:true}).damage,0);
 assert.equal(calculatePowerDamage({powerName:'Flare',fantastic:true,...opts,enabled:true}).damage,15);
});
test('v0.2.55: global/groups OFF suspend special overrides without disabling basic damage',()=>{
 assert.equal(calculatePowerDamage({powerName:'Venom Burst',fantastic:true,...opts,enabled:false}).damage,30);
 const values=new Map([['disableAllAutomations',true]]);
 const saved=globalThis.game;
 globalThis.game={settings:{get:(_,key)=>values.get(key)}};
 try{ assert.equal(calculatePowerDamage({powerName:'Headshot',fantastic:true,...opts}).damage,30); }
 finally{globalThis.game=saved;}
});
test('v0.2.55: no damage below threshold, one roll, no double DR',()=>{
 for(const name of Object.keys(POWER_DAMAGE_FACTORS)){
  const r=calculatePowerDamage({powerName:name,fantastic:true,marvelDie:6,damageMultiplier:1,damageReduction:4,ability:100,enabled:true});
  assert.equal(r.damage,0,name);
 }
 const r=calculatePowerDamage({powerName:'Headshot',fantastic:true,marvelDie:6,damageMultiplier:4,damageReduction:2,ability:3,enabled:true});
 assert.equal(r.damage,45);
});
test('v0.2.55: uses canonical saved targets, per-target success, real card flags and 0 damage guard',()=>{
 const s=fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.ok(s.includes('calculatePowerDamage({'));
 assert.ok(s.includes('outcomes.get(ref.uuid)?.fantastic'));
 assert.ok(s.includes("item?.name === 'Venom Burst'"));
 assert.ok(s.includes('rawDamage, damageReduction, effectiveDamageMultiplier'));
 assert.ok(s.includes('damageFactor: powerDamageFactor'));
 assert.ok(s.includes("automationEnabled('fantasticDamage')"));
});
