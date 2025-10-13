
const MODULE_ID = "multiverse-d616";
const VERSION = "1.7.2";

const FIELDS = ["action","duration","cost","trigger","range"];
const lastPowerByActor = new Map(); // actorId -> {itemId, uuid, at}
const processed = new Set(); // message ids já tratados

const log  = (...a)=>console.log(`[${MODULE_ID}]`, ...a);
const err  = (...a)=>console.error(`[${MODULE_ID}]`, ...a);

Hooks.once("ready", ()=> log(`v${VERSION} ready`));

/** Utils **/
const now = ()=> Date.now();
const stripTags = (s)=> String(s||"").replace(/<[^>]*>/g,"");
const escapeHtml = (s)=> foundry.utils.escapeHTML(String(s ?? ""));
const norm = (s)=> stripTags(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();

function labelFor(key){
  const lang = game?.i18n?.lang?.toLowerCase?.() ?? "en";
  const pt = { action: "Ação", duration: "Duração", cost: "Custo", trigger: "Gatilho", range: "Alcance" };
  const en = { action: "Action", duration: "Duration", cost: "Cost", trigger: "Trigger", range: "Range" };
  const map = lang.startsWith("pt") ? pt : en;
  return map[key] ?? key[0].toUpperCase()+key.slice(1);
}
function buildMetaBox(fieldsObj){
  const rows = Object.entries(fieldsObj).map(([k,v]) => 
    `<div class="mcpd-row"><span class="mcpd-label">${labelFor(k)}:</span> <span class="mcpd-value">${escapeHtml(v)}</span></div>`
  ).join("");
  return `<div class="mcpd-card">${rows}</div>`;
}
function collectFieldsFromItem(item){
  const sys = item?.system ?? item?.data?.data ?? null;
  if (!sys) return null;
  const costValue = (sys?.cost && typeof sys.cost === "object") ? sys.cost.value : sys?.cost;
  const costType  = (sys?.cost && typeof sys.cost === "object") ? sys.cost.type  : null;
  const costText  = (costValue !== undefined && costValue !== null && String(costValue).trim() !== "")
      ? `${costValue}${costType ? " " + costType : ""}` : null;

  const fields = {
    action  : sys?.action ?? sys?.actionType ?? sys?.activation?.type ?? sys?.activation,
    duration: sys?.duration ?? sys?.time ?? sys?.activation?.duration,
    cost    : costText,
    trigger : sys?.trigger,
    range   : sys?.range
  };
  const out = {};
  for (const k of FIELDS){
    const v = fields[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") out[k] = String(v).trim();
  }
  return Object.keys(out).length ? out : null;
}
function getItemDescSnippet(item){
  const sys = item?.system ?? item?.data?.data ?? {};
  const descHTML = sys?.description ?? sys?.desc ?? item?.description ?? "";
  const text = stripTags(descHTML);
  // pega de 60 a 160 chars, o suficiente pra assinatura
  const slice = text.slice(0, 160);
  const n = norm(slice);
  // se muito curto, tenta nome do poder + ability
  if (n.length < 40) {
    const combo = `${item?.name || ""} ${sys?.ability || ""}`;
    return norm(combo).slice(0, 80);
  }
  return n;
}

/** 1) Captura do clique no poder (debounce 250ms) **/
Hooks.on("renderActorSheet", (app, html) => {
  try {
    const actor = app.actor;
    if (!actor) return;
    html.off("click.mcpd", "[data-item-id]");
    html.on("click.mcpd", "[data-item-id]", (ev) => {
      const el = ev.currentTarget;
      const itemId = el?.dataset?.itemId;
      const it = itemId ? actor.items?.get(itemId) : null;
      if (!it || (it.type||"").toLowerCase()!=="power") return;
      const last = lastPowerByActor.get(actor.id);
      const t = now();
      if (last && last.itemId === itemId && (t - last.at) < 250) return;
      lastPowerByActor.set(actor.id, { itemId, uuid: it.uuid, at: t });
      log("capture click", { actor: actor.name, item: it.name });
    });
  } catch(e){ err(e); }
});

/** 2) Injeta DENTRO do card de descrição (e nunca nos cards de rolagem/resultado) **/
Hooks.on("renderChatMessageHTML", async (message, html) => {
  try{
    const id = message?.id || message?._id;
    if (!id || processed.has(id)) return;

    const flavor = message.flavor ?? "";
    if (!/(?:power|poder)\s*:/i.test(flavor)) return;

    // Abort if this looks like a roll/result or DR helper card
    const contentEl = html.querySelector(".message-content") || html;
    const innerText = norm(contentEl?.innerText || "");
    
    const rawText0 = String(contentEl?.innerText || "");
    const text0 = rawText0
      .replace(/damagetype\s*:\s*\w+/ig, "")
      .replace(/tipo\s+de\s+dano\s*:\s*\w+/ig, "")
      .trim();
    const damageLike =
      /\btakes\s+\d+\s+\w*\s*health\s+damage\b/i.test(text0) ||
      /\bsofre\s+\d+\s+(de\s+)?dano\b/i.test(text0) ||
      /\bre:\s*marveldie\b/i.test(text0) ||
      /\bdamage\s*multiplier\b/i.test(text0) ||
      /\bdamageReduction\b/.test(text0) ||
      /\bheal(?:ed|s)?\b|\bcura\b/i.test(text0);
if (
      html.querySelector(".dice-roll, .dice-result, .dice-total, .dice-tooltip, .mm-dr-buttons, .mm-dr, .mmdr, [data-mmdr]")
      || damageLike || /\b(aplicar|½ dano|curar|resumo por alvo|apply|half damage|heal|damage reduction)\b/i.test(contentEl?.innerText || "")
    ) return;

    const actorId = message.speaker?.actor;
    const capture = actorId ? lastPowerByActor.get(actorId) : null;
    if (!capture || (now() - capture.at) > 5000) return;

    // resolve o item
    let item = null;
    const actor = actorId ? game.actors?.get(actorId) : null;
    if (actor && capture.itemId) item = actor.items?.get(capture.itemId) ?? null;
    if (!item && capture.uuid) {
      try { const doc = await fromUuid(capture.uuid); if (doc?.documentName === "Item") item = doc; } catch {}
    }
    if (!item) return;

    // Confirma que este card é o de DESCRIÇÃO comparando um snippet do texto do item
    const snippet = getItemDescSnippet(item);
    if (snippet && snippet.length >= 30) {
      const hay = innerText;
      if (!hay.includes(snippet)) return; // não é o card da descrição
    }

    const fields = collectFieldsFromItem(item);
    if (!fields) return;

    if (contentEl.querySelector(".mcpd-card")) { processed.add(id); return; }

    // insere após o último <p> ou no final
    const ps = contentEl.querySelectorAll("p");
    const boxHTML = buildMetaBox(fields);
    if (ps.length) ps[ps.length-1].insertAdjacentHTML("afterend", boxHTML);
    else contentEl.insertAdjacentHTML("beforeend", boxHTML);

    processed.add(id);
    log("inserted into description", { id, item: item.name });
  }catch(e){ err(e); }
});


/** libWrapper injection on ChatMessage#getHTML: runs for all clients (v13 still calls it) */
Hooks.once("ready", () => {
  try {
    if (!globalThis.libWrapper) {
      console.warn(`[${MODULE_ID}] libWrapper not found; fallback to renderChatMessageHTML hook only.`);
      return;
    }
    libWrapper.register(MODULE_ID, "ChatMessage.prototype.getHTML", async function (wrapped, ...args) {
      // Call original
      const result = await wrapped(...args);
      try {
        const html = result?.[0] ?? result; // jQuery or HTMLElement
        const message = this;
        // Only description cards (not rolls/results)
        if (!html || !(html instanceof Element)) return result;
        const contentEl = html.querySelector(".message-content") || html;
        if (!contentEl) return result;
        if (contentEl.querySelector(".mcpd-card")) return result;

        // Abort if this looks like a roll/result or DR helper card
        if (html.querySelector(".dice-roll, .dice-result, .dice-total, .dice-tooltip, .mm-dr-buttons, .mm-dr, .mmdr, [data-mmdr]")) return result;
        const rawText = String(contentEl?.innerText || "");
        const text = rawText
          .replace(/damagetype\s*:\s*\w+/ig, "")
          .replace(/tipo\s+de\s+dano\s*:\s*\w+/ig, "")
          .trim();
        const isDamageText =
          /\btakes\s+\d+\s+\w*\s*health\s+damage\b/i.test(text) ||
          /\bsofre\s+\d+\s+(de\s+)?dano\b/i.test(text) ||
          /\bre:\s*marveldie\b/i.test(text) ||
          /\bdamage\s*multiplier\b/i.test(text) ||
          /\bdamageReduction\b/.test(text) ||
          /\bheal(?:ed|s)?\b|\bcura\b/i.test(text);
        if (isDamageText) return result;
    

        // Detect "power:" line and resolve item on the speaker actor
        const flavor = String(message.flavor ?? "");
        const contentText = String(contentEl.innerText ?? "");
        const m = (flavor + "\n" + contentText).match(/(?:power|poder)\s*:\s*([^\n\r<]+)/i);
        const powerName = m?.[1]?.trim();
        const actorId = message.speaker?.actor;
        if (!powerName || !actorId) return result;

        const actor = game.actors?.get(actorId);
        if (!actor) return result;
        const target = norm(powerName);
        const item = actor.items?.find(it => (it.type||"").toLowerCase()==="power" && norm(it.name)===target) ?? null;
        if (!item) return result;

        const fields = collectFieldsFromItem(item);
        if (!fields) return result;
        const boxHTML = buildMetaBox(fields);
        const ps = contentEl.querySelectorAll("p");
        if (ps.length) ps[ps.length-1].insertAdjacentHTML("afterend", boxHTML);
        else contentEl.insertAdjacentHTML("beforeend", boxHTML);

        console.log(`[${MODULE_ID}] injected via libWrapper/getHTML`, { id: message.id, power: item.name });
      } catch (e) {
        console.error(`[${MODULE_ID}] libWrapper injection error`, e);
      }
      return result;
    }, "WRAPPER");
  } catch (e) {
    console.error(`[${MODULE_ID}] libWrapper register error`, e);
  }
});

// Fallback: still attempt via renderChatMessageHTML for environments where getHTML isn't wrapped
Hooks.on("renderChatMessageHTML", async (message, html) => {
  try {
    const el = html;
    const contentEl = el.querySelector?.(".message-content") || el;
    if (!contentEl || contentEl.querySelector?.(".mcpd-card")) return;
    if (el.querySelector?.(".dice-roll, .dice-result, .mm-dr-buttons, .mm-dr, .mmdr, [data-mmdr]")) return;

    const flavor = String(message.flavor ?? "");
    const contentText = String(contentEl.innerText ?? "");
    const m = (flavor + "\\n" + contentText).match(/(?:power|poder)\\s*:\\s*([^\\n\\r<]+)/i);
    const powerName = m?.[1]?.trim();
    const actorId = message.speaker?.actor;
    if (!powerName || !actorId) return;

    const actor = game.actors?.get(actorId);
    if (!actor) return;
    const target = norm(powerName);
    const item = actor.items?.find(it => (it.type||"").toLowerCase()==="power" && norm(it.name)===target) ?? null;
    if (!item) return;
    const fields = collectFieldsFromItem(item);
    if (!fields) return;
    const boxHTML = buildMetaBox(fields);
    const ps = contentEl.querySelectorAll?.("p");
    if (ps?.length) ps[ps.length-1].insertAdjacentHTML("afterend", boxHTML);
    else contentEl.insertAdjacentHTML?.("beforeend", boxHTML);
    console.log(`[${MODULE_ID}] injected via renderChatMessageHTML`, { id: message.id, power: item.name });
  } catch (e) {
    console.error(`[${MODULE_ID}] fallback render error`, e);
  }
});
