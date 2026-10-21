import { automationEnabled } from './automation-settings.mjs';
/** D616 v0.2.48 — Poisoned checks once at the start of each combatant's turn.
 * GM creates an owner-accessible chat prompt and exclusively settles the roll.
 * Poisoned: Resilience TN 18; failure loses 1 Health; Fantastic Success cures.
 */
import { getMarvelOutcome } from './power-conditions.mjs';
import { hasCondition, removeSpecificCondition } from './condition-actions.mjs';
import { resolveConditionEdges, resolveConditionReroll } from './condition-edge.mjs';
const SYSTEM='multiverse-d616';
export const POISON_TN=18;
const pending=new Set();
const processing=new Set();
const attempted=new Set();
const primaryGM=()=>!!game.user?.isGM && (!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const owner=(actor,user)=>!!user?.isGM||!!actor?.testUserPermission?.(user,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3);
export function poisonTurnKey(combat){
  const c=combat?.combatant;
  if(!combat?.id||!c?.id||!combat?.started)return null;
  return `${combat.id}|${combat.round}|${combat.turn}|${c.id}`;
}
function getActor(combatant){return combatant?.token?.actor??combatant?.actor??null;}
function whispers(actor){
  const recipients=new Set();
  for(const user of (game.users?.contents??game.users??[])){
    if(user?.active&&(user.isGM||owner(actor,user)))recipients.add(user.id);
  }
  return [...recipients];
}
export async function offerPoisonCheck(combat){
  if(!automationEnabled('ongoingConditions') || !primaryGM())return false;
  const key=poisonTurnKey(combat);
  if(!key||pending.has(key))return false;
  const actor=getActor(combat.combatant);
  if(!actor||!hasCondition(actor,'mmrpg.poisoned'))return false;
  pending.add(key);
  try{
    // Survives GM refresh: do not create another prompt in the same turn.
    const messages=game.messages?.contents??[];
    if(messages.some(m=>m.getFlag?.(SYSTEM,'poisonTurnPrompt')?.turnKey===key))return false;
    await ChatMessage.create({
      author:game.user.id,whisper:whispers(actor),
      speaker:ChatMessage.getSpeaker({actor}),
      content:`<p><b>${foundry.utils.escapeHTML?.(actor.name)??actor.name}</b> está <b>Envenenado</b>.</p>
        <p>No início do turno: faça um teste de <b>Resilience TN 18</b>. Falha: perde 1 Health. Sucesso Fantástico: remove Envenenado.</p>
        <button type="button" class="d616-poison-check">Rolar Resilience TN 18</button>`,
      flags:{[SYSTEM]:{poisonTurnPrompt:{version:1,turnKey:key,actorUuid:actor.uuid,
        combatId:combat.id,combatantId:combat.combatant.id,tn:POISON_TN}}},
    });
    return true;
  }finally{pending.delete(key);}
}
export async function attemptPoisonCheck(promptMessage){
  if (!automationEnabled('ongoingConditions')) {ui.notifications?.warn?.('A automação de Envenenado está desativada pelo Mestre.');return false;}
  const prompt=promptMessage?.getFlag?.(SYSTEM,'poisonTurnPrompt');
  if(!prompt||prompt.version!==1||prompt.tn!==POISON_TN)return false;
  if(attempted.has(promptMessage.id))return false;
  const combat=game.combat;
  if(!combat||poisonTurnKey(combat)!==prompt.turnKey){
    ui.notifications?.warn?.('Esse pedido pertence a outro turno.');return false;
  }
  if(promptMessage.getFlag?.(SYSTEM,'poisonTurnResult')?.resolved){
    ui.notifications?.warn?.('O teste de Envenenado já foi resolvido.');return false;
  }
  const actor=await fromUuid(prompt.actorUuid).catch(()=>null);
  if(!actor||!owner(actor,game.user)||!hasCondition(actor,'mmrpg.poisoned'))return false;
  attempted.add(promptMessage.id);
  try{
    const edges=resolveConditionEdges({actor,ability:'res',action:'standard'});
    const RollClass=CONFIG.Dice?.MarvelMultiverseRoll??Roll;
    const roll=new RollClass('{1d6,1dm,1d6}+@abilities.res.value',actor.getRollData(),
      edges.edgeMode?{edgeMode:edges.edgeMode}:{});
    await roll.evaluate({});
    const message=await roll.toMessage({author:game.user.id,speaker:ChatMessage.getSpeaker({actor}),
      flavor:'Envenenado — Resilience TN 18 (início do turno; sem custo de Ação)',
      flags:{[SYSTEM]:{poisonTurnCheck:{version:1,promptId:promptMessage.id,actorUuid:actor.uuid,
        turnKey:prompt.turnKey,tn:POISON_TN},conditionEdges:edges}}},
      {messageMode:game.settings?.get?.('core','messageMode')});
    if(edges.sources.length&&edges.autoCount)await resolveConditionReroll(message,edges);
    return true;
  }catch(error){attempted.delete(promptMessage.id);throw error;}
}
/** If multiple players submit the same prompt, the first valid result wins. */
export async function resolvePoisonCheck(message){
  if(!automationEnabled('ongoingConditions') || !primaryGM()||!message?.id||!message.rolls?.length)return false;
  const request=message.getFlag?.(SYSTEM,'poisonTurnCheck');
  if(!request||request.version!==1||request.tn!==POISON_TN||processing.has(request.promptId))return false;
  processing.add(request.promptId);
  try{
    const prompt=game.messages?.get?.(request.promptId);
    const flag=prompt?.getFlag?.(SYSTEM,'poisonTurnPrompt');
    if(!flag||flag.tn!==POISON_TN||flag.turnKey!==request.turnKey||
      flag.actorUuid!==request.actorUuid||flag.combatantId!==game.combat?.combatant?.id||
      poisonTurnKey(game.combat)!==request.turnKey)return false;
    if(prompt.getFlag?.(SYSTEM,'poisonTurnResult')?.resolved)return false;
    const actor=await fromUuid(flag.actorUuid).catch(()=>null);
    const submitter=game.users?.get?.(message.author?.id??message.user?.id??message.author);
    if(!actor||!submitter||!owner(actor,submitter)||!hasCondition(actor,'mmrpg.poisoned'))return false;
    const outcome=getMarvelOutcome(message.rolls[0],POISON_TN);
    if(!outcome)return false;
    // Set the resolution marker before mutating the actor, preventing double processing.
    const result={resolved:true,success:outcome.success,fantastic:outcome.fantastic,
      healthLost:outcome.success?0:1,cured:!!(outcome.success&&outcome.fantastic),
      requestId:message.id};
    await prompt.setFlag(SYSTEM,'poisonTurnResult',result);
    if(result.cured)await removeSpecificCondition(actor,'mmrpg.poisoned');
    if(result.healthLost){
      const before=Number(actor.system?.health?.value??0);
      await actor.update({'system.health.value':Math.max(0,before-1)});
    }
    await ChatMessage.create({author:game.user.id,speaker:ChatMessage.getSpeaker({actor}),
      content:result.cured?`<p><b>${actor.name}</b>: Sucesso Fantástico! Envenenado foi removido.</p>`:
        result.healthLost?`<p><b>${actor.name}</b>: falhou contra Envenenado e perde <b>1 Health</b>.</p>`:
          `<p><b>${actor.name}</b>: resistiu ao Envenenado. Nenhum dano neste turno.</p>`});
    return true;
  }finally{processing.delete(request.promptId);}
}
export function registerPoisonTurnHooks(){
  Hooks.on('updateCombat',(combat,changes)=>{
    if('turn' in (changes??{})||'round' in (changes??{})||'started' in (changes??{}))
      void offerPoisonCheck(combat).catch(e=>console.error('[D616] Poison turn',e));
  });
  Hooks.on('createChatMessage',msg=>{
    if(primaryGM()&&msg?.getFlag?.(SYSTEM,'poisonTurnCheck'))
      void resolvePoisonCheck(msg).catch(e=>console.error('[D616] Poison check',e));
  });
  Hooks.on('updateChatMessage',(msg,changes)=>{
    if(primaryGM()&&'rolls' in changes&&msg?.getFlag?.(SYSTEM,'poisonTurnCheck'))
      void resolvePoisonCheck(msg).catch(e=>console.error('[D616] Poison check',e));
  });
  Hooks.on('renderChatMessageHTML',(msg,html)=>{
    const btn=html?.querySelector?.('.d616-poison-check');
    if(!btn||!msg?.getFlag?.(SYSTEM,'poisonTurnPrompt'))return;
    const resolved=!!msg.getFlag(SYSTEM,'poisonTurnResult')?.resolved;
    if(resolved){btn.disabled=true;btn.textContent='Teste resolvido';return;}
    btn.addEventListener('click',async()=>{
      btn.disabled=true;
      try{await attemptPoisonCheck(msg);}
      catch(e){console.error('[D616] Poison click',e);ui.notifications?.error?.(e?.message??'Falha no teste de Envenenado.');}
      finally{if(!msg.getFlag(SYSTEM,'poisonTurnResult')?.resolved)btn.disabled=false;}
    });
  });
}
