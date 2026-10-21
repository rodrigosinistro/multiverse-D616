import { automationEnabled } from './automation-settings.mjs';
/** D616 v0.2.48 — explicit condition-removal checks; only a primary GM removes effects.
 * The source condition catalog defines each action and TN. Never guess DCs.
 */
import { getMarvelOutcome } from './power-conditions.mjs';
import { resolveConditionEdges, resolveConditionReroll } from './condition-edge.mjs';

const SYSTEM='multiverse-d616';
export const CONDITION_RECOVERY_RULES=Object.freeze({
  'mmrpg.bleeding':Object.freeze({label:'Sangrando',ability:'log',abilityLabel:'Logic',tn:10}),
  'mmrpg.ablaze':Object.freeze({label:'Em Chamas',ability:'agl',abilityLabel:'Agility',tn:10}),
});
const values=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const primaryGM=()=>!!game.user?.isGM && (!game.users?.activeGM || game.users.activeGM.id===game.user.id);
const canUse=(a,u)=>!!u?.isGM||!!a?.testUserPermission?.(u,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3);
const activeIds=(actor)=>{
  const ids=new Set(actor?.statuses??[]);
  for(const fx of values(actor?.effects)){
    if(fx?.disabled)continue;
    for(const sid of (fx.statuses??[]))ids.add(sid);
    if(fx.flags?.core?.statusId)ids.add(fx.flags.core.statusId);
  }
  return ids;
};
export function hasCondition(actor,id){return activeIds(actor).has(id);}
export function listConditionRecoveryActions(actor){
  const statuses=activeIds(actor);
  return Object.entries(CONDITION_RECOVERY_RULES).filter(([id])=>statuses.has(id))
    .map(([id,rule])=>({id,...rule}));
}
function combatantForActor(actor){
  const combat=game.combat;
  if(!combat?.started)return null;
  const selected=canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor.uuid);
  return values(combat.combatants).find(c=>c.tokenId===selected?.document?.id&&c.sceneId===selected?.document?.parent?.id)
    ??values(combat.combatants).find(c=>c.actor?.uuid===actor.uuid)??null;
}
/** Consume one Standard Action; a reaction is NOT a permitted cure for Bleeding/Ablaze. */
export async function attemptConditionRecovery(actor,id){
  const rule=CONDITION_RECOVERY_RULES[id];
  if(!rule||!hasCondition(actor,id)){ui.notifications?.warn?.('A condição não está mais ativa.');return false;}
  if(!canUse(actor,game.user)){ui.notifications?.warn?.('Você não controla esse personagem.');return false;}
  const combatant=combatantForActor(actor);
  if(game.combat?.started){
    if(!combatant||game.combat.combatant?.id!==combatant.id){
      ui.notifications?.warn?.('O teste para remover esta condição exige uma Ação Padrão no próprio turno.');return false;
    }
    const tracker=game.multiverseD616?.turnTracker;
    const state=tracker?.getState?.(combatant);
    if(!state||Number(state.actionUsed)>=Number(state.actionMax)||!tracker?.consumeAction){
      ui.notifications?.warn?.('Não há Ação Padrão disponível.');return false;
    }
  }
  const edges=resolveConditionEdges({actor,ability:rule.ability,action:'standard'});
  const RollClass=CONFIG.Dice?.MarvelMultiverseRoll??Roll;
  const roll=new RollClass(`{1d6,1dm,1d6}+@abilities.${rule.ability}.value`,actor.getRollData(),
    edges.edgeMode?{edgeMode:edges.edgeMode}:{});
  await roll.evaluate({});
  if(combatant){
    const spent=await game.multiverseD616.turnTracker.consumeAction(combatant);
    if(!spent)return false;
  }
  const msg=await roll.toMessage({author:game.user.id,speaker:ChatMessage.getSpeaker({actor}),
    flavor:`Remover ${rule.label} — ${rule.abilityLabel} TN ${rule.tn} (Ação Padrão)`,
    flags:{[SYSTEM]:{conditionRecoveryAttempt:{version:1,actorUuid:actor.uuid,conditionId:id,tn:rule.tn},conditionEdges:edges}}},
    {messageMode:game.settings?.get?.('core','messageMode')});
  if(edges.sources.length&&edges.autoCount)await resolveConditionReroll(msg,edges);
  return true;
}
/** Remove only this status; do not remove unrelated effects that share a document. */
export async function removeSpecificCondition(actor,id){
  if(!hasCondition(actor,id))return false;
  const matches=values(actor?.effects).filter(e=>!e?.disabled&&
    ((e.statuses?.has?.(id)??Array.from(e.statuses??[]).includes(id))||e.flags?.core?.statusId===id));
  for(const effect of matches){
    const statuses=Array.from(effect.statuses??[]);
    if(statuses.length>1&&statuses.includes(id)){
      await effect.update({statuses:statuses.filter(x=>x!==id)});
    }else await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);
  }
  if(hasCondition(actor,id)&&typeof actor.toggleStatusEffect==='function')
    await actor.toggleStatusEffect(id,{active:false});
  return true;
}
const processing=new Set();
export async function resolveConditionRecoveryMessage(message){
  if(!primaryGM()||!message?.id||!message.rolls?.length)return false;
  const flag=message.getFlag?.(SYSTEM,'conditionRecoveryAttempt');
  if(!flag||flag.version!==1||processing.has(message.id))return false;
  const rule=CONDITION_RECOVERY_RULES[flag.conditionId];
  if(!rule||rule.tn!==flag.tn)return false;
  processing.add(message.id);
  try{
    if(message.getFlag?.(SYSTEM,'conditionRecoveryResult')?.resolved)return true;
    const actor=await fromUuid(flag.actorUuid).catch(()=>null);
    const sender=game.users?.get?.(message.author?.id??message.user?.id??message.author);
    if(!actor||!sender||!canUse(actor,sender)||!hasCondition(actor,flag.conditionId))return false;
    const outcome=getMarvelOutcome(message.rolls[0],rule.tn);
    if(!outcome)return false;
    if(outcome.success)await removeSpecificCondition(actor,flag.conditionId);
    await message.setFlag(SYSTEM,'conditionRecoveryResult',{
      resolved:true,success:outcome.success,fantastic:outcome.fantastic,tn:rule.tn,
      label:outcome.success?'CONDIÇÃO REMOVIDA':'CONDIÇÃO MANTIDA',
    });
    return true;
  }finally{processing.delete(message.id);}
}

