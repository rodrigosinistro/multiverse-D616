import { automationEnabled } from './automation-settings.mjs';
import {endUnneededHellfireConcentration} from './held-concentration.mjs';
import { crossingRegions } from './elemental-area-geometry.mjs';
import { powerGrabStatusFor, POWER_GRABBED_STATUS } from './power-grabbed.mjs';
import {adjudicateTargetOutcome, rollSignature, MULTI_TARGET_DECISION_KEY} from './multi-target-combat.mjs';
/** Multiverse-D616 v0.2.11 — rule-driven power conditions for Foundry v14.
 * Only explicit, deterministic effects are automated.  Each condition belongs
 * to the originating roll card and never overwrites manually-added conditions.
 * The primary active GM owns all authoritative target and effect changes.
 */
import { checkPowerOutcome, hasNaturalUltimateFantastic } from './power-rolls.mjs';
import { getElementalFantasticMetadata, getElementalFantasticRule } from './elemental-fantastic.mjs';
const SYSTEM = 'multiverse-d616';
const FLAG = 'powerCondition';
const C = (status, on = 'success', expires = null, extras = {}) => ({status, on, expires, ...extras});
export const POWER_CONDITIONS = Object.freeze({
  'Disrupt Nerves': [C('stunned','success','round'), C('prone','fantastic')],
  'Flare': [C('blinded','success','turn')],
  'Dazzle': [C('blinded','success','turn')],
  // Deafen succeeds without damage; its Fantastic additionally opens the normal DAMAGE card.
  'Deafen': [C('deafened','success','turn')],
  'Wisecracker': [C('stunned','fantastic','round')],
  'Razorwebs': [C('bleeding','fantastic',null,{requiresDamage:true})],
  'Shield Bash': [C('prone','fantastic')],
  'Hurled Shield Bash': [C('prone','fantastic')],
  'Rico-Shield': [C('prone','fantastic')],
  'Clobber': [C('prone','fantastic')],
  // v0.2.68 — both versions of Banging Heads knock each target prone on a Fantastic.
  // Wait for the Narrator's individual damage confirmation as with Clobber.
  'Banging Heads': [C('prone','fantastic')],
  'Leg Sweep': [C('prone'), C('stunned','fantastic','turn')],
  'Speed Blast': [C('stunned','success','turn'), C('prone','fantastic',null,{self:true})],
  'Webcasting': [C('paralyzed'), C('pinned','fantastic')],
  'Elemental Grab': [C('grabbed','success',null,{concentration:true}), C('pinned','fantastic',null,{concentration:true})],
  'Telekinetic Grab': [C('grabbed','success',null,{concentration:true}), C('pinned','fantastic',null,{concentration:true})],
  'Webgrabbing': [C('grabbed'), C('pinned','fantastic')],
  'Crimson Bands of Cyttorak': [C('paralyzed','success',null,{concentration:true}), C('pinned','fantastic',null,{concentration:true})],
  // The wall has no generic condition on a regular success, but its
  // Fantastic elemental special effect is resolved below.
  'Elemental Barrier': [],
  'Telekinetic Barrier': [C('paralyzed','fantastic','turn')],
  'Telekinetic Sphere': [],
  // A prison is an area barrier, NOT the same as the Pinned status.
  // Its custom M badge records containment while the caster concentrates.
  'Elemental Prison': [C(null,'success',null,{concentration:true,label:'Dentro da Prisão Elemental'})],
  'Elemental Sphere': [], // unwanted creatures are moved out by GM after a hit
  'Elemental Suffocation': [C('pinned','fantastic')],
  'Elemental Push': [C('prone','fantastic')],
  'Thunder': [C('deafened'), C('stunned','fantastic','round')],
  'Mists of Morpheus': [C('stunned','success',null,{concentration:true}), C(null,'fantastic',null,{concentration:true,label:'Sono profundo'})],
  'Coiling Crush': [C('paralyzed','success',null,{concentration:true})],
  'Icy Tendrils of Ikthalon': [C('paralyzed','fantastic')],
  'Hellfire Chains': [C('grabbed','fantastic',null,{concentration:true}), C('paralyzed','fantastic',null,{concentration:true})],
  'Ground-Shaking Stomp': [C('prone','fantastic')],
  'Grappling Technique': [C('grabbed'), C('pinned','fantastic')],
  'Spin & Throw': [C('prone'), C('pinned','fantastic'), C('stunned','fantastic','turn')],
  'Leaping Leglock': [C('grabbed'), C('stunned','fantastic','turn'), C('prone','success',null,{self:true})],
  // v0.2.45 — explicit attack consequences, reconciled only AFTER the GM
  // confirms the corresponding damage card. Damage formulas, optional
  // follow-up attacks and narrative choices remain with their own engines/GM.
  'Smash': [C('stunned','fantastic','round')],
  'Reverse Punch': [C('stunned','fantastic','round')],
  'Telekinetic Attack': [C('stunned','fantastic','round')],
  'Disrupt Person': [C('stunned','fantastic','round')],
  'Bolts of Balthakk': [C('stunned','fantastic','turn')],
  'Focused Strike': [C('stunned','fantastic','turn')],
  'Mental Punch': [C('stunned','fantastic','turn')],
  'Telepathic Blast': [C('stunned','fantastic','turn')],
  // These two only stun if actual Health is lost AFTER reductions.
  'Venom Bash': [C('stunned','fantastic','round',{requiresDamage:true,damageCategory:'health'})],
  'Venom Blast': [C('stunned','fantastic','round',{requiresDamage:true,damageCategory:'health'})],
  'Point-Blank Parry': [C('bleeding','fantastic')],
  'Telekinetic Toss': [C('prone','fantastic')],
  'Flying Double Kick': [C('prone','fantastic')],
  'Dance of Death': [C('bleeding','fantastic')],
  'Orchestra of Overkill': [C('bleeding','fantastic')],
  'Unrelenting Smash': [C('prone','fantastic')],
  // v0.2.47 — further deterministic consequences from the power catalog.
  // Venom Burst knocks a target Prone on any hit, even a normal success
  // without damage. Its Fantastic-only half-Health damage remains a separate
  // manual damage decision; this condition does not invent damage.
  'Venom Burst': [C('prone')],
  'Headshot': [C('stunned','success','round',{requiresDamage:true})],
  'Penance Stare': [C('paralyzed','fantastic','turn')],
  'Double Tap': [C('bleeding','fantastic')],
  'Growing Attack': [C('stunned','fantastic','round')],
  'Snap Shooting': [C('bleeding','fantastic')],
  'Spider-Strike': [C('paralyzed','fantastic')],
  // v0.2.57 — Catalog-defined secondary Fantastic consequences.  These
  // effects wait for GM damage confirmation, and ranged cover-fire only
  // stuns after a REAL loss of Focus (not merely an attack that hit).
  'Crushing Grip': [C('pinned','fantastic')],
  'Telekinetic Crush': [C('pinned','fantastic')],
  'Suppressive Fire': [C('stunned','fantastic','turn',{requiresDamage:true,damageCategory:'focus'})],
  'Covering Fire': [C('stunned','fantastic','round',{requiresDamage:true,damageCategory:'focus'})],
  'Return Fire': [C('stunned','fantastic','turn',{requiresDamage:true,damageCategory:'focus'})],
});
const ICONS = Object.freeze({stunned:'stunned', prone:'prone', blinded:'blinded', bleeding:'bleeding', paralyzed:'paralyzed', pinned:'restrained', grabbed:'grappled', deafened:'deafened'});
const LABELS = Object.freeze({stunned:'Atordoado', prone:'Caído', blinded:'Cego', bleeding:'Sangrando', paralyzed:'Paralisado', pinned:'Imobilizado', grabbed:'Agarrado', deafened:'Surdo', ablaze:'Em Chamas', surprised:'Surpreso', poisoned:'Envenenado', corroding:'Corroído', frightened:'Amedrontado'});
// These are damaging attacks.  Do not apply their status effects until the
// Narrator confirms damage on the damage card.  Non-damaging checks, holds,
// area debuffs and effects that do not require a damage card stay immediate.
export const DAMAGE_CONFIRMATION_POWERS = new Set([
  'Wisecracker','Razorwebs','Shield Bash','Hurled Shield Bash','Rico-Shield',
  'Clobber','Banging Heads','Leg Sweep','Grappling Technique','Spin & Throw','Leaping Leglock',
  'Ground-Shaking Stomp','Hellfire Chains','Icy Tendrils of Ikthalon',
  'Elemental Prison','Elemental Sphere','Elemental Suffocation','Elemental Push',
  // All the following require a real, GM-confirmed DAMAGE card first.
  'Smash','Reverse Punch','Telekinetic Attack','Disrupt Person',
  'Bolts of Balthakk','Focused Strike','Mental Punch','Telepathic Blast',
  'Venom Bash','Venom Blast','Point-Blank Parry','Telekinetic Toss',
  'Flying Double Kick','Dance of Death','Orchestra of Overkill','Unrelenting Smash',
  'Headshot','Penance Stare','Double Tap','Growing Attack','Snap Shooting','Spider-Strike',
  'Crushing Grip','Telekinetic Crush','Suppressive Fire','Covering Fire','Return Fire',
]);
export function mustConfirmPowerDamage(power) {return DAMAGE_CONFIRMATION_POWERS.has(String(power??'').trim());}
// Damage Reduction prevents damage, not necessarily an effect explicitly
// triggered by a successful attack.  Only powers with an explicit
// 'requiresDamage' prerequisite depend on the final positive damage amount.
export function filterDamageDependentRules(rules, damageResult) {
  // Compatibility: older callers pass the numeric delta, whereas new damage
  // confirmations also supply Health/Focus. Never turn a Focus hit into the
  // Health-based stun of Venom Bash/Blast (or vice versa).
  const delta=Number(damageResult?.delta ?? damageResult);
  const category=typeof damageResult==='object' && damageResult!==null
    ?String(damageResult.category??'').trim().toLowerCase():'';
  return rules.filter(rule=>!rule.requiresDamage ||
    (Number.isFinite(delta) && delta>0 &&
     (!rule.damageCategory || category===rule.damageCategory)));
}


