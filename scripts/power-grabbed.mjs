/** D616 v0.2.42 — house rule: a remote power hold is not a physical grapple.
 * Status provenance is read from the actual ActiveEffect.  Manual/physical
 * Grabbed is never reclassified because of the caster's other conditions.
 */
export const POWER_GRABBED_STATUS = 'mmrpg.power-grabbed';
const SYS='multiverse-d616';
const REMOTE_GRABS=new Set(['Elemental Grab','Telekinetic Grab','Webgrabbing','Hellfire Chains']);
const collection=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const active=e=>!e?.disabled&&e?.duration?.expired!==true;
const hasStatus=(effect,id)=>collection(effect?.statuses).some(s=>String(s?.id??s)===id);
export function isRemoteGrabPower(name){return REMOTE_GRABS.has(String(name??''));}
export function isPowerGrabbedEffect(effect){
  if(!active(effect))return false;
  if(hasStatus(effect,POWER_GRABBED_STATUS))return true;
  const flag=effect?.flags?.[SYS]?.powerCondition;
  if(flag?.status==='grabbed' && (isRemoteGrabPower(flag.powerName)||flag.elementalSpecial&&flag.element==='plants'))return true;
  // Existing elemental 'Plants' effects placed by the fantastic-damage engine.
  const element=effect?.flags?.[SYS]?.elementalFantastic;
  return element?.element==='plants' && hasStatus(effect,'mmrpg.grabbed');
}
export function powerGrabStatusFor({status,powerName,elementalSpecial=false,element=null}={}){
  return status==='grabbed' && (isRemoteGrabPower(powerName)||(elementalSpecial&&element==='plants'))
    ?POWER_GRABBED_STATUS :status?`mmrpg.${status}`:null;
}
export function hasPhysicalGrab(actor){
  const effects=collection(actor?.effects).filter(active);
  const physical=effects.some(e=>hasStatus(e,'mmrpg.grabbed')&&!isPowerGrabbedEffect(e));
  if(physical)return true;
  // In Foundry, Actor.statuses reflects the union of its ActiveEffects; a
  // status-only actor is supported for legacy sheets and mocked actors.
  return !effects.some(e=>hasStatus(e,'mmrpg.grabbed')) &&
    collection(actor?.statuses).some(s=>String(s?.id??s)==='mmrpg.grabbed');
}
export function isPowerGrabbed(actor){
  const effects=collection(actor?.effects);
  if(effects.some(isPowerGrabbedEffect))return true;
  // Do not treat a stale status aggregate from a now-disabled effect as live.
  return !effects.some(e=>hasStatus(e,POWER_GRABBED_STATUS)) &&
    collection(actor?.statuses).some(s=>String(s?.id??s)===POWER_GRABBED_STATUS);
}
export function mayMoveHeldToken(token,changed,user,{allowGMOverride=true}={}){
  if(!token?.actor||!isPowerGrabbed(token.actor))return true;
  const change=changed??{};
  // Cosmetic changes, rotation, size changes and effects never count as travel.
  const movement=['x','y','elevation'].some(key=>Object.hasOwn(change,key)&&Number(change[key])!==Number(token[key]));
  if(!movement)return true;
  // GM may reposition or resolve a forced movement with narrative authority.
  return Boolean(allowGMOverride && user?.isGM);
}
let installed=false;
export function registerPowerGrabbedHooks(){
  if(installed||typeof Hooks==='undefined')return;
  installed=true;
  Hooks.on('preUpdateToken',(token,changes,_options,userId)=>{
    const user=game.users?.get?.(userId)??(game.user?.id===userId?game.user:null);
    if(mayMoveHeldToken(token,changes,user))return;
    if(game.user?.id===userId)ui.notifications?.warn?.('Agarrado — Poder: o personagem não pode se deslocar antes de escapar ou encerrar a contenção.');
    return false;
  });
}
