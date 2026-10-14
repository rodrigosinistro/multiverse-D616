import { syncActorTokenSize, RESIZE_SKIP_OPTION } from "./token-size.mjs";
/**
 * Grow 1–4: user-selected size with official Resize maximum categories.
 * Foundry VTT v14. Growth is an actor Active Effect and never rewrites natural size.
 * The power's normal item-roll workflow remains responsible for combat turns,
 * focus, concentration and chat cards.
 */
const SYSTEM_ID = 'multiverse-d616';
const FLAG = 'growChoice';

export const GROW_SIZES = Object.freeze([
  {key:'big', label:'Big (Grande)', range:'acima de 1,83 m até 2,44 m', maxFeet:8},
  {key:'huge', label:'Huge (Enorme)', range:'acima de 2,44 m até 7,32 m', maxFeet:24},
  {key:'gigantic', label:'Gigantic (Gigantesco)', range:'acima de 7,32 m até 30,48 m', maxFeet:100},
  {key:'titanic', label:'Titanic (Titânico)', range:'acima de 30,48 m até 121,92 m', maxFeet:400},
  {key:'gargantuan', label:'Gargantuan (Gargantuesco)', range:'acima de 121,92 m até 487,68 m', maxFeet:1600},
]);
const SIZE_ORDER = Object.freeze(['microscopic','miniature','tiny','little','small','average',...GROW_SIZES.map(size => size.key)]);
const GROW_RX = /^Grow ([1-4])$/i;

export function growPowerLevel(item) {
  if (item?.type !== 'power') return 0;
  const name = String(item.name ?? '').trim();
  const match = GROW_RX.exec(name);
  return match ? Number(match[1]) : 0;
}

function effectChanges(effect) { return effect?.system?.changes ?? effect?.changes ?? []; }
export function isGrowthEffect(effect) { return effect?.flags?.[SYSTEM_ID]?.[FLAG] === true; }
/** Growth and shrinking are mutually exclusive: only one temporary Resize choice can be active. */
export function isResizeChoiceEffect(effect) {
  return isGrowthEffect(effect) || effect?.flags?.[SYSTEM_ID]?.shrinkChoice === true;
}
function isNaturalSizeEffect(effect) {
  if (isResizeChoiceEffect(effect)) return false;
  return effect?.flags?.[SYSTEM_ID]?.managedSize === true ||
    (/^(?:Microscopic|Miniature|Tiny|Little|Small|Average|Big|Huge|Gigantic|Titanic|Gargantuan) Effects$/i.test(String(effect?.name??'')) &&
      effectChanges(effect).some(c=>c.key === 'system.size'));
}
function asSize(value) {return String(value ?? 'average').trim().toLowerCase();}
function sourceEffects(actor) {return Array.from(actor?.effects?.contents ?? actor?.effects ?? []);}

export function naturalGrowSize(actor) {
  const stored = asSize(actor?._source?.system?.size ?? actor?.system?._source?.size ?? actor?.system?.size);
  const natural = sourceEffects(actor).find(effect => effect?.disabled !== true && isNaturalSizeEffect(effect) &&
    effectChanges(effect).some(c => c.key === 'system.size'));
  const managedSize = natural && effectChanges(natural).find(c => c.key === 'system.size')?.value;
  // Match the movement-calculator's compatibility path for older imported sheets.
  return stored === 'average' && SIZE_ORDER.includes(asSize(managedSize))
    ? asSize(managedSize) : SIZE_ORDER.includes(stored) ? stored : 'average';
}

export function availableGrowSizes(level, natural = 'average') {
  const powerLevel = Math.max(0, Math.min(4, Number(level) || 0));
  if (!powerLevel) return [];
  const normalIndex = SIZE_ORDER.indexOf(asSize(natural));
  const limitIndex = SIZE_ORDER.indexOf(GROW_SIZES[powerLevel].key); // index 1 corresponds to Huge for Grow 1
  return GROW_SIZES.filter(s => {
    const index = SIZE_ORDER.indexOf(s.key);
    return index > normalIndex && index <= limitIndex;
  });
}

export function growChoiceOptions(item, actor) {
  const level = growPowerLevel(item);
  if (!level || !actor) return [];
  const natural = naturalGrowSize(actor);
  return [{key:'normal',label:'Tamanho normal',range:'Retornar ao tamanho natural'},
    ...availableGrowSizes(level,natural)];
}

