/** Multiverse-D616 v0.2.220 — priority lot 3.
 * Advance: explicit ally authorization and a one-use off-turn movement credit.
 * Webtrapping: five connected cells, Foundry v14 Region terrain, Agility TN 16
 *  with GM-confirmed roll, and existing Melee TN 16 escape workflow.
 * Phase Self: concentration-bound nonphysical state, physical-hit immunity,
 *  and intentional collision-bypassing moves with the actor's own movement.
 * World writes and Scene Regions remain GM-authoritative, never client-trusted.
 */
import {canvasPointerPosition,captureCanvasCircle} from './elemental-draw-pointer.mjs';
import {getMarvelOutcome} from './power-conditions.mjs';
import {powerGrabStatusFor} from './power-grabbed.mjs';
import {actorMovementMaximum} from './combat/turn-tracker-core.mjs';
const S='multiverse-d616', SOCKET=`system.${S}`;
const list=x=>Array.from(x?.contents??x?.values?.()??x??[]);
const own=(actor,user)=>!!actor&&(!!user?.isGM||!!actor.testUserPermission?.(user,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3));
const gm=()=>!!globalThis.game?.user?.isGM&&(!globalThis.game?.users?.activeGM||globalThis.game.users.activeGM.id===globalThis.game.user.id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scoped=(item,name,set)=>item?.type==='power'&&item.name===name&&item.system?.powerSet===set;
export const isAdvance=i=>scoped(i,'Advance','Tactics');
export const isWebtrapping=i=>scoped(i,'Webtrapping','Spider-Powers');
export const isPhaseSelf=i=>scoped(i,'Phase Self','Phasing');
export const isQuickPhase=i=>scoped(i,'Quick Phase','Phasing');
export const phaseSelfActive=actor=>list(actor?.effects).some(effect=>{
 const cp=effect?.flags?.[S]?.concentrationPower;
 return !effect?.disabled&&effect?.duration?.expired!==true&&cp?.transient===true&&
   (isPhaseSelf(actor?.items?.get?.(cp.itemId))||isQuickPhase(actor?.items?.get?.(cp.itemId)));
});
/** Physical health contact is impossible while exactly one side is phased.
 * Focus/mental attacks are not blanket canceled by a physical-immunity rule. */
export function phasePhysicalContact(attacker,defender,category='health'){
 if(String(category).toLowerCase()!=='health')return true;
 return phaseSelfActive(attacker)===phaseSelfActive(defender);
}
export function tokenFromTargetRef(ref,scene=globalThis.canvas?.scene){
 if(ref?.document?.documentName==='Token')return ref.document;
 if(ref?.documentName==='Token')return ref;
 const match=/^Scene\.([^.]+)\.Token\.([^.]+)$/.exec(String(ref?.uuid??''));
 if(!match)return null;
 return (globalThis.game?.scenes?.get?.(match[1])??scene)?.tokens?.get?.(match[2])??null;
}
function actorRank(actor){return Math.max(1,Number(actor?.system?.attributes?.rank?.value??actor?.system?.rank?.value??actor?.system?.rank??1)||1);}
function sceneToken(tokenId,scene=globalThis.canvas?.scene){return scene?.tokens?.get?.(tokenId)??null;}
function speakerActor(message){const scene=game.scenes?.get?.(message?.speaker?.scene);
 return scene?.tokens?.get?.(message?.speaker?.token)?.actor??game.actors?.get?.(message?.speaker?.actor)??null;}
function speakingToken(message){return game.scenes?.get?.(message?.speaker?.scene)?.tokens?.get?.(message?.speaker?.token)??null;}
function selectedToken(actor){return globalThis.canvas?.tokens?.controlled?.find(t=>t.actor?.uuid===actor?.uuid)?.document??
 list(globalThis.canvas?.scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid)??null;}
function gridSize(scene){return Math.max(1,Number(scene?.grid?.size??globalThis.canvas?.grid?.size??100));}
function tokenCenter(doc){const s=gridSize(doc?.parent);
 return {x:Number(doc?.x??0)+(Number(doc?.width??1)*s)/2,
 y:Number(doc?.y??0)+(Number(doc?.height??1)*s)/2};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function combatantForToken(token,combat=game.combat){return list(combat?.combatants).find(c=>c?.tokenId===token?.id&&c?.sceneId===token?.parent?.id)??
 list(combat?.combatants).find(c=>c?.actor?.uuid===token?.actor?.uuid)??null;}
export function advanceEligibility(item,{combat=globalThis.game?.combat,enemyToken=null}={}){
 if(!isAdvance(item))return {ok:true,applicable:false};
 if(!combat?.started)return {ok:false,reason:'Advance exige combate em andamento.'};
 if(!enemyToken?.actor)return {ok:false,reason:'Advance: selecione o inimigo atordoado ou derrotado como alvo.'};
 const limit=Number(item.actor?.system?.abilities?.ego?.defense);
 if(!Number.isFinite(limit)||limit<1)return {ok:false,reason:'Advance: a Defesa de Ego não está disponível.'};
 if(!game.users?.activeGM&&!game.user?.isGM)return {ok:false,reason:'Advance exige Mestre conectado.'};
 return {ok:true,applicable:true,limit:Math.floor(limit)};
}
/** No silent allegiance assumptions. The caster chooses and the GM approves. */
export async function selectAdvanceAllies(item,targets){
 const enemy=targets?.length===1?tokenFromTargetRef(targets[0]):null;
 const e=advanceEligibility(item,{enemyToken:enemy});if(!e.ok)throw Error(e.reason);
 const origin=selectedToken(item.actor);
 if(!origin||!enemy||origin.parent?.id!==enemy.parent?.id)throw Error('Advance: conjurador e inimigo devem estar na mesma cena.');
 const candidates=list(origin.parent.tokens).filter(t=>t.actor&&t.id!==origin.id&&t.id!==enemy.id);
 if(!candidates.length)throw Error('Advance: nenhum possível aliado com token nesta cena.');
 const D=globalThis.foundry?.applications?.api?.DialogV2;
 if(!D?.wait)throw Error('O diálogo de seleção requer Foundry v14.');
 const body=candidates.map(t=>`<label style="display:block; padding:4px"><input type="checkbox" name="ally" value="${esc(t.id)}"> ${esc(t.name??t.actor.name)}</label>`).join('');
 const result=await D.wait({window:{title:'Advance — aliados que podem ouvir'},rejectClose:false,
  content:`<form><p>O Mestre confirma que o inimigo foi atordoado/derrotado e que os aliados escolhidos podem <b>ouvir</b> o personagem. Selecione até <b>${e.limit}</b> aliados. Cada um poderá mover-se uma vez em direção ao inimigo, sem gastar seu Movimento normal.</p>${body}</form>`,
  buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},{action:'ok',label:'Usar Advance',default:true,callback:(_ev,b)=>[...b.form.querySelectorAll('input[name=ally]:checked')].map(x=>x.value)}]});
 if(!result)return null;
 if(!result.length||result.length>e.limit||new Set(result).size!==result.length)
  throw Error(`Advance: escolha de 1 a ${e.limit} aliados distintos.`);
 return {version:1,sceneId:origin.parent.id,sourceTokenId:origin.id,enemyTokenId:enemy.id,
  allyTokenIds:result,combatId:game.combat.id,round:Number(game.combat.round),turn:Number(game.combat.turn)};
}
/** The credit applies to exactly one off-turn movement. Its constraints are
 * enforced by the GM's movement tracker; it never touches the usual bank. */
