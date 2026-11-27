import {dampenFactor} from './power-control-rules.mjs';
/** Multiverse-D616 v0.2.228 — Control Fog real visibility correction: environmental powers.
 * Foundry v14: Region geometries + real negative AmbientLight for Darkness;
 * separate deafness and token sight-range handling for Silence Area / Control Fog.
 * GM owns all Scene/Actor/Token document mutations. Visual/audio exceptions not
 * supplied by core (powered lights; external voice chat) remain GM decisions.
 */
import {captureCanvasCircle} from './elemental-draw-pointer.mjs';
import {getConcentrationPowerEffects} from './concentration.js';
import {fogSightBlocked as fogLineBlocked, fogRayOcclusionStart, tokenCenter} from './elemental-area-geometry.mjs';
const S='multiverse-d616',SOCKET=`system.${S}`;
const all=x=>Array.from(x?.contents??x?.values?.()??x??[]);
const official=(item,name,set)=>item?.type==='power'&&item?.name===name&&item.system?.powerSet===set;
export const isDarkness=i=>official(i,'Darkness','Illusion');
export const isIllumination=i=>official(i,'Illumination','Illusion');
export const isSilenceArea=i=>official(i,'Silence Area','Illusion');
export const isControlFog=i=>official(i,'Control Fog','Weather Control');
export const isMistsOfMunnopor=i=>official(i,'Mists of Munnopor','Magic');
export const isVaporsOfValtorr=i=>official(i,'Vapors of Valtorr','Magic');
export const isAreaLot6=i=>isDarkness(i)||isSilenceArea(i)||isControlFog(i)||isIllumination(i)||isMistsOfMunnopor(i)||isVaporsOfValtorr(i);
export const areaKind=i=>isDarkness(i)?'darkness':isSilenceArea(i)?'silence':(isControlFog(i)||isMistsOfMunnopor(i)||isVaporsOfValtorr(i))?'fog':isIllumination(i)?'illumination':null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sceneGrid=s=>Math.max(1,Number(s?.grid?.size)||100);
const gm=()=>!!game?.user?.isGM&&(!game?.users?.activeGM||game.users.activeGM.id===game.user.id);
const owning=(actor,user)=>!!actor&&(user?.isGM||actor.testUserPermission?.(user,CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER??3));
const rank=a=>Math.max(1,Math.floor(Number(a?.system?.attributes?.rank?.value??a?.system?.rank?.value??a?.system?.rank??1)||1));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const centerToken=(t,scene=t?.parent)=>({x:Number(t?.x??0)+Number(t?.width??1)*sceneGrid(scene)/2,
 y:Number(t?.y??0)+Number(t?.height??1)*sceneGrid(scene)/2});
function speakerActor(message){return game.scenes?.get?.(message?.speaker?.scene)?.tokens?.get?.(message?.speaker?.token)?.actor??game.actors?.get?.(message?.speaker?.actor)??null;}
function sourceToken(actor,scene=canvas?.scene){return (actor?.token?.parent?.id===scene?.id?actor.token:null)??
 canvas?.tokens?.controlled?.find?.(t=>t.actor?.uuid===actor?.uuid)?.document??
 all(scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid||t.actorId===actor?.id)??null;}
