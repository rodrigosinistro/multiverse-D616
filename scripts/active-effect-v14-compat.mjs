/**
 * Foundry VTT v14 ActiveEffect.duration.value is an integer or null.
 * Sanitize imported/copyable Item data BEFORE the v14 Document is created.
 * Never edit the source item or change valid finite durations.
 */
export function normalizeItemEffectDurations(itemData) {
  if (!itemData || !Array.isArray(itemData.effects)) return itemData;
  for (const effect of itemData.effects) {
    if (!effect || typeof effect !== 'object') continue;
    // Old v13 AE data can carry legacy rounds/turns fields, but the current
    // schema accepts only {value, units, expiry, expired} for durations.
    const duration = effect.duration;
    if (!duration || typeof duration !== 'object' || Array.isArray(duration)) continue;
    const raw = duration.value;
    if (raw === null || raw === undefined || (typeof raw === 'number' && Number.isInteger(raw))) continue;
    // Valid numeric strings (e.g. "2" after an older editor) retain duration.
    const candidate = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    duration.value = Number.isSafeInteger(candidate) ? candidate : null;
  }
  return itemData;
}
