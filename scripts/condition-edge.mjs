/** Multiverse-D616 v0.2.23 — situational Edge/Trouble from D616 statuses.
 * Derived from data/conditions.json. Pure resolver + Foundry roll integration.
 * Situational sight/hearing and unresolved multi-target modifiers are NEVER guessed.
 */
const SYSTEM = 'multiverse-d616';
const PREFIX = 'mmrpg.';
import { isPowerGrabbed, hasPhysicalGrab } from './power-grabbed.mjs';
const labels = Object.freeze({
  'mmrpg.pinned':'Imobilizado','mmrpg.prone':'Caído',
  'mmrpg.restrained':'Restrito','mmrpg.blinded':'Cego',
  'mmrpg.demoralized':'Desmoralizado','mmrpg.stunned':'Atordoado',
  'mmrpg.shattered':'Arrasado','mmrpg.exhausted':'Exausto',
  'mmrpg.grabbed':'Agarrado', 'mmrpg.power-grabbed':'Agarrado — Poder',
});
function values(collection){return Array.from(collection?.contents??collection?.values?.()??collection??[]);}
export function statusIds(actor){
  const found=new Set();
  for(const status of values(actor?.statuses)){
    const id=String(status?.id??status??'').toLowerCase();
    if(id.startsWith(PREFIX))found.add(id);
  }
  for(const effect of values(actor?.effects)){
    if(effect?.disabled||effect?.duration?.expired===true)continue;
    for(const status of values(effect?.statuses)){
      const id=String(status?.id??status??'').toLowerCase();
      if(id.startsWith(PREFIX))found.add(id);
    }
  }
  return found;
}
function abilityCode(value){
  const name=String(value??'').toLowerCase();
  return ({melee:'mle',agility:'agl',resilience:'res',vigilance:'vig',logic:'log',ego:'ego'})[name]??name;
}
function attackType(kind,ability,attack){
  if(!attack)return 'check';
  const value=String(kind??'').toLowerCase();
  if(value==='close'||value==='melee')return 'close';
  if(value==='ranged')return 'ranged';
  // A Melee check is a close attack only when explicit information is missing.
  if(!value&&abilityCode(ability)==='mle')return 'close';
  return value||'unspecified';
}
function describe(source,reason,sign){return {source,reason,sign};}
/**
 * @param {object} context
 *  actor: roller; targetActors: actors targeted in this ONE roll;
 *  baseMode: old power/Force modifier already folded by getElementalEdgeMode;
 *  attack: true for an actual attack, NOT for generic non-damaging checks;
 *  action: 'standard'/'reaction'/...;
 *  targeted: true for targeted attacks, false for untargeted attacks.
 */
