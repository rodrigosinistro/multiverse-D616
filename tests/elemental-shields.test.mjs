import test from 'node:test';
import assert from 'node:assert/strict';
import {activeElementalGuards,selectGuard,assessGuardHit,guardTargetDefense} from '../scripts/elemental-shields.mjs';
import {templateDataForPower,arrowForDirection,displacementTargetPosition} from '../scripts/elemental-advanced.mjs';
function actor(name='Elemental Protection 2'){
 const map=new Map([[name,{id:'a',name,type:'power',system:{cost:'10 Focus'}}],['p2',{id:'p2',type:'power',name:'Elemental Protection 2',system:{cost:'10 Focus'}}]]);
 return {items:map,effects:[{id:'conc',disabled:false,flags:{'multiverse-d616':{concentrationPower:{itemId:name==='Elemental Protection 2'?'p2':'a'}}}}],system:{abilities:{ego:{defense:17}}}};
}
test('a proteção permanece ativa e absorve o dano bruto inclusive se superar o limite',()=>{
 const a=actor(),guards=activeElementalGuards(a),g=selectGuard(guards);
 assert.equal(g.threshold,20);assert.equal(g.kind,'protection');
 assert.deepEqual(assessGuardHit(18,g),{blocked:true,damageToTarget:0,destroyed:false,threshold:20,name:'Elemental Protection 2'});
 assert.equal(assessGuardHit(21,g).destroyed,true);
 assert.equal(guardTargetDefense(a,g),17);
});
test('Sphere intercepta por padrão, Prison apenas quando ataque dirigido à estrutura',()=>{
 const sphere=activeElementalGuards(actor('Elemental Sphere'));
 assert.equal(selectGuard(sphere),null,'a esfera não intercepta sem uma Região cruzada');
 assert.equal(selectGuard(sphere,'bypass'),null);
 const prison=activeElementalGuards(actor('Elemental Prison'));
 assert.equal(selectGuard(prison),null);
 assert.equal(selectGuard(prison,'structure').name,'Elemental Prison');
});
test('status expirado/Concentração desligada não protege',()=>{
 const a=actor();a.effects[0].disabled=true;assert.equal(activeElementalGuards(a).length,0);
});
test('setas de deslocamento indicam as oito direções',()=>{
 for(const s of ['N','NE','E','SE','S','SW','W','NW'])assert.ok(arrowForDirection(s));
 assert.equal(arrowForDirection('N'),'↑');assert.equal(arrowForDirection('SW'),'↙');
 assert.deepEqual(displacementTargetPosition({x:200,y:200,width:1,height:1},'W',2,100,3,{width:2000,height:2000}),{x:0,y:200});
});
test('desenho de área guarda dados de vínculo, categoria e raio em unidades de cena',()=>{
 const v=templateDataForPower('Elemental Prison',{x:500,y:600},3,5,{sourceActorUuid:'Actor.one',concentrationId:'effect'});
 assert.equal(v.t,'circle');assert.equal(v.distance,75);assert.equal(v.x,500);assert.equal(v.flags['multiverse-d616'].elementalArea.sourceActorUuid,'Actor.one');
 assert.throws(()=>templateDataForPower('Elemental Push',{x:10,y:20},2,5));
});

test('a integração do chat permite dano fantástico de Push e impede aplicação duplicada',async()=>{
 const fs=await import('node:fs');
 const path=new URL('../multiverse-d616.mjs',import.meta.url);
 const roll=fs.readFileSync(path,'utf8');
 assert.match(roll,/pendingFantastic/);
 assert.match(roll,/getMarvelOutcome\(this\.rolls\?\.\[0\],1\)/);
 assert.match(roll,/damageButton\.className = 'damage'/);
 const helper=fs.readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(helper,/mmdrResolved/);
 assert.match(helper,/rawDamage/);
 assert.match(helper,/confirmPowerDamageFromCard\(message, action, results\.filter\(r=>!r\.blocked\)\)/);
});