/** Resolve non-damaging Fantastic elemental effects using the SAME elemental
 * table used by damaging powers. No DAMAGE card is required for Elemental Grab
 * or Elemental Barrier. Earth / Force use the existing custom elemental flags,
 * so the movement and Trouble engines react to them automatically.
 * Normal conditions and Fantastic extras deliberately coexist.
 */
const INSTANT_ELEMENTAL_SPECIAL_POWERS = new Set(['Elemental Grab','Elemental Barrier','Elemental Prison','Elemental Sphere','Elemental Suffocation','Elemental Push']);
export function elementalSpecialForPower(item, sourceActor, outcome, standardRules = []) {
  if (!automationEnabled('elementalEffects')) return [];
  if(!outcome?.success || !outcome?.fantastic || !INSTANT_ELEMENTAL_SPECIAL_POWERS.has(item?.name)) return [];
  const metadata=getElementalFantasticMetadata(item,sourceActor);
  const rule=getElementalFantasticRule(metadata?.key);
  if(!rule || rule.noteOnly) return [];
  const status=rule.statusId===POWER_GRABBED_STATUS?'grabbed':rule.statusId?.startsWith('mmrpg.') ? rule.statusId.slice(6) : null;
  // Plants and Iron would duplicate Grabbed/Pinned from this same card.
  if(status && standardRules.some(r=>r.status===status)) return [];
  return [{
    status, on:'fantastic', expires:rule.rounds ? 'round':null,
    custom:rule.custom??null, element:metadata.key, elementLabel:rule.label,
    effectText:rule.text, _id:100, elementalSpecial:true,
  }];
}

