import { effectiveTeamDamageReduction } from './team-maneuvers-effects.mjs';
import {hurledShieldDamageForEntry,consumeHurledShield} from './native-power-hurled-shield.mjs';
import { scrollCombatChatToResult } from './combat-chat-scroll.mjs';
import { installPlayerCombatChatAutoScroll } from './combat-chat-player-scroll.mjs';
import { calculateD616Damage } from "./damage-calculation.js";
import {damageCardStillCurrent, rollSignature} from "./multi-target-combat.mjs";
import {combatChatPublicResolution} from "./combat-chat-v164.mjs";
import { confirmRepeatedAttackDamage, confirmStoppingPowerDamage, confirmHitNRunDamage, confirmHeldHellfireHealthDamage } from "./repeat-power-attacks.mjs";
import { confirmRicoShieldDamage } from "./rico-shield-chain.mjs";
import { confirmBrainDrain } from './native-priority-lot1.mjs';
import { confirmLeechLife } from './native-priority-lot4.mjs';
import {armExploitFromDamage,postExploitSpecial,canceledCatchEntry} from './native-priority-lot2.mjs';
import { confirmFaltineDamage } from './ongoing-power-effects.mjs';
import { confirmPowerDamageFromCard, getMarvelOutcome } from "./power-conditions.mjs";
import { confirmCustomTargetDamageFromCard } from "./custom-automations.mjs";
import {tryAbsorbHealthDamage} from './energy-absorption-custom.mjs';
import { activeElementalGuards, selectGuard, selectElementalDefense, assessGuardHit, damageAfterGuardProtection, consumeGuard, guardTargetDefense, findCrossingElementalBarrier } from "./elemental-shields.mjs";
import { applyElementalFantasticFromDamageMessage, eligibleElementalDamageResults, postElementalFantasticConfirmation } from "./elemental-fantastic.mjs";
import {reinforcementOption,commitReinforcement,infusionEligibleTargets} from './native-priority-lot5.mjs';
import {eligibleRetroactiveReinforcement,holdReinforcementGuard} from './reinforcement-after-damage.mjs';

const MODULE_ID = "multiverse-d616";
const MMDR_VER = "1.0.0";
const NO_EXCESS_PROTECTION_DAMAGE = 'noExcessProtectionDamage';

/** Safe default for worlds created before this setting existed. World-scoped,
 * read on GM damage confirmation, never from an attacker's client flag. */
function noExcessProtectionDamage(){
  try { return game.settings.get(MODULE_ID,NO_EXCESS_PROTECTION_DAMAGE)!==false; }
  catch (_error){return true;}
}

/* ---------------- Settings / Debug ---------------- */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, NO_EXCESS_PROTECTION_DAMAGE, {
    name: "Sem dano Excedente em Proteções",
    hint: "Marcado (padrão): proteções absorvem todo o ataque, mesmo se forem destruídas. Desmarcado: ao ultrapassar o limite de uma proteção, o dano excedente (após a redução de dano aplicável) atinge o personagem. Após o Mestre aplicar o excedente, ative Elemental/Telekinetic Reinforcement no HUD para estornar Health e pagar em Focus (se houver outra Reação).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "debug", {
    name: "Enable debug logs",
    hint: "Prints [MMDR] logs to the console.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

Hooks.once("ready", () => {
  console.log(`[MMDR] v${MMDR_VER} ready`);
  game.multiverseD616 ??= {};
  game.multiverseD616.applyCustomRecurringDamage = applyCustomRecurringDamage;
  game.multiverseD616.applyAttackQuickAction = applyAttackQuickAction;
});

function dbg(...args) {
  try {
    if (game.settings.get(MODULE_ID, "debug")) {
      console.debug("[MMDR]", ...args);
    }
  } catch (_error) {
    // Ignore logging failures.
  }
}

/* ---------------- Target persistence ---------------- */

function normalizeTargetRefs(rawTargets) {
  const targets = Array.isArray(rawTargets) ? rawTargets : [];
  const refs = targets
    .map((target) =>
      typeof target === "string" ? { uuid: target } : { ...target }
    )
    .filter((target) => target?.uuid);

  const byUuid = new Map();
  for (const ref of refs) {
    if (!byUuid.has(ref.uuid)) byUuid.set(ref.uuid, ref);
  }
  return Array.from(byUuid.values());
}

function targetRefsFromFlags(flags = {}) {
  const structuredEntries = Array.isArray(
    flags.damageApplication?.entries
  )
    ? flags.damageApplication.entries
    : [];
  const structuredRefs = structuredEntries
    .map((entry) => ({
      uuid: entry?.targetUuid,
      actorUuid: entry?.actorUuid ?? "",
      name: entry?.name ?? "",
    }))
    .filter((target) => target.uuid);
  if (structuredRefs.length) return normalizeTargetRefs(structuredRefs);

  const savedRefs = normalizeTargetRefs(flags.targets);
  if (savedRefs.length) return savedRefs;

  return normalizeTargetRefs(flags.authorTargets);
}

/**
 * Preserve an authoritative target list on messages created by the local user.
 * Foundry v14 requires changing the pending Document through updateSource.
 */
Hooks.on("preCreateChatMessage", (doc, data, _options, userId) => {
  try {
    if (game.user?.id !== userId) return;

    const scopedFlags = foundry.utils.deepClone(
      doc?.flags?.[MODULE_ID] ?? data?.flags?.[MODULE_ID] ?? {}
    );
    let refs = targetRefsFromFlags(scopedFlags);

    if (!refs.length) {
      refs = normalizeTargetRefs(
        Array.from(game.user?.targets ?? []).map((target) => {
          const tokenDocument = target?.document ?? target;
          const actor = target?.actor ?? tokenDocument?.actor;
          return {
            uuid: tokenDocument?.uuid ?? "",
            actorUuid: actor?.uuid ?? "",
            name:
              target?.name ??
              tokenDocument?.name ??
              actor?.name ??
              "Target",
          };
        })
      );
    }

    if (!refs.length) return;

    scopedFlags.authorUserId ??= userId;
    scopedFlags.authorTargets = refs.map((target) => target.uuid);
    doc.updateSource({
      flags: {
        [MODULE_ID]: scopedFlags,
      },
    });
    dbg("stamped targets", scopedFlags.authorTargets);
  } catch (error) {
    console.warn("[MMDR] preCreateChatMessage error", error);
  }
});

/* ---------------- Data helpers ---------------- */

function getProperty(object, path) {
  return foundry.utils.getProperty(object, path);
}

function setProperty(object, path, value) {
  return foundry.utils.setProperty(object, path, value);
}

function escapeHtml(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}' -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function categoryFromText(text) {
  const value = String(text ?? "").toLowerCase();
  if (
    value.includes("damagetype: focus") ||
    value.includes("damage type: focus") ||
    value.includes("focus damage")
  ) {
    return "focus";
  }
  return "health";
}

