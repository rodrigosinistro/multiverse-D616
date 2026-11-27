/**
 * Macros_D616 v0.2.188 — Martial Arts stance effects and Health-loss cleanup.
 * Attack Stance doubles the *Melee ability bonus for damage*, not the
 * multiplier. The generic Concentration lifecycle remains authoritative.
 * Unflappable Poise is a permanent targeted-attack passive: the shared
 * Edge/Trouble engine adjudicates multiple Trouble and mixed-target attacks.
 * Health-loss cleanup deletes only the Defense Stance effect under validated
 * owner/GM authority; no global Actor stat writes or privilege changes.
 */
import {hasEquipmentPermanentPower} from './equipment-permanent-effects.mjs';
const SYSTEM='multiverse-d616';
const ATTACK_STANCE_ID='cCVjyNL1fTcyAq9g';
const DEFENSE_STANCE='Defense Stance';
const MARTIAL='Martial Arts';
const effectsOf=actor=>Array.from(actor?.effects?.contents??actor?.effects?.values?.()??actor?.effects??[]);
const itemsOf=actor=>Array.from(actor?.items?.contents??actor?.items?.values?.()??actor?.items??[]);
const official=(item,name)=>item?.type==='power'&&item?.name===name&&item?.system?.powerSet===MARTIAL;
const concentrationFor=(actor,item)=>effectsOf(actor).find(effect=>!effect?.disabled&&effect?.duration?.expired!==true&&
  effect?.flags?.[SYSTEM]?.concentrationPower?.transient===true&&
  String(effect.flags[SYSTEM].concentrationPower.itemId)===String(item?.id??item?._id));

export const isAttackStance=item=>official(item,'Attack Stance');

/** Activation already created the usual concentration effect. Only annotate
 * that specific effect for safe subsequent identification, including attached
 * powers that are not stored in actor.items. The actor's Melee value is read
 * again when an attack is made, so temporary ability changes are reflected.
 */
export async function applyAttackStance(actor,item){
  if(!isAttackStance(item))return null;
  const effect=concentrationFor(actor,item);
  if(!effect?.update)throw new Error('Attack Stance: Concentração ativa não encontrada.');
  const sourceItemId=String(item.id??item._id);
  await effect.update({[`flags.${SYSTEM}.nativeAttackStance`]:{
    version:1,sourcePowerId:ATTACK_STANCE_ID,sourceItemId,
  }});
  return Object.freeze({kind:'native-attack-stance',sourceItemId});
}

function hasTrustedStance(actor,effect){
  const data=effect?.flags?.[SYSTEM]?.nativeAttackStance;
  const holder=effect?.flags?.[SYSTEM]?.concentrationPower;
  if(!holder?.transient || !data || data.sourcePowerId!==ATTACK_STANCE_ID ||
     String(data.sourceItemId)!==String(holder.itemId))return false;
  // A matching live source power is mandatory when the actor retains it;
  // attached powers may only exist as an ephemeral Item during activation.
  const owned=actor?.items?.get?.(holder.itemId);
  if(owned && !isAttackStance(owned))return false;
  return true;
}

/** An actual active Attack Stance is mandatory for Counterstrike Technique.
 * Prefer the validated native marker; legacy concentration without the marker
 * is accepted only when it points to the exact owned official power. */
export function hasAttackStanceConcentration(actor){
  return effectsOf(actor).some(effect=>{
    if(effect?.disabled||effect?.duration?.expired===true)return false;
    if(hasTrustedStance(actor,effect))return true;
    const holder=effect?.flags?.[SYSTEM]?.concentrationPower;
    if(!holder?.transient||!holder.itemId)return false;
    const power=actor?.items?.get?.(holder.itemId)??itemsOf(actor).find(i=>i.id===holder.itemId);
    return official(power,'Attack Stance');
  });
}

export function attackStanceMeleeBonus(actor,abilityKey,isAttack=true){
  if(!isAttack||String(abilityKey)!=='mle')return 0;
  const active=effectsOf(actor).some(effect=>!effect?.disabled&&effect?.duration?.expired!==true&&hasTrustedStance(actor,effect));
  if(!active)return 0;
  const value=Number(actor?.system?.abilities?.mle?.value);
  return Number.isFinite(value)&&Number.isSafeInteger(value)?value:0;
}

/** Match only the live, power-specific concentration for the official
 * Defense Stance. Removing this effect lets the existing Concentration
 * lifecycle decrement the generic counter; other powers stay active.
 */
export function defenseStanceEffects(actor){
  return effectsOf(actor).filter(effect=>{
    if(effect?.disabled||effect?.duration?.expired===true)return false;
    const holder=effect?.flags?.[SYSTEM]?.concentrationPower;
    if(!holder?.transient||!holder.itemId)return false;
    const item=actor?.items?.get?.(holder.itemId)??
      itemsOf(actor).find(i=>String(i.id??i._id)===String(holder.itemId));
    // Require the exact Martial Arts power, not a same-named homebrew.
    return official(item,DEFENSE_STANCE);
  });
}
export function hasDefenseStanceConcentration(actor){
  return defenseStanceEffects(actor).length>0;
}

