import {
  TURN_TRACKER_RESOURCES,
  actorMovementMaximum,
  adjustTurnState,
  classifyItemAction,
  consumeTurnResources,
  movementIsTeleport,
  movementSpacesFromHook,
  resetTurnState,
  sanitizeTurnState,
} from "./turn-tracker-core.mjs";

const SYSTEM_ID = "multiverse-d616";
const FLAG_KEY = "turnTracker";
const INITIATIVE_PHASE_FLAG = "initiativePhase";
const INITIATIVE_RESOLUTION_FLAG = "initiativeResolution";
const SOCKET_NAME = `system.${SYSTEM_ID}`;
const POPUP_ID = "m616-turn-tracker-window";
const STORAGE_KEY = `${SYSTEM_ID}.turnTrackerWindow.v1`;
const IGNORED_MOVEMENT_METHODS = new Set(["config", "paste", "undo"]);
const processedMovements = new Set();
const processedDestinations = new Map();
const pendingCoordinateOrigins = new Map();
const COORDINATE_FALLBACK_DELAY_MS = 250;
const DESTINATION_DEDUPE_MS = 750;
const SCENE_TOOL_NAME = "m616TurnTracker";
const FALLBACK_POPUP_IMAGE = "icons/svg/mystery-man.svg";
const popupImageStatus = new Map();
const POPUP_RENDER_MIN_INTERVAL_MS = 120;
const GEOMETRY_SAVE_DELAY_MS = 180;
const INITIATIVE_PROMPT_DELAY_MS = 120;

const RESOURCE_LABELS = Object.freeze({
  action: "Ação Padrão",
  reaction: "Reação",
  movement: "Movimento",
});
const RESOURCE_SHORT = Object.freeze({
  action: "P",
  reaction: "R",
  movement: "M",
});

const DEFAULT_WINDOW_STATE = Object.freeze({
  open: true,
  minimized: false,
  left: 24,
  top: 120,
  width: 420,
  height: 420,
});

let popupRenderQueued = false;
let popupRenderTimer = null;
let popupRenderForce = false;
let popupLastRenderAt = 0;
let popupLastSignature = "";
let popupResizeObserver = null;
let geometrySaveTimer = null;
let lastSavedGeometry = "";
let windowState = loadWindowState();
let combatControlBusy = false;
let initiativeAutoStartBusy = false;
let initiativePromptOpenKey = "";

function primaryGM() {
  return game.users?.find?.((user) => user.active && user.isGM) ?? null;
}

function isPrimaryGM() {
  return primaryGM()?.id === game.user?.id;
}

function combatantActor(combatant) {
  return combatant?.actor ?? combatant?.token?.actor ?? null;
}

function canControl(combatant, user = game.user) {
  if (!combatant || !user) return false;
  if (user.isGM) return true;
  const actor = combatantActor(combatant);
  const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return !!actor?.testUserPermission?.(user, ownerLevel);
}

function stateFor(combatant) {
  const movementMax = actorMovementMaximum(combatantActor(combatant));
  return sanitizeTurnState(
    combatant?.getFlag?.(SYSTEM_ID, FLAG_KEY) ?? {},
    movementMax
  );
}

function statesEqual(left, right) {
  return (
    Number(left?.actionUsed) === Number(right?.actionUsed) &&
    Number(left?.actionMax) === Number(right?.actionMax) &&
    Number(left?.reactionUsed) === Number(right?.reactionUsed) &&
    Number(left?.reactionMax) === Number(right?.reactionMax) &&
    Number(left?.movementUsed) === Number(right?.movementUsed) &&
    Number(left?.movementMax) === Number(right?.movementMax) &&
    String(left?.resetKey ?? "") === String(right?.resetKey ?? "")
  );
}

async function persistState(combatant, state) {
  if (!combatant) return false;
  const current = stateFor(combatant);
  if (statesEqual(current, state)) return false;
  await combatant.setFlag(SYSTEM_ID, FLAG_KEY, state);
  return true;
}

function combatForId(combatId) {
  return game.combats?.get?.(combatId) ?? game.combat ?? null;
}

function resolveCombatant(combatId, combatantId) {
  return combatForId(combatId)?.combatants?.get?.(combatantId) ?? null;
}

async function applyRequest(payload, requestingUser) {
  const combatant = resolveCombatant(payload.combatId, payload.combatantId);
  if (!combatant || !canControl(combatant, requestingUser)) return false;

  const movementMax = actorMovementMaximum(combatantActor(combatant));
  const current = stateFor(combatant);
  let next = current;

  if (payload.operation === "adjust") {
    next = adjustTurnState(
      current,
      payload.resource,
      Number(payload.delta),
      movementMax
    );
  } else if (payload.operation === "consume") {
    const resources = (payload.resources ?? []).filter((resource) =>
      TURN_TRACKER_RESOURCES.includes(resource)
    );
    next = consumeTurnResources(current, resources, movementMax);
  } else if (payload.operation === "reset") {
    next = resetTurnState(current, current.resetKey, movementMax);
  } else {
    return false;
  }

  await persistState(combatant, next);
  return true;
}

async function requestUpdate(combatant, request) {
  if (!combatant || !canControl(combatant)) return false;

  const payload = {
    type: "turnTrackerRequest",
    combatId: combatant.combat?.id ?? game.combat?.id,
    combatantId: combatant.id,
    userId: game.user.id,
    ...request,
  };

  if (game.user.isGM) return applyRequest(payload, game.user);

  if (!primaryGM()) {
    ui.notifications?.warn?.(
      "O Controle de Turno precisa de um Mestre conectado para sincronizar alterações."
    );
    return false;
  }

  game.socket.emit(SOCKET_NAME, payload);
  return true;
}

async function handleSocket(payload) {
  if (!payload?.type) return;

  if (payload.type === "initiativePrompt") {
    if (game.user?.isGM) return;
    const combat = combatForId(payload.combatId);
    if (!combat) return;
    window.setTimeout(() => {
      showInitiativePrompt(combat, payload.promptId).catch((error) =>
        console.error(`[${SYSTEM_ID}] Initiative prompt failed`, error)
      );
    }, INITIATIVE_PROMPT_DELAY_MS);
    return;
  }

  if (!isPrimaryGM()) return;
  const requestingUser = game.users?.get?.(payload.userId);
  if (!requestingUser) return;

  try {
    if (payload.type === "turnTrackerRequest") {
      await applyRequest(payload, requestingUser);
      return;
    }
    if (payload.type === "initiativeRollRequest") {
      await applyInitiativeRollRequest(payload, requestingUser);
      return;
    }
    if (payload.type === "initiativeResolutionRequest") {
      await applyInitiativeResolutionRequest(payload, requestingUser);
    }
  } catch (error) {
    console.error(`[${SYSTEM_ID}] Turn Tracker socket update failed`, error);
  }
}

function combatantsArray(combat) {
  return Array.from(combat?.combatants?.values?.() ?? combat?.combatants ?? []);
}

