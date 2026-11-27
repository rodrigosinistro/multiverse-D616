import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
import {
 isExploit,isCatchBullets,isQuickToss,isProtectionHex,isInstantReplay,
 exploitDamageTrigger,exploitEligibility,consumeExploit,exploitDamageReduction,
 quickTossRoles,quickTossOutcome,activeProtectionHex,protectionHexDerived,applyProtectionHexRoll,
 checkCatchSource,catchDecision,canceledCatchEntry,confirmCatchBullets,
 replayEligibility,findReplaySource,executeInstantReplay,
} from '../scripts/native-priority-lot2.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
const S='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const official=(name,set)=>{
 const i=catalog.find(i=>i.name===name&&i.system.powerSet===set);
 assert.ok(i,`missing ${set}/${name}`);
 return {...i,id:i._id,system:{...i.system}};
};
function collection(list=[]){return {contents:list,get(id){return list.find(x=>x.id===id)}};}
function actor(id,items=[]){return {id,name:id,uuid:`Actor.${id}`,items:collection(items),effects:collection([]),
 flags:{[S]:{}},system:{focus:{value:40,max:100}},
 getFlag(ns,key){return this.flags?.[ns]?.[key]},
 async setFlag(ns,key,value){(this.flags[ns]??={})[key]=value;return value;},
 getRollData(){return {abilities:{agl:{value:3}}}}};}
function message(id,sourceActor,power,roll={total:19,formula:'{1d6,1dm,1d6}+3'}){
 return {id,rolls:[roll],speaker:{actor:sourceActor.id},flags:{[S]:{itemId:power.id}},
 getFlag(ns,key){return this.flags?.[ns]?.[key]},
 async setFlag(ns,key,value){(this.flags[ns]??={})[key]=value},
 async update(patch){this.patch=patch;for(const [k,v] of Object.entries(patch)){
  if(k==='rolls')this.rolls=v;
  if(k===`flags.${S}.nativeInstantReplayUsed`)this.flags[S].nativeInstantReplayUsed=v;
 }},flavor:power.name,content:'roll card'};
}
function world(actors=[],messages=[],combat={started:true,id:'combat-1',round:2,turn:0}){
 const before=globalThis.game;
 const gm={isGM:true};globalThis.game={user:gm,combat,
  actors:collection(actors),messages:collection(messages),scenes:collection([]),
  multiverseD616:{turnTracker:{refundReaction:async()=>true}}};
 return ()=>{globalThis.game=before};
}
const target1='Scene.x.Token.aaa',target2='Scene.x.Token.bbb';

test('scoped official identities: no arbitrary power by name',()=>{
 const names=[['Exploit','Melee Weapons',isExploit],['Catch Bullets','Super-Speed',isCatchBullets],
  ['Quick Toss','Super-Strength',isQuickToss],['Protection Hex','Magic',isProtectionHex],
  ['Instant Replay','Omniversal Travel',isInstantReplay]];
 for(const [name,set,fn] of names){const i=official(name,set);assert.equal(fn(i),true);
  assert.equal(fn({...i,system:{...i.system,powerSet:'Other'}}),false);}
});

test('Exploit triggers only on GM-confirmed Fantastic weapon Health loss >0',()=>{
 const exploit=official('Exploit','Melee Weapons'),w={id:'sword',type:'weapon',name:'Sword'};
 const a=actor('hero',[exploit,w]);for(const x of a.items.contents)x.actor=a;
 const source=message('attack',a,w),restore=world([a],[source]);
 try{
  const snap={sourceMessageId:'attack',rollSignature:rollSignature(source.rolls[0]),
   entries:[{targetUuid:target1,category:'health',hit:true,fantastic:true}]};
  const results=[{targetUuid:target1,category:'health',heal:false,delta:25,blocked:false}];
  assert.equal(exploitDamageTrigger(source,snap,results)?.targetUuids[0],target1);
  assert.equal(exploitDamageTrigger(source,snap,[{...results[0],delta:0}]),null);
  assert.equal(exploitDamageTrigger(source,snap,[{...results[0],blocked:true}]),null);
  assert.equal(exploitDamageTrigger(source,snap,results,'heal'),null);
  assert.equal(exploitDamageTrigger(source,{...snap,entries:[{...snap.entries[0],fantastic:false}]},results),null);
  source.flags[S].itemId=exploit.id;
  assert.equal(exploitDamageTrigger(source,snap,results),null,'power attack cannot arm a weapon trigger');
 }finally{restore();}
});

test('Exploit must hit trigger target, same round/turn, and consumes once',async()=>{
 const exploit=official('Exploit','Melee Weapons'),a=actor('hero',[exploit]);exploit.actor=a;
 const mark={version:1,combatId:'combat-1',round:2,turn:0,sourceMessageId:'initial',weaponId:'w',targetUuids:[target1],used:false};
 const restore=world([a]);
 try{
  await a.setFlag(S,'nativeExploitReady',mark);
  assert.equal(exploitEligibility(exploit,{targets:[{uuid:target1}]}).ok,true);
  assert.equal(exploitEligibility(exploit,{targets:[{uuid:target2}]}).ok,false);
  assert.equal(exploitEligibility(exploit,{targets:[{uuid:target1}],combat:{started:true,id:'combat-1',round:2,turn:1}}).ok,false);
  assert.equal(await consumeExploit(exploit,mark),true);
  assert.equal(await consumeExploit(exploit,mark),false);
  assert.equal(exploitEligibility(exploit,{targets:[{uuid:target1}]}).ok,false);
  assert.equal(exploitDamageReduction(exploit,{getFlag:()=>({version:1})},4,'health'),0);
  assert.equal(exploitDamageReduction(exploit,{getFlag:()=>({version:1})},4,'focus'),4);
 }finally{restore();}
});

