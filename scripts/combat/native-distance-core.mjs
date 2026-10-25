/** Numeric and visibility helpers for the native D616 distance display (Foundry v14). */
import { actorMovementForAction, movementPreviewNotice } from './turn-tracker-core.mjs';
export { movementPreviewNotice };

export function euclideanSpaces(a, b, gridPixels = 100, gridDistance = 5) {
  const pixel = Number(gridPixels);
  const distance = Number(gridDistance);
  if (!(pixel > 0) || !(distance > 0)) return 0;
  const dx = Number(a?.x) - Number(b?.x);
  const dy = Number(a?.y) - Number(b?.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const dz = (Number(a?.elevation ?? 0) - Number(b?.elevation ?? 0)) / distance;
  return Math.hypot(dx / pixel, dy / pixel, Number.isFinite(dz) ? dz : 0);
}

/** Prefer the Foundry v14 grid measurement and use Euclidean only as fallback.
 * Elevation is respected on the fallback and by Foundry's 3D measurement.
 */
export function sceneDistanceSpaces(scene, a, b, grid, fallbackPixels = 100) {
  const distancePerSpace = Number(scene?.grid?.distance) || 5;
  if (!a || !b) return 0;
  try {
    const measured = grid?.measurePath?.([a, b]);
    const spaces = Number(measured?.spaces);
    if (Number.isFinite(spaces) && spaces >= 0 && !measured?.error && spaces > 0) return spaces;
    const distance = Number(measured?.distance);
    if (Number.isFinite(distance) && distance > 0) return distance / distancePerSpace;
  } catch { /* Falls back when the grid cannot measure off-grid points. */ }
  return euclideanSpaces(a, b, Number(scene?.grid?.size) || fallbackPixels, distancePerSpace);
}

export function remainingSpaces(available, used, proposed = 0) {
  return Math.max(0, (Number(available) || 0) - (Number(used) || 0) - (Number(proposed) || 0));
}

export function distanceStatus({actor, action, used = 0, proposal = 0}) {
  const {mode, maximum} = actorMovementForAction(actor, action);
  const left = remainingSpaces(maximum, used, proposal);
  return {mode, maximum, used, proposal, remaining:left, exceeds: used + proposal > maximum + 1e-6};
}

export function canShowTokenToUser(token, isGM = false) {
  return !!token?.visible && !!token?.document && (isGM || !token.document.hidden);
}