/** Healing >= 1 Health ends Bleeding automatically. preUpdate stores the original value. */
const beforeHealing=new Map();
const observedHealth=new Map();
export function observeHealth(actor){
  if(!actor?.uuid)return;
  const value=Number(actor.system?.health?.value);
  if(Number.isFinite(value))observedHealth.set(actor.uuid,value);
}
export function captureHealthBeforeUpdate(actor,changes){
  if (!automationEnabled('conditionRecovery')) return;
  if(!primaryGM()||!actor?.uuid)return;
  const next=changes?.['system.health.value']??changes?.system?.health?.value;
  if(next===undefined)return;
  beforeHealing.set(actor.uuid,{old:Number(actor.system?.health?.value),next:Number(next)});
}
export async function removeBleedingOnHeal(actor,changes){
  if (!automationEnabled('conditionRecovery')) return false;
  if(!primaryGM()||!actor?.uuid)return false;
  const next=changes?.['system.health.value']??changes?.system?.health?.value;
  if(next===undefined)return false;
  const entry=beforeHealing.get(actor.uuid);
  beforeHealing.delete(actor.uuid);
  const old=entry?.old??observedHealth.get(actor.uuid);
  observedHealth.set(actor.uuid,Number(next));
  if(!Number.isFinite(old)||!Number.isFinite(Number(next))||Number(next)<=old)return false;
  if(!hasCondition(actor,'mmrpg.bleeding'))return false;
  await removeSpecificCondition(actor,'mmrpg.bleeding');
  return true;
}
export function registerConditionRecoveryHooks(){
  Hooks.on('ready',()=>{
    for(const a of (game.actors?.contents??game.actors??[]))observeHealth(a);
    for(const t of (canvas?.tokens?.placeables??[]))observeHealth(t.actor);
  });
  Hooks.on('canvasReady',()=>{
    for(const t of (canvas?.tokens?.placeables??[]))observeHealth(t.actor);
  });
  Hooks.on('createActor',actor=>observeHealth(actor));
  Hooks.on('createChatMessage',m=>{
    if(primaryGM()&&m?.getFlag?.(SYSTEM,'conditionRecoveryAttempt'))
      void resolveConditionRecoveryMessage(m).catch(e=>console.error('[D616] Condition Recovery',e));
  });
  Hooks.on('updateChatMessage',(m,change)=>{
    if(primaryGM()&&'rolls' in change&&m?.getFlag?.(SYSTEM,'conditionRecoveryAttempt'))
      void resolveConditionRecoveryMessage(m).catch(e=>console.error('[D616] Condition Recovery',e));
  });
  Hooks.on('preUpdateActor',(actor,change)=>captureHealthBeforeUpdate(actor,change));
  Hooks.on('updateActor',(actor,change)=>{
    void removeBleedingOnHeal(actor,change).catch(e=>console.error('[D616] Bleeding cure',e));
  });
  Hooks.on('renderChatMessageHTML',(msg,html)=>{
    const resolution=msg.getFlag?.(SYSTEM,'conditionRecoveryResult');
    if(!resolution||!html?.querySelector||html.querySelector('.d616-condition-result'))return;
    const area=html.querySelector('.message-content');if(!area)return;
    const p=document.createElement('p');p.className='d616-condition-result';
    p.style.cssText='font-weight:bold;text-align:center;border:1px solid currentColor;padding:5px;';
    p.textContent=resolution.label;area.appendChild(p);
  });
}
