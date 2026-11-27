/**
 * Multiverse-D616 v0.2.206 — bounded, instantaneous defensive Reactions.
 * Triggered AFTER an attack/damage/forced movement is announced, never pre-armed.
 * - The official Item supplies the rule/card/trigger.
 * - Reaction is consumed once through the existing Turn Tracker.
 * - Only the CASTER'S own Focus may be spent; the attacking player/GM resolves
 *   Trouble and knockback on the original attack/damage card. Hurled Shield
 *   Block is now handled by the authenticated ally-protection controller.
 * - No autonomous rerolls, target updates, Concentration or GM script execution.
 * Several situational effects remain manual and are intentionally classified
 * as partial automations, not complete coverage.
 */
import {nativePowerResultMessage} from './native-power-chat.mjs';
import {reactionCombatant} from './native-power-spider-defenses.mjs';
import {resolveNativePowerAutomation} from './native-power-automations.mjs';
import {focusAvailable,focusSpendLimit,validateFocusSpend} from './focus-cost.mjs';
import {promptD616FocusExtra} from './dialog-v14.mjs';

const RULES=Object.freeze({
  'Shield Bearer::Shield Deflection':Object.freeze({effect:'trouble',focus:0}),
  'Shield Bearer::Hurled Shield Deflection':Object.freeze({effect:'trouble-ally',focus:5}),
  'Shield Bearer::Immovable':Object.freeze({effect:'knockback',focus:0}),
  'Super-Strength::Immovable':Object.freeze({effect:'knockback',focus:0}),
  'Shield Bearer::Brace for Impact':Object.freeze({effect:'brace',focus:5,variable:true}),
  'Martial Arts::Brace for Impact':Object.freeze({effect:'brace',focus:5,variable:true}),
  // v213: post-trigger bounded reactions; original attack/response remains manual.
  // Do NOT pre-arm trouble or spend a new Standard Action for a Riposte.
  'Resize::Shrinking Dodge':Object.freeze({effect:'shrink-dodge',focus:5}),
  'Melee Weapons::Riposte':Object.freeze({effect:'riposte',focus:0}),
  'Ranged Weapons::Point-Blank Parry':Object.freeze({effect:'point-blank-parry',focus:5}),
});
const ongoing=new WeakSet();
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Only exact official scoped entries compiled into the system can execute. */
export function nativeGuardReactionRule(item){
  if(item?.type!=='power')return null;
  const key=`${item.system?.powerSet}::${item.name}`;
  const rule=RULES[key];
  const record=rule&&resolveNativePowerAutomation(item);
  return record?.handlerId==='reactive-guard'&&record.status==='native-partial'&&
    record.powerSet===item.system?.powerSet&&record.powerName===item.name?rule:null;
}

export function checkNativeGuardReaction(actor,item,{
  combat=globalThis.game?.combat,
  tracker=globalThis.game?.multiverseD616?.turnTracker,
  spent=null,
}={}){
  const rule=nativeGuardReactionRule(item);
  if(!rule)return {ok:false,reason:'Poder de Reação não registrado.'};
  if(!combat?.started)return {ok:false,reason:`${item.name} exige um gatilho em combate ativo.`};
  if(!actor)return {ok:false,reason:'Personagem não identificado.'};
  if(!tracker?.trackItemUse||!tracker?.getState)return {ok:false,reason:'Controle de Reações indisponível.'};
  const combatant=reactionCombatant(actor,combat);
  if(!combatant)return {ok:false,reason:'Este personagem deve participar do combate.'};
  const state=tracker.getState(combatant);
  if(!state||!Number.isFinite(Number(state.reactionMax))||
    Number(state.reactionUsed)>=Number(state.reactionMax))
    return {ok:false,reason:'Não há Reação disponível.'};
  const amount=spent==null?rule.focus:Number(spent);
  if(!Number.isSafeInteger(amount)||amount<rule.focus||(!rule.variable&&amount!==rule.focus))
    return {ok:false,reason:'Custo de Focus inválido para esta Reação.'};
  const resource=validateFocusSpend(actor,amount);
  if(!resource.ok)return resource;
  if(amount>0&&typeof actor.update!=='function')return {ok:false,reason:'Não é possível atualizar Focus do personagem.'};
  return {ok:true,rule,combatant,amount};
}

