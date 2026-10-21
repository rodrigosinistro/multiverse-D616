import {isEffectChangeType} from './active-effect-types.mjs';
/**
 * Resize Other (Marvel Multiverse RPG) — target-directed, permanent, non-damaging.
 * Rule: touch a willing person; an unwilling target must be grabbed first.
 * The user's Grow/Shrink levels determine the selectable size categories.
 * Foundry v14: the primary GM updates actors the caster cannot edit.
 */
import { availableGrowSizes, naturalGrowSize, isResizeChoiceEffect } from './grow-size.mjs';
import { availableShrinkSizes } from './shrink-size.mjs';
import { syncActorTokenSize, RESIZE_SKIP_OPTION, effectiveActorTokenSize } from './token-size.mjs';

const SYSTEM = 'multiverse-d616';
const SCOPE = 'resize-other-v0214';
const SOCKET = `system.${SYSTEM}`;
const REQUESTS = new Map();
const VALUES = Object.freeze(['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan']);
const effectsOf = actor => Array.from(actor?.effects?.contents ?? actor?.effects ?? []);
const changesOf = effect => effect?.system?.changes ?? effect?.changes ?? [];
const clone = obj => globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(obj) : JSON.parse(JSON.stringify(obj));
const cleanName = value => String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
const powerLevel = (actor, kind) => effectsItems(actor).reduce((max,item) => {
  const match = new RegExp(`^${kind} ([1-4])$`,'i').exec(String(item?.name??'').trim());
  return item?.type === 'power' && match ? Math.max(max,Number(match[1])) : max;
},0);
const effectsItems = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);
const current = actor => effectsOf(actor).find(effect=>!effect.disabled && effect?.flags?.[SYSTEM]?.resizeOtherChoice===true);
const userIsGM = () => Boolean(globalThis.game?.user?.isGM);
const primaryGM = () => game.users?.activeGM ?? Array.from(game.users?.contents??[]).find(u=>u.isGM&&u.active);
const id = () => globalThis.foundry?.utils?.randomID?.() ?? `r${Date.now()}${Math.random().toString(16).slice(2)}`;

export function isResizeOtherPower(item) {
  return item?.type==='power' && ['resize other','resize others'].includes(cleanName(item?.name));
}
export function availableResizeOtherChoices(caster,target) {
  if(!caster||!target) return [];
  const rank=Number(caster.system?.attributes?.rank?.value ?? 0);
  if(rank < 3) return [];
  const grow=powerLevel(caster,'Grow'), shrink=powerLevel(caster,'Shrink');
  const natural=naturalGrowSize(target);
  const sizes=[...(grow>=2 ? availableGrowSizes(grow,natural):[]),...(shrink>=2?availableShrinkSizes(shrink,natural):[])];
  const index = new Map(sizes.map(s=>[s.key,s]));
  return [
    {key:'normal',label:'Restaurar tamanho anterior',range:'Desfazer Resize Other neste alvo'},
    ...VALUES.filter(k=>index.has(k)).map(k=>index.get(k)),
  ];
}
export function hasGrabbedStatus(actor) {
  return effectsOf(actor).some(effect => !effect?.disabled && (
    Array.from(effect?.statuses??[]).some(status=>/^(?:mmrpg\.)?(?:grabbed|grappled|power-grabbed)$/i.test(String(status))) ||
    effect?.flags?.[SYSTEM]?.powerCondition?.status==='grabbed'
  ));
}

