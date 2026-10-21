/** D616 v0.2.65 — Explicit optional follow-up attacks, never background attacks.
 * Area melee repeats are new paid rolls, but not new Standard Actions.
 * Sustained holds require an active provenance-linked condition, a later round,
 * and an explicit click by the power owner. Narrator still confirms damage.
 */
import { automationEnabled } from './automation-settings.mjs';
import { focusAvailable, validateFocusSpend } from './focus-cost.mjs';
import { resolveConditionEdges, resolveConditionReroll } from './condition-edge.mjs';
import { listPowerEscapes } from './power-escapes.mjs';
import { centerDistanceInSpaces, tokenGapInSpaces, combatIntelligenceDisabled } from './combat-preflight.mjs';
import { chooseSmartTargets } from './smart-targets.mjs';
import { rollSignature } from './multi-target-combat.mjs';
import { getMarvelOutcome, normalizeConditionDefense } from './power-conditions.mjs';
import { calculatePowerDamage } from './power-fantastic-damage.mjs';
const SYS='multiverse-d616';
const LOOP_NAMES=Object.freeze(['Unstoppable Assault','Unrelenting Smash']);
const HOLD_NAMES=Object.freeze(['Hellfire Chains','Coiling Crush']);
const pending=new Set();
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isOwner=actor=>!!(game.user?.isGM||actor?.testUserPermission?.(game.user,CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));
const currentCombat=()=>game.combat?.started?game.combat:null;
const currentTurn=combat=>({combatId:combat?.id??null,round:Number(combat?.round??0),turn:Number(combat?.turn??-1),combatantId:combat?.combatant?.id??null});
const position=t=>t?{x:Number(t.x),y:Number(t.y)}:null;
const snapshotTargets=()=>list(game.user?.targets).map(t=>t?.document??t).filter(t=>t?.uuid&&t?.actor);
function speakerInfo(message){
 const s=message?.speaker??{};
 const scene=game.scenes?.get?.(s.scene);
 const token=scene?.tokens?.get?.(s.token);
 const actor=token?.actor??game.actors?.get?.(s.actor);
 const item=actor?.items?.get?.(message?.getFlag?.(SYS,'itemId'));
 return {scene,token,actor,item};
}
function combatantForActor(actor,token){
 const combat=currentCombat();if(!combat||!actor)return null;
 const matches=list(combat.combatants).filter(c=>c.actor?.uuid===actor.uuid||c.token?.actor?.uuid===actor.uuid ||
   c.actor?.id===actor.id);
 return matches.find(c=>c.tokenId===token?.id)??(matches.length===1?matches[0]:null);
}
function onOwnerTurn(actor,token,anchor){
 const combat=currentCombat(),c=combatantForActor(actor,token);
 if(!combat||!c||combat.combatant?.id!==c.id)return false;
 if(anchor?.combatId&&anchor.combatId!==combat.id)return false;
 return true;
}
function rollRef(token){return {uuid:token.uuid,actorUuid:token.actor?.uuid??'',name:token.name??token.actor?.name??'Alvo',img:token.texture?.src??token.actor?.img??''};}
function actorRank(actor){return Number(actor?.system?.attributes?.rank?.value??actor?.system?.rank?.value??actor?.system?.rank??0)||0;}
function copyFlags(source,item,ability,defense,targets,extras={}){
 const dm=source?.getFlag?.(SYS,'damageMultiplier');
 return {actorId:item.actor.id,itemId:item.id,ability,attackTarget:defense,damageType:'health',
   damageMultiplier:dm??{},targets:targets.map(rollRef),focusAuto:true,focusSpent:0,
   focusDamageBonus:Number(source?.getFlag?.(SYS,'focusDamageBonus')??0),...extras};
}
function contextForNewRoll(actor,item,token,targets){
 if(!LOOP_NAMES.includes(item?.name)||!currentCombat()||!token||!targets.length)return null;
 const combat=currentCombat(),combatant=combatantForActor(actor,token);
 if(!combatant||combat.combatant?.id!==combatant.id)return null;
 const state=game.multiverseD616?.turnTracker?.getState?.(combatant);
 return {...currentTurn(combat),step:0,visited:targets.map(t=>t.uuid),lastX:Number(token.x),lastY:Number(token.y),
   movementAtRoll:state?Number(state.movementUsed??0):null};
}
export function originalRepeatContext(item,actor,targets,token){return contextForNewRoll(actor,item,token,targets);}
export function repeatEligibility({item,chain,combat,combatant,actor,state,targets}={}){
 if(!automationEnabled('extraAttacks'))return {ok:false,reason:'Automações de ataques adicionais desativadas.'};
 if(!LOOP_NAMES.includes(item?.name)||!chain)return {ok:false,reason:'Não é uma sequência de ataques repetidos.'};
 if(!combat?.started||combat.id!==chain.combatId||Number(combat.round)!==Number(chain.round)||
   combat.combatant?.id!==chain.combatantId||combatant?.id!==chain.combatantId)return {ok:false,reason:'Repetição somente no mesmo turno do ataque original.'};
 if(!isOwner(actor))return {ok:false,reason:'Sem permissão para usar o poder.'};
 if(!Number.isFinite(Number(state?.movementMax))||state.movementMax<=state.movementUsed)return {ok:false,reason:'Sem Movimento disponível para repetir este poder.'};
 if(focusAvailable(actor)<15)return {ok:false,reason:'Precisa de mais 15 Focus para repetir.'};
 if(!Array.isArray(targets)||!targets.length)return {ok:false,reason:'Marque ao menos um novo inimigo.'};
 if(targets.some(t=>chain.visited?.includes(t.uuid)))return {ok:false,reason:'Cada alvo só pode ser incluído uma vez nesta sequência por rodada.'};
 if(!targets.every(t=>t?.actor))return {ok:false,reason:'Marque somente tokens com personagem.'};
 return {ok:true};
}
export function movementStepCheck(chain,token,state,scene,grid){
 if(!chain||!token||!state)return {ok:false,reason:'Não foi possível ler o Movimento do combate.'};
 const max=Number(state.movementMax),used=Number(state.movementUsed),prior=Number(chain.movementAtRoll);
 if(!Number.isFinite(max)||!Number.isFinite(used)||!Number.isFinite(prior))return {ok:false,reason:'Movimento não registrado.'};
 const advanced=used-prior;
 if(advanced<0)return {ok:false,reason:'Movimento retrocedido; reinicie a sequência pelo Mestre.'};
 if(advanced>max/2+0.01)return {ok:false,reason:`Entre ataques, pode mover no máximo metade de sua Velocidade (${max/2} espaços).`};
 const start={x:chain.lastX,y:chain.lastY,width:token.width,height:token.height};
 const dist=centerDistanceInSpaces(start,token,scene,grid);
 if(dist!==null && dist>max/2+0.01)return {ok:false,reason:'Novo ponto além de metade da Velocidade.'};
 if(dist!==null && dist>advanced+0.2)return {ok:false,reason:'Deslocamento ainda não contabilizado pelo Controle de Turno.'};
 return {ok:true};
}
async function makeRoll(item,source,targets,{ability='mle',defense='mle',label='',extras={},damageType='health'}={}){
 const actor=item.actor;
 const edges=resolveConditionEdges({actor,targetActors:targets.map(t=>t.actor),ability,attack:true,
   kind:ability==='mle'?'close':'ranged',action:'standard',targeted:true,baseMode:0});
 // One attack roll remains shared; when targets have different net modifiers,
 // preserve per-target snapshots for the existing GM adjudication workflow.
 const Roller=CONFIG.Dice?.MarvelMultiverseRoll;
 if(!Roller)throw Error('Motor de rolagem indisponível.');
 const rollData=item.getRollData?.()??{};
 const formula=rollData.formula??`{1d6,1dm,1d6}+@abilities.${ability}.value`;
 const roll=new Roller(formula,rollData.actor??actor.getRollData(),edges.edgeMode?{edgeMode:edges.edgeMode}:{});
 await roll.evaluate({}); // Verify valid dice before consuming resources.
 const flags=copyFlags(source,item,ability,defense,targets,{
   damageType,skipPowerConditions:true,...extras,
 });
 if(edges.ambiguousTargets||edges.targetSourcesDiffer){
   const separate={};
   for(const token of targets){
     const each=resolveConditionEdges({actor,targetActors:[token.actor],ability,attack:true,
       kind:ability==='mle'?'close':'ranged',action:'standard',targeted:true,baseMode:0});
     separate[token.uuid]={net:each.net,sources:each.sources,edgeMode:each.edgeMode};
   }
   flags.targetConditionEdges=separate;
 }
 // Pay only what was specifically prescribed by the power's follow-up rule.
 const message=await roll.toMessage({speaker:source?.speaker??ChatMessage.getSpeaker({actor}),title:item.name,
   flavor:`${esc(label||item.name)}<br/>ability: ${ability}<br/>power: ${item.name}<br/>damagetype: ${damageType}, [ability] ${ability}`,
   flags:{[SYS]:{...flags,...(edges.sources.length||edges.ambiguousTargets||edges.targetSourcesDiffer?{conditionEdges:edges}:{})}}},
   {messageMode:game.settings?.get?.('core','messageMode')});
 if(edges.sources.length&&edges.autoCount){
   try{await resolveConditionReroll(message,edges);}
   catch(error){console.error('[multiverse-d616] Falha na rerrolagem opcional do ataque adicional',error);}
 }
 return message;
}
const consumeFocus=async actor=>{
 const check=validateFocusSpend(actor,15);
 if(!check.ok)throw Error(check.reason);
 await actor.update({'system.focus.value':focusAvailable(actor)-15});
};
export async function repeatAreaAttack(message,{targets=snapshotTargets()}={}){
 const {actor,item,token,scene}=speakerInfo(message);
 const chain=message?.getFlag?.(SYS,'repeatAttack');
 const combat=currentCombat(),c=combatantForActor(actor,token);
 const tracker=game.multiverseD616?.turnTracker;
 const state=c&&tracker?.getState?.(c);
 const eligible=repeatEligibility({item,chain,combat,combatant:c,actor,state,targets});
 if(!eligible.ok)throw Error(eligible.reason);
 if(message.getFlag(SYS,'repeatAttackConsumed'))throw Error('Este ataque já foi repetido.');
 const ready=message.getFlag(SYS,'repeatAttackReady');
 if(!ready?.confirmed||ready.rollSignature!==rollSignature(message.rolls?.[0]))
   throw Error('Confirme primeiro o dano do ataque anterior no card de DANO.');
 if(!combatIntelligenceDisabled()){
   const step=movementStepCheck(chain,token,state,scene,canvas.grid);
   if(!step.ok)throw Error(step.reason);
 }
 for(const target of targets){
   if(target.parent?.id!==scene?.id)throw Error('Todos os alvos devem estar na mesma cena.');
   if(!combatIntelligenceDisabled()){
     const gap=tokenGapInSpaces(token,target,Number(scene.grid?.size??canvas.grid?.size));
     if(gap===null||gap>1.01)throw Error(`Alvo ${target.name}: fora do alcance corpo a corpo padrão. O Mestre pode resolver outros alcances manualmente.`);
   }
 }
 const key=`area:${message.id}`;
 if(pending.has(key))return null;
 pending.add(key);
 try{
   await message.setFlag(SYS,'repeatAttackConsumed',true);
   let paid=false;
   try{
     await consumeFocus(actor);paid=true;
     const next={...chain,step:Number(chain.step??0)+1,visited:[...chain.visited,...targets.map(t=>t.uuid)],
       lastX:Number(token.x),lastY:Number(token.y),movementAtRoll:Number(state.movementUsed)};
     const result=await makeRoll(item,message,targets,{label:`Repetição ${next.step} — +15 Focus (sem nova Ação Padrão)`,
       extras:{repeatAttack:next,focusAuto:true,focusSpent:15,skipPowerConditions:false}});
     return result;
   }catch(error){
     if(paid){try{await actor.update({'system.focus.value':focusAvailable(actor)+15});}
       catch(refund){console.error('[multiverse-d616] Falha ao estornar Focus de repetição',refund);}}
     await message.unsetFlag?.(SYS,'repeatAttackConsumed');
     throw error;
   }
 }finally{pending.delete(key);}
}
function targetedHold(actor,target,powerName){
 if(!actor||!target?.actor)return null;
 return listPowerEscapes(target.actor).find(g=>g.power===powerName&&g.recipientUuid===target.uuid&&
   g.sourceActorUuid===actor.uuid&&actor.items?.get?.(g.sourceItemId)?.name===powerName)??null;
}
export function heldFollowUpEligibility({actor,token,target,powerName,combat,tracker}={}){
 if(!automationEnabled('extraAttacks'))return {ok:false,reason:'Ataques adicionais condicionais desativados.'};
 if(!HOLD_NAMES.includes(powerName)||!combat?.started)return {ok:false,reason:'Este efeito exige combate ativo.'};
 if(!onOwnerTurn(actor,token))return {ok:false,reason:'Só pode repetir no próprio turno.'};
 if(!isOwner(actor))return {ok:false,reason:'Sem permissão para usar o poder.'};
 const hold=targetedHold(actor,target,powerName);
 if(!hold)return {ok:false,reason:'Alvo não está preso por este poder deste personagem.'};
 const originating=game.messages?.get?.(hold.sourceMessageId);
 const initial=originating?.getFlag?.(SYS,'repeatInitial');
 const startRound=Number(initial?.round??String(list(target.actor.effects).find(e=>e.flags?.[SYS]?.powerCondition?.messageId===hold.sourceMessageId)?.flags?.[SYS]?.powerCondition?.initialPosition??'0').split(':')[0]);
 if(initial?.combatId&&initial.combatId!==combat.id)return {ok:false,reason:'Concentração veio de outro combate.'};
 if(!(Number(combat.round)>startRound))return {ok:false,reason:'Primeiro novo teste somente na rodada seguinte.'};
 const ownerEffect=list(target.actor.effects).find(e=>!e.disabled && e.flags?.[SYS]?.powerCondition?.messageId===hold.sourceMessageId&&
   e.flags?.[SYS]?.powerCondition?.sourceActorUuid===actor.uuid&&
   e.flags?.[SYS]?.powerCondition?.concentrationEffectId);
 const concId=ownerEffect?.flags?.[SYS]?.powerCondition?.concentrationEffectId;
 const conc=list(actor.effects).find(e=>!e.disabled&&e.id===concId);
 if(!conc)return {ok:false,reason:'A Concentração desse poder não está mais ativa.'};
 const used=actor.getFlag?.(SYS,'heldRepeatUses')??{};
 const useKey=`${combat.id}|${powerName}|${target.uuid}`;
 if(Number(used[useKey])===Number(combat.round))return {ok:false,reason:'Já executou este teste para o alvo nesta rodada.'};
 if(powerName==='Coiling Crush'){
   const c=combatantForActor(actor,token),state=c&&tracker?.getState?.(c);
   if(!state||Number(state.movementUsed)>=Number(state.movementMax)||!tracker?.consumeMovement)
     return {ok:false,reason:'Coiling Crush exige Movimento ainda disponível.'};
 }
 return {ok:true,hold,conc,useKey,used};
}
/** A second DAMAGE card from the SAME dice result; never submit the dice again. */
export function heldFocusDamageCardData({item,original,message,target,actor}={}){
 const roll=message?.rolls?.[0];
 if(!roll)return null;
 const first=roll.terms?.[0];
 const pool=first?.roll?.terms?.[0]?.rolls?first.roll.terms[0]:first;
 const marvel=pool?.rolls?.[1];
 const die=marvel?.dice?.find(d=>/marvel/i.test(d?.constructor?.name??''))??marvel?.dice?.[0]??marvel?.terms?.[0];
 const active=(die?.results??[]).filter(r=>r.active&&!r.discarded);
 const marvelValue=active.length?active.reduce((v,r)=>v+(Number(r.result)===1?6:Number(r.count??r.result??0)),0):Number(die?.total??0);
 const defenseKey=normalizeConditionDefense('res',target.actor);
 const defense=Number(target.actor.system?.abilities?.[defenseKey]?.defense??0);
 const outcome=getMarvelOutcome(roll,defense);
 if(!outcome?.success)return null;
 const dm=message?.getFlag?.(SYS,'damageMultiplier')??message?.flags?.[SYS]?.damageMultiplier??original?.getFlag?.(SYS,'damageMultiplier')??{};
 const damage=calculatePowerDamage({powerName:null,marvelDie:marvelValue,
   damageMultiplier:Number(dm.finalDM??dm.base??0),
   damageReduction:Number(target.actor.system?.focusDamageReduction??0),
   ability:Number(actor.system?.abilities?.ego?.value??0),
   fantastic:Boolean(outcome.fantastic)});
 const ref=rollRef(target);
 return {speaker:message.speaker,content:`<p><b>Hellfire Chains — Focus</b>: confirmação de dano pendente para <b>${esc(ref.name)}</b>. O valor abaixo é uma prévia; nenhuma perda de Focus foi aplicada.</p>`,
   flags:{[SYS]:{sourceMessageId:message.id,targets:[ref],damageType:'focus',
     damageApplication:{version:1,sourceMessageId:message.id,isFantastic:Boolean(outcome.fantastic),
       rollSignature:rollSignature(roll),entries:[{targetUuid:ref.uuid,actorUuid:ref.actorUuid,name:ref.name,
         category:'focus',damage:damage.damage,rawDamage:damage.rawDamage,
         damageReduction:damage.damageReduction,effectiveDamageMultiplier:damage.effectiveDamageMultiplier,
         hit:true,fantastic:Boolean(outcome.fantastic)}]}}}};
}

