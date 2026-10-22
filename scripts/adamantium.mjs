/**
 * Adamantium — weapon-scoped piercing of HEALTH Damage Reduction (D616 v0.2.70).
 *
 * The Active Effect is embedded in the Weapon Item, not the target Actor.
 * Its change is a metadata key: Foundry must NOT transfer it to the bearer.
 * The source attack card snapshots the amount so a different equipped weapon,
 * an old card or an effect toggled after the roll cannot gain piercing.
 */
export const ADAMANTIUM_CHANGE_KEY = 'flags.multiverse-d616.adamantiumHealthDrIgnore';

function changesOf(effect) {
  const modern = effect?.system?.changes;
  return Array.isArray(modern) ? modern : (Array.isArray(effect?.changes) ? effect.changes : []);
}

function nonnegativeInteger(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
}

export function hasAdamantiumEffect(weapon) {
  if (weapon?.type !== 'weapon') return false;
  return Array.from(weapon.effects ?? []).some(effect =>
    changesOf(effect).some(change => change?.key === ADAMANTIUM_CHANGE_KEY)
  );
}

/** Highest active Adamantium rating on THIS weapon only; never stacks duplicates. */
export function weaponAdamantiumValue(weapon) {
  if (weapon?.type !== 'weapon' || !weapon?.system?.equipped) return 0;
  let max = 0;
  for (const effect of Array.from(weapon.effects ?? [])) {
    if (effect?.disabled || effect?.isSuppressed) continue;
    for (const change of changesOf(effect)) {
      if (change?.key !== ADAMANTIUM_CHANGE_KEY) continue;
      max = Math.max(max, nonnegativeInteger(change?.value));
    }
  }
  return max;
}

/** Create the exact V14 typed change; editing its Value adjusts piercing. */
export function adamantiumEffectData(weapon) {
  return {
    name: 'Adamantium',
    img: 'icons/svg/sword.svg',
    origin: weapon?.uuid,
    disabled: false,
    transfer: false,
    type: 'base',
    // Null is the documented indefinite duration for Foundry v14.
    // Explicit native v14 fields prevent malformed v13-style durations.
    duration: { value: null, units: 'seconds', expiry: null, expired: false },
    system: { changes: [{
      key: ADAMANTIUM_CHANGE_KEY,
      type: 'add',
      value: 1,
      phase: 'initial',
      priority: null,
    }] },
  };
}

/** Effective RD against a saved attack. Zero and Focus attacks do not pierce. */
export function applyAdamantiumToHealthDr(originalDr, savedRating, damageType, itemType) {
  const rd = Math.max(0, Number(originalDr) || 0);
  const rating = damageType === 'health' && itemType === 'weapon'
    ? nonnegativeInteger(savedRating) : 0;
  const ignored = Math.min(rd, rating);
  return { originalDr: rd, ignored, effectiveDr: rd - ignored };
}
