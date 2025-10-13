
/* Sheet Export — Marvel Multiverse (D616)
 * v0.3.54
 */

const M616 = {
  ID: "sheet-export-m616",
  VERSION: "0.3.54",
  TEMPLATES: {
    red:   "systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Red.pdf",
    black: "systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Black.pdf",
    blue:  "systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Blue.pdf",
    gray:  "systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Gray.pdf",
    orange:"systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Orange.pdf",
    pink:  "systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Pink.pdf",
    purple:"systems/multiverse-d616/features/sheet-export-m616/assets/templates/M616 Character Sheet - Alt Purple.pdf",
  },
  LONG_FIELDS: ["Text38","Text39","Text40","Text41","Text42"],
  FLATTEN_SIZE: 17
};

Hooks.once("init", () => {
  game.settings.register(M616.ID, "templateTheme", {
    name: "Template de Ficha (cor)",
    hint: "Escolha o PDF base a ser usado no export. Padrão: Alt Red.",
    scope: "world", config: true, type: String,
    choices: { red:"Alt Red (padrão)", black:"Alt Black", blue:"Alt Blue", gray:"Alt Gray", orange:"Alt Orange", pink:"Alt Pink", purple:"Alt Purple" },
    default: "red"
  });
  console.log(`[${M616.ID}] v${M616.VERSION} init`);
});

Hooks.once("ready", () => console.log(`[${M616.ID}] ready`));

/** Header (sempre adiciona, sem flag de bloqueio) */
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  try{
    if (!sheet?.actor) return;
    const isMM = game.system?.id?.startsWith?.("marvel-multiverse"); if (!isMM) return;
    if (!buttons.some(b => b?.class === "m616-export")) {
      buttons.unshift({
        label: "PDF (M616)",
        class: "m616-export",
        icon: "fas fa-file-pdf",
        onclick: () => exportActor(sheet.actor).catch(e => {
          console.error(`[${M616.ID}] export error`, e);
          ui.notifications?.error("Export PDF falhou. Veja o console.");
        })
      });
    }
  }catch(e){ console.error(`[${M616.ID}] header`, e); }
});

/** Fallback DOM — confere o DOM (sem flags) */
Hooks.on("renderMarvelMultiverseCharacterSheet", (app, html) => {
  try{
    const header = html.closest(".app").find(".window-header");
    if (!header.length || header.find(".m616-export-inline, .m616-export").length) return;
    const btn = $(`<a class="m616-export-inline" title="Exportar PDF (M616)"><i class="fas fa-file-pdf"></i> PDF (M616)</a>`);
    btn.on("click", ev => { ev.preventDefault(); exportActor(app.actor); });
    header.find(".window-title").after(btn);
  }catch(e){ console.error(`[${M616.ID}] render fallback`, e); }
});

/* ------- Utils ------- */
function get(obj, path){ try{ const parts = String(path).split("."); let o=obj; for(const p of parts){ if(o==null) return; o=o[p]; } return o; }catch{} }
function nvl(a,b){ return (a!==undefined && a!==null) ? a : b; }
function nvl3(a,b,c){ return nvl(nvl(a,b), c); }
function stripHtml(html){ if(!html) return ""; const div=document.createElement("div"); div.innerHTML=String(html); return (div.textContent||div.innerText||"").trim(); }
function cleanText(v){ const t=stripHtml(v); return t? t.replace(/\s+/g," ").trim() : ""; }
function normalizePdfText(text){
  if (!text) return "";
  let t = String(text);
  const map = { "\u00A0":" ", "\u2010":"-","\u2011":"-","\u2012":"-","\u2013":"-","\u2014":"-","\u2212":"-",
    "\u2018":"'","\u2019":"'","\u201A":"'","\u201B":"'","\u201C":'"',"\u201D":'"',"\u201E":'"',
    "\u2026":"...","\u2022":"-","\u00B7":"-"};
  return t.replace(/[\u00A0\u2010-\u2014\u2212\u2018-\u201E\u2026\u2022\u00B7]/g, ch => map[ch] || "");
}
function fmtDR(v){ const n = Number(v)||0; if(n===0) return "0"; return `-${Math.abs(n)}`; }
function abilityDefense(val){ return String(10 + (Number(val)||0)); }
function fmtSigned(v){ const n=Number(v); if(isNaN(n)) return v??""; return n>=0?`+${n}`:`${n}`; }

