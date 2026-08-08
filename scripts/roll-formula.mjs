/**
 * Build the effective formula used by an Item roll.
 *
 * Item DataModels store the base formula in system.formula. Attack rolls also
 * add the selected actor ability, which is exposed at the top level of the
 * actor's roll data (for example, @agl.value).
 *
 * @param {unknown} baseFormula The formula stored on the Item.
 * @param {unknown} abilityKey The selected ability key.
 * @returns {string} The complete roll formula.
 */
export function buildItemRollFormula(baseFormula, abilityKey) {
  const formula = String(baseFormula ?? "").trim();
  const ability = String(abilityKey ?? "").trim().toLowerCase();

  if (!formula || !/^[a-z][a-z0-9_-]*$/i.test(ability)) return formula;

  const escapedAbility = ability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingReference = new RegExp(
    `@(?:abilities\\.)?${escapedAbility}\\.value\\b`,
    "i"
  );

  if (existingReference.test(formula)) return formula;
  return `${formula} + @${ability}.value`;
}
