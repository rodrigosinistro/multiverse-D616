/** Multiverse-D616 v0.2.223 — Lot 5. No independent damage or condition engine.
 * Elemental Infusion references ONE equipped weapon and the source power's
 * concentration. Reinforcements are GM-only options in the existing barrier
 * damage confirmation; no power/item click can spend costs a second time.
 */
import {getElementalFantasticMetadata} from './elemental-fantastic.mjs';
import {reactionCombatant} from './native-power-spider-defenses.mjs';
const S='multiverse-d616';
const list=xs=>Array.from(xs?.contents??xs?.values?.()??xs??[]);
const official=(i,name,set)=>i?.type==='power' && i?.name===name && i?.system?.powerSet===set;
export const isElementalInfusion=i=>official(i,'Elemental Infusion','Elemental Control');
export const isElementalReinforcement=i=>official(i,'Elemental Reinforcement','Elemental Control');
export const isTelekineticReinforcement=i=>official(i,'Telekinetic Reinforcement','Telekinesis');
export const isReinforcementPower=i=>isElementalReinforcement(i)||isTelekineticReinforcement(i);
function liveEffect(actor,itemId){
 return list(actor?.effects).find(e=>!e.disabled && e.duration?.expired!==true &&
  e.flags?.[S]?.concentrationPower?.transient===true &&
  String(e.flags[S].concentrationPower.itemId)===String(itemId));
}
export function infusionWeapons(actor){
 return list(actor?.items).filter(i=>i?.type==='weapon'&&i?.system?.equipped===true);
}
export function infusionEligibility(power){
 if(!isElementalInfusion(power)||!power.actor)return {ok:false,reason:'Elemental Infusion: poder inválido.'};
 const meta=getElementalFantasticMetadata(power,power.actor);
 if(!meta?.key)return {ok:false,reason:'Elemental Infusion exige um elemento padrão reconhecido no personagem.'};
 const weapons=infusionWeapons(power.actor);
 if(!weapons.length)return {ok:false,reason:'Elemental Infusion exige uma arma de mão equipada.'};
 return {ok:true,weapons,element:meta};
}
/** Store on the existing concentration, not on a persistent weapon: ending the
 * concentration automatically ends infusion. Item identity prevents spillover
 * to another equipped weapon or a second weapon with an identical name.
 */
export async function bindElementalInfusion(power,weaponId){
 const eligibility=infusionEligibility(power);
 if(!eligibility.ok)throw Error(eligibility.reason);
 if(!eligibility.weapons.some(w=>w.id===weaponId))throw Error('Arma não está equipada.');
 const effect=liveEffect(power.actor,power.id);
 if(!effect)throw Error('Elemental Infusion exige Concentração ativa.');
 const mark={version:1,powerId:power.id,weaponId,element:eligibility.element.key};
 if(typeof effect.setFlag==='function')await effect.setFlag(S,'nativeElementalInfusion',mark);
 else await effect.update({[`flags.${S}.nativeElementalInfusion`]:mark});
 return {...mark,effectId:effect.id};
}
export function infusedWeaponAttack(weapon){
 if(weapon?.type!=='weapon'||weapon?.system?.equipped!==true)return null;
 const actor=weapon.actor;
 if(!actor)return null;
 for(const eff of list(actor.effects)){
  const cp=eff?.flags?.[S]?.concentrationPower;
  const mark=eff?.flags?.[S]?.nativeElementalInfusion;
  if(eff.disabled||eff.duration?.expired===true||!cp?.transient||mark?.version!==1||
    String(mark.powerId)!==String(cp.itemId)||String(mark.weaponId)!==String(weapon.id))continue;
  const power=actor.items?.get?.(mark.powerId);
  if(!isElementalInfusion(power))continue;
  const element=getElementalFantasticMetadata(power,actor);
  if(element?.key!==mark.element)continue;
  return {version:1,powerId:power.id,weaponId:weapon.id,effectId:eff.id,
    key:element.key,elementalFantastic:element};
 }
 return null;
}
/** The weapon's attack must have Fantastic success against this particular
 * target. Unlike damaging elemental blasts, the power text does not require
 * positive Health damage for the special effect, but a barrier intercept does
 * prevent contact with its protected victim.
 */
