import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeSupportPacket,encodeSupportPacket,registerNativeSupportRequestHooks}
  from '../scripts/native-power-support.mjs';

const SYSTEM='multiverse-d616';
const KEY='nativeSupportPlayerRequestV2';
const RESULT='nativeSupportPlayerResultV2';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const sourcePower=(name,set)=>catalog.find(p=>p.name===name&&p.system?.powerSet===set);
const setPath=(obj,path,value)=>{const parts=path.split('.');let current=obj;
 for(const part of parts.slice(0,-1)) current=current[part]??={};
 current[parts.at(-1)]=value;};
function actor(id,{focus=100,health=100,owner=true}={}){
 return {id,uuid:`Actor.${id}`,name:id,isToken:false,flags:{},effects:[],
  system:{focus:{value:focus,max:150},health:{value:health,max:150},
    attributes:{rank:{value:4}},abilities:{vig:{value:6}}},
  items:{contents:[],get(id){return this.contents.find(i=>i.id===id)}},
  testUserPermission(user){return owner&&user?.id==='player'},
  async update(patch){for(const [key,value] of Object.entries(patch))setPath(this,key,value);return this},
  async createEmbeddedDocuments(_,effects){this.effects.push(...effects);return effects},
  async deleteEmbeddedDocuments(_,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));return ids}};
}
function mockWorld(name,set){
 const player={id:'player',isGM:false,active:true},gm={id:'gm',isGM:true,active:true};
 const channel=actor('world-caster'),source=actor('world-caster',{focus:100});
 source.isToken=true;source.uuid='Scene.scene-v196.Token.token-caster.Actor.world-caster';
 const ally=actor('ally',{health:20,focus:30});
 const p=sourcePower(name,set);assert.ok(p,name);
 const item={...p,id:'item-v196',actor:source,
  flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${p._id}`}}};
 source.items.contents.push(item);
 const scene={id:'scene-v196',grid:{size:100}},
  origin={id:'token-caster',actorId:channel.id,actor:source,x:0,y:0,width:1,height:1,disposition:1},
  target={id:'token-ally',actorId:ally.id,actor:ally,x:100,y:0,width:1,height:1,disposition:1};
 source.token=origin;scene.tokens={contents:[origin,target],get(id){return this.contents.find(t=>t.id===id)}};
 const request={id:`req-${name.replaceAll(' ','-')}`,sceneId:scene.id,sourceTokenId:origin.id,
  sourceActorId:channel.id,itemId:'player-item-copy-id',powerId:p._id,
  targetIds:[target.id],spent:name==='Inspiration'?0:10};
 const combat={id:'battle-v196',started:true,round:1,turn:0,combatants:[{actor:source,actorId:source.id}]};
 return {player,gm,channel,source,ally,scene,request,combat};
}
function foundryLikeDiff(before,after){
 const changed={};for(const [key,value] of Object.entries(after)){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   const diff=foundryLikeDiff(before?.[key]??{},value);
   if(Object.keys(diff).length)changed[key]=diff;
  }else if(before?.[key]!==value)changed[key]=value;
 }return changed;
}

test('v196 regression: updateActor nested-object delta loses scene/source/targets; atomic string retains complete packet',()=>{
 const previous={id:'request-1',sceneId:'scene-v196',sourceTokenId:'token-caster',
  sourceActorId:'world-caster',targetIds:['token-ally'],spent:10,powerId:'1234',itemId:'item1'};
 const next={...previous,id:'request-2',powerId:'5678',itemId:'item2'};
 const diff=foundryLikeDiff(previous,next);
 assert.equal(diff.sceneId,undefined,'old object transport loses unchanged sceneId');
 assert.equal(diff.sourceTokenId,undefined,'old transport loses unchanged origin');
 assert.equal(diff.targetIds,undefined,'old transport loses unchanged targets');
 const before={[KEY]:encodeSupportPacket(previous)},after={[KEY]:encodeSupportPacket(next)};
 const atomic=foundryLikeDiff(before,after);
 assert.equal(typeof atomic[KEY],'string');
 assert.deepEqual(decodeSupportPacket(atomic[KEY]),next);
 assert.equal(decodeSupportPacket({id:'partial'}),null,'reject incomplete legacy object diff');
 assert.equal(decodeSupportPacket('{broken-json'),null);
 assert.equal(decodeSupportPacket('[]'),null);
 assert.equal(decodeSupportPacket(JSON.stringify({id:'request-1',payload:'x'.repeat(9000)})),null);
});

test('v196: 5 powers roundtrip as single atomic string, GM validates, commits once and sends atomic acknowledgement',async()=>{
 for(const [name,set] of [['Healing Hands','Healing'],['Soothing Touch','Healing'],
  ['Rally on Me','Tactics'],['Inspiration','Basic'],['Battle Plan','Tactics']]){
  const env=mockWorld(name,set);
  const old={game:globalThis.game,Hooks:globalThis.Hooks,ChatMessage:globalThis.ChatMessage};
  const hooks=new Map();let trackerUses=0,replies=[];
  globalThis.Hooks={on(kind,callback){hooks.set(kind,[...(hooks.get(kind)??[]),callback])}};
  globalThis.game={user:env.gm,users:{activeGM:env.gm,get(id){return id===env.player.id?env.player:env.gm}},
   scenes:{get(id){return id===env.scene.id?env.scene:null}},combat:env.combat,
   multiverseD616:{turnTracker:{async trackItemUse(){trackerUses++},getState(){return {reactionUsed:0,reactionMax:1}}}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
  const update=env.channel.update.bind(env.channel);
  env.channel.update=async patch=>{if(patch[`flags.${SYSTEM}.${RESULT}`])replies.push(patch);return update(patch)};
  try{
   registerNativeSupportRequestHooks();
   const encoded=encodeSupportPacket(env.request);
   const changes={flags:{[SYSTEM]:{[KEY]:encoded}}};
   // This is exactly the one-key change emitted by Foundry after a serialized
   // flag update. No unpacking/diff of individual sceneId / sourceTokenId leaves.
   for(const handler of hooks.get('updateActor'))handler(env.channel,changes,{},env.player.id);
   for(let n=0;n<50&&!replies.length;n++)await new Promise(resolve=>setImmediate(resolve));
   assert.equal(replies.length,1,`${name}: one GM acknowledgement`);
   const response=decodeSupportPacket(replies[0][`flags.${SYSTEM}.${RESULT}`]);
   assert.equal(response?.ok,true,`${name}: ${JSON.stringify(response)}`);
   assert.equal(response?.id,env.request.id);
   assert.equal(env.source.system.focus.value,100-env.request.spent,`${name}: one Focus charge`);
   assert.equal(env.channel.system.focus.value,100,`${name}: transport Actor unchanged`);
   assert.equal(trackerUses,1,`${name}: one item use`);
   for(const handler of hooks.get('updateActor'))handler(env.channel,changes,{},env.player.id);
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(replies.length,1,`${name}: replay ignored`);
   if(name==='Healing Hands')assert.equal(env.ally.system.health.value,30);
   if(name==='Soothing Touch')assert.equal(env.ally.system.focus.value,40);
   if(name==='Rally on Me')assert.equal(env.ally.system.focus.value,50);
   if(name==='Inspiration'||name==='Battle Plan')assert.equal(env.ally.effects.length,1);
  }finally{Object.assign(globalThis,old)}
 }
});

test('v196: untrusted packet object or wrong actor owner cannot trigger the GM transaction',async()=>{
 const env=mockWorld('Healing Hands','Healing');
 const old={game:globalThis.game,Hooks:globalThis.Hooks};const hooks=new Map(),replies=[];
 globalThis.Hooks={on(kind,callback){hooks.set(kind,[...(hooks.get(kind)??[]),callback])}};
 globalThis.game={user:env.gm,users:{activeGM:env.gm,get(id){return id===env.player.id?env.player:env.gm}},
  scenes:{get(){return env.scene}},combat:env.combat};
 env.channel.update=async patch=>replies.push(patch);
 try{
  registerNativeSupportRequestHooks();
  const send=(packet)=>{for(const h of hooks.get('updateActor'))h(env.channel,{flags:{[SYSTEM]:{[KEY]:packet}}},{},env.player.id)};
  send({id:env.request.id}); // legacy partial object: rejected
  send('not json');
  env.channel.testUserPermission=()=>false;
  send(encodeSupportPacket(env.request));
  await new Promise(r=>setImmediate(r));
  assert.equal(replies.length,0);
  assert.equal(env.source.system.focus.value,100);
  assert.equal(env.ally.system.health.value,20);
 }finally{Object.assign(globalThis,old)}
});