export function areaMaxRadiusSpaces(kind,characterRank,powerName=''){const r=Math.max(1,Math.floor(Number(characterRank)||1));
 if(kind==='darkness'||kind==='silence')return 2.5*r; // 5 spaces WIDE per rank, not radius
 if(kind==='fog')return powerName==='Mists of Munnopor'?100*r:powerName==='Vapors of Valtorr'?25*r:50*r;
 if(kind==='illumination')return 20; // visual radius, adjustable; the power defines bright light but not its footprint
 return 0;
}
/** Bound the selection against the world source of truth, not client claims. */
export function validateEnvironmentalSelection(item,selection,scene,token){
 const kind=areaKind(item),size=sceneGrid(scene),maximum=areaMaxRadiusSpaces(kind,rank(item?.actor),item?.name)*(kind==='illumination'?1:dampenFactor(item));
 if(!kind||!scene||!token||token.parent?.id!==scene.id||!selection||selection.version!==1||selection.kind!==kind||selection.sceneId!==scene.id)
  return {ok:false,reason:'Poder, cena ou seleção inválida.'};
 const caster=centerToken(token,scene);
 if(kind==='fog'&&selection.mode==='disperse'){
  if(!isControlFog(item))return {ok:false,reason:'Esse poder não pode dispersar névoa.'};
  if(!selection.regionId)return {ok:false,reason:'Selecione uma névoa registrada.'};
  const region=scene.regions?.get?.(selection.regionId),data=region?.flags?.[S]?.nativeEnvironment;
  const centre=data?.center;
  if(data?.kind!=='fog'||!centre||dist(caster,centre)+Number(data.radius??0)*size>maximum*size+1)
   return {ok:false,reason:'A névoa selecionada não está ao alcance.'};
  return {ok:true,kind,mode:'disperse',region};
 }
 if(selection.mode!=='create'||!Number.isFinite(selection.center?.x)||!Number.isFinite(selection.center?.y)||
   !Number.isFinite(selection.radiusSpaces)||selection.radiusSpaces<.5||selection.radiusSpaces>maximum+1e-6)
  return {ok:false,reason:'Centro ou raio inválido.'};
 const p=selection.center;
 if(kind==='silence'&&selection.anchorTokenId){
  const anchor=scene.tokens?.get?.(selection.anchorTokenId);
  if(!anchor||dist(p,centerToken(anchor,scene))>2)return {ok:false,reason:'A âncora da área de silêncio se moveu; selecione novamente.'};
 }
 if(p.x<0||p.y<0||p.x>scene.width||p.y>scene.height)return {ok:false,reason:'Área fora da cena.'};
 if(kind==='fog'&&dist(p,caster)>1)return {ok:false,reason:`${item.name} deve estar centralizado no personagem.`};
 if(kind!=='fog'&&dist(p,caster)>50*size*dampenFactor(item)+1e-6)return {ok:false,reason:'Área além de 50 espaços do personagem.'};
 if(kind==='illumination'){
  const sight=globalThis.CONFIG?.Canvas?.polygonBackends?.sight;
  if(typeof sight?.testCollision==='function'){
   try{if(sight.testCollision(caster,p,{type:'sight',mode:'any'}))return {ok:false,reason:'Illumination exige linha de visão até o ponto escolhido.'};}
   catch(_e){/* GM still confirms visibility when a different backend is used */}
  }
 }
 return {ok:true,kind,mode:'create'};
}
/** Uses the same exclusive pointer capture as Webtrapping/Elemental Barrier.
 * Circle center = drag origin (Illusion), or caster (Control Fog).
 */
