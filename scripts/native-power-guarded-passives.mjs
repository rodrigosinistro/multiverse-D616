/** v0.2.190: defensive/concentration modifiers WITHOUT new status or costs. */
const SYSTEM='multiverse-d616';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
function concentrationItem(actor,effect){
  const holder=effect?.flags?.[SYSTEM]?.concentrationPower;
  if(effect?.disabled||effect?.duration?.expired===true||!holder?.transient||!holder.itemId)return null;
  return actor?.items?.get?.(holder.itemId)??list(actor?.items).find(i=>i.id===holder.itemId);
}
export function activeNativeConcentratedPower(actor,set,name){
  return list(actor?.effects).some(effect=>{
    const power=concentrationItem(actor,effect);
    return power?.type==='power'&&power.name===name&&power.system?.powerSet===set;
  });
}
export function shieldWallTargetModifier(actor,{attack=false,targeted=false}={}){
  if(!attack||!targeted||!activeNativeConcentratedPower(actor,'Shield Bearer','Shield Wall'))return null;
  return Object.freeze({source:'Alvo: Shield Wall',reason:'Trouble enquanto mantém a postura de escudo',sign:-1});
}
/** A voluntarily moved token loses concentration in Shield Wall. Forced motion
 * can be represented by GM movement too, so Narrator can undo as appropriate;
 * status remains listed as partial until move-action intent is observable.
 */
export function registerShieldWallMoveHook(){
  Hooks.on('updateToken',(token,changed)=>{
    if(!game?.user?.isGM||game.users?.activeGM?.id&&game.user.id!==game.users.activeGM.id)return;
    if(!Object.hasOwn(changed??{},'x')&&!Object.hasOwn(changed??{},'y'))return;
    const actor=token?.actor;
    if(!actor?.deleteEmbeddedDocuments)return;
    const effects=list(actor.effects).filter(e=>{
      const p=concentrationItem(actor,e);
      return p?.name==='Shield Wall'&&p.system?.powerSet==='Shield Bearer';
    });
    if(effects.length)void actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id))
      .catch(error=>console.error('[D616] Encerramento de Shield Wall:',error));
  });
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerShieldWallMoveHook);
