/**
 * Uniform grid-space X/Y/Z dimensions for Marvel Multiverse size categories.
 * Foundry v14 TokenDocument fields: width (X), height (Y), depth (Z).
 * These are token dimensions, not texture.scaleX/scaleY and not map coordinates x/y.
 */
const SYSTEM_ID = 'multiverse-d616';
const RESIZE_SKIP_OPTION = 'd616SkipTokenSizeSync';
export { RESIZE_SKIP_OPTION };

export const TOKEN_SIZE_DIMENSIONS = Object.freeze({
  microscopic: 0.1,
  miniature: 0.3,
  tiny: 0.5,
  little: 0.7,
  small: 0.9,
  average: 1,
  big: 2,
  huge: 3,
  gigantic: 5,
  titanic: 8,
  gargantuan: 10,
});

const TOKEN_FIELDS = new Set(['prototypeToken.width','prototypeToken.height','prototypeToken.depth']);
const resizeFlags = effect => effect?.flags?.[SYSTEM_ID] ?? {};
const changesOf = effect => effect?.system?.changes ?? effect?.changes ?? [];
const effectsOf = actor => Array.from(actor?.effects?.contents ?? actor?.effects ?? []);
const normalize = value => String(value ?? '').toLowerCase().trim();
const isKnownSize = value => Object.hasOwn(TOKEN_SIZE_DIMENSIONS, value);
const isResize = effect => resizeFlags(effect).growChoice === true || resizeFlags(effect).shrinkChoice === true;
const isLegacySize = effect => /^(?:Microscopic|Miniature|Tiny|Little|Small|Average|Big|Huge|Gigantic|Titanic|Gargantuan) Effects$/i.test(String(effect?.name ?? '')) &&
  changesOf(effect).some(change => change.key === 'system.size');
const isSizeEffect = effect => isResize(effect) || resizeFlags(effect).managedSize === true || isLegacySize(effect);

export function tokenSizeDimensions(size) {
  const category = normalize(size);
  if (!isKnownSize(category)) throw new Error(`Categoria de tamanho desconhecida: ${size}`);
  const value = TOKEN_SIZE_DIMENSIONS[category];
  return {width: value, height: value, depth: value};
}

/** Prefer an active Grow/Shrink choice over an actor's natural-size source. */
export function effectiveActorTokenSize(actor) {
  const effects = effectsOf(actor);
  const choice = effects.find(effect => effect?.disabled !== true && isResize(effect));
  if (choice) {
    const marked = normalize(resizeFlags(choice).growSelectedSize ?? resizeFlags(choice).shrinkSelectedSize);
    const value = marked || normalize(changesOf(choice).find(c => c.key === 'system.size')?.value);
    if (isKnownSize(value)) return value;
  }
  const stored = normalize(actor?._source?.system?.size ?? actor?.system?._source?.size ?? actor?.system?.size) || 'average';
  const naturalEffect = effects.find(effect => effect?.disabled !== true && !isResize(effect) && isSizeEffect(effect) &&
    changesOf(effect).some(c => c.key === 'system.size'));
  const managed = normalize(changesOf(naturalEffect).find(c => c.key === 'system.size')?.value);
  // Preserve compatibility with pre-0.2.0 actors whose natural size was held only by an AE.
  return stored === 'average' && isKnownSize(managed) ? managed : isKnownSize(stored) ? stored : 'average';
}

function currentSceneTokens(actor) {
  const result = new Map();
  const put = doc => {
    const token = doc?.document ?? doc;
    if (token?.update && token?.id) result.set(token.uuid ?? `${token.parent?.id ?? 'scene'}.${token.id}`,token);
  };
  // Synthetic actors belong exclusively to their own placed token. Never resize other
  // unlinked copies sharing the same base world actor.
  if (actor?.isToken) {
    put(actor.token);
    return [...result.values()];
  }
  try {
    for (const doc of actor?.getActiveTokens?.(true,true) ?? []) {
      const token = doc?.document ?? doc;
      if (token?.actorLink === false) continue;
      put(token);
    }
  } catch (error) {
    console.warn(`[${SYSTEM_ID}] Não foi possível obter tokens ativos:`,error);
  }
  return [...result.values()];
}

function isSameDimensions(target, patch) {
  return Object.entries(patch).every(([field,value]) => Number(target?.[field]) === value);
}

