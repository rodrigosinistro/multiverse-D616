/** Foundry v14 physical wall barriers. Adapted from the user's Elemental Barrier v5 macro.
 * A Wall blocks movement; an accompanying ray MeasuredTemplate draws the color;
 * attack interception is determined from the Wall's actual segment, not a
 * horizontal/vertical approximation. The GM keeps authority over placement.
 */
import {tokenCenter,AREA_WALL_NAMES} from './elemental-area-geometry.mjs';
const SYS='multiverse-d616';
const list=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
export const BARRIER_ELEMENTS=Object.freeze({
  ice:{label:'Gelo / Água',color:'#4db8ff'},
  fire:{label:'Fogo',color:'#ff7a18'},
  force:{label:'Force / Campo de Força',color:'#ffffff'},
  earth:{label:'Metal / Pedra',color:'#a8a8a8'},
  electricity:{label:'Eletricidade',color:'#ffd84d'},
  energy:{label:'Energia',color:'#3f7cff'},
  darkness:{label:'Trevas',color:'#8f5cff'},
  radiation:{label:'Radiação',color:'#7dff6b'}
});
const tk={label:'Telecinese',color:'#b496ff'};
export function barrierMaterial(name,key='ice'){
  if(name==='Telekinetic Barrier')return {...tk,key:'telekinetic'};
  if(name!=='Elemental Barrier'||!Object.hasOwn(BARRIER_ELEMENTS,key))throw new Error('Elemento de barreira inválido.');
  return {...BARRIER_ELEMENTS[key],key};
}
export function barrierLineValid({start,end,caster,rank,scene}){
  const size=Number(scene?.grid?.size),width=Number(scene?.width),height=Number(scene?.height),r=Number(rank);
  const coords=[start?.x,start?.y,end?.x,end?.y,caster?.x,caster?.y].map(Number);
  if(![size,width,height,r,...coords].every(Number.isFinite)||size<=0||r<1)
    return {ok:false,reason:'Coordenadas da barreira inválidas.'};
  const [x1,y1,x2,y2,cx,cy]=coords;
  if([x1,x2].some(x=>x<0||x>width)||[y1,y2].some(y=>y<0||y>height))
    return {ok:false,reason:'A barreira deve ficar dentro da cena.'};
  const length=Math.hypot(x2-x1,y2-y1)/size;
  if(length<0.25||length>2*r+0.001)
    return {ok:false,reason:`Comprimento permitido: de 0,25 a ${2*r} espaços.`};
  if([Math.hypot(x1-cx,y1-cy),Math.hypot(x2-cx,y2-cy)].some(d=>d>10*r*size+0.001))
    return {ok:false,reason:`Toda a barreira deve estar em até ${10*r} espaços do conjurador.`};
  return {ok:true,length};
}
export function wallDocuments(name,start,end,scene,metadata={},elementKey='ice'){
  if(!AREA_WALL_NAMES.has(name))throw new Error('Poder sem barreira física.');
  const material=barrierMaterial(name,elementKey);
  const dx=end.x-start.x,dy=end.y-start.y;
  const length=Math.hypot(dx,dy);
  if(!Number.isFinite(length)||length<0.01)throw new Error('Parede sem comprimento.');
  let direction=Math.atan2(dy,dx)*180/Math.PI;
  if(direction<0)direction+=360;
  const distance=Number(scene?.grid?.distance)||1;
  const pixel=Number(scene?.grid?.size)||100;
  const flags={[SYS]:{elementalArea:{...metadata,name,color:material.color,elementKey:material.key,elementLabel:material.label}}};
  return {
    wall:{c:[start.x,start.y,end.x,end.y],move:globalThis.CONST?.WALL_MOVEMENT_TYPES?.NORMAL??20,
      sight:globalThis.CONST?.EDGE_SENSE_TYPES?.NONE??0,light:globalThis.CONST?.EDGE_SENSE_TYPES?.NONE??0,
      sound:globalThis.CONST?.EDGE_SENSE_TYPES?.NONE??0,door:globalThis.CONST?.WALL_DOOR_TYPES?.NONE??0,
      ds:0,dir:0,flags},
    template:{t:'ray',x:start.x,y:start.y,distance:length/pixel*distance,direction,
      width:Math.max(distance*0.25,0.1),borderColor:material.color,fillColor:material.color,flags}
  };
}
/** Segments cross in 2D; tangent endpoints also intercept, collinear rays along
 * a wall do not count (they should be adjudicated by the GM).
 */
export function lineCrossesWall(a,b,wall){
  const c=wall?.c;
  if(!Array.isArray(c)||c.length!==4)return false;
  const vals=[a?.x,a?.y,b?.x,b?.y,...c].map(Number);
  if(!vals.every(Number.isFinite))return false;
  const [x1,y1,x2,y2,x3,y3,x4,y4]=vals;
  const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
  const rx=x2-x1,ry=y2-y1,sx=x4-x3,sy=y4-y3;
  const denominator=cross(rx,ry,sx,sy);
  if(Math.abs(denominator)<1e-8)return false;
  const qx=x3-x1,qy=y3-y1;
  const t=cross(qx,qy,sx,sy)/denominator,u=cross(qx,qy,rx,ry)/denominator;
  return t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8;
}
export function crossingWalls(scene,attacker,target){
  const from=tokenCenter(attacker,scene),to=tokenCenter(target,scene);
  if(!from||!to)return [];
  return list(scene?.walls).filter(w=>{
    const flags=w.flags?.[SYS]?.elementalArea;
    return AREA_WALL_NAMES.has(flags?.name) && flags?.concentrationId && flags?.sourceActorUuid &&
      lineCrossesWall(from,to,w);
  });
}
export function barrierDocumentsForEffect(scene,actorUuid,effectId,actorId=null){
  const match=doc=>{
    const f=doc.flags?.[SYS]?.elementalArea;
    if(AREA_WALL_NAMES.has(f?.name)&&f?.sourceActorUuid===actorUuid&&f?.concentrationId===effectId)return true;
    // The v5 standalone macro used world flags. On first recast or loss of
    // Concentration remove its old Wall + MeasuredTemplate as one group too.
    const legacy=doc.flags?.world?.d616ElementalBarrier;
    return !!legacy&&!!actorId&&String(legacy.actorId)===String(actorId)&&
      String(legacy.concentrationEffectId)===String(effectId);
  };
  return {walls:list(scene?.walls).filter(match),templates:list(scene?.templates).filter(match),
    regions:list(scene?.regions).filter(match)};
}
