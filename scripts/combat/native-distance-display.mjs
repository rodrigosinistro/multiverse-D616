/** Multiverse D616 native token distance + transient movement preview (Foundry v14).
 * Uses Foundry token/grid APIs, without reusing Hover Distance code.
 * Resource accounting belongs to turn-tracker; visual paths NEVER persist.
 */
import {
  canShowTokenToUser, sceneDistanceSpaces, distanceStatus, movementPreviewNotice,
} from './native-distance-core.mjs';
import {quietFoundryTokenRulers} from './native-token-ruler-visuals.mjs';

const SYSTEM = 'multiverse-d616';
const SETTING = 'nativeTokenDistance';
const ROOT_ID = 'm616-native-distance';
const SOCKET = `system.${SYSTEM}`;
const SEND_INTERVAL = 80; // 12.5 previews/s at most; never persist drag coordinates
const PREVIEW_TIMEOUT = 1800;
const NS = 'http://www.w3.org/2000/svg';
let targetToken = null;
let pointer = null;
let rafPending = false;
let stage = null;
let outgoing = null;
let outgoingAt = 0;
let outgoingHeartbeat = null;
let remote = null;
let remoteTimer = null;
let lastRemoteSequence = new Map();
let sequence = 0;
function enabled() {
  try { return game.system?.id === SYSTEM && game.settings.get(SYSTEM, SETTING) !== false; }
  catch { return false; }
}
function viewport() {
  const view = canvas?.app?.canvas ?? canvas?.app?.view ?? canvas?.app?.renderer?.view;
  return view?.getBoundingClientRect?.() ?? null;
}
function pointOnScreen(point) {
  const view = viewport();
  const matrix = canvas?.stage?.worldTransform;
  if (!view || !matrix) return null;
  const screen = canvas?.app?.renderer?.screen;
  const sx = view.width / (Number(screen?.width) || view.width);
  const sy = view.height / (Number(screen?.height) || view.height);
  const p = matrix.apply({x:point.x,y:point.y});
  return {x:view.left+p.x*sx,y:view.top+p.y*sy};
}
function center(token) {
  if (!token) return null;
  return {x:token.x + token.w/2,y:token.y + token.h/2,elevation:Number(token.document?.elevation ?? 0)};
}
function tokenAtPointerPosition(pointerPoint) {
  return pointerPoint && canvas?.stage?.worldTransform?.applyInverse?.(pointerPoint);
}
function clearRoot() {
  const root = document.getElementById(ROOT_ID);
  if (root) root.hidden = true;
}
function getRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('aria-hidden','true');
  const svg = document.createElementNS(NS,'svg');
  svg.classList.add('m616-native-distance-svg');
  const guide = document.createElementNS(NS,'path');
  guide.classList.add('m616-distance-guide');
  svg.append(guide);
  const pill = document.createElement('div');
  pill.className = 'm616-distance-pill';
  root.append(svg,pill);
  document.body.appendChild(root);
  return root;
}
function format(number) {
  return (Math.round((Number(number) || 0) * 100)/100).toLocaleString('pt-BR', {maximumFractionDigits:2});
}

function sourceToken() {
  const controlled = canvas?.tokens?.controlled ?? [];
  const selected = controlled.find(t => canShowTokenToUser(t,!!game.user?.isGM));
  if (selected) return selected;
  // In combat the current combatant is a sensible reference when its owner has
  // not explicitly selected the token. Never reveal an unowned/hidden token.
  const combat = game.combat;
  if (!combat?.started) return null;
  const activeId = combat.combatant?.tokenId ?? combat.combatant?.token?.id;
  const active = activeId && (canvas?.tokens?.get?.(activeId) ?? canvas?.tokens?.placeables?.find(t=>t.id===activeId));
  return active && (game.user?.isGM || active.isOwner || active.actor?.isOwner) &&
    canShowTokenToUser(active,!!game.user?.isGM) ? active : null;
}
function combatantForToken(token) {
  const combat = game.combat;
  if (!combat?.started || !token) return null;
  return Array.from(combat.combatants?.values?.() ?? combat.combatants ?? []).find(c =>
    (c.tokenId ?? c.token?.id) === token.id) ?? null;
}
function hoverTarget(source) {
  // Both the Foundry hover state and the hoverToken hook are respected: the
  // core layer may replace its hover target on a combat turn change.
  const hovered = canvas?.tokens?.hover ?? null;
  const options = [hovered,targetToken];
  return options.find(t=>t && t.id !== source.id &&
    canShowTokenToUser(t,!!game.user?.isGM)) ?? null;
}
/** Transient preview messages contain only public map coordinates and text.
 * Never write Combatant flags or Token documents while dragging. */