function readDamageReduction(actor, category) {
  return effectiveTeamDamageReduction(actor,category);
}

function statPaths(category) {
  return category === "focus"
    ? { current: "system.focus.value", maximum: "system.focus.max" }
    : { current: "system.health.value", maximum: "system.health.max" };
}

async function applyDelta({ actor, category, delta, heal }) {
  const paths = statPaths(category);
  const current = Number(getProperty(actor, paths.current) ?? 0) || 0;
  const maximum = Number(getProperty(actor, paths.maximum) ?? 0) || 0;
  const amount = Math.max(0, Number(delta) || 0);
  const next = heal
    ? Math.min(maximum || Number.MAX_SAFE_INTEGER, current + amount)
    : Math.max(0, current - amount);
  const update = {};
  setProperty(update, paths.current, next);
  await actor.update(update, category==='focus'&&!heal?{d616FocusDamage:true}:{});
}

async function resolveActor(targetUuid, actorUuid = "") {
  for (const uuid of [targetUuid, actorUuid]) {
    if (!uuid) continue;
    try {
      const document = await fromUuid(uuid);
      const actor =
        document?.actor ??
        (document?.documentName === "Actor" ? document : null);
      if (actor) return actor;
    } catch (error) {
      console.warn("[MMDR] Could not resolve UUID", uuid, error);
    }
  }
  return null;
}

function getStructuredEntries(message) {
  const entries =
    message?.flags?.[MODULE_ID]?.damageApplication?.entries ?? [];
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => ({
      targetUuid: String(entry?.targetUuid ?? ""),
      actorUuid: String(entry?.actorUuid ?? ""),
      name: String(entry?.name ?? "Target"),
      category:
        String(entry?.category ?? "").toLowerCase() === "focus"
          ? "focus"
          : "health",
      damage: Math.max(0, Number(entry?.damage ?? 0) || 0),
      rawDamage: Math.max(0, Number(entry?.rawDamage ?? entry?.damage ?? 0) || 0),
      damageReduction: Math.abs(
        Number(entry?.damageReduction ?? 0) || 0
      ),
      originalDamageReduction: Math.max(0, Number(entry?.originalDamageReduction ?? entry?.damageReduction ?? 0) || 0),
      adamantiumIgnored: Math.max(0, Number(entry?.adamantiumIgnored ?? 0) || 0),
      effectiveDamageMultiplier: Math.max(
        0,
        Number(entry?.effectiveDamageMultiplier ?? 0) || 0
      ),
      marvelDie: Number(entry?.marvelDie ?? 0) || 0,
      damageMultiplier: Number(entry?.damageMultiplier ?? 0) || 0,
      abilityDamage: Number(entry?.abilityDamage ?? 0) || 0,
      flatBonus: Number(entry?.flatBonus ?? 0) || 0,
      normalDamage: Math.max(0,Number(entry?.normalDamage ?? 0) || 0),
      fantastic: Boolean(entry?.fantastic),
      damageFactor: Number.isFinite(Number(entry?.damageFactor))?Number(entry.damageFactor):undefined,
      customDamageMultiplier: Number.isFinite(Number(entry?.customDamageMultiplier))?Number(entry.customDamageMultiplier):undefined,
    }))
    .filter((entry) => entry.targetUuid || entry.actorUuid);
}

/* ---------------- Legacy card support ---------------- */

function resolveTokenUuidsFromNames(names) {
  const sceneTokens = canvas?.tokens?.placeables ?? [];
  const result = [];

  for (const rawName of names) {
    const name = normalizeName(rawName);
    if (!name) continue;

    let matches = sceneTokens.filter(
      (token) =>
        normalizeName(token?.document?.name ?? token?.name) === name ||
        normalizeName(token?.actor?.name) === name
    );

    if (!matches.length) {
      const fuzzy = sceneTokens.filter((token) => {
        const tokenName = normalizeName(
          token?.document?.name ?? token?.name
        );
        const actorName = normalizeName(token?.actor?.name);
        return tokenName.includes(name) || actorName.includes(name);
      });
      if (fuzzy.length === 1) matches = fuzzy;
    }

    for (const token of matches) {
      const uuid = token?.document?.uuid;
      if (uuid && !result.includes(uuid)) result.push(uuid);
    }
  }
  return result;
}

