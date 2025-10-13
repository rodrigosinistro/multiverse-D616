const MODULE_ID = "multiverse-d616";
const MODULE_VER = "1.0.18";
const SETTINGS = { ENABLE:"enable", SYSTEM_ID:"systemId", TYPES:"types" };

const DEFAULT_TYPES = { Power:true, Trait:true, Tag:true, Occupation:true, Origin:true, Item:true };

class MMHT {
  static _enabled = false;
  static _types = foundry.utils.deepClone(DEFAULT_TYPES);
  static _targetSystemId = "multiverse-d616";
  static _tooltipEl = null;
  static _moveHandler = null;

  static log(...args){ console.log(`[D616-HT] v${MODULE_VER}`, ...args); }
  static warn(...args){ console.warn("[D616-HT]", ...args); }
  static error(...args){ console.error("[D616-HT]", ...args); }

  static init(){
    game.settings.register(MODULE_ID, SETTINGS.ENABLE, {
      name: game.i18n.localize("MMHT.Settings.Enable"),
      scope: "world", config: true, type: Boolean, default: true,
      onChange: v => MMHT._enabled = !!v
    });
    game.settings.register(MODULE_ID, SETTINGS.SYSTEM_ID, {
      name: game.i18n.localize("MMHT.Settings.SystemId"),
      scope: "world", config: true, type: String, default: MMHT._targetSystemId,
      onChange: v => MMHT._targetSystemId = String(v||"").trim()
    });
    game.settings.register(MODULE_ID, SETTINGS.TYPES, {
      name: game.i18n.localize("MMHT.Settings.TypesLabel"),
      scope: "world", config: true, type: Object, default: DEFAULT_TYPES,
      onChange: v => MMHT._types = v ?? DEFAULT_TYPES
    });
  }

  static ready(){
    MMHT._enabled = !!game.settings.get(MODULE_ID, SETTINGS.ENABLE);
    MMHT._targetSystemId = String(game.settings.get(MODULE_ID, SETTINGS.SYSTEM_ID) || "").trim() || "multiverse-d616";
    MMHT._types = foundry.utils.mergeObject(DEFAULT_TYPES, game.settings.get(MODULE_ID, SETTINGS.TYPES) || {}, {inplace:false});
    if (game.system.id !== MMHT._targetSystemId) {
      MMHT.warn(`System id mismatch. Current: ${game.system.id} / Target: ${MMHT._targetSystemId}. Tooltips inactive.`);
      return;
    }
    if (!MMHT._enabled) return;

    MMHT._createTooltipElement();
    MMHT._bindGlobal();
    MMHT._bindDelegates();
    MMHT._installHooks();

    MMHT.log("ready");
  }

  static _installHooks(){
    const upFirst = s => !s ? "" : (s.charAt(0).toUpperCase()+s.slice(1));

    Hooks.on("renderActorSheet", (app, html) => {
      try {
        html.find("[data-item-id]").each((i, el) => {
          const id = el.dataset.itemId;
          const item = app?.actor?.items?.get?.(id);
          if (!item) return;

          const sys = item.system ?? {};
          const type = upFirst(item.type || "Item");
          const title = item.name ?? "";

          const cost = sys?.cost?.value ?? sys?.cost ?? "";
          const range = sys?.range ?? sys?.distance ?? "";
          const action = sys?.action ?? sys?.activation ?? "";
          const trigger = sys?.trigger ?? "";
          const duration = sys?.duration ?? "";
          const desc = sys?.description ?? sys?.desc ?? sys?.details ?? "";
          const effect = sys?.effect ?? sys?.effects ?? "";

          el.dataset.mmhtType = type;
          el.dataset.mmhtTitle = title;
          if (cost) el.dataset.mmhtCost = String(cost);
          if (range) el.dataset.mmhtRange = String(range);
          if (action) el.dataset.mmhtAction = String(action);
          if (trigger) el.dataset.mmhtTrigger = String(trigger);
          if (duration) el.dataset.mmhtDuration = String(duration);
          if (desc) el.dataset.mmhtDesc = String(desc);
          if (effect) el.dataset.mmhtEffect = (typeof effect === "string") ? effect : JSON.stringify(effect);
        });
      } catch (e) { MMHT.warn("renderActorSheet patch failed", e); }
    });

    Hooks.on("renderChatMessage", (message, html) => {
      try {
        html.find("[data-item-id]").each((i, el) => {
          const id = el.dataset.itemId;
          const actor = message.speaker?.actor ? game.actors?.get(message.speaker.actor) : null;
          const item = actor?.items?.get?.(id);
          if (!item) return;

          const sys = item.system ?? {};
          const type = upFirst(item.type || "Item");

          el.dataset.mmhtType = type;
          el.dataset.mmhtTitle = item.name ?? "";
          const cost = sys?.cost?.value ?? sys?.cost ?? "";
          const range = sys?.range ?? sys?.distance ?? "";
          const action = sys?.action ?? sys?.activation ?? "";
          const trigger = sys?.trigger ?? "";
          const duration = sys?.duration ?? "";
          const desc = sys?.description ?? sys?.desc ?? sys?.details ?? "";
          const effect = sys?.effect ?? sys?.effects ?? "";

          if (cost) el.dataset.mmhtCost = String(cost);
          if (range) el.dataset.mmhtRange = String(range);
          if (action) el.dataset.mmhtAction = String(action);
          if (trigger) el.dataset.mmhtTrigger = String(trigger);
          if (duration) el.dataset.mmhtDuration = String(duration);
          if (desc) el.dataset.mmhtDesc = String(desc);
          if (effect) el.dataset.mmhtEffect = (typeof effect === "string") ? effect : JSON.stringify(effect);
        });
      } catch (e) { MMHT.warn("renderChatMessage patch failed", e); }
    });
  }

