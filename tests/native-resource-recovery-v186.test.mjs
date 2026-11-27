import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFocusCost,validateFocusSpend} from '../scripts/focus-cost.mjs';
import {nativeRecoveryKind,checkNativeRecoveryUse,applyNativeRecovery} from '../scripts/native-power-recovery.mjs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation,checkNativePowerUse,commitNativePowerAfterFocus,planNativePowerDispatch} from '../scripts/native-power-automations.mjs';
import {classifyItemAction} from '../scripts/combat/turn-tracker-core.mjs';

const source=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const p=(name,set)=>{
 const item=source.find(i=>i.name===name&&i.system?.powerSet===set);
 assert.ok(item,`${name}/${set}`);
 return {...item,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${item._id}`}}};
};
const actor=({hp=12,maxHp=70,fp=30,maxFp=60,vig=6,rank=4,fail=false}={})=>({
 system:{health:{value:hp,max:maxHp},focus:{value:fp,max:maxFp},abilities:{vig:{value:vig}},attributes:{rank:{value:rank}}},
 updates:[],effects:[],
 async update(change){this.updates.push(change);if(fail)throw Error('Actor update rejected');
  for(const [key,value] of Object.entries(change)){
   if(key==='system.focus.value')this.system.focus.value=value;
   else if(key==='system.health.value')this.system.health.value=value;
   else throw Error('Unexpected write '+key);
  }
  return this;
 }
});

test('v186: 44 unique macros, native recovery is scoped and defaults do not execute GM macros',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 const scoped=new Set(REGISTERED_AUTOMATIONS.map(r=>`${r.powerSet}/${r.powerName}`));
 assert.equal(scoped.size,162);
 for(const [name,set,handler] of [
  ['Regain Focus','Martial Arts','regain-focus'],
  ['Do This All Day','Martial Arts','do-this-all-day'],
  ['Do This All Day','Shield Bearer','do-this-all-day']]){
  const r=resolveNativePowerAutomation(p(name,set));
  assert.equal(r?.handlerId,handler);
  assert.equal(r.status,'native-active');
  assert.equal(planNativePowerDispatch(p(name,set)).mode,'native-active');
 }
 const a=p('Do This All Day','Shield Bearer');a.flags['multiverse-d616']={nativeAutomation:{powerId:resolveNativePowerAutomation(p('Do This All Day','Martial Arts')).powerId}};
 assert.equal(resolveNativePowerAutomation(a),null);
 assert.equal(resolveNativePowerAutomation({...a,type:'weapon'}),null);
 assert.equal(nativeRecoveryKind({...a,name:'Do This All Day',system:{powerSet:'Magic'}}),null);
});

test('v186: official catalog defines recovery amounts and minimum spending, not improvised values',()=>{
 const regain=p('Regain Focus','Martial Arts');
 assert.match(regain.system.effect,/Focus igual à sua Vigilance/i);
 assert.equal(regain.system.action,'Standard');
 assert.deepEqual(classifyItemAction(regain).resources,['action']);
 assert.equal(parseFocusCost(regain.system.cost).hasFocus,false);
 for(const set of ['Martial Arts','Shield Bearer']){
  const recovery=p('Do This All Day',set), parsed=parseFocusCost(recovery.system.cost);
  assert.equal(parsed.type,'variable');assert.equal(parsed.min,5);
  // Original Shield Bearer says 'Standart', which the existing turn tracker accepts.
  assert.deepEqual(classifyItemAction(recovery).resources,['action']);
  assert.match(recovery.system.effect,/2 pontos de Vida para cada ponto de Foco/i);
 }
});

test('v186: Regain Focus restores Vigilance without spending Focus and caps at the actor max',async()=>{
 const item=p('Regain Focus','Martial Arts'),a=actor({fp:22,maxFp:40,vig:8});
 assert.equal(checkNativePowerUse(a,item).ok,true);
 const result=await commitNativePowerAfterFocus(a,item,0);
 assert.equal(result.gained,8);assert.equal(result.after,30);
 assert.equal(a.system.focus.value,30);assert.deepEqual(a.updates,[{'system.focus.value':30}]);
 a.system.focus.value=39;const again=await commitNativePowerAfterFocus(a,item,0);
 assert.equal(again.gained,1);assert.equal(a.system.focus.value,40);
 assert.equal(checkNativePowerUse(a,item).ok,false);
 assert.equal(a.updates.length,2);
});

test('v186: both versions of Do This All Day heal 2 Health per Focus, bounded by max',async()=>{
 for(const set of ['Martial Arts','Shield Bearer']){
  const item=p('Do This All Day',set),a=actor({hp:22,maxHp:70,fp:50});
  assert.equal(checkNativePowerUse(a,item).ok,true);
  // Simulate the existing generic Focus commit ONCE; the native handler
  // must not deduct a second time or update a second resource.
  assert.equal(validateFocusSpend(a,10).ok,true);
  await a.update({'system.focus.value':a.system.focus.value-10});
  const result=await commitNativePowerAfterFocus(a,item,10);
  assert.equal(result.gained,20);assert.equal(result.after,42);
  assert.equal(a.system.health.value,42);assert.equal(a.system.focus.value,40);
  assert.deepEqual(a.updates,[{'system.focus.value':40},{'system.health.value':42}]);
  a.updates.length=0;a.system.health.value=67;
  const capped=await commitNativePowerAfterFocus(a,item,5);
  assert.equal(capped.gained,3);assert.equal(a.system.health.value,70);
  assert.equal(checkNativePowerUse(a,item).ok,false);
 }
});

test('v186: invalid amounts, full pools, missing max, or bad Vigilance never consume resources',async()=>{
 const health=p('Do This All Day','Martial Arts'),focus=p('Regain Focus','Martial Arts');
 const a=actor({hp:70,maxHp:70});assert.equal(checkNativePowerUse(a,health).ok,false);assert.deepEqual(a.updates,[]);
 const b=actor({fp:60,maxFp:60});assert.equal(checkNativePowerUse(b,focus).ok,false);
 const c=actor({vig:0});assert.equal(checkNativeRecoveryUse(c,focus).ok,false);
 const d=actor({maxHp:0});assert.equal(checkNativeRecoveryUse(d,health).ok,false);
 const e=actor({maxFp:0});assert.equal(checkNativeRecoveryUse(e,focus).ok,false);
 const f=actor();
 await assert.rejects(applyNativeRecovery(f,health,4),/pelo menos 5/);
 await assert.rejects(applyNativeRecovery(f,health,1.2),/inválido/);
 await assert.rejects(applyNativeRecovery(f,focus,5),/não possui custo/);
 assert.equal(f.updates.length,0);
});

test('v186: foreign powers never alter resources and failed Actor updates propagate safely',async()=>{
 const x=p('Do This All Day','Martial Arts');x.system.powerSet='Magic';
 const a=actor();assert.equal(await commitNativePowerAfterFocus(a,x,10),null);
 assert.deepEqual(a.updates,[]);
 const fail=actor({fail:true});
 await assert.rejects(commitNativePowerAfterFocus(fail,p('Regain Focus','Martial Arts'),0),/Actor update rejected/);
 assert.equal(fail.system.focus.value,30);
});

test('v186: Reinforced Skeleton and Speed Run references reuse established engines',()=>{
 const list=[['Reinforced Skeleton','Basic','passive-active-effect'],
  ['Speed Run 1','Super-Speed','passive-movement'],['Speed Run 2','Super-Speed','passive-movement']];
 for(const [name,set,handler] of list){
  const r=resolveNativePowerAutomation(p(name,set));
  assert.equal(r.handlerId,handler);assert.equal(r.status,'reference-existing');
  assert.equal(planNativePowerDispatch(p(name,set)).mode,'preserve-existing');
 }
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const pre=main.indexOf('checkNativePowerUse(this.actor,this)');
 const paid=main.indexOf('mmCommitFocusForPowerUse(this.actor, preFocus)');
 const applied=main.indexOf('commitNativePowerAfterFocus(this.actor,this,');
 const tracked=main.lastIndexOf('turnTracker?.trackItemUse?.(this)');
 assert.ok(pre>0&&pre<paid&&paid<applied&&applied<tracked);
 assert.match(main,/nativeEffect\?\.kind==='native-recovery'/);
});
