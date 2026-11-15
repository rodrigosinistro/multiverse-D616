import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateEnergyAbsorption,tryAbsorbHealthDamage,absorbedFocusCredit,
  activeAbsorption,applyAbsorbedFocusSpend,applyAbsorptionFocusCapacity,
  normalAbsorptionFocusMaximum,syncAbsorptionActiveEffect,clearAbsorptionAfterCombat
} from '../scripts/energy-absorption-custom.mjs';

const NS='multiverse-d616';
const has=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
function setDeep(obj,path,value){const parts=path.split('.');let cursor=obj;for(const key of parts.slice(0,-1))cursor=cursor[key]??=( {} );cursor[parts.at(-1)]=value;}
function actor({focus=60,max=60,persistFlag=true,staleZero=false,clampToMax=false}={}){
  const out={id:'thermal',uuid:'Actor.thermal',name:'Thermal Prime',type:'character',
    system:{focus:{value:focus,max},attributes:{rank:{value:4}}},
    flags:{[NS]:staleZero?{energyAbsorptionCredit:{remaining:0,normalMax:max,combatId:'fight'}}:{}},
    effects:[],nextId:0,events:[],
    getFlag(scope,key){return this.flags?.[scope]?.[key]},
    async update(changes,options={}){
      applyAbsorbedFocusSpend(this,changes,options);
      for(const [key,value] of Object.entries(changes)){
        if(key==='system.focus.value')setDeep(this,key,clampToMax?Math.min(value,this.system.focus.max):value);
        else if(key==='system.focus.max')setDeep(this,key,value);
        else if(key==='system'&&value?.focus?.value!==undefined)
          this.system.focus.value=clampToMax?Math.min(value.focus.value,this.system.focus.max):value.focus.value;
        if(key.startsWith('flags.')&&persistFlag)setDeep(this,key,value);
        if(key==='flags'&&persistFlag){for(const [ns,values] of Object.entries(value))
          for(const [flagKey,flagValue] of Object.entries(values))setDeep(this,`flags.${ns}.${flagKey}`,flagValue);}
      }
      this.events.push({kind:'actor',changes:{...changes},options});
    },
    async createEmbeddedDocuments(kind,data){
      assert.equal(kind,'ActiveEffect');
      const docs=data.map(raw=>structuredClone({...raw,id:`fx${++this.nextId}`}));
      this.effects.push(...docs);
      if(clampToMax)this.system.focus.max=derivedMax(this);
      this.events.push({kind:'create',docs});return docs;
    },
    async deleteEmbeddedDocuments(kind,ids){
      assert.equal(kind,'ActiveEffect');
      this.effects=this.effects.filter(e=>!ids.includes(e.id));
      if(clampToMax)this.system.focus.max=derivedMax(this);
      this.events.push({kind:'remove',ids});
    },
    async updateEmbeddedDocuments(kind,changes){
      assert.equal(kind,'ActiveEffect');
      for(const patch of changes){
        const item=this.effects.find(e=>e.id===patch._id);assert.ok(item);
        for(const [key,value] of Object.entries(patch)){
          if(key==='_id')continue;
          if(key.includes('.'))setDeep(item,key,value);else item[key]=value;
        }
      }
      this.events.push({kind:'effect',changes});
    },
  };
  return out;
}
function env(a){
  const before={game:globalThis.game,ui:globalThis.ui,ChatMessage:globalThis.ChatMessage};
  const combatant={id:'cb',actor:a,actorId:a.id,tokenId:'tk'};
  let used=0;
  const tracker={getState(){return {reactionUsed:used,reactionMax:1}},async consumeReaction(){if(used)return false;used++;return true},async refundReaction(){used=0;return true}};
  const combat={id:'fight',started:true,combatants:[combatant],flags:{[NS]:{}},getFlag(ns,key){return this.flags[ns]?.[key]},async setFlag(ns,key,value){this.flags[ns][key]=value}};
  globalThis.game={user:{id:'player',isGM:false},users:{activeGM:{id:'gm'}},combat,actors:[a],multiverseD616:{turnTracker:tracker}};
  globalThis.ui={notifications:{warn(){},error(){},info(){}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
  return {combat,used:()=>used,gm(){globalThis.game.user={id:'gm',isGM:true}},restore(){Object.assign(globalThis,before)}};
}
const power=a=>({id:'absorb',type:'power',name:'Energy Absorption',actor:a});
const derivedMax=a=>{const model={parent:a,focus:{max:60}};applyAbsorptionFocusCapacity(model);return model.focus.max;};

test('v177: 24 Focus absorbed at 60/60 produces 69/120, with 24-credit condition',async()=>{
  const a=actor(),e=env(a);
  try {
    assert.equal(derivedMax(a),60);
    assert.equal(await activateEnergyAbsorption(power(a)),true);
    assert.equal(a.system.focus.value,45);
    e.gm();
    const absorbed=await tryAbsorbHealthDamage(a,24);
    assert.equal(absorbed?.focusGained,24);
    assert.equal(a.system.focus.value,69);
    assert.equal(absorbedFocusCredit(a),24);
    assert.equal(derivedMax(a),120);
    assert.equal(normalAbsorptionFocusMaximum({...a,system:{...a.system,focus:{value:69,max:120}}}),60);
    assert.equal(a.effects[0].name,'Energy Absorption — Ativo (24 Focus)');
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,24);
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.normalMax,60);
    assert.equal(e.used(),1);
  }finally{e.restore()}
});

