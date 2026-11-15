import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  activeTeamManeuvers,actorTeamManeuverLevels,teamManeuverDamageReduction,
  effectiveTeamDamageReduction,teamAttackSnapshot,teamFantasticAdjustment,
  teamFantasticForTarget,keptMarvelValue,teamManeuverAttackEdge,
} from '../scripts/team-maneuvers-effects.mjs';
import {getMarvelOutcome} from '../scripts/power-conditions.mjs';
import {chooseTeamReroll,teamRerollPermission,executeTeamOffensiveReroll} from '../scripts/team-maneuvers-rolls.mjs';
import {executeTeamManeuver} from '../scripts/team-maneuvers.mjs';

const catalog=['Offensive','Defensive','Rally'].map(maneuverType=>({maneuverType,levels:[1,2,3].map(level=>({level,rankAvg:[1,6],cost:`${level*5} focus, each`,description:'Sample'}))}));
function actor(name,rank=3){return {name,id:name,uuid:`Actor.${name}`,type:'character',statuses:new Set(),effects:[],system:{attributes:{rank:{value:rank}},focus:{value:100},healthDamageReduction:1,focusDamageReduction:3},async update(patch){this.system.focus.value=patch['system.focus.value'];}};}
function setup(){
 const actors=[actor('A',3),actor('B',4),actor('C',2)];
 const combat={id:'C',round:2,started:true,combatants:new Map(actors.map(a=>[a.id,{id:a.id,actor:a}])),flags:{},getFlag(ns,key){return this.flags[ns]?.[key];},async setFlag(ns,key,data){(this.flags[ns]??={})[key]=structuredClone(data);}};
 globalThis.game={combat,user:{id:'gm',isGM:true},messages:{contents:[]}};
 return {actors,combat};
}
async function activate(combat,type,level,ids=['A','B']){
 const selection={combatId:combat.id,round:combat.round,ids,type,level};
 return executeTeamManeuver(combat,selection,catalog,{user:{isGM:true},send:async()=>{}});
}
function roll(total,mFace=3){
 return {total,options:{},data:{},formula:'{1d6,1dm,1d6}+@agl.value',
   terms:[{rolls:[{dice:[{results:[{result:3,active:true}]}]},
     {dice:[{results:[{result:mFace,active:true}],constructor:{name:'MarvelDie'}}]},
     {dice:[{results:[{result:4,active:true}]}]}]}],
   async toMessage(){return {content:`Novo total ${this.total}`,rolls:[this]};}};
}
function message(attack,rollValue,flags={}){
 return {id:'m1',isAuthor:true,rolls:[rollValue],flavor:'ataque',content:'original',flags:{'multiverse-d616':flags},
   getFlag(ns,key){return this.flags?.[ns]?.[key];},
   async update(patch){this.content=patch.content;this.rolls=patch.rolls;
     this.flags['multiverse-d616'].teamOffensive2Used=patch['flags.multiverse-d616.teamOffensive2Used'];
     this.flags['multiverse-d616'].teamOffensive2Summary=patch['flags.multiverse-d616.teamOffensive2Summary'];return this;}};
}

test('activates all three Defensive tiers, highest benefit wins but never stacks with preexisting DR',async()=>{
 const {actors,combat}=setup();
 assert.equal(effectiveTeamDamageReduction(actors[0],'focus'),3);
 await activate(combat,'Defensive',1);
 assert.equal(teamManeuverDamageReduction(actors[0],combat),2);
 assert.equal(effectiveTeamDamageReduction(actors[0],'health',combat),2);
 assert.equal(effectiveTeamDamageReduction(actors[0],'focus',combat),3);
 await activate(combat,'Defensive',2);
 assert.equal(effectiveTeamDamageReduction(actors[0],'health',combat),4);
 await activate(combat,'Defensive',3);
 assert.equal(effectiveTeamDamageReduction(actors[0],'focus',combat),8);
 assert.equal(effectiveTeamDamageReduction(actors[2],'health',combat),1);
 assert.equal(activeTeamManeuvers(combat).length,3);
 combat.round=3;
 assert.equal(teamManeuverDamageReduction(actors[0],combat),0);
 assert.equal(effectiveTeamDamageReduction(actors[0],'health',combat),1);
 assert.equal(effectiveTeamDamageReduction(actors[0],'focus',combat),3);
});

test('Offensive tiers are round-scoped; Rally is descriptive without applying mechanical benefits',async()=>{
 const {actors,combat}=setup();
 await activate(combat,'Offensive',1);
 await activate(combat,'Offensive',2);
 await activate(combat,'Offensive',3);
 const flags=teamAttackSnapshot(actors[0],combat);
 assert.deepEqual(flags.levels,[1,2,3]);
 assert.equal(teamManeuverAttackEdge(actors[0],combat).sign,1);
 assert.equal(teamAttackSnapshot(actors[2],combat),null);
 await activate(combat,'Rally',3);
 assert.deepEqual(actorTeamManeuverLevels(actors[0],'Offensive',combat),[1,2,3]);
 assert.equal(teamManeuverDamageReduction(actors[0],combat),0);
 combat.round=3;
 assert.equal(teamAttackSnapshot(actors[0],combat),null);
 assert.equal(teamManeuverAttackEdge(actors[0],combat),null);
});

