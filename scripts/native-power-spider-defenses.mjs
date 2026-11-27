/**
 * Multiverse-D616 v0.2.205 — reactive defensive declarations, without
 * pre-arming, attack interception or automatic Trouble.
 *
 * Slow-Motion Dodge and Spider-Dodge are instant Reactions with an attack
 * trigger. The defender clicks their power AFTER the incoming attack is
 * announced/rolled (and before its final resolution). The attacking user or
 * Narrator chooses which die to reroll with TROUBLE on the ORIGINAL attack
 * card. No new attack roll or temporary protective ActiveEffect is created.
 *
 * Keep these two scoped powers separate from Blur, which lasts 1 round, and
 * from other official reaction powers with different effects.
 */
import {nativePowerResultMessage} from './native-power-chat.mjs';

const NS='multiverse-d616';
const LEGACY_FIELD='nativePreparedDodge';
const all=value=>Array.from(value?.contents??value?.values?.()??value??[]);

export const isNativeReactiveDodge=item=>item?.type==='power'&&(
  (item.name==='Slow-Motion Dodge'&&item.system?.powerSet==='Basic')||
  (item.name==='Spider-Dodge'&&item.system?.powerSet==='Spider-Powers')
);

export function reactionCombatant(actor,combat){
  const candidates=all(combat?.combatants??combat?.turns);
  const matching=candidates.filter(c=>
    c.actor?.uuid===actor?.uuid || c.actor?.id===actor?.id || c.actorId===actor?.id
  );
  if(matching.length===1)return matching[0];
  // An unlinked token has its own actor; match the currently controlled token
  // to the combatant instead of choosing an arbitrary same-base NPC.
  const token=all(globalThis.canvas?.tokens?.controlled).find(t=>
    t.actor?.uuid===actor?.uuid || t.actor===actor
  )?.document;
  return token?matching.find(c=>c.tokenId===token.id)??null:null;
}

export function checkNativeReactiveDodgeUse(actor,item,combat=globalThis.game?.combat){
  if(!isNativeReactiveDodge(item))return {ok:true};
  if(!combat?.started)return {ok:false,reason:`${item.name} exige um ataque durante combate ativo.`};
  if(!actor)return {ok:false,reason:'Personagem não identificado para esta Reação.'};
  const combatant=reactionCombatant(actor,combat);
  if(!combatant)return {ok:false,reason:`${item.name} exige personagem participante do combate.`};
  const tracker=globalThis.game?.multiverseD616?.turnTracker;
  if(!tracker?.trackItemUse)return {ok:false,reason:'Controle de Reações indisponível. Não foi possível anunciar o poder.'};
  const state=tracker.getState?.(combatant);
  if(state&&Number(state.reactionUsed)>=Number(state.reactionMax))
    return {ok:false,reason:`${item.name} requer uma Reação disponível.`};
  return {ok:true,combatant};
}

/** Text only: the official trigger/effect and cost come from the actual Item. */
export function reactiveDodgeChatData(item){
  if(!isNativeReactiveDodge(item))return null;
  const detail=item.name==='Slow-Motion Dodge'
    ? 'Aplique 1 TROUBLE manualmente ao ataque que está sendo resolvido, se ele atingir a Defesa de Agility.'
    : 'Aplique 1 TROUBLE manualmente se o ataque foi feito com Agility. Se o ataque errar após o reroll, o salto opcional é decidido pelo jogador e Mestre.';
  return nativePowerResultMessage(item,
    `<p><strong>Reação declarada:</strong> ${detail}</p>`+
    '<p><strong>Atacante ou Mestre:</strong> use o botão TROUBLE no dado do <em>card original</em> do ataque; '+
    'não faça uma nova rolagem. O sistema não modifica o resultado automaticamente.</p>');
}

/**
 * Consume exactly one Reaction through the existing GM-authoritative turn
 * tracker, THEN publish the descriptive card. No target mutations or flags.
 * A failure before posting is reported; a failure to publish refunds the use.
 */
export async function declareNativeReactiveDodge(item,{
  combat=globalThis.game?.combat,
  tracker=globalThis.game?.multiverseD616?.turnTracker,
  createMessage=data=>globalThis.ChatMessage?.create?.(data),
  speaker=options=>globalThis.ChatMessage?.getSpeaker?.(options),
  applyMode=data=>data,
}={}){
  const check=checkNativeReactiveDodgeUse(item?.actor,item,combat);
  if(!check.ok)throw new Error(check.reason);
  const data=reactiveDodgeChatData(item);
  if(!data||typeof createMessage!=='function')throw new Error('Chat não disponível para esta Reação.');
  const consumed=await tracker.trackItemUse(item);
  if(!consumed)throw new Error('Não foi possível consumir a Reação. Nenhum efeito foi aplicado.');
  try{
    const message=await createMessage(applyMode({
      speaker:typeof speaker==='function'?speaker({actor:item.actor}):{},
      ...data,
    }));
    return message;
  }catch(error){
    if(tracker.refundReaction){
      try{await tracker.refundReaction(check.combatant);}catch(refundError){
        console.warn('[D616] Reação defensiva: falha ao estornar Reação após erro do chat.',refundError);
      }
    }
    throw error;
  }
}

/** One-time migration: v204's obsolete protective markers do not linger. */
export function legacyPreparedDodgeIds(actor){
  return all(actor?.effects).filter(effect=>effect.flags?.[NS]?.[LEGACY_FIELD]?.version===1)
    .map(effect=>effect.id).filter(Boolean);
}
export function registerReactiveDodgeCleanup(){
  if(!globalThis.game?.user?.isGM||
    (game.users?.activeGM?.id&&game.users.activeGM.id!==game.user.id))return;
  const actors=new Set([
    ...all(game.actors),
    ...all(game.scenes).flatMap(scene=>all(scene.tokens).map(token=>token.actor)),
    ...all(game.combat?.combatants).map(c=>c.actor),
  ].filter(Boolean));
  for(const actor of actors){
    const ids=legacyPreparedDodgeIds(actor);
    if(ids.length&&actor.deleteEmbeddedDocuments)
      void actor.deleteEmbeddedDocuments('ActiveEffect',ids)
        .catch(error=>console.warn('[D616] Remoção de Esquiva preparada antiga:',error));
  }
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerReactiveDodgeCleanup);
