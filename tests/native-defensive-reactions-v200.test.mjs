import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {isNativeBlur,blurExpiration,blurExpired,checkNativeBlurUse,applyNativeBlur,blurTargetModifier} from '../scripts/native-power-blur.mjs';
import {nativeSupportRule,inspectSupportRequest} from '../scripts/native-power-support.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
const P=(set,name)=>({type:'power',name,system:{powerSet:set},img:'icon.webp'});
const A=()=>({id:'actor-1',uuid:'Actor.actor-1',items:{contents:[]},effects:[],statuses:new Set(),createEmbeddedDocuments:async(_type,arr)=>arr,deleteEmbeddedDocuments:async()=>{}});
const C=(round=2,turn=1)=>({id:'combat1',started:true,round,turn,turns:[{id:'c1',actorId:'actor-1'},{id:'c2',actorId:'actor-2'}]});
test('v200: bounded three-power registry and no duplicate source IDs',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(r=>r.powerId)).size,162);
 for(const [set,name] of [['Super-Speed','Blur'],['Tactics','Hit the Dirt'],['Tactics','Scatter']]){
  const r=REGISTERED_AUTOMATIONS.find(x=>x.powerSet===set&&x.powerName===name);
  assert.equal(r?.status,'native-partial');
 }
});
test('v200: Blur is official scoped and has next-turn expiration',()=>{
 const a=A(),p=P('Super-Speed','Blur');
 assert.equal(isNativeBlur(p),true);
 assert.equal(isNativeBlur(P('Basic','Blur')),false);
 assert.equal(checkNativeBlurUse(a,p,null).ok,false);
 assert.deepEqual(blurExpiration(C(2,1),a),{combatId:'combat1',expiresRound:3,expiresTurn:0});
 assert.deepEqual(blurExpiration(C(2,0),a),{combatId:'combat1',expiresRound:3,expiresTurn:0});
 assert.equal(blurExpired({version:1,combatId:'combat1',expiresRound:3,expiresTurn:0},C(2,1)),false);
 assert.equal(blurExpired({version:1,combatId:'combat1',expiresRound:3,expiresTurn:0},C(3,0)),true);
});
test('v200: Blur applies once; only targeted attacks get Trouble and no auto reroll',async()=>{
 const a=A();let created=[];a.createEmbeddedDocuments=async(_,records)=>{created=records;a.effects=records.map((r,i)=>({...r,id:`e${i}`}));return records;};
 const p=P('Super-Speed','Blur');await assert.rejects(applyNativeBlur(a,p,4,{combat:C()}),/5 Focus/);
 await applyNativeBlur(a,p,5,{combat:C()});
 assert.equal(created[0].flags['multiverse-d616'].nativeBlur.version,1);
 assert.equal(blurTargetModifier(a,{attack:true,targeted:true,combat:C()}).sign,-1);
 assert.equal(blurTargetModifier(a,{attack:true,targeted:false,combat:C()}),null);
 assert.equal(blurTargetModifier(a,{attack:false,targeted:true,combat:C()}),null);
 assert.equal(blurTargetModifier(a,{attack:true,targeted:true,combat:C(3,0)}),null);
 const attacker=A(); const result=resolveConditionEdges({actor:attacker,targetActors:[a],attack:true,targeted:true,kind:'close',ability:'mle'});
 // Condition-edge consults the running combat; pure target modifier was independently verified above.
 assert.equal(result.autoCount,0);
});
test('v200: both Tactics power records route through GM-authorized atomic support dispatcher',()=>{
 for(const name of ['Hit the Dirt','Scatter']){
  const rule=nativeSupportRule(P('Tactics',name));
  assert.equal(rule?.kind,'prone');assert.equal(rule.action,'reaction');
  assert.equal(rule.min,name==='Scatter'?10:5);
 }
 assert.equal(nativeSupportRule(P('Healing','Scatter')),null);
});

test('v200: GM applies voluntary Prone through the existing authenticated support transaction with one Focus spend',async()=>{
 const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 let trackCalls=0;
 const caster={id:'caster',uuid:'Actor.caster',name:'Commander',effects:[],statuses:[],
  system:{attributes:{rank:{value:3}},focus:{value:30,max:40}},
  items:{contents:[]},async update(patch){if(patch['system.focus.value']!==undefined)this.system.focus.value=patch['system.focus.value'];},
  testUserPermission(){return true;}};
 const createTarget=id=>({id,uuid:`Actor.${id}`,name:id,effects:[],statuses:new Set(),
  async toggleStatusEffect(status,opts){assert.equal(status,'mmrpg.prone');assert.equal(opts.active,true);this.statuses.add(status);},
  testUserPermission(){return true;}});
 const first=createTarget('ally-1'),second=createTarget('ally-2');
 const item=P('Tactics','Hit the Dirt');item.actor=caster;caster.items.contents=[item];
 const scene={id:'scene',grid:{size:100},tokens:{list:[],get(id){return this.list.find(x=>x.id===id)}}};
 const source={id:'token-0',actorId:caster.id,actor:caster,disposition:1,parent:scene};
 const allyToken1={id:'token-1',actorId:first.id,actor:first,disposition:1,parent:scene};
 const allyToken2={id:'token-2',actorId:second.id,actor:second,disposition:1,parent:scene};
 scene.tokens.list=[source,allyToken1,allyToken2];scene.tokens.values=()=>scene.tokens.list.values();
 const combat={id:'combat',started:true,combatants:[{id:'caster-combatant',actor:caster,actorId:caster.id}]};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},
  multiverseD616:{turnTracker:{getState:()=>({reactionUsed:0,reactionMax:1}),async trackItemUse(){trackCalls++;}}}};
 globalThis.ChatMessage={getSpeaker:()=>({alias:'Commander'}),create:async data=>data};
 try{
  const params={caster,item,scene,sourceToken:source,targetTokens:[allyToken1,allyToken2],spent:5,combat};
  assert.deepEqual(inspectSupportRequest(params),{ok:true,rule:nativeSupportRule(item)});
  const r=await (await import('../scripts/native-power-support.mjs')).executeNativeSupportTransaction(params);
  assert.equal(r.ok,true);assert.equal(caster.system.focus.value,25);assert.equal(trackCalls,1);
  assert.equal(first.statuses.has('mmrpg.prone'),true);
  assert.equal(second.statuses.has('mmrpg.prone'),true);
  first.statuses.clear();second.statuses.clear();
  const tooMany={...params,item:{...P('Tactics','Scatter'),actor:caster},targetTokens:[allyToken1,allyToken2]};
  assert.equal(inspectSupportRequest({...tooMany,spent:10}).ok,true);
  caster.system.attributes.rank.value=1;
  assert.match(inspectSupportRequest({...tooMany,spent:5}).reason,/Scatter|Focus/);
 }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
});
