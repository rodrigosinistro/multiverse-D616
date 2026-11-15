/**
 * Team Maneuvers — pure, Foundry-independent selection and preflight helpers.
 * The maneuver definitions remain owned by CONFIG.MULTIVERSE_D616.teamManeuvers.
 */
export function combatTeamMembers(combat) {
  const collection = combat?.combatants;
  const combatants = Array.isArray(collection) ? collection
    : Array.from(collection?.values?.() ?? collection?.contents ?? []);
  const used = new Set();
  const result = [];
  for (const combatant of combatants) {
    const actor = combatant?.actor;
    if (!actor || !['character','npc'].includes(actor.type)) continue;
    // A linked token and another Combatant for that same Actor cannot spend
    // from the same Focus pool twice. Synthetic Token Actors have unique UUIDs.
    const poolId = String(actor.uuid || `Actor.${actor.id ?? ''}`);
    if (!poolId || used.has(poolId)) continue;
    used.add(poolId);
    result.push({id:String(combatant.id),actor,combatant,
      name:String(combatant.name || actor.name || 'Personagem'),poolId,
      rank:Number(actor.system?.attributes?.rank?.value ?? 0),
      focus:Number(actor.system?.focus?.value ?? 0)});
  }
  return result;
}

export function findTeamManeuver(catalog, type, level) {
  const entry=(Array.isArray(catalog)?catalog:[])
    .find(m => String(m?.maneuverType).toLowerCase()===String(type).toLowerCase());
  const tier=entry?.levels?.find(item=>Number(item.level)===Number(level));
  if (!entry || !tier) throw new Error('Manobra de equipe ou nível não encontrado no catálogo do sistema.');
  const cost=Number(String(tier.cost || '').match(/\d+/)?.[0]);
  if (!Number.isInteger(cost) || cost<0) throw new Error('Custo de Focus inválido para a manobra.');
  return {type:entry.maneuverType,level:Number(tier.level),cost,
    description:String(tier.description || ''),rankRange:Array.isArray(tier.rankAvg)?tier.rankAvg:[]};
}

export function planTeamManeuver(members, ids, catalog, type, level) {
  const maneuver=findTeamManeuver(catalog,type,level);
  const byId=new Map((members??[]).map(m=>[String(m.id),m]));
  const chosen=[...new Set((ids??[]).map(String))].map(id=>byId.get(id));
  if (chosen.some(m=>!m)) throw new Error('Um participante saiu do combate. Reabra o assistente.');
  if (chosen.length<2) throw new Error('Escolha pelo menos dois participantes distintos.');
  const pools = chosen.map(m => String(m.poolId || m.actor?.uuid || m.actor?.id || m.id));
  if (new Set(pools).size!==pools.length) throw new Error('Um mesmo personagem foi selecionado mais de uma vez.');
  for (const member of chosen) {
    if (!Number.isFinite(member.rank) || member.rank<1) throw new Error(`Rank inválido: ${member.name}.`);
    if (!Number.isFinite(member.focus) || member.focus<maneuver.cost)
      throw new Error(`${member.name} precisa de ${maneuver.cost} Focus e tem apenas ${Math.max(0,Number(member.focus)||0)}.`);
  }
  const averageRank=chosen.reduce((sum,m)=>sum+m.rank,0)/chosen.length;
  const [low,high]=maneuver.rankRange;
  const rankWithinRange=Number.isFinite(Number(low)) && Number.isFinite(Number(high))
    && averageRank>=Number(low) && averageRank<=Number(high);
  return {maneuver,participants:chosen,averageRank,rankWithinRange,
    totalCost:maneuver.cost*chosen.length};
}

/** Portuguese display text; source catalog stays unchanged for compatibility. */
const TEAM_MANEUVER_DESCRIPTIONS = Object.freeze({
  Offensive: Object.freeze({
    1: 'Todos os participantes recebem 1 Edge em qualquer ataque que realizarem nesta rodada.',
    2: 'Cada participante pode rolar novamente todos os dados de qualquer ataque que realizar nesta rodada e usar o melhor resultado.',
    3: 'Cada participante pode transformar o dado Marvel em um sucesso Fantástico nos ataques desta rodada contra alvos de Rank igual ou superior.',
  }),
  Defensive: Object.freeze({
    1: 'Todos os participantes recebem Redução de Dano 2 durante esta rodada.',
    2: 'Todos os participantes recebem Redução de Dano 4 durante esta rodada.',
    3: 'Todos os participantes recebem Redução de Dano 8 durante esta rodada.',
  }),
  Rally: Object.freeze({
    1: 'Todas as ações realizadas contra os participantes sofrem Trouble nesta rodada.',
    2: 'Cada participante pode realizar um teste de Recuperação Rápida para Health ou Focus, como se tivesse gasto 1 ponto de Karma.',
    3: 'Um único participante morto ou despedaçado durante o combate recupera Health e Focus até, no mínimo, 0.',
  }),
});

export function teamManeuverDescription(maneuver) {
  return TEAM_MANEUVER_DESCRIPTIONS[maneuver?.type]?.[Number(maneuver?.level)]
    ?? String(maneuver?.description ?? '');
}
