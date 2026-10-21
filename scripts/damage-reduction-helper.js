import { calculateD616Damage } from "./damage-calculation.js";
import {damageCardStillCurrent, rollSignature} from "./multi-target-combat.mjs";
import { confirmRepeatedAttackDamage, confirmHeldHellfireHealthDamage } from "./repeat-power-attacks.mjs";
import { confirmRicoShieldDamage } from "./rico-shield-chain.mjs";
import { confirmFaltineDamage } from './ongoing-power-effects.mjs';
import { confirmPowerDamageFromCard, getMarvelOutcome } from "./power-conditions.mjs";
import { activeElementalGuards, selectGuard, selectElementalDefense, assessGuardHit, consumeGuard, guardTargetDefense, findCrossingElementalBarrier } from "./elemental-shields.mjs";
import { applyElementalFantasticFromDamageMessage, postElementalFantasticConfirmation } from "./elemental-fantastic.mjs";

const MODULE_ID = "multiverse-d616";
const MMDR_VER = "1.0.0";

/* ---------------- Settings / Debug ---------------- */
Hooks.once("init", () => {
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
  const field =
    category === "focus"
      ? "focusDamageReduction"
      : "healthDamageReduction";
  return Math.abs(Number(actor?.system?.[field] ?? 0) || 0);
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
  await actor.update(update);
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
      effectiveDamageMultiplier: Math.max(
        0,
        Number(entry?.effectiveDamageMultiplier ?? 0) || 0
      ),
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
  const choices=[`<option value="auto">${boundary?`Intercepção: ${escapeHtml(boundary.guard.name)} (Ego do criador, proteção ${boundary.guard.threshold})`:auto?`${escapeHtml(auto.name)} — absorção automática (${auto.threshold})`:sphere?`Elemental Sphere — proteção do conjurador (${sphere.threshold})`:'Ataque direto ao personagem'}</option>`];
  if(structure||boundary)choices.push(`<option value="structure">Atacar estrutura: ${escapeHtml((structure??boundary.guard).name)} (defesa Ego, proteção ${(structure??boundary.guard).threshold})</option>`);
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
          <span>DR ${entry.damageReduction}</span>
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
  const canApply =
    Boolean(game.user?.isGM) &&
    targetRefs.some((target) => target.uuid || target.actorUuid);

  const actions = canApply
    ? `
      <div class="mmdr-actions">
        <button type="button" class="mmdr-apply-btn ${category}" data-action="full">DANO</button>
        <button type="button" class="mmdr-apply-btn ${category}" data-action="half">1/2 DANO</button>
        <button type="button" class="mmdr-apply-btn ${category}" data-action="heal">CURA</button>
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
    const srcScene=source?.speaker?.scene?game.scenes?.get?.(source.speaker.scene):null;
    const attacker=srcScene?.tokens?.get?.(source?.speaker?.token);
    const victimToken=entry.targetUuid?fromUuidSync?.(entry.targetUuid):null;
    const boundary=!heal&&mode!=='bypass'
      ?findCrossingElementalBarrier(victimToken?.parent,attacker,victimToken):null;
    // All supported attack cards use the same guard precedence.
    const defense=heal?null:selectElementalDefense({actor,boundary,mode,category:entry.category});
    const guard=defense?.guard??null;
    const guardOwner=defense?.owner??actor;
    let guarded=null;
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
      guarded=assessGuardHit(rawAmount,guard);
      await consumeGuard(guardOwner,guard,guarded);
    }
    const delta=guarded?.blocked ? 0 :
      (action==='half'?Math.ceil(Math.max(0,Number(entry.damage)||0)/2):Math.max(0,Number(entry.damage)||0));
    if(delta>0||heal)await applyDelta({actor,category:entry.category,delta,heal});
    results.push({
      name: entry.name || actor.name,
      targetUuid: entry.targetUuid, actorUuid: entry.actorUuid,
      category: entry.category,
      delta,heal,
      blocked:Boolean(guarded?.blocked),
      description:guarded?.blocked
        ? `${guard.name} absorveu ${rawAmount} dano${guarded.destroyed?' e foi destruída':' e permanece ativa'}.`
        : '',
    });
  }

  return results;
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
      category,damage,rawDamage});
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
document.addEventListener(
  "click",
  async (event) => {
    const button = event.target?.closest?.(".mmdr-apply-btn");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!game.user?.isGM) {
      ui.notifications?.warn(
        "Somente o Mestre pode aplicar dano ou cura por este card."
      );
      return;
    }

    const messageElement = button.closest("[data-message-id]");
    const messageId = messageElement?.dataset?.messageId;
    const message = messageId ? game.messages?.get?.(messageId) : null;
    if (!message) {
      ui.notifications?.warn("MMDR: card de dano não encontrado.");
      return;
    }

    const action = button.dataset.action ?? "full";
    if(pendingDamageCards.has(message.id)){
      ui.notifications?.warn?.('Este card já está processando o dano.');
      return;
    }
    pendingDamageCards.add(message.id);
    button.disabled = true;

    try {
      const structuredEntries = getStructuredEntries(message);
      const legacyEntries = structuredEntries.length
        ? []
        : getLegacyEntries(message, messageElement);
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
      const decisions=sourceMessage?.getFlag(MODULE_ID,'multiTargetDecisionRollSignature')===rollSignature(sourceMessage?.rolls?.[0])
        ?(sourceMessage.getFlag(MODULE_ID,'multiTargetDecisions')??{}):{};
      if(sourceMessage && !damageCardStillCurrent(message.getFlag(MODULE_ID,'damageApplication'),sourceMessage.rolls?.[0],decisions)){
        ui.notifications?.warn?.('Os dados do ataque foram modificados depois do cálculo. Gere outro card de dano para usar os resultados atualizados.');
        return;
      }
      const modes=Object.fromEntries(Array.from(messageElement.querySelectorAll('.mmdr-guard-mode'))
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

      await message.setFlag(MODULE_ID,'mmdrResolved',{action,at:Date.now()});
      await postConfirmation(results, action);
      await confirmPowerDamageFromCard(message, action, results.filter(r=>!r.blocked));
      await confirmFaltineDamage(message,action,results);
      await confirmRicoShieldDamage(message,action,results);
      await confirmRepeatedAttackDamage(message,action,results);
      await confirmHeldHellfireHealthDamage(message,action,results);
      const elementalApplied = await applyElementalFantasticFromDamageMessage(
        message, action, new Set(results.filter(r=>r.blocked).map(r=>r.targetUuid)));
      await postElementalFantasticConfirmation(message, elementalApplied);
      const summary = results
        .map(
          (result) =>
            `${result.name} ${result.heal ? "+" : "-"}${result.delta}`
        )
        .join(", ");
      ui.notifications?.info(`MMDR: ${summary}`);
      dbg("applied", { messageId, action, results });
    } catch (error) {
      console.error("[MMDR] apply error", error);
      ui.notifications?.error(
        "MMDR: ocorreu um erro ao aplicar o dano. Veja o console."
      );
    } finally {
      pendingDamageCards.delete(message.id);
      button.disabled = false;
    }
  },
  true
);