export function resolveConditionEdges({actor,targetActors=[],ability='',attack=false,action='standard',kind='',targeted=false,baseMode=0}={}){
  const own=statusIds(actor), ab=abilityCode(ability), type=attackType(kind,ability,attack);
  const matches=[];
  const add=(sign,where,id,reason)=>matches.push(describe(`${where}: ${labels[id]??id}`,reason,sign));
  for(const id of ['mmrpg.demoralized','mmrpg.exhausted'])if(own.has(id))add(-1,'Atacante',id,'Trouble em todos os testes');
  if(['standard','reaction'].includes(String(action).toLowerCase())){
    if(own.has('mmrpg.stunned'))add(-1,'Atacante','mmrpg.stunned','Trouble em ações padrão/Reações');
    else if(own.has('mmrpg.shattered'))add(-1,'Atacante','mmrpg.shattered','Efeito permanente de Atordoado');
  }
  // Elemental Force is an ActiveEffect with a custom rule rather than a
  // CONFIG.statusEffects status. Count that source once, NOT in baseMode too.
  const forceTrouble=values(actor?.effects).some(e=>!e.disabled&&e?.duration?.expired!==true&&
    e.flags?.[SYSTEM]?.elementalFantastic?.custom==='forceTrouble');
  if(forceTrouble)matches.push(describe('Atacante: Elemento Force','Trouble elemental temporário',-1));
  if((ab==='mle'||ab==='agl')&&own.has('mmrpg.pinned'))add(-1,'Atacante','mmrpg.pinned','Trouble em Melee/Agility');
  if(attack){
    if(ab==='mle'&&own.has('mmrpg.prone'))add(-1,'Atacante','mmrpg.prone','Trouble em ataques Melee');
    if(hasPhysicalGrab(actor))add(targeted?-1:1,'Atacante','mmrpg.grabbed',targeted?'Trouble em ataque contra alvo específico':'Edge em ataque sem alvo específico');
  }
  // A single shared roll can use target modifiers only when every target has
  // the same NET modifier. The condition names need not match (e.g. a prone
  // target and a blinded target may each grant exactly one Edge).
  // Truly different net modifiers remain subject to Narrator adjudication;
  // never silently choose a reroll for one target and apply it to the others.
  let ambiguousTargets=false;
  let targetSourcesDiffer=false;
  if(attack&&targetActors.length){
    const targetEntries=targetActors.map(target=>{
      const s=statusIds(target),list=[];
      const targetAdd=(sign,id,reason)=>list.push(describe(`Alvo: ${labels[id]??id}`,reason,sign));
      if(isPowerGrabbed(target))targetAdd(1,'mmrpg.power-grabbed','Alvo contido por poder: 1 Edge para acertá-lo');
      if(s.has('mmrpg.restrained'))targetAdd(1,'mmrpg.restrained','Ataques contra Restrito têm Edge');
      if(s.has('mmrpg.stunned')||s.has('mmrpg.shattered'))targetAdd(1,s.has('mmrpg.stunned')?'mmrpg.stunned':'mmrpg.shattered','Ataques contra Atordoado têm Edge');
      if(s.has('mmrpg.blinded'))targetAdd(1,'mmrpg.blinded','Ataques contra Cego têm Edge');
      if(s.has('mmrpg.prone')){
        if(type==='close')targetAdd(1,'mmrpg.prone','Ataques próximos contra Caído têm Edge');
        if(type==='ranged')targetAdd(-1,'mmrpg.prone','Ataques à distância contra Caído têm Trouble');
      }
      return list;
    });
    const sig=l=>l.map(x=>`${x.sign}|${x.source}|${x.reason}`).sort().join(';');
    const total=l=>l.reduce((n,entry)=>n+entry.sign,0);
    const firstNet=total(targetEntries[0]);
    targetSourcesDiffer=targetEntries.some(list=>sig(list)!==sig(targetEntries[0]));
    ambiguousTargets=targetEntries.some(list=>total(list)!==firstNet);
    if(!ambiguousTargets){
      if(!targetSourcesDiffer)matches.push(...targetEntries[0]);
      else {
        // Preserve the common numeric modifier, not an arbitrary first
        // target's condition name. The card will show each actual source.
        for(let n=0;n<Math.abs(firstNet);n++)matches.push(describe(
          `Alvos: modificador equivalente ${n+1}`,
          'Mesmo Edge/Trouble líquido; condições específicas por alvo',Math.sign(firstNet)));
      }
    }
  }
  // Edge and Trouble cancel one another. Distinct condition origins count once,
  // and duplicates from multiple effects bearing the same status are deduped.
  const unique=[...new Map(matches.map(e=>[`${e.source}|${e.reason}|${e.sign}`,e])).values()];
  const edges=unique.filter(x=>x.sign>0).length;
  const troubles=unique.filter(x=>x.sign<0).length;
  const base=Math.sign(Number(baseMode)||0);
  const net=base+edges-troubles;
  return {
    edgeMode:Math.sign(net), net, edges, troubles, baseMode:base,
    sources:unique, ambiguousTargets, targetSourcesDiffer,
    requiresDecision:ambiguousTargets||Math.abs(net)>1,
    // Automatic processing is limited to one net modifier: stacked rerolls
    // depend on Narrator stacking decisions and are shown for manual handling.
    autoCount:Math.abs(net)===1&&!ambiguousTargets?1:0,
  };
}
/** Return the current targeted actors, without changing Foundry targets. */
export function localTargetActors(){
  const tokens=values(game?.user?.targets);
  return tokens.map(t=>t?.actor??t?.document?.actor).filter(Boolean);
}
/** Calculate roll result die index for mandatory Trouble, preserving M priority. */
export function mandatoryTroubleDieIndex(roll,{skipMarvel=false}={}){
  const first=roll?.terms?.[0];
  const pool=first?.roll?.terms?.[0]?.rolls?first.roll.terms[0]:first?.rolls?first:null;
  if(!pool||pool.rolls.length!==3)return null;
  const score=(term,index)=>{
    const die=term?.terms?.[0]??term?.dice?.[0];
    const kept=die?.results?.find(x=>x.active&&!x.discarded)??die?.results?.[0];
    if(!kept)return -1;
    if(index===1&&Number(kept.result)===1)return 100;
    return Number(kept.result)||0;
  };
  const scores=pool.rolls.map(score);
  // Ultimate Fantastic 6M6 cannot be degraded by Trouble.
  if(scores[0]===6&&scores[1]===100&&scores[2]===6&&
     !roll?.options?.forceMarvelM&&!roll?.options?.combatTrickery)return null;
  if(skipMarvel)scores[1]=-1;
  return scores.indexOf(Math.max(...scores));
}
/** Called after the initial message exists, once per condition roll.
 * Trouble is mandatory. Edge stays selectable using existing dice controls:
 * deciding which die to reroll is the player's rule-granted choice.
 */
