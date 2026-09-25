const SYSTEM_ID = "multiverse-d616";
const FLAG_KEY = "elementalFantastic";

/**
 * Automation metadata for Elemental Control Fantastic effects.
 * The descriptive text follows the system's existing MULTIVERSE_D616.elements table.
 * Where a matching D616 condition exists, it is applied automatically.
 */
export const ELEMENTAL_FANTASTIC_RULES = Object.freeze({
  plants: {
    label: "Plants",
    text: "O alvo fica Agarrado.",
    statusId: "mmrpg.grabbed",
    icon: "systems/multiverse-d616/icons/statuses/grappled.svg",
  },
  air: {
    label: "Air",
    text: "O alvo fica Caído por 1 rodada.",
    statusId: "mmrpg.prone",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/prone.svg",
  },
  earth: {
    label: "Earth",
    text: "O alvo se move com metade da velocidade por 1 rodada.",
    custom: "halfMovement",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/four-elements.svg",
  },
  electricity: {
    label: "Electricity",
    text: "O alvo fica Atordoado por 1 rodada.",
    statusId: "mmrpg.stunned",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/stunned.svg",
  },
  energy: {
    label: "Energy",
    text: "O alvo fica Cego por 1 rodada.",
    statusId: "mmrpg.blinded",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/blinded.svg",
  },
  fire: {
    label: "Fire",
    text: "O alvo fica Em Chamas.",
    statusId: "mmrpg.ablaze",
    icon: "systems/multiverse-d616/icons/four-elements.svg",
  },
  force: {
    label: "Force",
    text: "O alvo sofre Trouble em todas as ações por 1 rodada.",
    custom: "forceTrouble",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/four-elements.svg",
  },
  hellfire: {
    label: "Hellfire",
    text: "O dano deve ser dividido igualmente entre Health e Focus.",
    noteOnly: true,
    icon: "systems/multiverse-d616/icons/four-elements.svg",
  },
  ice: {
    label: "Ice",
    text: "O alvo fica Paralisado por 1 rodada.",
    statusId: "mmrpg.paralyzed",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/paralyzed.svg",
  },
  iron: {
    label: "Iron",
    text: "O alvo fica Imobilizado por 1 rodada.",
    statusId: "mmrpg.pinned",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/restrained.svg",
  },
  sound: {
    label: "Sound",
    text: "O alvo fica Surdo por 1 rodada.",
    statusId: "mmrpg.deafened",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/deafened.svg",
  },
  water: {
    label: "Water",
    text: "O alvo fica Surpreso até o fim da próxima rodada.",
    statusId: "mmrpg.surprised",
    rounds: 1,
    icon: "systems/multiverse-d616/icons/statuses/surprised.svg",
  },
  toxin: {
    label: "Toxin",
    text: "O alvo fica Envenenado.",
    statusId: "mmrpg.poisoned",
    icon: "systems/multiverse-d616/icons/statuses/poisoned.svg",
  },
  chemical: {
    label: "Chemical",
    text: "O alvo fica Corroído.",
    statusId: "mmrpg.corroding",
    icon: "systems/multiverse-d616/icons/four-elements.svg",
  },
  swarm: {
    label: "Swarm",
    text: "O alvo fica Amedrontado.",
    statusId: "mmrpg.frightened",
    icon: "systems/multiverse-d616/icons/statuses/frightened.svg",
  },
});

