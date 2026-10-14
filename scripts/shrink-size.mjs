import { syncActorTokenSize, RESIZE_SKIP_OPTION } from "./token-size.mjs";
/**
 * Shrink 1–4: select an allowed smaller category on use (Foundry VTT v14).
 * The character's saved natural size and permanent Unusual Size effect remain intact.
 * Grow and Shrink replace one another instead of stacking modifiers.
 */
import { naturalGrowSize, isResizeChoiceEffect } from './grow-size.mjs';

const SYSTEM_ID = 'multiverse-d616';
const SIZE_ORDER = Object.freeze(['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan']);
export const SHRINK_SIZES = Object.freeze([
  {key:'little',label:'Little (Pequeno)',range:'acima de 10,16 cm até 45,72 cm',maxCm:45.72},
  {key:'tiny',label:'Tiny (Minúsculo)',range:'acima de 2,54 cm até 10,16 cm',maxCm:10.16},
  {key:'miniature',label:'Miniature (Miniatura)',range:'acima de 0,635 cm até 2,54 cm',maxCm:2.54},
  {key:'microscopic',label:'Microscopic (Microscópico)',range:'até 0,635 cm (6,35 mm)',maxCm:0.635},
]);

export function shrinkPowerLevel(item) {
  if (item?.type !== 'power') return 0;
  const match = /^Shrink ([1-4])$/i.exec(String(item.name ?? '').trim());
  return match ? Number(match[1]) : 0;
}

function asSize(value) { return String(value ?? 'average').trim().toLowerCase(); }
function effects(actor) { return Array.from(actor?.effects?.contents ?? actor?.effects ?? []); }
function changes(effect) { return effect?.system?.changes ?? effect?.changes ?? []; }
function isNaturalSizeEffect(effect) {
  if (isResizeChoiceEffect(effect)) return false;
  return effect?.flags?.[SYSTEM_ID]?.managedSize === true ||
    (/^(?:Microscopic|Miniature|Tiny|Little|Small|Average|Big|Huge|Gigantic|Titanic|Gargantuan) Effects$/i.test(String(effect?.name ?? '')) &&
      changes(effect).some(c => c.key === 'system.size'));
}
function deepClone(value) {
  return globalThis.foundry?.utils?.deepClone
    ? globalThis.foundry.utils.deepClone(value)
    : JSON.parse(JSON.stringify(value));
}

/** Options follow the greatest legal shrink degree and never include sizes >= natural. */
export function availableShrinkSizes(level, natural = 'average') {
  const power = Math.max(0, Math.min(4, Number(level) || 0));
  if (!power) return [];
  const naturalIndex = SIZE_ORDER.indexOf(asSize(natural));
  const limitIndex = SIZE_ORDER.indexOf(SHRINK_SIZES[power-1].key);
  return SHRINK_SIZES.filter(size => {
    const index = SIZE_ORDER.indexOf(size.key);
    return index < naturalIndex && index >= limitIndex;
  });
}

export function shrinkChoiceOptions(item, actor) {
  if (!actor || !shrinkPowerLevel(item)) return [];
  return [{key:'normal',label:'Tamanho normal',range:'Retornar ao tamanho natural'},
    ...availableShrinkSizes(shrinkPowerLevel(item), naturalGrowSize(actor))];
}

export async function promptShrinkChoice(item, actor) {
  const choices = shrinkChoiceOptions(item, actor);
  if (!choices.length) return null;
  const selected = effects(actor).find(e => !e.disabled && e.flags?.[SYSTEM_ID]?.shrinkChoice === true);
  const current = selected?.flags?.[SYSTEM_ID]?.shrinkSelectedSize ?? 'normal';
  const options = choices.map(s =>
    `<option value="${s.key}"${s.key === current ? ' selected' : ''}>${s.label} — ${s.range}</option>`).join('');
  const content = `<div class="form-group"><label for="mm-shrink-size-choice"><strong>Escolha até onde deseja encolher</strong></label>
    <select id="mm-shrink-size-choice" name="shrinkSize" style="width:100%;margin:10px 0;">${options}</select>
    <p class="hint">Shrink ${shrinkPowerLevel(item)}: apenas categorias permitidas. Selecione Tamanho normal para desfazer o encolhimento.</p></div>`;
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.wait) throw new Error('A janela de Encolhimento requer Foundry VTT v14.');
  const result = await DialogV2.wait({
    window:{title:`Encolhimento — ${item.name}`},content,rejectClose:false,
    buttons:[
      {action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'select',label:'Aplicar tamanho',default:true,callback:(_event,button)=>button.form.elements.shrinkSize.value},
    ],
  });
  return choices.some(c => c.key === result) ? result : null;
}

/** Apply a single Resize Active Effect; do not rewrite base size or double-count natural defenses. */
export async function applyShrinkChoice(actor, item, choice, config) {
  const choices = shrinkChoiceOptions(item, actor);
  if (!choices.some(c => c.key === choice)) throw new Error('Este tamanho não é permitido pelo poder.');
  const oldResize = effects(actor).filter(isResizeChoiceEffect);
  if (choice === 'normal') {
    if (oldResize.length) await actor.deleteEmbeddedDocuments('ActiveEffect', oldResize.map(e => e.id), {[RESIZE_SKIP_OPTION]:true});
    await syncActorTokenSize(actor, naturalGrowSize(actor));
    return choices[0];
  }
  const source = config?.sizeEffects?.[choice];
  if (!source) throw new Error(`Efeito de tamanho desconhecido: ${choice}`);
  const template = deepClone(source);
  const natural = naturalGrowSize(actor);
  const naturalEffect = effects(actor).find(e => !e.disabled && isNaturalSizeEffect(e) &&
    changes(e).some(c => c.key === 'system.size' && asSize(c.value) === natural));
  const naturalBonuses = new Map(changes(naturalEffect).filter(c =>
    c.key?.startsWith('system.abilities.') && Number(c.mode) === 2)
    .map(c => [c.key,Number(c.value) || 0]));
  const entries = template.changes ?? template.system?.changes ?? [];
  for (const c of entries) {
    if (c.key === 'system.size') { c.priority = 1000; continue; }
    if (naturalBonuses.has(c.key) && Number(c.mode) === 2) {
      c.value = Number(c.value) - naturalBonuses.get(c.key);
    }
  }
  template.name = `Encolhimento — ${SHRINK_SIZES.find(s => s.key === choice)?.label ?? choice}`;
  template.transfer = false;
  template.flags = {...template.flags,[SYSTEM_ID]:{
    ...template.flags?.[SYSTEM_ID], managedSize:false,shrinkChoice:true,
    shrinkSelectedSize:choice,shrinkPowerLevel:shrinkPowerLevel(item),shrinkSourceItemId:item.id ?? null,
  }};
  if (oldResize.length) await actor.deleteEmbeddedDocuments('ActiveEffect',oldResize.map(e => e.id));
  await actor.createEmbeddedDocuments('ActiveEffect',[template], {[RESIZE_SKIP_OPTION]:true});
  await syncActorTokenSize(actor,choice);
  return choices.find(c => c.key === choice);
}