function hasInitiative(combatant) {
  const value = combatant?.initiative;
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function initiativePhase(combat) {
  const phase = combat?.getFlag?.(SYSTEM_ID, INITIATIVE_PHASE_FLAG);
  return phase?.active ? phase : null;
}

function initiativeModifierForCombatant(combatant) {
  const init = combatantActor(combatant)?.system?.attributes?.init ?? {};
  const edge = !!init.edge;
  const trouble = !!init.trouble;
  if (edge === trouble) return null;
  return edge ? "edge" : "trouble";
}

function initiativeResolutionForCombatant(combatant) {
  const resolution = combatant?.getFlag?.(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG);
  return resolution && typeof resolution === "object" ? resolution : null;
}

function pendingInitiativeResolutions(combat) {
  return combatantsArray(combat).filter(
    (combatant) => initiativeResolutionForCombatant(combatant)?.pending === true
  );
}


function activePlayerOwners(combatant) {
  const actor = combatantActor(combatant);
  if (!actor || combatant?.hidden) return [];
  const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return Array.from(game.users ?? [])
    .filter((user) =>
      user?.active &&
      !user.isGM &&
      actor.testUserPermission?.(user, ownerLevel)
    )
    .sort((left, right) =>
      String(left.name ?? left.id).localeCompare(String(right.name ?? right.id), game.i18n?.lang)
    );
}

function initiativeControllerForCombatant(combatant) {
  return activePlayerOwners(combatant)[0] ?? primaryGM();
}

function initiativeTargetsForUser(combat, user) {
  if (!combat || !user) return [];
  return combatantsArray(combat).filter((combatant) => {
    if (hasInitiative(combatant)) return false;
    return initiativeControllerForCombatant(combatant)?.id === user.id;
  });
}

function pendingInitiativeCombatants(combat) {
  return combatantsArray(combat).filter((combatant) => !hasInitiative(combatant));
}

async function rollInitiativeForCombatants(combat, combatantIds) {
  if (!combat || !combatantIds?.length) return false;
  const validIds = [...new Set(combatantIds)]
    .filter((id) => combat.combatants?.has?.(id))
    .filter((id) => !hasInitiative(combat.combatants.get(id)));
  if (!validIds.length) return false;

  const phase = initiativePhase(combat);
  for (const id of validIds) {
    const combatant = combat.combatants.get(id);
    const modifier = initiativeModifierForCombatant(combatant);
    const resolution = {
      pending: !!modifier,
      modifier,
      promptId: phase?.promptId ?? "",
      createdAt: Date.now(),
    };

    if (modifier) {
      await combatant.setFlag(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG, resolution);
    } else if (initiativeResolutionForCombatant(combatant)) {
      await combatant.unsetFlag(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG);
    }

    try {
      await combat.rollInitiative(id, {
        updateTurn: false,
        messageOptions: {
          flags: {
            [SYSTEM_ID]: {
              initiative: {
                version: 1,
                combatId: combat.id,
                combatantId: id,
                promptId: phase?.promptId ?? "",
                modifier,
                resolved: !modifier,
              },
            },
          },
        },
      });
    } catch (error) {
      if (modifier) {
        await combatant.unsetFlag(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG).catch(() => {});
      }
      throw error;
    }
  }

  await maybeStartCombatAfterInitiative(combat);
  return true;
}

async function applyInitiativeRollRequest(payload, requestingUser) {
  const combat = combatForId(payload.combatId);
  const phase = initiativePhase(combat);
  if (!combat || combat.started || !phase) return false;
  if (payload.promptId && phase.promptId !== payload.promptId) return false;

  const allowed = new Set(
    initiativeTargetsForUser(combat, requestingUser).map((combatant) => combatant.id)
  );
  const requested = (payload.combatantIds ?? []).filter((id) => allowed.has(id));
  if (!requested.length) return false;
  return rollInitiativeForCombatants(combat, requested);
}

async function requestInitiativeRoll(combat, combatantIds, promptId) {
  if (!combat || !combatantIds?.length) return false;
  if (game.user?.isGM) return rollInitiativeForCombatants(combat, combatantIds);

  // Roll one Combatant at a time so each initiative message carries an
  // explicit Combat/Combatant reference. This is required to update the
  // correct turn order after a localized Edge/Trouble reroll.
  try {
    return await rollInitiativeForCombatants(combat, combatantIds);
  } catch (error) {
    console.warn(`[${SYSTEM_ID}] Player initiative roll required GM fallback`, error);
  }

  if (!primaryGM()) {
    ui.notifications?.warn?.("É necessário um Mestre conectado para registrar a iniciativa.");
    return false;
  }

  game.socket.emit(SOCKET_NAME, {
    type: "initiativeRollRequest",
    combatId: combat.id,
    promptId,
    combatantIds,
    userId: game.user.id,
  });
  return true;
}

async function applyInitiativeResolutionRequest(payload, requestingUser) {
  const combat = combatForId(payload.combatId);
  const combatant = combat?.combatants?.get?.(payload.combatantId) ?? null;
  if (!combat || !combatant || !canControl(combatant, requestingUser)) return false;

  const value = payload.initiative;
  if (value !== null && value !== undefined) {
    const initiative = Number(value);
    if (!Number.isFinite(initiative)) return false;
    await combat.setInitiative(combatant.id, initiative);
  }

  const current = initiativeResolutionForCombatant(combatant) ?? {};
  await combatant.setFlag(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG, {
    ...current,
    pending: false,
    resolvedAt: Date.now(),
    resolvedBy: requestingUser.id,
    messageId: payload.messageId ?? current.messageId ?? null,
  });

  const message = payload.messageId ? game.messages?.get?.(payload.messageId) : null;
  if (message) {
    await message.update({
      [`flags.${SYSTEM_ID}.initiative.resolved`]: true,
      [`flags.${SYSTEM_ID}.initiative.resolvedAt`]: Date.now(),
    }).catch((error) =>
      console.warn(`[${SYSTEM_ID}] Could not mirror initiative resolution on ChatMessage`, error)
    );
  }

  await maybeStartCombatAfterInitiative(combat);
  schedulePopupRender({ force: true });
  return true;
}

async function requestInitiativeResolution({
  combatId,
  combatantId,
  initiative = null,
  messageId = null,
} = {}) {
  const combatant = resolveCombatant(combatId, combatantId);
  if (!combatant || !canControl(combatant)) return false;

  const payload = {
    type: "initiativeResolutionRequest",
    combatId,
    combatantId,
    initiative,
    messageId,
    userId: game.user.id,
  };

  if (game.user?.isGM) {
    return applyInitiativeResolutionRequest(payload, game.user);
  }

  if (!primaryGM()) {
    ui.notifications?.warn?.("É necessário um Mestre conectado para atualizar a iniciativa.");
    return false;
  }

  game.socket.emit(SOCKET_NAME, payload);
  return true;
}

function initiativePromptContent(targets, isGM) {
  const intro = isGM
    ? "Jogue a iniciativa dos combatentes sem um jogador ativo responsável."
    : "Jogue a iniciativa dos seus personagens neste combate.";
  const rows = targets.map((combatant) => {
    const actor = combatantActor(combatant);
    const name = combatant.name ?? actor?.name ?? "Combatente";
    const modifier = initiativeModifierForCombatant(combatant);
    const modifierLabel = modifier === "edge" ? "Edge" : modifier === "trouble" ? "Trouble" : "";
    const baseNote = isGM
      ? (activePlayerOwners(combatant).length ? "Jogador indisponível" : "Sem dono ativo")
      : "Seu personagem";
    const note = modifierLabel ? `${baseNote} · ${modifierLabel} na iniciativa` : baseNote;
    return `<li><strong>${escapeHtml(name)}</strong><span>${escapeHtml(note)}</span></li>`;
  }).join("");
  return `<div class="m616-initiative-prompt">
    <p>${escapeHtml(intro)}</p>
    <ul>${rows}</ul>
    <p class="m616-initiative-hint">O combate começa automaticamente quando todas as iniciativas e os Edge/Trouble forem resolvidos.</p>
  </div>`;
}

async function showInitiativePrompt(combat, promptId) {
  const phase = initiativePhase(combat);
  if (!combat || combat.started || !phase) return false;
  if (promptId && phase.promptId !== promptId) return false;

  const targets = initiativeTargetsForUser(combat, game.user);
  if (!targets.length) {
    if (isPrimaryGM()) await maybeStartCombatAfterInitiative(combat);
    return false;
  }

  const key = `${combat.id}:${phase.promptId}:${game.user.id}`;
  if (initiativePromptOpenKey === key) return false;
  initiativePromptOpenKey = key;

  const DialogV2 = foundry.applications?.api?.DialogV2;
  try {
    let result = null;
    const content = initiativePromptContent(targets, !!game.user?.isGM);
    if (DialogV2?.wait) {
      result = await DialogV2.wait({
        window: { title: "Jogar Iniciativa" },
        content,
        modal: true,
        buttons: [
          {
            action: "roll",
            label: targets.length === 1 ? "Jogar Iniciativa" : "Jogar Todas",
            icon: "fa-solid fa-dice-d6",
            default: true,
            callback: () => "roll",
          },
          {
            action: "later",
            label: "Agora não",
            icon: "fa-solid fa-clock",
            callback: () => null,
          },
        ],
        close: () => null,
      });
    } else {
      result = await new Promise((resolve) => {
        new Dialog({
          title: "Jogar Iniciativa",
          content,
          buttons: {
            roll: {
              icon: '<i class="fa-solid fa-dice-d6"></i>',
              label: targets.length === 1 ? "Jogar Iniciativa" : "Jogar Todas",
              callback: () => resolve("roll"),
            },
            later: {
              icon: '<i class="fa-solid fa-clock"></i>',
              label: "Agora não",
              callback: () => resolve(null),
            },
          },
          default: "roll",
          close: () => resolve(null),
        }).render(true);
      });
    }

    if (result === "roll") {
      await requestInitiativeRoll(
        combat,
        targets.map((combatant) => combatant.id),
        phase.promptId
      );
    }
    return result === "roll";
  } finally {
    initiativePromptOpenKey = "";
  }
}

async function broadcastInitiativePrompts(combat, promptId) {
  game.socket.emit(SOCKET_NAME, {
    type: "initiativePrompt",
    combatId: combat.id,
    promptId,
    userId: game.user.id,
  });
  await showInitiativePrompt(combat, promptId);
}

async function beginInitiativePhase(combat) {
  if (!game.user?.isGM || !combat || combat.started) return false;
  const combatants = combatantsArray(combat);
  if (!combatants.length) {
    ui.notifications?.warn?.("Adicione combatentes antes de iniciar o combate.");
    return false;
  }

  const existing = initiativePhase(combat);
  if (existing) {
    const missing = pendingInitiativeCombatants(combat).length;
    const unresolved = pendingInitiativeResolutions(combat).length;
    if (!missing && unresolved) {
      ui.notifications?.info?.(
        `${unresolved} iniciativa${unresolved === 1 ? "" : "s"} aguardando Edge/Trouble ou “Manter iniciativa” no chat.`
      );
    }
    await broadcastInitiativePrompts(combat, existing.promptId);
    return true;
  }

  await Promise.all(
    combatants.map((combatant) =>
      initiativeResolutionForCombatant(combatant)
        ? combatant.unsetFlag(SYSTEM_ID, INITIATIVE_RESOLUTION_FLAG).catch(() => {})
        : Promise.resolve()
    )
  );
  await combat.resetAll({ updateTurn: false });
  const promptId = foundry.utils.randomID();
  await combat.setFlag(SYSTEM_ID, INITIATIVE_PHASE_FLAG, {
    active: true,
    promptId,
    startedAt: Date.now(),
    startedBy: game.user.id,
  });
  await broadcastInitiativePrompts(combat, promptId);
  await maybeStartCombatAfterInitiative(combat);
  return true;
}

async function maybeStartCombatAfterInitiative(combat) {
  if (!isPrimaryGM() || initiativeAutoStartBusy || !combat || combat.started) return false;
  if (
    !initiativePhase(combat) ||
    pendingInitiativeCombatants(combat).length ||
    pendingInitiativeResolutions(combat).length
  ) return false;

  initiativeAutoStartBusy = true;
  try {
    await combat.unsetFlag(SYSTEM_ID, INITIATIVE_PHASE_FLAG);
    await combat.startCombat();
    return true;
  } catch (error) {
    console.error(`[${SYSTEM_ID}] Could not auto-start combat after initiative`, error);
    ui.notifications?.error?.("As iniciativas foram lançadas, mas o combate não pôde ser iniciado.");
    return false;
  } finally {
    initiativeAutoStartBusy = false;
  }
}

async function confirmEndCombat(combat) {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  const content = `<p>Finalizar <b>${escapeHtml(combat?.name ?? "este combate")}</b>?</p>`;
  if (DialogV2?.wait) {
    return DialogV2.wait({
      window: { title: "Finalizar Combate" },
      content,
      modal: true,
      buttons: [
        {
          action: "end",
          label: "Finalizar Combate",
          icon: "fa-solid fa-flag-checkered",
          callback: () => true,
        },
        {
          action: "cancel",
          label: "Cancelar",
          icon: "fa-solid fa-xmark",
          default: true,
          callback: () => false,
        },
      ],
      close: () => false,
    });
  }
  return new Promise((resolve) => {
    new Dialog({
      title: "Finalizar Combate",
      content,
      buttons: {
        end: { label: "Finalizar Combate", callback: () => resolve(true) },
        cancel: { label: "Cancelar", callback: () => resolve(false) },
      },
      default: "cancel",
      close: () => resolve(false),
    }).render(true);
  });
}

async function runCombatControl(action, button) {
  if (!game.user?.isGM || button?.disabled || combatControlBusy) return false;
  const combat = game.combat;
  if (!combat) {
    ui.notifications?.warn?.("Nenhum combate ativo.");
    return false;
  }

  combatControlBusy = true;
  button?.classList?.add("is-busy");
  try {
    if (action === "start") return await beginInitiativePhase(combat);
    if (action === "previous") return combat.started ? await combat.previousTurn() : false;
    if (action === "next") return combat.started ? await combat.nextTurn() : false;
    if (action === "end") {
      if (!combat.started || !(await confirmEndCombat(combat))) return false;
      return await combat.endCombat();
    }
    return false;
  } catch (error) {
    console.error(`[${SYSTEM_ID}] Combat control '${action}' failed`, error);
    ui.notifications?.error?.("Não foi possível executar o controle do combate.");
    return false;
  } finally {
    combatControlBusy = false;
    button?.classList?.remove("is-busy");
    schedulePopupRender({ force: true });
  }
}

function actorsMatch(candidate, actor, { allowBaseId = false } = {}) {
  if (!candidate || !actor) return false;
  if (candidate === actor) return true;
  if (candidate.uuid && actor.uuid && candidate.uuid === actor.uuid) return true;
  if (allowBaseId && candidate.id && actor.id && candidate.id === actor.id) return true;
  return false;
}

/**
 * Resolve the combatant which owns an Item use.
 *
 * Reactions are commonly rolled while another combatant has the active turn,
 * so limiting Item tracking to combat.combatant silently discarded them.
 */
function combatantForActor(actor) {
  const combat = game.combat;
  if (!combat?.started || !actor) return null;

  const combatants = Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []);
  if (!combatants.length) return null;

  // Synthetic Token Actors can be matched unambiguously by Token ID.
  const actorTokenId = actor?.token?.id ?? actor?.token?._id ?? null;
  if (actorTokenId) {
    const tokenMatch = combatants.find((combatant) =>
      (combatant.tokenId ?? combatant.token?.id) === actorTokenId
    );
    if (tokenMatch) return tokenMatch;
  }

  // Prefer exact object/UUID identity, including the combatant's Token Actor.
  const exact = combatants.find((combatant) =>
    actorsMatch(combatantActor(combatant), actor) ||
    actorsMatch(combatant?.token?.actor, actor)
  );
  if (exact) return exact;

  // Linked tokens share the base Actor ID. If there is only one such
  // combatant, this is safe and supports Items rolled from the world Actor.
  const baseMatches = combatants.filter((combatant) =>
    actorsMatch(combatantActor(combatant), actor, { allowBaseId: true }) ||
    actorsMatch(combatant?.token?.actor, actor, { allowBaseId: true })
  );
  if (baseMatches.length === 1) return baseMatches[0];

  // In the rare case of duplicate linked tokens, prefer a controlled token,
  // then the active combatant, rather than recording against an arbitrary copy.
  const controlledIds = new Set((canvas?.tokens?.controlled ?? []).map((token) => token.id));
  return (
    baseMatches.find((combatant) => controlledIds.has(combatant.tokenId ?? combatant.token?.id)) ??
    baseMatches.find((combatant) => combatant.id === combat.combatant?.id) ??
    null
  );
}

