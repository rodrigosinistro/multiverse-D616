import {dampenFactor} from './power-control-rules.mjs';
/** Multiverse-D616 v0.2.229 — group powers.
 * Uses the existing Concentration/Focus/Standard action transaction. All
 * scene, token and actor writes are made by the active GM over an authenticated
 * request. No permanent ownership changes or global movement/vision changes.
 */
import {getConcentrationPowerEffects} from './concentration.js';
import {captureCanvasCircle} from './elemental-draw-pointer.mjs';
const S='multiverse-d616',SOCKET=`system.${S}`;
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const valid=(i,n,set)=>i?.type==='power'&&i?.name===n&&i?.system?.powerSet===set;
export const isGroupFlight=i=>valid(i,'Group Flight','Basic');
export const isGroupLevitation=i=>valid(i,'Group Levitation','Telekinesis');
export const isGroupInvisibility=i=>valid(i,'Group Invisibility','Illusion');
export const isExtendInvisibility=i=>valid(i,'Extend Invisibility','Illusion');
export const isGroupLot7=i=>isGroupFlight(i)||isGroupLevitation(i)||isGroupInvisibility(i)||isExtendInvisibility(i);
export const groupKind=i=>isGroupFlight(i)?'flight':isGroupLevitation(i)?'levitation':(isGroupInvisibility(i)||isExtendInvisibility(i))?'invisibility':null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rank=a=>Math.max(1,Math.floor(Number(a?.system?.attributes?.rank?.value??a?.system?.rank?.value??a?.system?.rank??1)||1));
const number=(v,otherwise=0)=>Number.isFinite(Number(v))?Number(v):otherwise;
const grid=s=>Math.max(1,Number(s?.grid?.size)||100);
const centre=t=>({x:Number(t?.x??0)+Number(t?.width??1)*grid(t.parent)/2,y:Number(t?.y??0)+Number(t?.height??1)*grid(t.parent)/2});
const distance=(a,b,size)=>Math.hypot(a.x-b.x,a.y-b.y)/size;
const activeGM=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const owner=(actor,user)=>!!actor&&(!!user?.isGM||!!actor.testUserPermission?.(user,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));
const casterFor=m=>game.scenes?.get?.(m?.speaker?.scene)?.tokens?.get?.(m?.speaker?.token)?.actor??game.actors?.get?.(m?.speaker?.actor)??null;
const sourceToken=(actor,scene)=>actor?.token?.parent?.id===scene?.id?actor.token:
  canvas?.tokens?.controlled?.find?.(x=>x.actor?.uuid===actor?.uuid)?.document??all(scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid)??null;
const activeConcentration=(actor,itemId)=>getConcentrationPowerEffects(actor,{activeOnly:true}).find(e=>
  !e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.transient===true&&
  String(e.flags[S].concentrationPower.itemId)===String(itemId));
