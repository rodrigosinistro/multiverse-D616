/**
 * Multiverse-D616 v0.2.222 — priority lot 4.
 * Leech Life: Health recovery based ONLY on GM-confirmed Health lost.
 * Dispel Spell: GM-authorized removal of a selected Magic concentration, or all
 * concentration on a Fantastic success. Uses the current roll (Edge/Trouble).
 * Quick Phase shares the existing Phase Self concentration/physical rules in lot3.
 */
import {getMarvelOutcome} from './power-conditions.mjs';
import {getConcentrationPowerEffects,clearConcentration} from './concentration.js';
import {rollSignature} from './multi-target-combat.mjs';
import {tokenFromTargetRef} from './native-priority-lot3.mjs';
const S='multiverse-d616';
const list=x=>Array.from(x?.contents??x?.values?.()??x??[]);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const official=(i,name,set)=>i?.type==='power'&&i?.name===name&&i?.system?.powerSet===set;
export const isLeechLife=i=>official(i,'Leech Life','Magic');
export const isDispelSpell=i=>official(i,'Dispel Spell','Magic');
export const isQuickPhase=i=>official(i,'Quick Phase','Phasing');

/** Match only hit, non-healed Health receipts to the original damage card.
 * Even on a Fantastic result, absorbed damage never restores Health. */
export function leechLifeRecovery(results,entries,action='full'){
 if(action==='heal'||!Array.isArray(results)||!Array.isArray(entries))return {loss:0,recovery:0};
 const allowed=new Map(entries.filter(e=>e?.targetUuid&&e.category==='health'&&e.hit!==false).map(e=>[e.targetUuid,e]));
 const seen=new Set();let loss=0,recovery=0;
 for(const r of results){
  if(!r?.targetUuid||seen.has(r.targetUuid)||r.heal||r.blocked||r.category!=='health')continue;
  const original=allowed.get(r.targetUuid);if(!original)continue;
  seen.add(r.targetUuid);
  const actual=Math.max(0,Math.floor(Number(r.delta)||0));
  loss+=actual;recovery+=original.fantastic===true?actual:Math.ceil(actual/2);
 }
 return {loss,recovery};
}
export function cappedHealthRecovery(actor,amount){
 const before=Math.max(0,Number(actor?.system?.health?.value)||0);
 const maximum=Math.max(0,Number(actor?.system?.health?.max)||0);
 const entitled=Math.max(0,Math.floor(Number(amount)||0));
 return {before,maximum,applied:Math.max(0,Math.min(entitled,maximum-before))};
}
function messageActor(m,scenes=globalThis.game?.scenes,actors=globalThis.game?.actors){
 return scenes?.get?.(m?.speaker?.scene)?.tokens?.get?.(m?.speaker?.token)?.actor??actors?.get?.(m?.speaker?.actor)??null;
}
export async function confirmLeechLife({damageMessage,action,results,
 messages=globalThis.game?.messages,scenes=globalThis.game?.scenes,actors=globalThis.game?.actors,
 post=data=>globalThis.ChatMessage?.create?.(data)}={}){
 if(!globalThis.game?.user?.isGM||!damageMessage?.getFlag)return null;
 if(damageMessage.getFlag(S,'nativeLeechLifeResolved'))return null;
 const originalId=damageMessage.getFlag(S,'sourceMessageId');
 const source=messages?.get?.(originalId);
 if(!source?.rolls?.length||source.getFlag(S,'damageType')!=='health')return null;
 const caster=messageActor(source,scenes,actors);
 const power=caster?.items?.get?.(source.getFlag(S,'itemId'));
 if(!isLeechLife(power))return null;
 const snapshot=damageMessage.getFlag(S,'damageApplication');
 if(!snapshot?.version||snapshot.sourceMessageId!==source.id)return null;
 // Exactly one confirmation receipt; mark BEFORE changing Health so rerenders
 // and multiple clicks never apply the restoration twice.
 const entitlement=leechLifeRecovery(results,snapshot.entries,action);
 const cap=cappedHealthRecovery(caster,entitlement.recovery);
 await damageMessage.setFlag(S,'nativeLeechLifeResolved',{
  version:1,sourceMessageId:source.id,healthDamage:entitlement.loss,
  entitled:entitlement.recovery,applied:cap.applied,claimedAt:Date.now(),
 });
 if(cap.applied>0)await caster.update({'system.health.value':cap.before+cap.applied});
 if(typeof post==='function'){
  try{await post({speaker:{actor:caster.id,alias:caster.name},
   content:`<div class="m616-health-recovery"><b>Leech Life:</b> ${escape(caster.name)} recuperou `+
    `<b>${cap.applied} Health</b> (dano de Health confirmado: ${entitlement.loss}; `+
    `recuperação calculada: ${entitlement.recovery}; máximo: ${cap.maximum}).</div>`,
   flags:{[S]:{nativeLeechLifeAnnouncement:{sourceMessageId:source.id,damageMessageId:damageMessage.id}}}});
  }catch(e){console.warn('[D616] Leech Life: anúncio',e);}
 }
 return {...entitlement,...cap};
}

