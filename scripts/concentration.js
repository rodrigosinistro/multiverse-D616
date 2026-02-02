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
    const se = (CONFIG.statusEffects || []).find((x) => x.id === statusId);
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

export async function clearConcentration(actor) {
  const ids = [];
  for (let i = 1; i <= COND_MAX; i++) ids.push(`${COND_PREFIX}${i}`);
  for (const sid of ids) await toggleStatus(actor, sid, false);
}

export async function setConcentrationLevel(actor, level) {
  const max = Math.min(getActorRank(actor), COND_MAX);
  const lvl = Math.max(1, Math.min(Number(level) || 1, max));
  await clearConcentration(actor);
  await toggleStatus(actor, `${COND_PREFIX}${lvl}`, true);
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

  const max = Math.min(getActorRank(actor), COND_MAX);
  const cur = getConcentrationLevel(actor);

  if (cur >= max) {
    const ok = await postMaxPrompt(actor, item?.name ?? "ação", cur, max);
    return !!ok;
  }

  await setConcentrationLevel(actor, cur + 1);
  return true;
}

// auto-register hooks
Hooks.once("init", () => registerConcentrationChatHooks());
