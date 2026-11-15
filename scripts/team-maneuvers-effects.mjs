/** Team Maneuvers: combat-scoped, round-scoped benefits (Foundry VTT v14).
 * All clients read the combat flags. No permanent Actor flags or conditions.
 * Offensive 1/2/3 and Defensive 1/2/3 are implemented; Rally is descriptive.
 */
const SYSTEM = 'multiverse-d616';
const KEY = 'activeTeamManeuvers';
// Serialize flag writes made by this client. A delayed round-cleanup must never
// overwrite an activation committed while the cleanup was still in flight.
const pendingFlagWrites = new WeakMap();
async function queueFlagWrite(combat, operation) {
  const previous = pendingFlagWrites.get(combat) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  pendingFlagWrites.set(combat, current);
  try { return await current; }
  finally {
    if (pendingFlagWrites.get(combat) === current) pendingFlagWrites.delete(combat);
  }
}
function recordMatchesRound(combat, record) {
  return combat?.started !== false &&
    String(combat?.id) === String(record?.combatId) &&
    Number.isFinite(Number(combat?.round)) &&
    Number(combat.round) === Number(record?.round);
}


export function storedTeamManeuvers(combat) {
  const entries = combat?.getFlag?.(SYSTEM, KEY) ?? combat?.flags?.[SYSTEM]?.[KEY];
  return Array.isArray(entries) ? entries : [];
}

export function activeTeamManeuvers(combat) {
  if (!combat || combat.started === false) return [];
  const round = Number(combat.round);
  if (!Number.isFinite(round)) return [];
  return storedTeamManeuvers(combat).filter(entry =>
    Number(entry?.round) === round &&
    String(entry?.combatId) === String(combat.id));
}

export function teamManeuverAttackEdge(actor, combat=globalThis.game?.combat) {
  if (!actor?.uuid) return null;
  const eligible = activeTeamManeuvers(combat).some(entry =>
    entry.type === 'Offensive' && Number(entry.level) === 1 &&
    (entry.actorUuids ?? []).includes(String(actor.uuid)));
  return eligible
    ? {source:'Manobra de Equipe: Ofensiva — Nível 1',
        reason:'1 Edge em ataques nesta rodada', sign:1}
    : null;
}

/** Combat-bound benefits; the stored flags are never copied to actors permanently. */
export function actorTeamManeuverLevels(actor,type,combat=globalThis.game?.combat) {
  if (!actor?.uuid) return [];
  const levels = activeTeamManeuvers(combat)
    .filter(entry => entry.type === type &&
      (entry.actorUuids ?? []).includes(String(actor.uuid)))
    .map(entry => Number(entry.level))
    .filter(level => Number.isInteger(level) && level >= 1 && level <= 3);
  return [...new Set(levels)].sort((a,b)=>a-b);
}

/** Defense is a minimum DR while the maneuver lasts, not a cumulative bonus. */
export function teamManeuverDamageReduction(actor, combat=globalThis.game?.combat) {
  const levels = actorTeamManeuverLevels(actor,'Defensive',combat);
  return Math.max(0, ...levels.map(level => ({1:2,2:4,3:8})[level] ?? 0));
}

export function effectiveTeamDamageReduction(actor, category='health', combat=globalThis.game?.combat) {
  const field=category==='focus'?'focusDamageReduction':'healthDamageReduction';
  const base=Math.max(0,Number(actor?.system?.[field])||0);
  return Math.max(base,teamManeuverDamageReduction(actor,combat));
}

/** Snapshot attack permissions at creation, so later combat rounds cannot rewrite history. */
export function teamAttackSnapshot(actor,combat=globalThis.game?.combat) {
  const levels=actorTeamManeuverLevels(actor,'Offensive',combat);
  if (!levels.length) return null;
  return {combatId:String(combat.id),round:Number(combat.round),
    actorUuid:String(actor.uuid),attackerRank:Number(actor.system?.attributes?.rank?.value ?? 0),
    levels};
}

/** When every MARKED target is eligible, commit the Marvel M in the actual
 * roll itself before posting the attack. This keeps the red die, total,
 * Fantastic, damage and conditions visibly in sync, including when the
 * player chooses to reuse the already marked target. If ranks are mixed,
 * keep a normal shared roll and apply the M only per eligible target.
 * Callers must also check that every marked token resolved to an Actor.
 */
export function teamOffensive3ForcesRoll(actor, targetActors, combat=globalThis.game?.combat) {
  const snapshot=teamAttackSnapshot(actor,combat);
  if(!snapshot?.levels?.includes(3) || !Array.isArray(targetActors) || !targetActors.length)
    return false;
  const rank=Number(snapshot.attackerRank);
  return Number.isFinite(rank) && rank>=1 && targetActors.every(target=>{
    const targetRank=Number(target?.system?.attributes?.rank?.value);
    return Number.isFinite(targetRank) && targetRank>=rank;
  });
}

