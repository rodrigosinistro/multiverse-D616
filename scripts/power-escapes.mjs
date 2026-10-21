import { resolveConditionEdges, resolveConditionReroll } from "./condition-edge.mjs";
/** Multiverse-D616 v0.2.20 — escaped restraint tests, driven by catalog text.
 * No guessed generic DCs.  The GM alone removes power-produced ActiveEffects;
 * their status provenance allows manual effects and elemental specials to survive.
 */
import { getMarvelOutcome, normalizeConditionDefense } from './power-conditions.mjs';
import { chooseD616Dialog } from './dialog-v14.mjs';
const SYSTEM='multiverse-d616';
const FLAG='powerCondition';

export const POWER_ESCAPE_RULES=Object.freeze({
  'Elemental Grab': {ability:'mle',tn:20, statuses:['grabbed','pinned']},
  'Telekinetic Grab': {ability:'mle',tn:20, statuses:['grabbed','pinned']},
  'Webgrabbing': {ability:'mle',tn:16, statuses:['grabbed','pinned']},
  'Webcasting': {ability:'mle',tn:16, statuses:['paralyzed','pinned']},
  'Crimson Bands of Cyttorak': {ability:'mle',tn:20,statuses:['paralyzed','pinned']},
  'Hellfire Chains': {ability:'mle',tn:20,statuses:['grabbed','paralyzed']},
  // The source specifies an opposed Melee test, not a fixed TN.
  'Coiling Crush': {ability:'mle',defense:'mle',statuses:['paralyzed']},
});
const escapeFlag=e=>e?.flags?.[SYSTEM]?.[FLAG];
const collectionValues=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const activeGM=()=>Boolean(game?.user?.isGM && (!game.users?.activeGM||game.users.activeGM.id===game.user.id));
const owner=(actor,user)=>Boolean(user?.isGM||actor?.testUserPermission?.(user,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));

function sourceActorFromMessage(message){
  const s=message?.speaker;
  const scene=game.scenes?.get?.(s?.scene);
  return scene?.tokens?.get?.(s?.token)?.actor ?? game.actors?.get?.(s?.actor)??null;
}
function powerFromFlag(f){
  if(f?.powerName)return f.powerName;
  const msg=game.messages?.get?.(f?.messageId);
  const source=sourceActorFromMessage(msg);
  return source?.items?.get?.(f?.sourceItemId)?.name??null;
}
export function listPowerEscapes(actor){
  const groups=new Map();
  for(const effect of collectionValues(actor?.effects)){
    if(effect?.disabled)continue;
    const f=escapeFlag(effect);
    if(!f?.messageId||!f?.recipientUuid)continue;
    // New effects carry powerName, even if the original roll is GM-only.
    if(!f.powerName&&!game.messages?.get?.(f.messageId))continue;
    const power=powerFromFlag(f);
    const rule=POWER_ESCAPE_RULES[power];
    if(!rule||!rule.statuses.includes(f.status))continue;
    const id=`${f.messageId}|${f.recipientUuid}`;
    let group=groups.get(id);
    if(!group){
      group={id,power,ability:rule.ability,tn:rule.tn??null,defense:rule.defense??null,
        sourceMessageId:f.messageId,sourceActorUuid:f.sourceActorUuid,
        recipientUuid:f.recipientUuid,sourceItemId:f.sourceItemId};
      groups.set(id,group);
    }
  }
  return [...groups.values()].sort((a,b)=>a.power.localeCompare(b.power,'pt-BR'));
}
export function effectiveEscapeTN(group,source){
  if(Number(group?.tn)>0)return Number(group.tn);
  if(!source||!group?.defense)return 0;
  const key=normalizeConditionDefense(group.defense,source);
  return Number(source.system?.abilities?.[key]?.defense)||0;
}
function combatantForActor(actor){
  if(!game.combat?.started)return null;
  const selected=canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor?.uuid);
  const entries=collectionValues(game.combat.combatants);
  return entries.find(c=>c.tokenId===selected?.document?.id&&c.sceneId===selected?.document?.parent?.id)??
    entries.find(c=>c.actor?.uuid===actor?.uuid)??null;
}

