
const MODULE_ID = "multiverse-d616";
const SYS_ID = (game?.system?.id) || "multiverse-d616";
const SYS_PATH = `systems/${SYS_ID}`;
let CONDITION_DATA = null;

// ---- Custom Conditions Support (world setting) ----
const CUSTOM_COND_SETTING = "customConditions";

function __mmrpg_iconPath(icon) {
  const fallback = `${SYS_PATH}/icons/m.svg`;
  if (!icon || typeof icon !== "string") return fallback;
  const v = icon.trim();
  if (!v) return fallback;
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
  await installConditions();
  try { tray?.render?.(); } catch (_e) {}
}

async function installConditions() {
  if (CONDITION_DATA) return CONDITION_DATA;
  const url = `${SYS_PATH}/data/conditions.json`;
  const baseData = await fetch(url).then(r=>r.json());
  const base = [...(baseData.conditions || [])];
  const custom = __mmrpg_getCustomConditions();
  // Merge (custom overrides by id)
  const map = new Map();
  for (const c of base) map.set(c.id, c);
  for (const c of custom) map.set(c.id, c);
  CONDITION_DATA = { conditions: Array.from(map.values()) };

  const sorted = [...(CONDITION_DATA.conditions||[])].sort((a,b)=> (a.name||"").localeCompare(b.name||"", navigator.language||"pt-BR", {sensitivity:"base"}));
  const list = sorted.map(c => ({
    id: c.id,
    name: c.name,
    label: c.name,
    img: __mmrpg_iconPath(c.icon),
    icon: __mmrpg_iconPath(c.icon)
  }));
  CONFIG.statusEffects = list;
  console.log(`[${MODULE_ID}] Installed ${list.length} Marvel conditions into CONFIG.statusEffects.`);
  return CONDITION_DATA;
}