/** Card shows the REAL official text, plus only the bounded manual instruction. */
export function nativeGuardReactionCard(item,spent=0){
  const rule=nativeGuardReactionRule(item);
  if(!rule)return null;
  const notes={
    trouble:'Atacante ou Mestre: use TROUBLE manualmente no card ORIGINAL do ataque contra a Defesa de Agility do defensor. Não faça uma segunda rolagem.',
    'trouble-ally':'Atacante ou Mestre: use TROUBLE manualmente no card ORIGINAL do ataque de Agility contra o aliado protegido. Confirme o gatilho antes da resolução; o escudo retorna ao usuário.',
    knockback:'Mestre: reduza manualmente o recuo em até 1 espaço por ponto da Defesa de Melee do personagem. Confirme se o gatilho foi empurrão ou queda.',
    brace:`Mestre: após o golpe físico e antes de aplicar o dano, ignore manualmente até ${spent} pontos de dano de Health deste ÚNICO ataque. Não reduza Focus damage nem aplique proteção permanente.`,
    'shrink-dodge':'Atacante ou Mestre: aplique 1 TROUBLE manualmente no card ORIGINAL do ataque após o gatilho, antes de confirmar o dano. O poder não faz uma rolagem própria nem cria proteção persistente.',
    riposte:'Um ataque corpo a corpo inimigo ERROU: o defensor ganha direito a um contra-ataque Melee com sua arma, conforme a regra oficial. Mestre/jogador: faça o teste Melee e resolva o dano/efeito especial da arma MANUALMENTE, sem cobrar uma Ação Standard adicional. Este card apenas registra a Reação, não executa um segundo ataque.',
    'point-blank-parry':'Um inimigo a até 2 espaços ERROU o ataque: faça um ataque à distância de resposta contra ESSE inimigo, resolvendo acerto, dano normal/Fantástico e Sangrando conforme o texto oficial. O ataque de resposta é MANUAL e não deve cobrar uma Ação Standard adicional. Nenhuma rolagem ou dano é aplicado automaticamente neste card.',
  };
  const extra=`<p><strong>Reação declarada após o gatilho.</strong> ${escapeHtml(notes[rule.effect])}</p>`+
    `<p><strong>Focus gasto:</strong> ${spent}. <strong>Reação:</strong> 1. `+
    'O sistema não executa rerolls nem altera automaticamente dano ou recuo de outro personagem.</p>';
  return nativePowerResultMessage(item,extra);
}

/**
 * The player may use this on a controlled Actor; no permission to edit an
 * enemy/ally Actor is ever granted. GM-controlled combat resource is reserved
 * first, then CASTER Focus, then the official descriptive card. Failed steps
 * roll back only the resources actually committed. A local in-flight lock
 * prevents a double click while the server acknowledgement is pending.
 */
export async function declareNativeGuardReaction(item,{
  combat=globalThis.game?.combat,
  tracker=globalThis.game?.multiverseD616?.turnTracker,
  chooseFocus=promptD616FocusExtra,
  createMessage=data=>globalThis.ChatMessage?.create?.(data),
  speaker=options=>globalThis.ChatMessage?.getSpeaker?.(options),
  applyMode=data=>data,
}={}){
  const actor=item?.actor;
  if(!actor)throw new Error('Personagem não identificado.');
  if(ongoing.has(actor))throw new Error('Há uma Reação deste personagem sendo processada.');
  ongoing.add(actor);
  let tracked=false,paid=false,paidAmount=0,prior=0,combatant;
  try{
    const start=checkNativeGuardReaction(actor,item,{combat,tracker});
    if(!start.ok)throw new Error(start.reason);
    combatant=start.combatant;
    let amount=start.amount;
    if(start.rule.variable){
      const cap=Math.min(focusAvailable(actor),focusSpendLimit(actor));
      if(cap<start.rule.focus)throw new Error('Focus insuficiente para esta Reação.');
      amount=await chooseFocus({title:`${item.name} — absorver dano`,min:start.rule.focus,
        maxTotal:cap,available:focusAvailable(actor),maxSpend:focusSpendLimit(actor),
        scalingHelp:'1 Focus investido ignora 1 dano físico de Health deste ataque.'});
      if(amount==null)return null; // canceled, no consumption
    }
    const check=checkNativeGuardReaction(actor,item,{combat,tracker,spent:amount});
    if(!check.ok)throw new Error(check.reason);
    const card=nativeGuardReactionCard(item,amount);
    if(!card||typeof createMessage!=='function')throw new Error('Chat indisponível.');
    tracked=!!(await tracker.trackItemUse(item));
    if(!tracked)throw new Error('A Reação não foi autorizada.');
    if(amount>0){
      prior=focusAvailable(actor);
      if(prior<amount)throw new Error('Focus insuficiente para confirmar esta Reação.');
      await actor.update({'system.focus.value':prior-amount});
      paid=true;paidAmount=amount;
    }
    return await createMessage(applyMode({speaker:typeof speaker==='function'?speaker({actor}):{},...card}));
  }catch(error){
    if(paid){
      try{await actor.update({'system.focus.value':focusAvailable(actor)+paidAmount});}
      catch(refundError){console.error('[D616] Reação: erro no estorno de Focus',refundError);}
    }
    if(tracked){
      try{await tracker.refundReaction?.(combatant);}
      catch(refundError){console.error('[D616] Reação: erro no estorno da Reação',refundError);}
    }
    throw error;
  }finally{ongoing.delete(actor);}
}
