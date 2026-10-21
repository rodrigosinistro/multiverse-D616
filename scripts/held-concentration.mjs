/** v0.2.67 — release ONLY provenance-linked restraint Concentration.
 * Never dismiss all Concentrations or a power sustaining independent effects.
 */
const SYSTEM='multiverse-d616';
const RESTRAINT_POWERS=new Set([
  'Hellfire Chains','Coiling Crush','Elemental Grab','Telekinetic Grab',
  'Crimson Bands of Cyttorak',
]);
const RESTRAINT_STATUSES=new Set(['grabbed','paralyzed','pinned']);
const values=coll=>Array.from(coll?.contents??coll?.values?.()??coll??[]);
const pending=new Set();
function activeGM(){const gm=game.users?.activeGM;return Boolean(game.user?.isGM&&(!gm||gm.id===game.user.id));}
function allActors(){
 const actors=new Map();
 for(const actor of values(game.actors))if(actor?.uuid)actors.set(actor.uuid,actor);
 for(const scene of values(game.scenes))for(const token of values(scene.tokens))
   if(token?.actor?.uuid)actors.set(token.actor.uuid,token.actor);
 return [...actors.values()];
}
function sourceActor(uuid){
 try {const doc=typeof fromUuidSync==='function'?fromUuidSync(uuid):null;
   if(doc?.documentName==='Actor'||doc?.effects&&doc?.items)return doc;
 }catch(_error){}
 return allActors().find(a=>a.uuid===uuid)??null;
}
function associated(e,sourceUuid,concentrationId){
 const f=e?.flags?.[SYSTEM]?.powerCondition;
 return !e?.disabled&&f?.sourceActorUuid===sourceUuid&&f?.concentrationEffectId===concentrationId&&
   RESTRAINT_STATUSES.has(f.status);
}
/** Invoked after a target condition was DELETED or disabled (GM only).
 * Multiple statuses from one Fantastic (Grabbed + Paralyzed) may be removed
 * independently. The caster keeps concentration until the LAST one is gone.
 */
export async function endConcentrationOnLastEscape(effect){
 const f=effect?.flags?.[SYSTEM]?.powerCondition;
 if(!activeGM()||!f?.concentrationEffectId||!RESTRAINT_POWERS.has(f.powerName)||
    !RESTRAINT_STATUSES.has(f.status))return false;
 const key=`${f.sourceActorUuid}:${f.concentrationEffectId}`;
 if(pending.has(key))return false;
 pending.add(key);
 try{
   const actor=sourceActor(f.sourceActorUuid);
   const concentration=values(actor?.effects).find(e=>e.id===f.concentrationEffectId&&!e.disabled&&
     e.flags?.[SYSTEM]?.concentrationPower?.itemId===f.sourceItemId);
   if(!concentration)return false;
   if(allActors().some(a=>values(a.effects).some(e=>associated(e,f.sourceActorUuid,concentration.id))))return false;
   await actor.deleteEmbeddedDocuments('ActiveEffect',[concentration.id]);
   return true;
 }finally{pending.delete(key);}
}
/** After GM confirmed normal Hellfire Chains damage, there was no hold.
 * Unlike the Fantastic result, ordinary hits cannot maintain the chains.
 * Other live restraints of the SAME concentration are always preserved.
 */
export async function endUnneededHellfireConcentration(sourceActorUuid,itemId){
 if(!activeGM()||!itemId)return false;
 const actor=sourceActor(sourceActorUuid);
 if(!actor)return false;
 const concentration=values(actor.effects).find(e=>!e.disabled&&
   e.flags?.[SYSTEM]?.concentrationPower?.itemId===itemId);
 if(!concentration)return false;
 if(allActors().some(a=>values(a.effects).some(e=>associated(e,actor.uuid,concentration.id))))return false;
 await actor.deleteEmbeddedDocuments('ActiveEffect',[concentration.id]);
 return true;
}
export function registerHeldConcentrationHooks(){
 for(const event of ['deleteActiveEffect','updateActiveEffect'])Hooks.on(event,(effect,change)=>{
   if(event==='updateActiveEffect'&&change?.disabled!==true)return;
   if(!effect?.flags?.[SYSTEM]?.powerCondition)return;
   // On deletion of the final status the remaining statuses have already
   // been removed from the embedded collection (not before the GM click).
   void endConcentrationOnLastEscape(effect).catch(e=>console.error('[D616] Held concentration',e));
 });
}