export async function promptGrowChoice(item, actor) {
  const choices = growChoiceOptions(item,actor);
  if (!choices.length) return null;
  const selected = sourceEffects(actor).find(e => e?.disabled !== true && isGrowthEffect(e));
  const current = selected?.flags?.[SYSTEM_ID]?.growSelectedSize ?? 'normal';
  const options = choices.map(s =>
    `<option value="${s.key}"${current === s.key ? ' selected' : ''}>${s.label} — ${s.range}</option>`).join('');
  const level = growPowerLevel(item);
  const content = `<div class="form-group"><label for="mm-grow-size-choice"><strong>Escolha até onde deseja crescer</strong></label>
    <select id="mm-grow-size-choice" name="growSize" style="width:100%;margin:10px 0;">${options}</select>
    <p class="hint">Grow ${level}: somente tamanhos permitidos. A mudança permanece até que você escolha outro tamanho ou retorne ao normal.</p></div>`;
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.wait) throw new Error('A janela de Crescimento requer Foundry VTT v14.');
  const value = await DialogV2.wait({
    window:{title:`Crescimento — ${item.name}`}, content, rejectClose:false,
    buttons:[
      {action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'select',label:'Aplicar tamanho',default:true,callback:(_event,button)=>button.form.elements.growSize.value},
    ],
  });
  // Revalidate against the ACTUAL power, not the client form's input.
  return choices.some(choice => choice.key === value) ? value : null;
}

function sizeChangesFromConfig(size, config) {
  const source = config?.sizeEffects?.[size];
  if (!source) throw new Error(`Efeito de tamanho desconhecido: ${size}`);
  return structuredCloneOrFoundry(source);
}
function structuredCloneOrFoundry(obj) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
function sizeMechanics(size, config) {
  const eff = config?.sizeEffects?.[size];
  const out = new Map();
  for (const c of effectChanges(eff ?? {})) {
    if (c.key?.startsWith('system.abilities.') && Number(c.mode) === 2) out.set(c.key, Number(c.value) || 0);
  }
  return out;
}

/** Applies a validated choice atomically from the caller's perspective.
 * Does not modify actor.system.size (which is the natural size) or ordinary size effects.
 */
export async function applyGrowChoice(actor, item, choice, config) {
  const choices = growChoiceOptions(item, actor);
  if (!choices.some(entry => entry.key === choice)) throw new Error('Este tamanho não é permitido pelo poder.');
  const oldGrowth = sourceEffects(actor).filter(isResizeChoiceEffect);
  if (choice === 'normal') {
    if (oldGrowth.length) await actor.deleteEmbeddedDocuments('ActiveEffect', oldGrowth.map(e => e.id), {[RESIZE_SKIP_OPTION]:true});
    await syncActorTokenSize(actor, naturalGrowSize(actor));
    return choices[0];
  }
  const template = sizeChangesFromConfig(choice, config);
  const natural = naturalGrowSize(actor);
  const baselineExists = sourceEffects(actor).some(e => e?.disabled !== true && isNaturalSizeEffect(e) &&
    effectChanges(e).some(c=>c.key === 'system.size' && asSize(c.value) === natural));
  const nativeModifiers = baselineExists ? sizeMechanics(natural, config) : new Map();
  const entries = template.changes ?? template.system?.changes ?? [];
  // Target-size bonus replaces natural-size bonus; do not stack +2 with +4,
  // or -1 with -2, if a permanent natural-size AE is already present.
  for (const c of entries) {
    if (c.key === 'system.size') {c.priority = 1000; continue;}
    if (nativeModifiers.has(c.key) && Number(c.mode) === 2) {
      c.value = Number(c.value) - nativeModifiers.get(c.key);
    }
  }
  template.name = `Crescimento — ${GROW_SIZES.find(s=>s.key===choice)?.label ?? choice}`;
  template.transfer = false;
  template.flags = {...template.flags, [SYSTEM_ID]:{
    ...template.flags?.[SYSTEM_ID], managedSize:false, [FLAG]:true,
    growSelectedSize:choice, growPowerLevel:growPowerLevel(item), growSourceItemId:item.id ?? null,
  }};
  // Replace temporary Grow/Shrink choices, never the natural-size effect.
  if (oldGrowth.length) await actor.deleteEmbeddedDocuments('ActiveEffect',oldGrowth.map(e=>e.id), {[RESIZE_SKIP_OPTION]:true});
  await actor.createEmbeddedDocuments('ActiveEffect',[template], {[RESIZE_SKIP_OPTION]:true});
  await syncActorTokenSize(actor,choice);
  return choices.find(s=>s.key===choice);
}
