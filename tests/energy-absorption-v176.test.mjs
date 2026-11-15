import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateEnergyAbsorption,tryAbsorbHealthDamage,absorbedFocusCredit,
  pendingAbsorption,activeAbsorption,applyAbsorbedFocusSpend,
  syncAbsorptionActiveEffect,clearAbsorptionAfterCombat
} from '../scripts/energy-absorption-custom.mjs';
const SYS='multiverse-d616';
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
function createActor({focus=30,max=60}={}){
  const actor={id:'thermal',uuid:'Actor.thermal',name:'Thermal Prime',
    system:{attributes:{rank:{value:4}},focus:{value:focus,max}},flags:{[SYS]:{}},effects:[],events:[],
    async update(changes,options={}){
      applyAbsorbedFocusSpend(this,changes,options);
      if(own(changes,'system.focus.value'))this.system.focus.value=changes['system.focus.value'];
      for(const [key,value] of Object.entries(changes)){
        if(key.startsWith(`flags.${SYS}.`))this.flags[SYS][key.slice(`flags.${SYS}.`.length)]=value;
      }
      this.events.push(['update',{...changes},options]);
    },
    async createEmbeddedDocuments(type,documents){
      assert.equal(type,'ActiveEffect');
      const created=documents.map(d=>({...d,id:`fx${this.events.length}`}));
      this.effects.push(...created);this.events.push(['create',created]);return created;
    },
    async deleteEmbeddedDocuments(type,ids){
      assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id));
      this.events.push(['delete',ids]);
    },
    async updateEmbeddedDocuments(type,changes){
      assert.equal(type,'ActiveEffect');for(const u of changes){const e=this.effects.find(e=>e.id===u._id);if(e)Object.assign(e,u)}
      this.events.push(['updateFx',changes]);
    },
  };
  return actor;
}
function fakeWorld(actor,{reactionUsed=0}={}){
  const combatant={id:'cb',actor,actorId:actor.id,tokenId:'tokenA'};
  const combat={id:'fight',started:true,combatants:[combatant],flags:{[SYS]:{}},
    getFlag(ns,key){return this.flags[ns][key]},async setFlag(ns,key,value){this.flags[ns][key]=value}};
  let used=reactionUsed,consumes=0,refunds=0;
  const tracker={getState(){return {reactionUsed:used,reactionMax:1}},async consumeReaction(){consumes++;if(used>=1)return false;used++;return true},async refundReaction(){refunds++;used=Math.max(0,used-1);return true}};
  return {combat,tracker,turns:()=>({used,consumes,refunds})};
}
function mock(world,gm=false){
  const before={game:globalThis.game,ui:globalThis.ui};
  globalThis.game={user:{id:gm?'gm':'player',isGM:gm},users:{activeGM:{id:'gm'}},combat:world.combat,
    multiverseD616:{turnTracker:world.tracker}};
  globalThis.ui={notifications:{warn(){},error(){},info(){}}};
  return ()=>{globalThis.game=before.game;globalThis.ui=before.ui};
}
const item=a=>({id:'absorption',name:'Energy Absorption',type:'power',actor:a});

test('v176: HUD prepares Reaction by spending exactly 1 Reaction and 15 Focus; no dialog on damage',async()=>{
  const actor=createActor(),world=fakeWorld(actor);const restore=mock(world);
  try{
    assert.equal(await activateEnergyAbsorption(item(actor)),true);
    assert.equal(actor.system.focus.value,15);
    assert.deepEqual(world.turns(),{used:1,consumes:1,refunds:0});
    assert.ok(pendingAbsorption(actor));
    assert.equal(await activateEnergyAbsorption(item(actor)),false,'second activation blocked while prepared');
    assert.deepEqual(world.turns(),{used:1,consumes:1,refunds:0});
    game.user={id:'gm',isGM:true};
    const absorbed=await tryAbsorbHealthDamage(actor,28);
    assert.deepEqual([absorbed.cost,absorbed.after,absorbed.absorbed,absorbed.focusGained],[0,43,28,28]);
    assert.equal(actor.system.focus.value,43);
    assert.equal(absorbedFocusCredit(actor),28,'credit persists even though Focus < normal max');
    assert.equal(pendingAbsorption(actor),undefined);
    assert.ok(activeAbsorption(actor));
    assert.equal(world.turns().consumes,1,'no duplicate Reaction on damage');
    assert.equal(await activateEnergyAbsorption(item(actor)),false,'active absorption blocks replay');
  }finally{restore()}
});

