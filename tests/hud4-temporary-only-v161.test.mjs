import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hudActiveEffectSnapshot} from '../scripts/hud4-active-effects.mjs';

const SYSTEM='multiverse-d616';
const fight={id:'c1',started:true,round:4,flags:{[SYSTEM]:{activeTeamManeuvers:[]}}};
const effect=(id,extra={})=>({id,uuid:`Actor.pc.ActiveEffect.${id}`,name:id,transfer:false,
  duration:{},statuses:new Set(),disabled:false,...extra});
const actor=(effects,applicable=effects,items=null)=>({id:'pc',uuid:'Actor.pc',effects,
  allApplicableEffects(){return applicable;},items:items ?? {get(){return null;}}});
const names=(effects,applicable=effects,combat=fight)=>hudActiveEffectSnapshot(actor(effects,applicable),combat).map(e=>e.name);

test('v163 regression: no icons for Jean Grey/Sentinel trait passives (initiative edge, Extra Focus)',()=>{
  const list=[
    effect('jean-init',{name:'initiative edge',transfer:true,parent:{type:'trait',name:'Situational Awareness'},
      origin:'Item.IMbictrWg4k65rJY',duration:{value:null,units:'seconds',expiry:null}}),
    effect('sentinel-focus',{name:'Extra Focus',transfer:true,parent:{type:'trait',name:'Battle Ready'},
      origin:'Item.AlnpAp5Bl0hhT1T3',duration:{value:null,units:'seconds',expiry:null}}),
    effect('sentinel-init',{name:'initiative edge',transfer:true,parent:{type:'trait',name:'Situational Awareness'},
      origin:'Item.YX1AC9Ki6XF4xxx8',duration:{value:null,units:'seconds',expiry:null}}),
  ];
  assert.deepEqual(names(list),[]);
  assert.deepEqual(names([],list),[]);
});

test('v163 preserves all six current automatic Team Maneuver indicators',()=>{
  fight.flags[SYSTEM].activeTeamManeuvers=[
    {combatId:'c1',round:4,type:'Offensive',level:1,actorUuids:['Actor.pc']},
    {combatId:'c1',round:4,type:'Offensive',level:2,actorUuids:['Actor.pc']},
    {combatId:'c1',round:4,type:'Offensive',level:3,actorUuids:['Actor.pc']},
    {combatId:'c1',round:4,type:'Defensive',level:1,actorUuids:['Actor.pc']},
    {combatId:'c1',round:4,type:'Defensive',level:2,actorUuids:['Actor.pc']},
    {combatId:'c1',round:4,type:'Defensive',level:3,actorUuids:['Actor.pc']},
  ];
  try{
    assert.deepEqual(names([]),['Edge +1','Ofensiva 2','Marvel → M','RD 2','RD 4','RD 8']);
    assert.deepEqual(names([],[],{...fight,round:5}),[]);
  } finally {fight.flags[SYSTEM].activeTeamManeuvers=[];}
});

test('v163 excludes every generic Active Effect regardless of source, duration or flags',()=>{
  const list=[
    effect('size',{name:'Average Effects',flags:{[SYSTEM]:{managedSize:true}}}),
    effect('p',{name:'Poder ativo',parent:{type:'power',name:'Brilliance 1'},duration:{rounds:2}}),
    effect('t',{name:'Trait passiva',parent:{type:'trait',name:'Battle Ready'},duration:{rounds:2}}),
    effect('equipment',{name:'Bônus do equipamento',transfer:true,parent:{type:'item',name:'Suit'},duration:{turns:2}}),
    effect('concentration',{name:'Poder em Concentração',flags:{[SYSTEM]:{concentrationPower:{itemId:'p'}}}}),
    effect('ongoing',{name:'Chamas de Faltine',flags:{[SYSTEM]:{ongoingPower:{kind:'faltineFlames'}}}}),
    effect('automation',{name:'Dano contínuo',flags:{[SYSTEM]:{customAutomationOngoing:{combatId:'c1',total:4,ticksDone:1}}}}),
    effect('timed',{name:'Efeito temporário',duration:{seconds:15}}),
    effect('manual',{name:'Efeito manual sem duração'}),
  ];
  assert.deepEqual(names(list),[]);
  assert.deepEqual(names([],list),[]);
});

test('v163 does not query actor effects or transferred effects at all',()=>{
  const tricky={id:'pc',uuid:'Actor.pc',
    get effects(){throw new Error('HUD should never read actor ActiveEffects');},
    allApplicableEffects(){throw new Error('HUD should never query transferred ActiveEffects');},
    get items(){throw new Error('HUD should never read items');},
  };
  assert.deepEqual(hudActiveEffectSnapshot(tricky,fight),[]);
});

test('v163 conditions and concentration are kept separate from the maneuver snapshot',()=>{
  const list=[
    effect('prone',{name:'Caído',statuses:new Set(['mmrpg.prone']),duration:{rounds:1}}),
    effect('level',{name:'Concentração 2',statuses:new Set(['mmrpg.concentration.2'])}),
  ];
  assert.deepEqual(hudActiveEffectSnapshot(actor(list),fight,{displayedConditions:[{id:'mmrpg.prone'}]}),[]);
});

test('v163 HUD remains read-only and shared by classic and persistent surfaces',()=>{
  const hud=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
  const module=readFileSync(new URL('../scripts/hud4-active-effects.mjs',import.meta.url),'utf8');
  assert.match(hud,/hudActiveEffectSnapshot\(actor, combat, \{displayedConditions:conditions\}\)/);
  assert.match(hud,/hudConditionSnapshot\(actor, combat\)/);
  assert.match(hud,/mmrpg-native-action-hud__hud3-status is-persistent-status/);
  assert.match(hud,/mmrpg-native-action-hud__hud3-status is-classic-status/);
  assert.doesNotMatch(module,/allApplicableEffects\s*\(|\.effects\b|\.setFlag\(|\.update\(|createEmbeddedDocuments\(/);
});