export async function selectEnvironmentalCircle(item,scene=canvas?.scene,{anchorToken=null}={}){
 const kind=areaKind(item),token=sourceToken(item.actor,scene);
 if(!kind||!token||!canvas?.app)throw Error('Selecione o token do personagem na cena antes de usar o poder.');
 const max=areaMaxRadiusSpaces(kind,rank(item.actor),item.name)*(kind==='illumination'?1:dampenFactor(item)),size=sceneGrid(scene),caster=centerToken(token,scene);
 const title=isMistsOfMunnopor(item)?'Mists of Munnopor':isVaporsOfValtorr(item)?'Vapors of Valtorr':{darkness:'Darkness',silence:'Silence Area',fog:'Control Fog',illumination:'Illumination'}[kind];
 ui.notifications?.info?.(kind==='illumination'?
  'Illumination: clique no ponto a iluminar (até 50 espaços) e arraste para definir apenas o raio visual da luz; Esc cancela.':
  `${title}: clique e arraste para definir a área (raio máximo ${max} espaços). Esc cancela.`);
 return new Promise(resolve=>{
  let origin=null,radius=.5,preview=null,finished=false;
  const hud=document.createElement('div');
  Object.assign(hud.style,{position:'fixed',bottom:'92px',left:'50%',transform:'translateX(-50%)',zIndex:100000,
   background:'rgba(15,23,42,.94)',border:'2px solid #7cb4d5',borderRadius:'8px',padding:'9px 13px',
   color:'#fff',pointerEvents:'none',fontWeight:'bold'});
  hud.textContent=`${title}: arraste para desenhar · Esc cancela`;
  document.body.append(hud);
  const stage=canvas.stage,renderer=canvas.app.renderer,view=renderer?.canvas??canvas.app.view;
  const clean=()=>{if(preview){preview.parent?.removeChild(preview);preview.destroy?.();}hud.remove();};
  const finish=value=>{if(finished)return;finished=true;clean();resolve(value);};
  const draw=p=>{
   if(!origin)return;
   radius=Math.max(.5,Math.min(max,dist(origin,p)/size));
   hud.textContent=`${title}: raio ${radius.toFixed(1)}/${max} espaços · Solte para confirmar`;
   if(!preview&&PIXI?.Graphics){preview=new PIXI.Graphics();preview.eventMode='none';stage.addChild(preview);}
   if(!preview)return;
   preview.clear();const color=kind==='darkness'?0x32255f:kind==='silence'?0x97b9ca:kind==='illumination'?0xffdf8e:0xc4d7df;
   if(typeof preview.circle==='function')preview.circle(origin.x,origin.y,radius*size).fill({color,alpha:.30}).stroke({color:0xffffff,width:2});
   else preview.lineStyle(2,0xffffff,.9).beginFill(color,.30).drawCircle(origin.x,origin.y,radius*size).endFill();
  };
  try{captureCanvasCircle({view,renderer,stage,doc:document,win:window,hooks:Hooks,
   onStart:p=>{origin=kind==='fog'?caster:anchorToken?centerToken(anchorToken,scene):p;if(kind!=='fog'&&dist(origin,caster)>50*size){
    ui.notifications.warn('O centro deve estar a até 50 espaços do personagem.');origin=null;return;
   }draw(p);},
   onMove:draw,onFinish:p=>{if(!origin){finish(null);return;}draw(p);finish({version:1,kind,mode:'create',sceneId:scene.id,
    center:{x:Math.round(origin.x),y:Math.round(origin.y)},radiusSpaces:Math.round(radius*10)/10,
    sourceTokenId:token.id,...(anchorToken?{anchorTokenId:anchorToken.id}:{})});},onCancel:()=>finish(null)});}catch(e){finish(null);ui.notifications?.warn?.(String(e?.message??e));}
 });
}
export async function chooseEnvironmentSelection(item){
 const kind=areaKind(item),scene=canvas?.scene,token=sourceToken(item.actor,scene);
 if(!scene||!token)throw Error('Selecione o personagem na cena.');
 if(kind==='darkness'||kind==='illumination'||isMistsOfMunnopor(item)||isVaporsOfValtorr(item))return selectEnvironmentalCircle(item,scene);
 if(kind==='silence'){
  const marked=all(game.user?.targets).map(t=>t.document??t).filter(t=>t?.parent?.id===scene.id);
  if(marked.length!==1)return selectEnvironmentalCircle(item,scene);
  const D=foundry?.applications?.api?.DialogV2;
  const mode=await D.wait({window:{title:'Silence Area — âncora da área'},rejectClose:false,
   content:`<p>Centralizar a área sobre <b>${escape(marked[0].name)}</b>, acompanhando seu movimento, ou desenhar uma área fixa?</p>`,
   buttons:[{action:'static',label:'Área fixa',default:true,callback:()=> 'static'},
    {action:'anchor',label:'Seguir alvo marcado',callback:()=> 'anchor'},
    {action:'cancel',label:'Cancelar',callback:()=>null}]});
  if(!mode)return null;
  return selectEnvironmentalCircle(item,scene,{anchorToken:mode==='anchor'?marked[0]:null});
 }
 const D=foundry?.applications?.api?.DialogV2;
 if(!D?.wait)throw Error('É necessário Foundry v14 para selecionar a névoa.');
 const mode=await D.wait({window:{title:'Control Fog — escolher efeito'},rejectClose:false,
  content:'<p>Crie uma névoa centrada no personagem ou disperse uma névoa criada por este sistema, dentro de 50 espaços por rank.</p>',
  buttons:[{action:'create',label:'Criar névoa',default:true,callback:()=> 'create'},
   {action:'disperse',label:'Dispersar névoa',callback:()=> 'disperse'},
   {action:'cancel',label:'Cancelar',callback:()=>null}]});
 if(!mode)return null;
 if(mode==='create')return selectEnvironmentalCircle(item,scene);
 const max=areaMaxRadiusSpaces(kind,rank(item.actor))*dampenFactor(item)*sceneGrid(scene),centre=centerToken(token,scene);
 // Only entire fog areas wholly within range can be dispersed; do not
 // delete portions outside the character's 50-spaces-per-rank limit.
 const eligible=all(scene.regions).filter(r=>{const f=r.flags?.[S]?.nativeEnvironment;
  return f?.kind==='fog'&&f.center&&dist(centre,f.center)+Number(f.radius??0)*sceneGrid(scene)<=max+1;});
 if(!eligible.length)throw Error('Não há névoa criada pelo sistema no alcance. Névoas externas podem ser dispersadas manualmente pelo Mestre.');
 const chosen=await D.wait({window:{title:'Control Fog — dispersar'},rejectClose:false,
  content:'<p>Selecione a névoa que será dispersada.</p>',buttons:[...eligible.slice(0,12).map((r,i)=>({action:`r${i}`,label:`${r.name} (${r.id.slice(0,6)})`,callback:()=>r.id})),
   {action:'cancel',label:'Cancelar',callback:()=>null}]});
 return chosen?{version:1,kind,mode:'disperse',sceneId:scene.id,regionId:chosen,sourceTokenId:token.id}:null;
}
export function environmentalRegionData(selection,item,sourceTokenId,scene){
 const {kind,center,radiusSpaces}=selection,size=sceneGrid(scene);
 const names={darkness:'Darkness — escuridão densa',silence:'Silence Area — área silenciosa',fog:'Control Fog — névoa espessa',illumination:'Illumination — luz brilhante'};
 const colors={darkness:'#422276',silence:'#85b9d1',fog:'#b8c9cc',illumination:'#f0ce7d'};
 return {name:isMistsOfMunnopor(item)?'Mists of Munnopor — névoa mística':isVaporsOfValtorr(item)?'Vapors of Valtorr — vapores sombrios':names[kind],color:colors[kind],visibility:2,highlightMode:'coverage',displayMeasurements:true,
  shapes:[{type:'circle',x:center.x,y:center.y,radius:Math.round(radiusSpaces*size)}],
  flags:{[S]:{nativeEnvironment:{version:1,kind,center,radius:radiusSpaces,sourceActorUuid:item.actor.uuid,
   sourceItemId:item.id,sourceTokenId,...(isMistsOfMunnopor(item)?{sourcePowerName:'Mists of Munnopor'}:isVaporsOfValtorr(item)?{sourcePowerName:'Vapors of Valtorr',visibilitySpaces:5}:{}),...(selection.anchorTokenId?{anchorTokenId:selection.anchorTokenId}:{}),sourceMessageId:null}}}};
}
function concentrationActive(actor,itemId){return getConcentrationPowerEffects(actor,{activeOnly:true}).some(e=>
 e?.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.itemId===itemId);}
