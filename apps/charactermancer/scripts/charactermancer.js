
import { loadTraitsAndTags } from "./utils/mmc-load-traits-tags.js";

/* Marvel Multiverse — Charactermancer v0.6.7 */
class MMCCharactermancer extends Application {

  
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
  static _mmcDedupPowersByNameAndSet(arr){
    try{
      const map = new Map();
      for (const it of arr||[]){
        const nm = String(it?.name||"").toLowerCase().trim();
        const set = String(it?.system?.powerSet||"").toLowerCase().trim();
        if (!nm) continue;
        const key = nm + "::" + set;
        if (!map.has(key)) map.set(key, it);
        else {
          const cur = map.get(key);
          const curWorld = String(cur?.pack||"").startsWith("world.");
          const nowWorld = String(it?.pack||"").startsWith("world.");
          if (nowWorld && !curWorld) map.set(key, it);
          else {
            const curT = Number(cur?._stats?.modifiedTime||0);
            const nowT = Number(it?._stats?.modifiedTime||0);
            if (nowT > curT) map.set(key, it);
            else map.set(key, it);
          }
        }
      }
      return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
    }catch(e){ return Array.from(arr||[]); }
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
    try { this.state = this.state || {}; this.state.cache = this.state.cache || {}; delete this.state.cache["packs_"+kind]; } catch(e){}
  }