export const ADVANCE_CREDIT='nativeAdvanceFreeMovement';
export function validateAdvanceCredit(credit,{combat,combatant,source,destination,enemy,maximum}={}){
 const valid=credit?.version===1&&credit.combatId===combat?.id&&Number(credit.round)===Number(combat?.round)&&
  Number(credit.turn)===Number(combat?.turn)&&credit.combatantId===combatant?.id&&
  credit.enemyTokenId===enemy?.id&&credit.sceneId===combatant?.sceneId;
 if(!valid)return {valid:false,reason:'Crédito de Advance expirado.'};
 const length=dist(source,destination)/Number(credit.gridSize||1),before=dist(source,tokenCenter(enemy)),after=dist(destination,tokenCenter(enemy));
 if(!Number.isFinite(length)||length<=0||length>Math.min(Number(credit.maximum)||0,Number(maximum)||0)+1e-6)
  return {valid:false,reason:'Advance excedeu o deslocamento gratuito permitido.'};
 if(after>=before-1e-6)return {valid:false,reason:'Advance exige aproximar-se do inimigo.'};
 return {valid:true,spaces:length};
}
export async function applyAdvanceGrants(message,selection){
 if(!gm())throw Error('Somente o Mestre pode conceder deslocamento fora de turno.');
 const combat=game.combat,scene=game.scenes?.get?.(selection?.sceneId),source=speakerActor(message);
 const item=source?.items?.get?.(message?.getFlag?.(S,'itemId'));
 const enemy=sceneToken(selection?.enemyTokenId,scene),trigger=advanceEligibility(item,{combat,enemyToken:enemy});
 if(!trigger.ok||!selection||message.getFlag(S,'nativeAdvance')?.version!==1||
    message.getFlag(S,'nativeAdvance')?.sceneId!==selection.sceneId||
    selection.combatId!==combat.id||selection.round!==Number(combat.round)||selection.turn!==Number(combat.turn)||
    !list(selection.allyTokenIds).length||selection.allyTokenIds.length>trigger.limit||
    new Set(selection.allyTokenIds).size!==selection.allyTokenIds.length)
   throw Error('Advance: seleção inválida ou gatilho já encerrado.');
 if(message.getFlag(S,'nativeAdvanceGranted'))return false;
 const chosen=selection.allyTokenIds.map(id=>sceneToken(id,scene));
 if(chosen.some(t=>!t?.actor||t.id===selection.enemyTokenId||t.id===selection.sourceTokenId))
   throw Error('Advance: há aliados inválidos.');
 const D=foundry.applications.api.DialogV2;
 const approved=await D.confirm({window:{title:'Advance — Mestre'},rejectClose:false,
  content:`<p><b>${esc(source?.name)}</b> ativou Advance. Confirma que <b>${esc(enemy.name)}</b> foi atordoado ou derrotado, e que estes <b>${chosen.length}</b> aliados podem ouvir o personagem?</p><p>${chosen.map(t=>esc(t.name)).join(', ')}</p>`});
 if(!approved)throw Error('Advance não aprovado pelo Mestre.');
 // Validate and collect all before the first GM write.
 const grants=chosen.map(t=>({token:t,combatant:combatantForToken(t,combat)}));
 if(grants.some(x=>!x.combatant||x.combatant.sceneId!==scene.id))throw Error('Advance: todos os aliados devem estar na iniciativa da cena.');
 for(const {token,combatant} of grants){
  await combatant.setFlag(S,ADVANCE_CREDIT,{version:1,combatId:combat.id,combatantId:combatant.id,sceneId:scene.id,
   round:Number(combat.round),turn:Number(combat.turn),enemyTokenId:enemy.id,
   maximum:actorMovementMaximum(token.actor),gridSize:gridSize(scene),sourceMessageId:message.id});
 }
 await message.setFlag(S,'nativeAdvanceGranted',{tokenIds:chosen.map(t=>t.id),combatId:combat.id,round:combat.round,turn:combat.turn});
 await ChatMessage.create({speaker:message.speaker,content:`<p><b>Advance — confirmado pelo Mestre:</b> ${chosen.map(t=>esc(t.name)).join(', ')} podem fazer <b>um movimento gratuito</b> imediatamente em direção a ${esc(enemy.name)}. Arraste cada token uma vez, sem gastar seu Movimento normal.</p>`});
 return true;
}
export function validCells(cells,scene,max=5){
 const size=gridSize(scene),unique=new Set();
 if(!Array.isArray(cells)||cells.length<1||cells.length>max)return false;
 for(const c of cells){
  if(!Number.isInteger(c?.col)||!Number.isInteger(c?.row)||c.col<0||c.row<0||
   (c.col+1)*size>Number(scene.width)+1e-6||(c.row+1)*size>Number(scene.height)+1e-6)return false;
  const key=`${c.col}:${c.row}`;if(unique.has(key))return false;unique.add(key);
 }
 const checked=new Set([`${cells[0].col}:${cells[0].row}`]);
 let changed=true;
 while(changed){changed=false;for(const c of cells){const k=`${c.col}:${c.row}`;
  if(checked.has(k))continue;
  if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>checked.has(`${c.col+dx}:${c.row+dy}`))){checked.add(k);changed=true;}
 }}
 return checked.size===cells.length;
}
/** Paint a continuous orthogonal path across grid squares; fill skipped cells when
 * a fast mouse move crosses several squares between browser pointer events.
 * Crossing an earlier cell retracts the path, so the user can correct it while
 * holding the mouse. No diagonal/disjoint or out-of-bounds cells are added.
 */
