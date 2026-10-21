import test from 'node:test';
import assert from 'node:assert/strict';
import {isResizeOtherPower,availableResizeOtherChoices,hasGrabbedStatus,withinTouch,
  validateResizeOtherUse,applyResizeOtherToTarget,promptResizeOtherChoice,registerResizeOtherSocket,requestResizeOther} from '../scripts/resize-other.mjs';
import { applyGrowChoice } from '../scripts/grow-size.mjs';
import { applyShrinkChoice } from '../scripts/shrink-size.mjs';
import { effectiveActorTokenSize } from '../scripts/token-size.mjs';
const SYSTEM='multiverse-d616';
let id=0;
const sizeIds=['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan'];
const sizeConfig={sizeEffects:Object.fromEntries(sizeIds.map(key=>[key,{
  name:key+' Effects',flags:{[SYSTEM]:{managedSize:true}},changes:[
    {key:'system.size',value:key,mode:5},
    {key:'system.abilities.mle.defense',value:key==='huge'?-2:0,mode:2},
  ]}]))};
const place=(actor,{x=0,y=0,size=1,linked=true}={})=>{
 const t={id:`t${++id}`,uuid:`Scene.TEST.Token.t${id}`,name:actor.name,
  parent:{id:'TEST'},actor,actorLink:linked,x,y,width:size,height:size,depth:size,
  async update(patch){Object.assign(this,patch)},};
 actor.token=t;
 return t;
};
function actor(name,powers=[],{natural='average',rank=3,synthetic=false}={}){
 const a={id:`actor${++id}`,uuid:`Actor.a${id}`,name,isToken:synthetic,isOwner:true,
  _source:{system:{size:natural}},system:{size:natural,attributes:{rank:{value:rank}}},
  items:{contents:powers.map((p,i)=>({name:p,type:'power',id:`item-${i}`}))},
  effects:{contents:[]},prototypeToken:{width:1,height:1,depth:1},
  async update(patch){for(const[k,v]of Object.entries(patch)){if(k.startsWith('prototypeToken.'))this.prototypeToken[k.slice(15)]=v;}},
  async createEmbeddedDocuments(type,rows){assert.equal(type,'ActiveEffect');for(const row of rows)this.effects.contents.push({...structuredClone(row),id:`fx-${++id}`});},
  async deleteEmbeddedDocuments(type,keys){assert.equal(type,'ActiveEffect');this.effects.contents=this.effects.contents.filter(e=>!keys.includes(e.id));},
  getActiveTokens(){return this.isToken?[this.token]:this.placed??[]},
 };
 return a;
}
function setup(){
 const a=actor('Caster',['Grow 3','Shrink 2']);const b=actor('Target');
 const source=place(a),target=place(b,{x:100});a.placed=[source];b.placed=[target];
 return{a,b,source,target,item:{id:'resize-item',name:'Resize Other',type:'power'}};
}

