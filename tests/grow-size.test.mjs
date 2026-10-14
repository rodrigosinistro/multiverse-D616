import assert from 'node:assert/strict';
import {growPowerLevel, availableGrowSizes, naturalGrowSize, growChoiceOptions, applyGrowChoice, promptGrowChoice} from '../scripts/grow-size.mjs';

const powers=Object.fromEntries([1,2,3,4].map(level=>[level,{name:`Grow ${level}`,type:'power',id:`g${level}`} ]));
const sizes=['big','huge','gigantic','titanic','gargantuan'];
let checks=0;
for(let level=1;level<=4;level++) {
  assert.equal(growPowerLevel(powers[level]),level);checks++;
  assert.deepEqual(availableGrowSizes(level).map(o=>o.key),sizes.slice(0,level+1));checks++;
  assert.deepEqual(growChoiceOptions(powers[level],{_source:{system:{size:'average'}},effects:{contents:[]}}).map(o=>o.key),['normal',...sizes.slice(0,level+1)]);checks++;
  assert.equal(availableGrowSizes(level).at(-1).maxFeet,[24,100,400,1600][level-1]);checks++;
}
assert.deepEqual(availableGrowSizes(1,'big').map(o=>o.key),['huge']);checks++;
assert.deepEqual(availableGrowSizes(2,'huge').map(o=>o.key),['gigantic']);checks++;
assert.deepEqual(availableGrowSizes(1,'huge').map(o=>o.key),[]);checks++;
assert.equal(growPowerLevel({type:'weapon',name:'Grow 4'}),0);checks++;
assert.equal(growPowerLevel({type:'power',name:'Growing Attack'}),0);checks++;

const templateKeys=['average','big','huge','gigantic','titanic','gargantuan'];
const defenseMods={average:0,big:-1,huge:-2,gigantic:-3,titanic:-4,gargantuan:-5};
const damageMods={average:0,big:0,huge:2,gigantic:4,titanic:6,gargantuan:8};
const config={sizeEffects:Object.fromEntries(templateKeys.map(size=>[size,{
 name:`${size} Effects`,transfer:true,flags:{'multiverse-d616':{managedSize:true}},changes:[
 {key:'system.size',mode:5,value:size},
 {key:'system.abilities.mle.defense',mode:2,value:defenseMods[size]},
 {key:'system.abilities.agl.defense',mode:2,value:defenseMods[size]},
 ...(damageMods[size]?[{key:'system.abilities.mle.damageMultiplier',mode:2,value:damageMods[size]}]:[]),
 {key:'prototypeToken.width',mode:5,value:size==='gigantic'?20:1}]}]))};
let seq=0;
function makeActor(natural='average',naturalEffect=false) {
 const actor={_source:{system:{size:natural}},effects:{contents:[]},logs:[],
 async createEmbeddedDocuments(type,docs){assert.equal(type,'ActiveEffect');for(const d of docs){this.effects.contents.push({...d,id:`e${++seq}`})}this.logs.push('created');return docs},
 async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.effects.contents=this.effects.contents.filter(e=>!ids.includes(e.id));this.logs.push('deleted');}};
 if(naturalEffect) actor.effects.contents.push({...config.sizeEffects[natural],id:`n${seq++}`});
 return actor;
}
function grown(actor){return actor.effects.contents.find(e=>e.flags?.['multiverse-d616']?.growChoice)}
function effectsOf(actor){return actor.effects.contents.filter(e=>e.flags?.['multiverse-d616']?.growChoice)}
{
 const actor=makeActor();
 assert.equal(naturalGrowSize(actor),'average');checks++;
 await applyGrowChoice(actor,powers[4],'gigantic',config);
 assert.equal(grown(actor).changes.find(c=>c.key==='system.size')?.value,'gigantic');checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.size')?.priority,1000);checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.abilities.mle.damageMultiplier')?.value,4);checks++;
 assert.equal(actor._source.system.size,'average');checks++;
 await applyGrowChoice(actor,powers[4],'huge',config);
 assert.equal(effectsOf(actor).length,1);checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.size')?.value,'huge');checks++;
 assert.deepEqual(actor.logs,['created','deleted','created']);checks++;
 await assert.rejects(()=>applyGrowChoice(actor,powers[1],'titanic',config),/não é permitido/);checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.size')?.value,'huge');checks++;
 await applyGrowChoice(actor,powers[4],'normal',config);
 assert.equal(effectsOf(actor).length,0);checks++;
 assert.equal(actor._source.system.size,'average');checks++;
}
{
 const actor=makeActor('big',true);
 assert.equal(naturalGrowSize(actor),'big');checks++;
 await applyGrowChoice(actor,powers[3],'gigantic',config);
 assert.equal(actor.effects.contents.length,2);checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.abilities.mle.defense').value,-2);checks++;
 assert.equal(grown(actor).changes.find(c=>c.key==='system.abilities.mle.damageMultiplier').value,4);checks++;
 await applyGrowChoice(actor,powers[3],'normal',config);
 assert.equal(actor.effects.contents.length,1);checks++;
 assert.equal(actor.effects.contents[0].name,'big Effects');checks++;
}
{
 const actor=makeActor('average',false);
 actor._source.system.size='average';
 actor.effects.contents.push({...config.sizeEffects.huge,id:'h1'});
 assert.equal(naturalGrowSize(actor),'huge');checks++;
 assert.deepEqual(availableGrowSizes(3,naturalGrowSize(actor)).map(o=>o.key),['gigantic','titanic']);checks++;
}
{
 const actor=makeActor();
 globalThis.foundry={applications:{api:{DialogV2:{wait:async({buttons})=>{
 assert.match(buttons[1].label,/Aplicar/);return 'gargantuan';}}}}};
 assert.equal(await promptGrowChoice(powers[1],actor),null);checks++;
 assert.equal(actor.logs.length,0);checks++;
 globalThis.foundry.applications.api.DialogV2.wait=async()=>null;
 assert.equal(await promptGrowChoice(powers[4],actor),null);checks++;
}
console.log(`Grow size: ${checks} assertions passed.`);
