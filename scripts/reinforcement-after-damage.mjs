/** v0.2.225 — Reinforcement is an explicit Reaction AFTER the Narrator resolves
 * the original attack. The immutable damage card is its only source of truth.
 * The protection is dormant while the decision is pending, never re-created.
 */
import {reinforcementOption,reinforcementForGuard} from './native-priority-lot5.mjs';
const S='multiverse-d616',SOCKET=`system.${S}`,KEY='pendingReinforcement';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const isGM=()=>!!game.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const maybeActor=async uuid=>{
 if(!uuid)return null;
 try{const doc=await fromUuid(uuid);return doc?.actor??(doc?.documentName==='Actor'?doc:null);}catch(_e){return null;}
};
const finiteNumber=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const combatStamp=()=>({combatId:globalThis.game?.combat?.id??null,round:globalThis.game?.combat?.round??null,turn:globalThis.game?.combat?.turn??null});
export const reinforcementPendingFlag=KEY;
export function eligibleRetroactiveReinforcement({owner,guard,entry,delta,heal=false,absorption=false,mode='auto',damageMessageId=null,healthBefore=null,healthAfter=null}={}){
 if(!damageMessageId||!guard?.effect?.id||heal||absorption||mode==='bypass'||mode==='reinforce'||
    entry?.category!=='health'||!(Number(delta)>0))return null;
 const option=reinforcementOption({actor:owner,guard,rawDamage:entry.rawDamage,category:'health'});
 if(!option)return null;
 const received=Math.min(Math.max(0,finiteNumber(delta)),Math.max(0,finiteNumber(healthBefore)-finiteNumber(healthAfter)));
 if(received<=0)return null;
 return {version:1,damageMessageId,guardEffectId:guard.effect.id,guardName:guard.name,
  ownerActorUuid:owner.uuid,sourcePowerId:option.powerId,powerName:option.name,
  targetUuid:entry.targetUuid,targetActorUuid:entry.actorUuid,
  overflowDamage:Math.max(0,finiteNumber(delta)),healthRefund:received,
  healthAfter:finiteNumber(healthAfter),...combatStamp()};
}
/** On an attack that broke a shield, leaving it physically present but dormant
 * avoids destroying its concentration and mapped Region/Wall prematurely.
 * activeElementalGuards ignores this flag until the Reaction is paid.
 */
export async function holdReinforcementGuard(guard,candidate){
 if(!candidate||!guard?.effect)return false;
 const effect=guard.effect;
 if(effect.getFlag?.(S,KEY))return false;
 if(typeof effect.setFlag==='function')await effect.setFlag(S,KEY,{...candidate});
 else await effect.update({[`flags.${S}.${KEY}`]:{...candidate}});
 return true;
}
export function candidatesForPower(power,{messages=game.messages?.contents??[]}={}){
 if(!power?.actor)return [];
 const entries=[];
 for(const message of list(messages)){
  const applied=message.getFlag?.(S,'mmdrReinforcementApplied')??[];
  const resolved=message.getFlag?.(S,'mmdrResolved');
  if(!resolved||!Array.isArray(resolved.reinforcementCandidates))continue;
  for(const c of resolved.reinforcementCandidates){
   if(applied.some?.(a=>a.targetUuid===c.targetUuid))continue;
   if(c.ownerActorUuid!==power.actor.uuid||String(c.sourcePowerId)!==String(power.id))continue;
   if(c.combatId!==game.combat?.id||c.round!==game.combat?.round||c.turn!==game.combat?.turn)continue;
   const eff=power.actor.effects?.get?.(c.guardEffectId)??list(power.actor.effects).find(e=>e.id===c.guardEffectId);
   if(eff?.getFlag?.(S,KEY)?.damageMessageId!==message.id&&
      eff?.flags?.[S]?.[KEY]?.damageMessageId!==message.id)continue;
   entries.push({...c,messageId:message.id,at:resolved.at??0});
  }
 }
 return entries.sort((a,b)=>b.at-a.at);
}
const pendingRequests=new Map(),processing=new Set();
async function selectCandidate(power){
 const candidates=candidatesForPower(power);
 if(!candidates.length)throw Error(`${power.name}: nenhum dano excedente recente aguardando conversão neste turno. Confirme o dano no card do Mestre e mantenha uma Reação disponível.`);
 if(candidates.length===1)return candidates[0];
 const Dialog=globalThis.foundry?.applications?.api?.DialogV2;
 if(!Dialog?.wait)throw Error('Múltiplos danos elegíveis: Foundry v14 é necessário para escolher o card.');
 const chosen=await Dialog.wait({window:{title:`${power.name} — Converter dano anterior`},
  content:`<form><p>Escolha qual dano confirmado deseja converter em Focus.</p><select name="card">${candidates.map((c,i)=>`<option value="${i}">${String(c.guardName).replace(/[&<>"']/g,'')} — ${c.overflowDamage} Health excedente</option>`).join('')}</select></form>`,
  rejectClose:false,buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},{action:'apply',label:'Usar Reação',default:true,callback:(_e,b)=>Number(b.form.elements.card.value)}]});
 return chosen===null?null:candidates[chosen]??null;
}
export async function useRetroactiveReinforcement(power){
 const candidate=await selectCandidate(power);
 if(!candidate)return false;
 if(isGM())return await applyRetroactiveReinforcement({messageId:candidate.messageId,sourcePowerId:power.id,targetUuid:candidate.targetUuid,requestUserId:game.user?.id});
 if(!game.users?.activeGM)throw Error('Mestre desconectado: não foi possível autorizar Reinforcement.');
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pendingRequests.delete(requestId);reject(Error('O Mestre não respondeu ao Reinforcement.'));},45000);
  pendingRequests.set(requestId,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
  game.socket.emit(SOCKET,{type:'reinforcement-225-request',requestId,messageId:candidate.messageId,
    sourcePowerId:power.id,targetUuid:candidate.targetUuid});
 });
}
function findCombatant(actor,token){
 const cs=list(game.combat?.combatants).filter(c=>c.actor?.uuid===actor.uuid||c.actorId===actor.id);
 return (token?.id?cs.find(c=>c.tokenId===token.id):null)??(cs.length===1?cs[0]:null);
}
/** The server derives EVERYTHING from the already resolved damage card. The
 * player only submits its id, owned power id and target id, never damage/cost.
 * On failure both Focus and Health are returned to their previous values and
 * the reserved Reaction is refunded. The guard stays dormant for a retry.
 */