/** Rank-gated Fantastic result, evaluated separately for every target. */
export function teamFantasticAdjustment(snapshot,targetRank,marvelValue) {
  if (!snapshot?.levels?.includes(3)) return null;
  const attackerRank=Number(snapshot.attackerRank), rank=Number(targetRank);
  if (!Number.isFinite(attackerRank)||attackerRank<1 || !Number.isFinite(rank)||rank<attackerRank)
    return null;
  const oldValue=Number(marvelValue);
  if (!Number.isFinite(oldValue)||oldValue<1||oldValue>6)return null;
  return {fantastic:true,delta:6-oldValue,rank};
}

/** Return kept Marvel die value; natural Marvel face=1 counts as 6 points. */
export function keptMarvelValue(roll) {
  const first=roll?.terms?.[0];
  const pool=first?.roll?.terms?.[0]?.rolls?first.roll.terms[0]:first?.rolls?first:null;
  const die=pool?.rolls?.[1]?.dice?.[0]??pool?.rolls?.[1]?.terms?.[0];
  const kept=die?.results?.find(x=>x.active&&!x.discarded)??die?.results?.[0];
  return kept ? Number(kept.result)===1?6:Number(kept.count??kept.result) : NaN;
}

export function teamFantasticForTarget(roll, message, targetActor) {
  const flag=message?.getFlag?.(SYSTEM,'teamAttackBenefits')??
    message?.flags?.[SYSTEM]?.teamAttackBenefits;
  if (!flag || !targetActor) return null;
  return teamFantasticAdjustment(flag,targetActor.system?.attributes?.rank?.value,keptMarvelValue(roll));
}

/** Keep effects unique by team, type, level and round to avoid double charging. */
export function sameTeamManeuver(entry, next) {
  return String(entry?.combatId)===String(next.combatId) &&
    Number(entry?.round)===Number(next.round) &&
    entry?.type===next.type && Number(entry?.level)===Number(next.level) &&
    JSON.stringify([...(entry?.actorUuids ?? [])].sort())===
      JSON.stringify([...(next.actorUuids ?? [])].sort());
}

export function maneuverRecord(combat, plan) {
  return {
    combatId:String(combat.id), round:Number(combat.round),
    type:plan.maneuver.type,level:plan.maneuver.level,
    actorUuids:plan.participants.map(p=>String(p.actor.uuid)),
    combatantIds:plan.participants.map(p=>String(p.id)),
  };
}

export async function storeTeamManeuver(combat, record) {
  if (typeof combat?.setFlag !== 'function')
    throw new Error('O combate não permite salvar o benefício da manobra. O Focus não será gasto.');
  return queueFlagWrite(combat, async () => {
    if (!recordMatchesRound(combat,record))
      throw new Error('A rodada mudou durante a manobra. O Focus será restaurado.');
    const current=storedTeamManeuvers(combat).filter(entry=>
      Number(entry?.round)===Number(record.round) &&
      String(entry?.combatId)===String(record.combatId));
    if(current.some(entry=>sameTeamManeuver(entry,record)))
      throw new Error('Esta manobra já foi confirmada para os mesmos participantes nesta rodada.');
    await combat.setFlag(SYSTEM,KEY,[...current,record]);
    if (!recordMatchesRound(combat,record)) {
      // Foundry's setFlag is asynchronous: a GM may advance the round while
      // the flag is being persisted. Remove only this stale entry before the
      // caller refunds Focus, even if the round later gets rewound.
      try {
        const latest=storedTeamManeuvers(combat);
        if (latest.some(entry=>sameTeamManeuver(entry,record)))
          await combat.setFlag(SYSTEM,KEY,latest.filter(entry=>!sameTeamManeuver(entry,record)));
      } catch (cleanupError) {
        console.error('[D616 Team Maneuvers] Falha ao limpar manobra de rodada anterior',cleanupError);
        throw new Error('A rodada mudou e o benefício antigo não pôde ser limpo. Confira as manobras no combate; o Focus será restaurado.');
      }
      throw new Error('A rodada mudou durante a manobra. O Focus será restaurado.');
    }
  });
}

/** Remove stale combat flags after a change of round; the resolver also checks
 * current round synchronously so an async cleanup can never extend a buff. */
export function registerTeamManeuverRoundHooks() {
  globalThis.Hooks?.on?.('updateCombat', (combat, change) => {
    if (!Object.prototype.hasOwnProperty.call(change??{}, 'round') ||
        !globalThis.game?.user?.isGM) return;
    // Read flags *inside* the serialized operation: a snapshot taken when the
    // hook fires can become stale before the asynchronous setFlag completes.
    void queueFlagWrite(combat, async () => {
      const old=storedTeamManeuvers(combat);
      const remaining=activeTeamManeuvers(combat);
      if (old.length!==remaining.length && typeof combat.setFlag==='function')
        await combat.setFlag(SYSTEM,KEY,remaining);
    }).catch(error=>
      console.warn('[D616 Team Maneuvers] Não foi possível limpar efeitos expirados:',error));
  });
}
