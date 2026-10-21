import test from 'node:test';
import assert from 'node:assert/strict';
import {regionDataForPower,tokenCenter,barrierCrossed,crossingRegions} from '../scripts/elemental-area-geometry.mjs';
import {findCrossingElementalBarrier} from '../scripts/elemental-shields.mjs';
const SYS='multiverse-d616';
const scene={grid:{size:100},regions:[]};
const p=(x,y)=>({x:x*100-50,y:y*100-50,width:1,height:1});
const data=regionDataForPower('Elemental Prison',{x:500,y:500},300,{sourceActorUuid:'Actor.cast',concentrationId:'active',sourceMessageId:'message'});
const region={...data,id:'reg'};
scene.regions=[region];
test('V14 Regions: flags de concentração, círculo editável e centro',()=>{
 assert.equal(data.shapes[0].type,'circle');assert.equal(data.shapes[0].radius,300);
 assert.equal(data.flags[SYS].elementalArea.concentrationId,'active');
 assert.throws(()=>regionDataForPower('Elemental Push',{x:0,y:0},50));
});
test('cruzar limites: fora->dentro e dentro->fora; ambos do mesmo lado não interceptam',()=>{
 assert.equal(barrierCrossed(region,p(9,5),p(5,5),scene),true);
 assert.equal(barrierCrossed(region,p(5,5),p(9,5),scene),true);
 assert.equal(barrierCrossed(region,p(5,5),p(6,5),scene),false);
 assert.equal(barrierCrossed(region,p(1,5),p(10,5),scene),false);
 assert.equal(crossingRegions(scene,p(9,5),p(5,5)).length,1);
});
test('guard pertence ao conjurador e exige efeito de concentração ainda ativo',()=>{
 const caster={uuid:'Actor.cast',items:new Map([['prison',{id:'prison',name:'Elemental Prison'}],['prot',{id:'prot',type:'power',name:'Elemental Protection 2',system:{cost:'10 Focus'}}]]),
   effects:[{id:'active',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'prison'}}}}]};
 globalThis.fromUuidSync=uuid=>uuid==='Actor.cast'?caster:null;
 const guard=findCrossingElementalBarrier(scene,p(9,5),p(5,5));
 assert.ok(guard);assert.equal(guard.actor,caster);assert.equal(guard.guard.name,'Elemental Prison');
 assert.equal(guard.guard.threshold,20);
 caster.effects[0].disabled=true;
 assert.equal(findCrossingElementalBarrier(scene,p(9,5),p(5,5)),null);
 delete globalThis.fromUuidSync;
});
test('geometria de token usa centro real para tokens maiores',()=>{
 assert.deepEqual(tokenCenter({x:0,y:0,width:2,height:2},scene),{x:100,y:100});
});
test('Foundry v14: Sphere usa Region, barreiras físicas usam Wall + MeasuredTemplate do macro',async()=>{
 const {readFileSync}=await import('node:fs');
 const file=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
 assert.match(file,/createEmbeddedDocuments\('Region'/);
 assert.match(file,/deleteEmbeddedDocuments\('Region'/);
 assert.match(file,/createEmbeddedDocuments\('MeasuredTemplate'/);
 assert.match(file,/createEmbeddedDocuments\('Wall'/);
 assert.match(file,/captureCanvasCircle/);
 const pointer=readFileSync(new URL('../scripts/elemental-draw-pointer.mjs',import.meta.url),'utf8');
 assert.match(pointer,/pointermove/);assert.match(pointer,/pointerup/);
});
test('descrição contém controles; dado da Sphere ou Prison não repete painel',async()=>{
 const {readFileSync}=await import('node:fs');
 const file=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
 assert.match(file,/message\.rolls\?\.length && BARRIER\.has\(flagged\(message,'advancedElemental'\)\?\.name\)\)/);
 assert.match(file,/data-m616-elemental-expel/);
});
test('dano e card usam mesmo desvio para a defesa Ego do criador',async()=>{
 const {readFileSync}=await import('node:fs');
 const core=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const helper=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(core,/findCrossingElementalBarrier\(tokenDoc\.parent/);
 assert.match(helper,/findCrossingElementalBarrier\(victimToken\?\.parent/);
 assert.match(helper,/guardTargetDefense\(guardOwner,guard\)/);
});
