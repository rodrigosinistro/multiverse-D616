/**
 * v0.2.75 — Permanent powers granted by inventory equipment.
 *
 * The snapshots live on the equipment, not in Actor.items. V14 normally only
 * transfers ActiveEffects from embedded Items, so these copies must be exposed
 * as transient Actor ActiveEffects during Actor.allApplicableEffects().
 *
 * A family is the Power Set + exact base name with a trailing numbered tier
 * removed (Sturdy 2 / Sturdy 4, etc.). If an equipped/owned equipment supplies
 * that family, choose the highest tier across the Actor and ALL usable gear.
 * Suppress lower innate Item effects of that family while gear is in play.
 * Identical tiers prefer the innate Power, avoiding needless duplicates.
 *
 * No stored Actor or Item data is modified. Removing/unequipping equipment
 * automatically restores the normal Actor preparation on the next refresh.
 */
import {getAttachedPowers, attachedPowerUsable} from './item-attached-powers.mjs';
import {normalizeItemEffectDurations} from './active-effect-v14-compat.mjs';
import {flexibleBones2Effect,makeOwnedJumpEffect,upgradeChangesForPower,
  upgradeMovementChangesForPower,upgradeModePowerEffect,upgradeExtendedReachEffect,
  upgradeShieldEffect} from './migrations/v022-power-effects.mjs';

const SYS='multiverse-d616';

function ownItems(actor){
  const collection=actor?.items;
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values==='function') return [...collection.values()];
  if (typeof collection[Symbol.iterator]==='function') return [...collection];
  return [];
}

function text(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().replace(/\s+/g,' ').toLowerCase();
}

export function isPermanentAttachedPower(power){
  const duration=power?.system?.duration;
  const raw=typeof duration==='object'&&duration!==null
    ? (duration.value ?? duration.label ?? duration.type ?? '') : duration;
  return ['permanent','permanente'].includes(text(raw));
}

/** Keep named tiers distinct from the Power Set so unrelated powers never collide. */
export function permanentPowerFamily(power){
  if (!power || !isPermanentAttachedPower(power)) return null;
  const original=text(power.name);
  if (!original) return null;
  const match=/^(.*?)\s+(\d+)$/.exec(original);
  const base=match?match[1]:original;
  if (!base) return null;
  const numbered=Number(power.system?.numbered);
  const level=match?Number(match[2]):(Number.isInteger(numbered)&&numbered>0?numbered:1);
  return {key:`${text(power.system?.powerSet)}::${base}`,level};
}

// Permanent duration describes the result of some *activated* powers, not
// a passive bonus. Their activation continues through the equipment's button.
const MANUALLY_ACTIVATED_PERMANENT=new Set([
  'charmed life','disguise','domination','edit memory','flexible fingers',
  'levitation','memory blip','orders','resize object','resize other',
  'resize others','rubberneck','shape shift','teleport object',
]);
function isPassivePermanentPower(power){
  const family=permanentPowerFamily(power);
  if (!family) return false;
  const base=family.key.split('::').at(-1);
  return !MANUALLY_ACTIVATED_PERMANENT.has(base) &&
    !['grow','shrink'].includes(base);
}

/** Some canonical permanent powers had no stored ActiveEffect in older
 * compendiums; the stable world migration creates one for owned Power Items.
 * Reuse those same definitions for an equipment copy without migrating it. */
function inferredPassiveEffects(power){
  if(power?.system?.powerSet==='Plasticity' && power.name==='Flexible Bones 2')
    return [flexibleBones2Effect(power)];
  const jump=makeOwnedJumpEffect(power);
  return jump?[jump]:[];
}

/** Some permanent passive rules are implemented as named-power checks
 * (outside the generic ActiveEffect pipeline). Their holders may be items. */
export function hasEquipmentPermanentPower(actor,name){
  const requested=text(name);
  if(!requested) return false;
  return ownItems(actor).some(carrier=>attachedPowerUsable(carrier,actor) &&
    getAttachedPowers(carrier).some(entry=>isPermanentAttachedPower(entry.data) &&
      text(entry.data.name??entry.name)===requested));
}

function transferableEffects(power){
  return Array.from(power?.effects ?? []).filter(effect =>
    effect && effect.transfer===true && !effect.disabled && !effect.isSuppressed);
}

function isBetter(candidate,current){
  if (!current) return true;
  if (candidate.level!==current.level) return candidate.level>current.level;
  // Prefer the character's intrinsic powers over a same-tier item.
  if (candidate.source!==current.source) return candidate.source==='actor';
  return false; // first equipped carrier wins among same-tier gear
}

