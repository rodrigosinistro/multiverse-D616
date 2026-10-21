/**
 * Multiverse-D616: resource maximums derived from owned traits.
 * The actor's item collection is authoritative; embedded grants nested inside
 * an Occupation/Origin are not counted again if the trait is already owned.
 */
function canonicalName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function hasCombatReflexes(actor) {
  const items = actor?.items;
  if (!items) return false;
  const iterable = typeof items.values === "function" ? items.values() : items;
  return Array.from(iterable ?? []).some((item) =>
    item?.type === "trait" &&
    ["combat reflexes", "reflexos de combate"].includes(canonicalName(item?.name))
  );
}

/** Combat Reflexes grants one additional Reaction each round. */
export function actorReactionMaximum(actor) {
  return hasCombatReflexes(actor) ? 2 : 1;
}

/**
 * Use the live maximum even when an old Combatant flag had cached a different
 * maximum. This fixes existing actors without a destructive data migration.
 */
export function resolveTurnResourceState(state, actor) {
  return { ...state, reactionMax: actorReactionMaximum(actor) };
}