test('v176: active credit decreases on power spends; status removed exactly when exhausted',async()=>{
  const actor=createActor(),world=fakeWorld(actor);const restore=mock(world);
  try{
    await activateEnergyAbsorption(item(actor));
    game.user={id:'gm',isGM:true};
    await tryAbsorbHealthDamage(actor,28);
    await actor.update({'system.focus.value':28}); // spend 15
    assert.equal(absorbedFocusCredit(actor),13);
    await syncAbsorptionActiveEffect(actor);
    assert.equal(actor.effects[0].name,'Energy Absorption — Ativo (13 Focus)');
    await actor.update({'system.focus.value':15}); // spend remaining 13
    assert.equal(absorbedFocusCredit(actor),0);
    await syncAbsorptionActiveEffect(actor);
    assert.equal(actor.effects.length,0);
  }finally{restore()}
});

test('v176: normal Focus damage does not count as spending absorbed credit',async()=>{
  const actor=createActor(),world=fakeWorld(actor);const restore=mock(world);
  try{
    await activateEnergyAbsorption(item(actor));
    game.user={id:'gm',isGM:true};
    await tryAbsorbHealthDamage(actor,28);
    await actor.update({'system.focus.value':30},{d616FocusDamage:true});
    assert.equal(absorbedFocusCredit(actor),28);
    assert.ok(activeAbsorption(actor));
  }finally{restore()}
});

test('v176: two-times Focus cap, post-combat overflow cleanup reduces remaining credit',async()=>{
  const actor=createActor({focus:55,max:60}),world=fakeWorld(actor);const restore=mock(world);
  try{
    await activateEnergyAbsorption(item(actor));
    game.user={id:'gm',isGM:true};
    const result=await tryAbsorbHealthDamage(actor,150);
    assert.equal(result.after,120);
    assert.equal(result.focusGained,80);
    assert.equal(absorbedFocusCredit(actor),80);
    await clearAbsorptionAfterCombat(world.combat);
    assert.equal(actor.system.focus.value,60);
    assert.equal(absorbedFocusCredit(actor),20);
    assert.ok(activeAbsorption(actor),'unspent credit remains locked even after excess is discarded');
  }finally{restore()}
});

test('v176: stale exhausted Reaction refunds Focus and does not leave prepared condition',async()=>{
  const actor=createActor(),world=fakeWorld(actor,{reactionUsed:1});const restore=mock(world);
  try{
    assert.equal(await activateEnergyAbsorption(item(actor)),false);
    assert.equal(actor.system.focus.value,30);
    assert.equal(actor.effects.length,0);
  }finally{restore()}
});

test('v176: GM cannot absorb if the defender did not click the power',async()=>{
  const actor=createActor(),world=fakeWorld(actor);const restore=mock(world,true);
  try{
    assert.equal(await tryAbsorbHealthDamage(actor,28),null);
    assert.equal(actor.system.focus.value,30);
  }finally{restore()}
});

test('v176: combat cleanup removes prepared effect even when actor was removed from combat',async()=>{
  const actor=createActor(),world=fakeWorld(actor);const restore=mock(world);
  try{
    assert.equal(await activateEnergyAbsorption(item(actor)),true);
    assert.ok(pendingAbsorption(actor));
    game.user={id:'gm',isGM:true};
    game.actors=[actor];
    world.combat.combatants=[];
    await clearAbsorptionAfterCombat(world.combat);
    assert.equal(pendingAbsorption(actor),undefined);
    assert.equal(actor.effects.length,0);
  }finally{restore()}
});
