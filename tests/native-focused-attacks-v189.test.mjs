import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFocusCost} from '../scripts/focus-cost.mjs';
import {focusedMeleeFocusDamage,focusedMeleeFocusHint} from '../scripts/native-power-focused-attacks.mjs';
import {nativeFocusedDamageForPower,nativeFocusedDamageHint,resolveNativePowerAutomation,planNativePowerDispatch} from '../scripts/native-power-automations.mjs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';
import {POWER_CONDITIONS} from '../scripts/power-conditions.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
function power(name,set) {
 const row=catalog.find(r=>r.name===name&&r.system.powerSet===set);
 assert.ok(row,`missing catalog power ${set}/${name}`);
 return {...row,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${row._id}`}},
  id:`owned-${row._id}`};
}
const focusedStrike=()=>power('Focused Strike','Martial Arts');
const focusedFury=()=>power('Focused Fury','Melee Weapons');

test('v189: two different source identities, 53 macros and conservative special-weapon partial status',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(r=>r.powerId)).size,162);
 const strike=resolveNativePowerAutomation(focusedStrike());
 const fury=resolveNativePowerAutomation(focusedFury());
 assert.equal(strike?.powerId,'aUO9Rmlx2HWYGUJM');
 assert.equal(strike.handlerId,'focused-strike');
 assert.equal(strike.status,'native-active');
 assert.equal(fury?.powerId,'8DvKqA6FlcJxPMl3');
 assert.equal(fury.handlerId,'focused-fury');
 assert.equal(fury.status,'native-partial');
 assert.equal(planNativePowerDispatch(focusedFury()).mode,'native-partial');
 assert.notEqual(strike.macroId,fury.macroId);
 assert.notEqual(strike.powerId,fury.powerId);
});

test('v189: official rules and pre-existing Fantastic stun/Edge are retained',()=>{
 const strike=focusedStrike(),fury=focusedFury();
 assert.match(strike.system.effect,/cada 2 pontos de Focus que ele gastar/);
 assert.match(fury.system.effect,/cada 2 pontos de Focus gastos/);
 assert.match(strike.system.effect,/atordoado por um turno/i);
 assert.match(fury.system.effect,/efeito especial da arma/);
 assert.equal(strike.system.attack,true);
 assert.equal(fury.system.attack,true);
 assert.equal(fury.system.attackEdgeMode,'edge');
 assert.equal(strike.system.ability,'mle');
 assert.equal(fury.system.ability,'mle');
 assert.equal(parseFocusCost(strike.system.cost).min,10);
 assert.equal(parseFocusCost(fury.system.cost).min,5);
 assert.equal(POWER_CONDITIONS['Focused Strike'].find(e=>e.status==='stunned')?.on,'fantastic');
 // Intrinsic Edge is a single source; the v188 engine never auto-rerolls it.
 const e=resolveConditionEdges({actor:{items:[],effects:[]},targetActors:[],item:fury,
  ability:'mle',attack:true,kind:'close',targeted:false,baseMode:1});
 assert.equal(e.net,1);
 assert.equal(e.autoCount,0);
});

test('v189: correct +1 per two Focus, including odd amounts, never twice',()=>{
 for (const [item,spent,expected] of [
   [focusedStrike(),10,5],[focusedStrike(),11,5],[focusedStrike(),12,6],
   [focusedStrike(),21,10],[focusedFury(),5,2],[focusedFury(),6,3],
   [focusedFury(),7,3],[focusedFury(),10,5]]) {
  const direct=focusedMeleeFocusDamage(item,spent);
  const routed=nativeFocusedDamageForPower(item,spent);
  assert.deepEqual(direct,routed);
  assert.equal(routed.bonus,expected);
  assert.equal(routed.spent,spent);
  assert.match(routed.summary,/bônus fixo de dano Melee/);
 }
 assert.match(nativeFocusedDamageHint(focusedStrike()),/mínimo 10 Focus/);
 assert.match(nativeFocusedDamageHint(focusedFury()),/mínimo 5 Focus/);
});

test('v189: source and Power Set mismatch never trigger official Focus scaling',()=>{
 const strike=focusedStrike();
 assert.equal(nativeFocusedDamageForPower({...strike,type:'weapon'},10),null);
 assert.equal(nativeFocusedDamageForPower({...strike,system:{...strike.system,powerSet:'Basic'}},10),null);
 assert.equal(nativeFocusedDamageForPower({...strike,name:'Some Homebrew'},10),null);
 assert.equal(nativeFocusedDamageForPower({...strike,flags:{'multiverse-d616':{nativeAutomation:{powerId:'8DvKqA6FlcJxPMl3'}}}},10),null);
 assert.equal(nativeFocusedDamageForPower({...strike,flags:{core:{sourceId:'Compendium.multiverse-d616.powers.Item.8DvKqA6FlcJxPMl3'}}},10),null);
 assert.equal(nativeFocusedDamageForPower(power('Clobber','Super-Strength'),10),null);
 assert.equal(nativeFocusedDamageHint(power('Clobber','Super-Strength')),null);
});

test('v189: invalid spends are refused without Actor mutations',()=>{
 for (const [item,bad] of [[focusedStrike(),9],[focusedStrike(),0],[focusedFury(),4],
   [focusedFury(),2.3],[focusedStrike(),NaN],[focusedFury(),Infinity]]){
  assert.throws(()=>nativeFocusedDamageForPower(item,bad),/Focus inválido/);
 }
 const item=focusedStrike();
 assert.equal(item.actor,undefined);
 assert.ok(!item.update);
});

test('v189: integrates into the ONE existing Focus Damage flag; preserves Damage/RD and v188 manual rerolls',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/nativeFocusedDamageForPower\(item,spend\) \?\?/);
 assert.match(main,/nativeFocusedDamageForPower\(item,newSpent\) \?\?/);
 assert.match(main,/systemFlags\.focusDamageBonus = Number\(preFocus\.bonus \?\? 0\)/);
 assert.match(main,/chatMessage\.getFlag\("multiverse-d616", "focusDamageBonus"\)/);
 assert.match(main,/bonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.match(main,/flatBonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.equal(calculateD616Damage({marvelDie:5,damageMultiplier:5,damageReduction:2,ability:6,bonus:5}).damage,26);
 const ce=readFileSync(new URL('../scripts/condition-edge.mjs',import.meta.url),'utf8');
 assert.match(ce,/autoCount:0/);
});