async function actorFor(meta,scene){
 const actor=scene?.tokens?.get?.(meta?.sourceTokenId)?.actor??game.actors?.get?.(meta?.sourceActorId);
 if(actor)return actor;
 try{return await fromUuid(meta.sourceActorUuid);}catch(_e){return null;}
}
/** A GC routine that never deletes unrelated scene lights or regions. */
export async function deleteEnvironmentRegion(scene,region){
 if(!gm()||!scene||!region?.flags?.[S]?.nativeEnvironment)return false;
 const meta=region.flags[S].nativeEnvironment,lights=all(scene.lights).filter(l=>l.flags?.[S]?.nativeEnvironmentRegionId===region.id);
 if(lights.length)await scene.deleteEmbeddedDocuments('AmbientLight',lights.map(l=>l.id));
 await scene.deleteEmbeddedDocuments('Region',[region.id]);
 await syncEnvironmentTokens(scene);return true;
}
export async function applyEnvironmentalRequest(message,selection){
 if(!gm())throw Error('Apenas o Mestre pode criar ou remover áreas ambientais.');
 const actor=speakerActor(message),item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
 const scene=game.scenes?.get?.(selection?.sceneId),token=scene?.tokens?.get?.(selection?.sourceTokenId);
 if(!actor||!isAreaLot6(item)||!token||token.actor?.uuid!==actor.uuid)throw Error('Poder ou personagem incorreto.');
 const check=validateEnvironmentalSelection(item,selection,scene,token);if(!check.ok)throw Error(check.reason);
 if(!concentrationActive(actor,item.id))throw Error('A Concentração do poder não está ativa.');
 const already=message.getFlag(S,'nativeEnvironmentResolved');if(already)throw Error('Área já resolvida para este card.');
 const D=foundry?.applications?.api?.DialogV2;
 if(!await D.confirm({window:{title:`${item.name} — aprovação do Mestre`},rejectClose:false,
  content:`<p>Autorizar ${selection.mode==='disperse'?'dispersar a névoa selecionada':'a área selecionada'} de <b>${escape(actor.name)}</b>?</p>`}))
  throw Error('O Mestre não autorizou a área.');
 if(check.mode==='disperse'){
  await deleteEnvironmentRegion(scene,check.region);
  await message.setFlag(S,'nativeEnvironmentResolved',{mode:'disperse',regionId:check.region.id,sceneId:scene.id});
  return {mode:'disperse',regionId:check.region.id};
 }
 const data=environmentalRegionData(selection,item,token.id,scene);
 data.flags[S].nativeEnvironment.sourceMessageId=message.id;
 const region=(await scene.createEmbeddedDocuments('Region',[data]))?.[0];
 if(!region)throw Error('A região não pôde ser criada.');
 try{
  if(selection.kind==='darkness'||selection.kind==='illumination'){
   // v14 LightData.negative creates an actual darkness source, unlike a Region
   // Adjust Darkness Level behavior (which alone does not block sight).
   const distanceUnit=Number(scene.grid?.distance)||1;
   const radius=selection.radiusSpaces*distanceUnit;
   const darkness=selection.kind==='darkness';
   const light={x:selection.center.x,y:selection.center.y,rotation:0,walls:!darkness,hidden:false,
    config:{bright:radius,dim:radius,negative:darkness,angle:360,alpha:1,
     attenuation:0.5,color:darkness?'#090915':'#fff2ce',luminosity:darkness?0:0.75,darkness:{min:0,max:1}},
    flags:{[S]:{nativeEnvironmentRegionId:region.id}}};
   const created=(await scene.createEmbeddedDocuments('AmbientLight',[light]))?.[0];
   if(!created)throw Error(`Não foi possível criar a fonte de ${darkness?'escuridão':'luz'}.`);
  }
  await message.setFlag(S,'nativeEnvironmentResolved',{mode:'create',regionId:region.id,sceneId:scene.id});
  await syncEnvironmentTokens(scene);
  if(isVaporsOfValtorr(item)){
   try{await ChatMessage.create({speaker:{scene:scene.id,token:token.id,actor:actor.id,alias:actor.name},
    content:'<p><b>Vapors of Valtorr:</b> névoa sombria ativa. Nos turnos seguintes, use <b>Atacar com névoa</b> para escolher um alvo dentro da área. Um ataque por turno, Ego contra Vigilância; Ação Padrão, sem novo custo de 10 Focus.</p>',
    flags:{[S]:{itemId:item.id,nativeVaporsControl:{version:1,itemId:item.id,regionId:region.id,sceneId:scene.id,sourceTokenId:token.id,effectId:getConcentrationPowerEffects(actor,{activeOnly:true}).find(e=>e.flags?.[S]?.concentrationPower?.itemId===item.id)?.id??null,activationCombatId:game.combat?.started?game.combat.id:null,activationRound:game.combat?.started?game.combat.round:null,activationTurn:game.combat?.started?game.combat.turn:null}}}});}catch(err){console.warn('[D616] Vapors: não foi possível publicar controle inicial',err);}
  }
  return {mode:'create',regionId:region.id};
 }catch(error){await deleteEnvironmentRegion(scene,region);throw error;}
}
export function isPointInsideEnvironment(point,meta,size){
 return !!point&&!!meta?.center&&Number.isFinite(meta.radius)&&dist(point,meta.center)<=meta.radius*size+1e-6;
}
export function fogVisionLimit(scene){return 10*(Number(scene?.grid?.distance)||1);}
export function fogAdjustedRange(previous,max){const n=Number(previous);
 return !Number.isFinite(n)||n<=0?max:Math.min(max,n);
}
/** v227: v14's sight.range controls unassisted (dark) sight, not the range
 * of a line of sight passing through fog on a well-lit map. Restore ranges
 * modified by v226, without touching unrelated token vision settings. */