export async function useHeldFollowUp(actor,powerName,{targets=snapshotTargets()}={}){
 if(targets.length!==1)throw Error('Marque exatamente um alvo preso pelo poder.');
 const target=targets[0];
 const token=globalThis.canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor?.uuid)?.document??
   list(globalThis.canvas?.scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid);
 const tracker=game.multiverseD616?.turnTracker;
 const checked=heldFollowUpEligibility({actor,token,target,powerName,combat:currentCombat(),tracker});
 if(!checked.ok)throw Error(checked.reason);
 const item=actor.items?.get?.(checked.hold.sourceItemId);
 const orig=game.messages?.get?.(checked.hold.sourceMessageId);
 if(!item||!orig)throw Error('Poder ou rolagem de origem indisponível.');
 const key=`hold:${actor.uuid}|${powerName}|${target.uuid}|${currentCombat().round}`;
 if(pending.has(key))return null;
 pending.add(key);
 try{
   const ability=powerName==='Hellfire Chains'?'ego':'mle';
   const defense='res';
   // Coiling Crush costs Movement. Hellfire Chains' source states no new
   // Standard Action or Focus cost for checks on subsequent rounds.
   if(powerName==='Coiling Crush'){
     const combatant=combatantForActor(actor,token);
     if(!await tracker.consumeMovement(combatant))throw Error('Não foi possível consumir Movimento.');
   }
   const uses={...checked.used,[checked.useKey]:Number(currentCombat().round)};
   await actor.setFlag(SYS,'heldRepeatUses',uses);
   const extra={heldFollowUp:{name:powerName,sourceMessageId:orig.id,round:currentCombat().round},
     skipPowerConditions:true};
   const message=await makeRoll(item,orig,[target],{ability,defense,
     label:powerName==='Hellfire Chains'?'Correntes — Health e Focus (mesmo teste)':'Coiling Crush — Movimento gasto',extras:extra});
   // Hellfire's Focus DAMAGE card is created only AFTER the GM confirms the
   // Health DAMAGE card. No Focus damage (or preview) appears before then.
   return message;
 }finally{pending.delete(key);}
}

