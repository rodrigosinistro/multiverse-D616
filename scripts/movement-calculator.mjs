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
function readOutOfCombatMultiplier(movement, raw) {
  const rawValue = number(raw?.noncom, 5);
  const modifiedValue = number(movement?.noncom, rawValue);
  // Existing AEs multiply the noncom field starting from 5 (e.g. 3, 50).
  // Compare prepared to raw rather than treating the field as final speed.
  if (rawValue <= 0) return 1;
  return Math.max(0, modifiedValue / rawValue);
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
      const powerReference = neutralRunBySize;
      const fromPower = greatestPowerSpeed(powerReference, key, movement.calc, rank, powerReference, actor);
      // Mode powers do not stack with Run powers; use the highest separate result.
      combat = calcCandidates(actor, key, movement.calc).length ? Math.max(ordinary, fromPower) : ordinary;
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
    const multiplier = readOutOfCombatMultiplier(movement, rawMovement[key]);
    movement.noncom = safeSpeed(movement.value * multiplier);
  }

  if (typeof system.reach === 'number' && raw.reach != null) {
    // When the sheet's own size effects are the ONLY reach modifiers, use
    // multiplicative reach instead of v0.1.x's absolute overwrite.
    const otherReachEffect = Array.from(actor?.effects?.contents ?? actor?.effects ?? []).some(e =>
      e?.disabled !== true && !isManagedSizeEffect(e) && changes(e).some(c => c.key === 'system.reach'));
    if (!otherReachEffect) system.reach = size === 'small' ? number(raw.reach) : size === 'big'
      ? safeSpeed(number(raw.reach) * 2)
      : safeSpeed(number(raw.reach) * (SIZE_SPEED[size] ?? 1));
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
