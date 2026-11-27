import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {combatTeamMembers, findTeamManeuver, planTeamManeuver} from '../scripts/team-maneuvers-core.mjs';
import {executeTeamManeuver} from '../scripts/team-maneuvers.mjs';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const catalog=[
  {maneuverType:'Offensive',levels:[
    {level:1,cost:'5 focus, each',rankAvg:[1,2],description:'One edge on attacks.'},
    {level:2,cost:'10 focus, each',rankAvg:[3,4],description:'Reroll attack dice.'},
    {level:3,cost:'15 focus, each',rankAvg:[5,6],description:'Turn Marvel die.'}]},
  {maneuverType:'Defensive',levels:[{level:1,cost:'5 focus, each',rankAvg:[1,2],description:'DR2'}]},
];
const actor=(id,rank=2,focus=25,type='character')=>({id,name:id,type,uuid:`Actor.${id}`,
  system:{attributes:{rank:{value:rank}},focus:{value:focus}},
  async update(patch){this.system.focus.value=patch['system.focus.value'];}});
function setup(){
 const actors=[actor('darkstep',2,25),actor('zima',3,30),actor('override',2,8)];
 const combatants=new Map(actors.map((a,i)=>[a.id,{id:a.id,tokenId:`token${i}`,actor:a,name:a.name}]));
 const combat={id:'combat-1',started:true,round:2,combatants,flags:{},
  getFlag(ns,key){return this.flags[ns]?.[key];},
  async setFlag(ns,key,value){(this.flags[ns]??={})[key]=value;}};
 return {actors,combat};
}

test('catalog is reused: offensive levels, individual Focus costs and average Rank range',()=>{
 const m=findTeamManeuver(catalog,'offensive',2);
 assert.deepEqual([m.level,m.cost,m.rankRange,m.description],[2,10,[3,4],'Reroll attack dice.']);
 const {combat}=setup();const members=combatTeamMembers(combat);
 const plan=planTeamManeuver(members,['darkstep','zima'],catalog,'Offensive',1);
 assert.equal(plan.totalCost,10);assert.equal(plan.averageRank,2.5);
 assert.equal(plan.rankWithinRange,false,'show rank warning but let GM adjudicate');
 assert.equal(plan.participants.length,2);
});

test('duplicate pool and duplicate combatants cannot spend Focus twice',()=>{
 const {combat,actors}=setup();
 combat.combatants.set('other-dark',{id:'other-dark',actor:actors[0]});
 assert.equal(combatTeamMembers(combat).length,3);
 assert.throws(()=>planTeamManeuver(combatTeamMembers(combat),['darkstep','darkstep'],catalog,'Offensive',1),/pelo menos dois/);
 assert.throws(()=>planTeamManeuver(combatTeamMembers(combat),['darkstep','missing'],catalog,'Offensive',1),/saiu do combate/);
});

test('insufficient Focus and invalid participant selection are blocked before payment',()=>{
 const {combat}=setup();const members=combatTeamMembers(combat);
 assert.throws(()=>planTeamManeuver(members,['override','darkstep'],catalog,'Offensive',2),/precisa de 10 Focus/);
 assert.throws(()=>findTeamManeuver(catalog,'Unknown',1),/não encontrado/);
 assert.throws(()=>planTeamManeuver(members,['override'],catalog,'Defensive',1),/pelo menos dois/);
});

test('only GM may pay; successful confirmation changes Focus once per Actor and sends auditable chat report',async()=>{
 const {combat,actors}=setup();const messages=[];
 const selection={combatId:combat.id,ids:['darkstep','zima'],type:'Offensive',level:1};
 const send=async message=>{messages.push(message);};
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,{user:{isGM:false},send}),/Mestre/);
 assert.deepEqual(actors.map(a=>a.system.focus.value),[25,30,8]);
 const plan=await executeTeamManeuver(combat,selection,catalog,{user:{isGM:true},send});
 assert.equal(plan.totalCost,10);assert.deepEqual(actors.map(a=>a.system.focus.value),[20,25,8]);
 assert.equal(messages.length,1);assert.match(messages[0].content,/Focus descontado/);
 assert.match(messages[0].content,/1 Edge em qualquer ataque/);
 assert.match(messages[0].content,/Benefício ativado automaticamente/);
 assert.deepEqual(messages[0].flags['multiverse-d616'].teamManeuver.memberIds,['darkstep','zima']);
});

