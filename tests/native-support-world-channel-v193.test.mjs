import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchNativeSupportPower,isCasterToken,supportRequestChannel,resolveSupportGMContext,registerNativeSupportRequestHooks,decodeSupportPacket,encodeSupportPacket}
  from '../scripts/native-power-support.mjs';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const original=(name,set)=>catalog.find(i=>i.name===name&&i.system.powerSet===set);
function makeContext(name='Inspiration',set='Basic'){
  const id='BbaseActor0012345',user={id:'player',isGM:false,active:true},gm={id:'gm',isGM:true,active:true};
  const base={id,uuid:`Actor.${id}`,isToken:false,flags:{},testUserPermission:u=>u?.id==='player'};
  const caster={id,uuid:`Scene.scene1.Token.origin.Actor.${id}`,isToken:true,flags:{},
    system:{focus:{value:70,max:100},abilities:{vig:{value:4}},attributes:{rank:{value:4}}},
    testUserPermission:u=>u?.id==='player'};
  const orig=original(name,set);assert.ok(orig);
  const item={...orig,id:'itemSynthetic123',actor:caster,
    flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${orig._id}`}}};
  caster.items={contents:[item],get:key=>key===item.id?item:null};
  const allyActor={id:'ally',name:'Ally',system:{health:{value:20,max:100},focus:{value:30,max:100}}};
  const scene={id:'scene1',grid:{size:100}},source={id:'origin',actorId:id,actor:caster,
    baseActor:base,parent:scene,x:0,y:0,width:1,height:1,disposition:1},
    ally={id:'allyToken',actorId:'ally',actor:allyActor,parent:scene,
      x:100,y:0,width:1,height:1,disposition:1};
  caster.token=source;
  scene.tokens={contents:[source,ally],get(key){return this.contents.find(t=>t.id===key)}};
  return {scene,base,caster,item,source,ally,user,gm};
}
test('v193: stable world Actor channel for unlinked tokens, not an ActorDelta or synthetic token update',()=>{
  const e=makeContext();const prev=globalThis.game;globalThis.game={actors:{get:()=>e.base}};
  try{
    assert.equal(isCasterToken(e.source,e.caster,e.scene),true);
    assert.equal(isCasterToken(e.source,e.base,e.scene),true);
    assert.equal(supportRequestChannel(e.caster,e.source),e.base);
    // A synthetic Actor representing a different token cannot impersonate this one.
    assert.equal(isCasterToken(e.source,{...e.caster,uuid:'Scene.scene1.Token.other.Actor.BbaseActor0012345',
      token:{id:'other',parent:e.scene}},e.scene),false);
  }finally{globalThis.game=prev;}
});
test('v193: GM matches authenticated base Actor to requested token, keeps synthetic Item effects',()=>{
  const e=makeContext('Soothing Touch','Healing');
  const request={sourceTokenId:e.source.id,itemId:'different-base-item-id',powerId:original('Soothing Touch','Healing')._id};
  const match=resolveSupportGMContext({requestActor:e.base,request,scene:e.scene,user:e.user});
  assert.equal(match.caster,e.caster);assert.equal(match.item,e.item);
  // Transport channel and effective token Actor may have different world IDs.
  assert.equal(resolveSupportGMContext({requestActor:{...e.base,id:'differentActor'},request,
    scene:e.scene,user:e.user}).caster,e.caster);
  assert.throws(()=>resolveSupportGMContext({requestActor:{...e.base,isToken:true},request,
    scene:e.scene,user:e.user}),/Canal de solicitação inválido/);
  e.caster.testUserPermission=()=>false;
  assert.throws(()=>resolveSupportGMContext({requestActor:e.base,request,
    scene:e.scene,user:e.user}),/DONO/);
});
test('v193: player dispatch sends only to base Actor and receives authenticated GM acknowledgment',async()=>{
  const e=makeContext();const old={game:globalThis.game,canvas:globalThis.canvas,
    foundry:globalThis.foundry,Hooks:globalThis.Hooks,ui:globalThis.ui};
  const hooks=new Map(),patches=[];let syntheticUpdates=0,selected=['allyToken'];
  e.caster.update=async()=>{syntheticUpdates++;throw Error('Synthetic Actor channel must not be written');};
  globalThis.Hooks={on(key,fn){hooks.set(key,[...(hooks.get(key)??[]),fn])}};
  globalThis.game={user:{...e.user,get targets(){return new Set(selected.map(key=>({document:e.scene.tokens.get(key)})));},
    async updateTokenTargets(ids){selected=ids;}},users:{activeGM:e.gm,get:key=>key==='gm'?e.gm:e.user},
    combat:{id:'c1',started:true,round:1,turn:0},settings:{get:()=> 'manual'},
    actors:{get:key=>key===e.base.id?e.base:null}};
  globalThis.canvas={scene:e.scene,tokens:{controlled:[{document:e.source}]}};
  globalThis.foundry={utils:{randomID:()=> 'reqWorldV193'},applications:{api:{DialogV2:{wait:async data=>{
    const action=data.buttons.some(b=>b.action==='marked')?'marked':'yes';
    const btn=data.buttons.find(b=>b.action===action);
    return btn.callback({}, {form:{elements:{namedItem:()=>({value:'0'})}}},{});
  }}}}};
  const messages=[];globalThis.ui={notifications:{info:v=>messages.push(v),warn:v=>messages.push(`ERR:${v}`)}};
  e.base.update=async patch=>{
    patches.push(patch);
    const request=decodeSupportPacket(patch['flags.multiverse-d616.nativeSupportPlayerRequestV2']);
    assert.equal(request.sourceTokenId,'origin');
    assert.equal(request.itemId,e.item.id);
    // On another client the GM response is a world Actor update from user 'gm'.
    const changes={flags:{'multiverse-d616':{nativeSupportPlayerResultV2:encodeSupportPacket({
      id:request.id,ok:true,events:['ally granted Edge']})}}};
    for(const fn of hooks.get('updateActor')??[])fn(e.base,changes,{},'gm');
  };
  try{
    registerNativeSupportRequestHooks();
    assert.equal(hooks.has('updateToken'),false,'no synthetic ActorDelta result channel');
    assert.equal(await dispatchNativeSupportPower(e.item),true);
    assert.equal(patches.length,1);
    assert.equal(syntheticUpdates,0);
    assert.ok(messages.some(m=>m.includes('Edge')));
  }finally{Object.assign(globalThis,old);}
});
