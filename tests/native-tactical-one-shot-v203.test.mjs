import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {nativeSupportRule,inspectSupportRequest,executeNativeSupportTransaction,encodeSupportPacket,decodeSupportPacket} from '../scripts/native-power-support.mjs';
import {createTacticalOnce,consumeTacticalOnce,tacticalOnceExpired,tacticalOnceModifier,canCreateTacticalOnce,tacticalMarvelLock} from '../scripts/native-power-tactical-once.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {charmedLifeAvailable,charmedLifeIsArmed,charmedLifeSource,armCharmedLife,consumeCharmedLifeRoll} from '../scripts/native-power-charmed-life.mjs';
const SYS='multiverse-d616';
const G={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
const power=(name)=>({id:name==='Combat Support'?'n7LkZDiJaeOk3ChY':'Iqikk9oo5YrtztBc',
 type:'power',name,system:{powerSet:'Tactics'},img:'orig.webp'});
const ACTOR=(name)=>({id:name,uuid:`Actor.${name}`,name,flags:{},
  effects:[],statuses:new Set(),system:{focus:{value:80,max:100},attributes:{rank:{value:3}},abilities:{vig:{value:3}}},
  async setFlag(ns,key,value){this.flags[ns]??={};this.flags[ns][key]=value;return value;},
  async update(p){for(const [k,v] of Object.entries(p)){if(k==='system.focus.value')this.system.focus.value=v;
    else if(k.startsWith('flags.multiverse-d616.')){this.flags[SYS]??={};this.flags[SYS][k.slice('flags.multiverse-d616.'.length)]=v;}}},
  async createEmbeddedDocuments(_type,docs){const created=docs.map((e,i)=>({...e,id:`e${this.effects.length+i+1}`}));this.effects.push(...created);return created;},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));return ids;},
});
const world=(name)=>{
 const caster=ACTOR('caster'),ally=ACTOR('ally'),item=power(name);item.actor=caster;
 const scene={id:'scene1',grid:{size:100}};
 const source={id:'source',actorId:'caster',actor:caster,disposition:1,parent:scene,x:0,y:0,width:1,height:1};
 const target={id:'target',actorId:'ally',actor:ally,disposition:1,parent:scene,x:100,y:0,width:1,height:1};
 scene.tokens={contents:[source,target],get(id){return this.contents.find(t=>t.id===id)}};
 const combat={id:'combat',started:true,round:2,turn:1,
  combatants:[{id:'caster-combatant',actor:caster,actorId:caster.id},{id:'ally-combatant',actor:ally,actorId:ally.id}],
  get combatant(){return this.combatants[this.turn];}};
 return {caster,ally,item,source,target,scene,combat};
};
test('v203: exactly two registered scoped powers; no script executes as GM',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
 for(const name of ['Change of Plans','Combat Support']){
  const r=REGISTERED_AUTOMATIONS.find(x=>x.powerSet==='Tactics'&&x.powerName===name);
  assert.equal(r.status,'native-partial');assert.equal(r.handlerId,'tactical-once');
  assert.equal(nativeSupportRule(power(name)).kind,'tactical-once');
 }
 assert.equal(nativeSupportRule({...power('Combat Support'),system:{powerSet:'Magic'}}),null);
});
test('v203: one-shot follows source combat turn and never survives next source turn',()=>{
 const e={combatId:'combat',round:2,turn:1,sourceCombatantId:'caster-combatant'};
 const c=world('Combat Support').combat;
 assert.equal(tacticalOnceExpired(e,c),false);
 c.round=3;c.turn=0;assert.equal(tacticalOnceExpired(e,c),true,'source turn is now current');
 c.turn=1;assert.equal(tacticalOnceExpired(e,c),true);
 c.turn=0;c.round=4;assert.equal(tacticalOnceExpired(e,c),true);
 c.id='different';assert.equal(tacticalOnceExpired(e,c),true);
 const ownTurn={combatId:'combat',round:2,turn:0,sourceCombatantId:'caster-combatant'};
 c.id='combat';c.round=2;c.turn=1;
 assert.equal(tacticalOnceExpired(ownTurn,c),false,'source already acted; buff persists for ally');
 c.round=3;c.turn=0;
 assert.equal(tacticalOnceExpired(ownTurn,c),true,'expires at source next turn');
 const reactionBeforeTurn={combatId:'combat',round:2,turn:0,sourceCombatantId:'ally-combatant'};
 c.round=2;c.turn=1;
 assert.equal(tacticalOnceExpired(reactionBeforeTurn,c),true,'a Reaction before source turn expires at same-round turn');
});
test('v203: GM creates a single one-shot, reroll stays manual, then roll consumes effect',async()=>{
 const {caster,ally,item,combat}=world('Change of Plans');
 await createTacticalOnce({source:caster,target:ally,item,kind:'edge',combat});
 assert.equal(canCreateTacticalOnce(ally,'edge',combat),false);
 assert.deepEqual(tacticalOnceModifier(ally,combat).edgeSources.map(e=>e.sign),[1]);
 assert.equal(tacticalOnceModifier(ally,combat).forcedMarvelEffect,null);
 const saved=globalThis.game;globalThis.game={combat};
 try{
  const result=resolveConditionEdges({actor:ally,ability:'vig',attack:false});
  assert.ok(result.sources.some(s=>s.source==='Tactics: Change of Plans'));
  assert.equal(result.autoCount,0);
  assert.equal(result.net,1);
 }finally{globalThis.game=saved;}
 const ids=await consumeTacticalOnce(ally,{marvelM:false,edge:true,combat});
 assert.deepEqual(ids,['e1']);
 assert.deepEqual(tacticalOnceModifier(ally,combat).edgeSources,[]);
});
test('v203: Combat Support forces only the next real check and prevents Marvel-die Trouble',async()=>{
 const {caster,ally,item,combat}=world('Combat Support');
 await createTacticalOnce({source:caster,target:ally,item,kind:'marvelM',combat});
 assert.equal(tacticalOnceModifier(ally,combat).forcedMarvelEffect.id,'e1');
 assert.equal(tacticalMarvelLock({flags:{[SYS]:{tacticalCombatSupport:{noMarvelTrouble:true}}}}),true);
 assert.equal(tacticalMarvelLock({flags:{[SYS]:{}}}),false);
 await consumeTacticalOnce(ally,{marvelM:false,edge:true,combat});
 assert.equal(ally.effects.length,1,'ordinary Edge-only consumption may not eat forced M');
 await consumeTacticalOnce(ally,{marvelM:true,edge:true,combat});
 assert.equal(ally.effects.length,0);
});
test('v203: support enforces allied single target, Focus, one-use-per-combat, reaction',async()=>{
 for(const name of ['Combat Support','Change of Plans']){
  const {caster,ally,item,source,target,scene,combat}=world(name);
  const spent=name==='Combat Support'?10:5;
  const args={caster,item,scene,sourceToken:source,targetTokens:[target],spent,combat};
  assert.equal(inspectSupportRequest(args).ok,true);
  assert.equal(inspectSupportRequest({...args,targetTokens:[source]}).ok,false);
  assert.equal(inspectSupportRequest({...args,targetTokens:[target,target]}).ok,false);
  assert.equal(inspectSupportRequest({...args,spent:4}).ok,false);
  assert.equal(inspectSupportRequest({...args,combat:null}).ok,false);
  const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  let track=0,chat=0;
  globalThis.game={combat,user:{id:'gm',isGM:true},multiverseD616:{turnTracker:{getState:()=>({reactionUsed:0,reactionMax:1}),async trackItemUse(){track++;}}}};
  globalThis.ChatMessage={getSpeaker:()=>({alias:'caster'}),create:async()=>{chat++;}};
  try{
   const result=await executeNativeSupportTransaction(args);
   assert.equal(result.ok,true);assert.equal(caster.system.focus.value,80-spent);
   assert.equal(track,1);assert.equal(chat,1);assert.equal(ally.effects.length,1);
   assert.equal(inspectSupportRequest(args).ok,false,'cannot stack same one-shot');
   if(name==='Combat Support'){
    assert.equal(caster.flags[SYS].nativeCombatSupportUsedCombatId,'combat');
    await ally.deleteEmbeddedDocuments('ActiveEffect',[ally.effects[0].id]);
    assert.equal(inspectSupportRequest(args).ok,false,'combat-wide one use survives effect consumption');
   }
  }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
 }
});
test('v203: last validated atomic support packets stay complete (no mutable nested delta)',()=>{
 const request={id:'round2',sceneId:'scene1',sourceTokenId:'source',itemId:'item1',targetIds:['target'],spent:5};
 const decoded=decodeSupportPacket(encodeSupportPacket(request));
 assert.deepEqual(decoded,request);
});
test('v203: roll pipeline applies actual forced M and consumes ONLY after a confirmed card',()=>{
 const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(source,/rollOptions\.tacticalCombatSupport = true/);
 assert.match(source,/systemFlags\.tacticalCombatSupport=/);
 assert.match(source,/tacticalMarvelLock\(this\)/);
 assert.ok(source.indexOf('await consumeTacticalOnce(this.actor,{marvelM:useTacticalM,edge:true})')>source.indexOf('const createdRollMessage = await roll.toMessage'));
 assert.match(source,/if\(useTacticalM\)\{rollOptions\.forceMarvelM=true;rollOptions\.lockMarvelTrouble=true/);
});

test('v203: Charmed Life is a player-chosen once-per-round Edge, never stacks',async()=>{
 const {caster,combat}=world('Combat Support');
 const item={type:'power',id:'charmed',name:'Charmed Life',img:'luck.webp',system:{powerSet:'Luck'},actor:caster};
 caster.items={contents:[item]};
 const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 globalThis.game={combat};let posts=[];
 globalThis.ChatMessage={getSpeaker:()=>({alias:caster.name}),create:async o=>{posts.push(o);return o}};
 try{
  assert.equal(charmedLifeAvailable(caster,combat),true);
  await armCharmedLife(item,{combat});
  assert.equal(charmedLifeIsArmed(caster,combat),true);
  assert.equal(posts.length,1);assert.match(posts[0].content,/Charmed Life preparado/);
  assert.equal(charmedLifeSource(caster,[],0,combat).sign,1);
  assert.equal(charmedLifeSource(caster,[{source:'other',sign:1}],0,combat),null);
  assert.equal(charmedLifeSource(caster,[],1,combat),null);
  assert.equal(charmedLifeSource(caster,[{source:'Trouble',sign:-1}],0,combat).sign,1);
  const context=resolveConditionEdges({actor:caster,ability:'vig',attack:false});
  assert.equal(context.autoCount,0);assert.equal(context.net,1);
  assert.equal(await consumeCharmedLifeRoll(caster,context,{combat}),true);
  assert.equal(charmedLifeAvailable(caster,combat),false);
  assert.equal(charmedLifeSource(caster,[],0,combat),null);
  await assert.rejects(armCharmedLife(item,{combat}),/já utilizado/);
  combat.round=3;
  assert.equal(charmedLifeAvailable(caster,combat),true);
  assert.equal(charmedLifeIsArmed(caster,combat),false);
 }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
});
test('v203: Charmed Life cannot be expended without an actual eligible roll',async()=>{
 const {caster,combat}=world('Change of Plans');
 const item={type:'power',name:'Charmed Life',system:{powerSet:'Luck'},actor:caster};
 caster.items={contents:[item]};
 const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 globalThis.game={combat};globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>({})};
 try{
  await armCharmedLife(item,{combat});
  assert.equal(await consumeCharmedLifeRoll(caster,{sources:[]},{combat}),false);
  assert.equal(charmedLifeIsArmed(caster,combat),true);
 }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
});
