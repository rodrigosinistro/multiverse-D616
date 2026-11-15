/** Safe catalog reconciliation for Foundry VTT v14 and the D616 Charactermancer.
 * The official helper JSON is the base. Pack records with the same ID refresh
 * their runtime fields/effects, while World records take precedence on matches.
 * Different powers sharing only a name (or even name + set) are not discarded
 * unless their actual effect content is equivalent.
 */
const canon = v => String(v ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[–—]/g,'-')
  .replace(/\s+/g,' ').trim().toLowerCase();
export const powerSetKey = power => canon(power?.system?.powerSet || 'Basic').replace(/\s*-\s*/g,'-');
export const powerNameKey = power => canon(power?.name);
export const powerIdentity = power => `${powerSetKey(power)}::${powerNameKey(power)}`;
/** Only show powers that belong to the power set selected in the UI.
 * Keep homonymous entries from other groups in the full catalog (for other
 * selections); do not use name/family matches to extend the visible list.
 */
export function powersInSelectedSet(catalog=[], selectedSet='') {
  const key = powerSetKey({system:{powerSet:selectedSet}});
  if (!canon(selectedSet) || key === 'basic') return [];
  return (catalog || []).filter(power => powerSetKey(power) === key);
}
const descriptionKey = power => canon(power?.system?.effect || power?.system?.description);
const idKey = power => String(power?._id || '').trim();
/** Only identical record IDs, or the same power/set/effect, are duplicates. */
export function samePower(a,b) {
  if (!a || !b) return false;
  const idA=idKey(a),idB=idKey(b);
  if (idA && idB && idA === idB) return true;
  return powerIdentity(a) === powerIdentity(b) && !!descriptionKey(a) &&
    descriptionKey(a) === descriptionKey(b);
}

/** Core-rulebook prerequisite corrections verified against official reference material.
 * Apply to stale compendium/world copies at runtime without mutating world documents.
 * Preserve any unrelated, more restrictive requirements set by the GM.
 */
export const VERIFIED_POWER_PREREQUISITES = Object.freeze({
  'basic::energy absorption': 'Rank 4',
  'super-speed::blazing fast fists': 'Rank 2',
  'resize::grow 2': 'Grow 1',
  'martial arts::do this all day': 'Rank 2',
  'shield bearer::do this all day': 'Rank 2',
  'super-speed::speed run 2': 'Speed Run 1, Rank 3',
  'ranged weapons::return fire': 'Suppressive Fire, Rank 2'
});
export const VERIFIED_POWER_IDS = Object.freeze({
  '9M3g5S4KjZZ7X5dO': 'Rank 4',
  'MCGRVGvWxnwQYHgB': 'Rank 2',
  'Ppt16p6K3tw1hz9e': 'Rank 2',
  'aJk0RuuAOQjkSWW7': 'Rank 2',
  'uXEh42PCsVE2X8Po': 'Grow 1',
  'RF4L6FVzbxDyPJRY': 'Speed Run 1, Rank 3',
  'fd3AyzufIQFe4TqS': 'Suppressive Fire, Rank 2',
});

export function applyVerifiedPowerPrerequisites(power) {
  if (!power?.system) return power;
  const required = VERIFIED_POWER_IDS[idKey(power)] || VERIFIED_POWER_PREREQUISITES[powerIdentity(power)];
  if (!required) return power;
  const existing = String(power.system.prerequisites || '').trim();
  // Known legacy typo from the distributed pack: Rank 8 exceeds the game maximum.
  if (powerIdentity(power)==='ranged weapons::return fire' &&
      canon(existing)==='suppressive fire, rank 8') {
    return {...power, system:{...power.system, prerequisites:required}};
  }
  const parts = /^(?:none|nenhum)$/i.test(existing) ? [] : existing.split(/[,;]/).map(v=>v.trim()).filter(Boolean);
  for (const token of required.split(/[,;]/).map(v=>v.trim()).filter(Boolean)) {
    const requirement = token.match(/^Rank (\d+)$/i);
    if (requirement) {
      const minimum = Number(requirement[1]);
      let found = false;
      for (let i=parts.length-1; i>=0; i--) {
        const match = parts[i].match(/^Rank\s*(\d+)$/i);
        if (!match) continue;
        if (found) parts.splice(i,1);
        else { parts[i] = `Rank ${Math.max(minimum, Number(match[1]))}`; found = true; }
      }
      if (!found) parts.push(token);
    } else if (!parts.some(v=>canon(v)===canon(token))) parts.push(token);
  }
  const corrected = parts.join(', ');
  if (corrected === existing) return power;
  return {...power, system:{...power.system, prerequisites:corrected}};
}

