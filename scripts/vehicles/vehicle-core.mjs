/** Pure helpers for token-based vehicle crew. No Foundry globals here. */
export const VEHICLE_SCOPE = 'multiverse-d616';
export const VEHICLE_CREW_KEY = 'vehicleCrew';
export const VEHICLE_BOARD_KEY = 'embarked';
export const VEHICLE_VISIBILITY_KEY = 'vehicleCrewVisibility';
export const VEHICLE_MODES = Object.freeze(['hidden', 'visible']);
export const VEHICLE_ROLES = Object.freeze(['pilot', 'copilot', 'operator', 'passenger']);

export function normalizeVehicleVisibility(value) {
  return value === 'visible' ? 'visible' : 'hidden';
}
export function normalizeVehicleRole(value) {
  return VEHICLE_ROLES.includes(value) ? value : 'passenger';
}
export function normalizeVehicleCrew(raw) {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  return raw.filter(entry => {
    if (!entry || typeof entry !== 'object' || !entry.tokenId || unique.has(entry.tokenId)) return false;
    unique.add(entry.tokenId);
    return true;
  }).map(entry => ({
    tokenId: String(entry.tokenId),
    actorId: String(entry.actorId ?? ''),
    role: normalizeVehicleRole(entry.role),
    originalHidden: Boolean(entry.originalHidden),
    originalX: Number(entry.originalX ?? 0),
    originalY: Number(entry.originalY ?? 0),
  }));
}
export function boardingPosition(ship, seat, gridSize = 100) {
  const x = Number(ship.x ?? 0), y = Number(ship.y ?? 0);
  const size = Math.max(1, Number(gridSize) || 100);
  const w = Math.max(size, Number(ship.width ?? 1) * size);
  const h = Math.max(size, Number(ship.height ?? 1) * size);
  const columns = Math.max(1, Math.floor(w / size));
  const col = seat % columns;
  const row = Math.floor(seat / columns);
  // Seat footprints stay inside the vehicle's bounding rectangle where possible.
  return {
    x: Math.round(x + Math.min(w - size, col * size)),
    y: Math.round(y + Math.min(h - size, (row % Math.max(1, Math.floor(h / size))) * size)),
    elevation: Number(ship.elevation ?? 0),
  };
}
export function getBoardedCrewPatch(ship, crew, sceneTokens, visibility, gridSize) {
  const patches = [];
  const hidden = normalizeVehicleVisibility(visibility) !== 'visible';
  for (const [seat, passenger] of normalizeVehicleCrew(crew).entries()) {
    if (!sceneTokens.has(passenger.tokenId)) continue;
    patches.push({_id: passenger.tokenId, ...boardingPosition(ship, seat, gridSize), hidden});
  }
  return patches;
}
export function boardingKey(vehicleToken) {
  return `${vehicleToken.parent?.id ?? vehicleToken.scene?.id ?? ''}/${vehicleToken.id}`;
}