/** Reveal Hellfire's separate Focus DAMAGE card only after Health was
 * actually confirmed by the GM; never roll dice again or apply Focus early.
 */
export async function confirmHeldHellfireHealthDamage(damageMessage,action,results){
 if(!game.user?.isGM||action==='heal'||damageMessage?.getFlag?.(SYS,'heldFocusPosted'))return false;
 const sourceId=damageMessage?.getFlag?.(SYS,'sourceMessageId');
 const message=sourceId?game.messages?.get?.(sourceId):null;
 if(message?.getFlag?.(SYS,'heldFollowUp')?.name!=='Hellfire Chains')return false;
 if(damageMessage.getFlag(SYS,'damageType')==='focus')return false;
 const refs=message.getFlag(SYS,'targets')??[];
 const confirmed=results?.find(r=>!r.heal&&!r.blocked&&refs.some(t=>t.uuid===r.targetUuid));
 if(!confirmed)return false;
 const {actor,item,scene}=speakerInfo(message);
 if(!actor||!item)return false;
 const ref=refs.find(t=>t.uuid===confirmed.targetUuid);
 const tokenMatch=/^Scene\.([^.]+)\.Token\.([^.]+)/.exec(ref?.uuid??'');
 const target=tokenMatch?game.scenes?.get?.(tokenMatch[1])?.tokens?.get?.(tokenMatch[2]):null;
 if(!target?.actor)return false;
 const original=game.messages?.get?.(message.getFlag(SYS,'heldFollowUp')?.sourceMessageId);
 const card=heldFocusDamageCardData({item,original,message,target,actor});
 if(!card)return false;
 await damageMessage.setFlag(SYS,'heldFocusPosted',true);
 try{await ChatMessage.create(card);}catch(error){
   await damageMessage.unsetFlag?.(SYS,'heldFocusPosted');throw error;
 }
 return true;
}

