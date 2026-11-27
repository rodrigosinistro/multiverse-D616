import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {nativeSupportRule,inspectSupportRequest,executeNativeSupportTransaction} from '../scripts/native-power-support.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {inspectFortuneTargets,fortuneCheckModifiers,fortuneFocusFireTargetModifier,clearFortuneDependents}
  from '../scripts/native-power-fortune.mjs';
const NS='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const power=(name,set,actor)=>{
 const p=catalog.find(x=>x.name===name&&x.system?.powerSet===set);assert.ok(p,`${set}/${name} in catalog`);
 return {...p,id:p._id,actor,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${p._id}`}}};
};
let serial=0;
function put(target,path,value){const parts=path.split('.');let node=target;
 for(const key of parts.slice(0,-1))node=node[key]??={};node[parts.at(-1)]=value;}
function actor({rank=4,vig=5,focus=90}={}){
 const id=`A${++serial}`;
 const a={id,uuid:`Actor.${id}`,name:id,isToken:false,flags:{},statuses:new Set(),effects:[],powers:[],
   system:{focus:{value:focus,max:140},health:{value:55,max:150},attributes:{rank:{value:rank}},abilities:{vig:{value:vig}}},
   items:{get(id){return a.powers.find(p=>p.id===id)},values(){return a.powers}},
   async update(patch){for(const [key,val] of Object.entries(patch))put(a,key,val);return a;},
   async updateEmbeddedDocuments(type,patches){for(const patch of patches){const e=a.effects.find(x=>x.id===patch._id);
     if(e)Object.assign(e,patch)}return patches;},
   async createEmbeddedDocuments(type,sources){return sources.map(source=>{
     const e={...structuredClone(source),id:`E${++serial}`,parent:a};
     e.update=async patch=>{for(const [key,val]of Object.entries(patch))put(e,key,val);return e;};
     a.effects.push(e);return e;});},
   async deleteEmbeddedDocuments(_,ids){a.effects=a.effects.filter(e=>!ids.includes(e.id));return ids;},
   async toggleStatusEffect(id,{active}={}){if(active)a.statuses.add(id);else a.statuses.delete(id);return true;},
   testUserPermission(){return true;}};
 return a;
}
function prepare(name,set,{r=4,rank=4,vig=5,focus=90}={}){
 const caster=actor({rank,vig,focus}),ally=actor(),enemy=actor();
 const item=power(name,set,caster);caster.powers.push(item);
 const scene={id:'scene-v197',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(x=>x.id===id)}}};
 const base={x:0,y:0,width:1,height:1,parent:scene};
 const origin={...base,id:'origin',actorId:caster.id,actor:caster,disposition:1};
 const friend={...base,x:100,id:'friend',actorId:ally.id,actor:ally,disposition:1};
 const foe={...base,x:100,id:'foe',actorId:enemy.id,actor:enemy,disposition:-1};
 scene.tokens.contents=[origin,friend,foe];
 const combat={id:'combat-fortune',started:true,round:1,turn:0,
   combatant:{id:'castercombat',actor:caster},combatants:[{id:'castercombat',actor:caster,actorId:caster.id}]};
 return {caster,ally,enemy,item,scene,origin,friend,foe,combat,spent:nativeSupportRule(item).min};
}
const request=(env,targets)=>({caster:env.caster,item:env.item,scene:env.scene,sourceToken:env.origin,
 targetTokens:targets,spent:env.spent,combat:env.combat});

test('v197: eight genuinely new powers have distinct registered macros, icons and bounded handlers',()=>{
 const items=[['Lucky You','Luck'],['Wish You Luck','Luck'],['Lucky Us','Luck'],
  ['Evil Eye','Luck'],['Jinx You','Luck'],['Jinx You All','Luck'],['Focus Fire','Tactics'],['Operations Center','Tactics']];
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(m=>m.powerId)).size,162);
 for(const [name,set] of items){const e=prepare(name,set);
  assert.equal(nativeSupportRule(e.item)?.kind,'fortune',name);
  assert.equal(nativeSupportRule(e.item)?.id,e.item.id);
  assert.equal(REGISTERED_AUTOMATIONS.find(x=>x.powerId===e.item.id)?.status,'native-partial');}
});

test('v197: official ally/foe constraints, touch/range/rank limits, and Focus Fire enemy+allies',()=>{
 for(const name of ['Lucky You','Wish You Luck','Lucky Us']){
  const e=prepare(name,'Luck');assert.equal(inspectSupportRequest(request(e,[e.friend])).ok,true,name);
  assert.match(inspectSupportRequest(request(e,[e.foe])).reason,/aliad/);
 }
 for(const name of ['Evil Eye','Jinx You','Jinx You All']){
  const e=prepare(name,'Luck');assert.equal(inspectSupportRequest(request(e,[e.foe])).ok,true,name);
  assert.match(inspectSupportRequest(request(e,[e.friend])).reason,/inimig/);
 }
 const ops=prepare('Operations Center','Tactics');
 ops.caster.system.abilities.vig.defense=15;
 assert.equal(inspectSupportRequest(request(ops,[ops.friend])).ok,true);
 const e=prepare('Focus Fire','Tactics');
 assert.equal(inspectSupportRequest(request(e,[e.friend,e.foe])).ok,true);
 assert.match(inspectSupportRequest(request(e,[e.friend])).reason,/um inimigo/);
 const s=prepare('Lucky You','Luck');s.friend.x=300;
 assert.match(inspectSupportRequest(request(s,[s.friend])).reason,/toque/);
 const v=prepare('Wish You Luck','Luck');v.friend.x=2500;
 assert.match(inspectSupportRequest(request(v,[v.friend])).reason,/fora do alcance/);
 const many=prepare('Jinx You All','Luck',{rank:2});
 many.scene.tokens.contents.push({id:'foe2',actor:actor(),disposition:-1,x:200,y:0,width:1,height:1});
 many.scene.tokens.contents.push({id:'foe3',actor:actor(),disposition:-1,x:300,y:0,width:1,height:1});
 assert.match(inspectSupportRequest(request(many,many.scene.tokens.contents.filter(t=>t.disposition===-1))).reason,/Rank/);
});

test('v197: inactive combat, insufficient Focus, unowned power and full Concentration stop BEFORE cost',()=>{
 const e=prepare('Evil Eye','Luck');
 e.combat.started=false;assert.match(inspectSupportRequest(request(e,[e.foe])).reason,/combate/);
 e.combat.started=true;e.caster.system.focus.value=0;
 assert.match(inspectSupportRequest(request(e,[e.foe])).reason,/Focus/);
 e.caster.system.focus.value=90;
 for(let i=1;i<=4;i++)e.caster.statuses.add(`mmrpg.concentration.${i}`);
 assert.match(inspectSupportRequest(request(e,[e.foe])).reason,/Concentração/);
 const forged=power('Lucky You','Luck',e.caster);forged.name='Evil Eye';
 assert.equal(nativeSupportRule(forged),null);
});

test('v197: existing fortune effects add manual-only Edge/Trouble on checks, and Focus Fire on matching target',()=>{
 const runner=actor();const enemy=actor();
 runner.effects.push({id:'B1',name:'Lucky You',disabled:false,flags:{[NS]:{nativeFortune:{version:1,sign:1,mode:'all-checks'}}}});
 runner.effects.push({id:'B2',name:'Evil Eye',disabled:false,flags:{[NS]:{nativeFortune:{version:1,sign:-1,mode:'all-checks'}}}});
 assert.equal(fortuneCheckModifiers(runner).length,2);
 const rolled=resolveConditionEdges({actor:runner,attack:false,ability:'mle'});
 assert.equal(rolled.net,0);assert.equal(rolled.autoCount,0);
 runner.effects=[{id:'B3',name:'Focus Fire',disabled:false,flags:{[NS]:{nativeFortune:{version:1,sign:1,mode:'focus-fire',foeUuid:enemy.uuid}}}}];
 assert.equal(fortuneFocusFireTargetModifier(runner,enemy,{attack:true})?.sign,1);
 assert.equal(fortuneFocusFireTargetModifier(runner,actor(),{attack:true}),null);
 assert.equal(resolveConditionEdges({actor:runner,attack:true,targeted:true,targetActors:[enemy],ability:'agl'}).net,1);
 assert.equal(resolveConditionEdges({actor:runner,attack:false,targeted:true,targetActors:[enemy],ability:'agl'}).net,0);
});

test('v197: GM handles Concentration and upkeep with actual D616 services; cleanup removes only own buffs',async()=>{
 const e=prepare('Evil Eye','Luck');const reset={Hooks:globalThis.Hooks,game:globalThis.game,ChatMessage:globalThis.ChatMessage,CONFIG:globalThis.CONFIG};
 globalThis.Hooks={once(){},on(){}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:{contents:[e.caster,e.enemy]},
  scenes:{contents:[e.scene]},combat:e.combat,multiverseD616:{automationEnabled:()=>true,turnTracker:{async trackItemUse(){}}}};
 globalThis.CONFIG={statusEffects:[]};
 globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
 try{
  const r=await executeNativeSupportTransaction(request(e,[e.foe]));
  assert.equal(r.ok,true);assert.equal(e.caster.system.focus.value,85);
  const conc=e.caster.effects.find(x=>x.flags?.[NS]?.concentrationPower?.transient);
  assert.ok(conc,'ordinary source Concentration created');
  assert.equal(conc.flags[NS].focusMaintenance.amount,5,'ordinary upkeep ledger');
  assert.equal(e.enemy.effects[0].flags[NS].nativeFortune.sourceEffectId,conc.id);
  assert.equal(fortuneCheckModifiers(e.enemy)[0].sign,-1);
  const removed=await clearFortuneDependents(conc);
  assert.equal(removed,1);assert.equal(e.enemy.effects.length,0);
  assert.equal(e.caster.system.focus.value,85,'cleanup never refunds legitimate activation');
 }finally{Object.assign(globalThis,reset)}
});

test('v197: original v196 atomic transport is preserved unchanged',()=>{
 const src=readFileSync(new URL('../scripts/native-power-support.mjs',import.meta.url),'utf8');
 assert.match(src,/nativeSupportPlayerRequestV2/);
 assert.match(src,/nativeSupportPlayerResultV2/);
 assert.match(src,/encodeSupportPacket\(\{\.\.\.args,id\}\)/);
 assert.doesNotMatch(src,/game\.socket\.emit\([\s\S]*?executeMacro/);
});

test('v197: repeated GM/player atomic activation with unchanged scene/token/targets retains full packet',async()=>{
 const e=prepare('Lucky You','Luck');
 const old={Hooks:globalThis.Hooks,game:globalThis.game,ChatMessage:globalThis.ChatMessage,CONFIG:globalThis.CONFIG};
 const events=new Map(),replies=[];
 const gm={id:'gm',isGM:true,active:true},player={id:'player',isGM:false,active:true};
 const channel={id:e.caster.id,uuid:`Actor.${e.caster.id}`,isToken:false,
   flags:{},testUserPermission:()=>true,async update(patch){replies.push(patch);return this;}};
 e.caster.isToken=true;e.caster.uuid=`Scene.${e.scene.id}.Token.${e.origin.id}.Actor.${e.caster.id}`;
 e.origin.actorId=channel.id;
 e.item.actor=e.caster;
 globalThis.Hooks={once(){},on(name,callback){events.set(name,[...(events.get(name)??[]),callback]);}};
 globalThis.game={user:gm,users:{activeGM:gm,get(id){return id===player.id?player:gm;}},
   actors:{contents:[channel]},scenes:{get(id){return id===e.scene.id?e.scene:null},contents:[e.scene]},
   combat:e.combat,multiverseD616:{automationEnabled:()=>true,turnTracker:{async trackItemUse(){}}}};
 globalThis.CONFIG={statusEffects:[]};globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};
 try{
  const {registerNativeSupportRequestHooks,encodeSupportPacket,decodeSupportPacket}=await import('../scripts/native-power-support.mjs');
  registerNativeSupportRequestHooks();
  for(const n of [1,2]){
   const packet={id:`atomic-fortune-${n}`,sceneId:e.scene.id,sourceTokenId:e.origin.id,
    sourceActorId:channel.id,itemId:e.item.id,powerId:nativeSupportRule(e.item).id,
    targetIds:[e.friend.id],spent:5};
   const changes={flags:{[NS]:{nativeSupportPlayerRequestV2:encodeSupportPacket(packet)}}};
   for(const listener of events.get('updateActor'))listener(channel,changes,{},player.id);
   for(let tick=0;tick<80&&replies.length<n;tick++)await new Promise(r=>setImmediate(r));
   assert.equal(replies.length,n);
   const result=decodeSupportPacket(replies[n-1][`flags.${NS}.nativeSupportPlayerResultV2`]);
   assert.equal(result.ok,true,`${result.reason??''}`);
   assert.equal(result.id,packet.id);
  }
  assert.equal(e.caster.system.focus.value,80,'two legitimate activations cost twice, not twice per activation');
  assert.equal(e.ally.effects.filter(x=>x.flags?.[NS]?.nativeFortune).length,1,'no duplicate buff on refresh');
  assert.equal(e.caster.effects.filter(x=>x.flags?.[NS]?.concentrationPower?.transient).length,1);
 }finally{Object.assign(globalThis,old)}
});

test('v197: Operations Center Edge expires on next source turn; token move ends its Concentration',async()=>{
 const e=prepare('Operations Center','Tactics');e.caster.system.abilities.vig.defense=15;
 const old={Hooks:globalThis.Hooks,game:globalThis.game,ChatMessage:globalThis.ChatMessage,CONFIG:globalThis.CONFIG};
 const events=new Map();
 globalThis.Hooks={once(){},on(name,cb){events.set(name,[...(events.get(name)??[]),cb]);}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:{contents:[e.caster,e.ally]},
 scenes:{contents:[e.scene]},combat:e.combat,multiverseD616:{automationEnabled:()=>true,turnTracker:{async trackItemUse(){}}}};
 globalThis.ChatMessage={getSpeaker:()=>({}),async create(){}};globalThis.CONFIG={statusEffects:[]};
 try{
  await executeNativeSupportTransaction(request(e,[e.friend]));
  assert.equal(fortuneCheckModifiers(e.ally).length,1);
  e.combat.round=2;
  assert.equal(fortuneCheckModifiers(e.ally).length,0,'Edge cannot survive source next turn even before cleanup hook');
  const {registerFortuneCleanupHooks}=await import('../scripts/native-power-fortune.mjs');
  registerFortuneCleanupHooks();
  for(const cb of events.get('updateCombat'))cb(e.combat,{round:2});
  for(let i=0;i<15&&e.ally.effects.length;i++)await new Promise(r=>setImmediate(r));
  assert.equal(e.ally.effects.length,0);
  for(const cb of events.get('updateToken'))cb(e.origin,{x:150});
  for(let i=0;i<15&&e.caster.effects.some(x=>x.flags?.[NS]?.concentrationPower?.transient);i++)await new Promise(r=>setImmediate(r));
  assert.equal(e.caster.effects.some(x=>x.flags?.[NS]?.concentrationPower?.transient),false);
 }finally{Object.assign(globalThis,old)}
});
