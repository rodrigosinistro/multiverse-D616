const SYSTEM_ID = "multiverse-d616";
const SHIELD_THROWN_STATUS = "mmrpg.shield-thrown";
const SHIELD_THROWN_FLAG = "shieldThrown";
const SHIELD_BEARER_SET = "shield bearer";
const HURLED_SHIELD_POWERS = new Set([
  "hurled shield bash",
  "hurled shield block",
  "hurled shield deflection",
  "rico-shield",
]);


function isPrimaryGM() {
  const gm = game.users?.find?.((user) => user.active && user.isGM);
  return !!gm && gm.id === game.user?.id;
}

function norm(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function actorHasStatus(actor, statusId) {
  try {
    if (actor?.statuses?.has?.(statusId)) return true;
  } catch (_) {}
  return Array.from(actor?.effects ?? []).some(
    (effect) => !effect?.disabled && Array.from(effect?.statuses ?? []).includes(statusId)
  );
}

function findStatusEffect(actor, statusId) {
  return Array.from(actor?.effects ?? []).find(
    (effect) => Array.from(effect?.statuses ?? []).includes(statusId)
  ) ?? null;
}

export function isShieldBearerPower(item) {
  return item?.type === "power" && norm(item?.system?.powerSet) === SHIELD_BEARER_SET;
}

export function isHurledShieldPower(item) {
  return isShieldBearerPower(item) && HURLED_SHIELD_POWERS.has(norm(item?.name));
}

export function canUseShieldBearerPower(actor, item, { notify = true } = {}) {
  if (!actor || !isShieldBearerPower(item)) return true;
  if (!actorHasStatus(actor, SHIELD_THROWN_STATUS)) return true;
  if (notify) {
    ui.notifications?.warn?.(
      `${actor.name} está sem o escudo. Ele retorna no início do próximo turno do personagem.`
    );
  }
  return false;
}

function shieldProtectionEffects(actor) {
  const refs = [];
  for (const item of actor?.items ?? []) {
    if (!isShieldBearerPower(item)) continue;
    for (const effect of item?.effects ?? []) {
      if (effect?.disabled) continue;
      const grantsShieldDR = Array.from(effect?.changes ?? []).some(
        (change) => String(change?.key ?? "") === "system.healthDamageReduction"
      );
      if (!grantsShieldDR) continue;
      refs.push({ itemId: item.id, effectId: effect.id });
    }
  }
  return refs;
}

async function disableShieldProtectionEffects(actor) {
  const refs = shieldProtectionEffects(actor);
  const grouped = new Map();
  for (const ref of refs) {
    if (!grouped.has(ref.itemId)) grouped.set(ref.itemId, []);
    grouped.get(ref.itemId).push({ _id: ref.effectId, disabled: true });
  }
  for (const [itemId, updates] of grouped) {
    const item = actor?.items?.get?.(itemId);
    if (!item?.updateEmbeddedDocuments || !updates.length) continue;
    await item.updateEmbeddedDocuments("ActiveEffect", updates);
  }
  return refs;
}

async function restoreShieldProtectionEffects(actor, refs = []) {
  const grouped = new Map();
  for (const ref of refs ?? []) {
    if (!ref?.itemId || !ref?.effectId) continue;
    if (!grouped.has(ref.itemId)) grouped.set(ref.itemId, []);
    grouped.get(ref.itemId).push({ _id: ref.effectId, disabled: false });
  }
  for (const [itemId, updates] of grouped) {
    const item = actor?.items?.get?.(itemId);
    if (!item?.updateEmbeddedDocuments || !updates.length) continue;
    const valid = updates.filter((u) => item.effects?.get?.(u._id));
    if (valid.length) await item.updateEmbeddedDocuments("ActiveEffect", valid);
  }
}

async function toggleStatus(actor, statusId, active) {
  if (!actor) return null;
  if (actor.toggleStatusEffect) {
    await actor.toggleStatusEffect(statusId, { active });
    return findStatusEffect(actor, statusId);
  }
  return null;
}

function combatantForActor(actor, combat = game.combat) {
  if (!actor || !combat) return null;
  const combatants = Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []);
  const tokenId = actor?.token?.id ?? actor?.token?._id ?? null;
  if (tokenId) {
    const byToken = combatants.find((c) => (c.tokenId ?? c.token?.id) === tokenId);
    if (byToken) return byToken;
  }
  const exact = combatants.find((c) => {
    const candidate = c.actor ?? c.token?.actor ?? null;
    return candidate === actor || (candidate?.uuid && actor?.uuid && candidate.uuid === actor.uuid);
  });
  if (exact) return exact;
  const byId = combatants.filter((c) => (c.actor ?? c.token?.actor)?.id === actor.id);
  return byId.length === 1 ? byId[0] : byId.find((c) => c.id === combat.combatant?.id) ?? null;
}

