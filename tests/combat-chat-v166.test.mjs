import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatChatDamageBreakdown} from '../scripts/combat-chat-v164.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';

const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const style=readFileSync(new URL('../css/multiverse-d616.css',import.meta.url),'utf8');
const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');

test('v166 three GM actions replace extra preparation button without touching guard selection',()=>{
  assert.match(source,/html\.querySelector\('\.marvel-roll \.mm-roll-actions button\.damage'\)\?\.remove\(\)/);
  assert.doesNotMatch(source,/textContent\s*=\s*'Preparar dano \/ proteção'/);
  assert.match(source,/data-m616-quick="full">DANO/);
  assert.match(source,/data-m616-quick="half">1\/2 DANO/);
  assert.match(source,/data-m616-quick="heal">CURA/);
  assert.match(mmdr,/entries\.some\(entry=>Boolean\(renderGuardSelector\(entry,card\)\)\)/);
  assert.match(mmdr,/return \{requiresGuardDecision:true\}/);
});

test('v166 real Zima attack: Marvel 4, multiplier 3, RD 2, Agility 6, Focus 7 = 17',()=>{
  const entry={marvelDie:4,damageMultiplier:3,damageReduction:2,effectiveDamageMultiplier:1,
    abilityDamage:6,flatBonus:7,customDamageBonus:0,normalDamage:17,damage:17,fantastic:false};
  const result=combatChatDamageBreakdown(entry);
  assert.equal(result.marvelDie,4);
  assert.equal(result.multiplier,3);
  assert.equal(result.reduction,2);
  assert.equal(result.effective,1);
  assert.equal(result.focusBonus,7);
  assert.equal(result.customBonus,0);
  assert.equal(result.ability,6);
  assert.equal(result.normal,17);
  assert.equal(result.final,17);
  assert.equal(result.normalFormulaValid,true);
  assert.equal(calculateD616Damage({marvelDie:4,damageMultiplier:3,damageReduction:2,ability:6,bonus:7}).damage,17);
  assert.match(source,/\(focusBonus&&effective>0\?rows\('Bônus de Focus'/);
  assert.match(source,/normalFormula/);
});

test('v166 zero DM always zero damage, even with attribute and Focus; fantastic doubles after DR',()=>{
  const zero={marvelDie:6,damageMultiplier:2,damageReduction:3,effectiveDamageMultiplier:0,
    abilityDamage:6,flatBonus:7,customDamageBonus:0,normalDamage:0,damage:0,fantastic:true};
  const b=combatChatDamageBreakdown(zero);
  assert.equal(b.effective,0);assert.equal(b.normal,0);assert.equal(b.final,0);assert.equal(b.normalFormulaValid,true);
  assert.equal(calculateD616Damage({marvelDie:6,damageMultiplier:2,damageReduction:3,ability:6,bonus:7,fantastic:true}).damage,0);
  const fan=combatChatDamageBreakdown({...zero,damageMultiplier:5,damageReduction:2,effectiveDamageMultiplier:3,
    normalDamage:31,damage:62});
  assert.equal(fan.normal,31);assert.equal(fan.final,62);
  assert.equal(fan.normalFormulaValid,true);
});

test('v166 one prominent final amount; expanded breakdown is GM-only and closed by default',()=>{
  assert.match(source,/summary\.className='m616-v164-summary'/);
  assert.match(source,/m616-v164-summary-value/);
  assert.match(style,/\.m616-v164-summary-value\{[^}]*font-size:26px/);
  assert.match(source,/const finalLine = ''/);
  assert.match(source,/if\(isGM\)\{\s*const details=document\.createElement\('details'\)/);
  assert.doesNotMatch(source,/details\.open\s*=\s*true/);
  assert.match(source,/Resolução do Dano <i class="fas fa-chevron-right" aria-hidden="true"/);
  assert.match(source,/const name=escLabel\(t\.name\|\|t\.targetName\|\|snapshotTarget\?\.name\|\|''\)/);
  assert.match(source,/if\(releasedResolution && messageContent\)/);
});
