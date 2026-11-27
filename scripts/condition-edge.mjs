/** Multiverse-D616 v0.2.188 — situational Edge/Trouble with manual rerolls.
 * Derived from data/conditions.json. Pure resolver + Foundry roll integration.
 * Situational sight/hearing and unresolved multi-target modifiers are NEVER guessed.
 */
const SYSTEM = 'multiverse-d616';
const PREFIX = 'mmrpg.';
import { isPowerGrabbed, hasPhysicalGrab } from './power-grabbed.mjs';
import { passiveAttackModifiers, powerRollModifiers } from './custom-automations.mjs';
import { teamManeuverAttackEdge } from './team-maneuvers-effects.mjs';
import { realJinxTargetModifier } from './native-power-passives.mjs';
import {physicalPassiveRollSources,spiderSenseTargetTrouble} from './native-power-physical-edges.mjs';
import {resolvePowerRoll} from './power-rolls.mjs';
import {fortuneCheckModifiers,fortuneFocusFireTargetModifier} from './native-power-fortune.mjs';
import {shieldWallTargetModifier,activeNativeConcentratedPower} from './native-power-guarded-passives.mjs';
import {untouchableTargetModifier} from './native-power-untouchable.mjs';
import {blurTargetModifier} from './native-power-blur.mjs';
import {nativeSenseOwnSources,nativeSenseOpponentSources} from './native-power-senses.mjs';
import {tacticalOnceModifier} from './native-power-tactical-once.mjs';
import {charmedLifeSource} from './native-power-charmed-life.mjs';
import { unflappableTargetModifiers, registerDefenseStanceDamageHooks } from './native-power-martial-stances.mjs';
import {probabilityRollConversion} from './native-priority-lot12.mjs';
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
export function resolveConditionEdges({actor,targetActors=[],ability='',attack=false,action='standard',kind='',item=null,targeted=false,baseMode=0}={}){
  const own=statusIds(actor), ab=abilityCode(ability), type=attackType(kind,ability,attack);
  const matches=[];
  const add=(sign,where,id,reason)=>matches.push(describe(`${where}: ${labels[id]??id}`,reason,sign));
  for(const id of ['mmrpg.demoralized','mmrpg.exhausted'])if(own.has(id))add(-1,'Atacante',id,'Trouble em todos os testes');
  // Hex Bolt's one-round disadvantage is a transient, roll-owned condition.
  // Multiple notifications from the same effect never grant extra Trouble.
  if(values(actor?.effects).some(e=>!e.disabled&&e.duration?.expired!==true&&
    e.flags?.[SYSTEM]?.powerCondition?.powerName==='Hex Bolt' &&
    e.flags?.[SYSTEM]?.powerCondition?.status==null))
    matches.push(describe('Hex Bolt','Desvantagem por uma rodada: Trouble em todos os testes',-1));
  if(['standard','reaction'].includes(String(action).toLowerCase())){
    if(own.has('mmrpg.stunned'))add(-1,'Atacante','mmrpg.stunned','Trouble em ações padrão/Reações');
    else if(own.has('mmrpg.shattered'))add(-1,'Atacante','mmrpg.shattered','Efeito permanente de Atordoado');
  }
  // v190: bounded source-authenticated Inspiration/Battle Plan buffs, created
  // by the GM's support dispatcher. Edge remains a MANUAL player reroll.
  const combat=globalThis.game?.combat;
  for(const effect of values(actor?.effects)){
    if(effect?.disabled||effect?.duration?.expired===true)continue;
    const buff=effect?.flags?.[SYSTEM]?.nativeSupportEdge;
    if(!buff||!combat?.started||buff.combatId!==combat.id)continue;
    const source=values(combat.combatants).find(c=>c.actor?.uuid===buff.sourceActorUuid);
    if(!source)continue;
    // Do not grant Edge at or after the source's next turn, even if the GM
    // has not processed the effect's cleanup hook yet.
    if(source.id===combat.combatant?.id &&
      (Number(combat.round)>Number(buff.round) ||
       (Number(combat.round)===Number(buff.round)&&Number(combat.turn)!==Number(buff.turn))))continue;
    matches.push(describe(`Aliado: ${effect.name}`,'Edge de Inspiração/Battle Plan até o próximo turno do lançador',1));
  }
  // Lucky Me: use the *existing* live Concentration and upkeep ledger.
  // Never add a second Active Effect or spend upkeep twice.
  const luckyMe=activeNativeConcentratedPower(actor,'Luck','Lucky Me');
  if(luckyMe)matches.push(describe('Concentração: Lucky Me','Edge em todos os testes enquanto mantém Lucky Me',1));
  matches.push(...fortuneCheckModifiers(actor));
  // One-shot Change of Plans is a real temporary Edge, but the choice
  // of die stays with the player via the ordinary EDGE button.
  matches.push(...tacticalOnceModifier(actor).edgeSources);
  // Elemental Force is an ActiveEffect with a custom rule rather than a
  // CONFIG.statusEffects status. Count that source once, NOT in baseMode too.
  const forceTrouble=values(actor?.effects).some(e=>!e.disabled&&e?.duration?.expired!==true&&
    e.flags?.[SYSTEM]?.elementalFantastic?.custom==='forceTrouble');
  if(forceTrouble)matches.push(describe('Atacante: Elemento Force','Trouble elemental temporário',-1));
  if((ab==='mle'||ab==='agl')&&own.has('mmrpg.pinned'))add(-1,'Atacante','mmrpg.pinned','Trouble em Melee/Agility');
  if(attack){
    // One automatic Edge on attack rolls while Offensive 1 remains active in
    // this specific combat round. Never grant it to generic ability checks.
    const teamEdge=teamManeuverAttackEdge(actor);
    if(teamEdge)matches.push(teamEdge);
    if(ab==='mle'&&own.has('mmrpg.prone'))add(-1,'Atacante','mmrpg.prone','Trouble em ataques Melee');
    if(hasPhysicalGrab(actor))add(targeted?-1:1,'Atacante','mmrpg.grabbed',targeted?'Trouble em ataque contra alvo específico':'Edge em ataque sem alvo específico');
  }
  // The visual editor can add passive sources (e.g. Blazing Fast Fists).
  // Each rule is checked against owned powers at the instant of the attack.
  const configuredPassives=passiveAttackModifiers({actor,attack,kind,ability});
  for(const modifier of configuredPassives)
    matches.push({source:modifier.source,reason:modifier.reason,sign:modifier.sign});
  // Official passive bonuses are automatic without per-power Central setup.
  // Existing configured rules for the SAME power are not applied twice.
  matches.push(...physicalPassiveRollSources({actor,ability:ab,attack,kind,
    existingSources:configuredPassives}));
  // Non-attack perception/stealth: show conditional source, but never reroll
  // automatically. A bare Agility/Vigilance card cannot prove check purpose.
  matches.push(...nativeSenseOwnSources({actor,ability:ab,attack}));
  // For ONE explicitly marked observer/illusion target, display the opposed
  // Trouble. Several distinct observers require individual GM adjudication.
  if(!attack && targetActors.length===1)
    matches.push(...nativeSenseOpponentSources({target:targetActors[0],ability:ab,attack}));
  // Active rules for the CURRENT power, not a buff on every future attack.
  for(const modifier of powerRollModifiers({actor,item,attack,kind,ability,baseMode}))
    matches.push({source:modifier.source,reason:modifier.reason,sign:modifier.sign});

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
      const focused=fortuneFocusFireTargetModifier(actor,target,{attack});
      if(focused)list.push(focused);
      // Spider Sense only penalizes Agility attacks against Vigilance defense.
      // It does not impose Trouble on unrelated attacks or all Agility checks.
      const spider=spiderSenseTargetTrouble(target,{attack,ability:ab,
        attackTarget:resolvePowerRoll(item)?.attackTarget??item?.system?.attackTarget});
      if(spider)list.push(spider);
      if(isPowerGrabbed(target))targetAdd(1,'mmrpg.power-grabbed','Alvo contido por poder: 1 Edge para acertá-lo');
      if(s.has('mmrpg.restrained'))targetAdd(1,'mmrpg.restrained','Ataques contra Restrito têm Edge');
      if(s.has('mmrpg.stunned')||s.has('mmrpg.shattered'))targetAdd(1,s.has('mmrpg.stunned')?'mmrpg.stunned':'mmrpg.shattered','Ataques contra Atordoado têm Edge');
      if(s.has('mmrpg.blinded'))targetAdd(1,'mmrpg.blinded','Ataques contra Cego têm Edge');
      if(s.has('mmrpg.prone')){
        if(type==='close')targetAdd(1,'mmrpg.prone','Ataques próximos contra Caído têm Edge');
        if(type==='ranged')targetAdd(-1,'mmrpg.prone','Ataques à distância contra Caído têm Trouble');
      }
      // Unflappable Poise is a regular close-attack Trouble. Resolve it
      // BEFORE Real Jinx, whose explicit rule forbids stacking with any other
      // Trouble; otherwise a character with both powers gets an extra reroll.
      const untouchable=untouchableTargetModifier(target,{attack,targeted,close:type==='close'});
      if(untouchable)list.push(untouchable);
      const blur=blurTargetModifier(target,{attack,targeted});
      if(blur)list.push(blur);
      const shieldWall=shieldWallTargetModifier(target,{attack,targeted});
      if(shieldWall)list.push(shieldWall);
      list.push(...unflappableTargetModifiers(target,{attack,targeted,close:type==='close'}));
      // Real Jinx is a target passive, not an unconditional trouble on every
      // check. It never stacks with a Trouble already on the attacker/target.
      const jinx=realJinxTargetModifier(target,{attack,targeted,
        alreadyTroubled:Number(baseMode)<0||matches.some(entry=>entry.sign<0)||list.some(entry=>entry.sign<0)});
      if(jinx)list.push(jinx);
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
  // Charmed Life never adds a second Edge to a roll with any other Edge.
  // Players arm it from the HUD, so it does not auto-consume on every roll.
  const chosenLuck=charmedLifeSource(actor,matches,baseMode);
  if(chosenLuck)matches.push(chosenLuck);
  const unique=[...new Map(matches.map(e=>[`${e.source}|${e.reason}|${e.sign}`,e])).values()];
  const edges=unique.filter(x=>x.sign>0).length;
  const troubles=unique.filter(x=>x.sign<0).length;
  const base=Math.sign(Number(baseMode)||0);
  const net=base+edges-troubles;
  return probabilityRollConversion(actor,{
    edgeMode:Math.sign(net), net, edges, troubles, baseMode:base,
    sources:unique, ambiguousTargets, targetSourcesDiffer,
    requiresDecision:ambiguousTargets||Math.abs(net)>1,
    // ALL net Edge/Trouble rerolls are selected manually on the dice card.
    // Keep the property for existing callers; it must never trigger a reroll.
    autoCount:0,
  });
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
/** Compatibility shim for existing roll callers. Never reroll automatically.
 * The card's original EDGE/TROUBLE buttons remain the only reroll path.
 */
export async function resolveConditionReroll(_message,_context){return false;}
export function registerConditionEdgeHooks(){
  registerDefenseStanceDamageHooks();
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const context=message?.getFlag?.(SYSTEM,'conditionEdges');
    if(!context?.sources?.length||!html?.querySelector||html.querySelector('.d616-condition-edge'))return;
    const container=html.querySelector('.message-content');if(!container)return;
    const net=Number(context.net||0);
    const note=document.createElement('div');note.className='d616-condition-edge';
    const heading=document.createElement('div');heading.className='d616-condition-edge__heading';
    heading.textContent='CONDIÇÕES / AUTOMAÇÕES';
    note.appendChild(heading);
    const origins=document.createElement('div');origins.className='d616-condition-edge__sources';
    origins.textContent=context.sources.map(s=>`${s.source} (${s.sign>0?'Edge':'Trouble'})`).join(' • ');
    note.appendChild(origins);
    const total=document.createElement('div');total.className='d616-condition-edge__net';
    total.textContent=net>0?`${net} EDGE LÍQUIDO${net===1?'':'S'}`
      :net<0?`${Math.abs(net)} TROUBLE LÍQUIDO${net===-1?'':'S'}`:'EDGE E TROUBLE CANCELADOS';
    note.appendChild(total);
    const help=document.createElement('div');help.className='d616-condition-edge__hint';
    help.textContent=context.ambiguousTargets
      ?'Alvos com Edge/Trouble diferentes: Mestre decide por alvo. Use os botões manualmente.'
      :context.targetSourcesDiffer
        ?'Condições diferentes, mas mesmo modificador líquido: consulte os detalhes de cada alvo. Use os botões manualmente.'
        :Math.abs(net)>1
          ?'Efeitos acumulados: Mestre decide quantos rerolls usar. Clique em EDGE ou TROUBLE no dado escolhido.'
          :net===0?'Nenhum reroll adicional: os modificadores se cancelaram.'
          :'Selecione o dado e clique em EDGE ou TROUBLE manualmente.';
    note.appendChild(help);
    container.append(note);
  });
}
