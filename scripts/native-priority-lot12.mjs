/** Multiverse-D616 v0.2.234 — shared support mechanics (Lot 12).
 * Body Sphere protects co-located participants with Health RD 3; the
 * GM owns application, displacement and cleanup. Probability Manipulation
 * Hex chooses one ally and converts a NET Trouble roll into one Edge while
 * in range; it never edits dice after the roll. Bounce Back's fall damage
 * still depends on the Narrator's fall-damage resolution.
 */
import {getConcentrationPowerEffects} from './concentration.js';
const S='multiverse-d616',SOCKET=`system.${S}`,STATE='nativeLot12State',MARK='nativeLot12Recipient';
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const official=(i,n,set)=>i?.type==='power'&&i?.name===n&&i.system?.powerSet===set;
export const isBodySphere=i=>official(i,'Body Sphere','Plasticity');
export const isProbabilityHex=i=>official(i,'Probability Manipulation Hex','Magic');
export const isBounceBack=i=>official(i,'Bounce Back','Plasticity');
export const isLot12Group=i=>isBodySphere(i)||isProbabilityHex(i);
const kindOf=i=>isBodySphere(i)?'sphere':isProbabilityHex(i)?'probability':null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grid=s=>Math.max(1,Number(s?.grid?.size)||100);
const center=t=>({x:Number(t?.x??0)+(Number(t?.width??1)*grid(t?.parent))/2,y:Number(t?.y??0)+(Number(t?.height??1)*grid(t?.parent))/2});
const distance=(a,b,scene)=>Math.hypot(center(a).x-center(b).x,center(a).y-center(b).y)/grid(scene);
const rank=a=>Math.max(1,Math.trunc(Number(a?.system?.attributes?.rank?.value??a?.system?.rank?.value??a?.system?.rank??1)||1));
const gm=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const owner=(a,u)=>!!a&&(!!u?.isGM||!!a.testUserPermission?.(u,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));
const actorFromMessage=m=>game.scenes?.get?.(m?.speaker?.scene)?.tokens?.get?.(m?.speaker?.token)?.actor??game.actors?.get?.(m?.speaker?.actor);
const sourceToken=(a,scene)=>a?.token?.parent?.id===scene?.id?a.token:globalThis.canvas?.tokens?.controlled?.find?.(t=>t.actor?.uuid===a?.uuid)?.document??all(scene?.tokens).find(t=>t.actor?.uuid===a?.uuid);
const concentration=(a,id)=>getConcentrationPowerEffects(a,{activeOnly:true}).find(e=>!e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.transient===true&&String(e.flags[S].concentrationPower.itemId)===String(id));
export function lot12Eligibility(item,sel,scene,source){
 const kind=kindOf(item),a=item?.actor;
 if(!kind||!a||!scene||!source||source.parent?.id!==scene.id||sel?.version!==1||sel.kind!==kind||sel.sceneId!==scene.id||sel.sourceTokenId!==source.id)return {ok:false,reason:'Poder, fonte ou cena divergente.'};
 const ids=sel.tokenIds,max=kind==='sphere'?rank(a):1;
 if(!Array.isArray(ids)||!ids.length||ids.length>max||new Set(ids).size!==ids.length)return {ok:false,reason:`Escolha de 1 a ${max} alvos diferentes.`};
 const participants=[],seen=new Set();
 for(const id of ids){
  const t=scene.tokens?.get?.(id);if(!t?.actor||t.parent?.id!==scene.id||t.id===source.id||seen.has(t.actor.uuid))return {ok:false,reason:'Escolha aliados diferentes do lançador.'};
  seen.add(t.actor.uuid);
  const limit=kind==='sphere'?1:5*rank(a);
  if(distance(source,t,scene)>limit+1e-6)return {ok:false,reason:`${item.name}: aliado fora de ${limit} espaços.`};
  if(kind==='sphere'&&(Number(t.width??1)>Number(source.width??1)||Number(t.height??1)>Number(source.height??1)))
   return {ok:false,reason:'Body Sphere: o Mestre deve validar o tamanho e a co-localização dos participantes.'};
  participants.push(t);
 }
 return {ok:true,participants,kind,maximum:max};
}
export async function selectLot12Allies(item){
 const scene=globalThis.canvas?.scene,source=sourceToken(item?.actor,scene),kind=kindOf(item);
 if(!scene||!source||!kind)throw Error('Selecione o token do usuário na cena.');
 if(!game.user?.isGM&&!game.users?.activeGM)throw Error('Um Mestre deve estar conectado.');
 const max=kind==='sphere'?rank(item.actor):1,limit=kind==='sphere'?1:5*rank(item.actor);
 const candidates=all(scene.tokens).filter(t=>t?.actor&&t.id!==source.id&&distance(source,t,scene)<=limit+1e-6);
 if(!candidates.length)throw Error(`Nenhum aliado a até ${limit} espaços.`);
 const D=globalThis.foundry?.applications?.api?.DialogV2;if(!D?.wait)throw Error('Requer Foundry v14.');
 const html=candidates.map(t=>`<label style="display:block;padding:5px"><input type="${kind==='sphere'?'checkbox':'radio'}" name="lot12ally" value="${esc(t.id)}"> ${esc(t.name??t.actor.name)}</label>`).join('');
 const chosen=await D.wait({window:{title:`${item.name} — participantes`},rejectClose:false,
  content:`<p>Escolha ${kind==='sphere'?`até ${max} aliados para a esfera (mesmo espaço)`:'um aliado que receberá a conversão de Trouble em Edge'}; alcance ${limit} espaços. O Mestre confirma. Cancelar não gasta Focus.</p><form>${html}</form>`,
  buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},{action:'confirm',label:'Confirmar',default:true,callback:(_e,b)=>[...b.form.querySelectorAll('input[name=lot12ally]:checked')].map(x=>x.value)}]});
 if(!chosen)return null;
 const selection={version:1,kind,sceneId:scene.id,sourceTokenId:source.id,tokenIds:chosen};
 const check=lot12Eligibility(item,selection,scene,source);if(!check.ok)throw Error(check.reason);
 return selection;
}
const recipientMark=e=>e?.flags?.[S]?.[MARK];
const effectFor=(source,mark)=>({name:mark.kind==='sphere'?'Body Sphere — Escudo coletivo':'Probability Manipulation Hex — Sorte alterada',
 img:'systems/multiverse-d616/icons/super-powers.svg',showIcon:2,disabled:false,transfer:false,
 changes:mark.kind==='sphere'?[{key:'system.healthDamageReduction',type:'upgrade',value:3,phase:'initial',priority:null}]:[],
 flags:{[S]:{[MARK]:mark}}});