/** Only the Narrator's actual DAMAGE confirmation unlocks a repeat. */
export async function confirmRepeatedAttackDamage(damageMessage,action,results){
 if(!automationEnabled('extraAttacks')||action==='heal'||!game.user?.isGM)return false;
 const sourceId=damageMessage?.getFlag?.(SYS,'sourceMessageId');
 const message=sourceId?game.messages?.get?.(sourceId):null;
 const {item}=message?speakerInfo(message):{};
 const chain=message?.getFlag?.(SYS,'repeatAttack');
 if(!chain||!LOOP_NAMES.includes(item?.name)||message.getFlag(SYS,'repeatAttackConsumed'))return false;
 const signature=rollSignature(message.rolls?.[0]);
 if(damageMessage?.getFlag?.(SYS,'damageApplication')?.rollSignature!==signature)return false;
 if(!results?.some(r=>!r.heal&&!r.blocked&&chain.visited?.includes(r.targetUuid)))return false;
 // The follow-up is its OWN ChatMessage, created after the GM actually
 // confirms damage. The damage card remains immutable and never doubles as an
 // attack control. A single source card can only unlock one follow-up.
 if(message.getFlag(SYS,'repeatAttackReady')?.confirmed)return false;
 // Flag the source BEFORE creating the separate ChatMessage: Foundry may
 // render the new message immediately, before ChatMessage.create resolves.
 await message.setFlag(SYS,'repeatAttackReady',{confirmed:true,rollSignature:signature,
   damageMessageId:damageMessage.id});
 try{
   const followUp=await ChatMessage.create({
     speaker:message.speaker,
     content:`<div class="m616-followup-card"><b>${esc(item.name)} — ataque adicional disponível</b>`+
       `<p>Dano do ataque anterior confirmado. Você pode repetir por +15 Focus, sem nova Ação Padrão,`+
       ` escolhendo novos alvos na próxima janela.</p></div>`,
     flags:{[SYS]:{repeatAttackFollowUpReady:{sourceMessageId:message.id,
       rollSignature:signature,confirmedDamageMessageId:damageMessage.id}}},
   });
   await message.setFlag(SYS,'repeatAttackReady',{confirmed:true,rollSignature:signature,
     damageMessageId:damageMessage.id,followUpCardId:followUp?.id??null});
 }catch(error){await message.unsetFlag?.(SYS,'repeatAttackReady');throw error;}
 return true;
}
export function installRepeatPowerHooks(){
 Hooks.on('renderChatMessageHTML',(message,html)=>{
   if(!(html instanceof HTMLElement))return;
   // The follow-up control belongs UNDER the already confirmed DAMAGE card.
   const ready=message.getFlag?.(SYS,'repeatAttackFollowUpReady');
   if(!ready)return;
   const source=game.messages?.get?.(ready.sourceMessageId);
   if(!source?.rolls?.length)return;
   const {actor,item,token}=speakerInfo(source);
   const chain=source.getFlag?.(SYS,'repeatAttack');
   const enabled=source.getFlag?.(SYS,'repeatAttackReady');
   if(!chain||!LOOP_NAMES.includes(item?.name)||source.getFlag(SYS,'repeatAttackConsumed') ||
      enabled?.damageMessageId!==ready.confirmedDamageMessageId ||
      enabled?.rollSignature!==rollSignature(source.rolls[0]))return;
   const c=combatantForActor(actor,token),state=game.multiverseD616?.turnTracker?.getState?.(c);
   const eligible=repeatEligibility({item,chain,combat:currentCombat(),combatant:c,actor,state,targets:[]});
   if(!eligible.ok&&eligible.reason!=='Marque ao menos um novo inimigo.')return;
   if(html.querySelector('.m616-repeat-attack'))return;
   const b=document.createElement('button');b.type='button';b.className='m616-repeat-attack';
   b.dataset.messageId=source.id;
   b.textContent=`↪ ${item.name}: repetir (+15 Focus, sem nova Ação)`;
   (html.querySelector('.message-content')??html).appendChild(b);
 });
 document.addEventListener('click',async event=>{
   const b=event.target?.closest?.('.m616-repeat-attack');if(!b)return;
   event.preventDefault();event.stopImmediatePropagation();b.disabled=true;
   try{const source=game.messages?.get?.(b.dataset.messageId);
     if(source){
       const actorItem=speakerInfo(source).item;
       if(!await chooseSmartTargets(actorItem,{force:true}))return;
       await repeatAreaAttack(source,{targets:snapshotTargets()});
     }}
   catch(error){ui.notifications?.warn?.(`Ataque adicional: ${error.message}`);}
   finally{b.disabled=false;}
 },true);
}
export function availableHeldPowers(actor){
 const token=globalThis.canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor?.uuid)?.document??
    list(globalThis.canvas?.scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid);
 if(!actor||!automationEnabled('extraAttacks')||!onOwnerTurn(actor,token))return [];
 const targets=list(globalThis.canvas?.scene?.tokens);
 return HOLD_NAMES.filter(name=>list(actor.items).some(item=>item?.name===name&&item?.type==='power')&&
   targets.some(target=>heldFollowUpEligibility({actor,token,target,powerName:name,
     combat:currentCombat(),tracker:game.multiverseD616?.turnTracker}).ok));
}
