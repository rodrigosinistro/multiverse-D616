
const MODULE_ID = "multiverse-d616";
const SYS_ID = (game?.system?.id) || "multiverse-d616";
const SYS_PATH = `systems/${SYS_ID}`;
let CONDITION_DATA = null;
let LAST_STATUS_SIGNATURE = "";
let CONDITIONS_INSTALLED = false;

// ---- Custom Conditions Support (world setting) ----
const CUSTOM_COND_SETTING = "customConditions";

function __mmrpg_iconPath(icon) {
  const fallback = `${SYS_PATH}/icons/m.svg`;
  if (!icon || typeof icon !== "string") return fallback;
  const v = icon.trim();
  if (!v) return fallback;
  if (v.startsWith("systems/marvel-multiverse/")) {
    return v.replace("systems/marvel-multiverse/", `${SYS_PATH}/`);
  }
  // Allow absolute/known prefixes
  if (
    v.startsWith("systems/") ||
    v.startsWith("modules/") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/")
  ) {
    return v;
  }
  // Otherwise treat as relative to the system folder
  return `${SYS_PATH}/${v}`;
}

function __mmrpg_parseCustomConditions(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(String(raw));
  } catch (_e) {
    return [];
  }
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.conditions) ? parsed.conditions : [];
  const cleaned = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const id = String(c.id ?? "").trim();
    const name = String(c.name ?? "").trim();
    if (!id || !name) continue;
    cleaned.push({
      id,
      name,
      icon: String(c.icon ?? "icons/m.svg").trim() || "icons/m.svg",
      description: c.description ?? "",
      remove: c.remove ?? "",
    });
  }
  return cleaned;
}

function __mmrpg_getCustomConditions() {
  // Setting may not exist if script loaded before init in some edge cases
  try {
    const raw = game?.settings?.get?.(MODULE_ID, CUSTOM_COND_SETTING);
    return __mmrpg_parseCustomConditions(raw);
  } catch (_e) {
    return [];
  }
}

async function __mmrpg_refreshConditions() {
  CONDITION_DATA = null;
  LAST_STATUS_SIGNATURE = "";
  CONDITIONS_INSTALLED = false;
  await installConditions({ force: true });
  try { tray?.scheduleRender?.(true); } catch (_e) {}
}

function __mmrpg_applyExclusiveStatusEffects() {
  const sorted = [...(CONDITION_DATA?.conditions || [])].sort((a,b)=>
    (a.name||"").localeCompare(b.name||"", navigator.language||"pt-BR", {sensitivity:"base"})
  );

  // Foundry v14 uses an object keyed by status id. The D616 system owns the
  // complete status palette: core Foundry statuses and unrelated module
  // statuses are intentionally discarded. Extempore Effects are allowed and
  // identified by the d616ee.* prefix; they are also synchronized into the
  // system customConditions setting by the module.
  const currentEntries = Array.isArray(CONFIG.statusEffects)
    ? CONFIG.statusEffects
    : Object.values(CONFIG.statusEffects ?? {});
  const keyed = {};

  for (const entry of currentEntries) {
    const id = String(entry?.id ?? "").trim();
    if (!id.startsWith("d616ee.")) continue;
    const img = entry?.img ?? entry?.icon ?? `${SYS_PATH}/icons/m.svg`;
    keyed[id] = {
      ...entry,
      id,
      name: entry?.name ?? entry?.label ?? id,
      label: entry?.label ?? entry?.name ?? id,
      img,
      icon: img,
    };
  }

  sorted.forEach((condition, index) => {
    const id = String(condition.id);
    const img = __mmrpg_iconPath(condition.icon);
    keyed[id] = {
      ...(keyed[id] ?? {}),
      id,
      name: condition.name,
      label: condition.name,
      img,
      icon: img,
      order: index,
    };
  });

  CONFIG.statusEffects = keyed;
  return Object.keys(keyed).length;
}