  static _createTooltipElement(){
    if (MMHT._tooltipEl) MMHT._tooltipEl.remove();
    const el = document.createElement("div");
    el.classList.add("mmht-tooltip");
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.zIndex = "9999";
    el.style.maxWidth = "520px";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.boxShadow = "0 8px 22px rgba(0,0,0,0.35)";
    el.style.background = "rgba(18,18,20,0.95)";
    el.style.color = "var(--color-text-light-1, #eee)";
    el.style.fontSize = "14px";
    el.style.lineHeight = "1.35";
    el.style.display = "none";
    document.body.appendChild(el);
    MMHT._tooltipEl = el;
  }

  static _bindGlobal(){
    const move = (ev) => {
      if (!MMHT._tooltipEl || MMHT._tooltipEl.style.display === "none") return;
      const pad = 14;
      let x = ev.clientX + pad;
      let y = ev.clientY + pad;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = MMHT._tooltipEl.getBoundingClientRect();
      if (x + rect.width + 12 > vw) x = ev.clientX - rect.width - pad;
      if (y + rect.height + 12 > vh) y = ev.clientY - rect.height - pad;
      MMHT._tooltipEl.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
    };
    let ticking = false;
    MMHT._moveHandler = (ev) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { move(ev); ticking = false; });
    };
    document.addEventListener("mousemove", MMHT._moveHandler);
  }

  static _bindDelegates(){
    document.addEventListener("mouseover", MMHT._onHover, true);
    document.addEventListener("mouseout", MMHT._onOut, true);
  }

  static _htmlToText(html){
    if (!html) return "";
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      return (tmp.textContent || "").trim();
    } catch(e){ return String(html); }
  }

  static _onHover(ev){
    const t = ev.target;
    // Allow hovering anywhere inside the row: climb to closest parent with our dataset
    const node = (t instanceof HTMLElement) ? t.closest('[data-mmht-type]') : null;

    if (!node) return;

    const type = node?.dataset?.mmhtType;
    if (!type || MMHT._types[type] !== true) return;

    const title = foundry.utils.escapeHTML(node?.dataset?.mmhtTitle || "");
    const range = foundry.utils.escapeHTML(node?.dataset?.mmhtRange || "");
    const action = foundry.utils.escapeHTML(node?.dataset?.mmhtAction || "");
    const trigger = foundry.utils.escapeHTML(node?.dataset?.mmhtTrigger || "");
    const duration = foundry.utils.escapeHTML(node?.dataset?.mmhtDuration || "");
    const cost = foundry.utils.escapeHTML(node?.dataset?.mmhtCost || "");

    const desc = MMHT._htmlToText(node?.dataset?.mmhtDesc || "");
    const effect = MMHT._htmlToText(node?.dataset?.mmhtEffect || "");

    const i18n = (k) => game.i18n.localize(k);
    const chunks = [];

    // Title (inline styles)
    if (title) chunks.push(`<div style="font-weight:700;font-size:16px;margin:0 0 12px 0;line-height:1.45;">${title}</div>`);

    // Description & Effect first, with spacing
    if (desc) {
      chunks.push(`<div style="font-weight:700;font-size:15px;margin:10px 0 6px 0;">${i18n("MMHT.Tooltip.Description")}</div>`);
      chunks.push(`<div style="margin:0 0 10px 0;white-space:pre-wrap;word-break:break-word;">${foundry.utils.escapeHTML(desc)}</div>`);
    }
    if (effect) {
      chunks.push(`<div style="font-weight:700;font-size:15px;margin:10px 0 6px 0;">${i18n("MMHT.Tooltip.Effect")}</div>`);
      chunks.push(`<div style="margin:0 0 12px 0;white-space:pre-wrap;word-break:break-word;">${foundry.utils.escapeHTML(effect)}</div>`);
    }

    // KV rows with inline styles
    const kv = [
      [i18n("MMHT.Tooltip.Cost"), cost],
      [i18n("MMHT.Tooltip.Range"), range],
      [i18n("MMHT.Tooltip.Action"), action],
      [i18n("MMHT.Tooltip.Trigger"), trigger],
      [i18n("MMHT.Tooltip.Duration"), duration]
    ];
    for (const [k,v] of kv) if (v) {
      chunks.push(`<div style="margin:8px 0;"><strong style="font-weight:700;font-size:15px;">${k}:</strong> ${v}</div>`);
    }

    if (!chunks.length) return;
    MMHT._tooltipEl.innerHTML = `<div>${chunks.join("")}</div>`;
    MMHT._tooltipEl.style.display = "block";
  }

  static _onOut(ev){
    if (!MMHT._tooltipEl) return;
    const rel = ev.relatedTarget;
    if (rel && MMHT._tooltipEl.contains(rel)) return;
    MMHT._tooltipEl.style.display = "none";
  }
}

Hooks.once("init", MMHT.init);
Hooks.once("ready", MMHT.ready);
