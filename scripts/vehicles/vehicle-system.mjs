/**
 * Vehicle 1.0: token-bound crew, selected-scene boarding, and visible/hidden
 * passenger modes. GM is the single authority for crew updates. This module
 * does not change vehicle combat, Character data, or native movement rules.
 */
import {
  VEHICLE_SCOPE, VEHICLE_CREW_KEY, VEHICLE_BOARD_KEY, VEHICLE_VISIBILITY_KEY,
  normalizeVehicleVisibility, normalizeVehicleCrew, normalizeVehicleRole,
  getBoardedCrewPatch, boardingPosition,
} from './vehicle-core.mjs';
import { initialActorResourcePatch, actorResourceUpdatePatch, D616_ACTOR_TYPES, migrateLegacyActorResources } from './vehicle-resources.mjs';
import { expectedVehicleOwners, vehicleOwnerGrantPatch } from './vehicle-ownership.mjs';
import { crewInitiativeEntries, combatantActorId, duplicateCrewCombatantIds } from './vehicle-combat-core.mjs';

const MSG = '[Multiverse-D616 Vehicles]';
const pendingCombatCrew = new Map();
const GAME_ACTOR = 'Actor';
function notify(message, kind='warn') { ui.notifications?.[kind]?.(message); }
function isPrimaryGm() {
  if (!game.user?.isGM) return false;
  const active = game.users?.activeGM;
  return !active || active.id === game.user.id;
}
function tokenCollection(scene) {
  const tokens = scene?.tokens;
  return new Map((tokens?.contents ?? Array.from(tokens?.values?.() ?? [])).map(t => [t.id,t]));
}
export function vehicleTokenForActor(actor) {
  if (!actor || actor.type !== 'vehicle') return null;
  const scene = canvas?.scene;
  if (!scene) return null;
  const selected = canvas.tokens?.controlled?.map(t => t.document)
    .find(t => t.actorId === actor.id);
  if (selected) return selected;
  const matching = (scene.tokens?.contents ?? []).filter(t => t.actorId === actor.id);
  return matching.length === 1 ? matching[0] : null;
}
function seatOptions(scene, ship, crew, visible) {
  const map = tokenCollection(scene);
  return getBoardedCrewPatch(ship, crew, map, visible, scene.grid?.size ?? canvas?.grid?.size ?? 100);
}
function actorLabel(actorId, scene, tokenId) {
  return game.actors?.get?.(actorId)?.name ?? scene.tokens?.get?.(tokenId)?.name ?? 'Tripulante';
}
export function crewContext(actor) {
  const ship = vehicleTokenForActor(actor);
  const scene = canvas?.scene;
  const visibility = normalizeVehicleVisibility(actor?.getFlag?.(VEHICLE_SCOPE,VEHICLE_VISIBILITY_KEY));
  const crew = normalizeVehicleCrew(ship?.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  return {
    vehicleToken:ship,
    vehicleTokenName:ship?.name ?? '',
    vehicleInScene:Boolean(ship),
    crewVisibility:visibility,
    crew: crew.map(entry => ({
      ...entry,
      name:actorLabel(entry.actorId,scene,entry.tokenId),
      rolePilot: entry.role === 'pilot',
      roleCopilot: entry.role === 'copilot',
      roleOperator: entry.role === 'operator',
      rolePassenger: entry.role === 'passenger',
      exists:Boolean(scene?.tokens?.get?.(entry.tokenId)),
    })),
  };
}
/** Resolve a player's character and the ship they are currently aboard.
 * The vehicle token can be controlled while the player's hidden character
 * remains inaccessible on canvas. Never replace the character Actor itself. */
export function hudVehicleContext(selectedToken, user=game.user) {
  const scene=canvas?.scene;
  if (!scene || !user) return null;
  const selected=selectedToken?.document ?? selectedToken ?? null;
  const tokenActor=selected?.actor ?? selectedToken?.actor ?? null;
  let ship=null, member=null;
  if(tokenActor?.type==='vehicle') {
    ship=selected;
    const entries=normalizeVehicleCrew(ship.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
    const eligible=entries.filter(entry=>{
      const token=scene.tokens?.get?.(entry.tokenId);
      return token?.actor && (user.isGM || token.actor.testUserPermission?.(user,3));
    });
    member=eligible.find(entry=>entry.actorId===user.character?.id) ?? eligible[0];
  } else {
    let passenger=selected;
    if(!passenger && user.character) {
      passenger=(scene.tokens?.contents??[]).find(token=>token.actorId===user.character.id &&
        token.getFlag?.(VEHICLE_SCOPE,VEHICLE_BOARD_KEY));
    }
    const boarded=passenger?.getFlag?.(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
    if(boarded?.sceneId===scene.id) {
      ship=scene.tokens?.get?.(boarded.vehicleTokenId);
      const entries=normalizeVehicleCrew(ship?.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
      member=entries.find(entry=>entry.tokenId===passenger.id);
      if(member && !(user.isGM || passenger.actor?.testUserPermission?.(user,3))) member=null;
    }
  }
  if(!ship || ship.actor?.type!=='vehicle' || !member)return null;
  const memberToken=scene.tokens?.get?.(member.tokenId);
  if(!memberToken?.actor) return null;
  return {ship,shipActor:ship.actor,member,memberToken,characterActor:memberToken.actor};
}

/** A tripulante desembarca gratuitamente: a chamada sempre usa o movimento
 * de teleporte interno e nunca registra consumo no Turn Tracker. */
export async function requestVehicleDisembark(context) {
  if(!context?.ship || !context.member)return false;
  if(game.user?.isGM) return disembarkPassenger(context.shipActor,context.member.tokenId);
  if(!game.users?.activeGM) throw Error('É necessário um Mestre conectado para desembarcar.');
  game.socket.emit('system.multiverse-d616',{
    type:'d616VehicleDisembark',sceneId:context.ship.parent?.id,
    shipTokenId:context.ship.id,memberTokenId:context.member.tokenId,
    requesterId:game.user.id,
  });
  return true; // request sent, not a claim that disembark completed
}

/** Select the ship token in the tracker: replace it with each embarked
 * character, even if that token is hidden on the scene. */
export async function addVehicleCrewToCombat(combat,ship) {
  if(!isPrimaryGm() || !combat || !ship?.parent)return [];
  const key=`${combat.id}/${ship.id}`;
  if(pendingCombatCrew.has(key)) return pendingCombatCrew.get(key);
  const task=(async()=>{
    const scene=ship.parent;
    let existing=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? []);
    const duplicateIds=duplicateCrewCombatantIds(ship,scene,existing,combat.combatant?.id);
    if(duplicateIds.length) {
      await combat.deleteEmbeddedDocuments('Combatant',duplicateIds);
      existing=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? []);
    }
    const members=crewInitiativeEntries(ship,scene,existing);
    if(!members.length)return [];
    return combat.createEmbeddedDocuments('Combatant',members);
  })();
  pendingCombatCrew.set(key,task);
  try {return await task;}
  finally {if(pendingCombatCrew.get(key)===task)pendingCombatCrew.delete(key);}
}

/** Called by a vehicle's initiative button: the ship never rolls. */
export async function rollVehicleCrewInitiative(vehicleActor) {
  if(!isPrimaryGm()) {
    notify('A iniciativa da tripulação deve ser iniciada pelo Mestre.','warn');
    return null;
  }
  const ship=requireShip(vehicleActor);
  const combat=game.combat;
  if(!combat || (combat.scene?.id && combat.scene.id!==ship.parent?.id)) {
    notify('Crie um combate nesta cena para rolar a iniciativa da tripulação.','warn');
    return null;
  }
  const oldVehicleEntries=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? [])
    .filter(c=>c.tokenId===ship.id);
  if(oldVehicleEntries.length) await combat.deleteEmbeddedDocuments('Combatant',oldVehicleEntries.map(c=>c.id));
  await addVehicleCrewToCombat(combat,ship);
  const crew=normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  const seats=new Set(crew.map(m=>m.tokenId));
  const crewActors=new Set(crew.map(m=>m.actorId));
  const ids=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? [])
    .filter(c=>c.initiative==null && (seats.has(c.tokenId) ||
      crewActors.has(combatantActorId(c,ship.parent)))).map(c=>c.id);
  if(ids.length) await combat.rollInitiative(ids);
  return combat;
}