test('failure mid-payment restores spent Focus and does not publish result',async()=>{
 const {combat,actors}=setup();const sent=[];
 actors[1].update=async()=>{throw Error('backend failure');};
 await assert.rejects(executeTeamManeuver(combat,
   {combatId:combat.id,ids:['darkstep','zima'],type:'Offensive',level:1},catalog,
   {user:{isGM:true},send:m=>sent.push(m)}),/backend failure/);
 assert.equal(actors[0].system.focus.value,25);assert.equal(sent.length,0);
});

test('changing combat or not starting combat prevents payment',async()=>{
 const {combat,actors}=setup();const selection={combatId:'other',ids:['darkstep','zima'],type:'Offensive',level:1};
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,{user:{isGM:true}}),/mudou/);
 selection.combatId=combat.id;combat.started=false;combat.round=0;
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,{user:{isGM:true}}),/Inicie o combate/);
 assert.equal(actors[0].system.focus.value,25);
});

test('character sheet and HUD expose Team Maneuvers; no permanent condition, DR or die manipulation',()=>{
 const sheet=source('../templates/actor/actor-character-sheet.hbs');
 const actorJS=source('../multiverse-d616.mjs');const hud=source('../scripts/native-action-hud.mjs');
 const implementation=source('../scripts/team-maneuvers.mjs');
 assert.match(sheet,/d616-team-open/);assert.match(actorJS,/openTeamManeuverDialog\(this\.actor\)/);
 assert.match(hud,/team\.dataset\.action = 'team-maneuver'/);assert.match(hud,/openTeamManeuverDialog\(actor\)/);
 assert.doesNotMatch(implementation,/createEmbeddedDocuments\(['"]ActiveEffect/);
 assert.match(implementation,/Benefício ativado automaticamente/);
 const manifest=JSON.parse(source('../system.json'));
 assert.ok(manifest.styles.includes('styles/team-maneuvers.css'));
});

test('README is byte-for-byte identical to approved release; CHANGELOG records latest 157',()=>{
 const readme=readFileSync(new URL('../README.md',import.meta.url));
 assert.equal(createHash('sha256').update(readme).digest('hex'),'04838f7de55c47a833f548639088158f9827c26be17f8a12ea8f49164bdf45cf');
 assert.match(source('../CHANGELOG.md'),/^## v0\.2\.237/);
});

test('a maneuver cannot be executed in a later round than it was prepared',async()=>{
 const {combat,actors}=setup();
 await assert.rejects(executeTeamManeuver(combat,
   {combatId:combat.id,round:combat.round-1,ids:['darkstep','zima'],type:'Offensive',level:1},catalog,
   {user:{isGM:true},send:async()=>{}}),/rodada mudou/);
 assert.equal(actors[0].system.focus.value,25);
});

test('concurrent double-confirmation of the same maneuver is refused without double spending',async()=>{
 const {combat,actors}=setup();
 let release;const gate=new Promise(resolve=>{release=resolve;});
 actors[0].update=async patch=>{await gate;actors[0].system.focus.value=patch['system.focus.value'];};
 const selection={combatId:combat.id,round:combat.round,ids:['darkstep','zima'],type:'Offensive',level:1};
 const settings={user:{isGM:true},send:async()=>{}};
 const first=executeTeamManeuver(combat,selection,catalog,settings);
 await assert.rejects(executeTeamManeuver(combat,selection,catalog,settings),/já está sendo processada/);
 release();await first;
 assert.deepEqual(actors.map(a=>a.system.focus.value),[20,25,8]);
});
