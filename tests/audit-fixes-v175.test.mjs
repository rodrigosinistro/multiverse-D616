import test from 'node:test';
import assert from 'node:assert/strict';
import {syncConditionTokenVfx} from '../scripts/condition-token-vfx.mjs';
import {tryAbsorbHealthDamage, clearAbsorptionAfterCombat,OVERFLOW_ACTORS_KEY} from '../scripts/energy-absorption-custom.mjs';
// The turn tracker registers Foundry hooks at module evaluation time.
globalThis.Hooks ??= {on(){},once(){}};
const {authorizedTurnSocketSender}=await import('../scripts/combat/turn-tracker.mjs');
import {normalizeCustomRule,passivePowerBenefits,powerMatchesRule,matchesCustomRule,
 CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY} from '../scripts/custom-automations.mjs';
const SYSTEM='multiverse-d616';
const originalGlobal=(updates)=>{
 const old=Object.fromEntries(Object.keys(updates).map(key=>[key,globalThis[key]]));
 Object.assign(globalThis,updates);
 return ()=>Object.assign(globalThis,old);
};

test('v175 A-01: changing scale alone restarts an active status animation exactly once',async()=>{
 const status='mmrpg.paralyzed',calls=[],ends=[];
 let scale=1;
 const token={id:'v175-t',document:{uuid:'Scene.test.Token.v175-t'},actor:{statuses:new Set([status]),effects:[]}};
 const fakeEffect={effect(){return this},file(path){calls.push(['file',path]);return this},attachTo(){return this},persist(){return this},name(){return this},scaleToObject(n){calls.push(['scale',n]);return this},async play(){calls.push(['play']);}};
 const restore=originalGlobal({
   game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:{get(){return [{status,path:'worlds/fx/ice.webm',scale}]}}},
   Sequencer:{EffectManager:{getEffects(){return []},async endEffects({name}){ends.push(name)}}},
   Sequence:class {constructor(){return fakeEffect}},
 });
 try{
   await syncConditionTokenVfx(token);
   await syncConditionTokenVfx(token);
   assert.deepEqual(calls.filter(c=>c[0]==='scale'),[['scale',1]]);
   scale=2;
   await syncConditionTokenVfx(token);
   await syncConditionTokenVfx(token);
   assert.deepEqual(calls.filter(c=>c[0]==='scale'),[['scale',1],['scale',2]]);
   assert.equal(ends.length,1);
   assert.equal(calls.filter(c=>c[0]==='play').length,2);
 }finally{restore()}
});

test('v175 A-01: orphaned Sequencer animation after reconnect is replaced or cleaned',async()=>{
 const token={id:'orphan-175',document:{uuid:'Scene.test.Token.orphan-175'},actor:{statuses:new Set(['mmrpg.paralyzed']),effects:[]}};
 const key=`d616-status:${token.document.uuid}:mmrpg.paralyzed`,ends=[],played=[];
 let show=true;
 const fakeEffect={effect(){return this},file(){return this},attachTo(){return this},persist(){return this},name(){return this},scaleToObject(){return this},async play(){played.push(1)}};
 const restore=originalGlobal({
  game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:{get(){return show?[{status:'mmrpg.paralyzed',path:'worlds/fx/fx.webm',scale:1}]:[]}}},
  Sequencer:{EffectManager:{getEffects(query){return query.name?[{name:key}]:[{name:key}]},async endEffects({name}){ends.push(name)}}},
  Sequence:class {constructor(){return fakeEffect}},
 });
 try{
   await syncConditionTokenVfx(token);
   assert.equal(played.length,1);
   assert.deepEqual(ends,[key],'must reset existing persistent effect with unknown scale');
   show=false;
   await syncConditionTokenVfx(token);
   assert.deepEqual(ends,[key,key]);
 }finally{restore()}
});

test('v175/v176 A-02: excedente é limpo mesmo após remoção do combatente',async()=>{
 const actor={id:'sent',uuid:'Scene.test.Token.sent.Actor.sent',name:'Sentinel',
  system:{focus:{value:15,max:30}},flags:{[SYSTEM]:{}},
  effects:[{id:'pending',disabled:false,flags:{[SYSTEM]:{customEnergyAbsorption:{version:2,armedByHud:true}}}}],
  async update(data){if('system.focus.value'in data)this.system.focus.value=data['system.focus.value'];
    if(`flags.${SYSTEM}.customEnergyAbsorptionOverflow`in data)this.flags[SYSTEM].customEnergyAbsorptionOverflow=data[`flags.${SYSTEM}.customEnergyAbsorptionOverflow`];
    if(`flags.${SYSTEM}.energyAbsorptionCredit`in data)this.flags[SYSTEM].energyAbsorptionCredit=data[`flags.${SYSTEM}.energyAbsorptionCredit`];},
  async createEmbeddedDocuments(_type,docs){this.effects.push(...docs.map((d,i)=>({...d,id:`fx${i}`})))},
  async updateEmbeddedDocuments(){},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id))}
 };
 const combat={started:true,combatants:[{id:'cb',actor,actorId:actor.id}],flags:{[SYSTEM]:{}},
  getFlag(ns,key){return this.flags[ns][key]},async setFlag(ns,key,value){this.flags[ns][key]=value}};
 const restore=originalGlobal({game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat},
  fromUuid:async uuid=>uuid===actor.uuid?actor:null});
 try{
  const result=await tryAbsorbHealthDamage(actor,106);
  assert.equal(result.after,60);
  assert.deepEqual(combat.getFlag(SYSTEM,OVERFLOW_ACTORS_KEY),[actor.uuid]);
  combat.combatants=[];
  await clearAbsorptionAfterCombat(combat);
  assert.equal(actor.system.focus.value,30);
  assert.equal(actor.flags[SYSTEM].customEnergyAbsorptionOverflow,false);
  assert.equal(actor.flags[SYSTEM].energyAbsorptionCredit.remaining,15);
  await clearAbsorptionAfterCombat(combat);
  assert.equal(actor.system.focus.value,30,'limpeza idempotente');
 }finally{restore()}
});

