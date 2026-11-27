/**
 * Multiverse-D616 v0.2.202 — bounded perception/stealth Edge and Trouble.
 *
 * The Marvel rules refer to a PURPOSE (perception or moving unnoticed), not
 * every Vigilance/Agility action. The generic ability card has no declared
 * skill/purpose. These sources therefore clearly say "somente se..." and ALL
 * rerolls remain manual, with Narrator judgement. We intentionally do not
 * create AE, spend Focus, or infer that every Agility check is stealth.
 *
 * Heightened Senses 2 supersedes 1; it does not grant three Edges. Illusion
 * benefits only exist during the existing D616 Concentration marker.
 */
import {activeNativeConcentratedPower} from './native-power-guarded-passives.mjs';
const items=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const owns=(actor,set,name)=>items(actor?.items).some(i=>i?.type==='power'&&i.name===name&&i.system?.powerSet===set);
const abilityCode=a=>({vigilance:'vig',agility:'agl'})[String(a??'').toLowerCase()]??String(a??'').toLowerCase();
const source=(power,sign,index,total,why)=>({source:`Poder: ${power}${total>1?` (${index}/${total})`:''}`,sign,reason:`${why} — aplicável somente quando o teste for de ${sign>0?'percepção/furtividade':'furtividade/percepção'}; Mestre confirma, reroll manual`});
const many=(power,n,sign,why)=>Array.from({length:n},(_,i)=>source(power,sign,i+1,n,why));
export function heightenedSensesTier(actor){
  if(owns(actor,'Basic','Heightened Senses 2'))return 2;
  return owns(actor,'Basic','Heightened Senses 1')?1:0;
}
export function concentratedStealthPowers(actor){
  return ['Invisibility','Silence Self'].filter(name=>activeNativeConcentratedPower(actor,'Illusion',name));
}
export function concentratedStealthPower(actor){return concentratedStealthPowers(actor)[0]??null;}
/** Actor's own NON-ATTACK check: Vig perception, Agility stealth. The GM can
 * leave the optional Edge unused when the ability is used for another task. */
export function nativeSenseOwnSources({actor,ability='',attack=false}={}){
  if(attack)return [];
  const ab=abilityCode(ability),found=[];
  if(ab==='vig'){
    const tier=heightenedSensesTier(actor);
    if(tier)found.push(...many(`Heightened Senses ${tier}`,tier,1,'Edge em Vigilance para perceber coisas'));
  }
  if(ab==='ego'&&activeNativeConcentratedPower(actor,'Spider-Powers','Spider-Pheromones')){
    found.push({source:'Concentração: Spider-Pheromones',sign:1,
      reason:'Edge apenas em Ego (intimidação/persuasão) nas situações sociais descritas pelo poder; Mestre confirma, reroll manual'});
  }
  if(ab==='agl'){
    for(const power of concentratedStealthPowers(actor))
      found.push(...many(power,1,1,'Edge em Agility para passar despercebido enquanto concentra'));
  }
  return found;
}
/** When the user explicitly targets an observer/opponent on an ability check,
 * these are the opposing modifiers. Do NOT apply to attack rolls or arbitrary
 * non-targeted rolls. Multi-target situations are deliberately left for the GM. */
export function nativeSenseOpponentSources({target,ability='',attack=false}={}){
  if(attack||!target)return [];
  const ab=abilityCode(ability);
  if(ab==='agl'){
    const tier=heightenedSensesTier(target);
    return tier?many(`Heightened Senses ${tier} (observador)`,tier,-1,
      'Trouble para passar despercebido por observador com sentidos ampliados'):[];
  }
  if(ab==='vig'){
    return concentratedStealthPowers(target).flatMap(power=>many(`${power} (alvo)`,1,-1,
      'Trouble em Vigilance para perceber o alvo sob a ilusão'));
  }
  return [];
}