function getLegacyEntries(message, rootElement) {
  const flags = message?.flags?.[MODULE_ID] ?? {};
  const savedRefs = targetRefsFromFlags(flags);
  const paragraphs = Array.from(
    rootElement?.querySelectorAll?.(".message-content p") ?? []
  );
  const entries = [];
  const sourceFormula=parseLegacyFormula(rootElement);
  const computedRaw=sourceFormula.marvelDie
    ? calculateD616Damage({...sourceFormula,damageReduction:0}).damage
    : null;

  for (const [index, paragraph] of paragraphs.entries()) {
    const text = paragraph.textContent ?? "";
    const match =
      /takes\s+(?<damage>\d+)\s+(?:Fantastic\s+)?(?<category>health|focus)\s+damage/i.exec(
        text
      );
    if (!match?.groups) continue;

    const firstBold = paragraph.querySelector("b, strong");
    const name = firstBold?.textContent?.trim() ?? "";
    const normalized = normalizeName(name);
    const matchedRef =
      savedRefs.find(
        (ref) =>
          normalized &&
          normalizeName(ref.name) === normalized
      ) ??
      savedRefs[index] ??
      null;
    const resolvedByName = matchedRef
      ? []
      : resolveTokenUuidsFromNames([name]);
    const targetUuid = matchedRef?.uuid ?? resolvedByName[0] ?? "";
    if (!targetUuid && !matchedRef?.actorUuid) continue;

    entries.push({
      targetUuid,
      actorUuid: matchedRef?.actorUuid ?? "",
      name: name || matchedRef?.name || "Target",
      category:
        match.groups.category.toLowerCase() === "focus"
          ? "focus"
          : "health",
      damage: Math.max(0, Number(match.groups.damage) || 0),
      rawDamage: computedRaw??Math.max(0,Number(match.groups.damage)||0),
      damageReduction: 0,
      effectiveDamageMultiplier: 0,
      marvelDie:sourceFormula.marvelDie,damageMultiplier:sourceFormula.damageMultiplier,
      abilityDamage:sourceFormula.ability,fantastic:sourceFormula.isFantastic,
      damageFactor:sourceFormula.isFantastic?2:1,
    });
  }

  return entries;
}

function parseLegacyFormula(rootElement) {
  const text = rootElement?.textContent ?? "";
  const marvelDie =
    Number(/MarvelDie:\s*(-?\d+)/i.exec(text)?.[1] ?? 0) || 0;
  const multiplierMatch =
    /\(\s*(-?\d+)\s*-\s*damageReduction\s*:\s*(-?\d+)\s*=\s*(-?\d+)\s*\)/i.exec(
      text
    ) ??
    /\(\s*(-?\d+)[^)]*damageReduction/i.exec(text);
  const damageMultiplier =
    Number(multiplierMatch?.[1] ?? 0) || 0;
  const ability =
    Number(
      /\+\s*[A-Za-zÀ-ÿ]+\s+score\s*(-?\d+)/i.exec(text)?.[1] ?? 0
    ) || 0;
  const isFantastic =
    /\bFantastic\b/i.test(text) || /\bFantástico\b/i.test(text);

  return {
    marvelDie,
    damageMultiplier,
    ability,
    isFantastic,
  };
}

function getLegacyTargetRefs(message, rootElement) {
  const flags = message?.flags?.[MODULE_ID] ?? {};
  const savedRefs = targetRefsFromFlags(flags);
  if (savedRefs.length) return savedRefs;

  const names = Array.from(
    rootElement?.querySelectorAll?.(".message-content p") ?? []
  )
    .map((paragraph) =>
      paragraph.querySelector("b, strong")?.textContent?.trim()
    )
    .filter((name) => name && !/^-?\d+(?:\.\d+)?$/.test(name));

  return resolveTokenUuidsFromNames(names).map((uuid) => ({ uuid }));
}

/* ---------------- Rendering ---------------- */

function isDamageMessage(message, rootElement) {
  if (getStructuredEntries(message).length) return true;
  const text = String(rootElement?.textContent ?? "").toLowerCase();
  return (
    text.includes("damage multiplier") ||
    text.includes("multiplicador de dano") ||
    /\btakes\s+\d+\s+(?:fantastic\s+)?(?:health|focus)\s+damage\b/i.test(
      text
    )
  );
}

