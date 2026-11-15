/** D616 v0.2.168 — Sequencer persistent VFX keyed to an ACTUAL status condition.
 * Only the active GM creates/ends shared effects. The absence of Sequencer
 * or an unconfigured condition has no gameplay effect.
 */
const SYSTEM='multiverse-d616';
export const CONDITION_VFX_SETTING='conditionTokenAnimations';
const playing=new Map();
const signature=cfg=>JSON.stringify([cfg.path,Number(cfg.scale??1)]);
const registeredName=(effect)=>String(effect?.data?.name??effect?.name??effect?.id??'');
const activeGM=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const keyFor=(token,id)=>`d616-status:${token.document?.uuid??token.id}:${id}`;
export function validateConditionVfx(input){
  const status=String(input?.status??'').trim().slice(0,100);
  const path=String(input?.path??'').trim().slice(0,500);
  const scale=Number(input?.scale??1);
  if(!/^mmrpg\.[a-z-]{2,40}(?:\.[1-6])?$/.test(status))throw new Error('Selecione uma condição válida.');
  if(!path||/[<>"'`]/.test(path)||/^(?:javascript:|data:)/i.test(path)||!/^([^:]+\/|https:\/\/)/i.test(path))
    throw new Error('Informe um caminho de animação válido (.webm, .webp, etc.).');
  if(!Number.isFinite(scale)||scale<.2||scale>4)throw new Error('Escala deve ser entre 0,2 e 4.');
  return {status,path,scale};
}
export function configuredConditionVfx(settings=globalThis.game?.settings){
  try{const raw=settings?.get?.(SYSTEM,CONDITION_VFX_SETTING);return Array.isArray(raw)?raw.filter(x=>x&&typeof x.status==='string'&&typeof x.path==='string').slice(0,40):[];}
  catch{return [];}
}
export function activeConditionIds(actor){
  const ids=new Set();
  for(const effect of list(actor?.effects)){
    if(effect?.disabled||effect?.duration?.expired===true)continue;
    for(const id of effect?.statuses??[])ids.add(id);
    if(effect?.flags?.core?.statusId)ids.add(effect.flags.core.statusId);
  }
  for(const id of actor?.statuses??[])ids.add(id);
  return ids;
}
export async function syncConditionTokenVfx(token){
  if(!activeGM()||!token?.document||!token?.actor)return false;
  const Sequencer=globalThis.Sequencer,Sequence=globalThis.Sequence;
  if(!Sequencer?.EffectManager||typeof Sequence!=='function')return false;
  const active=activeConditionIds(token.actor);
  const configured=configuredConditionVfx();
  const wanted=new Set();
  for(const cfg of configured){
    const key=keyFor(token,cfg.status);
    if(!active.has(cfg.status))continue;
    wanted.add(key);
    const configuredSignature=signature(cfg);
    if(playing.get(key)===configuredSignature)continue;
    // A persistent Sequencer effect may have survived a client reload.
    // Recreate it with the CURRENT scale instead of assuming its visuals match.
    const already=Sequencer.EffectManager.getEffects?.({name:key,object:token})??[];
    if(playing.has(key)||already.length)await Sequencer.EffectManager.endEffects({name:key,object:token});
    try{
      await new Sequence().effect().file(cfg.path).attachTo(token).persist().name(key).scaleToObject(cfg.scale??1).play();
      playing.set(key,configuredSignature);
    }catch(error){playing.delete(key);console.warn(`[D616] VFX da condição ${cfg.status}`,error);}
  }
  const prefix=`d616-status:${token.document.uuid}:`;
  // Also remove effects Sequencer restored after a reload, not only local cache.
  const orphans=Sequencer.EffectManager.getEffects?.({object:token})??[];
  const tracked=new Set([...playing.keys()].filter(key=>key.startsWith(prefix)));
  for(const effect of orphans){const name=registeredName(effect);if(name.startsWith(prefix))tracked.add(name);}
  for(const key of tracked){
    if(wanted.has(key))continue;
    await Sequencer.EffectManager.endEffects({name:key,object:token});playing.delete(key);
  }
  return true;
}
export function registerConditionTokenVfx(){
  Hooks.once('init',()=>game.settings.register(SYSTEM,CONDITION_VFX_SETTING,{
    name:'Animações por condição (Central)',hint:'Arquivos Sequencer persistentes para condições ativas. Edite pela Central de Automações.',
    scope:'world',config:false,type:Array,default:[],
    onChange:()=>{for(const token of canvas?.tokens?.placeables??[])void syncConditionTokenVfx(token);},
  }));
  const queue=token=>{if(token)void Promise.resolve().then(()=>syncConditionTokenVfx(token)).catch(error=>console.warn('[D616] VFX por condição',error));};
  const refreshActor=actor=>{
    if(!actor)return;
    for(const token of canvas?.tokens?.placeables??[]){
      if(token.actor===actor||token.actor?.id===actor.id)queue(token);
    }
  };
  Hooks.on('drawToken',queue);Hooks.on('canvasReady',()=>{for(const token of canvas?.tokens?.placeables??[])queue(token);});
  Hooks.on('canvasTearDown',()=>playing.clear());
  Hooks.on('createActiveEffect',effect=>refreshActor(effect?.parent?.actor??effect?.parent));
  Hooks.on('updateActiveEffect',effect=>refreshActor(effect?.parent?.actor??effect?.parent));
  Hooks.on('deleteActiveEffect',effect=>refreshActor(effect?.parent?.actor??effect?.parent));
  Hooks.on('updateActor',refreshActor);
  Hooks.on('deleteToken',token=>{const sceneId=token.parent?.id;for(const key of [...playing.keys()])if(key.includes(`Scene.${sceneId}.Token.${token.id}:`))playing.delete(key);});
}
if(globalThis.Hooks?.on)registerConditionTokenVfx();
