/**
 * Native Anger handler (Basic), v0.2.181.
 * Bound to the power-specific Concentration ActiveEffect, never to a persistent
 * Actor stat or an independently removable status. No GM privilege escalation.
 */
// Read only the effects owned by this actor; no hooks or additional automation layers.
const itemHasConcentration = item => {
  const d=item?.system?.duration ?? item?.duration ?? '';
  const value=typeof d==='object' ? (d.value??d.type??d.label??'') : d;
  return /concentracao|concentration/.test(String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
};
const getConcentrationPowerEffects = (actor,{activeOnly=false}={}) => Array.from(actor?.effects??[]).filter(e =>
  e?.flags?.['multiverse-d616']?.concentrationPower?.transient===true && (!activeOnly || !e.disabled));

const NS='multiverse-d616';
const ANGER_ID='3BRcvFKqGlgbnabc';
const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export const isOfficialAnger = item => item?.type==='power' &&
  item?.name==='Anger' && item?.system?.powerSet==='Basic';

const active = actor => getConcentrationPowerEffects(actor,{activeOnly:true});
const ownerItem = (actor,effect) => actor?.items?.get?.(effect?.flags?.[NS]?.concentrationPower?.itemId);
const ownedAngerEffect = (actor,effect) => {
  const itemId=effect?.flags?.[NS]?.concentrationPower?.itemId;
  if(!itemId)return false;
  const native=effect?.flags?.[NS]?.nativeAnger;
  // A power attached to an Item may use a transient Item document, which is
  // not in actor.items; its own power-specific effect still carries identity.
  return isOfficialAnger(ownerItem(actor,effect)) ||
    (native?.sourcePowerId===ANGER_ID && String(native?.sourceItemId)===String(itemId));
};

/** No simultaneous Concentrations while Anger is maintained. Read-only guard,
 * executed before any Focus, action, or Concentration changes. */
export function checkAngerConcentrationCompatibility(actor,item) {
  if (!actor || !item || !itemHasConcentration(item)) return {ok:true};
  const effects=active(actor);
  if (isOfficialAnger(item)) {
    if (effects.some(e=>String(e.flags?.[NS]?.concentrationPower?.itemId)!==String(item.id)))
      return {ok:false,reason:'Anger: encerre os outros poderes em Concentração antes de ativar Anger.'};
  } else if (effects.some(e=>ownedAngerEffect(actor,e))) {
    return {ok:false,reason:'Anger ativo: não é permitido utilizar outro poder que exija Concentração.'};
  }
  return {ok:true};
}

export function angerModifiers(spent) {
  const total=numeric(spent);
  if (!Number.isSafeInteger(total)||total<10) throw new Error('Anger requer 10 Focus ou mais.');
  const tiers=Math.floor(total/10);
  return Object.freeze({spent:total,tiers,meleeDamageBonus:tiers*15,logicPenalty:-2*tiers});
}

/** The concentration effect is created by the established system beforehand.
 * This update only adds a native metadata record and the Logic active change.
 * Deleting or disabling concentration removes both automatically. */
export async function applyAngerConcentration(actor,item,spent) {
  if (!isOfficialAnger(item)) return null;
  const effect=active(actor).find(e=>String(e.flags?.[NS]?.concentrationPower?.itemId)===String(item.id));
  if (!effect?.update) throw new Error('O efeito de Concentração de Anger não foi encontrado.');
  const modifiers=angerModifiers(spent);
  // Preserve any future legitimate, unrelated concentration modifications.
  const existing=Array.from(effect.system?.changes ?? []).filter(c=>c.key!=='system.abilities.log.value');
  const change={key:'system.abilities.log.value',type:'add',value:modifiers.logicPenalty,phase:'initial',priority:null};
  await effect.update({
    'system.changes':[...existing,change],
    [`flags.${NS}.nativeAnger`]:{
      ...modifiers,sourcePowerId:ANGER_ID,sourceItemId:String(item.id),version:1,
    },
  });
  return modifiers;
}

/** Melee only, no multiplier modifications. Snapshot on originating attack roll,
 * so later GM adjudication and ending Concentration cannot change an old card. */
export function angerMeleeBonusForAttack(actor,abilityKey,isAttack=true) {
  if(!isAttack || String(abilityKey)!=='mle') return 0;
  let bonus=0;
  for(const effect of active(actor)) {
    if (!ownedAngerEffect(actor,effect)) continue;
    const data=effect.flags?.[NS]?.nativeAnger;
    if (data?.sourcePowerId!==ANGER_ID || String(data?.sourceItemId)!==String(effect.flags?.[NS]?.concentrationPower?.itemId)) continue;
    const value=numeric(data?.meleeDamageBonus);
    const tiers=numeric(data?.tiers);
    if(!Number.isSafeInteger(tiers)||tiers<1||value!==tiers*15) continue;
    bonus=Math.max(bonus,value); // never stack duplicate effects
  }
  return bonus;
}