function requireShip(actor) {
  const token = vehicleTokenForActor(actor);
  if (!token) throw Error('Selecione o token do veículo nesta cena (ou coloque apenas um token dele).');
  if (token.actorId !== actor.id) throw Error('O token selecionado não pertence a este veículo.');
  return token;
}
function requireGM() {if (!game.user?.isGM) throw Error('Somente o Mestre pode alterar a tripulação.');}
/** Grant vehicle OWNER at boarding. Grants are permanent until the GM changes
 * them manually: disembarking, deleting a token or reloading a scene must NOT
 * restore or revoke a user's ownership. This also avoids invalid permission
 * deletion updates on Foundry v14. */
export async function grantVehicleCrewOwnership(vehicleActor, passengerActor) {
  if (!game.user?.isGM || vehicleActor?.type !== 'vehicle' || !passengerActor) return false;
  const players=game.users?.contents ?? Array.from(game.users ?? []);
  const desired=expectedVehicleOwners([passengerActor],players);
  const patch=vehicleOwnerGrantPatch(vehicleActor.ownership??{},desired);
  if (!patch) return false;
  await vehicleActor.update(patch);
  return true;
}

function safeId(value) {return String(value ?? '').replace(/[^a-zA-Z0-9]/g,'');}
function passengerToken(scene, actor, ship) {
  const controlled = (canvas.tokens?.controlled ?? []).map(t => t.document)
    .find(t => t.actorId === actor.id && t.id !== ship.id);
  if (controlled) return controlled;
  const candidates = (scene.tokens?.contents ?? []).filter(t => t.actorId === actor.id && t.id !== ship.id && !t.getFlag(VEHICLE_SCOPE,VEHICLE_BOARD_KEY));
  return candidates.length === 1 ? candidates[0] : null;
}