const sizes=['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan'];
export function groupLimits(item){
 const kind=groupKind(item),a=item?.actor,r=rank(a);
 if(!kind||!a)return null;
 if(kind==='flight'){
  const ego=Number(a.system?.abilities?.ego?.value),speed=Number(a.system?.movement?.flight?.value);
  return {kind,max:Number.isFinite(ego)?Math.max(0,Math.floor(ego)):0,range:5*r*dampenFactor(item),
   speed:Number.isFinite(speed)?Math.max(0,speed/2):0,allowSelf:false,rank:r};
 }
 if(kind==='levitation')return {kind,max:r,range:5*r*dampenFactor(item),speed:Math.max(0,number(a.system?.movement?.run?.value)),allowSelf:false,rank:r};
 if(isExtendInvisibility(item))return {kind,max:1,range:10*dampenFactor(item),speed:null,allowSelf:true,rank:r};
 const egoDefense=Number(a.system?.abilities?.ego?.defense);
 return {kind,max:Number.isFinite(egoDefense)?Math.max(0,Math.floor(egoDefense)):0,
  range:null,speed:null,allowSelf:true,rank:r};
}
export function sizeEligible(casterSize,targetSize,characterRank){
 const a=sizes.indexOf(String(casterSize??'average').toLowerCase()),b=sizes.indexOf(String(targetSize??'average').toLowerCase());
 return a<0||b<0?false:b<=a+Math.max(0,Math.floor(Number(characterRank)||0));
}
export function validateGroupSelection(item,sel,scene,origin){
 const limits=groupLimits(item);
 if(!limits||!scene||!origin||origin.parent?.id!==scene.id||sel?.version!==1||
  sel.kind!==limits.kind||sel.sceneId!==scene.id||sel.sourceTokenId!==origin.id)return {ok:false,reason:'Origem ou poder inválido.'};
 if(!Array.isArray(sel.tokenIds)||!sel.tokenIds.length||sel.tokenIds.length>limits.max||
  new Set(sel.tokenIds).size!==sel.tokenIds.length)return {ok:false,reason:`Selecione entre 1 e ${limits.max} alvos diferentes.`};
 if(limits.kind==='flight'&&(!all(item.actor?.items).some(i=>i.type==='power'&&i.name==='Flight 1'&&i.system?.powerSet==='Basic')||limits.speed<=0))
  return {ok:false,reason:'Group Flight exige Flight 1 e Velocidade de Voo disponível.'};
 if(isExtendInvisibility(item)&&!all(item.actor?.items).some(i=>i.type==='power'&&i.name==='Invisibility'&&i.system?.powerSet==='Illusion'))
  return {ok:false,reason:'Extend Invisibility exige o poder Invisibility.'};
 const recipients=[];
 for(const id of sel.tokenIds){
  const t=scene.tokens?.get?.(id);if(!t?.actor)return {ok:false,reason:'Alvo removido ou sem personagem.'};
  if(t.id===origin.id&&!limits.allowSelf)return {ok:false,reason:'O poder não inclui o próprio usuário entre os alvos transportados.'};
  if(limits.range!==null&&distance(centre(origin),centre(t),grid(scene))>limits.range+1e-6)
   return {ok:false,reason:`Alvo além de ${limits.range} espaços.`};
  if(limits.kind==='invisibility'&&!sizeEligible(item.actor.system?.size,t.actor.system?.size,limits.rank))
   return {ok:false,reason:'Alvo excede o tamanho permitido por Group Invisibility.'};
  recipients.push(t);
 }
 return {ok:true,limits,recipients};
}
/** Selection and consent are explicit; no allegiance/grapple is inferred. */
export async function selectGroupTargets(item){
 const scene=canvas?.scene,source=sourceToken(item.actor,scene),limits=groupLimits(item);
 if(!scene||!source||!limits)throw Error('Selecione seu token na cena para ativar este poder.');
 if(!game.user?.isGM&&!game.users?.activeGM)throw Error('É necessário um Mestre conectado.');
 const candidates=all(scene.tokens).filter(t=>t?.actor&&(limits.allowSelf||t.id!==source.id)&&
  (limits.range===null||distance(centre(source),centre(t),grid(scene))<=limits.range+1e-6)&&
  (limits.kind!=='invisibility'||sizeEligible(item.actor.system?.size,t.actor.system?.size,limits.rank)));
 if(!candidates.length||!limits.max)throw Error('Não há alvos elegíveis para esse poder.');
 const D=globalThis.foundry?.applications?.api?.DialogV2;
 if(!D?.wait)throw Error('A seleção de participantes exige Foundry v14.');
 const note=limits.kind==='flight'?`Velocidade de Voo do grupo: ${limits.speed} espaços; alcance ${limits.range} espaços. Selecione somente aliados.`:
  limits.kind==='levitation'?`Até ${limits.max} pessoas; velocidade de Corrida ${limits.speed}; alcance ${limits.range} espaços. Alvo involuntário exige agarrão telecinético, sujeito ao Mestre.`:
  isExtendInvisibility(item)?`Uma pessoa ou objeto a até 10 espaços; limite de tamanho: +${limits.rank} categorias. Concentração.`:
  `Até ${limits.max} pessoas/objetos representados por tokens; limite de tamanho: +${limits.rank} categorias.`;
 const html=candidates.map(t=>`<label style="display:block;padding:5px"><input type="checkbox" name="member" value="${esc(t.id)}"> ${esc(t.name??t.actor.name)}</label>`).join('');
 const chosen=await D.wait({window:{title:`${item.name} — participantes`},rejectClose:false,
  content:`<p>${esc(note)}</p><p>Escolha de 1 a ${limits.max} alvos. O Mestre aprovará a seleção. Cancelar não consome recursos.</p><form>${html}</form>`,
  buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
   {action:'confirm',label:'Confirmar alvos',default:true,callback:(_e,b)=>[...b.form.querySelectorAll('input[name=member]:checked')].map(x=>x.value)}]});
 if(!chosen)return null;
 const selection={version:1,kind:limits.kind,sceneId:scene.id,sourceTokenId:source.id,tokenIds:chosen};
 const checked=validateGroupSelection(item,selection,scene,source);
 if(!checked.ok)throw Error(checked.reason);
 return selection;
}
export const GROUP_FLAG='nativeGroupLot7';
export const TARGET_FLAG='nativeGroupLot7Target';
const effectImage=(kind)=>kind==='invisibility'?'systems/multiverse-d616/icons/statuses/invisible.svg':'systems/multiverse-d616/icons/super-powers.svg';
export function groupTargetEffectData({kind,sourceEffectId,sourceTokenId,sceneId,tokenId,speed,sourceActorUuid}){
 const name={flight:'Group Flight — Voando',levitation:'Group Levitation — Levitando',invisibility:'Group Invisibility — Invisível'}[kind];
 const data={name,img:effectImage(kind),showIcon:2,disabled:false,transfer:false,duration:{},changes:[],
  flags:{[S]:{[TARGET_FLAG]:{version:1,kind,sceneId,tokenId,sourceEffectId,sourceTokenId,sourceActorUuid}}}};
 if(kind==='invisibility'){
  data.statuses=[globalThis.CONFIG?.specialStatusEffects?.INVISIBLE??'invisible'];
  data.flags.core={statusId:data.statuses[0]};
 }else{
  data.statuses=[];
  data.changes=[{key:'system.movement.flight.active',type:'override',value:true,phase:'initial',priority:null},
   {key:'system.movement.flight.value',type:'upgrade',value:Number(speed),phase:'initial',priority:null}];
 }
 return data;
}
const targetKey=meta=>`${meta?.sourceActorUuid}|${meta?.sourceEffectId}|${meta?.sceneId}|${meta?.tokenId}`;
// Serialize EVERY cleanup path, including direct release calls and the
// updateActiveEffect hook. Previously these could delete the same AE twice.
let groupSyncQueue=Promise.resolve();
export function syncGroupEffects(options={}){
 const job=groupSyncQueue.catch(()=>{}).then(()=>syncGroupEffectsNow(options));
 groupSyncQueue=job.catch(()=>{});
 return job;
}
async function syncGroupEffectsNow({scenes=globalThis.game?.scenes}={}){
 if(!activeGM())return;
 const live=new Map();
 // Mark every living concentration. The GM alone owns the canonical target list.
 for(const scene of all(scenes))for(const token of all(scene.tokens)){
  const actor=token.actor;if(!actor)continue;
  for(const e of getConcentrationPowerEffects(actor,{activeOnly:true})){
   const g=e.flags?.[S]?.[GROUP_FLAG];
   if(g?.version!==1||g.sceneId!==scene.id||g.sourceTokenId!==token.id)continue;
   const retained=[];
   for(const id of g.tokenIds??[]){
    const target=scene.tokens?.get?.(id);if(!target?.actor)continue;
    if(g.range!==null&&distance(centre(token),centre(target),grid(scene))>g.range+1e-6)continue;
    retained.push(id);
    const meta={kind:g.kind,sceneId:scene.id,tokenId:id,sourceTokenId:token.id,
     sourceEffectId:e.id,sourceActorUuid:actor.uuid,speed:g.speed};
    live.set(targetKey(meta),{meta,target});
   }
   // Leaving the allowed range actually releases the passenger. Moving back
   // into range does not silently recast the power or add them to the group.
   if(retained.length!==(g.tokenIds??[]).length)
    await e.setFlag(S,GROUP_FLAG,{...g,tokenIds:retained});
  }
 }
 // A linked Actor may have >1 token; unique target flags avoid deleting
 // another group's effect. Do not touch unrelated invisibility/status effects.
 const actors=new Map();
 for(const scene of all(scenes))for(const token of all(scene.tokens))if(token?.actor)
  actors.set(token.actor.uuid??`${scene.id}:${token.id}`,token.actor);
 for(const {target} of live.values())actors.set(target.actor.uuid??target.id,target.actor);
 for(const actor of actors.values()){
  if(!actor.createEmbeddedDocuments)continue;
  for(const e of all(actor.effects)){
   const m=e.flags?.[S]?.[TARGET_FLAG];
   if(m?.version===1&&!live.has(targetKey(m))){
    // A second callback or another Foundry operation may have removed it
    // after the snapshot. Never issue a deletion for an already missing AE.
    if(!all(actor.effects).some(current=>current.id===e.id))continue;
    try{await actor.deleteEmbeddedDocuments('ActiveEffect',[e.id]);}
    catch(error){
     // Only suppress a confirmed already-deleted effect; do not hide real
     // permission/backend failures from the GM.
     if(all(actor.effects).some(current=>current.id===e.id))throw error;
    }
   }
  }
 }
 for(const [key,{meta,target}] of live){
  if(!all(target.actor.effects).some(e=>e.flags?.[S]?.[TARGET_FLAG]?.version===1&&targetKey(e.flags[S][TARGET_FLAG])===key))
   await target.actor.createEmbeddedDocuments('ActiveEffect',[groupTargetEffectData(meta)]);
 }
}
function gmSource(message){
 const claim=message?.getFlag?.(S,'nativeGroupLot7Request')??message?.getFlag?.(S,'nativeGroupLot7Activated');
 const scene=game.scenes?.get?.(claim?.sceneId??message?.speaker?.scene);
 const source=scene?.tokens?.get?.(claim?.sourceTokenId??message?.speaker?.token),
  actor=source?.actor??casterFor(message),item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
 // The claimed source must match the card's speaker. A player cannot forge a
 // message from someone else's actor to request GM-authorized movement.
 if(source&&message?.speaker?.actor&&source.actorId!==message.speaker.actor&&source.actor?.id!==message.speaker.actor)
  return {scene,source:null,actor:null,item:null};
 return {scene,source,actor,item};
}
export async function applyGroupActivation(message,selection,{confirm=null}={}){
 if(!activeGM())throw Error('Somente o Mestre ativo pode ativar o efeito coletivo.');
 const {scene,source,actor,item}=gmSource(message);
 const check=validateGroupSelection(item,selection,scene,source);
 if(!check.ok)throw Error(check.reason);
 if(message.getFlag(S,'nativeGroupLot7Activated'))throw Error('Ativação já resolvida.');
 const fx=activeConcentration(actor,item.id);
 if(!fx)throw Error('A Concentração não está ativa; a ativação deve ser revista pelo Mestre.');
 if(fx.flags?.[S]?.[GROUP_FLAG]?.version===1)throw Error('Este poder já tem um grupo ativo. Encerre a Concentração anterior antes de ativar novamente.');
 const names=check.recipients.map(t=>esc(t.name)).join(', ');
 const extra=check.limits.kind==='levitation'?'<p>Confirme consentimento dos alvos ou que os involuntários foram agarrados telecineticamente.</p>':
  check.limits.kind==='flight'?'<p>Confirme que todos os alvos escolhidos são aliados.</p>':'';
 const yes=confirm??(ctx=>foundry.applications.api.DialogV2.confirm({window:{title:`${item.name} — Mestre`},rejectClose:false,
  content:`<p>${esc(actor.name)} afetará <b>${ctx.names}</b>.</p>${extra}<p>O movimento dos participantes será controlado pelo usuário durante seu turno.</p>`}));
 if(!(await yes({names,check})))throw Error('Seleção não autorizada pelo Mestre. Revise os recursos gastos.');
 const stored={version:1,kind:check.limits.kind,sceneId:scene.id,sourceTokenId:source.id,
  tokenIds:check.recipients.map(t=>t.id),range:check.limits.range,speed:check.limits.speed,
  appliedAt:Date.now(),moves:{}};
 await fx.setFlag(S,GROUP_FLAG,stored);
 await message.setFlag(S,'nativeGroupLot7Activated',{effectId:fx.id,...stored});
 await syncGroupEffects();
 // Updating visible content forces chat card to rerender on both clients so
 // the participant controls appear as soon as the GM grants the activation.
 await message.update({content:`<p><b>${esc(item.name)}:</b> ${names} — efeito coletivo autorizado pelo Mestre.</p>`});
 await ChatMessage.create({speaker:message.speaker,content:`<p><b>${esc(item.name)}:</b> ${names} — efeito coletivo ativado pelo Mestre.</p>`});
 return stored;
}
/** Individual target displacement during the caster's turn. Movement is forced
 * by the caster's group power, and must not spend each passenger's personal
 * Movement allowance. Per-token/turn cumulative cap is checked by the GM. */
