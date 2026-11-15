import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teamManeuverDescription} from '../scripts/team-maneuvers-core.mjs';
import {teamManeuverAttackEdge,storedTeamManeuvers,activeTeamManeuvers} from '../scripts/team-maneuvers-effects.mjs';
import {executeTeamManeuver} from '../scripts/team-maneuvers.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';

const a=(id,focus=90)=>({id,uuid:`Actor.${id}`,type:'character',name:id,system:{attributes:{rank:{value:2}},focus:{value:focus}},statuses:new Set(),effects:[],
 async update(delta){this.system.focus.value=delta['system.focus.value'];}});
function setup(){
 const actors=[a('Override'),a('Zima'),a('Spectral')];
 const combat={id:'C1',round:2,started:true,flags:{},combatants:new Map(actors.map(actor=>[actor.id,{id:actor.id,name:actor.name,actor}])),
  getFlag(ns,key){return this.flags[ns]?.[key];},
  async setFlag(ns,key,value){(this.flags[ns]??={})[key]=structuredClone(value);}};
 globalThis.game={combat};
 return {actors,combat};
}
const catalog=[{maneuverType:'Offensive',levels:[1,2,3].map(level=>({level,cost:`${level*5} focus, each`,rankAvg:[1,2],description:'Original description'}))}];
const selection={combatId:'C1',round:2,ids:['Override','Zima'],type:'Offensive',level:1};
const opts={user:{isGM:true},send:async()=>{}};

test('Portuguese translations cover all nine catalog benefits, without altering the catalog',()=>{
 for(const type of ['Offensive','Defensive','Rally'])for(const level of [1,2,3]) {
  const description=teamManeuverDescription({type,level,description:'Original description'});
  assert.ok(description.length>35,`${type} ${level}`);
  assert.notEqual(description,'Original description');
 }
 assert.match(teamManeuverDescription({type:'Offensive',level:1}),/1 Edge.*qualquer ataque.*rodada/i);
 assert.equal(teamManeuverDescription({type:'Unknown',level:7,description:'custom'}),'custom');
 const source=readFileSync(new URL('../scripts/team-maneuvers.mjs',import.meta.url),'utf8');
 assert.match(source,/Benefício:<\/strong>.*teamManeuverDescription/);
});

test('GM grants one round-scoped Edge to participants, not to bystanders or ordinary checks',async()=>{
 const {actors,combat}=setup(); const messages=[];
 await executeTeamManeuver(combat,selection,catalog,{...opts,send:async m=>messages.push(m)});
 assert.deepEqual(actors.map(actor=>actor.system.focus.value),[85,85,90]);
 assert.equal(storedTeamManeuvers(combat).length,1);
 assert.deepEqual(storedTeamManeuvers(combat)[0].actorUuids,['Actor.Override','Actor.Zima']);
 assert.equal(activeTeamManeuvers(combat).length,1);
 assert.equal(teamManeuverAttackEdge(actors[0],combat).sign,1);
 assert.equal(teamManeuverAttackEdge(actors[1],combat).sign,1);
 assert.equal(teamManeuverAttackEdge(actors[2],combat),null);
 const attack=resolveConditionEdges({actor:actors[0],ability:'agl',attack:true,kind:'ranged'});
 assert.equal(attack.edgeMode,1);
 assert.equal(attack.net,1);
 assert.equal(attack.sources[0].source,'Manobra de Equipe: Ofensiva — Nível 1');
 assert.equal(attack.autoCount,1);
 assert.equal(resolveConditionEdges({actor:actors[0],ability:'agl',attack:false}).edgeMode,0);
 assert.match(messages[0].content,/Todos os participantes recebem 1 Edge/);
 assert.doesNotMatch(messages[0].content,/The team members/);
});

test('Edge cancels against one Trouble, does not grant a second Edge on duplicate member entries',async()=>{
 const {actors,combat}=setup();
 await executeTeamManeuver(combat,selection,catalog,opts);
 actors[0].statuses.add('mmrpg.demoralized');
 const roll=resolveConditionEdges({actor:actors[0],ability:'mle',attack:true});
 assert.equal(roll.net,0);
 assert.equal(roll.sources.length,2);
 assert.equal(roll.autoCount,0);
});

test('round change expires Edge immediately; stale flags cannot reactivate on another combat',async()=>{
 const {actors,combat}=setup();
 await executeTeamManeuver(combat,selection,catalog,opts);
 combat.round=3;
 assert.equal(teamManeuverAttackEdge(actors[0],combat),null);
 assert.equal(activeTeamManeuvers(combat).length,0);
 const alternate={...combat,id:'C2',round:2};
 assert.equal(teamManeuverAttackEdge(actors[0],alternate),null);
 combat.round=2;combat.started=false;
 assert.equal(teamManeuverAttackEdge(actors[0],combat),null);
});

test('repeating same maneuver and team in the round cannot double charge or stack Edge',async()=>{
 const {actors,combat}=setup();
 await executeTeamManeuver(combat,selection,catalog,opts);
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,opts),/já foi confirmada/);
 assert.deepEqual(actors.map(actor=>actor.system.focus.value),[85,85,90]);
 assert.equal(storedTeamManeuvers(combat).length,1);
});

test('a failed setFlag rolls back all Focus writes and sends no success chat report',async()=>{
 const {actors,combat}=setup(); const messages=[];
 combat.setFlag=async()=>{throw new Error('Persistence refused');};
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,{...opts,send:async m=>messages.push(m)}),/Persistence refused/);
 assert.deepEqual(actors.map(actor=>actor.system.focus.value),[90,90,90]);
 assert.equal(storedTeamManeuvers(combat).length,0);
 assert.equal(messages.length,0);
});
