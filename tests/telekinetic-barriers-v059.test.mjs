import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {regionDataForPower,crossingRegions,areaRectangle,areaCircle} from '../scripts/elemental-area-geometry.mjs';
import {telekineticProtection,areaPowerProtection,resolvedAdvancedFocusItem,isAdvancedElementalPower,
  validateAdvancedElementalTargets,advancedMayMove,advancedNeedsDamage} from '../scripts/elemental-advanced.mjs';
import {activeElementalGuards,findCrossingElementalBarrier,guardTargetDefense,assessGuardHit} from '../scripts/elemental-shields.mjs';
import {POWER_CONDITIONS} from '../scripts/power-conditions.mjs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
const SYS='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const item=name=>catalog.find(i=>i.name===name);
const actor={uuid:'Actor.caster',system:{abilities:{ego:{defense:18},log:{defense:22}}},
  items:new Map([['tele4',{id:'tele4',name:'Telekinetic Protection 4',type:'power',system:{cost:'20 Focus'}}],
    ['wall',{id:'wall',name:'Telekinetic Barrier',type:'power',system:{cost:'5 Focus'}}],
    ['sphere',{id:'sphere',name:'Telekinetic Sphere',type:'power',system:{cost:'varies'}}]]),
  effects:[{id:'con-wall',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'wall'}}}},
    {id:'con-sphere',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'sphere'}}}}]};
const p=(x,y)=>({x:x*100-50,y:y*100-50,width:1,height:1});
const rect=regionDataForPower('Telekinetic Barrier',{},null,{sourceActorUuid:actor.uuid,concentrationId:'con-wall',rectangle:{x:450,y:200,width:100,height:600}});
const circ=regionDataForPower('Telekinetic Sphere',{x:500,y:500},200,{sourceActorUuid:actor.uuid,concentrationId:'con-sphere'});
const scene={grid:{size:100},regions:[{id:'wall',...rect},{id:'sphere',...circ}]};
test('catálogo e testes dos poderes telecinéticos mantêm Logic e Agility, sem dano normal',()=>{
 for(const name of ['Telekinetic Barrier','Telekinetic Sphere']){
   assert.ok(item(name));assert.equal(isAdvancedElementalPower(name),true);
   const roll=resolvePowerRoll(item(name));assert.equal(roll.ability,'log');assert.equal(roll.attackTarget,'agl');assert.equal(roll.checkOnly,true);
 }
 assert.equal(resolvePowerRoll(item('Telekinetic Sphere')).fantasticDamage,true);
 assert.ok(POWER_CONDITIONS['Telekinetic Barrier'].some(r=>r.status==='paralyzed'&&r.on==='fantastic'&&r.expires==='turn'));
 assert.equal(advancedNeedsDamage('Telekinetic Sphere',{success:true,fantastic:true}),false);
 assert.equal(advancedNeedsDamage('Telekinetic Sphere',{success:true,fantastic:true},{displaced:true}),true);
 assert.equal(advancedMayMove('Telekinetic Sphere',{success:true}),true);
});
test('telekinetic sphere exige Telekinetic Protection, herda custo e limiar; barreira 5 Focus e 10 de absorção',()=>{
 assert.deepEqual({...telekineticProtection(actor)},{level:4,cost:20,threshold:40,itemId:'tele4'});
 assert.equal(validateAdvancedElementalTargets('Telekinetic Sphere',{items:[]},[]).ok,false);
 assert.equal(validateAdvancedElementalTargets('Telekinetic Barrier',{items:[]},[]).ok,true);
 assert.equal(areaPowerProtection('Telekinetic Sphere',actor).threshold,40);
 assert.equal(areaPowerProtection('Telekinetic Barrier',actor).threshold,10);
 assert.match(resolvedAdvancedFocusItem(item('Telekinetic Sphere'),actor).system.cost,/20 Focus/);
 assert.match(resolvedAdvancedFocusItem(item('Telekinetic Barrier'),actor).system.cost,/5 Focus/);
});
test('Region retangular de parede e círculo de esfera são distintos, editáveis e limitados à cena',()=>{
 assert.deepEqual(rect.shapes.map(s=>s.type),['rectangle']);
 assert.deepEqual(circ.shapes.map(s=>s.type),['circle']);
 assert.ok(areaRectangle({shapes:rect.shapes}));assert.ok(areaCircle({shapes:circ.shapes}));
 assert.throws(()=>regionDataForPower('Body Sphere',{x:0,y:0},200));
 assert.throws(()=>regionDataForPower('Telekinetic Barrier',{},null,{}));
 assert.equal(crossingRegions(scene,p(3,3),p(7,3)).length,1); // wall path, circle at y=500
 assert.equal(crossingRegions(scene,p(2,7),p(3,7)).length,0);
});
test('interceptação da parede usa Logic do conjurador, limite 10; esfera usa 40',()=>{
 globalThis.fromUuidSync=uuid=>uuid===actor.uuid?actor:null;
 try {
  const wall=findCrossingElementalBarrier(scene,p(3,3),p(7,3));
  assert.ok(wall);assert.equal(wall.guard.name,'Telekinetic Barrier');
  assert.equal(wall.guard.threshold,10);assert.equal(guardTargetDefense(actor,wall.guard),22);
  assert.equal(assessGuardHit(11,wall.guard).destroyed,true);
  const sphere=findCrossingElementalBarrier(scene,p(8,5),p(6,5));
  assert.ok(sphere);assert.equal(sphere.guard.name,'Telekinetic Sphere');
  assert.equal(sphere.guard.threshold,40);assert.equal(guardTargetDefense(actor,sphere.guard),22);
  actor.effects[0].disabled=true;
  assert.equal(findCrossingElementalBarrier(scene,p(3,3),p(7,3)),null);
  actor.effects[0].disabled=false;
 }finally {delete globalThis.fromUuidSync;}
});
test('Elemental Barrier com parede de limiar 10 usa Ego; estruturas exclusivas não viram proteção pessoal',()=>{
 const element={...actor,items:new Map([['eb',{id:'eb',name:'Elemental Barrier'}]]),effects:[{id:'e',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'eb'}}}}]};
 const guards=activeElementalGuards(element);
 assert.equal(guards[0].kind,'structure');assert.equal(guards[0].threshold,10);
 assert.equal(guardTargetDefense(element,guards[0]),18);
});
test('motor liga botões de desenho, criação/remoção de Region e defesa no dano',()=>{
 const advanced=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(advanced,/AREA_WALL_NAMES\.has\(name\)/);
 assert.match(advanced,/createEmbeddedDocuments\('Region'/);
 assert.match(advanced,/deleteEmbeddedDocuments\('Region'/);
 assert.match(advanced,/sourceActorUuid:actor\.uuid/);
 assert.match(core,/guardTargetDefense\(boundary\.actor,boundary\.guard\)/);
 assert.match(core,/guardTargetDefense\(crossing\.actor,crossing\.guard\)/);
});