function escapeHtml(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

async function chooseResource(item, resources) {
  const choices = resources.filter((resource) =>
    TURN_TRACKER_RESOURCES.includes(resource)
  );
  if (choices.length <= 1) return choices[0] ?? null;

  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2?.wait) {
    return DialogV2.wait({
      window: { title: "Controle de Turno" },
      content: `<p>Qual recurso foi usado por <b>${escapeHtml(item.name)}</b>?</p>`,
      buttons: choices.map((resource, index) => ({
        action: resource,
        label: RESOURCE_LABELS[resource],
        default: index === 0,
        callback: () => resource,
      })),
      close: () => null,
    });
  }

  return new Promise((resolve) => {
    const buttons = Object.fromEntries(
      choices.map((resource) => [
        resource,
        {
          label: RESOURCE_LABELS[resource],
          callback: () => resolve(resource),
        },
      ])
    );
    new Dialog({
      title: "Controle de Turno",
      content: `<p>Qual recurso foi usado por <b>${escapeHtml(item.name)}</b>?</p>`,
      buttons,
      default: choices[0],
      close: () => resolve(null),
    }).render(true);
  });
}

async function trackItemUse(item) {
  const combatant = combatantForActor(item?.actor);
  if (!combatant) return false;

  const classification = classifyItemAction(item);
  if (classification.kind === "none") return false;

  let resources = classification.resources;
  if (classification.kind === "choice") {
    const chosen = await chooseResource(item, resources);
    if (!chosen) return false;
    resources = [chosen];
  }

  return requestUpdate(combatant, {
    operation: "consume",
    resources,
  });
}

