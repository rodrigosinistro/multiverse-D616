/**
 * Combat-sheet refresh coordination (Foundry v14).
 * Group repeated combat hooks into one render per browser frame, and ignore
 * Combat flag-only changes: flags do not change sheet combat membership or
 * visible turn context. Never suppress round/turn, active, roster or scene changes.
 */
const SHEET_RELEVANT_COMBAT_FIELDS = new Set([
  'round', 'turn', 'started', 'active', 'combatants', 'scene', 'sceneId'
]);

export function combatChangeAffectsActorSheets(changed) {
  // A missing/unknown event payload is not evidence that nothing changed.
  if (!changed || typeof changed !== 'object') return true;
  return Object.keys(changed).some(key => SHEET_RELEVANT_COMBAT_FIELDS.has(key));
}

export function makeCombatSheetRefreshScheduler(render, requestFrame) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    // The caller supplies the Foundry/browser frame queue. No persistent timer
    // or document reference survives beyond the frame being processed.
    requestFrame(() => {
      queued = false;
      render();
    });
  };
}
