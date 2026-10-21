/**
 * Multiverse-D616 0.2.10: explicit, conservative mappings of powers which
 * describe action checks but had no roll metadata.  No prose scraping is
 * performed at runtime: optional checks and non-damaging checks are kept
 * separate from attacks which deal damage.
 *
 * DataModel fields on Items override these defaults, so homebrew items
 * remain configurable from their sheets.
 */
const POWER_ROLLS = Object.freeze({
  // Regular action checks against another character's defense.
  'Detect Lie': { ability: 'ego', attackTarget: 'ego', checkOnly: true },
  'Disrupt Nerves': { ability: 'ego', attackTarget: 'res', checkOnly: true },
  'Elemental Grab': { ability: 'ego', attackTarget: 'mle', checkOnly: true },
  'Telekinetic Grab': { ability: 'log', attackTarget: 'mle', checkOnly: true },
  'Webgrabbing': { ability: 'agl', attackTarget: 'agl', checkOnly: true },
  'Crimson Bands of Cyttorak': { ability: 'ego', attackTarget: 'mle', checkOnly: true, edgeMode:'edge' },
  'Elemental Barrier': { ability: 'agl', attackTarget: 'agl', checkOnly: true },
  'Telekinetic Barrier': { ability: 'log', attackTarget: 'agl', checkOnly: true },
  'Telekinetic Sphere': { ability: 'log', attackTarget: 'agl', checkOnly: true, fantasticDamage: true },
  // v0.2.15 — different on-hit/damage semantics for the four advanced powers.
  'Elemental Prison': { ability: 'ego', attackTarget: 'agl', checkOnly: true, fantasticDamage: true },
  'Elemental Sphere': { ability: 'ego', attackTarget: 'agl', checkOnly: true, fantasticDamage: true },
  'Elemental Suffocation': { ability: 'ego', attackTarget: 'res', attack: true },
  'Elemental Push': { ability: 'ego', attackTarget: 'agl', checkOnly: true, fantasticDamage: true },
  'Command': { ability: 'log', attackTarget: 'log', checkOnly: true },
  'Shut Down Powers': { ability: 'ego', attackTarget: 'ego', checkOnly: true },
  'Jinx You': { ability: 'mle', attackTarget: 'mle', checkOnly: true, fantasticDamage: true },
  // Other-side resistance, only when the target resists or the narrative
  // circumstances require a check.  The player can still activate normally.
  'Swap Items': { ability: 'ego', attackTarget: 'vig', checkOnly: true, optional: true },
  'Swap Places': { ability: 'ego', attackTarget: 'vig', checkOnly: true, optional: true },
  'Sense Supernatural': { ability: 'ego', attackTarget: 'vig', checkOnly: true, optional: true },
  'Winds of Watoomb': { ability: 'ego', attackTarget: 'ego', checkOnly: true, optional: true },
  'Machine Telepathy': { ability: 'log', checkOnly: true, optional: true },
  'Telespot': { ability: 'agl', attackTarget: 'agl', checkOnly: true, optional: true },
  'Images of Ikonn': { ability: 'ego', checkOnly: true, optional: true },
  // Fixed target numbers: these are action checks, never damage rolls.
  'Understand Code': { ability: 'log', targetNumber: 13, checkOnly: true },
  'Understand Body Language': { ability: 'log', targetNumber: 13, checkOnly: true },
  'Understand Unusual Communication': { ability: 'log', targetNumber: 13, checkOnly: true },
  'Understand Sign Language': { ability: 'log', checkOnly: true }, // source has a missing TN
  'Cure-All': { ability: 'ego', targetNumber: 12, checkOnly: true },
  'Restore': { ability: 'ego', targetNumber: 20, checkOnly: true },
  'Resurrect': { ability: 'ego', checkOnly: true }, // variable TN: 10 + hours dead
  'Protection Hex': { ability: 'ego', checkOnly: true }, // result becomes a defense
  // Damaging attacks whose source catalog accidentally omitted the dice info.
  // v0.2.64: legacy catalog incorrectly marks Elemental Ricochet as nonattack.
  'Elemental Ricochet': { ability: 'agl', attackTarget: 'agl', attack: true, damageType:'health' },
  'Razorwebs': { ability: 'agl', attackTarget: 'agl', attack: true },
  'Wisecracker': { ability: 'ego', attackTarget: 'ego', attack: true, damageType: 'focus' },
  'Hellfire Chains': { ability: 'ego', attackTarget: 'ego', attack: true },
  // v0.2.62: source is Ego vs Agility Health attack; legacy item says attack:false.
  'Flames of the Faltine': { ability: 'ego', attackTarget: 'agl', attack: true, damageType:'health' },
  'Corrupting Touch': { ability: 'mle', attackTarget: 'mle', attack: true },
  // v0.2.47 — these catalog entries describe damaging attacks but the
  // imported legacy data incorrectly sets attack:false or omits damageType.
  // Runtime mapping repairs the attack workflow without rewriting compendiums
  // or any Actor's customized Item.
  'Headshot': { ability: 'agl', attackTarget: 'agl', attack: true, damageType:'health' },
  'Double Tap': { ability: 'agl', attackTarget: 'agl', attack: true, damageType:'health' },
  'Penance Stare': { ability: 'ego', attackTarget: 'ego', attack: true, damageType:'focus' },
  'Elemental Barrage': { ability: 'ego', attackTarget: 'res', attack: true, damageType:'health' },
  // v0.2.57 — these three attacks are Focus damage AFTER the target's
  // Health DR.  Their imported data is inconsistent (Suppressive Fire says
  // Health; Covering/Return Fire were imported as nonattacks). Explicitly
  // repair just these legacy shapes, never arbitrary power descriptions.
  'Suppressive Fire': { ability: 'agl', attackTarget: 'vig', attack: true, damageType:'focus' },
  'Covering Fire': { ability: 'agl', attackTarget: 'vig', attack: true, damageType:'focus' },
  'Return Fire': { ability: 'agl', attackTarget: 'vig', attack: true, damageType:'focus' },
  // Already rolls in older copies but is a non-damaging opposed test.
  'Domination': { ability: 'log', attackTarget: 'log', checkOnly: true, edgeMode: 'trouble' },
  'Flare': { ability: 'ego', attackTarget: 'vig', checkOnly: true, fantasticDamage: true },
  // Legacy Deafen has attack:false; only the Fantastic causes regular damage.
  'Deafen': { ability: 'ego', attackTarget: 'vig', checkOnly: true, fantasticDamage: true },
  'Dazzle': { ability: 'ego', attackTarget: 'vig', checkOnly: true, fantasticDamage: true },
  'Edit Memory': { ability: 'log', attackTarget: 'log', checkOnly: true },
  'Memory Blip': { ability: 'log', attackTarget: 'log', checkOnly: true },
  'Orders': { ability: 'log', attackTarget: 'log', checkOnly: true },
});