test('v177: 24 credit is spent on successive Focus expenses, leaving no active marker',async()=>{
  const a=actor(),e=env(a);
  try {
    await activateEnergyAbsorption(power(a));e.gm();await tryAbsorbHealthDamage(a,24);
    await a.update({'system.focus.value':59}); // 69 - 10
    assert.equal(absorbedFocusCredit(a),14);
    await syncAbsorptionActiveEffect(a);
    assert.equal(a.effects[0].name,'Energy Absorption — Ativo (14 Focus)');
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,14);
    assert.equal(derivedMax(a),120);
    await a.update({system:{focus:{value:45}}}); // spend 14, nested Foundry update
    assert.equal(a.system.focus.value,45);
    assert.equal(absorbedFocusCredit(a),0);
    await syncAbsorptionActiveEffect(a);
    assert.equal(a.effects.length,0);
    assert.equal(activeAbsorption(a),false);
    assert.equal(derivedMax(a),60);
    assert.equal(e.used(),1);
  }finally{e.restore()}
});

test('v177: fallback ActiveEffect ledger repairs missing or stale zero Actor flag',async()=>{
  for(const staleZero of [false,true]){
    const a=actor({persistFlag:false,staleZero}),e=env(a);
    try {
      await activateEnergyAbsorption(power(a));e.gm();await tryAbsorbHealthDamage(a,24);
      assert.equal(absorbedFocusCredit(a),24);
      assert.equal(derivedMax(a),120);
      await a.update({'system.focus.value':58}); // 69 - 11
      assert.equal(absorbedFocusCredit(a),13);
      await syncAbsorptionActiveEffect(a,{remaining:13,focusAfter:58});
      assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,13);
      await a.update({'system.focus.value':45});
      await syncAbsorptionActiveEffect(a,{remaining:0,focusAfter:45});
      assert.equal(a.effects.length,0);
      assert.equal(absorbedFocusCredit(a),0);
    }finally{e.restore()}
  }
});

test('v177: Focus damage is not a spend; no credit change',async()=>{
  const a=actor(),e=env(a);
  try{
    await activateEnergyAbsorption(power(a));e.gm();await tryAbsorbHealthDamage(a,24);
    await a.update({'system.focus.value':60},{d616FocusDamage:true});
    assert.equal(absorbedFocusCredit(a),24);
    await syncAbsorptionActiveEffect(a);
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,24);
  }finally{e.restore()}
});

test('v177: overflow drops to natural max at end of combat and credit is reduced',async()=>{
  const a=actor({focus:60}),e=env(a);
  try{
    await activateEnergyAbsorption(power(a));e.gm();await tryAbsorbHealthDamage(a,24);
    assert.equal(derivedMax(a),120);
    await clearAbsorptionAfterCombat(e.combat);
    assert.equal(a.system.focus.value,60);
    assert.equal(absorbedFocusCredit(a),15);
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,15);
    e.combat.started=false;
    assert.equal(derivedMax(a),60,'temporary doubled cap ends with that combat');
  }finally{e.restore()}
});

test('v177: clean abandoned v176 active effect with zero credit when reactivating',async()=>{
  const a=actor(),e=env(a);
  try{
    a.effects.push({id:'stale',name:'Energy Absorption — Ativo (0 Focus)',flags:{[NS]:{customEnergyAbsorption:{active:true,version:2}}}});
    assert.equal(activeAbsorption(a),false);
    assert.equal(await activateEnergyAbsorption(power(a)),true);
    assert.equal(a.effects.length,1);
    assert.equal(a.effects[0].name,'Energy Absorption — Preparado');
  }finally{e.restore()}
});


test('v177: double capacity repairs a first write clamped to the old Focus max',async()=>{
  const a=actor({clampToMax:true}),e=env(a);
  try{
    await activateEnergyAbsorption(power(a)); // 60 -> 45
    e.gm();
    const absorbed=await tryAbsorbHealthDamage(a,24);
    assert.equal(absorbed?.focusGained,24);
    assert.equal(a.system.focus.value,69,'retry after effect raises maximum restores lost overflow');
    assert.equal(a.system.focus.max,120);
    assert.equal(absorbedFocusCredit(a),24);
  }finally{e.restore()}
});

test('v177: combat-end cleanup updates fallback credit when Actor flag is unavailable',async()=>{
  const a=actor({persistFlag:false,staleZero:true}),e=env(a);
  try{
    await activateEnergyAbsorption(power(a));e.gm();await tryAbsorbHealthDamage(a,24);
    assert.equal(absorbedFocusCredit(a),24);
    assert.equal(a.system.focus.value,69);
    await clearAbsorptionAfterCombat(e.combat);
    assert.equal(a.system.focus.value,60);
    assert.equal(absorbedFocusCredit(a),15);
    assert.equal(a.effects[0].flags[NS].customEnergyAbsorption.remaining,15);
    e.combat.started=false;
    assert.equal(derivedMax(a),60);
  }finally{e.restore()}
});
