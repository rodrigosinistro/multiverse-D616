/** Foundry v14 uses Combatant.getInitiativeRoll rather than Actor.getInitiativeRoll.
 * Preserve the native formula, data and flags; only replace the roll class for
 * combatants whose owned powers enable the Central's automatic Marvel M. */
import {passivePowerBenefits} from '../custom-automations.mjs';

export function prepareCombatantInitiativeRoll(combatant, nativeRoll, MarvelRollClass,
  benefits=passivePowerBenefits) {
  const actor=combatant?.actor ?? combatant?.token?.actor;
  if (!actor || !nativeRoll || !benefits(actor).marvelM || typeof MarvelRollClass!=='function')
    return nativeRoll;
  const roll=nativeRoll instanceof MarvelRollClass ? nativeRoll :
    new MarvelRollClass(nativeRoll.formula, nativeRoll.data,
      {...nativeRoll.options,forceMarvelM:true});
  roll.options.forceMarvelM=true;
  roll.options.initiativePassiveMarvelM=true;
  return roll;
}
