/** Vehicle 2.0. A vehicle never receives initiative in place of its crew. */
import {normalizeVehicleCrew, VEHICLE_SCOPE, VEHICLE_CREW_KEY} from './vehicle-core.mjs';

/** Resolve Combatants from another token of the same Actor as the embarked
 * character. Foundry can create a combatant using a different token ID. */
export function combatantActorId(combatant, scene=null) {
  const tokenId=combatant?.tokenId ?? combatant?.token?.id;
  const token=scene?.tokens?.get?.(tokenId) ?? scene?.tokens?.contents?.find(t=>t.id===tokenId);
  return String(combatant?.actorId ?? token?.actorId ?? combatant?.actor?.id ?? '');
}

function validCrewActors(ship,scene) {
  const actors=new Map();
  for (const member of normalizeVehicleCrew(ship?.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY))) {
    const token=scene?.tokens?.get?.(member.tokenId) ?? scene?.tokens?.contents?.find(t=>t.id===member.tokenId);
    if(token?.actorId!==member.actorId || token?.actor?.type==='vehicle')continue;
    if(!actors.has(member.actorId))actors.set(member.actorId,member.tokenId);
  }
  return actors;
}

export function crewInitiativeEntries(ship, scene, existing = []) {
  const presentTokens=new Set();
  const presentActors=new Set();
  for(const c of Array.from(existing ?? [])) {
    presentTokens.add(String(c.tokenId ?? c.token?.id ?? ''));
    const actorId=combatantActorId(c,scene);
    if(actorId)presentActors.add(actorId);
  }
  const entries=[];
  for(const [actorId,tokenId] of validCrewActors(ship,scene)) {
    // Token-only deduplication was insufficient: the same Actor could have a
    // second scene token, or a token-less Combatant, giving two turns.
    if(presentTokens.has(tokenId) || presentActors.has(actorId))continue;
    entries.push({tokenId,actorId,hidden:false});
    presentTokens.add(tokenId);
    presentActors.add(actorId);
  }
  return entries;
}

/** Only crew actors are deduplicated: multiple NPC enemy tokens that share a
 * base Actor remain legitimate independent combatants. Returns document IDs. */
export function duplicateCrewCombatantIds(ship,scene,existing=[],activeCombatantId=null) {
  const crewActors=validCrewActors(ship,scene);
  const groups=new Map();
  for(const c of Array.from(existing ?? [])) {
    const actorId=combatantActorId(c,scene);
    if(!crewActors.has(actorId))continue;
    if(!groups.has(actorId))groups.set(actorId,[]);
    groups.get(actorId).push(c);
  }
  const remove=[];
  for(const [actorId,matches] of groups) {
    if(matches.length<2)continue;
    const boardedTokenId=crewActors.get(actorId);
    // Avoid changing the currently acting combatant. Otherwise retain a
    // rolled initiative where possible, favouring the actual boarded token.
    const score=c=>(c.id===activeCombatantId?100:0)
      +(c.initiative!=null?10:0)
      +(String(c.tokenId ?? c.token?.id ?? '')===boardedTokenId?1:0);
    const keep=matches.reduce((best,c)=>score(c)>score(best)?c:best);
    for(const c of matches)if(c!==keep && c.id)remove.push(c.id);
  }
  return remove;
}

export function vehicleCrewCombatant(combat, ship, user=null) {
  const crew=normalizeVehicleCrew(ship?.getFlag?.(VEHICLE_SCOPE, VEHICLE_CREW_KEY));
  if(!crew.length)return null;
  const allowed=new Set(crew.map(c=>c.tokenId));
  const allowedActors=new Set(crew.map(c=>c.actorId));
  const combatants=Array.from(combat?.combatants?.contents ?? combat?.combatants?.values?.() ?? []);
  const matches=combatants.filter(c=>allowed.has(c.tokenId ?? c.token?.id) ||
    allowedActors.has(combatantActorId(c,combat?.scene)));
  if(!matches.length)return null;
  const active=matches.find(c=>c.id===combat?.combatant?.id);
  if(active && (user?.isGM || active.actor?.testUserPermission?.(user,3))) return active;
  // Off-turn reactions belong to the player's own embarked character.
  return matches.find(c=>c.actor?.id === user?.character?.id && c.actor?.testUserPermission?.(user,3))
    ?? matches.find(c=>user?.isGM || c.actor?.testUserPermission?.(user,3)) ?? null;
}