export function activeConcentrationPowers(actor){
 return getConcentrationPowerEffects(actor,{activeOnly:true}).filter(e=>
  !e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.transient===true);
}
export function magicalConcentrationPowers(actor){
 return activeConcentrationPowers(actor).filter(e=>{
  const item=actor?.items?.get?.(e.flags[S].concentrationPower.itemId);
  return item?.type==='power'&&String(item?.system?.powerSet??'').toLowerCase()==='magic';
 });
}
/** Preflight runs before Focus/Standard Action, after target confirmation. */
export function dispelSpellEligibility(item,targets=[],{scene=globalThis.canvas?.scene}={}){
 if(!isDispelSpell(item))return {ok:true,applicable:false};
 if(targets.length!==1)return {ok:false,reason:'Dispel Spell: escolha exatamente um alvo.'};
 const target=tokenFromTargetRef(targets[0],scene),actor=target?.actor;
 if(!target||!actor||target.parent?.id!==scene?.id)return {ok:false,reason:'Dispel Spell: alvo inválido na cena.'};
 if(actor.id===item.actor?.id)return {ok:false,reason:'Dispel Spell: selecione outro personagem.'};
 if(!magicalConcentrationPowers(actor).length)
  return {ok:false,reason:'Dispel Spell: o alvo não mantém uma Concentração mágica.'};
 if(!globalThis.game?.user?.isGM&&!globalThis.game?.users?.activeGM)
  return {ok:false,reason:'Dispel Spell: é necessário um Mestre conectado.'};
 const defense=Number(actor.system?.abilities?.ego?.defense);
 if(!Number.isFinite(defense)||defense<=0)return {ok:false,reason:'Dispel Spell: Defesa de Ego não encontrada.'};
 return {ok:true,applicable:true,version:1,sceneId:scene.id,targetUuid:target.uuid,
  targetActorUuid:actor.uuid,egoDefense:defense};
}

/** Idempotent, GM-only action. An ordinary success ends just ONE magic effect;
 * Fantastic success ends ALL concentration using the tracker API (which also
 * removes the concentration status and dependent power effects).
 */
