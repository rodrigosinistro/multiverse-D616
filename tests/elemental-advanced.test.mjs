import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAdvancedElementalPower,elementalProtection,resolvedAdvancedFocusItem,hasOwnElementalGrab,
  validateAdvancedElementalTargets,advancedNeedsDamage,advancedMayMove,absorbElementalStructureHit,
  displacementTargetPosition} from '../scripts/elemental-advanced.mjs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
import {parseFocusCost} from '../scripts/focus-cost.mjs';
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const get=name=>items.find(i=>i.name===name);
const names=['Elemental Prison','Elemental Sphere','Elemental Suffocation','Elemental Push'];
function caster(){return {uuid:'Actor.caster',items:new Map([['p1',{id:'p1',type:'power',name:'Elemental Protection 1',system:{cost:'5 Focus'}}],['p3',{id:'p3',type:'power',name:'Elemental Protection 3',system:{cost:'15 Focus'}}]])};}
test('quatro poderes especiais são itens existentes e possuem defesa correta',()=>{
 for(const n of names){assert.ok(isAdvancedElementalPower(n));assert.ok(get(n));const config=resolvePowerRoll(get(n));assert.equal(config.ability,'ego');assert.equal(config.attackTarget,n==='Elemental Suffocation'?'res':'agl');}
 for(const n of ['Elemental Prison','Elemental Sphere','Elemental Push']){const x=resolvePowerRoll(get(n));assert.equal(x.checkOnly,true);assert.equal(x.fantasticDamage,true);assert.equal(x.attack,false);}
 const s=resolvePowerRoll(get('Elemental Suffocation'));assert.equal(s.attack,true);assert.equal(s.checkOnly,false);
});
test('barreiras herdam custo e resistência do maior Elemental Protection',()=>{
 const c=caster(),p=elementalProtection(c);assert.deepEqual({level:p.level,cost:p.cost,threshold:p.threshold},{level:3,cost:15,threshold:30});
 const copy=resolvedAdvancedFocusItem(get('Elemental Prison'),c);assert.equal(copy.type,'power');assert.equal(parseFocusCost(copy.system.cost).min,15);
 assert.equal(get('Elemental Prison').system.cost,'Mesmo que o poder Elemental Protection do personagem');
 assert.equal(resolvedAdvancedFocusItem(get('Elemental Sphere'),{items:[]}),null);
 assert.equal(resolvedAdvancedFocusItem(get('Elemental Push'),c).system.cost,'10 Focus');
});
test('barreiras exigem Protection; Push e Suffocation exigem exatamente um alvo',()=>{
 const c=caster(),target={actor:{effects:[]}},other={actor:{effects:[]}};
 for(const n of ['Elemental Prison','Elemental Sphere']){
  assert.equal(validateAdvancedElementalTargets(n,{items:[]},[]).ok,false);
  assert.equal(validateAdvancedElementalTargets(n,c,[]).ok,true);
 }
 assert.equal(validateAdvancedElementalTargets('Elemental Push',c,[]).ok,false);
 assert.equal(validateAdvancedElementalTargets('Elemental Push',c,[target]).ok,true);
 assert.equal(validateAdvancedElementalTargets('Elemental Push',c,[target,other]).ok,false);
 assert.equal(validateAdvancedElementalTargets('Elemental Suffocation',c,[target]).ok,false);
});
test('Suffocation apenas em alvo agarrado por Elemental Grab do próprio conjurador',()=>{
 const c=caster();c.items.set('g1',{id:'g1',type:'power',name:'Elemental Grab',system:{}});
 const target={actor:{effects:[{disabled:false,flags:{'multiverse-d616':{powerCondition:{status:'grabbed',sourceActorUuid:'Actor.other',sourceItemId:'g1'}}}}]}};
 assert.equal(hasOwnElementalGrab(target.actor,c),false);
 assert.equal(validateAdvancedElementalTargets('Elemental Suffocation',c,[target]).ok,false);
 target.actor.effects[0].flags['multiverse-d616'].powerCondition.sourceActorUuid=c.uuid;
 assert.equal(hasOwnElementalGrab(target.actor,c),true);
 assert.equal(validateAdvancedElementalTargets('Elemental Suffocation',c,[target]).ok,true);
 target.actor.effects[0].disabled=true;assert.equal(hasOwnElementalGrab(target.actor,c),false);
});
test('dano apenas no fantástico, exceto Suffocation; Sphere requer expulsão',()=>{
 const no={success:false,fantastic:true},yes={success:true,fantastic:false},wow={success:true,fantastic:true};
 for(const n of ['Elemental Prison','Elemental Push']){
  assert.equal(advancedNeedsDamage(n,no),false);assert.equal(advancedNeedsDamage(n,yes),false);assert.equal(advancedNeedsDamage(n,wow),true);
 }
 assert.equal(advancedNeedsDamage('Elemental Sphere',wow),false);
 assert.equal(advancedNeedsDamage('Elemental Sphere',wow,{displaced:true}),true);
 assert.equal(advancedNeedsDamage('Elemental Suffocation',yes),true);
 assert.equal(advancedNeedsDamage('Elemental Suffocation',wow),true);
 assert.equal(advancedMayMove('Elemental Push',yes),true);
 assert.equal(advancedMayMove('Elemental Sphere',yes),true);
 assert.equal(advancedMayMove('Elemental Prison',wow),false);
});
test('estrutura absorve o ataque e só destrói se exceder a proteção',()=>{
 assert.deepEqual(absorbElementalStructureHit(30,30),{absorbed:true,destroyed:false,damageToOccupants:0,threshold:30});
 assert.equal(absorbElementalStructureHit(31,30).destroyed,true);
 assert.throws(()=>absorbElementalStructureHit(-1,30));
});
test('deslocamento na grade limitado por Rank e pela cena sem alterar origem',()=>{
 const token={x:400,y:500,width:1,height:1},scene={width:2000,height:2000};
 assert.deepEqual(displacementTargetPosition(token,'NE',2,100,3,scene),{x:600,y:300});
 assert.throws(()=>displacementTargetPosition(token,'N',4,100,3,scene));
 assert.throws(()=>displacementTargetPosition(token,'W',5,100,5,scene));
 assert.deepEqual({x:token.x,y:token.y},{x:400,y:500});
});