export function paintWebCellPath(cells, target, scene, max=5){
 const next=[...cells];
 if(!Number.isInteger(target?.col)||!Number.isInteger(target?.row))return next;
 const inBounds=c=>validCells([c],scene,max);
 if(!inBounds(target))return next;
 if(!next.length)return [target];
 let current=next.at(-1);
 // The path cannot be longer than the visible grid: never iterate without a cap.
 const budget=Math.abs(target.col-current.col)+Math.abs(target.row-current.row);
 for(let step=0;step<budget;step++){
  const dx=target.col-current.col,dy=target.row-current.row;
  if(!dx&&!dy)break;
  // Prefer the longer axis; each intermediate cell shares an edge.
  const alongX=Math.abs(dx)>=Math.abs(dy)&&dx!==0||dy===0;
  const cell=alongX?{col:current.col+Math.sign(dx),row:current.row}:
   {col:current.col,row:current.row+Math.sign(dy)};
  if(!inBounds(cell))break;
  const at=next.findIndex(c=>c.col===cell.col&&c.row===cell.row);
  if(at>=0)next.splice(at+1); // Retract instead of producing duplicate cells.
  else if(next.length<max)next.push(cell);
  else break;
  current=next.at(-1);
 }
 return next;
}
/** Click-and-drag path painter with live scene preview. Release to confirm;
 * Escape/right click cancels. All capture listeners/graphics are removed.
 */