function tokenDoc(token){ return token?.document??token; }
function ownedCasterToken(actor) {
  const targetScene=globalThis.canvas?.scene?.id;
  const matches=Array.from(globalThis.canvas?.tokens?.placeables??[]).filter(t=>{
    const doc=tokenDoc(t);
    return doc?.parent?.id===targetScene && (
      doc?.actor===actor || t?.actor===actor || (actor?.isToken && actor?.token?.id===doc.id) ||
      (!actor?.isToken && doc?.actorLink!==false && (t?.actor?.id??doc?.actor?.id)===actor.id)
    );
  });
  const selected=matches.find(t=>t.controlled);
  return tokenDoc(selected??matches[0]??null);
}
export function withinTouch(casterToken,targetToken,gridPx) {
  if(!casterToken||!targetToken || casterToken.parent?.id!==targetToken.parent?.id) return false;
  const grid=Number(gridPx);
  if(!Number.isFinite(grid)||grid<=0) return false;
  const bounds = doc => ({x:Number(doc.x),y:Number(doc.y),right:Number(doc.x)+Number(doc.width)*grid,bottom:Number(doc.y)+Number(doc.height)*grid});
  const a=bounds(casterToken), b=bounds(targetToken);
  if(![a.x,a.y,a.right,a.bottom,b.x,b.y,b.right,b.bottom].every(Number.isFinite)) return false;
  const dx=Math.max(0,a.x-b.right,b.x-a.right), dy=Math.max(0,a.y-b.bottom,b.y-a.bottom);
  return Math.hypot(dx,dy)<=grid+1e-6; // Reach to within one normal grid unit (touch approximation).
}
export function validateResizeOtherUse({caster,item,targetToken,choice,voluntary,sourceToken,gridSize}) {
  if(!isResizeOtherPower(item)) throw new Error('Poder inválido para Resize Other.');
  if(!caster||!targetToken?.actor) throw new Error('Selecione um token que represente um personagem.');
  const target=targetToken.actor;
  if(caster?.uuid===target?.uuid || (sourceToken && sourceToken?.id===targetToken?.id)) throw new Error('Use Grow/Shrink para mudar seu próprio tamanho.');
  if(!withinTouch(sourceToken,targetToken,gridSize)) throw new Error('Resize Other exige tocar o alvo (aproxime os tokens).');
  const sizes=availableResizeOtherChoices(caster,target);
  if(!sizes.some(s=>s.key===choice)) throw new Error('Tamanho fora do limite de Grow/Shrink do personagem.');
  if(!voluntary && !hasGrabbedStatus(target)) throw new Error('O alvo não concorda: é necessário agarrá-lo primeiro.');
  if(choice==='normal' && !current(target)) throw new Error('O alvo não possui Resize Other ativo para desfazer.');
  return {target,sizes};
}
function marked(effect){return effect?.flags?.[SYSTEM]?.resizeOtherChoice===true;}
function sizeValue(actor){return effectiveActorTokenSize(actor);}
function savedChanges(effect){return clone(effect?.toObject?.()??effect);}
/** Apply only to target actor. Affected token is updated, not the caster's token. */
export async function applyResizeOtherToTarget(target,choice,caster,item,config) {
  if(!availableResizeOtherChoices(caster,target).some(s=>s.key===choice)) throw new Error('Tamanho não permitido pelos poderes do personagem.');
  const old=effectsOf(target).filter(e=>isResizeChoiceEffect(e));
  const oldSaved=old.map(savedChanges);
  const ownOld=old.filter(marked);
  if(choice==='normal') {
    if(!ownOld.length) throw new Error('Não há Resize Other para desfazer.');
    // If the target had self-Grow/Shrink before this spell, restore that prior choice.
    const previous=ownOld.find(e=>e.flags?.[SYSTEM]?.resizeOtherChoice)?.flags?.[SYSTEM]?.resizeOtherPreviousEffects??[];
    await target.deleteEmbeddedDocuments('ActiveEffect',ownOld.map(e=>e.id),{[RESIZE_SKIP_OPTION]:true});
    if(previous.length) await target.createEmbeddedDocuments('ActiveEffect',previous.map(value=>{
      const row=clone(value);delete row._id;delete row.id;return row;
    }),{[RESIZE_SKIP_OPTION]:true});
    const restored=sizeValue(target);
    const sizeSync=await syncActorTokenSize(target,restored);
    // The actor effect is already restored. A token-update failure is a partial
    // success, not an activation failure (refunding Focus here would be wrong).
    return {label:'Tamanho anterior restaurado',range:restored,category:restored};
  }
  const effect=clone(config?.sizeEffects?.[choice]);
  if(!effect) throw new Error(`Efeito de tamanho indisponível: ${choice}`);
  const existingOther=ownOld[0];
  const previous=existingOther ? clone(existingOther.flags?.[SYSTEM]?.resizeOtherPreviousEffects??[]) :
    old.filter(e=>!marked(e)).map(savedChanges);
  const natural=naturalGrowSize(target);
  const baseline=effectsOf(target).find(e=>!e.disabled && !isResizeChoiceEffect(e) && (
    e.flags?.[SYSTEM]?.managedSize===true || / Effects$/i.test(String(e.name??''))) &&
    changesOf(e).some(c=>c.key==='system.size' && String(c.value).toLowerCase()===natural));
  const bonuses=new Map(changesOf(baseline).filter(c=>c.key?.startsWith('system.abilities.')&&isEffectChangeType(c, 'add'))
    .map(c=>[c.key,Number(c.value)||0]));
  for(const c of effect.changes??effect.system?.changes??[]) {
    if(c.key==='system.size') c.priority=1000;
    if(bonuses.has(c.key)&&isEffectChangeType(c, 'add')) c.value=Number(c.value)-bonuses.get(c.key);
  }
  const label=availableResizeOtherChoices(caster,target).find(s=>s.key===choice);
  effect.name=`Resize Other — ${label.label}`;
  effect.transfer=false;
  effect.flags={...effect.flags,[SYSTEM]:{
    ...(effect.flags?.[SYSTEM]??{}),managedSize:false,resizeOtherChoice:true,resizeOtherSelectedSize:choice,
    resizeOtherPreviousEffects:previous,sourceActorUuid:caster.uuid??null,sourceItemId:item.id??null,
  }};
  if(old.length) await target.deleteEmbeddedDocuments('ActiveEffect',old.map(e=>e.id),{[RESIZE_SKIP_OPTION]:true});
  try {
    await target.createEmbeddedDocuments('ActiveEffect',[effect],{[RESIZE_SKIP_OPTION]:true});
  } catch(error) {
    // The power is not active if the new AE cannot be created. Restore prior
    // effects so a server/permission error does not erase the target's growth.
    if(oldSaved.length) {
      try { await target.createEmbeddedDocuments('ActiveEffect',oldSaved.map(value=>{
        const row=clone(value);delete row._id;delete row.id;return row;
      }),{[RESIZE_SKIP_OPTION]:true}); }
      catch(restoreError) { console.error(`[${SYSTEM}] Não foi possível restaurar efeitos anteriores:`,restoreError); }
    }
    throw error;
  }
  const tokenSync=await syncActorTokenSize(target,choice);
  // The new size effect was committed; failed token updates are a partial
  // success and must not trigger a Focus refund. The size module warns the GM.
  return {...label,category:choice,partial:Boolean(tokenSync.errors?.length)};
}

