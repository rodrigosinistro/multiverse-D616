import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintWebCellPath,validCells,phaseDragOptions,installPhaseSelfDragSupport,phaseMoveOptions} from '../scripts/native-priority-lot3.mjs';
const S='multiverse-d616';
const scene={id:'s',width:1600,height:1200,grid:{size:100}};
const active=(id='phase')=>({id,items:{get:x=>x==='phase'?{type:'power',name:'Phase Self',system:{powerSet:'Phasing'}}:null},effects:[{disabled:false,flags:{[S]:{concentrationPower:{itemId:'phase',transient:true}}}}],testUserPermission:u=>u?.id==='owner'});

test('v221: paint Webtrapping by dragging across squares, including missed pointer events',()=>{
 let cells=paintWebCellPath([],{col:1,row:1},scene);
 cells=paintWebCellPath(cells,{col:4,row:1},scene);
 assert.deepEqual(cells,[{col:1,row:1},{col:2,row:1},{col:3,row:1},{col:4,row:1}]);
 assert.equal(validCells(cells,scene),true);
 cells=paintWebCellPath(cells,{col:4,row:5},scene);
 assert.equal(cells.length,5,'never more than five, even when pointer jumps far');
 assert.equal(validCells(cells,scene),true);
});
test('v221: dragging backwards retracts path and enables a new orthogonal branch',()=>{
 let cells=paintWebCellPath([],{col:1,row:1},scene);
 cells=paintWebCellPath(cells,{col:4,row:1},scene);
 cells=paintWebCellPath(cells,{col:2,row:1},scene);
 assert.equal(cells.length,2);
 cells=paintWebCellPath(cells,{col:2,row:3},scene);
 assert.deepEqual(cells,[{col:1,row:1},{col:2,row:1},{col:2,row:2},{col:2,row:3}]);
 assert.equal(validCells(cells,scene),true);
});
test('v221: Webtrapping rejects invalid mouse coordinates and boundaries',()=>{
 const source=[{col:0,row:0}];
 assert.deepEqual(paintWebCellPath(source,{col:-1,row:0},scene),source);
 assert.deepEqual(paintWebCellPath(source,{col:100,row:0},scene),source,'outside-scene pointer ignored');
 assert.deepEqual(paintWebCellPath(source,{col:0.5,row:1},scene),source);
 assert.equal(validCells(source,scene),true);
});
test('v221: Phase Self drag modifies only owned, live phased actor and preserves options',()=>{
 const actor=active();
 const user={id:'owner',isGM:false};
 assert.deepEqual(phaseDragOptions({method:'dragging',constrainOptions:{ignoreCost:false}},actor,user),
  {method:'dragging',constrainOptions:{ignoreCost:false,ignoreWalls:true}});
 assert.deepEqual(phaseDragOptions({method:'dragging'},actor,{id:'other'}),{method:'dragging'});
 actor.effects[0].disabled=true;
 assert.deepEqual(phaseDragOptions({method:'dragging'},actor,user),{method:'dragging'});
});
test('v221: v14 Token drag preview and final drop both bypass walls only while phased',()=>{
 const before=globalThis.game;
 globalThis.game={user:{id:'owner',isGM:false}};
 try {
  class MockToken {
   _getDragConstrainOptions(){return {ignoreCost:false};}
   _getDragLeftDropUpdateOptions(){return {method:'dragging',constrainOptions:{ignoreCost:false}};}
  }
  const phase=active(),token=new MockToken();token.document={actor:phase};
  assert.equal(installPhaseSelfDragSupport({TokenClass:MockToken}),true);
  assert.equal(installPhaseSelfDragSupport({TokenClass:MockToken}),true,'wrap once');
  assert.deepEqual(token._getDragConstrainOptions(),{ignoreCost:false,ignoreWalls:true});
  assert.deepEqual(token._getDragLeftDropUpdateOptions(),{method:'dragging',constrainOptions:{ignoreCost:false,ignoreWalls:true}});
  phase.effects[0].disabled=true;
  assert.deepEqual(token._getDragConstrainOptions(),{ignoreCost:false});
  assert.deepEqual(token._getDragLeftDropUpdateOptions(),{method:'dragging',constrainOptions:{ignoreCost:false}});
  phase.effects[0].disabled=false;
  globalThis.game.user={id:'other',isGM:false};
  assert.deepEqual(token._getDragConstrainOptions(),{ignoreCost:false});
  assert.deepEqual(token._getDragLeftDropUpdateOptions(),{method:'dragging',constrainOptions:{ignoreCost:false}});
 }finally{globalThis.game=before;}
});
test('v221: chat alternative uses Foundry v14 waypoints and live drag painter',()=>{
 assert.deepEqual(phaseMoveOptions({parent:scene,width:1,height:1},{x:248,y:323}),
  {waypoints:[{x:200,y:300}],constrainOptions:{ignoreWalls:true}});
 const text=readFileSync(new URL('../scripts/native-priority-lot3.mjs',import.meta.url),'utf8');
 assert.match(text,/captureCanvasCircle\(\{view,renderer,stage/);
 assert.match(text,/onFinish:p=>\{add\(p\);finish\(validCells/);
 assert.match(text,/installPhaseSelfDragSupport\(\);/);
});
