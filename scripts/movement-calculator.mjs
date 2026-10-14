/**
 * Multiverse D616 v0.2.0 — single movement calculation pipeline for PCs and NPCs.
 * Receives a prepared DataModel (AE changes have already been applied) and the Actor.
 * No DOM/Foundry APIs are used here, so rule cases can be regression-tested in Node.
 */
export const SIZE_SPEED = Object.freeze({
  microscopic: 0, miniature: 0, tiny: 0, little: 0.25,
  small: -1, average: 1, big: 1, huge: 5,
  gigantic: 20, titanic: 80, gargantuan: 320
});

const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const safeSpeed = (v) => Math.max(0, Math.floor(number(v)));
const asSize = (size) => String(size ?? 'average').trim().toLowerCase();
const normalize = (name) => String(name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const SIZE_EFFECT_NAMES = new Set(Object.keys(SIZE_SPEED).map((name) => `${name} effects`));
const SIZE_TRAITS = new Set(['unusualsize', 'tamanho incomum', 'tamanhoincomum']);

export function isManagedSizeEffect(effect) {
  const flags = effect?.flags?.['multiverse-d616'];
  if (flags?.managedSize === true) return true;
  const sizeChange = (effect?.system?.changes ?? effect?.changes ?? [])
    .find(change => change.key === 'system.size' && Object.hasOwn(SIZE_SPEED, asSize(change.value)));
  return !!sizeChange && SIZE_EFFECT_NAMES.has(String(effect?.name ?? '').trim().toLowerCase());
}

function sizeChanges(actor) {
  const effects = Array.from(actor?.effects?.contents ?? actor?.effects ?? []);
  return effects.filter(effect => effect?.disabled !== true && (
    isManagedSizeEffect(effect) || changes(effect).some(c => c.key === 'system.size') &&
    changes(effect).some(c => c.key === 'system.movement.run.value')
  ));
}
function changes(effect) { return effect?.system?.changes ?? effect?.changes ?? []; }
function applyCalc(base, calc, rank, runReference) {
  switch (String(calc ?? '').toLowerCase()) {
    case 'half': return safeSpeed(Math.ceil(base / 2));
    case 'double': return safeSpeed(base * 2);
    case 'triple': return safeSpeed(base * 3);
    case 'rank': return safeSpeed((base || 1) * rank);
    case 'runspeed': return safeSpeed(runReference);
    case 'run-double': return safeSpeed(runReference * 2);
    case 'rank-swim': return safeSpeed(base * rank);
    case 'double-climb': return safeSpeed(base * 2);
    default: return safeSpeed(base);
  }
}

/** Read independent movement-power formulas; choose the greatest result, not
 * the last Active Effect override. Every candidate receives the SAME base. */
function calcCandidates(actor, movementKey, currentCalc) {
  const key = `system.movement.${movementKey}.calc`;
  const candidate = [];
  if (currentCalc) candidate.push(currentCalc);
  const from = [
    ...Array.from(actor?.effects?.contents ?? actor?.effects ?? []),
    ...Array.from(actor?.items?.contents ?? actor?.items ?? [])
      .flatMap(item => Array.from(item?.effects?.contents ?? item?.effects ?? [])
        .filter(effect => effect.transfer !== false))
  ];
  for (const effect of from) {
    if (effect?.disabled === true) continue;
    for (const change of changes(effect)) {
      if (change.key === key && change.value != null) candidate.push(String(change.value));
    }
  }
  return [...new Set(candidate)];
}
function greatestPowerSpeed(base, key, calc, rank, runReference, actor) {
  const candidates = calcCandidates(actor, key, calc);
  return candidates.length
    ? Math.max(...candidates.map(candidate => applyCalc(base, candidate, rank, runReference)))
    : safeSpeed(base);
}
function undoLegacySizeSpeed(preparedRun, effects, rawRun) {
  let restored = preparedRun;
  // Effects with the old explicit run change remain in saved actors from v0.1.x.
  // Reverse ONLY managed size changes; all other AE changes remain intact.
  const oldChanges = effects.flatMap(e => changes(e).filter(c => c.key === 'system.movement.run.value'));
  for (const change of oldChanges.reverse()) {
    const v = number(change.value);
    const type = String(change.type ?? '').toLowerCase();
    const mode = Number(change.mode);
    if (type === 'multiply' || mode === 1) restored = v === 0 ? rawRun : restored / v;
    else if (type === 'add' || mode === 2) restored -= v;
    else if (type === 'override' || mode === 5) restored = rawRun;
  }
  return Math.max(0, restored);
}
function getRunBonus(actor, rawRun, agility) {
  const bonus = Math.max(0, Math.floor(number(agility) / 5));
  // Some old imported/manual sheets stored the already-calculated ordinary Run.
  // Do not add the same agility point a second time for those legacy actors.
  const legacyIncluded = bonus > 0 && rawRun === (5 + bonus);
  return { bonus: legacyIncluded ? 0 : bonus, legacyIncluded };
}
function sizeRun(base, size) {
  if (size === 'small') return safeSpeed(base - 1);
  if (size === 'big') return safeSpeed(base + 1);
  return safeSpeed(base * (SIZE_SPEED[size] ?? 1));
}
function hasUnusualSize(actor) {
  return Array.from(actor?.items?.contents ?? actor?.items ?? []).some(item =>
    item?.type === 'trait' &&
    (SIZE_TRAITS.has(normalize(item?.name)) || item?.flags?.['multiverse-d616']?.traitId === 'unusual-size')
  );
}
function combatFlightBase(base, naturalSize, unusual) {
  if (!unusual) return base;
  if (['little','tiny','miniature','microscopic'].includes(naturalSize)) return safeSpeed(base - 1);
  if (['huge','gigantic','titanic','gargantuan'].includes(naturalSize)) return safeSpeed(base + 1);
  return sizeRun(base, naturalSize);
}
/** Pick the strongest out-of-combat speed effect instead of multiplying
 * Flight 1 × Flight 2 or Speed Run 1 × Speed Run 2.
 *
 * New v14 powers UPGRADE noncomFactor (base 1). Existing saved characters
 * might still have legacy AEs that MULTIPLY the old noncom field (base 5).
 * Discover those legacy multipliers without trusting their cumulative product.
 */
function readOutOfCombatMultiplier(movement, raw, actor, movementKey) {
  const declared = number(movement?.noncomFactor, 1);
  const legacyKey = `system.movement.${movementKey}.noncom`;
  const oldFactors = [];
  const effects = [
    ...Array.from(actor?.effects?.contents ?? actor?.effects ?? []),
    ...Array.from(actor?.items?.contents ?? actor?.items ?? [])
      .flatMap(item => Array.from(item?.effects?.contents ?? item?.effects ?? [])
        .filter(effect => effect.transfer !== false))
  ];
  for (const effect of effects) {
    if (effect?.disabled === true) continue;
    for (const change of changes(effect)) {
      if (change.key !== legacyKey) continue;
      const mode = String(change.type ?? '').toLowerCase();
      if (mode !== 'multiply' && Number(change.mode) !== 1) continue;
      const factor = number(change.value);
      if (factor > 0) oldFactors.push(factor);
    }
  }
  const maxPowerFactor = Math.max(1, declared, ...oldFactors);
  if (maxPowerFactor > 1) return maxPowerFactor;
  // Preserve manually configured, non-power movement bonuses and old sheets
  // when no recognized multiplier is present.
  const rawValue = number(raw?.noncom, 5);
  const modifiedValue = number(movement?.noncom, rawValue);
  return rawValue > 0 ? Math.max(0, modifiedValue / rawValue) : 1;
}

export function prepareD616Movement(system, actor, labels = {}) {
  if (!system?.movement?.run) return;
  const raw = actor?._source?.system ?? actor?.system?._source ?? {};
  const rawMovement = raw.movement ?? {};
  const size = asSize(system.size);
  const initialNaturalSize = asSize(raw.size ?? system.size);
  const rank = number(system.attributes?.rank?.value, 1);
  const agility = number(system.abilities?.agl?.value, 0);
  const rawRun = number(rawMovement.run?.value, 5);
  const managedEffects = sizeChanges(actor);
  // Imported old sheets sometimes stored Average as the raw size while
  // keeping their permanent Unusual Size in a managed Huge Effects AE.
  const savedManagedSize = managedEffects
    .filter(isManagedSizeEffect)
    .flatMap(e => changes(e))
    .find(c => c.key === 'system.size');
  const naturalSize = initialNaturalSize === 'average' && savedManagedSize
    ? asSize(savedManagedSize.value) : initialNaturalSize;
  const preparedRun = number(system.movement.run.value, rawRun);
  const restoredRun = undoLegacySizeSpeed(preparedRun, managedEffects, rawRun);
  const agilityBonus = getRunBonus(actor, rawRun, agility);
  const regularRun = safeSpeed(restoredRun + agilityBonus.bonus);
  const unusual = hasUnusualSize(actor);
  const flightReference = combatFlightBase(regularRun, naturalSize, unusual);

  // Power-based changes to Run never modify the reference used by another
  // power (Flight/Jump/etc). The highest individual power result wins.
  const neutralRunBySize = sizeRun(regularRun, size);
  const runFromPower = greatestPowerSpeed(neutralRunBySize, 'run', system.movement.run.calc, rank, neutralRunBySize, actor);
  const finalRun = runFromPower;
  const otherRunEffects = restoredRun !== rawRun;

  // When a power changes Run, its output must not be multiplied into a second
  // speed power. Basic Climb/Jump/Swim, however, inherit the actual final Run.
  for (const [key, movement] of Object.entries(system.movement)) {
    movement.label = labels[key] ?? movement.label ?? key;
    const original = number(movement.value, 5);
    let combat;
    if (key === 'run') combat = finalRun;
    else if (['climb','jump','swim'].includes(key)) {
      const ordinary = Math.ceil(finalRun / 2);
      // Power-based adjustments are evaluated against each mode's NORMAL speed,
      // independently of any Speed Run / Stilt Steps change to Run. A Jump
      // power explicitly uses normal Run, while Speed Swim and Stilt Steps'
      // Climb modifier use normal Swim/Climb (half the unchanged regular Run).
      const normalMode = Math.ceil(neutralRunBySize / 2);
      const formulas = calcCandidates(actor, key, movement.calc);
      const candidateSpeed = (formula) => {
        const f = String(formula).toLowerCase();
        if (f === 'rank-swim' && key === 'swim') return safeSpeed(normalMode * rank);
        if (f === 'double-climb' && key === 'climb') return safeSpeed(normalMode * 2);
        return applyCalc(neutralRunBySize, formula, rank, neutralRunBySize);
      };
      // Each power competes independently with the inherited basic speed.
      combat = formulas.length ? Math.max(ordinary, ...formulas.map(candidateSpeed)) : ordinary;
    } else if (key === 'flight') {
      // Flight size exception (Marvel 2024 FAQ, p.3) and Unusual Size natural size.
      combat = greatestPowerSpeed(flightReference, key, movement.calc, rank, flightReference, actor);
      // A manually set Flight base (without a power calculation) is preserved.
      if (!calcCandidates(actor, key, movement.calc).length) combat = safeSpeed(original);
    } else {
      // Other modes (Glide, Swingline, Levitation) keep their own base speed
      // and modifiers. Size multiplies these non-flight speeds.
      const regular = sizeRun(original, size);
      combat = greatestPowerSpeed(regular, key, movement.calc, rank, neutralRunBySize, actor);
    }
    movement.value = safeSpeed(combat);
    const multiplier = readOutOfCombatMultiplier(movement, rawMovement[key], actor, key);
    movement.noncom = safeSpeed(movement.value * multiplier);
  }

  if (typeof system.reach === 'number' && raw.reach != null) {
    // Extended Reach 1/2 are different levels of the same power: x4 or x10,
    // NEVER x40. Compute from the raw reach, after size, independent of AE order.
    // Legacy-owned MULTIPLY reach AEs are read by name until migrated.
    const ownItems = Array.from(actor?.items?.contents ?? actor?.items ?? []);
    const actorEffects = Array.from(actor?.effects?.contents ?? actor?.effects ?? []);
    const activeItemEffects = ownItems.flatMap(item =>
      Array.from(item?.effects?.contents ?? item?.effects ?? [])
        .filter(e => e?.disabled !== true && e?.transfer !== false).map(e => ({e, item})));
    const allEffects = [
      ...actorEffects.filter(e => e?.disabled !== true).map(e => ({e, item:null})),
      ...activeItemEffects,
    ];
    const extenderFactor = Math.max(1, number(system.reachFactor, 1),
      ...allEffects.flatMap(({e, item}) => {
        const sourceName = String(item?.name ?? e?.name ?? '');
        const isExtendedReach = /^(Extended Reach [12]|Reach x(?:4|10))$/.test(sourceName);
        if (!isExtendedReach) return [];
        return changes(e).filter(c => c.key === 'system.reachFactor' ||
          (c.key === 'system.reach' && (c.type === 'multiply' || Number(c.mode) === 1)))
          .map(c => number(c.value, 1)).filter(f => f === 4 || f === 10);
      }));
    const otherReachEffect = allEffects.some(({e, item}) =>
      !isManagedSizeEffect(e) &&
      !(item?.system?.powerSet === 'Plasticity' && /^Extended Reach [12]$/.test(String(item.name))) &&
      !/^Reach x(?:4|10)$/.test(String(e.name)) &&
      changes(e).some(c => c.key === 'system.reach'));
    // AE-prepared reach already includes non-power effects. When only
    // Extended Reach/size are changing reach, ignore their prepared product.
    const base = number(raw.reach);
    const resized = size === 'small' ? base : size === 'big' ? base * 2 : base * (SIZE_SPEED[size] ?? 1);
    const hasLegacyReach = allEffects.some(({e,item}) =>
      (item?.system?.powerSet === 'Plasticity' && /^Extended Reach [12]$/.test(String(item.name)) ||
        /^Reach x(?:4|10)$/.test(String(e.name))) &&
      changes(e).some(c=>c.key==='system.reach'));
    const baseReach = otherReachEffect && !hasLegacyReach ? number(system.reach) : resized;
    system.reach = safeSpeed(baseReach * extenderFactor);
  }

  // Presentation data only; no new persisted Actor fields or migration required.
  system._movementBreakdown = {
    base: rawRun, agility: agilityBonus.legacyIncluded ? Math.floor(Math.max(0, agility) / 5) : agilityBonus.bonus,
    storedAgilityIncluded: agilityBonus.legacyIncluded,
    regular: regularRun, size, naturalSize, unusual,
    flightReference, effectiveRun: finalRun, runPower: String(system.movement.run.calc || ''),
    legacySizeEffect: managedEffects.some(e => changes(e).some(c => c.key === 'system.movement.run.value')),
    otherRunEffects,
  };
}
