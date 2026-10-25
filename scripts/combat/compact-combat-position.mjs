// Layout-only helpers for the floating combat strip (no game-state mutations).
export function validInitiativeStripPosition(value) {
  return !!value && typeof value === 'object' &&
    Number.isFinite(value.left) && Number.isFinite(value.top);
}
export function clampInitiativeStripPosition(value, bounds, width, height) {
  const rectWidth = Math.max(0, Number(bounds?.width) || 0);
  const rectHeight = Math.max(0, Number(bounds?.height) || 0);
  const screenWidth = Math.max(0, Number(width) || 0);
  const screenHeight = Math.max(0, Number(height) || 0);
  const left = Number.isFinite(value?.left) ? value.left : 0;
  const top = Number.isFinite(value?.top) ? value.top : 0;
  return {
    left: Math.round(Math.max(0, Math.min(left, Math.max(0, screenWidth - rectWidth)))),
    top: Math.round(Math.max(0, Math.min(top, Math.max(0, screenHeight - rectHeight)))),
  };
}