test('Offensive 3 adjusts Marvel M and only equal-or-higher rank targets, including Fantasy outcome and damage delta',async()=>{
 const {actors,combat}=setup();await activate(combat,'Offensive',3);
 const snapshot=teamAttackSnapshot(actors[0],combat);
 const r=roll(12,3);
 const m=message(null,r,{teamAttackBenefits:snapshot});
 assert.equal(keptMarvelValue(r),3);
 assert.deepEqual(teamFantasticAdjustment(snapshot,4,3),{fantastic:true,delta:3,rank:4});
 assert.equal(teamFantasticAdjustment(snapshot,2,3),null);
 assert.equal(teamFantasticForTarget(r,m,actors[1]).delta,3);
 assert.equal(teamFantasticForTarget(r,m,actors[2]),null);
 const equal=actor('Equal',3);
 assert.deepEqual(getMarvelOutcome(r,14,{message:m,targetActor:equal}),{
   success:true,fantastic:true,label:'SUCESSO FANTÁSTICO'});
 assert.deepEqual(getMarvelOutcome(r,14,{message:m,targetActor:actors[2]}),{
   success:false,fantastic:false,label:'FALHA'});
 const alreadyM=roll(13,1);assert.equal(teamFantasticForTarget(alreadyM,m,equal).delta,0);
});

test('Offensive 2 repeats the full attack once; best total is retained; no new Focus or attack',async()=>{
 const {actors,combat}=setup();await activate(combat,'Offensive',2);
 const initial=roll(10),snap=teamAttackSnapshot(actors[0],combat);
 const msg=message(null,initial,{teamAttackBenefits:snap});
 assert.equal(teamRerollPermission(msg),true);
 class FakeRoll {constructor(formula,data,options){this.formula=formula;this.data=data;this.options=options;this.total=17;this.terms=roll(17).terms;}
   async evaluate(){return this;}async toMessage(){return {rolls:[this],content:'novo 17'};}}
 const response=await executeTeamOffensiveReroll(msg,{combat,user:{isGM:true},RollClass:FakeRoll});
 assert.equal(response.useNew,true);
 assert.equal(msg.rolls[0].total,17);
 assert.equal(msg.getFlag('multiverse-d616','teamOffensive2Used'),true);
 assert.equal(teamRerollPermission(msg),false);
 assert.equal(actors[0].system.focus.value,90);
 await assert.rejects(executeTeamOffensiveReroll(msg,{combat,user:{isGM:true},RollClass:FakeRoll}),/não está mais disponível/);
 assert.equal(chooseTeamReroll(roll(17),roll(9)).useNew,false);
 assert.equal(chooseTeamReroll(roll(12,3),roll(12,1)).useNew,true);
});

test('Offensive 2 button expires at round change and is forbidden after a DAMAGE card is generated',async()=>{
 const {actors,combat}=setup();await activate(combat,'Offensive',2);
 const snap=teamAttackSnapshot(actors[0],combat),msg=message(null,roll(11),{teamAttackBenefits:snap});
 game.messages.contents=[{getFlag:(ns,key)=>key==='damageApplication'?{sourceMessageId:msg.id}:null}];
 await assert.rejects(executeTeamOffensiveReroll(msg),/card de dano/);
 game.messages.contents=[];combat.round=3;
 assert.equal(teamRerollPermission(msg,combat),false);
});

test('attack damage, MMDR and ongoing scripts use transient DR and Rank-target Fantastic helpers',()=>{
 const root=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const damage=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 const ongoing=readFileSync(new URL('../scripts/ongoing-power-effects.mjs',import.meta.url),'utf8');
 const power=readFileSync(new URL('../scripts/power-conditions.mjs',import.meta.url),'utf8');
 assert.match(root,/effectiveTeamDamageReduction\(target,drCategory\)/);
 assert.match(root,/teamMarvel=teamFantasticForTarget\(roll,chatMessage,target\)/);
 assert.match(root,/marvelDie:targetMarvelTotal/);
 assert.match(root,/registerTeamManeuverRollHooks\(\)/);
 assert.match(damage,/return effectiveTeamDamageReduction\(actor,category\)/);
 assert.match(ongoing,/effectiveTeamDamageReduction\(actor,'health'\)/);
 assert.match(power,/getMarvelOutcome\(roll, defense, \{message=null,targetActor=null\}=\{\}\)/);
 const config=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
 assert.equal(config.version,'0.2.178');
});
