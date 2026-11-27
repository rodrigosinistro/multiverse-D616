/** v0.2.198 — strictly scoped automatic passive Edge/Trouble sources.
 * No resources or ActiveEffects are created here; the passive is live only
 * while its ORIGINAL official power is possessed. All rerolls remain manual.
 * Situational perception, escape and narration checks are never assumed.
 */
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const owns=(actor,powerSet,name)=>list(actor?.items).some(i=>i?.type==='power'&&
  i?.name===name&&i?.system?.powerSet===powerSet);
const descriptor=(name,reason,sign)=>({source:`Poder: ${name}`,reason,sign});
const abCode=v=>({melee:'mle',agility:'agl',vigilance:'vig'})[String(v??'').toLowerCase()]??String(v??'').toLowerCase();
export function physicalPassiveRollSources({actor,ability,attack=false,kind='',existingSources=[]}={}){
  const ab=abCode(ability),k=String(kind??'').toLowerCase();
  const close=k==='close'||k==='melee'||(!k&&ab==='mle');
  const found=[];
  // Additional Limbs: one Edge in ALL Melee or Agility action checks,
  // regardless of how many extra limbs the character has.
  if(['mle','agl'].includes(ab)&&owns(actor,'Basic','Additional Limbs'))
    found.push(descriptor('Additional Limbs','1 Edge em testes de Melee ou Agility',1));
  // Blazing Fast Fists: one Edge in close attacks, INCLUDING weapons, but
  // never in an unrelated Agility ranged attack or a nonattack check.
  // Masters may already have a Central passive with this exact power; avoid
  // stacking the official benefit twice when a legacy rule is detected.
  if(attack&&close&&owns(actor,'Super-Speed','Blazing Fast Fists')&&
    !existingSources.some(s=>/\bBlazing Fast Fists\b/i.test(String(s.source??''))))
    found.push(descriptor('Blazing Fast Fists','1 Edge nos ataques corpo a corpo',1));
  return found;
}
export function spiderSenseTargetTrouble(target,{attack=false,ability='',attackTarget=''}={}){
  if(!attack||abCode(ability)!=='agl'||abCode(attackTarget)!=='vig'||
    !owns(target,'Spider-Powers','Spider Sense'))return null;
  return descriptor('Spider Sense','1 Trouble em ataques de Agility contra a Defesa de Vigilance do alvo',-1);
}