export function validateGroupMove({kind,selection,source,target,point,scene,combat,moves={}}){
 if(!source||!target||!scene||!selection?.tokenIds?.includes(target.id)||!['flight','levitation'].includes(kind))
  return {ok:false,reason:'Alvo não pertence a este grupo.'};
 const size=grid(scene),x=Math.floor(Number(point?.x)/size)*size,y=Math.floor(Number(point?.y)/size)*size;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x+target.width*size>scene.width||y+target.height*size>scene.height)
  return {ok:false,reason:'Destino fora da cena.'};
 const dx=x-target.x,dy=y-target.y;
 const elevation=point?.elevation===undefined?number(target.elevation):Number(point.elevation);
 if(!Number.isFinite(elevation))return {ok:false,reason:'Altitude inválida.'};
 const heightScale=Math.max(.01,number(scene.grid?.distance,5));
 const spaces=Math.hypot(dx/size,dy/size,(elevation-number(target.elevation))/heightScale);
 const end={x:x+(target.width*size)/2,y:y+(target.height*size)/2};
 const distant=Math.hypot(distance(centre(source),end,size),(elevation-number(source.elevation))/heightScale);
 if(selection.range!==null&&distant>selection.range+1e-6)
  return {ok:false,reason:`O destino excede ${selection.range} espaços do usuário.`};
 const tag=combat?.started?`${combat.id}:${combat.round}:${combat.turn}`:'fora-combate';
 const past=Number(moves?.[tag]?.[target.id]||0);
 if(combat?.started&&selection.speed!==null&&past+spaces>selection.speed+1e-6)
  return {ok:false,reason:`Movimento do aliado excede ${selection.speed} espaços neste turno.`};
 return {ok:true,x,y,elevation,spaces,tag,past};
}
// Used by the movement tracker; only GM-approved document changes are exempt.
const forced=new Set();
export function groupMoveIsForced(token){return forced.has(`${token?.parent?.id}:${token?.id}`);}
export async function applyGroupMovement(message,{tokenId,point}, {move=null}={}){
 if(!activeGM())throw Error('Somente o Mestre pode mover participantes do grupo.');
 const {scene,source,actor,item}=gmSource(message);
 const activation=message.getFlag(S,'nativeGroupLot7Activated');
 const fx=activeConcentration(actor,item?.id),group=fx?.flags?.[S]?.[GROUP_FLAG];
 if(!activation||!fx||group?.version!==1||activation.effectId!==fx.id||group.sceneId!==scene?.id)
  throw Error('Group Power: Concentração encerrada ou ativação inválida.');
 const target=scene.tokens?.get?.(tokenId);
 if(!target?.actor||target.id===source.id)throw Error('Alvo inválido para deslocamento.');
 const combat=game.combat;
 if(combat?.started&&(!all(combat.combatants).some(c=>c.tokenId===source.id&&c.id===combat.combatant?.id)))
  throw Error('Group Power: o usuário só controla deslocamentos durante seu próprio turno.');
 const result=validateGroupMove({kind:group.kind,selection:group,source,target,point,scene,combat,moves:group.moves});
 if(!result.ok)throw Error(result.reason);
 const key=`${scene.id}:${target.id}`;forced.add(key);
 try{
  if(move)await move(target,{x:result.x,y:result.y,elevation:result.elevation});
  else {
   // Foundry v14's movement planner (not raw TokenDocument.update) preserves
   // the scene's wall and terrain constraints. No Phase Self-style bypass.
   const output=await scene.moveTokens({[target.id]:{waypoints:[{x:result.x,y:result.y,elevation:result.elevation,explicit:true}],
    constrainOptions:{ignoreWalls:false}}});
   if(!output?.[target.id])throw Error('O Foundry recusou o deslocamento do participante.');
  }
  const moves={...(group.moves??{})},prior={...(moves[result.tag]??{})};
  prior[target.id]=result.past+result.spaces;moves[result.tag]=prior;
  await fx.setFlag(S,GROUP_FLAG,{...group,moves});
 }finally{ // Let Foundry v14 finish its moveToken callback before releasing exemption.
  globalThis.setTimeout?.(()=>forced.delete(key),800);
 }
 return result;
}
export async function releaseGroupTarget(message,tokenId){
 if(!activeGM())throw Error('Somente o Mestre pode liberar participantes.');
 const {actor,item,scene}=gmSource(message),fx=activeConcentration(actor,item?.id),g=fx?.flags?.[S]?.[GROUP_FLAG];
 if(!g||g.sceneId!==scene?.id||!g.tokenIds.includes(tokenId))throw Error('Alvo não está no grupo ativo.');
 await fx.setFlag(S,GROUP_FLAG,{...g,tokenIds:g.tokenIds.filter(id=>id!==tokenId)});
 await syncGroupEffects();
 return true;
}
const waiting=new Map();
async function requestGM(message,action,payload){
 if(activeGM())return action==='activate'?applyGroupActivation(message,payload):action==='move'?applyGroupMovement(message,payload):releaseGroupTarget(message,payload.tokenId);
 if(!game.users?.activeGM)throw Error('Nenhum Mestre conectado.');
 const id=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{waiting.delete(id);reject(Error('O Mestre não respondeu.'));},90000);
  waiting.set(id,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}});
  game.socket.emit(SOCKET,{type:'native-lot7-request',requestId:id,messageId:message.id,action,payload});
 });
}
export async function activateGroupAfterPay(item,selection){
 if(!selection||!isGroupLot7(item))return false;
 const m=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
  content:`<p><b>${esc(item.name)}:</b> participantes escolhidos; aguardando autorização do Mestre.</p>`,
  flags:{[S]:{itemId:item.id,nativeGroupLot7Request:selection}}});
 try{await requestGM(m,'activate',selection);ui.notifications?.info?.(`${item.name}: grupo ativado.`);return true;}
 catch(e){ui.notifications?.warn?.(`${item.name}: ${String(e.message??e)}. Revise recursos com o Mestre.`);return false;}
}
async function pickDestination(){
 if(!canvas?.app?.view)throw Error('Cena indisponível.');
 ui.notifications?.info?.('Group Power: clique no destino do aliado. Esc cancela.');
 return new Promise(resolve=>{
  captureCanvasCircle({view:canvas.app.view,renderer:canvas.app.renderer,stage:canvas.stage,
   doc:document,win:window,hooks:Hooks,onFinish:p=>resolve(p),onCancel:()=>resolve(null)});
 });
}
async function withMember(message,operation){
 const activation=message.getFlag(S,'nativeGroupLot7Activated');if(!activation)return;
 const {actor,item,scene}=gmSource(message);
 const effect=activeConcentration(actor,item?.id),g=effect?.flags?.[S]?.[GROUP_FLAG];
 if(!g||effect.id!==activation.effectId||g.sceneId!==scene?.id)throw Error('A Concentração do grupo terminou.');
 const members=(g.tokenIds??[]).filter(id=>scene?.tokens?.get?.(id));
 if(!members.length){ui.notifications.warn('Nenhum participante disponível.');return;}
 const D=foundry.applications.api.DialogV2;
 const html=members.map(id=>{const t=scene.tokens.get(id);return `<option value="${esc(id)}">${esc(t.name)}</option>`;}).join('');
 const chosen=await D.wait({window:{title:operation==='move'?'Mover participante':'Liberar participante'},rejectClose:false,
  content:`<form><label>Participante <select name="member">${html}</select></label>${operation==='move'?
   `<label style="display:block;margin-top:8px">Altitude de destino (unidades do mapa) <input type="number" name="elevation" step="1" value="${Number(scene.tokens.get(members[0])?.elevation??0)}"></label>`:''}</form>`,
  buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
   {action:'ok',label:'Confirmar',default:true,callback:(_e,b)=>({tokenId:b.form.querySelector('select[name=member]').value,
    elevation:operation==='move'?Number(b.form.querySelector('input[name=elevation]').value):undefined})}]});
 if(!chosen?.tokenId)return;
 const point=operation==='move'?await pickDestination():null;if(operation==='move'&&!point)return;
 if(point)point.elevation=chosen.elevation;
 await requestGM(message,operation,{tokenId:chosen.tokenId,point});
}
/** GM-published card every time the concentrating caster starts their turn.
 * This is a fresh control card, NOT a new power activation: no Focus, Action,
 * Reaction or Concentration is consumed. It references the SAME live effect.
 * Duplicate updateCombat events and page refreshes remain idempotent. */
