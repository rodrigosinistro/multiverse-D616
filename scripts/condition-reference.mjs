/** Shared, read-only reference for condition text shown in the token tray and in chat.
 * The conditions tray publishes the active configured catalogue (native JSON plus
 * world overrides) after loading it. No rules or Active Effects are changed here.
 */
let referenceById = new Map();
export function publishConditionReferences(conditions = []) {
  referenceById = new Map(Array.from(conditions ?? [])
    .filter(entry => entry && typeof entry.id === 'string' && entry.id.trim())
    .map(entry => [entry.id, Object.freeze({
      name: String(entry.name ?? ''),
      description: String(entry.description ?? ''),
      remove: String(entry.remove ?? ''),
    })]));
}
export function conditionReference(statusId) {
  return referenceById.get(String(statusId ?? '')) ?? null;
}