function actorByUuid(uuid){return globalThis.fromUuid?.(uuid)??Promise.resolve(null);}
async function executeResize({casterUuid,itemId,targetTokenUuid,casterTokenUuid,choice,voluntary,requesterId}) {
  const caster=await actorByUuid(casterUuid), token=await actorByUuid(targetTokenUuid);
  const from=await actorByUuid(casterTokenUuid), user=game.users?.get?.(requesterId);
  if(!caster||!token||!from||!user?.active) throw new Error('Ator, alvo ou usuário não encontrado.');
  if(!user.isGM && !caster.testUserPermission?.(user,'OWNER')) throw new Error('O usuário não controla o personagem que usa o poder.');
  const item=caster.items?.get?.(itemId)??effectsItems(caster).find(i=>i.id===itemId);
  if(!item) throw new Error('O personagem não possui o poder Resize Other.');
  if(token?.parent?.id!==canvas?.scene?.id||from?.parent?.id!==canvas?.scene?.id) throw new Error('Os tokens devem estar na cena ativa.');
  const gridSize=Number(canvas?.grid?.size??canvas?.scene?.grid?.size??0);
  validateResizeOtherUse({caster,item,targetToken:token,sourceToken:from,choice,voluntary,gridSize});
  // A player cannot unilaterally declare an NPC or another player's hero to
  // be willing. The active GM explicitly confirms consent before changing it.
  if(!user.isGM && voluntary && !hasGrabbedStatus(token.actor) &&
    !token.actor.testUserPermission?.(user,'OWNER')) {
    const DialogV2=globalThis.foundry?.applications?.api?.DialogV2;
    if(!DialogV2?.confirm) throw new Error('É necessário que o Mestre confirme a concordância do alvo.');
    const consent=await DialogV2.confirm({
      window:{title:'Resize Other — Consentimento do alvo'},
      content:`<p><strong>${escapeHtml(caster.name)}</strong> deseja aplicar Resize Other em <strong>${escapeHtml(token.name??token.actor.name)}</strong>.</p><p>O alvo é voluntário e concorda com a mudança de tamanho para <strong>${escapeHtml(choice)}</strong>?</p>`,
      rejectClose:false,
    });
    if(!consent) throw new Error('O Mestre não confirmou que o alvo aceita Resize Other.');
  }
  return applyResizeOtherToTarget(token.actor,choice,caster,item,CONFIG.MULTIVERSE_D616);
}

