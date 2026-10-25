export const TURN_TRACKER_RESOURCES = Object.freeze([
  "action",
  "reaction",
  "movement",
]);

export function normalizeActionText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mentionedResources(actionText) {
  const text = normalizeActionText(actionText);
  const resources = [];

  if (/\bstandard\b|\bstandart\b|\bacao padrao\b|\bpadrao\b/.test(text)) resources.push("action");
  if (/\breaction\b|\breacao\b/.test(text)) resources.push("reaction");
  if (/\bmovement\b|\bmovimento\b/.test(text)) resources.push("movement");

  return TURN_TRACKER_RESOURCES.filter((resource) =>
    resources.includes(resource)
  );
}

/**
 * Interpret the Action field used by the system's Powers.
 *
 * @returns {{
 *   kind: "none"|"single"|"choice"|"combined",
 *   resources: string[],
 *   source: string
 * }}
 */
export function classifyItemAction(item) {
  if (item?.type === "weapon") {
    return { kind: "single", resources: ["action"], source: "weapon" };
  }

  if (item?.type !== "power") {
    return { kind: "none", resources: [], source: "" };
  }

  const source = normalizeActionText(
    item?.system?.action?.value ?? item?.system?.action ?? ""
  );
  if (!source || source === "permanent" || source === "passive") {
    return { kind: "none", resources: [], source };
  }

  const resources = mentionedResources(source);
  if (!resources.length) return { kind: "none", resources: [], source };
  if (resources.length === 1) {
    return { kind: "single", resources, source };
  }

  const explicitlyCombined =
    /\bboth\b/.test(source) ||
    /\bstandard\s+and\s+movement\b/.test(source) ||
    /\bstandard\s+e\s+movimento\b/.test(source);

  return {
    kind: explicitlyCombined ? "combined" : "choice",
    resources,
    source,
  };
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : fallback;
}

export function actorMovementMaximum(actor) {
  return finiteNonNegative(actor?.system?.movement?.run?.value, 5);
}


/** Resolve the actual character Rank from Foundry v14 D616 actor sheets.
 * Actor.system.attributes.rank.value is canonical; legacy sheet shapes are
 * tolerated so older saved characters and virtual equipment powers work.
 */