function formatValue(value) {
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 10) / 10);
}

function loadWindowState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { ...DEFAULT_WINDOW_STATE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch (_error) {
    return { ...DEFAULT_WINDOW_STATE };
  }
}

function saveWindowState(patch = {}) {
  windowState = { ...windowState, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windowState));
  } catch (_error) {
    // localStorage can be unavailable in hardened browser profiles.
  }
}

function clampWindowGeometry(element) {
  if (!element) return;
  const minVisible = 48;
  const width = Math.max(element.offsetWidth || windowState.width, 300);
  const height = Math.max(element.offsetHeight || windowState.height, 150);
  const maxLeft = Math.max(0, window.innerWidth - minVisible);
  const maxTop = Math.max(0, window.innerHeight - minVisible);
  const left = Math.min(Math.max(Number(windowState.left) || 0, -width + minVisible), maxLeft);
  const top = Math.min(Math.max(Number(windowState.top) || 0, 0), maxTop);
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function persistElementGeometry(element) {
  if (!element || element.hidden || element.classList.contains("is-minimized")) return;
  const rect = element.getBoundingClientRect();
  const geometry = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
  const signature = `${geometry.left}:${geometry.top}:${geometry.width}:${geometry.height}`;
  if (signature === lastSavedGeometry) return;
  lastSavedGeometry = signature;
  saveWindowState(geometry);
}

function scheduleGeometryPersist(element) {
  if (geometrySaveTimer) window.clearTimeout(geometrySaveTimer);
  geometrySaveTimer = window.setTimeout(() => {
    geometrySaveTimer = null;
    persistElementGeometry(element);
  }, GEOMETRY_SAVE_DELAY_MS);
}

function showPopup(open = true) {
  const popup = ensurePopup();
  popup.hidden = !open;
  saveWindowState({ open });
  if (open) {
    clampWindowGeometry(popup);
    schedulePopupRender({ force: true, immediate: true });
  }
}

function setMinimized(minimized) {
  const popup = ensurePopup();
  popup.classList.toggle("is-minimized", minimized);
  const button = popup.querySelector("[data-m616-window-minimize]");
  if (button) {
    button.title = minimized ? "Restaurar janela" : "Minimizar janela";
    button.innerHTML = minimized
      ? '<i class="fa-solid fa-window-maximize" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-window-minimize" aria-hidden="true"></i>';
  }
  saveWindowState({ minimized });
  if (!minimized) schedulePopupRender({ force: true, immediate: true });
}

function beginWindowDrag(event) {
  if (event.button !== 0 || event.target.closest("button")) return;
  const popup = event.currentTarget.closest(`#${POPUP_ID}`);
  if (!popup) return;

  event.preventDefault();
  const startRect = popup.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  popup.classList.add("is-dragging");

  const move = (moveEvent) => {
    const left = startRect.left + moveEvent.clientX - startX;
    const top = startRect.top + moveEvent.clientY - startY;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  };

  const finish = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    popup.classList.remove("is-dragging");
    const rect = popup.getBoundingClientRect();
    saveWindowState({ left: Math.round(rect.left), top: Math.round(rect.top) });
    clampWindowGeometry(popup);
  };

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", finish, { once: true });
  document.addEventListener("pointercancel", finish, { once: true });
}

