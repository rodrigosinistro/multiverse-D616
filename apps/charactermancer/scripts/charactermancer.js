
import { loadTraitsAndTags } from "./utils/mmc-load-traits-tags.js";
import {dedupePowerCatalog, reconcilePowerCatalog, prepareCharacterPowers, powerIdentity, samePower, powersInSelectedSet} from "./utils/mmc-power-catalog.mjs";

/* Marvel Multiverse — Charactermancer v0.2.33 (Foundry v14 ApplicationV2) */
// Keep the six established DOM-driven creation steps; only the application
// lifecycle and window are migrated. Rules and character generation stay intact.
class MMCCharactermancer extends foundry.applications.api.ApplicationV2 {

  /**
   * Localize a key with a safe fallback.
   * Foundry returns the key itself when missing (truthy), so `|| fallback` doesn't work.
   */
  static mmcLocalize(key, fallback = "") {
    try {
      const t = game?.i18n?.localize?.(key);
      if (!t || t === key) return fallback;
      return t;
    } catch (_e) {
      return fallback;
    }
  }

  
  static _mmcDedupByName(arr){
    try{
      const seen = new Set();
      const out = [];
      for (const it of arr||[]){
        const key = String(it?.name||"").toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key); out.push(it);
      }
      return out;
    }catch(e){ return Array.from(arr||[]); }
  }
  static _mmcIsRepeatable(item){
    return item?.system?.multiple === true;
  }

  static _mmcDedupRepeatAware(arr){
    try{
      const list = Array.from(arr || []);
      const repeatableNames = new Set(
        list
          .filter(it => this._mmcIsRepeatable(it))
          .map(it => String(it?.name || "").toLowerCase().trim())
          .filter(Boolean)
      );
      const seen = new Set();
      const out = [];
      for (const it of list){
        const key = String(it?.name || "").toLowerCase().trim();
        if (!key) continue;
        if (!repeatableNames.has(key)){
          if (seen.has(key)) continue;
          seen.add(key);
        }
        out.push(it);
      }
      return out;
    }catch(e){ return Array.from(arr || []); }
  }

  static _mmcFormatNamesWithCounts(arr){
    try{
      const order = [];
      const counts = new Map();
      for (const it of arr || []){
        const name = String(it?.name || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!counts.has(key)) order.push({ key, name });
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return order.map(({key, name}) => {
        const count = counts.get(key) || 0;
        return count > 1 ? `${name} ×${count}` : name;
      }).join(", ");
    }catch(_){ return (arr || []).map(it=>it?.name).filter(Boolean).join(", "); }
  }

  static _mmcDedupPowersByNameAndSet(arr){
    return dedupePowerCatalog(arr);
  }
static async _mmcEnsureType(stub, fallback){
    try{
      const source = foundry.utils.deepClone(stub ?? {});
      const uuid = source.uuid || (source._id && source.pack ? `Compendium.${source.pack}.${source._id}` : null);
      const loadFromUuid = async (u)=>{
        if (!u) return null;
        try{
          if (typeof fromUuid === "function"){
            const doc = await fromUuid(u).catch(()=>null);
            if (doc) return doc;
          }
        }catch(_){}
        try{
          const parts = String(u).split(".");
          if (parts.length >= 4){
            const packId = `${parts[1]}.${parts[2]}`;
            const docId = parts[3];
            const pack = game.packs?.get(packId);
            if (pack?.getDocument){
              return await pack.getDocument(docId);
            }
          }
        }catch(_){}
        return null;
      };

      const sanitize = (data)=>{
        if (!data) return data;
        const cleaned = foundry.utils.deepClone(data);
        delete cleaned._id;
        delete cleaned.id;
        delete cleaned.uuid;
        delete cleaned.pack;
        delete cleaned.mmcKind;
        delete cleaned.folder;
        delete cleaned._stats;
        delete cleaned.sort;
        delete cleaned.ownership;
        if (!cleaned.type && fallback) cleaned.type = fallback;
        if (!cleaned.system) cleaned.system = {};
        return cleaned;
      };

      const doc = await loadFromUuid(uuid);
      if (doc){
        try{
          const docData = doc.toObject?.() ?? doc;
          const cleaned = sanitize(docData) ?? {};
          // Preserve any user-entered overrides from the stub when they add new fields.
          const merged = foundry.utils.mergeObject(cleaned, source, { inplace: false, insertKeys: true, overwrite: false, recursive: true });
          if (!merged.type) merged.type = doc.type || fallback;
          if (!merged.system) merged.system = foundry.utils.deepClone(doc.system ?? {});
          return sanitize(merged);
        }catch(_){ /* fallback to source */ }
      }

      return sanitize(source);
    }catch(e){ return stub; }
  }

  _clearPackCache(kind){
    try { this.mmcState = this.mmcState || {}; this.mmcState.cache = this.mmcState.cache || {}; delete this.mmcState.cache["packs_"+kind]; } catch(e){}
  }

  /**
   * Atualiza os PODERES a partir do Mundo e de TODOS os Compêndios (ignora cache), mesclando por nome.
   * Se 'renderAfter' for true, re-renderiza mantendo o scroll.
   */

  // Os compêndios LevelDB existentes podem estar com nomes e requisitos antigos.
  // Ajusta somente os campos que mudaram no catálogo oficial, sem mexer nos efeitos.
  _mmcUseCorrectedPowerCatalog(power) {
    if (!power?._id) return power;
    const canonical = this._mmcCanonicalPowerCorrections?.get(power._id);
    if (!canonical) return power;
    if (power.name === canonical.name &&
        power.system?.prerequisites === canonical.prerequisites) return power;
    return {
      ...power, name: canonical.name,
      system: { ...(power.system || {}), prerequisites: canonical.prerequisites }
    };
  }

  async _refreshPowersFromCompendia(renderAfter=false){
    // cache not used for refresh
    try{
      const worldPowers = await this._getWorldItems("power"); const _wC = (worldPowers||[]).length;
      const packPowers  = await this._getPackItems("power"); const _pC = (packPowers||[]).length; console.info('[mmc] refresh powers: world=',_wC,'packs=',_pC);
      const merged = reconcilePowerCatalog(
        this.mmcState.data.powers || [], packPowers, worldPowers,
        this._mmcCanonicalPowerCorrections || new Map());
      this.mmcState.data.powers = merged;
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.mmcState.data.powers = (this.mmcState.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

      if (renderAfter){
        const panes = this.element?.querySelectorAll?.('.mmc-scroll');
        const scrolls = panes ? Array.from(panes).map(p=>p.scrollTop) : [];
        await this.render(false);
        if (panes) Array.from(this.element?.querySelectorAll?.('.mmc-scroll')||[]).forEach((p,i)=> p.scrollTop = scrolls[i]||0);
      }
    }catch(e){ console.warn("[mmc] _refreshPowersFromCompendia failed", e); }
  }

  /**
   * Verifica todos os pré‑requisitos (Rank, Atributos, Traços, Tags e Poderes necessários).
   * Retorna { ok: boolean, missing: string[] }.
   */
  _meetsAllPrereqs(preText, state, ctx={}){
    try {
      const source = String(preText || '').replace(/^(?:pré|pre)\s*:\s*/i, '').trim();
      if (!source || /^none$/i.test(source)) return {ok:true, missing:[]};
      const normalize = value => String(value || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
      const missing = [];
      const powers = [...(state.data?.powers || []), ...(ctx.allP || [])];
      const powerNames = new Map(powers.filter(p=>p?.name).map(p=>[normalize(p.name), p.name]));
      const tags = (state.data?.tags || []).map(t=>normalize(t?.name));
      const traits = (state.data?.traits || []).map(t=>normalize(t?.name));
      const tagCatalog = new Set(tags);
      const traitCatalog = new Set(traits);
      const granted = new Set(Array.from(ctx.grantedNameSet || []).map(normalize));
      const chosen = state.chosenPowers || ctx.chosen || [];
      const chosenNames = new Set(chosen.map(p=>normalize(p?.name)));
      const grantedIds = ctx.grantedIdSet || new Set();
      for (const p of chosen) {
        if (p?._id) {
          const canonical = powers.find(x=>x?._id === p._id);
          if (canonical) chosenNames.add(normalize(canonical.name));
        }
      }
      for (const p of powers) {
        if (p?._id && grantedIds.has(p._id)) granted.add(normalize(p.name));
      }
      const hasPower = name=>chosenNames.has(normalize(name)) || granted.has(normalize(name));
      const traitNames = new Set([...(state.selectedTraits || []),
        ...(state.occupation?.system?.traits || []), ...(state.origin?.system?.traits || [])]
        .map(t=>normalize(t?.name)));
      const tagNames = new Set([...(state.selectedTags || []),
        ...(state.occupation?.system?.tags || []), ...(state.origin?.system?.tags || [])]
        .map(t=>normalize(t?.name)));
      const abilities = {melee:'mle',mle:'mle',agility:'agl',agl:'agl',
        resilience:'res',res:'res',vigilance:'vig',vig:'vig',ego:'ego',logic:'log',log:'log'};
  
      // "Grow 2 or Shrink 2" é alternativa: basta um dos dois poderes.
      const parts = source.replace(/\.\s+(?=[A-Za-z])/g, ', ').split(/[,;]/)
        .map(part=>part.trim()).filter(Boolean);
      for (const original of parts) {
        const part = original.replace(/^(?:power|poder)\s*:\s*/i, '').trim();
        if (/^(?:none|nenhum)$/i.test(part)) continue;
        const rank = part.match(/^rank\s*(\d+)$/i);
        if (rank) {
          if (Number(state.rank || 1) < Number(rank[1])) missing.push('Rank ' + rank[1]);
          continue;
        }
        const ability = part.match(/^(melee|mle|agility|agl|resilience|res|vigilance|vig|ego|logic|log)\s*(\d+)\+?$/i);
        if (ability) {
          const key = abilities[ability[1].toLowerCase()];
          const value = state.abilities?.[key];
          const current = Number(value?.value ?? value ?? 0);
          if (current < Number(ability[2])) missing.push(ability[1] + ' ' + ability[2]);
          continue;
        }
        const trait = part.match(/^(?:trait|traits|traco|tracos|traço|traços)\s*:\s*(.+)$/i);
        if (trait) {
          if (!traitNames.has(normalize(trait[1]))) missing.push('Traço: ' + trait[1]);
          continue;
        }
        const tag = part.match(/^tags?\s*:\s*(.+)$/i);
        if (tag) {
          if (!tagNames.has(normalize(tag[1]))) missing.push('Tag: ' + tag[1]);
          continue;
        }
        const origin = part.match(/^(.+?)\s+origin$/i);
        if (origin) {
          if (normalize(state.origin?.name) !== normalize(origin[1])) missing.push('Origem: ' + origin[1]);
          continue;
        }
        const alternatives = part.split(/\s+(?:or|ou)\s+/i).map(s=>s.trim()).filter(Boolean);
        if (alternatives.length > 1) {
          const unknown = alternatives.filter(name=>!powerNames.has(normalize(name)));
          if (unknown.length) missing.push('Pré-requisito não reconhecido: ' + unknown.join(' / '));
          else if (!alternatives.some(hasPower)) missing.push('Um de: ' + alternatives.join(' ou '));
          continue;
        }
        if (powerNames.has(normalize(part))) {
          if (!hasPower(part)) missing.push('Poder: ' + powerNames.get(normalize(part)));
        } else if (tagCatalog.has(normalize(part))) {
          if (!tagNames.has(normalize(part))) missing.push('Tag: ' + part);
        } else if (traitCatalog.has(normalize(part))) {
          if (!traitNames.has(normalize(part))) missing.push('Traço: ' + part);
        } else {
          // Desconhecido deve bloquear, nunca ignorar um pré-requisito digitado errado.
          missing.push('Pré-requisito não reconhecido: ' + part);
        }
      }
      return {ok:missing.length === 0, missing:[...new Set(missing)]};
    } catch(error) {
      console.warn('MMC | Erro ao validar pré-requisitos', error);
      return {ok:false, missing:['Falha na validação dos pré-requisitos']};
    }
  }

  _restoreFocus(key){ try{ const sel = this._focus?.[key]; if(!sel) return; const el = this.element?.querySelector(sel.q); if(!el) return; el.focus(); if(typeof sel.pos==='number'){ try{ el.selectionStart=el.selectionEnd=Math.min(sel.pos, el.value?.length??0);}catch(e){} } }catch(e){} }

  _restoreScroll(el, key){ try{ el.scrollTop = (this.mmcState?.scroll?.[key] ?? 0); requestAnimationFrame(()=>{ try{ el.scrollTop = (this.mmcState?.scroll?.[key] ?? 0); setTimeout(()=>{ try{ el.scrollTop = (this.mmcState?.scroll?.[key] ?? 0); }catch(e){} }, 0); }catch(e){} }); }catch(e){} }

  _justUpdateChips=false;


  static mmcDebounce(fn, wait=200){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), wait); };
  }


  _getWorldItems(kind){
    try{
      const iter = game.items?.contents ?? [];
      return iter.filter(i => i?.type === kind).map(i => i.toObject());
    }catch(e){ return []; }
  }
  
  async _getPackItems(kind){
    const out = [];
    try{
      const packs = Array.from(game.packs || []).filter(p => p.documentName === "Item");
      for (const p of packs){
        try{
          const docs = await p.getDocuments();
          for (const d of docs){
            if (d?.type === kind) out.push(d.toObject());
          }
        }catch(e){ /* ignore pack errors */ }
      }
    }catch(e){ /* ignore */ }
    return out;
  }



  static DEFAULT_OPTIONS = {
    id: 'mmc-app',
    classes: ['mmc-app', 'sheet'],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      title: 'Marvel Multiverse — Charactermancer',
      icon: 'fa-solid fa-mask',
      resizable: true,
      minimizable: true
    },
    position: { width: 1100, height: 700 }
  };

  constructor(options={}) {
    super(options);
    this.steps = ["rank-abilities","occupation","origin","traits-tags","powers","review"];
    this.step = 0;
    // ApplicationV2.state is a read-only lifecycle property in Foundry v14.
    // Keep all six steps of the character creation wizard in independent state.
    this.mmcState = {
      rank: 1,
      maxAbility: 4,
      abilityPointsByRank: {1:5,2:10,3:15,4:20,5:25,6:30}, // visual only; ajustável
      abilities: {mle:0, agl:0, res:0, vig:0, ego:0, log:0},
      occupation: null,
      origin: null,
      selectedTraits: [],
      selectedTags: [],
      powerSet: "Basic",
      chosenPowers: [],
      powerLimitMatrix: {1:{'<=1':4}, 2:{'1':9,'2+':8}, 3:{'1':14,'2':13,'3+':12}, 4:{'1':19,'2':18,'3':17,'4+':16}, 5:{'1':24,'2':23,'3':22,'4':21,'5+':20}, 6:{'1':29,'2':28,'3':27,'4':26,'5':25,'6+':24}},
      data: {items:[], occupations:[], origins:[], traits:[], tags:[], powers:[]},
      search: {occupation:"", origin:"", traits:"", tags:"", powers:""},
      bio: { codename:"", realname:"", gender:"", size:"average", height:"", weight:"", eyes:"", hair:"", teams:"", base:"", history:"", personality:"" }
    };
  }

  async _loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`MMC data load failed (${response.status}): ${path}`);
    return response.json();
  }

  async _ensureData() {
    if (this._loaded) return;
    const base = `systems/${game.system?.id ?? "multiverse-d616"}/apps/charactermancer/data/`;
    const [items, occupations, origins, traits, tags, powers, actorModel] = await Promise.all([
      this._loadJSON(base+"items.json").catch(()=>({items:[]})),
      this._loadJSON(base+"occupations.json").catch(()=>({items:[]})),
      this._loadJSON(base+"origins.json").catch(()=>({items:[]})),
      this._loadJSON(base+"traits.json").catch(()=>({items:[]})),
      this._loadJSON(base+"tags.json").catch(()=>({items:[]})),
      this._loadJSON(base+"powers.json").catch(()=>({items:[]})),
      this._loadJSON(base+"actor-modelo.json").catch(()=>({}))
    ]);
    this.mmcState.data.items = items.items ?? [];
    this.mmcState.data.occupations = occupations.items ?? [];
    this.mmcState.data.origins = origins.items ?? [];
    this.mmcState.data.traits = traits.items ?? [];
    this.mmcState.data.tags = tags.items ?? [];
    this.mmcState.data.powers = powers.items ?? [];
    const correctedPowerIds = new Set(["8MaB6fHzANxJzpbq", "zFthXeiXzdI646hT", "V29Yrxdf0uiGQgMF", "nnmvCBn8OGU03QvH", "UbhhYpzKg4XTis2V", "491xrGpqoQAbGdGo", "JowNvBE3za7LGiV4", "fIYIWtQcvFzwnjNg", "fd3AyzufIQFe4TqS", "KQxISBVt5QDnkh6C", "IBkz80gRi2Kq3Tgt", "2bWg8lf2ZwkyiKiB", "6PApDX5qMnMqgRa3", "KOGbtsAQoEHQm7gg", "KdVAEjrKMnvmyfIV", "UQG3sZnzI8JvK34o", "VLbgw5shFgAQcYDI", "WUKnnYcEInYLJBfp", "YknqhTMOfiRP7aZX", "ZughvwBl1xGSpx6Q", "ZzRySxUQjMJ6rZ7S", "iEWHhcouN1guY3TE", "n7LkZDiJaeOk3ChY", "v4wnQsxkb32CNQay", "vvAff82Tqkg2SS1q"]);
    this._mmcCanonicalPowerCorrections = new Map(
      (this.mmcState.data.powers || []).filter(p=>correctedPowerIds.has(p._id)).map(p=>[
        p._id, { name:p.name, prerequisites:p.system?.prerequisites || '' }
      ])
    );
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.mmcState.data.powers = (this.mmcState.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

    this.mmcState.actorModel = actorModel;

    // Sort everything by name
    const byName = (a,b)=> (a?.name||"").localeCompare(b?.name||"");
    
    // Merge/override 'powers' from World + Compendia so we always use most up-to-date data
    try{
      const worldPowers = await this._getWorldItems("power"); const _wC = (worldPowers||[]).length;
      const packPowers = await this._preloadKindFromPacks("power");
      this.mmcState.data.powers = reconcilePowerCatalog(
        this.mmcState.data.powers || [], packPowers, worldPowers,
        this._mmcCanonicalPowerCorrections || new Map());
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.mmcState.data.powers = (this.mmcState.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

    }catch(e){ console.warn("[mmc] merge powers from packs/world failed", e); }

    // Atualiza poderes a partir de Compêndios/Mundo
    await this._refreshPowersFromCompendia(false);
for (const k of ["items","occupations","origins","traits","tags","powers"]) this.mmcState.data[k].sort(byName);

    // Power sets
    const sets = Array.from(new Set((this.mmcState.data.powers||[]).map(p=>p.system?.powerSet).filter(Boolean))).sort();
    this.mmcState.powerSets = sets.filter(s=>s!=="Basic");
    this.mmcState.powerSet = this.mmcState.powerSets[0] ?? "";

    // Prefill bio from model
    const m = actorModel?.system||{};
    const bioKeys = ["codename","realname","height","weight","gender","eyes","hair","size","teams","history","personality"];
    for (const k of bioKeys) this.mmcState.bio[k] = m[k] ?? this.mmcState.bio[k];

    this._loaded = true;
  }

  async render(force, opts) {
    // Data must be loaded before the first ApplicationV2 render; keep the
    // old call pattern used by the directory button and step navigation.
    await this._ensureData();
    return super.render(force, opts);
  }

  async _renderHTML(context, options) {
    return this._renderInner(context);
  }

  _replaceHTML(element, content, options) {
    // ApplicationV2 expects a native HTMLElement (never a jQuery collection).
    content.replaceChildren(element);
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const body = this.element?.querySelector('.mmc-body');
    if (body && Number.isFinite(this._mmcBodyScroll)) {
      body.scrollTop = this._mmcBodyScroll;
    }
    if (this.step === 4 && this._focus?.['powers-basic']) {
      this._restoreFocus('powers-basic');
    }
  }

  _onClose(options) {
    this._mmcClosePowerEffect();
    super._onClose?.(options);
  }

  async _renderInner(data) {
    this._mmcBodyScroll = this.element?.querySelector('.mmc-body')?.scrollTop ?? 0;
    const wrap = document.createElement('div');
    wrap.className = 'mmc-shell';

    const heading = document.createElement('header');
    heading.className = 'mmc-heading';
    const intro = document.createElement('div');
    intro.className = 'mmc-heading-copy';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'mmc-eyebrow';
    eyebrow.textContent = 'MARVEL MULTIVERSE RPG';
    const title = document.createElement('h2');
    title.textContent = 'Criação de Personagem';
    const subheading = document.createElement('p');
    subheading.textContent = 'Defina seu herói em seis etapas.';
    intro.append(eyebrow, title, subheading);
    const progress = document.createElement('div');
    progress.className = 'mmc-progress';
    progress.setAttribute('aria-live', 'polite');
    progress.textContent = `ETAPA ${this.step + 1} DE ${this.steps.length}`;
    heading.append(intro, progress);
    wrap.appendChild(heading);

    // Header / Steps
    const stepsBar = document.createElement("div");
    stepsBar.className = "mmc-steps";
    this.steps.forEach((s, i)=>{
      const el = document.createElement("div");
      el.className = "mmc-step"+(i===this.step?" active":"");
      const label = this._labelFor(s);
      el.textContent = `${i+1}. ${label}`;
      if (i === this.step) el.setAttribute('aria-current', 'step');
      stepsBar.appendChild(el);
    });
    wrap.appendChild(stepsBar);

    const body = document.createElement("div");
    body.className = "mmc-body";
    body.appendChild(await this._renderStep());
    wrap.appendChild(body);

    // Footer nav
    const nav = document.createElement("div");
    nav.className = "mmc-nav";
    const back = document.createElement("button");
    back.className = "mmc-btn";
	    back.textContent = MMCCharactermancer.mmcLocalize("MMC.Back", "Voltar");
    back.disabled = (this.step===0);
    back.addEventListener("click", ()=>{ this.step=Math.max(-3,this.step-1); this._refreshPowerChips(); });
    const next = document.createElement("button");
    next.className = "mmc-btn";
	    next.textContent = (this.step===this.steps.length-1)
	      ? MMCCharactermancer.mmcLocalize("MMC.Apply", "Aplicar no Ator")
	      : MMCCharactermancer.mmcLocalize("MMC.Next", "Seguinte");
    next.addEventListener("click", ()=> this._onNext());
    nav.appendChild(back); nav.appendChild(next);
    wrap.appendChild(nav);

    return wrap;
  }

  _refreshPowerChips(){
    // Minimal refresh used by nav/buttons to keep UI coherent without breaking
    try {
      this.render(true);
    } catch (e) {
      console.error("MMC _refreshPowerChips error", e);
    }
  }


  _labelFor(step){
    const L = {
      "rank-abilities": "Rank & Atributos",
      "occupation": "Ocupação",
      "origin": "Origem",
      "traits-tags": "Traços & Tags",
      "powers": "Poderes",
      "review": "Revisão"
    }; return L[step]??step;
  }

  
  
  _rankSummaries(){ return {
    1:{maxAbility:this._getMaxAttributeForRank(1), powerLimit:"4", note:"Basic + 1 Power Set"},
    2:{maxAbility:this._getMaxAttributeForRank(2), powerLimit:"9 (1 set) • 8 (2+ sets)", note:""},
    3:{maxAbility:this._getMaxAttributeForRank(3), powerLimit:"14 (1) • 13 (2) • 12 (3+)", note:""},
    4:{maxAbility:this._getMaxAttributeForRank(4), powerLimit:"19 (1) • 18 (2) • 17 (3) • 16 (4+)", note:""},
    5:{maxAbility:this._getMaxAttributeForRank(5), powerLimit:"24 (1) • 23 (2) • 22 (3) • 21 (4) • 20 (5+)", note:""},
    6:{maxAbility:this._getMaxAttributeForRank(6), powerLimit:"29 (1) • 28 (2) • 27 (3) • 26 (4) • 25 (5) • 24 (6+)", note:""}
  };}


_getChosenSetsCount(){
  const sets = new Set(this.mmcState.chosenPowers.map(x=> (x.system?.powerSet ?? "Basic")).filter(s=> s !== "Basic"));
  return sets.size;
}


  _getGrantedPowers(){
    // Powers granted by Occupation and Origin (and possibly Tags in future)
    const out = [];
    const pushAll = (arr,src)=>{ if (Array.isArray(arr)) for (const p of arr) if (p) { const q=foundry.utils.deepClone(p); q._grantedFrom=src; out.push(q);} };
    try{ pushAll(this.mmcState.occupation?.system?.powers || [], 'occupation'); }catch(e){}
    try{ pushAll(this.mmcState.origin?.system?.powers || [], 'origin'); }catch(e){}
    // Deduplicate by _id or name
    const seen = new Set(); const seenN = new Set(); const uniq=[];
    for (const p of out){ const id=p._id||null; const nm=(p.name||'').toLowerCase(); if ((id && seen.has(id))||(nm && seenN.has(nm))) continue; if(id) seen.add(id); if(nm) seenN.add(nm); uniq.push(p); }
    return uniq;
  }
  _originGrantSubset(limit){
    try{
      const all = this._getGrantedPowers()||[];
      const origin = all.filter(p=> p._grantedFrom==='origin').sort((a,b)=> (a.name||'').localeCompare(b.name||''));
      const n = Math.max(0, Math.min(limit||0, origin.length));
      return origin.slice(0, n);
    }catch(e){ return []; }
  }

_computePowerLimit(){
  const r = this.mmcState.rank || 1;
  const m = this.mmcState.powerLimitMatrix?.[r];
  if (!m) return 4;
  const n = this._getChosenSetsCount();
  // Resolve key based on chosen set count
  const key = (()=>{
    // exact matches 1,2,3,4
    if (m[String(n)]) return String(n);
    // handle <=1 for rank 1
    if (n <= 1 && m["<=1"]) return "<=1";
    // handle 2+, 3+, 4+, 5+ cases
    if (n >= 5 && m["5+"]) return "5+";
    if (n >= 4 && m["4+"]) return "4+";
    if (n >= 3 && m["3+"]) return "3+";
    if (n >= 2 && m["2+"]) return "2+";
    // fallback: if only one key exists, use its value
    const keys = Object.keys(m);
    return keys.length ? keys[0] : null;
  })();
  return key ? (m[key] || 4) : 4;
}
async _renderStep(){
    const step = this.steps[this.step];
    if (step==="rank-abilities") return this._renderRankStep();
    if (step==="occupation") return this._renderListStep("occupation");
    if (step==="origin") return this._renderListStep("origin");
    if (step==="traits-tags") return this._renderTraitsTags();
    if (step==="powers") return this._renderPowers();
    if (step==="review") return this._renderReview();
  }


  _getMaxAttributeForRank(rank){
    const r = Number(rank || this.mmcState.rank || 1);
    return Math.max(1, r + 3);
  }

  
_renderRankStep(){
    const wrap = document.createElement("div");
    wrap.className="mmc-grid";

    // Left: Rank list
    const left = document.createElement("div"); left.className="mmc-card";
    left.innerHTML = `<h3>Rank</h3>`;
    const list = document.createElement("div"); list.className="mmc-list";
    const S = this._rankSummaries();
    [1,2,3,4,5,6].forEach(r=>{
      const row = document.createElement("div"); row.className="mmc-pwr";
      const active = (this.mmcState.rank===r) ? ' style="border:1px solid var(--mmc-accent);border-radius:8px;padding:6px;"' : "";
      row.innerHTML = `<div class="name"${active}>Rank ${r}</div>
      <div class="desc mmc-small">Máx. atributo: ${S[r].maxAbility} • Limite de poderes: ${S[r].powerLimit} ${S[r].note?("• "+S[r].note):""}</div>
      <div><button class="mmc-btn" data-pick-rank="${r}">Selecionar</button></div>`;
      list.appendChild(row);
    });
    left.appendChild(list);
    // restore scroll (immediate + next tick)
    try{ if (this.mmcState.scroll && this.mmcState.scroll.rankList!=null) list.scrollTop = this.mmcState.scroll.rankList; }catch(e){}
    try{ const prev = (this.mmcState?.scroll?.rankList ?? null); if (prev!=null) requestAnimationFrame(()=>{ try{ const ll = left.querySelector('.mmc-list'); if (ll) ll.scrollTop = prev; }catch(e){} }); }catch(e){}
    wrap.appendChild(left);

    // Right: Attributes as dropdowns
    const right = document.createElement("div"); right.className="mmc-card";
    right.innerHTML = `<h3>Atributos (M.A.R.V.E.L.)</h3>`;
    const labels = {mle:"Melee", agl:"Agility", res:"Resilience", vig:"Vigilance", ego:"Ego", log:"Logic"};
    const keys = ["mle","agl","res","vig","ego","log"];
    const pointsBudget = this.mmcState.abilityPointsByRank[this.mmcState.rank] ?? 0;
    const maxA = this._getMaxAttributeForRank(this.mmcState.rank);
    const allowedFor = (name) => {
      const out = [];
      for (let v=-3; v<=maxA; v++){
        const cur = {...(this.mmcState.abilities||{})};
        cur[name] = Number(v||0);
        let pos=0, neg=0;
        for (const k of keys){ const val = Number(cur[k]||0); if (val>=0) pos+=val; else neg+=-val; }
        if (pos <= (pointsBudget + neg)) out.push(v);
      }
      return out;
    };
    for (const k of keys){
      const field = document.createElement("div"); field.className="mmc-field";
      const sel = document.createElement("select"); sel.name=k; sel.className="mmc-attr-select";
      const allowed = allowedFor(k);
      const current = Number((this.mmcState.abilities||{})[k] ?? 0);
      for (const v of allowed){
        const opt = document.createElement("option");
        opt.value = String(v);
        opt.textContent = (v>=0 ? String(v) : String(v)); // sem '+'
        if (v===current) opt.selected = true;
        sel.appendChild(opt);
      }
      // Garantir que um valor apareça no controle
      if (allowed.includes(current)) sel.value = String(current);
      else if (allowed.includes(0)) { sel.value = "0"; this.mmcState.abilities[k] = 0; }
      else if (allowed.length) { sel.value = String(allowed[0]); this.mmcState.abilities[k] = allowed[0]; }
      
      // Garantir que um valor apareça no controle
      if (allowed.includes(current)) sel.value = String(current);
      else if (allowed.includes(0)) { sel.value = "0"; this.mmcState.abilities[k] = 0; }
      else if (allowed.length) { sel.value = String(allowed[0]); this.mmcState.abilities[k] = Number(allowed[0]||0); }
sel.addEventListener("change", (ev)=>{
        const v = Number(ev.target.value||0);
        this.mmcState.abilities[k] = v;
        try{ this.mmcState.scroll = this.mmcState.scroll || {}; this.mmcState.scroll.rankList = list.scrollTop; }catch(e){}
        this._refreshPowerChips();
      });
      field.innerHTML = `<label>${labels[k]}</label>`;
      field.appendChild(sel);
      right.appendChild(field);
    }
    const sumPos = Object.values(this.mmcState.abilities||{}).reduce((a,b)=>a + (b>0?b:0),0);
    const refund = Object.values(this.mmcState.abilities||{}).reduce((a,b)=>a + (b<0?(-b):0),0);
    const rest = pointsBudget + refund - sumPos;
    const restEl = document.createElement("div"); restEl.className="mmc-small"; restEl.textContent = `Pontos restantes: ${rest}`;
    right.appendChild(restEl);
    wrap.appendChild(right);

    // Listeners
    left.querySelectorAll("[data-pick-rank]").forEach(btn=> btn.addEventListener("click", ev=>{
      const rank = Number(ev.currentTarget.dataset.pickRank||ev.currentTarget.getAttribute("data-pick-rank"));
      const was = this.mmcState.rank;
      this.mmcState.rank = rank;
      this.mmcState.maxAbility = this._getMaxAttributeForRank(rank);
      if (rank !== was) { this.mmcState.abilities = {mle:0, agl:0, res:0, vig:0, ego:0, log:0}; }
      try{ this.mmcState.scroll = this.mmcState.scroll || {}; this.mmcState.scroll.rankList = list.scrollTop; }catch(e){}
      this._refreshPowerChips();
    }));

    return wrap;
  }



  
  

_renderSelectionDetails(kind, sel){
  const right = document.createElement("div");
  right.className = "mmc-card mmc-selected";
  if (sel){
    const tlist = (sel.system?.traits ?? []).map(t => {
      const desc = t.system?.description ? ` — <span class="mmc-small">${t.system.description}</span>` : "";
      return `<li><b>${t.name}</b>${desc}</li>`;
    }).join("");
    const glist = (sel.system?.tags ?? []).map(t => {
      const desc = t.system?.description ? ` — <span class="mmc-small">${t.system.description}</span>` : "";
      return `<li><b>${t.name}</b>${desc}</li>`;
    }).join("");
    right.innerHTML = `<h3>Selecionada</h3>
      <div class="title">${sel.name}</div>
      <div class="desc">${sel.system?.description || ""}</div>
      ${(tlist || glist) ? `<div class="mmc-gap16"></div><div class="mmc-sub">Traços & Tags ao escolher</div>` : ""}
      ${tlist ? `<div class="mmc-sub2">Traços</div><ul class="mmc-ul">${tlist}</ul>` : ""}
      ${glist ? `<div class="mmc-sub2">Tags</div><ul class="mmc-ul">${glist}</ul>` : ""}`;
  }else{
    right.innerHTML = `<h3>Selecionada</h3><div class="mmc-small">Nada selecionado.</div>`;
  }
  return right;
}
async _preloadKindFromPacks(kind){
    try{
      this.mmcState = this.mmcState || {};
      this.mmcState.cache = this.mmcState.cache || {};
      if (this.mmcState.cache["packs_"+kind]) return this.mmcState.cache["packs_"+kind];
      const packs = Array.from(game.packs||[]).filter(p=> p.documentName==="Item");
      let results = [];
      for (const p of packs){
        try{
          await p.getIndex();
          const ids = Array.from(p.index || []).filter(e=> e.type===kind).map(e=> e._id);
          if (ids.length){
            const docs = await p.getDocuments({ _id: ids });
            results.push(...docs.map(d=> d.toObject()));
          }
        }catch(e){}
      }
      this.mmcState.cache["packs_"+kind] = results;
      return results;
    }catch(e){ return []; }
  }

  
  
  
  
  _renderListStep(kind){
    const wrap = document.createElement("div"); 
    wrap.className="mmc-grid";

    // LEFT column
    const left = document.createElement("div"); 
    left.className="mmc-card";
    left.innerHTML = `<h3>${kind==="occupation"?"Ocupação":"Origem"}</h3>
      <input class="mmc-search" placeholder="Buscar..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"> `;
    const list = document.createElement("div"); 
    list.className="mmc-list";
    left.appendChild(list);
    wrap.appendChild(left);

    // RIGHT column
    const right = this._renderSelectionDetails(kind, (kind==="occupation"?this.mmcState.occupation:this.mmcState.origin) || null);
    wrap.appendChild(right);

    const keyOf = (o)=> String(o?.name || "").toLowerCase().trim();
    const collator = new Intl.Collator(game.i18n?.lang || "pt-BR", { sensitivity: "base" });

    // Data sources
    const base = (kind==="occupation"?(this.mmcState.data.occupations||[]):(this.mmcState.data.origins||[]));
    let packsItems = [];
    let worldItems = [];
    try { worldItems = (game.items?.contents ?? []).filter(i=> i?.type===kind).map(i=> i.toObject()); } catch(e) {}

    let src = [];

    const rebuild = ()=>{
      const map = new Map();
      // precedence: base < packs < world
      [...base, ...(packsItems||[]), ...(worldItems||[])].forEach(o=> map.set(keyOf(o), o));
      src = Array.from(map.values()).sort((a,b)=> collator.compare(a?.name||"", b?.name||""));
      renderList();
    };

    const renderList = ()=>{
      const q = (left.querySelector(".mmc-search")?.value || "").toLowerCase();
      list.innerHTML = "";
      src.filter(o=> keyOf(o).includes(q) || (o.system?.description||"").toLowerCase().includes(q)).forEach(o=>{
        const row = document.createElement("div"); row.className="mmc-pwr";
        const pickKey = keyOf(o);
        const minimumRank = kind === "origin" ? Number(o.system?.minimumRank ?? 0) || 0 : 0;
        const rankBlocked = minimumRank > Number(this.mmcState.rank ?? 1);
        const action = rankBlocked
          ? `<button class="mmc-btn" disabled title="Requer Rank ${minimumRank}">Rank ${minimumRank}</button>`
          : `<button class="mmc-btn" data-pick="${pickKey}">${MMCCharactermancer.mmcLocalize("MMC.Select", "Selecionar")}</button>`;
	    row.innerHTML = `<div class="name">${o.name}</div><div class="desc">${o.system?.description||""}</div><div>${action}</div>`;
        list.appendChild(row);
      });
      list.querySelectorAll("[data-pick]").forEach(btn=> btn.addEventListener("click", (ev)=>{
        const k = ev.currentTarget.dataset.pick;
        const obj = src.find(x=> keyOf(x)===k) ?? null;
        if (kind==="occupation") this.mmcState.occupation=obj; else this.mmcState.origin=obj;
        const html = this._renderSelectionDetails(kind, obj).innerHTML;
        const currentRight = wrap.querySelector(".mmc-selected");
        if (currentRight) currentRight.innerHTML = html;
      }));
    };

    // Initial render
    rebuild();

    // Load packs then rebuild (packs override base; world overrides packs)
    this._getPackItems(kind).then(extra => { packsItems = extra || []; rebuild(); });

    // Search listener
    const sEl = left.querySelector(".mmc-search");
    if (sEl) sEl.addEventListener("input", ()=> renderList());

    return wrap;
  }

  

_renderTraitsTags(){
    const wrap = document.createElement("div"); 
    wrap.className="mmc-grid";

    this.mmcState.search = this.mmcState.search || {};
    this.mmcState.scroll = this.mmcState.scroll || {};
    this.mmcState.selectedTraits = this.mmcState.selectedTraits || [];
    this.mmcState.selectedTags = this.mmcState.selectedTags || [];

    const grantedTraits = [
      ...(this.mmcState.occupation?.system?.traits || []),
      ...(this.mmcState.origin?.system?.traits || [])
    ].filter(Boolean);
    const grantedTags = [
      ...(this.mmcState.occupation?.system?.tags || []),
      ...(this.mmcState.origin?.system?.tags || [])
    ].filter(Boolean);

    const traitIdSet = new Set(grantedTraits.map(t=>t?._id).filter(Boolean));
    const traitNameSet = new Set(grantedTraits.map(t=>String(t?.name||"").toLowerCase()).filter(Boolean));
    const tagIdSet = new Set(grantedTags.map(t=>t?._id).filter(Boolean));
    const tagNameSet = new Set(grantedTags.map(t=>String(t?.name||"").toLowerCase()).filter(Boolean));

    const isRepeatable = (item)=> MMCCharactermancer._mmcIsRepeatable(item);
    const sameItem = (a,b)=> {
      if (!a || !b) return false;
      if (a._id && b._id && a._id === b._id) return true;
      return String(a.name||"").toLowerCase() === String(b.name||"").toLowerCase();
    };
    const isGrantedTrait = (t)=> traitIdSet.has(t?._id) || traitNameSet.has(String(t?.name||"").toLowerCase());
    const isGrantedTag = (t)=> tagIdSet.has(t?._id) || tagNameSet.has(String(t?.name||"").toLowerCase());

    const extraAllowed = Number(this.mmcState.rank || 1);
    const used = (this.mmcState.selectedTraits || []).length;
    const remaining = Math.max(0, extraAllowed - used);

    // ===== Left column: Traits list
    const left = document.createElement("div"); left.className="mmc-card";
    left.innerHTML = `<h3>Traços</h3>
      <div id="mmc-traits-remaining" class="mmc-small">Traços extras restantes: ${remaining} (de ${extraAllowed})</div>
      <input class="mmc-search" name="search-traits" placeholder="Buscar..." value="${this.mmcState.search?.traits || ""}"> `;
    const listT = document.createElement("div"); listT.className="mmc-list"; listT.setAttribute("data-kind","traits");
    left.appendChild(listT);
    wrap.appendChild(left);

    const renderListTraits = () => {
      const prev = listT.scrollTop;
      listT.innerHTML = "";
      const tq = (this.mmcState.search?.traits || "").toLowerCase();
      const remainingNow = Math.max(0, Number(this.mmcState.rank || 1) - (this.mmcState.selectedTraits || []).length);
      const remEl = left.querySelector("#mmc-traits-remaining");
      if (remEl) remEl.textContent = `Traços extras restantes: ${remainingNow} (de ${Number(this.mmcState.rank || 1)})`;

      (this.mmcState.data?.traits || [])
        .filter(t => {
          const name = String(t?.name || "").toLowerCase();
          const desc = String(t?.system?.description || "").toLowerCase();
          return name.includes(tq) || desc.includes(tq);
        })
        // Granted entries remain available only when the catalog says they are repeatable.
        .filter(t => !isGrantedTrait(t) || isRepeatable(t))
        .forEach(t=>{
          const row = document.createElement("div"); row.className="mmc-pwr";
          const repeatable = isRepeatable(t);
          const granted = isGrantedTrait(t);
          const picked = (this.mmcState.selectedTraits || []).some(x=>sameItem(x,t));
          const disableByGrant = granted && !repeatable;
          const disableByPicked = picked && !repeatable;
          const disabled = disableByGrant || disableByPicked || remainingNow <= 0;

          const actionLabel = repeatable && (granted || picked) ? "Selecionar novamente" : "Selecionar";
          let action = `<button class="mmc-btn" data-add-trait="${t._id}" ${disabled?"disabled":""}>${actionLabel}</button>`;
          if (disableByGrant) action = `<button class="mmc-btn" disabled>Concedido</button>`;
          if (!disableByGrant && disableByPicked) action = `<button class="mmc-btn" disabled>Selecionado</button>`;

          const multi = repeatable ? ` <span class="mmc-small">— pode repetir</span>` : "";
          row.innerHTML = `<div class="name">${t.name}${multi}</div>
            <div class="desc">${t.system?.description || ""}</div>
            <div>${action}</div>`;
          listT.appendChild(row);
        });

      listT.scrollTop = prev;
      requestAnimationFrame(()=>{ listT.scrollTop = prev; });

      listT.querySelectorAll("[data-add-trait]").forEach(btn=> btn.addEventListener("click", ev=>{
        const id = ev.currentTarget.dataset.addTrait;
        const obj = (this.mmcState.data?.traits||[]).find(x=>x._id===id);
        if (!obj) return;

        const remainingAtClick = Math.max(0, Number(this.mmcState.rank || 1) - (this.mmcState.selectedTraits || []).length);
        if (remainingAtClick <= 0) {
          ui.notifications?.warn("Você já escolheu todos os Traços bônus.");
          return;
        }

        if (!isRepeatable(obj)) {
          const duplicate = (this.mmcState.selectedTraits||[]).some(x=>sameItem(x,obj));
          if (duplicate) return;
        }

        this.mmcState.selectedTraits.push(foundry.utils.deepClone(obj));
        this.mmcState.scroll["traits"] = listT.scrollTop;
        this._refreshPowerChips();
      }));
    };
    renderListTraits();
    if (this.mmcState.scroll["traits"]!=null) {
      listT.scrollTop = this.mmcState.scroll["traits"];
      requestAnimationFrame(()=>{ listT.scrollTop = this.mmcState.scroll["traits"]; });
    }

    // ===== Right column: Tags list
    const rightTop = document.createElement("div"); rightTop.className="mmc-card";
    rightTop.innerHTML = `<h3>Tags</h3>
      <input class="mmc-search" name="search-tags" placeholder="Buscar..." value="${this.mmcState.search?.tags || ""}"> `;
    const listG = document.createElement("div"); listG.className="mmc-list"; listG.setAttribute("data-kind","tags");
    rightTop.appendChild(listG);
    wrap.appendChild(rightTop);

    const renderListTags = () => {
      const prev = listG.scrollTop;
      listG.innerHTML = "";
      const gq = (this.mmcState.search?.tags || "").toLowerCase();
      (this.mmcState.data?.tags || [])
        .filter(t => {
          const name = String(t?.name || "").toLowerCase();
          const desc = String(t?.system?.description || "").toLowerCase();
          return name.includes(gq) || desc.includes(gq);
        })
        .forEach(t=>{
          const row = document.createElement("div"); row.className="mmc-pwr";
          const repeatable = isRepeatable(t);
          const granted = isGrantedTag(t);
          const picked = (this.mmcState.selectedTags || []).some(x=>sameItem(x,t));
          const disabled = !repeatable && (granted || picked);

          const actionLabel = repeatable && (granted || picked) ? "Selecionar novamente" : "Selecionar";
          let action = `<button class="mmc-btn" data-add-tag="${t._id}" ${disabled?"disabled":""}>${actionLabel}</button>`;
          if (granted && !repeatable) action = `<button class="mmc-btn" disabled>Concedido</button>`;
          else if (picked && !repeatable) action = `<button class="mmc-btn" disabled>Selecionado</button>`;

          const multi = repeatable ? ` <span class="mmc-small">— pode repetir</span>` : "";
          row.innerHTML = `<div class="name">${t.name}${multi}</div>
            <div class="desc">${t.system?.description || ""}</div>
            <div>${action}</div>`;
          listG.appendChild(row);
        });

      listG.scrollTop = prev;
      requestAnimationFrame(()=>{ listG.scrollTop = prev; });

      listG.querySelectorAll("[data-add-tag]").forEach(btn=> btn.addEventListener("click", ev=>{
        const id = ev.currentTarget.dataset.addTag;
        const obj = (this.mmcState.data?.tags||[]).find(x=>x._id===id);
        if (!obj) return;

        if (!isRepeatable(obj)) {
          const duplicate = (this.mmcState.selectedTags||[]).some(x=>sameItem(x,obj));
          if (duplicate || isGrantedTag(obj)) return;
        }

        this.mmcState.selectedTags.push(foundry.utils.deepClone(obj));
        this.mmcState.scroll["tags"] = listG.scrollTop;
        this._refreshPowerChips();
      }));
    };
    renderListTags();

    // === Live-load Traits & Tags from World/Compendia (no cache), then refresh lists ===
    try {
      const prevT = this.mmcState?.scroll?.["traits"] ?? listT.scrollTop;
      const prevG = this.mmcState?.scroll?.["tags"] ?? listG.scrollTop;
      loadTraitsAndTags().then(({traits, tags}) => {
        const mergeByName = (base, fresh) => {
          const map = new Map((base||[]).map(o => [String(o?.name||"").toLowerCase(), o]));
          for (const it of (fresh||[])) map.set(String(it?.name||"").toLowerCase(), it);
          return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
        };
        this.mmcState.data = this.mmcState.data || {};
        const baseTraits = this.mmcState.data.traits || [];
        const baseTags = this.mmcState.data.tags || [];
        this.mmcState.data.traits = mergeByName(baseTraits, traits);
        this.mmcState.data.tags = mergeByName(baseTags, tags);
        if (typeof renderListTraits === "function") renderListTraits();
        if (typeof renderListTags === "function") renderListTags();
        listT.scrollTop = prevT; requestAnimationFrame(()=>{ listT.scrollTop = prevT; });
        listG.scrollTop = prevG; requestAnimationFrame(()=>{ listG.scrollTop = prevG; });
      });
    } catch (e) {
      console.warn("MMC | Step 4 live load falhou:", e);
    }

    if (this.mmcState.scroll["tags"]!=null) {
      listG.scrollTop = this.mmcState.scroll["tags"];
      requestAnimationFrame(()=>{ listG.scrollTop = this.mmcState.scroll["tags"]; });
    }

    // ===== Bottom-left: Selected Traits
    const selTraits = document.createElement("div"); selTraits.className="mmc-card mmc-selected";
    selTraits.innerHTML = `<h3>Selecionados — Traços</h3>`;
    const chipsT = document.createElement("div"); chipsT.className="mmc-tags";
    grantedTraits.forEach(x=>{
      const c = document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent = x.name;
      chipsT.appendChild(c);
    });
    (this.mmcState.selectedTraits || []).forEach((x,index)=>{
      const c = document.createElement("div"); c.className="mmc-tag";
      c.innerHTML = `${x.name} <button type="button" class="mmc-chip-x" data-remove-trait-index="${index}" title="Remover uma ocorrência">×</button>`;
      chipsT.appendChild(c);
    });
    selTraits.appendChild(chipsT);
    wrap.appendChild(selTraits);

    // ===== Bottom-right: Selected Tags
    const selTags = document.createElement("div"); selTags.className="mmc-card mmc-selected";
    selTags.innerHTML = `<h3>Selecionados — Tags</h3>`;
    const chipsG = document.createElement("div"); chipsG.className="mmc-tags";
    grantedTags.forEach(x=>{
      const c = document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent = x.name;
      chipsG.appendChild(c);
    });
    (this.mmcState.selectedTags || []).forEach((x,index)=>{
      const c = document.createElement("div"); c.className="mmc-tag";
      c.innerHTML = `${x.name} <button type="button" class="mmc-chip-x" data-remove-tag-index="${index}" title="Remover uma ocorrência">×</button>`;
      chipsG.appendChild(c);
    });
    selTags.appendChild(chipsG);
    wrap.appendChild(selTags);

    // -- Live hooks while Step 4 is open (create/update/delete): keep lists in sync without reopening
    if (!this._mmc_step4ItemHooks){
      const handler = async (item, data, opts, userId) => {
        const t = String((item?.type||item?.document?.type||"")).toLowerCase();
        if (t === "trait" || t === "mm-trait" || t === "tag" || t === "mm-tag"){
          await this._mmc_step4RefreshData();
        }
      };
      this._mmc_step4ItemHooks = {
        create: Hooks.on("createItem", handler),
        update: Hooks.on("updateItem", handler),
        delete: Hooks.on("deleteItem", handler)
      };
      this.once?.("close", () => {
        try{
          Hooks.off("createItem", this._mmc_step4ItemHooks.create);
          Hooks.off("updateItem", this._mmc_step4ItemHooks.update);
          Hooks.off("deleteItem", this._mmc_step4ItemHooks.delete);
        }catch(_){}
        this._mmc_step4ItemHooks = null;
      });
    }

    left.querySelector('input[name="search-traits"]').addEventListener("input", (ev)=>{
      this.mmcState.search.traits = ev.target.value || "";
      renderListTraits();
    });
    rightTop.querySelector('input[name="search-tags"]').addEventListener("input", (ev)=>{
      this.mmcState.search.tags = ev.target.value || "";
      renderListTags();
    });

    // Remove exactly one occurrence. Repeatable entries share the same catalog _id,
    // so filtering by _id would remove every copy at once.
    selTraits.querySelectorAll("[data-remove-trait-index]").forEach(btn=> btn.addEventListener("click", ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const index = Number(ev.currentTarget.dataset.removeTraitIndex);
      if (!Number.isInteger(index) || index < 0) return;
      this.mmcState.selectedTraits = (this.mmcState.selectedTraits || []).filter((_,i)=>i!==index);
      this._refreshPowerChips();
    }));
    selTags.querySelectorAll("[data-remove-tag-index]").forEach(btn=> btn.addEventListener("click", ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const index = Number(ev.currentTarget.dataset.removeTagIndex);
      if (!Number.isInteger(index) || index < 0) return;
      this.mmcState.selectedTags = (this.mmcState.selectedTags || []).filter((_,i)=>i!==index);
      this._refreshPowerChips();
    }));

    return wrap;
  }


  
  
  
  // === Step 4 live refresh helper: reload Traits/Tags and rebuild lists, preserving scroll
  async _mmc_step4RefreshData(){
    try{
      const el = this.element;
      const listT = el?.querySelector?.(".mmc-list[data-kind='traits']") || el?.querySelector?.(".mmc-list");
      const listG = el?.querySelector?.(".mmc-list[data-kind='tags']") || el?.querySelectorAll?.(".mmc-list")?.[1];
      const prevT = this.mmcState?.scroll?.["traits"] ?? (listT?.scrollTop||0);
      const prevG = this.mmcState?.scroll?.["tags"] ?? (listG?.scrollTop||0);
      const { traits, tags } = await loadTraitsAndTags();
      const mergeByName = (base, fresh) => {
        const map = new Map((base||[]).map(o => [String(o?.name||"").toLowerCase(), o]));
        for (const it of (fresh||[])) map.set(String(it?.name||"").toLowerCase(), it);
        return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
      };
      this.mmcState.data = this.mmcState.data || {};
      this.mmcState.data.traits = mergeByName(this.mmcState.data.traits||[], traits);
      this.mmcState.data.tags   = mergeByName(this.mmcState.data.tags||[], tags);
      // re-render only step body
      if (typeof this._renderTraitsTags === "function"){
        // minimal re-render of application keeping outer scrolls if any
        const panes = this.element?.querySelectorAll?.('.mmc-scroll');
        const scrolls = panes ? Array.from(panes).map(p=>p.scrollTop) : [];
        await this.render(false);
        if (panes) Array.from(this.element?.querySelectorAll?.('.mmc-scroll')||[]).forEach((p,i)=> p.scrollTop = scrolls[i]||0);
      }
      // restore list scrolls
      const el2 = this.element;
      const lt2 = el2?.querySelector?.(".mmc-list[data-kind='traits']") || el2?.querySelector?.(".mmc-list");
      const lg2 = el2?.querySelector?.(".mmc-list[data-kind='tags']") || el2?.querySelectorAll?.(".mmc-list")?.[1];
      if (lt2){ lt2.scrollTop = prevT; requestAnimationFrame(()=>{ lt2.scrollTop = prevT; }); }
      if (lg2){ lg2.scrollTop = prevG; requestAnimationFrame(()=>{ lg2.scrollTop = prevG; }); }
    }catch(e){ console.warn("MMC | _mmc_step4RefreshData failed", e); }
  }

  _mmcClosePowerEffect(){
    try{
      if (this._mmcPowerEffectKeyHandler){
        document.removeEventListener("keydown", this._mmcPowerEffectKeyHandler);
        this._mmcPowerEffectKeyHandler = null;
      }
      if (this._mmcPowerEffectOverlay?.remove) this._mmcPowerEffectOverlay.remove();
      this._mmcPowerEffectOverlay = null;
    }catch(_e){}
  }

  async _mmcShowPowerEffect(power){
    try{
      this._mmcClosePowerEffect();

      const overlay = document.createElement("div");
      overlay.className = "mmc-power-effect-overlay";
      overlay.setAttribute("role", "presentation");

      const popup = document.createElement("section");
      popup.className = "mmc-power-effect-popup";
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-modal", "true");
      popup.setAttribute("aria-label", `Efeito de ${power?.name || "Poder"}`);

      const header = document.createElement("header");
      header.className = "mmc-power-effect-header";

      const heading = document.createElement("div");
      heading.className = "mmc-power-effect-heading";
      const kicker = document.createElement("span");
      kicker.className = "mmc-power-effect-kicker";
      kicker.textContent = "EFEITO";
      const title = document.createElement("strong");
      title.className = "mmc-power-effect-title";
      title.textContent = power?.name || "Poder";
      heading.append(kicker, title);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "mmc-power-effect-close";
      close.setAttribute("aria-label", "Fechar");
      close.title = "Fechar";
      close.textContent = "×";

      const body = document.createElement("div");
      body.className = "mmc-power-effect-body";
      const effect = String(power?.system?.effect ?? "").trim();
      if (effect){
        // system.effect is a rich-text field (ProseMirror/HTML). Render it as formatted
        // content instead of exposing the stored markup (e.g. <p>, <strong>, lists).
        let enriched = effect;
        try{
          const editor = globalThis.foundry?.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
          if (typeof editor?.enrichHTML === "function") {
            enriched = await editor.enrichHTML(effect, { async: true });
          }
        }catch(err){
          console.warn("MMC | Não foi possível enriquecer o Efeito do Power; usando HTML armazenado.", err);
        }
        body.innerHTML = enriched;
      } else {
        body.textContent = "Este poder não possui um texto de efeito cadastrado.";
      }

      header.append(heading, close);
      popup.append(header, body);
      overlay.appendChild(popup);
      document.body.appendChild(overlay);
      this._mmcPowerEffectOverlay = overlay;

      const cleanup = ()=> this._mmcClosePowerEffect();
      close.addEventListener("click", cleanup);
      overlay.addEventListener("click", ev=>{ if (ev.target === overlay) cleanup(); });
      popup.addEventListener("click", ev=> ev.stopPropagation());

      this._mmcPowerEffectKeyHandler = ev=>{
        if (ev.key === "Escape"){
          ev.preventDefault();
          cleanup();
        }
      };
      document.addEventListener("keydown", this._mmcPowerEffectKeyHandler);
      requestAnimationFrame(()=> close.focus());
    }catch(e){
      console.warn("MMC | Falha ao abrir popup de efeito do Power", e);
    }
  }

  _renderPowers(){
    // Outer container
    const container = document.createElement("div");

    const wrap = document.createElement("div"); 
    wrap.className="mmc-grid";

    // Limits (moved up so we can use below)
    const limit = this._computePowerLimit();
    const originConsume = this._originGrantSubset(limit);

    // Granted
    const grantedAll = this._getGrantedPowers();
    const grantedPowers = [...(grantedAll||[]).filter(p=>p._grantedFrom!=='origin'), ...originConsume];
    const grantedIdSet = new Set(grantedPowers.map(p=>p?._id).filter(Boolean));
    const grantedNameSet = new Set(grantedPowers.map(p=>(p?.name||"").toLowerCase()).filter(Boolean));

    // ===== LEFT: Básicos =====
    const left = document.createElement("div"); left.className="mmc-card";
    left.innerHTML = `<h3>Poderes Básicos</h3>
      <input class="mmc-search" name="search-powers-basic" placeholder="Buscar..." value="${this.mmcState.search?.powers||""}"> `;
    const listBasic = document.createElement("div"); listBasic.className="mmc-list";
    left.appendChild(listBasic);
    wrap.appendChild(left);

    // ===== RIGHT: Power Sets =====
    const right = document.createElement("div"); right.className="mmc-card";
    right.innerHTML = `<h3>Power Sets</h3>`;
    const setSel = document.createElement("select"); setSel.name="powerSet"; setSel.className="mmc-search mmc-select mmc-select-tall";
    (this.mmcState.powerSets||[]).forEach(s=>{ const opt=document.createElement("option"); opt.value=s; opt.textContent=s; setSel.appendChild(opt); });
    setSel.value=this.mmcState.powerSet||"";
    right.appendChild(setSel);
    const listSet = document.createElement("div"); listSet.className="mmc-list";
    right.appendChild(listSet);
    wrap.appendChild(right);

    container.appendChild(wrap);

    const _filterList = (list, q)=>{ q=(q||"").toLowerCase(); Array.from(list.children||[]).forEach(ch=>{ const nm=ch?.dataset?.nameLc||""; ch.style.display = nm.includes(q)?"":"none"; }); };

    // ===== DATA / filtros =====
    const q = (this.mmcState.search?.powers||"").toLowerCase();
    const allP = MMCCharactermancer._mmcDedupPowersByNameAndSet(this.mmcState.data.powers||[]).filter(p=>(p.name||"").toLowerCase().includes(q));
    const setName = this.mmcState.powerSet||"";
    const minRankFromPrereq = (txt)=>{ if(!txt) return 0; let max=0; const re=/Rank\\s*(\\d+)/gi; let m; while((m=re.exec(txt))){ const n=parseInt(m[1]); if(!isNaN(n)) max=Math.max(max,n);} return max; };

    const buildRow = (p)=>{
      const row=document.createElement("div"); row.className="mmc-pwr"; row.dataset.nameLc = (p.name||"").toLowerCase();
      const pre = p.system?.prerequisites||"";
      const reqRank = minRankFromPrereq(pre);
      const picked = (this.mmcState.chosenPowers || []).some(x=>samePower(x,p));
      const granted = grantedPowers.some(x=>samePower(x,p));
      let actionHTML="";
      if (granted){ actionHTML = `<button class="mmc-btn" disabled>Concedido</button>`; }
      else if (picked){ actionHTML = `<button class="mmc-btn" disabled>Selecionado</button>`; }
      else if (reqRank && (Number(this.mmcState.rank||1) < reqRank)){ actionHTML = `<button class="mmc-btn" disabled title="Requer Rank ${reqRank}">Rank ${reqRank}</button>`; }
      else if ( (this.mmcState.chosenPowers||[]).length >= Math.max(0, limit - (originConsume?.length||0)) ){ actionHTML = `<button class="mmc-btn" disabled title="Limite atingido">Limite</button>`; }
      else {
        const result = this._meetsAllPrereqs(pre, this.mmcState, { allP: this.mmcState.data.powers || [], grantedNameSet, grantedIdSet, chosen: this.mmcState.chosenPowers });
        if (!result.ok) { 
          const missingText = (result.missing || []).join(', ').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          const tt = missingText ? ` title="Falta: ${missingText}"` : '';
          actionHTML = `<button class="mmc-btn" disabled${tt}>Bloqueado</button>`; 
        } else { 
          actionHTML = `<button class="mmc-btn" data-add-power="${p._id}">Selecionar</button>`; 
        }
      }
      row.innerHTML = `<div class="name"><span class="mmc-power-name">${p.name}</span><button type="button" class="mmc-power-info" data-power-info="${p._id}" title="Ver efeito" aria-label="Ver efeito de ${p.name}">i</button>${pre?` <span class="mmc-small">— Pré: ${pre}</span>`:""}</div>
        <div class="desc">${p.system?.description||""}</div>
        <div>${actionHTML}</div>`;
      return row;
    };

    // Render BASIC list
    listBasic.innerHTML = "";
    const basic = allP.filter(p=> (p.system?.powerSet??"Basic")==="Basic");
    basic.forEach(p=> listBasic.appendChild(buildRow(p)));
    this._restoreScroll(listBasic,'powers-basic');
    _filterList(listBasic, q);

    // Render SET list
    
listSet.innerHTML = "";
    // Restrict listing to the selected Power Set. A shared name, such as Jump
    // from Spider-Powers and Super-Strength, must never include the other set.
    // Preserve all distinct catalog entries; this is a view-only filter.
    const shownList = powersInSelectedSet(allP, setName);
    shownList.forEach(p=> listSet.appendChild(buildRow(p)));
    this._restoreScroll(listSet,'powers-set');

    // ===== Bottom panel 'Selecionados — Poderes (x / limit)' =====
    const selCard = document.createElement("div"); selCard.className="mmc-card";
    const chosenCount = (this.mmcState.chosenPowers||[]).length + (originConsume?.length||0);
    selCard.innerHTML = `<h3>Selecionados — Poderes (${chosenCount} / ${limit})</h3>`;
    const selGrid = document.createElement("div"); selGrid.className="mmc-grid";
    // left: Básicos
    const colL = document.createElement("div"); colL.className="mmc-card mmc-subcard";
    colL.innerHTML = `<h4>Básicos</h4>`;
    const chipsBasic = document.createElement("div"); chipsBasic.className="mmc-chips";
    colL.appendChild(chipsBasic);
    // right: Power Sets
    const colR = document.createElement("div"); colR.className="mmc-card mmc-subcard";
    colR.innerHTML = `<h4>Power Sets</h4>`;
    const chipsSet = document.createElement("div"); chipsSet.className="mmc-chips";
    colR.appendChild(chipsSet);
    selGrid.appendChild(colL); selGrid.appendChild(colR);
    selCard.appendChild(selGrid);
    container.appendChild(selCard);

    // Render chips content
    const chosenBasic = (this.mmcState.chosenPowers||[]).filter(p=> (p.system?.powerSet??"Basic")==="Basic");
    const grantBasic = grantedPowers.filter(p=> (p.system?.powerSet??"Basic")==="Basic");
    chipsBasic.innerHTML="";
    grantBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent=p.name; chipsBasic.appendChild(c); });
    chosenBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag"; c.innerHTML = `${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsBasic.appendChild(c); });

    const chosenNonBasic = (this.mmcState.chosenPowers||[]).filter(p=> (p.system?.powerSet??"Basic")!=="Basic");
    const grantNonBasic = grantedPowers.filter(p=> (p.system?.powerSet??"Basic")!=="Basic");
    chipsSet.innerHTML="";
    grantNonBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name}`; chipsSet.appendChild(c); });
    chosenNonBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag"; c.innerHTML = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsSet.appendChild(c); });

    // Eventos de busca e select
    const deb = MMCCharactermancer.mmcDebounce((val)=>{ this.mmcState.search.powers = val||""; this.mmcState.scroll['powers-basic']=listBasic.scrollTop; this.mmcState.scroll['powers-set']=listSet.scrollTop; this._focus={...(this._focus||{}), 'powers-basic':{ q:"input[name='search-powers-basic']", pos:(val||"").length } }; this.render(true); }, 500);
    const inputBasic = left.querySelector('input[name="search-powers-basic"]');
    if(this._focus?.['powers-basic']){ try{ inputBasic.focus(); inputBasic.selectionStart=inputBasic.selectionEnd=inputBasic.value.length; }catch(e){} }
    inputBasic.addEventListener("input", ev=>{ const v=ev.target.value||""; _filterList(listBasic, v); deb(v); });
    inputBasic.addEventListener('keyup', ev=>{ try{ this._focus={...(this._focus||{}), 'powers-basic':{ q:"input[name='search-powers-basic']", pos: (ev.currentTarget.selectionEnd||ev.currentTarget.value.length) } }; }catch(e){} });
    inputBasic.addEventListener("keydown", ev=>{
      if (ev.key === "Escape"){ ev.preventDefault(); inputBasic.value=""; deb(""); }
      if ((ev.ctrlKey||ev.metaKey) && ev.key.toLowerCase()==="f"){ ev.preventDefault(); inputBasic.focus(); inputBasic.select(); }
    });
    setSel.addEventListener("change", ev=>{ this.mmcState.powerSet = ev.target.value||""; this.mmcState.scroll['powers-basic']=listBasic.scrollTop; this.mmcState.scroll['powers-set']=listSet.scrollTop; this.render(true); });

    // Popup de efeito dos Powers
    container.querySelectorAll("[data-power-info]").forEach(btn=> btn.addEventListener("click", ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      const id = ev.currentTarget.dataset.powerInfo;
      const p = (this.mmcState.data.powers||[]).find(x=>x._id===id);
      if (p) this._mmcShowPowerEffect(p);
    }));

    // Add/remove listeners
    container.querySelectorAll("[data-add-power]").forEach(btn=> btn.addEventListener("click", ev=>{
      const id = ev.currentTarget.dataset.addPower;
      const p = (this.mmcState.data.powers||[]).find(x=>x._id===id);
      if (!p) return;
      const check = this._meetsAllPrereqs(p.system?.prerequisites, this.mmcState, {
        allP: this.mmcState.data.powers || [], chosen: this.mmcState.chosenPowers,
        grantedNameSet, grantedIdSet
      });
      if (!check.ok) {
        ui.notifications?.warn?.('Pré-requisito ausente: ' + check.missing.join(', '));
        return;
      }
      if ((this.mmcState.rank||1) === 1){
        const chosenSets = new Set((this.mmcState.chosenPowers||[]).map(x=>x.system?.powerSet ?? "Basic").filter(s=>s!=="Basic"));
        const pSet = p.system?.powerSet ?? "Basic";
        if (chosenSets.size>=1 && pSet!=="Basic" && !chosenSets.has(pSet)) { ui.notifications?.warn("Rank 1: Somente Basic + 1 Power Set."); return; }
      }
      const curLim = this._computePowerLimit();
      const originTake = (this._originGrantSubset(curLim)||[]).length; const avail = Math.max(0, curLim - originTake); if ((this.mmcState.chosenPowers||[]).length >= avail) { ui.notifications?.warn(`Limite de poderes: ${curLim} (Origem consumiu ${originTake})`); return; }
      this.mmcState.chosenPowers = [...(this.mmcState.chosenPowers||[]), p];
      this.mmcState.scroll['powers-basic']=listBasic.scrollTop; this.mmcState.scroll['powers-set']=listSet.scrollTop;
      this.render(true);
    }));
    container.querySelectorAll("[data-remove-power]").forEach(btn=> btn.addEventListener("click", ev=>{
      const id = ev.currentTarget.dataset.removePower;
      this.mmcState.chosenPowers = (this.mmcState.chosenPowers||[]).filter(x=>x._id!==id);
      this.mmcState.scroll['powers-basic']=listBasic.scrollTop; this.mmcState.scroll['powers-set']=listSet.scrollTop;
      this.render(true);
    }));

    return container;
  }
_renderReview(){
    const wrap = document.createElement("div"); wrap.className="mmc-card mmc-review";
    const bio = this.mmcState.bio;

    // Status & warnings
    const limit = this._computePowerLimit();
    const chosenCount = (this.mmcState.chosenPowers||[]).length + (this._originGrantSubset(limit)?.length||0);
    const chosenSets = this._getChosenSetsCount();
    const warnings = [];
    if ((this.mmcState.rank||1)===1 && chosenSets>1) warnings.push("Rank 1: apenas Basic + 1 Power Set.");
    if (chosenCount>limit) warnings.push(`Poderes escolhidos (${chosenCount}) excedem o limite (${limit}).`);

    // Granted powers (for summary display)
    const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];

    wrap.innerHTML = `<h3>Revisão</h3>
      <div class="mmc-rank-display">RANK ${this.mmcState.rank}</div>
      ${warnings.length?`<div class="mmc-warn">${warnings.map(w=>`<div>⚠️ ${w}</div>`).join("")}</div>`:""}
      <ul class="mmc-summary">
        <li><strong>Atributos:</strong> M${this.mmcState.abilities.mle} A${this.mmcState.abilities.agl} R${this.mmcState.abilities.res} V${this.mmcState.abilities.vig} E${this.mmcState.abilities.ego} L${this.mmcState.abilities.log}</li>
        <li><strong>Ocupação:</strong> ${this.mmcState.occupation?.name||"—"}</li>
        <li><strong>Origem:</strong> ${this.mmcState.origin?.name||"—"}</li>
        <li><strong>Traços:</strong> ${MMCCharactermancer._mmcFormatNamesWithCounts([...(this.mmcState.occupation?.system?.traits||[]), ...(this.mmcState.origin?.system?.traits||[]), ...(this.mmcState.selectedTraits||[])])||"—"}</li>
        <li><strong>Tags:</strong> ${MMCCharactermancer._mmcFormatNamesWithCounts([...(this.mmcState.occupation?.system?.tags||[]), ...(this.mmcState.origin?.system?.tags||[]), ...(this.mmcState.selectedTags||[])])||"—"}</li>
        <li><strong>Poderes (granteds + escolhidos):</strong> ${[...grantedPowers, ...(this.mmcState.chosenPowers||[])].map(p=>p.name).join(", ")||"—"}</li>
        <li><strong>Limite / Escolhidos:</strong> ${chosenCount} / ${limit}</li>
      </ul>
      <hr>
      <h3>Biografia</h3>
      <div class="mmc-grid" style="grid-template-columns: 1fr 1fr; gap:10px;">
        ${this._bioInput("codename","Codinome", bio.codename)}
        ${this._bioInput("realname","Nome Real", bio.realname)}
        ${this._bioInput("gender","Gênero", bio.gender)}
        ${this._bioSelectSize("size","Tamanho", bio.size)}
        ${this._bioInput("height","Altura", bio.height)}
        ${this._bioInput("weight","Peso", bio.weight)}
      </div>
      <div class="mmc-field" style="grid-column:1/-1;"><label>Histórico</label><textarea name="bio.history">${bio.history||""}</textarea></div>
      <div class="mmc-field" style="grid-column:1/-1;"><label>Personalidade</label><textarea name="bio.personality">${bio.personality||""}</textarea></div>
    `;
    
    // listeners
    wrap.querySelectorAll("[data-bio]").forEach(inp=> {
      const handler = (ev)=> { const key = ev.currentTarget.dataset.bio; this.mmcState.bio[key] = ev.currentTarget.value; };
      inp.addEventListener("input", handler);
      inp.addEventListener("change", handler);
    });
    wrap.querySelector('textarea[name="bio.history"]').addEventListener("input", ev=> this.mmcState.bio.history=ev.target.value);
    wrap.querySelector('textarea[name="bio.personality"]').addEventListener("input", ev=> this.mmcState.bio.personality=ev.target.value);
    return wrap;
  
  }
_bioInput(key,label,val){
    return `<div class="mmc-field"><label>${label}</label><input type="text" data-bio="${key}" value="${val??""}"></div>`;
  }
  _bioSelectSize(key,label,val){
    const opts = ["MICROSCOPIC","MINATURE","TINY","LITTLE","SMALL","AVERAGE","BIG","HUGE","GIGANTIC","TITANIC","GARGANTUAN"];
    const cur = (val||"AVERAGE").toUpperCase();
    const build = opts.map(o=>`<option value="${o}" ${o===cur?"selected":""}>${o}</option>`).join("");
    return `<div class="mmc-field"><label>${label}</label><select class="mmc-select" data-bio="${key}">${build}</select></div>`;
  }


  async _onNext(){
    if (this.step < this.steps.length-1) { this.step+=1; return this._refreshPowerChips(); }
    // Apply to actor
    const actorData = foundry.utils.deepClone(this.mmcState.actorModel ?? {});
    if (!actorData?.system) { ui.notifications?.error("Ator modelo ausente em data/actor-modelo.json"); return; }

    // Rank and Abilities
    actorData.system.attributes.rank.value = this.mmcState.rank;
    for (const k of Object.keys(this.mmcState.abilities)) actorData.system.abilities[k].value = this.mmcState.abilities[k];
    const calc = (v)=> Math.max(10, (v??0)*30);
    actorData.system.health = actorData.system.health||{};
    actorData.system.focus = actorData.system.focus||{};
    actorData.system.health.max = calc(this.mmcState.abilities.res);
    actorData.system.health.value = actorData.system.health.max;
    actorData.system.focus.max = calc(this.mmcState.abilities.vig);
    actorData.system.focus.value = actorData.system.focus.max;

    // Biography
    for (const [k,v] of Object.entries(this.mmcState.bio)) actorData.system[k] = v;

    actorData.name = (this.mmcState.bio.codename?.trim()) || (this.mmcState.bio.realname?.trim()) || actorData.name || "Herói";
    actorData.prototypeToken = actorData.prototypeToken || {};
    actorData.prototypeToken.name = actorData.name;
    if (this.mmcState.bio?.size) actorData.system.size = String(this.mmcState.bio.size).toLowerCase();
    const actor = await Actor.create(actorData, {renderSheet:true});
    const items = [];
    if (this.mmcState.occupation) items.push(this.mmcState.occupation);
    if (this.mmcState.origin) items.push(this.mmcState.origin);
    const grantedTraits = [
      ...(this.mmcState.occupation?.system?.traits || []),
      ...(this.mmcState.origin?.system?.traits || [])
    ];
    const grantedTags = [
      ...(this.mmcState.occupation?.system?.tags || []),
      ...(this.mmcState.origin?.system?.tags || [])
    ];
    const preparedTraits = MMCCharactermancer._mmcDedupRepeatAware([
      ...grantedTraits,
      ...(this.mmcState.selectedTraits || [])
    ]).map(it => {
      const clone = foundry.utils.deepClone(it ?? {});
      if (!clone.mmcKind) clone.mmcKind = "trait";
      if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
      return clone;
    });
    const preparedTags = MMCCharactermancer._mmcDedupRepeatAware([
      ...grantedTags,
      ...(this.mmcState.selectedTags || [])
    ]).map(it => {
      const clone = foundry.utils.deepClone(it ?? {});
      if (!clone.mmcKind) clone.mmcKind = "tag";
      if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
      return clone;
    });
    const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];
    // Preserve distinct homonyms from different power sets. Collapse only
    // numbered series from the same set, keeping the highest selected tier.
    const cleanedPowers = prepareCharacterPowers(grantedPowers, this.mmcState.chosenPowers || []);
    const keptGranted = cleanedPowers.filter(p=>grantedPowers.includes(p));
    const keptChosen = cleanedPowers.filter(p=>!grantedPowers.includes(p));
    items.push(...preparedTraits, ...preparedTags, ...keptGranted, ...keptChosen);
    if (items.length) {
      // Ensure every item has a type (system v2.2.0 requires it)
      const fixedItems = [];
      for (const it of items){
        const fallback = it?.mmcKind ||
                         (it?.system?.powerSet!==undefined || it?.system?.actionType ? "power" :
                         (String(it?.name||"").toLowerCase().includes("tag") ? "tag" :
                         (String(it?.name||"").toLowerCase().includes("trait") ? "trait" : undefined)));
        fixedItems.push(await MMCCharactermancer._mmcEnsureType(it, fallback));
      }
      await actor.createEmbeddedDocuments("Item", fixedItems);
    }
ui.notifications?.info("Personagem criado com sucesso via Charactermancer.");
    this.close();
  }
}

Hooks.once("init", () =>
  console.log(
    `Marvel Multiverse Charactermancer | integrado ao sistema v${game.system?.version ?? "?"}`
  )
);

Hooks.on("renderActorDirectory", (app, htmlOrElement, data)=>{
  try {
    let root=null;
    if (htmlOrElement && typeof htmlOrElement.querySelector==="function") root=htmlOrElement;
    else if (htmlOrElement && typeof htmlOrElement==="object") root = htmlOrElement[0] ?? null;
    if (!root?.querySelector) return;
    let actions = root.querySelector(".directory-header .header-actions"); if (!actions) actions = root.querySelector(".directory-header .action-buttons"); if (!actions) return;
    const btn = document.createElement("button");
    btn.className="mmc-btn"; btn.innerHTML = `<i class="fas fa-magic"></i> ${MMCCharactermancer.mmcLocalize("MMC.Open", "Charactermancer")}`;
    btn.addEventListener("click", ()=> new MMCCharactermancer().render(true));
    if (!actions.querySelector('.mmc-open-charactermancer')) {
      btn.classList.add('mmc-open-charactermancer');
      actions.appendChild(btn);
    }
  } catch(e){ console.error("MMC renderActorDirectory", e); }
});