function renderGuardSelector(entry, damageMessage) {
  let actor=null;
  try {
    const document=fromUuidSync(entry.targetUuid)||fromUuidSync(entry.actorUuid);
    actor=document?.actor??(document?.documentName==='Actor'?document:null);
  }catch(_e) {return '';}
  const guards=activeElementalGuards(actor);
  const sourceId=damageMessage?.getFlag?.(MODULE_ID,'sourceMessageId');
  const roll=sourceId?game.messages?.get?.(sourceId):null;
  const from=roll?.speaker?.scene&&game.scenes?.get?.(roll.speaker.scene)?.tokens?.get?.(roll.speaker.token);
  const to=fromUuidSync?.(entry.targetUuid);
  const boundary=findCrossingElementalBarrier(to?.parent,from,to);
  if(!guards.length&&!boundary)return '';
  const auto=selectGuard(guards,'auto',entry.category);
  const structure=guards.find(g=>g.kind==='structure');
  const sphere=guards.find(g=>g.name==='Elemental Sphere');
  if(!auto&&!structure&&!boundary)return '';
  const overflowHint=noExcessProtectionDamage()?'':'; excedente atinge o alvo';
  const choices=[`<option value="auto">${boundary?`Intercepção: ${escapeHtml(boundary.guard.name)} (Ego do criador, proteção ${boundary.guard.threshold}${overflowHint})`:auto?`${escapeHtml(auto.name)} — absorção automática (${auto.threshold}${overflowHint})`:sphere?`Elemental Sphere — proteção do conjurador (${sphere.threshold}${overflowHint})`:'Ataque direto ao personagem'}</option>`];
  if(structure||boundary)choices.push(`<option value="structure">Atacar estrutura: ${escapeHtml((structure??boundary.guard).name)} (defesa Ego, proteção ${(structure??boundary.guard).threshold})</option>`);
  // Reinforcement is offered ONLY on a personal Health shield that would break.
  // The GM confirms the redirect when applying damage, never on a detached roll.
  const candidate=boundary?.guard??auto;
  const candidateOwner=boundary?.actor??actor;
  const overflow=reinforcementOption({actor:candidateOwner,guard:candidate,
    rawDamage:entry.rawDamage,category:entry.category});
  if(overflow){
    const half=Math.max(0,Math.ceil(entry.rawDamage/2)-candidate.threshold);
    choices.push(`<option value="reinforce">${escapeHtml(overflow.name)} — Reação; ${overflow.overflow} Focus (1/2 DANO: ${half}), manter proteção</option>`);
  }
  if(auto||structure||boundary)choices.push('<option value="bypass">Ataque direto sem absorção (decisão do Mestre)</option>');
  return `<label class="mmdr-guard-line">Proteção ativa:<select class="mmdr-guard-mode" data-target="${escapeHtml(entry.targetUuid)}">${choices.join('')}</select></label>`;
}
function renderTargetTable(entries,damageMessage) {
  if (!entries.length) return "";
  const rows = entries
    .map(
      (entry) => `
        <div class="mmdr-row">
          <span>${escapeHtml(entry.name)}</span>
          <span>DR ${entry.damageReduction}${entry.adamantiumIgnored ? ` (${entry.originalDamageReduction} − ${entry.adamantiumIgnored} Adamantium)` : ''}</span>
          <span class="tt">${entry.damage}</span>
        </div>${renderGuardSelector(entry,damageMessage)}`
    )
    .join("");

  return `
    <div class="mmdr-multi">
      <div class="hdrrow">
        <span>ALVO</span><span>REDUÇÃO</span><span>DANO</span>
      </div>
      <div class="tbl">${rows}</div>
    </div>`;
}

function appendUi(message, rootElement) {
  if (rootElement.querySelector(".mmdr-wrapper")) return;

  const structuredEntries = getStructuredEntries(message);
  const legacyEntries = structuredEntries.length
    ? []
    : getLegacyEntries(message, rootElement);
  const exactEntries = structuredEntries.length
    ? structuredEntries
    : legacyEntries;

  let category =
    exactEntries[0]?.category ??
    categoryFromText(rootElement.textContent);
  let displayValue = "";
  let formulaText = "";
  let targetRefs = [];
  let formula = null;

  if (exactEntries.length) {
    const values = new Set(exactEntries.map((entry) => entry.damage));
    displayValue = values.size === 1 ? String(values.values().next().value) : "—";
    formulaText =
      exactEntries.length === 1 ? "DANO DO ALVO" : "DANO POR ALVO";
    targetRefs = exactEntries.map((entry) => ({
      uuid: entry.targetUuid,
      actorUuid: entry.actorUuid,
    }));
  } else {
    formula = parseLegacyFormula(rootElement);
    if (!formula.marvelDie) return;
    targetRefs = getLegacyTargetRefs(message, rootElement);
    formulaText = `${formula.marvelDie} × DM + atributo`;

    if (targetRefs.length) {
      const firstUuid = targetRefs[0]?.uuid;
      let firstActor = null;
      try {
        const document = firstUuid ? fromUuidSync(firstUuid) : null;
        firstActor =
          document?.actor ??
          (document?.documentName === "Actor" ? document : null);
      } catch (_error) {
        // Preview only; the async click path resolves again.
      }
      const reduction = readDamageReduction(firstActor, category);
      const { damage } = calculateD616Damage({
        marvelDie: formula.marvelDie,
        damageMultiplier: formula.damageMultiplier,
        damageReduction: reduction,
        ability: formula.ability,
        fantastic: formula.isFantastic,
      });
      displayValue = String(damage);
    } else {
      displayValue = "?";
    }
  }

  const isFantastic =
    message?.flags?.[MODULE_ID]?.damageApplication?.isFantastic ??
    formula?.isFantastic ??
    false;
  const badge = category.toUpperCase();
  const isCounterstrike=Boolean(message?.getFlag?.(MODULE_ID,'nativeCounterstrikeDamage'));
  const canApply =
    Boolean(game.user?.isGM) && !message?.getFlag?.(MODULE_ID,'mmdrResolved') &&
    targetRefs.some((target) => target.uuid || target.actorUuid);

  const actions = canApply
    ? `
      <div class="mmdr-actions">
        <button type="button" class="mmdr-apply-btn ${category}" data-action="full">DANO</button>
        ${isCounterstrike?'':`<button type="button" class="mmdr-apply-btn ${category}" data-action="half">1/2 DANO</button>
        <button type="button" class="mmdr-apply-btn ${category}" data-action="heal">CURA</button>`}
      </div>`
    : "";

  const wrapper = document.createElement("div");
  wrapper.className = "mmdr-wrapper";
  wrapper.innerHTML = `
    <div class="mmdr-rollline ${category} ${
      isFantastic ? "fantastic" : ""
    }">
      <div class="mmdr-rollline-left">
        <div class="mmdr-badge">${badge}</div>
        ${
          isFantastic
            ? '<div class="mmdr-badge alt">FANTASTIC</div>'
            : ""
        }
      </div>
      <div class="mmdr-rollline-main">
        <div class="value">${escapeHtml(displayValue)}</div>
        <div class="formula">${escapeHtml(formulaText)}</div>
      </div>
    </div>
    ${renderTargetTable(exactEntries,message)}
    ${actions}
  `;

  const content =
    rootElement.querySelector(".message-content") ?? rootElement;
  content.appendChild(wrapper);
}