test('v175 R-01: socket requests must originate from authenticated sender, not claimed user',()=>{
 const users=new Map([['gm',{id:'gm',isGM:true}],['p1',{id:'p1',isGM:false}],['p2',{id:'p2',isGM:false}]]);
 assert.equal(authorizedTurnSocketSender({userId:'p1'},'p1',users),users.get('p1'));
 assert.equal(authorizedTurnSocketSender({userId:'gm'},'p1',users),null);
 assert.equal(authorizedTurnSocketSender({userId:'p2'},'p1',users),null);
 assert.equal(authorizedTurnSocketSender({userId:'p1'},undefined,users),null);
 assert.equal(authorizedTurnSocketSender({userId:'p1'},'invalid',users),null);
 assert.equal(authorizedTurnSocketSender({userId:'gm'},'gm',users),users.get('gm'));
});

test('v175 R-02: optional Power Set and source id disambiguate duplicate names, old rules work',()=>{
 const attack=(id,powerSet,source)=>({id,name:'Astral Form',type:'power',system:{powerSet},_stats:{compendiumSource:source}});
 const magic=attack('magic','Magic','Compendium.a');
 const tele=attack('tele','Telepathy','Compendium.b');
 const rules=[normalizeCustomRule({id:'x',name:'Só Magic',trigger:'passivePower',powerName:'Astral Form',powerSet:'Magic',effects:[{effectType:'extraAction'}]}),
  normalizeCustomRule({id:'y',name:'Só origem',trigger:'passivePower',powerName:'Astral Form',powerId:'Compendium.b',effects:[{effectType:'extraReaction'}]})];
 const settings={get(ns,key){return key===CUSTOM_RULES_KEY?rules:key===CUSTOM_RULES_ENABLED_KEY?true:false}};
 assert.equal(powerMatchesRule(rules[0],magic),true);
 assert.equal(powerMatchesRule(rules[0],tele),false);
 assert.equal(powerMatchesRule(rules[1],tele),true);
 assert.equal(powerMatchesRule(rules[1],magic),false);
 assert.equal(powerMatchesRule({...rules[1],powerId:'b'},tele),true,'aceita ID curto de origem do compêndio');
 assert.equal(passivePowerBenefits({items:[magic]},settings).extraActions,1);
 assert.equal(passivePowerBenefits({items:[magic]},settings).extraReactions,0);
 assert.equal(passivePowerBenefits({items:[tele]},settings).extraActions,0);
 assert.equal(passivePowerBenefits({items:[tele]},settings).extraReactions,1);
 const legacy=normalizeCustomRule({id:'z',name:'Legado',trigger:'passivePower',powerName:'Astral Form',effectType:'extraAction'});
 assert.equal(legacy.powerSet,'');assert.equal(legacy.powerId,'');
 assert.equal(powerMatchesRule(legacy,tele),true);
 assert.equal(matchesCustomRule(normalizeCustomRule({id:'a',name:'Role',trigger:'powerRoll',powerName:'Astral Form',powerSet:'Magic',effectType:'condition',effectStatus:'mmrpg.prone'}),
  {actor:{items:[magic]},trigger:'powerRoll',powerName:'Astral Form',powerItem:magic}),true);
});

test('v175 A-02: failure to persist surplus registry never spends Reaction or changes Focus',async()=>{
 let used=0,updates=0;
 const actor={id:'p',uuid:'Actor.p',name:'Pronto',system:{focus:{value:30,max:30}},
  effects:[{id:'prepare',flags:{[SYSTEM]:{customEnergyAbsorption:{version:1}}},disabled:false}],
  async update(){updates++},async deleteEmbeddedDocuments(){throw Error('should not be called')}};
 const combat={started:true,combatants:[{id:'c',actor,actorId:'p'}],
  getFlag(){return []},async setFlag(){throw Error('sem autorização para gravar')}};
 const restore=originalGlobal({game:{user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat,
  multiverseD616:{turnTracker:{getState(){return {reactionMax:1,reactionUsed:0}},async consumeReaction(){used++;return true}}}}});
 const warn=console.warn;console.warn=()=>{};
 try{
   assert.equal(await tryAbsorbHealthDamage(actor,106,{ask:async()=>true}),null);
   assert.equal(used,0);assert.equal(updates,0);
 }finally{console.warn=warn;restore()}
});