export async function applyRetroactiveReinforcement({messageId,sourcePowerId,targetUuid,requestUserId}={}){
 if(!isGM())throw Error('Somente o Mestre ativo pode aplicar Reinforcement.');
 const key=`${messageId}:${targetUuid}`;
 if(processing.has(key))throw Error('Este Reinforcement já está sendo processado.');
 processing.add(key);
 try{
  const message=game.messages?.get?.(messageId);
  if(!message)throw Error('Card de dano não encontrado.');
  if(message.getFlag(S,'mmdrReinforcementApplied')?.some?.(c=>c.targetUuid===targetUuid))throw Error('Este dano já foi convertido em Focus.');
  const receipt=message.getFlag(S,'mmdrResolved');
  const candidate=receipt?.reinforcementCandidates?.find?.(c=>c.targetUuid===targetUuid&&String(c.sourcePowerId)===String(sourcePowerId));
  if(!candidate||candidate.version!==1)throw Error('Este card não possui dano excedente elegível para Reinforcement.');
  const stamp=combatStamp();
  if(candidate.combatId!==stamp.combatId||candidate.round!==stamp.round||candidate.turn!==stamp.turn)
   throw Error('Reinforcement só pode corrigir o dano no mesmo turno em que foi confirmado.');
  const owner=await maybeActor(candidate.ownerActorUuid),target=await maybeActor(candidate.targetUuid)||await maybeActor(candidate.targetActorUuid);
  if(!owner||!target)throw Error('Personagem ou defensor não encontrado.');
  const power=owner.items?.get?.(sourcePowerId);
  if(!power||!['Elemental Reinforcement','Telekinetic Reinforcement'].includes(power.name))throw Error('Reinforcement não pertence ao defensor.');
  if(power.name!==candidate.powerName)throw Error('O poder não corresponde à proteção original.');
  const requester=game.users?.get?.(requestUserId??game.user.id);
  if(!requester||(!requester.isGM&&!owner.testUserPermission?.(requester,'OWNER')))
   throw Error('O jogador não tem permissão para usar este poder.');
  const guardEffect=owner.effects?.get?.(candidate.guardEffectId)??list(owner.effects).find(e=>e.id===candidate.guardEffectId);
  const mark=guardEffect?.getFlag?.(S,KEY)??guardEffect?.flags?.[S]?.[KEY];
  if(!mark||mark.damageMessageId!==messageId||mark.targetUuid!==targetUuid)throw Error('A proteção não está mais aguardando este Reinforcement.');
  const currentHealth=finiteNumber(target.system?.health?.value,NaN);
  if(!Number.isFinite(currentHealth)||currentHealth!==candidate.healthAfter)
   throw Error('Health do alvo mudou após o ataque. O Mestre deve conferir o estorno manualmente para evitar duplicidade.');
  const focus=finiteNumber(owner.system?.focus?.value,NaN),cost=candidate.overflowDamage;
  if(!(cost>0)||!Number.isFinite(focus)||focus<cost)
   throw Error(`Focus insuficiente para converter ${cost} de dano excedente.`);
  const tracker=game.multiverseD616?.turnTracker,token=targetUuid?await fromUuid(targetUuid).catch(()=>null):null;
  const combatant=findCombatant(owner,owner.uuid===target.uuid?token:null);
  const state=combatant&&tracker?.getState?.(combatant);
  if(!game.combat?.started||!combatant||!tracker?.consumeReaction||!state||
    !(Number(state.reactionUsed)<Number(state.reactionMax)))
   throw Error('Reinforcement exige outra Reação disponível. Se a proteção já consumiu sua única Reação, não é possível usar os dois poderes no mesmo turno.');
  let spent=false,focusUpdated=false,healthUpdated=false,marked=false,flagSet=false;
  const priorFlag=message.getFlag(S,'mmdrReinforcementApplied')??[];
  try{
   spent=!!(await tracker.consumeReaction(combatant));
   if(!spent)throw Error('Não foi possível consumir a Reação.');
   await owner.update({'system.focus.value':focus-cost});focusUpdated=true;
   const refund=Math.min(candidate.healthRefund,Math.max(0,finiteNumber(target.system?.health?.max,Infinity)-currentHealth));
   await target.update({'system.health.value':currentHealth+refund});healthUpdated=true;
   const applied={targetUuid,sourcePowerId,healthRefund:refund,focusSpent:cost,
     guardEffectId:candidate.guardEffectId,at:Date.now(),powerName:power.name};
   await message.setFlag(S,'mmdrReinforcementApplied',[...priorFlag,applied]);flagSet=true;
   await guardEffect.unsetFlag(S,KEY);marked=true;
  }catch(error){
   if(flagSet)try{await message.setFlag(S,'mmdrReinforcementApplied',priorFlag);}catch(e){console.error('[D616] Reforço: falha ao reverter recibo',e);}
   if(healthUpdated)try{await target.update({'system.health.value':currentHealth});}catch(e){console.error('[D616] Reforço: falha ao estornar Health',e);}
   if(focusUpdated)try{await owner.update({'system.focus.value':focus});}catch(e){console.error('[D616] Reforço: falha ao estornar Focus',e);}
   if(spent)try{await tracker.refundReaction?.(combatant);}catch(e){console.error('[D616] Reforço: falha ao estornar Reação',e);}
   throw error;
  }
  try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:owner}),
   content:`<p><b>${power.name} — Reação:</b> ${candidate.overflowDamage} dano excedente transferido para Focus; <b>+${candidate.healthRefund} Health</b> restaurados ao alvo, <b>−${cost} Focus</b> ao defensor. Proteção ${candidate.guardName} preservada. Card de dano original: ${message.id}.</p>`});}
  catch(e){console.warn('[D616] Reforço aplicado, mas chat não foi publicado:',e);}
  return {applied:true,healthRefund:candidate.healthRefund,focusSpent:cost,targetUuid,guardEffectId:candidate.guardEffectId};
 }finally{processing.delete(key);}
}
export async function expirePendingReinforcements({combat=game.combat}={}){
 if(!isGM())return;
 const stamp=combatStamp();
 const actors=new Map();
 for(const actor of list(game.actors))if(actor?.uuid)actors.set(actor.uuid,actor);
 for(const scene of list(game.scenes))for(const token of list(scene.tokens))if(token?.actor?.uuid)actors.set(token.actor.uuid,token.actor);
 for(const actor of actors.values())for(const eff of list(actor.effects)){
  const pending=eff.flags?.[S]?.[KEY];if(!pending)continue;
  if(pending.combatId===stamp.combatId&&pending.round===stamp.round&&pending.turn===stamp.turn)continue;
  try{await actor.deleteEmbeddedDocuments('ActiveEffect',[eff.id]);}
  catch(e){console.warn('[D616] Reinforcement: falha ao limpar proteção destruída',e);}
 }
}
export function registerRetroactiveReinforcementHooks(){
 Hooks.on('updateCombat',()=>void expirePendingReinforcements());
 Hooks.on('deleteCombat',()=>void expirePendingReinforcements());
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!html?.querySelector)return;
  const applied=message.getFlag?.(S,'mmdrReinforcementApplied');
  if(!Array.isArray(applied)||!applied.length||html.querySelector('[data-d616-retroactive-reinforcement]'))return;
  const note=document.createElement('div');note.dataset.d616RetroactiveReinforcement='1';
  note.style.cssText='padding:6px;margin-top:6px;border-left:3px solid #2f9757;background:rgba(47,151,87,.12)';
  note.textContent=applied.map(a=>`${a.powerName}: excedente convertido — ${a.healthRefund} Health restaurados, ${a.focusSpent} Focus descontados e 1 Reação gasta; proteção preservada.`).join(' | ');
  (html.querySelector('.message-content')??html).appendChild(note);
 });
 game.socket.on(SOCKET,async(data,userId)=>{
  if(data?.type==='reinforcement-225-reply'&&data.toUserId===game.user?.id){
   const waiter=pendingRequests.get(data.requestId);if(!waiter)return;
   pendingRequests.delete(data.requestId);
   if(data.ok)waiter.resolve(data.result);else waiter.reject(Error(data.error??'Reinforcement não autorizado.'));
   return;
  }
  if(data?.type!=='reinforcement-225-request'||!isGM())return;
  let ok=false,result=null,error='Reinforcement não autorizado.';
  try{result=await applyRetroactiveReinforcement({...data,requestUserId:userId});ok=true;}
  catch(e){error=String(e?.message??e);console.warn('[D616] Reinforcement:',e);}
  game.socket.emit(SOCKET,{type:'reinforcement-225-reply',requestId:data.requestId,toUserId:userId,ok,result,error});
 });
 void expirePendingReinforcements();
}
