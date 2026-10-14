/**
 * STAGED (not yet released) migration for the four permanent ability-bonus power
 * families, Flexible Bones 2, and non-stacking movement-power tiers.
 * This only changes item-owned Active Effects and outdated Speed Run 2 text,
 * preserving item IDs, power choices, equipment, and actor ability scores.
 *
 * The world migration is safe to repeat and only the first active GM runs it.
 * It must be registered as a system esmodule when the user requests a release.
 */
const SYSTEM = 'multiverse-d616';
const FAMILIES = Object.freeze({ Mighty: 'mle', Accuracy: 'agl', Brilliance: 'log', Discipline: 'ego' });
const UPGRADE = 4;
const validPowerFamily = (item) => {
  if (item?.type !== 'power' || String(item?.system?.powerSet ?? '') !== 'Basic') return null;
  const match = /^(Mighty|Accuracy|Brilliance|Discipline) ([1-4])$/.exec(String(item?.name ?? ''));
  return match ? { ability: FAMILIES[match[1]], level: Number(match[2]) } : null;
};

export function upgradeChangesForPower(item, effect) {
  const family = validPowerFamily(item);
  if (!family || effect?.transfer === false) return null;
  const sysChanges = Array.isArray(effect?.system?.changes) ? effect.system.changes : null;
  const oldChanges = !sysChanges && Array.isArray(effect?.changes) ? effect.changes : null;
  const changes = sysChanges ?? oldChanges;
  if (!changes?.length) return null;
  const keys = new Set([
    `system.abilities.${family.ability}.damageMultiplier`,
    `system.abilities.${family.ability}.noncom`,
  ]);
  const clone = changes.map(c => ({ ...c }));
  let modified = 0;
  for (const change of clone) {
    if (!keys.has(change.key) || Number(change.value) !== family.level) continue;
    if (sysChanges && change.type === 'add') { change.type = 'upgrade'; modified++; }
    if (oldChanges && Number(change.mode) === 2) { change.mode = UPGRADE; modified++; }
  }
  return modified ? { key: sysChanges ? 'system.changes' : 'changes', changes: clone } : null;
}

// Existing worlds retain the original MULTIPLY AE for each power. Upgrade its
// out-of-combat speed factor to a separate max-only field, including the
// incorrect Speed Run 2 ×3 -> ×50. Do not touch customized, unrelated effects.
const MOVEMENT_POWERS = Object.freeze({
  'Flight 1': { set: 'Basic', mode: 'flight', factor: 3 },
  'Flight 2': { set: 'Basic', mode: 'flight', factor: 50 },
  'Speed Run 1': { set: 'Super-Speed', mode: 'run', factor: 3 },
  'Speed Run 2': { set: 'Super-Speed', mode: 'run', factor: 50 },
});
export const SPEED_RUN_2_EFFECT = '<p>Fora de combate, o personagem pode se mover até 50 vezes sua Velocidade de Corrida melhorada. Em combate, sua Velocidade de Corrida permanece igual à sua Velocidade de Corrida normal multiplicada pelo Rank.</p>';
export function upgradeMovementChangesForPower(item, effect) {
  const power = MOVEMENT_POWERS[String(item?.name ?? '')];
  if (item?.type !== 'power' || !power || String(item?.system?.powerSet) !== power.set || effect?.transfer === false) return null;
  const modern = Array.isArray(effect?.system?.changes) ? effect.system.changes : null;
  const legacy = !modern && Array.isArray(effect?.changes) ? effect.changes : null;
  const list = modern ?? legacy;
  if (!list?.length) return null;
  const fromKey = `system.movement.${power.mode}.noncom`;
  const toKey = `system.movement.${power.mode}.noncomFactor`;
  // Flight 2 must never suppress Jump, including in existing worlds.
  const replacement = list.filter(c => !(item.name === 'Flight 2' &&
    c.key === 'system.movement.jump.active' && String(c.value).toLowerCase() === 'false'))
    .map(c => ({ ...c }));
  let changed = replacement.length !== list.length;
  for (const c of replacement) {
    if (c.key !== fromKey) continue;
    if (modern ? c.type !== 'multiply' : Number(c.mode) !== 1) continue;
    // Only migrate the recognizable official power factor; leave house rules
    // or customized values untouched unless already set to the correct ×50.
    if (![3, 50].includes(Number(c.value))) continue;
    c.key = toKey;
    c.value = modern ? power.factor : String(power.factor);
    if (modern) c.type = 'upgrade';
    else c.mode = UPGRADE;
    changed = true;
  }
  return changed ? { key: modern ? 'system.changes' : 'changes', changes: replacement } : null;
}

