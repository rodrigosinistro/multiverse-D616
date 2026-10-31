/**
 * Indicadores compactos do combate embaixo do mesh dos tokens (Foundry v14).
 * Não altera recursos, ações, documentos, visibilidade do Foundry ou estado de jogo.
 * As imagens são os mesmos desenhos Font Awesome Free antes usados no HTML.
 */
import {availableTurnIcons, movementArrowFill} from './compact-combat-core.mjs';

const LAYER = 650; // token mesh is 700
const ICON_ROOT = 'systems/multiverse-d616/ui/compact-combat-icons/';
const FILES = Object.freeze({ action:'hand-fist.svg', reaction:'shield-halved.svg', arrow:'chevron-right.svg' });
const active = new Map();

/** Carrega antecipadamente assets com o carregador nativo da cena do Foundry. */
export function registerCombatIconAssets(sceneTextures) {
  if (!sceneTextures) return;
  for (const [name, file] of Object.entries(FILES)) {
    sceneTextures[`m616-compact-${name}`] = `${ICON_ROOT}${file}`;
  }
}

function canInspect(token, isGM) {
  return !!token?.id && !!token?.visible && !!token?.document && (isGM || !token.document.hidden);
}
function canControl(token, isGM) {
  return canInspect(token,isGM) && (isGM || token.isOwner || token.actor?.isOwner || token.document?.isOwner);
}
/** A seleção NÃO desaparece quando o cursor entra noutro token.
 * O hover temporário pode revelar indicadores de qualquer combatente visível,
 * inclusive um oponente que não pertence ao jogador.
 */
export function focusedCombatTokens(tokens, isGM = false) {
  const selected = [...(tokens?.controlled ?? [])].reverse().find(t => canControl(t,isGM));
  const hovered = canInspect(tokens?.hover,isGM) ? tokens.hover : null;
  const focus = [];
  if (selected) focus.push(selected);
  if (hovered && !focus.some(t => t.id === hovered.id)) focus.push(hovered);
  return focus;
}
/** Exportado para integração com código legado de foco único. */
export function focusedCombatToken(tokens, isGM = false) {
  const focus = focusedCombatTokens(tokens,isGM);
  return focus[focus.length-1] ?? null;
}

function iconTexture(type) {
  const id = `m616-compact-${type}`;
  const cached = globalThis.canvas?.sceneTextures?.[id];
  if (cached && typeof cached !== 'string') return cached;
  const url = `${ICON_ROOT}${FILES[type]}`;
  return PIXI.Texture.from(url);
}
function sprite(parent,type,x,y,tint,size) {
  const image = new PIXI.Sprite(iconTexture(type));
  image.anchor.set(.5);
  image.position.set(x,y);
  image.width = size;
  image.height = size;
  image.tint = tint;
  parent.addChild(image);
  return image;
}
function rectangle(g,x,y,w,h,r,color,alpha=1) {
  g.beginFill(color,alpha).drawRoundedRect(x,y,w,h,r).endFill();
}
function circle(g,x,y,r,fill,border) {
  g.lineStyle(1.2,border,1).beginFill(fill,1).drawCircle(x,y,r).endFill();
}
function makeResources(state) {
  const countAction = availableTurnIcons(state,'action');
  const countReaction = availableTurnIcons(state,'reaction');
  const specs = [
    ...Array.from({length:countAction},()=>({type:'action',color:0x712e16,border:0xf5d69b,ink:0xfff0d8})),
    ...Array.from({length:countReaction},()=>({type:'reaction',color:0x194869,border:0x8bd9ff,ink:0xe5f8ff})),
  ];
  if (!specs.length) return null;
  const group = new PIXI.Container();
  const graphic = new PIXI.Graphics(); group.addChild(graphic);
  const width = 21;
  specs.forEach((spec,i)=>{
    const x = (i-(specs.length-1)/2)*width;
    circle(graphic,x,0,9.4,spec.color,spec.border);
    sprite(group,spec.type,x,0,0xffffff,15);
  });
  return group;
}
function makeMovement(state) {
  const group = new PIXI.Container();
  const bg = new PIXI.Graphics(); group.addChild(bg);
  rectangle(bg,-42,-10,84,20,5,0x070a0c,0.78);
  const fills = movementArrowFill(state);
  fills.forEach((fill,i)=>{
    const x = (i-1.5)*19;
    sprite(group,'arrow',x,0,0x5a6369,12);
    if (fill > 0) {
      const colored = sprite(group,'arrow',x,0,0x6de3a5,12);
      if (fill < .999) {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff).drawRect(x-8,-9,16*fill,18).endFill();
        group.addChild(mask);
        colored.mask = mask;
      }
    }
  });
  return group;
}
function destroy(id) {
  const entry = active.get(id);
  if (!entry) return;
  entry.root.parent?.removeChild(entry.root);
  entry.root.destroy({children:true});
  active.delete(id);
}
export function clearTokenUnderlays() {
  for (const id of [...active.keys()]) destroy(id);
}

/** Aceita vários tokens (selecionado + hover), sem apagar a seleção ao inspecionar um alvo. */
export function renderTokenUnderlays({entries,token,state,enabled=true}={}) {
  const primary = globalThis.canvas?.primary;
  const ready = !!primary?.addChild && !!globalThis.PIXI?.Graphics && !!globalThis.PIXI?.Sprite && !!globalThis.PIXI?.Texture;
  if (!ready || !enabled) {
    clearTokenUnderlays();
    return ready; // false = ativar fallback HTML
  }
  const requested = Array.isArray(entries) ? entries : (token && state ? [{token,state}] : []);
  const valid = requested.filter(({token,state})=>!!state && canInspect(token,!!globalThis.game?.user?.isGM));
  const desiredIds = new Set(valid.map(({token})=>token.id));
  for (const id of [...active.keys()]) if (!desiredIds.has(id)) destroy(id);
  const zoom = Math.max(.1,Number(canvas.stage?.scale?.x)||1);
  const scale = 1/zoom;
  try {
    for (const {token,state} of valid) {
      const signature = JSON.stringify([
        token.id,token.x,token.y,token.w,token.h,token.document?.elevation,scale,
        state.actionUsed,state.actionMax,state.reactionUsed,state.reactionMax,
        state.movementUsed,state.movementMax,
      ]);
      const old = active.get(token.id);
      if (old?.signature===signature && old.root.parent===primary) continue;
      destroy(token.id);
      const root = new PIXI.Container();
      root.name = 'm616-compact-token-underlay';
      root.eventMode='none';root.interactiveChildren=false;
      root.elevation=Number(token.document?.elevation)||0;
      root.sortLayer=LAYER;
      root.sort=0;root.zIndex=-1;
      const resources=makeResources(state);
      if (resources) {
        resources.position.set(token.x+token.w/2,token.y-12*scale);
        resources.scale.set(scale);
        root.addChild(resources);
      }
      const movement=makeMovement(state);
      // 30 px below token: keeps arrows BELOW nameplate, never hidden by it.
      movement.position.set(token.x+token.w/2,token.y+token.h+30*scale);
      movement.scale.set(scale);
      root.addChild(movement);
      primary.addChild(root);
      active.set(token.id,{root,signature});
    }
    primary.sortChildren?.();
    return true;
  } catch (error) {
    clearTokenUnderlays();
    console.warn('[multiverse-d616] Ícones do canvas indisponíveis; usando fallback HTML.',error);
    return false;
  }
}