test('Quick Toss uses real ranged damage pipeline, with thrown receiving normal even if missed',()=>{
 const item=official('Quick Toss','Super-Strength'),rule=resolvePowerRoll(item);
 assert.equal(rule.attack,true);assert.equal(rule.ability,'agl');assert.equal(rule.attackTarget,'agl');
 const roles=quickTossRoles([{uuid:target1},{uuid:target2}],target1);
 assert.equal(roles.thrownUuid,target1);assert.equal(roles.struckUuid,target2);
 assert.equal(quickTossOutcome({success:false,fantastic:true},target1,roles).success,true);
 assert.equal(quickTossOutcome({success:false,fantastic:true},target1,roles).fantastic,false);
 assert.equal(quickTossOutcome({success:false,fantastic:true},target2,roles).success,false);
 assert.equal(quickTossRoles([{uuid:target1},{uuid:target1}],target1),null);
});

test('Protection Hex changes six derived defenses only while its own Concentration is alive',async()=>{
 const i=official('Protection Hex','Magic'),a=actor('hero',[i]);i.actor=a;
 const e={id:'effect-1',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:i.id}}},
  getFlag(ns,key){return this.flags?.[ns]?.[key]},
  async setFlag(ns,key,v){this.flags[ns][key]=v}};
 a.effects.contents.push(e);
 const roll={total:23,isFantastic:true,formula:'{1d6,1dm,1d6}+7'};
 const msg=message('hex-roll',a,i,roll);
 assert.equal((await applyProtectionHexRoll(i,msg))?.defense,23);
 const model={abilities:Object.fromEntries(['mle','agl','res','vig','ego','log'].map(k=>[k,{defense:12}])),healthDamageReduction:2};
 assert.equal(protectionHexDerived(model,a),true);
 assert.deepEqual(Object.values(model.abilities).map(x=>x.defense),Array(6).fill(23));
 assert.equal(model.healthDamageReduction,2,'RD is granted at level 1, not stacked onto higher RD');
 assert.equal(await applyProtectionHexRoll(i,msg),false,'idempotent');
 const modelZero={abilities:{ego:{defense:14}},healthDamageReduction:0};
 assert.equal(protectionHexDerived(modelZero,a),true);
 assert.equal(modelZero.healthDamageReduction,1);
 e.disabled=true;
 assert.equal(activeProtectionHex(a),null);
 const model2={abilities:{mle:{defense:19}},healthDamageReduction:2};
 assert.equal(protectionHexDerived(model2,a),false);
 assert.equal(model2.abilities.mle.defense,19);assert.equal(model2.healthDamageReduction,2);
});

test('Catch Bullets is bound to the unchanged original attack, one target',async()=>{
 const catchPower=official('Catch Bullets','Super-Speed'),proj={id:'pistol',type:'weapon',name:'Pistol',system:{kind:'ranged',attackKind:'ranged'}};
 const defender=actor('defender',[catchPower]),attacker=actor('attacker',[proj]);catchPower.actor=defender;
 const source=message('shot',attacker,proj,{total:17,formula:'{1d6,1dm,1d6}+4'});
 source.flags[S].targets=[{uuid:target1}];
 const catchRoll=message('deflect',defender,catchPower,{total:18,isFantastic:true,formula:'{1d6,1dm,1d6}+6'});
 const ctx={version:1,sourceId:source.id,sourceSignature:rollSignature(source.rolls[0]),targetUuid:target1,attackTotal:17,itemId:catchPower.id};
 catchRoll.flags[S].nativeCatchBullets=ctx;
 const restore=world([defender,attacker],[source,catchRoll]);
 const before=globalThis.ChatMessage;globalThis.ChatMessage={create:async()=>({})};
 try{
  assert.equal(checkCatchSource(catchPower,source).ok,true);
  assert.deepEqual(catchDecision(catchRoll.rolls[0],source,ctx),{ok:true,fantastic:true});
  assert.equal(canceledCatchEntry(source,{targetUuid:target1}),false);
  const applied=await confirmCatchBullets(catchRoll);
  assert.equal(applied.fantastic,true);assert.equal(applied.refunded,false); // no combatant on dummy actor
  assert.equal(canceledCatchEntry(source,{targetUuid:target1}),true);
  assert.equal(canceledCatchEntry(source,{targetUuid:target2}),false);
  source.rolls[0].total=19;
  assert.equal(canceledCatchEntry(source,{targetUuid:target1}),false,'source updated after reroll');
 }finally{globalThis.ChatMessage=before;restore();}
});

test('Instant Replay replaces original roll and records one use for battle',async()=>{
 const replay=official('Instant Replay','Omniversal Travel'),skill={id:'skill',type:'power',name:'Skill'};
 const hero=actor('hero',[replay,skill]);replay.actor=hero;
 const source=message('last-failure',hero,skill,{total:9,formula:'{1d6,1dm,1d6}+2',options:{},data:{}});
 const restore=world([hero],[source]);
 try{
  const context=replayEligibility(replay);
  assert.equal(context.ok,true);
  assert.equal(findReplaySource(hero),source);
  class FakeRoll{
   constructor(formula,data,options){this.formula=formula;this.data=data;this.options=options;this.total=17;}
   async evaluate(){}async toMessage(){return {content:'new roll',rolls:[this]}}
  }
  const result=await executeInstantReplay(replay,context,{RollClass:FakeRoll});
  assert.equal(result.oldTotal,9);assert.equal(result.newTotal,17);
  assert.equal(source.rolls[0].total,17);assert.equal(source.getFlag(S,'nativeInstantReplayUsed').oldTotal,9);
  assert.equal(replayEligibility(replay).ok,false);
 }finally{restore();}
});
