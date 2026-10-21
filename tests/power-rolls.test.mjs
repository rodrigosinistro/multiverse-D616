import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItemRollFormula } from '../scripts/roll-formula.mjs';
import {
  POWER_ROLL_RULES, resolvePowerRoll, checkPowerOutcome,
  hasNaturalUltimateFantastic,
} from '../scripts/power-rolls.mjs';

const items = JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url))).items;
const names = new Set(items.map(i => i.name));

test('51 poderes mapeados cobrem entradas reais e fornecem atributo válido', () => {
  assert.equal(Object.keys(POWER_ROLL_RULES).length, 51);
  for (const [name, rule] of Object.entries(POWER_ROLL_RULES)) {
    assert.ok(names.has(name), name);
    const item = items.find(i => i.name === name);
    const actual = resolvePowerRoll(item);
    assert.equal(actual.ability, rule.ability, name);
    assert.ok(actual.canRoll, name);
    if (rule.attackTarget) assert.equal(actual.attackTarget, rule.attackTarget, name);
    if (rule.targetNumber) assert.equal(actual.targetNumber, rule.targetNumber, name);
    if (rule.checkOnly) assert.equal(actual.checkOnly, true, name);
  }
});

test('new actors and legacy actors both roll correct ability and target', () => {
  const cases = [
    ['Detect Lie', 'ego', 'ego'],
    ['Disrupt Nerves', 'ego', 'res'],
    ['Swap Items', 'ego', 'vig'],
    ['Razorwebs', 'agl', 'agl'],
    ['Wisecracker', 'ego', 'ego'],
    ['Jinx You', 'mle', 'mle'],
  ];
  for (const [name, ability, target] of cases) {
    const modern = resolvePowerRoll(items.find(i => i.name === name));
    const old = resolvePowerRoll({type:'power', name, system:{formula:'{1d6,1dm,1d6}', ability:'', attackTarget:''}});
    assert.equal(modern.ability, ability, name);
    assert.equal(old.ability, ability, name);
    assert.equal(old.attackTarget, target, name);
    assert.equal(buildItemRollFormula('{1d6,1dm,1d6}', old.ability), `{1d6,1dm,1d6} + @${ability}.value`, name);
  }
});

test('preserva customizações explícitas na ficha e não altera poderes não mapeados', () => {
  const own = resolvePowerRoll({type:'power',name:'Detect Lie',system:{ability:'log',attackTarget:'vig',powerCheck:true,rollTargetNumber:18}});
  assert.equal(own.ability,'log');assert.equal(own.attackTarget,'vig');assert.equal(own.targetNumber,18);
  const custom = resolvePowerRoll({type:'power',name:'Poder Caseiro',system:{ability:'ego',attackTarget:'res',powerCheck:true,rollTargetNumber:14}});
  assert.equal(custom.ability,'ego');assert.equal(custom.targetNumber,14);
  const passive = resolvePowerRoll(items.find(i=>i.name==='Mighty 1'));
  assert.equal(passive.canRoll,false);
});

test('distingue rolagem sem dano, ataque danoso e teste situacional', () => {
  for (const name of ['Detect Lie','Disrupt Nerves','Command','Domination','Jinx You']) {
    assert.equal(resolvePowerRoll(items.find(i=>i.name===name)).checkOnly,true,name);
  }
  for (const name of ['Wisecracker','Razorwebs','Hellfire Chains']) {
    const result=resolvePowerRoll(items.find(i=>i.name===name));
    assert.equal(result.attack,true,name);assert.equal(result.checkOnly,false,name);
  }
  for (const name of ['Swap Places','Swap Items','Sense Supernatural','Telespot']) {
    assert.equal(resolvePowerRoll(items.find(i=>i.name===name)).optional,true,name);
  }
});

test('TN fixo só quando regra apresenta número inequívoco', () => {
  const fixed=[['Understand Code',13],['Understand Body Language',13],['Understand Unusual Communication',13],['Cure-All',12],['Restore',20]];
  for(const [name, tn] of fixed) assert.equal(resolvePowerRoll(items.find(i=>i.name===name)).targetNumber,tn,name);
  assert.equal(resolvePowerRoll(items.find(i=>i.name==='Resurrect')).targetNumber,0);
  assert.equal(resolvePowerRoll(items.find(i=>i.name==='Understand Sign Language')).targetNumber,0);
});