export async function selectWebCells(scene=globalThis.canvas?.scene){
 if(!scene||!canvas?.app?.view)throw Error('Webtrapping requer canvas ativo.');
 const view=canvas.app.renderer?.canvas??canvas.app.view,stage=canvas.stage,renderer=canvas.app.renderer,size=gridSize(scene);
 ui.notifications?.info?.('Webtrapping: clique e arraste para pintar até 5 espaços contíguos. Solte para confirmar; Esc cancela.');
 return new Promise(resolve=>{
  let chosen=[],preview=null,doneAlready=false;
  const hud=document.createElement('div');
  Object.assign(hud.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',
   zIndex:'100000',padding:'9px 15px',background:'rgba(10,22,33,.93)',
   border:'2px solid #9fcaf0',borderRadius:'8px',color:'white',fontWeight:'bold',
   textAlign:'center',pointerEvents:'none'});
  hud.textContent='Webtrapping — clique e arraste para desenhar a teia (1–5 espaços) · Esc cancela';
  document.body.appendChild(hud);
  const cleanup=()=>{try{preview?.parent?.removeChild(preview);preview?.destroy?.();}catch(_e){}hud.remove();};
  const finish=value=>{if(doneAlready)return;doneAlready=true;cleanup();resolve(value);};
  const cellFor=p=>p?{col:Math.floor(p.x/size),row:Math.floor(p.y/size)}:null;
  const redraw=()=>{
   hud.textContent=`Webtrapping — ${chosen.length}/5 espaços · Solte para confirmar · Esc cancela`;
   if(!preview&&globalThis.PIXI?.Graphics){preview=new PIXI.Graphics();preview.eventMode='none';stage.addChild(preview);}
   if(!preview)return;
   preview.clear();
   for(const c of chosen){const x=c.col*size,y=c.row*size;
    if(typeof preview.rect==='function')preview.rect(x+1,y+1,size-2,size-2)
      .fill({color:0x79b9f0,alpha:.45}).stroke({color:0xffffff,width:2,alpha:.95});
    else preview.lineStyle(2,0xffffff,.95).beginFill(0x79b9f0,.45).drawRect(x+1,y+1,size-2,size-2).endFill();
   }
  };
  const add=p=>{const c=cellFor(p);if(!c)return;chosen=paintWebCellPath(chosen,c,scene);redraw();};
  try{
   captureCanvasCircle({view,renderer,stage,doc:document,win:window,hooks:globalThis.Hooks,
    onStart:add,onMove:add,
    onFinish:p=>{add(p);finish(validCells(chosen,scene)?chosen:null);},
    onCancel:()=>finish(null)});
  }catch(e){cleanup();finish(null);ui.notifications?.warn?.(String(e?.message??e));}
 });
}
export function webtrappingRegionData(cells,scene,metadata){
 if(!validCells(cells,scene))throw Error('Webtrapping: região deve ocupar entre 1 e 5 espaços contíguos.');
 const size=gridSize(scene);
 return {name:'Webtrapping — Teia pegajosa',color:'#d2dee9',visibility:2,highlightMode:'coverage',displayMeasurements:true,
  shapes:cells.map(({col,row})=>({type:'rectangle',x:col*size,y:row*size,width:size,height:size})),
  behaviors:[
   {name:'Webtrapping — Terreno difícil',type:'modifyMovementCost',system:{difficulties:{walk:2}}},
   {name:'Webtrapping — Agility TN16',type:'executeScript',system:{events:['tokenEnter','tokenTurnStart'],source:
    `if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id)) return;\n`+
    `await game.multiverseD616?.nativeLot3?.onWebEvent?.({sceneId:scene.id,regionId:region.id,tokenId:event.data.token?.id,eventName:event.name});`}},
  ],flags:{[S]:{nativeWebtrapping:{version:1,cells,...metadata}}}};
}
export async function createWebtrappingRegion(message,selection){
 if(!gm())throw Error('Webtrapping: criação de Região exclusiva do Mestre.');
 const actor=speakerActor(message),item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
 const scene=game.scenes?.get?.(selection?.sceneId);
 if(!isWebtrapping(item)||!scene||message.getFlag(S,'nativeWebtrapping')?.version!==1||
   message.getFlag(S,'nativeWebtrapping')?.sceneId!==scene.id||!validCells(selection.cells,scene))
  throw Error('Webtrapping: solicitação inválida.');
 const old=list(scene.regions).find(r=>r.flags?.[S]?.nativeWebtrapping?.sourceMessageId===message.id);
 if(old)return old;
 const D=foundry.applications.api.DialogV2;
 if(!await D.confirm({window:{title:'Webtrapping — Mestre'},rejectClose:false,
  content:`<p>Autorizar a teia de <b>${esc(actor?.name)}</b> em <b>${selection.cells.length}</b> espaço(s)? A região terá terreno difícil, CD 16 de Agility ao entrar/iniciar turno e CD 16 Melee para escapar.</p>`}))
  throw Error('Webtrapping: área não aprovada pelo Mestre.');
 const seconds=actorRank(actor)*15*60;
 const region=webtrappingRegionData(selection.cells,scene,{sourceActorUuid:actor.uuid,sourceMessageId:message.id,
  sourceItemId:item.id,createdWorldTime:Number(game.time?.worldTime??0),expiresWorldTime:Number(game.time?.worldTime??0)+seconds});
 const created=(await scene.createEmbeddedDocuments('Region',[region]))?.[0];
 if(!created)throw Error('Webtrapping: não foi possível criar a Região.');
 await message.setFlag(S,'nativeWebtrappingCreated',{regionId:created.id,sceneId:scene.id});
 return created;
}
const webEventGuard=new Map();
export async function onWebEvent({sceneId,regionId,tokenId,eventName}={}){
 if(!gm()||!['tokenEnter','tokenTurnStart'].includes(eventName))return false;
 const scene=game.scenes?.get?.(sceneId),region=scene?.regions?.get?.(regionId),token=sceneToken(tokenId,scene),actor=token?.actor;
 const meta=region?.flags?.[S]?.nativeWebtrapping;
 if(meta?.version!==1||!actor)return false;
 if(Number(game.time?.worldTime??0)>=Number(meta.expiresWorldTime??Infinity))return false;
 // A paralyzed target does not roll again while the web is holding it.
 if(list(actor.effects).some(e=>!e.disabled&&e.flags?.[S]?.powerCondition?.webTrapRegionId===regionId))return false;
 const guard=`${sceneId}|${regionId}|${tokenId}|${eventName}|${game.combat?.round??-1}|${game.combat?.turn??-1}`;
 if(Date.now()-(webEventGuard.get(guard)??0)<1500)return false;
 webEventGuard.set(guard,Date.now());if(webEventGuard.size>200)webEventGuard.clear();
 const RollClass=CONFIG.Dice?.MarvelMultiverseRoll??globalThis.Roll;
 const roll=new RollClass('{1d6,1dm,1d6}+@abilities.agl.value',actor.getRollData());
 await roll.evaluate({});
 await roll.toMessage({speaker:ChatMessage.getSpeaker({actor,token:token.object}),
  flavor:`Webtrapping — ${actor.name}: Agility contra TN 16 (${eventName==='tokenEnter'?'entrada':'início do turno'})`,
  flags:{[S]:{nativeWebCheck:{version:1,sceneId,regionId,tokenId,sourceMessageId:meta.sourceMessageId,
   rollTotal:roll.total,eventName}}}});
 return true;
}
export async function confirmWebCheck(message){
 if(!gm())return false;
 const info=message.getFlag?.(S,'nativeWebCheck');
 if(info?.version!==1||message.getFlag(S,'nativeWebCheckResolved')||!message.rolls?.[0])return false;
 const scene=game.scenes?.get?.(info.sceneId),region=scene?.regions?.get?.(info.regionId),token=sceneToken(info.tokenId,scene),actor=token?.actor;
 if(!region?.flags?.[S]?.nativeWebtrapping||!actor)throw Error('Webtrapping: área ou personagem não está mais disponível.');
 const outcome=getMarvelOutcome(message.rolls[0],16);
 if(!outcome)throw Error('Webtrapping: dados ainda não resolvidos.');
 if(!outcome.success){
  const owner=region.flags[S].nativeWebtrapping;
  const recipientUuid=token.uuid,exists=list(actor.effects).some(e=>!e.disabled&&e.flags?.[S]?.powerCondition?.webTrapRegionId===region.id);
  if(!exists){
   const statusId=powerGrabStatusFor({status:'paralyzed',powerName:'Webtrapping'});
   await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Paralisado — Webtrapping',img:'systems/multiverse-d616/icons/m.svg',
    statuses:statusId?[statusId]:[],disabled:false,transfer:false,changes:[],duration:{},showIcon:2,
    flags:{[S]:{powerCondition:{version:1,powerName:'Webtrapping',messageId:owner.sourceMessageId,
     sourceActorUuid:owner.sourceActorUuid,sourceItemId:owner.sourceItemId,recipientUuid,
     status:'paralyzed',webTrapRegionId:region.id}}}}]);
  }
 }
 await message.setFlag(S,'nativeWebCheckResolved',{success:outcome.success,rollTotal:Number(message.rolls[0].total)});
 await ChatMessage.create({speaker:message.speaker,content:`<p><b>Webtrapping — ${esc(actor.name)}:</b> ${outcome.success?'resistiu à teia (Agility TN 16).':'falhou no teste, Paralisado. Pode tentar escapar com Melee TN 16 pelo HUD.'}</p>`});
 return true;
}
export function webtrapExpiry(region,worldTime){const f=region?.flags?.[S]?.nativeWebtrapping;
 return !!f&&Number.isFinite(Number(f.expiresWorldTime))&&Number(worldTime)>=Number(f.expiresWorldTime);}
