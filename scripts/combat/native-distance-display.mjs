/** Multiverse D616 native token distance + transient movement preview (Foundry v14).
 * Uses Foundry token/grid APIs, without reusing Hover Distance code.
 * Resource accounting belongs to turn-tracker; visual paths NEVER persist.
 */
import {
  canShowTokenToUser, sceneDistanceSpaces, distanceStatus, movementPreviewNotice,
} from './native-distance-core.mjs';

const SYSTEM = 'multiverse-d616';
const SETTING = 'nativeTokenDistance';
const ROOT_ID = 'm616-native-distance';
const NS = 'http://www.w3.org/2000/svg';
let targetToken = null;
let pointer = null;
let rafPending = false;
let stage = null;

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
function render() {
  // Global Foundry canvas may not yet be initialized during browser loading.
  if (!enabled() || !globalThis.canvas?.ready) return clearRoot();
  const source = sourceToken();
  if (!source) return clearRoot();
  const dragged = canvas?.tokens?._draggedToken;
  const dragging = !!dragged && dragged.id === source.id && !!pointer;
  const target = dragging ? null : hoverTarget(source);
  // Only active hover measurements or active drag previews have a visual path.
  // Completed movement is stored by the turn tracker, not by this overlay.
  if (!dragging && !target) return clearRoot();
  const origin = center(source);
  const end = dragging
    ? {...tokenAtPointerPosition(pointer), elevation:Number(source.document?.elevation ?? 0)}
    : center(target);
  if (!origin || !end || !Number.isFinite(end.x) || !Number.isFinite(end.y)) return clearRoot();
  const root = getRoot();
  root.hidden = false;
  const guide = root.querySelector('.m616-distance-guide');
  const pill = root.querySelector('.m616-distance-pill');
  const from = pointOnScreen(origin);
  const to = pointOnScreen(end);
  if (!from || !to) return clearRoot();
  guide.setAttribute('d',`M${from.x},${from.y} L${to.x},${to.y}`);

  const distance = sceneDistanceSpaces(canvas.scene,origin,end,canvas.grid,canvas.dimensions?.size);
  const label = `Distância: ${format(distance)} espaços`;
  let secondaryText = '';
  let secondaryKind = '';
  let labelText = label;
  if (!dragging) {
    // Same short hover measurement inside and outside combat.
    secondaryText = '';
    pill.classList.remove('is-exceeded');
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
    pill.classList.toggle('is-exceeded',result.exceeds);
  }
  // Keep a fixed two-line structure; avoid HTML injection from token names.
  pill.textContent = labelText;
  if (secondaryText) {
    const secondary = document.createElement('div');
    secondary.className = `m616-distance-secondary is-${secondaryKind}`;
    secondary.textContent = secondaryText;
    pill.append(secondary);
  }
  const pillWidth = Math.min(window.innerWidth - 16,pill.offsetWidth || 260);
  const pillHeight = pill.offsetHeight || 35;
  const left = Math.max(8, Math.min(window.innerWidth - pillWidth - 8,to.x + 12));
  const top = Math.max(8,Math.min(window.innerHeight-pillHeight-8,to.y-pillHeight-7));
  pill.style.left = `${left}px`;
  pill.style.top = `${top}px`;
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
    // A movement has committed: clear its line immediately, but do not alter
    // Combatant.movementUsed or the four compact combat arrows.
    finishPreview();
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
  onChange:()=>{finishPreview();},
}));
Hooks.once('ready',()=>{checkHoverDistanceCompatibility();schedule();});
Hooks.on('canvasReady',bindStage);
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
Hooks.on('moveToken',finishPreview);
if (typeof window !== 'undefined') {
  window.addEventListener('resize',schedule);
  document.addEventListener('pointermove',handlePointerMove,{passive:true});
  document.addEventListener('pointerup',finishPreview);
  document.addEventListener('pointercancel',finishPreview);
}
