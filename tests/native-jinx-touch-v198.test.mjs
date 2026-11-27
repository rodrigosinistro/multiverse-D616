import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectJinxTouchMessage} from '../scripts/native-power-touch.mjs';
import {getPowerDamageFactor} from '../scripts/power-fantastic-damage.mjs';
import {executeNativeSupportTransaction,nativeSupportRule} from '../scripts/native-power-support.mjs';
const NS='multiverse-d616';
const id='c2t2WUvH8Bx4Qnzi';
let seq=0;
const data=(n='Jinx You')=>JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items.find(x=>x.name===n&&x.system.powerSet==='Luck');
const user={id:'player',isGM:false},gm={id:'gm',isGM:true};
function fixture(total=10,{fantastic=false}={}){
 const scene={id:'scene-198',grid:{size:100}};
 const owner={id:'ACTOR198',uuid:'Actor.ACTOR198',name:'Herói',effects:[],flags:{},
   system:{focus:{value:40,max:100},health:{value:40,max:100},attributes:{rank:{value:4}},abilities:{vig:{value:4},mle:{value:5,defense:15}}},
   async update(p){for(const [k,v]of Object.entries(p)){const keys=k.split('.');let o=this;for(const key of keys.slice(0,-1))o=o[key]??={};o[keys.at(-1)]=v;}return this},
   items:{contents:[],get(i){return this.contents.find(x=>x.id===i)}},testUserPermission:()=>true};
 const target={id:'TARGET198',uuid:'Actor.TARGET198',name:'Inimigo',effects:[],
   system:{attributes:{rank:{value:3}},abilities:{mle:{value:2,defense:12}}},items:{contents:[]}};
 const itemdata=data();const item={...itemdata,id:'item-player',actor:owner,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${id}`}}};owner.items.contents.push(item);
 const sourceToken={id:'source',actorId:owner.id,actor:owner,disposition:1,x:0,y:0,width:1,height:1};
 const targetToken={id:'foe',actorId:target.id,actor:target,disposition:-1,x:100,y:0,width:1,height:1};
 scene.tokens={contents:[sourceToken,targetToken],get(x){return this.contents.find(t=>t.id===x)}};
 const check={sceneId:scene.id,sourceTokenId:sourceToken.id,targetTokenId:targetToken.id,sourceActorId:owner.id,powerId:id,itemId:item.id};
 const flags={[NS]:{nativeJinxTouchCheck:check,ability:'mle',attackTarget:'mle',powerCheck:true}};
 const message={id:`MESSAGE-${++seq}`,user,rolls:[{total,isFantastic:fantastic,options:{}}],flags,
   getFlag(ns,key){return this.flags?.[ns]?.[key]},async setFlag(ns,key,v){this.flags[ns][key]=v;return this}};
 const request={powerId:id,itemId:item.id,attackMessageId:message.id,
   sceneId:scene.id,sourceTokenId:sourceToken.id,targetIds:[targetToken.id]};
 const combat={id:'COMBAT198',started:true,round:1,turn:0,
   combatants:[{id:'combatant-1',actor:owner,actorId:owner.id}]};
 const args={caster:owner,item,scene,sourceToken,targetTokens:[targetToken],spent:5,combat,
   attackMessageId:message.id,requestUser:user,requestItemId:item.id};
 return {owner,target,item,scene,sourceToken,targetToken,request,message,args};
}
test('v198: Jinx You uses an actual Melee vs Melee card — never trusts client-reported hit',()=>{
 const f=fixture(14);
 const ok=inspectJinxTouchMessage({request:f.request,message:f.message,user,scene:f.scene,
   sourceToken:f.sourceToken,targetToken:f.targetToken});
 assert.equal(ok.ok,true);assert.equal(ok.hit,true);assert.equal(ok.fantastic,false);
 f.request.targetIds=['other'];assert.equal(inspectJinxTouchMessage({request:f.request,message:f.message,user,scene:f.scene,sourceToken:f.sourceToken,targetToken:f.targetToken}).ok,false);
 f.request.targetIds=['foe'];f.message.user={id:'other'};
 assert.match(inspectJinxTouchMessage({request:f.request,message:f.message,user,scene:f.scene,sourceToken:f.sourceToken,targetToken:f.targetToken}).reason,/não pertence/);
});
test('v198: a missed Melee touch must not put Trouble or concentration on target',async()=>{
 const f=fixture(8);
 const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 let tracked=0;
 globalThis.game={user:gm,users:{activeGM:gm},messages:{get:id=>id===f.message.id?f.message:null},
   multiverseD616:{turnTracker:{async trackItemUse(){tracked++}}}};
 globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
 try{
  const r=await executeNativeSupportTransaction(f.args);
  assert.equal(r.ok,true);assert.equal(r.hit,false);assert.equal(f.owner.system.focus.value,35);
  assert.equal(f.target.effects.length,0);assert.equal(f.owner.effects.length,0);
  assert.equal(tracked,1);assert.equal(f.message.getFlag(NS,'nativeJinxTouchResolved').hit,false);
  await assert.rejects(executeNativeSupportTransaction(f.args),/já foi resolvido/);
  assert.equal(f.owner.system.focus.value,35,'replayed roll must not spend Focus twice');
 }finally{globalThis.game=old.game;globalThis.ChatMessage=old.ChatMessage}
});
test('v198: a Fantastic Jinx touch deals NORMAL Melee damage, not doubled',()=>{
 assert.equal(getPowerDamageFactor('Jinx You',{fantastic:false,enabled:true}),0);
 assert.equal(getPowerDamageFactor('Jinx You',{fantastic:true,enabled:true}),1);
 assert.equal(getPowerDamageFactor('Jinx You',{fantastic:true,enabled:false}),1);
 assert.equal(getPowerDamageFactor('Jinx You',{fantastic:false,enabled:false}),0);
 const f=fixture(14,{fantastic:true});const r=inspectJinxTouchMessage({request:f.request,message:f.message,user,scene:f.scene,
   sourceToken:f.sourceToken,targetToken:f.targetToken});
 assert.equal(r.ok,true);assert.equal(r.hit,true);assert.equal(r.fantastic,true);
});
test('v198: activation creates actual roll card BEFORE support packet and waits for manual rerolls',()=>{
 const core=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const support=readFileSync(new URL('../scripts/native-power-support.mjs',import.meta.url),'utf8');
 assert.match(core,/mmD616RollJinxTouchCheck/);assert.match(core,/nativeJinxTouchCheck:metadata/);
 assert.match(core,/roll\.toMessage/);assert.match(support,/await rollJinxTouch\(item,sourceToken,targetTokens\[0\]\)/);
 assert.match(support,/Concluir teste/);assert.match(support,/request\.attackMessageId/);
 assert.match(core,/nativeJinxTouchResolved/);
 assert.equal(nativeSupportRule({...data(),actor:{uuid:'Actor.x'},flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${id}`}}})?.targetMode,'touch-foe');
});