// GM's damage buttons and the player's remote ChatLog must scroll independently.
installPlayerCombatChatAutoScroll();

Hooks.on("renderChatMessageHTML", (message, html) => {
  try {
    if (!(html instanceof HTMLElement)) return;
    if (!isDamageMessage(message, html)) return;
    appendUi(message, html);
  } catch (error) {
    console.warn("[MMDR] render error", error);
  }
});

/* ---------------- Application ---------------- */

async function applyExactEntries(entries, action, modes={}, damageMessage=null) {
  const results = [];

  for (const entry of entries) {
    const actor = await resolveActor(
      entry.targetUuid,
      entry.actorUuid
    );
    if (!actor) {
      console.warn("[MMDR] Saved target no longer resolves", entry);
      continue;
    }

    const heal = action === "heal";
    const mode=modes[entry.targetUuid]??'auto';
    const rawAmount=action==='half'?Math.ceil(entry.rawDamage/2):entry.rawDamage;
    // Determine whether the ray crosses an ACTIVE Sphere/Prison region; the
    // caster owns the barrier, even if the recipient is a different actor.
    const sourceId=damageMessage?.getFlag?.(MODULE_ID,'sourceMessageId');
    const source=sourceId?game.messages?.get?.(sourceId):null;
    // Catch Bullets' GM confirmation is bound to the unchanged original roll,
    // not to a global damage modifier. Even previously prepared damage cards
    // respect the intercept at application time.
    if(!heal&&canceledCatchEntry(source,entry)){
      results.push({name:entry.name,targetUuid:entry.targetUuid,actorUuid:entry.actorUuid,
        category:entry.category,delta:0,heal:false,blocked:true,
        description:'Catch Bullets: projétil físico interceptado; ataque anulado.'});
      continue;
    }
    const srcScene=source?.speaker?.scene?game.scenes?.get?.(source.speaker.scene):null;
    const attacker=srcScene?.tokens?.get?.(source?.speaker?.token);
    const victimToken=entry.targetUuid?fromUuidSync?.(entry.targetUuid):null;
    const boundary=!heal&&mode!=='bypass'
      ?findCrossingElementalBarrier(victimToken?.parent,attacker,victimToken):null;
    // All supported attack cards use the same guard precedence.
    const defense=heal?null:selectElementalDefense({actor,boundary,mode,category:entry.category});
    const guard=defense?.guard??null;
    const guardOwner=defense?.owner??actor;
    let guarded=null,reinforced=null,retroactiveCandidate=null;
    const beforeHealth=Number(actor.system?.health?.value??0);
    const option=mode==='reinforce'&&!heal ?reinforcementOption({actor:guardOwner,guard,
      rawDamage:rawAmount,category:entry.category}):null;
    // The damage may have been halved after the selector was rendered. In
    // that case the barrier survives as normal, without spending any resource.
    if(mode==='reinforce'&&!option && !(guard&&entry.category==='health'&&rawAmount<=guard.threshold))
      throw Error('Reinforcement não é válido para esta proteção/ataque.');
    if(guard){
      if(guard.kind==='structure'){
        const outcome=getMarvelOutcome(source?.rolls?.[0],guardTargetDefense(guardOwner,guard));
        if(!outcome?.success){
          results.push({name:entry.name,targetUuid:entry.targetUuid,actorUuid:entry.actorUuid,
            category:entry.category,delta:0,heal:false,blocked:true,
            description:`Ataque errou ${guard.name} (defesa Ego do criador).`});
          continue;
        }
      }
      if(option){
        reinforced=await commitReinforcement(guardOwner,option,
          {tokenDoc:guardOwner===actor?victimToken:null});
        guarded={blocked:true,damageToTarget:0,destroyed:false,reinforced:true};
      }else{
        guarded=assessGuardHit(rawAmount,guard,{allowOverflow:!noExcessProtectionDamage()});
        // Do not destroy until the Narrator's damage is applied: a player may
        // still convert its confirmed Health overflow with a later Reaction.
      }
    }
    // Hurled Shield Block is declared AFTER the attack card may already have
    // been rolled. Read its one-attack marker at GM damage-confirmation time,
    // never by altering permanent Health DR or the saved attack card.
    const oneShield=!heal?hurledShieldDamageForEntry(entry,{actor,
      tokenId:victimToken?.id,sceneId:victimToken?.parent?.id,combat:game.combat,damageMessage,action,
      piercing:source?.getFlag?.(MODULE_ID,'adamantiumHealthDrIgnore')??null}):null;
    const damageNow=oneShield?.damage??entry.damage;
    const damageAfterDR=action==='half'
      ?Math.ceil(Math.max(0,Number(damageNow)||0)/2)
      :Math.max(0,Number(damageNow)||0);
    const delta=damageAfterGuardProtection(guarded,damageAfterDR);
    // Energy Absorption was already paid and armed by the defender on Item.roll().
    // GM damage application converts Health into Focus without another prompt.
    let absorption=null;
    if(delta>0&&!heal&&entry.category==='health'&&!guarded?.blocked){
      absorption=await tryAbsorbHealthDamage(actor,delta,{tokenDoc:victimToken});
    }
    if(!absorption&&(delta>0||heal))await applyDelta({actor,category:entry.category,delta,heal});
    if(guard&&!reinforced){
      const actualAfterHealth=Number(actor.system?.health?.value??0);
      const candidate=game.combat?.started&&guarded?.destroyed&&!heal&&!absorption&&damageMessage
        ?eligibleRetroactiveReinforcement({owner:guardOwner,guard,entry,delta,heal,absorption,
          mode,damageMessageId:damageMessage.id,
          healthBefore:beforeHealth,healthAfter:actualAfterHealth})
        :null;
      if(candidate&&await holdReinforcementGuard(guard,candidate)){
        retroactiveCandidate=candidate;
      }else{
        await consumeGuard(guardOwner,guard,guarded);
      }
    }
    // Consume only AFTER Health/Focus resolution succeeds, including zero
    // damage, and only on an actual attack card (not ongoing ticks or healing).
    if(oneShield?.guard)await consumeHurledShield(actor,oneShield.guard);
    const reinforcementNote=reinforced
      ?`${reinforced.powerName}: ${reinforced.redirected} dano excedente transferido de Health para Focus; Reação gasta; proteção preservada. `:'';
    const shieldNote=oneShield?.guard
      ?`Hurled Shield Block: RD ${oneShield.guard.level}, reduziu ${action==='half'?Math.ceil((Number(entry.damage)||0)/2)-Math.ceil((Number(damageNow)||0)/2):oneShield.mitigated} dano; proteção consumida. `:'';
    const guardDescription=guarded?.damageToTarget>0
      ?`${guard.name} absorveu ${Math.min(rawAmount,guard.threshold)} dano e foi destruída; `+
        `${delta} ${entry.category==='health'?'Health':'Focus'} de dano excedente após a proteção`+
        `${delta<guarded.damageToTarget?' após RD':''}.`
      :guarded?.blocked
        ?`${guard.name} absorveu ${rawAmount} dano${guarded.destroyed?' e foi destruída':' e permanece ativa'}.`
        :'';
    results.push({
      name: entry.name || actor.name,
      targetUuid: entry.targetUuid, actorUuid: entry.actorUuid,
      category: entry.category,
      reinforcementCandidate:retroactiveCandidate,
      delta:absorption?0:delta,heal,absorbed:Boolean(absorption),
      blocked:Boolean(guarded&&(guarded.blocked||delta===0)),
      description:reinforcementNote+shieldNote+(absorption?`Energy Absorption: ${absorption.absorbed} Health ignorados; +${absorption.focusGained} Focus (15 Focus e 1 Reação já gastos na ativação). ${guardDescription}`
        :guardDescription|| (oneShield?.guard?`${delta} ${entry.category==='health'?'Health':'Focus'} de dano após a proteção.`:'')),
    });
  }

  return results;
}