export function actorRankForMovement(actor) {
  const data = actor?.system;
  for (const raw of [data?.attributes?.rank?.value, data?.attributes?.rank,
    data?.rank?.value, data?.rank]) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/** One-shot movement allowance from a self-targeting teleport power. */
export function teleportPowerGrant(item) {
  if (item?.type !== 'power') return null;
  const name = String(item?.name ?? '').trim();
  const lower = normalizeActionText(name);
  const rank = actorRankForMovement(item?.actor);
  if (!rank) return null;
  if (/^teleport(?:e)?\s*[12]$/.test(lower) || /^teleport blind$/.test(lower))
    return {powerName:name, maximum:10*rank};
  if (lower === 'blink' || lower === 'piscar')
    return {powerName:name, maximum:rank};
  return null;
}

/** Text decision for a movement preview; the actual spend is authoritative on
 * the GM and happens only after the player releases the token. */
export function movementPreviewNotice(state, movementMax, proposal) {
  const maximum = Number(movementMax) || 0;
  const nextDistance = (Number(state?.movementUsed)||0)+(Number(proposal)||0);
  if (!(maximum > 0) || nextDistance <= maximum+1e-6) return null;
  const usingExtra = !!state?.movementExtraActionUsed;
  const actionAvailable = (Number(state?.actionUsed)||0) < (Number(state?.actionMax)||1);
  if (!usingExtra && actionAvailable && nextDistance <= maximum*2+1e-6)
    return {kind:'action', text:'Esse Movimento usará também sua Ação Padrão.'};
  if (nextDistance > maximum*(usingExtra || actionAvailable ? 2 : 1)+1e-6)
    return {kind:'exceeded',text:'Movimento acima do limite disponível.'};
  if (!usingExtra && !actionAvailable)
    return {kind:'exceeded',text:'Ação Padrão indisponível para movimento adicional.'};
  return null;
}

/** Foundry v14 TokenDocument.movementAction -> D616 combat movement speed.
 * Distances here are grid spaces (combat .value), NEVER out-of-combat .noncom.
 * "Teleport (Blink)" is not regular movement and must not grant free range.
 */
export const MOVEMENT_ACTION_TO_D616 = Object.freeze({
  walk: 'run', run: 'run', walking: 'run', land: 'run',
  fly: 'flight', flying: 'flight', flight: 'flight', voo: 'flight',
  swim: 'swim', swimming: 'swim', natacao: 'swim',
  climb: 'climb', climbing: 'climb', escalada: 'climb',
  jump: 'jump', jumping: 'jump', salto: 'jump',
  burrow: 'run', burrowing: 'run', excavation: 'run',
  crawl: 'run', crawling: 'run', rastejar: 'run',
  glide: 'glide', gliding: 'glide',
  swing: 'swingline', swinging: 'swingline', swingline: 'swingline',
  levitate: 'levitation', levitation: 'levitation',
  teleport: 'teleport', teleportation: 'teleport',
});

export function movementModeForAction(action) {
  const normalized = String(action ?? '').trim().toLowerCase();
  return MOVEMENT_ACTION_TO_D616[normalized] || 'run';
}

export function actorMovementForAction(actor, action) {
  const mode = movementModeForAction(action);
  // Teleport is a separate power, not spendable movement.
  if (mode === 'teleport') return { mode, maximum: 0 };
  const entry = actor?.system?.movement?.[mode];
  const fallback = actorMovementMaximum(actor);
  // Unavailable modes should not silently grant movement from placeholder fields.
  if (mode !== 'run' && entry?.active === false) return { mode, maximum: 0 };
  const speed = Number(entry?.value);
  return { mode, maximum: Number.isFinite(speed) && speed >= 0 ? speed : (mode === 'run' ? fallback : 0) };
}

export function combatantMovementInfo(combatant) {
  const token = combatant?.token ?? combatant?.tokenDocument ?? null;
  const actor = combatant?.actor ?? token?.actor ?? null;
  // null (Foundry automatic) is equivalent to its default mode, i.e. walking.
  const action = token?.movementAction ?? 'walk';
  return actorMovementForAction(actor, action);
}

export function combatantMovementMaximum(combatant) {
  return combatantMovementInfo(combatant).maximum;
}

export function sanitizeTurnState(raw = {}, movementMaximum = 5) {
  const movementMax = finiteNonNegative(movementMaximum, 5);
  return {
    actionUsed: finiteNonNegative(raw.actionUsed),
    actionMax: Math.max(finiteNonNegative(raw.actionMax, 1), 1),
    reactionUsed: finiteNonNegative(raw.reactionUsed),
    reactionMax: Math.max(finiteNonNegative(raw.reactionMax, 1), 1),
    movementUsed: finiteNonNegative(raw.movementUsed),
    movementExtraActionUsed: !!raw.movementExtraActionUsed,
    movementMax,
    resetKey: String(raw.resetKey ?? ""),
  };
}

export function adjustTurnState(
  raw,
  resource,
  delta,
  movementMaximum = raw?.movementMax ?? 5
) {
  const state = sanitizeTurnState(raw, movementMaximum);
  const amount = Number(delta);
  if (!TURN_TRACKER_RESOURCES.includes(resource) || !Number.isFinite(amount)) {
    return state;
  }

  const field = `${resource}Used`;
  state[field] = Math.max(0, state[field] + amount);
  return state;
}

/** Record one confirmed ordinary move atomically. The Standard Action can be
 * exchanged for a SECOND movement allowance, not an unlimited pool. This
 * does not silently consume extra Actions after the first allowance is spent.
 */
export function recordMovementDistance(raw, distance, movementMaximum = raw?.movementMax ?? 5) {
  const state = sanitizeTurnState(raw, movementMaximum);
  const amount = Number(distance);
  if (!Number.isFinite(amount) || amount <= 0) return {state, actionSpent:false, exceeded:false};
  const before = state.movementUsed;
  state.movementUsed += amount;
  const needsExtra = state.movementMax > 0 && !state.movementExtraActionUsed && before <= state.movementMax + 1e-6 &&
    state.movementUsed > state.movementMax + 1e-6;
  let actionSpent = false;
  if (needsExtra && state.actionUsed < state.actionMax) {
    state.actionUsed += 1;
    state.movementExtraActionUsed = true;
    actionSpent = true;
  }
  const limit = state.movementMax * (state.movementExtraActionUsed ? 2 : 1);
  const exceeded = state.movementUsed > limit + 1e-6;
  return {state, actionSpent, exceeded, needsExtra};
}

/**
 * Server-side guard for Action/Reaction costs.  All callers, including socket
 * requests, must specify one or more distinct resources, and cannot spend a
 * resource that is already exhausted.  Movement spends its remaining allowance.
 */
export function validateTurnConsumption(raw, resources, movementMaximum = raw?.movementMax ?? 5) {
  if (!Array.isArray(resources) || resources.length === 0 || resources.length > TURN_TRACKER_RESOURCES.length) return false;
  if (new Set(resources).size !== resources.length) return false;
  if (resources.some(resource => !TURN_TRACKER_RESOURCES.includes(resource))) return false;
  const state = sanitizeTurnState(raw, movementMaximum);
  return resources.every(resource => resource === "movement" ||
    state[`${resource}Used`] < state[`${resource}Max`]);
}

export function consumeTurnResources(
  raw,
  resources,
  movementMaximum = raw?.movementMax ?? 5
) {
  let state = sanitizeTurnState(raw, movementMaximum);

  for (const resource of resources ?? []) {
    if (resource === "movement") {
      state.movementUsed = Math.max(state.movementUsed, state.movementMax);
    } else if (resource === "action" || resource === "reaction") {
      state = adjustTurnState(state, resource, 1, movementMaximum);
    }
  }

  return state;
}

export function resetTurnState(
  raw,
  resetKey,
  movementMaximum = raw?.movementMax ?? 5
) {
  const state = sanitizeTurnState(raw, movementMaximum);
  state.actionUsed = 0;
  state.reactionUsed = 0;
  state.movementUsed = 0;
  state.movementExtraActionUsed = false;
  state.resetKey = String(resetKey ?? "");
  return state;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/**
 * Return the number of spaces in this single v14 movement operation.
 *
 * During the moveToken hook, Foundry may still expose the travelled path in
 * `pending` while `passed` is zero. The two sections are disjoint, so adding
 * them covers both animated and already-completed movements. We deliberately
 * do not use history.spaces because it is cumulative and would count earlier
 * movements again.
 */
function sectionMovementSpaces(section, distancePerSpace = 0) {
  const spaces = positiveNumber(section?.spaces);
  if (spaces) return spaces;

  const distance = positiveNumber(section?.distance);
  const scale = positiveNumber(distancePerSpace);
  if (distance && scale) return distance / scale;
  return 0;
}

/**
 * Return the number of D616 movement spaces in this single v14 movement
 * operation.
 *
 * Square and hex grids normally populate `spaces`. Foundry deliberately keeps
 * `spaces` at zero in gridless scenes, while still providing `distance` in the
 * Scene's configured units. `distancePerSpace` lets the tracker convert that
 * distance back into D616 spaces (normally 5 ft per space).
 */
export function movementSpacesFromHook(movement, distancePerSpace = 0) {
  const passed = sectionMovementSpaces(movement?.passed, distancePerSpace);
  const pending = sectionMovementSpaces(movement?.pending, distancePerSpace);
  if (passed || pending) return passed + pending;

  // Compatibility fallbacks for movement providers which expose one section.
  const directSpaces = positiveNumber(movement?.spaces);
  if (directSpaces) return directSpaces;

  const directDistance = positiveNumber(movement?.distance);
  const scale = positiveNumber(distancePerSpace);
  if (directDistance && scale) return directDistance / scale;

  const unrecorded = sectionMovementSpaces(
    movement?.history?.unrecorded,
    distancePerSpace
  );
  if (unrecorded) return unrecorded;
  return 0;
}

/** Detect Foundry v14 movement sections explicitly marked as teleportation. */
export function movementIsTeleport(movement) {
  const sections = [
    movement?.passed,
    movement?.pending,
    movement?.history?.recorded,
    movement?.history?.unrecorded,
  ];

  for (const section of sections) {
    for (const waypoint of section?.waypoints ?? []) {
      if (
        waypoint?.teleport === true ||
        waypoint?.actionConfig?.teleport === true ||
        waypoint?.data?.teleport === true ||
        waypoint?.data?.actionConfig?.teleport === true
      ) {
        return true;
      }
    }
  }
  return false;
}
