/**
 * Team Maneuvers 1.1 — voluntary group action assistant.
 * All Offensive/Defensive tiers have round-scoped automation.
 * Rally remains GM-adjudicated.
 */
import {combatTeamMembers,findTeamManeuver,planTeamManeuver,teamManeuverDescription} from './team-maneuvers-core.mjs';
import {storedTeamManeuvers,maneuverRecord,sameTeamManeuver,storeTeamManeuver} from './team-maneuvers-effects.mjs';
import {chooseD616Dialog} from './dialog-v14.mjs';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const catalog=()=>globalThis.CONFIG?.MULTIVERSE_D616?.teamManeuvers??[];
const fmt=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2});
const typeLabel={Offensive:'Ofensiva',Defensive:'Defensiva',Rally:'Reagrupamento'};
// One in-flight confirmation per combat on this client, even if two dialogs
// select different groups. Distinct group keys previously allowed both to
// debit the same Focus pool or overwrite the other's benefit flags.
const inFlightManeuvers=new Set();
function assertManeuverRound(combat, selection) {
  if (String(combat?.id)!==String(selection?.combatId) ||
      combat?.started === false ||
      Number(combat?.round)!==Number(selection?.round))
    throw new Error('O combate ou a rodada mudou durante a confirmação. Reabra o assistente.');
}

const errorNotify=error=>{
  globalThis.ui?.notifications?.warn?.(error?.message||String(error));
};

function selectionHTML(members, initialActor) {
  const types=catalog().map(m=>`<option value="${escapeHTML(m.maneuverType)}" ${String(initialActor?.system?.teamManeuver?.maneuverType||'').toLowerCase()===String(m.maneuverType).toLowerCase()?'selected':''}>${escapeHTML(typeLabel[m.maneuverType]||m.maneuverType)}</option>`).join('');
  const initialLevel=Number(initialActor?.system?.teamManeuver?.level??1);
  const levels=[1,2,3].map(n=>`<option value="${n}" ${n===initialLevel?'selected':''}>${n} — ${n*5} Focus por participante</option>`).join('');
  const participants=members.map(m=>`<label class="d616-team__member"><input type="checkbox" name="participants" value="${escapeHTML(m.id)}" ${m.actor?.id===initialActor?.id?'checked':''}><span><strong>${escapeHTML(m.name)}</strong><small>Rank ${escapeHTML(m.rank)} · Focus ${escapeHTML(m.focus)}</small></span></label>`).join('');
  return `<div class="d616-team"><p>Selecione os participantes da iniciativa. O Mestre confirma a manobra após conferir o custo e a descrição cadastrada.</p>
    <label class="d616-team__field">Tipo<select name="maneuverType">${types}</select></label>
    <label class="d616-team__field">Nível<select name="level">${levels}</select></label>
    <fieldset><legend>Participantes na iniciativa (mínimo 2)</legend><div class="d616-team__members">${participants}</div></fieldset>
    <p class="d616-team__note">Somente os combatentes escolhidos participam. Inimigos e veículos não são selecionados automaticamente.</p>
  </div>`;
}