export const POWER_ROLL_RULES = POWER_ROLLS;
const ABILITIES = new Set(['mle', 'agl', 'res', 'vig', 'ego', 'log']);
export function normalizeRollAbility(value) {
  const source = String(value ?? '').trim().toLowerCase();
  const aliases = { melee:'mle', agility:'agl', resilience:'res', vigilance:'vig', logic:'log' };
  const key = aliases[source] ?? source;
  return ABILITIES.has(key) ? key : null;
}

export function resolvePowerRoll(item) {
  const data = item?.system ?? {};
  const isPower = item?.type === 'power';
  const mapped = isPower ? POWER_ROLLS[String(item?.name ?? '').trim()] : null;
  // Some old Crimson Bands entries mistakenly use Logic vs Logic instead of
  // Ego vs Melee. Correct only that known legacy combination, while leaving
  // manually customized values under the Narrator's control.
  const legacyCrimson=isPower && item.name==='Crimson Bands of Cyttorak' &&
    normalizeRollAbility(data.ability)==='log' && normalizeRollAbility(data.attackTarget)==='log';
  const ability = legacyCrimson ? 'ego' : normalizeRollAbility(data.ability) ?? normalizeRollAbility(mapped?.ability);
  // Covering Fire was shipped with an incorrect Agility defense; its
  // actual source rule is Agility vs Vigilance. Leave a custom defense in
  // an edited Actor Item untouched unless it matches the broken default.
  const legacyCover=isPower && item.name==='Covering Fire' &&
    normalizeRollAbility(data.attackTarget)==='agl';
  const attackTarget = legacyCrimson ? 'mle' : legacyCover ? 'vig' :
    normalizeRollAbility(data.attackTarget) ?? normalizeRollAbility(mapped?.attackTarget);
  const targetNumber = Math.max(0, Number(data.rollTargetNumber ?? mapped?.targetNumber ?? 0) || 0);
  const checkOnly = isPower && (Boolean(data.powerCheck) || Boolean(mapped?.checkOnly));
  const attack = Boolean(mapped?.attack || data.attack) && !checkOnly;
  // The source says the effects deal Focus damage after applying Health DR.
  // In particular, the legacy Suppressive Fire document incorrectly says
  // damageType=health. A homebrew/edited explicit type is respected unless
  // it is the exact imported legacy value on that canonical power.
  const focusCover=isPower && ['Suppressive Fire','Covering Fire','Return Fire'].includes(String(item?.name??'').trim());
  const legacyFocusType=focusCover && (!data.damageType ||
    (item.name==='Suppressive Fire' && String(data.damageType).trim().toLowerCase()==='health'));
  return {
    ability, attackTarget, targetNumber,
    checkOnly, attack, optional: Boolean(mapped?.optional), fantasticDamage: Boolean(mapped?.fantasticDamage),
    damageType: legacyFocusType ? 'focus' : (data.damageType || mapped?.damageType || ''),
    edgeMode: String((legacyCrimson ? mapped?.edgeMode : data.attackEdgeMode) || mapped?.edgeMode || '').trim().toLowerCase(),
    canRoll: Boolean(ability),
  };
}

