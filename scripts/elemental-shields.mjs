/** Protection barriers on the owning token. Authority belongs to the active GM.
 * Sphere/Prison intercept only when the attack is specifically directed at the
 * structure; Protection intercepts attacks against its owner automatically.
 */
import {elementalProtection,telekineticProtection,absorbElementalStructureHit} from './elemental-advanced.mjs';
import {findUsableAttachedPower} from './item-attached-powers.mjs';
import {crossingRegions,tokenCenter,areaCircle,areaRectangle,AREA_STRUCTURE_NAMES} from './elemental-area-geometry.mjs';
import {crossingWalls} from './elemental-wall-geometry.mjs';
const SYS='multiverse-d616';
const array=c=>Array.from(c?.contents??c?.values?.()??c??[]);
export const GUARD_NAMES=new Set(AREA_STRUCTURE_NAMES);
/** Personal shields described in the shipped power catalog. These absorb the
 * COMPLETE incoming attack before normal DR; exceeding the threshold removes
 * the sustaining Concentration but still inflicts no damage from that hit.
 * Shield Bearer Shield 1–4 are DR, not absorption barriers.
 */
export function personalProtectionSpec(name){
  const clean=String(name??'').trim();
  const match=/^(Elemental Protection|Telekinetic Protection) ([1-4])$/i.exec(clean);
  if(match)return {threshold:10*Number(match[2]),healthOnly:false};
  if(/^Shield of the Seraphim$/i.test(clean))
    return {threshold:20,healthOnly:true}; // Physical-damage shield; Focus/psychic attacks are not Health.
  return null;
}
export function activeElementalGuards(actor){
  return array(actor?.effects).filter(e=>!e.disabled).map(effect=>{
    const id=effect.flags?.[SYS]?.concentrationPower?.itemId;
    const item=actor?.items?.get?.(id)??array(actor?.items).find(i=>i.id===id)??findUsableAttachedPower(actor,id);
    const spec=personalProtectionSpec(item?.name);
    if(!spec&&!GUARD_NAMES.has(item?.name))return null;
    const protection=spec?null:(GUARD_NAMES.has(item.name) && item.name.endsWith('Barrier')
      ?{threshold:10}:item.name.startsWith('Telekinetic')?telekineticProtection(actor):elementalProtection(actor));
    const threshold=spec?.threshold??protection?.threshold;
    return Number.isFinite(threshold)?{effect,item,kind:spec?'protection':'structure',
      name:item.name,threshold,healthOnly:Boolean(spec?.healthOnly)}:null;
  }).filter(Boolean);
}
export function selectGuard(guards,mode='auto',category='health'){
  if(mode==='bypass')return null;
  if(mode==='structure')return guards.find(g=>g.kind==='structure')??null;
  // Sphere/Prison only intercept when their drawn Region is crossed.
  return guards.filter(g=>g.kind==='protection' && (category!=='focus'||!g.healthOnly))
    .sort((a,b)=>b.threshold-a.threshold)[0]??null;
}
/** Single protection-selection priority for chat damage and legacy cards.
 * Outermost drawn boundary takes precedence; otherwise use the strongest
 * personal protection (Elemental, Telekinetic, or Seraphim).
 * The explicit GM bypass is authoritative.
 * DR, Shield and other effects remain in the normal damage computation and
 * are not subtracted from raw damage BEFORE testing the barrier threshold.
 */
export function selectElementalDefense({actor,boundary=null,mode='auto',category='health'}={}){
  if(mode==='bypass')return null;
  if(boundary?.guard&&boundary?.actor)return {guard:boundary.guard,owner:boundary.actor,source:'boundary'};
  const guard=selectGuard(activeElementalGuards(actor),mode,category);
  return guard?{guard,owner:actor,source:'personal'}:null;
}
export function assessGuardHit(rawDamage,guard){
  if(!guard)return {blocked:false,damageToTarget:Math.max(0,Number(rawDamage)||0),destroyed:false};
  const result=absorbElementalStructureHit(Math.max(0,Number(rawDamage)||0),guard.threshold);
  return {blocked:true,damageToTarget:0,destroyed:result.destroyed,threshold:guard.threshold,name:guard.name};
}
export async function consumeGuard(actor,guard,result){
  if(!guard||!result.destroyed)return;
  // Verify the effect is still present; never touch another character's effect.
  if(array(actor?.effects).some(e=>e.id===guard.effect.id))
    await actor.deleteEmbeddedDocuments('ActiveEffect',[guard.effect.id]);
}
export function guardTargetDefense(actor,guard){
  return Number(actor?.system?.abilities?.[guard?.name?.startsWith('Telekinetic')?'log':'ego']?.defense??0);
}

/** The boundary belongs to its caster, NOT to the protected target.
 * Called on the GM while evaluating hit/defense and before applying damage.
 * A shot which crosses an active visible Region targets its creator's Ego
 * defense. Both inside (or both outside) leaves the normal defense in place.
 */
export function findCrossingElementalBarrier(scene,sourceToken,targetToken){
  const candidates=[];
  const from=tokenCenter(sourceToken,scene);
  for(const region of crossingRegions(scene,sourceToken,targetToken)){
    const area=region.flags?.[SYS]?.elementalArea;
    let caster=null;
    try{caster=fromUuidSync?.(area.sourceActorUuid)??null;}catch(_e){}
    if(!caster?.effects)continue;
    const guard=activeElementalGuards(caster).find(g=>g.kind==='structure'&&
      g.name===area.name && g.effect.id===area.concentrationId);
    if(!guard)continue;
    const circle=areaCircle(region),rect=areaRectangle(region);
    const distance=from&&circle?Math.abs(Math.hypot(from.x-circle.x,from.y-circle.y)-circle.radius)
      :from&&rect?Math.hypot(Math.max(rect.x-from.x,0,from.x-rect.x-rect.width),
        Math.max(rect.y-from.y,0,from.y-rect.y-rect.height)):Infinity;
    candidates.push({region,actor:caster,guard,distance});
  }
  for(const wall of crossingWalls(scene,sourceToken,targetToken)){
    const area=wall.flags?.[SYS]?.elementalArea;
    let caster=null;
    try{caster=fromUuidSync?.(area.sourceActorUuid)??null;}catch(_e){}
    if(!caster?.effects)continue;
    const guard=activeElementalGuards(caster).find(g=>g.kind==='structure' &&
      g.name===area.name && g.effect.id===area.concentrationId);
    if(!guard)continue;
    const [x1,y1,x2,y2]=wall.c;
    const dx=x2-x1,dy=y2-y1;
    const t=from&&dx*dx+dy*dy>0?Math.max(0,Math.min(1,((from.x-x1)*dx+(from.y-y1)*dy)/(dx*dx+dy*dy))):0;
    const distance=from?Math.hypot(from.x-x1-t*dx,from.y-y1-t*dy):Infinity;
    candidates.push({wall,actor:caster,guard,distance});
  }
  // Nearest intersected boundary is intercepted first.
  return candidates.sort((a,b)=>a.distance-b.distance)[0]??null;
}
