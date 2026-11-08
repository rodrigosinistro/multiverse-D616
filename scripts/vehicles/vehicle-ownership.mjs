/** Permanent, additive vehicle access for owners of newly boarded characters.
 * Boarding grants OWNER. Disembarking NEVER alters Actor ownership: only the
 * GM can remove rights manually. The helper cannot generate deletion patches.
 */
export function expectedVehicleOwners(crewActors=[],users=[]) {
  const result=new Set();
  for(const actor of crewActors) {
    if(!actor)continue;
    for(const user of users) {
      if(!user?.id || user.isGM)continue;
      const level=actor?.ownership?.[user.id] ?? actor?.ownership?.default ?? 0;
      if(level>=3 || actor?.testUserPermission?.(user,3))result.add(user.id);
    }
  }
  return result;
}
/** A full, plain numeric mapping for Foundry v14. Never sends nulls,
 * nonnumeric values or deletion operators. No grant means no update.
 */
export function vehicleOwnerGrantPatch(current={},desired=new Set()) {
  const grants={};
  for(const userId of desired) {
    if(typeof userId!=='string' || !/^[a-zA-Z0-9]+$/.test(userId))continue;
    if(Number(current[userId] ?? current.default ?? 0)>=3)continue;
    grants[userId]=3;
  }
  if(!Object.keys(grants).length)return null;
  return {ownership:{...current,...grants}};
}