export function outdatedSpeedRun2(item) {
  if (item?.type !== 'power' || item?.name !== 'Speed Run 2' || item?.system?.powerSet !== 'Super-Speed') return false;
  const text = String(item?.system?.effect ?? '');
  const oldText = /Fora de combate.*tr[eê]s vezes|Fora de combate.*tr[eê]s vezes mais r[aá]pido/i.test(text);
  return oldText || String(item?.system?.prerequisites ?? '').trim() === 'Speed Run 1, Rank 2';
}

export function needsFlexibleBones2Effect(item) {
  if (item?.type !== 'power' || item?.name !== 'Flexible Bones 2' || item?.system?.powerSet !== 'Plasticity') return false;
  for (const effect of item.effects ?? []) {
    for (const change of (effect?.system?.changes ?? effect?.changes ?? [])) {
      if (change.key === 'system.healthDamageReduction' && Number(change.value) >= 2) return false;
    }
  }
  return true;
}

export function flexibleBones2Effect(item) {
  return {
    name: 'Health Damage Reduction 2',
    img: 'icons/svg/aura.svg',
    description: '',
    disabled: false,
    transfer: true,
    origin: item.uuid,
    type: 'base',
    system: { changes: [{
      key: 'system.healthDamageReduction', value: 2, type: 'upgrade', phase: 'initial', priority: null,
    }] },
  };
}

/** Power-specific migration for the other movement modes. Do not replace
 * unrelated house-ruled effects or duplicate newly created Jump effects.
 */
const MOVEMENT_V2_POWERS = Object.freeze({
  'Super-Speed:Speed Swim': 'swim',
  'Plasticity:Stilt Steps': 'stilt',
  'Plasticity:Body Sheet': 'sheet',
});

export function upgradeModePowerEffect(item, effect) {
  if (item?.type !== 'power') return null;
  const power = MOVEMENT_V2_POWERS[`${item.system?.powerSet}:${item.name}`];
  if (!power) return null;
  const modern = Array.isArray(effect?.system?.changes) ? effect.system.changes : null;
  const legacy = !modern && Array.isArray(effect?.changes) ? effect.changes : null;
  if (!modern && !legacy) return null;
  const list = modern ?? legacy;
  const clone = list.map(c => ({...c}));
  let dirty = false;
  const set = (c, key, value, type) => {
    const was = [c.key, String(c.value), modern ? c.type : String(c.mode)];
    c.key = key;
    c.value = modern ? value : String(value);
    if (modern) c.type = type;
    else c.mode = type === 'upgrade' ? 4 : 5;
    if (JSON.stringify(was) !== JSON.stringify([c.key,String(c.value),modern ? c.type : String(c.mode)])) dirty = true;
  };
  for (const c of clone) {
    if (power === 'swim') {
      if (c.key === 'system.movement.swim.calc' && c.value === 'rank')
        set(c,c.key,'rank-swim','override');
      if (c.key === 'system.movement.swim.noncom' && (Number(c.value) === 3))
        set(c,'system.movement.swim.noncomFactor',3,'upgrade');
    } else if (power === 'stilt') {
      if (c.key === 'system.movement.run.calc' && String(c.value) === '2')
        set(c,c.key,'double','override');
      if (c.key === 'system.movement.climb.calc' && String(c.value) === '2')
        set(c,c.key,'double-climb','override');
    } else if (power === 'sheet') {
      if (c.key === 'system.movement.glide.calc' && String(c.value) === 'runspeed')
        set(c,c.key,'run-double','override');
      else if (c.key === 'system.movement.glide.calc' && String(c.value) === '2') {
        // Old artifact tried to multiply a text field, so remove that change.
        c.__remove = true;dirty = true;
      }
    }
  }
  const filtered = clone.filter(c => !c.__remove);
  const desiredTransfer = power === 'stilt' ? true : (power === 'sheet' ? false : effect.transfer);
  const changeTransfer = desiredTransfer !== effect.transfer;
  if (!dirty && !changeTransfer) return null;
  return {
    key: modern ? 'system.changes' : 'changes',
    changes: filtered,
    ...(changeTransfer ? { transfer: desiredTransfer } : {}),
  };
}

/** Reach 1/2: UPGRADE separate reachFactor rather than multiplying reach.
 * Each level now participates in a single max-only calculation, including
 * when size/Resize effects are present. Does not edit unrelated reach AEs.
 */