async function ensureAcroFormDA(pdfDoc, sizePt, helv){
  const {PDFName, PDFString, PDFDict, PDFBool} = window.PDFLib;
  const ctx = pdfDoc.context;
  let acro = pdfDoc.catalog.lookup(PDFName.of("AcroForm"), PDFDict);
  if (!acro){ acro = ctx.obj({}); pdfDoc.catalog.set(PDFName.of("AcroForm"), acro); }
  let dr = acro.lookup(PDFName.of("DR"), PDFDict);
  if (!dr){ dr = ctx.obj({}); acro.set(PDFName.of("DR"), dr); }
  let font = dr.lookup(PDFName.of("Font"), PDFDict);
  if (!font){ font = ctx.obj({}); dr.set(PDFName.of("Font"), font); }
  font.set(PDFName.of("Helv"), helv.ref);
  acro.set(PDFName.of("DA"), PDFString.of(`/Helv ${sizePt} Tf 0 g`));
  acro.set(PDFName.of("NeedAppearances"), PDFBool.False);
}
function setFieldDA(tf, size){
  const {PDFName, PDFString} = window.PDFLib;
  const da = `/Helv ${size} Tf 0 g`;
  try { tf.acroField?.set(PDFName.of("DA"), PDFString.of(da)); } catch {}
  try {
    const widgets = tf.acroField?.getWidgets?.() ?? [];
    for (const w of widgets){
      if (w.dict.has?.(PDFName.of("AP"))) w.dict.delete?.(PDFName.of("AP"));
      w.dict.set(PDFName.of("DA"), PDFString.of(da));
    }
  } catch {}
}
function setText(form, name, value, size){
  try { const tf = form.getTextField(name); setFieldDA(tf, size||M616.FLATTEN_SIZE); tf.setText(value==null?"":String(value)); } catch {}
}

/* ------- Long columns ------- */
function collectLong(actor){
  const items = Array.from(actor?.items ?? []);
  const uniq = arr => Array.from(new Set(arr.map(s => String(s||"").trim()).filter(Boolean)));
  const traits = uniq(items.filter(i=>i.type==="trait").map(i=>i.name));
  const tags   = uniq(items.filter(i=>i.type==="tag").map(i=>i.name));
  const powers = uniq(items.filter(i=>i.type==="power").map(i=>i.name));
  const perCol = Math.ceil(powers.length/3) || 0;
  const cols = [powers.slice(0,perCol), powers.slice(perCol,2*perCol), powers.slice(2*perCol)];
  const bullet = s=>`• ${s}`;
  return { traits: traits.map(bullet), tags: tags.map(bullet), pow1: cols[0].map(bullet), pow2: cols[1].map(bullet), pow3: cols[2].map(bullet) };
}
function pickLongSize(lines){ const txt=lines.join(" "); if(lines.length>22||txt.length>900) return 12; if(lines.length>14||txt.length>500) return 14; return 17; }

