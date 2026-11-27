import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveNativePowerAutomation,planNativePowerDispatch,dispatchNativeExistingPreRoll,
  registerNativePowerAutomationAPI} from '../scripts/native-power-automations.mjs';
import {legacyControllerDescriptor,inspectLegacyController} from '../scripts/native-power-legacy-bridge.mjs';
import {normalizeCustomRule,CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY,passivePowerBenefits} from '../scripts/custom-automations.mjs';
import {pendingAbsorption,applyAbsorbedFocusSpend} from '../scripts/energy-absorption-custom.mjs';
import {selectElementalDefense,assessGuardHit} from '../scripts/elemental-shields.mjs';

const NS='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const power=(name,set,actor)=>{
 const source=catalog.find(p=>p.type==='power' && p.name===name&&p.system?.powerSet===set);
 assert.ok(source,`${name}/${set} source`);
 return {type:'power',id:'ACTOR_POWER_01',name,actor,system:{...source.system},
   flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${source._id}`}}};
};
const setting=(rules=[],active=true)=>{const values={[CUSTOM_RULES_KEY]:rules,[CUSTOM_RULES_ENABLED_KEY]:active,disableAllAutomations:false};
 return {values,get(_ns,key){return values[key]}};};
const lightningRule=(id='lightning')=>normalizeCustomRule({id,name:'Lightning Actions passiva',trigger:'passivePower',
 powerName:'Lightning Actions',powerSet:'Super-Speed',enabled:true,effects:[
  {effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]});
const setActor=(...items)=>({items:new Map(items.map(i=>[i.id,i])),effects:[]});

test('v182: all six legacy references have explicit, bounded, truthful controller routing',()=>{
 const tests=[
  ['Energy Absorption','Basic','energy-absorption','existing-pre-roll','reference-existing'],
  ['Lightning Actions','Super-Speed','lightning-actions','central-passive-power','requires-configuration'],
  ...[1,2,3,4].map(i=>[`Elemental Protection ${i}`,'Elemental Control','elemental-protection','existing-concentration-guard','reference-existing']),
 ];
 for(const [name,set,handler,mode,status] of tests){
  const item=power(name,set);const record=resolveNativePowerAutomation(item);
  assert.equal(record.handlerId,handler);assert.equal(record.executionMode,mode);assert.equal(record.status,status);
  const plan=planNativePowerDispatch(item);
  assert.equal(plan.handlerId,handler);assert.equal(plan.controller.controllerId,handler);
  assert.equal(plan.controller.ownership,handler==='lightning-actions'?'central-configured':'existing-controller');
  assert.equal(plan.controller.configRequired,handler==='lightning-actions');
  assert.equal(plan.controller.controllerFile.startsWith('scripts/'),true);
 }
 const anger=power('Anger','Basic');assert.equal(legacyControllerDescriptor(resolveNativePowerAutomation(anger)),null);
});

test('v182: registry API stays read-only and distinguishes Central-configured Lightning',()=>{
 const api=registerNativePowerAutomationAPI({});
 assert.equal(api.list().length,162);
 assert.equal(typeof api.inspectController,'function');
 const actor=setActor();const lightning=power('Lightning Actions','Super-Speed',actor);
 actor.items.set(lightning.id,lightning);
 assert.equal(api.inspectController(lightning,actor,setting()).state,'not-configured');
 const configured=setting([lightningRule()]);
 assert.deepEqual(api.inspectController(lightning,actor,configured).enabledEffects,
  ['extraAction','extraReaction','initiativeMarvelM']);
 assert.equal(api.inspectController(lightning,actor,configured).state,'configured');
 assert.equal(passivePowerBenefits(actor,configured).extraActions,1);
 assert.equal(passivePowerBenefits(actor,configured).extraReactions,1);
 assert.equal(passivePowerBenefits(actor,configured).marvelM,true);
 assert.equal(api.inspectController(lightning,actor,setting([lightningRule()],false)).state,'central-disabled');
 assert.equal(api.inspectController(lightning,null,configured).state,'not-evaluated');
});

test('v182: incomplete or mismatched Lightning rules never register as configured',()=>{
 const actor=setActor();const powerItem=power('Lightning Actions','Super-Speed',actor);actor.items.set(powerItem.id,powerItem);
 const partly=normalizeCustomRule({id:'partial',name:'Somente ação',trigger:'passivePower',
  powerName:'Lightning Actions',powerSet:'Super-Speed',enabled:true,effects:[{effectType:'extraAction'}]});
 assert.equal(inspectLegacyController(resolveNativePowerAutomation(powerItem),actor,setting([partly])).state,'partially-configured');
 const wrong=normalizeCustomRule({id:'wrong',name:'Outro Power Set',trigger:'passivePower',
  powerName:'Lightning Actions',powerSet:'Magic',enabled:true,effects:[
   {effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]});
 assert.equal(inspectLegacyController(resolveNativePowerAutomation(powerItem),actor,setting([wrong])).state,'not-configured');
 assert.equal(inspectLegacyController(resolveNativePowerAutomation(powerItem),setActor(),setting([lightningRule()])).state,'power-not-owned');
 const conditioned=normalizeCustomRule({id:'cond',name:'exige status',trigger:'passivePower',
  powerName:'Lightning Actions',powerSet:'Super-Speed',requiresStatus:'mmrpg.prone',enabled:true,effects:[
   {effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]});
 assert.equal(inspectLegacyController(resolveNativePowerAutomation(powerItem),actor,setting([conditioned])).state,'not-configured');
});

test('v182: Elemental Protection levels report active state without modifying damage or Concentration',()=>{
 for(let level=1;level<=4;level++){
  const actor=setActor(),item=power(`Elemental Protection ${level}`,'Elemental Control',actor);
  actor.items.set(item.id,item);
  const record=resolveNativePowerAutomation(item);
  const inactive=inspectLegacyController(record,actor);
  assert.equal(inactive.state,'inactive');assert.equal(inactive.threshold,0);
  actor.effects.push({id:'e',disabled:false,flags:{[NS]:{concentrationPower:{itemId:item.id}}}});
  const active=inspectLegacyController(record,actor);
  assert.equal(active.state,'active');assert.equal(active.threshold,10*level);
  const guard=selectElementalDefense({actor})?.guard;
  assert.equal(guard.threshold,10*level);
  const blocked=assessGuardHit(10*level+1,guard);
  assert.deepEqual([blocked.blocked,blocked.damageToTarget,blocked.destroyed],[true,0,true]);
  actor.effects[0].disabled=true;
  assert.equal(inspectLegacyController(record,actor).state,'inactive');
 }
});

test('v182: the pre-roll delegate uses Energy Absorption exactly once with original Focus/Reaction spending',async()=>{
 const actor={id:'abs',uuid:'Actor.abs',system:{focus:{value:30,max:60}},flags:{[NS]:{}},effects:[],
  async update(change,options={}){applyAbsorbedFocusSpend(this,change,options);
   if('system.focus.value' in change)this.system.focus.value=change['system.focus.value'];
   for(const [k,v] of Object.entries(change))if(k.startsWith(`flags.${NS}.`))this.flags[NS][k.slice(`flags.${NS}.`.length)]=v;},
  async createEmbeddedDocuments(_type,data){const made=data.map((d,i)=>({...d,id:`effect${i}`}));this.effects.push(...made);return made;},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));},
 };
 const item=power('Energy Absorption','Basic',actor);const combatant={id:'c',actor,actorId:actor.id,tokenId:'token'};
 const combat={id:'fight',started:true,combatants:[combatant],flags:{[NS]:{}},
  getFlag(ns,key){return this.flags[ns][key]},async setFlag(ns,key,v){this.flags[ns][key]=v}};
 let reactions=0;
 const tracker={getState:()=>({reactionUsed:reactions,reactionMax:1}),
  async consumeReaction(){reactions++;return reactions===1},async refundReaction(){reactions--}};
 const previous={game:globalThis.game,ui:globalThis.ui};
 globalThis.game={user:{id:'player',isGM:false},users:{activeGM:{id:'gm'}},combat,multiverseD616:{turnTracker:tracker}};
 globalThis.ui={notifications:{warn(){},error(){},info(){}}};
 try{
  assert.equal(await dispatchNativeExistingPreRoll(item),true);
  assert.equal(reactions,1);assert.equal(actor.system.focus.value,15);
  assert.ok(pendingAbsorption(actor));
  assert.equal(inspectLegacyController(resolveNativePowerAutomation(item),actor).state,'prepared');
  assert.equal(await dispatchNativeExistingPreRoll(item),false,'second use blocked; no new Reaction/Focus');
  assert.equal(reactions,1);assert.equal(actor.system.focus.value,15);
  const rogue={type:'power',name:'Energy Absorption',actor};
  assert.equal(await dispatchNativeExistingPreRoll(rogue),false,'old name-only fallback stays compatible');
  assert.equal(reactions,1);
  assert.equal(dispatchNativeExistingPreRoll({type:'weapon',name:'Energy Absorption',actor}),null);
 }finally{globalThis.game=previous.game;globalThis.ui=previous.ui;}
});

test('v182: original combat/RD hooks and Central remain the authority; no new hooks or privileged macro execution',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const bridge=readFileSync(new URL('../scripts/native-power-legacy-bridge.mjs',import.meta.url),'utf8');
 const registry=readFileSync(new URL('../scripts/native-power-automations.mjs',import.meta.url),'utf8');
 assert.match(main,/if\(isEnergyAbsorptionPower\(this\)\)return dispatchNativeExistingPreRoll\(this\)/);
 assert.doesNotMatch(main,/activateEnergyAbsorption\(this\)/);
 assert.match(bridge,/return activateEnergyAbsorption\(item\)/);
 assert.doesNotMatch(bridge,/Hooks\.on\(|Hooks\.once\(|\.execute\(|\.socket\.emit\(/);
 assert.doesNotMatch(registry,/\.execute\(|socket\.emit\(/);
 assert.match(main,/commitNativePowerAfterFocus/);
 assert.match(main,/nativeDamageBonusForAttack/);
 const protection=readFileSync(new URL('../scripts/elemental-shields.mjs',import.meta.url),'utf8');
 assert.match(protection,/selectElementalDefense/);
 const central=readFileSync(new URL('../scripts/custom-automations.mjs',import.meta.url),'utf8');
 assert.match(central,/passivePowerBenefits/);
});
