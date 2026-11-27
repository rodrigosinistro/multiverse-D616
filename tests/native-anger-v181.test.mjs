import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {angerModifiers, applyAngerConcentration, checkAngerConcentrationCompatibility,
  angerMeleeBonusForAttack} from '../scripts/native-power-anger.mjs';
import {checkNativePowerUse,commitNativePowerAfterFocus,nativeDamageBonusForAttack,
  planNativePowerDispatch} from '../scripts/native-power-automations.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';

const SYS='multiverse-d616';
const anger={id:'ACTOR_ANGER_01',name:'Anger',type:'power',system:{powerSet:'Basic',duration:'Concentration',cost:'10 or more Focus'}};
const other={id:'ANOTHER_POWER',name:'Body Sheet',type:'power',system:{powerSet:'Plasticity',duration:'Concentration'}};
const weapon={id:'WEAPON',name:'Punch',type:'weapon',system:{ability:'mle'}};
function harness({others=[],prior=false}={}) {
 const actor={items:new Map([[anger.id,anger],[other.id,other]]),effects:[]};
 const status=(item,disabled=false) => ({
    id:`status-${item.id}`,disabled,
    system:{changes:[]},
    flags:{[SYS]:{concentrationPower:{transient:true,itemId:item.id,statusId:`mmrpg.concentration-power.${item.id}`}}},
    updates:[], async update(patch) {
      this.updates.push(patch);
      this.system.changes=patch['system.changes'];
      this.flags[SYS].nativeAnger=patch[`flags.${SYS}.nativeAnger`];
    },
 });
 const angerEffect=status(anger);actor.effects.push(angerEffect);
 if(prior) angerEffect.flags[SYS].nativeAnger={sourcePowerId:'3BRcvFKqGlgbnabc',sourceItemId:anger.id,tiers:1,meleeDamageBonus:15};
 for(const o of others)actor.effects.push(status(o));
 return {actor,angerEffect};
}

test('v181: exact published rule: 10/19/20/39 Focus scale both Melee and Logic, not the multiplier',()=>{
 for (const [spent,bonus,logic] of [[10,15,-2],[19,15,-2],[20,30,-4],[39,45,-6]]) {
   const result=angerModifiers(spent);
   assert.equal(result.meleeDamageBonus,bonus);
   assert.equal(result.logicPenalty,logic);
   assert.equal(result.tiers,Math.floor(spent/10));
 }
 assert.throws(()=>angerModifiers(9));
 assert.throws(()=>angerModifiers(Number.NaN));
});

test('v181: activation attaches exactly one typed Logic change and preserves existing effects on repeat',async()=>{
 const {actor,angerEffect}=harness();
 actor.effects[0].system.changes.push({key:'system.movement.run.value',type:'add',value:1});
 assert.equal(checkNativePowerUse(actor,anger).ok,true);
 assert.equal(planNativePowerDispatch(anger).mode,'native-active');
 const applied=await commitNativePowerAfterFocus(actor,anger,20);
 assert.equal(applied.meleeDamageBonus,30);
 assert.equal(angerEffect.flags[SYS].nativeAnger.spent,20);
 assert.equal(angerEffect.system.changes.length,2);
 assert.deepEqual(angerEffect.system.changes[1],{key:'system.abilities.log.value',type:'add',value:-4,phase:'initial',priority:null});
 assert.equal(nativeDamageBonusForAttack(actor,'mle',true),30);
 await applyAngerConcentration(actor,anger,10);
 assert.equal(angerEffect.system.changes.length,2,'re-activation must replace, never stack, Logic penalty');
 assert.equal(angerEffect.system.changes[1].value,-2);
 assert.equal(angerMeleeBonusForAttack(actor,'mle'),15);
});

test('v181: only actual Melee attacks get bonus; death/end/disable of Concentration removes immediately',async()=>{
 const {actor,angerEffect}=harness();
 await applyAngerConcentration(actor,anger,10);
 assert.equal(nativeDamageBonusForAttack(actor,'mle',true),15);
 assert.equal(nativeDamageBonusForAttack(actor,'agl',true),0);
 assert.equal(nativeDamageBonusForAttack(actor,'log',true),0);
 assert.equal(nativeDamageBonusForAttack(actor,'mle',false),0);
 angerEffect.disabled=true;
 assert.equal(nativeDamageBonusForAttack(actor,'mle',true),0);
 angerEffect.disabled=false;
 actor.effects=[];
 assert.equal(nativeDamageBonusForAttack(actor,'mle',true),0);
});

test('v181: Concentration exclusivity does not modify Focus or other Concentrations',async()=>{
 const {actor,angerEffect}=harness({others:[other]});
 assert.match(checkNativePowerUse(actor,anger).reason,/encerre os outros poderes/);
 assert.match(checkNativePowerUse(actor,other).reason,/Anger ativo/);
 assert.equal(angerEffect.updates.length,0);
 // With only Anger maintained, other Concentration is blocked even without a native handler.
 actor.effects.splice(1);
 assert.equal(checkNativePowerUse(actor,other).ok,false);
 assert.equal(checkNativePowerUse(actor,weapon).ok,true);
 assert.equal(checkNativePowerUse(actor,{type:'power',system:{duration:'Instant'}}).ok,true);
 angerEffect.disabled=true;
 assert.equal(checkNativePowerUse(actor,other).ok,true);
});

test('v181: Melee bonus is snapshotted into the existing RD pipeline, never the multiplier',async()=>{
 const {actor}=harness();
 await applyAngerConcentration(actor,anger,10);
 const bonus=nativeDamageBonusForAttack(actor,'mle',true);
 assert.equal(calculateD616Damage({marvelDie:6,damageMultiplier:6,damageReduction:2,ability:4,bonus}).damage,43);
 assert.equal(calculateD616Damage({marvelDie:6,damageMultiplier:6,damageReduction:2,ability:4,bonus,fantastic:true}).damage,86);
 assert.equal(calculateD616Damage({marvelDie:6,damageMultiplier:2,damageReduction:2,ability:4,bonus}).damage,0);
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/nativeAngerMeleeBonus: nativeDamageBonusForAttack/);
 assert.match(main,/getFlag\('multiverse-d616','nativeAngerMeleeBonus'\)/);
 assert.match(main,/bonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.match(main,/flatBonus:focusBonus\+nativeAngerBonus\+nativeStanceBonus\+customDamage\.bonus/);
 assert.doesNotMatch(main,/damageMultiplier\s*:\s*baseDamageMultiplier\s*\+\s*nativeAngerBonus/);
});

test('v181: unrecognized powers never invoke Anger handler',async()=>{
 const {actor}=harness();
 assert.equal(await commitNativePowerAfterFocus(actor,weapon,10),null);
 assert.equal(planNativePowerDispatch({name:'Anger',type:'power',system:{powerSet:'Magic'}}).mode,'generic-legacy');
});