test('Only Resize Other(s) qualifies; Resize Object remains completely unchanged',()=>{
 for(const name of ['Resize Other','resize other','Resize Others'])assert.equal(isResizeOtherPower({name,type:'power'}),true);
 for(const name of ['Resize Object','Resize Other 2','Grow 3'])assert.equal(isResizeOtherPower({name,type:'power'}),false);
});
test('Rank and owned Grow/Shrink levels strictly constrain selectable sizes',()=>{
 const {a,b}=setup();
 assert.deepEqual(availableResizeOtherChoices(a,b).map(x=>x.key),['normal','tiny','little','big','huge','gigantic','titanic']);
 a.system.attributes.rank.value=2;
 assert.deepEqual(availableResizeOtherChoices(a,b),[]);
 a.system.attributes.rank.value=3;
 a.items.contents=[{type:'power',name:'Grow 1'}];
 assert.deepEqual(availableResizeOtherChoices(a,b).map(x=>x.key),['normal']);
 a.items.contents=[{type:'power',name:'Shrink 4'}];
 assert.deepEqual(availableResizeOtherChoices(a,b).map(x=>x.key),['normal','microscopic','miniature','tiny','little']);
 b._source.system.size='huge';
 assert.deepEqual(availableResizeOtherChoices(a,b).map(x=>x.key),['normal','microscopic','miniature','tiny','little']);
});
test('Touch requires tokens on same scene and near enough; no remote resizing',()=>{
 const {source,target}=setup();
 assert.equal(withinTouch(source,target,100),true);
 target.x=305;
 assert.equal(withinTouch(source,target,100),false);
 target.x=100;target.parent={id:'OTHER'};
 assert.equal(withinTouch(source,target,100),false);
});
test('Resistant targets must be grabbed first; willing targets can be resized',()=>{
 const {a,b,source,target,item}=setup();
 const p={caster:a,item,targetToken:target,sourceToken:source,choice:'gigantic',gridSize:100};
 assert.throws(()=>validateResizeOtherUse({...p,voluntary:false}),/agarrá-lo primeiro/);
 b.effects.contents.push({id:'grapple',statuses:['mmrpg.grabbed'],disabled:false});
 assert.equal(hasGrabbedStatus(b),true);
 assert.equal(validateResizeOtherUse({...p,voluntary:false}).target,b);
 assert.equal(validateResizeOtherUse({...p,voluntary:true}).target,b);
 assert.throws(()=>validateResizeOtherUse({...p,choice:'gargantuan',voluntary:true}),/fora do limite/);
 assert.throws(()=>validateResizeOtherUse({...p,choice:'normal',voluntary:true}),/não possui Resize Other/);
});
test('Resize Other affects target tokens and not caster, preserving target natural size',async()=>{
 const {a,b,source,target,item}=setup();
 await applyResizeOtherToTarget(b,'gigantic',a,item,sizeConfig);
 assert.equal(effectiveActorTokenSize(b),'gigantic');
 assert.equal(target.width,5);assert.equal(target.height,5);assert.equal(target.depth,5);
 assert.equal(source.width,1);
 assert.equal(b._source.system.size,'average');
 assert.equal(b.effects.contents.filter(e=>e.flags?.[SYSTEM]?.resizeOtherChoice).length,1);
 await applyResizeOtherToTarget(b,'tiny',a,item,sizeConfig);
 assert.equal(b.effects.contents.filter(e=>e.flags?.[SYSTEM]?.resizeOtherChoice).length,1);
 assert.equal(target.width,.5);
 await applyResizeOtherToTarget(b,'normal',a,item,sizeConfig);
 assert.equal(target.width,1);assert.equal(effectiveActorTokenSize(b),'average');
 assert.equal(b.effects.contents.length,0);
});
test('When target was grown by its own power, Restore revives prior effect without doubling bonuses',async()=>{
 const {a,b,item,target}=setup();
 await applyGrowChoice(b,{type:'power',name:'Grow 4',id:'g4'},'huge',sizeConfig);
 assert.equal(target.width,3);
 await applyResizeOtherToTarget(b,'tiny',a,item,sizeConfig);
 assert.equal(target.width,.5);
 assert.equal(b.effects.contents.filter(e=>e.flags?.[SYSTEM]?.growChoice).length,0);
 await applyResizeOtherToTarget(b,'normal',a,item,sizeConfig);
 assert.equal(target.width,3);
 assert.equal(b.effects.contents.filter(e=>e.flags?.[SYSTEM]?.growChoice).length,1);
 await applyShrinkChoice(b,{type:'power',name:'Shrink 4',id:'s4'},'little',sizeConfig);
 assert.equal(target.width,.7);
 assert.equal(b.effects.contents.filter(e=>e.flags?.[SYSTEM]?.resizeOtherChoice).length,0);
});
test('A synthetic NPC resizes only its placed token, never the base prototype',async()=>{
 const {a,item}=setup();
 const b=actor('NPC',[],{synthetic:true});const t=place(b,{x:100,linked:false});
 await applyResizeOtherToTarget(b,'huge',a,item,sizeConfig);
 assert.equal(t.width,3);
 assert.equal(b.prototypeToken.width,1);
 await applyResizeOtherToTarget(b,'normal',a,item,sizeConfig);
 assert.equal(t.width,1);
});
test('Prompt cancellation never applies size; explicit single target required',async()=>{
 const {a,item,target}=setup();
 const user={targets:new Set([target])};
 const api={DialogV2:{wait:async()=>null}};
 globalThis.game={user};globalThis.foundry={applications:{api}};
 globalThis.canvas={scene:{id:'TEST',grid:{size:100}},grid:{size:100},tokens:{placeables:[a.token]}};
 assert.equal(await promptResizeOtherChoice(item,a),null);
 user.targets=new Set([]);
 await assert.rejects(()=>promptResizeOtherChoice(item,a),/exatamente um/);
 user.targets=new Set([target]);
 api.DialogV2.wait=async()=>({choice:'titanic',voluntary:true});
 const prompt=await promptResizeOtherChoice(item,a);
 assert.equal(prompt.choice,'titanic');assert.equal(prompt.targetTokenUuid,target.uuid);
});
console.log('Resize Other tests registered.');

