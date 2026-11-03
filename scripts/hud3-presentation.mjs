/** HUD 3.0 — read-only presentation based on native D616 state. */
import { conditionTurnEntries } from './custom-automations.mjs';
import { getActorRank, getConcentrationLevel, getConcentrationPowerEffects } from './concentration.js';

const CONCENTRATION_PREFIX = 'mmrpg.concentration';
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const safeName = value => String(value ?? '').trim().slice(0, 180);

export function hudConditionSnapshot(actor, combat, registry = globalThis.CONFIG?.statusEffects) {
  if (!actor) return [];
  const statuses = list(Array.isArray(registry) ? registry : Object.values(registry ?? {}));
  const icons = new Map(statuses.map(entry => [entry.id, entry.img ?? entry.icon ?? '']));
  return conditionTurnEntries(actor, combat)
    .filter(entry => !String(entry.id ?? '').startsWith(CONCENTRATION_PREFIX))
    .map(entry => ({
      id: entry.id,
      label: safeName(entry.label),
      duration: safeName(entry.duration),
      removal: safeName(entry.removal),
      icon: icons.get(entry.id) ?? '',
    }));
}

export function hudConcentrationSnapshot(actor) {
  if (!actor) return { used: 0, maximum: 0, names: [] };
  const maximum = Math.max(1, Math.min(6, Number(getActorRank(actor)) || 1));
  // The level status is authoritative; active named power effects are labels,
  // not extra slots (some powers explicitly do not count toward the limit).
  const used = Math.min(maximum, Math.max(0, getConcentrationLevel(actor)));
  const names = getConcentrationPowerEffects(actor, { activeOnly: true })
    .map(effect => safeName(effect.name)).filter(Boolean);
  return { used, maximum, names };
}

/** Never mutate a user's owned items; favorites are only an ordering preference. */
export function favoriteItemKey(action, itemId, powerId = '') {
  if (!['power', 'weapon', 'attached-power'].includes(String(action))) return '';
  const item = String(itemId ?? '').trim();
  if (!item) return '';
  if (action === 'attached-power' && !powerId) return '';
  return `${action}:${item}${action === 'attached-power' ? ':' + String(powerId) : ''}`;
}

export function hudActorFavorites(raw, actor) {
  const key = String(actor?.uuid ?? actor?.id ?? '');
  if (!key || !raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const values = raw[key];
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(value => typeof value === 'string' && value.length < 150))].slice(0, 150);
}

export function withFavoriteFirst(items, keyForItem, selectedKeys, compare) {
  const favorites = new Set(selectedKeys ?? []);
  return [...items].sort((a, b) => {
    const delta = Number(favorites.has(keyForItem(b))) - Number(favorites.has(keyForItem(a)));
    return delta || compare(a, b);
  });
}

/** Read the *selected* Foundry v14 movement action, including native blink.
 * Use the same icon/img as the native Token HUD. No movement state is changed.
 */
export function hudMovementSnapshot(actor, token, combat = null, actions = globalThis.CONFIG?.Token?.movement?.actions) {
  if (!actor || !token?.document || !token?.actor) return null;
  if (token.actor.id !== actor.id && token.actor.uuid !== actor.uuid) return null;
  const movementAction = String(token.document.movementAction ?? 'walk').trim().toLowerCase();
  const modes = {
    walk: ['Caminhada', 'fa-person-walking'], walking: ['Caminhada', 'fa-person-walking'],
    run: ['Caminhada', 'fa-person-walking'],
    fly: ['Voo', 'fa-feather'], flying: ['Voo', 'fa-feather'], flight: ['Voo', 'fa-feather'],
    swim: ['Natação', 'fa-person-swimming'], swimming: ['Natação', 'fa-person-swimming'],
    burrow: ['Escavação', 'fa-person-digging'], crawl: ['Rastejar', 'fa-person-crawling'],
    climb: ['Escalada', 'fa-person-hiking'], jump: ['Salto', 'fa-person-running'],
    glide: ['Planar', 'fa-feather'], swing: ['Balanço', 'fa-link'],
    swingline: ['Balanço', 'fa-link'], levitation: ['Levitação', 'fa-feather'],
    blink: ['Teleporte (Piscar)', 'fa-person-rays'],
    teleport: ['Teleporte (Piscar)', 'fa-person-rays'],
    teleportation: ['Teleporte (Piscar)', 'fa-person-rays'],
  };
  let action = movementAction;
  // A temporary D616 Teleport power uses a Combatant flag; it must not be
  // written into TokenDocument.movementAction (which is Foundry validated).
  if (combat?.started) {
    const combatants = list(combat.combatants);
    const combatant = combatants.find(entry =>
      (entry.tokenId ?? entry.token?.id) === (token.id ?? token.document.id));
    const grant = combatant?.getFlag?.('multiverse-d616', 'temporaryMovementPower');
    if (grant?.kind === 'teleport' && Number(grant.maximum) > 0) action = 'blink';
  }
  const config = actions?.[action] ?? (action === 'blink' ? actions?.teleport : null);
  const isTeleport = action === 'blink' || action === 'teleport' || action === 'teleportation' || config?.teleport === true;
  const [fallbackLabel, fallbackIcon] = isTeleport
    ? modes.blink : (modes[action] ?? modes.walk);
  // Native config is authoritative for icons (including system-specific ones).
  // A displayed label remains in pt-BR regardless of client localization.
  return {
    label: fallbackLabel,
    icon: String(config?.icon ?? (isTeleport ? actions?.blink?.icon : '') ?? fallbackIcon).trim() || fallbackIcon,
    ...(config?.img ? {img: String(config.img)} : {}),
  };
}