/** Offer the resources available NOW, not an unconditional Standard Action. */
export function availableEscapeModes(actor){
  if(!game.combat?.started)return ['action'];
  const combatant=combatantForActor(actor);
  const tracker=game.multiverseD616?.turnTracker;
  const state=combatant&&tracker?.getState?.(combatant);
  if(!state)return [];
  const modes=[];
  if(game.combat.combatant?.id===combatant.id &&
     Number(state.actionUsed)<Number(state.actionMax) && tracker?.consumeAction) modes.push('action');
  if(Number(state.reactionUsed)<Number(state.reactionMax) && tracker?.consumeReaction) modes.push('reaction');
  return modes;
}

/** The selected character can escape using an action OR reaction on their turn. */
export async function choosePowerEscape(actor,groupId){
  if(!owner(actor,game.user))return false;
  const group=listPowerEscapes(actor).find(x=>x.id===groupId);
  if(!group){ui.notifications?.warn?.('A condição não está mais ativa.');return false;}
  const modes=availableEscapeModes(actor);
  if(!modes.length){ui.notifications?.warn?.('Não há Ação Padrão ou Reação disponível para escapar.');return false;}
  if(modes.length===1)return attemptPowerEscape(actor,groupId,{mode:modes[0]});
  const mode=await chooseD616Dialog({title:`Escapar: ${group.power}`,
    content:`<p>Escolha qual recurso deseja gastar para tentar escapar de <b>${group.power}</b> (Melee contra ${group.tn?`TN ${group.tn}`:'defesa Melee do controlador'}).</p>`,
    buttons:[{action:'action',label:'Usar Ação Padrão',value:'action'},
      {action:'reaction',label:'Usar Reação',value:'reaction'},
      {action:'cancel',label:'Cancelar',value:null}],
    defaultAction:'action',closeValue:null,width:465,className:'m616-escape-dialog',
  });
  return mode?attemptPowerEscape(actor,groupId,{mode}):false;
}

/** Called only by a real owner/GM click in the native HUD. */
export async function attemptPowerEscape(actor,groupId,{mode="action"}={}){
  const reaction=mode==="reaction";
  if(!owner(actor,game.user)){ui.notifications?.warn?.('Você não pode rolar por esse personagem.');return false;}
  const group=listPowerEscapes(actor).find(x=>x.id===groupId);
  if(!group){ui.notifications?.warn?.('A condição não está mais ativa.');return false;}
  const source=sourceActorFromMessage(game.messages?.get?.(group.sourceMessageId));
  const target=effectiveEscapeTN(group,source);
  if(target<=0){ui.notifications?.warn?.('Não foi possível determinar o número-alvo da tentativa.');return false;}
  const combatant=combatantForActor(actor);
  if(game.combat?.started && !combatant){
    ui.notifications?.warn?.('Inclua o personagem no combate antes de tentar escapar.');return false;
  }
  if(game.combat?.started && combatant){
    if(!reaction && game.combat.combatant?.id!==combatant.id){
      ui.notifications?.warn?.('A tentativa por Ação Padrão só pode ocorrer no seu turno.');return false;
    }
    const tracker=game.multiverseD616?.turnTracker;
    const state=tracker?.getState?.(combatant);
    const resource=reaction?'reaction':'action';
    if(state && Number(state[`${resource}Used`])>=Number(state[`${resource}Max`])){
      ui.notifications?.warn?.(reaction?'Sua Reação já foi utilizada.':'Não há Ação Padrão disponível neste turno.');return false;
    }
    if(!tracker?.[reaction?'consumeReaction':'consumeAction']){
      ui.notifications?.warn?.('Controle de Turno indisponível para registrar a tentativa.');return false;
    }
  }
  const conditionEdges=resolveConditionEdges({actor,ability:group.ability,action:reaction?'reaction':'standard'});
  const RollClass=CONFIG.Dice?.MarvelMultiverseRoll??Roll;
  const roll=new RollClass(`{1d6,1dm,1d6}+@abilities.${group.ability}.value`,actor.getRollData(),
    conditionEdges.edgeMode?{edgeMode:conditionEdges.edgeMode}:{});
  // Evaluate first: failure to construct the dice roll must not spend an action.
  await roll.evaluate({});
  if(combatant){
    const method=reaction?'consumeReaction':'consumeAction';
    const used=await game.multiverseD616.turnTracker[method](combatant);
    if(!used)return false;
  }
  const escapeMessage=await roll.toMessage({
    author:game.user.id,
    speaker:ChatMessage.getSpeaker({actor}),
    flavor:`Escapar (${reaction?'Reação':'Ação Padrão'}) — ${group.power}: Melee vs. ${group.defense?'defesa Melee do controlador':`TN ${target}`}`,
    flags:{[SYSTEM]:{escapeAttempt:{version:1,...group,mode:reaction?'reaction':'action',targetNumber:target,actorUuid:actor.uuid},conditionEdges}},
  },{messageMode:game.settings?.get?.('core','messageMode')});
  if(conditionEdges.sources.length&&conditionEdges.autoCount)
    await resolveConditionReroll(escapeMessage,conditionEdges);
  return true;
}