function ensurePopup() {
  let popup = document.getElementById(POPUP_ID);
  if (popup) return popup;

  popup = document.createElement("section");
  popup.id = POPUP_ID;
  popup.className = "m616-turn-tracker-window";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "Controle de Turno do Multiverse D616");
  popup.style.left = `${windowState.left}px`;
  popup.style.top = `${windowState.top}px`;
  popup.style.width = `${Math.max(Number(windowState.width) || 420, 300)}px`;
  popup.style.height = `${Math.max(Number(windowState.height) || 420, 180)}px`;
  popup.innerHTML = `
    <header class="m616-turn-window-header">
      <div class="m616-turn-window-title">
        <i class="fa-solid fa-stopwatch" aria-hidden="true"></i>
        <span>Controle de Turno</span>
      </div>
      <div class="m616-turn-window-actions">
        <button type="button" data-m616-window-minimize title="Minimizar janela" aria-label="Minimizar janela">
          <i class="fa-solid fa-window-minimize" aria-hidden="true"></i>
        </button>
        <button type="button" data-m616-window-close title="Fechar janela" aria-label="Fechar janela">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </header>
    <div class="m616-turn-window-content" data-m616-popup-content></div>
  `;

  popup.querySelector(".m616-turn-window-header")?.addEventListener("pointerdown", beginWindowDrag);
  popup.querySelector("[data-m616-window-close]")?.addEventListener("click", () => showPopup(false));
  popup.querySelector("[data-m616-window-minimize]")?.addEventListener("click", () => {
    setMinimized(!popup.classList.contains("is-minimized"));
  });
  popup.addEventListener("click", (event) => {
    onPopupClick(event).catch((error) =>
      console.error(`[${SYSTEM_ID}] Turn Tracker popup click failed`, error)
    );
  });
  popup.addEventListener("contextmenu", (event) => {
    onPopupContextMenu(event).catch((error) =>
      console.error(`[${SYSTEM_ID}] Turn Tracker popup context action failed`, error)
    );
  });

  document.body.appendChild(popup);
  popupResizeObserver = new ResizeObserver(() => scheduleGeometryPersist(popup));
  popupResizeObserver.observe(popup);
  setMinimized(!!windowState.minimized);
  clampWindowGeometry(popup);
  return popup;
}

function combatantsForPopup(combat) {
  if (!combat) return [];
  const turns = Array.isArray(combat.turns) ? combat.turns : [];
  const combatants = turns.length ? turns : Array.from(combat.combatants ?? []);
  if (game.user?.isGM) return combatants;
  return combatants.filter((combatant) => !combatant?.hidden && combatant?.visible !== false);
}

function popupImageSource(combatant) {
  return (
    combatant?.token?.texture?.src ??
    combatant?.token?.img ??
    combatantActor(combatant)?.img ??
    FALLBACK_POPUP_IMAGE
  );
}

function probePopupImage(source) {
  if (!source || source === FALLBACK_POPUP_IMAGE || popupImageStatus.has(source)) return;
  popupImageStatus.set(source, "loading");
  const probe = new Image();
  probe.decoding = "async";
  probe.onload = () => {
    popupImageStatus.set(source, "valid");
    schedulePopupRender({ force: true });
  };
  probe.onerror = () => popupImageStatus.set(source, "invalid");
  probe.src = source;
}

function combatantImage(combatant) {
  const source = popupImageSource(combatant);
  if (!source || source === FALLBACK_POPUP_IMAGE) return FALLBACK_POPUP_IMAGE;
  const status = popupImageStatus.get(source);
  if (status === "valid") return source;
  if (!status) probePopupImage(source);
  return FALLBACK_POPUP_IMAGE;
}

function resourceButtonHtml(resource, state) {
  const used = state[`${resource}Used`];
  const label = RESOURCE_LABELS[resource];
  const isGM = !!game.user?.isGM;
  const title = isGM
    ? `${label}: ${formatValue(used)} uso(s). Clique para adicionar; clique direito para desfazer.`
    : `${label}: ${formatValue(used)} uso(s).`;
  return `<button type="button"
    class="m616-popup-resource${isGM ? "" : " is-readonly"}"
    data-m616-popup-resource="${resource}"
    title="${escapeHtml(title)}"
    ${isGM ? "" : 'disabled aria-disabled="true"'}>
    <span class="m616-popup-resource-short">${RESOURCE_SHORT[resource]}</span>
    <span class="m616-popup-resource-label">${escapeHtml(label)}</span>
    <strong>${formatValue(used)}</strong>
  </button>`;
}

function renderCombatantRow(combatant, activeId) {
  const state = stateFor(combatant);
  const actor = combatantActor(combatant);
  const isActive = combatant.id === activeId;
  const name = combatant.name ?? actor?.name ?? "Combatente";
  const defeated = !!combatant.defeated;
  const resolution = initiativeResolutionForCombatant(combatant);
  const pendingModifier =
    resolution?.pending === true
      ? resolution.modifier === "edge"
        ? "Aguardando Edge"
        : resolution.modifier === "trouble"
          ? "Aguardando Trouble"
          : "Aguardando ajuste"
      : "";
  const resources = TURN_TRACKER_RESOURCES
    .map((resource) => resourceButtonHtml(resource, state))
    .join("");

  const image = combatantImage(combatant);
  return `<article class="m616-popup-combatant${isActive ? " is-active" : ""}${defeated ? " is-defeated" : ""}"
      data-m616-combatant-id="${escapeHtml(combatant.id)}">
    <div class="m616-popup-combatant-heading">
      <img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async">
      <div class="m616-popup-combatant-name" title="${escapeHtml(name)}">
        <strong>${escapeHtml(name)}</strong>
        <span>${isActive ? "Turno atual" : defeated ? "Derrotado" : pendingModifier || "Aguardando"}</span>
      </div>
      ${game.user?.isGM ? `<button type="button" class="m616-popup-reset" data-m616-popup-reset
        title="Zerar Ação Padrão, Reação e Movimento deste combatente">
        <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
      </button>` : '<span class="m616-popup-reset-placeholder" aria-hidden="true"></span>'}
    </div>
    <div class="m616-popup-resources">${resources}</div>
  </article>`;
}