  /**
   * Atualiza os PODERES a partir do Mundo e de TODOS os Compêndios (ignora cache), mesclando por nome.
   * Se 'renderAfter' for true, re-renderiza mantendo o scroll.
   */
  async _refreshPowersFromCompendia(renderAfter=false){
    // cache not used for refresh
    try{
      const worldPowers = await this._getWorldItems("power"); const _wC = (worldPowers||[]).length;
      const packPowers  = await this._getPackItems("power"); const _pC = (packPowers||[]).length; console.info('[mmc] refresh powers: world=',_wC,'packs=',_pC);
      const override = new Map();
      for (const it of [...worldPowers, ...packPowers]){
        if (!it?.name) continue;
        override.set(String(it.name).toLowerCase(), it);
      }
      const base = Array.from(this.state.data.powers || []);
      const merged = [];
      const seen = new Set();
      for (const it of base){
        const key = String(it?.name||"").toLowerCase();
        if (override.has(key)){ merged.push(override.get(key)); seen.add(key); }
        else merged.push(it);
      }
      for (const [k, it] of override){
        if (!seen.has(k)) merged.push(it);
      }
      this.state.data.powers = MMCCharactermancer._mmcDedupPowersByNameAndSet(merged);
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.state.data.powers = (this.state.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

      if (renderAfter){
        const panes = this.element?.[0]?.querySelectorAll?.('.mmc-scroll');
        const scrolls = panes ? Array.from(panes).map(p=>p.scrollTop) : [];
        await this.render(false);
        if (panes) Array.from(this.element?.[0]?.querySelectorAll?.('.mmc-scroll')||[]).forEach((p,i)=> p.scrollTop = scrolls[i]||0);
      }
    }catch(e){ console.warn("[mmc] _refreshPowersFromCompendia failed", e); }
  }

  /**
   * Verifica todos os pré‑requisitos (Rank, Atributos, Traços, Tags e Poderes necessários).
   * Retorna { ok: boolean, missing: string[] }.
   */
  _meetsAllPrereqs(preText, state, ctx={}){
    try{
      if (!preText || !String(preText).trim()) return {ok:true, missing:[]};
      const text = String(preText).toLowerCase().replace(/^pré:\s*/,'').trim();
      const missing = [];
      const haveChosen = new Set((state.chosenPowers||[]).map(p => (p.name||'').toLowerCase()));
      const haveGranted = new Set([...(ctx.grantedNameSet||new Set())]);
      const haveAllPowers = new Set([...haveChosen, ...haveGranted]);
      const abilities = state.abilities || {};

      // Rank
      const rankHits = [...text.matchAll(/rank\s*(\d+)/g)];
      for (const m of rankHits){
        const need = Number(m[1]||0);
        if (Number(state.rank||0) < need) missing.push(`Rank ${need}`);
      }

      // Abilities
      const map = { agl:'agl', melee:'mle', mle:'mle', res:'res', resilience:'res', vig:'vig', vigilance:'vig', ego:'ego', log:'log', logic:'log' };
      const abilHits = [...text.matchAll(/\b(agl|mle|res|vig|ego|log|melee|resilience|vigilance|logic)\s*(\d+)\s*\+/g)];
      for (const m of abilHits){
        const key = map[m[1]] || m[1];
        const need = Number(m[2]||0);
        const have = Number(abilities?.[key] ?? 0);
        if (have < need) missing.push(`${m[1].toUpperCase()} ${need}+`);
      }

      // Traits
      const traitHits = [...text.matchAll(/\b(trai?ç?o?s?|trait?s?)\s*:\s*([^\.;,]+)/g)];
      for (const m of traitHits){
        const list = (m[2]||'').split(/[,;/]+|\se\s/).map(s=>s.trim().toLowerCase()).filter(Boolean);
        const have = new Set((state.selectedTraits||[]).map(t => (t.name||'').toLowerCase()));
        for (const name of list){ if (!have.has(name)) missing.push(`Traço ${name}`); }
      }

      // Tags
      const tagHits = [...text.matchAll(/\b(tags?)\s*:\s*([^\.;,]+)/g)];
      for (const m of tagHits){
        const list = (m[2]||'').split(/[,;/]+|\se\s/).map(s=>s.trim().toLowerCase()).filter(Boolean);
        const have = new Set((state.selectedTags||[]).map(t => (t.name||'').toLowerCase()));
        for (const name of list){ if (!have.has(name)) missing.push(`Tag ${name}`); }
      }

      // Required powers by name
      const tokens = text.split(/[,;•\-\u2013\u2014]/).map(s => s.trim()).filter(Boolean);
      const allPowerNames = new Set((ctx.allP||[]).map(p => (p.name||'').toLowerCase()));
      for (let tok of tokens){
        const t = tok.replace(/^pré:\s*/,'').trim();
        if (!t) continue;
        if (/^rank\s*\d+/.test(t)) continue;
        if (/\b(agl|mle|res|vig|ego|log|melee|resilience|vigilance|logic)\s*\d+\s*\+?/.test(t)) continue;
        if (/^(trai?ç?o?s?|trait?s?|tags?)\s*:/.test(t)) continue;
        const match = [...allPowerNames].find(n => n === t || n.startsWith(t));
        if (match && !haveAllPowers.has(match)){
          missing.push(`Poder ${match}`);
        }
      }

      return {ok: missing.length===0, missing};
    }catch(e){ console.warn('[mmc] prereq parse error', e); return {ok:true, missing:[]}; }
  }

  _restoreFocus(key){ try{ const sel = this._focus?.[key]; if(!sel) return; const el = this.element?.querySelector(sel.q); if(!el) return; el.focus(); if(typeof sel.pos==='number'){ try{ el.selectionStart=el.selectionEnd=Math.min(sel.pos, el.value?.length??0);}catch(e){} } }catch(e){} }

  _restoreScroll(el, key){ try{ el.scrollTop = (this.state?.scroll?.[key] ?? 0); requestAnimationFrame(()=>{ try{ el.scrollTop = (this.state?.scroll?.[key] ?? 0); setTimeout(()=>{ try{ el.scrollTop = (this.state?.scroll?.[key] ?? 0); }catch(e){} }, 0); }catch(e){} }); }catch(e){} }

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



  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mmc-app",
      classes: ["mmc-app","sheet"],
      title: "Marvel Multiverse — Charactermancer",
      template: null,
      width: 1100,
      height: 700,
      resizable: true
    });
  }
  constructor(options={}) {
    super(options);
    this.steps = ["rank-abilities","occupation","origin","traits-tags","powers","review"];
    this.step = 0;
    this.state = {
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
      powerLimitMatrix: {1:{'<=1':4}, 2:{'1':9,'2+':8}, 3:{'1':14,'2':13,'3+':12}, 4:{'1':19,'2':18,'3':17,'4+':16}, 5:{'1':24,'2':23,'3':22,'4':21,'5+':20}},
      data: {items:[], occupations:[], origins:[], traits:[], tags:[], powers:[]},
      search: {occupation:"", origin:"", traits:"", tags:"", powers:""},
      bio: { codename:"", realname:"", gender:"", size:"average", height:"", weight:"", eyes:"", hair:"", teams:"", base:"", history:"", personality:"" }
    };
  }

  async _loadJSON(path) { const r = await fetch(path); return await r.json(); }

  async _ensureData() {
    if (this._loaded) return;
    const base = "modules/marvel-multiverse-charactermancer/data/";
    const [items, occupations, origins, traits, tags, powers, actorModel] = await Promise.all([
      this._loadJSON(base+"items.json").catch(()=>({items:[]})),
      this._loadJSON(base+"occupations.json").catch(()=>({items:[]})),
      this._loadJSON(base+"origins.json").catch(()=>({items:[]})),
      this._loadJSON(base+"traits.json").catch(()=>({items:[]})),
      this._loadJSON(base+"tags.json").catch(()=>({items:[]})),
      this._loadJSON(base+"powers.json").catch(()=>({items:[]})),
      this._loadJSON(base+"actor-modelo.json").catch(()=>({}))
    ]);
    this.state.data.items = items.items ?? [];
    this.state.data.occupations = occupations.items ?? [];
    this.state.data.origins = origins.items ?? [];
    this.state.data.traits = traits.items ?? [];
    this.state.data.tags = tags.items ?? [];
    this.state.data.powers = powers.items ?? [];
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.state.data.powers = (this.state.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

    this.state.actorModel = actorModel;

    // Sort everything by name
    const byName = (a,b)=> (a?.name||"").localeCompare(b?.name||"");
    
    // Merge/override 'powers' from World + Compendia so we always use most up-to-date data
    try{
      const worldPowers = await this._getWorldItems("power"); const _wC = (worldPowers||[]).length;
      const packPowers = await this._preloadKindFromPacks("power");
      const override = new Map();
      for (const it of [...worldPowers, ...packPowers]){
        if (!it?.name) continue;
        override.set(String(it.name).toLowerCase(), it);
      }
      if (override.size){
        const base = Array.from(this.state.data.powers || []);
        const merged = [];
        const seen = new Set();
        for (const it of base){
          const key = String(it?.name||"").toLowerCase();
          if (override.has(key)){ merged.push(override.get(key)); seen.add(key); }
          else merged.push(it);
        }
        // Include any extra powers that exist only in packs/world
        for (const [k, it] of override){
          if (!seen.has(k)) merged.push(it);
        }
        this.state.data.powers = MMCCharactermancer._mmcDedupPowersByNameAndSet(merged);
    // Normalize powerSet labels across sources (fixes small punctuation/whitespace differences)
    try{
      const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
      this.state.data.powers = (this.state.data.powers||[]).map(p=>{
        try{
          if (p?.system) p.system.powerSet = canon(p.system.powerSet);
        }catch(e){}
        return p;
      });
    }catch(e){} 

      }
    }catch(e){ console.warn("[mmc] merge powers from packs/world failed", e); }

    // Atualiza poderes a partir de Compêndios/Mundo
    await this._refreshPowersFromCompendia(false);
for (const k of ["items","occupations","origins","traits","tags","powers"]) this.state.data[k].sort(byName);

    // Power sets
    const sets = Array.from(new Set((this.state.data.powers||[]).map(p=>p.system?.powerSet).filter(Boolean))).sort();
    this.state.powerSets = sets.filter(s=>s!=="Basic");
    this.state.powerSet = this.state.powerSets[0] ?? "";

    // Prefill bio from model
    const m = actorModel?.system||{};
    const bioKeys = ["codename","realname","height","weight","gender","eyes","hair","size","teams","history","personality"];
    for (const k of bioKeys) this.state.bio[k] = m[k] ?? this.state.bio[k];

    this._loaded = true;
  }

  getData(){ return {}; }

  async render(force, opts){ await this._ensureData(); return super.render(force, opts); }

  async _renderInner(data) {
    const wrap = document.createElement("div");

    // Header / Steps
    const stepsBar = document.createElement("div");
    stepsBar.className = "mmc-steps";
    this.steps.forEach((s, i)=>{
      const el = document.createElement("div");
      el.className = "mmc-step"+(i===this.step?" active":"");
      const label = this._labelFor(s);
      el.textContent = `${i+1}. ${label}`;
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
    back.textContent = game.i18n.localize("MMC.Back")||"Voltar";
    back.disabled = (this.step===0);
    back.addEventListener("click", ()=>{ this.step=Math.max(-3,this.step-1); this._refreshPowerChips(); });
    const next = document.createElement("button");
    next.className = "mmc-btn";
    next.textContent = (this.step===this.steps.length-1) ? (game.i18n.localize("MMC.Apply")||"Aplicar no Ator") : (game.i18n.localize("MMC.Next")||"Seguinte");
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
    6:{maxAbility:this._getMaxAttributeForRank(6), powerLimit:"26 (1) • 25 (2) • 24 (3) • 23 (4) • 22 (5) • 21 (6+)", note:""}
  };}


_getChosenSetsCount(){
  const sets = new Set(this.state.chosenPowers.map(x=> (x.system?.powerSet ?? "Basic")).filter(s=> s !== "Basic"));
  return sets.size;
}


  _getGrantedPowers(){
    // Powers granted by Occupation and Origin (and possibly Tags in future)
    const out = [];
    const pushAll = (arr,src)=>{ if (Array.isArray(arr)) for (const p of arr) if (p) { const q=foundry.utils.deepClone(p); q._grantedFrom=src; out.push(q);} };
    try{ pushAll(this.state.occupation?.system?.powers || [], 'occupation'); }catch(e){}
    try{ pushAll(this.state.origin?.system?.powers || [], 'origin'); }catch(e){}
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
  const r = this.state.rank || 1;
  const m = this.state.powerLimitMatrix?.[r];
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
    const r = Number(rank || this.state.rank || 1);
    return Math.max(1, r + 3);
  }

  activateListeners(html){ try{ const pad=8; const w=Math.max(640, window.innerWidth-pad*2); const h=Math.max(480, window.innerHeight-pad*2); }catch(e){} super.activateListeners?.(html); }

  
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
      const active = (this.state.rank===r) ? ' style="border:1px solid var(--mmc-accent);border-radius:8px;padding:6px;"' : "";
      row.innerHTML = `<div class="name"${active}>Rank ${r}</div>
      <div class="desc mmc-small">Máx. atributo: ${S[r].maxAbility} • Limite de poderes: ${S[r].powerLimit} ${S[r].note?("• "+S[r].note):""}</div>
      <div><button class="mmc-btn" data-pick-rank="${r}">Selecionar</button></div>`;
      list.appendChild(row);
    });
    left.appendChild(list);
    // restore scroll (immediate + next tick)
    try{ if (this.state.scroll && this.state.scroll.rankList!=null) list.scrollTop = this.state.scroll.rankList; }catch(e){}
    try{ const prev = (this.state?.scroll?.rankList ?? null); if (prev!=null) requestAnimationFrame(()=>{ try{ const ll = left.querySelector('.mmc-list'); if (ll) ll.scrollTop = prev; }catch(e){} }); }catch(e){}
    wrap.appendChild(left);

    // Right: Attributes as dropdowns
    const right = document.createElement("div"); right.className="mmc-card";
    right.innerHTML = `<h3>Atributos (M.A.R.V.E.L.)</h3>`;
    const labels = {mle:"Melee", agl:"Agility", res:"Resilience", vig:"Vigilance", ego:"Ego", log:"Logic"};
    const keys = ["mle","agl","res","vig","ego","log"];
    const pointsBudget = this.state.abilityPointsByRank[this.state.rank] ?? 0;
    const maxA = this._getMaxAttributeForRank(this.state.rank);
    const allowedFor = (name) => {
      const out = [];
      for (let v=-3; v<=maxA; v++){
        const cur = {...(this.state.abilities||{})};
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
      const current = Number((this.state.abilities||{})[k] ?? 0);
      for (const v of allowed){
        const opt = document.createElement("option");
        opt.value = String(v);
        opt.textContent = (v>=0 ? String(v) : String(v)); // sem '+'
        if (v===current) opt.selected = true;
        sel.appendChild(opt);
      }
      // Garantir que um valor apareça no controle
      if (allowed.includes(current)) sel.value = String(current);
      else if (allowed.includes(0)) { sel.value = "0"; this.state.abilities[k] = 0; }
      else if (allowed.length) { sel.value = String(allowed[0]); this.state.abilities[k] = allowed[0]; }
      
      // Garantir que um valor apareça no controle
      if (allowed.includes(current)) sel.value = String(current);
      else if (allowed.includes(0)) { sel.value = "0"; this.state.abilities[k] = 0; }
      else if (allowed.length) { sel.value = String(allowed[0]); this.state.abilities[k] = Number(allowed[0]||0); }
sel.addEventListener("change", (ev)=>{
        const v = Number(ev.target.value||0);
        this.state.abilities[k] = v;
        try{ this.state.scroll = this.state.scroll || {}; this.state.scroll.rankList = list.scrollTop; }catch(e){}
        this._refreshPowerChips();
      });
      field.innerHTML = `<label>${labels[k]}</label>`;
      field.appendChild(sel);
      right.appendChild(field);
    }
    const sumPos = Object.values(this.state.abilities||{}).reduce((a,b)=>a + (b>0?b:0),0);
    const refund = Object.values(this.state.abilities||{}).reduce((a,b)=>a + (b<0?(-b):0),0);
    const rest = pointsBudget + refund - sumPos;
    const restEl = document.createElement("div"); restEl.className="mmc-small"; restEl.textContent = `Pontos restantes: ${rest}`;
    right.appendChild(restEl);
    wrap.appendChild(right);

    // Listeners
    left.querySelectorAll("[data-pick-rank]").forEach(btn=> btn.addEventListener("click", ev=>{
      const rank = Number(ev.currentTarget.dataset.pickRank||ev.currentTarget.getAttribute("data-pick-rank"));
      const was = this.state.rank;
      this.state.rank = rank;
      this.state.maxAbility = this._getMaxAttributeForRank(rank);
      if (rank !== was) { this.state.abilities = {mle:0, agl:0, res:0, vig:0, ego:0, log:0}; }
      try{ this.state.scroll = this.state.scroll || {}; this.state.scroll.rankList = list.scrollTop; }catch(e){}
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
      this.state = this.state || {};
      this.state.cache = this.state.cache || {};
      if (this.state.cache["packs_"+kind]) return this.state.cache["packs_"+kind];
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
      this.state.cache["packs_"+kind] = results;
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
    const right = this._renderSelectionDetails(kind, (kind==="occupation"?this.state.occupation:this.state.origin) || null);
    wrap.appendChild(right);

    const keyOf = (o)=> String(o?.name || "").toLowerCase().trim();
    const collator = new Intl.Collator(game.i18n?.lang || "pt-BR", { sensitivity: "base" });

    // Data sources
    const base = (kind==="occupation"?(this.state.data.occupations||[]):(this.state.data.origins||[]));
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
        row.innerHTML = `<div class="name">${o.name}</div><div class="desc">${o.system?.description||""}</div><div><button class="mmc-btn" data-pick="${pickKey}">${game.i18n.localize("MMC.Select")||"Selecionar"}</button></div>`;
        list.appendChild(row);
      });
      list.querySelectorAll("[data-pick]").forEach(btn=> btn.addEventListener("click", (ev)=>{
        const k = ev.currentTarget.dataset.pick;
        const obj = src.find(x=> keyOf(x)===k) ?? null;
        if (kind==="occupation") this.state.occupation=obj; else this.state.origin=obj;
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

    // Helpers/state
    this.state.search = this.state.search || {};
    this.state.scroll = this.state.scroll || {};
    this.state.selectedTraits = this.state.selectedTraits || [];
    this.state.selectedTags = this.state.selectedTags || [];

    // Granted by Occupation/Origin
    const grantedTraits = [
      ...(this.state.occupation?.system?.traits || []),
      ...(this.state.origin?.system?.traits || [])
    ].filter(Boolean);
    const grantedTags = [
      ...(this.state.occupation?.system?.tags || []),
      ...(this.state.origin?.system?.tags || [])
    ].filter(Boolean);

    // Build id and name sets for reliable matching
    const traitIdSet = new Set(grantedTraits.map(t=>t?._id).filter(Boolean));
    const traitNameSet = new Set(grantedTraits.map(t=>(t?.name||"").toLowerCase()).filter(Boolean));
    const tagIdSet = new Set(grantedTags.map(t=>t?._id).filter(Boolean));
    const tagNameSet = new Set(grantedTags.map(t=>(t?.name||"").toLowerCase()).filter(Boolean));
    const isConnections = (nm)=> /^(connections|conexões)$/i.test(nm||"");

    // Rules: extra Traits allowed = current Rank
    const extraAllowed = Number(this.state.rank || 1);
    const used = (this.state.selectedTraits || []).length;
    const remaining = Math.max(0, extraAllowed - used);

    // ===== Left column: Traits list
    const left = document.createElement("div"); left.className="mmc-card";
    left.innerHTML = `<h3>Traços</h3>
      <div id="mmc-traits-remaining" class="mmc-small">Traços extras restantes: ${remaining} (de ${extraAllowed})</div>
      <input class="mmc-search" name="search-traits" placeholder="Buscar..." value="${this.state.search?.traits || ""}"> `;
    const listT = document.createElement("div"); listT.className="mmc-list"; listT.setAttribute("data-kind","traits");
    left.appendChild(listT);
    wrap.appendChild(left);

    const renderListTraits = () => {
      const prev = listT.scrollTop;
      listT.innerHTML = "";
      const tq = (this.state.search?.traits || "").toLowerCase();
      (this.state.data?.traits || [])
        .filter(t => (t.name || "").toLowerCase().includes(tq))
        // hide granted unless "Connections"
        .filter(t => !(traitIdSet.has(t._id) || traitNameSet.has((t.name||"").toLowerCase())) || isConnections(t.name))
        .forEach(t=>{
          const row = document.createElement("div"); row.className="mmc-pwr";
          const picked = !!this.state.selectedTraits.find(x=>x._id===t._id || (x.name||"").toLowerCase()===(t.name||"").toLowerCase());
          // disable when already granted or already picked (except Connections)
          const disableByGrant = (traitIdSet.has(t._id) || traitNameSet.has((t.name||"").toLowerCase())) && !isConnections(t.name);
          const disableByPicked = picked && !isConnections(t.name);
          const disabled = disableByGrant || disableByPicked || remaining<=0;
          let action = `<button class="mmc-btn" data-add-trait="${t._id}" ${disabled?"disabled":""}>Selecionar</button>`;
          if (disableByGrant) action = `<button class="mmc-btn" disabled>Concedido</button>`;
          if (!disableByGrant && disableByPicked) action = `<button class="mmc-btn" disabled>Selecionado</button>`;
          row.innerHTML = `<div class="name">${t.name}</div>
            <div class="desc">${t.system?.description || ""}</div>
            <div>${action}</div>`;
          listT.appendChild(row);
        });
      // restore scroll
      listT.scrollTop = prev;
      requestAnimationFrame(()=>{ listT.scrollTop = prev; });
      // attach add handlers
      listT.querySelectorAll("[data-add-trait]").forEach(btn=> btn.addEventListener("click", ev=>{
        const id = ev.currentTarget.dataset.addTrait;
        const obj = (this.state.data?.traits||[]).find(x=>x._id===id);
        // prevent dup by name when not Connections
        if (obj && !isConnections(obj.name)) {
          const dupByName = (this.state.selectedTraits||[]).some(x => (x.name||"").toLowerCase()===(obj.name||"").toLowerCase());
          if (dupByName) return;
        }
        if (remaining<=0) { ui.notifications?.warn("Você já escolheu todos os Traços bônus."); return; }
        if (obj) this.state.selectedTraits.push(obj);
        this.state.scroll["traits"]=listT.scrollTop;
        this._refreshPowerChips();
      }));
    };
    renderListTraits();
    // restore persistent scroll from state after build
    if (this.state.scroll["traits"]!=null) { listT.scrollTop = this.state.scroll["traits"]; requestAnimationFrame(()=>{ listT.scrollTop = this.state.scroll["traits"]; }); }

    // ===== Right column: Tags list
    const rightTop = document.createElement("div"); rightTop.className="mmc-card";
    rightTop.innerHTML = `<h3>Tags</h3>
      <input class="mmc-search" name="search-tags" placeholder="Buscar..." value="${this.state.search?.tags || ""}"> `;
    const listG = document.createElement("div"); listG.className="mmc-list"; listG.setAttribute("data-kind","tags");
    rightTop.appendChild(listG);
    wrap.appendChild(rightTop);

    const renderListTags = () => {
      const prev = listG.scrollTop;
      listG.innerHTML = "";
      const gq = (this.state.search?.tags || "").toLowerCase();
      (this.state.data?.tags || [])
        .filter(t => (t.name || "").toLowerCase().includes(gq))
        .forEach(t=>{
          const row = document.createElement("div"); row.className="mmc-pwr";
          const granted = tagIdSet.has(t._id) || tagNameSet.has((t.name||"").toLowerCase());
          const picked = !!this.state.selectedTags.find(x=>x._id===t._id || (x.name||"").toLowerCase()===(t.name||"").toLowerCase());
          const disabled = granted || picked;
          let action = `<button class="mmc-btn" data-add-tag="${t._id}" ${disabled?"disabled":""}>Selecionar</button>`;
          if (granted) action = `<button class="mmc-btn" disabled>Concedido</button>`;
          if (!granted && picked) action = `<button class="mmc-btn" disabled>Selecionado</button>`;
          row.innerHTML = `<div class="name">${t.name}</div>
            <div class="desc">${t.system?.description || ""}</div>
            <div>${action}</div>`;
          listG.appendChild(row);
        });
      listG.scrollTop = prev;
      requestAnimationFrame(()=>{ listG.scrollTop = prev; });
      listG.querySelectorAll("[data-add-tag]").forEach(btn=> btn.addEventListener("click", ev=>{
        const id = ev.currentTarget.dataset.addTag;
        const obj = (this.state.data?.tags||[]).find(x=>x._id===id);
        if (obj) this.state.selectedTags.push(obj);
        this.state.scroll["tags"]=listG.scrollTop;
        this._refreshPowerChips();
      }));
    };
    renderListTags();
    
    // === Live-load Traits & Tags from World/Compendia (no cache), then refresh lists ===
    try {
      const prevT = this.state?.scroll?.["traits"] ?? listT.scrollTop;
      const prevG = this.state?.scroll?.["tags"] ?? listG.scrollTop;
      loadTraitsAndTags().then(({traits, tags}) => {
        const mergeByName = (base, fresh) => {
          const map = new Map((base||[]).map(o => [String(o?.name||"").toLowerCase(), o]));
          for (const it of (fresh||[])) map.set(String(it?.name||"").toLowerCase(), it);
          return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
        };
        this.state.data = this.state.data || {};
        const baseTraits = this.state.data.traits || [];
        const baseTags = this.state.data.tags || [];
        this.state.data.traits = mergeByName(baseTraits, traits);
        this.state.data.tags = mergeByName(baseTags, tags);
        if (typeof renderListTraits === "function") renderListTraits();
        if (typeof renderListTags === "function") renderListTags();
        // restore scrolls (list-level)
        listT.scrollTop = prevT; requestAnimationFrame(()=>{ listT.scrollTop = prevT; });
        listG.scrollTop = prevG; requestAnimationFrame(()=>{ listG.scrollTop = prevG; });
      });
    } catch (e) {
      console.warn("MMC | Step 4 live load falhou:", e);
    }

    if (this.state.scroll["tags"]!=null) { listG.scrollTop = this.state.scroll["tags"]; requestAnimationFrame(()=>{ listG.scrollTop = this.state.scroll["tags"]; }); }

    // ===== Bottom-left: Selected Traits
    const selTraits = document.createElement("div"); selTraits.className="mmc-card mmc-selected";
    selTraits.innerHTML = `<h3>Selecionados — Traços</h3>`;
    const chipsT = document.createElement("div"); chipsT.className="mmc-tags";
    // granted first (cannot remove)
    grantedTraits.forEach(x=>{
      const c = document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent = x.name;
      chipsT.appendChild(c);
    });
    // extras picked by user (can remove)
    (this.state.selectedTraits || []).forEach(x=>{
      const c = document.createElement("div"); c.className="mmc-tag"; 
      c.innerHTML = `${x.name} <button type="button" class="mmc-chip-x" data-remove-trait="${x._id}" title="Remover">×</button>`;
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
    (this.state.selectedTags || []).forEach(x=>{
      const c = document.createElement("div"); c.className="mmc-tag"; 
      c.innerHTML = `${x.name} <button type="button" class="mmc-chip-x" data-remove-tag="${x._id}" title="Remover">×</button>`;
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
      // cleanup on close
      this.once?.("close", () => {
        try{
          Hooks.off("createItem", this._mmc_step4ItemHooks.create);
          Hooks.off("updateItem", this._mmc_step4ItemHooks.update);
          Hooks.off("deleteItem", this._mmc_step4ItemHooks.delete);
        }catch(_){}
        this._mmc_step4ItemHooks = null;
      });
    }
// ===== Search listeners (no full re-render; update list in place)
    left.querySelector('input[name="search-traits"]').addEventListener("input", (ev)=>{
      this.state.search.traits = ev.target.value || "";
      renderListTraits();
    });
    rightTop.querySelector('input[name="search-tags"]').addEventListener("input", (ev)=>{
      this.state.search.tags = ev.target.value || "";
      renderListTags();
    });

    // Remove buttons (only extras, not granted)
    selTraits.querySelectorAll("[data-remove-trait]").forEach(btn=> btn.addEventListener("click", ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const id = ev.currentTarget.dataset.removeTrait;
      this.state.selectedTraits = (this.state.selectedTraits || []).filter(x=>x._id!==id);
      this._refreshPowerChips();
    }));
    selTags.querySelectorAll("[data-remove-tag]").forEach(btn=> btn.addEventListener("click", ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const id = ev.currentTarget.dataset.removeTag;
      this.state.selectedTags = (this.state.selectedTags || []).filter(x=>x._id!==id);
      this._refreshPowerChips();
    }));

    return wrap;
  }



  
  
  
  // === Step 4 live refresh helper: reload Traits/Tags and rebuild lists, preserving scroll
  async _mmc_step4RefreshData(){
    try{
      const el = this.element?.[0] || this.element;
      const listT = el?.querySelector?.(".mmc-list[data-kind='traits']") || el?.querySelector?.(".mmc-list");
      const listG = el?.querySelector?.(".mmc-list[data-kind='tags']") || el?.querySelectorAll?.(".mmc-list")?.[1];
      const prevT = this.state?.scroll?.["traits"] ?? (listT?.scrollTop||0);
      const prevG = this.state?.scroll?.["tags"] ?? (listG?.scrollTop||0);
      const { traits, tags } = await loadTraitsAndTags();
      const mergeByName = (base, fresh) => {
        const map = new Map((base||[]).map(o => [String(o?.name||"").toLowerCase(), o]));
        for (const it of (fresh||[])) map.set(String(it?.name||"").toLowerCase(), it);
        return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
      };
      this.state.data = this.state.data || {};
      this.state.data.traits = mergeByName(this.state.data.traits||[], traits);
      this.state.data.tags   = mergeByName(this.state.data.tags||[], tags);
      // re-render only step body
      if (typeof this._renderTraitsTags === "function"){
        // minimal re-render of application keeping outer scrolls if any
        const panes = this.element?.[0]?.querySelectorAll?.('.mmc-scroll');
        const scrolls = panes ? Array.from(panes).map(p=>p.scrollTop) : [];
        await this.render(false);
        if (panes) Array.from(this.element?.[0]?.querySelectorAll?.('.mmc-scroll')||[]).forEach((p,i)=> p.scrollTop = scrolls[i]||0);
      }
      // restore list scrolls
      const el2 = this.element?.[0] || this.element;
      const lt2 = el2?.querySelector?.(".mmc-list[data-kind='traits']") || el2?.querySelector?.(".mmc-list");
      const lg2 = el2?.querySelector?.(".mmc-list[data-kind='tags']") || el2?.querySelectorAll?.(".mmc-list")?.[1];
      if (lt2){ lt2.scrollTop = prevT; requestAnimationFrame(()=>{ lt2.scrollTop = prevT; }); }
      if (lg2){ lg2.scrollTop = prevG; requestAnimationFrame(()=>{ lg2.scrollTop = prevG; }); }
    }catch(e){ console.warn("MMC | _mmc_step4RefreshData failed", e); }
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
      <input class="mmc-search" name="search-powers-basic" placeholder="Buscar..." value="${this.state.search?.powers||""}"> `;
    const listBasic = document.createElement("div"); listBasic.className="mmc-list";
    left.appendChild(listBasic);
    wrap.appendChild(left);

    // ===== RIGHT: Power Sets =====
    const right = document.createElement("div"); right.className="mmc-card";
    right.innerHTML = `<h3>Power Sets</h3>`;
    const setSel = document.createElement("select"); setSel.name="powerSet"; setSel.className="mmc-search mmc-select mmc-select-tall";
    (this.state.powerSets||[]).forEach(s=>{ const opt=document.createElement("option"); opt.value=s; opt.textContent=s; setSel.appendChild(opt); });
    setSel.value=this.state.powerSet||"";
    right.appendChild(setSel);
    const listSet = document.createElement("div"); listSet.className="mmc-list";
    right.appendChild(listSet);
    wrap.appendChild(right);

    container.appendChild(wrap);

    const _filterList = (list, q)=>{ q=(q||"").toLowerCase(); Array.from(list.children||[]).forEach(ch=>{ const nm=ch?.dataset?.nameLc||""; ch.style.display = nm.includes(q)?"":"none"; }); };

    // ===== DATA / filtros =====
    const q = (this.state.search?.powers||"").toLowerCase();
    const allP = MMCCharactermancer._mmcDedupPowersByNameAndSet(this.state.data.powers||[]).filter(p=>(p.name||"").toLowerCase().includes(q));
    const setName = this.state.powerSet||"";
    const minRankFromPrereq = (txt)=>{ if(!txt) return 0; let max=0; const re=/Rank\\s*(\\d+)/gi; let m; while((m=re.exec(txt))){ const n=parseInt(m[1]); if(!isNaN(n)) max=Math.max(max,n);} return max; };

    const buildRow = (p)=>{
      const row=document.createElement("div"); row.className="mmc-pwr"; row.dataset.nameLc = (p.name||"").toLowerCase();
      const pre = p.system?.prerequisites||"";
      const reqRank = minRankFromPrereq(pre);
      const picked = !!(this.state.chosenPowers||[]).find(x=>x._id===p._id || (x.name||"").toLowerCase()===(p.name||"").toLowerCase());
      const granted = grantedIdSet.has(p._id) || grantedNameSet.has((p.name||"").toLowerCase());
      let actionHTML="";
      if (granted){ actionHTML = `<button class="mmc-btn" disabled>Concedido</button>`; }
      else if (picked){ actionHTML = `<button class="mmc-btn" disabled>Selecionado</button>`; }
      else if (reqRank && (Number(this.state.rank||1) < reqRank)){ actionHTML = `<button class="mmc-btn" disabled title="Requer Rank ${reqRank}">Rank ${reqRank}</button>`; }
      else if ( (this.state.chosenPowers||[]).length >= Math.max(0, limit - (originConsume?.length||0)) ){ actionHTML = `<button class="mmc-btn" disabled title="Limite atingido">Limite</button>`; }
      else {
        const result = this._meetsAllPrereqs(pre, this.state, { allP, grantedNameSet, grantedIdSet, chosen: this.state.chosenPowers });
        if (!result.ok) { 
          const tt = (result.missing&&result.missing.length) ? ` title="Falta: ${'${result.missing.join(', ')}'}"` : '';
          actionHTML = `<button class="mmc-btn" disabled${tt}>Bloqueado</button>`; 
        } else { 
          actionHTML = `<button class="mmc-btn" data-add-power="${p._id}">Selecionar</button>`; 
        }
      }
      row.innerHTML = `<div class="name">${p.name}${pre?` <span class="mmc-small">— Pré: ${pre}</span>`:""}</div>
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
    // Family-aware listing: if a base name appears in the selected set,
    // include all numbered siblings of that base from any set (e.g., Jump 1/2/3 across Super-Strength and Spider-Powers).
    const _mmcBaseName = (n)=> String(n||"").replace(/\s*\d+$/, "").trim().toLowerCase();
    const setLower = String(setName||"").toLowerCase().trim();
    const inCurrentSet = (allP||[]).filter(p=> String(p.system?.powerSet||"").toLowerCase().trim() === setLower);
    const baseNames = new Set(inCurrentSet.map(p=> _mmcBaseName(p?.name)));
    const crossList = (allP||[]).filter(p=> baseNames.has(_mmcBaseName(p?.name)));
    const shownList = MMCCharactermancer._mmcDedupPowersByNameAndSet(crossList);
    shownList.forEach(p=> listSet.appendChild(buildRow(p)));
    this._restoreScroll(listSet,'powers-set');
this._restoreScroll(listSet,'powers-set');

    // ===== Bottom panel 'Selecionados — Poderes (x / limit)' =====
    const selCard = document.createElement("div"); selCard.className="mmc-card";
    const chosenCount = (this.state.chosenPowers||[]).length + (originConsume?.length||0);
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
    const chosenBasic = (this.state.chosenPowers||[]).filter(p=> (p.system?.powerSet??"Basic")==="Basic");
    const grantBasic = grantedPowers.filter(p=> (p.system?.powerSet??"Basic")==="Basic");
    chipsBasic.innerHTML="";
    grantBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent=p.name; chipsBasic.appendChild(c); });
    chosenBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag"; c.innerHTML = `${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsBasic.appendChild(c); });

    const chosenNonBasic = (this.state.chosenPowers||[]).filter(p=> (p.system?.powerSet??"Basic")!=="Basic");
    const grantNonBasic = grantedPowers.filter(p=> (p.system?.powerSet??"Basic")!=="Basic");
    chipsSet.innerHTML="";
    grantNonBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag mmc-tag-granted"; c.textContent = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name}`; chipsSet.appendChild(c); });
    chosenNonBasic.forEach(p=>{ const c=document.createElement("div"); c.className="mmc-tag"; c.innerHTML = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsSet.appendChild(c); });

    // Eventos de busca e select
    const deb = MMCCharactermancer.mmcDebounce((val)=>{ this.state.search.powers = val||""; this.state.scroll['powers-basic']=listBasic.scrollTop; this.state.scroll['powers-set']=listSet.scrollTop; this._focus={...(this._focus||{}), 'powers-basic':{ q:"input[name='search-powers-basic']", pos:(val||"").length } }; this.render(true); }, 500);
    const inputBasic = left.querySelector('input[name="search-powers-basic"]');
    if(this._focus?.['powers-basic']){ try{ inputBasic.focus(); inputBasic.selectionStart=inputBasic.selectionEnd=inputBasic.value.length; }catch(e){} }
    inputBasic.addEventListener("input", ev=>{ const v=ev.target.value||""; _filterList(listBasic, v); deb(v); });
    inputBasic.addEventListener('keyup', ev=>{ try{ this._focus={...(this._focus||{}), 'powers-basic':{ q:"input[name='search-powers-basic']", pos: (ev.currentTarget.selectionEnd||ev.currentTarget.value.length) } }; }catch(e){} });
    inputBasic.addEventListener("keydown", ev=>{
      if (ev.key === "Escape"){ ev.preventDefault(); inputBasic.value=""; deb(""); }
      if ((ev.ctrlKey||ev.metaKey) && ev.key.toLowerCase()==="f"){ ev.preventDefault(); inputBasic.focus(); inputBasic.select(); }
    });
    setSel.addEventListener("change", ev=>{ this.state.powerSet = ev.target.value||""; this.state.scroll['powers-basic']=listBasic.scrollTop; this.state.scroll['powers-set']=listSet.scrollTop; this.render(true); });

    // Add/remove listeners
    container.querySelectorAll("[data-add-power]").forEach(btn=> btn.addEventListener("click", ev=>{
      const id = ev.currentTarget.dataset.addPower;
      const p = (this.state.data.powers||[]).find(x=>x._id===id);
      if (!p) return;
      if ((this.state.rank||1) === 1){
        const chosenSets = new Set((this.state.chosenPowers||[]).map(x=>x.system?.powerSet ?? "Basic").filter(s=>s!=="Basic"));
        const pSet = p.system?.powerSet ?? "Basic";
        if (chosenSets.size>=1 && pSet!=="Basic" && !chosenSets.has(pSet)) { ui.notifications?.warn("Rank 1: Somente Basic + 1 Power Set."); return; }
      }
      const curLim = this._computePowerLimit();
      const originTake = (this._originGrantSubset(curLim)||[]).length; const avail = Math.max(0, curLim - originTake); if ((this.state.chosenPowers||[]).length >= avail) { ui.notifications?.warn(`Limite de poderes: ${curLim} (Origem consumiu ${originTake})`); return; }
      this.state.chosenPowers = [...(this.state.chosenPowers||[]), p];
      this.state.scroll['powers-basic']=listBasic.scrollTop; this.state.scroll['powers-set']=listSet.scrollTop;
      this.render(true);
    }));
    container.querySelectorAll("[data-remove-power]").forEach(btn=> btn.addEventListener("click", ev=>{
      const id = ev.currentTarget.dataset.removePower;
      this.state.chosenPowers = (this.state.chosenPowers||[]).filter(x=>x._id!==id);
      this.state.scroll['powers-basic']=listBasic.scrollTop; this.state.scroll['powers-set']=listSet.scrollTop;
      this.render(true);
    }));

    return container;
  }
_renderReview(){
    const wrap = document.createElement("div"); wrap.className="mmc-card mmc-review";
    const bio = this.state.bio;

    // Status & warnings
    const limit = this._computePowerLimit();
    const chosenCount = (this.state.chosenPowers||[]).length + (this._originGrantSubset(limit)?.length||0);
    const chosenSets = this._getChosenSetsCount();
    const warnings = [];
    if ((this.state.rank||1)===1 && chosenSets>1) warnings.push("Rank 1: apenas Basic + 1 Power Set.");
    if (chosenCount>limit) warnings.push(`Poderes escolhidos (${chosenCount}) excedem o limite (${limit}).`);

    // Granted powers (for summary display)
    const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];

    wrap.innerHTML = `<h3>Revisão</h3>
      <div class="mmc-rank-display">RANK ${this.state.rank}</div>
      ${warnings.length?`<div class="mmc-warn">${warnings.map(w=>`<div>⚠️ ${w}</div>`).join("")}</div>`:""}
      <ul class="mmc-summary">
        <li><strong>Atributos:</strong> M${this.state.abilities.mle} A${this.state.abilities.agl} R${this.state.abilities.res} V${this.state.abilities.vig} E${this.state.abilities.ego} L${this.state.abilities.log}</li>
        <li><strong>Ocupação:</strong> ${this.state.occupation?.name||"—"}</li>
        <li><strong>Origem:</strong> ${this.state.origin?.name||"—"}</li>
        <li><strong>Traços:</strong> ${[...(this.state.occupation?.system?.traits||[]), ...(this.state.origin?.system?.traits||[]), ...(this.state.selectedTraits||[])].map(t=>t.name).join(", ")||"—"}</li>
        <li><strong>Tags:</strong> ${[...(this.state.occupation?.system?.tags||[]), ...(this.state.origin?.system?.tags||[]), ...(this.state.selectedTags||[])].map(t=>t.name).join(", ")||"—"}</li>
        <li><strong>Poderes (granteds + escolhidos):</strong> ${[...grantedPowers, ...(this.state.chosenPowers||[])].map(p=>p.name).join(", ")||"—"}</li>
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
      const handler = (ev)=> { const key = ev.currentTarget.dataset.bio; this.state.bio[key] = ev.currentTarget.value; };
      inp.addEventListener("input", handler);
      inp.addEventListener("change", handler);
    });
    wrap.querySelector('textarea[name="bio.history"]').addEventListener("input", ev=> this.state.bio.history=ev.target.value);
    wrap.querySelector('textarea[name="bio.personality"]').addEventListener("input", ev=> this.state.bio.personality=ev.target.value);
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
    const actorData = foundry.utils.deepClone(this.state.actorModel ?? {});
    if (!actorData?.system) { ui.notifications?.error("Ator modelo ausente em data/actor-modelo.json"); return; }

    // Rank and Abilities
    actorData.system.attributes.rank.value = this.state.rank;
    for (const k of Object.keys(this.state.abilities)) actorData.system.abilities[k].value = this.state.abilities[k];
    const calc = (v)=> Math.max(10, (v??0)*30);
    actorData.system.health = actorData.system.health||{};
    actorData.system.focus = actorData.system.focus||{};
    actorData.system.health.max = calc(this.state.abilities.res);
    actorData.system.health.value = actorData.system.health.max;
    actorData.system.focus.max = calc(this.state.abilities.vig);
    actorData.system.focus.value = actorData.system.focus.max;

    // Biography
    for (const [k,v] of Object.entries(this.state.bio)) actorData.system[k] = v;

    actorData.name = (this.state.bio.codename?.trim()) || (this.state.bio.realname?.trim()) || actorData.name || "Herói";
    actorData.prototypeToken = actorData.prototypeToken || {};
    actorData.prototypeToken.name = actorData.name;
    if (this.state.bio?.size) actorData.system.size = String(this.state.bio.size).toLowerCase();
    const actor = await Actor.create(actorData, {renderSheet:true});
    const items = [];
    if (this.state.occupation) items.push(this.state.occupation);
    if (this.state.origin) items.push(this.state.origin);
    const grantedTraits = [
      ...(this.state.occupation?.system?.traits || []),
      ...(this.state.origin?.system?.traits || [])
    ];
    const grantedTags = [
      ...(this.state.occupation?.system?.tags || []),
      ...(this.state.origin?.system?.tags || [])
    ];
    const preparedTraits = MMCCharactermancer._mmcDedupByName([
      ...grantedTraits,
      ...(this.state.selectedTraits || [])
    ]).map(it => {
      const clone = foundry.utils.deepClone(it ?? {});
      if (!clone.mmcKind) clone.mmcKind = "trait";
      if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
      return clone;
    });
    const preparedTags = MMCCharactermancer._mmcDedupByName([
      ...grantedTags,
      ...(this.state.selectedTags || [])
    ]).map(it => {
      const clone = foundry.utils.deepClone(it ?? {});
      if (!clone.mmcKind) clone.mmcKind = "tag";
      if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
      return clone;
    });
    const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];
    // Deduplicate by name to avoid duplicates with chosen
    const byName = new Set(grantedPowers.map(p=>(p.name||'').toLowerCase()));
    const chosen = (this.state.chosenPowers||[]).filter(p=> !byName.has((p.name||'').toLowerCase()));
    
    // Collapse numeric series: keep only the highest numbered version for each base name.
    const collapseNumericSeries = (arr) => {
      const best = new Map(); // baseName -> {num, item}
      for (const it of arr||[]){
        const name = String(it?.name||"");
        const m = name.match(/^(.*?)(?:\s+(\d+))$/);
        if (!m){
          const base = name.toLowerCase();
          const prev = best.get(base);
          if (!prev) best.set(base, {num:null, item:it});
          continue;
        }
        const base = m[1].toLowerCase();
        const num = Number(m[2]||0);
        const prev = best.get(base);
        if (!prev || (prev.num ?? -1) < num) best.set(base, {num, item:it});
      }
      return Array.from(best.values()).map(v=>v.item);
    };
    const cleanedPowers = collapseNumericSeries([ ...grantedPowers, ...chosen ]);
    const cleanedNames = new Set(cleanedPowers.map(p=>(p.name||'').toLowerCase()));
    const keptChosen = (chosen||[]).filter(p => cleanedNames.has((p.name||'').toLowerCase()));
    const keptGranted = (grantedPowers||[]).filter(p => cleanedNames.has((p.name||'').toLowerCase()));
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

Hooks.once("init", ()=> console.log(`Marvel Multiverse Charactermancer | init v${game.modules.get("marvel-multiverse-charactermancer")?.version}`));

Hooks.on("renderActorDirectory", (app, htmlOrElement, data)=>{
  try {
    let root=null;
    if (htmlOrElement && typeof htmlOrElement.querySelector==="function") root=htmlOrElement;
    else if (htmlOrElement && typeof htmlOrElement==="object") root = htmlOrElement[0] ?? null;
    if (!root?.querySelector) return;
    let actions = root.querySelector(".directory-header .header-actions"); if (!actions) actions = root.querySelector(".directory-header .action-buttons"); if (!actions) return;
    const btn = document.createElement("button");
    btn.className="mmc-btn"; btn.innerHTML = `<i class="fas fa-magic"></i> ${game.i18n.localize("MMC.Open")||"Charactermancer"}`;
    btn.addEventListener("click", ()=> new MMCCharactermancer().render(true));
    actions.appendChild(btn);
  } catch(e){ console.error("MMC renderActorDirectory", e); }
});
