import test from 'node:test';
import assert from 'node:assert/strict';

const NS = 'multiverse-d616';
const setDeep=(target,path,value)=>{
  const parts=path.split('.');let cur=target;
  for(const p of parts.slice(0,-1))cur=cur[p]??={};
  cur[parts.at(-1)]=value;
};

/** Foundry's preUpdateActor dispatch cancels an entire Actor.update when a
 * listener returns literal false. The old v176/v177 wrapper forwarded the
 * accounting helper's "nothing to spend" false result and blocked ALL
 * ordinary damage, Focus-cost, healing and HUD resource updates. */
test('v178: preUpdateActor never vetoes normal damage, healing, Focus costs or unrelated updates',async()=>{
  const saved={Hooks:globalThis.Hooks,game:globalThis.game};
  const handlers=new Map();
  globalThis.Hooks={on(event,fn){let arr=handlers.get(event);if(!arr){arr=[];handlers.set(event,arr)}arr.push(fn)}};
  globalThis.game={user:{id:'gm',isGM:true},combat:{id:'fight',started:true}};
  try{
    // Separate import instance explicitly exercises *registration* of hooks;
    // direct unit tests of applyAbsorbedFocusSpend missed the regression.
    await import('../scripts/energy-absorption-custom.mjs?foundry-hook-178');
    assert.ok(handlers.get('preUpdateActor')?.length);
    function actor({credit=0}={}){
      const a={id:'a',uuid:'Actor.a',system:{health:{value:100,max:100},focus:{value:60,max:60},karma:{value:2}},
        effects:[],flags:{[NS]:credit>0?{energyAbsorptionCredit:{remaining:credit,total:credit,normalMax:60,combatId:'fight'}}:{}},
        getFlag(scope,key){return this.flags?.[scope]?.[key]},
        async updateEmbeddedDocuments(){return[]},async deleteEmbeddedDocuments(){return[]},
        async update(changes,options={}){
          // The behavior of Foundry's Hooks.call, including its false veto.
          for(const callback of (handlers.get('preUpdateActor')??[])){
            if(callback(this,changes,options,'gm')===false)return false;
          }
          for(const [path,value] of Object.entries(changes)){
            if(path==='system'||path==='flags'){
              const visit=(base,patch,prefix)=>{
                for(const [k,v] of Object.entries(patch)){
                  const p=`${prefix}.${k}`;
                  if(v&&typeof v==='object'&&!Array.isArray(v))visit(base,v,p);
                  else setDeep(base,p,v);
                }
              };
              visit(this,value,path);
            } else setDeep(this,path,value);
          }
          for(const callback of (handlers.get('updateActor')??[]))
            callback(this,changes,options,'gm');
          return true;
        },
      };return a;
    }
    const sentinel=actor();
    assert.equal(await sentinel.update({'system.health.value':69}),true,'damage must not be vetoed');
    assert.equal(sentinel.system.health.value,69);
    assert.equal(await sentinel.update({'system.health.value':79}),true,'healing must not be vetoed');
    assert.equal(sentinel.system.health.value,79);
    assert.equal(await sentinel.update({'system.focus.value':45}),true,'ordinary power Focus cost must not be vetoed');
    assert.equal(sentinel.system.focus.value,45);
    assert.equal(await sentinel.update({system:{focus:{value:30}}}),true,'nested Focus cost');
    assert.equal(sentinel.system.focus.value,30);
    assert.equal(await sentinel.update({'system.karma.value':1}),true,'unrelated values must not be vetoed');
    assert.equal(sentinel.system.karma.value,1);
    const active=actor({credit:24});
    active.system.focus.value=69;
    assert.equal(await active.update({'system.focus.value':59}),true,'credit spend must not be vetoed');
    assert.equal(active.system.focus.value,59);
    assert.equal(active.flags[NS].energyAbsorptionCredit.remaining,14,'credit must be decremented');
    assert.equal(await active.update({'system.health.value':72}),true,'Health damage with credit active must work');
    assert.equal(active.system.health.value,72);
    assert.equal(await active.update({'system.focus.value':54},{d616FocusDamage:true}),true,
      'Focus damage must never be vetoed');
    assert.equal(active.system.focus.value,54);
    assert.equal(active.flags[NS].energyAbsorptionCredit.remaining,14,'Focus damage is not a spending event');
    assert.equal(await active.update({'system.focus.value':40},{d616EnergyAbsorptionInternal:true}),true,
      'internal absorbed Focus updates must not be vetoed');
    assert.equal(active.system.focus.value,40);
    assert.equal(active.flags[NS].energyAbsorptionCredit.remaining,14,'internal updates must not spend credit');
  }finally{globalThis.Hooks=saved.Hooks;globalThis.game=saved.game}
});
