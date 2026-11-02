import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePowerRoll, POWER_ROLL_RULES} from '../scripts/power-rolls.mjs';
import {getPowerDamageFactor, calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';
import {auditPowerCatalog} from '../scripts/power-catalog-audit.mjs';
import {mayCreateBangingHeadsDamage} from '../scripts/power-target-rules.mjs';
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const item=(n,set)=>items.find(i=>i.name===n&&(!set||i.system.powerSet===set));

test('v0.2.123: 8 opposed checks are non-damaging, including situational animal commands',()=>{
 for(const n of ['Command Animal','Time Travel Other','Dimensional Travel Other','Multiversal Travel Other','Webcasting','Speed Blast','Steal Power','Steal Powers']){
  const p=item(n);assert.ok(p,n);
  const r=resolvePowerRoll(p);
  assert.equal(r.checkOnly,true,n);assert.equal(r.attack,false,n);
  assert.equal(r.canRoll,true,n);assert.ok(r.attackTarget,n);

 }
 assert.equal(resolvePowerRoll(item('Command Animal')).optional,true);
 assert.equal(resolvePowerRoll(item('Webcasting')).attackTarget,'agl');
 assert.equal(resolvePowerRoll(item('Steal Power')).attackTarget,'ego');
});

test('v0.2.123: Hurled Shield Deflection is a reaction without a new attack roll',()=>{
 const p=item('Hurled Shield Deflection');const r=resolvePowerRoll(p);
 assert.equal(r.canRoll,false);assert.equal(r.attack,false);

 assert.equal(p.system.action,'Reaction');
});

test('v0.2.123: Brain Drain and Supernova produce damage in the correct resource and defense',()=>{
 for(const [name,type,def] of [['Brain Drain','focus','vig'],['Supernova','health','res']]){
  const p=item(name), r=resolvePowerRoll(p);
  assert.equal(p.system.attack,false,name); // imported, not rewritten
  assert.equal(r.attack,true,name);assert.equal(r.checkOnly,false,name);
  assert.equal(r.damageType,type,name);assert.equal(r.attackTarget,def,name);

 }
 assert.equal(getPowerDamageFactor('Supernova',{fantastic:false,enabled:true}),0.5);
 assert.equal(getPowerDamageFactor('Supernova',{fantastic:true,enabled:true}),1);
 const params={powerName:'Supernova',marvelDie:4,damageMultiplier:3,damageReduction:0,ability:2,bonus:0,enabled:true};
 const normal=calculatePowerDamage({...params,fantastic:false});
 const fantast=calculatePowerDamage({...params,fantastic:true});
 assert.equal(normal.damage,Math.ceil(fantast.damage/2));
});

test('v0.2.123: both Banging Heads are damaging and retain their 1x Fantastic rule',()=>{
 for(const set of ['Martial Arts','Super-Strength']){
  const p=item('Banging Heads',set);assert.ok(p,set);
  const r=resolvePowerRoll(p);
  assert.equal(r.attack,true);assert.equal(r.checkOnly,false);
  assert.equal(r.attackTarget,'mle');assert.equal(r.damageType,'health');
 }
 assert.equal(getPowerDamageFactor('Banging Heads',{fantastic:true,enabled:true}),1);
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/Banging Heads: marque exatamente dois alvos antes do ataque/);
 assert.match(main,/mayCreateBangingHeadsDamage\(item.name, resolvedTargets, damageTargets\)/);
 const a={ref:{uuid:'a'}},b={ref:{uuid:'b'}};
 assert.equal(mayCreateBangingHeadsDamage('Banging Heads',[a,b],[a,b]),true);
 assert.equal(mayCreateBangingHeadsDamage('Banging Heads',[a,b],[a]),false);
 assert.equal(mayCreateBangingHeadsDamage('Banging Heads',[a,b],[]),false);
 assert.equal(mayCreateBangingHeadsDamage('Banging Heads',[a],[a]),false);
 assert.equal(mayCreateBangingHeadsDamage('Supernova',[a],[a]),true);
});

test('v0.2.123: resolved classifications clear the 12-candidate review queue, source unchanged',()=>{
 assert.equal(Object.keys(POWER_ROLL_RULES).length,67);
 const {totals,findings}=auditPowerCatalog(items);
 assert.equal(totals.records,398);
 assert.equal(findings.filter(f=>f.code==='attack-kind').length,0);
 assert.equal(findings.filter(f=>f.severity==='high').length,0);
 assert.ok(findings.some(f=>f.power==='Environmental Protection'&&f.code==='duration'));
});