function wrapText(font, text, size, maxWidth){
  text = normalizePdfText(text||"");
  const words = String(text||"").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words){
    const test = cur ? (cur + " " + w) : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) { cur = test; }
    else {
      if (cur) lines.push(cur);
      if (font.widthOfTextAtSize(w, size) > maxWidth){
        let acc = "";
        for (const ch of w){
          const t = acc + ch;
          if (font.widthOfTextAtSize(t, size) > maxWidth){ if(acc) lines.push(acc); acc = ch; } else acc = t;
        }
        cur = acc;
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ------- Export ------- */
async function exportActor(actor){
  try{
    await ensureDeps();
    const { PDFDocument, StandardFonts } = window.PDFLib;
    const theme = game.settings.get(M616.ID, "templateTheme") || "red";
    const tplPath = M616.TEMPLATES[theme] || M616.TEMPLATES.red;

    const bytes = await fetch(tplPath).then(r=>r.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    await ensureAcroFormDA(pdfDoc, 12, helv);

    const sys = actor?.system || {};
    const items = Array.from(actor?.items ?? []);
    const name = nvl(sys.codename, actor?.name);
    setText(form, "Name1", normalizePdfText(name), 17);

    setText(form, "Text1",  nvl3(get(sys,"attributes.rank.value"), get(sys,"attributes.rank.max"), ""));
    setText(form, "Text28", nvl3(get(sys,"karma.value"), get(sys,"karma.max"), ""));

    setText(form, "Text29", nvl3(get(sys,"health.value"), get(sys,"health.max"), ""));
    setText(form, "Text30", fmtDR(get(sys,"healthDamageReduction")));
    setText(form, "Text31", nvl3(get(sys,"focus.value"), get(sys,"focus.max"), ""));
    setText(form, "Text32", fmtDR(get(sys,"focusDamageReduction")));

    const initV = get(sys,"attributes.init.value");
    const edge = !!get(sys,"attributes.init.edge");
    setText(form, "Text33", initV!=null ? (edge ? (initV+"E") : String(initV)) : "");

    setText(form, "Text34", nvl(get(sys,"movement.run.value"), get(sys,"movement.run")));
    setText(form, "Text35", nvl(get(sys,"movement.climb.value"), ""));
    setText(form, "Text36", nvl(get(sys,"movement.swim.value"), ""));
    const lastSpeed = nvl3(get(sys,"movement.jump.value"), get(sys,"movement.flight.value"), get(sys,"movement.glide.value"));
    setText(form, "Text37", nvl(lastSpeed,""));

    const blocks = [["mle",2],["agl",5],["res",8],["vig",11],["ego",14],["log",17]];
    for (let i=0;i<blocks.length;i++){
      const key=blocks[i][0], base=blocks[i][1];
      const val = nvl(get(sys,`abilities.${key}.value`), 0);
      const def = nvl(get(sys,`abilities.${key}.defense`), abilityDefense(val));
      const non = nvl(get(sys,`abilities.${key}.noncom`), 0);
      setText(form, `Text${base}`,   val);
      setText(form, `Text${base+1}`, def);
      setText(form, `Text${base+2}`, fmtSigned(non));
    }

    setText(form, "Text20", nvl(get(sys,"abilities.mle.damageMultiplier"), 0));
    setText(form, "Text21", nvl(get(sys,"abilities.mle.value"), 0));
    setText(form, "Text22", nvl(get(sys,"abilities.agl.damageMultiplier"), 0));
    setText(form, "Text23", nvl(get(sys,"abilities.agl.value"), 0));
    setText(form, "Text24", nvl(get(sys,"abilities.ego.damageMultiplier"), 0));
    setText(form, "Text25", nvl(get(sys,"abilities.ego.value"), 0));
    setText(form, "Text26", nvl(get(sys,"abilities.log.damageMultiplier"), 0));
    setText(form, "Text27", nvl(get(sys,"abilities.log.value"), 0));

    setText(form, "Text43", nvl(get(sys,"realname"), ""));
    setText(form, "Text44", nvl(get(sys,"height"), ""));
    setText(form, "Text45", nvl(get(sys,"weight"), ""));
    setText(form, "Text46", nvl(get(sys,"gender"), ""));
    setText(form, "Text47", nvl(get(sys,"eyes"), ""));
    setText(form, "Text48", nvl(get(sys,"hair"), ""));
    setText(form, "Text49", nvl(get(sys,"size"), ""));
    setText(form, "Text50", nvl(get(sys,"distinguishingFeatures"), ""));
    const occ = items.filter(i=>i.type==="occupation").map(i=>i.name).join(", ");
    const ori = items.filter(i=>i.type==="origin").map(i=>i.name).join(", ");
    setText(form, "Text51", occ);
    setText(form, "Text52", ori);
    setText(form, "Text53", nvl(get(sys,"teams"), ""));
    setText(form, "Text54", nvl(get(sys,"base"), ""));
    setText(form, "Text55", cleanText(get(sys,"history")));
    setText(form, "Text56", cleanText(get(sys,"personality")));

    for (const f of M616.LONG_FIELDS){ try { const tf=form.getTextField(f); setFieldDA(tf, M616.FLATTEN_SIZE); tf.setText(""); } catch {} }
    const long = collectLong(actor);
    const put = (name, arr) => {
      const lines = (arr||[]).filter(Boolean);
      if (!lines.length){ setText(form, name, ""); return; }
      const size = pickLongSize(lines);
      setText(form, name, lines.join("\n"), size);
    };
    put("Text38", long.traits);
    put("Text39", long.tags);
    put("Text40", long.pow1);
    put("Text41", long.pow2);
    put("Text42", long.pow3);

    form.updateFieldAppearances(helv);

    /* --- Páginas detalhadas (CONTÍNUAS) com widow/orphan control --- */
    const powers = items.filter(i=>i.type==="power");
    const traits = items.filter(i=>i.type==="trait");
    const tags   = items.filter(i=>i.type==="tag");

    // Helpers de layout
    function newPageWithHeader(pdfDoc, helvBold, name){
      const page = pdfDoc.addPage();
      const margin = 50;
      const y0 = page.getSize().height - margin;
      const titleSize = 18;
      page.drawText(`CODENAME: ${normalizePdfText(name||"")}`, { x: margin, y: y0 - titleSize, size: titleSize, font: helvBold });
      return { page, y: y0 - titleSize*1.6, margin };
    }
    let { page, y, margin } = newPageWithHeader(pdfDoc, helvBold, name);
    const sizes = { h2:14, body:12 };
    const wrapWidth = () => page.getSize().width - margin*2;

    function ensureSpaceFor(need){
      if (y < margin + need){
        const np = newPageWithHeader(pdfDoc, helvBold, name);
        page = np.page; y = np.y; margin = np.margin;
      }
    }
    function drawSectionTitle(txt){
      const size = sizes.h2;
      ensureSpaceFor(size*2.0);
      page.drawText(normalizePdfText(txt), { x: margin, y: y - size, size, font: helvBold });
      y -= size*1.6;
    }
    function measureParagraph(txt){
      const size = sizes.body;
      const lines = wrapText(helv, txt, size, wrapWidth());
      return lines.length * (size*1.25);
    }
    function drawParagraph(txt){
      const size = sizes.body;
      const lines = wrapText(helv, txt, size, wrapWidth());
      for (const line of lines){
        ensureSpaceFor(size*1.4);
        page.drawText(normalizePdfText(line), { x: margin, y: y - size, size, font: helv });
        y -= size*1.25;
      }
    }
    function measureLabelValue(label, value){
      const size = sizes.body;
      value = normalizePdfText(value||"");
      if (!value) return 0;
      const labelTxt = normalizePdfText(label + ": ");
      const labelWidth = helvBold.widthOfTextAtSize(labelTxt, size);
      const lines = wrapText(helv, value, size, wrapWidth() - labelWidth);
      return size*1.25 * lines.length;
    }
    function drawLabelValue(label, value){
      const size = sizes.body;
      value = normalizePdfText(value||"");
      if (!value) return;
      const labelTxt = normalizePdfText(label + ": ");
      const labelWidth = helvBold.widthOfTextAtSize(labelTxt, size);
      const lines = wrapText(helv, value, size, wrapWidth() - labelWidth);
      ensureSpaceFor(size*1.4);
      page.drawText(labelTxt, { x: margin, y: y - size, size, font: helvBold });
      page.drawText(normalizePdfText(lines[0]), { x: margin + labelWidth, y: y - size, size, font: helv });
      y -= size*1.25;
      for (let i=1;i<lines.length;i++){
        ensureSpaceFor(size*1.4);
        page.drawText(normalizePdfText(lines[i]), { x: margin + labelWidth, y: y - size, size, font: helv });
        y -= size*1.25;
      }
    }
    function measureEntryTitle(txt){
      const size = sizes.body;
      return size*1.6;
    }
    function drawEntryTitle(txt){
      const size = sizes.body;
      ensureSpaceFor(size*2.0);
      page.drawText(normalizePdfText(txt), { x: margin, y: y - size, size, font: helvBold });
      y -= size*1.6;
    }
    function measurePowerEntry(p){
      const s = p.system || {};
      let need = 0;
      need += measureEntryTitle(p.name||"");
      const effect = cleanText(s.effect || s.description || "");
      if (effect) need += measureParagraph("- " + effect);
      const fields = [
        ["Ação",   cleanText(s.action)],
        ["Gatilho",cleanText(s.trigger)],
        ["Duração",cleanText(s.duration)],
        ["Range",  cleanText(s.range)],
        ["Custo",  cleanText(s.cost)],
      ];
      for (const [k,v] of fields) need += measureLabelValue(k, v);
      need += 6; // espaçamento final
      return need;
    }
    function drawPowerEntry(p){
      const s = p.system || {};
      drawEntryTitle(p.name||"");
      const effect = cleanText(s.effect || s.description || "");
      if (effect) drawParagraph("- " + effect);
      const fields = [
        ["Ação",   cleanText(s.action)],
        ["Gatilho",cleanText(s.trigger)],
        ["Duração",cleanText(s.duration)],
        ["Range",  cleanText(s.range)],
        ["Custo",  cleanText(s.cost)],
      ];
      for (const [k,v] of fields) drawLabelValue(k, v);
      y -= 6;
    }
    function measureSimpleEntry(t){ // traits/tags
      const s = t.system || {};
      let need = 0;
      need += measureEntryTitle(t.name||"");
      const desc = cleanText(s.description);
      if (desc) need += measureParagraph("- " + desc);
      need += 6;
      return need;
    }
    function drawSimpleEntry(t){
      const s = t.system || {};
      drawEntryTitle(t.name||"");
      const desc = cleanText(s.description);
      if (desc) drawParagraph("- " + desc);
      y -= 6;
    }

    // Sequência contínua: PODERES → TRAÇOS → TAGS
    if (powers.length || traits.length || tags.length){
      drawSectionTitle("PODERES");
      for (const p of powers){
        const need = measurePowerEntry(p);
        ensureSpaceFor(need);
        drawPowerEntry(p);
      }
      if (traits.length){
        drawSectionTitle("TRAÇOS");
        for (const t of traits){
          const need = measureSimpleEntry(t);
          ensureSpaceFor(need);
          drawSimpleEntry(t);
        }
      }
      if (tags.length){
        drawSectionTitle("TAGS");
        for (const tg of tags){
          const need = measureSimpleEntry(tg);
          ensureSpaceFor(need);
          drawSimpleEntry(tg);
        }
      }
    }

    const out = await pdfDoc.save();
    const blob = new Blob([out], { type: "application/pdf" });
    const filename = `${(actor.name||"character").replace(/[^\w\-]+/g,"_")}-M616.pdf`;
    window.saveAs(blob, filename);
  }catch(e){
    console.error(`[${M616.ID}] export error`, e);
    ui.notifications?.error("Export PDF falhou. Veja o console.");
  }
}

async function ensureDeps(){
  if(!window.PDFLib) await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  if(!window.saveAs) await loadScript("https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js");
}
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=()=>res(); s.onerror=e=>rej(e); document.head.appendChild(s); }); }
