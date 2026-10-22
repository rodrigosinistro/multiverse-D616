/** Multiverse D616 v0.2.62 — recurring Power effects with explicit timing.
 * Do not conflate Flames of the Faltine (END OF ROUND) with Ablaze
 * (END OF VICTIM TURN). Healing Factor is a passive END OF OWNER TURN rule.
 * Only the primary GM writes world state. Manual removal is always available.
 */
import { automationEnabled } from './automation-settings.mjs';
import { getMarvelOutcome, normalizeConditionDefense } from './power-conditions.mjs';
import { resolvePowerRoll } from './power-rolls.mjs';
import {hasEquipmentPermanentPower} from './equipment-permanent-effects.mjs';
import { adjudicateTargetOutcome, rollSignature, MULTI_TARGET_DECISION_KEY } from './multi-target-combat.mjs';
const SYSTEM='multiverse-d616';
export const FLAME_KIND='faltineFlames';
export const FLAME_DAMAGE=5;
export const FLAME_TRAY_PREFIX='d616.ongoing-power.';
const processing=new Set();
const primaryGM=()=>!!game.user?.isGM && (!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const list=coll=>Array.from(coll?.contents??coll?.values?.()??coll??[]);
export const flameFlag=effect=>effect?.flags?.[SYSTEM]?.ongoingPower?.kind===FLAME_KIND
  ?effect.flags[SYSTEM].ongoingPower:null;
const effects=actor=>list(actor?.effects).filter(e=>flameFlag(e)&&!e.disabled);
export const hasFaltineFlames=actor=>effects(actor).length>0;
const isPower=(item,name)=>item?.type==='power'&&String(item.name).trim()===name;
export function hasHealingFactor(actor){return list(actor?.items).some(i=>isPower(i,'Healing Factor')) || hasEquipmentPermanentPower(actor,'Healing Factor');}
export function healingAmount(actor){return Math.max(0,Number(actor?.system?.abilities?.res?.value)||0);}
export function nextHealingHealth(actor){
  const now=Number(actor?.system?.health?.value)||0;
  const max=Number(actor?.system?.health?.max);
  if(!Number.isFinite(max)||max<=0)return now; // Never create excess Health from an incomplete sheet.
  return Math.min(max,Math.max(0,now+healingAmount(actor)));
}
/** Without combat turns there is no time clock; the player/GM explicitly
 * advances one turn-equivalent of natural healing. Never run a real-time timer.
 */
export async function healOutsideCombat(actor){
  if(!actor||!hasHealingFactor(actor)||game.combat?.started)return false;
  if(!game.user?.isGM&&!actor.testUserPermission?.(game.user,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3))return false;
  const before=Number(actor.system?.health?.value??0),next=nextHealingHealth(actor);
  if(next<=before)return false;
  await actor.update({'system.health.value':next});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),
    content:`<p><b>${foundry.utils.escapeHTML?.(actor.name)??actor.name}</b>: Healing Factor recuperou <b>${next-before} Health</b> (turno narrativo fora de combate).</p>`});
  return true;
}
export function damageFromFaltine(actor){
  // Match the existing end-turn conditions engine: each DR point prevents 5 Health.
  const dr=Math.max(0,Number(actor?.system?.healthDamageReduction)||0);
  return Math.max(0,FLAME_DAMAGE-dr*5);
}
async function actorFromUuid(uuid){
  if(!uuid)return null;
  try{const doc=await fromUuid(uuid);return doc?.actor??(doc?.documentName==='Actor'?doc:null);}catch{return null;}
}
function speakerActor(message){
  const scene=game.scenes?.get?.(message?.speaker?.scene);
  return scene?.tokens?.get?.(message?.speaker?.token)?.actor??game.actors?.get?.(message?.speaker?.actor)??null;
}
/** Only a freshly confirmed, genuine Fantastic HIT is allowed to ignite.
 * A damage card blocked by a Shield/Barrier does not ignite the creature.
 */