export async function dispelFromRoll(message,{selectEffect=null,confirm=null,
 post=data=>globalThis.ChatMessage?.create?.(data),
 endAll=target=>clearConcentration(target),endOne=(target,id)=>target.deleteEmbeddedDocuments('ActiveEffect',[id])}={}){
 if(!globalThis.game?.user?.isGM)return {ok:false,reason:'Somente o Mestre pode resolver Dispel Spell.'};
 const gm=globalThis.game?.users?.activeGM;
 if(gm&&gm.id!==globalThis.game.user.id)return {ok:false,reason:'Aguarde o Mestre ativo.'};
 const mark=message?.getFlag?.(S,'nativeDispelSpell');
 if(mark?.version!==1||message.getFlag(S,'nativeDispelSpellResolved'))return {ok:false,reason:'Dispel Spell já resolvido ou inválido.'};
 const caster=messageActor(message),item=caster?.items?.get?.(message?.getFlag?.(S,'itemId'));
 if(!isDispelSpell(item)||!message?.rolls?.[0])return {ok:false,reason:'Não é uma rolagem válida de Dispel Spell.'};
 const token=tokenFromTargetRef({uuid:mark.targetUuid},globalThis.game?.scenes?.get?.(mark.sceneId));
 const target=token?.actor;
 if(!target||target.uuid!==mark.targetActorUuid||token.parent?.id!==mark.sceneId)
  return {ok:false,reason:'O alvo original não está disponível.'};
 const outcome=getMarvelOutcome(message.rolls[0],mark.egoDefense,{message,targetActor:target});
 if(!outcome)return {ok:false,reason:'Rolagem ainda não resolvida.'};
 const all=activeConcentrationPowers(target),magic=magicalConcentrationPowers(target);
 const options=outcome.success?(outcome.fantastic?all:magic):[];
 if(outcome.success&&!options.length)return {ok:false,reason:'O alvo já não mantém Concentração elegível.'};
 let chosen=null;
 if(outcome.success&&!outcome.fantastic){
  if(typeof selectEffect!=='function')return {ok:false,reason:'Seleção do Mestre indisponível.'};
  chosen=await selectEffect(options,target);
  if(chosen===null||chosen===undefined)return {ok:false,canceled:true};
  if(!magic.some(e=>e.id===chosen))return {ok:false,reason:'Concentração mágica inválida.'};
 }
 if(typeof confirm!=='function')return {ok:false,reason:'Confirmação do Mestre indisponível.'};
 const approved=await confirm({target,outcome,effects:outcome.fantastic?all:options.filter(e=>e.id===chosen)});
 if(!approved)return {ok:false,canceled:true};
 if(message.getFlag(S,'nativeDispelSpellResolved'))return {ok:false,reason:'Já resolvido.'};
 // Claim the final/current roll before actor writes, preventing repeated use.
 const signature=rollSignature(message.rolls[0]);
 await message.setFlag(S,'nativeDispelSpellResolved',{
  version:1,signature,targetUuid:mark.targetUuid,success:outcome.success,
  fantastic:outcome.success&&outcome.fantastic,selection:chosen,resolvedAt:Date.now(),
 });
 let removed=0;
 if(outcome.success){
  if(outcome.fantastic){removed=all.length;await endAll(target);}
  else{await endOne(target,chosen);removed=1;}
 }
 try{await post({speaker:message.speaker,content:
   `<p><b>Dispel Spell — Mestre:</b> ${escape(target.name)} — `+
   `${outcome.success?(outcome.fantastic?'Sucesso Fantástico: concentração completamente interrompida.':'Sucesso: uma Concentração mágica interrompida.'):'Falha: concentração preservada.'} `+
   `(${removed} efeito${removed===1?'':'s'} removido${removed===1?'':'s'}).</p>`});
 }catch(e){console.warn('[D616] Dispel Spell anúncio',e);}
 return {ok:true,success:outcome.success,fantastic:outcome.fantastic,removed};
}

const dispelInFlight=new Set();
async function resolveDispelWithDialog(message){
 if(dispelInFlight.has(message.id))return;
 dispelInFlight.add(message.id);
 const Dialog=globalThis.foundry?.applications?.api?.DialogV2;
 try{
  const result=await dispelFromRoll(message,{
   selectEffect:async(effects,target)=>{
    if(effects.length===1)return effects[0].id;
    const choices=effects.map(e=>({action:e.id,label:e.name??'Concentração',callback:()=>e.id}));
    choices.push({action:'cancel',label:'Cancelar',callback:()=>null});
    return Dialog.wait({window:{title:`Dispel Spell — ${target.name}`},rejectClose:false,
     content:'<p>Sucesso comum: escolha <b>uma</b> Concentração mágica para interromper.</p>',
     buttons:choices});
   },
   confirm:async({target,outcome,effects})=>Dialog.confirm({
    window:{title:'Dispel Spell — confirmar (Mestre)'},rejectClose:false,
    content:`<p><b>${escape(target.name)}</b>: ${outcome.success?(outcome.fantastic?'Sucesso Fantástico — remover <b>toda</b> a Concentração.':'Sucesso — remover uma Concentração mágica.'):'Falha — não remover Concentração.'}</p>`+
      `<p>${effects.map(e=>escape(e.name)).join(', ')||'Nenhuma alteração'}</p>`,
   }),
  });
  if(!result.ok&&!result.canceled)globalThis.ui?.notifications?.warn?.(result.reason);
 }catch(e){console.error('[D616] Dispel Spell:',e);globalThis.ui?.notifications?.warn?.(String(e?.message??e));}
 finally{dispelInFlight.delete(message.id);}
}
export function registerNativePriorityLot4Hooks({hooks=globalThis.Hooks}={}){
 hooks?.on?.('renderChatMessageHTML',(message,html)=>{
  if(!globalThis.game?.user?.isGM)return;
  if(message?.getFlag?.(S,'nativeDispelSpell')?.version!==1||message.getFlag(S,'nativeDispelSpellResolved'))return;
  const parent=html?.querySelector?.('.message-content');if(!parent)return;
  const button=document.createElement('button');button.type='button';button.textContent='Dispel Spell — resolver (Mestre)';
  button.addEventListener('click',()=>void resolveDispelWithDialog(message));
  parent.append(button);
 });
}