/** Remove old v0.2.x prototypeToken.width/height effects which would override dimensions. */
export async function removeLegacySizeTokenModifiers(actor) {
  if (!actor?.effects) return 0;
  let changed = 0;
  for (const effect of effectsOf(actor)) {
    if (!isSizeEffect(effect)) continue;
    const old = changesOf(effect);
    const clean = old.filter(c => !TOKEN_FIELDS.has(c.key));
    if (clean.length === old.length || !effect.update) continue;
    await effect.update({changes: clean}, {[RESIZE_SKIP_OPTION]:true});
    changed++;
  }
  return changed;
}

/** Update linked/active scene tokens AND the world Actor's prototype token.
 * Synthetic (unlinked) actors only update their own placed token, never baseActor.
 * Does not modify texture scale, map location, elevation or character size rules.
 */
export async function syncActorTokenSize(actor, category, {cleanLegacy = true} = {}) {
  const patch = tokenSizeDimensions(category);
  if (!actor) return {size: category, updated: 0, errors: []};
  const errors = [];
  if (cleanLegacy) {
    try { await removeLegacySizeTokenModifiers(actor); }
    catch (error) {errors.push(error); console.error(`[${SYSTEM_ID}] Limpeza de modificadores antigos:`,error);}
  }
  let updated = 0;
  if (!actor.isToken && typeof actor.update === 'function' && actor.prototypeToken && !isSameDimensions(actor.prototypeToken, patch)) {
    try {
      await actor.update(Object.fromEntries(Object.entries(patch).map(([key,value]) => [`prototypeToken.${key}`,value])), {[RESIZE_SKIP_OPTION]:true});
      updated++;
    } catch (error) {errors.push(error); console.error(`[${SYSTEM_ID}] Falha ao atualizar token padrão:`,error);}
  }
  for (const token of currentSceneTokens(actor)) {
    if (isSameDimensions(token,patch)) continue;
    try {await token.update(patch, {[RESIZE_SKIP_OPTION]:true}); updated++;}
    catch (error) {errors.push(error);console.error(`[${SYSTEM_ID}] Falha ao redimensionar token ${token.id}:`,error);}
  }
  if (errors.length && globalThis.ui?.notifications?.warn) {
    ui.notifications.warn('Tamanho da ficha atualizado, mas não foi possível redimensionar todos os tokens. Verifique permissões e o console.');
  }
  return {size: category, updated, errors};
}

/** Restore dimensions if a GM/player removes or disables Grow/Shrink directly. */
export function registerTokenSizeHooks() {
  if (!globalThis.Hooks?.on) return;
  for (const hook of ['createActiveEffect','updateActiveEffect','deleteActiveEffect']) {
    Hooks.on(hook,(effect, changedOrOptions = {}, optionsOrUser, userId) => {
      const options = hook === 'updateActiveEffect' ? optionsOrUser : changedOrOptions;
      const operationUser = hook === 'updateActiveEffect' ? userId : optionsOrUser;
      if (options?.[RESIZE_SKIP_OPTION] || (typeof operationUser === "string" && operationUser !== globalThis.game?.user?.id)) return;
      if (!isResize(effect)) return;
      // Only the originating user updates tokens; skip when the actor is not editable.
      const actor = effect.parent;
      if (!actor?.isOwner) return;
      void syncActorTokenSize(actor,effectiveActorTokenSize(actor)).catch(error =>
        console.error(`[${SYSTEM_ID}] Falha ao atualizar tamanho após efeito:`,error));
    });
  }
  Hooks.on('updateActor',(actor,changes,options={},userId) => {
    if (options?.[RESIZE_SKIP_OPTION] || (userId && userId !== globalThis.game?.user?.id)) return;
    if (!Object.hasOwn(changes?.system ?? {},'size') || !actor?.isOwner) return;
    void syncActorTokenSize(actor,effectiveActorTokenSize(actor)).catch(error =>
      console.error(`[${SYSTEM_ID}] Falha ao atualizar tamanho natural:`,error));
  });
  // Existing 0.2.6 Grow/Shrink choices start using correct scene dimensions upon
  // opening the scene, even before the player changes size again.
  Hooks.on('canvasReady',() => {
    if (!globalThis.game?.user?.isGM) return;
    const unique = new Set();
    for (const placeable of globalThis.canvas?.tokens?.placeables ?? []) {
      const actor = placeable.actor;
      if (!actor || unique.has(actor)) continue;
      unique.add(actor);
      if (!effectsOf(actor).some(e => e.disabled !== true && isResize(e))) continue;
      void syncActorTokenSize(actor,effectiveActorTokenSize(actor)).catch(error =>
        console.error(`[${SYSTEM_ID}] Falha ao sincronizar token de Resize:`,error));
    }
  });
}