export function upgradeExtendedReachEffect(item, effect) {
  if (item?.type !== 'power' || item?.system?.powerSet !== 'Plasticity' ||
      !/^Extended Reach [12]$/.test(String(item?.name ?? ''))) return null;
  const modern = Array.isArray(effect?.system?.changes) ? effect.system.changes : null;
  const legacy = !modern && Array.isArray(effect?.changes) ? effect.changes : null;
  const list = modern ?? legacy;
  if (!list) return null;
  const expected = item.name.endsWith('1') ? 4 : 10;
  let dirty = false;
  const clone = list.map(c => {
    if (c.key !== 'system.reach' || Number(c.value) !== expected ||
        !(modern ? c.type === 'multiply' : Number(c.mode) === 1)) return {...c};
    dirty = true;
    return {...c, key:'system.reachFactor', ...(modern ? {type:'upgrade'} : {mode:4})};
  });
  return dirty ? {key:modern ? 'system.changes' : 'changes',changes:clone} : null;
}

/** Shield DR belongs to the Concentration condition, never to the item itself. */
export function upgradeShieldEffect(item, effect) {
  if (item?.type !== 'power' || item?.system?.powerSet !== 'Shield Bearer' ||
      !/^Shield [1-4]$/.test(String(item?.name ?? ''))) return null;
  const cs = effect?.system?.changes ?? effect?.changes ?? [];
  if (effect.transfer === false || !cs.some(c => c.key === 'system.healthDamageReduction' &&
    Number(c.value) === Number(item.name.at(-1)))) return null;
  return {transfer: false};
}

export function shouldNormalizeStiltDuration(item) {
  return item?.type === 'power' && item.name === 'Stilt Steps' &&
    item.system?.powerSet === 'Plasticity' && item.system?.duration !== 'Permanent';
}

/** A migrated world may still have a Shield currently concentrating.
 * Update that specific status to carry its DR immediately, not only on recast.
 */
export function shieldStatusModifiers(item) {
  if (item?.type !== 'power' || item?.system?.powerSet !== 'Shield Bearer' ||
      !/^Shield [1-4]$/.test(String(item?.name ?? ''))) return null;
  const value = Number(item.name.at(-1));
  const ownedDR = (item.effects ?? []).some(e => (e.system?.changes ?? e.changes ?? [])
    .some(c => c.key === 'system.healthDamageReduction' && Number(c.value) === value));
  if (!ownedDR) return null;
  return {
    changes: [{key:'system.healthDamageReduction',mode:4,value:String(value),priority:null}],
    'system.changes': [{key:'system.healthDamageReduction',type:'upgrade',value,phase:'initial',priority:null}],
  };
}

export function makeOwnedJumpEffect(item) {
  if (item?.type !== 'power' || !['Spider-Powers','Super-Strength'].includes(item?.system?.powerSet) ||
      !['Jump 2','Jump 3'].includes(item?.name)) return null;
  const highest = item.name === 'Jump 3' ? 50 : 3;
  return {
    name: `${item.name} — Movimento de Salto`,
    img: 'icons/svg/aura.svg',
    origin: item.uuid,
    transfer: true,
    disabled: false,
    type: 'base',
    system: { changes: [
      { key: 'system.movement.jump.active', type: 'override', value: true, phase: 'initial' },
      { key: 'system.movement.jump.calc', type: 'override', value: 'rank', phase: 'initial' },
      { key: 'system.movement.jump.noncomFactor', type: 'upgrade', value: highest, phase: 'initial' },
    ] },
  };
}

export function needsOwnedJumpEffect(item) {
  const expected = makeOwnedJumpEffect(item);
  if (!expected) return false;
  return !(item?.effects ?? []).some(effect =>
    (effect?.system?.changes ?? effect?.changes ?? []).some(c => c.key === 'system.movement.jump.noncomFactor' &&
      Number(c.value) === (item.name === 'Jump 3' ? 50 : 3))
  );
}