class ConditionTray {
  constructor() {
    Hooks.on("controlToken", () => this.render());
    Hooks.on("updateActor", () => this.render());
    Hooks.on("createActiveEffect", () => this.render());
    Hooks.on("deleteActiveEffect", () => this.render());
    Hooks.on("updateToken", () => this.render());
    Hooks.on("canvasReady", () => { this.observeSidebarTabs(); this.observeSidebarWidth(); this.render(); });
    window.addEventListener("resize", () => this.positionTrayNearChat());
  }
  get selectedActor() { return canvas?.tokens?.controlled?.[0]?.actor ?? null; }
  observeSidebarTabs() {
    if (this._obsTabs) return; const tabs = document.getElementById("sidebar-tabs"); if (!tabs) return;
    this._obsTabs = new MutationObserver(()=>this.positionTrayNearChat()); this._obsTabs.observe(tabs, {attributes:true,childList:true,subtree:true});
  }
  observeSidebarWidth() {
    if (this._obsWidth) return; const sb = document.getElementById("sidebar"); if (!sb) return;
    this._obsWidth = new ResizeObserver(()=>this.positionTrayNearChat()); this._obsWidth.observe(sb);
  }
  positionTrayNearChat() {
    const el = document.getElementById("mmrpg-condition-tray"); if (!el) return;
    const offX = Number(game.settings.get(MODULE_ID, "offsetX") ?? 12);
    const offY = Number(game.settings.get(MODULE_ID, "offsetY") ?? 6);
    const sb = document.getElementById("sidebar"); const tabs = document.getElementById("sidebar-tabs");
    let top = 10; if (tabs) { const r=tabs.getBoundingClientRect(); top=Math.max(8,r.top+offY); }
    el.style.top = `${top}px`; el.style.left=""; el.style.bottom="";
    const width = sb ? sb.getBoundingClientRect().width : 0;
    el.style.right = `${Math.max(8,width+offX)}px`;
  }
  async render() {
    await installConditions();
    let tray=document.getElementById("mmrpg-condition-tray");
    if(!tray){ tray=document.createElement("div"); tray.id="mmrpg-condition-tray"; document.body.appendChild(tray);}
    tray.innerHTML="";
    const actor=this.selectedActor; if(!actor){ this.positionTrayNearChat(); return; }
    const statuses = Array.from(actor?.statuses ?? []);
    const byId = Object.fromEntries((CONDITION_DATA.conditions||[]).map(c=>[c.id,c]));
    for(const sid of statuses){ const c=byId[sid]; if(!c) continue;
      const pill=document.createElement("div"); pill.className="mmrpg-cond-pill";
      pill.innerHTML=`
        <img src="${__mmrpg_iconPath(c.icon)}" />
        <span class="name">${c.name}</span>
        ${game.user?.isGM ? `<button class="mmrpg-cond-remove" title="Remover (GM)">×</button>`:``}
        <div class="mmrpg-cond-tooltip">
          <div style="font-weight:700;margin-bottom:6px;">${c.name}</div>
          <div>${c.description ?? ""}</div>
          ${c.remove ? `<hr style="opacity:.2;margin:8px 0;"><div><b>Como remover:</b> ${c.remove}</div>` : ""}
        </div>`;
      tray.appendChild(pill);
      if(game.user?.isGM){ pill.querySelector(".mmrpg-cond-remove")?.addEventListener("click",(ev)=>{ev.stopPropagation();this.removeCondition(c.id).then(()=>setTimeout(()=>this.render(),50));}); }
    }
    this.positionTrayNearChat();
  }
  async removeCondition(condId){
    const token = canvas?.tokens?.controlled?.[0]; const actor = token?.actor;
    if(!actor || !game.user?.isGM) return;
    try{ if(token?.document?.toggleStatusEffect) return await token.document.toggleStatusEffect(condId, {active:false}); }catch(e){}
    try{ if(token?.toggleStatusEffect) return await token.toggleStatusEffect(condId, {active:false}); }catch(e){}
    try{ if(actor?.toggleStatusEffect) return await actor.toggleStatusEffect(condId, {active:false}); }catch(e){}
    try{ const ids = actor.effects.filter(e=>e.statuses?.has?.(condId)).map(e=>e.id); if(ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids); }catch(e){ console.error(`[${MODULE_ID}] Falha ao remover status`,e); }
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
  const drLevels = Number(getProperty(actor,"system.healthDamageReduction")) || 0;
  const reduced = Math.max(0, perTurn - (drLevels * 5));
  if(reduced<=0) return;

  const current = Number(getProperty(actor,"system.health.value")) || 0;
  const newValue = Math.max(0, current - reduced);
  await actor.update({"system.health.value": newValue});

  const list = active.map(a=>a.split(".")[1]).join(", ");
  const content = `<p><b>${actor.name}</b> sofre <b>${reduced}</b> de dano de condição (${list}).</p>`;
  ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content });
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
  await installConditions();
  // fallback for TokenHUD titles
  const Klass = foundry.applications?.hud?.TokenHUD ?? TokenHUD;
  if(Klass){
    const original = Klass.prototype._getStatusEffectChoices;
    Klass.prototype._getStatusEffectChoices = function(...args){ const list = CONFIG.statusEffects ?? []; return list.map(e=>({id:e.id,title:(e.label??e.name??e.id),src:(e.img??e.icon),tint:null})); };
  }
  tray.render(); tray.observeSidebarTabs(); tray.observeSidebarWidth();
});

// Key change: only updateCombat; use combat.previous.turn safely
Hooks.on("updateCombat",(combat, changed)=>{
  if(("turn" in changed) || ("round" in changed)) applyEndTurnDamageFromCombat(combat, "updateCombat");
});

// ===== Marvel Multiverse Conditions HUD v0.3.2 additions (auto-apply & v13-safe) =====
const __MMRPG_FU2 = globalThis.foundry?.utils ?? { getProperty: (o,p)=>p.split(".").reduce((a,k)=>a?.[k],o) };

