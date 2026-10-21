/**
 * Visual metadata for temporary Elemental Control effects which are not native
 * Marvel Multiverse conditions (Earth / Force). These effects deliberately do
 * not receive an artificial status ID: the combat mechanics already read their
 * elementalFantastic flags and native status lists must remain exclusive.
 */
export const ELEMENTAL_TRAY_PREFIX = "d616.elemental-fantastic.";

const ELEMENTAL_CUSTOM_PRESENTATION = Object.freeze({
  forceTrouble: Object.freeze({
    name: "Elemental — Force (Trouble)",
    description: "O alvo sofre Trouble em todas as ações por 1 rodada.",
  }),
  halfMovement: Object.freeze({
    name: "Elemental — Earth (Movimento reduzido)",
    description: "O alvo se move com metade da velocidade por 1 rodada.",
  }),
});

function iterableEffects(actor) {
  return actor?.effects?.contents ?? Array.from(actor?.effects ?? []);
}

function hasNativeStatus(effect) {
  const statuses = effect?.statuses;
  return (statuses instanceof Set && statuses.size > 0) ||
    (Array.isArray(statuses) && statuses.length > 0) ||
    (typeof statuses?.size === 'number' && statuses.size > 0);
}

function presentationFor(effect) {
  if (!effect || !effect.id || effect.disabled || effect.duration?.expired === true || hasNativeStatus(effect)) return null;
  const metadata = effect.flags?.['multiverse-d616']?.elementalFantastic;
  if (metadata?.source !== 'fantastic') return null;
  const details = Object.prototype.hasOwnProperty.call(ELEMENTAL_CUSTOM_PRESENTATION, metadata.custom)
    ? ELEMENTAL_CUSTOM_PRESENTATION[metadata.custom] : null;
  if (!details) return null;
  return {
    id: `${ELEMENTAL_TRAY_PREFIX}${effect.id}`,
    effectId: effect.id,
    name: details.name,
    icon: effect.img || effect.icon || 'systems/multiverse-d616/icons/four-elements.svg',
    description: details.description,
    remove: "Expira automaticamente ao final da duração; o Mestre pode remover o efeito manualmente.",
  };
}

/** Entries which belong in the condition tray, but never the Token HUD palette. */
export function getElementalFantasticTrayEntries(actor) {
  return iterableEffects(actor).map(presentationFor).filter(Boolean);
}

/** Validate the actor-owned effect before allowing the GM to remove it. */
export function findElementalFantasticTrayEffect(actor, trayId) {
  if (!String(trayId ?? '').startsWith(ELEMENTAL_TRAY_PREFIX)) return null;
  const effectId = String(trayId).slice(ELEMENTAL_TRAY_PREFIX.length);
  if (!effectId) return null;
  const effect = iterableEffects(actor).find((entry) => entry?.id === effectId);
  return effect && presentationFor(effect)?.id === trayId ? effect : null;
}
