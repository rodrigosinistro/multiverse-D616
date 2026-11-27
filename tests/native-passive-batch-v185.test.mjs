import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation,planNativePowerDispatch,registerNativePowerAutomationAPI} from '../scripts/native-power-automations.mjs';
import {realJinxTargetModifier,hasNativeRealJinx} from '../scripts/native-power-passives.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {normalizeConditionDefense} from '../scripts/power-conditions.mjs';

const list=(name,set)=>({type:'power',name,system:{powerSet:set}});
const actor=(powers=[],statuses=[])=>({items:{contents:powers},statuses:new Set(statuses),effects:[]});
const record=(name,set)=>REGISTERED_AUTOMATIONS.find(r=>r.powerName===name&&r.powerSet===set);

test('v185: 31 distinct official passive references added, no removal of 7 existing macros',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 const ids=new Set(), macros=new Set(), scoped=new Set();
 for(const r of REGISTERED_AUTOMATIONS){
  assert.ok(!ids.has(r.powerId),r.powerName);ids.add(r.powerId);
  assert.ok(!macros.has(r.macroId),r.powerName);macros.add(r.macroId);
  assert.ok(!scoped.has(`${r.powerSet}:${r.powerName}`),r.powerName);scoped.add(`${r.powerSet}:${r.powerName}`);
 }
 for(const family of ['Accuracy','Brilliance','Discipline','Mighty','Sturdy','Uncanny']){
  for(let tier=1;tier<=4;tier++){
   const r=record(`${family} ${tier}`,'Basic');assert.equal(r?.handlerId,'passive-active-effect');
   assert.equal(r?.status,'reference-existing');assert.equal(r?.executionMode,'existing-transfer-effect');
   const target=list(r.powerName,r.powerSet);
   assert.equal(planNativePowerDispatch(target).mode,'preserve-existing');
  }
 }
 for(const name of ['Brawling','Evasion','Integrity','Wisdom']){
  assert.equal(record(name,'Basic')?.handlerId,'defense-swap');
 }
 assert.equal(record('Danger Sense','Sixth Sense')?.executionMode,'existing-bonus-round');
 assert.equal(record('Healing Factor','Basic')?.status,'requires-configuration');
 assert.equal(record('Real Jinx','Luck')?.status,'native-active');
 assert.equal(record('Anger','Basic')?.status,'native-active');
 assert.equal(record('Lightning Actions','Super-Speed')?.status,'requires-configuration');
});

test('v185: no power handlers are read from untrusted item flags and repeated names are isolated',()=>{
 const fake=list('Real Jinx','Magic');assert.equal(resolveNativePowerAutomation(fake),null);
 const real=list('Real Jinx','Luck');assert.equal(resolveNativePowerAutomation(real)?.handlerId,'real-jinx');
 real.flags={'multiverse-d616':{nativeAutomation:{powerId:record('Anger','Basic').powerId}}};
 assert.equal(resolveNativePowerAutomation(real),null);
 assert.equal(resolveNativePowerAutomation(list('Brawling','Basic'))?.handlerId,'defense-swap');
 assert.equal(resolveNativePowerAutomation({type:'trait',name:'Brawling',system:{powerSet:'Basic'}}),null);
});

test('v185: new passive macros remain inert, registry reports existing engine not a newly applied effect',()=>{
 const api=registerNativePowerAutomationAPI({});
 assert.equal(api.list().length,162);
 const r=list('Accuracy 3','Basic');
 assert.equal(api.inspectController(r,actor([r])).state,'power-owned');
 assert.equal(api.inspectController(r,actor()).state,'power-not-owned');
 assert.equal(api.getControllerByItem(r)?.trigger,'actor-effect-preparation');
 const j=list('Real Jinx','Luck');
 assert.equal(api.inspect(j).mode,'native-active');
 assert.equal(api.getControllerByItem(j),null);
 const e=list('Evasion','Basic');
 assert.equal(api.inspectController(e,actor([e])).controller.entryPoint.includes('normalizeConditionDefense'),true);
 const settings={get:(_ns,key)=>key==='automation_ongoingConditions'?false:undefined};
 const heal=list('Healing Factor','Basic');
 assert.equal(api.inspectController(heal,actor([heal]),settings).state,'central-disabled');
 assert.equal(api.inspectController(heal,actor([heal]),{get(){return undefined}}).state,'configured');
});

