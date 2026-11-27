/** Multiverse-D616 v0.2.233 — priority batch 11.
 * Shared, GM-authoritative Concentration support for Let's Go,
 * Never Surrender and Mental Shelter. Resource spending remains in Item.roll.
 * Recipients never gain permanent ownership of another actor.
 */
import { getConcentrationPowerEffects } from './concentration.js';
const S='multiverse-d616', SOCKET=`system.${S}`;
const TARGET='nativeLot11Recipient', SOURCE='nativeLot11Source';
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const official=(i,name,set)=>i?.type==='power'&&i?.name===name&&i?.system?.powerSet===set;
export const isLetsGo=i=>official(i,"Let's Go",'Healing');
export const isNeverSurrender=i=>official(i,'Never Surrender','Healing');
export const isMentalShelter=i=>official(i,'Mental Shelter','Telepathy');
export const isLot11Support=i=>isLetsGo(i)||isNeverSurrender(i)||isMentalShelter(i);
export const lot11Kind=i=>isLetsGo(i)?'health':isNeverSurrender(i)?'focus':isMentalShelter(i)?'shelter':null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rank=a=>Math.max(1,Math.floor(Number(a?.system?.attributes?.rank?.value??a?.system?.rank?.value??a?.system?.rank??1)||1));
const gm=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const owner=(a,u)=>!!a&&(!!u?.isGM||!!a.testUserPermission?.(u,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));
const grid=s=>Math.max(1,Number(s?.grid?.size)||100);
/** Reach is measured in grid spaces, including active size/Extended Reach effects. */
export const supportReach=(actor,kind)=>kind==='focus'?Math.max(0,Number(actor?.system?.reach??1)||0):1;
const center=t=>({x:Number(t?.x??0)+Number(t?.width??1)*grid(t?.parent)/2,y:Number(t?.y??0)+Number(t?.height??1)*grid(t?.parent)/2});
const d=(a,b,scene)=>Math.hypot(center(a).x-center(b).x,center(a).y-center(b).y)/grid(scene);
const actorForMessage=m=>game.scenes?.get?.(m?.speaker?.scene)?.tokens?.get?.(m?.speaker?.token)?.actor??game.actors?.get?.(m?.speaker?.actor);
const originFor=(a,scene)=>a?.token?.parent?.id===scene?.id?a.token:
  canvas?.tokens?.controlled?.find?.(t=>t.actor?.uuid===a?.uuid)?.document??
  all(scene?.tokens).find(t=>t.actor?.uuid===a?.uuid||t.actorId===a?.id);
const concentrationFor=(a,id)=>getConcentrationPowerEffects(a,{activeOnly:true}).find(e=>
  !e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.transient===true&&
  String(e.flags[S].concentrationPower.itemId)===String(id));