async function actorFromEscapeData(data){
  if(!data?.actorUuid)return null;
  try{return await fromUuid(data.actorUuid)??null;}
  catch{return null;}
}
function escapeEffectMatch(effect,info,rule){
  const f=escapeFlag(effect);
  return !effect.disabled && f?.messageId===info.sourceMessageId && f?.recipientUuid===info.recipientUuid &&
    f?.sourceActorUuid===info.sourceActorUuid && rule.statuses.includes(f.status);
}
const inProgress=new Set();
export async function resolvePowerEscapeMessage(message){
  if(!activeGM()||!message?.id||!message.rolls?.length)return false;
  const attempt=message.getFlag?.(SYSTEM,'escapeAttempt');
  if(!attempt||attempt.version!==1)return false;
  if(inProgress.has(message.id))return false;
  inProgress.add(message.id);
  try{
    const actor=await actorFromEscapeData(attempt);
    const gmAuthor=game.users?.get?.(message.author?.id??message.user?.id??message.author);
    if(!actor||!gmAuthor||!owner(actor,gmAuthor))return false;
    const previous=message.getFlag(SYSTEM,'escapeResolution');
    if(previous?.success)return true;
    const originals=listPowerEscapes(actor);
    const group=originals.find(g=>g.id===attempt.id&&g.power===attempt.power);
    // A removed/expired effect cannot be resurrected by a stale chat roll.
    if(!group)return false;
    const rule=POWER_ESCAPE_RULES[group.power];
    if(!rule)return false;
    const source=sourceActorFromMessage(game.messages?.get?.(group.sourceMessageId));
    const tn=effectiveEscapeTN(group,source);
    if(!tn)return false;
    const roll=message.rolls[0];
    const outcome=getMarvelOutcome(roll,tn);
    if(!outcome)return false;
    // A successful release is final: never revive conditions on a later reroll.
    if(previous?.rollTotal===roll.total && previous?.tn===tn && previous?.fantastic===outcome.fantastic)return true;
    const ids=collectionValues(actor.effects).filter(e=>escapeEffectMatch(e,group,rule)).map(e=>e.id);
    if(outcome.success&&ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
    await message.setFlag(SYSTEM,'escapeResolution',{
      success:outcome.success,fantastic:outcome.fantastic,tn,rollTotal:roll.total,
      removed:outcome.success?ids.length:0,
      label:outcome.success?'LIBERTOU-SE':'CONTINUA PRESO',
    });
    return true;
  }finally{inProgress.delete(message.id);}
}

// Foundry propagates the newly applied condition to the owner's client.
// Offer a Reaction once per incoming power roll (never for effects loaded at login).
const offeredReactions=new Set();
const promptPending=new Set();
function reactingCombatant(actor){return combatantForActor(actor);}
export function canReactToEscape(actor,group){
  if(!group||!game.combat?.started)return false;
  const c=reactingCombatant(actor);if(!c)return false;
  const state=game.multiverseD616?.turnTracker?.getState?.(c);
  return !!state && Number(state.reactionUsed)<Number(state.reactionMax) && !!game.multiverseD616?.turnTracker?.consumeReaction;
}
function isPromptOwner(actor){
  const users=Array.from(game.users?.contents??game.users?.values?.()??[])
    .filter(user=>user.active&&!user.isGM&&owner(actor,user));
  if(users.length)return users[0].id===game.user?.id;
  // The GM can respond on behalf of non-player-owned NPCs.
  return !!game.user?.isGM && activeGM();
}
export async function offerEscapeReaction(actor,groupId){
  const group=listPowerEscapes(actor).find(g=>g.id===groupId);
  if(!group||!canReactToEscape(actor,group))return false;
  const answer=await chooseD616Dialog({title:`${group.power} — Escapar como Reação`,
    content:`<p><b>${actor.name??'Alvo'}</b> foi afetado por <b>${group.power}</b>.</p><p>Deseja gastar sua Reação para tentar escapar agora (Melee contra ${group.tn?'TN '+group.tn:'defesa Melee do controlador'})?</p><p>Se preferir, você ainda poderá tentar escapar com uma Ação Padrão no seu turno.</p>`,
    buttons:[{action:'react',label:'Escapar com Reação',value:true},{action:'later',label:'Depois',value:false}],
    defaultAction:'react',closeValue:false,width:450,className:'m616-escape-dialog',
  });
  if(!answer)return false;
  return attemptPowerEscape(actor,groupId,{mode:'reaction'});
}
function handleNewEscapeEffect(effect){
  const actor=effect?.parent;
  const flag=escapeFlag(effect);
  if(!actor||!flag?.messageId||!flag?.recipientUuid||!isPromptOwner(actor))return;
  const id=`${flag.messageId}|${flag.recipientUuid}`;
  const key=`${actor.uuid}|${id}`;
  if(offeredReactions.has(key)||promptPending.has(key))return;
  promptPending.add(key);
  // Multiple conditions from one Fantastic success arrive as separate effects.
  setTimeout(async()=>{
    promptPending.delete(key);
    if(offeredReactions.has(key))return;
    const groups=listPowerEscapes(actor);
    if(!groups.some(g=>g.id===id))return;
    offeredReactions.add(key);
    try{await offerEscapeReaction(actor,id);}catch(error){console.error('[D616] Escape Reaction',error);}
  },180);
}

export function registerPowerEscapeHooks(){
  Hooks.on('createActiveEffect',effect=>handleNewEscapeEffect(effect));
  Hooks.on('createChatMessage',m=>{if(activeGM()&&m?.getFlag?.(SYSTEM,'escapeAttempt'))void resolvePowerEscapeMessage(m).catch(e=>console.error('[D616] Escape',e));});
  Hooks.on('updateChatMessage',(m,changes)=>{
    if(activeGM()&&'rolls' in changes&&m?.getFlag?.(SYSTEM,'escapeAttempt'))
      void resolvePowerEscapeMessage(m).catch(e=>console.error('[D616] Escape',e));
  });
  Hooks.on('renderChatMessageHTML',(msg,html)=>{
    const result=msg?.getFlag?.(SYSTEM,'escapeResolution');
    if(!result||!html?.querySelector)return;
    if(html.querySelector('.d616-escape-result'))return;
    const area=html.querySelector('.message-content');if(!area)return;
    const line=document.createElement('p');line.className='d616-escape-result';
    line.style.cssText='font-weight:bold;text-align:center;border:1px solid currentColor;padding:5px;';
    line.textContent=`${result.label} — Melee vs. ${result.tn}`;
    area.appendChild(line);
  });
}
