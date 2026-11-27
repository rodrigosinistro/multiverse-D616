import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
import {stoppingPowerOriginalContext,hitNRunOriginalContext,
  stoppingPowerConfirmed,stoppingPowerFollowUpEligibility,stoppingPowerExtraShot,
  confirmStoppingPowerDamage,confirmHitNRunDamage} from '../scripts/repeat-power-attacks.mjs';
import {hitNRunGrant,spendHitNRunCredit,HIT_N_RUN_CREDIT} from '../scripts/native-power-hit-n-run-movement.mjs';

const SYS='multiverse-d616';
const doc=(id,flags={})=>({id,flags:{[SYS]:{...flags}},
  getFlag(system,name){return this.flags?.[system]?.[name];},
  async setFlag(system,name,value){this.flags[system]??={};this.flags[system][name]=value;return value;},
  async unsetFlag(system,name){delete this.flags?.[system]?.[name];}});
const token=(id,actor,scene)=>({id,uuid:`Scene.${scene.id}.Token.${id}`,actor,parent:scene,actorId:actor.id});
function setup({power='Stopping Power',set='Ranged Weapons',fantastic=true,delta=12,action='full',round=2,turn=0}={}){
 const oldGame=globalThis.game,oldChat=globalThis.ChatMessage;
 const actor={id:'hero',uuid:'Actor.hero',name:'Herói',testUserPermission:()=>true,
   system:{movement:{run:{value:8,active:true}}}};
 const item={id:'local-item',type:'power',name:power,actor,
   system:{powerSet:set,formula:'{1d6,1dm,1d6}',attack:true}};
 actor.items={get:id=>id===item.id?item:null};
 const scene={id:'scene',tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id);}}};
 const sourceToken=token('hero-token',actor,scene);
 const targetActor={id:'foe',uuid:'Actor.foe',name:'Inimigo'};
 const targetToken=token('foe-token',targetActor,scene);
 scene.tokens.contents=[sourceToken,targetToken];
 const roll={total:18};
 const sig=rollSignature(roll);
 const combatant=Object.assign(doc('ct'),{actor,actorId:actor.id,tokenId:sourceToken.id});
 const combat={id:'combat',started:true,round,turn,combatants:[combatant],combatant};
 const context={version:1,combatId:combat.id,round,turn,targetUuid:targetToken.uuid};
 const original=Object.assign(doc('attack',{itemId:item.id,
   ...(power==='Stopping Power'?{stoppingPower:{version:1,combatId:combat.id,round,targetUuid:targetToken.uuid}}
    :{hitNRun:context})}),{speaker:{scene:scene.id,token:sourceToken.id,actor:actor.id},
    rolls:[roll]});
 const damage=doc('damage',{sourceMessageId:original.id,damageApplication:{
   version:1,sourceMessageId:original.id,rollSignature:sig,isFantastic:fantastic,
   entries:[{targetUuid:targetToken.uuid,hit:true,fantastic,damage:delta}]}});
 const results=[{targetUuid:targetToken.uuid,delta,blocked:false,heal:false}];
 const cards=[];
 globalThis.game={user:{id:'gm',isGM:true},combat,scenes:{get:id=>id===scene.id?scene:null},
   messages:{get(id){return id===original.id?original:id===damage.id?damage:null;}}};
 globalThis.ChatMessage={async create(data){cards.push(data);return {id:`card-${cards.length}`};}};
 return {actor,item,scene,combat,combatant,sourceToken,targetToken,original,damage,results,cards,action,
   restore(){globalThis.game=oldGame;globalThis.ChatMessage=oldChat;}};
}

test('v215 coverage: 162 unique macros, prior two actual changed powers retained, official 398 preserved',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(e=>e.powerId)).size,162);
 for(const [name,handler,set] of [['Stopping Power','stopping-power','Ranged Weapons'],['Hit n Run','hit-n-run','Melee Weapons']]){
  const entry=REGISTERED_AUTOMATIONS.find(e=>e.powerName===name&&e.powerSet===set);
  assert.equal(entry?.handlerId,handler);assert.equal(entry.status,'native-partial');
 }
 const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
 assert.equal(manifest.version,'0.2.237');
});

test('Stopping Power: only own official scoped power, one target, ongoing combat',()=>{
 const e=setup();try{
  assert.equal(stoppingPowerOriginalContext(e.item,[e.targetToken],e.combat)?.targetUuid,e.targetToken.uuid);
  assert.equal(stoppingPowerOriginalContext({...e.item,name:'Snap Shooting'},[e.targetToken],e.combat),null);
  assert.equal(stoppingPowerOriginalContext({...e.item,system:{powerSet:'Martial Arts'}},[e.targetToken],e.combat),null);
  assert.equal(stoppingPowerOriginalContext(e.item,[e.targetToken,e.sourceToken],e.combat),null);
  assert.equal(stoppingPowerOriginalContext(e.item,[e.targetToken],{...e.combat,started:false}),null);
 }finally{e.restore();}
});

test('Stopping Power: GM must confirm actual Fantastic damage with matching roll signature',()=>{
 const e=setup();try{
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:e.damage,action:e.action,results:e.results}),true);
  const bad={...e.damage,getFlag:(s,k)=>k==='damageApplication'?{...e.damage.getFlag(s,k),rollSignature:'tampered'}:e.damage.getFlag(s,k)};
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:bad,action:'full',results:e.results}),false);
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:e.damage,action:'heal',results:e.results}),false);
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:e.damage,action:'full',results:[{...e.results[0],delta:0}]}),false);
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:e.damage,action:'full',results:[{...e.results[0],blocked:true}]}),false);
  e.damage.flags[SYS].damageApplication.isFantastic=false;
  e.damage.flags[SYS].damageApplication.entries[0].fantastic=false;
  assert.equal(stoppingPowerConfirmed({source:e.original,damageMessage:e.damage,action:'full',results:e.results}),false);
 }finally{e.restore();}
});