/** Untrusted actor flags cannot grant Edge by themselves; verify the live GM
 * concentration, identity, scene and reach on each individual roll. */
export function activeProbabilityHex(actor,{scenes=globalThis.game?.scenes}={}){
 for(const effect of all(actor?.effects)){
  const m=recipientMark(effect);
  if(effect.disabled||effect.duration?.expired===true||m?.version!==1||m.kind!=='probability')continue;
  const scene=scenes?.get?.(m.sceneId),recipient=scene?.tokens?.get?.(m.tokenId),source=scene?.tokens?.get?.(m.sourceTokenId);
  if(!source?.actor||!recipient?.actor||recipient.actor.uuid!==actor?.uuid)continue;
  const fx=all(source.actor.effects).find(e=>e.id===m.sourceEffectId&&!e.disabled&&e.duration?.expired!==true);
  const state=fx?.flags?.[S]?.[STATE];const power=source.actor.items?.get?.(m.sourceItemId);
  if(!isProbabilityHex(power)||state?.version!==1||state.kind!=='probability'||
     !state.tokenIds?.includes(recipient.id)||distance(source,recipient,scene)>5*rank(source.actor)+1e-6)continue;
  return {source:source.actor.name,sourceActorUuid:source.actor.uuid,mark:m};
 }
 return null;
}
export function probabilityRollConversion(actor,computed,{scenes=globalThis.game?.scenes}={}){
 if(!computed||!Number.isFinite(Number(computed.net))||Number(computed.net)>=0)return computed;
 const effect=activeProbabilityHex(actor,{scenes});if(!effect)return computed;
 const positives=(computed.sources??[]).filter(s=>s.sign>0);
 const source={source:`Probability Manipulation Hex (${effect.source})`,reason:'Trouble líquido removido; 1 Edge concedido pela Concentração',sign:1};
 const sources=[...positives,source];
 return {...computed,sources,edges:sources.filter(s=>s.sign>0).length,troubles:0,baseMode:0,
  net:Math.max(1,sources.length),edgeMode:1,requiresDecision:sources.length>1,probabilityConverted:true};
}
let syncQueue=Promise.resolve();
export function syncLot12Effects(){const job=syncQueue.catch(()=>{}).then(syncNow);syncQueue=job.catch(()=>{});return job;}
async function syncNow(){
 if(!gm())return 0;
 const required=new Map(),actors=new Map();
 for(const scene of all(game.scenes))for(const token of all(scene.tokens)){
  if(token.actor)actors.set(token.actor.uuid,token.actor);
  if(!token.actor)continue;
  for(const fx of getConcentrationPowerEffects(token.actor,{activeOnly:true})){
   const state=fx.flags?.[S]?.[STATE],power=token.actor.items?.get?.(state?.sourceItemId);
   if(state?.version!==1||!isLot12Group(power)||kindOf(power)!==state.kind||state.sceneId!==scene.id||state.sourceTokenId!==token.id)continue;
   for(const id of state.tokenIds??[]){
    const member=scene.tokens?.get?.(id);if(!member?.actor)continue;
    const valid=lot12Eligibility(power,{version:1,kind:state.kind,sceneId:scene.id,sourceTokenId:token.id,tokenIds:[id]},scene,token);
    // Body Sphere members travel with their source, so reach is not a release
    // trigger; manual movement is blocked while they are protected.
    if(!valid.ok&&state.kind!=='sphere')continue;
    const mark={version:1,kind:state.kind,sceneId:scene.id,tokenId:member.id,sourceTokenId:token.id,
     sourceEffectId:fx.id,sourceItemId:power.id,sourceActorUuid:token.actor.uuid};
    required.set(`${member.actor.uuid}|${fx.id}|${member.id}`,{actor:member.actor,member,source:token,mark});
   }
  }
 }
 let changes=0;
 for(const actor of actors.values()){
  const existing=all(actor.effects).filter(e=>recipientMark(e)?.version===1);
  for(const e of existing){const m=recipientMark(e);
   if(!required.has(`${actor.uuid}|${m.sourceEffectId}|${m.tokenId}`)){
    await actor.deleteEmbeddedDocuments('ActiveEffect',[e.id]);changes++;
   }
  }
 }
 for(const {actor,mark} of required.values()){
  if(all(actor.effects).some(e=>!e.disabled&&recipientMark(e)?.sourceEffectId===mark.sourceEffectId&&recipientMark(e)?.tokenId===mark.tokenId))continue;
  await actor.createEmbeddedDocuments('ActiveEffect',[effectFor(null,mark)]);changes++;
 }
 return changes;
}
/** Only the GM may carry sphere members; never change token owners. */
export async function carrySphereParticipants(sourceDoc){
 if(!gm()||!sourceDoc?.parent)return 0;
 const scene=sourceDoc.parent,sourceActor=sourceDoc.actor;let count=0;
 for(const fx of getConcentrationPowerEffects(sourceActor,{activeOnly:true})){
  const state=fx.flags?.[S]?.[STATE];if(state?.kind!=='sphere'||state?.sourceTokenId!==sourceDoc.id||state.sceneId!==scene.id)continue;
  for(const id of state.tokenIds??[]){const t=scene.tokens?.get?.(id);if(!t||t.id===sourceDoc.id)continue;
   if(Math.abs(Number(t.x)-Number(sourceDoc.x))<1&&Math.abs(Number(t.y)-Number(sourceDoc.y))<1)continue;
   await t.update({x:sourceDoc.x,y:sourceDoc.y},{nativeLot12Carry:true});count++;
  }
 }
 return count;
}
export function sphereMovementBlocked(token,changes,options={}){
 if(options?.nativeLot12Carry||!('x' in changes)&&!('y' in changes))return false;
 const scene=token?.parent,actor=token?.actor;
 if(!scene||!actor)return false;
 return all(actor.effects).some(e=>{
  const m=recipientMark(e);
  if(e.disabled||e.duration?.expired===true||m?.kind!=='sphere'||
     m.sceneId!==scene.id||m.tokenId!==token.id)return false;
  const source=scene.tokens?.get?.(m.sourceTokenId);
  if(!source?.actor||source.actor.uuid!==m.sourceActorUuid)return false;
  const holder=all(source.actor.effects).find(f=>f.id===m.sourceEffectId&&!f.disabled&&f.duration?.expired!==true);
  const state=holder?.flags?.[S]?.[STATE];
  return state?.version===1&&state.kind==='sphere'&&state.sceneId===scene.id&&
    state.sourceTokenId===source.id&&state.tokenIds?.includes(token.id);
 });
}
const pending=new Map();
export async function applyLot12Activation(message,selection,{confirm=null}={}){
 if(!gm())throw Error('Somente o Mestre pode autorizar esse poder.');
 const scene=game.scenes?.get?.(selection?.sceneId),source=scene?.tokens?.get?.(selection?.sourceTokenId),actor=source?.actor;
 const item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
 if(!actor||message.speaker?.scene!==scene.id||message.speaker?.actor!==actor.id||message.speaker?.token!==source.id)throw Error('Fonte da ativação não autenticada.');
 const c=lot12Eligibility(item,selection,scene,source);if(!c.ok)throw Error(c.reason);
 if(message.getFlag(S,'nativeLot12Activated'))throw Error('Ativação já confirmada.');
 const fx=concentration(actor,item.id);if(!fx||fx.flags?.[S]?.[STATE])throw Error('Concentração ausente ou efeito já ativado.');
 const approved=confirm??(ctx=>foundry.applications.api.DialogV2.confirm({window:{title:`${item.name} — Mestre`},rejectClose:false,
  content:`<p><b>${esc(actor.name)}</b> deseja afetar: ${ctx.names}.</p><p>${c.kind==='sphere'?'RD Health 3, co-localização e imobilidade dos participantes.':'Quando o aliado tiver Trouble líquido, remover todos os Trouble e conceder Edge.'}</p>`}));
 if(!await approved({names:c.participants.map(t=>esc(t.name)).join(', ')}))return {ok:false,canceled:true};
 const state={version:1,kind:c.kind,sceneId:scene.id,sourceTokenId:source.id,sourceItemId:item.id,tokenIds:c.participants.map(t=>t.id)};
 await fx.setFlag(S,STATE,state);
 await message.setFlag(S,'nativeLot12Activated',{...state,effectId:fx.id});
 if(c.kind==='sphere')for(const t of c.participants)await t.update({x:source.x,y:source.y},{nativeLot12Carry:true});
 await syncLot12Effects();
 await message.update({content:`<p><b>${esc(item.name)}:</b> ${c.participants.map(t=>esc(t.name)).join(', ')} — efeito confirmado pelo Mestre.</p>`});
 return {ok:true,...state};
}
async function requestGM(message,selection){
 if(gm())return applyLot12Activation(message,selection);
 if(!game.users?.activeGM)throw Error('Mestre desconectado.');
 const id=foundry.utils.randomID();return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('Mestre não respondeu.'));},90000);
  pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
  game.socket.emit(SOCKET,{type:'native-lot12-request',id,messageId:message.id,selection});
 });
}
export async function activateLot12AfterPay(item,selection){
 const message=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
  content:`<p><b>${esc(item.name)}:</b> alvos selecionados; aguardando o Mestre.</p>`,
  flags:{[S]:{itemId:item.id,nativeLot12Request:selection}}});
 try{return await requestGM(message,selection);}catch(e){ui.notifications?.warn?.(`${item.name}: ${e.message}. Confira os recursos com o Mestre.`);return false;}
}
export async function bounceBackAfterPay(item,{confirmFall=async()=>true}={}){
 if(!isBounceBack(item)||!item?.actor)return false;
 const a=item.actor,prone=a.statuses?.has?.('mmrpg.prone')||all(a.effects).some(e=>!e.disabled&&all(e.statuses).includes('mmrpg.prone'));
 if(prone&&a.toggleStatusEffect)await a.toggleStatusEffect('mmrpg.prone',{active:false});
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:a}),
  content:`<p><b>Bounce Back:</b> ${prone?'Caído removido.':'Reação de queda declarada.'} O dano da <b>queda que disparou esta Reação é anulado</b>; o Mestre confirma o card de queda. Opcional: salto de até a Velocidade de Corrida do personagem, respeitando o mapa e o movimento.</p>`});
 return {removedProne:!!prone,fallDamageRequiresGM:true};
}
export function registerNativePriorityLot12Hooks({hooks=globalThis.Hooks}={}){
 game.socket.on(SOCKET,async(data,userId)=>{
  if(data?.type==='native-lot12-reply'&&data.to===game.user.id){const p=pending.get(data.id);if(p){pending.delete(data.id);data.ok?p.resolve(data.result):p.reject(Error(data.error));}return;}
  if(data?.type!=='native-lot12-request'||!gm())return;
  let ok=false,result=null,error='Solicitação inválida.';
  try{
   const user=game.users.get(userId),message=game.messages.get(data.messageId),scene=game.scenes.get(data.selection?.sceneId),actor=scene?.tokens?.get?.(data.selection?.sourceTokenId)?.actor;
   if(!user?.active||!owner(actor,user)||!message||(message.author?.id!==user.id&&message.user?.id!==user.id)||JSON.stringify(message.getFlag?.(S,'nativeLot12Request'))!==JSON.stringify(data.selection))throw Error('Solicitação não autorizada.');
   result=await applyLot12Activation(message,data.selection);ok=true;
  }catch(e){error=String(e?.message??e);console.warn('[D616] Lot12:',e);}
  game.socket.emit(SOCKET,{type:'native-lot12-reply',id:data.id,to:userId,ok,result,error});
 });
 let busy=false,again=false;
 const sync=()=>{if(!gm())return;if(busy){again=true;return;}busy=true;
  void(async()=>{do{again=false;await syncLot12Effects();}while(again);})().catch(e=>console.error('[D616] Lot12 sync:',e)).finally(()=>{busy=false;});};
 for(const event of ['updateActor','updateToken','createToken','deleteToken','deleteActiveEffect','updateActiveEffect','createActiveEffect','canvasReady'])hooks.on(event,sync);
 hooks.on('preUpdateToken',(token,changes,options)=>{
  if(sphereMovementBlocked(token,changes,options)){
   ui.notifications?.warn?.('Body Sphere: este participante só se move com quem mantém a esfera.');return false;
  }
 });
 hooks.on('updateToken',(token,changes,options)=>{
  if(!gm()||options?.nativeLot12Carry||!('x' in changes)&&!('y' in changes))return;
  void carrySphereParticipants(token).catch(e=>console.warn('[D616] Body Sphere carry:',e));
 });
 sync();
}
