import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSupportGMContext,executeNativeSupportTransaction,registerNativeSupportRequestHooks,encodeSupportPacket,decodeSupportPacket}
  from '../scripts/native-power-support.mjs';

// Regression for the real v0.2.193 GM failure: a player-owned Actor carrying
// the authenticated request had an ID different from the GM token's actorId.
// Transport identity is NOT an authority to control a token. The token's
// effective Actor permission and the registered embedded power are authority.
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
let sequence=0;
const set=(obj,path,value)=>{
  const parts=path.split('.');let p=obj;
  for(const part of parts.slice(0,-1))p=p[part]??={};
  p[parts.at(-1)]=value;
};
function actor(id,{focus=50,health=50,owner=true,synthetic=false}={}){
  return {id,uuid:synthetic?`Scene.room.Token.origin.Actor.${id}`:`Actor.${id}`,
    isToken:synthetic,name:id,flags:{},effects:[],
    system:{focus:{value:focus,max:100},health:{value:health,max:100},
      abilities:{vig:{value:5}},attributes:{rank:{value:4}}},
    items:{contents:[],get(key){return this.contents.find(i=>i.id===key)}},
    testUserPermission(user){return owner&&user?.id==='player';},
    async update(patch){for(const [key,value] of Object.entries(patch))set(this,key,value);return this;},
    async createEmbeddedDocuments(_type,docs){this.effects.push(...docs);return docs;},
    async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(x=>!ids.includes(x.id));return ids;}};
}
function setup(name,setName){
  const original=items.find(x=>x.name===name&&x.system.powerSet===setName);
  assert.ok(original,`${setName}: ${name} exists`);
  const scene={id:'room',grid:{size:100}};
  const channel=actor(`transport-${++sequence}`);  // this ID differs from GM token.actorId
  const caster=actor(`gm-source-${sequence}`,{synthetic:true});
  const target=actor(`ally-${sequence}`,{health:20,focus:30});
  const power={...original,id:`local-power-${sequence}`,actor:caster,
    flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${original._id}`}}};
  caster.items.contents.push(power);
  const source={id:'origin',actorId:caster.id,actor:caster,parent:scene,x:0,y:0,
    width:1,height:1,disposition:1};caster.token=source;
  const ally={id:'ally',actorId:target.id,actor:target,parent:scene,x:100,y:0,
    width:1,height:1,disposition:1};
  scene.tokens={contents:[source,ally],get(key){return this.contents.find(t=>t.id===key)}};
  const request={id:`req-${sequence}`,sceneId:scene.id,sourceTokenId:source.id,
    targetIds:[ally.id],itemId:'item-from-player-client',powerId:original._id,
    spent:name==='Inspiration'?0:10};
  const user={id:'player',isGM:false,active:true};
  const combat={id:'combat',started:true,round:2,turn:0,
    combatants:[{id:'combatant',actor:caster,actorId:caster.id}]};
  return {channel,caster,target,power,source,ally,scene,request,user,combat};
}
function gmEnvironment(env){
  const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  let uses=0;globalThis.game={user:{id:'gm',isGM:true,active:true},
    users:{activeGM:{id:'gm',isGM:true,active:true},get(id){return id==='player'?env.user:{id:'gm',isGM:true,active:true}}},
    scenes:{get:id=>id===env.scene.id?env.scene:null},combat:env.combat,
    multiverseD616:{turnTracker:{async trackItemUse(){uses++},
      getState(){return {reactionUsed:0,reactionMax:1}}}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
  return {get uses(){return uses},restore(){globalThis.game=old.game;globalThis.ChatMessage=old.ChatMessage}};
}
test('v194: 5 support powers authorize player-owned GM token despite different transport Actor ID',async()=>{
  for(const [name,setName] of [['Healing Hands','Healing'],['Soothing Touch','Healing'],
    ['Rally on Me','Tactics'],['Inspiration','Basic'],['Battle Plan','Tactics']]){
    const env=setup(name,setName),gm=gmEnvironment(env);
    try{
      assert.notEqual(env.channel.id,env.source.actorId);
      const {caster,item,sourceToken}=resolveSupportGMContext({requestActor:env.channel,
        request:env.request,scene:env.scene,user:env.user});
      assert.equal(caster,env.caster);
      assert.equal(item,env.power);
      assert.equal(sourceToken,env.source);
      const result=await executeNativeSupportTransaction({caster,item,scene:env.scene,sourceToken,
        targetTokens:[env.ally],spent:env.request.spent,combat:env.combat});
      assert.equal(result.ok,true,name);
      assert.equal(env.channel.system.focus.value,50,'world transport Actor is never charged');
      assert.equal(env.caster.system.focus.value,50-env.request.spent,'synthetic caster charged once');
      assert.equal(gm.uses,1);
      if(name==='Healing Hands')assert.equal(env.target.system.health.value,30);
      if(name==='Soothing Touch')assert.equal(env.target.system.focus.value,40);
      if(name==='Rally on Me')assert.equal(env.target.system.focus.value,50);
      if(['Inspiration','Battle Plan'].includes(name))assert.equal(env.target.effects.length,1);
    }finally{gm.restore();}
  }
});
test('v194: actor transport is not token control: source ownership and official power remain mandatory',()=>{
  const e=setup('Healing Hands','Healing');
  const resolve=(patch={})=>resolveSupportGMContext({requestActor:e.channel,request:{...e.request,...patch},
    scene:e.scene,user:e.user});
  assert.equal(resolve().caster,e.caster);
  e.caster.testUserPermission=()=>false;
  assert.throws(()=>resolve(),/DONO/,'owner of transport alone cannot control source');
  e.caster.testUserPermission=()=>true;
  e.channel.testUserPermission=()=>false;
  assert.throws(()=>resolve(),/DONO/,'non-owner cannot use transport');
  e.channel.testUserPermission=()=>true;
  assert.throws(()=>resolve({sourceTokenId:'unseen-token'}),/Token de origem não encontrado/);
  assert.throws(()=>resolve({powerId:'9I9DWkokKaIbn5Z6'}),/Poder oficial indisponível|não corresponde/);
  assert.throws(()=>resolve({powerId:'unsafe-code'}),/Identidade do poder inválida/);
  e.caster.items.contents=[];
  assert.throws(()=>resolve(),/Poder oficial indisponível/);
});
test('v194: GM hook authenticates sender, executes once, and replies on same independent channel',async()=>{
  const e=setup('Healing Hands','Healing');const gm=gmEnvironment(e);
  const oldHooks=globalThis.Hooks;let replies=0;
  const hooks=new Map();globalThis.Hooks={on(event,fn){hooks.set(event,[...(hooks.get(event)??[]),fn]);}};
  const update=e.channel.update.bind(e.channel);
  e.channel.update=async patch=>{
    if(patch['flags.multiverse-d616.nativeSupportPlayerResultV2'])replies++;
    return update(patch);
  };
  try{
    registerNativeSupportRequestHooks();
    const changes={flags:{'multiverse-d616':{nativeSupportPlayerRequestV2:encodeSupportPacket(e.request)}}};
    for(const hook of hooks.get('updateActor'))hook(e.channel,changes,{},'player');
    for(let n=0;n<30&&replies===0;n++)await new Promise(r=>setImmediate(r));
    assert.equal(replies,1);
    assert.equal(decodeSupportPacket(e.channel.flags['multiverse-d616'].nativeSupportPlayerResultV2).ok,true);
    assert.equal(e.caster.system.focus.value,40);
    assert.equal(e.target.system.health.value,30);
    assert.equal(gm.uses,1);
    // A repeated update with the same authenticated request never replays it.
    for(const hook of hooks.get('updateActor'))hook(e.channel,changes,{},'player');
    await new Promise(r=>setImmediate(r));
    assert.equal(replies,1);
    assert.equal(e.caster.system.focus.value,40);
  }finally{gm.restore();globalThis.Hooks=oldHooks;}
});
