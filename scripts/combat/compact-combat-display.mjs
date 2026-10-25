import {
  availableTurnIcons, movementArrowFill,
  combatantsInInitiativeOrder, canDisplayCombatToken,
} from './compact-combat-core.mjs';
import {clampInitiativeStripPosition, validInitiativeStripPosition} from './compact-combat-position.mjs';
import {combatantMovementInfo} from './turn-tracker-core.mjs';

const SYSTEM = 'multiverse-d616';
const SETTING = 'compactCombatHUD';
const POSITION_SETTING = 'compactInitiativePosition';
const STRIP_ID = 'm616-compact-initiative';
const TOKENS_ID = 'm616-compact-tokens';
const FALLBACK = 'icons/svg/mystery-man.svg';
let updatePending = false;
let lastSignature = '';
let stripDrag = null;

function enabled() {
  try { return game.settings.get(SYSTEM, SETTING) !== false; }
  catch (_error) { return true; }
}
function html(text) { return foundry.utils.escapeHTML(String(text ?? '')); }
function combatantId(combatant) { return combatant?.tokenId ?? combatant?.token?.id; }
function initiative(combatant) {
  const val = Number(combatant?.initiative);
  return combatant?.initiative == null || !Number.isFinite(val) ? '—' : String(val);
}
function combatantImage(combatant) {
  return combatant?.token?.texture?.src ?? combatant?.actor?.img ?? FALLBACK;
}
function currentCombatants() {
  return combatantsInInitiativeOrder(game.combat, !!game.user?.isGM);
}
function tokenForCombatant(combatant) {
  const tokenId = combatantId(combatant);
  return canvas?.tokens?.placeables?.find(token => token.id === tokenId) ?? null;
}
function getState(combatant) {
  const original = game.multiverseD616?.turnTracker?.getState?.(combatant) ?? null;
  const grant = combatant?.getFlag?.(SYSTEM,'temporaryMovementPower');
  return original && grant?.kind === 'teleport' && Number(grant.maximum) > 0
    ? {...original, movementUsed:0, movementMax:Number(grant.maximum)} : original;
}
function ensureElements() {
  let strip = document.getElementById(STRIP_ID);
  if (!strip) {
    strip = document.createElement('nav');
    strip.id = STRIP_ID;
    strip.setAttribute('aria-label', 'Ordem de iniciativa do combate');
    strip.addEventListener('click', onStripClick);
    strip.addEventListener('pointerdown', onStripPointerDown);
    strip.addEventListener('pointermove', onStripPointerMove);
    strip.addEventListener('pointerup', onStripPointerUp);
    strip.addEventListener('pointercancel', onStripPointerCancel);
    strip.addEventListener('error', event => {
      if (event.target?.tagName === 'IMG' && event.target.src && !event.target.src.endsWith(FALLBACK)) event.target.src = FALLBACK;
    }, true);
    document.body.appendChild(strip);
  }
  let tokens = document.getElementById(TOKENS_ID);
  if (!tokens) {
    tokens = document.createElement('div');
    tokens.id = TOKENS_ID;
    tokens.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tokens);
  }
  return {strip, tokens};
}
function portraitHtml(combatant, combat) {
  const active = combat?.started && combat.combatant?.id === combatant.id;
  const name = combatant.name ?? combatant.actor?.name ?? 'Combatente';
  const defeated = combatant.defeated;
  const image = combatantImage(combatant);
  return `<div class="m616-initiative-person${active ? ' is-active' : ''}${defeated ? ' is-defeated' : ''}"
      title="${html(name)} · Iniciativa ${html(initiative(combatant))}${active ? ' · Turno atual' : ''}">
      <img src="${html(image)}" alt="${html(name)}" loading="lazy" draggable="false">
      <small>${html(initiative(combatant))}</small>
      ${active ? '<span class="m616-active-arrow" aria-hidden="true"></span>' : ''}
    </div>`;
}
function stripMarkup(combat, combatants) {
  const round = Number(combat.round) || 1;
  const label = combat.started ? `Rodada ${round}` : 'Iniciativa';
  const portraits = combatants.map(c => portraitHtml(c, combat)).join('');
  const gm = game.user?.isGM;
  const controls = gm ? `<div class="m616-compact-controls">
    ${combat.started ? `<button type="button" data-m616-compact-control="previous" title="Turno anterior"><i class="fa-solid fa-backward-step"></i></button>` : ''}
    ${combat.started ? `<button type="button" data-m616-compact-control="next" title="Próximo turno"><i class="fa-solid fa-forward-step"></i></button>` : `<button type="button" data-m616-compact-control="start" title="Solicitar iniciativa / iniciar combate"><i class="fa-solid fa-play"></i></button>`}
  </div>` : '';
  return `<div class="m616-compact-round m616-compact-drag-handle" title="Arraste aqui para mover a barra de iniciativa" aria-label="Arraste para mover a iniciativa"><i class="fa-solid fa-grip-vertical" aria-hidden="true"></i><i class="fa-solid fa-list-ol" aria-hidden="true"></i><span>${label}</span></div>
    <div class="m616-initiative-portraits">${portraits || '<span class="m616-compact-empty">Adicione combatentes</span>'}</div>
    ${controls}
    ${gm && combat.started ? `<button type="button" class="m616-compact-end" data-m616-compact-control="end" title="Encerrar Combate" aria-label="Encerrar Combate"><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i></button>` : ''}
    <button type="button" class="m616-compact-legacy" data-m616-compact-control="open" title="Abrir Controle de Turno detalhado"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>`;
}
function resourceHtml(resource, state) {
  const count = availableTurnIcons(state, resource);
  const icon = resource === 'action' ? 'fa-hand-fist' : 'fa-shield-halved';
  const type = resource === 'action' ? 'Ação Padrão' : 'Reação';
  return Array.from({length: count}, () => `<span class="m616-combat-resource is-${resource}" title="${type} disponível"><i class="fa-solid ${icon}"></i></span>`).join('');
}
function tokenMarkup(combatant, state) {
  const info = combatantMovementInfo(combatant);
  if (combatant?.getFlag?.(SYSTEM,'temporaryMovementPower')?.kind === 'teleport') info.mode = 'teleport';
  const fills = movementArrowFill(state);
  const remaining = Math.max(0, Number(state.movementMax || 0) - Number(state.movementUsed || 0));
  const total = Number(state.movementMax || 0);
  const movementTitle = `${info.mode.toUpperCase()} — Movimento: ${format(remaining)} de ${format(total)} espaços restantes`;
  const resources = resourceHtml('action', state) + resourceHtml('reaction', state);
  return `<div class="m616-token-actions" title="Ações e reações disponíveis">${resources || '<span class="m616-no-actions">—</span>'}</div>
    <div class="m616-token-movement" title="${html(movementTitle)}">${fills.map(fill => `<span class="m616-movement-step" style="--m616-fill:${Math.round(fill*100)}%"><i class="fa-solid fa-chevron-right m616-step-empty"></i><span class="m616-step-fill"><i class="fa-solid fa-chevron-right"></i></span></span>`).join('')}</div>`;
}
function format(value) { return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10); }
function canvasElement() {
  return canvas?.app?.canvas ?? canvas?.app?.view ?? canvas?.app?.renderer?.view ?? document.querySelector('#board canvas');
}
function tokenScreenPosition(token) {
  const matrix = canvas?.stage?.worldTransform;
  const view = canvasElement();
  if (!matrix || !view || !token) return null;
  const bounds = view.getBoundingClientRect?.();
  if (!bounds || !bounds.width || !bounds.height) return null;
  const screen = canvas?.app?.renderer?.screen;
  const ratioX = bounds.width / (Number(screen?.width) || bounds.width);
  const ratioY = bounds.height / (Number(screen?.height) || bounds.height);
  const top = matrix.apply({x: token.x + token.w / 2, y: token.y});
  const bottom = matrix.apply({x: token.x + token.w / 2, y: token.y + token.h});
  return {
    x: bounds.left + top.x * ratioX,
    yAbove: bounds.top + top.y * ratioY - 4,
    yBelow: bounds.top + bottom.y * ratioY + 4,
  };
}
function placeTokenIndicators() {
  if (!enabled()) return;
  const root = document.getElementById(TOKENS_ID);
  if (!root || root.hidden) return;
  for (const element of root.querySelectorAll('[data-m616-token-id]')) {
    const token = canvas?.tokens?.get?.(element.dataset.m616TokenId) ??
      canvas?.tokens?.placeables?.find(t => t.id === element.dataset.m616TokenId);
    const position = tokenScreenPosition(token);
    const visible = !!position && token?.visible && !token?.document?.hidden;
    element.hidden = !visible;
    if (!visible) continue;
    element.querySelector('.m616-token-actions').style.cssText = `left:${position.x}px;top:${position.yAbove}px`;
    element.querySelector('.m616-token-movement').style.cssText = `left:${position.x}px;top:${position.yBelow}px`;
  }
}
function render() {
  const {strip, tokens} = ensureElements();
  const combat = game.combat;
  const display = enabled() && !!combat && (!combat.scene?.id || combat.scene.id === canvas?.scene?.id);
  strip.hidden = !display;
  tokens.hidden = !display || !combat?.started;
  if (!display) { tokens.replaceChildren(); lastSignature = ''; return; }
  const members = currentCombatants();
  const signature = JSON.stringify([
    combat.id, combat.round, combat.turn, combat.started, combat.combatant?.id, !!game.user?.isGM,
    members.map(c => [c.id, c.name, c.initiative, c.hidden, c.defeated, combatantImage(c),
      getState(c)?.actionUsed, getState(c)?.actionMax, getState(c)?.reactionUsed,
      getState(c)?.reactionMax, getState(c)?.movementUsed, getState(c)?.movementMax,
      combatantMovementInfo(c).mode, tokenForCombatant(c)?.document?.movementAction,
      tokenForCombatant(c)?.visible, tokenForCombatant(c)?.document?.hidden, !!tokenForCombatant(c)]),
  ]);
  if (signature !== lastSignature) {
    lastSignature = signature;
    strip.innerHTML = stripMarkup(combat, members);
    tokens.innerHTML = combat.started ? members.map(c => {
      const token = tokenForCombatant(c);
      if (!canDisplayCombatToken(combat, token, !!game.user?.isGM) || !getState(c)) return '';
      return `<div class="m616-token-resources" data-m616-token-id="${html(token.id)}">${tokenMarkup(c, getState(c))}</div>`;
    }).join('') : '';
  }
  applySavedStripPosition(strip);
  placeTokenIndicators();
}