const reminderPublishing=new Set();
export function groupReminderKey(combat,combatant,effect){
 if(!combat?.id||!combatant?.id||!effect?.id)return null;
 return `${combat.id}:${combat.round}:${combat.turn}:${combatant.id}:${effect.id}`;
}
export function isAuthorizedReminder(message,actor,item){
 const stamp=message?.getFlag?.(S,'nativeGroupLot7TurnReminder');
 const signedByGM=!!(message?.author?.isGM||message?.user?.isGM);
 if(!stamp||!signedByGM||!actor||!item)return false;
 const fx=activeConcentration(actor,item.id),g=fx?.flags?.[S]?.[GROUP_FLAG];
 const claim=message.getFlag(S,'nativeGroupLot7Activated');
 return !!(fx&&g?.version===1&&['flight','levitation'].includes(g.kind)&&
  claim?.effectId===fx.id&&stamp.effectId===fx.id&&
  claim.sceneId===g.sceneId&&claim.sourceTokenId===g.sourceTokenId&&
  stamp.combatId&&stamp.combatantId&&stamp.key);
}
export async function publishGroupTurnControls(combat){
 if(!activeGM()||!combat?.started||!combat?.combatant)return 0;
 const combatant=combat.combatant,scene=game.scenes?.get?.(combat.scene?.id??combat.sceneId??combatant.sceneId);
 const token=scene?.tokens?.get?.(combatant.tokenId),actor=token?.actor;
 if(!actor)return 0;
 let emitted=0;
 for(const fx of getConcentrationPowerEffects(actor,{activeOnly:true})){
  const group=fx.flags?.[S]?.[GROUP_FLAG];
  if(group?.version!==1||!['flight','levitation'].includes(group.kind)||
    group.sceneId!==scene.id||group.sourceTokenId!==token.id||!(group.tokenIds??[]).length)continue;
  const item=actor.items?.get?.(fx.flags?.[S]?.concentrationPower?.itemId);
  if(!item||!isGroupLot7(item)||groupKind(item)!==group.kind)continue;
  const key=groupReminderKey(combat,combatant,fx);
  if(!key||reminderPublishing.has(key))continue;
  const already=all(game.messages).some(m=>m.getFlag?.(S,'nativeGroupLot7TurnReminder')?.key===key);
  if(already)continue;
  reminderPublishing.add(key);
  try{
   // Revalidate after the async boundary: the Concentration or combat turn
   // might have changed while Foundry prepared the ChatMessage.
   if(activeConcentration(actor,item.id)?.id!==fx.id||combat.combatant?.id!==combatant.id||
      combat.round===undefined||combat.turn===undefined)continue;
   const names=(group.tokenIds??[]).map(id=>scene.tokens?.get?.(id)?.name).filter(Boolean);
   await ChatMessage.create({
    speaker:{scene:scene.id,token:token.id,actor:actor.id,alias:actor.name},
    content:`<p><b>${esc(item.name)} — seu turno:</b> use os controles abaixo para mover ou liberar participantes.</p><p>${esc(names.join(', '))}</p>`,
    flags:{[S]:{itemId:item.id,nativeGroupLot7Activated:{effectId:fx.id,...group},
     nativeGroupLot7TurnReminder:{key,combatId:combat.id,round:combat.round,
      turn:combat.turn,combatantId:combatant.id,effectId:fx.id}}}
   });
   emitted++;
  }finally{reminderPublishing.delete(key);}
 }
 return emitted;
}
export function registerNativePriorityLot7Hooks({hooks=globalThis.Hooks}={}){
 game.socket.on(SOCKET,async(data,userId)=>{
  if(data?.type==='native-lot7-reply'&&data.toUserId===game.user.id){const w=waiting.get(data.requestId);if(!w)return;
   waiting.delete(data.requestId);data.ok?w.resolve(data.result):w.reject(Error(data.error));return;}
  if(data?.type!=='native-lot7-request'||!activeGM())return;
  const user=game.users.get(userId),message=game.messages.get(data.messageId),{actor,item}=gmSource(message);
  let ok=false,result=null,error='Solicitação inválida.';
  try{
   if(!user?.active||!message||!isGroupLot7(item)||!owner(actor,user)||
     !(message.author?.id===user.id||message.user?.id===user.id||
       (data.action!=='activate'&&isAuthorizedReminder(message,actor,item))))throw Error('Solicitação não autorizada.');
   if(data.action==='activate'){
    if(message.getFlag(S,'nativeGroupLot7Request')?.version!==1||
     JSON.stringify(message.getFlag(S,'nativeGroupLot7Request'))!==JSON.stringify(data.payload))throw Error('Seleção divergente.');
    result=await applyGroupActivation(message,data.payload);
   }else if(data.action==='move')result=await applyGroupMovement(message,data.payload);
   else if(data.action==='release')result=await releaseGroupTarget(message,data.payload?.tokenId);
   else throw Error('Operação desconhecida.');
   ok=true;
  }catch(e){error=String(e?.message??e);console.warn('[D616] Lote 7:',e);}
  game.socket.emit(SOCKET,{type:'native-lot7-reply',toUserId:userId,requestId:data.requestId,ok,result,error});
 });
 hooks.on('renderChatMessageHTML',(message,html)=>{
  const g=message.getFlag?.(S,'nativeGroupLot7Activated');if(!g||!owner(casterFor(message),game.user))return;
  const content=html?.querySelector?.('.message-content');if(!content)return;
  const fx=activeConcentration(casterFor(message),message.getFlag(S,'itemId'));
  if(!fx||fx.id!==g.effectId||!fx.flags?.[S]?.[GROUP_FLAG]?.tokenIds?.length)return;
  for(const [action,label] of [['move','Mover participante'],['release','Liberar participante']]){
   if(action==='move'&&g.kind==='invisibility')continue;
   const b=document.createElement('button');b.type='button';b.textContent=label;
   b.addEventListener('click',()=>void withMember(message,action).catch(e=>ui.notifications?.warn?.(String(e?.message??e))));
   content.append(b);
  }
 });
 let syncing=false,again=false;
 const sync=()=>{if(!activeGM())return;if(syncing){again=true;return;}syncing=true;
  void(async()=>{do{again=false;await syncGroupEffects();}while(again);})().catch(e=>console.error('[D616] Group Power sync:',e))
   .finally(()=>{syncing=false;});};
 hooks.on('updateToken',sync);hooks.on('deleteToken',sync);hooks.on('createToken',sync);
 hooks.on('deleteActiveEffect',sync);hooks.on('updateActiveEffect',sync);
 hooks.on('canvasReady',sync);sync();
 hooks.on('updateCombat',(combat,changed)=>{
  if(!Object.prototype.hasOwnProperty.call(changed??{},'turn')&&
     !Object.prototype.hasOwnProperty.call(changed??{},'round'))return;
  void publishGroupTurnControls(combat).catch(e=>console.error('[D616] Group Power turno:',e));
 });
}