function __mmrpg_tokensForActor2(actor) {
  // IMPORTANT (Foundry v13): when an *unlinked* token takes damage, the Actor
  // being updated is a *synthetic* Token Actor (actor.isToken === true) which
  // still shares the same actor.id as its source Actor.
  //
  // If we resolve tokens by actor.id we may accidentally match *other tokens*
  // created from the same source Actor (e.g. "Android (1)" and "Android (2)"),
  // applying statuses to the wrong token.
  //
  // Therefore: for synthetic Token Actors, resolve ONLY the specific token.
  try {
    if (!actor) return [];

    // Synthetic token actor → only its own token
    if (actor.isToken) {
      const tokDoc = actor.token;
      const tokId = tokDoc?.id ?? tokDoc?._id;
      const tokObj = tokDoc?.object ?? (tokId ? canvas?.tokens?.get(tokId) : null);
      if (tokObj) return [tokObj];
      // If we can't resolve the token object, do NOT fall back to actor.id matching.
      // Returning [] is safer than risking applying statuses to the wrong token.
      return [];
    }

    // World Actor → all active tokens on the current scene
    const active = actor.getActiveTokens?.(true) ?? null;
    if (Array.isArray(active) && active.length) return active;

    const list = canvas?.tokens?.placeables ?? [];
    return list.filter(t => t?.actor?.id === actor?.id);
  } catch (err) {
    console.error("MMRPG Conditions HUD: tokensForActor error", err);
    return [];
  }
}

async function __mmrpg_ensureStatus2(actor, statusId, active) {
  for (const t of __mmrpg_tokensForActor2(actor)) {
    let has = false;
    try {
      has = (typeof t.hasStatusEffect === "function" && t.hasStatusEffect(statusId))
         || (t.actor?.hasStatusEffect?.(statusId))
         || (t.document?.hasStatusEffect?.(statusId)) || false;
    } catch(e) { has = false; }

    if (active && !has)  {
      try {
        if (typeof t.actor?.toggleStatusEffect === "function") {
          await t.actor.toggleStatusEffect(statusId, { active: true, token: t.document ?? t });
        } else if (typeof t.toggleEffect === "function") {
          await t.toggleEffect(statusId, { active: true });
        }
      } catch(e) { console.warn("MMRPG CHUD add failed", statusId, e); }
    }
    if (!active && has)  {
      try {
        if (typeof t.actor?.toggleStatusEffect === "function") {
          await t.actor.toggleStatusEffect(statusId, { active: false, token: t.document ?? t });
        } else if (typeof t.toggleEffect === "function") {
          await t.toggleEffect(statusId, { active: false });
        }
      } catch(e) { console.warn("MMRPG CHUD remove failed", statusId, e); }
    }
  }
}

async function __mmrpg_applyFromStats2(actor) {
  const hp = Number(__MMRPG_FU2.getProperty(actor, "system.health.value")) || 0;
  const fp = Number(__MMRPG_FU2.getProperty(actor, "system.focus.value")) || 0;
  await __mmrpg_ensureStatus2(actor, "mmrpg.incapacitated", hp <= 0);
  await __mmrpg_ensureStatus2(actor, "mmrpg.demoralized",  fp <= 0);
}

if (!globalThis.__MMRPG_CHUD_HOOKS__) {
  globalThis.__MMRPG_CHUD_HOOKS__ = true;

  Hooks.once("init", () => {
    try {
      if (typeof buildSortedMarvelStatuses === "function") {
        CONFIG.statusEffects = buildSortedMarvelStatuses();
      } else if (Array.isArray(CONFIG.statusEffects)) {
        const icon = `systems/multiverse-d616/icons/m.svg`;
        const ensure = (arr, id, label) => {
          if (!arr.find(e => e?.id === id)) arr.push({ id, label, icon });
        };
        const arr = CONFIG.statusEffects.slice();
        ensure(arr, "mmrpg.demoralized", "Demoralized / Desmoralizado");
        ensure(arr, "mmrpg.incapacitated", "Incapacitated / Incapaz");
        arr.sort((a,b) => String(a?.label ?? "").localeCompare(String(b?.label ?? ""), undefined, {sensitivity:"base"}));
        CONFIG.statusEffects = arr;
      }
    } catch (err) {
      console.error("MMRPG Conditions HUD init error", err);
    }
  });

  Hooks.on("ready", async () => {
    try {
      for (const a of game.actors ?? []) {
        await __mmrpg_applyFromStats2(a);
      }
    } catch (err) {
      console.error("MMRPG Conditions HUD ready apply error", err);
    }
  });

  Hooks.on("updateActor", async (actor, changes) => {
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
// ===== end MMRPG v0.3.2 additions =====
