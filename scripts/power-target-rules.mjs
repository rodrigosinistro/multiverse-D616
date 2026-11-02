/** Explicit two-target all-or-nothing rule for both Banging Heads power sets.
 * This only controls whether a damage card may be generated. No roll/HP edits. */
export function mayCreateBangingHeadsDamage(powerName, resolvedTargets = [], hitTargets = []) {
  if (String(powerName ?? '').trim() !== 'Banging Heads') return true;
  // Resolved targets are already deduplicated by token UUID in the GM handler.
  return resolvedTargets.length === 2 && hitTargets.length === 2;
}