function reportHTML(plan,{isProposal=false,round=null}={}) {
  const m=plan.maneuver;
  const rankText=m.rankRange.length===2 ? `${m.rankRange[0]}–${m.rankRange[1]}` : 'não definida';
  return `<section class="d616-team__report">
    ${isProposal ? '<p class="d616-team__proposal">Proposta — aguardando confirmação do Mestre</p>' : ''}
    <h3>${escapeHTML(typeLabel[m.type]||m.type)} — Nível ${m.level}</h3>
    <p><strong>Rodada:</strong> ${escapeHTML(round??'—')} · <strong>Rank médio:</strong> ${fmt(plan.averageRank)} · <strong>Faixa do catálogo:</strong> ${escapeHTML(rankText)} ${plan.rankWithinRange?'':'<strong>(fora da faixa cadastrada: conferir com o Mestre)</strong>'}</p>
    <p><strong>Custo:</strong> ${m.cost} Focus por integrante · ${plan.totalCost} Focus no total.</p>
    <ul>${plan.participants.map(p=>`<li>${escapeHTML(p.name)} (Rank ${escapeHTML(p.rank)}, Focus ${escapeHTML(p.focus)} → ${escapeHTML(isProposal?p.focus:p.focus-m.cost)})</li>`).join('')}</ul>
    <p><strong>Benefício:</strong> ${escapeHTML(teamManeuverDescription(m))}</p>
    <p class="d616-team__note">${isProposal?'Proposta: nenhuma despesa foi registrada. O Mestre deverá confirmar.':m.type==='Offensive'?({1:'Focus descontado. Benefício ativado automaticamente: 1 Edge nos ataques desta rodada; escolha qual dado repetir pelo card.',2:'Focus descontado. O card de cada ataque oferece uma repetição completa dos dados, conservando o melhor resultado.',3:'Focus descontado. Ataques nesta rodada tornam-se Fantásticos automaticamente contra alvos de Rank igual ou superior ao atacante.'})[m.level]:m.type==='Defensive'?`Focus descontado. Redução de Dano ${({1:2,2:4,3:8})[m.level]} automática (Health e Focus), sem acumular com RD maior, até o fim desta rodada.`:'Focus descontado. Rally permanece apenas descritivo: o Mestre controla seus efeitos manualmente.'}</p>
  </section>`;
}

/** Revalidate all members and Focus directly before spending. Roll back if any write fails. */
export async function executeTeamManeuver(combat,selection,config,{user=globalThis.game?.user,send=message=>globalThis.ChatMessage.create(message)}={}) {
  if (!user?.isGM) throw new Error('A confirmação e o gasto de Focus exigem um Mestre.');
  if (!combat || String(combat.id)!==String(selection.combatId)) throw new Error('O combate mudou. Reabra o assistente.');
  if (!combat.started && Number(combat.round??0)<1) throw new Error('Inicie o combate antes de executar a manobra.');
  if (selection.round !== undefined && Number(selection.round)!==Number(combat.round))
    throw new Error('A rodada mudou desde a seleção. Reabra o assistente.');
  const confirmationSelection={...selection,round:Number(selection.round??combat.round)};
  const transactionKey=String(combat.id);
  if(inFlightManeuvers.has(transactionKey))
    throw new Error('Uma manobra já está sendo processada neste combate. Tente novamente após a conclusão.');
  inFlightManeuvers.add(transactionKey);
  try {
  assertManeuverRound(combat,confirmationSelection);
  const members=combatTeamMembers(combat);
  const plan=planTeamManeuver(members,selection.ids,config,selection.type,selection.level);
  const record=maneuverRecord(combat,plan);
  if(storedTeamManeuvers(combat).some(entry=>sameTeamManeuver(entry,record)))
    throw new Error('Esta manobra já foi confirmada para os mesmos participantes nesta rodada.');
  if(typeof combat?.setFlag!=='function')
    throw new Error('Não foi possível salvar o efeito no combate. Nenhum Focus foi gasto.');
  const snapshots=plan.participants.map(p=>({actor:p.actor,before:p.focus}));
  const updated=[];
  try {
    for (const state of snapshots) {
      // Awaited writes can cross a GM's round change. Never debit the next
      // participant or persist a benefit for a round which has already ended.
      assertManeuverRound(combat,confirmationSelection);
      const current=Number(state.actor.system?.focus?.value);
      if (!Number.isFinite(current)||current<plan.maneuver.cost)
        throw new Error('Focus de um participante mudou durante a confirmação.');
      await state.actor.update({'system.focus.value':current-plan.maneuver.cost});
      updated.push({...state,paid:plan.maneuver.cost});
    }
    // Save the round-scoped benefit as part of the Focus transaction. If the
    // combat flag cannot be persisted, restore all participant pools.
    assertManeuverRound(combat,confirmationSelection);
    await storeTeamManeuver(combat,record);
  } catch (error) {
    let rollbackFailure=false;
    for (const state of updated.reverse()) {
      try {
        // Refund only the Focus debited by this maneuver. Restoring an old
        // absolute snapshot would erase other Focus changes made meanwhile.
        const current=Number(state.actor.system?.focus?.value);
        await state.actor.update({'system.focus.value':Number.isFinite(current)
          ? current+state.paid : state.before});
      } catch (rollbackError) {
        rollbackFailure=true;
        console.error('[D616 Team Maneuvers] Falha ao restaurar Focus',rollbackError);
      }
    }
    if (rollbackFailure) throw new Error('A manobra falhou e parte do Focus não pôde ser restaurada. O Mestre deve conferir os valores.');
    throw error;
  }
  // Display the actual post-spend pools rather than stale preview values.
  const finalPlan={...plan,participants:plan.participants.map(p=>({
    ...p,focus:Number(p.actor.system?.focus?.value??p.focus-plan.maneuver.cost)+plan.maneuver.cost
  }))};
  try {
    await send({speaker:globalThis.ChatMessage?.getSpeaker?.({actor:plan.participants[0].actor})??{},
      content:reportHTML(finalPlan,{round:record.round}),
      flags:{'multiverse-d616':{teamManeuver:{type:plan.maneuver.type,level:plan.maneuver.level,
        combatId:record.combatId,round:record.round,memberIds:plan.participants.map(p=>p.id),focusCost:plan.maneuver.cost}}}});
  } catch(error) {
    globalThis.ui?.notifications?.warn?.('Focus descontado, mas o relatório não pôde ser enviado ao chat. Confira o console.');
    console.error('[D616 Team Maneuvers] Erro ao publicar relatório',error);
  }
  return plan;
  } finally {inFlightManeuvers.delete(transactionKey);}
}