function storedStripPosition() {
  try { return game.settings.get(SYSTEM, POSITION_SETTING); }
  catch (_error) { return null; }
}
function putStripAt(strip, point) {
  strip.style.left = `${point.left}px`;
  strip.style.top = `${point.top}px`;
  strip.style.transform = 'none';
}
function applySavedStripPosition(strip) {
  // Rendering combat changes must never reset a drag in progress.
  if (!strip || stripDrag) return;
  const saved = storedStripPosition();
  if (!validInitiativeStripPosition(saved)) {
    strip.style.removeProperty('left');
    strip.style.removeProperty('top');
    strip.style.removeProperty('transform');
    return;
  }
  const bounds = strip.getBoundingClientRect();
  putStripAt(strip, clampInitiativeStripPosition(saved, bounds, window.innerWidth, window.innerHeight));
}
function onStripPointerDown(event) {
  if (!event.target?.closest?.('.m616-compact-drag-handle')) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (stripDrag) return;
  const strip = event.currentTarget;
  const rect = strip.getBoundingClientRect();
  const initial = {left: rect.left, top: rect.top};
  stripDrag = {pointerId:event.pointerId, originX:event.clientX, originY:event.clientY, initial};
  putStripAt(strip, initial);
  strip.classList.add('is-dragging');
  try { strip.setPointerCapture?.(event.pointerId); } catch (_error) { /* ignore unsupported capture */ }
  event.preventDefault();
}
function onStripPointerMove(event) {
  if (!stripDrag || stripDrag.pointerId !== event.pointerId) return;
  const strip = event.currentTarget;
  const point = {
    left:stripDrag.initial.left + event.clientX - stripDrag.originX,
    top:stripDrag.initial.top + event.clientY - stripDrag.originY,
  };
  const clamped = clampInitiativeStripPosition(point, strip.getBoundingClientRect(), window.innerWidth, window.innerHeight);
  putStripAt(strip, clamped);
}
function finishStripDrag(event, cancelled) {
  if (!stripDrag || stripDrag.pointerId !== event.pointerId) return;
  const strip = event.currentTarget;
  const initial = stripDrag.initial;
  stripDrag = null;
  strip.classList.remove('is-dragging');
  try { if (strip.hasPointerCapture?.(event.pointerId)) strip.releasePointerCapture(event.pointerId); } catch (_error) {}
  if (cancelled) {
    applySavedStripPosition(strip);
    return;
  }
  const rect = strip.getBoundingClientRect();
  const clamped = clampInitiativeStripPosition({left:rect.left, top:rect.top}, rect, window.innerWidth, window.innerHeight);
  putStripAt(strip, clamped);
  // The Foundry client setting persists per browser/user, not per campaign.
  Promise.resolve(game.settings.set(SYSTEM, POSITION_SETTING, clamped))
    .catch(error => console.warn(`[${SYSTEM}] Não foi possível salvar a posição do HUD`, error));
}
function onStripPointerUp(event) { finishStripDrag(event, false); }
function onStripPointerCancel(event) { finishStripDrag(event, true); }
function repositionOnResize() {
  const strip = document.getElementById(STRIP_ID);
  if (strip && !strip.hidden) applySavedStripPosition(strip);
}

