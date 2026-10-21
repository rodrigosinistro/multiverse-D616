/** Multiverse-D616 v0.2.22 — targeting without remembered target locks.
 * The original Foundry manual targeting is the default. A cancelled selection
 * never changes the current Foundry target set.
 */
import { canvasPointerPosition } from './elemental-draw-pointer.mjs';
import { chooseD616Dialog } from './dialog-v14.mjs';
const SYSTEM='multiverse-d616';
const SETTING='smartTargetMode';
const MIGRATION='smartTargetV022ManualDefault';
const MODES=['manual','confirm'];
const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SMART_TARGET_MODES=Object.freeze(MODES);
export function registerSmartTargetSettings(){
  game.settings.register(SYSTEM,SETTING,{
    name:'Seleção de alvos',
    hint:'Use os alvos manuais do Foundry (padrão) ou abra uma janela antes de ataques para selecionar alvos no mapa.',
    scope:'client',config:true,type:String,
    choices:{manual:'Seleção manual do Foundry',confirm:'Perguntar antes de ataques'},default:'manual',
  });
  // Run only once per client so the v0.2.21 "confirm" default (or deprecated
  // "auto") does not keep showing the window after this upgrade. The player
  // can explicitly opt back into the dialog afterwards.
  game.settings.register(SYSTEM,MIGRATION,{
    name:'Padrão manual v0.2.22 aplicado',scope:'client',config:false,type:Boolean,default:false,
  });
}
export async function migrateSmartTargetSettings(){
  try {
    if(game.settings.get(SYSTEM,MIGRATION))return false;
    await game.settings.set(SYSTEM,SETTING,'manual');
    await game.settings.set(SYSTEM,MIGRATION,true);
    return true;
  } catch(error) {
    console.warn('[D616] Não foi possível migrar a seleção de alvos para manual',error);
    return false;
  }
}
export function filterValidTargetIds(saved=[],scene){
  const result=[];
  for(const id of saved){const doc=scene?.tokens?.get?.(id);
    if(!doc||doc.hidden&&!game.user?.isGM)continue;
    if(!result.includes(id))result.push(id);
  }
  return result;
}
function currentIds(scene){return Array.from(game.user?.targets??[]).map(t=>t.document??t).filter(t=>t.parent?.id===scene?.id).map(t=>t.id);}
function targetNames(ids,scene){return ids.map(id=>scene.tokens.get(id)?.name??'Alvo').join(', ');}
function selectionSummary(ids,scene){return ids.length?esc(targetNames(ids,scene)):'Nenhum';}
function canUseCanvas(){return !!(canvas?.ready&&canvas?.scene?.id&&canvas?.app?.view&&canvas?.stage&&canvas?.tokens);}
export function shouldPromptForTargets(item,powerRoll){
  if(item?.type==='weapon')return true;
  if(item?.type!=='power')return false;
  if(['Resize Other','Resize Others'].includes(item.name))return true;
  return Boolean(powerRoll?.attackTarget || (powerRoll?.attack && powerRoll?.canRoll));
}
function findTokenAtPoint(point,scene){
  const size=Number(canvas.grid?.size??scene.grid?.size??100);
  const tokens=Array.from(canvas.tokens?.placeables??[]);
  for(const token of tokens.reverse()){
    const doc=token.document;
    if(!doc||doc.parent?.id!==scene.id||doc.hidden&&!game.user.isGM||token.visible===false)continue;
    const x=Number(doc.x),y=Number(doc.y),w=Number(doc.width)*size,h=Number(doc.height)*size;
    if(point.x>=x&&point.x<=x+w&&point.y>=y&&point.y<=y+h)return doc;
  }
  return null;
}
/** Selection overlays make direct map clicks work even on top of tokens. */
export function pickTokensOnMap(scene,initialIds=[]){
  return new Promise(resolve=>{
    if(!canUseCanvas()||canvas.scene.id!==scene.id){resolve(null);return;}
    const ids=new Set(filterValidTargetIds(initialIds,scene));
    const banner=document.createElement('div');banner.className='m616-smart-target-picker';
    const info=document.createElement('span');info.className='m616-smart-target-picker__label';
    const actions=document.createElement('div');actions.className='m616-smart-target-picker__actions';
    const done=document.createElement('button');done.type='button';done.className='m616-smart-target-picker__confirm';done.textContent='Confirmar alvos';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='m616-smart-target-picker__cancel';cancel.textContent='Cancelar';
    actions.append(done,cancel);banner.append(info,actions);document.body.append(banner);
    const render=()=>{info.textContent=`Clique nos tokens para marcar/desmarcar: ${targetNames([...ids],scene)||'nenhum selecionado'}`;};render();
    let disposed=false,downId=null,tearDownHook=null;
    const view=canvas.app.view,stage=canvas.stage,renderer=canvas.app.renderer;
    const stop=e=>{e.preventDefault?.();e.stopImmediatePropagation?.();};
    const onCanvas=e=>e.target===view||e.composedPath?.().includes(view)||view.contains?.(e.target);
    const cleanup=()=>{if(disposed)return;disposed=true;
      document.removeEventListener('pointerdown',onDown,true);document.removeEventListener('pointerup',onUp,true);
      document.removeEventListener('contextmenu',onContext,true);window.removeEventListener('keydown',onKey,true);
      if(tearDownHook!=null)Hooks.off('canvasTearDown',tearDownHook);banner.remove();
    };
    const finish=value=>{cleanup();resolve(value);};
    const onDown=e=>{if(e.button!==0||!onCanvas(e))return;stop(e);downId=e.pointerId;
      const p=canvasPointerPosition(e,{view,stage,renderer});const doc=p?findTokenAtPoint(p,scene):null;
      if(doc){if(ids.has(doc.id))ids.delete(doc.id);else ids.add(doc.id);render();}
    };
    const onUp=e=>{if(downId!==e.pointerId)return;stop(e);downId=null;};
    const onContext=e=>{if(!onCanvas(e))return;stop(e);finish(null);};
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(null);}if(e.key==='Enter'){e.preventDefault();finish([...ids]);}};
    done.addEventListener('click',()=>finish([...ids]));cancel.addEventListener('click',()=>finish(null));
    document.addEventListener('pointerdown',onDown,true);document.addEventListener('pointerup',onUp,true);
    document.addEventListener('contextmenu',onContext,true);window.addEventListener('keydown',onKey,true);
    tearDownHook=Hooks.on('canvasTearDown',()=>finish(null));
  });
}
async function chooseTargetAction({item,marked,scene}){
  const buttons=[];
  if(marked.length)buttons.push({action:'marked',label:'Usar alvos marcados',value:{type:'marked'}});
  buttons.push({action:'new',label:'Selecionar no mapa',value:{type:'map'}},
    {action:'none',label:'Sem alvo',value:{type:'none'}},
    {action:'cancel',label:'Cancelar',value:null});
  const summary=selectionSummary(marked,scene);
  return chooseD616Dialog({title:`${item.name} — Alvos`,
    content:`<div class="m616-smart-target-prompt">
      <p class="m616-smart-target-prompt__eyebrow">SELEÇÃO DE ALVOS</p>
      <div class="m616-smart-target-prompt__current"><span>Alvos marcados no Foundry</span><strong>${summary}</strong></div>
      <p class="m616-smart-target-prompt__hint">Use os alvos já marcados, selecione diretamente no mapa ou continue sem alvo.</p>
    </div>`,
    buttons,defaultAction:marked.length?'marked':'new',width:410,className:'m616-smart-target-dialog'});
}
export async function chooseSmartTargets(item,{force=false}={}){
  const scene=canvas?.scene;
  if(!scene||!game.user)return true; // Theatre of mind: preserve original flow.
  let mode='manual';try{mode=game.settings.get(SYSTEM,SETTING);}catch{}
  // Old "auto" settings are intentionally treated as manual, never locking targets.
  if(!force&&mode!=='confirm')return true;
  if(!item?.actor)return true;
  const marked=currentIds(scene);
  const result=await chooseTargetAction({item,marked,scene});
  if(!result)return false;
  let chosen;
  if(result.type==='marked')chosen=marked;
  else if(result.type==='none')chosen=[];
  else if(result.type==='map')chosen=await pickTokensOnMap(scene,[]);
  if(chosen===null||chosen===undefined)return false;
  const valid=filterValidTargetIds(chosen,scene);
  // Foundry targets change only after confirming the entire dialog.
  if(typeof game.user.updateTokenTargets==='function')await game.user.updateTokenTargets(valid);
  else for(const token of canvas.tokens?.placeables??[]){
    token.setTarget?.(valid.includes(token.document.id),{user:game.user,releaseOthers:false});
  }
  return true;
}