/** Available to owners for preview/proposal; only GM can commit Focus. */
export async function openTeamManeuverDialog(initialActor=null) {
  const combat=globalThis.game?.combat;
  if (!combat || (!combat.started && Number(combat.round??0)<1)) {
    errorNotify(new Error('Inicie um combate para utilizar Manobras de Equipe.'));
    return null;
  }
  const members=combatTeamMembers(combat).filter(m=>game.user?.isGM || !m.combatant?.hidden);
  if (members.length<2){errorNotify(new Error('A iniciativa precisa de pelo menos dois personagens ou NPCs.'));return null;}
  if (!catalog().length){errorNotify(new Error('O catálogo de Manobras de Equipe não está disponível.'));return null;}
  const selection=await chooseD616Dialog({title:'Manobras de Equipe — Preparar manobra',
    content:selectionHTML(members,initialActor),width:565,className:'d616-team-dialog',
    defaultAction:'review',buttons:[
      {action:'review',label:'Verificar manobra',callback:button=>{
        const form=button?.form;
        if(!form)return null;
        const fields=form.querySelectorAll('input[name="participants"]:checked');
        return {combatId:String(combat.id),round:Number(combat.round),ids:[...fields].map(f=>String(f.value)),
          type:form.querySelector('[name="maneuverType"]')?.value,
          level:Number(form.querySelector('[name="level"]')?.value)};
      }},
      {action:'cancel',label:'Cancelar',value:null},
    ]});
  if(!selection)return null;
  let plan;
  try{plan=planTeamManeuver(combatTeamMembers(combat),selection.ids,catalog(),selection.type,selection.level);}
  catch(error){errorNotify(error);return null;}
  const isGM=Boolean(globalThis.game?.user?.isGM);
  const content=reportHTML(plan,{isProposal:!isGM,round:combat.round});
  const approval=await chooseD616Dialog({title:'Manobras de Equipe — Conferência',content,
    width:580,className:'d616-team-dialog',defaultAction:isGM?'commit':'propose',
    buttons:[
      {action:isGM?'commit':'propose',label:isGM?'Confirmar e gastar Focus':'Enviar proposta ao chat',value:true},
      {action:'cancel',label:'Voltar sem gastar',value:false},
    ]});
  if(!approval)return null;
  if(isGM){
    try{return await executeTeamManeuver(globalThis.game?.combat,selection,catalog());}
    catch(error){errorNotify(error);console.error('[D616 Team Maneuvers]',error);return null;}
  }
  // Players may propose the maneuver but never spend any other Actor's Focus.
  try{
    await globalThis.ChatMessage.create({speaker:globalThis.ChatMessage.getSpeaker?.({actor:initialActor})??{},
      content:reportHTML(plan,{isProposal:true,round:combat.round})});
  }catch(error){errorNotify(error);}
  return plan;
}