test('v198: successful Jinx Melee touch authorizes exactly one concentration and Trouble marker',async()=>{
 const f=fixture(14);
 const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage,Hooks:globalThis.Hooks,CONFIG:globalThis.CONFIG};
 const apply=a=>{
  a.statuses=new Set();a.createEmbeddedDocuments=async(type,sources)=>sources.map((raw,i)=>{
   const e={...structuredClone(raw),id:`${a.id}-effect-${a.effects.length+1+i}`,parent:a};
   e.update=async patch=>{for(const [k,v]of Object.entries(patch)){if(k.startsWith('flags.')){
     const keys=k.split('.');let o=e;for(const t of keys.slice(0,-1))o=o[t]??={};o[keys.at(-1)]=v;
   }else e[k]=v;}return e};
   a.effects.push(e);return e;
  });
  a.deleteEmbeddedDocuments=async(type,ids)=>{a.effects=a.effects.filter(e=>!ids.includes(e.id));return ids};
  a.toggleStatusEffect=async(id,{active}={})=>{if(active)a.statuses.add(id);else a.statuses.delete(id);return true};
 };
 apply(f.owner);apply(f.target);
 const combat={...f.args.combat,combatant:{id:'combatant-1',actor:f.owner}};
 globalThis.Hooks={once(){},on(){}};globalThis.CONFIG={statusEffects:[]};
 globalThis.game={user:gm,users:{activeGM:gm},combat,
  scenes:{contents:[f.scene]},actors:{contents:[f.owner,f.target]},
  messages:{get:id=>id===f.message.id?f.message:null},
  multiverseD616:{automationEnabled:()=>true,turnTracker:{async trackItemUse(){}}}};
 globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
 try{
  const r=await executeNativeSupportTransaction({...f.args,combat});
  assert.equal(r.ok,true);assert.equal(f.owner.system.focus.value,35);
  const concentration=f.owner.effects.find(e=>e.flags?.[NS]?.concentrationPower?.transient);
  assert.ok(concentration,'the Melee hit creates a tracked concentration');
  const trouble=f.target.effects.find(e=>e.flags?.[NS]?.nativeFortune);
  assert.equal(trouble?.flags?.[NS]?.nativeFortune?.sign,-1);
  assert.equal(trouble?.flags?.[NS]?.nativeFortune?.sourceEffectId,concentration.id);
  await assert.rejects(executeNativeSupportTransaction({...f.args,combat}),/já foi resolvido/);
  assert.equal(f.owner.system.focus.value,35,'no Focus duplication');
 }finally{Object.assign(globalThis,old)}
});
