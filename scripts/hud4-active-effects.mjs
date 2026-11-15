/** Multiverse-D616 HUD 4.0 — combat maneuver indicator snapshot (read-only).
 *
 * HUD icons are deliberately NOT generated from Foundry ActiveEffects.
 * Foundry transfers passive effects from every kind of embedded Item —
 * Powers, Traits, Origins, Occupations and Equipment. These include technical
 * modifiers like initiative edge (Situational Awareness) and Extra Focus
 * (Battle Ready), which must never clutter the compact combat HUD.
 *
 * Conditions are rendered separately from hudConditionSnapshot, and the
 * Concentration gauge has its own widget. The only additional icons managed
 * here are active Team Maneuvers from the combat round's authoritative flags.
 * No Actor/Item data or ActiveEffect is modified by this module.
 */
import { actorTeamManeuverLevels } from './team-maneuvers-effects.mjs';

/** The third parameter is retained for compatibility with both classic and
 * persistent HUD rendering. No ActiveEffect scanning or mutation occurs.
 */
export function hudActiveEffectSnapshot(actor, combat = globalThis.game?.combat,
  _options = {}) {
  if (!actor) return [];
  const entries = [];
  const team = [
    ['Offensive', { 1: ['Edge +1', 'fa-solid fa-bolt', '+1', '1 Edge nos ataques desta rodada'],
      2: ['Ofensiva 2', 'fa-solid fa-dice', '3D', 'Repetir os três dados de cada ataque e manter o melhor resultado'],
      3: ['Marvel → M', 'fa-solid fa-star', 'M', 'Dado Marvel convertido em M contra alvos elegíveis por Rank'] }],
    ['Defensive', { 1: ['RD 2', 'fa-solid fa-shield-halved', '2', 'Redução de Dano mínima 2'],
      2: ['RD 4', 'fa-solid fa-shield-halved', '4', 'Redução de Dano mínima 4'],
      3: ['RD 8', 'fa-solid fa-shield-halved', '8', 'Redução de Dano mínima 8'] }],
  ];
  for (const [type, levels] of team) {
    for (const level of actorTeamManeuverLevels(actor, type, combat)) {
      const info = levels[level];
      if (!info) continue;
      entries.push({ id: `team:${type}:${level}`, name: info[0], iconClass: info[1],
        value: info[2], description: info[3],
        origin: `Manobra de Equipe — ${type === 'Offensive' ? 'Ofensiva' : 'Defensiva'} ${level}`,
        duration: 'Até o fim desta rodada', kind: type === 'Offensive' ? 'offensive' : 'defensive' });
    }
  }
  return entries;
}