function gmCombatControlsHtml(combat, combatants) {
  if (!game.user?.isGM) return "";
  const started = !!combat?.started;
  const phase = initiativePhase(combat);
  const canStart = !started && combatants.length > 0;
  const canGoBack = started && !((Number(combat.round) || 0) <= 1 && (Number(combat.turn) || 0) <= 0);
  const buttons = [
    {
      action: "start",
      label: "Iniciar Combate",
      icon: phase ? "fa-solid fa-dice-d6" : "fa-solid fa-play",
      disabled: !canStart,
      title: phase ? "Reabrir o pedido de iniciativa" : "Pedir as iniciativas e iniciar o combate",
    },
    {
      action: "previous",
      label: "Retroceder Turno",
      icon: "fa-solid fa-backward-step",
      disabled: !canGoBack,
      title: "Voltar ao turno anterior",
    },
    {
      action: "next",
      label: "Avançar Turno",
      icon: "fa-solid fa-forward-step",
      disabled: !started,
      title: "Avançar para o próximo turno",
    },
    {
      action: "end",
      label: "Finalizar Combate",
      icon: "fa-solid fa-flag-checkered",
      disabled: !started,
      title: "Finalizar este combate",
    },
  ];
  return `<div class="m616-popup-navigation">
    ${buttons.map((entry) => `<button type="button"
      data-m616-combat-control="${entry.action}"
      title="${escapeHtml(entry.title)}"
      ${entry.disabled ? "disabled" : ""}>
      <i class="${entry.icon}" aria-hidden="true"></i>
      <span>${escapeHtml(entry.label)}</span>
    </button>`).join("")}
  </div>`;
}

function popupSignature(combat) {
  if (!combat) return "no-combat";
  const activeId = combat.combatant?.id ?? "";
  const combatants = combatantsForPopup(combat);
  const rows = combatants.map((combatant) => {
    const state = stateFor(combatant);
    return [
      combatant.id,
      combatant.name ?? combatantActor(combatant)?.name ?? "",
      combatant.initiative ?? null,
      !!combatant.defeated,
      !!combatant.hidden,
      combatant.id === activeId,
      popupImageSource(combatant),
      state.actionUsed,
      state.actionMax,
      state.reactionUsed,
      state.reactionMax,
      state.movementUsed,
      state.movementMax,
      state.resetKey,
    ];
  });
  const phase = initiativePhase(combat);
  return JSON.stringify([
    combat.id,
    combat.name ?? "",
    !!combat.started,
    combat.round ?? 0,
    combat.turn ?? null,
    activeId,
    phase?.promptId ?? "",
    pendingInitiativeCombatants(combat).length,
    pendingInitiativeResolutions(combat).length,
    rows,
  ]);
}

function renderPopup({ force = false } = {}) {
  const popup = ensurePopup();
  popup.hidden = !windowState.open;
  if (!windowState.open || popup.classList.contains("is-minimized")) return;

  const content = popup.querySelector("[data-m616-popup-content]");
  if (!content) return;
  const combat = game.combat;
  const signature = popupSignature(combat);
  if (!force && signature === popupLastSignature) return;
  popupLastSignature = signature;
  const previousScroll = content.querySelector(".m616-popup-list")?.scrollTop ?? 0;

  if (!combat) {
    content.innerHTML = `
      <div class="m616-popup-empty">
        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
        <strong>Nenhum combate ativo</strong>
        <span>Crie ou ative um encontro para controlar os recursos dos combatentes.</span>
      </div>`;
    popupLastRenderAt = performance.now();
    return;
  }

  const active = combat.combatant;
  const combatants = combatantsForPopup(combat);
  const round = Number(combat.round ?? 0);
  const turn = Number(combat.turn ?? 0) + 1;
  const phase = initiativePhase(combat);
  const pendingInitiatives = pendingInitiativeCombatants(combat).length;
  const pendingResolutions = pendingInitiativeResolutions(combat).length;
  const status = combat.started
    ? `Rodada ${round || 1} · Turno ${turn}`
    : phase
      ? pendingInitiatives
        ? `Aguardando iniciativas · ${pendingInitiatives} pendente${pendingInitiatives === 1 ? "" : "s"}`
        : pendingResolutions
          ? `Aguardando Edge/Trouble · ${pendingResolutions} pendente${pendingResolutions === 1 ? "" : "s"}`
          : "Preparando ordem de iniciativa"
      : "Combate ainda não iniciado";

  content.innerHTML = `
    <div class="m616-popup-combat-meta">
      <div>
        <strong>${escapeHtml(combat.name ?? "Combate")}</strong>
        <span>${escapeHtml(status)}</span>
      </div>
      <div class="m616-popup-combat-actions">
        <span class="m616-popup-count">${combatants.length} combatente${combatants.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    ${gmCombatControlsHtml(combat, combatants)}
    <div class="m616-popup-list">
      ${combatants.map((combatant) => renderCombatantRow(combatant, active?.id)).join("") || `
        <div class="m616-popup-empty compact"><strong>Nenhum combatente neste encontro.</strong></div>`}
    </div>
    <footer class="m616-popup-help">
      ${game.user?.isGM
        ? "Clique adiciona uso · Clique direito desfaz · Shift + Movimento usa o restante"
        : "Os recursos são atualizados automaticamente durante o combate"}
    </footer>`;

  const list = content.querySelector(".m616-popup-list");
  if (list && previousScroll > 0) list.scrollTop = previousScroll;
  popupLastRenderAt = performance.now();
}

function schedulePopupRender({ force = false, immediate = false } = {}) {
  if (!game.ready || !windowState.open) return;
  const popup = document.getElementById(POPUP_ID);
  if (popup?.hidden || popup?.classList.contains("is-minimized")) return;

  popupRenderForce ||= force;
  if (popupRenderQueued) return;
  popupRenderQueued = true;

  const elapsed = performance.now() - popupLastRenderAt;
  const delay = immediate ? 0 : Math.max(0, POPUP_RENDER_MIN_INTERVAL_MS - elapsed);
  popupRenderTimer = window.setTimeout(() => {
    popupRenderTimer = null;
    requestAnimationFrame(() => {
      popupRenderQueued = false;
      const forceRender = popupRenderForce;
      popupRenderForce = false;
      renderPopup({ force: forceRender });
    });
  }, delay);
}

function popupCombatantFromEvent(event) {
  const row = event.target?.closest?.("[data-m616-combatant-id]");
  return resolveCombatant(game.combat?.id, row?.dataset?.m616CombatantId);
}

