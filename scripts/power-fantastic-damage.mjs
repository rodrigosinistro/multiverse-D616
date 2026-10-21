/** D616 v0.2.55 — explicit damage exceptions from the shipped power catalog.
 * These are DAMAGE MULTIPLIERS relative to the unmodified, DR-adjusted normal
 * attack damage, not additions to the character's Damage Multiplier score.
 * Fantastic conditions/other effects remain in their existing engines.
 * Never parse free-text descriptions at runtime: only canonical power names
 * have exceptions. Homebrew powers keep the usual normal / Fantastic rule.
 */
import { calculateD616Damage } from './damage-calculation.js';
import { automationEnabled } from './automation-settings.mjs';
const HALF_TO_FULL = [
  'Dance of Death', 'Orchestra of Overkill', 'Whirling Frenzy',
  'Unstoppable Assault', 'Unrelenting Smash', 'Ground-Shaking Stomp', 'Fast Attacks',
  'Fast Strikes', 'Slow-Motion Shoot-Dodge', 'Weapons Blazing',
  'Spider-Strike', 'Elemental Barrage',
];
// Array entries are [ordinary success, Fantastic success]. The default is
// [1,2]. A 0 below means the power only deals damage on a Fantastic hit.
export const POWER_DAMAGE_FACTORS = Object.freeze({
  'Venom Burst': [0, 0.5],
  'Coiling Crush': [0, 1], // Initial grasp: no damage normally; normal on Fantastic.
  'Headshot': [2, 3],
  'Banging Heads': [1, 1],
  'Leg Sweep': [1, 1],
  'Rico-Shield': [1, 1],
  // Blind/deafen effects deal NO damage on ordinary success; exactly normal damage on Fantastic.
  'Flare': [0, 1],
  'Dazzle': [0, 1],
  'Deafen': [0, 1],
  ...Object.fromEntries(HALF_TO_FULL.map(name=>[name,[0.5,1]])),
});
export const HALF_TO_FULL_POWERS = Object.freeze(HALF_TO_FULL);

export function getPowerDamageFactor(name,{fantastic=false, suppressFantastic=false, enabled=undefined}={}) {
  const canApply=enabled===undefined?automationEnabled('fantasticDamage'):Boolean(enabled);
  const factors=canApply?POWER_DAMAGE_FACTORS[String(name??'').trim()]:null;
  if(factors) return factors[fantastic?1:0];
  return fantastic&&!suppressFantastic?2:1;
}

/** Apply DR once at normal-damage stage, then power-specific factor.
 * Preserve both rawDamage (for barriers) and DR-adjusted damage (for target).
 * Half damage rounds up, matching the existing Narrator 1/2 DANO button.
 */
export function calculatePowerDamage({powerName, fantastic=false,suppressFantastic=false,enabled=undefined,
  marvelDie,damageMultiplier,damageReduction=0,ability=0,bonus=0}={}) {
  const factor=getPowerDamageFactor(powerName,{fantastic,suppressFantastic,enabled});
  const params={marvelDie,damageMultiplier,damageReduction,ability,bonus,fantastic:false};
  const normal=calculateD616Damage(params);
  const raw=calculateD616Damage({...params,damageReduction:0});
  return {
    ...normal,
    damage: Math.ceil(normal.damage*factor),
    rawDamage: Math.ceil(raw.damage*factor),
    powerDamageFactor:factor,
    specialDamage:(enabled===undefined?automationEnabled('fantasticDamage'):Boolean(enabled)) &&
      Object.hasOwn(POWER_DAMAGE_FACTORS,String(powerName??'').trim()),
  };
}
