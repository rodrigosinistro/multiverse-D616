/** Recursos somente do combatente selecionado para o HUD persistente.
 * Nunca consultar tokens em hover: preservar informações dos demais jogadores.
 * Os valores são somente-leitura e vêm do rastreador oficial do turno.
 */
import {availableTurnIcons, movementArrowFill} from './compact-combat-core.mjs';

export function hudResourceState({actor, token, combat, tracker, isGM=false}={}) {
  if (!actor || !token?.document || !combat?.started || !tracker?.getState) return null;
  if (!isGM && !(token.isOwner || token.document.isOwner || token.actor?.isOwner)) return null;
  if (!token.actor || (token.actor.id !== actor.id && token.actor.uuid !== actor.uuid)) return null;
  const tokenScene = token.document.parent?.id;
  if (combat.scene?.id && (!tokenScene || tokenScene !== combat.scene.id)) return null;
  const combatants = Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []);
  const combatant = combatants.find(c =>
    (c.tokenId ?? c.token?.id) === (token.id ?? token.document.id) &&
    (!tokenScene || !c.sceneId || c.sceneId === tokenScene));
  if (!combatant) return null;
  const state = tracker.getState(combatant);
  if (!state) return null;
  const grant = combatant.getFlag?.('multiverse-d616','temporaryMovementPower');
  const max = grant?.kind === 'teleport' && Number(grant.maximum) > 0
    ? Number(grant.maximum) : Math.max(0,Number(state.movementMax)||0);
  const used = grant?.kind === 'teleport' && Number(grant.maximum)>0 ? 0
    : Math.max(0,Number(state.movementUsed)||0);
  const movement = movementArrowFill({movementMax:max,movementUsed:used});
  return {
    actions: availableTurnIcons(state,'action'),
    reactions: availableTurnIcons(state,'reaction'),
    movement,
    remaining: Math.max(0,max-used),
    maximum: max,
    mode: grant?.kind === 'teleport' ? 'Teleporte' :
      String(token.document.movementAction ?? 'walk'),
  };
}
