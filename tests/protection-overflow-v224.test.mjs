import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessGuardHit,damageAfterGuardProtection,selectGuard,selectElementalDefense,activeElementalGuards} from '../scripts/elemental-shields.mjs';
import {reinforcementOption} from '../scripts/native-priority-lot5.mjs';
const SYSTEM='multiverse-d616';
const protectedActor=name=>{
 const power={id:'p',name};
 return {items:new Map([['p',power]]),effects:[{id:'e',disabled:false,flags:{[SYSTEM]:{concentrationPower:{itemId:'p'}}}}]};
};
const result=(raw,threshold,allowOverflow=false)=>assessGuardHit(raw,
 {threshold,name:'Elemental Protection 2',kind:'protection'},{allowOverflow});
test('v224: setting defaults to preserving full attack absorption including a destroyed shield',()=>{
 for(const raw of [0,15,20,21,74]){
  const g=result(raw,20);
  assert.equal(g.blocked,true);
  assert.equal(g.damageToTarget,0);
  assert.equal(damageAfterGuardProtection(g,raw),0);
  assert.equal(g.destroyed,raw>20);
 }
});
test('v224: disabled setting allows ONLY excess on a destroyed protection',()=>{
 for(const raw of [0,10,20]){
  const g=result(raw,20,true);
  assert.equal(g.blocked,true);
  assert.equal(g.damageToTarget,0);
  assert.equal(g.destroyed,false);
 }
 const g=result(74,20,true);
 assert.equal(g.blocked,false);assert.equal(g.destroyed,true);
 assert.equal(g.damageToTarget,54);
 assert.equal(damageAfterGuardProtection(g,74),54);
 assert.equal(damageAfterGuardProtection(g,64),44,'normal target DR applied after shield threshold');
 assert.equal(damageAfterGuardProtection(g,15),0,'DR may cancel remaining damage entirely');
 assert.equal(damageAfterGuardProtection(g,999),54,'never deal more than raw overflow');
});
test('v224: half damage is evaluated against half raw before the protection, not twice',()=>{
 const full=assessGuardHit(75,{name:'Telekinetic Protection 2',threshold:20},{allowOverflow:true});
 const half=assessGuardHit(38,{name:'Telekinetic Protection 2',threshold:20},{allowOverflow:true});
 assert.equal(damageAfterGuardProtection(full,75),55);
 assert.equal(damageAfterGuardProtection(half,38),18);
 assert.equal(damageAfterGuardProtection(half,35),15);
});
test('v224: all nine personal shields route through common guard resolver',()=>{
 for(const name of ['Elemental Protection 1','Elemental Protection 2','Elemental Protection 3','Elemental Protection 4',
  'Telekinetic Protection 1','Telekinetic Protection 2','Telekinetic Protection 3','Telekinetic Protection 4','Shield of the Seraphim']){
  const a=protectedActor(name);const g=selectElementalDefense({actor:a,category:'health'}).guard;
  assert.equal(damageAfterGuardProtection(assessGuardHit(100,g,{allowOverflow:true}),100),100-g.threshold,name);
  if(name==='Shield of the Seraphim')assert.equal(selectGuard(activeElementalGuards(a),'auto','focus'),null);
 }
});
test('v224: regions, barriers and spheres share the overflow rule; barrier creator pays Reinforcement',()=>{
 for(const name of ['Elemental Barrier','Telekinetic Barrier','Elemental Sphere','Telekinetic Sphere','Elemental Prison']){
  const owner=protectedActor(name);const guard={kind:'structure',name,threshold:10};
  const protectedByBoundary=selectElementalDefense({actor:protectedActor('Elemental Protection 2'),
   boundary:{actor:owner,guard},category:'health'});
  assert.equal(protectedByBoundary.owner,owner);
  assert.equal(damageAfterGuardProtection(assessGuardHit(36,protectedByBoundary.guard,{allowOverflow:true}),36),26);
 }
});
test('v224: Reinforcement continues preventing all Health and redirecting raw overflow to Focus',()=>{
 const reinforce={id:'reinforce',type:'power',name:'Elemental Reinforcement',system:{powerSet:'Elemental Control'}};
 const a={items:[reinforce]},g={name:'Elemental Protection 2',kind:'protection',threshold:20};
 const option=reinforcementOption({actor:a,guard:g,rawDamage:75,category:'health'});
 assert.equal(option?.overflow,55);
 assert.equal(damageAfterGuardProtection({blocked:true,damageToTarget:0},75),0);
});
test('v224: world checkbox setting and GM application use the same key, with a safe default',()=>{
 const code=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(code,/name: "Sem dano Excedente em Proteções"/);
 assert.match(code,/scope: "world"/);
 assert.match(code,/config: true/);
 assert.match(code,/default: true/);
 assert.match(code,/noExcessProtectionDamage\(\)/);
 assert.match(code,/assessGuardHit\(rawAmount,guard,\{allowOverflow:!noExcessProtectionDamage\(\)\}\)/);
 assert.match(code,/damageAfterGuardProtection\(guarded,damageAfterDR\)/);
 assert.match(code,/applyExactEntries\(normalized,action,modes,message\)/);
 assert.match(code,/applyExactEntries\(\[entry\],'full',\{\},null\)/);
});
