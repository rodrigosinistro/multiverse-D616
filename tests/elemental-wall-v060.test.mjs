import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BARRIER_ELEMENTS,barrierMaterial,barrierLineValid,wallDocuments,lineCrossesWall,
  crossingWalls,barrierDocumentsForEffect} from '../scripts/elemental-wall-geometry.mjs';
import {activeElementalGuards,findCrossingElementalBarrier,guardTargetDefense,assessGuardHit} from '../scripts/elemental-shields.mjs';
import {captureCanvasWall} from '../scripts/elemental-draw-pointer.mjs';
const SYS='multiverse-d616';
const scene={id:'S',grid:{size:100,distance:5},width:4000,height:4000,walls:[],regions:[],templates:[]};
const caster={x:200,y:200};
const meta={sourceActorUuid:'Actor.ONE',concentrationId:'AE_ONE',sourceMessageId:'chat-123'};
const p=(x,y)=>({x:x*100-50,y:y*100-50,width:1,height:1});
test('oito tipos de elementos da macro, cores e Telekinetic sem opção livre',()=>{
 assert.equal(Object.keys(BARRIER_ELEMENTS).length,8);
 assert.equal(barrierMaterial('Elemental Barrier','ice').color,'#4db8ff');
 assert.equal(barrierMaterial('Elemental Barrier','darkness').color,'#8f5cff');
 assert.equal(barrierMaterial('Telekinetic Barrier').color,'#b496ff');
 assert.throws(()=>barrierMaterial('Elemental Barrier','javascript:evil'));
 assert.throws(()=>barrierMaterial('Protection Hex','ice'));
});
test('macro: limiares 2 espaços/rank de comprimento e 10 espaços/rank de alcance, dois extremos',()=>{
 assert.equal(barrierLineValid({start:{x:300,y:300},end:{x:600,y:300},caster,rank:2,scene}).ok,true);
 assert.equal(barrierLineValid({start:{x:300,y:300},end:{x:1000,y:300},caster,rank:2,scene}).ok,false);
 assert.equal(barrierLineValid({start:{x:2200,y:300},end:{x:2250,y:300},caster,rank:2,scene}).ok,false);
 assert.equal(barrierLineValid({start:{x:-100,y:300},end:{x:500,y:300},caster,rank:5,scene}).ok,false);
 assert.equal(barrierLineValid({start:{x:300,y:300},end:{x:300,y:300},caster,rank:5,scene}).ok,false);
 assert.equal(barrierLineValid({start:{x:300,y:300},end:{x:400,y:400},caster,rank:1,scene}).ok,true);
});
test('Wall real bloqueia movimento mas não visão/luz/som, o MeasuredTemplate é apenas visual',()=>{
 const start={x:500,y:200},end={x:500,y:900};
 const {wall,template}=wallDocuments('Elemental Barrier',start,end,scene,meta,'earth');
 assert.deepEqual(wall.c,[500,200,500,900]);
 assert.ok(wall.move>0);assert.equal(wall.sight,0);assert.equal(wall.sound,0);assert.equal(wall.light,0);
 assert.equal(wall.door,0);assert.equal(template.t,'ray');
 assert.equal(template.borderColor,'#a8a8a8');
 assert.equal(template.distance,35);
 assert.equal(template.direction,90);
 assert.deepEqual(template.flags,wall.flags);
 assert.equal(wall.flags[SYS].elementalArea.concentrationId,'AE_ONE');
});
test('o mesmo mecanismo funciona para Telekinetic Barrier e respeita cor distinta',()=>{
 const {wall,template}=wallDocuments('Telekinetic Barrier',{x:200,y:200},{x:500,y:500},scene,meta);
 assert.deepEqual(wall.c,[200,200,500,500]);
 assert.equal(template.borderColor,'#b496ff');
 assert.equal(template.direction,45);
 assert.equal(wall.flags[SYS].elementalArea.name,'Telekinetic Barrier');
 assert.throws(()=>wallDocuments('Shield of the Seraphim',{x:0,y:0},{x:50,y:50},scene,meta));
});
test('parede diagonal/vertical/horizontal intercepta apenas linha que cruza o segmento',()=>{
 assert.equal(lineCrossesWall({x:100,y:100},{x:900,y:900},{c:[200,700,700,200]}),true);
 assert.equal(lineCrossesWall({x:100,y:900},{x:900,y:900},{c:[200,700,700,200]}),false);
 assert.equal(lineCrossesWall({x:400,y:100},{x:400,y:900},{c:[200,500,700,500]}),true);
 assert.equal(lineCrossesWall({x:100,y:600},{x:900,y:600},{c:[500,200,500,700]}),true);
 assert.equal(lineCrossesWall({x:200,y:500},{x:700,y:500},{c:[200,500,700,500]}),false);
});
test('somente paredes com flags válidos e ligação à concentração entram na interceptação',()=>{
 const flags=(id,name='Elemental Barrier')=>({[SYS]:{elementalArea:{...meta,name,concentrationId:id}}});
 const local={...scene,walls:[{id:'x',c:[500,200,500,900],flags:flags('AE_ONE')},
 {id:'other',c:[200,500,800,500],flags:flags('')},
 {id:'bare',c:[500,200,500,900],flags:{}}]};
 assert.deepEqual(crossingWalls(local,p(3,3),p(7,3)).map(x=>x.id),['x']);
 assert.deepEqual(crossingWalls(local,p(7,3),p(3,3)).map(x=>x.id),['x']);
 assert.deepEqual(crossingWalls(local,p(3,10),p(7,10)),[]);
});
test('remover somente a parede, template e região legada da Concentração correta',()=>{
 const flag=(uuid,id,name)=>({[SYS]:{elementalArea:{sourceActorUuid:uuid,concentrationId:id,name}}});
 const a={id:'A',flags:flag('Actor.ONE','AE_ONE','Elemental Barrier')};
 const b={id:'B',flags:flag('Actor.ONE','AE_TWO','Elemental Barrier')};
 const c={id:'C',flags:flag('Actor.TWO','AE_ONE','Telekinetic Barrier')};
 const s={walls:[a,b,c],templates:[a,b,c],regions:[a,b,c]};
 const found=barrierDocumentsForEffect(s,'Actor.ONE','AE_ONE');
 for(const k of ['walls','templates','regions'])assert.deepEqual(found[k].map(x=>x.id),['A']);
});
test('migração limpa Walls/Templates legados da macro v5 sem mexer em outras barreiras',()=>{
 const legacy=(actorId,effectId)=>({world:{d616ElementalBarrier:{actorId,concentrationEffectId:effectId,barrierId:'old'}}});
 const sc={walls:[{id:'old',flags:legacy('old-actor','AE_ONE')},{id:'other',flags:legacy('different','AE_ONE')}],
  templates:[{id:'old',flags:legacy('old-actor','AE_ONE')}],regions:[]};
 const found=barrierDocumentsForEffect(sc,'Actor.ONE','AE_ONE','old-actor');
 assert.deepEqual(found.walls.map(x=>x.id),['old']);
 assert.deepEqual(found.templates.map(x=>x.id),['old']);
});
test('sem Region, Wall real usa Ego no Elemental e Logic no Telekinetic, absorve 10',()=>{
 const act={uuid:'Actor.ONE',system:{abilities:{ego:{defense:21},log:{defense:26}}},
  items:new Map([['el',{id:'el',name:'Elemental Barrier'}],['tk',{id:'tk',name:'Telekinetic Barrier'}]]),
  effects:[{id:'AE_ONE',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'el'}}}},
    {id:'AE_TWO',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'tk'}}}}]};
 const el=wallDocuments('Elemental Barrier',{x:500,y:100},{x:500,y:900},scene,meta);
 const tk=wallDocuments('Telekinetic Barrier',{x:700,y:100},{x:700,y:900},scene,{...meta,concentrationId:'AE_TWO'});
 const local={...scene,walls:[el.wall,tk.wall]};
 globalThis.fromUuidSync=uuid=>uuid===act.uuid?act:null;
 try{
  assert.equal(activeElementalGuards(act).length,2);
  const first=findCrossingElementalBarrier(local,p(3,3),p(9,3));
  assert.equal(first.guard.name,'Elemental Barrier');assert.equal(guardTargetDefense(act,first.guard),21);
  assert.equal(assessGuardHit(10,first.guard).destroyed,false);
  assert.equal(assessGuardHit(11,first.guard).destroyed,true);
  act.effects[0].disabled=true;
  const second=findCrossingElementalBarrier(local,p(3,3),p(9,3));
  assert.equal(second.guard.name,'Telekinetic Barrier');assert.equal(guardTargetDefense(act,second.guard),26);
  act.effects[1].disabled=true;
  assert.equal(findCrossingElementalBarrier(local,p(3,3),p(9,3)),null);
 }finally{delete globalThis.fromUuidSync;}
});
test('código cria ambos documentos, valida novamente no GM e remove na perda da Concentração',()=>{
 const source=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
 for(const pattern of ["createEmbeddedDocuments('Wall'","createEmbeddedDocuments('MeasuredTemplate'","deleteEmbeddedDocuments('Wall'","deleteEmbeddedDocuments('MeasuredTemplate'","barrierLineValid(","captureCanvasWall(","elementKey:draw.elementKey","elementKey:payload.elementKey"])
  assert.ok(source.includes(pattern),`Faltou integração: ${pattern}`);
 assert.ok(source.includes('validElementalRequester'));
});
test('posicionamento em dois cliques cancela com Esc, protege clique no token',()=>{
 const handlers=new Map();
 const target={};const view={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:1000}),contains:e=>e===target};
 const stage={toLocal:p=>p};const renderer={screen:{width:1000,height:1000}};
 const doc={addEventListener:(k,f)=>handlers.set('doc:'+k,f),removeEventListener:(k)=>handlers.delete('doc:'+k)};
 const win={addEventListener:(k,f)=>handlers.set('win:'+k,f),removeEventListener:(k)=>handlers.delete('win:'+k)};
 const call=(k,x,y)=>{const f=handlers.get('doc:'+k);return f?.({button:0,pointerId:1,clientX:x,clientY:y,target,preventDefault(){},stopImmediatePropagation(){}});};
 let starts=0,finishes=0,cancel=0,points=[];
 captureCanvasWall({view,renderer,stage,doc,win,onStart:()=>starts++,onMove:()=>{},onFinish:(a,b)=>{finishes++;points=[a,b];return true;},onCancel:()=>cancel++});
 call('pointerdown',100,200);call('pointermove',250,400);call('pointerdown',300,500);
 assert.equal(starts,1);assert.equal(finishes,1);assert.deepEqual(points,[{x:100,y:200},{x:300,y:500}]);
 assert.equal(handlers.size,0);
 captureCanvasWall({view,renderer,stage,doc,win,onCancel:()=>cancel++});
 handlers.get('win:keydown')({key:'Escape',preventDefault(){}});
 assert.equal(cancel,1);assert.equal(handlers.size,0);
});
test('catálogo não tem outra parede idêntica; outros protetores NÃO viram Wall',()=>{
 const {items}=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url)));
 const names=items.filter(i=>/Barrier$/i.test(i.name)).map(i=>i.name).sort();
 assert.deepEqual(names,['Elemental Barrier','Telekinetic Barrier']);
 const excluded=['Shield Wall','Shield of the Seraphim','Protection Hex','Body Sphere','Time-Out Bubble'];
 for(const name of excluded)assert.ok(items.some(i=>i.name===name));
});
