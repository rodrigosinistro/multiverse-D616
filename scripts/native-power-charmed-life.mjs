/** Multiverse-D616 v0.2.203 — Charmed Life, one chosen action check/round.
 * Player arms this permanent power from HUD/sheet, then performs the chosen
 * action check. No automatic die rerolls and no Action/Focus charges.
 * Since a noncombat scene has no round counter, it remains Narrator-controlled.
 */
import {nativePowerResultMessage} from './native-power-chat.mjs';
const NS='multiverse-d616',FLAG='nativeCharmedLife';
const NAME='Charmed Life';
const own=actor=>Array.from(actor?.items?.contents??actor?.items?.values?.()??actor?.items??[])
  .some(p=>p.type==='power'&&p.name===NAME&&p.system?.powerSet==='Luck');
export const isCharmedLife=item=>item?.type==='power'&&item.name===NAME&&item.system?.powerSet==='Luck';
const state=actor=>actor?.flags?.[NS]?.[FLAG];
export function charmedLifeAvailable(actor,combat=globalThis.game?.combat){
  if(!own(actor)||!combat?.started||!Number.isInteger(Number(combat.round)))return false;
  const s=state(actor);return !(s?.usedCombatId===combat.id&&s?.usedRound===Number(combat.round));
}
export function charmedLifeIsArmed(actor,combat=globalThis.game?.combat){
  const s=state(actor);
  return charmedLifeAvailable(actor,combat)&&s?.combatId===combat.id&&
    s?.round===Number(combat.round)&&s?.armed===true;
}
export async function armCharmedLife(item,{combat=globalThis.game?.combat}={}){
  if(!isCharmedLife(item)||!item.actor)throw new Error('Charmed Life oficial indisponível.');
  if(!combat?.started)throw new Error('Charmed Life fora do combate: escolha o teste com o Mestre.');
  if(!charmedLifeAvailable(item.actor,combat))throw new Error('Charmed Life já utilizado nesta rodada.');
  if(charmedLifeIsArmed(item.actor,combat))throw new Error('Charmed Life já está preparado para o próximo teste elegível.');
  await item.actor.setFlag(NS,FLAG,{combatId:combat.id,round:Number(combat.round),armed:true,
    usedCombatId:state(item.actor)?.usedCombatId??null,usedRound:state(item.actor)?.usedRound??null});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
    ...nativePowerResultMessage(item,'<p><strong>Charmed Life preparado:</strong> o próximo teste de ação elegível recebe 1 Edge. Não se acumula com outro Edge. Rerolls manuais.</p>')});
  return true;
}
/** Returns a source only for the chosen check, and only if NO other Edge
 * from existing modifiers would stack with it. Trouble may be canceled.
 */
export function charmedLifeSource(actor,existingSources=[],baseMode=0,combat=globalThis.game?.combat){
  if(!charmedLifeIsArmed(actor,combat))return null;
  if(Number(baseMode)>0||existingSources.some(s=>Number(s.sign)>0))return null;
  return {source:'Luck: Charmed Life',reason:'1 Edge no teste de ação escolhido nesta rodada; não acumula, reroll manual',sign:1};
}
export async function consumeCharmedLifeRoll(actor,context,{combat=globalThis.game?.combat}={}){
  if(!context?.sources?.some(s=>s.source==='Luck: Charmed Life')||!charmedLifeIsArmed(actor,combat))return false;
  await actor.setFlag(NS,FLAG,{combatId:combat.id,round:Number(combat.round),armed:false,
    usedCombatId:combat.id,usedRound:Number(combat.round)});
  return true;
}
