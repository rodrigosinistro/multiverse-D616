import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyAttackStance,attackStanceMeleeBonus,hasUnflappablePoise,
 unflappableTargetModifiers,hasDefenseStanceConcentration} from '../scripts/native-power-martial-stances.mjs';
import {checkNativePowerUse,commitNativePowerAfterFocus,resolveNativePowerAutomation,
 planNativePowerDispatch,nativeStanceDamageBonusForAttack} from '../scripts/native-power-automations.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';
const SYS='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const power=(name,set='Martial Arts')=>{
 const item=catalog.find(row=>row.name===name&&row.system.powerSet===set);
 assert.ok(item,`${name}/${set}`);
 return {...item,system:{...item.system},id:`ACTOR-${item._id}`,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${item._id}`}}};
};
const itemCollection=items=>({contents:items,get:id=>items.find(item=>item.id===id)});
function create({mle=4,stance=true,defense=false,poise=false}={}) {
 const attack=power('Attack Stance'),defensePower=power('Defense Stance'),poisePower=power('Unflappable Poise');
 const items=[attack,defensePower,...(poise?[poisePower]:[])];
 const effects=[];
 const effect=item=>({
   disabled:false,flags:{[SYS]:{concentrationPower:{transient:true,itemId:item.id}}},
   updates:[],async update(patch){
    this.updates.push(patch);this.flags[SYS].nativeAttackStance=patch[`flags.${SYS}.nativeAttackStance`];
   },
 });
 const ae=effect(attack),de=effect(defensePower);
 if(stance)effects.push(ae);
 if(defense)effects.push(de);
 return {actor:{items:itemCollection(items),system:{abilities:{mle:{value:mle}}},effects},attack,ae,de,defensePower,poisePower};
}

test('v187: official source rules, 51 macros and explicit partial status for Unflappable',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(e=>e.powerId)).size,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(e=>`${e.powerSet}/${e.powerName}`)).size,162);
 const stance=power('Attack Stance');assert.match(stance.system.effect,/dobra seu bônus de habilidade de Melee/i);
 assert.equal(stance.system.duration,'Concentration');
 assert.equal(resolveNativePowerAutomation(stance)?.handlerId,'attack-stance');
 assert.equal(planNativePowerDispatch(stance).mode,'native-active');
 const poise=power('Unflappable Poise');assert.match(poise.system.effect,/dupla desvantagem/i);
 assert.equal(resolveNativePowerAutomation(poise)?.handlerId,'unflappable-poise');
 assert.equal(planNativePowerDispatch(poise).mode,'native-partial');
 for(const [name,set] of [['Flight 1','Basic'],['Flight 2','Basic'],['Jump 2','Super-Strength'],['Jump 3','Super-Strength'],['Speed Swim','Super-Speed']]){
  const p=power(name,set);assert.equal(resolveNativePowerAutomation(p)?.status,'reference-existing');
 }
});

test('v187: Attack Stance adds exactly one signed Melee ability bonus while own concentration active',async()=>{
 const {actor,attack,ae}=create({mle:5});
 assert.equal(checkNativePowerUse(actor,attack).ok,true);
 assert.deepEqual(await commitNativePowerAfterFocus(actor,attack,0),{kind:'native-attack-stance',sourceItemId:attack.id});
 assert.equal(ae.updates.length,1);
 assert.equal(ae.flags[SYS].nativeAttackStance.sourcePowerId,'cCVjyNL1fTcyAq9g');
 assert.equal(nativeStanceDamageBonusForAttack(actor,'mle',true),5);
 assert.equal(nativeStanceDamageBonusForAttack(actor,'mle',false),0);
 assert.equal(nativeStanceDamageBonusForAttack(actor,'agl',true),0);
 actor.system.abilities.mle.value=7;
 assert.equal(attackStanceMeleeBonus(actor,'mle',true),7);
 // Snapshot can be saved with old card and its bonus remains the old amount.
 const snapshot=7;ae.disabled=true;
 assert.equal(attackStanceMeleeBonus(actor,'mle',true),0);
 assert.equal(calculateD616Damage({marvelDie:6,damageMultiplier:6,damageReduction:2,ability:7,bonus:snapshot}).damage,38);
});

test('v187: invalid/unowned/unrelated stance does not alter any attack; same name different Power Set rejected',async()=>{
 const {actor,attack,ae}=create({mle:-2});
 await applyAttackStance(actor,attack);
 assert.equal(nativeStanceDamageBonusForAttack(actor,'mle',true),-2);
 ae.flags[SYS].nativeAttackStance.sourcePowerId='WRONG';
 assert.equal(nativeStanceDamageBonusForAttack(actor,'mle',true),0);
 ae.flags[SYS].nativeAttackStance.sourcePowerId='cCVjyNL1fTcyAq9g';
 ae.flags[SYS].concentrationPower.itemId='OTHER';
 assert.equal(nativeStanceDamageBonusForAttack(actor,'mle',true),0);
 assert.equal(resolveNativePowerAutomation({...attack,system:{...attack.system,powerSet:'Magic'}}),null);
 const none=create({stance:false});
 await assert.rejects(commitNativePowerAfterFocus(none.actor,none.attack,0),/Concentração ativa não encontrada/);
});

test('v187: Unflappable only applies to direct close attacks; does not stack duplicate independent copies',()=>{
 const {actor}=create({poise:true,stance:false});
 assert.equal(hasUnflappablePoise(actor),true);
 assert.equal(unflappableTargetModifiers(actor).length,0);
 assert.equal(unflappableTargetModifiers(actor,{attack:true,targeted:false,close:true}).length,0);
 assert.equal(unflappableTargetModifiers(actor,{attack:true,targeted:true,close:false}).length,0);
 const b={actor:{items:itemCollection([]),effects:[]},targetActors:[actor],attack:true,targeted:true,ability:'mle',kind:'melee'};
 const melee=resolveConditionEdges(b);
 assert.equal(melee.net,-1);assert.equal(melee.autoCount,0);
 assert.match(melee.sources[0].source,/Unflappable Poise/);
 const ranged=resolveConditionEdges({...b,ability:'agl',kind:'ranged'});
 assert.equal(ranged.net,0);
 assert.equal(resolveConditionEdges({...b,attack:false}).net,0);
 assert.equal(resolveConditionEdges({...b,targetActors:[actor,actor]}).net,-1);
 assert.equal(resolveConditionEdges({...b,targetActors:[actor,{items:itemCollection([]),effects:[]}]}).ambiguousTargets,true);
});

test('v187: second Trouble is surfaced with active Defense Stance but NOT silently rerolled twice',()=>{
 const {actor,de}=create({poise:true,stance:false,defense:true});
 assert.equal(hasDefenseStanceConcentration(actor),true);
 const sources=unflappableTargetModifiers(actor,{attack:true,targeted:true,close:true});
 assert.equal(sources.length,2);assert.equal(sources[0].sign+sources[1].sign,-2);
 const resolved=resolveConditionEdges({actor:{items:itemCollection([]),effects:[]},targetActors:[actor],attack:true,targeted:true,ability:'mle',kind:'close'});
 assert.equal(resolved.net,-2);assert.equal(resolved.autoCount,0);assert.equal(resolved.requiresDecision,true);
 de.disabled=true;
 assert.equal(hasDefenseStanceConcentration(actor),false);
 assert.equal(unflappableTargetModifiers(actor,{attack:true,targeted:true,close:true}).length,1);
});

test('v187: only original attack cards carry stance snapshot; damage/RD multiplier and history remain untouched',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/nativeStanceMeleeBonus: nativeStanceDamageBonusForAttack\(this\.actor,abilityKey,isAttackItem\(this\)\)/);
 assert.match(main,/chatMessage\.getFlag\('multiverse-d616','nativeStanceMeleeBonus'\)/);
 assert.match(main,/bonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.match(main,/flatBonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.doesNotMatch(main,/damageMultiplier\s*:\s*baseDamageMultiplier\s*\+\s*nativeStanceBonus/);
 const fake=power('Attack Stance');fake.system.powerSet='Basic';
 assert.equal(resolveNativePowerAutomation(fake),null);
});

test('v187: Real Jinx explicitly does not stack with Unflappable Poise Trouble',()=>{
 const {actor}=create({poise:true,stance:false});
 actor.items.contents.push(power('Real Jinx','Luck'));
 const ctx={actor:{items:itemCollection([]),effects:[]},targetActors:[actor],
  attack:true,targeted:true,ability:'mle',kind:'close'};
 const result=resolveConditionEdges(ctx);
 assert.equal(result.net,-1);
 assert.equal(result.sources.filter(s=>s.sign<0).length,1);
 assert.ok(result.sources.some(s=>s.source.includes('Unflappable Poise')));
 assert.ok(!result.sources.some(s=>s.source.includes('Real Jinx')));
});