/** No Marvel-die natural 1 alone is an automatic hit. */
export function checkPowerOutcome(total, target, { fantastic = false, ultimate = false } = {}) {
  const tn = Number(target);
  if (!Number.isFinite(tn) || tn <= 0) return null;
  const success = (Number(total) >= tn) || Boolean(ultimate);
  return {
    success,
    fantastic: Boolean(fantastic),
    label: success ? (fantastic ? 'SUCESSO FANTÁSTICO' : 'SUCESSO')
      : (fantastic ? 'FALHA FANTÁSTICA' : 'FALHA'),
  };
}

/** Only a real, natural 6-M-6 is an automatic Ultimate Fantastic success. */
export function hasNaturalUltimateFantastic(roll, fantastic) {
  if (!fantastic || roll?.options?.ultimateFantasticApplied || roll?.options?.forceMarvelM || roll?.options?.combatTrickery) return false;
  const dice = roll?.dice ?? [];
  const face = d => {
    const active = d?.results?.find(r => r.active && !r.discarded) ?? d?.results?.[0];
    return Number(active?.result ?? d?.result);
  };
  return dice.length >= 3 && face(dice[0]) === 6 && face(dice[2]) === 6;
}

/** Focus after Health DR for the three covering-fire attacks.
 * Default Focus attacks keep Focus DR; ordinary Health attacks keep Health DR.
 */
export function powerDamageReductionCategory(powerName, damageType) {
  const name=String(powerName??'').trim();
  if(['Suppressive Fire','Covering Fire','Return Fire'].includes(name) &&
      String(damageType??'').trim().toLowerCase()==='focus')return 'health';
  return String(damageType??'').trim().toLowerCase()==='focus'?'focus':'health';
}
