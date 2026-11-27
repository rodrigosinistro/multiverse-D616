/**
 * Macros_D616 v0.2.189 — bounded, pure Focus-based Melee attack scaling.
 *
 * Focused Strike (Martial Arts) and Focused Fury (Melee Weapons) each grant
 * +1 fixed Melee damage bonus for every 2 Focus invested in THAT activation.
 * This function never spends Focus, updates Actors, rerolls dice, or applies
 * damage: Item.roll() and the existing chat damage controller own those steps.
 * Using a typed official rule avoids unreliable free-text parsing and ensures
 * the Focus bonus is stored exactly once in the attack card's existing flag.
 */
const RULES=Object.freeze({
  'Martial Arts::Focused Strike':Object.freeze({id:'aUO9Rmlx2HWYGUJM',min:10}),
  'Melee Weapons::Focused Fury':Object.freeze({id:'8DvKqA6FlcJxPMl3',min:5}),
  'Melee Weapons::Furious Attacks':Object.freeze({id:'Tk0OXCyok6Xa7eaG',min:10}),
});
const key=item=>`${String(item?.system?.powerSet??'')}::${String(item?.name??'')}`;

/** The caller MUST first confirm the official registry identity. */
export function focusedMeleeFocusDamage(item,spent) {
  const rule=RULES[key(item)];
  if(!rule||item?.type!=='power')return null;
  const amount=Number(spent);
  if(!Number.isSafeInteger(amount)||amount<rule.min)throw new Error(`${item.name}: gasto de Focus inválido (mínimo ${rule.min}).`);
  const bonus=Math.floor(amount/2);
  return Object.freeze({bonus,summary:`+1 bônus fixo de dano Melee a cada 2 Focus (gasto ${amount} → +${bonus})`,
    spent:amount,powerName:item.name,powerSet:item.system.powerSet,powerId:rule.id});
}

export function focusedMeleeFocusHint(item){
  const rule=RULES[key(item)];
  if(!rule||item?.type!=='power')return null;
  return `A cada 2 Focus gastos: +1 bônus fixo de dano Melee neste ataque (mínimo ${rule.min} Focus).`;
}
