/** Resolve a combat by its explicit ID without falling back to an unrelated encounter. */
export function findCombatById(combats, activeCombat, combatId) {
  if (combatId == null || combatId === "") return activeCombat ?? null;
  return combats?.get?.(combatId) ??
    (activeCombat?.id === combatId ? activeCombat : null);
}