async function onPopupClick(event) {
  const combatControl = event.target?.closest?.("[data-m616-combat-control]");
  const reset = event.target?.closest?.("[data-m616-popup-reset]");
  const resourceButton = event.target?.closest?.("[data-m616-popup-resource]");
  if (!combatControl && !reset && !resourceButton) return;

  if (combatControl) {
    if (!game.user?.isGM || combatControl.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    await runCombatControl(combatControl.dataset.m616CombatControl, combatControl);
    return;
  }

  const combatant = popupCombatantFromEvent(event);
  if (!combatant || !game.user?.isGM) return;
  event.preventDefault();
  event.stopPropagation();

  if (reset) {
    await requestUpdate(combatant, { operation: "reset" });
    return;
  }

  const resource = resourceButton.dataset.m616PopupResource;
  const current = stateFor(combatant);
  const delta =
    resource === "movement" && event.shiftKey
      ? Math.max(0, current.movementMax - current.movementUsed)
      : 1;
  await requestUpdate(combatant, { operation: "adjust", resource, delta });
}

async function onPopupContextMenu(event) {
  const resourceButton = event.target?.closest?.("[data-m616-popup-resource]");
  if (!resourceButton) return;

  const combatant = popupCombatantFromEvent(event);
  if (!combatant || !game.user?.isGM) return;
  event.preventDefault();
  event.stopPropagation();
  await requestUpdate(combatant, {
    operation: "adjust",
    resource: resourceButton.dataset.m616PopupResource,
    delta: -1,
  });
}

function turnResetKey(combat) {
  const combatant = combat?.combatant;
  if (!combatant) return "";
  return `${combat.id}:${combat.round ?? 0}:${combat.turn ?? 0}:${combatant.id}`;
}

async function resetActiveCombatant(combat) {
  if (!isPrimaryGM() || !combat?.started || !combat.combatant) return;

  const combatant = combat.combatant;
  const key = turnResetKey(combat);
  const current = stateFor(combatant);
  if (!key || current.resetKey === key) return;

  await persistState(
    combatant,
    resetTurnState(
      current,
      key,
      actorMovementMaximum(combatantActor(combatant))
    )
  );
}

function tokenSceneId(tokenDocument) {
  return tokenDocument?.parent?.id ?? tokenDocument?.scene?.id ?? canvas?.scene?.id ?? "";
}

function combatantForToken(tokenDocument) {
  const combat = game.combat;
  if (!combat?.started || !tokenDocument) return null;

  const sceneId = tokenSceneId(tokenDocument);
  if (combat.scene?.id && sceneId && combat.scene.id !== sceneId) return null;

  const tokenId = tokenDocument.id;
  return Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []).find(
    (combatant) => (combatant.tokenId ?? combatant.token?.id) === tokenId
  ) ?? null;
}

function sceneDistancePerSpace(tokenDocument) {
  const value = Number(
    tokenDocument?.parent?.grid?.distance ??
    tokenDocument?.scene?.grid?.distance ??
    canvas?.scene?.grid?.distance ??
    game.system?.grid?.distance ??
    5
  );
  return Number.isFinite(value) && value > 0 ? value : 5;
}

function movementDestinationKey(tokenDocument, destination = tokenDocument) {
  if (!tokenDocument || !destination) return "";
  const x = Number(destination.x ?? tokenDocument.x);
  const y = Number(destination.y ?? tokenDocument.y);
  const elevation = Number(destination.elevation ?? tokenDocument.elevation ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
  return `${tokenSceneId(tokenDocument)}:${tokenDocument.id}:${x}:${y}:${Number.isFinite(elevation) ? elevation : 0}`;
}

function rememberProcessedDestination(key) {
  if (!key) return;
  const now = Date.now();
  processedDestinations.set(key, now);
  for (const [candidate, time] of processedDestinations) {
    if (now - time > DESTINATION_DEDUPE_MS) processedDestinations.delete(candidate);
  }
}

function destinationWasProcessed(key) {
  const time = processedDestinations.get(key);
  return Number.isFinite(time) && Date.now() - time <= DESTINATION_DEDUPE_MS;
}

function movementSpacesFromPositions(tokenDocument, origin, destination) {
  if (!origin || !destination) return 0;
  const distancePerSpace = sceneDistancePerSpace(tokenDocument);

  try {
    const measured = tokenDocument?.measureMovementPath?.(
      [origin, destination],
      { preview: false }
    );
    const spaces = Number(measured?.spaces);
    if (Number.isFinite(spaces) && spaces > 0) return spaces;
    const distance = Number(measured?.distance);
    if (Number.isFinite(distance) && distance > 0) return distance / distancePerSpace;
  } catch (error) {
    console.debug(`[${SYSTEM_ID}] TokenDocument movement measurement fallback`, error);
  }

  try {
    const measured = canvas?.grid?.measurePath?.([origin, destination]);
    const spaces = Number(measured?.spaces);
    if (Number.isFinite(spaces) && spaces > 0) return spaces;
    const distance = Number(measured?.distance);
    if (Number.isFinite(distance) && distance > 0) return distance / distancePerSpace;
  } catch (error) {
    console.debug(`[${SYSTEM_ID}] Canvas grid movement measurement fallback`, error);
  }

  const dx = Number(destination.x) - Number(origin.x);
  const dy = Number(destination.y) - Number(origin.y);
  const gridSize = Number(
    tokenDocument?.parent?.grid?.size ?? canvas?.grid?.size ?? canvas?.dimensions?.size
  );
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(gridSize) || gridSize <= 0) {
    return 0;
  }
  return Math.hypot(dx, dy) / gridSize;
}

async function recordMovementForCombatant(combatant, spaces, source = "movement") {
  const amount = Number(spaces);
  if (!combatant || !Number.isFinite(amount) || amount <= 0) return false;

  const result = await requestUpdate(combatant, {
    operation: "adjust",
    resource: "movement",
    delta: amount,
  });
  if (result) {
    console.debug(`[${SYSTEM_ID}] Turn Tracker recorded movement`, {
      combatant: combatant.name,
      spaces: amount,
      source,
    });
  }
  return result;
}

async function trackTokenMovement(tokenDocument, movement, _operation, _user) {
  // The v14 moveToken hook fires on every connected client after the update.
  // Only the primary GM records it, preventing duplicate socket requests and
  // keeping Combatant flag updates on one authoritative client.
  if (!isPrimaryGM()) return;

  const combatant = combatantForToken(tokenDocument);
  if (!combatant) return;

  const destinationKey = movementDestinationKey(tokenDocument, movement?.destination);
  if (destinationWasProcessed(destinationKey)) return;

  const method = String(movement?.method ?? "").toLowerCase();
  if (IGNORED_MOVEMENT_METHODS.has(method) || movementIsTeleport(movement)) {
    rememberProcessedDestination(destinationKey);
    return;
  }

  const movementId = String(movement?.id ?? "");
  if (movementId && processedMovements.has(movementId)) return;
  if (movementId) {
    processedMovements.add(movementId);
    if (processedMovements.size > 200) {
      processedMovements.delete(processedMovements.values().next().value);
    }
  }

  const distancePerSpace = sceneDistancePerSpace(tokenDocument);
  let spaces = movementSpacesFromHook(movement, distancePerSpace);
  if (spaces <= 0) {
    spaces = movementSpacesFromPositions(
      tokenDocument,
      movement?.origin,
      movement?.destination
    );
  }

  rememberProcessedDestination(destinationKey);
  await recordMovementForCombatant(combatant, spaces, `moveToken:${method || "unknown"}`);
}

function coordinateOriginKey(tokenDocument) {
  return String(tokenDocument?.uuid ?? tokenDocument?.id ?? "token");
}

function captureCoordinateOrigin(tokenDocument, changed) {
  if (!isPrimaryGM()) return;
  if (!("x" in (changed ?? {})) && !("y" in (changed ?? {})) && !("elevation" in (changed ?? {}))) return;

  pendingCoordinateOrigins.set(coordinateOriginKey(tokenDocument), {
    x: Number(tokenDocument.x),
    y: Number(tokenDocument.y),
    elevation: Number(tokenDocument.elevation ?? 0),
    capturedAt: Date.now(),
  });
}

