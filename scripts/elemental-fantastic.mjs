import { automationEnabled } from './automation-settings.mjs';
import { POWER_GRABBED_STATUS } from './power-grabbed.mjs';
const SYSTEM_ID = "multiverse-d616";
const FLAG_KEY = "elementalFantastic";
// Foundry v14: ALWAYS=2. A custom effect with no native duration would
// otherwise use CONDITIONAL=1 and lose its Token overlay icon.
const ALWAYS_SHOW_EFFECT_ICON = 2;

/**
 * Automation metadata for Elemental Control Fantastic effects.
 * The descriptive text follows the system's existing MULTIVERSE_D616.elements table.
 * Where a matching D616 condition exists, it is applied automatically.
 */
export const ELEMENTAL_FANTASTIC_RULES = Object.freeze({
  plants: {
    label: "Plants",
    text: "O alvo fica Agarrado.",
    statusId: POWER_GRABBED_STATUS,
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

/**
 * Foundry v14 registers temporary ActiveEffects for expiry. It may queue a
 * duration.expired update on the same turn that a system hook runs. Do not
 * delete its document while that update is still in flight (stale _id error).
 * A manually dismissed custom effect is instead disabled; it is reusable.
 */
export async function retireElementalFantasticEffect(actor, effect) {
  if (!actor || !effect?.id) return false;
  const current = (actor.effects?.get?.(effect.id)) ??
    (actor.effects?.contents ?? Array.from(actor.effects ?? [])).find(e => e?.id === effect.id);
  const flag = effectFlag(current);
  if (!current || !flag?.custom || flag.source !== "fantastic" || current.disabled || current.duration?.expired === true) return false;
  await current.update({ disabled: true });
  return true;
}

/** Locate the caster, not the affected target, as the expiration anchor.
 * Prioritize the exact token in the attack card (linked actors may have
 * several combatants). A document whose author cannot be resolved is never
 * assigned silently to the character who happens to have the current turn.
 */
export function findElementalSourceCombatant(combat, speaker = null, actorUuid = null) {
  const combatants = Array.from(combat?.combatants?.contents ?? combat?.combatants ?? []);
  const scene = speaker?.scene ?? null;
  const token = speaker?.token ?? null;
  if (token) {
    const exact = combatants.find(c => c.tokenId === token && (!scene || !c.sceneId || c.sceneId === scene));
    if (exact) return exact.id;
  }
  const sourceActorId = String(actorUuid ?? speaker?.actor ?? '').split('.').at(-1);
  if (!sourceActorId) return null;
  const matches = combatants.filter(c => c.actorId === sourceActorId || c.actor?.id === sourceActorId || c.actor?.uuid === actorUuid);
  return matches.length === 1 ? matches[0].id : null;
}

/** When reusing a dismissed effect, reset the v14 combat-based clock too. */
export function currentElementalEffectStart(combat = globalThis.game?.combat, worldTime = globalThis.game?.time?.worldTime) {
  const active = combat?.combatant;
  const numericOrNull = v => v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  return {
    time: Number(worldTime) || 0,
    combat: combat?.id ?? null,
    combatant: active?.id ?? null,
    initiative: numericOrNull(active?.initiative),
    round: numericOrNull(combat?.round),
    turn: numericOrNull(combat?.turn),
  };
}

export async function replaceElementalEffect(actor, rule, metadata = {}) {
  if (!actor || !rule || rule.noteOnly) return null;

  const allEffects = actor.effects?.contents ?? Array.from(actor.effects ?? []);
  const existingOwned = allEffects.filter((effect) => {
    const flag = effectFlag(effect);
    return flag?.element === metadata.key && flag?.source === "fantastic";
  });

  const combat = game.combat?.started ? game.combat : null;
  const sourceCombatantId = findElementalSourceCombatant(combat, metadata.sourceSpeaker, metadata.sourceActorUuid);
  const flagData = {
    [SYSTEM_ID]: {
      [FLAG_KEY]: {
        source: "fantastic",
        element: metadata.key,
        custom: rule.custom ?? null,
        sourceMessageId: metadata.sourceMessageId ?? null,
        sourceActorUuid: metadata.sourceActorUuid ?? null,
        appliedRound: combat?.round ?? null,
        appliedTurn: combat?.turn ?? null,
        combatId: combat?.id ?? null,
        sourceCombatantId,
        rounds: Number(rule.rounds ?? 0) || 0,
      },
    },
  };

  // Earth/Force have no native timer. Foundry's round timer expires on the
  // victim's next turn, but D616's "1 rodada" must end when the attacker's
  // turn returns. The D616 combat hook owns this exact expiration instead.
  if (rule.custom) {
    const reusable = existingOwned.find(effect => effectFlag(effect)?.custom === rule.custom);
    if (reusable) {
      await reusable.update({
        name: effectName(rule),
        img: rule.icon ?? "systems/multiverse-d616/icons/four-elements.svg",
        disabled: false,
        statuses: [],
        showIcon: ALWAYS_SHOW_EFFECT_ICON,
        duration: buildDuration(null),
        start: currentElementalEffectStart(),
        flags: flagData,
      });
      // Older builds may have left duplicate custom effects. Deactivate the
      // redundant records (do not delete registry-tracked documents).
      for (const other of existingOwned) {
        if (other.id !== reusable.id && !other.disabled && other.duration?.expired !== true)
          await other.update({ disabled: true });
      }
      return reusable;
    }
  }

  // Native statuses still use their existing replacement logic. Custom
  // effects never enter this deletion path.
  if (existingOwned.length && !rule.custom) {
    try {
      await actor.deleteEmbeddedDocuments("ActiveEffect", existingOwned.map(effect => effect.id));
    } catch (error) {
      console.warn(`[${SYSTEM_ID}] Could not refresh existing elemental effect`, error);
    }
  }

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

  // Old custom versions with the same element must not remain active when
  // the effect definition changes between system versions.
  if (rule.custom) {
    for (const old of existingOwned) {
      if (!old.disabled && old.duration?.expired !== true) await old.update({ disabled: true });
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
    ...(rule.custom ? { showIcon: ALWAYS_SHOW_EFFECT_ICON } : {}),
    duration: buildDuration(rule.custom ? null : rule.rounds),
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

export async function applyElementalFantasticFromDamageMessage(message, action = "full", blockedTargetUuids = new Set()) {
  if (!automationEnabled('elementalEffects') || !message || action === "heal") return [];

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
  // v0.2.15: these four powers are reconciled by the roll-condition engine
  // after the GM confirms damage, preventing double M statuses.
  if (['Elemental Prison','Elemental Sphere','Elemental Suffocation','Elemental Push'].includes(
    sourceMessage?.getFlag?.(SYSTEM_ID,'advancedElemental')?.name)) return [];
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
    if (blockedTargetUuids.has(entry.targetUuid)) continue;
    const targetKey = entry.actorUuid || entry.targetUuid;
    if (!targetKey || already.has(targetKey)) continue;
    const actor = await resolveActor(entry);
    if (!actor) continue;

    try {
      await replaceElementalEffect(actor, rule, {
        key: meta.key,
        sourceMessageId: message.id,
        sourceActorUuid: (sourceMessage?.speaker?.actor ?? message.speaker?.actor)
          ? `Actor.${sourceMessage?.speaker?.actor ?? message.speaker.actor}` : null,
        sourceSpeaker: sourceMessage?.speaker ?? message.speaker ?? null,
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

/** True only when the next turn of the caster has actually begun.
 * Native Foundry v14 ActiveEffect duration math is intentionally NOT used for
 * Earth/Force: a duration of one round can expire when the target acts first.
 */
export function shouldExpireElementalFantasticEffect(effect, combat) {
  const data = effectFlag(effect);
  if (!combat || !data || data.source !== 'fantastic' || !data.custom ||
      !Number.isFinite(Number(data.rounds)) || Number(data.rounds) <= 0 ||
      !Number.isFinite(Number(data.appliedRound)) || data.appliedRound == null) return false;
  if (data.combatId && data.combatId !== combat.id) return false;
  const now = Number(combat.round);
  const applied = Number(data.appliedRound);
  // Also protects against a GM rewinding initiative / combat rounds.
  if (!Number.isFinite(now) || now <= applied || !combat.combatant) return false;
  const currentId = combat.combatant.id;
  const sourceId = data.sourceCombatantId ?? findElementalSourceCombatant(
    combat, null, data.sourceActorUuid
  );
  if (sourceId) {
    const stillHere = Array.from(combat.combatants?.contents ?? combat.combatants ?? [])
      .some(combatant => combatant.id === sourceId);
    // If the caster left initiative, do not leave an immortal effect.
    return !stillHere || currentId === sourceId && now >= applied + Number(data.rounds);
  }
  // Never guess that the target is the source. Without an identifiable caster,
  // an active effect stays until GM removal, rather than vanishing too early.
  return false;
}

// An updateCombat hook may be delivered more than once by the socket/GM. Only
// one update to a given ActiveEffect can be pending at a time.
const expiringCustomIds = new Set();
export async function cleanupExpiredElementalEffects(combat) {
  if (!isPrimaryGM() || !combat) return;
  const actors = new Set();
  for (const combatant of combat.combatants?.contents ?? combat.combatants ?? []) {
    if (combatant?.actor) actors.add(combatant.actor);
  }
  for (const actor of actors) {
    for (const effect of actor.effects?.contents ?? Array.from(actor.effects ?? [])) {
      const data = effectFlag(effect);
      if (!data?.custom || data.source !== 'fantastic' || effect.disabled || effect.duration?.expired === true) continue;
      if (!shouldExpireElementalFantasticEffect(effect, combat)) continue;
      const key = `${actor.uuid ?? actor.id ?? ''}:${effect.id}`;
      if (expiringCustomIds.has(key)) continue;
      expiringCustomIds.add(key);
      try { await retireElementalFantasticEffect(actor, effect); }
      catch (error) { console.warn(`[${SYSTEM_ID}] Failed to expire elemental effect`, error); }
      finally { expiringCustomIds.delete(key); }
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
