/**
 * Multiverse D616 v0.2.72 — Powers stored ON equipment (weapon or ordinary item).
 * Powers are independent copies in a namespaced Item flag, not Actor powers.
 * The original Power Item, equipment data and actor's spell list stay untouched.
 */
const NS = 'multiverse-d616';
const FIELD = 'attachedPowers';

export function supportsAttachedPowers(item) {
  return item?.type === 'weapon' || item?.type === 'item';
}

export function getAttachedPowers(item) {
  if (!supportsAttachedPowers(item)) return [];
  const result = item?.flags?.[NS]?.[FIELD] ?? item?.getFlag?.(NS, FIELD);
  return Array.isArray(result) ? result.filter(p => p && typeof p === 'object' && p.id && p.data?.type === 'power') : [];
}

export function attachedPowerUsable(carrier, actor = carrier?.actor) {
  if (!supportsAttachedPowers(carrier) || !actor || carrier.actor !== actor) return false;
  if (carrier.type === 'weapon' && carrier.system?.equipped !== true) return false;
  return true;
}

function cloneData(data) {
  if (typeof foundry?.utils?.deepClone === 'function') return foundry.utils.deepClone(data);
  return JSON.parse(JSON.stringify(data));
}

export async function attachPower(carrier, power) {
  if (!supportsAttachedPowers(carrier) || power?.type !== 'power')
    throw new Error('Arraste um Poder para a ficha de uma Arma ou Item.');
  if (carrier.isOwner === false) throw new Error('Você não tem permissão para editar esta arma ou item.');
  const existing = getAttachedPowers(carrier);
  const sourceUuid = String(power.uuid ?? '');
  if (sourceUuid && existing.some(p => p.sourceUuid === sourceUuid))
    return {added:false, reason:'Este poder já está associado a este equipamento.'};
  const raw = typeof power.toObject === 'function' ? power.toObject() : power;
  // Deliberately store a COPY (not a live link): later source/compendium changes
  // cannot silently change a previously configured magic weapon.
  const data = {
    type: 'power',
    name: String(raw.name ?? power.name ?? 'Poder'),
    img: String(raw.img ?? power.img ?? 'icons/svg/mystery-man.svg'),
    system: cloneData(raw.system ?? power.system?.toObject?.() ?? {}),
    effects: cloneData(Array.isArray(raw.effects) ? raw.effects : []),
    flags: cloneData(raw.flags ?? {}),
  };
  const entry = {
    id: foundry.utils.randomID(16), sourceUuid,
    name:data.name, img:data.img, data,
  };
  await carrier.update({[`flags.${NS}.${FIELD}`]:[...existing,entry]});
  return {added:true,entry};
}

export async function detachPower(carrier, id) {
  if (!supportsAttachedPowers(carrier) || carrier.isOwner === false) return false;
  const existing = getAttachedPowers(carrier);
  if (!existing.some(p => p.id === id)) return false;
  await carrier.update({[`flags.${NS}.${FIELD}`]:existing.filter(p => p.id !== id)});
  return true;
}

/** Lookup is intentionally limited to equipment actually owned by this Actor.
 * Transient attached powers are not Actor.items, so systems which resolve a
 * Concentration itemId must consult this map as a safe fallback.
 * A weapon's power is inactive while that weapon is unequipped.
 */
export function findUsableAttachedPower(actor, id) {
  if (!actor || !id) return null;
  const carriers = Array.from(actor.items?.contents ?? actor.items?.values?.() ?? actor.items ?? []);
  for (const carrier of carriers) {
    if (!attachedPowerUsable(carrier, actor)) continue;
    const entry = getAttachedPowers(carrier).find(p => p.id === id);
    if (entry) return {
      id: entry.id, type: 'power', name: entry.data.name, img: entry.data.img,
      system: entry.data.system, flags: entry.data.flags, carrier,
    };
  }
  return null;
}

/** Persist edits exclusively in the equipment's private snapshot. */
export async function updateAttachedPower(carrier, id, edits) {
  if (!supportsAttachedPowers(carrier) || carrier.isOwner === false)
    throw new Error('Você não tem permissão para editar este equipamento.');
  const list = getAttachedPowers(carrier);
  const index = list.findIndex(p => p.id === id);
  if (index < 0) throw new Error('O poder associado não foi encontrado.');
  const entry = cloneData(list[index]);
  const fields = ['element', 'powerSet', 'prerequisites', 'action', 'trigger',
    'duration', 'range', 'cost', 'attackTarget', 'description', 'effect',
    'ability', 'attackKind', 'attackEdgeMode', 'formula', 'attackRange',
    'attackMultiplier', 'rollTargetNumber'];
  if (Object.hasOwn(edits, 'name')) {
    const name = String(edits.name ?? '').trim();
    if (!name) throw new Error('O nome do poder não pode ficar vazio.');
    entry.data.name = name;
    entry.name = name;
  }
  if (Object.hasOwn(edits, 'img')) {
    const img = String(edits.img ?? '').trim();
    if (img) entry.data.img = entry.img = img;
  }
  for (const key of fields) if (Object.hasOwn(edits, key)) {
    if (['attackRange','attackMultiplier','rollTargetNumber'].includes(key)) {
      const value = String(edits[key] ?? '').trim();
      if (value === '') continue;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`Número inválido: ${key}.`);
      entry.data.system[key] = parsed;
    } else entry.data.system[key] = String(edits[key] ?? '');
  }
  const next = list.slice();
  next[index] = entry;
  await carrier.update({[`flags.${NS}.${FIELD}`]:next});
  return entry;
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Focused editor for the copied Power. Editing never modifies the originating
 * Actor/compendium item or creates a second Actor Power. */
