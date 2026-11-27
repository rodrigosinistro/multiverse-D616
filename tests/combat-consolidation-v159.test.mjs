import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeTeamManeuver} from '../scripts/team-maneuvers.mjs';
import {storedTeamManeuvers,activeTeamManeuvers,teamAttackSnapshot,
  teamFantasticAdjustment,teamManeuverAttackEdge,teamManeuverDamageReduction,
  effectiveTeamDamageReduction,registerTeamManeuverRoundHooks,
} from '../scripts/team-maneuvers-effects.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {getMarvelOutcome} from '../scripts/power-conditions.mjs';
import {actorReactionMaximum,resolveTurnResourceState} from '../scripts/combat/reaction-limits.mjs';
import {resetTurnState} from '../scripts/combat/turn-tracker-core.mjs';

const catalog=['Offensive','Defensive','Rally'].map(maneuverType=>({maneuverType,
  levels:[1,2,3].map(level=>({level,cost:`${level*5} Focus`,rankAvg:[1,6],description:'Catalog'}))}));
function deferred(){let release;const pending=new Promise(resolve=>{release=resolve;});return {pending,release};}
function actor(name,rank=3,focus=100){return {
  id:name,name,uuid:`Actor.${name}`,type:'character',items:[],statuses:new Set(),effects:[],
  system:{attributes:{rank:{value:rank}},focus:{value:focus},healthDamageReduction:1,focusDamageReduction:3},
  async update(data){this.system.focus.value=data['system.focus.value'];},
};}
function setup(){
  const actors=['Thermal','Override','Spectral'].map((name,index)=>actor(name,index===2?4:3));
  const combat={id:'round-consolidation',round:2,started:true,flags:{},
    combatants:new Map(actors.map(a=>[a.id,{id:a.id,actor:a}])),
    getFlag(system,key){return this.flags[system]?.[key];},
    async setFlag(system,key,value){(this.flags[system]??={})[key]=structuredClone(value);},
  };
  globalThis.game={combat,user:{isGM:true},messages:{contents:[]}};
  const select=(type='Offensive',level=1,ids=['Thermal','Override'])=>({
    combatId:combat.id,round:combat.round,ids,type,level,
  });
  const opts={user:{isGM:true},send:async()=>{}};
  return {actors,combat,select,opts};
}

// The regression prevented a GM from spending Focus in a round that advanced
// while a previous participant's Actor.update was still pending.
test('changing combat round mid-payment refunds only the debited Focus',async()=>{
  const {actors,combat,select,opts}=setup();const gate=deferred();
  const original=actors[0].update.bind(actors[0]);let entered;
  const didEnter=new Promise(resolve=>{entered=resolve;});
  actors[0].update=async function(delta){await original(delta);if(delta['system.focus.value']===95){entered();await gate.pending;}};
  const pending=executeTeamManeuver(combat,select(),catalog,opts);
  await didEnter;assert.equal(actors[0].system.focus.value,95);
  combat.round=3;gate.release();
  await assert.rejects(pending,/rodada mudou/i);
  assert.deepEqual(actors.map(a=>a.system.focus.value),[100,100,100]);
  assert.equal(storedTeamManeuvers(combat).length,0);
});

test('round change during flag persistence removes stale effect and refunds Focus',async()=>{
  const {actors,combat,select,opts}=setup();const gate=deferred();
  const original=combat.setFlag.bind(combat);let saving;
  const didStart=new Promise(resolve=>{saving=resolve;});let calls=0;
  combat.setFlag=async (...args)=>{calls++;if(calls===1){saving();await gate.pending;}return original(...args);};
  const pending=executeTeamManeuver(combat,select('Defensive',2),catalog,opts);
  await didStart;
  assert.deepEqual(actors.map(a=>a.system.focus.value),[90,90,100]);
  combat.round=3;gate.release();
  await assert.rejects(pending,/rodada mudou/i);
  assert.equal(storedTeamManeuvers(combat).length,0,'no ghost buff after a future rewind');
  assert.deepEqual(actors.map(a=>a.system.focus.value),[100,100,100]);
  assert.equal(calls,2,'stale flag was explicitly cleaned');
});

test('two overlapping team confirmations in the same combat cannot charge Focus twice',async()=>{
  const {actors,combat,select,opts}=setup();const gate=deferred();
  const original=actors[0].update.bind(actors[0]);let entered;
  const didEnter=new Promise(resolve=>{entered=resolve;});
  actors[0].update=async function(delta){await original(delta);if(delta['system.focus.value']===95){entered();await gate.pending;}};
  const first=executeTeamManeuver(combat,select('Offensive',1),catalog,opts);
  await didEnter;
  await assert.rejects(executeTeamManeuver(combat,select('Defensive',1,['Thermal','Spectral']),catalog,opts),/já está sendo processada/);
  gate.release();await first;
  assert.deepEqual(actors.map(a=>a.system.focus.value),[95,95,100]);
  assert.deepEqual(storedTeamManeuvers(combat).map(e=>e.type),['Offensive']);
});