test('Fantastic failure não acerta automaticamente; Ultimate Fantastic sim', () => {
  assert.deepEqual(checkPowerOutcome(12,16,{fantastic:true}),{success:false,fantastic:true,label:'FALHA FANTÁSTICA'});
  assert.deepEqual(checkPowerOutcome(16,16,{fantastic:true}),{success:true,fantastic:true,label:'SUCESSO FANTÁSTICO'});
  assert.deepEqual(checkPowerOutcome(12,16,{fantastic:true,ultimate:true}),{success:true,fantastic:true,label:'SUCESSO FANTÁSTICO'});
  assert.equal(checkPowerOutcome(10,0),null);
  assert.equal(checkPowerOutcome(15,20,{fantastic:false}).label,'FALHA');
});

test('ultimate natural 6-M-6 ignora TN, Marvel forçado não', () => {
  const mk=(a,c,options={})=>({options, dice:[{result:a},{result:1},{result:c}]});
  assert.equal(hasNaturalUltimateFantastic(mk(6,6),true),true);
  assert.equal(hasNaturalUltimateFantastic(mk(6,5),true),false);
  assert.equal(hasNaturalUltimateFantastic(mk(6,6,{forceMarvelM:true}),true),false);
  assert.equal(hasNaturalUltimateFantastic(mk(6,6,{ultimateFantasticApplied:true}),true),false);
  assert.equal(hasNaturalUltimateFantastic(mk(6,6),false),false);
});

test('integração Foundry: card de check não tem DAMAGE e card com TN mostra resultado',()=>{
 const src=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(src,/const isPowerCheck = this\.getFlag\("multiverse-d616", "powerCheck"\) === true/);
 assert.match(src,/if \(isInitiative \|\| \(isPowerCheck/);
 assert.match(src,/checkPowerOutcome\(total, fixedTN/);
 assert.match(src,/checkPowerOutcome\(total,defense/);
 assert.match(src,/if \(!attackTargetAbr && !powerCheckOnly\)/);
 assert.match(src,/if \(requestPowerRoll === null \|\| requestPowerRoll === undefined\) return/);
});

test('poderes de agarrar e faixas não geram botão de dano por dados antigos',()=>{
 for(const n of ['Elemental Grab','Telekinetic Grab','Webgrabbing','Crimson Bands of Cyttorak','Elemental Barrier']){
  const old=items.find(x=>x.name===n);
  const data=resolvePowerRoll(old);
  assert.equal(data.checkOnly,true,n);
  assert.equal(data.attack,false,n);
 }
 const existing=resolvePowerRoll({type:'power',name:'Telekinetic Grab',system:{ability:'log',attackTarget:'mle',attack:true,damageType:'health'}});
 assert.equal(existing.checkOnly,true);assert.equal(existing.attack,false);
 const crimsonOld=resolvePowerRoll({type:'power',name:'Crimson Bands of Cyttorak',system:{ability:'log',attackTarget:'log',attack:false}});
 assert.equal(crimsonOld.ability,'ego');assert.equal(crimsonOld.attackTarget,'mle');assert.equal(crimsonOld.checkOnly,true);
 const crimsonCustom=resolvePowerRoll({type:'power',name:'Crimson Bands of Cyttorak',system:{ability:'agl',attackTarget:'vig',attack:false}});
 assert.equal(crimsonCustom.ability,'agl');assert.equal(crimsonCustom.attackTarget,'vig');
});


test('v0.2.47: Headshot, Double Tap e Penance Stare são ataques danosos mesmo no legado',()=>{
  for (const [name,damageType] of [['Headshot','health'],['Double Tap','health'],['Penance Stare','focus']]) {
    const imported=items.find(i=>i.name===name);
    const resolved=resolvePowerRoll(imported);
    assert.equal(resolved.attack,true,name);
    assert.equal(resolved.checkOnly,false,name);
    assert.equal(resolved.damageType,damageType,name);
    assert.ok(resolved.attackTarget,name);
    const legacy=resolvePowerRoll({type:'power',name,system:{attack:false,ability:'',attackTarget:'',damageType:'',formula:'{1d6,1dm,1d6}'}});
    assert.equal(legacy.attack,true,`importação antiga de ${name}`);
    assert.equal(legacy.damageType,damageType,name);
  }
});
