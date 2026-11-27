import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={once:()=>{},on:()=>{}};
const {fogSightBlocked}=await import('../scripts/elemental-area-geometry.mjs');
const {installFogVisibilityGuard, fogTargetVisibleForViewers, syncEnvironmentTokens}=await import('../scripts/native-priority-lot6.mjs');
const S='multiverse-d616';
const scene={id:'s',grid:{size:100,distance:5}};
function token(x,y,id='t'){return {id,x,y,width:1,height:1,parent:scene,documentName:'Token',sight:{enabled:true},actor:{isOwner:true}};}
function fog(id,x,radius){return {id,flags:{[S]:{nativeEnvironment:{kind:'fog',center:{x,y:50},radius}}}};}
test('v227: fog line-of-sight works in daylight and combines separate fog patches',()=>{
 const a=token(0,0,'a'),b=token(2800,0,'b');
 const fogs={...scene,regions:[fog('f1',550,2),fog('f2',2350,2)]};
 assert.equal(fogSightBlocked(fogs,a,b),true,'the line exceeds ten squares and crosses fog despite short fog patches');
 const long={...scene,regions:[fog('f1',650,3),fog('f2',2250,3)]};
 assert.equal(fogSightBlocked(long,a,b),true,'12+ fog squares across separate patches block');
 const same={...scene,regions:[fog('f1',1400,8),fog('f2',1400,8)]};
 assert.equal(fogSightBlocked(same,a,b),true,'overlap does not double count, but a long patch still blocks');
 assert.equal(fogSightBlocked({...scene,regions:[]},a,b),false);
});
test('v227: visibility guard only hides targets behind ten fog squares for player; GM unaffected',()=>{
 const original={game:globalThis.game,canvas:globalThis.canvas};
 const source=token(0,0,'source'),target=token(2700,0,'target');
 const area={...scene,regions:[fog('f',1350,14)]};
 source.parent=target.parent=area;
 const visible={testVisibility(){return true;}};
 globalThis.game={user:{id:'player',isGM:false}};
 globalThis.canvas={scene:area,tokens:{placeables:[{document:source,actor:{isOwner:true}}]}};
 try{
  assert.equal(installFogVisibilityGuard(visible),true);
  assert.equal(visible.testVisibility({x:2750,y:50},{object:{document:target}}),false);
  assert.equal(visible.testVisibility({x:2750,y:50},{object:{documentName:'Tile'}}),true,'does not override unrelated objects');
  assert.equal(installFogVisibilityGuard(visible),false,'no double wrapping');
  game.user.isGM=true;
  assert.equal(visible.testVisibility({x:2750,y:50},{object:{document:target}}),true);
 }finally{globalThis.game=original.game;globalThis.canvas=original.canvas;}
});
test('v227: Silence Status follows repeated moves and does not delete unrelated Surdo effects',async()=>{
 const previous=globalThis.game;
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};
 const r={id:'r',flags:{[S]:{nativeEnvironment:{kind:'silence',center:{x:100,y:100},radius:2}}}};
 const world={...scene,regions:[r]};
 const actor={uuid:'Actor.one',effects:[{id:'surdo-other',statuses:new Set(['mmrpg.deafened']),flags:{}}],
 async createEmbeddedDocuments(_type,rows){this.effects.push(...rows.map(row=>({...row,id:'silence-effect'})));},
 async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 const doc=token(50,50);doc.parent=world;doc.actor=actor;world.tokens=[doc];
 try{
  for(let i=0;i<4;i++){
   doc.x=50;await syncEnvironmentTokens(world);
   assert.equal(actor.effects.length,2);
   assert.equal(actor.effects[1].showIcon,2);
   doc.x=1100;await syncEnvironmentTokens(world);
   assert.deepEqual(actor.effects.map(e=>e.id),['surdo-other']);
  }
 }finally{globalThis.game=previous;}
});
test('v227: README and compendium preservation policy while fixing v14 conditions',()=>{
 const src=readFileSync(new URL('../scripts/native-priority-lot6.mjs',import.meta.url),'utf8');
 assert.match(src,/showIcon:2/);assert.match(src,/core:\{statusId:'mmrpg.deafened'\}/);
 assert.match(src,/installFogVisibilityGuard/);assert.match(src,/tokenInsideEnvironment/);
 assert.doesNotMatch(src, /\[`flags\.\$\{S\}\.nativeFogOriginal`\]:\{version:1,range:before/);
});