async function clearWebConditions(region){
 if(!gm()||!region)return;
 for(const token of list(region.parent?.tokens)){
  const actor=token?.actor;
  if(!actor)continue;
  const ids=list(actor.effects).filter(e=>e.flags?.[S]?.powerCondition?.webTrapRegionId===region.id).map(e=>e.id).filter(Boolean);
  if(ids.length)await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
 }
}
export async function expireWebtrappingRegions(){
 if(!gm())return;
 const worldTime=Number(game.time?.worldTime??0);
 for(const scene of list(game.scenes))for(const region of list(scene.regions)){
  if(!webtrapExpiry(region,worldTime))continue;
  await clearWebConditions(region);
  await scene.deleteEmbeddedDocuments('Region',[region.id]);
 }
}
/** Phase move is an explicit Foundry v14 moveTokens call with ignoreWalls.
 * This does not mutate Walls or make other tokens pass through them. */
export function phaseMoveOptions(token,pixel){
 if(!token?.parent||!Number.isFinite(pixel?.x)||!Number.isFinite(pixel?.y))throw Error('Phase Self: destino inválido.');
 const scene=token.parent,size=gridSize(scene);
 const x=Math.floor(pixel.x/size)*size,y=Math.floor(pixel.y/size)*size;
 if(x<0||y<0||x+Number(token.width??1)*size>Number(scene.width)||
 y+Number(token.height??1)*size>Number(scene.height))throw Error('Phase Self: destino fora do mapa.');
 return {waypoints:[{x,y}],constrainOptions:{ignoreWalls:true}};
}
/** Foundry v14 calls these per-token APIs for its ordinary drag preview and
 * final drop. Override only for the controlled actor while Phase Self's
 * Concentration is live. No global Wall, Scene, or Token flags are changed.
 * Both paths matter: visual preview alone would still collide on drop.
 */
