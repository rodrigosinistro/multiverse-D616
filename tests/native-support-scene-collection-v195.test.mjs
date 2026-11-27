import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSupportGMContext,isCasterToken,tokenBelongsToScene,inspectSupportRequest,
  executeNativeSupportTransaction} from '../scripts/native-power-support.mjs';

const powers=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const power=powers.find(i=>i.name==='Healing Hands'&&i.system?.powerSet==='Healing');
assert.ok(power);
function createActor(id,{owner=true,health=30,focus=80,synthetic=false}={}){
 const a={id,uuid:synthetic?`Scene.room.Token.hero.Actor.${id}`:`Actor.${id}`,
   name:id,isToken:synthetic,flags:{},effects:[],
   system:{health:{value:health,max:100},focus:{value:focus,max:100},attributes:{rank:{value:4}},abilities:{vig:{value:4}}},
   items:{contents:[],get(key){return this.contents.find(i=>i.id===key)}},
   testUserPermission(user){return owner&&user?.id==='player'},
   async update(patch){for(const [key,v] of Object.entries(patch)){
     const parts=key.split('.');let obj=this;
     for(const part of parts.slice(0,-1))obj=obj[part]??={};obj[parts.at(-1)]=v;
   }} };
 return a;
}
function make({parent=null,tokenFound=true,secondToken=false,owner=true}={}){
 const world=createActor('worldHero',{owner});
 const synthetic=createActor('worldHero',{owner,synthetic:true});
 const target=createActor('target',{health:20});
 const item={...power,id:'embedded-v195',actor:synthetic,
   flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${power._id}`}}};
 synthetic.items.contents.push(item);
 const scene={id:'room',grid:{size:100}};
 const source={id:'hero',actorId:'worldHero',actor:synthetic,parent,x:0,y:0,width:1,height:1,disposition:1};
 synthetic.token=source;
 const ally={id:'ally',actorId:'target',actor:target,parent,x:100,y:0,width:1,height:1,disposition:1};
 const tokens=[...(tokenFound?[source]:[]),ally];
 if(secondToken)tokens.push({id:'otherHero',actorId:'worldHero',actor:synthetic,parent:scene,x:400,y:0});
 scene.tokens={contents:tokens,get(key){return this.contents.find(t=>t.id===key)}};
 const request={id:'request',sceneId:scene.id,sourceTokenId:'hero',sourceActorId:'worldHero',
  targetIds:['ally'],powerId:power._id,itemId:item.id,spent:10};
 const user={id:'player',isGM:false,active:true};
 return {world,synthetic,target,item,source,ally,scene,request,user};
}
test('v195: GM resolves real token from Scene even without token.parent pointer',async()=>{
 const c=make();
 assert.equal(c.source.parent,null);
 assert.equal(tokenBelongsToScene(c.source,c.scene),true);
 assert.equal(isCasterToken(c.source,c.synthetic,c.scene),true);
 const context=resolveSupportGMContext({requestActor:c.world,request:c.request,scene:c.scene,user:c.user});
 assert.equal(context.caster,c.synthetic);
 assert.equal(context.sourceToken,c.source);
 assert.equal(inspectSupportRequest({...context,scene:c.scene,targetTokens:[c.ally],spent:10}).ok,true);
 const original=globalThis.game;const chat=globalThis.ChatMessage;
 globalThis.game={multiverseD616:{turnTracker:{trackItemUse:async()=>{}}}};
 globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
 try{
  const result=await executeNativeSupportTransaction({...context,scene:c.scene,targetTokens:[c.ally],spent:10});
  assert.equal(result.ok,true);assert.equal(c.synthetic.system.focus.value,70);
  assert.equal(c.target.system.health.value,30);
 }finally{globalThis.game=original;globalThis.ChatMessage=chat;}
});
test('v195: unique owner-authorized base Actor fallback when token ID differs on receiving client',()=>{
 const c=make();
 const request={...c.request,sourceTokenId:'client-side-lookup-mismatch'};
 const context=resolveSupportGMContext({requestActor:c.world,request,scene:c.scene,user:c.user});
 assert.equal(context.sourceToken,c.source);
});
test('v195: fallback is rejected for duplicate owned Actor tokens, unknown scene or unowned Actor',()=>{
 const dup=make({secondToken:true});
 assert.throws(()=>resolveSupportGMContext({requestActor:dup.world,
   request:{...dup.request,sourceTokenId:'missing'},scene:dup.scene,user:dup.user}),/Mais de um token/);
 assert.throws(()=>resolveSupportGMContext({requestActor:dup.world,request:dup.request,
   scene:null,user:dup.user}),/Cena da solicitação/);
 const unowned=make({owner:false});
 assert.throws(()=>resolveSupportGMContext({requestActor:unowned.world,request:unowned.request,
   scene:unowned.scene,user:unowned.user}),/DONO/);
 assert.throws(()=>resolveSupportGMContext({requestActor:unowned.world,
   request:{...unowned.request,sourceTokenId:'missing'},
   scene:unowned.scene,user:unowned.user}),/não encontrado/);
});
test('v195: cannot spoof base Actor ID, another token or mismatched target Scene',()=>{
 const c=make();
 assert.throws(()=>resolveSupportGMContext({requestActor:c.world,
  request:{...c.request,sourceActorId:'otherActor'},scene:c.scene,user:c.user}),/Actor-base informado/);
 assert.throws(()=>resolveSupportGMContext({requestActor:c.world,
  request:{...c.request,sourceTokenId:'ally'},scene:c.scene,user:c.user}),/Actor-base informado/);
 const context=resolveSupportGMContext({requestActor:c.world,request:c.request,scene:c.scene,user:c.user});
 const other={...c.ally,id:'external',parent:{id:'otherScene'}};
 assert.equal(inspectSupportRequest({...context,scene:c.scene,targetTokens:[other],spent:10}).ok,false);
});