test('delayed end-of-round cleanup cannot overwrite a new round maneuver',async()=>{
  const {actors,combat,select,opts}=setup();
  await executeTeamManeuver(combat,select('Offensive',1),catalog,opts);
  combat.round=3;
  const gate=deferred();let entered;
  const didEnter=new Promise(resolve=>{entered=resolve;});
  const original=combat.setFlag.bind(combat);let delayed=false;
  combat.setFlag=async (...args)=>{
    if(!delayed){delayed=true;entered();await gate.pending;}
    return original(...args);
  };
  let onChange;
  globalThis.Hooks={on(type,fn){if(type==='updateCombat')onChange=fn;}};
  registerTeamManeuverRoundHooks();
  onChange(combat,{round:3});
  await didEnter;
  const next=executeTeamManeuver(combat,select('Defensive',3),catalog,opts);
  gate.release();await next;
  assert.deepEqual(storedTeamManeuvers(combat).map(e=>[e.round,e.type,e.level]),[[3,'Defensive',3]]);
  assert.equal(teamManeuverDamageReduction(actors[0],combat),8);
  assert.equal(teamManeuverAttackEdge(actors[0],combat),null);
});

test('rolling a round forward expires Edge and DR, without modifying permanent actor defenses',async()=>{
  const {actors,combat,select,opts}=setup();
  await executeTeamManeuver(combat,select('Offensive',1),catalog,opts);
  await executeTeamManeuver(combat,select('Defensive',3),catalog,opts);
  assert.equal(resolveConditionEdges({actor:actors[0],ability:'agl',attack:true}).edgeMode,1);
  assert.equal(resolveConditionEdges({actor:actors[0],ability:'agl',attack:false}).edgeMode,0);
  assert.equal(effectiveTeamDamageReduction(actors[0],'health',combat),8);
  assert.equal(effectiveTeamDamageReduction(actors[0],'focus',combat),8);
  assert.equal(actors[0].system.healthDamageReduction,1);
  assert.equal(actors[0].system.focusDamageReduction,3);
  combat.round=3;
  assert.equal(activeTeamManeuvers(combat).length,0);
  assert.equal(teamManeuverAttackEdge(actors[0],combat),null);
  assert.equal(effectiveTeamDamageReduction(actors[0],'health',combat),1);
  assert.equal(effectiveTeamDamageReduction(actors[0],'focus',combat),3);
});

test('Fantastic is resolved per target rank; reaction traits and new turn reset stay independent',async()=>{
  const {actors,combat,select,opts}=setup();
  await executeTeamManeuver(combat,select('Offensive',3),catalog,opts);
  const snapshot=teamAttackSnapshot(actors[0],combat);
  assert.deepEqual(teamFantasticAdjustment(snapshot,3,5),{fantastic:true,delta:1,rank:3});
  assert.deepEqual(teamFantasticAdjustment(snapshot,4,5),{fantastic:true,delta:1,rank:4});
  assert.equal(teamFantasticAdjustment(snapshot,2,5),null);
  assert.equal(actorReactionMaximum(actors[0]),1);
  actors[0].items.push({type:'trait',name:'Combat Reflexes'});
  assert.equal(actorReactionMaximum(actors[0]),2);
  assert.equal(resolveTurnResourceState({reactionMax:1},actors[0]).reactionMax,2);
  const prior={actionUsed:1,reactionUsed:2,movementUsed:4,movementExtraActionUsed:true};
  const next=resetTurnState(prior,'battle:regular:3:0:Thermal',5);
  assert.deepEqual([next.actionUsed,next.reactionUsed,next.movementUsed,next.movementExtraActionUsed],[0,0,0,false]);
});

test('review package version and unchanged Combat/Focus/damage entry points',()=>{
  const system=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  assert.equal(system.version,'0.2.237');
  const src=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(src,/teamOffensive3ForcesRoll\(this\.actor,markedActors\)/);
  assert.match(src,/effectiveTeamDamageReduction\(target,drCategory\)/);
  assert.match(src,/combatTrickery\.apply \|\| forceTeamMarvelM/);
  const snap=teamAttackSnapshot(actor('NPC'),{id:'other',round:1,started:false});
  assert.equal(snap,null);
});