function normalizeElement(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function getElementalFantasticRule(element) {
  return ELEMENTAL_FANTASTIC_RULES[normalizeElement(element)] ?? null;
}

export function getElementalFantasticMetadata(item, actor = item?.actor ?? null) {
  if (!item?.system?.isElemental) return null;

  // Elemental Control powers may either override the element on the power itself
  // or inherit the character's Default Element. The actor fallback is important
  // for compendium powers, whose system.element is intentionally blank.
  const itemElement = normalizeElement(item.system.element);
  const actorElement = normalizeElement(actor?.system?.defaultElement);
  const key = itemElement || actorElement;
  if (!key) return null;

  const rule = getElementalFantasticRule(key);
  if (!rule) return null;
  return {
    key,
    label: rule.label,
    text: rule.text,
    automated: !rule.noteOnly,
    elementSource: itemElement ? "power" : "actor",
  };
}

function effectFlag(effect) {
  try {
    return effect?.getFlag?.(SYSTEM_ID, FLAG_KEY) ?? effect?.flags?.[SYSTEM_ID]?.[FLAG_KEY] ?? null;
  } catch (_error) {
    return effect?.flags?.[SYSTEM_ID]?.[FLAG_KEY] ?? null;
  }
}

function effectIsActive(effect) {
  if (!effect || effect.disabled) return false;
  if (effect.duration?.expired === true) return false;
  return true;
}

export function actorHasElementalCustomEffect(actor, custom) {
  if (!actor || !custom) return false;
  const effects = actor.effects?.contents ?? (actor.effects ? Array.from(actor.effects) : []);
  return effects.some((effect) => {
    if (!effectIsActive(effect)) return false;
    const flag = effectFlag(effect);
    return flag?.custom === custom;
  });
}

export function hasElementalHalfMovement(actor) {
  return actorHasElementalCustomEffect(actor, "halfMovement");
}

export function hasElementalForceTrouble(actor) {
  return actorHasElementalCustomEffect(actor, "forceTrouble");
}

/**
 * Merge an existing item Edge/Trouble mode with the temporary Force elemental effect.
 * One Edge cancels one Trouble, otherwise Trouble applies.
 */
export function getElementalEdgeMode(actor, item = null) {
  const configured = String(item?.system?.attackEdgeMode ?? "").trim().toLowerCase();
  let mode = configured === "edge" ? 1 : configured === "trouble" ? -1 : 0;

  if (hasElementalForceTrouble(actor)) {
    if (mode > 0) mode = 0;
    else mode = -1;
  }
  return mode;
}

function buildDuration(rounds) {
  if (!rounds) {
    return { value: null, units: "seconds", expiry: null, expired: false };
  }
  return { value: Number(rounds), units: "rounds", expiry: null, expired: false };
}

function effectName(rule) {
  if (rule.statusId) return `Elemental — ${rule.label}: ${rule.text}`;
  return `Elemental — ${rule.label}`;
}

async function replaceElementalEffect(actor, rule, metadata = {}) {
  if (!actor || !rule || rule.noteOnly) return null;

  const allEffects = actor.effects?.contents ?? Array.from(actor.effects ?? []);
  const existingOwned = allEffects.filter((effect) => {
    const flag = effectFlag(effect);
    return flag?.element === metadata.key && flag?.source === "fantastic";
  });
  if (existingOwned.length) {
    try {
      await actor.deleteEmbeddedDocuments("ActiveEffect", existingOwned.map((effect) => effect.id));
    } catch (error) {
      console.warn(`[${SYSTEM_ID}] Could not refresh existing elemental effect`, error);
    }
  }

  const flagData = {
    [SYSTEM_ID]: {
      [FLAG_KEY]: {
        source: "fantastic",
        element: metadata.key,
        custom: rule.custom ?? null,
        sourceMessageId: metadata.sourceMessageId ?? null,
        sourceActorUuid: metadata.sourceActorUuid ?? null,
        appliedRound: game.combat?.round ?? null,
        appliedTurn: game.combat?.turn ?? null,
        rounds: Number(rule.rounds ?? 0) || 0,
      },
    },
  };

  // Prefer Foundry's native status API for actual D616 conditions. This uses
  // CONFIG.statusEffects (installed by conditions-hud.js) and is the same path
  // used by the token HUD, so it works for linked and synthetic Token Actors.
  if (rule.statusId && typeof actor.toggleStatusEffect === "function") {
    const alreadyActive = actor.statuses?.has?.(rule.statusId) ?? false;
    if (!alreadyActive) {
      try {
        await actor.toggleStatusEffect(rule.statusId, { active: true });
      } catch (error) {
        console.warn(`[${SYSTEM_ID}] Native status application failed for ${rule.statusId}; using ActiveEffect fallback`, error);
      }
    }

    const effect = (actor.effects?.contents ?? Array.from(actor.effects ?? [])).find((candidate) =>
      candidate?.statuses?.has?.(rule.statusId) ||
      Array.from(candidate?.statuses ?? []).includes(rule.statusId) ||
      candidate?.getFlag?.("core", "statusId") === rule.statusId
    );

    if (effect) {
      // Do not take ownership of a pre-existing status: only stamp our flags when
      // this automation created it. This prevents expiration logic from removing
      // a condition the target already had for another reason.
      if (!alreadyActive) {
        const update = { flags: flagData };
        if (rule.rounds) update.duration = buildDuration(rule.rounds);
        try {
          await effect.update(update);
        } catch (error) {
          console.debug(`[${SYSTEM_ID}] Could not add duration metadata to ${rule.statusId}`, error);
        }
      }
      return effect;
    }
  }

  // Fallback and custom elemental effects (Earth / Force). Keep this payload
  // deliberately core-compatible; no custom ActiveEffect DataModel is required.
  const data = {
    name: effectName(rule),
    img: rule.icon ?? "systems/multiverse-d616/icons/four-elements.svg",
    disabled: false,
    transfer: false,
    statuses: rule.statusId ? [rule.statusId] : [],
    duration: buildDuration(rule.rounds),
    flags: flagData,
  };

  const created = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  return created?.[0] ?? null;
}

async function resolveActor(ref = {}) {
  const candidates = [ref.actorUuid, ref.targetUuid, ref.uuid].filter(Boolean);
  for (const uuid of candidates) {
    try {
      const doc = await fromUuid(uuid);
      const actor = doc?.actor ?? (doc?.documentName === "Actor" ? doc : null);
      if (actor) return actor;
    } catch (_error) {
      // Try the next reference.
    }
  }
  return null;
}

export async function applyElementalFantasticFromDamageMessage(message, action = "full") {
  if (!message || action === "heal") return [];

  const scoped = message.flags?.[SYSTEM_ID] ?? {};
  let meta = message.getFlag?.(SYSTEM_ID, "elementalFantastic") ?? scoped.elementalFantastic ?? null;
  let damageApplication =
    message.getFlag?.(SYSTEM_ID, "damageApplication") ??
    scoped.damageApplication ??
    {};

  // Damage cards point back to the attack card. Recover metadata from the
  // source message as a safety net for legacy/Edge-updated cards.
  const sourceMessageId =
    message.getFlag?.(SYSTEM_ID, "sourceMessageId") ??
    scoped.sourceMessageId ??
    damageApplication.sourceMessageId ??
    null;
  const sourceMessage = sourceMessageId ? game.messages?.get?.(sourceMessageId) : null;
  if (!meta?.key && sourceMessage) {
    meta = sourceMessage.getFlag?.(SYSTEM_ID, "elementalFantastic") ?? null;
  }
  if (!damageApplication?.isFantastic && sourceMessage) {
    // Do not guess Fantastic from flavor text; the attack message roll itself is
    // authoritative. This handles damage cards created from retro Edge/Trouble.
    const sourceRoll = sourceMessage.rolls?.[0];
    const firstTerm = sourceRoll?.terms?.[0];
    const pool =
      firstTerm instanceof foundry.dice.terms.ParentheticalTerm
        ? firstTerm.roll?.terms?.[0]
        : firstTerm;
    const marvelDie = pool?.rolls?.[1]?.terms?.find?.(
      (term) => term instanceof game.MarvelMultiverse.dice.MarvelDie
    );
    const active = marvelDie?.results?.filter((r) => r.active && !r.discarded) ?? [];
    if (active.some((r) => Number(r.result) === 1)) {
      damageApplication = { ...damageApplication, isFantastic: true };
    }
  }

  if (!meta?.key) return [];
  const rule = getElementalFantasticRule(meta.key);
  if (!rule || rule.noteOnly) return [];

  if (!damageApplication.isFantastic) return [];

  const entries = Array.isArray(damageApplication.entries) ? damageApplication.entries : [];
  if (!entries.length) return [];

  const already = new Set(
    Array.isArray(scoped.elementalFantasticAppliedTargets)
      ? scoped.elementalFantasticAppliedTargets
      : []
  );

  const applied = [];
  for (const entry of entries) {
    const targetKey = entry.actorUuid || entry.targetUuid;
    if (!targetKey || already.has(targetKey)) continue;
    const actor = await resolveActor(entry);
    if (!actor) continue;

    try {
      await replaceElementalEffect(actor, rule, {
        key: meta.key,
        sourceMessageId: message.id,
        sourceActorUuid: message.speaker?.actor ? `Actor.${message.speaker.actor}` : null,
      });
      applied.push({ actor, targetKey, rule });
      already.add(targetKey);
    } catch (error) {
      console.error(`[${SYSTEM_ID}] Failed to apply ${meta.key} Fantastic effect to ${actor.name}`, error);
    }
  }

  if (applied.length && message.setFlag) {
    try {
      await message.setFlag(SYSTEM_ID, "elementalFantasticAppliedTargets", Array.from(already));
    } catch (error) {
      console.warn(`[${SYSTEM_ID}] Could not persist elemental application marker`, error);
    }
  }

  return applied;
}

export async function postElementalFantasticConfirmation(message, applied = []) {
  if (!applied.length) return;
  const meta = message?.flags?.[SYSTEM_ID]?.elementalFantastic;
  const rule = getElementalFantasticRule(meta?.key);
  if (!rule) return;

  const names = applied.map(({ actor }) => foundry.utils.escapeHTML(actor.name ?? "Alvo")).join(", ");
  await ChatMessage.create({
    content: `<div class="m616-elemental-confirm"><b>EFEITO ELEMENTAL — ${foundry.utils.escapeHTML(rule.label.toUpperCase())}</b><br>${foundry.utils.escapeHTML(rule.text)}<br><span>${names}</span></div>`,
  });
}

function isPrimaryGM() {
  const activeGM = game.users?.find?.((user) => user.active && user.isGM);
  return activeGM ? activeGM.id === game.user?.id : !!game.user?.isGM;
}

async function cleanupExpiredElementalEffects(combat) {
  if (!isPrimaryGM() || !combat) return;
  const actors = new Set();
  for (const combatant of combat.combatants ?? []) {
    if (combatant?.actor) actors.add(combatant.actor);
  }

  for (const actor of actors) {
    const expiredIds = [];
    for (const effect of actor.effects?.contents ?? []) {
      const flag = effectFlag(effect);
      if (!flag || flag.source !== "fantastic") continue;
      const duration = effect.duration;
      if (duration?.expired === true || (Number.isFinite(duration?.remaining) && duration.remaining <= 0)) {
        expiredIds.push(effect.id);
      }
    }
    if (expiredIds.length) {
      try {
        await actor.deleteEmbeddedDocuments("ActiveEffect", expiredIds);
      } catch (error) {
        console.warn(`[${SYSTEM_ID}] Failed to remove expired elemental effects`, error);
      }
    }
  }
}

let hooksRegistered = false;
export function registerElementalFantasticHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  Hooks.on("updateCombat", (combat, changed) => {
    if (!("turn" in (changed ?? {}) || "round" in (changed ?? {}))) return;
    setTimeout(() => cleanupExpiredElementalEffects(combat), 0);
  });
}