function broadcastPreview(type, data={}) {
  if (!game.socket || !canvas?.scene?.id) return;
  game.socket.emit(SOCKET,{
    type:'m616NativeMovementPreview', operation:type, userId:game.user?.id,
    sceneId:canvas.scene.id, sequence:++sequence, ...data,
  });
}
function stopOutgoing() {
  if (!outgoing) return;
  broadcastPreview('stop',{tokenId:outgoing.tokenId});
  outgoing=null;
  outgoingAt=0;
  if (outgoingHeartbeat) clearInterval(outgoingHeartbeat);
  outgoingHeartbeat=null;
}
function sendDuringDrag(token, origin, end, labelText, secondaryText, secondaryKind, exceeds, anchor) {
  if (!token || !canvas.scene?.id) return;
  const now=Date.now();
  if (outgoing && (outgoing.tokenId!==token.id || outgoing.sceneId!==canvas.scene.id)) stopOutgoing();
  const data={tokenId:token.id, origin, end, anchor, labelText, secondaryText,
    secondaryKind, exceeds:!!exceeds};
  if (outgoing && now-outgoingAt<SEND_INTERVAL) {
    outgoing={...outgoing,...data};
    return;
  }
  outgoing={sceneId:canvas.scene.id,...data};
  outgoingAt=now;
  broadcastPreview('frame',data);
  // Mouse can remain pressed without moving for several seconds. Keep other
  // clients' previews alive until release, without retaining state in Foundry.
  if (!outgoingHeartbeat) {
    outgoingHeartbeat=setInterval(()=>{
      if (!outgoing || canvas?.scene?.id!==outgoing.sceneId) return stopOutgoing();
      broadcastPreview('frame',outgoing);
    },700);
    outgoingHeartbeat.unref?.();
  }
}
function visibleRemote() {
  if (!remote || canvas?.scene?.id!==remote.sceneId) return false;
  const token=canvas?.tokens?.get?.(remote.tokenId) ??
    canvas?.tokens?.placeables?.find(t=>t.id===remote.tokenId);
  return !!token && canShowTokenToUser(token,!!game.user?.isGM);
}
function handleSocket(payload, senderId) {
  if (payload?.type!=='m616NativeMovementPreview' || !enabled() || !canvas?.ready) return;
  // Socket.IO forwards the emitted payload; unlike some wrapper libraries,
  // game.socket does not guarantee a separate sender-ID argument.
  const sender=payload.userId;
  if (payload.sceneId!==canvas.scene?.id || !payload.tokenId ||
      typeof sender!=='string' || !sender || sender===game.user?.id ||
      (senderId && senderId!==sender)) return;
  const sourceUser=game.users?.get?.(sender);
  const token=canvas.tokens?.get?.(payload.tokenId) ?? canvas.tokens?.placeables?.find(t=>t.id===payload.tokenId);
  if (!sourceUser || !token || !canShowTokenToUser(token,!!game.user?.isGM) ||
      !(sourceUser.isGM || token.document?.testUserPermission?.(sourceUser,'OWNER') ||
        token.actor?.testUserPermission?.(sourceUser,'OWNER'))) return;
  const receivedSequence=Number(payload.sequence);
  if (!Number.isSafeInteger(receivedSequence) || receivedSequence<=0) return;
  const key=`${sender}:${payload.tokenId}`;
  if (receivedSequence<=(lastRemoteSequence.get(key)||0)) return;
  lastRemoteSequence.set(key,receivedSequence);
  if (lastRemoteSequence.size>100) lastRemoteSequence.clear();
  if (payload.operation==='stop') {
    if (remote?.tokenId===payload.tokenId && remote?.userId===sender) {
      remote=null;
      if (remoteTimer) clearTimeout(remoteTimer);
      remoteTimer=null;
      schedule();
    }
    return;
  }
  if (payload.operation!=='frame') return;
  const validPoint=point => point && ['x','y','elevation'].every(k=>
    Number.isFinite(point[k]) && Math.abs(point[k])<10000000);
  if (!validPoint(payload.origin) || !validPoint(payload.end)) return;
  remote={
    tokenId:payload.tokenId, sceneId:payload.sceneId,userId:sender,
    origin:payload.origin,end:payload.end,
    anchor:validPoint(payload.anchor) ? payload.anchor : undefined,
    labelText:String(payload.labelText||'').slice(0,180),
    secondaryText:String(payload.secondaryText||'').slice(0,180),
    secondaryKind:['exceeded','action','warning'].includes(payload.secondaryKind)?payload.secondaryKind:'',
    exceeds:!!payload.exceeds,
  };
  if (remoteTimer) clearTimeout(remoteTimer);
  remoteTimer=setTimeout(()=>{remote=null;remoteTimer=null;schedule();},PREVIEW_TIMEOUT);
  remoteTimer.unref?.();
  schedule();
}
function showPreview(origin, end, labelText, secondaryText='', secondaryKind='', exceeds=false, anchor=null) {
  if (!origin || !end) return clearRoot();
  const from=pointOnScreen(origin);
  const to=pointOnScreen(end);
  const anchorPoint = anchor ? pointOnScreen(anchor) : null;
  if (!from || !to) return clearRoot();
  const root=getRoot();
  root.hidden=false;
  root.querySelector('.m616-distance-guide').setAttribute('d',`M${from.x},${from.y} L${to.x},${to.y}`);
  const pill=root.querySelector('.m616-distance-pill');
  pill.classList.toggle('is-exceeded',!!exceeds);
  pill.textContent=labelText;
  if (secondaryText) {
    const secondary=document.createElement('div');
    secondary.className=`m616-distance-secondary is-${secondaryKind}`;
    secondary.textContent = secondaryText;
    pill.append(secondary);
  }
  const pillWidth=Math.min(window.innerWidth-16,pill.offsetWidth||260);
  const pillHeight=pill.offsetHeight||35;
  const anchorX = anchorPoint?.x ?? to.x;
  const anchorY = anchorPoint?.y ?? to.y;
  // Keep the distance directly above the 19px resource circles (whose center
  // is 12px above the top edge of the token), with ~4px breathing room.
  pill.style.left=`${Math.max(8,Math.min(window.innerWidth-pillWidth-8,anchorX-pillWidth/2))}px`;
  pill.style.top=`${Math.max(8,Math.min(window.innerHeight-pillHeight-8,anchorY-pillHeight-26))}px`;
}
function showRemotePreview() {
  if (!visibleRemote()) return clearRoot();
  const token = canvas.tokens?.get?.(remote.tokenId) ?? canvas.tokens?.placeables?.find(t => t.id===remote.tokenId);
  const anchor = remote.anchor ?? (token && {
    x:token.x+token.w/2,y:token.y,elevation:Number(token.document?.elevation ?? 0),
  });
  return showPreview(remote.origin,remote.end,remote.labelText,remote.secondaryText,
    remote.secondaryKind,remote.exceeds,anchor);
}
function render() {
  // Global Foundry canvas may not yet be initialized during browser loading.
  if (!enabled() || !globalThis.canvas?.ready) { return clearRoot(); }
  const source = sourceToken();
  if (!source && visibleRemote()) return showRemotePreview();
  if (!source) { return clearRoot(); }
  const dragged = canvas?.tokens?._draggedToken;
  const dragging = !!dragged && dragged.id === source.id && !!pointer;
  const target = dragging ? null : hoverTarget(source);
  // Only active hover measurements or active drag previews have a visual path.
  // Completed movement is stored by the turn tracker, not by this overlay.
  if (!dragging && !target) {
    if (visibleRemote()) return showRemotePreview();
    return clearRoot();
  }
  const origin = center(source);
  const end = dragging
    ? {...tokenAtPointerPosition(pointer), elevation:Number(source.document?.elevation ?? 0)}
    : center(target);
  if (!origin || !end || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return clearRoot();
  const distance = sceneDistanceSpaces(canvas.scene,origin,end,canvas.grid,canvas.dimensions?.size);
  const label = `Distância: ${format(distance)} espaços`;
  let secondaryText = '';
  let secondaryKind = '';
  let labelText = label;
  if (!dragging) {
    // Same short hover measurement inside and outside combat.
    secondaryText = '';

  } else {
    const combatant = combatantForToken(source);
    const state = combatant && game.multiverseD616?.turnTracker?.getState?.(combatant);
    const grant = combatant?.getFlag?.(SYSTEM,'temporaryMovementPower');
    const temporaryTeleport = grant?.kind === 'teleport' && Number(grant.maximum)>0;
    const result = temporaryTeleport ? {
      mode:'teleport',maximum:Number(grant.maximum),
      remaining:Math.max(0,Number(grant.maximum)-distance),
      exceeds:distance > Number(grant.maximum)+1e-6,
    } : distanceStatus({actor:source.actor,action:source.document?.movementAction ?? 'walk',
      used:Number(state?.movementUsed)||0,proposal:distance});
    const translated = {run:'Caminhada',flight:'Voo',swim:'Natação',climb:'Escalada',
      jump:'Salto',glide:'Planar',swingline:'Balanço',levitation:'Levitação',teleport:'Teleporte'};
    const name = translated[result.mode] || result.mode;
    const previewLabel = combatant && game.combat?.started
      ? `${name} ${format(result.maximum)} · ${label} · Restam ${format(result.remaining)}`
      : label;
    if (combatant && game.combat?.started && !temporaryTeleport) {
      const note = movementPreviewNotice(state, result.maximum, distance);
      secondaryText = note?.text ?? '';
      secondaryKind = note?.kind ?? '';
    }
    labelText = previewLabel;
    secondaryKind = secondaryKind || '';
    var exceeds = result.exceeds;
  }
  const anchor = dragging
    ? {x:source.x + source.w/2, y:source.y, elevation:Number(source.document?.elevation ?? 0)}
    : target ? {x:target.x + target.w/2, y:target.y, elevation:Number(target.document?.elevation ?? 0)} : null;
  showPreview(origin,end,labelText,secondaryText,secondaryKind,!!exceeds,anchor);
  if (dragging) sendDuringDrag(source,origin,end,labelText,secondaryText,secondaryKind,!!exceeds,anchor);
}
function schedule() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(()=> {rafPending=false;render();});
}
function handleStageMove(event) {
  if (!globalThis.canvas?.ready || !canvas?.tokens?._draggedToken) return;
  pointer = event?.global ? {x:event.global.x,y:event.global.y} : null;
  schedule();
}
function handlePointerMove(event) {
  // The document listener is active even before the Foundry canvas exists.
  // This guard also fixes a startup ReferenceError on pointermove in v0.2.80.
  if (!globalThis.canvas?.ready || !canvas?.tokens?._draggedToken) return;
  const bounds = viewport();
  if (!bounds || !bounds.width || !bounds.height) return;
  const screen = canvas?.app?.renderer?.screen;
  pointer = {
    x:(event.clientX - bounds.left)*(Number(screen?.width)||bounds.width)/bounds.width,
    y:(event.clientY - bounds.top)*(Number(screen?.height)||bounds.height)/bounds.height,
  };
  schedule();
}
function finishPreview() {
  stopOutgoing();
  pointer = null;
  targetToken = null;
  clearRoot();
  schedule();
}
function bindStage() {
  if (stage && stage !== canvas?.stage) {
    stage.off?.('pointermove',handleStageMove);
    stage = null;
  }
  if (!stage && canvas?.stage) {
    stage = canvas.stage;
    stage.on?.('pointermove',handleStageMove);
  }
  finishPreview();
}
function handleTokenUpdate(_tokenDoc, changes) {
  if ('x' in (changes ?? {}) || 'y' in (changes ?? {}) || 'elevation' in (changes ?? {})) {
    if (remote?.tokenId===_tokenDoc?.id) {remote=null; if(remoteTimer) clearTimeout(remoteTimer);remoteTimer=null;}
    // A committed move of the dragged token ends its preview. A different
    // combatant moving must not interrupt a player's ongoing drag.
    if (!outgoing || outgoing.tokenId===_tokenDoc?.id) finishPreview();
    else schedule();
  } else schedule();
}
function checkHoverDistanceCompatibility() {
  if (!enabled() || !game.modules?.get?.('hover-distance')?.active) return;
  ui.notifications?.warn?.('Multiverse D616: o módulo Hover Distance está ativo. A medição de distâncias e movimentos agora é nativa do sistema. Você pode desativar o Hover Distance em Gerenciar Módulos para evitar medições sobrepostas.');
}

