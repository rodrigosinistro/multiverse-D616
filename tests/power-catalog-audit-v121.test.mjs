import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditPowerCatalog} from '../scripts/power-catalog-audit.mjs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const names=['Control Emotion','Control Group Emotion','Sense Emotion','Sway Emotion'];

test('auditoria cobre todo o catálogo de 398 poderes e não encontra ataque sem defesa',()=>{
  const {totals,findings}=auditPowerCatalog(catalog);
  assert.equal(totals.records,398);
  assert.ok(totals.powerSets>=20);
  assert.equal(totals.attacks+totals.nonDamagingChecks+totals.otherRolls+totals.noRoll,398);
  assert.equal(findings.filter(f=>f.severity==='high').length,0,JSON.stringify(findings.filter(f=>f.severity==='high')));
  assert.equal(findings.filter(f=>f.code==='attack-target').length,0);
});

test('4 poderes de emoções são testes Ego vs Ego, sem dano no catálogo legado',()=>{
  for(const powerName of names){
    const item=catalog.find(x=>x.name===powerName);
    assert.equal(item.system.attack,true,`Fonte importada preservada: ${powerName}`);
    assert.ok(item.system.attackTarget == null || item.system.attackTarget === '',`Fonte sem defesa: ${powerName}`);
    const result=resolvePowerRoll(item);
    assert.equal(result.canRoll,true,powerName);
    assert.equal(result.ability,'ego',powerName);
    assert.equal(result.attackTarget,'ego',powerName);
    assert.equal(result.checkOnly,true,powerName);
    assert.equal(result.attack,false,powerName);
  }
});

test('4 poderes de emoções mantêm comportamento com itens legados sem metadados completos',()=>{
  for(const name of names){
    const result=resolvePowerRoll({name,type:'power',system:{attack:true,ability:'',attackTarget:'',formula:'{1d6,1dm,1d6}'}});
    assert.equal(result.canRoll,true,name);
    assert.equal(result.attack,false,name);
    assert.equal(result.attackTarget,'ego',name);
  }
});

test('os demais ataques continuam danosos e checkOnly não produz dano',()=>{
  const blast=resolvePowerRoll(catalog.find(x=>x.name==='Elemental Blast'));
  assert.equal(blast.attack,true);
  assert.equal(blast.checkOnly,false);
  assert.equal(blast.attackTarget,'agl');
  const grabbed=resolvePowerRoll(catalog.find(x=>x.name==='Telekinetic Grab'));
  assert.equal(grabbed.checkOnly,true);
  assert.equal(grabbed.attack,false);
});

test('achados sem regra confirmada são somente alertas de revisão, sem reescrever dados',()=>{
  const source=JSON.stringify(catalog);
  const {findings}=auditPowerCatalog(catalog);
  assert.equal(findings.filter(x=>x.code==='attack-kind').length,0);
  assert.ok(findings.some(x=>x.code==='duration'&&x.power==='Environmental Protection'));
  assert.ok(findings.some(x=>x.code==='description'&&x.power==='Iconic Weapon'));
  assert.equal(JSON.stringify(catalog),source);
});