/** v0.2.119: recurring GM-only damage uses the same native MMDR handler as
 * confirmed attack cards, including DR, personal shields and Health/Focus.
 * It does NOT create an MMDR confirmation card per turn: this is automatic
 * ongoing damage, like the existing condition damage. No attack replay.
 */
export async function applyCustomRecurringDamage({actor,combatant,amount,resource}={}){
  if(!game.user?.isGM || (game.users?.activeGM&&game.users.activeGM.id!==game.user.id))
    return {applied:false,reason:'Sem autoridade de Mestre'};
  const category=resource==='focus'?'focus':'health';
  const rawAmount=Number(amount);
  if(!Number.isInteger(rawAmount)||rawAmount<1||rawAmount>100||!actor?.uuid)
    return {applied:false,reason:'Dados de dano inválidos'};
  const tokenUuid=combatant?.token?.uuid??
    (combatant?.sceneId&&combatant?.tokenId?`Scene.${combatant.sceneId}.Token.${combatant.tokenId}`:'');
  const entry={targetUuid:tokenUuid||actor.uuid,actorUuid:actor.uuid,
    name:actor.name,category,rawDamage:rawAmount,
    // Match the native ongoing-conditions convention: each RD level removes 5
    // points from a recurring flat damage tick, rather than subtracting a DM.
    damage:Math.max(0,rawAmount-readDamageReduction(actor,category)*5)};
  const results=await applyExactEntries([entry],'full',{},null);
  if(!results.length)return {applied:false,reason:'Alvo não encontrado'};
  const result=results[0];
  return {applied:true,delta:Math.max(0,Number(result.delta)||0),
    blocked:Boolean(result.blocked),dr:readDamageReduction(actor,category),
    category,description:result.description??''};
}

async function applyLegacyFormula(message, rootElement, action, modes={}) {
  const formula=parseLegacyFormula(rootElement);
  const category=categoryFromText(rootElement.textContent);
  const targets=getLegacyTargetRefs(message,rootElement);
  const normalized=[];
  for(const target of targets){
    const actor=await resolveActor(target.uuid,target.actorUuid);
    if(!actor)continue;
    const common={marvelDie:formula.marvelDie,damageMultiplier:formula.damageMultiplier,
      ability:formula.ability,fantastic:formula.isFantastic};
    const rawDamage=calculateD616Damage({...common,damageReduction:0}).damage;
    const damage=calculateD616Damage({...common,damageReduction:readDamageReduction(actor,category)}).damage;
    normalized.push({targetUuid:target.uuid,actorUuid:target.actorUuid,name:target.name||actor.name,
      category,damage,rawDamage,marvelDie:formula.marvelDie,
      damageMultiplier:formula.damageMultiplier,abilityDamage:formula.ability,
      fantastic:formula.isFantastic,damageFactor:formula.isFantastic?2:1});
  }
  // Legacy and modern card variants now share the authoritative hit/guard
  // path. Only this function applies the damage; no double update occurs.
  return applyExactEntries(normalized,action,modes,message);
}

