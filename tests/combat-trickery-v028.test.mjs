import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={once:()=>{}};
const {isAttackItem}=await import('../scripts/activated-movement-powers.mjs');
const item=(name,system,type='power')=>({name,system,type});
const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');

test('Combat Trickery: ataque Double Tap da ficha antiga (attack:false) é válido',()=>{
 const attack=item('Double Tap', {attack:false,attackKind:'ranged',attackTarget:'agl',ability:'agl',formula:'{1d6,1dm,1d6}'});
 assert.equal(isAttackItem(attack),true);
 assert.match(main,/function mmD616CombatTrickeryAttackContext\([\s\S]*?if \(!state\?\.armed \|\| !isAttackItem\(item\)/);
});
test('Combat Trickery: ataques de armas e poderes ofensivos continuam elegíveis',()=>{
 assert.equal(isAttackItem(item('Pistola',{attack:false,ability:'agl'},'weapon')),true);
 assert.equal(isAttackItem(item('Elemental Blast',{attack:true,ability:'agl',attackTarget:'agl'})),true);
 assert.equal(isAttackItem(item('Attack Legacy',{attack:false,ability:'ego',attackTarget:'res'})),true);
});
test('Combat Trickery: não é gasto em poder passivo ou teste sem ataque',()=>{
 assert.equal(isAttackItem(item('Combat Trickery',{attack:false,ability:''})),false);
 assert.equal(isAttackItem(item('Cure-All',{attack:false,ability:'ego'})),false);
 assert.equal(isAttackItem(item('Detect Lie',{attack:false,ability:'ego',attackTarget:'ego'})),false);
});
test('Combat Trickery: mantém validação de Rank para todos os alvos e proteção contra Trouble',()=>{
 assert.match(main,/targetRanks\.some\(\(rank\) => rank < attackerRank\)/);
 assert.match(main,/rollOptions\.forceMarvelM = true;/);
 assert.match(main,/rollOptions\.combatTrickery = true;/);
 assert.match(main,/noMarvelTrouble: true/);
 assert.match(main,/await mmD616ConsumeCombatTrickery\(this\.actor\);/);
});
test('Combat Trickery: alerta que só modifica a rolagem seguinte',()=>{
 assert.match(main,/A rolagem anterior não é alterada/);
});