export function phaseDragOptions(options,actor,user){
 if(!phaseSelfActive(actor)||!own(actor,user))return options;
 return {...(options??{}),constrainOptions:{...(options?.constrainOptions??{}),ignoreWalls:true}};
}
export function installPhaseSelfDragSupport({TokenClass=globalThis.foundry?.canvas?.placeables?.Token??globalThis.Token}={}){
 const proto=TokenClass?.prototype,mark=Symbol.for('multiverse-d616.nativePhaseSelfDrag.v221');
 if(!proto||typeof proto._getDragConstrainOptions!=='function'||
   typeof proto._getDragLeftDropUpdateOptions!=='function')return false;
 if(proto[mark])return true;
 const origPreview=proto._getDragConstrainOptions,origDrop=proto._getDragLeftDropUpdateOptions;
 Object.defineProperty(proto,mark,{value:true,configurable:true});
 proto._getDragConstrainOptions=function(...args){
  const opts=origPreview.apply(this,args);
  if(!phaseSelfActive(this.document?.actor)||!own(this.document?.actor,globalThis.game?.user))return opts;
  return {...(opts??{}),ignoreWalls:true};
 };
 proto._getDragLeftDropUpdateOptions=function(...args){
  const opts=origDrop.apply(this,args);
  return phaseDragOptions(opts,this.document?.actor,globalThis.game?.user);
 };
 return true;
}
export async function phaseMoveActor(actor){
 if(!phaseSelfActive(actor))throw Error('Phase Self requer Concentração ativa.');
 if(!own(actor,game.user))throw Error('Você não controla o personagem em fase.');
 const token=selectedToken(actor),scene=token?.parent;
 if(!token||!scene||scene.id!==canvas?.scene?.id)throw Error('Selecione um token do personagem na cena atual.');
 ui.notifications?.info?.('Phase Self: clique no destino através da parede. Esc cancela. O movimento normal continua sendo contabilizado.');
 return new Promise(resolve=>{
  const doc=document,win=window,view=canvas.app.view;
  const onCanvas=e=>e.target===view||e.composedPath?.().includes(view)||view.contains?.(e.target);
  const finish=()=>{doc.removeEventListener('pointerdown',down,true);win.removeEventListener('keydown',key,true);resolve(true);};
  const down=e=>{if(e.button!==0||!onCanvas(e))return;e.preventDefault?.();e.stopImmediatePropagation?.();
   const point=canvasPointerPosition(e,{view,renderer:canvas.app.renderer,stage:canvas.stage});finish();
   try{if(!phaseSelfActive(actor)||!own(actor,game.user))throw Error('Phase Self: Concentração encerrada.');
    const opts=phaseMoveOptions(token,point);void scene.moveTokens({[token.id]:opts}).then(res=>{
    if(!res?.[token.id])ui.notifications?.warn?.('Phase Self: movimento negado pelo Foundry.');
   }).catch(err=>ui.notifications?.warn?.(String(err?.message??err)));}
   catch(err){ui.notifications?.warn?.(String(err?.message??err));}
  };
  const key=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
  doc.addEventListener('pointerdown',down,true);win.addEventListener('keydown',key,true);
 });
}
const pending=new Map();
async function requestGM(op,message,selection){
 if(gm())return op==='advance'?applyAdvanceGrants(message,selection):createWebtrappingRegion(message,selection);
 if(!game.users?.activeGM)throw Error('Mestre desconectado: não é possível autorizar a automação.');
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('O Mestre não respondeu à solicitação.'));},90000);
  pending.set(requestId,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}});
  game.socket.emit(SOCKET,{type:'native-lot3-request',op,requestId,messageId:message.id,selection});
 });
}
export async function activateNativeLot3AfterPay(item,selection){
 if(!selection||!(isAdvance(item)||isWebtrapping(item)))return false;
 const kind=isAdvance(item)?'advance':'webtrapping';
 const chat=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),
  content:kind==='advance'?'<p><b>Advance:</b> solicitando ao Mestre movimento gratuito para aliados selecionados.</p>':
   `<p><b>Webtrapping:</b> área de ${selection.cells.length} espaços escolhida. Solicitando Região ao Mestre.</p>`,
  flags:{[S]:{itemId:item.id,...(kind==='advance'?{nativeAdvance:selection}:{nativeWebtrapping:selection})}}});
 try{await requestGM(kind,chat,selection);ui.notifications?.info?.(`${item.name}: autorização concluída.`);return true;}
 catch(error){ui.notifications?.warn?.(`${item.name}: ${String(error?.message??error)} (verifique com o Mestre antes de prosseguir).`);return false;}
}
export function registerNativePriorityLot3Hooks({hooks=Hooks}={}){
 // Native drag movement is enabled only for an owner currently in Phase Self.
 installPhaseSelfDragSupport();
 hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!html?.querySelector)return;
  const check=message?.getFlag?.(S,'nativeWebCheck');
  if(check?.version===1&&gm()&&!message.getFlag(S,'nativeWebCheckResolved')){
   const container=html.querySelector('.message-content');if(!container)return;
   const btn=document.createElement('button');btn.type='button';btn.textContent='Webtrapping — confirmar Agility TN 16 (Mestre)';
   btn.addEventListener('click',async()=>{btn.disabled=true;try{await confirmWebCheck(message);}catch(e){ui.notifications?.warn?.(String(e?.message??e));btn.disabled=false;}});
   container.append(btn);
  }
  const item=speakerActor(message)?.items?.get?.(message.getFlag?.(S,'itemId'));
  if((isPhaseSelf(item)||isQuickPhase(item))&&phaseSelfActive(item.actor)&&own(item.actor,game.user)){
   const container=html.querySelector('.message-content');if(!container)return;
   const btn=document.createElement('button');btn.type='button';btn.textContent='Phase Self — atravessar parede';
   btn.addEventListener('click',()=>void phaseMoveActor(item.actor).catch(e=>ui.notifications?.warn?.(String(e?.message??e))));
   container.append(btn);
  }
 });
 hooks.on('deleteRegion',region=>{if(region?.flags?.[S]?.nativeWebtrapping&&gm())
  void clearWebConditions(region).catch(e=>console.warn('[D616] Webtrapping cleanup:',e));});
 hooks.on('updateWorldTime',()=>void expireWebtrappingRegions().catch(e=>console.warn('[D616] Webtrapping expiry:',e)));
 // This setup itself runs from the main ready hook: check older regions now,
 // because registering another ready listener here would never execute it.
 void expireWebtrappingRegions().catch(e=>console.warn('[D616] Webtrapping expiry:',e));
 game.multiverseD616 ??={};game.multiverseD616.nativeLot3={onWebEvent,phaseMoveActor};
 game.socket.on(SOCKET,async(data,userId)=>{
  if(data?.type==='native-lot3-reply'&&data.toUserId===game.user?.id){
   const waiter=pending.get(data.requestId);if(!waiter)return;pending.delete(data.requestId);
   if(data.ok)waiter.resolve(data.result);else waiter.reject(Error(data.error||'Não aprovado pelo Mestre.'));
  }
  if(data?.type!=='native-lot3-request'||!gm())return;
  const user=game.users?.get?.(userId),msg=game.messages?.get?.(data.messageId),actor=speakerActor(msg);
  let ok=false,error='Solicitação inválida.',result=null;
  try{
   if(!user||!user.active||!own(actor,user)||!msg||msg.author?.id!==user.id&&msg.user?.id!==user.id)
    throw Error('Não autorizado a executar a automação de outro personagem.');
   // The server-side source is the original message authored by requester.
   const source=msg.getFlag(S,data.op==='advance'?'nativeAdvance':'nativeWebtrapping');
   if(!source||JSON.stringify(source)!==JSON.stringify(data.selection))throw Error('Dados divergentes do card original.');
   result=data.op==='advance'?await applyAdvanceGrants(msg,source):data.op==='webtrapping'?
     (await createWebtrappingRegion(msg,source))?.id:null;
   if(!result)throw Error('Operação não concluída.');ok=true;
  }catch(e){error=String(e?.message??e);console.warn('[D616] Lote 3 autorização:',e);}
  game.socket.emit(SOCKET,{type:'native-lot3-reply',toUserId:userId,requestId:data.requestId,ok,result,error});
 });
}
