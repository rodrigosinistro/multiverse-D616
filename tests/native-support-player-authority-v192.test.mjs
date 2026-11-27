import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSupportGMContext,executeNativeSupportTransaction,isCasterToken,registerNativeSupportRequestHooks,encodeSupportPacket,decodeSupportPacket}
  from '../scripts/native-power-support.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
let seq=0;
const setPath=(obj,key,value)=>{let current=obj;const parts=key.split('.');
  for(const part of parts.slice(0,-1))current=current[part]??={};current[parts.at(-1)]=value;};
function makeActor({id=`p${++seq}`,uuid=`Actor.${id}`,focus=50,health=30,rank=4}={}){
  const actor={id,uuid,name:id,flags:{},effects:[],system:{focus:{value:focus,max:100},
    health:{value:health,max:100},abilities:{vig:{value:5}},attributes:{rank:{value:rank}}},
    powers:[],items:{contents:[],get(itemId){return this.contents.find(i=>i.id===itemId)}},
    testUserPermission(user){return user?.id==='player'},
    async update(patch){for(const [key,value] of Object.entries(patch))setPath(this,key,value);return this;},
    async createEmbeddedDocuments(_type,effects){this.effects.push(...effects);return effects;},
    async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));return ids;}};
  return actor;
}
function addPower(actor,name,powerSet,id=null){
  const from=catalog.find(x=>x.name===name&&x.system.powerSet===powerSet);assert.ok(from);
  const item={...from,id:id??from._id,actor,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${from._id}`}}};
  actor.powers.push(item);actor.items.contents.push(item);
  return {item,powerId:from._id};
}
function setup(name,set,{differentItemId=true,linked=false}={}){
  const user={id:'player',isGM:false,active:true}, base=makeActor(),
    effective=linked?base:makeActor({id:base.id,uuid:`Scene.room1.Token.origin.Actor.${base.id}`});
  const target=makeActor({health:20,focus:30});
  const client=addPower(base,name,set,'imported-id');
  const item=linked?client:addPower(effective,name,set,differentItemId?'synthetic-item-id':'imported-id');
  const scene={id:'room1',grid:{size:100}};
  const source={id:'origin',actorId:base.id,actor:effective,parent:scene,disposition:1,x:0,y:0,width:1,height:1};
  const ally={id:'ally',actorId:target.id,actor:target,parent:scene,disposition:1,x:100,y:0,width:1,height:1};
  scene.tokens={contents:[source,ally],get(id){return this.contents.find(t=>t.id===id)}};
  const request={id:'request-1',sceneId:scene.id,sourceTokenId:source.id,itemId:client.item.id,
    powerId:item.powerId,targetIds:[ally.id],spent:name==='Inspiration'?0:10};
  const combat={id:'battle',started:true,round:2,turn:1,combatants:[{actor:effective,actorId:effective.id,id:'c1'}]};
  return {user,base,effective,target,item:item.item,source,ally,scene,request,combat};
}
function withGM(context){
  const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  let count=0;
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',isGM:true},get:id=>id==='player'?context.user:null},
    combat:context.combat,multiverseD616:{turnTracker:{async trackItemUse(){count++},
      getState(){return {reactionUsed:0,reactionMax:1}}}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
  return {get count(){return count},restore(){Object.assign(globalThis,old)}};
}

test('v192: GM resolves five support powers from unlinked Token Actor, not the base Actor hook',async()=>{
  const powers=[['Healing Hands','Healing'],['Soothing Touch','Healing'],
    ['Rally on Me','Tactics'],['Inspiration','Basic'],['Battle Plan','Tactics']];
  for(const [name,set] of powers){
    const env=setup(name,set), gm=withGM(env);
    try{
      const resolved=resolveSupportGMContext({requestActor:env.base,request:env.request,
        scene:env.scene,user:env.user});
      assert.equal(resolved.caster,env.effective,`${name}: effective token actor`);
      assert.equal(resolved.item,env.item,`${name}: authoritative token item`);
      const beforeBaseFocus=env.base.system.focus.value;
      const response=await executeNativeSupportTransaction({caster:resolved.caster,item:resolved.item,
        scene:env.scene,sourceToken:resolved.sourceToken,targetTokens:[env.ally],
        spent:env.request.spent,combat:env.combat});
      assert.equal(response.ok,true,name);
      assert.equal(env.base.system.focus.value,beforeBaseFocus,`${name}: base is not debited`);
      assert.equal(env.effective.system.focus.value,50-env.request.spent,`${name}: token debited exactly once`);
      assert.equal(gm.count,1,`${name}: one tracked activation`);
      if(name==='Healing Hands')assert.equal(env.target.system.health.value,30);
      if(name==='Soothing Touch')assert.equal(env.target.system.focus.value,40);
      if(name==='Rally on Me')assert.equal(env.target.system.focus.value,50);
      if(name==='Inspiration'||name==='Battle Plan')assert.equal(env.target.effects.length,1);
    } finally{gm.restore();}
  }
});
test('v192: linked actor works with exact item identity',()=>{
  const env=setup('Healing Hands','Healing',{differentItemId:false,linked:true});
  const found=resolveSupportGMContext({requestActor:env.base,request:env.request,scene:env.scene,user:env.user});
  assert.equal(found.caster,env.base);assert.equal(found.item,env.item);
});
test('v192: identity/permission/caster spoofing blocked by authenticated Actor and original Power ID',()=>{
  const env=setup('Healing Hands','Healing');
  const call=(patch={},actor=env.base,user=env.user)=>resolveSupportGMContext({
    requestActor:actor,request:{...env.request,...patch},scene:env.scene,user});
  assert.throws(()=>call({sourceTokenId:'ally'}),/Poder oficial indisponível/);
  assert.throws(()=>call({powerId:'9I9DWkokKaIbn5Z6'}),/Poder oficial indisponível|não corresponde/);
  assert.throws(()=>call({powerId:'not-an-id'}),/Identidade do poder inválida/);
  assert.throws(()=>call({},env.base,{id:'other'}),/DONO/);
  assert.equal(isCasterToken(env.source,env.base,env.scene),true);
  env.effective.items.contents.length=0;
  assert.throws(()=>call(),/Poder oficial indisponível/);
});
test('v192: refuses ambiguous compendium identity if two nonmatching embedded Item IDs exist',()=>{
  const env=setup('Healing Hands','Healing');
  addPower(env.effective,'Healing Hands','Healing','another-item-id');
  assert.throws(()=>resolveSupportGMContext({requestActor:env.base,request:env.request,
    scene:env.scene,user:env.user}),/Poder oficial indisponível/);
});
test('v192: GM updateActor hook processes player request once and posts result to request Actor',async()=>{
  const env=setup('Healing Hands','Healing');
  const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage,Hooks:globalThis.Hooks};
  const gm=withGM(env),hooks=new Map(),responses=[];
  globalThis.game.scenes={get:id=>id===env.scene.id?env.scene:null};
  globalThis.Hooks={on(event,fn){const previous=hooks.get(event)??[];hooks.set(event,[...previous,fn])}};
  const update=env.base.update.bind(env.base);
  env.base.update=async changes=>{responses.push(changes);return update(changes)};
  try{
    registerNativeSupportRequestHooks();
    const changes={flags:{'multiverse-d616':{nativeSupportPlayerRequestV2:encodeSupportPacket(env.request)}}};
    for(const fn of hooks.get('updateActor'))fn(env.base,changes,{},'player');
    // gmProcess is async, initiated by a Foundry hook and deliberately not awaited there.
    for(let n=0;n<15&&responses.length===0;n++)await new Promise(resolve=>setImmediate(resolve));
    assert.equal(responses.length,1);
    const result=decodeSupportPacket(responses[0]['flags.multiverse-d616.nativeSupportPlayerResultV2']);
    assert.equal(result?.ok,true);
    assert.equal(result?.id,env.request.id);
    assert.equal(env.effective.system.focus.value,40);
    assert.equal(env.target.system.health.value,30);
    assert.equal(gm.count,1);
  }finally{gm.restore();globalThis.Hooks=old.Hooks;}
});