async function installConditions({ force = false } = {}) {
  if (!CONDITION_DATA) {
    const url = `${SYS_PATH}/data/conditions.json`;
    const baseData = await fetch(url).then(r=>r.json());
    const base = [...(baseData.conditions || [])];
    const custom = __mmrpg_getCustomConditions();
    // Merge (custom overrides by id)
    const map = new Map();
    for (const c of base) map.set(c.id, c);
    for (const c of custom) map.set(c.id, c);
    CONDITION_DATA = { conditions: Array.from(map.values()) };
  }

  if (!force && CONDITIONS_INSTALLED) return CONDITION_DATA;

  const count = __mmrpg_applyExclusiveStatusEffects();
  CONDITIONS_INSTALLED = true;
  const signature = Object.keys(CONFIG.statusEffects ?? {}).sort().join("|");
  if (signature !== LAST_STATUS_SIGNATURE) {
    LAST_STATUS_SIGNATURE = signature;
    console.log(`[${MODULE_ID}] Installed ${count} exclusive D616/Extempore conditions into CONFIG.statusEffects.`);
  }
  return CONDITION_DATA;
}

class ConditionTray {
  constructor() {
    this._renderQueued = false;
    this._forceRender = false;
    this._positionQueued = false;
    this._lastSignature = "";

    Hooks.on("controlToken", () => this.scheduleRender(true));
    Hooks.on("createActiveEffect", (effect) => this._onEffectChange(effect));
    Hooks.on("updateActiveEffect", (effect) => this._onEffectChange(effect));
    Hooks.on("deleteActiveEffect", (effect) => this._onEffectChange(effect));
    Hooks.on("updateActor", (actor, changes) => {
      if (!this._isSelectedActor(actor)) return;
      if (this._changesContainEffects(changes)) this.scheduleRender();
    });
    Hooks.on("updateToken", (token, changes) => {
      if (!this._isSelectedToken(token)) return;
      if (this._changesContainEffects(changes)) this.scheduleRender();
    });
    Hooks.on("canvasReady", () => {
      this.observeSidebarTabs();
      this.observeSidebarWidth();
      this.scheduleRender(true);
    });
    window.addEventListener("resize", () => this.schedulePosition());
  }

  get selectedToken() { return canvas?.tokens?.controlled?.[0] ?? null; }
  get selectedActor() { return this.selectedToken?.actor ?? null; }

  _isSelectedActor(actor) {
    const selected = this.selectedActor;
    if (!actor || !selected) return false;
    return actor === selected || actor.uuid === selected.uuid || actor.id === selected.id;
  }

  _isSelectedToken(tokenDocument) {
    const selected = this.selectedToken?.document;
    if (!tokenDocument || !selected) return false;
    return tokenDocument === selected || tokenDocument.uuid === selected.uuid || tokenDocument.id === selected.id;
  }

  _onEffectChange(effect) {
    if (this._isSelectedActor(effect?.parent)) this.scheduleRender();
  }

  _changesContainEffects(changes) {
    if (!changes || typeof changes !== "object") return false;
    const keys = Object.keys(changes);
    if (keys.some((key) => key === "effects" || key === "statuses" || key.startsWith("effects.") || key.startsWith("statuses."))) return true;
    return (
      foundry.utils.hasProperty(changes, "effects") ||
      foundry.utils.hasProperty(changes, "statuses") ||
      foundry.utils.hasProperty(changes, "delta.effects") ||
      foundry.utils.hasProperty(changes, "actorData.effects")
    );
  }