export async function editAttachedPower(carrier, id) {
  if (!supportsAttachedPowers(carrier) || carrier.isOwner === false)
    throw new Error('Sem permissão para editar o poder deste equipamento.');
  const entry = getAttachedPowers(carrier).find(p => p.id === id);
  if (!entry) throw new Error('O poder associado não foi encontrado.');
  const power = entry.data.system ?? {};
  const field = (key,label,rows=0) => {
    const value=escapeHtml(key==='name'?entry.data.name:key==='img'?entry.data.img:power[key]);
    return `<label class="mm-ap-field"><span>${label}</span>${rows
      ? `<textarea name="${key}" rows="${rows}">${value}</textarea>`
      : `<input name="${key}" type="text" value="${value}" />`}</label>`;
  };
  const elements = globalThis.CONFIG?.MULTIVERSE_D616?.elements ?? {};
  const values = Object.entries(elements).map(([key,item]) => ({key,label:item.label ?? key}));
  const elementOptions = [{key:'',label:'Herdar elemento do portador'},...values]
    .map(({key,label}) => `<option value="${escapeHtml(key)}"${String(power.element ?? '')===key?' selected':''}>${escapeHtml(label)}</option>`).join('');
  const content = `<div class="mm-attached-power-editor">
    <p class="hint">Editando somente a cópia vinculada a <strong>${escapeHtml(carrier.name)}</strong>. O poder de origem e o elemento do personagem permanecem inalterados.</p>
    ${field('name','Nome do Poder')}
    <label class="mm-ap-field"><span>Elemento do Poder</span><select name="element">${elementOptions}</select></label>
    ${field('powerSet','Power Set')}
    <div class="mm-ap-grid">${field('action','Ação')}${field('cost','Custo de Focus')}
      ${field('duration','Duração')}${field('range','Alcance')}
      ${field('ability','Atributo do ataque')}${field('attackTarget','Defesa alvo')}
      ${field('attackKind','Tipo de ataque')}${field('attackEdgeMode','Edge / Trouble')}
      ${field('attackMultiplier','Multiplicador')}${field('attackRange','Distância do ataque')}
    </div>
    ${field('prerequisites','Pré-requisitos')}
    ${field('trigger','Gatilho')}
    ${field('formula','Fórmula de rolagem')}
    ${field('description','Descrição (HTML)',3)}
    ${field('effect','Efeito (HTML)',3)}
  </div>`;
  const DialogV2=globalThis.foundry?.applications?.api?.DialogV2;
  if (typeof DialogV2?.wait !== 'function') throw new Error('Editor requer Foundry v14.');
  const result = await DialogV2.wait({
    window:{title:`Editar Poder — ${entry.data.name}`},
    position:{width:610},classes:['mm-attached-power-dialog'],content,rejectClose:false,
    buttons:[
      {action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'save',label:'Salvar Poder',default:true,callback:(_event,button)=>{
        const form=button.form;
        const values={};
        for(const key of ['name','element','powerSet','action','cost','duration','range',
          'ability','attackTarget','attackKind','attackEdgeMode','attackMultiplier',
          'attackRange','prerequisites','trigger','formula','description','effect'])
          values[key]=form.elements.namedItem(key)?.value ?? '';
        return values;
      }},
    ],
  });
  return result ? updateAttachedPower(carrier,id,result) : null;
}

export function makeAttachedPowerDocument(carrier, id, actor = carrier?.actor) {
  if (!attachedPowerUsable(carrier,actor)) return null;
  const entry = getAttachedPowers(carrier).find(p => p.id === id);
  if (!entry) return null;
  const data = cloneData(entry.data);
  // V14 enforces integer/null ActiveEffect.duration.value when an Item is constructed.
  for (const effect of data.effects ?? []) {
    if (!effect?.duration || typeof effect.duration !== 'object') continue;
    const value = effect.duration.value;
    if (value !== null && value !== undefined && !Number.isInteger(value)) {
      const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
      effect.duration.value = Number.isSafeInteger(parsed) ? parsed : null;
    }
  }
  data._id = id;
  // A transient Item has the ACTOR as parent, so the existing item.roll() path
  // handles targets, Focus, concentration, condition changes and chat messages.
  // It is NOT inserted into actor.items and is never automatically granted as
  // an intrinsic power or passive bonus.
  const DocumentClass = CONFIG?.Item?.documentClass;
  if (!DocumentClass) throw new Error('A classe Item do sistema não está disponível.');
  return new DocumentClass(data,{parent:actor});
}

export async function activateAttachedPower(carrier, id, actor = carrier?.actor) {
  if (actor?.isOwner === false && !(typeof game !== 'undefined' && game.user?.isGM))
    throw new Error('Você não possui permissão para usar os poderes deste personagem.');
  if (!attachedPowerUsable(carrier,actor)) {
    throw new Error(carrier?.type === 'weapon'
      ? 'Equipe a arma antes de usar o poder associado.'
      : 'Coloque este item no inventário de um personagem antes de usar o poder.');
  }
  const power = makeAttachedPowerDocument(carrier,id,actor);
  if (!power) throw new Error('O poder associado não foi encontrado.');
  return power.roll();
}