export async function resolveConditionReroll(message,context){
  if(!message||!context?.autoCount||context?.edgeMode===0)return;
  if(context.edgeMode<0){
    const index=mandatoryTroubleDieIndex(message.rolls?.[0],{
      skipMarvel:Boolean(message.getFlag?.(SYSTEM,'combatTrickery')?.noMarvelTrouble),
    });
    if(index===null)return; // ultimate Fantastic or unsupported dice; do not guess
    try {await message._handleChatButton?.('trouble',message.id,index,false,message.flavor);}
    catch(error){console.warn('[D616] Trouble automático falhou; use o botão TROUBLE no card',error);}
  }
  // Edge: leave player in control of die selection (existing EDGE buttons).
}
export function registerConditionEdgeHooks(){
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const context=message?.getFlag?.(SYSTEM,'conditionEdges');
    if(!context?.sources?.length||!html?.querySelector||html.querySelector('.d616-condition-edge'))return;
    const container=html.querySelector('.message-content');if(!container)return;
    const note=document.createElement('div');note.className='d616-condition-edge';
    const net=Number(context.net||0);
    const sourceSummary=context.sources.length
      ?context.sources.map(s=>`${s.source} (${s.sign>0?'Edge':'Trouble'})`).join(' • ')
      :'Sem Edge/Trouble líquido de condições';
    note.textContent=`Condições: ${sourceSummary}. ${net>0?`${net} Edge líquido(s)` : net<0?`${Math.abs(net)} Trouble líquido(s)`:'Edge/Trouble cancelados'}.${context.ambiguousTargets?' Alvos com Edge/Trouble diferentes: Mestre decide por alvo.':context.targetSourcesDiffer?' Condições diferentes, mas mesmo modificador líquido: consulte os detalhes de cada alvo.':''}${Math.abs(net)>1?' Efeitos acumulados: Mestre decide quantos rerolls podem ser usados.':''}${net>0?' Escolha o dado para usar EDGE no card.':''}`;
    container.append(note);
  });
}