Hooks.once('init',()=>game.settings.register(SYSTEM, SETTING, {
  name:'Distância e deslocamento nativos nos tokens (D616)',
  hint:'Mede distâncias entre tokens e mostra a prévia do deslocamento apenas durante o arrasto, com a velocidade de combate do modo selecionado. O movimento gasto continua indicado pelas quatro setas. Se usar Hover Distance, desative um dos medidores para evitar duplicação.',
  scope:'client',config:true,type:Boolean,default:true,
  onChange:()=>{remote=null;if(remoteTimer)clearTimeout(remoteTimer);remoteTimer=null;finishPreview();},
}));
Hooks.once('ready',()=>{
  quietFoundryTokenRulers(enabled);
  checkHoverDistanceCompatibility();
  game.socket?.on?.(SOCKET,handleSocket);
  schedule();
});
Hooks.on('canvasReady',()=>{quietFoundryTokenRulers(enabled);remote=null;if(remoteTimer)clearTimeout(remoteTimer);remoteTimer=null;bindStage();});
Hooks.on('canvasTearDown',()=>{stopOutgoing();remote=null;if(remoteTimer)clearTimeout(remoteTimer);remoteTimer=null;lastRemoteSequence.clear();clearRoot();});
Hooks.on('canvasPan',schedule);
Hooks.on('controlToken',()=>{targetToken=null;schedule();});
Hooks.on('hoverToken',(token,hovered)=> {
  targetToken=hovered?token:(targetToken?.id===token?.id?null:targetToken);
  schedule();
});
Hooks.on('updateToken',handleTokenUpdate);
Hooks.on('refreshToken',schedule);
Hooks.on('deleteToken',finishPreview);
Hooks.on('updateCombatant',schedule);
Hooks.on('updateCombat',schedule);
Hooks.on('deleteCombat',finishPreview);
Hooks.on('moveToken',(tokenDoc)=> {if(!outgoing || outgoing.tokenId===tokenDoc?.id)finishPreview();else schedule();});
if (typeof window !== 'undefined') {
  window.addEventListener('resize',schedule);
  document.addEventListener('pointermove',handlePointerMove,{passive:true});
  document.addEventListener('pointerup',finishPreview);
  document.addEventListener('pointercancel',finishPreview);
}