/**
 * Pure selection for Active Effect pipeline; `buildEffect` receives the copied
 * effect and its source metadata. When called from Actor.allApplicableEffects,
 * it constructs an ephemeral Foundry v14 ActiveEffect (never persists it).
 *
 * Only interfere with families actually granted by active equipment. Without
 * equipment, the original allApplicableEffects output remains unchanged.
 */
export function resolveEquipmentPermanentEffects(actor, applicableEffects, buildEffect){
  const base=Array.from(applicableEffects ?? []);
  const owned=ownItems(actor);
  const equipment=[];
  for(const carrier of owned){
    if (!attachedPowerUsable(carrier,actor)) continue;
    for(const entry of getAttachedPowers(carrier)){
      const power={...entry.data, name:entry.data?.name ?? entry.name};
      const family=permanentPowerFamily(power);
      if (!family || !isPassivePermanentPower(power)) continue;
      const effects=transferableEffects(power);
      if (!effects.length) effects.push(...inferredPassiveEffects(power));
      if (!effects.length) continue; // no passive AE to transfer
      equipment.push({...family,source:'equipment',carrier,entry,effects});
    }
  }
  if (!equipment.length) return base;
  const families=new Set(equipment.map(e=>e.key));
  const winners=new Map();
  for(const item of owned){
    if (item?.type!=='power') continue;
    const family=permanentPowerFamily(item);
    if (!family || !families.has(family.key)) continue;
    const candidate={...family,source:'actor',item};
    if(isBetter(candidate,winners.get(family.key))) winners.set(family.key,candidate);
  }
  for(const candidate of equipment){
    if(isBetter(candidate,winners.get(candidate.key))) winners.set(candidate.key,candidate);
  }
  const selectedBase=base.filter(effect=>{
    const source=effect?.parent;
    if(source?.type!=='power') return true; // actor statuses and other AEs unaffected
    const family=permanentPowerFamily(source);
    if(!family || !families.has(family.key)) return true;
    const winner=winners.get(family.key);
    return winner?.source==='actor' && winner.item===source;
  });
  for(const winner of winners.values()){
    if(winner.source!=='equipment') continue;
    for(let i=0;i<winner.effects.length;i++){
      const effect=winner.effects[i];
      const raw=typeof effect.toObject==='function'?effect.toObject():effect;
      const clean=normalizeItemEffectDurations({effects:[structuredCloneSafe(raw)]}).effects[0];
      // A snapshot from older Foundry versions may still have root-level changes.
      if (!Array.isArray(clean.system?.changes) && Array.isArray(clean.changes)) {
        clean.system={...(clean.system??{}),changes:clean.changes.map(change=>({
          key:change.key, value:change.value,
          type:change.type??({0:'custom',1:'multiply',2:'add',3:'downgrade',4:'upgrade',5:'override'}[change.mode]??'add'),
          phase:change.phase??'initial', priority:change.priority??null,
        }))};
        delete clean.changes;
      }
      // Official compendiums from pre-v14 releases can still contain ADD
      // Mighty modifiers or legacy Flight ×3 changes. Mirror the existing
      // non-destructive owned-power migration on THIS ephemeral effect only.
      const sourcePower={...winner.entry.data,type:'power',name:winner.entry.data.name??winner.entry.name};
      const migrated=upgradeChangesForPower(sourcePower,clean) ??
        upgradeMovementChangesForPower(sourcePower,clean) ??
        upgradeModePowerEffect(sourcePower,clean) ??
        upgradeExtendedReachEffect(sourcePower,clean) ??
        upgradeShieldEffect(sourcePower,clean);
      if(migrated?.changes){
        if(migrated.key==='system.changes') clean.system={...(clean.system??{}),changes:migrated.changes};
        else if(migrated.key==='changes') clean.changes=migrated.changes;
      }
      if(migrated?.transfer===false) continue;
      delete clean._id;
      delete clean.id;
      clean.type ||= 'base';
      clean.name ||= winner.entry.name;
      clean.transfer=true;
      clean.origin=winner.carrier.uuid ?? null;
      clean.flags={...(clean.flags??{}),[SYS]:{
        ...(clean.flags?.[SYS]??{}),equipmentPermanent:{carrierId:winner.carrier.id,powerId:winner.entry.id},
      }};
      try {
        const created=buildEffect(clean,winner);
        if(created) selectedBase.push(created);
      } catch (error) {
        // A malformed old snapshot must never prevent preparing the Actor.
        console.warn(`[${SYS}] Poder permanente inválido no equipamento ${winner.carrier.name}: ${winner.entry.name}`,error);
      }
    }
  }
  return selectedBase;
}

function structuredCloneSafe(value){
  if(typeof globalThis.structuredClone==='function'){
    try{return globalThis.structuredClone(value);}catch(_error){ /* documents may contain proxies */ }
  }
  return JSON.parse(JSON.stringify(value));
}