export function uncannyLevel(actor){
  const levels=all(actor?.items).filter(i=>i?.type==='power'&&i?.system?.powerSet==='Basic')
    .map(i=>/^Uncanny ([1-4])$/.exec(String(i?.name??'')))
    .filter(Boolean).map(m=>Number(m[1]));
  return Math.max(0,...levels);
}
export function lot11TargetEligibility(item,sel,scene,origin){
  const kind=lot11Kind(item),a=item?.actor;
  if(!a||!kind||!scene||!origin||origin.parent?.id!==scene.id||sel?.version!==1||
    sel?.kind!==kind||sel.sceneId!==scene.id||sel.sourceTokenId!==origin.id)
    return {ok:false,reason:'Fonte, poder ou cena inválida.'};
  const max=kind==='shelter'?50:1,ids=sel.tokenIds;
  if(!Array.isArray(ids)||ids.length<1||ids.length>max||new Set(ids).size!==ids.length)
    return {ok:false,reason:`Selecione ${kind==='shelter'?'pessoas diferentes':'exatamente um alvo'}.`};
  const dr=kind==='shelter'?uncannyLevel(a):0;
  if(kind==='shelter'&&!dr)return {ok:false,reason:'Mental Shelter exige Uncanny 1–4.'};
  const distanceLimit=kind==='shelter'?5*rank(a):supportReach(a,kind);
  const recipients=[],seen=new Set();
  for(const id of ids){
    const t=scene.tokens?.get?.(id);
    if(!t?.actor||t.parent?.id!==scene.id)return {ok:false,reason:'Token não existe na cena.'};
    if(seen.has(t.actor.uuid))return {ok:false,reason:'Selecione apenas um token de cada personagem.'};
    seen.add(t.actor.uuid);
    if(d(origin,t,scene)>distanceLimit+1e-6)
      return {ok:false,reason:kind==='shelter'?`Mental Shelter: alvo além de ${distanceLimit} espaços.`:`${item.name}: alvo fora de ${kind==='focus'?'Reach':'toque'} (${distanceLimit} espaços).`};
    if(kind==='health'&&!(Number(t.actor.system?.health?.value)<=0))
      return {ok:false,reason:"Let's Go exige alvo com Health 0 ou menos."};
    if(kind==='focus'&&!(Number(t.actor.system?.focus?.value)<=0))
      return {ok:false,reason:'Never Surrender exige alvo com Focus 0 ou menos.'};
    recipients.push(t);
  }
  return {ok:true,kind,dr,recipients};
}
export async function selectLot11Targets(item){
  const scene=globalThis.canvas?.scene,source=originFor(item.actor,scene),kind=lot11Kind(item);
  if(!scene||!source||!kind)throw Error('Selecione o token do usuário na cena.');
  if(!game.user?.isGM&&!game.users?.activeGM)throw Error('Um Mestre deve estar conectado.');
  const candidates=all(scene.tokens).filter(t=>t?.actor&&
    (kind==='shelter'?(uncannyLevel(item.actor)>0&&d(source,t,scene)<=5*rank(item.actor)+1e-6):
      (d(source,t,scene)<=supportReach(item.actor,kind)+1e-6&&
      (kind==='health'?Number(t.actor.system?.health?.value)<=0:Number(t.actor.system?.focus?.value)<=0))));
  if(!candidates.length)throw Error('Não há alvos elegíveis.');
  const dialog=globalThis.foundry?.applications?.api?.DialogV2;
  if(!dialog?.wait)throw Error('A seleção de alvos exige Foundry v14.');
  const multi=kind==='shelter';
  const html=candidates.map(t=>`<label style="display:block;padding:4px"><input type="${multi?'checkbox':'radio'}" name="lot11target" value="${esc(t.id)}"> ${esc(t.name??t.actor.name)}</label>`).join('');
  const chosen=await dialog.wait({window:{title:`${item.name} — alvos`},rejectClose:false,
    content:`<p>${multi?`Escolha aliados dentro de ${5*rank(item.actor)} espaços; RD de Focus ${uncannyLevel(item.actor)}.`:`Escolha um personagem com Health/Focus zero dentro de ${kind==='focus'?'Reach':'toque'} (${supportReach(item.actor,kind)} espaços).`}</p><p>O Mestre confirma. Cancelar não gasta recursos.</p><form>${html}</form>`,
    buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'confirm',label:'Confirmar',default:true,callback:(_e,b)=>
        [...b.form.querySelectorAll('input[name=lot11target]:checked')].map(x=>x.value)}]});
  if(!chosen)return null;
  const selection={version:1,kind,sceneId:scene.id,sourceTokenId:source.id,tokenIds:chosen};
  const check=lot11TargetEligibility(item,selection,scene,source);
  if(!check.ok)throw Error(check.reason);
  return selection;
}
const targetMark=e=>e?.flags?.[S]?.[TARGET];
/** A zero-resource rescue is valid only when the source concentration survives. */
export function activeZeroRescue(actor,kind,{scenes=globalThis.game?.scenes}={}){
  if(!actor||!['health','focus'].includes(kind))return false;
  for(const e of all(actor.effects)){
    const m=targetMark(e);
    if(e.disabled||e.duration?.expired===true||m?.version!==1||m.kind!==kind)continue;
    const scene=scenes?.get?.(m.sceneId),source=scene?.tokens?.get?.(m.sourceTokenId);
    const fx=source?.actor&&all(source.actor.effects).find(x=>x.id===m.sourceEffectId&&
      !x.disabled&&x.duration?.expired!==true);
    const state=fx?.flags?.[S]?.[SOURCE];
    if(state?.version===1&&state.kind===kind&&state.sceneId===m.sceneId&&
      state.sourceTokenId===m.sourceTokenId&&state.tokenIds?.includes(m.tokenId))return true;
  }
  return false;
}
export function zeroRescueActionBlocked(actor,item){
  if(!actor||Number(actor.system?.health?.value)>0||!activeZeroRescue(actor,'health'))return false;
  // Let's Go only allows Movement: no Standard nor Reaction uses, including
  // an item offering either action. Never remove the user's Move allowance.
  const action=String(item?.system?.action??'').toLowerCase();
  return item?.type==='weapon'||/standard|padr[aã]o|reaction|rea[cç][aã]o/.test(action)||
    (item?.type==='power'&&!/movement|movimento/.test(action));
}
function effectData(mark,dr){
  const k=mark.kind,name={health:"Let's Go — Consciente",focus:'Never Surrender — Determinado',shelter:'Mental Shelter — Proteção mental'}[k];
  const changes=k==='shelter'?[{key:'system.focusDamageReduction',type:'upgrade',value:Number(dr),phase:'initial',priority:null}]:[];
  return {name,img:'systems/multiverse-d616/icons/super-powers.svg',showIcon:2,
    disabled:false,transfer:false,changes,system:{changes},flags:{[S]:{[TARGET]:mark}}};
}
// No two synchronizers ever try to delete the same embedded effect in parallel.
let queue=Promise.resolve();
export const syncLot11Support=()=>{const job=queue.catch(()=>{}).then(syncLot11Now);queue=job.catch(()=>{});return job;};
async function syncLot11Now(){
  if(!gm())return 0;
  const required=new Map(),expired=[];
  for(const scene of all(game.scenes))for(const source of all(scene.tokens)){
    const actor=source.actor;if(!actor)continue;
    for(const fx of getConcentrationPowerEffects(actor,{activeOnly:true})){
      const state=fx.flags?.[S]?.[SOURCE];
      if(state?.version!==1||state.sceneId!==scene.id||state.sourceTokenId!==source.id)continue;
      if(!fx.flags?.[S]?.concentrationPower?.transient||fx.disabled)continue;
      const item=actor.items?.get?.(fx.flags[S].concentrationPower.itemId);
      if(lot11Kind(item)!==state.kind)continue;
      const dr=state.kind==='shelter'?uncannyLevel(actor):0;
      if(state.kind==='shelter'&&!dr){expired.push([actor,fx.id]);continue;}
      let stop=false;
      for(const tokenId of state.tokenIds??[]){
        const t=scene.tokens?.get?.(tokenId);if(!t?.actor)continue;
        const amount=Number(t.actor.system?.[state.kind==='health'?'health':'focus']?.value);
        if(state.kind!=='shelter'&&Number.isFinite(amount)&&amount>0){stop=true;break;}
        const mark={version:1,kind:state.kind,sceneId:scene.id,tokenId:t.id,sourceTokenId:source.id,
          sourceEffectId:fx.id,sourceActorUuid:actor.uuid,sourceItemId:item.id};
        required.set(`${t.actor.uuid}|${state.kind}|${fx.id}`,{actor:t.actor,mark,dr});
      }
      if(stop)expired.push([actor,fx.id]);
    }
  }
  for(const [actor,id] of expired){if(actor.effects?.get?.(id)||all(actor.effects).some(e=>e.id===id))
    await actor.deleteEmbeddedDocuments('ActiveEffect',[id]);}
  // Actors with previously supported effects are included even when the
  // source concentration ended, ensuring restored KO/Demoralized status.
  const actors=new Map();
  for(const scene of all(game.scenes))for(const t of all(scene.tokens))if(t.actor)actors.set(t.actor.uuid,t.actor);
  for(const {actor} of required.values())actors.set(actor.uuid,actor);
  let changed=0;
  for(const actor of actors.values()){
    const installed=all(actor.effects).filter(e=>targetMark(e)?.version===1);
    const needs=[...required.values()].filter(v=>v.actor.uuid===actor.uuid);
    for(const e of installed){
      const m=targetMark(e),key=`${actor.uuid}|${m.kind}|${m.sourceEffectId}`;
      const needed=required.get(key);
      if(!needed||e.disabled||e.duration?.expired===true){
        await actor.deleteEmbeddedDocuments('ActiveEffect',[e.id]);changed++;continue;
      }
      if(m.kind==='shelter'&&Number(e.system?.changes?.find?.(c=>c.key==='system.focusDamageReduction')?.value??e.changes?.find?.(c=>c.key==='system.focusDamageReduction')?.value)!==needed.dr){
        const changes=effectData(m,needed.dr).system.changes;
        await e.update({changes,'system.changes':changes});changed++;
      }
    }
    for(const v of needs){
      if(all(actor.effects).some(e=>!e.disabled&&targetMark(e)?.version===1&&
        targetMark(e).kind===v.mark.kind&&targetMark(e).sourceEffectId===v.mark.sourceEffectId))continue;
      await actor.createEmbeddedDocuments('ActiveEffect',[effectData(v.mark,v.dr)]);changed++;
    }
    // The core status tracker reacts to Health/Focus updates; here also
    // reconcile status when a rescue concentration is removed at 0.
    for(const [kind,status] of [['health','mmrpg.incapacitated'],['focus','mmrpg.demoralized']]){
      const zero=Number(actor.system?.[kind]?.value)<=0;
      const should=zero&&!activeZeroRescue(actor,kind);
      if(actor.statuses?.has?.(status)!==should&&actor.toggleStatusEffect)
        await actor.toggleStatusEffect(status,{active:should});
    }
  }
  return changed;
}
export async function applyLot11Activation(message,selection,{confirm=null}={}){
  if(!gm())throw Error('Somente o Mestre pode autorizar este suporte.');
  const scene=game.scenes?.get?.(selection?.sceneId),source=scene?.tokens?.get?.(selection?.sourceTokenId);
  const actor=source?.actor,item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
  if(!actor||message.speaker?.scene!==scene?.id||
    (message.speaker?.token&&message.speaker.token!==source.id)||
    (message.speaker?.actor&&message.speaker.actor!==actor.id))throw Error('Origem do pedido não autenticada.');
  const c=lot11TargetEligibility(item,selection,scene,source);
  if(!c.ok)throw Error(c.reason);
  if(message.getFlag(S,'nativeLot11Activated'))throw Error('Ativação já resolvida.');
  const fx=concentrationFor(actor,item.id);
  if(!fx)throw Error('A Concentração não está ativa.');
  if(fx.flags?.[S]?.[SOURCE])throw Error('O suporte já foi ativado.');
  const ask=confirm??(ctx=>foundry.applications.api.DialogV2.confirm({window:{title:`${item.name} — Mestre`},rejectClose:false,
    content:`<p><b>${esc(actor.name)}</b> protegerá: ${ctx.names}.</p><p>${c.kind==='shelter'?`RD de Focus ${c.dr}.`:'O benefício somente permanece enquanto o valor do recurso for zero.'}</p>`}));
  if(!(await ask({names:c.recipients.map(t=>esc(t.name)).join(', '),check:c})))return {ok:false,canceled:true};
  const state={version:1,kind:c.kind,sceneId:scene.id,sourceTokenId:source.id,
    tokenIds:c.recipients.map(t=>t.id),dr:c.dr,activatedAt:Date.now()};
  await fx.setFlag(S,SOURCE,state);
  await message.setFlag(S,'nativeLot11Activated',{effectId:fx.id,...state});
  await syncLot11Support();
  await message.update({content:`<p><b>${esc(item.name)}</b>: ${c.recipients.map(t=>esc(t.name)).join(', ')} — suporte autorizado pelo Mestre.</p>`});
  return {ok:true,...state};
}
const pending=new Map();
async function requestGM(message,selection){
  if(gm())return applyLot11Activation(message,selection);
  if(!game.users?.activeGM)throw Error('Não há Mestre conectado.');
  const id=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('O Mestre não respondeu.'));},90000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
    game.socket.emit(SOCKET,{type:'native-lot11-request',id,messageId:message.id,selection});
  });
}
export async function activateLot11AfterPay(item,selection){
  if(!selection||!isLot11Support(item))return false;
  const message=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
    content:`<p><b>${esc(item.name)}:</b> alvos selecionados, aguardando confirmação do Mestre.</p>`,
    flags:{[S]:{itemId:item.id,nativeLot11Request:selection}}});
  try{const result=await requestGM(message,selection);
    if(!result?.ok)throw Error('Ativação não autorizada.');
    ui.notifications?.info?.(`${item.name}: suporte ativo.`);return true;
  }catch(e){ui.notifications?.warn?.(`${item.name}: ${String(e.message??e)}. Revise os recursos com o Mestre.`);return false;}
}
export function registerNativePriorityLot11Hooks({hooks=globalThis.Hooks}={}){
  game.socket.on(SOCKET,async(data,userId)=>{
    if(data?.type==='native-lot11-reply'&&data.to===game.user.id){
      const p=pending.get(data.id);if(!p)return;pending.delete(data.id);
      data.ok?p.resolve(data.result):p.reject(Error(data.error));return;
    }
    if(data?.type!=='native-lot11-request'||!gm())return;
    let ok=false,result=null,error='Solicitação inválida.';
    try{
      const user=game.users.get(userId),message=game.messages.get(data.messageId),
        scene=game.scenes.get(data.selection?.sceneId),token=scene?.tokens?.get?.(data.selection?.sourceTokenId),actor=token?.actor;
      if(!user?.active||!owner(actor,user)||!message||
        !(message.author?.id===user.id||message.user?.id===user.id)||
        JSON.stringify(message.getFlag?.(S,'nativeLot11Request'))!==JSON.stringify(data.selection))
        throw Error('Solicitação não autorizada.');
      result=await applyLot11Activation(message,data.selection);ok=true;
    }catch(e){error=String(e?.message??e);console.warn('[D616] Lote 11:',e);}
    game.socket.emit(SOCKET,{type:'native-lot11-reply',to:userId,id:data.id,ok,result,error});
  });
  let busy=false,recheck=false;
  const sync=()=>{if(!gm())return;if(busy){recheck=true;return;}busy=true;
    void(async()=>{do{recheck=false;await syncLot11Support();}while(recheck);})()
      .catch(e=>console.error('[D616] Lote 11: sync',e)).finally(()=>{busy=false;});};
  for(const event of ['updateActor','updateToken','createToken','deleteToken',
    'deleteActiveEffect','updateActiveEffect','createActiveEffect','canvasReady'])hooks.on(event,sync);
  sync();
}