test('v185: Real Jinx is scoped to owned Luck power, eligible direct attack and max one Trouble',()=>{
 const j=actor([list('Real Jinx','Luck')]);
 assert.equal(hasNativeRealJinx(j),true);
 assert.equal(hasNativeRealJinx(actor([list('Real Jinx','Magic')])),false);
 assert.equal(realJinxTargetModifier(j),null);
 assert.equal(realJinxTargetModifier(j,{attack:true,targeted:false}),null);
 assert.equal(realJinxTargetModifier(j,{attack:true,targeted:true,alreadyTroubled:true}),null);
 assert.equal(realJinxTargetModifier(j,{attack:true,targeted:true})?.sign,-1);
 assert.equal(realJinxTargetModifier(actor(),{attack:true,targeted:true}),null);
});

test('v185: combat real jinx applies exactly once to melee/ranged and never to non-attacks',()=>{
 const caster=actor(),target=actor([list('Real Jinx','Luck')]);
 const ctx={actor:caster,targetActors:[target],attack:true,targeted:true,ability:'mle',kind:'melee'};
 const melee=resolveConditionEdges(ctx);
 assert.equal(melee.net,-1);assert.equal(melee.autoCount,0);
 assert.match(melee.sources[0].source,/Real Jinx/);
 assert.equal(resolveConditionEdges({...ctx,kind:'ranged',ability:'agl'}).net,-1);
 assert.equal(resolveConditionEdges({...ctx,attack:false}).net,0);
 assert.equal(resolveConditionEdges({...ctx,targeted:false}).net,0);
 assert.equal(resolveConditionEdges({...ctx,targetActors:[]}).net,0);
});

test('v185: real jinx never stacks with attacker Trouble or target Trouble, and mixed targets require decision',()=>{
 const j=actor([list('Real Jinx','Luck')]);
 const dis=actor([],['mmrpg.demoralized']);
 const base={actor:dis,targetActors:[j],attack:true,targeted:true,ability:'mle',kind:'melee'};
 const trouble=resolveConditionEdges(base);
 assert.equal(trouble.net,-1);assert.equal(trouble.sources.filter(r=>r.sign<0).length,1);
 assert.equal(trouble.sources.some(r=>r.source.includes('Real Jinx')),false);
 const prone=actor([list('Real Jinx','Luck')],['mmrpg.prone']);
 const proneHit=resolveConditionEdges({...base,actor:actor(),targetActors:[prone],kind:'ranged',ability:'agl'});
 assert.equal(proneHit.net,-1);assert.equal(proneHit.sources.filter(x=>x.sign<0).length,1);
 const mixed=resolveConditionEdges({...base,actor:actor(),targetActors:[j,actor()]});
 assert.equal(mixed.ambiguousTargets,true);assert.equal(mixed.autoCount,0);
 const both=resolveConditionEdges({...base,actor:actor(),targetActors:[j,j]});
 assert.equal(both.ambiguousTargets,false);assert.equal(both.net,-1);
 const already=resolveConditionEdges({...base,actor:actor(),baseMode:-1});
 assert.equal(already.net,-1);assert.equal(already.sources.some(s=>s.source.includes('Real Jinx')),false);
});

test('v185: the original source for Real Jinx does not specify spending or concentration',()=>{
 const p=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items
   .find(i=>i.name==='Real Jinx'&&i.system?.powerSet==='Luck');
 assert.ok(p);assert.match(p.system.effect,/não acumula|não se acumula/i);
 assert.equal(p.system.duration,'Permanent');
});

test('v185: existing alternative defense selection is not duplicated by the new registry',()=>{
 const e=actor([list('Evasion','Basic')]);
 assert.equal(normalizeConditionDefense('mle',e),'agl');
 assert.equal(normalizeConditionDefense('res',e),'res');
});