/** Compare actual Health values after all damage reduction, protection and
 * healing. Focus loss, zero damage and healing do not break Defense Stance.
 */
export function hasActualHealthLoss(before,after){
  const first=Number(before),last=Number(after);
  return before!==undefined&&before!==null&&after!==undefined&&after!==null&&
    Number.isFinite(first)&&Number.isFinite(last)&&last<first;
}

const pendingDefenseRemoval=new Set();
export async function endDefenseStanceOnHealthLoss(actor,before,after){
  if(!hasActualHealthLoss(before,after)||!actor?.deleteEmbeddedDocuments)return false;
  const key=String(actor.uuid??actor.id??'');
  if(!key||pendingDefenseRemoval.has(key))return false;
  const live=defenseStanceEffects(actor).map(effect=>effect.id).filter(Boolean);
  if(!live.length)return false;
  pendingDefenseRemoval.add(key);
  try {
    // The Concentration delete hook updates the generic counter, so do not
    // remove the generic status here or interrupt unrelated powers.
    const stillLive=new Set(defenseStanceEffects(actor).map(effect=>effect.id));
    const ids=live.filter(id=>stillLive.has(id));
    if(!ids.length)return false;
    await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
    return true;
  }finally {pendingDefenseRemoval.delete(key);}
}

/** All clients observe Health snapshots; only the primary GM (or the owner
 * who actually updated the actor when no GM exists) removes an effect. This
 * avoids duplicate deletes across player/GM clients or repeated damage.
 */
const observedHealth=new Map();
const beforeLocalUpdate=new Map();
const healthValue=actor=>Number(actor?.system?.health?.value);
const healthChange=changes=>changes?.['system.health.value']??changes?.system?.health?.value;
const snapshotActor=actor=>{
  if(!actor?.uuid)return;
  const value=healthValue(actor);
  if(Number.isFinite(value))observedHealth.set(actor.uuid,value);
};
function snapshotWorld(){
  for(const actor of (game?.actors?.contents??game?.actors??[]))snapshotActor(actor);
  for(const token of (canvas?.tokens?.placeables??[]))snapshotActor(token?.actor);
}
function mayRemove(actor,userId){
  const activeGM=game?.users?.activeGM;
  if(activeGM?.id)return !!game?.user?.isGM&&game.user.id===activeGM.id;
  if(game?.user?.isGM)return true;
  return game?.user?.id===userId&&!!actor?.testUserPermission?.(
    game.user,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3);
}
function processHealthChange(actor,changes,userId){
  const next=healthChange(changes);
  if(next===undefined||!actor?.uuid)return;
  const previous=beforeLocalUpdate.get(actor.uuid)??observedHealth.get(actor.uuid);
  beforeLocalUpdate.delete(actor.uuid);
  const current=healthValue(actor);
  if(!Number.isFinite(current))return;
  observedHealth.set(actor.uuid,current);
  if(mayRemove(actor,userId)&&hasActualHealthLoss(previous,current))
    void endDefenseStanceOnHealthLoss(actor,previous,current).catch(error=>
      console.error('[D616] Falha ao encerrar Defense Stance após dano em Health',error));
}
export function registerDefenseStanceDamageHooks(){
  snapshotWorld();
  Hooks.on('canvasReady',snapshotWorld);
  Hooks.on('createActor',snapshotActor);
  Hooks.on('createToken',token=>snapshotActor(token?.actor));
  Hooks.on('preUpdateActor',(actor,changes)=>{
    if(actor?.uuid&&healthChange(changes)!==undefined)
      beforeLocalUpdate.set(actor.uuid,healthValue(actor));
  });
  Hooks.on('updateActor',(actor,changes,_options,userId)=>
    processHealthChange(actor,changes,userId));
  // Some unlinked tokens persist their actor Health in a TokenDocument delta.
  // Process it only when the token's actor has an actual new Health value.
  Hooks.on('updateToken',(token,changes,_options,userId)=>{
    const delta=changes?.delta;
    if(delta&&healthChange(delta)!==undefined)
      processHealthChange(token?.actor,delta,userId);
  });
}

export function hasUnflappablePoise(actor){
  return itemsOf(actor).some(item=>official(item,'Unflappable Poise')) || hasEquipmentPermanentPower(actor,'Unflappable Poise');
}

/** One automatic Trouble vs actual melee/close attacks. The second while
 * Defense Stance is eligible is explicitly surfaced for Narrator adjudication
 * because the shared resolver does not auto-spend two Trouble rerolls.
 */
export function unflappableTargetModifiers(actor,{attack=false,targeted=false,close=false}={}){
  if(!attack||!targeted||!close||!hasUnflappablePoise(actor))return [];
  const result=[Object.freeze({source:'Alvo: Unflappable Poise',
    reason:'Trouble permanente contra ataque corpo a corpo',sign:-1})];
  if(hasDefenseStanceConcentration(actor))result.push(Object.freeze({
    source:'Alvo: Unflappable Poise + Defense Stance',
    reason:'Segundo Trouble enquanto Defense Stance estiver ativo; rerolls manuais; encerra ao sofrer dano em Health',sign:-1,
  }));
  return result;
}
