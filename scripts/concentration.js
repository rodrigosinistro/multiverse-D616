/**
 * Multiverse-D616 — Concentration tracker
 * - When using an Item with duration "Concentration/Concentração", increase condition up to Actor Rank (cap 6).
 * - Uses the system conditions installed into CONFIG.statusEffects:
 *   mmrpg.concentration.1 .. mmrpg.concentration.6
 * - When at max, prompts in chat (SIM/NÃO). SIM keeps max; NÃO cancels the use.
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
  return {
    name: item?.name ?? "Power em Concentração",
    img: item?.img || `systems/${MODULE_ID}/icons/m.svg`,
    disabled: false,
    changes: [],
    statuses: [statusId],
    flags: { [MODULE_ID]: { concentrationPower: flags } },
  };
}

export async function createOrRefreshConcentrationPowerEffect(
  actor,
  item,
  { countsTowardLevel = true } = {}
) {
  if (!actor?.createEmbeddedDocuments || !item) return null;
  const existing = findConcentrationPowerEffect(actor, item);
  const existingCounts = concentrationPowerFlags(existing)?.countsTowardLevel;
  const data = concentrationPowerEffectData(
    item,
    existingCounts === undefined ? countsTowardLevel : existingCounts
  );
  if (existing?.id && actor?.updateEmbeddedDocuments) {
    return actor.updateEmbeddedDocuments("ActiveEffect", [
      { _id: existing.id, ...data },
    ]);
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
  Hooks.on("deleteActiveEffect", (effect) => {
    const actor = effect?.parent;
    if (!actor || isInternalOperation(actor)) return;
    void queueActorOperation(actor, () => onConcentrationEffectDeleted(effect));
  });
}

/**
 * Prompt in chat when already at max Concentration.
 */
const pending = new Map();

async function postMaxPrompt(actor, sourceName, current, max) {
  const speaker = ChatMessage.getSpeaker({ actor });

  // whisper to owners + GM + current user to avoid table noise
  const owners = game.users
    .filter((u) => actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
    .map((u) => u.id);
  const gm = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  const whisper = Array.from(new Set([game.user.id, ...owners, ...gm]));

  const content = `
  <div class="m616-card m616-conc-max">
    <p><b>${actor.name}</b> já está no máximo de <b>Concentração</b> (<b>${current}</b>).</p>
    <p>Você quer continuar usando <b>${sourceName}</b> mesmo assim?</p>
    <div class="m616-buttons" style="display:flex; gap:6px; margin-top:6px;">
      <button data-m616-action="yes">SIM</button>
      <button data-m616-action="no">NÃO</button>
    </div>
  </div>`;

  const msg = await ChatMessage.create({
    speaker,
    content,
    whisper,
    flags: { [MODULE_ID]: { type: "concMaxPrompt" } }
  });

  return new Promise((resolve) => pending.set(msg.id, resolve));
}

export function registerConcentrationChatHooks() {
  // Foundry v13: prefer renderChatMessageHTML
  Hooks.on("renderChatMessageHTML", (message, html) => {
    if (message.getFlag(MODULE_ID, "type") !== "concMaxPrompt") return;
    const resolve = pending.get(message.id);
    if (!resolve) return;

    const yes = html.querySelector('button[data-m616-action="yes"]');
    const no = html.querySelector('button[data-m616-action="no"]');
    if (!yes || !no) return;

    const finalize = async (val) => {
      pending.delete(message.id);
      yes.disabled = true;
      no.disabled = true;

      const chosen = val ? "SIM" : "NÃO";
      try {
        await message.update({ content: `${message.content}<p style="margin-top:6px;"><i>Escolha: ${chosen}</i></p>` });
      } catch (_e) {}
      resolve(val);
    };

    yes.addEventListener("click", (ev) => { ev.preventDefault(); finalize(true); });
    no.addEventListener("click", (ev) => { ev.preventDefault(); finalize(false); });
  });
}

/**
 * Entry point called at the beginning of Item.roll()
 * @returns {Promise<boolean>} true to continue, false to cancel
 */
export async function handleConcentrationOnUse(actor, item) {
  if (!actor || !item) return true;
  if (!itemHasConcentration(item)) return true;

  // Reusing the same Power refreshes its name, icon and Description without
  // consuming another Concentration slot or creating a duplicate condition.
  if (findConcentrationPowerEffect(actor, item)) {
    await createOrRefreshConcentrationPowerEffect(actor, item);
    return true;
  }

  const max = Math.min(getActorRank(actor), COND_MAX);
  const cur = getConcentrationLevel(actor);
  const countsTowardLevel = cur < max;

  if (cur >= max) {
    const ok = await postMaxPrompt(actor, item?.name ?? "ação", cur, max);
    if (!ok) return false;
  }

  if (countsTowardLevel) await setConcentrationLevel(actor, cur + 1);
  try {
    await createOrRefreshConcentrationPowerEffect(actor, item, { countsTowardLevel });
    return true;
  } catch (error) {
    if (countsTowardLevel) await setConcentrationLevel(actor, cur);
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