function scheduleRender() {
  if (updatePending) return;
  updatePending = true;
  requestAnimationFrame(() => { updatePending = false; if (game.ready) render(); });
}
async function onStripClick(event) {
  const button = event.target?.closest?.('[data-m616-compact-control]');
  if (!button || button.disabled) return;
  const action = button.dataset.m616CompactControl;
  const tracker = game.multiverseD616?.turnTracker;
  if (action === 'open') return tracker?.openWindow?.();
  if (!game.user?.isGM) return;
  button.disabled = true;
  try { await tracker?.controlCombat?.(action); }
  catch (error) { console.error(`[${SYSTEM}] Compact initiative control failed`, error); }
  finally { button.disabled = false; scheduleRender(); }
}
export function registerCompactCombatSettings() {
  game.settings.register(SYSTEM, POSITION_SETTING, {
    name: 'Posição da barra de iniciativa compacta',
    hint: 'Posição individual salva ao arrastar pelo título Rodada/Iniciativa.',
    scope: 'client', config: false, type: Object, default: {},
    onChange: () => repositionOnResize(),
  });
  game.settings.register(SYSTEM, SETTING, {
    name: 'Combate — HUD compacto sobre tokens e iniciativa no topo',
    hint: 'Exibe Ações/Reações acima de cada token e quatro setas de Movimento abaixo. Substitui a abertura automática da janela detalhada (que continua disponível pelo botão e no menu Tokens). Configuração individual por usuário.',
    scope: 'client', config: true, type: Boolean, default: true,
    onChange: value => {
      lastSignature = '';
      game.multiverseD616?.turnTracker?.setCompactMode?.(value);
      scheduleRender();
    },
  });
}
Hooks.once('init', registerCompactCombatSettings);
Hooks.once('ready', () => { if (game.system?.id === SYSTEM) scheduleRender(); });
Hooks.on('canvasReady', scheduleRender);
Hooks.on('canvasPan', scheduleRender);
Hooks.on('updateToken', scheduleRender);
Hooks.on('refreshToken', scheduleRender);
Hooks.on('drawToken', scheduleRender);
Hooks.on('deleteToken', scheduleRender);
Hooks.on('createCombat', scheduleRender);
Hooks.on('deleteCombat', scheduleRender);
Hooks.on('createCombatant', scheduleRender);
Hooks.on('updateCombatant', scheduleRender);
Hooks.on('deleteCombatant', scheduleRender);
Hooks.on('combatStart', scheduleRender);
Hooks.on('updateCombat', scheduleRender);
Hooks.on('updateActor', scheduleRender);
Hooks.on('updateScene', scheduleRender);
if (typeof window !== 'undefined') window.addEventListener('resize', repositionOnResize);
