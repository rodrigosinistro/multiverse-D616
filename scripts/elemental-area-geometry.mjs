/** Geometry of the visible Foundry V14 Region barriers (in scene pixels).
 *  A Region is a visual boundary, not a wall.  Check attacker and defender
 *  centres and let the GM bypass special cases such as phasing or vertical shots.
 */
const SYS='multiverse-d616';
export const AREA_STRUCTURE_NAMES=Object.freeze(['Elemental Barrier','Telekinetic Barrier','Elemental Prison','Elemental Sphere','Telekinetic Sphere']);
export const AREA_WALL_NAMES=new Set(['Elemental Barrier','Telekinetic Barrier']);
export const AREA_SPHERE_NAMES=new Set(['Elemental Sphere','Telekinetic Sphere']);

const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
export function tokenCenter(doc,scene){
  if(!doc)return null;
  const o=doc.document??doc;
  const pixel=Number(scene?.grid?.size??100);
  const x=Number(o.x),y=Number(o.y),w=Number(o.width??1),h=Number(o.height??1);
  return [x,y,w,h,pixel].every(Number.isFinite)&&pixel>0
    ?{x:x+w*pixel/2,y:y+h*pixel/2}:null;
}
export function areaCircle(region){
  const shape=all(region?.shapes).find(s=>s?.type==='circle');
  if(!shape)return null;
  const x=Number(shape.x),y=Number(shape.y),radius=Number(shape.radius);
  return [x,y,radius].every(Number.isFinite)&&radius>0?{x,y,radius}:null;
}
export function areaRectangle(region){
  const shape=all(region?.shapes).find(s=>s?.type==='rectangle');
  if(!shape)return null;
  const x=Number(shape.x),y=Number(shape.y),width=Number(shape.width),height=Number(shape.height);
  return [x,y,width,height].every(Number.isFinite)&&width>0&&height>0?{x,y,width,height}:null;
}
export function pointInArea(point,region){
  if(!point)return false;
  const circle=areaCircle(region);
  if(circle)return Math.hypot(point.x-circle.x,point.y-circle.y)<=circle.radius+0.001;
  const rect=areaRectangle(region);
  return !!rect && point.x>=rect.x&&point.x<=rect.x+rect.width &&
    point.y>=rect.y&&point.y<=rect.y+rect.height;
}
/** Crosses from one side of a protective boundary to the other. */
export function barrierCrossed(region,source,target,scene){
  const from=tokenCenter(source,scene),to=tokenCenter(target,scene);
  if(!from||!to)return false;
  const rect=areaRectangle(region);
  if(rect){
    // Segment vs axis-aligned barrier: covers shots crossing the wall even
    // when both token centres are outside its narrow rectangle.
    let tMin=0,tMax=1;
    for(const [start,delta,min,max] of [
      [from.x,to.x-from.x,rect.x,rect.x+rect.width],
      [from.y,to.y-from.y,rect.y,rect.y+rect.height]]){
      if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
      const a=(min-start)/delta,b=(max-start)/delta;
      tMin=Math.max(tMin,Math.min(a,b));tMax=Math.min(tMax,Math.max(a,b));
      if(tMin>tMax)return false;
    }
    return true;
  }
  return pointInArea(from,region)!==pointInArea(to,region);
}
/** Normalize region flags and filter to barriers which cross an attack path. */
export function crossingRegions(scene,source,target){
  if(!scene||!source||!target)return [];
  return all(scene.regions).filter(region=>{
    const f=region.flags?.[SYS]?.elementalArea;
    return AREA_STRUCTURE_NAMES.includes(f?.name) && !!f?.concentrationId &&
      !!f?.sourceActorUuid && barrierCrossed(region,source,target,scene);
  });
}
export function regionDataForPower(name,center,radius,metadata={}){
  if(!AREA_STRUCTURE_NAMES.includes(name))throw new Error('Poder de estrutura inválido.');
  const wall=AREA_WALL_NAMES.has(name);
  const x=Number(center?.x),y=Number(center?.y),r=Number(radius);
  const rect=metadata.rectangle;
  const dimensions=[Number(rect?.x),Number(rect?.y),Number(rect?.width),Number(rect?.height)];
  if(wall ? dimensions.some(v=>!Number.isFinite(v))||dimensions[2]<=0||dimensions[3]<=0
    :![x,y,r].every(Number.isFinite)||r<=0)throw new Error('Geometria de estrutura inválida.');
  const color=name.startsWith('Telekinetic')?'#b496ff':name==='Elemental Sphere'?'#6bb6ff':'#e8a761';
  const {rectangle:ignored,...flags}=metadata;
  return {
    name,color,visibility:2,highlightMode:'coverage',displayMeasurements:true,
    restriction:{enabled:false},
    shapes:[wall?{type:'rectangle',x:Math.round(dimensions[0]),y:Math.round(dimensions[1]),
      width:Math.round(dimensions[2]),height:Math.round(dimensions[3])}:
      {type:'circle',x:Math.round(x),y:Math.round(y),radius:Math.round(r)}],
    flags:{[SYS]:{elementalArea:{...flags,name}}}
  };
}


/** v228: Control Fog obstructs lines of sight LONGER than 10 spaces if
 * the sight ray encounters fog. Distance is measured from the observer,
 * not merely the length of the segment INSIDE a fog circle. The previous
 * sum-of-intersections algorithm let a five-space cloud be completely
 * transparent to viewers 15+ spaces away (the v227 field regression).
 * These pure functions drive token visibility and the on-screen fog curtain.
 */
export const FOG_SIGHT_SPACES=10;
export function fogRayOcclusionStart(scene,observer,angle){
 const grid=Number(scene?.grid?.size)||100;
 if(!observer||![observer.x,observer.y,angle].every(Number.isFinite))return Infinity;
 const dirX=Math.cos(angle),dirY=Math.sin(angle);
 let firstOcclusion=Infinity;
 for(const region of all(scene?.regions)){
  const fog=region?.flags?.[SYS]?.nativeEnvironment;
  if(fog?.kind!=='fog'||!fog.center||!(Number(fog.radius)>0))continue;
  const radius=Number(fog.radius)*grid;
  const ox=observer.x-Number(fog.center.x),oy=observer.y-Number(fog.center.y);
  const projection=-(ox*dirX+oy*dirY);
  const perpendicularSquared=ox*ox+oy*oy-projection*projection;
  const remaining=radius*radius-perpendicularSquared;
  if(remaining<=1e-7)continue; // Tangency is not an obscured path.
  const offset=Math.sqrt(Math.max(0,remaining));
  const near=projection-offset,far=projection+offset;
  if(far<=0)continue;
  const limit=Number.isFinite(Number(fog.visibilitySpaces))&&Number(fog.visibilitySpaces)>0?Number(fog.visibilitySpaces):FOG_SIGHT_SPACES;
  firstOcclusion=Math.min(firstOcclusion,Math.max(limit*grid,Math.max(0,near))); 
 }
 return firstOcclusion;
}
/** True if the sight ray to a target passes through fog AND the target
 * lies beyond the allowed 10-space visibility horizon.
 * Unaffected rays continue using Foundry's normal walls/light/vision.
 */
export function fogSightBlocked(scene,source,target){
 const a=tokenCenter(source,scene),b=tokenCenter(target,scene);
 if(!a||!b)return false;
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 const grid=Number(scene?.grid?.size)||100;
 const start=fogRayOcclusionStart(scene,a,Math.atan2(dy,dx));
 return start<length-1e-5;
}