  scheduleRender(force = false) {
    this._forceRender ||= force;
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      const forceRender = this._forceRender;
      this._forceRender = false;
      this.render({ force: forceRender }).catch((error) =>
        console.error(`[${MODULE_ID}] Condition tray render failed`, error)
      );
    });
  }

  schedulePosition() {
    if (this._positionQueued) return;
    this._positionQueued = true;
    requestAnimationFrame(() => {
      this._positionQueued = false;
      this.positionTrayNearChat();
    });
  }

  observeSidebarTabs() {
    if (this._obsTabs) return;
    const tabs = document.getElementById("sidebar-tabs");
    if (!tabs) return;
    this._obsTabs = new MutationObserver(() => this.schedulePosition());
    this._obsTabs.observe(tabs, { attributes: true, childList: true, subtree: false });
  }

  observeSidebarWidth() {
    if (this._obsWidth) return;
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    this._obsWidth = new ResizeObserver(() => this.schedulePosition());
    this._obsWidth.observe(sb);
  }

  positionTrayNearChat() {
    const el = document.getElementById("mmrpg-condition-tray");
    if (!el) return;
    const offX = Number(game.settings.get(MODULE_ID, "offsetX") ?? 12);
    const offY = Number(game.settings.get(MODULE_ID, "offsetY") ?? 6);
    const sb = document.getElementById("sidebar");
    const tabs = document.getElementById("sidebar-tabs");
    let top = 10;
    if (tabs) {
      const r = tabs.getBoundingClientRect();
      top = Math.max(8, r.top + offY);
    }
    el.style.top = `${top}px`;
    el.style.left = "";
    el.style.bottom = "";
    const width = sb ? sb.getBoundingClientRect().width : 0;
    el.style.right = `${Math.max(8, width + offX)}px`;
  }

  async render({ force = false } = {}) {
    await installConditions();
    let tray = document.getElementById("mmrpg-condition-tray");
    if (!tray) {
      tray = document.createElement("div");
      tray.id = "mmrpg-condition-tray";
      document.body.appendChild(tray);
    }

    const actor = this.selectedActor;
    const statuses = actor ? Array.from(actor.statuses ?? []).sort() : [];
    const signature = `${actor?.uuid ?? "none"}|${game.user?.isGM ? "gm" : "player"}|${statuses.join("|")}`;
    if (!force && signature === this._lastSignature) {
      this.schedulePosition();
      return;
    }
    this._lastSignature = signature;
    tray.innerHTML = "";

    if (!actor) {
      this.schedulePosition();
      return;
    }

    const byId = Object.fromEntries((CONDITION_DATA.conditions || []).map((c) => [c.id, c]));
    for (const sid of statuses) {
      const c = byId[sid];
      if (!c) continue;
      const pill = document.createElement("div");
      pill.className = "mmrpg-cond-pill";
      pill.innerHTML = `
        <img src="${__mmrpg_iconPath(c.icon)}" loading="lazy" decoding="async" />
        <span class="name">${c.name}</span>
        ${game.user?.isGM ? `<button class="mmrpg-cond-remove" title="Remover (GM)">×</button>` : ``}
        <div class="mmrpg-cond-tooltip">
          <div style="font-weight:700;margin-bottom:6px;">${c.name}</div>
          <div>${c.description ?? ""}</div>
          ${c.remove ? `<hr style="opacity:.2;margin:8px 0;"><div><b>Como remover:</b> ${c.remove}</div>` : ""}
        </div>`;
      tray.appendChild(pill);
      if (game.user?.isGM) {
        pill.querySelector(".mmrpg-cond-remove")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.removeCondition(c.id).then(() => this.scheduleRender(true));
        });
      }
    }
    this.schedulePosition();
  }

  async removeCondition(condId) {
    const token = this.selectedToken;
    const actor = token?.actor;
    if (!actor || !game.user?.isGM) return;
    try {
      if (actor?.toggleStatusEffect) return await actor.toggleStatusEffect(condId, { active: false });
    } catch (_e) {}
    try {
      const ids = actor.effects.filter((e) => e.statuses?.has?.(condId)).map((e) => e.id);
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    } catch (e) {
      console.error(`[${MODULE_ID}] Falha ao remover status`, e);
    }
  }
}
const tray = new ConditionTray();

class MMRPGConditionsManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mmrpg-conditions-manager",
      title: "Condições (D616) — Gerenciar",
      template: `${SYS_PATH}/templates/apps/conditions-manager.hbs`,
      width: 720,
      height: "auto",
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true,
    });
  }

  async getData(options) {
    const baseUrl = `${SYS_PATH}/data/conditions.json`;
    let base = [];
    try {
      const baseData = await fetch(baseUrl).then(r=>r.json());
      base = baseData?.conditions ?? [];
    } catch (_e) {}
    const customRaw = game.settings.get(MODULE_ID, CUSTOM_COND_SETTING) ?? "[]";
    // Keep a cached example for the UI buttons
    this._exampleJson = JSON.stringify([
      {
        id: "mmrpg.nova-condicao",
        name: "Nova Condição",
        icon: "icons/m.svg",
        description: "Descreva o efeito.",
        remove: "Como remover.",
      }
    ], null, 2);
    return {
      baseCount: base.length,
      customJson: String(customRaw ?? "[]"),
      exampleJson: this._exampleJson,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[data-action='reset']").on("click", (ev) => {
      ev.preventDefault();
      html.find("textarea[name='customJson']").val("[]");
    });
    html.find("button[data-action='insert-example']").on("click", (ev) => {
      ev.preventDefault();
      const ta = html.find("textarea[name='customJson']");
      const cur = String(ta.val() ?? "").trim();
      const ex = this._exampleJson ?? "[]";
      if (!cur || cur === "[]") ta.val(ex);
      else ta.val(cur + "\n\n" + ex);
    });
  }

  async _updateObject(_event, formData) {
    const raw = formData.customJson ?? "[]";
    // Validate & normalize
    let parsed;
    try {
      parsed = JSON.parse(String(raw));
    } catch (e) {
      ui.notifications.error("JSON inválido. Verifique vírgulas, aspas e chaves.");
      throw e;
    }
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.conditions) ? parsed.conditions : null;
    if (!arr) {
      ui.notifications.error("O JSON deve ser um Array de condições ([]) ou um objeto com {conditions: [...]}.");
      return;
    }
    const cleaned = __mmrpg_parseCustomConditions(JSON.stringify(arr));
    const normalized = JSON.stringify(cleaned, null, 2);
    await game.settings.set(MODULE_ID, CUSTOM_COND_SETTING, normalized);
    ui.notifications.info(`Condições custom salvas: ${cleaned.length}. Recarregando...`);
    await __mmrpg_refreshConditions();
  }
}