function scheduleCoordinateMovementFallback(tokenDocument, changed, options) {
  if (!isPrimaryGM()) return;
  if (!("x" in (changed ?? {})) && !("y" in (changed ?? {})) && !("elevation" in (changed ?? {}))) return;

  const key = coordinateOriginKey(tokenDocument);
  const origin = pendingCoordinateOrigins.get(key);
  pendingCoordinateOrigins.delete(key);
  if (!origin) return;

  const destination = {
    x: Number(tokenDocument.x),
    y: Number(tokenDocument.y),
    elevation: Number(tokenDocument.elevation ?? 0),
  };
  const destinationKey = movementDestinationKey(tokenDocument, destination);
  const method = String(options?.movement?.method ?? options?.method ?? "updateToken").toLowerCase();

  window.setTimeout(() => {
    if (destinationWasProcessed(destinationKey)) return;
    if (IGNORED_MOVEMENT_METHODS.has(method)) return;

    const combatant = combatantForToken(tokenDocument);
    if (!combatant) return;
    const spaces = movementSpacesFromPositions(tokenDocument, origin, destination);
    rememberProcessedDestination(destinationKey);
    recordMovementForCombatant(combatant, spaces, `updateToken:${method}`).catch((error) =>
      console.error(`[${SYSTEM_ID}] Turn Tracker coordinate fallback failed`, error)
    );
  }, COORDINATE_FALLBACK_DELAY_MS);
}

function hasOwnPath(changes, path) {
  if (!changes || typeof changes !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(changes, path)) return true;
  return foundry.utils.hasProperty(changes, path);
}

function combatantChangeAffectsPopup(changes = {}) {
  return (
    ["name", "initiative", "defeated", "hidden", "tokenId", "actorId"].some((key) => key in changes) ||
    hasOwnPath(changes, `flags.${SYSTEM_ID}.${FLAG_KEY}`) ||
    hasOwnPath(changes, `flags.${SYSTEM_ID}.${INITIATIVE_RESOLUTION_FLAG}`)
  );
}

function combatChangeAffectsPopup(changes = {}) {
  return (
    ["turn", "round", "active", "started", "name"].some((key) => key in changes) ||
    hasOwnPath(changes, `flags.${SYSTEM_ID}.${INITIATIVE_PHASE_FLAG}`)
  );
}

Hooks.on("getSceneControlButtons", (controls) => {
  if (game.system?.id !== SYSTEM_ID || !controls) return;

  // Foundry v14 expects utility buttons to be SceneControlTools. Adding a
  // top-level SceneControl without an active tool deactivates the Token layer,
  // making the canvas appear frozen. Keep the Tokens control active and add a
  // true button tool instead.
  const tokenControl =
    controls.tokens ??
    Object.values(controls).find((control) => control?.name === "tokens");
  if (!tokenControl) return;

  tokenControl.tools ??= {};
  const orders = Object.values(tokenControl.tools)
    .map((tool) => Number(tool?.order))
    .filter(Number.isFinite);
  const order = orders.length ? Math.max(...orders) + 1 : 100;

  tokenControl.tools[SCENE_TOOL_NAME] = {
    name: SCENE_TOOL_NAME,
    title: "Abrir Controle de Turno",
    icon: "fa-solid fa-stopwatch",
    order,
    button: true,
    visible: true,
    onChange: () => showPopup(true),
  };
});

Hooks.once("ready", () => {
  if (game.system?.id !== SYSTEM_ID) return;

  game.multiverseD616 = game.multiverseD616 ?? {};
  game.multiverseD616.turnTracker = {
    trackItemUse,
    getState: stateFor,
    reset: (combatant) => requestUpdate(combatant, { operation: "reset" }),
    resolveInitiative: requestInitiativeResolution,
    openWindow: () => showPopup(true),
    closeWindow: () => showPopup(false),
  };

  game.socket.on(SOCKET_NAME, handleSocket);

  ensurePopup();
  showPopup(windowState.open !== false);
  window.addEventListener("resize", () => clampWindowGeometry(document.getElementById(POPUP_ID)));

  resetActiveCombatant(game.combat).catch((error) =>
    console.error(`[${SYSTEM_ID}] Turn Tracker initial reset failed`, error)
  );

  const phase = initiativePhase(game.combat);
  if (phase) {
    window.setTimeout(() => {
      showInitiativePrompt(game.combat, phase.promptId).catch((error) =>
        console.error(`[${SYSTEM_ID}] Turn Tracker ready initiative prompt failed`, error)
      );
    }, 500);
  }
});

Hooks.on("updateCombatant", (combatant, changed) => {
  if (combatantChangeAffectsPopup(changed)) schedulePopupRender();
  if ("initiative" in (changed ?? {})) {
    maybeStartCombatAfterInitiative(combatant?.combat ?? game.combat).catch((error) =>
      console.error(`[${SYSTEM_ID}] Initiative completion check failed`, error)
    );
  }
});
Hooks.on("createCombatant", (combatant) => {
  schedulePopupRender({ force: true });
  const combat = combatant?.combat ?? game.combat;
  const phase = initiativePhase(combat);
  if (isPrimaryGM() && phase) {
    window.setTimeout(() => {
      broadcastInitiativePrompts(combat, phase.promptId).catch((error) =>
        console.error(`[${SYSTEM_ID}] Initiative prompt refresh failed`, error)
      );
    }, 150);
  }
});
Hooks.on("deleteCombatant", (combatant) => {
  schedulePopupRender({ force: true });
  maybeStartCombatAfterInitiative(combatant?.combat ?? game.combat).catch((error) =>
    console.error(`[${SYSTEM_ID}] Initiative completion after delete failed`, error)
  );
});
Hooks.on("createCombat", () => schedulePopupRender({ force: true }));
Hooks.on("deleteCombat", () => schedulePopupRender({ force: true }));
Hooks.on("combatStart", (combat) => {
  initiativePromptOpenKey = "";
  resetActiveCombatant(combat).catch((error) =>
    console.error(`[${SYSTEM_ID}] Turn Tracker combat start failed`, error)
  );
  schedulePopupRender({ force: true, immediate: true });
});
Hooks.on("updateCombat", (combat, changed) => {
  if (!combatChangeAffectsPopup(changed)) return;
  if ("turn" in changed || "round" in changed || "active" in changed || "started" in changed) {
    resetActiveCombatant(combat).catch((error) =>
      console.error(`[${SYSTEM_ID}] Turn Tracker turn reset failed`, error)
    );
  }
  schedulePopupRender();
});
Hooks.on("preUpdateToken", captureCoordinateOrigin);
Hooks.on("updateToken", scheduleCoordinateMovementFallback);
Hooks.on("moveToken", (tokenDocument, movement, operation, user) => {
  trackTokenMovement(tokenDocument, movement, operation, user).catch((error) =>
    console.error(`[${SYSTEM_ID}] Turn Tracker movement failed`, error)
  );
});