export async function restoreLegacyFogSight(token){
 const state=token?.flags?.[S]?.nativeFogOriginal;
 if(!state)return false;
 const current=token.sight?.range;
 const updates={};
 // Only undo the legacy forced value when the player has not changed it.
 if(Number(current)===Number(state.forced))updates['sight.range']=state.range??null;
 if(Object.keys(updates).length)await token.update(updates);
 if(typeof token.unsetFlag==='function')await token.unsetFlag(S,'nativeFogOriginal');
 return true;
}
/** Actual containment, when available, handles the token footprint and
 * v14 Region boundaries, not merely the token's center point. */
export function tokenInsideEnvironment(token,region,grid){
 if(typeof token?.testInsideRegion==='function'){
  try{return !!token.testInsideRegion(region);}catch(_e){}
 }
 return isPointInsideEnvironment(centerToken(token,token.parent),region?.flags?.[S]?.nativeEnvironment,grid);
}
async function syncEnvironmentTokensNow(scene){
 if(!gm()||!scene)return;
 const regions=all(scene.regions).filter(r=>r.flags?.[S]?.nativeEnvironment);
 const silences=regions.filter(r=>r.flags[S].nativeEnvironment.kind==='silence');
 const munnopors=regions.filter(r=>r.flags[S].nativeEnvironment.kind==='fog'&&r.flags[S].nativeEnvironment.sourcePowerName==='Mists of Munnopor');
 const grid=sceneGrid(scene),actors=new Map();
 for(const token of all(scene.tokens)){
  await restoreLegacyFogSight(token);
  const actor=token.actor;
  if(!actor?.createEmbeddedDocuments)continue;
  const key=actor.uuid??actor.id;
  if(!actors.has(key))actors.set(key,{actor,ids:new Set(),munnopors:new Set()});
  const entry=actors.get(key);
  for(const r of silences)if(tokenInsideEnvironment(token,r,grid))entry.ids.add(r.id);
  for(const r of munnopors)if(tokenInsideEnvironment(token,r,grid))entry.munnopors.add(r.id);
 }
 for(const {actor,ids,munnopors:blocked} of actors.values()){
  // Re-read after every mutation so a quick exit/re-entry cannot use a stale
  // cache and accidentally leave Surdo missing or stuck on the actor.
  for(const fx of all(actor.effects).filter(e=>e.flags?.[S]?.nativeSilenceRegionId)){
   if(!ids.has(fx.flags[S].nativeSilenceRegionId))await actor.deleteEmbeddedDocuments('ActiveEffect',[fx.id]);
  }
  const existing=new Set(all(actor.effects).filter(e=>!e.disabled&&e.flags?.[S]?.nativeSilenceRegionId)
   .map(e=>e.flags[S].nativeSilenceRegionId));
  for(const id of ids)if(!existing.has(id)){
   await actor.createEmbeddedDocuments('ActiveEffect',[{
    name:'Surdo — Silence Area',
    img:'systems/multiverse-d616/icons/statuses/deafened.svg',
    statuses:['mmrpg.deafened'],showIcon:2,disabled:false,transfer:false,duration:{},changes:[],
    flags:{core:{statusId:'mmrpg.deafened'},[S]:{nativeSilenceRegionId:id}}
   }]);
  }
  // Munnopor blocks aerial, gliding, and web-swing movement only while
  // the token is in its magical fog. Never erase unrelated movement powers.
  for(const fx of all(actor.effects).filter(e=>e.flags?.[S]?.nativeMunnoporRegionId)){
   if(!blocked.has(fx.flags[S].nativeMunnoporRegionId)){
    if(all(actor.effects).some(current=>current.id===fx.id))await actor.deleteEmbeddedDocuments('ActiveEffect',[fx.id]);
   }
  }
  const current=new Set(all(actor.effects).filter(e=>!e.disabled&&e.flags?.[S]?.nativeMunnoporRegionId)
   .map(e=>e.flags[S].nativeMunnoporRegionId));
  for(const id of blocked)if(!current.has(id))await actor.createEmbeddedDocuments('ActiveEffect',[{
   name:'Mists of Munnopor — voo e teias bloqueados',
   img:'systems/multiverse-d616/icons/super-powers.svg',showIcon:2,
   disabled:false,transfer:false,duration:{},changes:[],statuses:[],
   flags:{[S]:{nativeMunnoporRegionId:id}}
  }]);
 }
}
// Scene-specific, serialized transactions protect against rapid movements,
// region updates, and concurrent GM operations using stale actor effects.
const sceneSynchronizers=new Map();
export function syncEnvironmentTokens(scene){
 if(!scene||!gm())return Promise.resolve();
 const key=scene.id;
 const prior=sceneSynchronizers.get(key)??Promise.resolve();
 const current=prior.catch(()=>{}).then(()=>syncEnvironmentTokensNow(scene));
 sceneSynchronizers.set(key,current);
 void current.finally(()=>{if(sceneSynchronizers.get(key)===current)sceneSynchronizers.delete(key);}).catch(()=>{});
 return current;
}

