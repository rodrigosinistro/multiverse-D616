import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
globalThis.Hooks??={once(){},on(){}};
const {supportReach,lot11TargetEligibility}=await import('../scripts/native-priority-lot11.mjs');
const {isBodySphere,isBounceBack,isProbabilityHex,lot12Eligibility,activeProbabilityHex,probabilityRollConversion,applyLot12Activation,syncLot12Effects,sphereMovementBlocked,carrySphereParticipants,bounceBackAfterPay}=await import('../scripts/native-priority-lot12.mjs');
const {resolvePowerRoll}=await import('../scripts/power-rolls.mjs');
const {POWER_CONDITIONS}=await import('../scripts/power-conditions.mjs');
const require=createRequire(import.meta.url);
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const S='multiverse-d616';let n=0;
function item(name,set){const x=catalog.find(p=>p.name===name&&p.system.powerSet===set);assert.ok(x,name);return {...x,id:x._id};}
const never=item('Never Surrender','Healing'),lets=item("Let's Go",'Healing'),sphere=item('Body Sphere','Plasticity'),hex=item('Probability Manipulation Hex','Magic'),bounce=item('Bounce Back','Plasticity');
function actor(name,{focus=12,health=12,rank=3,reach=1,items=[]}={}){
 const a={id:name,uuid:`Actor.${name}`,name,system:{focus:{value:focus,max:120},health:{value:health,max:120},reach,attributes:{rank:{value:rank}}},effects:[],statuses:new Set(),items:{contents:items,get(id){return this.contents.find(i=>i.id===id)}},
 async createEmbeddedDocuments(type,docs){assert.equal(type,'ActiveEffect');return docs.map(d=>{const fx={...d,id:`new-${++n}`,parent:a};a.effects.push(fx);return fx})},
 async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id))},
 async toggleStatusEffect(status,{active}){if(active)this.statuses.add(status);else this.statuses.delete(status)}};
 for(const p of items)p.actor=a;return a;
}
function world(caster,target,{source=100,targetAt=200}={}){
 const scene={id:'s1',grid:{size:100},tokens:null},a={id:'a',x:source,y:100,width:1,height:1,actor:caster,parent:scene},b={id:'b',x:targetAt,y:100,width:1,height:1,actor:target,parent:scene};
 scene.tokens={contents:[a,b],get(id){return [a,b].find(t=>t.id===id)}};
 const scenes={contents:[scene],get(id){return id===scene.id?scene:null}};
 for(const t of [a,b])t.update=async(changes,options)=>{Object.assign(t,changes);return t};
 const before=globalThis.game;
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes};
 return {a,b,scene,scenes,reset(){globalThis.game=before}};
}
function conc(caster,power){const e={id:`fx-${power.id}`,flags:{[S]:{concentrationPower:{transient:true,itemId:power.id}}},disabled:false,parent:caster,
 async setFlag(ns,key,value){this.flags[ns][key]=value}};caster.effects.push(e);return e}
function request(caster,power){return {id:'message',speaker:{scene:'s1',token:'a',actor:caster.id},flags:{[S]:{itemId:power.id}},getFlag(ns,k){return this.flags[ns]?.[k]},
 async setFlag(ns,k,v){this.flags[ns][k]=v},async update(v){this.content=v.content}}}