/** Register a single system socket listener. GM revalidates all mutations. */
export function registerResizeOtherSocket(){
  if(!globalThis.game?.socket?.on||game.multiverseD616?._resizeOtherSocketRegistered) return;
  const namespace=game.multiverseD616=game.multiverseD616??{};
  namespace._resizeOtherSocketRegistered=true;
  game.socket.on(SOCKET,data=>{
    if(data?.scope!==SCOPE) return;
    if(data.type==='RESULT' && data.requesterId===game.user?.id){
      const pending=REQUESTS.get(data.requestId);if(!pending)return;
      REQUESTS.delete(data.requestId);clearTimeout(pending.timeout);
      pending.resolve(data.ok?data.result:{error:data.error??'Falha ao aplicar Resize Other.'});
    }
    if(data.type==='REQUEST' && userIsGM() && (!primaryGM() || game.user?.id===primaryGM()?.id)){
      void (async()=>{
        let result=null,error=null;
        try{result=await executeResize(data);}catch(e){error=String(e?.message??e);console.error(`[${SYSTEM}] Resize Other:`,e);}
        game.socket.emit(SOCKET,{scope:SCOPE,type:'RESULT',requestId:data.requestId,requesterId:data.requesterId,ok:!error,error,result});
      })();
    }
  });
}
export async function requestResizeOther(caster,item,prompt) {
  const args={casterUuid:caster.uuid,itemId:item.id,targetTokenUuid:prompt.targetTokenUuid,
    casterTokenUuid:prompt.casterTokenUuid,choice:prompt.choice,voluntary:prompt.voluntary,
    requesterId:game.user?.id};
  if(userIsGM()) return executeResize(args);
  if(!primaryGM()?.active) throw new Error('É necessário um Mestre conectado para redimensionar outro personagem.');
  return await new Promise((resolve,reject)=>{
    const requestId=id();
    const timeout=setTimeout(()=>{REQUESTS.delete(requestId);reject(new Error('O Mestre não respondeu à solicitação de Resize Other.'));},60000);
    REQUESTS.set(requestId,{resolve,reject,timeout});
    game.socket.emit(SOCKET,{scope:SCOPE,type:'REQUEST',requestId,...args});
  }).then(result=>{if(result?.error) throw new Error(result.error);return result;});
}
/** Returns null when cancelled. No Focus is spent until this dialog resolves. */
export async function promptResizeOtherChoice(item,caster){
  const targets=Array.from(globalThis.game?.user?.targets??[]);
  if(targets.length!==1) throw new Error('Marque exatamente um token como alvo de Resize Other.');
  const targetToken=tokenDoc(targets[0]), casterToken=ownedCasterToken(caster);
  if(!casterToken) throw new Error('Coloque e selecione o token do personagem na mesma cena que o alvo.');
  const choices=availableResizeOtherChoices(caster,targetToken?.actor);
  if(choices.length<=1) throw new Error('Resize Other exige Rank 3 e Grow 2 ou Shrink 2 para oferecer categorias válidas.');
  const size=Number(canvas?.grid?.size??canvas?.scene?.grid?.size??0);
  if(!withinTouch(casterToken,targetToken,size)) throw new Error('É necessário tocar o alvo: aproxime os tokens antes de usar Resize Other.');
  const options=choices.filter(c=>c.key!=='normal'||Boolean(current(targetToken.actor)));
  const selectHtml=options.map(c=>`<option value="${c.key}">${c.label} — ${c.range}</option>`).join('');
  const content=`<div class="form-group"><p><strong>Alvo:</strong> ${escapeHtml(targetToken.name??targetToken.actor?.name??'Personagem')}</p>
    <label>Categoria de tamanho</label><select name="resizeOtherSize" style="width:100%;margin:8px 0">${selectHtml}</select>
    <label><input type="checkbox" name="voluntary" checked /> O alvo concorda com o redimensionamento</label>
    <p class="hint">Um alvo que não concorda precisa estar Agarrado antes da ativação. Exige toque e custa 10 Focus. A mudança é permanente até ser desfeita.</p></div>`;
  const DialogV2=globalThis.foundry?.applications?.api?.DialogV2;
  if(!DialogV2?.wait) throw new Error('A janela de Resize Other requer Foundry VTT v14.');
  const response=await DialogV2.wait({window:{title:`Resize Other — ${item.name}`},content,rejectClose:false,
    buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'apply',label:'Aplicar tamanho',default:true,callback:(_e,button)=>({
        choice:button.form.elements.resizeOtherSize.value,
        voluntary:button.form.elements.voluntary.checked,
      })}],
  });
  if(!response) return null;
  const prompt={...response,targetTokenUuid:targetToken.uuid,casterTokenUuid:casterToken.uuid};
  if(!options.some(s=>s.key===prompt.choice)) throw new Error('Seleção de tamanho inválida.');
  validateResizeOtherUse({caster,item,targetToken,sourceToken:casterToken,gridSize:size,
    choice:prompt.choice,voluntary:prompt.voluntary});
  return prompt;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
