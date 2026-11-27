/** Multiverse-D616 v0.2.200 — each PLAYER scrolls their own ChatLog when
 * the GM publishes the final combat damage resolution on the attack message.
 * No global roll/message auto-scroll; the GM keeps the existing button path.
 */
import {scrollCombatChatToResult} from './combat-chat-scroll.mjs';
const SYSTEM='multiverse-d616';

/** Foundry updateChatMessage may deliver nested or flattened flag changes. */
export function combatResolutionWasPublished(changed){
  if(!changed || typeof changed!=='object')return false;
  const flags=changed.flags;
  const value=flags?.[SYSTEM]?.combatChatResolution??
    flags?.[`${SYSTEM}.combatChatResolution`]??
    changed[`flags.${SYSTEM}.combatChatResolution`];
  return !!value && typeof value==='object' && Array.isArray(value.targets) && value.targets.length>0;
}

/** Install on every client, but only a non-GM client takes this path. */
export function installPlayerCombatChatAutoScroll({hooks=globalThis.Hooks,
  isGM=()=>!!globalThis.game?.user?.isGM,
  scroll=scrollCombatChatToResult}={}){
  if(typeof hooks?.on!=='function')return false;
  hooks.on('updateChatMessage',(message,changed)=>{
    if(isGM()||!combatResolutionWasPublished(changed))return;
    const result=message?.getFlag?.(SYSTEM,'combatChatResolution');
    // Only the attack whose receipt was actually confirmed by the GM.
    if(!result?.targets?.length || !result.signature)return;
    void scroll();
  });
  return true;
}