export function infusionEligibleTargets(source,entries,receipts,action='full'){
 if(!source?.getFlag?.(S,'nativeElementalInfusion')||action==='heal')return null;
 const allowed=new Map((receipts??[]).filter(r=>r?.targetUuid&&!r.blocked&&!r.heal)
  .map(r=>[String(r.targetUuid),r]));
 return new Set((entries??[]).filter(e=>e?.hit!==false&&e?.fantastic===true&&
  allowed.has(String(e.targetUuid))).map(e=>String(e.targetUuid)));
}
export function reinforcementForGuard(actor,guard){
 if(!['protection','structure'].includes(guard?.kind))return null;
 const name=String(guard?.name??'');
 const kind=/^Elemental (?:Protection [1-4]|Barrier|Sphere|Prison)$/.test(name)?'elemental'
  :/^Telekinetic (?:Protection [1-4]|Barrier|Sphere)$/.test(name)?'telekinetic':null;
 if(!kind)return null;
 const power=list(actor?.items).find(i=>kind==='elemental'?isElementalReinforcement(i):isTelekineticReinforcement(i));
 return power?{powerId:power.id,name:power.name,kind,threshold:Number(guard.threshold)}:null;
}
/** The protection absorbs its normal threshold. Any damage OVER that threshold
 * would break it. A Reinforcement Reaction redirects just this excess to Focus,
 * leaves Health unchanged and sustains the same concentration. For drawn
 * boundaries, the caster pays (not the unrelated target behind the wall).
 * It never applies to Focus damage or a direct bypass.
 */
export function reinforcementOption({actor,guard,rawDamage,category,mode='auto'}={}){
 if(category!=='health'||mode==='bypass'||!['protection','structure'].includes(guard?.kind))return null;
 const details=reinforcementForGuard(actor,guard);
 const threshold=Number(guard?.threshold),raw=Number(rawDamage);
 if(!details||!Number.isFinite(threshold)||!Number.isFinite(raw)||raw<=threshold)return null;
 return {...details,raw,overflow:Math.max(0,Math.ceil(raw-threshold))};
}
/** Runs ONLY on active GM during confirmation. If a cost is unavailable we
 * throw before consuming guard/damage so the existing card remains unresolved.
 * Reactions are reserved by the existing GM-authoritative turn tracker.
 */
export async function commitReinforcement(actor,option,{combat=globalThis.game?.combat,
 tracker=globalThis.game?.multiverseD616?.turnTracker,user=globalThis.game?.user,
 tokenDoc=null}={}){
 if(!user?.isGM||globalThis.game?.users?.activeGM?.id && globalThis.game.users.activeGM.id!==user.id)
  throw Error('Somente o Mestre ativo pode autorizar Reinforcement.');
 if(!option?.overflow||option.overflow<=0)throw Error('Não há dano excedente a redirecionar.');
 const power=actor?.items?.get?.(option.powerId);
 if(!(isElementalReinforcement(power)||isTelekineticReinforcement(power)))
  throw Error('Reinforcement: poder não pertence mais ao defensor.');
 const focus=Number(actor?.system?.focus?.value);
 if(!Number.isFinite(focus)||focus<option.overflow)
  throw Error(`Reinforcement: Focus insuficiente (${option.overflow} necessário, ${focus||0} disponível).`);
 const possible=list(combat?.combatants).filter(c=>c?.actor?.uuid===actor?.uuid||c?.actorId===actor?.id);
 const exact=tokenDoc?.id?possible.find(c=>c.tokenId===tokenDoc.id):null;
 const combatant=exact??(possible.length===1?possible[0]:null);
 const state=combatant&&tracker?.getState?.(combatant);
 if(!combat?.started||!combatant||!state||!tracker?.consumeReaction||
   !(Number(state.reactionUsed)<Number(state.reactionMax)))
  throw Error('Reinforcement exige uma Reação disponível no turno do defensor.');
 let spent=false;
 try{
  spent=!!(await tracker.consumeReaction(combatant));
  if(!spent)throw Error('O Mestre não conseguiu reservar a Reação de Reinforcement.');
  await actor.update({'system.focus.value':focus-option.overflow});
 }catch(error){
  if(spent)try{await tracker.refundReaction?.(combatant);}catch(e){console.error('[D616] Reinforcement: estorno da Reação falhou',e);}
  throw error;
 }
 return {redirected:option.overflow,powerName:power.name,threshold:option.threshold,raw:option.raw};
}