function registerSettings() {
  game.settings.register(MODULE_ID,"autoTurnDamage",{name:"Aplicar dano de condições automaticamente no fim do turno",scope:"world",config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,"offsetX",{name:"Offset X do painel",scope:"client",config:true,type:Number,default:12});
  game.settings.register(MODULE_ID,"offsetY",{name:"Offset Y do painel",scope:"client",config:true,type:Number,default:6});

  // Custom Conditions
  game.settings.register(MODULE_ID, CUSTOM_COND_SETTING, {
    name: "Condições custom (JSON)",
    hint: "Armazenamento interno das condições custom. Use o botão 'Gerenciar Condições' para editar.",
    scope: "world",
    config: false,
    type: String,
    default: "[]",
  });

  game.settings.registerMenu(MODULE_ID, "conditionsManager", {
    name: "Condições (D616)",
    label: "Gerenciar Condições",
    hint: "Crie/edite condições adicionais (além das nativas) e atualize os Status Effects.",
    type: MMRPGConditionsManager,
    restricted: true,
  });
}

function hasStatus(target,id){
  if(!target) return false;
  try{
    const actor = target.actor ?? target;
    if(actor?.statuses?.has?.(id)) return true;
    if(actor?.hasStatusEffect?.(id)) return true;
    if(target?.hasStatusEffect?.(id)) return true;
    if(target?.document?.hasStatusEffect?.(id)) return true;
    for(const ef of (actor?.effects ?? [])){ if(ef?.statuses?.has?.(id)) return true; const sid = ef?.getFlag?.("core","statusId"); if(sid&&sid===id) return true; }
  }catch(e){}
  return false;
}

async function applyEndTurnDamageFromCombat(combat, reason="updateCombat"){
  if (!__mmrpg_isPrimaryGM()) return;
  if(!game.settings.get(MODULE_ID,"autoTurnDamage")) return;
  const prevIndex = combat?.previous?.turn;
  if(prevIndex == null) return;
  const ended = combat.turns?.[prevIndex];
  if(!ended) return;
  const token = canvas.tokens.get(ended.tokenId);
  const actor = token?.actor; if(!actor) return;

  await installConditions();
  const ongoing = ["mmrpg.ablaze","mmrpg.bleeding","mmrpg.corroding"];
  const active = ongoing.filter(s=>hasStatus(token ?? actor, s));
  if(active.length===0) return;

  const perTurn = 5 * active.length;
  const getProperty = foundry.utils.getProperty;
  const drLevels = Number(getProperty(actor, "system.healthDamageReduction")) || 0;
  const reduced = Math.max(0, perTurn - (drLevels * 5));
  if(reduced<=0) return;

  const current = Number(getProperty(actor, "system.health.value")) || 0;
  const newValue = Math.max(0, current - reduced);
  await actor.update({"system.health.value": newValue});

  const list = active.map(a=>a.split(".")[1]).join(", ");
  const content = `<p><b>${actor.name}</b> sofre <b>${reduced}</b> de dano de condição (${list}).</p>`;
  ChatMessage.create({ author: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
}

Hooks.once("init", ()=>{
  registerSettings();
  // Hot reload conditions when GM changes the custom list
  Hooks.on("updateSetting", (setting, value) => {
    try {
      if (setting?.key === `${MODULE_ID}.${CUSTOM_COND_SETTING}`) {
        __mmrpg_refreshConditions();
      }
    } catch (_e) {}
  });
  const existing = document.querySelector("link[data-mmchud]");
if(!existing){ const link = document.createElement("link"); link.rel="stylesheet"; link.href=`${SYS_PATH}/styles/conditions-hud.css`; link.dataset.mmchud="1"; document.head.appendChild(link);}
});

Hooks.once("ready", async()=>{
  await installConditions({ force: true });
  tray.scheduleRender(true);
  tray.observeSidebarTabs();
  tray.observeSidebarWidth();
});

// Reassert the exclusive D616 palette after canvas/token HUD initialization.
// This keeps Foundry's default conditions from reappearing while preserving
// conditions created by D616 Extempore Effects.
Hooks.on("canvasReady", () => {
  installConditions({ force: true }).catch((error) => console.error(`[${MODULE_ID}] Failed to refresh exclusive conditions`, error));
});
Hooks.on("renderTokenHUD", () => {
  installConditions({ force: true }).catch((error) => console.error(`[${MODULE_ID}] Failed to filter Token HUD conditions`, error));
});

// Key change: only updateCombat; use combat.previous.turn safely
Hooks.on("updateCombat",(combat, changed)=>{
  if(("turn" in changed) || ("round" in changed)) {
    applyEndTurnDamageFromCombat(combat, "updateCombat");
    maybePromptRecoveryOnTurnStart(combat, changed);
  }
});

/* =========================
 * Recovery prompt (KARMA)
 *  - If the active combatant is INCAPACITATED or DEMORALIZED, prompt to spend 1 KARMA
 *    to attempt a recovery roll.
 *  - INCAPACITATED: RESILIENCE check. On success, set HEALTH to 1.
 *  - DEMORALIZED: VIGILANCE check. On success, set FOCUS to 1.
 *  - If both are present, INCAPACITATED is prompted first.
 *  - If no KARMA, a chat message informs that recovery can't be attempted.
 *
 * NOTE: Only the GM creates the prompt to avoid duplicates.
 * Owners can still click the buttons (whispered to owners + GM).
 * ========================= */

const RECOVERY_STATUS = {
  incapacitated: "mmrpg.incapacitated",
  demoralized: "mmrpg.demoralized",
};

const RECOVERY_ABILITY = {
  incapacitated: "res", // Resilience
  demoralized: "vig",   // Vigilance
};

function _mmrpgHasStatus(actorOrToken, statusId){
  try {
    if (!actorOrToken) return false;
    // TokenDocument/Token exposes .actor and .document; Actor exposes .statuses.
    const a = actorOrToken instanceof Actor ? actorOrToken : (actorOrToken.actor || actorOrToken.document?.actor);
    const statuses = a?.statuses;
    if (statuses && typeof statuses.has === "function") return statuses.has(statusId);

    // Fallback: search active effects.
    const effects = a?.effects?.contents || a?.effects || [];
    for (const ef of effects) {
      const st = ef?.statuses;
      if (st && typeof st.has === "function" && st.has(statusId)) return true;
      const flags = ef?.flags || {};
      const core = flags?.core;
      if (core?.statusId === statusId) return true;
    }
  } catch(_e){ /* ignore */ }
  return false;
}

function _mmrpgRecoveryWhisperRecipients(actor){
  const recips = new Set();
  try {
    for (const user of (ChatMessage.getWhisperRecipients?.("GM") || [])) {
      if (user?.id) recips.add(user.id);
      else if (typeof user === "string") recips.add(user);
    }
  } catch(_e){ /* ignore */ }
  try {
    const OWNER = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    for (const u of (game.users || [])) {
      if (!u || u.isGM) continue;
      if (actor?.testUserPermission?.(u, OWNER)) recips.add(u.id);
    }
  } catch(_e){ /* ignore */ }
  return Array.from(recips);
}

function _mmrpgRecoveryKey(combat){
  const c = combat;
  const comb = c?.combatant;
  if (!c || !comb) return null;
  return `${c.id || c._id}:${c.round}:${c.turn}:${comb.id || comb._id}`;
}

async function maybePromptRecoveryOnTurnStart(combat, changed){
  try {
    if (!__mmrpg_isPrimaryGM()) return;
    if (!combat?.started) return;
    const comb = combat.combatant;
    if (!comb) return;

    const key = _mmrpgRecoveryKey(combat);
    if (!key) return;
    if (globalThis.__MMRPG_RECOVERY_PROMPT_KEY === key) return;
    globalThis.__MMRPG_RECOVERY_PROMPT_KEY = key;

    // Resolve actor
    const token = comb.token ? comb.token.object : canvas?.tokens?.get?.(comb.tokenId);
    const actor = token?.actor || comb.actor;
    if (!actor) return;

    // Only prompt for player-owned actors OR GM-controlled actors with KARMA.
    const OWNER = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    const isPlayerOwned = (game.users || []).some(u => !u.isGM && actor.testUserPermission?.(u, OWNER));
    const karma = Number(actor.system?.karma?.value ?? 0) || 0;
    if (!isPlayerOwned && karma <= 0) return;

    const subject = token?.document || token || actor;
    const hasIncap = _mmrpgHasStatus(subject, RECOVERY_STATUS.incapacitated) || _mmrpgHasStatus(actor, RECOVERY_STATUS.incapacitated);
    const hasDemo  = _mmrpgHasStatus(subject, RECOVERY_STATUS.demoralized) || _mmrpgHasStatus(actor, RECOVERY_STATUS.demoralized);
    if (!hasIncap && !hasDemo) return;

    // Decide which condition to prompt first
    const mode = hasIncap ? "incapacitated" : "demoralized";
    const labelPt = mode === "incapacitated" ? "INCAPACITADO" : "DESMORALIZADO";
    const abilityLabelPt = mode === "incapacitated" ? "RESILIÊNCIA" : "VIGILÂNCIA";

    const whisper = _mmrpgRecoveryWhisperRecipients(actor);

    if (karma <= 0) {
      await ChatMessage.create({
        whisper,
        content: `<div class="mmrpg-recovery mmrpg-recovery--no-karma" data-actor-uuid="${actor.uuid}" data-mode="${mode}">
          <p><b>${actor.name}</b> está <b>${labelPt}</b>, mas não tem <b>KARMA</b> para realizar uma jogada de Recuperação.</p>
        </div>`
      });
      return;
    }

    await ChatMessage.create({
      whisper,
      content: `<div class="mmrpg-recovery" data-actor-uuid="${actor.uuid}" data-mode="${mode}">
        <p><b>${actor.name}</b> está <b>${labelPt}</b>. Gastar <b>1 KARMA</b> para tentar Recuperação? (Teste de <b>${abilityLabelPt}</b>)</p>
        <div class="mmrpg-recovery__buttons" style="display:flex; gap:6px; margin-top:6px;">
          <button type="button" class="mmrpg-recovery-btn" data-action="yes">SIM</button>
          <button type="button" class="mmrpg-recovery-btn" data-action="no">NÃO</button>
        </div>
      </div>`
    });
  } catch(e){
    console.warn("[multiverse-d616] recovery prompt error", e);
  }
}

async function _mmrpgSpendKarma(actor, amount=1){
  const cur = Number(actor.system?.karma?.value ?? 0) || 0;
  const next = Math.max(cur - amount, 0);
  await actor.update({ "system.karma.value": next });
  return { cur, next };
}

async function _mmrpgRecoveryRoll(actor, mode){
  const abilityKey = RECOVERY_ABILITY[mode];
  if (!abilityKey) throw new Error(`Unknown recovery mode: ${mode}`);

  const formula = `{1d6,1dm,1d6}+@abilities.${abilityKey}.value`;
  const label = (mode === "incapacitated") ? "Recuperação (Incapacitado)" : "Recuperação (Desmoralizado)";

  const roll = new CONFIG.Dice.MarvelMultiverseRoll(formula, actor.getRollData());
  await roll.evaluate({ async: true });
  const messageMode = game.settings.get("core", "messageMode");
  await roll.toMessage(
    {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: label,
      title: label,
    },
    { messageMode }
  );
  return roll;
}

async function _mmrpgApplyRecoverySuccess(actor, mode, amount){
  const amt = Math.max(Number(amount ?? 0) || 0, 0);
  if (!amt) return 0;

  if (mode === "incapacitated") {
    const cur = Number(actor.system?.health?.value ?? 0) || 0;
    const max = Number(actor.system?.health?.max ?? cur) || 0;
    const next = Math.min(cur + amt, max || (cur + amt));
    await actor.update({ "system.health.value": next });
    return next - cur;
  }

  if (mode === "demoralized") {
    const cur = Number(actor.system?.focus?.value ?? 0) || 0;
    const max = Number(actor.system?.focus?.max ?? cur) || 0;
    const next = Math.min(cur + amt, max || (cur + amt));
    await actor.update({ "system.focus.value": next });
    return next - cur;
  }

  return 0;
}

document.addEventListener("click", async (ev) => {
  const btn = ev.target?.closest?.(".mmrpg-recovery-btn");
  if (!btn) return;

  const root = btn.closest?.(".mmrpg-recovery");
  if (!root) return;

  const action = btn.getAttribute("data-action") || "";
  const actorUuid = root.getAttribute("data-actor-uuid") || "";
  const mode = root.getAttribute("data-mode") || "";
  if (!actorUuid || !mode) return;

  // Disable buttons immediately to avoid double clicks
  try {
    for (const b of root.querySelectorAll?.(".mmrpg-recovery-btn") || []) b.disabled = true;
  } catch(_e){ /* ignore */ }

  try {
    const actor = await fromUuid(actorUuid);
    if (!actor) throw new Error("Actor not found");

    // Permission: owners or GM only
    const OWNER = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
    const hasOwner = actor.testUserPermission?.(game.user, OWNER);
    if (!hasOwner && !game.user.isGM) {
      ui.notifications?.warn?.(
        game.i18n?.localize?.("MULTIVERSE_D616.PermissionDenied") ||
          "You do not have permission to perform this action."
      );
      return;
    }

    if (action === "no") {
      // Re-enable for GM/owner in case they clicked by mistake? Keep disabled to avoid spam.
      return;
    }

    const karma = Number(actor.system?.karma?.value ?? 0) || 0;
    if (karma <= 0) {
      ui.notifications?.warn?.("Sem KARMA para Recuperação.");
      return;
    }

    await _mmrpgSpendKarma(actor, 1);
    const roll = await _mmrpgRecoveryRoll(actor, mode);

    const whisper = _mmrpgRecoveryWhisperRecipients(actor);

    const total = Number(roll?.total ?? 0) || 0;
    const success = total >= 10;

    if (success) {
      // Recovery amount rule:
      // If total >= 10, recover (Marvel Die value) × (Rank).
      // On Fantastic, the Marvel die counts as 6 (roll.dice[1].total).
      const marvelDie = Number(roll?.dice?.[1]?.total ?? roll?.dice?.[1]?.result ?? 0) || 0;
      const rank = Number(actor.system?.attributes?.rank?.value ?? 1) || 1;
      const amount = Math.max(marvelDie, 0) * Math.max(rank, 1);

      const recovered = await _mmrpgApplyRecoverySuccess(actor, mode, amount);
      const poolLabel = (mode === "incapacitated") ? "Vida" : "Focus";

      const extra = recovered > 0
        ? `Recuperou <b>${recovered}</b> de ${poolLabel}.` 
        : `Nenhuma recuperação (já está no máximo).`;

      await ChatMessage.create({
        whisper,
        content: `<div class="mmrpg-recovery-result"><b>${actor.name}</b>: <b>SUCESSO</b> na Recuperação. ${extra} <span style="opacity:0.8">(M=${marvelDie} × Rank=${rank})</span></div>`
      });
    } else {
      await ChatMessage.create({
        whisper,
        content: `<div class="mmrpg-recovery-result"><b>${actor.name}</b>: falhou na Recuperação.</div>`
      });
    }
  } catch(e){
    console.error("[multiverse-d616] recovery click error", e);
  }
}, false);

// ===== Automatic incapacitated/demoralized statuses =====
const __MMRPG_FU2 = globalThis.foundry?.utils ?? { getProperty: (o,p)=>p.split(".").reduce((a,k)=>a?.[k],o) };

function __mmrpg_isPrimaryGM() {
  const gm = game.users?.find?.((user) => user.active && user.isGM);
  return gm ? gm.id === game.user?.id : !!game.user?.isGM;
}

async function __mmrpg_ensureStatus2(actor, statusId, active) {
  if (!actor) return;
  await installConditions();

  const has = actor.statuses?.has?.(statusId) ?? false;
  if (has === active) return;

  try {
    // For an unlinked token, actor is the synthetic Actor and therefore only
    // that exact Token Actor is changed.
    if (actor.toggleStatusEffect) {
      await actor.toggleStatusEffect(statusId, { active });
      return;
    }
  } catch (error) {
    // A small number of module load orders can still query the status before
    // Foundry has rebuilt its internal status lookup. Fall through to a direct
    // ActiveEffect operation instead of repeatedly failing during ready.
    console.debug(`[${MODULE_ID}] toggleStatusEffect fallback for ${statusId}`, error);
  }

  const matching = (actor.effects ?? []).filter((effect) =>
    effect.statuses?.has?.(statusId) || effect.getFlag?.("core", "statusId") === statusId
  );

  if (!active) {
    const ids = matching.map((effect) => effect.id).filter(Boolean);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    return;
  }

  if (matching.length) return;
  const statusConfig = Array.isArray(CONFIG.statusEffects)
    ? CONFIG.statusEffects.find((entry) => entry?.id === statusId)
    : CONFIG.statusEffects?.[statusId];
  const condition = (CONDITION_DATA?.conditions ?? []).find((entry) => entry.id === statusId);
  const img = statusConfig?.img ?? statusConfig?.icon ?? __mmrpg_iconPath(condition?.icon);
  const name = statusConfig?.name ?? statusConfig?.label ?? condition?.name ?? statusId;

  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name,
    img,
    statuses: [statusId],
    disabled: false,
    transfer: false,
    flags: { core: { statusId } },
  }]);
}

