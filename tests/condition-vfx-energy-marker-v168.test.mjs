import test from 'node:test';
import assert from 'node:assert/strict';
import {activeConditionIds,validateConditionVfx,syncConditionTokenVfx} from '../scripts/condition-token-vfx.mjs';
import {absorptionFocusResult,tryAbsorbHealthDamage,clearAbsorptionAfterCombat,pendingAbsorption} from '../scripts/energy-absorption-custom.mjs';
import {normalizeCustomRule,executeCustomRule,conditionTurnEntries} from '../scripts/custom-automations.mjs';
const SYSTEM='multiverse-d616';
let serial=0;
function mockGlobals(extra={}){
  const before=Object.fromEntries(['game','Sequencer','Sequence','canvas','PIXI'].map(key=>[key,globalThis[key]]));
  Object.assign(globalThis,extra);
  return ()=>Object.assign(globalThis,before);
}

test('v168: valida caminho, escala e status, rejeitando código e valores inválidos',()=>{
  assert.deepEqual(validateConditionVfx({status:'mmrpg.paralyzed',path:'worlds/world/fx/ice.webm',scale:1.2}),
    {status:'mmrpg.paralyzed',path:'worlds/world/fx/ice.webm',scale:1.2});
  assert.deepEqual(validateConditionVfx({status:'mmrpg.concentration.1',path:'worlds/fx/meditation.webm',scale:1}),{status:'mmrpg.concentration.1',path:'worlds/fx/meditation.webm',scale:1});
  assert.throws(()=>validateConditionVfx({status:'invalid',path:'fx.webm',scale:1}),/condição/);
  assert.throws(()=>validateConditionVfx({status:'mmrpg.paralyzed',path:'javascript:alert(1)',scale:1}),/caminho/);
  assert.throws(()=>validateConditionVfx({status:'mmrpg.paralyzed',path:'worlds/fx.webm',scale:5}),/Escala/);
});

test('v168: VFX por condição persiste uma vez e termina quando Paralisado é removido',async()=>{
  const id=++serial;
  const effect={disabled:false,statuses:new Set(['mmrpg.paralyzed'])};
  const actor={effects:[effect],statuses:new Set(['mmrpg.paralyzed'])};
  const token={id:`tok${id}`,document:{uuid:`Scene.test.Token.${id}`},actor};
  const calls=[],ends=[];
  const chain={effect(){return this;},file(path){calls.push(['file',path]);return this;},attachTo(object){assert.equal(object,token);return this;},persist(){return this;},name(n){calls.push(['name',n]);return this;},scaleToObject(n){assert.equal(n,1.2);return this;},async play(){calls.push(['play']);}};
  const restore=mockGlobals({game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:{get(ns,key){assert.equal(ns,SYSTEM);return [{status:'mmrpg.paralyzed',path:'worlds/fx/ice.webm',scale:1.2}];}}},
    Sequencer:{EffectManager:{async endEffects(args){ends.push(args);}}},Sequence:class{constructor(){return chain;}}});
  try{
    assert.deepEqual([...activeConditionIds(actor)],['mmrpg.paralyzed']);
    await syncConditionTokenVfx(token);
    await syncConditionTokenVfx(token);
    assert.equal(calls.filter(c=>c[0]==='play').length,1);
    actor.statuses.clear();actor.effects.length=0;
    await syncConditionTokenVfx(token);
    assert.equal(ends.length,1);
    assert.match(ends[0].name,/mmrpg.paralyzed/);
  }finally{restore();}
});

test('v168/v176: Energy Absorption convertido após custo já pago no HUD respeita teto 2×',async()=>{
  const effect={id:'prepared',disabled:false,flags:{[SYSTEM]:{customEnergyAbsorption:{version:2,armedByHud:true}}}};
  const actor={id:'a',uuid:'Actor.a',name:'Sentinel',system:{focus:{value:15,max:30}},effects:[effect],flags:{[SYSTEM]:{}},
    async update(change){this.system.focus.value=change['system.focus.value'];
      this.flags[SYSTEM].customEnergyAbsorptionOverflow=change[`flags.${SYSTEM}.customEnergyAbsorptionOverflow`];
      this.flags[SYSTEM].energyAbsorptionCredit=change[`flags.${SYSTEM}.energyAbsorptionCredit`];},
    async createEmbeddedDocuments(type,docs){this.effects.push(...docs.map((d,i)=>({...d,id:`active${i}`})));},
    async deleteEmbeddedDocuments(type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));},
    async updateEmbeddedDocuments(){} };
  const restore=mockGlobals({game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat:null}});
  try{
    assert.deepEqual(absorptionFocusResult({focus:30,maximum:30,damage:106}),{before:30,after:60,focusGained:45,cost:15,absorbed:106,cap:60});
    const accepted=await tryAbsorbHealthDamage(actor,106);
    assert.equal(accepted.absorbed,106);
    assert.equal(accepted.cost,0,'custo de Focus foi pago antes da rolagem de dano');
    assert.equal(actor.system.focus.value,60);
    assert.equal(actor.flags[SYSTEM].customEnergyAbsorptionOverflow,true);
    assert.equal(actor.flags[SYSTEM].energyAbsorptionCredit.remaining,45);
    assert.ok(actor.effects.some(e=>e.flags[SYSTEM].customEnergyAbsorption.active));
    await clearAbsorptionAfterCombat({combatants:[{actor}]});
    assert.equal(actor.system.focus.value,30);
    assert.equal(actor.flags[SYSTEM].customEnergyAbsorptionOverflow,false);
    assert.equal(actor.flags[SYSTEM].energyAbsorptionCredit.remaining,15);
  }finally{restore();}
});

test('v176: Energy Absorption só converte dano quando preparado pelo HUD e pago',async()=>{
  const effect={id:'old',disabled:false,flags:{[SYSTEM]:{customEnergyAbsorption:{version:1}}}};
  const actor={name:'Target',system:{focus:{value:30,max:30}},effects:[effect],flags:{[SYSTEM]:{}},
    async update(){throw Error('não deve atualizar');}};
  const restore=mockGlobals({game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat:null}});
  try{
    assert.equal(await tryAbsorbHealthDamage(actor,15),null);
    assert.equal(pendingAbsorption(actor),undefined);
  }finally{restore();}
});

test('v176: regra legada da Central não arma reação gratuita nem duplica o custo',async()=>{
  const rule=normalizeCustomRule({id:'r168',name:'Absorção defensiva',trigger:'powerRoll',powerName:'Barreira Experimental',effectType:'energyAbsorption'});
  const created=[],actor={effects:[],async createEmbeddedDocuments(_type,docs){created.push(...docs);}};
  assert.equal(await executeCustomRule(rule,actor),false);
  assert.equal(created.length,0);
});

test('v176: Energy Absorption ignora marcação de condição manual sem gasto',()=>{
  assert.equal(pendingAbsorption({effects:[{statuses:new Set(['mmrpg.energy-absorption']),disabled:false}]}),undefined);
  assert.ok(pendingAbsorption({effects:[{disabled:false,flags:{[SYSTEM]:{customEnergyAbsorption:{version:2,armedByHud:true}}}}]}));
});
