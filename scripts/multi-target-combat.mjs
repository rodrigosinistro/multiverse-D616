/** Per-target adjudication for a single Marvel Multiverse attack roll.
 * This module never rolls dice, changes targeting or spends resources.
 * v0.2.44: one attack, separate defenses, hit decisions, damage/conditions.
 */
export const MULTI_TARGET_DECISION_KEY = 'multiTargetDecisions';

export function normalizeTargetDecision(value) {
  return value === 'hit' || value === 'miss' ? value : null;
}

/**
 * When the original single roll cannot include different target-specific
 * Edge/Trouble, avoid silently guessing the outcome. The GM adjudicates that
 * target before damage or power conditions can apply.
 */
export function adjudicateTargetOutcome(outcome, {requiresReview=false, decision=null}={}) {
  const chosen=normalizeTargetDecision(decision);
  if (!outcome) return {success:false,fantastic:false,pending:false,label:'DEFESA INDISPONÍVEL'};
  if (requiresReview && !chosen) return {...outcome,success:false,pending:true,label:'REVISAR EDGE/TROUBLE'};
  if (chosen) {
    const success=chosen==='hit';
    return {...outcome,success,pending:false,adjudicated:true,
      label:success?(outcome.fantastic?'SUCESSO FANTÁSTICO':'SUCESSO'):'FALHA (MESTRE)'};
  }
  return {...outcome,pending:false,adjudicated:false};
}

export function targetResultsReady(results) {
  return !results.some(result=>result?.pending);
}

export function filterHitTargets(targets, resultByUuid) {
  return targets.filter(({ref})=>resultByUuid.get(ref?.uuid)?.success===true);
}

/** Snapshot of roll values to prevent applying an obsolete damage card after
 * a retroactive Edge/Trouble reroll. Independent of ChatMessage id and time.
 */
export function rollSignature(roll) {
  if (!roll) return '';
  const first=roll.terms?.[0];
  const pool=first?.roll?.terms?.[0]?.rolls ? first.roll.terms[0] : first?.rolls ? first : null;
  const dice=(pool?.rolls??[]).map(r=>{
    const die=r?.terms?.find?.(x=>Array.isArray(x?.results))??r?.dice?.find?.(x=>Array.isArray(x?.results));
    return (die?.results??[]).filter(x=>x.active&&!x.discarded)
      .map(x=>Number(x.result)).join(',');
  });
  return JSON.stringify({total:Number(roll.total),dice,forced:Boolean(roll.options?.forceMarvelM)});
}

export function damageCardStillCurrent(damageFlags, sourceRoll, decisions=null) {
  if (!damageFlags?.rollSignature) return true; // legacy card
  if(damageFlags.rollSignature!==rollSignature(sourceRoll))return false;
  if(damageFlags.targetDecisionSignature!==undefined){
    return damageFlags.targetDecisionSignature===JSON.stringify(decisions??{});
  }
  return true;
}