export async function migrateOwnedPermanentPowers(actor) {
  if (!actor) return { powers: 0, effects: 0, added: 0 };
  const changed = { powers: 0, effects: 0, added: 0 };
  for (const item of actor.items ?? []) {
    const updates = [];
    for (const effect of item.effects ?? []) {
      const transform = upgradeChangesForPower(item, effect) ?? upgradeMovementChangesForPower(item, effect) ??
        upgradeModePowerEffect(item, effect) ?? upgradeExtendedReachEffect(item, effect) ?? upgradeShieldEffect(item, effect);
      if (transform) updates.push({ _id: effect.id,
        ...(transform.key ? {[transform.key]: transform.changes} : {}),
        ...(typeof transform.transfer === 'boolean' ? {transfer: transform.transfer} : {}) });
    }
    if (updates.length) {
      await item.updateEmbeddedDocuments('ActiveEffect', updates);
      changed.powers += 1;
      changed.effects += updates.length;
    }
    if (outdatedSpeedRun2(item) && typeof item.update === 'function') {
      const update = {};
      if (String(item.system?.prerequisites ?? '').trim() === 'Speed Run 1, Rank 2')
        update['system.prerequisites'] = 'Speed Run 1, Rank 3';
      if (/Fora de combate.*tr[eê]s vezes/i.test(String(item.system?.effect ?? '')))
        update['system.effect'] = SPEED_RUN_2_EFFECT;
      if (Object.keys(update).length) await item.update(update);
    }
    if (needsFlexibleBones2Effect(item)) {
      await item.createEmbeddedDocuments('ActiveEffect', [flexibleBones2Effect(item)]);
      changed.powers += 1;
      changed.added += 1;
    }
    if (needsOwnedJumpEffect(item)) {
      await item.createEmbeddedDocuments('ActiveEffect', [makeOwnedJumpEffect(item)]);
      changed.powers += 1;
      changed.added += 1;
    }
    if (shouldNormalizeStiltDuration(item) && typeof item.update === 'function') {
      await item.update({ 'system.duration': 'Permanent' });
      changed.powers += 1;
    }
  }
  // Remove ONLY old v0.2.2 Stilt Steps actor-level temporary effects; the
  // corrected power now provides the same modifiers as permanent item effects.
  const temporaryStilt = Array.from(actor.effects ?? []).filter(e =>
    e.flags?.[SYSTEM]?.temporaryStiltSteps && e.id).map(e => e.id);
  if (temporaryStilt.length && typeof actor.deleteEmbeddedDocuments === 'function')
    await actor.deleteEmbeddedDocuments('ActiveEffect', temporaryStilt);

  // Keep an already-active Shield Concentration in sync across the upgrade,
  // without recasting or changing the actor's Concentration level.
  const focusedUpdates=[];
  for (const e of Array.from(actor.effects ?? [])) {
    const tag=e.flags?.[SYSTEM]?.concentrationPower;
    if (!e.id || e.disabled || !tag?.itemId) continue;
    const item=Array.from(actor.items ?? []).find(p => String(p.id) === String(tag.itemId));
    const modifier=shieldStatusModifiers(item);
    if (!modifier) continue;
    const c=e.system?.changes ?? e.changes ?? [];
    if (c.some(x=>x.key==='system.healthDamageReduction' &&
      Number(x.value)===Number(item.name.at(-1)))) continue;
    focusedUpdates.push({_id:e.id,...modifier});
  }
  if (focusedUpdates.length && typeof actor.updateEmbeddedDocuments === 'function')
    await actor.updateEmbeddedDocuments('ActiveEffect', focusedUpdates);
  return changed;
}

export async function migrateWorldPermanentPowers() {
  if (game.system?.id !== SYSTEM) return { powers: 0, effects: 0, added: 0 };
  const primaryGM = game.users?.find?.(u => u.active && u.isGM);
  if (primaryGM?.id !== game.user?.id) return { powers: 0, effects: 0, added: 0 };
  const totals = { powers: 0, effects: 0, added: 0 };
  const seen = new Set();
  const actors = [
    ...(game.actors?.contents ?? []),
    ...(game.scenes?.contents ?? []).flatMap(scene =>
      (scene.tokens?.contents ?? []).filter(token => !token.actorLink).map(token => token.actor).filter(Boolean)
    ),
  ];
  for (const actor of actors) {
    const id = actor?.uuid;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    try {
      const n = await migrateOwnedPermanentPowers(actor);
      for (const key of Object.keys(totals)) totals[key] += n[key];
    } catch (err) {
      console.error(`[${SYSTEM}] Permanent power effect migration failed for ${id}`, err);
    }
  }
  if (totals.powers) console.info(`[${SYSTEM}] Permanent power migration`, totals);
  return totals;
}

if (typeof Hooks !== 'undefined') {
  Hooks.once('ready', () => migrateWorldPermanentPowers().catch(e =>
    console.error(`[${SYSTEM}] Permanent power migration failed`, e)));
}