export function normalizeConditionDefense(ability, actor) {
  let key = String(ability??'').toLowerCase();
  const aliases = {melee:'mle',agility:'agl',resilience:'res',vigilance:'vig',logic:'log'};
  key = aliases[key] ?? key;
  const items = values(actor?.items);
  const trait = name => items.some(i=>['trait','power'].includes(i?.type) && String(i.name??'').toLowerCase().trim()===name.toLowerCase());
  if(key==='agl' && trait('Brawling')) return 'mle';
  if(key==='mle' && trait('Evasion')) return 'agl';
  if(key==='log' && trait('Wisdom')) return 'ego';
  if(key==='ego' && trait('Integrity')) return 'log';
  return key;
}

export function getMarvelOutcome(roll, defense) {
  if (!roll || !Number.isFinite(Number(roll.total))) return null;
  const first = roll.terms?.[0];
  const pool = first?.roll?.terms?.[0]?.rolls ? first.roll.terms[0] : (first?.rolls ? first : null);
  const mRoll = pool?.rolls?.[1];
  const marvel = (mRoll?.dice??[]).find(d=>/marvel/i.test(d?.constructor?.name??'')) ??
    (mRoll?.terms??[]).find(d=>/marvel/i.test(d?.constructor?.name??'')) ??
    mRoll?.dice?.[0] ?? mRoll?.terms?.[0];
  const results = (marvel?.results??[]).filter(r=>r.active && !r.discarded);
  const fantastic = results.length ? results.some(r=>Number(r.result)===1) : Boolean(roll.isFantastic);
  // Rolls with a nested PoolTerm can keep the three original dice there,
  // rather than expose all three through roll.dice at the top level.
  const face = r => Number((r?.dice?.[0]?.results??[]).find(x=>x.active&&!x.discarded)?.result ?? r?.dice?.[0]?.result ?? NaN);
  const naturalPool = fantastic && pool?.rolls?.length >= 3 &&
    face(pool.rolls[0])===6 && face(pool.rolls[2])===6 &&
    !roll.options?.forceMarvelM && !roll.options?.ultimateFantasticApplied &&
    !roll.options?.combatTrickery;
  const ultimate = naturalPool || hasNaturalUltimateFantastic(roll, fantastic);
  return checkPowerOutcome(roll.total, defense, {fantastic, ultimate});
}
export function conditionsForOutcome(power, outcome, { self = false } = {}) {
  if (!outcome?.success) return [];
  return (POWER_CONDITIONS[String(power??'').trim()]??[]).filter(rule=>
    Boolean(rule.self)===Boolean(self) && (rule.on==='success' || (rule.on==='fantastic' && outcome.fantastic))
  );
}
function values(coll){return Array.from(coll?.contents??coll?.values?.()??coll??[]);}
function actorEffects(actor){return values(actor?.effects);}
function effectFlag(effect){return effect?.flags?.[SYSTEM]?.[FLAG]??null;}
function findConditionEffects(actor, messageId, recipientUuid) {
  return actorEffects(actor).filter(e=>{
    const f=effectFlag(e); return f?.messageId===messageId && f?.recipientUuid===recipientUuid;
  });
}
function activeGM() {
  const active=game.users?.activeGM;
  return !!game.user?.isGM && (!active || game.user.id===active.id);
}
function combatants(combat){return values(combat?.combatants);}
function combatantFor(combat, actor, tokenDoc) {
  return combatants(combat).find(c=>c.tokenId===tokenDoc?.id && c.sceneId===tokenDoc?.parent?.id) ??
    combatants(combat).find(c=>c.actor?.uuid===actor?.uuid)??null;
}
function position(combat){return `${combat?.round??0}:${combat?.turn??0}:${combat?.combatant?.id??''}`;}
function conditionFlags(message, sourceActor, targetActor, recipientUuid, rule, ruleIndex, sourceConcEffect, casterToken) {
  const combat=game.combat?.started ? game.combat : null;
  const anchorActor=rule.expires==='round' ? sourceActor : targetActor;
  // A single linked Actor can have multiple tokens participating in the same
  // combat. Anchor target-turn conditions to the exact token which was hit.
  const tokenMatch=/^Scene\.([^.]+)\.Token\.([^.]+)/.exec(String(recipientUuid??''));
  const targetToken=tokenMatch ? game.scenes?.get?.(tokenMatch[1])?.tokens?.get?.(tokenMatch[2]) : null;
  const anchorToken=rule.expires==='round' ? casterToken : targetToken;
  const anchorId=combatantFor(combat,anchorActor,anchorToken)?.id??null;
  return {
    messageId: message.id, sourceActorUuid: sourceActor.uuid, recipientUuid,
    sourceItemId: message.getFlag(SYSTEM,'itemId'), powerName: sourceActor?.items?.get?.(message.getFlag(SYSTEM,'itemId'))?.name??null, status: rule.status,
    ruleIndex, status:rule.status??null, element:rule.element??null, custom:rule.custom??null,
    combatId: combat?.id??null, initialPosition:combat?position(combat):'',
    anchorId,
    expires:rule.expires??null,
    // Uma condição de 1 turno aplicada DURANTE o turno do próprio alvo
    // já começa a contar nesse turno (inclusive por Reações).
    witnessedTargetTurn: rule.expires==='turn' && combat?.combatant?.id===anchorId
      ? position(combat) : '',
    concentrationEffectId: rule.concentration ? sourceConcEffect?.id??null : null,
  };
}
async function createCondition(actor, status, flags, itemName, rule = {}){
  const statusId=powerGrabStatusFor({status,powerName:itemName,elementalSpecial:rule.elementalSpecial,element:rule.element});
  const obj=statusId ? (Array.isArray(CONFIG.statusEffects)
    ? CONFIG.statusEffects.find(s=>s?.id===statusId)
    : CONFIG.statusEffects?.[statusId]) : null;
  // The system deliberately uses the M icon for its status badges.  In
  // Foundry v14 the default CONDITIONAL icon visibility can hide an effect
  // with no native duration, even if the status is present in the actor.
  const registered=obj?.img??obj?.icon??'';
  const img=registered || `systems/${SYSTEM}/icons/m.svg`;
  // v14 default effect-time arithmetic differs from target-turn expiry.
  // Store timing in flags, letting our combat hooks own the exact expiration.
  const duration={};
  const special=Boolean(rule.elementalSpecial);
  const effectName=special
    ? `Elemental — ${rule.elementLabel}: ${rule.effectText}`
    : `${statusId==='mmrpg.power-grabbed'?'Agarrado — Poder':rule.label??LABELS[status]??status} — ${itemName}${flags.expires ? (flags.expires==='turn'?' (1 turno)':' (1 rodada)') : ''}`;
  const ownFlags={ [SYSTEM]:{[FLAG]:flags} };
  if(statusId) ownFlags.core={statusId};
  if(special) ownFlags[SYSTEM].elementalFantastic={
    source:'condition-roll', element:rule.element, custom:rule.custom??null,
    sourceMessageId:flags.messageId, sourceActorUuid:flags.sourceActorUuid,
  };
  await actor.createEmbeddedDocuments('ActiveEffect',[{
    name:effectName, img, statuses:statusId?[statusId]:[], disabled:false,
    transfer:false, duration, changes:[], showIcon:2,
    flags:ownFlags,
  }]);
}
function concentrationEffect(actor, itemId) {
  return actorEffects(actor).find(e=>!e.disabled && e.flags?.[SYSTEM]?.concentrationPower?.itemId===itemId)??null;
}
async function sourceActorFromMessage(message){
  const scene=game.scenes?.get?.(message.speaker?.scene);
  const token=scene?.tokens?.get?.(message.speaker?.token)??null;
  const actor=token?.actor ?? game.actors?.get?.(message.speaker?.actor)??null;
  return {actor,token};
}
async function resolveTarget(uuid){
  if (!uuid?.startsWith?.('Scene.')) return null;
  try { const token=await fromUuid(uuid); return token?.documentName==='Token'?token:null; }
  catch {return null;}
}
const work=new Map();
function enqueue(key,cb){
  const prev=work.get(key)??Promise.resolve();
  const p=prev.catch(()=>{}).then(cb).catch(err=>console.error(`[${SYSTEM}] Falha ao aplicar condição`,err));
  work.set(key,p); void p.finally(()=>{if(work.get(key)===p)work.delete(key);});
  return p;
}
/** Called only on create/update of an actual dice-roll ChatMessage, never on render. */
export async function syncPowerConditions(message){
  if(!automationEnabled('powerConditions') || !activeGM() || !message?.id || !message?.rolls?.length) return;
  if(message.getFlag?.(SYSTEM,'skipPowerConditions')===true)return;
  const {actor:sourceActor,token:casterToken}=await sourceActorFromMessage(message);
  const item=sourceActor?.items?.get?.(message.getFlag(SYSTEM,'itemId'));
  if(item?.type!=='power'||!POWER_CONDITIONS[item.name])return;
  const refs=message.getFlag(SYSTEM,'targets');
  if(!Array.isArray(refs)||!refs.length)return;
  const roll=message.rolls[0];
  const defenseKey=message.getFlag(SYSTEM,'attackTarget') || item.system?.attackTarget;
  const tn=Number(message.getFlag(SYSTEM,'powerTargetNumber')??0)||0;
  if(!defenseKey && !tn)return;
  // Do not create conditions for damage-producing powers during the roll.
  // The damage card is calculated and confirmed separately by the Narrator.
  const damageConfirmation=message.getFlag(SYSTEM,'powerConditionDamage');
  // Elemental Prison traps on a regular success immediately. Its Fantastic
  // damage and additional elemental effect wait for GM damage confirmation.
  const prisonImmediate=item.name==='Elemental Prison';
  if(mustConfirmPowerDamage(item.name) && !damageConfirmation?.confirmed && !prisonImmediate)return;
  // Damage confirmations are tied to the rolled dice: a retroactive
  // Edge/Trouble reroll cannot reuse the previous damage/status result.
  const damageSignature=rollSignature(roll);
  const confirmationIsCurrent=!damageConfirmation?.rollSignature ||
    damageConfirmation.rollSignature===damageSignature;
  const confirmedDamage=new Map(((confirmationIsCurrent?damageConfirmation?.results:[])??[])
    .filter(r=>r?.targetUuid)
    .map(r=>[r.targetUuid,{
      delta:Math.max(0,Number(r.delta) || 0),
      category:String(r.category??'').trim().toLowerCase(),
    }]));
  const seen=new Set();
  const concentration=concentrationEffect(sourceActor,item.id);
  let selfRules=[];
  for(const ref of refs){
    const token=await resolveTarget(ref?.uuid);
    if(!token?.actor || seen.has(token.uuid))continue;
    seen.add(token.uuid);
    // A roll intercepted by a visible elemental boundary hits the Region,
    // not the creature inside. Do not apply on-hit conditions to that creature.
    // The GM can resolve special bypasses directly on the damage card.
    if(casterToken && crossingRegions(token.parent,casterToken,token).length){
      await syncActorFixed(token.actor,token.uuid,message,sourceActor,casterToken,[],item.name,concentration);
      continue;
    }
    const key=normalizeConditionDefense(defenseKey,token.actor);
    const defense=tn||Number(token.actor.system?.abilities?.[key]?.defense??0);
    if(!Number.isFinite(defense)||defense<=0)continue;
    const mixed=message.getFlag(SYSTEM,'conditionEdges')?.ambiguousTargets===true;
    const decisions=message.getFlag(SYSTEM,'multiTargetDecisionRollSignature')===rollSignature(roll)
      ?(message.getFlag(SYSTEM,MULTI_TARGET_DECISION_KEY)??{}):{};
    const outcome=adjudicateTargetOutcome(getMarvelOutcome(roll,defense),{
      requiresReview:mixed,
      decision:decisions[token.uuid],
    });
    if(outcome.pending){
      await syncActorFixed(token.actor,token.uuid,message,sourceActor,casterToken,[],item.name,concentration);
      continue;
    }
    // A damage card may contain multiple targets.  Only a target whose
    // damage was actually confirmed is eligible.  The amount can be zero:
    // on-hit effects still work unless their text requires real damage.
    if(mustConfirmPowerDamage(item.name) && !confirmedDamage.has(token.uuid) && !prisonImmediate){
      // A retroactive reroll invalidates the old damage confirmation. Remove
      // ONLY conditions from this roll (not manually applied matching ones).
      await syncActorFixed(token.actor,token.uuid,message,sourceActor,casterToken,[],item.name,concentration);
      continue;
    }
    const rawRules=conditionsForOutcome(item.name,outcome,{self:false});
    const rules=filterDamageDependentRules(rawRules,confirmedDamage.get(token.uuid));
    // Original indices must be stable across normal/fantastic reconciliation.
    const indexedRules=(POWER_CONDITIONS[item.name]??[]).flatMap((r,i)=>rules.includes(r)?[{...r,_id:i}]:[]);
    // Never apply fantastic elemental consequences before the damage card.
    if((!mustConfirmPowerDamage(item.name) || confirmedDamage.has(token.uuid)))
      indexedRules.push(...elementalSpecialForPower(item,sourceActor,outcome,indexedRules));
    await syncActorFixed(token.actor,token.uuid,message,sourceActor,casterToken,indexedRules,item.name,concentration);
    if(outcome?.success) selfRules.push(...conditionsForOutcome(item.name,outcome,{self:true}));
  }
  if((POWER_CONDITIONS[item.name]??[]).some(r=>r.self)){
    const recipientUuid=casterToken?.uuid??sourceActor.uuid;
    const indexed=(POWER_CONDITIONS[item.name]??[]).flatMap((r,i)=>selfRules.includes(r)?[{...r,_id:i}]:[])
      .filter((r,i,a)=>a.findIndex(x=>x._id===r._id)===i);
    await syncActorFixed(sourceActor,recipientUuid,message,sourceActor,casterToken,indexed,item.name,concentration);
  }
}
async function syncActorFixed(actor,recipientUuid,message,sourceActor,casterToken,rules,itemName,concentration){
  // Unique stable identity: original rule position in the power metadata table.
  const current=findConditionEffects(actor,message.id,recipientUuid);
  const requested=rules.filter(r=>!r.concentration||concentration);
  const keep=current.filter(e=>requested.some(r=>{
    const old=effectFlag(e);
    return old?.ruleIndex===r._id && old?.status===(r.status??null) &&
      (old?.element??null)===(r.element??null) &&
      (old?.custom??null)===(r.custom??null);
  }));
  const remove=current.filter(e=>!keep.includes(e));
  if(remove.length)await actor.deleteEmbeddedDocuments('ActiveEffect',remove.map(e=>e.id));
  for(const rule of requested){
    if(keep.some(e=>effectFlag(e).ruleIndex===rule._id))continue;
    await createCondition(actor,rule.status,conditionFlags(message,sourceActor,actor,recipientUuid,rule,rule._id,concentration,casterToken),itemName,rule);
  }
}
async function allStatusActors(){
  const found=new Map();
  for(const actor of values(game.actors))if(actor?.uuid)found.set(actor.uuid,actor);
  for(const scene of values(game.scenes))for(const token of values(scene.tokens)){
    if(token?.actor?.uuid)found.set(token.actor.uuid,token.actor);
  }
  return Array.from(found.values());
}
/** A GM can rewind turns in Foundry. Rewinding must never immediately
 * expire an effect that was applied later in the combat timeline. */