const sel=(kind,ids=['b'])=>({version:1,kind,sceneId:'s1',sourceTokenId:'a',tokenIds:ids});
test('v234: Never Surrender official Reach follows dynamically increased actor reach, Let’s Go stays touch',()=>{
 assert.equal(never.system.range,'Reach');const caster=actor('caster',{reach:4,items:[never,lets]}),target=actor('patient',{focus:0,health:0});
 const env=world(caster,target,{targetAt:400});
 try{assert.equal(supportReach(caster,'focus'),4);assert.equal(supportReach(caster,'health'),1);
  assert.equal(lot11TargetEligibility(never,sel('focus'),env.scene,env.a).ok,true);
  assert.equal(lot11TargetEligibility(lets,sel('health'),env.scene,env.a).ok,false);
  env.b.x=600;assert.equal(lot11TargetEligibility(never,sel('focus'),env.scene,env.a).ok,false);
 }finally{env.reset()}
});
test('v234: pack and charactermancer agree on Never Surrender Reach',()=>{
 const ldb=readFileSync(new URL('../packs/mmc-powers-v0186/000002.log',import.meta.url));assert.ok(ldb.length>200000);
 const a=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(a,/registerNativePriorityLot12Hooks\(\)/);assert.match(a,/selectLot12Allies\(this\)/);
});
test('v234: Body Sphere selects max rank, exact current scene, and protects with RD Health 3',async()=>{
 const caster=actor('caster',{rank:2,items:[sphere]}),target=actor('target');const env=world(caster,target);
 try{assert.equal(isBodySphere(sphere),true);assert.equal(lot12Eligibility(sphere,sel('sphere'),env.scene,env.a).ok,true);
  assert.equal(lot12Eligibility(sphere,sel('sphere',['b','b']),env.scene,env.a).ok,false);
  assert.equal(lot12Eligibility(sphere,sel('sphere',['missing']),env.scene,env.a).ok,false);
  const fx=conc(caster,sphere),m=request(caster,sphere);
  assert.equal((await applyLot12Activation(m,sel('sphere'),{confirm:async()=>true})).ok,true);
  const e=target.effects.find(x=>x.flags?.[S]?.nativeLot12Recipient?.kind==='sphere');assert.ok(e);
  assert.deepEqual(e.changes[0],{key:'system.healthDamageReduction',type:'upgrade',value:3,phase:'initial',priority:null});
  assert.equal(sphereMovementBlocked(env.b,{x:300},{}),true);
  assert.equal(sphereMovementBlocked(env.b,{x:300},{nativeLot12Carry:true}),false);
  assert.equal(sphereMovementBlocked(env.b,{x:300},{}),true); // concentração ainda vigente
  await assert.rejects(()=>applyLot12Activation(m,sel('sphere'),{confirm:async()=>true}),/Ativação já confirmada/);
 }finally{env.reset()}
});
test('v234: Body Sphere co-location follows source without actor ownership changes',async()=>{
 const caster=actor('c',{items:[sphere]}),target=actor('t');const env=world(caster,target);
 env.b.update=async(changes,options)=>{assert.equal(options.nativeLot12Carry,true);Object.assign(env.b,changes)};
 try{conc(caster,sphere);await applyLot12Activation(request(caster,sphere),sel('sphere'),{confirm:async()=>true});
  env.a.x=450;assert.equal(await carrySphereParticipants(env.a),1);assert.equal(env.b.x,450);
  caster.effects=[];
  assert.equal(sphereMovementBlocked(env.b,{x:550},{}),false); // efeito órfão não bloqueia o aliado
  await syncLot12Effects();assert.equal(target.effects.length,0);
 }finally{env.reset()}
});
test('v234: Probability Manipulation Hex replaces only NET Trouble and stops on lost concentration or range',async()=>{
 const caster=actor('caster',{items:[hex]}),target=actor('target');const env=world(caster,target);
 try{assert.equal(isProbabilityHex(hex),true);conc(caster,hex);
  await applyLot12Activation(request(caster,hex),sel('probability'),{confirm:async()=>true});
  assert.ok(activeProbabilityHex(target));
  const base={sources:[{source:'Stunned',sign:-1},{source:'Prone',sign:-1}],net:-2,edges:0,troubles:2,baseMode:0,edgeMode:-1};
  const result=probabilityRollConversion(target,base);assert.equal(result.net,1);assert.equal(result.troubles,0);assert.equal(result.edgeMode,1);
  assert.equal(probabilityRollConversion(target,{...base,net:0}).net,0);
  env.b.x=5000;assert.equal(probabilityRollConversion(target,base).net,-2);
  env.b.x=200;caster.effects=[];assert.equal(probabilityRollConversion(target,base).net,-2);
  await syncLot12Effects();assert.equal(target.effects.length,0);
 }finally{env.reset()}
});
test('v234: Bounce Back ends Caído and does not invent a fall damage rollback',async()=>{
 const a=actor('b',{items:[bounce]});a.statuses.add('mmrpg.prone');const old=globalThis.ChatMessage;
 globalThis.ChatMessage={getSpeaker:()=>({actor:a.id}),create:async()=>({})};
 try{assert.equal(isBounceBack(bounce),true);const result=await bounceBackAfterPay(bounce);
  assert.equal(result.removedProne,true);assert.equal(a.statuses.has('mmrpg.prone'),false);assert.equal(result.fallDamageRequiresGM,true);
 }finally{globalThis.ChatMessage=old}
});
test('v234: Body Sphere’s offensive alternative uses non-damaging Agility vs Agility and conditional restraints',()=>{
 const r=resolvePowerRoll(sphere);assert.equal(r.ability,'agl');assert.equal(r.attackTarget,'agl');assert.equal(r.checkOnly,true);
 assert.ok(POWER_CONDITIONS['Body Sphere']?.some(c=>c.status==='grabbed'&&c.on==='success'));
 assert.ok(POWER_CONDITIONS['Body Sphere']?.some(c=>c.status==='pinned'&&c.on==='fantastic'));
});
