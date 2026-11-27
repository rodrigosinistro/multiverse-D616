import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeSupportRule,inspectSupportRequest,hasStatus,executeNativeSupportTransaction} from '../scripts/native-power-support.mjs';
import {activeNativeConcentratedPower,shieldWallTargetModifier} from '../scripts/native-power-guarded-passives.mjs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {resolveNativePowerAutomation} from '../scripts/native-power-automations.mjs';
const original=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const get=(name,set,actor)=>{
 const p=original.find(x=>x.name===name&&x.system.powerSet===set);
 assert.ok(p,`${name}/${set} is missing from Powers catalog`);
 return {...p,id:p._id,actor,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${p._id}`}}};
};
let n=0;
const clone=v=>structuredClone(v);
const set=(obj,path,value)=>{
 const parts=path.split('.');let at=obj;for(const p of parts.slice(0,-1)){at[p]??={};at=at[p];}at[parts.at(-1)]=clone(value);
};
function actor({rank=4,focus=70,health=40,maxFocus=100,maxHealth=100,vig=6,status=[]}={}){
 const a={id:`a${++n}`,uuid:`Actor.A${n}`,name:`Character ${n}`,flags:{},system:{attributes:{rank:{value:rank}},
  abilities:{vig:{value:vig}},focus:{value:focus,max:maxFocus},health:{value:health,max:maxHealth}},
  effects:[],statuses:[],items:{get(id){return this.values().find(it=>it.id===id)},values(){return a.powers??[]}},powers:[],
  async update(patch){for(const [path,value] of Object.entries(patch))set(this,path,value);return this;},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));return ids;},
  async createEmbeddedDocuments(_type,effects){for(const e of effects){const made={...clone(e),id:`effect${++n}`};this.effects.push(made);}return effects;},
  testUserPermission(){return true}};
 for(const id of status)a.effects.push({id:`status${++n}`,statuses:new Set([id]),disabled:false});
 return a;
}
function sceneWith(...actors){
 const scene={id:'scene1',grid:{size:100},tokens:{get(id){return this.values().find(t=>t.id===id);},values(){return this.list},list:[]}};
 actors.forEach((a,i)=>scene.tokens.list.push({id:`t${i}`,actor:a,parent:scene,disposition:1,x:i*100,y:0,width:1,height:1,name:a.name}));
 return {scene,tokens:scene.tokens.list};
}
function context(name,set,cast,target,{spent=10,combat=null}={}){
 const item=get(name,set,cast);cast.powers.push(item);
 const {scene,tokens}=sceneWith(cast,target);
 return {caster:cast,item,scene,sourceToken:tokens[0],targetTokens:[tokens[1]],spent,combat};
}
const gmSetup=()=>{
 const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage,ui:globalThis.ui};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',isGM:true}},
  multiverseD616:{turnTracker:{async trackItemUse(){return true;},getState(){return {reactionUsed:0,reactionMax:1}}}}};
 globalThis.ChatMessage={getSpeaker:()=>({alias:'Hero'}),async create(data){return data}};
 globalThis.ui={notifications:{info(){},warn(){}}};
 return ()=>Object.assign(globalThis,old);
};
test('v190: actual Powers compendium identities: 66 macros, 27 Power Sets, nine new integrations',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(e=>e.powerId)).size,162);
 for(const [name,set,status] of [
  ['Healing Hands','Healing','native-active'],['Soothing Touch','Healing','native-active'],
  ['Keep Moving','Tactics','native-partial'],['On Your Feet','Tactics','native-partial'],
  ['Rally on Me','Tactics','native-partial'],['Inspiration','Basic','native-partial'],
  ['Battle Plan','Tactics','native-partial'],['Lucky Me','Luck','native-active'],
  ['Shield Wall','Shield Bearer','native-partial']]){
  const power=get(name,set,actor());const match=resolveNativePowerAutomation(power);
  assert.equal(match?.status,status,`${name}/${set}`);
  assert.equal(match?.powerId,power._id);
 }
});
test('v190: nonmatching powers and forged IDs never become support dispatches',()=>{
 const caster=actor(),p=get('Healing Hands','Healing',caster);
 assert.equal(nativeSupportRule(p)?.resource,'health');
 assert.equal(nativeSupportRule({...p,type:'weapon'}),null);
 assert.equal(nativeSupportRule({...p,name:'Soothing Touch'}),null);
 assert.equal(nativeSupportRule({...p,system:{...p.system,powerSet:'Basic'}}),null);
 assert.equal(nativeSupportRule({...p,flags:{core:{sourceId:'Compendium.multiverse-d616.powers.Item.9I9DWkokKaIbn5Z6'}}}),null);
 assert.equal(nativeSupportRule(get('Cure-All','Healing',caster)),null);
});
test('v190: healing requires touch, minimum 10, available Focus and Rank×5, target missing resource',()=>{
 const c=actor({rank:3}),t=actor(),req=context('Healing Hands','Healing',c,t,{spent:10});
 assert.equal(inspectSupportRequest(req).ok,true);
 assert.equal(inspectSupportRequest({...req,spent:9}).ok,false);
 assert.equal(inspectSupportRequest({...req,spent:16}).ok,false);
 req.targetTokens[0].x=250;
 assert.match(inspectSupportRequest(req).reason,/tocar/);
 req.targetTokens[0].x=100;
 t.system.health.value=100;
 assert.match(inspectSupportRequest(req).reason,/não precisa recuperar/);
});
test('v190: Healing Hands restores ONLY target Health, spends caster Focus once',async()=>{
 const reset=gmSetup();try{
  const c=actor({focus:50}),t=actor({health:92});const req=context('Healing Hands','Healing',c,t,{spent:15});
  const r=await executeNativeSupportTransaction(req);
  assert.equal(r.ok,true);assert.equal(r.spent,15);
  assert.equal(c.system.focus.value,35);assert.equal(t.system.health.value,100);
  assert.equal(t.system.focus.value,70);
 }finally{reset();}
});
test('v190: Soothing Touch restores ONLY target Focus, respects cap and does not spend twice',async()=>{
 const reset=gmSetup();try{
  const c=actor({focus:90}),t=actor({focus:96,health:3});const req=context('Soothing Touch','Healing',c,t,{spent:10});
  await executeNativeSupportTransaction(req);
  assert.equal(c.system.focus.value,80);assert.equal(t.system.focus.value,100);
  assert.equal(t.system.health.value,3);
 }finally{reset();}
});
test('v190: failed target update rolls back Focus when no target was changed',async()=>{
 const reset=gmSetup();try{
  const c=actor({focus:50}),t=actor({focus:20});const req=context('Soothing Touch','Healing',c,t,{spent:10});
  t.update=async()=>{throw new Error('offline target')};
  await assert.rejects(executeNativeSupportTransaction(req),/offline target/);
  assert.equal(c.system.focus.value,50);
 }finally{reset();}
});
test('v190: Keep Moving clears stunned without deleting unrelated effects',async()=>{
 const reset=gmSetup();try{
  const c=actor(),t=actor({status:['mmrpg.stunned','mmrpg.blinded']});const req=context('Keep Moving','Tactics',c,t,{spent:0});
  assert.equal(inspectSupportRequest(req).ok,true);
  await executeNativeSupportTransaction(req);
  assert.equal(hasStatus(t,'mmrpg.stunned'),false);
  assert.equal(hasStatus(t,'mmrpg.blinded'),true);
  assert.equal(c.system.focus.value,70);
 }finally{reset();}
});
test('v190: On Your Feet removes prone from selected allies, not an incapacitated ally',async()=>{
 const reset=gmSetup();try{
  const c=actor({focus:50}),t=actor({status:['mmrpg.prone']});const req=context('On Your Feet','Tactics',c,t,{spent:5});
  await executeNativeSupportTransaction(req);
  assert.equal(hasStatus(t,'mmrpg.prone'),false);
  assert.equal(c.system.focus.value,45);
  t.effects.push({id:'proneagain',statuses:new Set(['mmrpg.prone'])});
  t.effects.push({id:'unconscious',statuses:new Set(['mmrpg.incapacitated'])});
  assert.equal(inspectSupportRequest(req).ok,false);
 }finally{reset();}
});
test('v190: Rally on Me applies 5×Rank Focus, once per active combat, with target in reach',async()=>{
 const reset=gmSetup();try{
  const c=actor({rank:4,focus:60,vig:5}),t=actor({focus:85});const combat={started:true,id:'fight1',round:1,turn:0,
    combatants:[{actor:c,actorId:c.id,id:'cb1'}]};const req=context('Rally on Me','Tactics',c,t,{spent:10,combat});
  assert.equal(inspectSupportRequest(req).ok,true);
  await executeNativeSupportTransaction(req);
  assert.equal(t.system.focus.value,100);assert.equal(c.system.focus.value,50);
  assert.equal(c.flags['multiverse-d616'].nativeSupportRallyCombatId,'fight1');
  assert.equal(inspectSupportRequest(req).ok,false);
 }finally{reset();}
});
test('v190: Tactics never targets hostile tokens or silently judges voice-range',()=>{
 const c=actor({vig:3}),t=actor({status:['mmrpg.stunned']});const req=context('Keep Moving','Tactics',c,t,{spent:0});
 req.targetTokens[0].disposition=-1;
 assert.equal(inspectSupportRequest(req).ok,false);
});
test('v190: Inspiration and Battle Plan create one-turn Edge buffs, without rerolling any dice',async()=>{
 const reset=gmSetup();try{
  const c=actor({vig:3,focus:40}),t=actor();const combat={started:true,id:'fight',round:2,turn:1,
    combatants:[{id:'combat1',actor:c,actorId:c.id}]};
  let req=context('Inspiration','Basic',c,t,{spent:0,combat});
  await executeNativeSupportTransaction(req);
  assert.equal(c.system.focus.value,40);
  assert.equal(t.effects.length,1);
  assert.equal(t.effects[0].flags['multiverse-d616'].nativeSupportEdge.combatId,'fight');
  const b=get('Battle Plan','Tactics',c);c.powers.push(b);req={...req,item:b,spent:10};
  await executeNativeSupportTransaction(req);
  assert.equal(c.system.focus.value,30);
  assert.equal(t.effects.length,2);
 }finally{reset();}
});
test('v190: Temporary Edge is included by condition engine, no situational auto-rerolls',()=>{
 const c=actor();const t=actor(); const buff={sourceActorUuid:c.uuid,combatId:'fight',round:2,turn:0};
 t.effects.push({disabled:false,flags:{'multiverse-d616':{nativeSupportEdge:buff}},name:'Inspiration'});
 globalThis.game={combat:{id:'fight',started:true,round:2,turn:1,combatant:{id:'other'},combatants:[{id:'source',actor:c}]}};
 const result=resolveConditionEdges({actor:t,ability:'mle',attack:false,targetActors:[]});
 assert.equal(result.net,1);assert.equal(result.autoCount,0);
 globalThis.game.combat.round=3;globalThis.game.combat.combatant={id:'source'};
 assert.equal(resolveConditionEdges({actor:t,ability:'mle',attack:false,targetActors:[]}).net,0);
 delete globalThis.game;
});
test('v190: Lucky Me uses an existing Concentration to supply Edge, no new status',()=>{
 const a=actor();const item=get('Lucky Me','Luck',a);a.powers.push(item);
 a.effects.push({disabled:false,flags:{'multiverse-d616':{concentrationPower:{transient:true,itemId:item.id}}}});
 assert.equal(activeNativeConcentratedPower(a,'Luck','Lucky Me'),true);
 const r=resolveConditionEdges({actor:a,ability:'ego',attack:false});
 assert.equal(r.net,1);assert.equal(r.autoCount,0);
 a.effects[0].disabled=true;
 assert.equal(resolveConditionEdges({actor:a,ability:'ego',attack:false}).net,0);
});
test('v190: Shield Wall imposes target Trouble only while Concentration is alive',()=>{
 const a=actor();const wall=get('Shield Wall','Shield Bearer',a);a.powers.push(wall);
 a.effects.push({disabled:false,flags:{'multiverse-d616':{concentrationPower:{transient:true,itemId:wall.id}}}});
 assert.equal(shieldWallTargetModifier(a,{attack:true,targeted:true})?.sign,-1);
 assert.equal(shieldWallTargetModifier(a,{attack:false,targeted:true}),null);
 assert.equal(shieldWallTargetModifier(a,{attack:true,targeted:false}),null);
 a.effects[0].disabled=true;
 assert.equal(shieldWallTargetModifier(a,{attack:true,targeted:true}),null);
});
test('v190: Item.roll intercepts these powers BEFORE generic Focus/Concentration/Chat',()=>{
 const src=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(src,/if\(nativeSupportRule\(this\)\)return dispatchNativeSupportPower\(this,\{rollJinxTouch:mmD616RollJinxTouchCheck\}\)/);
 assert.ok(src.indexOf('if(nativeSupportRule(this))return')<src.indexOf('const preFocus = await mmPreSpendFocusForPowerUse'));
 const stub=readFileSync(new URL('../scripts/native-power-support.mjs',import.meta.url),'utf8');
 assert.match(stub,/actor\.testUserPermission/);
 assert.match(stub,/userId/);
 assert.doesNotMatch(stub,/eval\(/);
});
