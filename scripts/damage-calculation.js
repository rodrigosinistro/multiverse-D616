/**
 * Calculate D616 damage using the effective Damage Multiplier after Damage
 * Reduction. The multiplier and final damage never become negative, and a
 * Fantastic result only doubles positive damage.
 *
 * @param {object} data
 * @param {number} data.marvelDie
 * @param {number} data.damageMultiplier
 * @param {number} [data.damageReduction=0]
 * @param {number} [data.ability=0]
 * @param {number} [data.bonus=0]
 * @param {boolean} [data.fantastic=false]
 * @returns {{
 *   damage: number,
 *   damageReduction: number,
 *   effectiveDamageMultiplier: number
 * }}
 */
export function calculateD616Damage({
  marvelDie,
  damageMultiplier,
  damageReduction = 0,
  ability = 0,
  bonus = 0,
  fantastic = false,
}) {
  const die = Number(marvelDie) || 0;
  const multiplier = Number(damageMultiplier) || 0;
  const reduction = Math.abs(Number(damageReduction) || 0);
  const abilityValue = Number(ability) || 0;
  const bonusValue = Number(bonus) || 0;
  const effectiveDamageMultiplier = Math.max(
    multiplier - reduction,
    0
  );

  let damage =
    effectiveDamageMultiplier > 0
      ? die * effectiveDamageMultiplier + abilityValue + bonusValue
      : 0;
  damage = Math.max(0, damage);
  if (fantastic && damage > 0) damage *= 2;

  return {
    damage,
    damageReduction: reduction,
    effectiveDamageMultiplier,
  };
}