export async function boardPassenger(vehicleActor, passenger, explicitToken=null) {
  requireGM();
  const ship = requireShip(vehicleActor);
  const scene = ship.parent;
  const token = explicitToken ?? passengerToken(scene, passenger, ship);
  if (!token || token.parent?.id !== scene.id || token.id === ship.id)
    throw Error('O tripulante precisa ter um token nesta cena. Se houver vários, selecione o token correto antes de embarcar.');
  if (!token.actor || token.actor.type === 'vehicle') throw Error('Veículos não podem embarcar como tripulantes.');
  const boarded = token.getFlag(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
  if (boarded) throw Error('Este personagem já está embarcado em um veículo.');
  const crew = normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  if (crew.some(entry => entry.tokenId === token.id)) return false;
  const entry = {
    tokenId: token.id,actorId:token.actorId,role:crew.some(x=>x.role==='pilot')?'passenger':'pilot',
    originalHidden:Boolean(token.hidden),originalX:Number(token.x),originalY:Number(token.y),
  };
  const updated = [...crew,entry];
  const visible = vehicleActor.getFlag(VEHICLE_SCOPE,VEHICLE_VISIBILITY_KEY);
  const seat = boardingPosition(ship,crew.length,scene.grid?.size ?? canvas.grid?.size ?? 100);
  // Update ship membership first so synchronizers can recover the passenger;
  // roll back the membership if the passenger cannot be updated.
  await ship.setFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY,updated);
  try {
    await token.update({
      ...seat,hidden:normalizeVehicleVisibility(visible)!=='visible',
      [`flags.${VEHICLE_SCOPE}.${VEHICLE_BOARD_KEY}`]:{vehicleTokenId:ship.id,vehicleActorId:vehicleActor.id,sceneId:scene.id},
    },{d616VehicleSync:true,movement:{method:'teleport'}});
  } catch(error) {
    await ship.setFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY,crew);
    throw error;
  }
  await grantVehicleCrewOwnership(vehicleActor, token.actor);
  return true;
}
export async function disembarkPassenger(vehicleActor, id) {
  requireGM();
  const ship = requireShip(vehicleActor);
  const scene = ship.parent;
  const crew = normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  const entry = crew.find(c => c.tokenId === id);
  if (!entry) return false;
  const token = scene.tokens?.get?.(id);
  if (token) {
    const size = scene.grid?.size ?? canvas.grid?.size ?? 100;
    await token.update({
      x:Math.round(Number(ship.x)+(Number(ship.width)||1)*size + size),
      y:Math.round(Number(ship.y)),elevation:Number(ship.elevation ?? 0),
      hidden:entry.originalHidden,
    },{d616VehicleSync:true,movement:{method:'teleport'}});
    await token.unsetFlag(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
  }
  await ship.setFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY,crew.filter(c=>c.tokenId!==id));
  // Access remains OWNER after disembarking; only the GM may change it manually.
  return true;
}
export async function setCrewRole(vehicleActor, tokenId, role) {
  requireGM(); const ship=requireShip(vehicleActor);
  const crew=normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  if (!crew.some(c=>c.tokenId===tokenId)) return false;
  const selectedRole=normalizeVehicleRole(role);
  const updated=crew.map(c => ({...c,role:c.tokenId===tokenId?selectedRole:
    (selectedRole==='pilot'&&c.role==='pilot'?'passenger':c.role)}));
  await ship.setFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY,updated);
  return true;
}
export async function setVehicleVisibility(vehicleActor, mode) {
  requireGM();
  const ship=vehicleTokenForActor(vehicleActor),scene=ship?.parent;
  const requested=normalizeVehicleVisibility(mode);
  const crew=normalizeVehicleCrew(ship?.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  const updates=ship ? seatOptions(scene,ship,crew,requested) : [];
  // Persist the vehicle-specific default even when the crew is empty.
  await vehicleActor.setFlag(VEHICLE_SCOPE,VEHICLE_VISIBILITY_KEY,requested);
  if (updates.length) await scene.updateEmbeddedDocuments('Token',updates,
    {d616VehicleSync:true,movement:{method:'teleport'}});
  return requested;
}
/**
 * Foundry 14 emits moveToken to every connected client with the ship's own
 * movement animation promise. Visually attach each visible crew token to the
 * ship's rendered position on the same canvas tick; do not start a second,
 * delayed token animation after updateToken. Only the active GM writes the
 * crew's final Document coordinates once the ship animation has completed.
 *
 * This avoids out-of-step followers for GM and players, while keeping the
 * existing per-scene crew flags and token ownership fully intact.
 */
const liveCrewFollowers = new Map();
export function followVehicleDuringMovement(ship, movement) {
  if (ship?.actor?.type !== 'vehicle' || !ship.parent) return;
  const crew = normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE, VEHICLE_CREW_KEY));
  if (!crew.length) return;
  const scene = ship.parent;
  const key = `${scene.id}/${ship.id}`;
  // Each movement segment supersedes its previous on-canvas follower.
  liveCrewFollowers.get(key)?.();
  const gridSize = scene.grid?.size ?? canvas?.grid?.size ?? 100;
  // Hidden tokens remain visible as translucent silhouettes to the GM. They
  // must follow the ship too, or the GM sees the crew trailing behind.
  const shipObject = ship.object ?? canvas?.tokens?.get?.(ship.id);
  const ticker = canvas?.app?.ticker;
  const followers = shipObject?.position && ticker?.add && ticker?.remove
    ? crew.map((member, seat) => {
      const token = scene.tokens?.get?.(member.tokenId);
      const object = token?.object ?? canvas?.tokens?.get?.(member.tokenId);
      const offset = boardingPosition({x:0,y:0,width:ship.width,height:ship.height}, seat, gridSize);
      return object?.position?.set ? {object, offset} : null;
    }).filter(Boolean) : [];
  let active = true;
  const drawTogether = () => {
    if (!active || !shipObject?.position) return;
    for (const {object, offset} of followers) {
      if (object.destroyed) continue;
      object.position.set(shipObject.position.x + offset.x, shipObject.position.y + offset.y);
    }
  };
  const cleanup = () => {
    if (!active) return;
    active = false;
    if (followers.length) ticker.remove(drawTogether);
    if (liveCrewFollowers.get(key) === cleanup) liveCrewFollowers.delete(key);
  };
  liveCrewFollowers.set(key, cleanup);
  // The native movement tween also runs on the canvas ticker. Run our visual
  // follower late in the frame, after the ship has advanced to its new point.
  // This follows the SAME interpolated position rather than triggering another
  // Token move/animation for the passengers.
  if (followers.length) {ticker.add(drawTogether, undefined, -1000);drawTogether();}
  const flush = async () => {
    // A newer segment may already be responsible for the crew; never write
    // stale positions from a superseded movement.
    if (!active) return;
    try {
      drawTogether();
      if (!isPrimaryGm()) return;
      const currentShip = scene.tokens?.get?.(ship.id);
      if (!currentShip) return;
      const destination = movement?.destination ?? {};
      const finalShip = {
        x:Number.isFinite(Number(destination.x)) ? Number(destination.x) : Number(currentShip.x),
        y:Number.isFinite(Number(destination.y)) ? Number(destination.y) : Number(currentShip.y),
        elevation:destination.elevation != null && Number.isFinite(Number(destination.elevation))
          ? Number(destination.elevation) : Number(currentShip.elevation ?? 0),
        width:currentShip.width,height:currentShip.height,
      };
      const patches = getBoardedCrewPatch(finalShip,
        normalizeVehicleCrew(currentShip.getFlag(VEHICLE_SCOPE, VEHICLE_CREW_KEY)),
        tokenCollection(scene),
        currentShip.actor?.getFlag?.(VEHICLE_SCOPE, VEHICLE_VISIBILITY_KEY),gridSize);
      // Keep the visual attachment active during the server round trip. If it
      // is removed before this write, the tokens can flicker back to the old
      // position (especially for hidden crew visible to the GM).
      if (patches.length) await scene.updateEmbeddedDocuments('Token',patches,
        {d616VehicleSync:true,animate:false,movement:{method:'teleport',animate:false}});
    } finally {
      cleanup();
    }
  };
  const end = movement?.animation?.ended;
  if (end?.then) void Promise.resolve(end).then(flush,cleanup)
    .catch(error=>console.error(MSG,'Falha na sincronização da tripulação',error));
  else void flush().catch(error=>console.error(MSG,error));
}
const syncInProgress = new Set();
export async function syncVehiclePassengers(ship, changed, options={}) {
  if (!isPrimaryGm() || options.d616VehicleSync) return;
  if (ship?.actor?.type !== 'vehicle') return;
  if (!['x','y','elevation','rotation'].some(k=>Object.hasOwn(changed ?? {},k))) return;
  const crew=normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  if (!crew.length) return;
  const key=`${ship.parent?.id}/${ship.id}`;
  if (syncInProgress.has(key)) return;
  syncInProgress.add(key);
  try {
    const scene=ship.parent;
    const visibility=ship.actor?.getFlag(VEHICLE_SCOPE,VEHICLE_VISIBILITY_KEY);
    const patches=seatOptions(scene,ship,crew,visibility);
    if (patches.length) await scene.updateEmbeddedDocuments('Token',patches,
      {d616VehicleSync:true,movement:{method:'teleport'}});
  } finally {syncInProgress.delete(key);}
}
export function guardBoardedTokenMovement(token,changes,options,userId) {
  if (options?.d616VehicleSync || !['x','y','elevation'].some(k=>Object.hasOwn(changes ?? {},k))) return;
  const boarded=token?.getFlag?.(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
  if (!boarded) return;
  // Cancel independent walking/dragging while boarded. Only the ship or the
  // disembark procedure may move passenger tokens.
  if (game.user?.id===userId) notify('Este token está embarcado. Desembarque antes de movimentá-lo.');
  return false;
}
/** Release passengers if a ship token is deleted, rather than stranding hidden tokens. */
export async function releaseDeletedVehicleToken(token) {
  if (!isPrimaryGm()) return;
  const scene=token?.parent;
  if (!scene) return;
  if (token.actor?.type==='vehicle') {
    const crew=normalizeVehicleCrew(token.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
    const size=scene.grid?.size ?? 100;
    for (const entry of crew) {
      const member=scene.tokens?.get?.(entry.tokenId);
      if (!member) continue;
      try {
        await member.update({
          x:Math.round(Number(token.x)+(Number(token.width)||1)*size+size),
          y:Math.round(Number(token.y)),
          hidden:entry.originalHidden,
        },{d616VehicleSync:true,movement:{method:'teleport'}});
        await member.unsetFlag(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
      }catch(error){console.error(MSG,'Falha ao liberar token após remoção de veículo',error);}
    }
    return;
  }
  const boarded=token.getFlag?.(VEHICLE_SCOPE,VEHICLE_BOARD_KEY);
  if (!boarded?.vehicleTokenId) return;
  const ship=scene.tokens?.get?.(boarded.vehicleTokenId);
  if (!ship) return;
  const crew=normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
  await ship.setFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY,crew.filter(c=>c.tokenId!==token.id));
}

export async function boardByUuid(actor,uuid) {
  if (!uuid) throw Error('Arraste um personagem ou token para a área Tripulação.');
  const doc=await fromUuid(uuid);
  const token=doc?.documentName==='Token' ? doc : null;
  const member=token?.actor ?? (doc?.documentName===GAME_ACTOR?doc:null);
  if (!member) throw Error('O documento arrastado não é um personagem ou token.');
  return boardPassenger(actor,member,token);
}
export function registerVehicleHooks() {
  if (typeof Hooks.once === 'function') Hooks.once('ready',()=>{
    if(!isPrimaryGm())return;
    void migrateLegacyActorResources(game.actors?.contents ?? [],true)
      .then(count=>{if(count) console.info(MSG,`Recursos calculados em ${count} fichas existentes.`);})
      .catch(error=>console.error(MSG,'Falha na migração de recursos',error));
  });
  Hooks.on('preCreateActor',(actor,data,_options,userId)=>{
    if (!D616_ACTOR_TYPES.has(actor?.type) || game.user?.id !== userId) return;
    const patch=initialActorResourcePatch(data,actor.system);
    if (patch) actor.updateSource(patch);
  });
  Hooks.on('preUpdateActor',(actor,changes,_options,userId)=>{
    if (!D616_ACTOR_TYPES.has(actor?.type) || game.user?.id !== userId) return;
    const patch=actorResourceUpdatePatch(actor,changes);
    if (patch) for (const [path,value] of Object.entries(patch)) {
      // Mutating the pending update is safe; do not cause a second Actor.update.
      foundry.utils.setProperty(changes,path,value);
    }
  });
  // A vehicle has no separate initiative; creating a combatant from its
  // token instead adds the crew, without using their canvas hidden state.
  const queuedVehicleCombat = new Set();
  const queuedCrewCleanup = new Set();
  // Native combat commands can also add a different token of an embarked
  // Actor. Keep a single turn for that Actor, without affecting NPC duplicates.
  Hooks.on('createCombatant',(combatant)=>{
    if(!isPrimaryGm())return;
    const combat=combatant?.parent ?? combatant?.combat ?? game.combat;
    const scene=combat?.scene ?? canvas?.scene;
    if(!combat || !scene)return;
    const actorId=combatantActorId(combatant,scene);
    if(!actorId)return;
    for(const ship of (scene.tokens?.contents ?? [])) {
      if(ship.actor?.type!=='vehicle')continue;
      const crew=normalizeVehicleCrew(ship.getFlag?.(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
      if(!crew.some(m=>m.actorId===actorId))continue;
      const key=`${combat.id}/${ship.id}`;
      if(queuedCrewCleanup.has(key))continue;
      queuedCrewCleanup.add(key);
      // Defer until the native batch is complete, then remove only duplicate
      // Combatants for people aboard this specific ship.
      setTimeout(async()=>{
        try {
          const current=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? []);
          const ids=duplicateCrewCombatantIds(ship,scene,current,combat.combatant?.id);
          if(ids.length)await combat.deleteEmbeddedDocuments('Combatant',ids);
        }catch(error){console.error(MSG,'Iniciativa duplicada de tripulante',error);}
        finally {queuedCrewCleanup.delete(key);}
      },0);
    }
  });
  Hooks.on('preCreateCombatant',(combatant,data,_options,userId)=>{
    const scene = canvas?.scene;
    const tokenId = data?.tokenId ?? combatant?.tokenId;
    const ship=scene?.tokens?.get?.(tokenId);
    if(!ship || ship.actor?.type!=='vehicle') {
      // A passenger already represented by any scene token/actor Combatant
      // must not be inserted for a second time through native tracker tools.
      const actorId=data?.actorId ?? ship?.actorId ?? scene?.tokens?.get?.(tokenId)?.actorId;
      const combat=combatant?.parent ?? game.combat;
      if(actorId && combat) {
        const embarked=(scene?.tokens?.contents ?? []).some(t=>t.actorId===actorId &&
          t.getFlag?.(VEHICLE_SCOPE,VEHICLE_BOARD_KEY)?.sceneId===scene.id);
        if(embarked) {
          const current=Array.from(combat.combatants?.contents ?? combat.combatants?.values?.() ?? []);
          if(current.some(c=>combatantActorId(c,scene)===String(actorId)))return false;
        }
      }
      return;
    }
    if(userId===game.user?.id && !isPrimaryGm()) {
      game.socket?.emit?.('system.multiverse-d616',{
        type:'d616VehicleCombatCrew',sceneId:scene.id,shipTokenId:ship.id,
        combatId:combatant?.parent?.id ?? game.combat?.id,requesterId:game.user.id,
      });
      return false;
    }
    if(isPrimaryGm() && userId===game.user?.id) {
      const combat=combatant?.parent ?? game.combat;
      const key=`${combat?.id}:${ship.id}`;
      if(!queuedVehicleCombat.has(key)){
        queuedVehicleCombat.add(key);
        // Creating Combatants from inside a preCreate transaction can race
        // the parent createDocuments call; run after the current transaction.
        setTimeout(()=>{
          queuedVehicleCombat.delete(key);
          void addVehicleCrewToCombat(combat,ship).catch(error=>console.error(MSG,'Iniciativa de tripulantes',error));
        },0);
      }
    }
    return false; // never add a vehicle as another character in initiative
  });
  game.socket?.on?.('system.multiverse-d616',async (data,senderId)=>{
    if(!isPrimaryGm() || !['d616VehicleDisembark','d616VehicleCombatCrew'].includes(data?.type))return;
    const callerId=String(data.requesterId??'');
    if(typeof senderId==='string' && senderId!==callerId)return;
    const caller=game.users?.get?.(callerId);
    const scene=game.scenes?.get?.(data.sceneId);
    const ship=scene?.tokens?.get?.(data.shipTokenId);
    if(!caller?.active || !ship || ship.actor?.type!=='vehicle')return;
    const entries=normalizeVehicleCrew(ship.getFlag(VEHICLE_SCOPE,VEHICLE_CREW_KEY));
    if(data.type==='d616VehicleCombatCrew') {
      const canRequest=caller.isGM || ship.actor?.testUserPermission?.(caller,3);
      const combat=game.combats?.get?.(data.combatId) ?? game.combat;
      if(!canRequest || !combat || (combat.scene?.id && combat.scene.id!==scene.id))return;
      try{await addVehicleCrewToCombat(combat,ship);}
      catch(error){console.error(MSG,'Iniciativa solicitada pelo jogador',error);}
      return;
    }
    const member=scene?.tokens?.get?.(data.memberTokenId);
    if(!member || !(caller.isGM || member.actor?.testUserPermission?.(caller,3)))return;
    if(!entries.some(entry=>entry.tokenId===member.id && entry.actorId===member.actorId))return;
    try{await disembarkPassenger(ship.actor,member.id);}
    catch(error){console.error(MSG,'Desembarque solicitado pelo jogador',error);}
  });
  Hooks.on('preUpdateToken',guardBoardedTokenMovement);
  Hooks.on('deleteToken',(token)=>{
    void releaseDeletedVehicleToken(token).catch(error=>console.error(MSG,error));
  });
  // Native v14 movement animates the ship separately from document updates.
  // Moving the crew here caused a visibly late second animation. Their live
  // positioning and final snapshot are instead handled by moveToken.
  Hooks.on('moveToken',(token,movement)=>{
    followVehicleDuringMovement(token,movement);
  });
  Hooks.on('updateToken',(token,changes,options)=>{
    if (Object.hasOwn(changes??{},'x') || Object.hasOwn(changes??{},'y')) return;
    // Changes to elevation/rotation without planar motion still use the
    // existing immediate synchronizer.
    void syncVehiclePassengers(token,changes,options).catch(err=>console.error(MSG,err));
  });
  // The GM can also use this API from a macro or another D616 component.
  game.multiverseD616 ??={};
  Object.assign(game.multiverseD616.vehicles ??={}, {
    boardPassenger,disembarkPassenger,setCrewRole,setVehicleVisibility,
    vehicleTokenForActor,crewContext,hudVehicleContext,requestVehicleDisembark,addVehicleCrewToCombat,rollVehicleCrewInitiative,
  });
}