async function postConfirmation(results, action) {
  if (!results.length) return;
  const label =
    action === "half" ? "1/2 DANO" : action === "heal" ? "CURA" : "DANO";
  const text = results
    .map(
      (result) =>
        `${escapeHtml(result.name)} ${result.description?escapeHtml(result.description):`${result.heal?'+':'-'}${result.delta}`}`
    )
    .join(", ");
  const categories = new Set(results.map((result) => result.category));
  const category =
    categories.size === 1 ? Array.from(categories)[0] : "mixed";
  const background =
    category === "focus"
      ? "#0e7d2c"
      : category === "health"
        ? "#b40000"
        : "#444";

  await ChatMessage.create({
    content: `
      <div class="mmdr-confirm" style="background:${background};color:#fff;padding:6px 10px;border-radius:6px;font-weight:600;">
        <div style="font-size:14px;">${label}</div>
        <div style="opacity:.9;font-weight:500;">${text}</div>
      </div>`,
  });
}

const pendingDamageCards=new Set();
const pendingAttackActions=new Set();

/** Shared confirmation for the original MMDR buttons and the new GM-only
 * attack-card shortcuts. All damage/guards/ongoing hooks are unchanged.
 */
async function confirmDamageMessage(message,action='full',messageElement=null,button=null){
  if(!game.user?.isGM){ui.notifications?.warn?.('Somente o Mestre pode aplicar dano ou cura.');return;}
  if(!message || !['full','half','heal'].includes(action))return;
  if(message.getFlag?.(MODULE_ID,'nativeCounterstrikeDamage')&&action!=='full'){
    ui.notifications?.warn?.('Counterstrike Technique permite apenas DANO, sem metade/cura adicional.');return;
  }
    if(pendingDamageCards.has(message.id)){
      ui.notifications?.warn?.('Este card já está processando o dano.');
      return;
    }
    pendingDamageCards.add(message.id);
    if(button)button.disabled = true;

    try {
      const structuredEntries = getStructuredEntries(message);
      const legacyEntries = structuredEntries.length
        ? []
        : messageElement ? getLegacyEntries(message, messageElement) : [];
      const exactEntries = structuredEntries.length
        ? structuredEntries
        : legacyEntries;
      // An already applied card must not spend health/Focus or consume a
      // barrier twice (including after a Chat rerender).
      if(message.getFlag(MODULE_ID,'mmdrResolved')){
        ui.notifications?.warn?.('Este card de dano já foi confirmado.');
        return;
      }
      const sourceId=message.getFlag(MODULE_ID,'sourceMessageId');
      const sourceMessage=sourceId?game.messages?.get?.(sourceId):null;
      // An older duplicate preparation of the same attack may still exist.
      // Once the source has a confirmed result, NONE may apply damage again.
      if(sourceMessage?.getFlag(MODULE_ID,'combatChatResolution')){
        ui.notifications?.warn?.('Este ataque já foi confirmado e não pode aplicar dano novamente.');
        return;
      }
      const decisions=sourceMessage?.getFlag(MODULE_ID,'multiTargetDecisionRollSignature')===rollSignature(sourceMessage?.rolls?.[0])
        ?(sourceMessage.getFlag(MODULE_ID,'multiTargetDecisions')??{}):{};
      if(sourceMessage && !damageCardStillCurrent(message.getFlag(MODULE_ID,'damageApplication'),sourceMessage.rolls?.[0],decisions)){
        ui.notifications?.warn?.('Os dados do ataque foram modificados depois do cálculo. Gere outro card de dano para usar os resultados atualizados.');
        return;
      }
      const modes=Object.fromEntries(Array.from(messageElement?.querySelectorAll?.('.mmdr-guard-mode')??[])
        .map(select=>[select.dataset.target,select.value]));
      const results = exactEntries.length
        ? await applyExactEntries(exactEntries, action,modes,message)
        : await applyLegacyFormula(message,messageElement,action,modes);

      if (!results.length) {
        ui.notifications?.warn(
          "MMDR: nenhum alvo salvo pôde ser encontrado. O dano não foi aplicado."
        );
        return;
      }

      // Immutable post-application receipt. No damage engine changes.
      const receipt=results.map(r=>({targetUuid:r.targetUuid,name:r.name,
        delta:Math.max(0,Number(r.delta)||0),category:r.category,
        heal:!!r.heal,blocked:!!r.blocked}));
      await message.setFlag(MODULE_ID,'mmdrResolved',{action,at:Date.now(),results:receipt,
        reinforcementCandidates:results.map(r=>r.reinforcementCandidate).filter(Boolean)});
      try{await armExploitFromDamage({damageMessage:message,action,receipt});}
      catch(error){console.error('[D616] Exploit: erro ao armar gatilho confirmado',error);}
      try{await postExploitSpecial({damageMessage:message,action,receipt});}
      catch(error){console.warn('[D616] Exploit: efeito da arma requer Mestre',error);}
      try{await confirmBrainDrain({damageMessage:message,action,results:receipt});}
      catch(error){console.error('[D616] Brain Drain: falha ao recuperar Focus',error);}
      try{await confirmLeechLife({damageMessage:message,action,results:receipt});}
      catch(error){console.error('[D616] Leech Life: falha ao recuperar Health',error);}
      await postConfirmation(results, action);
      await confirmPowerDamageFromCard(message, action, results.filter(r=>!r.blocked));
      // Uma falha em regra personalizada nunca desfaz nem interrompe o dano já aplicado.
      try { await confirmCustomTargetDamageFromCard(message, action, results.filter(r=>!r.blocked)); }
      catch (error) { console.error('[D616] Falha na confirmação de automação personalizada',error); }
      await confirmFaltineDamage(message,action,results);
      await confirmRicoShieldDamage(message,action,results);
      await confirmRepeatedAttackDamage(message,action,results);
      try{await confirmHitNRunDamage(message,action,results);}
      catch(error){console.warn('[D616] Hit n Run: falha ao conceder movimento gratuito',error);}
      try{await confirmStoppingPowerDamage(message,action,results);}
      catch(error){console.warn('[D616] Stopping Power: falha ao publicar segundo disparo',error);}
      await confirmHeldHellfireHealthDamage(message,action,results);
      // O efeito especial deve ser aplicado apenas em alvos com dano REAL > 0;
      // não publicar um segundo card solto, pois isso duplica o aviso.
      let elementalApplied=[];
      try{
        const infusionTargets=infusionEligibleTargets(sourceMessage,
          message.getFlag(MODULE_ID,'damageApplication')?.entries,receipt,action);
        elementalApplied=await applyElementalFantasticFromDamageMessage(message,action,
          new Set(results.filter(r=>r.blocked).map(r=>r.targetUuid)),
          infusionTargets??eligibleElementalDamageResults(receipt,action));
      }catch(error){console.error('[D616] Falha no efeito Fantástico elemental',error);}
      // Somente agora o Mestre libera o resultado do ataque e os efeitos
      // realmente aplicados, sem a Defesa ou o cálculo reservado.
      if(sourceMessage && message.getFlag(MODULE_ID,'damageApplication')?.version){
        const snapshot=message.getFlag(MODULE_ID,'damageApplication');
        const published=combatChatPublicResolution(snapshot.chatOutcomeRecords??[],receipt,
          {action,signature:rollSignature(sourceMessage.rolls?.[0])});
        if(published.targets.length){
          try{await sourceMessage.setFlag(MODULE_ID,'combatChatResolution',published);}
          catch(error){console.error('[D616] Não foi possível publicar resultado do ataque',error);}
        }
      }
      // A ÚNICA mensagem do efeito vem DEPOIS da mensagem DANO/1/2 DANO
      // realmente aplicada, jamais na prévia do card de ataque.
      try{await postElementalFantasticConfirmation(message,elementalApplied);}
      catch(error){console.warn('[D616] Efeito aplicado, mas confirmação no chat falhou:',error);}
      const summary = results
        .map(
          (result) =>
            `${result.name} ${result.heal ? "+" : "-"}${result.delta}`
        )
        .join(", ");
      ui.notifications?.info(`MMDR: ${summary}`);
      dbg("applied", { messageId:message.id, action, results });
      // The confirmation and the updated attack can be below the fold.
      void scrollCombatChatToResult();
      return {resolved:true,results};
    } catch (error) {
      console.error("[MMDR] apply error", error);
      ui.notifications?.error(
        "MMDR: ocorreu um erro ao aplicar o dano. Veja o console."
      );
    } finally {
      pendingDamageCards.delete(message.id);
      if(button)button.disabled = false;
    }

}