export async function markShieldThrown(actor, item) {
  if (!actor || !isHurledShieldPower(item)) return false;
  if (actorHasStatus(actor, SHIELD_THROWN_STATUS)) return true;

  // The updated Shield Bearer timing is a combat-turn rule. Outside an active
  // combat there is no reliable "next turn" to track, so do not leave the
  // character permanently locked out of their shield powers.
  const combat = game.combat;
  const combatant = combatantForActor(actor, combat);
  if (!combat?.started || !combatant) return false;

  const disabledEffects = await disableShieldProtectionEffects(actor);
  await toggleStatus(actor, SHIELD_THROWN_STATUS, true);
  const effect = findStatusEffect(actor, SHIELD_THROWN_STATUS);
  if (!effect) {
    await restoreShieldProtectionEffects(actor, disabledEffects);
    return false;
  }

  const inBonusRound = !!game.multiverseD616?.turnTracker?.isBonusRound?.();
  await effect.setFlag(SYSTEM_ID, SHIELD_THROWN_FLAG, {
    itemId: item.id,
    itemUuid: item.uuid,
    combatId: combat?.id ?? null,
    combatantId: combatant?.id ?? null,
    thrownRound: Number(combat?.round ?? 0),
    thrownTurn: Number(combat?.turn ?? -1),
    thrownInBonusRound: inBonusRound,
    disabledEffects,
    createdAt: Date.now(),
  });

  ui.notifications?.info?.(
    `${actor.name} arremessou o escudo. Ele retorna no início do próximo turno do personagem.`
  );
  return true;
}

async function restoreFromShieldThrownEffect(effect) {
  const actor = effect?.parent;
  if (!actor) return;
  const data = effect?.getFlag?.(SYSTEM_ID, SHIELD_THROWN_FLAG) ??
    effect?.flags?.[SYSTEM_ID]?.[SHIELD_THROWN_FLAG] ?? {};
  await restoreShieldProtectionEffects(actor, data.disabledEffects ?? []);
}

async function returnShieldForActiveCombatant(combat) {
  if (!combat?.started || !isPrimaryGM()) return;
  const combatant = combat.combatant;
  const actor = combatant?.actor ?? combatant?.token?.actor ?? null;
  if (!actor) return;
  const effect = findStatusEffect(actor, SHIELD_THROWN_STATUS);
  if (!effect || effect.disabled) return;
  const data = effect.getFlag?.(SYSTEM_ID, SHIELD_THROWN_FLAG) ?? {};
  if (data.combatId && data.combatId !== combat.id) return;
  if (data.combatantId && data.combatantId !== combatant.id) return;

  const currentInBonusRound = !!game.multiverseD616?.turnTracker?.isBonusRound?.();
  const sameMoment =
    Number(data.thrownRound ?? -999) === Number(combat.round ?? 0) &&
    Number(data.thrownTurn ?? -999) === Number(combat.turn ?? -1) &&
    Boolean(data.thrownInBonusRound) === currentInBonusRound;
  if (sameMoment) return;

  await restoreFromShieldThrownEffect(effect);
  await toggleStatus(actor, SHIELD_THROWN_STATUS, false);
  ui.notifications?.info?.(`O escudo de ${actor.name} retornou.`);
}

export async function maybeRequestUltimateFantastic(actor) {
  const api = game.multiverseD616?.turnTracker?.requestUltimateFantastic;
  if (typeof api !== "function") return false;
  return !!(await api(actor));
}

Hooks.on("deleteActiveEffect", (effect) => {
  if (!Array.from(effect?.statuses ?? []).includes(SHIELD_THROWN_STATUS)) return;
  void restoreFromShieldThrownEffect(effect).catch((error) =>
    console.error(`[${SYSTEM_ID}] Could not restore Shield Bearer protection`, error)
  );
});

Hooks.on("updateActiveEffect", (effect, changes) => {
  if (changes?.disabled !== true) return;
  if (!Array.from(effect?.statuses ?? []).includes(SHIELD_THROWN_STATUS)) return;
  void restoreFromShieldThrownEffect(effect).catch((error) =>
    console.error(`[${SYSTEM_ID}] Could not restore Shield Bearer protection`, error)
  );
});

Hooks.on("updateCombat", (combat, changed) => {
  if (!("turn" in (changed ?? {}) || "round" in (changed ?? {}) || "started" in (changed ?? {}))) return;
  void returnShieldForActiveCombatant(combat).catch((error) =>
    console.error(`[${SYSTEM_ID}] Could not return thrown shield`, error)
  );
});

Hooks.on("combatStart", (combat) => {
  void returnShieldForActiveCombatant(combat).catch((error) =>
    console.error(`[${SYSTEM_ID}] Could not check thrown shield on combat start`, error)
  );
});
