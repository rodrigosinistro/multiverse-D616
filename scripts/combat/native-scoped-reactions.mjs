/**
 * D616 v0.2.209 — correct allocation of extra Reactions by Power Set.
 *
 * Always Ready (Martial Arts) and Fast Hands (Ranged Weapons) provide one
 * restricted use each. Reserve the appropriate restricted use FIRST whenever
 * the current power is eligible, leaving generic Reactions for powers in other
 * sets. Keep an ordered, GM-authored spend ledger so a failed activation or
 * manual refund reverses the actual last spend, regardless of its type.
 */
import {classifyItemAction} from './turn-tracker-core.mjs';

const RULES=Object.freeze({
  'Martial Arts':'Always Ready',
  'Ranged Weapons':'Fast Hands',
});
export const GENERIC_REACTION='general';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
export function nativeReactionScopes(actor){
  const result=[];
  for(const [powerSet,name] of Object.entries(RULES)){
    if(list(actor?.items).some(item=>item?.type==='power'&&item.name===name&&item.system?.powerSet===powerSet))
      result.push(powerSet);
  }
  return result;
}
export function nativeReactionUsage(raw){
  return Array.isArray(raw)?[...new Set(raw.filter(scope=>Object.hasOwn(RULES,String(scope))))].slice(0,2):[];
}

/**
 * In v208, the generic use was always spent first, and only scoped uses were
 * stored. Infer the previous order from those existing flags on the first
 * read, without deleting combat resources when upgrading a world mid-round.
 */
export function nativeReactionSpendOrder({state}={}){
  const used=Number(state?.reactionUsed)||0;
  const scopes=nativeReactionUsage(state?.scopedReactionUsed);
  const raw=state?.reactionSpendOrder;
  if(Array.isArray(raw)&&raw.length===used&&raw.every(s=>s===GENERIC_REACTION||Object.hasOwn(RULES,s))&&
    JSON.stringify(raw.filter(s=>s!==GENERIC_REACTION))===JSON.stringify(scopes))return [...raw];
  const genericCount=Math.max(0,Math.min(20,Math.floor(used-scopes.length)));
  return [...Array(genericCount).fill(GENERIC_REACTION),...scopes];
}

export function nativeScopedReactionDecision({actor,state,itemId,genericMax}={}){
  const scopes=nativeReactionScopes(actor);
  const max=Number(genericMax);
  if(!Number.isFinite(max)||max<1)return {ok:false,reason:'Controle de Reações inválido.'};
  const used=Number(state?.reactionUsed)||0;
  const history=nativeReactionUsage(state?.scopedReactionUsed);
  if(!Number.isInteger(used)||used<0||used<history.length||used>max+scopes.length||used-history.length>max||history.some(s=>!scopes.includes(s)))
    return {ok:false,reason:'Histórico de Reações inconsistente. Peça ao Mestre para revisar o turno.'};
  const genericUsed=used-history.length;
  // Some existing native controllers call consumeReaction() without an Item.
  // They may use a generic slot, but NEVER a set-restricted bonus.
  if(!itemId){
    return genericUsed<max?{ok:true,scope:null}:
      {ok:false,reason:'A Reação comum está esgotada; este uso não identifica um poder elegível às Reações extras.'};
  }
  const item=typeof actor?.items?.get==='function'?actor.items.get(itemId):
    list(actor?.items).find(i=>i.id===itemId);
  if(item?.type!=='power'||!classifyItemAction(item).resources.includes('reaction'))
    return {ok:false,reason:'Não foi possível identificar um poder de Reação possuído pelo personagem.'};
  const powerSet=item.system?.powerSet;
  // A qualifying power should use its own extra Reaction *before* the generic
  // bank. Otherwise using it first could wrongly block Shield Deflection or
  // another ordinary Reaction on the next incoming attack.
  if(scopes.includes(powerSet)&&!history.includes(powerSet))
    return {ok:true,scope:powerSet};
  if(genericUsed<max)return {ok:true,scope:null};
  const label=Object.hasOwn(RULES,powerSet)?RULES[powerSet]:null;
  if(label&&history.includes(powerSet))
    return {ok:false,reason:`A Reação extra de ${label} já foi usada; a Reação comum também está esgotada.`};
  return {ok:false,reason:`Reação comum esgotada. As Reações extras restantes só podem ativar poderes de Artes Marciais (Always Ready) ou Armas à Distância (Fast Hands).`};
}

export function nativeRefundReactionHistory({state}={}){
  const order=nativeReactionSpendOrder({state});
  return nativeReactionUsage(order.slice(0,-1));
}
