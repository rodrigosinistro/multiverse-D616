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

export function sanitizeTurnState(raw = {}, movementMaximum = 5) {
  const movementMax = finiteNonNegative(movementMaximum, 5);
  return {
    actionUsed: finiteNonNegative(raw.actionUsed),
    actionMax: Math.max(finiteNonNegative(raw.actionMax, 1), 1),
    reactionUsed: finiteNonNegative(raw.reactionUsed),
    reactionMax: Math.max(finiteNonNegative(raw.reactionMax, 1), 1),
    movementUsed: finiteNonNegative(raw.movementUsed),
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
