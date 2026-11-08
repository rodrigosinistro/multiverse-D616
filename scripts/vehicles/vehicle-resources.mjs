/**
 * D616 automatic Health/Focus capacity shared by characters, NPCs and vehicles.
 * Each preparation starts from the raw Ability Scores, then Foundry applies
 * Active Effects; an after-effects pass accounts for changes to the scores.
 * Resource CURRENT is deliberately never reset by data preparation.
 */
const initialBases = new WeakMap();
export const D616_ACTOR_TYPES = new Set(['character','npc','vehicle']);

export function vehicleResourceMaximum(score) {
  const n = Number(score);
  return Math.max(10, Number.isFinite(n) ? Math.round(n * 30) : 10);
}
export function vehicleResourceBases(abilities = {}) {
  return {
    health: vehicleResourceMaximum(abilities?.res?.value),
    focus: vehicleResourceMaximum(abilities?.vig?.value),
  };
}
export const actorResourceBases = vehicleResourceBases;

export function prepareActorResourceBase(model) {
  if (!model) return;
  const base = actorResourceBases(model.abilities);
  initialBases.set(model, base);
  if (model.health) model.health.max = base.health;
  if (model.focus) model.focus.max = base.focus;
}
export function finalizeActorResourceMaximums(model) {
  const beforeEffects = initialBases.get(model);
  if (!beforeEffects) return;
  const afterEffects = actorResourceBases(model.abilities);
  for (const resource of ['health','focus']) {
    if (!model[resource]) continue;
    const raw = Number(model[resource].max);
    const existing = Number.isFinite(raw) ? raw : beforeEffects[resource];
    model[resource].max = Math.max(0,existing + afterEffects[resource] - beforeEffects[resource]);
  }
}
// Backward-compatible exported names for legacy unit tests / macros.
export const prepareVehicleResourceBase = prepareActorResourceBase;
export const finalizeVehicleResourceMaximums = finalizeActorResourceMaximums;

/** At creation, all actor types use the rule; imported actors keep their
 * current damage/Focus expenditure relative to the pre-import maximum. */
export function initialActorResourcePatch(data = {}, model = {}) {
  const source = data.system ?? {};
  const abilities = {
    res:source?.abilities?.res ?? model?.abilities?.res,
    vig:source?.abilities?.vig ?? model?.abilities?.vig,
  };
  const bases = actorResourceBases(abilities);
  const patch = {};
  for (const key of ['health','focus']) {
    const oldMax = Number(source?.[key]?.max ?? 0);
    const oldCurrent = Number(source?.[key]?.value ?? 0);
    const empty = oldMax === 0 && oldCurrent === 0;
    const spent = empty ? 0 : Math.max(0,oldMax - oldCurrent);
    patch[`system.${key}.max`] = bases[key];
    patch[`system.${key}.value`] = empty ? bases[key] : Math.max(0,bases[key] - spent);
  }
  return patch;
}
export const initialVehicleResourcePatch = initialActorResourcePatch;

const getChange = (obj,path) => {
  if (Object.prototype.hasOwnProperty.call(obj,path)) return obj[path];
  let node = obj;
  for (const part of path.split('.')) node = node?.[part];
  return node;
};
/** Keep Health damage and already-spent Focus when an Ability Score changes.
 * Uses the RAW stored score delta (rather than effective AE score) so an AE
 * changing the score is not applied twice. The baseline max is also saved in
 * the Actor's source for exported data, while live AEs remain derived. */
export function actorResourceUpdatePatch(actor, changes = {}) {
  if (!D616_ACTOR_TYPES.has(actor?.type)) return null;
  const patch = {};
  const oldScores = actor?._source?.system?.abilities ?? actor.system?.abilities ?? {};
  const oldBases = actorResourceBases(oldScores);
  const newScores = {
    res:{value:getChange(changes,'system.abilities.res.value') ?? oldScores?.res?.value},
    vig:{value:getChange(changes,'system.abilities.vig.value') ?? oldScores?.vig?.value},
  };
  const newBases = actorResourceBases(newScores);
  for (const key of ['health','focus']) {
    const attemptedMaxEdit = getChange(changes,`system.${key}.max`) !== undefined;
    const delta = newBases[key] - oldBases[key];
    if (!delta && !attemptedMaxEdit) continue;
    patch[`system.${key}.max`] = newBases[key];
    const explicitCurrent = getChange(changes,`system.${key}.value`) !== undefined;
    if (explicitCurrent || !delta) continue;
    const oldMax = Number(actor.system?.[key]?.max);
    const oldCurrent = Number(actor.system?.[key]?.value);
    if (!Number.isFinite(oldMax) || !Number.isFinite(oldCurrent)) continue;
    const spent = Math.max(0,oldMax - oldCurrent);
    patch[`system.${key}.value`] = Math.max(-300,oldMax + delta - spent);
  }
  return Object.keys(patch).length ? patch : null;
}
export const vehicleResourceUpdatePatch = actorResourceUpdatePatch;

/** One-time normalization for already-saved world Actors. Foundry's data model
 * recalculates the visible maximum instantly, but legacy source data may have
 * stored arbitrary maxima. Preserve damage/spent Focus when aligning sources
 * to the rule, so a 200/200 NPC with Resilience 6 becomes 180/180 rather than
 * 200/180. A flag makes the transition idempotent across restarts. */
export function legacyActorResourceMigrationPatch(actor) {
  if (!D616_ACTOR_TYPES.has(actor?.type)) return null;
  if (actor.getFlag?.('multiverse-d616','resourceFormula147')) return null;
  const source=actor._source?.system ?? actor.system ?? {};
  const base=actorResourceBases(source.abilities);
  const patch={};
  for(const key of ['health','focus']) {
    const oldMax=Number(source?.[key]?.max ?? 0);
    const oldCurrent=Number(source?.[key]?.value ?? 0);
    const derivedMax=Number(actor.system?.[key]?.max ?? base[key]);
    if (!Number.isFinite(oldMax) || !Number.isFinite(oldCurrent) || !Number.isFinite(derivedMax))continue;
    const previousSpent=Math.max(0,oldMax-oldCurrent);
    if (oldMax!==base[key]) patch[`system.${key}.max`]=base[key];
    // Align over-capacity legacy pools and changed maxima, without healing
    // already-consumed resources or rewinding damage.
    if (oldMax!==base[key] || oldCurrent>derivedMax) {
      const next=oldMax===0&&oldCurrent===0 ? derivedMax : Math.max(0,derivedMax-previousSpent);
      if(next!==oldCurrent)patch[`system.${key}.value`]=next;
    }
  }
  patch['flags.multiverse-d616.resourceFormula147']=true;
  return patch;
}
export async function migrateLegacyActorResources(actors=[],isGM=false) {
  if(!isGM)return 0;
  let updated=0;
  for(const actor of actors) {
    const patch=legacyActorResourceMigrationPatch(actor);
    if(!patch)continue;
    try {await actor.update(patch);updated++;}
    catch(error) {console.warn('[D616] Recurso automático não migrado:',actor.name,error);}
  }
  return updated;
}
