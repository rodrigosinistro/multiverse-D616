/** Combat Chat 2.0 (v0.2.164). Presentation/permission helpers only.
 * Mechanics and damage are always delegated to the existing D616 engines.
 */
export const COMBAT_CHAT_VERSION = 2;
const SYSTEM='multiverse-d616';
const kept = die => (die?.results??[]).find(r=>r.active&&!r.discarded)??(die?.results??[])[0]??null;
const face = term => {
  const die=term?.dice?.[0]??term?.terms?.find?.(t=>Array.isArray(t?.results))??term?.terms?.[0];
  return Number(kept(die)?.result??NaN);
};
export function combatChatPool(roll){
  const first=roll?.terms?.[0];
  return first?.roll?.terms?.[0]?.rolls?first.roll.terms[0]
    :first?.rolls?first:null;
}
/** A NATURAL 6 / Marvel M (native face 1) / 6 is an automatic success.
 * Forced M from Combat Trickery/Offensive 3 never impersonates a natural 6-M-6.
 */
export function naturalSixM6(roll){
  if(!roll || roll.options?.nativeDampenedPower || roll.options?.forceMarvelM || roll.options?.ultimateFantasticApplied ||
      roll.options?.combatTrickery)return false;
  const pool=combatChatPool(roll);
  if(!pool || pool.rolls?.length!==3)return false;
  return face(pool.rolls[0])===6 && face(pool.rolls[1])===1 && face(pool.rolls[2])===6;
}
export function combatAttackLabel(outcome,{ultimate=false}={}){
  if(!outcome || outcome.pending)return 'REVISAR EDGE/TROUBLE';
  if(ultimate && outcome.success)return 'SUCESSO FANTÁSTICO';
  if(outcome.success)return outcome.fantastic?'ACERTO FANTÁSTICO':'ACERTOU';
  return outcome.fantastic?'FALHA FANTÁSTICA':'ERROU';
}
export function combatChatVisibleOutcome({isGM=false,resolved=null,targetUuid='',liveOutcome=null,ultimate=false}={}){
  if(isGM)return combatAttackLabel(liveOutcome,{ultimate});
  const released=resolved?.targets?.find?.(t=>t.targetUuid===targetUuid);
  return released?.label??'ATAQUE REALIZADO';
}
/** Minimal data the GM releases to players only AFTER confirming damage.
 * No target defenses, ability scores or damage calculation fields.
 */
export function combatChatPublicResolution(targetOutcomes,results,{action='full',signature='',specials=[]}={}){
  const deltas=new Map((results??[]).map(r=>[String(r.targetUuid??''),Math.max(0,Number(r.delta)||0)]));
  return {
    version:COMBAT_CHAT_VERSION,action,signature,
    specials:(Array.isArray(specials)?specials:[]).filter(s=>s?.text).map(s=>({
      label:String(s.label??''),text:String(s.text),name:String(s.name??'')})),
    targets:(targetOutcomes??[]).filter(t=>t?.targetUuid).map(t=>({
      targetUuid:String(t.targetUuid),
      label:String(t.label||'ATAQUE REALIZADO'),
      damage:deltas.get(String(t.targetUuid))??0,
      category:t.category==='focus'?'focus':'health',
    })),
  };
}
export function combatChatDamageBreakdown(entry,action='full'){
  const multiplier=Number(entry?.damageMultiplier??0)||0;
  const reduction=Math.max(0,Number(entry?.damageReduction??0)||0);
  const effective=Math.max(0,Number(entry?.effectiveDamageMultiplier??multiplier-reduction)||0);
  const marvelDie=Number(entry?.marvelDie??0)||0;
  const ability=Number(entry?.abilityDamage??0)||0;
  const bonus=Number(entry?.flatBonus??0)||0;
  // O bônus salvo no dano inclui Focus + automações; separar no resumo
  // permite conferir exatamente um ataque como Elemental Blast (15 Focus +7).
  const customBonus=Number(entry?.customDamageBonus??0)||0;
  const focusBonus=Number(entry?.focusDamageBonus??(bonus-customBonus))||0;
  const otherBonus=bonus-focusBonus-customBonus;
  const normal=Math.max(0,Number(entry?.normalDamage??0)||0);
  const final=Math.max(0,Number(entry?.damage??0)||0);
  const expectedNormal=effective>0?Math.max(0,marvelDie*effective+ability+bonus):0;
  return {multiplier,reduction,effective,marvelDie,ability,bonus,focusBonus,customBonus,otherBonus,
    normalFormulaValid:Math.abs(expectedNormal-normal)<0.000001,
    fantastic:!!entry?.fantastic,normal,final,action};
}
export function hasResolvedAttack(message){
  return !!(message?.getFlag?.(SYSTEM,'combatChatResolution')?.targets?.length);
}