test('Authoritative GM request validates ownership and applies to target without editing caster',async()=>{
 const {a,b,source,target,item}=setup();
 a.items.contents.push(item);
 a.items.get=key=>a.items.contents.find(i=>i.id===key);
 a.testUserPermission=(user,level)=>user.id==='PLAYER'&&level==='OWNER';
 const gm={id:'GM',isGM:true,active:true};
 const player={id:'PLAYER',isGM:false,active:true};
 const entries=new Map([[a.uuid,a],[source.uuid,source],[target.uuid,target]]);
 globalThis.fromUuid=async uuid=>entries.get(uuid)??null;
 globalThis.CONFIG={MULTIVERSE_D616:sizeConfig};
 globalThis.canvas={scene:{id:'TEST'},grid:{size:100},tokens:{placeables:[source]}};
 globalThis.game={user:gm,users:{activeGM:gm,get:key=>key==='PLAYER'?player:gm}};
 const result=await requestResizeOther(a,item,{
   targetTokenUuid:target.uuid,casterTokenUuid:source.uuid,choice:'gigantic',voluntary:true,
 });
 assert.equal(result.category,'gigantic'); assert.equal(target.width,5);
 assert.equal(source.width,1);
 await assert.rejects(()=>requestResizeOther(a,item,{
   targetTokenUuid:target.uuid,casterTokenUuid:source.uuid,choice:'gargantuan',voluntary:true,
 }),/fora do limite/);
});

test('The GM socket rejects unowned casters and emits a denial',async()=>{
 const {a,source,target,item}=setup();
 a.items.contents.push(item);a.items.get=key=>a.items.contents.find(i=>i.id===key);
 a.testUserPermission=()=>false;
 const gm={id:'GM',isGM:true,active:true};
 const player={id:'PLAYER',active:true,isGM:false};
 const entries=new Map([[a.uuid,a],[source.uuid,source],[target.uuid,target]]);
 globalThis.fromUuid=async uuid=>entries.get(uuid)??null;
 globalThis.CONFIG={MULTIVERSE_D616:sizeConfig};
 globalThis.canvas={scene:{id:'TEST'},grid:{size:100}};
 let listener;let reply;
 globalThis.game={user:gm,multiverseD616:{},users:{activeGM:gm,get:()=>player},
   socket:{on:(name,cb)=>{listener=cb},emit:(name,data)=>{reply=data}}};
 registerResizeOtherSocket();
 listener({scope:'resize-other-v0214',type:'REQUEST',requestId:'REQ',requesterId:'PLAYER',
  casterUuid:a.uuid,itemId:item.id,targetTokenUuid:target.uuid,casterTokenUuid:source.uuid,
  choice:'big',voluntary:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(reply?.type,'RESULT');assert.equal(reply?.ok,false);
 assert.equal(target.width,1);
});

test('A GM must confirm another user’s claim that an ungrabbed NPC is willing',async()=>{
 const {a,b,source,target,item}=setup();
 a.items.contents.push(item);a.items.get=key=>a.items.contents.find(i=>i.id===key);
 a.testUserPermission=()=>true;
 b.testUserPermission=()=>false;
 const gm={id:'GM',isGM:true,active:true};
 const player={id:'PLAYER',active:true,isGM:false};
 const entries=new Map([[a.uuid,a],[source.uuid,source],[target.uuid,target]]);
 globalThis.fromUuid=async uuid=>entries.get(uuid)??null;
 globalThis.CONFIG={MULTIVERSE_D616:sizeConfig};
 globalThis.canvas={scene:{id:'TEST'},grid:{size:100}};
 let confirmCount=0;
 globalThis.foundry={applications:{api:{DialogV2:{confirm:async()=>{confirmCount++;return false;}}}}};
 let listener;let reply;
 globalThis.game={user:gm,multiverseD616:{},users:{activeGM:gm,get:()=>player},
  socket:{on:(_name,cb)=>{listener=cb},emit:(_name,data)=>{reply=data}}};
 registerResizeOtherSocket();
 listener({scope:'resize-other-v0214',type:'REQUEST',requestId:'NO-CONSENT',requesterId:'PLAYER',
  casterUuid:a.uuid,itemId:item.id,targetTokenUuid:target.uuid,casterTokenUuid:source.uuid,
  choice:'big',voluntary:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(confirmCount,1); assert.equal(reply?.ok,false); assert.equal(target.width,1);
 globalThis.foundry.applications.api.DialogV2.confirm=async()=>{confirmCount++;return true;};
 listener({scope:'resize-other-v0214',type:'REQUEST',requestId:'YES-CONSENT',requesterId:'PLAYER',
  casterUuid:a.uuid,itemId:item.id,targetTokenUuid:target.uuid,casterTokenUuid:source.uuid,
  choice:'huge',voluntary:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(confirmCount,2); assert.equal(reply?.ok,true); assert.equal(target.width,3);
});
