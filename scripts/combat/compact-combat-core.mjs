/** Presentation-only helpers. The authoritative counters live on Combatant flags. */
export function availableTurnIcons(state, resource) {
  const max = Math.max(0, Math.floor(Number(state?.[`${resource}Max`]) || 0));
  const used = Math.max(0, Math.floor(Number(state?.[`${resource}Used`]) || 0));
  return Math.min(12, Math.max(0, max - used));
}

/** Each arrow represents 25% of total movement, with partial fill preserved. */
export function movementArrowFill(state) {
  const maximum = Number(state?.movementMax);
  if (!Number.isFinite(maximum) || maximum <= 0) return [0, 0, 0, 0];
  const spent = Math.max(0, Number(state?.movementUsed) || 0);
  const remaining = Math.max(0, Math.min(1, (maximum - spent) / maximum));
  const quarterUnits = remaining * 4;
  return Array.from({length: 4}, (_, index) =>
    Math.min(1, Math.max(0, quarterUnits - index)));
}

export function combatantsInInitiativeOrder(combat, isGM = false) {
  if (!combat) return [];
  const turns = Array.isArray(combat.turns) ? combat.turns : [];
  const all = turns.length ? turns : Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []);
  return all.filter(combatant => isGM || (!combatant.hidden && combatant.visible !== false));
}

export function canDisplayCombatToken(combat, token, isGM = false) {
  if (!combat?.started || !token?.document || !token.visible) return false;
  if (combat.scene?.id && token.document.parent?.id !== combat.scene.id) return false;
  if (!isGM && token.document.hidden) return false;
  return true;
}