export async function confirmFaltineDamage(damageMessage,action,results){
  if(!primaryGM()||!automationEnabled('ongoingConditions')||action==='heal'||!results?.length)return false;
  const sourceId=damageMessage?.getFlag?.(SYSTEM,'sourceMessageId')??
    damageMessage?.getFlag?.(SYSTEM,'damageApplication')?.sourceMessageId;
  const source=sourceId?game.messages?.get?.(sourceId):null;
  if(!source?.rolls?.[0])return false;
  const caster=speakerActor(source);
  const item=caster?.items?.get?.(source.getFlag?.(SYSTEM,'itemId'));
  if(!isPower(item,'Flames of the Faltine'))return false;
  const sig=rollSignature(source.rolls[0]);
  const cardSig=damageMessage?.getFlag?.(SYSTEM,'damageApplication')?.rollSignature;
  if(cardSig&&cardSig!==sig)return false;
  const requests=new Set(list(source.getFlag?.(SYSTEM,'targets')).map(r=>r?.uuid??r));
  const defenseKey=source.getFlag?.(SYSTEM,'attackTarget')??resolvePowerRoll(item).attackTarget??'agl';
  let added=false;
  for(const r of results){
    if(r.heal||r.blocked||r.category!=='health'||!r.targetUuid||!requests.has(r.targetUuid))continue;
    const target=await actorFromUuid(r.targetUuid);
    if(!target)continue;
    const key=normalizeConditionDefense(defenseKey,target);
    const defense=Number(target.system?.abilities?.[key]?.defense??0);
    if(!defense||!Number.isFinite(defense))continue;
    const mixed=source.getFlag?.(SYSTEM,'conditionEdges')?.ambiguousTargets===true;
    const decisions=source.getFlag?.(SYSTEM,'multiTargetDecisionRollSignature')===sig
      ?(source.getFlag?.(SYSTEM,MULTI_TARGET_DECISION_KEY)??{}):{};
    const outcome=adjudicateTargetOutcome(getMarvelOutcome(source.rolls[0],defense),{
      requiresReview:mixed,decision:decisions[r.targetUuid],
    });
    if(outcome?.pending||!outcome?.success||!outcome?.fantastic)continue;
    const active=list(target.effects).find(e=>flameFlag(e));
    if(active&&!active.disabled&&flameFlag(active)?.sourceMessageId===source.id &&
      flameFlag(active)?.sourceRollSignature===sig)continue; // duplicate confirmation, no refresh
    const flag={kind:FLAME_KIND,sourceMessageId:source.id,sourceRollSignature:sig,
      targetUuid:r.targetUuid,sourceActorUuid:caster.uuid,combatId:game.combat?.started?game.combat.id:null,
      appliedRound:game.combat?.started?Number(game.combat.round):null,lastProcessedRound:null};
    if(active){
      await active.update({disabled:false,showIcon:2,[`flags.${SYSTEM}.ongoingPower`]:flag});
    }else{
      await target.createEmbeddedDocuments('ActiveEffect',[{
        name:'Chamas de Faltine — dano ao fim da rodada',
        img:'systems/multiverse-d616/icons/four-elements.svg',showIcon:2,
        disabled:false,transfer:false,changes:[],duration:{},statuses:[],
        flags:{[SYSTEM]:{ongoingPower:flag}},
      }]);
    }
    added=true;
  }
  return added;
}

/** Extinguishing is a Standard Action, not an automatic saving throw.
 * Outside combat a GM may adjudicate how much time is passing.
 * A player may extinguish their OWN condition from the POWERS shortcut.
 */
