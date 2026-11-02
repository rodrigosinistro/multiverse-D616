import test from 'node:test';
import assert from 'node:assert/strict';
// Importing this browser module requires inert Foundry hook stubs in Node.
const old={Hooks:globalThis.Hooks,document:globalThis.document,game:globalThis.game,
  foundry:globalThis.foundry,fromUuid:globalThis.fromUuid,fromUuidSync:globalThis.fromUuidSync};
globalThis.Hooks={on:()=>{},once:()=>{}};
globalThis.document={addEventListener:()=>{}};
const actor={id:'a1',uuid:'Actor.a1',documentName:'Actor',name:'Garras',effects:[],items:new Map(),
  system:{health:{value:35,max:40},focus:{value:30,max:40},healthDamageReduction:1,focusDamageReduction:0},
  async update(data){const merge=(target,patch)=>{for(const [key,value] of Object.entries(patch)){
    if(value && typeof value==='object' && !Array.isArray(value)){target[key]??={};merge(target[key],value);}
    else target[key]=value;}};merge(this,data);}};
globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},messages:new Map()};
globalThis.foundry={utils:{getProperty:(obj,path)=>path.split('.').reduce((v,p)=>v?.[p],obj),
  setProperty:(obj,path,value)=>{const keys=path.split('.');let p=obj;
    for(const key of keys.slice(0,-1))p=p[key]??={};p[keys.at(-1)]=value;}}};
globalThis.fromUuid=async uuid=>uuid==='Actor.a1'?actor:null;
globalThis.fromUuidSync=uuid=>uuid==='Actor.a1'?actor:null;
const {applyCustomRecurringDamage}=await import('../scripts/damage-reduction-helper.js');

test('v119: native MMDR ongoing damage uses DR for Health and resource routing for Focus',async()=>{
  const combatant={actor};
  const health=await applyCustomRecurringDamage({actor,combatant,amount:10,resource:'health'});
  assert.equal(health.applied,true);
  assert.equal(health.delta,5); // RD level 1 removes 5 ongoing damage
  assert.equal(actor.system.health.value,30);
  const focus=await applyCustomRecurringDamage({actor,combatant,amount:7,resource:'focus'});
  assert.equal(focus.applied,true);assert.equal(focus.delta,7);
  assert.equal(actor.system.focus.value,23);
  const absorbed=await applyCustomRecurringDamage({actor,combatant,amount:3,resource:'health'});
  assert.equal(absorbed.applied,true);assert.equal(absorbed.delta,0);
  assert.equal(actor.system.health.value,30);
});

test('v119: native protection intercepts a recurring tick before Health changes',async()=>{
  const originalHealth=actor.system.health.value;
  actor.items.set('protection',{id:'protection',name:'Elemental Protection 1'});
  actor.effects=[{id:'shield-effect',disabled:false,flags:{'multiverse-d616':{concentrationPower:{itemId:'protection'}}}}];
  actor.deleteEmbeddedDocuments=async (_type,ids)=>{actor.effects=actor.effects.filter(e=>!ids.includes(e.id));};
  const result=await applyCustomRecurringDamage({actor,combatant:{actor},amount:12,resource:'health'});
  assert.equal(result.applied,true);assert.equal(result.blocked,true);
  assert.equal(result.delta,0);assert.equal(actor.system.health.value,originalHealth);
  assert.equal(actor.effects.length,0,'shield is consumed by native code after intercepting a strong tick');
});

test('v119: MMDR rejects invalid recurring damage and non-GM mutations',async()=>{
  for(const amount of [-1,0,1.5,101,'wat'])
    assert.equal((await applyCustomRecurringDamage({actor,amount,resource:'health'})).applied,false);
  game.user.isGM=false;
  assert.equal((await applyCustomRecurringDamage({actor,amount:4,resource:'focus'})).applied,false);
  game.user.isGM=true;
});

process.on('exit',()=>{Object.assign(globalThis,old);});