export function isLaterCombatPosition(current,original){
  const a=String(current??'').split(':').map(Number);
  const b=String(original??'').split(':').map(Number);
  if(!Number.isFinite(a[0])||!Number.isFinite(a[1])||
     !Number.isFinite(b[0])||!Number.isFinite(b[1]))return false;
  return a[0]>b[0] || (a[0]===b[0]&&a[1]>b[1]);
}
/** Only the condition created by this power is removed, never a manually
 * added duplicate status or a concentration effect belonging to another power.
 * Returns true on expiry; null means we must record the target's active turn. */
export function powerConditionExpiryDecision(f,combat){
  if(!f||!combat||f.combatId!==combat.id||!f.expires||!f.anchorId)return false;
  const pos=position(combat);
  const currentId=combat.combatant?.id;
  // When a combatant leaves initiative, its previous turn will never recur.
  // Avoid permanently stranded timed conditions.
  if(!combatants(combat).some(c=>c.id===f.anchorId))return true;
  if(f.expires==='round')return currentId===f.anchorId &&
    isLaterCombatPosition(pos,f.initialPosition) &&
    Number(combat.round)>Number(String(f.initialPosition).split(':')[0]);
  if(f.expires!=='turn')return false;
  // Backwards compatibility for effects from v0.2.48: a target hit DURING
  // its own turn has already witnessed that turn, even with an empty flag.
  const initialAnchor=String(f.initialPosition??'').split(':').slice(2).join(':');
  const witnessed=f.witnessedTargetTurn || (initialAnchor===f.anchorId?f.initialPosition:'');
  if(witnessed)return isLaterCombatPosition(pos,witnessed);
  if(currentId===f.anchorId&&isLaterCombatPosition(pos,f.initialPosition))return null;
  return false;
}
export async function expirePowerConditions(combat){
  if(!activeGM()||!combat)return;
  for(const actor of await allStatusActors()){
    for(const e of actorEffects(actor)){
      const f=effectFlag(e);
      const decision=powerConditionExpiryDecision(f,combat);
      if(decision===true)await actor.deleteEmbeddedDocuments('ActiveEffect',[e.id]);
      else if(decision===null)await e.update({[`flags.${SYSTEM}.${FLAG}.witnessedTargetTurn`]:position(combat)});
    }
  }
}
export async function clearDependentsOnConcentration(effect){
  if(!activeGM())return;
  const power=effect?.flags?.[SYSTEM]?.concentrationPower;
  if(!power?.itemId)return;
  const origin=effect?.parent?.uuid;
  if(!origin)return;
  for(const actor of await allStatusActors()){
    const remove=actorEffects(actor).filter(e=>{
      const f=effectFlag(e);return f?.sourceActorUuid===origin && f?.concentrationEffectId===effect.id;
    });
    if(remove.length)await actor.deleteEmbeddedDocuments('ActiveEffect',remove.map(e=>e.id));
  }
}
async function clearCombatPowerDurations(combat){
  if(!activeGM()||!combat)return;
  for(const actor of await allStatusActors()){
    const ids=actorEffects(actor).filter(e=>{
      const f=effectFlag(e);return f?.combatId===combat.id&&f?.expires;
    }).map(e=>e.id);
    if(ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
  }
}

/** Called by the GM from MMDR after damage/DR was applied, not from a roll. */
export async function confirmPowerDamageFromCard(damageMessage, action, results) {
  if(!automationEnabled('powerConditions') || !activeGM() || action==='heal' || !results?.length)return false;
  const sourceId=damageMessage?.getFlag?.(SYSTEM,'sourceMessageId') ??
    damageMessage?.getFlag?.(SYSTEM,'damageApplication')?.sourceMessageId;
  if(!sourceId)return false;
  const original=game.messages?.get?.(sourceId);
  if(!original?.rolls?.length)return false;
  const {actor}=await sourceActorFromMessage(original);
  const item=actor?.items?.get?.(original.getFlag(SYSTEM,'itemId'));
  if(!item || !mustConfirmPowerDamage(item.name))return false;
  const safeResults=results.filter(r=>!r.heal && !r.blocked && r.targetUuid).map(r=>({
    targetUuid:r.targetUuid,delta:Math.max(0,Number(r.delta)||0),
    category:String(r.category??'').trim().toLowerCase(),
  }));
  if(!safeResults.length)return false;
  // A single attack can have multiple separately-confirmed damage cards.
  // Keep previously confirmed targets and replace only their latest amounts.
  const previous=original.getFlag(SYSTEM,'powerConditionDamage');
  const currentSignature=rollSignature(original.rolls[0]);
  const cardSignature=damageMessage?.getFlag?.(SYSTEM,'damageApplication')?.rollSignature;
  if(cardSignature && cardSignature!==currentSignature)return false;
  // The v0.2.44 card has no stored signature in its confirmation; preserve
  // its same-roll results. A new v0.2.45 confirmation is never merged with
  // an older, differently rolled damage card.
  const sameRoll=!previous?.rollSignature || previous.rollSignature===currentSignature;
  const accumulated=new Map((sameRoll?previous?.results??[]:[]).map(r=>[r.targetUuid,r]));
  for(const entry of safeResults)accumulated.set(entry.targetUuid,entry);
  await original.setFlag(SYSTEM,'powerConditionDamage',{
    confirmed:true,rollSignature:currentSignature,
    damageMessageId:damageMessage.id,results:Array.from(accumulated.values()),
  });
  await enqueue(original.id,()=>syncPowerConditions(original));
  if(item.name==='Hellfire Chains' && !original.getFlag(SYSTEM,'heldFollowUp')){
    // Ordinary success (or miss) has no Fantastic hold to sustain.
    // Run AFTER syncing power conditions; a Fantastic hit keeps concentration.
    const hasFantasticHit=original.rolls?.length && safeResults.some(r=>{
      const ref=(original.getFlag(SYSTEM,'targets')??[]).find(t=>t.uuid===r.targetUuid);
      const tokenId=/^Scene\.([^.]+)\.Token\.([^.]+)/.exec(ref?.uuid??r.targetUuid);
      const targetActor=tokenId?game.scenes?.get?.(tokenId[1])?.tokens?.get?.(tokenId[2])?.actor:null;
      const defenseKey=normalizeConditionDefense(original.getFlag(SYSTEM,'attackTarget')||'ego',targetActor);
      const defense=Number(targetActor?.system?.abilities?.[defenseKey]?.defense??0);
      const outcome=defense?getMarvelOutcome(original.rolls[0],defense):null;
      return outcome?.success&&outcome?.fantastic;
    });
    if(!hasFantasticHit)await endUnneededHellfireConcentration(actor?.uuid,item.id);
  }
  return true;
}

export function registerPowerConditionHooks(){
  Hooks.on('createChatMessage',message=>{if(activeGM())void enqueue(message.id,()=>syncPowerConditions(message));});
  Hooks.on('updateChatMessage',(message,change)=>{
    const systemFlags=change.flags?.[SYSTEM];
    const changedDecisions=Boolean(systemFlags?.multiTargetDecisions) ||
      Object.keys(change??{}).some(key=>key.includes('multiTargetDecisions'));
    if(activeGM() && ('rolls' in change || systemFlags?.targets || changedDecisions))
      void enqueue(message.id,()=>syncPowerConditions(message));
  });
  Hooks.on('updateCombat',(combat,change)=>{
    if(!activeGM())return;
    if(change.started===false || change.active===false)
      void enqueue(`combat:${combat.id}`,()=>clearCombatPowerDurations(combat));
    else if('turn'in change||'round'in change||'started'in change)
      void enqueue(`combat:${combat.id}`,()=>expirePowerConditions(combat));
  });
  Hooks.on('deleteCombat',combat=>{
    if(activeGM())void enqueue(`combat:${combat.id}`,()=>clearCombatPowerDurations(combat));
  });
  Hooks.on('deleteActiveEffect',e=>{if(e?.flags?.[SYSTEM]?.concentrationPower)void clearDependentsOnConcentration(e);});
  Hooks.on('updateActiveEffect',(e,changes)=>{
    if(e?.disabled && (changes.disabled===true) && e?.flags?.[SYSTEM]?.concentrationPower)
      void clearDependentsOnConcentration(e);
  });
}