/** v227: real path-sensitive sight enforcement for visible target tokens.
 * V14 sight.range alone is not sufficient in daylight, therefore we test how
 * FARTHER than 10 squares when the sight ray intersects a fog region.
 * Respect the native visibility result and vision contributed by other owned
 * tokens. Never restrict GM omniscience or the whole scene's lighting. */
export function fogTargetVisibleForViewers(scene,target,viewers){
 if(!viewers?.length)return true;
 return viewers.some(viewer=>!fogLineBlocked(scene,viewer,target));
}
function fogVisibilityAllowed(scene,target,viewers){return !viewers.length||viewers.some(v=>!fogLineBlocked(scene,v,target));}
export function installFogVisibilityGuard(visibility=canvas?.visibility){
 if(!visibility||typeof visibility.testVisibility!=='function'||visibility._d616FogGuard)return false;
 const original=visibility.testVisibility;
 visibility.testVisibility=function(points,options){
  const normal=original.call(this,points,options);
  if(!normal||globalThis.game?.user?.isGM||!globalThis.canvas?.scene)return normal;
  const obj=options?.object;
  const target=obj?.document?.documentName==='Token'?obj.document:obj?.documentName==='Token'?obj:null;
  if(!target)return normal;
  const scene=canvas.scene;
  if(!all(scene.regions).some(r=>r.flags?.[S]?.nativeEnvironment?.kind==='fog'))return normal;
  const viewers=eligibleFogViewers().filter(t=>t.document.id!==target.id).map(t=>t.document);
  return fogVisibilityAllowed(scene,target,viewers)?normal:false;
 };
 visibility._d616FogGuard={original};return true;
}

/** v228 visual fog-of-vision curtain. A 10-space ray restriction needs
 * to hide MAP CONTENT as well as tokens in a daylight scene. The existing
 * testVisibility guard alone cannot do that: it only hides Placeables.
 * We paint an occlusion wedge for every fog-crossing ray AFTER the native fog
 * graphics, without altering ambient lighting, walls, or token sight data.
 * Only apply the curtain when the player has exactly one active owned source;
 * otherwise we must preserve visibility contributed by their other tokens.
 * GM omniscience is intentionally unaffected. */