/** Quickly confirm from the attack message using the existing preparation
 * method. If a guard requires a decision, leave the classic GM-only damage
 * card open with its selector, rather than silently bypassing that guard.
 */
async function applyAttackQuickAction(source,action='full'){
  if(!game.user?.isGM || !source?.id)return;
  if(pendingAttackActions.has(source.id)){
    ui.notifications?.warn?.('Este ataque já está sendo processado.');return;
  }
  pendingAttackActions.add(source.id);
  try{
    if(source.getFlag(MODULE_ID,'combatChatResolution')){
      ui.notifications?.warn?.('Este ataque já foi resolvido pelo Mestre.');return;
    }
    const all=Array.from(game.messages?.contents??[]);
    const signature=rollSignature(source.rolls?.[0]);
    const existing=all.filter(msg=>msg.getFlag?.(MODULE_ID,'sourceMessageId')===source.id &&
      msg.getFlag?.(MODULE_ID,'damageApplication')?.rollSignature===signature &&
      !msg.getFlag?.(MODULE_ID,'mmdrResolved'));
    let card=existing[existing.length-1];
    if(!card){
      if(typeof source._handleDamageChatButton!=='function')throw Error('Card de ataque incompatível com a aplicação de dano.');
      card=await source._handleDamageChatButton(source.id,source.flavor,{resolveMisses:true});
    }
    if(card?.noHit){
      const published=combatChatPublicResolution(card.targets,[],{action,signature});
      if(published.targets.length)await source.setFlag(MODULE_ID,'combatChatResolution',published);
      void scrollCombatChatToResult();
      return {resolved:true,results:[]};
    }
    if(!card?.getFlag?.(MODULE_ID,'damageApplication'))return;
    const entries=getStructuredEntries(card);
    if(entries.some(entry=>Boolean(renderGuardSelector(entry,card)))){
      ui.notifications?.info?.('O alvo possui proteção ativa: confirme o modo de proteção no card de dano do Mestre.');
      void scrollCombatChatToResult();
      return {requiresGuardDecision:true};
    }
    return await confirmDamageMessage(card,action,null,null);
  }finally{pendingAttackActions.delete(source.id);}
}

document.addEventListener('click',async event=>{
  const button=event.target?.closest?.('.mmdr-apply-btn');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const messageElement=button.closest('[data-message-id]');
  const message=game.messages?.get?.(messageElement?.dataset?.messageId);
  if(!message){ui.notifications?.warn?.('MMDR: card de dano não encontrado.');return;}
  await confirmDamageMessage(message,button.dataset.action??'full',messageElement,button);
},true);