/** Merge genuinely identical entries while preserving similarly-named variants. */
export function reconcilePowerCatalog(base=[], packs=[], world=[], corrections=new Map()) {
  const rows = [];
  const sources = [];
  const add = (original, source) => {
    if (!powerNameKey(original)) return;
    let power = original;
    const correction = source !== 'world' ? corrections.get(idKey(original)) : null;
    if (correction) power = {
      ...original,
      name: correction.name,
      system: {...(original.system || {}), prerequisites: correction.prerequisites}
    };
    const id = idKey(power);
    // Exact ID wins. If the ID changed on world import, require the same
    // set, name AND meaningful description to consider it a duplicate.
    const at = rows.findIndex(p =>
      (id && idKey(p) === id) ||
      (powerIdentity(p) === powerIdentity(power) &&
       descriptionKey(p) && descriptionKey(p) === descriptionKey(power)));
    if (at < 0) { rows.push(power); sources.push(source); return; }
    const current = rows[at];
    const oldSource = sources[at];
    const weights = {base:0, pack:1, world:2};
    if (weights[source] < weights[oldSource]) return;
    const merged = {...current, ...power,
      system: {...(current.system || {}), ...(power.system || {})}};
    // Keep canonical spelling and corrected prerequisites on pack refresh;
    // explicitly edited World powers are still authoritative for their ID.
    if (source === 'pack' && correction) {
      merged.name = correction.name;
      merged.system.prerequisites = correction.prerequisites;
    }
    // Imported pack stubs do not erase full effects of a previous document.
    if (source === 'pack' && Array.isArray(current.effects) && current.effects.length &&
        (!Array.isArray(power.effects) || !power.effects.length)) merged.effects = current.effects;
    else if (!Array.isArray(power.effects) && Array.isArray(current.effects)) merged.effects = current.effects;
    rows[at] = merged; sources[at] = source;
  };
  for (const p of base || []) add(p,'base');
  for (const p of packs || []) add(p,'pack');
  for (const p of world || []) add(p,'world');
  return rows.map(applyVerifiedPowerPrerequisites).sort((a,b)=>String(a.name).localeCompare(String(b.name)) ||
    powerSetKey(a).localeCompare(powerSetKey(b)));
}

/** Dedupe only identical powers (not homonyms with distinct effects). */
export function dedupePowerCatalog(items=[]) {
  return reconcilePowerCatalog([], items, []);
}

const family = power => {
  const name = String(power?.name ?? '').trim();
  const m = name.match(/^(.*?)\s+(\d+)$/);
  return { key: `${powerSetKey(power)}::${canon(m ? m[1] : name)}`,
    level: m ? Number(m[2]) : null };
};

/** The highest level of a numbered series replaces lower tiers in that set.
 * Unrelated powers, even homonyms from different sets, stay independent.
 */
export function prepareCharacterPowers(granted=[],chosen=[]) {
  const selected = [];
  const seen = new Set();
  for (const p of [...(granted || []),...(chosen || [])]) {
    if (!powerNameKey(p)) continue;
    const id = idKey(p);
    const signature = `${powerIdentity(p)}::${descriptionKey(p)}`;
    if (seen.has(signature) || (id && seen.has('id:'+id))) continue;
    seen.add(signature);
    if(id)seen.add('id:'+id);
    selected.push(p);
  }
  const strongest = new Map();
  for(const p of selected) {
    const f = family(p);
    if(f.level === null)continue;
    const prior = strongest.get(f.key);
    if (prior === undefined || f.level > prior) strongest.set(f.key,f.level);
  }
  return selected.filter(p=>{
    const f=family(p);
    return f.level === null || f.level >= strongest.get(f.key);
  });
}