export function eligibleFogViewers(canvasObject=globalThis.canvas,viewer=globalThis.game?.user){
 if(!viewer||viewer.isGM||!canvasObject?.scene||canvasObject?.visibility?.tokenVision===false)return [];
 return (canvasObject.tokens?.placeables??[]).filter(t=>
  t?.document?.sight?.enabled!==false &&
  !!(t?.actor?.isOwner||t?.document?.actor?.isOwner) &&
  t?.document?.parent?.id===canvasObject.scene.id);
}
export function fogCurtainSegments(scene,eye,{steps=360}={}){
 const pos=tokenCenter(eye,scene);
 if(!pos)return [];
 const width=Number(scene?.width)||0,height=Number(scene?.height)||0;
 if(width<=0||height<=0)return [];
 const far=2*Math.hypot(width,height);
 const segments=[],count=Math.max(60,Math.min(720,Math.floor(steps)));
 for(let i=0;i<count;i++){
  const a0=-Math.PI+i*2*Math.PI/count,a1=-Math.PI+(i+1)*2*Math.PI/count;
  const r0=fogRayOcclusionStart(scene,pos,a0),r1=fogRayOcclusionStart(scene,pos,a1);
  if(!Number.isFinite(r0)&&!Number.isFinite(r1))continue;
  const from0=Number.isFinite(r0)?Math.min(far,r0):far;
  const from1=Number.isFinite(r1)?Math.min(far,r1):far;
  if(from0>=far&&from1>=far)continue;
  const point=(angle,r)=>[pos.x+Math.cos(angle)*r,pos.y+Math.sin(angle)*r];
  segments.push([...point(a0,from0),...point(a0,far),...point(a1,far),...point(a1,from1)]);
 }
 return segments;
}
export function drawFogCurtain(graphics,scene,eye){
 if(!graphics||!scene||!eye)return 0;
 const segments=fogCurtainSegments(scene,eye);if(!segments.length)return 0;
 for(const points of segments){
  if(typeof graphics.poly==='function')graphics.poly(points).fill({color:0x101820,alpha:.97});
  else if(typeof graphics.drawPolygon==='function')graphics.beginFill(0x101820,.97).drawPolygon(points).endFill();
 }
 return segments.length;
}
/** Local visual cloud above the scene; no change to native fog-of-war or walls.
 * The mask makes Control Fog visible in full-daylight maps as well as at night. */
