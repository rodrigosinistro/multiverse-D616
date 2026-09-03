/**
 * Multiverse-D616 — Concentration tracker
 * - When using an Item with duration "Concentration/Concentração", increase condition up to Actor Rank (cap 6).
 * - Uses the system conditions installed into CONFIG.statusEffects:
 *   mmrpg.concentration.1 .. mmrpg.concentration.6
 * - When at max, prompts in chat (SIM/NÃO). SIM asks which active Power will be replaced; NÃO cancels the use.
 */
const MODULE_ID = "multiverse-d616";

function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDurationFromItem(item) {
  // system.duration can vary; cover common shapes
  const sys = item?.system ?? {};
  const v =
    sys.duration?.value ??
    sys.duration?.type ??
    sys.duration?.label ??
    sys.duration ??
    item?.duration?.value ??
    item?.duration?.type ??
    item?.duration ??
    "";
  return v;
}

export function itemHasConcentration(item) {
  const d = norm(getDurationFromItem(item));
  return d.includes("concentracao") || d.includes("concentration");
}

export function getActorRank(actor) {
  const raw =
    actor?.system?.attributes?.rank?.value ??
    actor?.system?.attributes?.rank ??
    actor?.system?.rank ??
    actor?.system?.rank?.value ??
    1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const COND_PREFIX = "mmrpg.concentration.";
const COND_MAX = 6;
export const CONCENTRATION_POWER_PREFIX = "mmrpg.concentration-power.";

const internalOperations = new Map();
const actorQueues = new Map();

function actorKey(actor) {
  return String(actor?.uuid ?? actor?.id ?? "");
}

function isInternalOperation(actor) {
  return (internalOperations.get(actorKey(actor)) ?? 0) > 0;
}

async function runInternalOperation(actor, operation) {
  const key = actorKey(actor);
  internalOperations.set(key, (internalOperations.get(key) ?? 0) + 1);
  try {
    return await operation();
  } finally {
    const remaining = (internalOperations.get(key) ?? 1) - 1;
    if (remaining > 0) internalOperations.set(key, remaining);
    else internalOperations.delete(key);
  }
}

function queueActorOperation(actor, operation) {
  const key = actorKey(actor);
  const previous = actorQueues.get(key) ?? Promise.resolve();
  const queued = previous
    .catch(() => undefined)
    .then(operation)
    .catch((error) =>
      console.error(`[${MODULE_ID}] Failed to synchronize Concentration effects`, error)
    )
    .finally(() => {
      if (actorQueues.get(key) === queued) actorQueues.delete(key);
    });
  actorQueues.set(key, queued);
  return queued;
}

function effectStatusIds(effect) {
  const statuses = effect?.statuses;
  if (statuses instanceof Set) return Array.from(statuses, String);
  if (Array.isArray(statuses)) return statuses.map(String);
  return [];
}

function concentrationPowerFlags(effect) {
  return effect?.flags?.[MODULE_ID]?.concentrationPower ?? null;
}

export function isConcentrationPowerEffect(effect) {
  const flags = concentrationPowerFlags(effect);
  return Boolean(
    flags?.transient === true ||
    String(flags?.statusId ?? "").startsWith(CONCENTRATION_POWER_PREFIX) ||
    effectStatusIds(effect).some((id) => id.startsWith(CONCENTRATION_POWER_PREFIX))
  );
}

function isConcentrationLevelEffect(effect) {
  return effectStatusIds(effect).some((id) => id.startsWith(COND_PREFIX));
}

function concentrationPowerStatusId(item) {
  const documentId = String(item?.id ?? item?._id ?? "").trim();
  if (documentId) return `${CONCENTRATION_POWER_PREFIX}${documentId}`;
  const slug = norm(item?.name)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "power";
  return `${CONCENTRATION_POWER_PREFIX}${slug}`;
}

export function getConcentrationPowerEffects(actor, { activeOnly = false } = {}) {
  return Array.from(actor?.effects ?? []).filter((effect) =>
    isConcentrationPowerEffect(effect) && (!activeOnly || !effect?.disabled)
  );
}

function findConcentrationPowerEffect(actor, item) {
  const statusId = concentrationPowerStatusId(item);
  const itemId = String(item?.id ?? item?._id ?? "");
  return getConcentrationPowerEffects(actor).find((effect) => {
    const flags = concentrationPowerFlags(effect);
    return (
      (itemId && String(flags?.itemId ?? "") === itemId) ||
      String(flags?.statusId ?? "") === statusId ||
      effectStatusIds(effect).includes(statusId)
    );
  }) ?? null;
}

/**
 * AutoAnimations stores each Item's custom animation under flags.autoanimations.
 * A Power maintained by Concentration is represented by a separate transient
 * ActiveEffect, so copy the AutoAnimations namespace to that effect. This lets
 * AutoAnimations play the Power's own persistent/on-token configuration when
 * the effect is created and stop it when that effect is removed.
 */
function getAutoAnimationsFlags(item) {
  const flags = item?.flags?.autoanimations;
  if (!flags || typeof flags !== "object") return null;

  try {
    return foundry.utils.deepClone(flags);
  } catch (_error) {
    try {
      return structuredClone(flags);
    } catch (_cloneError) {
      return { ...flags };
    }
  }
}

function concentrationPowerEffectData(item, countsTowardLevel) {
  const statusId = concentrationPowerStatusId(item);
  const description = String(item?.system?.description ?? "").trim();
  const flags = {
    transient: true,
    statusId,
    itemId: String(item?.id ?? item?._id ?? ""),
    itemUuid: String(item?.uuid ?? ""),
    description: description || "Power mantido por Concentração.",
    countsTowardLevel: countsTowardLevel !== false,
  };

  const effectFlags = {
    [MODULE_ID]: { concentrationPower: flags },
  };

  const autoAnimationsFlags = getAutoAnimationsFlags(item);
  if (autoAnimationsFlags) effectFlags.autoanimations = autoAnimationsFlags;

  return {
    name: item?.name ?? "Power em Concentração",
    img: item?.img || `systems/${MODULE_ID}/icons/m.svg`,
    disabled: false,
    changes: [],
    statuses: [statusId],
    flags: effectFlags,
  };
}

export async function createOrRefreshConcentrationPowerEffect(
  actor,
  item,
  { countsTowardLevel = true, forceCountsTowardLevel = false } = {}
) {
  if (!actor?.createEmbeddedDocuments || !item) return null;
  const existing = findConcentrationPowerEffect(actor, item);
  const existingCounts = concentrationPowerFlags(existing)?.countsTowardLevel;
  const data = concentrationPowerEffectData(
    item,
    forceCountsTowardLevel
      ? countsTowardLevel
      : (existingCounts === undefined ? countsTowardLevel : existingCounts)
  );
  if (existing?.id && actor?.updateEmbeddedDocuments) {
    const updateData = { _id: existing.id, ...data };

    // If the Power no longer has an AutoAnimations customization, clear an old
    // copied configuration from the existing transient ActiveEffect.
    if (!getAutoAnimationsFlags(item) && existing?.flags?.autoanimations) {
      updateData["flags.-=autoanimations"] = null;
    }

    return actor.updateEmbeddedDocuments("ActiveEffect", [updateData]);
  }
  return actor.createEmbeddedDocuments("ActiveEffect", [data]);
}

export async function deleteConcentrationPowerEffects(actor) {
  if (!actor?.deleteEmbeddedDocuments) return [];
  const ids = getConcentrationPowerEffects(actor)
    .map((effect) => effect.id)
    .filter(Boolean);
  if (!ids.length) return [];
  return actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

export function getConcentrationLevel(actor) {
  // Prefer actor.statuses (derived from active effects)
  try {
    const statuses = Array.from(actor?.statuses ?? []);
    let best = 0;
    for (const sid of statuses) {
      if (typeof sid !== "string") continue;
      if (!sid.startsWith(COND_PREFIX)) continue;
      const n = Number(sid.slice(COND_PREFIX.length));
      if (Number.isFinite(n) && n > best) best = n;
    }
    if (best > 0) return best;
  } catch (_e) {}

  // Fallback: scan active effects
  const effects = actor?.effects ?? [];
  let best = 0;
  for (const ef of effects) {
    if (ef?.disabled) continue;
    const st = ef?.statuses ? Array.from(ef.statuses) : [];
    for (const sid of st) {
      if (typeof sid !== "string") continue;
      if (!sid.startsWith(COND_PREFIX)) continue;
      const n = Number(sid.slice(COND_PREFIX.length));
      if (Number.isFinite(n) && n > best) best = n;
    }
  }
  return best;
}

async function toggleStatus(actor, statusId, active) {
  // Prefer actor.toggleStatusEffect
  try {
    if (actor?.toggleStatusEffect) return await actor.toggleStatusEffect(statusId, { active });
  } catch (_e) {}

  // Fallback: try token document / token
  try {
    const tok = actor?.getActiveTokens?.(true, true)?.[0];
    if (tok?.document?.toggleStatusEffect) return await tok.document.toggleStatusEffect(statusId, { active });
    if (tok?.toggleStatusEffect) return await tok.toggleStatusEffect(statusId, { active });
  } catch (_e) {}

  // Last resort: create/delete ActiveEffect manually
  try {
    if (!active) {
      const ids = actor.effects
        .filter((e) => !e.disabled && e.statuses?.has?.(statusId))
        .map((e) => e.id);
      if (ids.length) return await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
      return;
    }
    // active=true
    const statuses = CONFIG.statusEffects ?? {};
    const se = Array.isArray(statuses)
      ? statuses.find((entry) => entry?.id === statusId)
      : statuses[statusId];
    const name = se?.label ?? statusId;
    const icon = se?.icon ?? se?.img ?? "icons/svg/aura.svg";
    return await actor.createEmbeddedDocuments("ActiveEffect", [{
      name,
      icon,
      disabled: false,
      statuses: [statusId]
    }]);
  } catch (e) {
    console.error(`[${MODULE_ID}] Failed to toggle status ${statusId}`, e);
  }
}

async function clearConcentrationLevels(actor) {
  const ids = [];
  for (let i = 1; i <= COND_MAX; i++) ids.push(`${COND_PREFIX}${i}`);
  for (const sid of ids) await toggleStatus(actor, sid, false);
}

export async function clearConcentration(actor) {
  if (!actor) return;
  await runInternalOperation(actor, async () => {
    await clearConcentrationLevels(actor);
    await deleteConcentrationPowerEffects(actor);
  });
}

export async function setConcentrationLevel(actor, level) {
  if (!actor) return;
  const max = Math.min(getActorRank(actor), COND_MAX);
  const lvl = Math.max(0, Math.min(Number(level) || 0, max));
  await runInternalOperation(actor, async () => {
    // Changing Concentração 1 → 2 (or the reverse) removes the old generic
    // status but must preserve every Power-specific transient effect.
    await clearConcentrationLevels(actor);
    if (lvl > 0) await toggleStatus(actor, `${COND_PREFIX}${lvl}`, true);
  });
}

async function onConcentrationEffectDeleted(effect) {
  const actor = effect?.parent;
  if (!actor || isInternalOperation(actor)) return;

  if (isConcentrationLevelEffect(effect)) {
    // Removing the generic Concentração condition means concentration ended.
    // Delete every Power-specific transient effect in the same operation.
    await runInternalOperation(actor, () => deleteConcentrationPowerEffects(actor));
    return;
  }

  if (!isConcentrationPowerEffect(effect)) return;
  const countsTowardLevel = concentrationPowerFlags(effect)?.countsTowardLevel !== false;
  if (!countsTowardLevel) return;
  const current = getConcentrationLevel(actor);
  await setConcentrationLevel(actor, Math.max(0, current - 1));
}

export function registerConcentrationEffectHooks() {
  Hooks.on("deleteActiveEffect", (effect, _options, userId) => {
    const actor = effect?.parent;
    if (!actor || isInternalOperation(actor)) return;

    // Foundry broadcasts document hooks to every connected client. Only the
    // client that actually initiated the deletion may perform the follow-up
    // Concentration synchronization. Without this guard, a GM and a player
    // can both try to remove/update the same Active Effects, producing stale
    // document errors such as "ActiveEffect ... does not exist" and
    // "undefined id ... does not exist in EmbeddedCollection".
    //
    // userId is supplied by Foundry v14 for document hooks. Keep a defensive
    // fallback for calls/tests where it is absent.
    if (userId && game.user?.id && userId !== game.user.id) return;

    void queueActorOperation(actor, () => onConcentrationEffectDeleted(effect));
  });
}

/**
 * Chat prompts used when Concentration is already full.
 * The message is whispered to the character owners and GMs. A response from
 * any of those users is relayed to the client that started the Power use, so
 * both GM and player can answer the prompt.
 */
const pending = new Map();
const pendingMutations = new Map();
const CONCENTRATION_SOCKET = `system.${MODULE_ID}`;
const CONCENTRATION_SOCKET_SCOPE = "m616-concentration";
const CONCENTRATION_MUTATION_TIMEOUT_MS = 12000;

function escapeHtml(value) {
  const text = String(value ?? "");
  try {
    if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(text);
  } catch (_e) {}
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function concentrationWhisperRecipients(actor) {
  const owners = game.users
    .filter((u) => actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
    .map((u) => u.id);
  const gm = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  return Array.from(new Set([game.user.id, ...owners, ...gm]));
}

function canUserAnswerConcentrationPrompt(actor, user) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  try {
    return actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  } catch (_e) {
    return false;
  }
}

function primaryActiveGM() {
  return game.users?.find?.((user) => user.active && user.isGM) ?? null;
}

function isPrimaryActiveGM() {
  return primaryActiveGM()?.id === game.user?.id;
}

async function resolveUuidDocument(uuid) {
  if (!uuid) return null;
  try {
    if (typeof fromUuidSync === "function") {
      const doc = fromUuidSync(uuid);
      if (doc) return doc;
    }
  } catch (_e) {}
  try {
    if (typeof fromUuid === "function") return await fromUuid(uuid);
  } catch (_e) {}
  return null;
}

function concentrationMutationRequestId() {
  try {
    const random = foundry?.utils?.randomID?.(16);
    if (random) return `${game.user?.id ?? "user"}-${random}`;
  } catch (_e) {}
  return `${game.user?.id ?? "user"}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function finalizeConcentrationPrompt(messageId, value, responseLabel, responderId) {
  const entry = pending.get(messageId);
  if (!entry) return false;

  const responder = game.users?.get?.(responderId);
  if (responder && !canUserAnswerConcentrationPrompt(entry.actor, responder)) return false;

  pending.delete(messageId);
  const message = game.messages?.get?.(messageId);
  if (message) {
    const safeLabel = escapeHtml(responseLabel || "Escolha registrada");
    const safeUser = responder?.name ? ` por ${escapeHtml(responder.name)}` : "";
    try {
      await message.update({
        content: `${entry.baseContent}<p style="margin-top:6px;"><i>${safeLabel}${safeUser}</i></p>`,
        [`flags.${MODULE_ID}.resolved`]: true,
      });
    } catch (_e) {}
  }

  entry.resolve(value);
  return true;
}

function emitConcentrationPromptResponse(messageId, value, responseLabel) {
  game.socket.emit(CONCENTRATION_SOCKET, {
    scope: CONCENTRATION_SOCKET_SCOPE,
    type: "PROMPT_RESPONSE",
    messageId,
    value,
    responseLabel,
    responderId: game.user?.id,
  });
}

function registerConcentrationSocket() {
  const g = (game.multiverseD616 = game.multiverseD616 || {});
  if (g._concentrationSocketRegistered) return;
  g._concentrationSocketRegistered = true;

  game.socket.on(CONCENTRATION_SOCKET, (data) => {
    if (!data || data.scope !== CONCENTRATION_SOCKET_SCOPE) return;

    if (data.type === "PROMPT_RESPONSE") {
      void finalizeConcentrationPrompt(
        data.messageId,
        data.value,
        data.responseLabel,
        data.responderId
      );
      return;
    }

    if (data.type === "MUTATION_REQUEST") {
      if (!isPrimaryActiveGM()) return;
      void (async () => {
        let ok = false;
        let error = "";
        try {
          await applyConcentrationMutationRequest(data);
          ok = true;
        } catch (mutationError) {
          error = String(mutationError?.message ?? mutationError ?? "Falha desconhecida");
          console.error(`[${MODULE_ID}] Concentration GM mutation failed`, mutationError);
        }

        game.socket.emit(CONCENTRATION_SOCKET, {
          scope: CONCENTRATION_SOCKET_SCOPE,
          type: "MUTATION_RESULT",
          requestId: data.requestId,
          requesterId: data.requesterId,
          ok,
          error,
        });
      })();
      return;
    }

    if (data.type === "MUTATION_RESULT") {
      if (data.requesterId !== game.user?.id) return;
      const entry = pendingMutations.get(data.requestId);
      if (!entry) return;
      pendingMutations.delete(data.requestId);
      window.clearTimeout(entry.timeout);
      if (data.ok) entry.resolve(true);
      else entry.reject(new Error(data.error || "Falha ao sincronizar a troca de Concentração."));
    }
  });
}

async function createConcentrationPrompt(actor, { type, content, responseMap }) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const whisper = concentrationWhisperRecipients(actor);
  const msg = await ChatMessage.create({
    speaker,
    content,
    whisper,
    flags: {
      [MODULE_ID]: {
        type,
        actorUuid: actor.uuid,
        resolved: false,
      },
    },
  });

  return new Promise((resolve) => pending.set(msg.id, {
    resolve,
    actor,
    type,
    baseContent: content,
    responseMap,
  }));
}

async function postMaxPrompt(actor, sourceName, current, max) {
  const content = `
  <div class="m616-card m616-conc-max">
    <p><b>${escapeHtml(actor.name)}</b> já está no máximo de <b>Concentração</b> (<b>${current}</b>).</p>
    <p>Você quer continuar usando <b>${escapeHtml(sourceName)}</b> mesmo assim?</p>
    <div class="m616-buttons" style="display:flex; gap:6px; margin-top:6px;">
      <button data-m616-action="yes">SIM</button>
      <button data-m616-action="no">NÃO</button>
    </div>
  </div>`;

  return createConcentrationPrompt(actor, {
    type: "concMaxPrompt",
    content,
    responseMap: {
      yes: { value: true, label: "Escolha: SIM" },
      no: { value: false, label: "Escolha: NÃO" },
    },
  });
}

function concentrationPowerCreatedTime(effect, fallbackIndex = 0) {
  const raw =
    effect?._stats?.createdTime ??
    effect?._source?._stats?.createdTime ??
    effect?.flags?.core?.sourceId ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : (Number.MAX_SAFE_INTEGER - 1000 + fallbackIndex);
}

function getReplacementCandidates(actor, item) {
  const currentItemId = String(item?.id ?? item?._id ?? "");
  return getConcentrationPowerEffects(actor, { activeOnly: true })
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect }) => {
      const flags = concentrationPowerFlags(effect);
      if (flags?.countsTowardLevel === false) return false;
      if (currentItemId && String(flags?.itemId ?? "") === currentItemId) return false;
      return true;
    })
    .sort((a, b) =>
      concentrationPowerCreatedTime(a.effect, a.index) - concentrationPowerCreatedTime(b.effect, b.index)
    )
    .map(({ effect }) => effect);
}

async function postReplacementPrompt(actor, item, candidates) {
  if (!candidates.length) return null;

  const buttons = candidates.map((effect, index) => {
    const oldest = index === 0 ? ' <small style="opacity:.75;">(mais antiga)</small>' : "";
    return `<button data-m616-action="replace" data-effect-id="${escapeHtml(effect.id)}" style="text-align:left;">${escapeHtml(effect.name)}${oldest}</button>`;
  }).join("");

  const content = `
  <div class="m616-card m616-conc-replace">
    <p><b>${escapeHtml(actor.name)}</b> precisa encerrar uma Concentração para usar <b>${escapeHtml(item?.name ?? "o novo Power")}</b>.</p>
    <p>Qual Power será substituído pela nova Concentração?</p>
    <div class="m616-buttons" style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
      ${buttons}
      <button data-m616-action="cancel">CANCELAR</button>
    </div>
  </div>`;

  const responseMap = {
    cancel: { value: null, label: "Troca cancelada" },
  };
  for (const effect of candidates) {
    responseMap[`replace:${effect.id}`] = {
      value: effect.id,
      label: `Escolha: substituir ${effect.name}`,
    };
  }

  return createConcentrationPrompt(actor, {
    type: "concReplacePrompt",
    content,
    responseMap,
  });
}

async function replaceConcentrationPowerLocal(actor, item, effectToReplace) {
  if (!actor?.deleteEmbeddedDocuments || !effectToReplace?.id) {
    throw new Error("Concentration replacement effect is unavailable.");
  }

  const existingNewEffect = findConcentrationPowerEffect(actor, item);
  const previousCounts = concentrationPowerFlags(existingNewEffect)?.countsTowardLevel;
  let resultingEffectId = existingNewEffect?.id ?? null;

  try {
    await runInternalOperation(actor, async () => {
      await createOrRefreshConcentrationPowerEffect(actor, item, {
        countsTowardLevel: true,
        forceCountsTowardLevel: true,
      });
      const resultingEffect = findConcentrationPowerEffect(actor, item);
      resultingEffectId = resultingEffect?.id ?? resultingEffectId;

      if (!resultingEffect?.id) {
        throw new Error("The new Concentration Power effect was not created.");
      }
      if (resultingEffect.id === effectToReplace.id) {
        throw new Error("The new and replaced Concentration effects are the same document.");
      }

      await actor.deleteEmbeddedDocuments("ActiveEffect", [effectToReplace.id]);
    });
  } catch (error) {
    // Best-effort rollback. The old effect is deleted only after the new one is
    // ready, so the common failure path preserves the original Concentration.
    try {
      await runInternalOperation(actor, async () => {
        if (existingNewEffect?.id && previousCounts === false) {
          await existingNewEffect.update({
            [`flags.${MODULE_ID}.concentrationPower.countsTowardLevel`]: false,
          });
        } else if (!existingNewEffect?.id && resultingEffectId) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", [resultingEffectId]);
        }
      });
    } catch (_rollbackError) {}
    throw error;
  }
}

async function applyConcentrationMutationRequest(data) {
  const requestingUser = game.users?.get?.(data?.requesterId);
  const actor = await resolveUuidDocument(data?.actorUuid);
  if (!requestingUser || !actor || !canUserAnswerConcentrationPrompt(actor, requestingUser)) {
    throw new Error("Usuário sem permissão para alterar a Concentração deste personagem.");
  }

  if (data.operation !== "REPLACE_POWER") {
    throw new Error(`Operação de Concentração desconhecida: ${data.operation ?? "?"}`);
  }

  let item = await resolveUuidDocument(data.itemUuid);
  if (!item && data.itemId) item = actor.items?.get?.(data.itemId) ?? null;
  const effect = actor.effects?.get?.(data.effectId) ??
    Array.from(actor.effects ?? []).find((candidate) => candidate.id === data.effectId) ?? null;
  if (!item || !effect) {
    throw new Error("O Power ou a Concentração escolhida não está mais disponível.");
  }

  await replaceConcentrationPowerLocal(actor, item, effect);
  return true;
}

async function replaceConcentrationPower(actor, item, effectToReplace) {
  const gm = primaryActiveGM();

  // GMs execute locally. If no GM is connected, preserve the previous owner
  // behavior as a fallback so a solo player-owned world is not blocked.
  if (game.user?.isGM || !gm) {
    return replaceConcentrationPowerLocal(actor, item, effectToReplace);
  }

  const requestId = concentrationMutationRequestId();
  const payload = {
    scope: CONCENTRATION_SOCKET_SCOPE,
    type: "MUTATION_REQUEST",
    requestId,
    requesterId: game.user?.id,
    operation: "REPLACE_POWER",
    actorUuid: actor?.uuid,
    itemUuid: item?.uuid,
    itemId: String(item?.id ?? item?._id ?? ""),
    effectId: effectToReplace?.id,
  };

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingMutations.delete(requestId);
      reject(new Error("O Mestre não respondeu à solicitação de troca de Concentração a tempo."));
    }, CONCENTRATION_MUTATION_TIMEOUT_MS);

    pendingMutations.set(requestId, { resolve, reject, timeout });
    game.socket.emit(CONCENTRATION_SOCKET, payload);
  });
}

export function registerConcentrationChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const type = message.getFlag(MODULE_ID, "type");
    if (type !== "concMaxPrompt" && type !== "concReplacePrompt") return;
    if (message.getFlag(MODULE_ID, "resolved")) return;

    const actorUuid = message.getFlag(MODULE_ID, "actorUuid");
    let actor = null;
    try {
      if (actorUuid && typeof fromUuidSync === "function") actor = fromUuidSync(actorUuid);
    } catch (_e) {}
    if (actor && !canUserAnswerConcentrationPrompt(actor, game.user)) return;

    const buttons = html.querySelectorAll("button[data-m616-action]");
    for (const button of buttons) {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (button.disabled) return;

        const action = button.dataset.m616Action;
        let key = action;
        if (action === "replace") key = `replace:${button.dataset.effectId ?? ""}`;

        const entry = pending.get(message.id);
        const responseMap = entry?.responseMap;
        let response = responseMap?.[key];

        // Remote clients do not own the pending Promise, so reconstruct the
        // response directly from the rendered button/flags.
        if (!response) {
          if (key === "yes") response = { value: true, label: "Escolha: SIM" };
          else if (key === "no") response = { value: false, label: "Escolha: NÃO" };
          else if (key === "cancel") response = { value: null, label: "Troca cancelada" };
          else if (action === "replace") {
            response = {
              value: button.dataset.effectId ?? null,
              label: `Escolha: substituir ${button.textContent?.replace("(mais antiga)", "").trim() || "Power"}`,
            };
          }
        }
        if (!response) return;

        for (const other of buttons) other.disabled = true;

        if (entry) {
          void finalizeConcentrationPrompt(
            message.id,
            response.value,
            response.label,
            game.user?.id
          );
        } else {
          emitConcentrationPromptResponse(message.id, response.value, response.label);
        }
      });
    }
  });
}

/**
 * Entry point called at the beginning of Item.roll()
 * @returns {Promise<boolean>} true to continue, false to cancel
 */
export async function handleConcentrationOnUse(actor, item) {
  if (!actor || !item) return true;
  if (!itemHasConcentration(item)) return true;

  const max = Math.min(getActorRank(actor), COND_MAX);
  const cur = getConcentrationLevel(actor);
  const existing = findConcentrationPowerEffect(actor, item);
  const existingCounts = concentrationPowerFlags(existing)?.countsTowardLevel;

  // Reusing a Power that already occupies a valid Concentration slot refreshes
  // its name, icon, Description and AutoAnimations without consuming a slot.
  if (existing && existingCounts !== false) {
    await createOrRefreshConcentrationPowerEffect(actor, item);
    return true;
  }

  if (cur >= max) {
    const ok = await postMaxPrompt(actor, item?.name ?? "ação", cur, max);
    if (!ok) return false;

    const candidates = getReplacementCandidates(actor, item);
    if (!candidates.length) {
      ui.notifications.warn(
        `${actor.name} está no limite de Concentração, mas nenhum Power ativo foi encontrado para substituir.`
      );
      return false;
    }

    const selectedEffectId = await postReplacementPrompt(actor, item, candidates);
    if (!selectedEffectId) return false;

    const selectedEffect = candidates.find((effect) => effect.id === selectedEffectId);
    if (!selectedEffect) {
      ui.notifications.warn("A Concentração escolhida não está mais ativa.");
      return false;
    }

    try {
      await replaceConcentrationPower(actor, item, selectedEffect);
      return true;
    } catch (error) {
      console.error(`[${MODULE_ID}] Failed to replace the Concentration Power effect`, error);
      ui.notifications.error(
        `Não foi possível substituir ${selectedEffect.name} por ${item?.name ?? "o novo Power"}.`
      );
      return false;
    }
  }

  // Below the Rank limit, the new Power simply occupies the next slot.
  await setConcentrationLevel(actor, cur + 1);
  try {
    await createOrRefreshConcentrationPowerEffect(actor, item, {
      countsTowardLevel: true,
      forceCountsTowardLevel: true,
    });
    return true;
  } catch (error) {
    await setConcentrationLevel(actor, cur);
    console.error(`[${MODULE_ID}] Failed to create the Concentration Power effect`, error);
    ui.notifications.error(
      `Não foi possível criar a condição de Concentração para ${item?.name ?? "o Power"}.`
    );
    return false;
  }
}

// auto-register hooks
Hooks.once("init", () => {
  registerConcentrationChatHooks();
  registerConcentrationEffectHooks();
});

Hooks.once("ready", () => {
  registerConcentrationSocket();
});
