/** v214 — Hit n Run: once-per-confirmed-hit half-Run-Speed FREE movement.
 * This credit is separate from normal Movement and may be spent across moves
 * in the current character turn. Pure calculations remain testable offline.
 */
export const HIT_N_RUN_CREDIT='nativeHitNRunFreeMovement';
export function hitNRunGrant({combat,combatant,runSpeed,sourceMessageId}={}){
 const speed=Number(runSpeed);
 if(!combat?.started||!combat?.id||combat.combatant?.id!==combatant?.id||
    !Number.isFinite(speed)||speed<=0||!sourceMessageId)return null;
 return {version:1,combatId:combat.id,combatantId:combatant.id,
   round:Number(combat.round),turn:Number(combat.turn),remaining:speed/2,
   sourceMessageId};
}
export function spendHitNRunCredit(credit,distance,combat,combatant){
 const value=Number(distance);
 if(!Number.isFinite(value)||value<=0)return {charged:0,free:0,remaining:0,valid:false};
 const valid=credit?.version===1&&credit.combatId===combat?.id&&
   credit.combatantId===combatant?.id&&combat.combatant?.id===combatant.id&&
   Number(credit.round)===Number(combat?.round)&&Number(credit.turn)===Number(combat?.turn)&&
   Number.isFinite(Number(credit.remaining))&&Number(credit.remaining)>0;
 if(!valid)return {charged:value,free:0,remaining:0,valid:false};
 const free=Math.min(value,Math.max(0,Number(credit.remaining)));
 return {charged:Math.max(0,value-free),free,remaining:Math.max(0,Number(credit.remaining)-free),valid:true};
}