let fogOverlay=null;
function refreshFogTargetVisibility(){
 try{globalThis.canvas?.visibility?.restrictVisibility?.();}catch(_e){}
}
export function refreshFogOverlay(){
 const host=globalThis.canvas?.interface;
 const scene=globalThis.canvas?.scene;
 if(fogOverlay){try{fogOverlay.parent?.removeChild(fogOverlay);fogOverlay.destroy?.({children:true});}catch(_e){}fogOverlay=null;}
 if(!host||!scene||!globalThis.PIXI?.Graphics)return;
 const fogs=all(scene.regions).filter(r=>r.flags?.[S]?.nativeEnvironment?.kind==='fog');
 if(!fogs.length){refreshFogTargetVisibility();return;}
 const overlay=new PIXI.Container();overlay.eventMode='none';overlay.sortableChildren=false;
 const isGM=!!game.user?.isGM;
 for(const region of fogs){
  const meta=region.flags[S].nativeEnvironment;
  const radius=Number(meta.radius)*sceneGrid(scene),c=meta.center;
  if(!c||!Number.isFinite(radius)||radius<=0)continue;
  const graphic=new PIXI.Graphics();graphic.eventMode='none';
  // Low contrast on GM view, dense mist for players; not a hard black screen.
  for(const [fraction,alpha] of [[1,isGM?.12:.39],[.86,isGM?.09:.22],[.62,isGM?.09:.20]]){
   if(typeof graphic.circle==='function')graphic.circle(c.x,c.y,radius*fraction).fill({color:0xc5d5da,alpha});
   else graphic.beginFill(0xc5d5da,alpha).drawCircle(c.x,c.y,radius*fraction).endFill();
  }
  overlay.addChild(graphic);
 }
 const viewers=eligibleFogViewers();
 if(viewers.length===1){
  const curtain=new PIXI.Graphics();curtain.eventMode='none';
  if(drawFogCurtain(curtain,scene,viewers[0].document))overlay.addChild(curtain);
  else curtain.destroy?.();
 }
 host.addChild(overlay);fogOverlay=overlay;
 refreshFogTargetVisibility();
}
let running=false,rerun=false;
export async function syncEnvironmentZones(){
 if(!gm())return;
 if(running){rerun=true;return;}
 running=true;
 try{do{rerun=false;
  for(const scene of all(game.scenes)){
   for(const region of all(scene.regions)){
    const meta=region.flags?.[S]?.nativeEnvironment;if(!meta)continue;
    const actor=await actorFor(meta,scene),token=scene.tokens?.get?.(meta.sourceTokenId);
    if(meta.kind==='silence'&&meta.anchorTokenId){
     const anchor=scene.tokens?.get?.(meta.anchorTokenId);
     if(anchor){const position=centerToken(anchor,scene);
      if(dist(position,meta.center)>1){
       const shapes=all(region.shapes).map(sh=>sh.type==='circle'?{...sh.toObject?.()??sh,x:position.x,y:position.y}:sh.toObject?.()??sh);
       await region.update({shapes,[`flags.${S}.nativeEnvironment.center`]:position});
      }
     }
    }
    const currentMeta=region.flags?.[S]?.nativeEnvironment??meta;
    const anchoredOk=!meta.anchorTokenId||!!scene.tokens?.get?.(meta.anchorTokenId);
    const active=actor&&concentrationActive(actor,meta.sourceItemId)&&anchoredOk;
    // Darkness and Silence Area: remain within 50 squares of the center.
    const reachable=meta.kind==='fog'||meta.kind==='illumination'||(token&&dist(centerToken(token,scene),currentMeta.center)<=50*sceneGrid(scene)+1e-6);
    if(!active||!reachable){
     await deleteEnvironmentRegion(scene,region);
     if(active&&!reachable){
      const fx=getConcentrationPowerEffects(actor,{activeOnly:true}).find(x=>x.flags?.[S]?.concentrationPower?.itemId===meta.sourceItemId);
      if(fx)await actor.deleteEmbeddedDocuments('ActiveEffect',[fx.id]);
     }
    }
   }
   await syncEnvironmentTokens(scene);
  }
 }while(rerun);}finally{running=false;}
}
const waiting=new Map();
async function requestGM(message,selection){
 if(gm())return applyEnvironmentalRequest(message,selection);
 if(!game.users?.activeGM)throw Error('Um Mestre conectado é necessário.');
 const id=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{waiting.delete(id);reject(Error('O Mestre não respondeu.'));},90000);
  waiting.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
  game.socket.emit(SOCKET,{type:'native-lot6-request',requestId:id,messageId:message.id,selection});
 });
}
export async function activateEnvironmentalAfterPay(item,selection){
 if(!selection||!isAreaLot6(item))return false;
 const chat=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
  content:`<p><b>${escape(item.name)}</b>: ${selection.mode==='disperse'?'dispersando névoa':'solicitando criação da área'} ao Mestre.</p>`,
  flags:{[S]:{itemId:item.id,nativeEnvironmentRequest:selection}}});
 try{await requestGM(chat,selection);ui.notifications?.info?.(`${item.name}: efeito autorizado.`);return true;}
 catch(e){ui.notifications?.warn?.(`${item.name}: ${String(e?.message??e)}. Solicite ao Mestre revisão da ação e dos recursos pagos.`);return false;}
}
export function registerNativePriorityLot6Hooks({hooks=Hooks}={}){
 game.socket.on(SOCKET,async(data,userId)=>{
  if(data?.type==='native-lot6-reply'&&data.toUserId===game.user.id){const w=waiting.get(data.requestId);
   if(!w)return;waiting.delete(data.requestId);data.ok?w.resolve(data.result):w.reject(Error(data.error));return;}
  if(data?.type!=='native-lot6-request'||!gm())return;
  const user=game.users?.get?.(userId),msg=game.messages?.get?.(data.messageId),actor=speakerActor(msg);
  let ok=false,result=null,error='Solicitação inválida.';
  try{
   if(!user?.active||!msg||!owning(actor,user)||!(msg.author?.id===user.id||msg.user?.id===user.id))throw Error('Solicitação não autorizada.');
   const selection=msg.getFlag(S,'nativeEnvironmentRequest');
   if(!selection||JSON.stringify(selection)!==JSON.stringify(data.selection))throw Error('Seleção divergente do card.');
   result=await applyEnvironmentalRequest(msg,selection);ok=true;
  }catch(e){error=String(e?.message??e);console.warn('[D616] Lote 6:',e);}
  game.socket.emit(SOCKET,{type:'native-lot6-reply',toUserId:userId,requestId:data.requestId,ok,result,error});
 });
 hooks.on('updateToken',()=>{refreshFogOverlay();void syncEnvironmentZones().catch(console.error);});
 hooks.on('createToken',()=>{refreshFogOverlay();void syncEnvironmentZones().catch(console.error);});
 hooks.on('deleteToken',()=>{refreshFogOverlay();void syncEnvironmentZones().catch(console.error);});
 hooks.on('deleteActiveEffect',fx=>{if(fx.flags?.[S]?.concentrationPower)void syncEnvironmentZones().catch(console.error);});
 hooks.on('updateActiveEffect',fx=>{if(fx.flags?.[S]?.concentrationPower)void syncEnvironmentZones().catch(console.error);});
 hooks.on('deleteRegion',region=>{if(region.flags?.[S]?.nativeEnvironment){refreshFogOverlay();}
  if(region.flags?.[S]?.nativeEnvironment&&gm()){
  const scene=region.parent;
  const lights=all(scene?.lights).filter(l=>l.flags?.[S]?.nativeEnvironmentRegionId===region.id);
  if(lights.length)void scene.deleteEmbeddedDocuments('AmbientLight',lights.map(l=>l.id)).catch(console.error);
  void syncEnvironmentZones().catch(console.error);
 }});
 hooks.on('createRegion',region=>{if(region.flags?.[S]?.nativeEnvironment){refreshFogOverlay();void syncEnvironmentZones().catch(console.error);}});
 hooks.on('updateRegion',region=>{if(region.flags?.[S]?.nativeEnvironment){refreshFogOverlay();void syncEnvironmentZones().catch(console.error);}});
 hooks.on('deleteActiveEffect',fx=>{if(fx.flags?.[S]?.nativeSilenceRegionId)void syncEnvironmentZones().catch(console.error);});
 hooks.on('canvasReady',()=>{installFogVisibilityGuard();refreshFogOverlay();void syncEnvironmentZones().catch(console.error);});
 installFogVisibilityGuard();refreshFogOverlay();
 void syncEnvironmentZones().catch(console.error);
}