test('Stopping Power: after confirmed Fantastic GM publishes exactly one follow-up control',async()=>{
 const e=setup();try{
  assert.equal(await confirmStoppingPowerDamage(e.damage,'full',e.results),true);
  assert.equal(e.cards.length,1);
  assert.match(e.cards[0].content,/sem nova Ação Padrão nem custo adicional/);
  assert.equal(e.original.getFlag(SYS,'stoppingPowerReady')?.confirmed,true);
  assert.equal(await confirmStoppingPowerDamage(e.damage,'full',e.results),false);
  assert.equal(e.cards.length,1);
 }finally{e.restore();}
});

test('Stopping Power: free second shot targets same actor, no extra Focus or Standard, consumed once',async()=>{
 const e=setup();try{
  await confirmStoppingPowerDamage(e.damage,'full',e.results);
  let called=0;
  const shot=await stoppingPowerExtraShot(e.original,{createRoll:async(item,source,targets,options)=>{
   called++;assert.equal(item,e.item);assert.equal(source,e.original);
   assert.deepEqual(targets,[e.targetToken]);assert.equal(options.ability,'agl');
   assert.equal(options.defense,'agl');assert.equal(options.extras.stoppingPowerExtra.originAttackMessageId,e.original.id);
   return {id:'second-roll'};
  }});
  assert.equal(shot.id,'second-roll');assert.equal(called,1);
  assert.equal(e.original.getFlag(SYS,'stoppingPowerConsumed'),true);
  await assert.rejects(stoppingPowerExtraShot(e.original,{createRoll:async()=>{called++;}}),/já foi utilizado/);
  assert.equal(called,1);
 }finally{e.restore();}
});

test('Stopping Power: failed second shot clears one-shot flag; stale round and swapped targets denied',async()=>{
 const e=setup();try{
  await confirmStoppingPowerDamage(e.damage,'full',e.results);
  await assert.rejects(stoppingPowerExtraShot(e.original,{createRoll:async()=>{throw Error('erro rolagem');}}),/erro rolagem/);
  assert.equal(e.original.getFlag(SYS,'stoppingPowerConsumed'),undefined);
  const ready=e.original.getFlag(SYS,'stoppingPowerReady');
  assert.equal(stoppingPowerFollowUpEligibility({source:e.original,actor:e.actor,item:e.item,
    scene:e.scene,combat:{...e.combat,round:3},trigger:ready,target:e.targetToken}).ok,false);
  assert.equal(stoppingPowerFollowUpEligibility({source:e.original,actor:e.actor,item:e.item,
    scene:e.scene,combat:e.combat,trigger:ready,target:e.sourceToken}).ok,false);
 }finally{e.restore();}
});

test('Hit n Run: only matching single-target Melee official power earns a source marker',()=>{
 const e=setup({power:'Hit n Run',set:'Melee Weapons'});try{
  assert.equal(hitNRunOriginalContext(e.item,[e.targetToken],e.combat)?.targetUuid,e.targetToken.uuid);
  assert.equal(hitNRunOriginalContext({...e.item,name:'Stopping Power'},[e.targetToken],e.combat),null);
  assert.equal(hitNRunOriginalContext(e.item,[],e.combat),null);
 }finally{e.restore();}
});

test('Hit n Run: confirmed damage activates half Run Speed credit, no extra damage or Focus',async()=>{
 const e=setup({power:'Hit n Run',set:'Melee Weapons',fantastic:false});try{
  assert.equal(await confirmHitNRunDamage(e.damage,'full',e.results),true);
  const credit=e.combatant.getFlag(SYS,HIT_N_RUN_CREDIT);
  assert.equal(credit.remaining,4);assert.equal(credit.sourceMessageId,e.original.id);
  assert.equal(e.cards.length,1);assert.match(e.cards[0].content,/4 espaços de movimento gratuito/);
  assert.equal(await confirmHitNRunDamage(e.damage,'full',e.results),false);
 }finally{e.restore();}
});

test('Hit n Run: credit spends free movement first, then ordinary movement; expires on turn change',()=>{
 const e=setup({power:'Hit n Run',set:'Melee Weapons'});try{
  const credit=hitNRunGrant({combat:e.combat,combatant:e.combatant,runSpeed:8,sourceMessageId:'source'});
  assert.equal(credit.remaining,4);
  const first=spendHitNRunCredit(credit,2,e.combat,e.combatant);
  assert.deepEqual([first.free,first.charged,first.remaining],[2,0,2]);
  const second=spendHitNRunCredit({...credit,remaining:first.remaining},5,e.combat,e.combatant);
  assert.deepEqual([second.free,second.charged,second.remaining],[2,3,0]);
  const expired=spendHitNRunCredit(credit,5,{...e.combat,turn:1},e.combatant);
  assert.equal(expired.valid,false);assert.equal(expired.charged,5);
 }finally{e.restore();}
});

test('Hit n Run: no grant on miss/blocked/wrong target or after the actor turn',async()=>{
 const e=setup({power:'Hit n Run',set:'Melee Weapons'});try{
  for(const results of [[{...e.results[0],blocked:true}],[{...e.results[0],targetUuid:'other'}]]){
    assert.equal(await confirmHitNRunDamage(e.damage,'full',results),false);
  }
  e.combat.turn=1;
  assert.equal(await confirmHitNRunDamage(e.damage,'full',e.results),false);
  assert.equal(e.combatant.getFlag(SYS,HIT_N_RUN_CREDIT),undefined);
 }finally{e.restore();}
});
