import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={once:()=>{},on:()=>{}};
const {fogSightBlocked,fogRayOcclusionStart}=await import('../scripts/elemental-area-geometry.mjs');
const {eligibleFogViewers,fogCurtainSegments,drawFogCurtain,installFogVisibilityGuard}=await import('../scripts/native-priority-lot6.mjs');
const S='multiverse-d616';
const scene={id:'fog',width:6000,height:4000,grid:{size:100,distance:5}};
const doc=(x,y,id='token')=>({id,documentName:'Token',x,y,width:1,height:1,parent:scene,sight:{enabled:true},actor:{isOwner:true}});
const circle=(x,y,radius)=>({flags:{[S]:{nativeEnvironment:{kind:'fog',center:{x,y},radius}}}});
const region={...scene,regions:[circle(550,50,2)]};
const observer=doc(0,0,'viewer');const near=doc(850,0,'near'),far=doc(1490,0,'far');
// Centers are 900 and 1540 scene pixels apart; cloud is only four squares wide.
test('v228: 15.4-square case blocked even when only a few squares lie in fog',()=>{
 assert.equal(fogSightBlocked(region,observer,far),true);
 assert.equal(fogSightBlocked(region,observer,near),false,'nine-space target still visible');
 assert.equal(fogSightBlocked({...scene,regions:[]},observer,far),false,'fog must be the cause');
});
test('v228: distant fog does not create a blind 10-space zone before the fog starts',()=>{
 const distant={...scene,regions:[circle(1700,50,2)]};
 const before=doc(1450,0,'before'),behind=doc(2300,0,'behind');
 assert.equal(fogSightBlocked(distant,observer,before),false);
 assert.equal(fogSightBlocked(distant,observer,behind),true);
 assert.equal(fogRayOcclusionStart(distant,{x:50,y:50},0),1450);
});
test('v228: fogged observer is restricted in all directions beyond 10 squares, but other rays remain untouched',()=>{
 const inside={...scene,regions:[circle(50,50,3)]};
 assert.equal(fogSightBlocked(inside,observer,doc(1350,0)),true);
 assert.equal(fogSightBlocked(inside,observer,doc(950,0)),false);
 const offRay={...scene,regions:[circle(500,3000,2)]};
 assert.equal(fogSightBlocked(offRay,observer,doc(2000,0)),false);
});
test('v228: curtain produces a concrete visible occlusion mask for the player map',()=>{
 const segments=fogCurtainSegments(region,observer);
 assert.ok(segments.length>0,'ray crossings must produce map occlusion polygons');
 assert.ok(segments.length<360,'small fog cloud only casts a local shadow');
 const graphics={polygons:[],poly(points){this.polygons.push(points);return this;},fill(){return this;}};
 assert.equal(drawFogCurtain(graphics,region,observer),segments.length);
 assert.ok(graphics.polygons.every(p=>p.length===8));
 assert.equal(drawFogCurtain(graphics,{...scene,regions:[]},observer),0);
});
test('v228: map occlusion respects players actual vision sources and leaves GM unrestricted',()=>{
 const a={document:doc(0,0),actor:{isOwner:true}};
 const viewerCanvas={scene,visibility:{tokenVision:true},tokens:{placeables:[a]}};
 assert.equal(eligibleFogViewers(viewerCanvas,{isGM:false}).length,1);
 assert.equal(eligibleFogViewers(viewerCanvas,{isGM:true}).length,0);
 assert.equal(eligibleFogViewers({...viewerCanvas,visibility:{tokenVision:false}},{isGM:false}).length,0);
 assert.equal(eligibleFogViewers({...viewerCanvas,tokens:{placeables:[a,a]}},{isGM:false}).length,2);
});
test('v228: target visibility guard handles the short-cloud 15.4-square regression',()=>{
 const oldGame=globalThis.game,oldCanvas=globalThis.canvas;
 const viewer=doc(0,0,'viewer'),target=doc(1490,0,'target');
 viewer.parent=target.parent=region;
 const vis={testVisibility(){return true;}};
 globalThis.game={user:{id:'player',isGM:false}};
 globalThis.canvas={scene:region,visibility:{tokenVision:true},tokens:{placeables:[{document:viewer,actor:{isOwner:true}}]}};
 try{
  installFogVisibilityGuard(vis);
  assert.equal(vis.testVisibility({x:1540,y:50},{object:{document:target}}),false);
  target.x=850;
  assert.equal(vis.testVisibility({x:900,y:50},{object:{document:target}}),true);
  game.user.isGM=true;
  target.x=1490;
  assert.equal(vis.testVisibility({x:1540,y:50},{object:{document:target}}),true);
 }finally{globalThis.game=oldGame;globalThis.canvas=oldCanvas;}
});
test('v228: local player updates occlusion on token motion and does not write sight.range',()=>{
 const source=readFileSync(new URL('../scripts/native-priority-lot6.mjs',import.meta.url),'utf8');
 assert.match(source,/hooks\.on\('updateToken',\(\)=>\{refreshFogOverlay\(\);/);
 assert.match(source,/host\.addChild\(overlay\);fogOverlay=overlay/);
 assert.doesNotMatch(source,/\.update\(\{'sight\.range':/);
});
