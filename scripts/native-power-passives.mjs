/**
 * Macros_D616 v0.2.185: passive rules that had no native execution path.
 * Read-only character checks. Never mutate Actor data or execute Macro commands.
 */
import {hasEquipmentPermanentPower} from './equipment-permanent-effects.mjs';

function itemsOf(actor){return Array.from(actor?.items?.contents??actor?.items?.values?.()??actor?.items??[]);}

/** Official Luck / Real Jinx: one Trouble on direct attacks meant to hurt its
 * holder. The caller must supply an actual targeted attack; otherwise there is
 * not enough context to infer that this narrative requirement was satisfied.
 * The combat resolver handles stacking and mixed-target adjudication.
 */
export function hasNativeRealJinx(actor){
  if (!actor) return false;
  return itemsOf(actor).some(item=>item?.type==='power'&&
    String(item.name??'').trim()==='Real Jinx' &&
    String(item.system?.powerSet??'').trim()==='Luck') ||
    hasEquipmentPermanentPower(actor,'Real Jinx');
}

export function realJinxTargetModifier(actor,{attack=false,targeted=false,alreadyTroubled=false}={}){
  if (!attack||!targeted||alreadyTroubled||!hasNativeRealJinx(actor)) return null;
  return Object.freeze({source:'Alvo: Real Jinx',reason:'Trouble em ataque direto; não acumula com outro Trouble',sign:-1});
}