async function __mmrpg_applyFromStats2(actor) {
  // Ready hooks are not awaited by Foundry. Ensure the exclusive palette has
  // finished loading before automatic KO/Demoralized statuses are evaluated.
  await installConditions();
  const hp = Number(__MMRPG_FU2.getProperty(actor, "system.health.value")) || 0;
  const fp = Number(__MMRPG_FU2.getProperty(actor, "system.focus.value")) || 0;
  await __mmrpg_ensureStatus2(actor, "mmrpg.incapacitated", hp <= 0);
  await __mmrpg_ensureStatus2(actor, "mmrpg.demoralized",  fp <= 0);
}

function __mmrpg_statsChanged(changes) {
  if (!changes || typeof changes !== "object") return false;
  const keys = Object.keys(changes);
  if (keys.some((key) =>
    key === "system.health" || key === "system.focus" ||
    key === "system.health.value" || key === "system.focus.value" ||
    key.startsWith("system.health.") || key.startsWith("system.focus.")
  )) return true;
  return (
    foundry.utils.hasProperty(changes, "system.health.value") ||
    foundry.utils.hasProperty(changes, "system.focus.value")
  );
}

if (!globalThis.__MMRPG_CHUD_HOOKS__) {
  globalThis.__MMRPG_CHUD_HOOKS__ = true;

  Hooks.on("ready", async () => {
    if (!__mmrpg_isPrimaryGM()) return;
    try {
      for (const a of game.actors ?? []) {
        await __mmrpg_applyFromStats2(a);
      }
    } catch (err) {
      console.error("MMRPG Conditions HUD ready apply error", err);
    }
  });

  Hooks.on("updateActor", async (actor, changes) => {
    if (!__mmrpg_isPrimaryGM() || !__mmrpg_statsChanged(changes)) return;
    try {
      await __mmrpg_applyFromStats2(actor);
    } catch (err) {
      console.error("MMRPG Conditions HUD updateActor error", err);
    }
  });

  // Expose debug in console
  globalThis.MMRPG_CHUD = Object.assign(globalThis.MMRPG_CHUD ?? {}, {
    applyFromStats: __mmrpg_applyFromStats2
  });
}
// ===== end automatic statuses =====