export async function extinguishFaltine(actor,{useAction=true}={}){
  if(!actor||!effects(actor).length)return false;
  if(!game.user?.isGM&&!actor.testUserPermission?.(game.user,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3))return false;
  const combat=game.combat;
  if(useAction&&combat?.started){
    const selected=canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor.uuid);
    const combatant=list(combat.combatants).find(c=>c.tokenId===selected?.document?.id)
      ??list(combat.combatants).find(c=>c.actor?.uuid===actor.uuid);
    if(!combatant||combatant.id!==combat.combatant?.id){
      ui.notifications?.warn?.('Apagar as chamas exige uma Ação Padrão no próprio turno.');return false;
    }
    const tracker=game.multiverseD616?.turnTracker;
    const state=tracker?.getState?.(combatant);
    if(!state||Number(state.actionUsed)>=Number(state.actionMax)||!tracker?.consumeAction){
      ui.notifications?.warn?.('Não há Ação Padrão disponível.');return false;
    }
    if(!await tracker.consumeAction(combatant))return false;
  }
  // Disabling rather than deleting prevents racing against Foundry's native effect hooks.
  for(const fx of effects(actor))await fx.update({disabled:true});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),
    content:`<p><b>${foundry.utils.escapeHTML?.(actor.name)??actor.name}</b> apagou as Chamas de Faltine.</p>`});
  return true;
}
export async function gmRemoveFlames(actor,effect){
  if(!primaryGM()||!effect||!flameFlag(effect)||effect.disabled||!list(actor?.effects).some(e=>e.id===effect.id))return false;
  await effect.update({disabled:true});return true;
}
export function getOngoingPowerTrayEntries(actor){
  return effects(actor).map(effect=>({id:`${FLAME_TRAY_PREFIX}${effect.id}`,name:'Chamas de Faltine',
    icon:effect.img||'systems/multiverse-d616/icons/four-elements.svg',
    description:'Sofre 5 pontos de dano em Health no fim de cada rodada enquanto as chamas permanecerem ativas (Redução de Dano aplicável).',
    remove:'Uma Ação Padrão para apagar as chamas. O Mestre também pode removê-las manualmente.',effectId:effect.id}));
}
export function findOngoingPowerTrayEffect(actor,id){
  if(!String(id).startsWith(FLAME_TRAY_PREFIX))return null;
  return effects(actor).find(e=>`${FLAME_TRAY_PREFIX}${e.id}`===id)??null;
}
export function combatAdvanceInfo(combat,change){
  if(!combat?.started||!('turn'in(change??{})||'round'in(change??{})))return null;
  const prev=combat.previous??{};
  const previousRound=Number(prev.round),previousTurn=Number(prev.turn);
  const currentRound=Number(combat.round),currentTurn=Number(combat.turn);
  if(!Number.isInteger(previousRound)||!Number.isInteger(previousTurn)||
     !Number.isInteger(currentRound)||!Number.isInteger(currentTurn)||previousRound<1)return null;
  const forward=currentRound>previousRound||(currentRound===previousRound&&currentTurn>previousTurn);
  if(!forward)return null; // Never heal or damage again when the Narrator rewinds.
  const ended=list(combat.turns)[previousTurn]??list(combat.combatants).find(c=>c.id===prev.combatantId)??null;
  return {previousRound,previousTurn,currentRound,currentTurn,ended,
    completedRound:currentRound>previousRound?previousRound:null};
}
const combatQueues=new Map();
export async function processRecurringPowerTurn(combat,change){
  if(!primaryGM()||!automationEnabled('ongoingConditions'))return false;
  const advance=combatAdvanceInfo(combat,change);
  if(!advance)return false;
  // Capture the turn NOW; queued work may execute after the tracker advances.
  const key=combat.id;
  const previous=combatQueues.get(key)??Promise.resolve();
  const task=previous.catch(()=>{}).then(()=>processCapturedAdvance(combat,advance));
  combatQueues.set(key,task);
  void task.finally(()=>{if(combatQueues.get(key)===task)combatQueues.delete(key);}).catch(()=>{});
  return task;
}
async function processCapturedAdvance(combat,advance){
    const {previousRound,previousTurn,ended,completedRound}=advance;
    const actor=ended?.token?.actor??ended?.actor;
    if(actor&&hasHealingFactor(actor)){
      const stamp=`${combat.id}|${previousRound}|${previousTurn}|${ended.id}`;
      const seen=actor.getFlag?.(SYSTEM,'healingFactorTurns')??[];
      const next=nextHealingHealth(actor);
      if(!seen.includes(stamp)&&next>Number(actor.system?.health?.value??0)){
        // Persist recent resolved turns, not only the last turn. Rewind/replay
        // must never turn the same old turn into another healing event.
        await actor.setFlag(SYSTEM,'healingFactorTurns',[...seen,stamp].slice(-500));
        const delta=next-Number(actor.system?.health?.value??0);
        await actor.update({'system.health.value':next});
        await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),
          content:`<p><b>${foundry.utils.escapeHTML?.(actor.name)??actor.name}</b>: Healing Factor recuperou <b>${delta} Health</b> no fim do turno.</p>`});
      }
    }
    if(completedRound!==null){
      const visited=new Set();
      const actors=[...list(game.actors)];
      for(const scene of list(game.scenes))for(const token of list(scene.tokens))if(token.actor)actors.push(token.actor);
      for(const target of actors){
        if(!target?.uuid||visited.has(target.uuid))continue;
        visited.add(target.uuid);
        for(const fx of effects(target)){
          const f=flameFlag(fx);
          if(f.combatId!==combat.id||!Number.isInteger(f.appliedRound)||f.appliedRound>completedRound||
             Number(f.lastProcessedRound)>=completedRound)continue;
          // Persist before applying to guard against duplicate updateCombat events.
          await fx.update({[`flags.${SYSTEM}.ongoingPower.lastProcessedRound`]:completedRound});
          const before=Number(target.system?.health?.value??0),damage=damageFromFaltine(target);
          const lost=Math.min(Math.max(0,before),damage);
          if(lost>0)await target.update({'system.health.value':before-lost});
          await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:target}),
            content:`<p><b>${foundry.utils.escapeHTML?.(target.name)??target.name}</b>: Chamas de Faltine causaram <b>${lost} Health</b> no fim da rodada ${completedRound}${lost===0?' (bloqueado por proteção ou sem Health)':''}.</p>`});
        }
      }
    }
    return true;
}
export function registerOngoingPowerHooks(){
  Hooks.on('updateCombat',(combat,change)=>{
    if(!('turn'in(change??{})||'round'in(change??{})))return;
    void processRecurringPowerTurn(combat,change).catch(e=>console.error('[D616] Recurring Powers',e));
  });
}
