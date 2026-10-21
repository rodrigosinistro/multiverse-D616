import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POWER_CONDITIONS, conditionsForOutcome, mustConfirmPowerDamage,
  confirmPowerDamageFromCard } from '../scripts/power-conditions.mjs';
import { resolvePowerRoll, powerDamageReductionCategory } from '../scripts/power-rolls.mjs';
import { calculatePowerDamage } from '../scripts/power-fantastic-damage.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url),'utf8')).items;
const originals=name=>catalog.filter(x=>x.name===name);
const names=['Crushing Grip','Telekinetic Crush','Suppressive Fire','Covering Fire','Return Fire'];
const focusNames=['Suppressive Fire','Covering Fire','Return Fire'];
const saveGame=globalThis.game;

test('v0.2.57: powers are canonical and status only follows successful Fantastic damage confirmation',()=>{
 for(const name of names){
  assert.ok(originals(name).length,name);
  assert.ok(mustConfirmPowerDamage(name),name);
  assert.deepEqual(conditionsForOutcome(name,{success:true,fantastic:false}),[],name);
  const fantastic=conditionsForOutcome(name,{success:true,fantastic:true});
  assert.equal(fantastic.length,1,name);
  assert.equal(fantastic[0].status,focusNames.includes(name)?'stunned':'pinned',name);
  assert.deepEqual(conditionsForOutcome(name,{success:false,fantastic:true}),[],name);
 }
 for(const name of focusNames){
  const r=POWER_CONDITIONS[name][0];
  assert.equal(r.requiresDamage,true);assert.equal(r.damageCategory,'focus');
 }
 assert.equal(POWER_CONDITIONS['Covering Fire'][0].expires,'round');
 assert.equal(POWER_CONDITIONS['Return Fire'][0].expires,'turn');
 assert.equal(POWER_CONDITIONS['Suppressive Fire'][0].expires,'turn');
});

test('v0.2.57: imported legacy attack metadata and DR type corrected, without rewriting catalog',()=>{
 const expected={
  'Suppressive Fire':{ability:'agl',attackTarget:'vig',damageType:'focus'},
  'Covering Fire':{ability:'agl',attackTarget:'vig',damageType:'focus'},
  'Return Fire':{ability:'agl',attackTarget:'vig',damageType:'focus'},
 };
 for(const [name,fields] of Object.entries(expected)){
  const item=originals(name)[0];
  const profile=resolvePowerRoll(item);
  assert.equal(profile.attack,true,name);
  assert.equal(profile.checkOnly,false,name);
  for(const [k,value] of Object.entries(fields))assert.equal(profile[k],value,`${name} ${k}`);
  assert.equal(powerDamageReductionCategory(name,profile.damageType),'health');
  // E.g. target has DR Health 3 and DR Focus 10, power must use 3.
  const dealt=calculatePowerDamage({powerName:name,marvelDie:6,damageMultiplier:4,
    damageReduction:3,ability:2,enabled:true}).damage;
  assert.equal(dealt,8,name); // 6*(4-3)+2
 }
 assert.equal(powerDamageReductionCategory('Telepathic Blast','focus'),'focus');
 assert.equal(powerDamageReductionCategory('Smash','health'),'health');
 const custom={...originals('Covering Fire')[0],system:{...originals('Covering Fire')[0].system,attackTarget:'ego'}};
 assert.equal(resolvePowerRoll(custom).attackTarget,'ego','custom defense untouched');
});

function roll(face=1,total=20){
 const die=n=>({results:[{active:true,result:n}]});
 return {total,options:{},terms:[{roll:{terms:[{rolls:[
  {dice:[die(3)]},{dice:[{constructor:{name:'MarvelDie'},results:[{active:true,result:face}]}]},{dice:[die(3)]},
 ]}]}}]};
}
function env(name){
 let count=0;
 const target={uuid:'Scene.x.Token.t.Actor.a',effects:[],items:new Map(),system:{abilities:{res:{defense:16},vig:{defense:16},mle:{defense:16},agl:{defense:16}}},
  async createEmbeddedDocuments(type,records){assert.equal(type,'ActiveEffect');for(const record of records)this.effects.push({...record,id:'c'+ ++count});},
  async deleteEmbeddedDocuments(type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));},
 };
 const source={uuid:'Actor.s',effects:[],items:new Map([['p',{id:'p',name,type:'power',system:{attackTarget:resolvePowerRoll(originals(name)[0]).attackTarget}}]])};
 const token={uuid:'Scene.x.Token.t',documentName:'Token',id:'t',actor:target,parent:{id:'x'}};
 const caster={uuid:'Scene.x.Token.s',documentName:'Token',id:'s',actor:source,parent:{id:'x'}};
 const combatants=[{id:'ca',tokenId:'s',sceneId:'x',actor:source},{id:'ct',tokenId:'t',sceneId:'x',actor:target}];
 const combat={id:'cmb',started:true,round:1,turn:0,combatant:combatants[0],combatants};
 const flags={itemId:'p',attackTarget:resolvePowerRoll(originals(name)[0]).attackTarget,targets:[{uuid:token.uuid}]};
 const msg={id:'m',speaker:{scene:'x',token:'s',actor:'s'},rolls:[roll()],
  getFlag(ns,k){return flags[k];},async setFlag(ns,k,v){flags[k]=v;}};
 const scene={tokens:new Map([['t',token],['s',caster]])};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat,
  scenes:new Map([['x',scene]]),actors:new Map([['s',source]]),messages:new Map([['m',msg]]),
  settings:{get(){return undefined;}}};
 globalThis.CONFIG={statusEffects:{}};
 globalThis.fromUuid=async uuid=>uuid===token.uuid?token:uuid===caster.uuid?caster:null;
 const damageMessage={id:'d',getFlag(ns,k){return k==='sourceMessageId'?'m':null;}};
 return {target,msg,damageMessage,token};
}
test('v0.2.57: confirmed Fantastic grip attacks pin only the hit target',async()=>{
 try{
  for(const name of ['Crushing Grip','Telekinetic Crush']){
   const e=env(name);
   await confirmPowerDamageFromCard(e.damageMessage,'full',[{targetUuid:e.token.uuid,delta:8,category:'health'}]);
   assert.deepEqual(e.target.effects.map(f=>f.statuses[0]),['mmrpg.pinned'],name);
   await confirmPowerDamageFromCard(e.damageMessage,'full',[{targetUuid:e.token.uuid,delta:8,category:'health'}]);
   assert.equal(e.target.effects.length,1,`${name} no duplicate`);
  }
 }finally{globalThis.game=saveGame;}
});
test('v0.2.57: Focus stun requires real confirmed Focus loss, never Health-only',async()=>{
 try{
  for(const name of focusNames){
   const e=env(name);
   await confirmPowerDamageFromCard(e.damageMessage,'full',[{targetUuid:e.token.uuid,delta:8,category:'health'}]);
   assert.equal(e.target.effects.length,0,`${name} health is insufficient`);
   await confirmPowerDamageFromCard(e.damageMessage,'full',[{targetUuid:e.token.uuid,delta:0,category:'focus'}]);
   assert.equal(e.target.effects.length,0,`${name} zero Focus is insufficient`);
   await confirmPowerDamageFromCard(e.damageMessage,'full',[{targetUuid:e.token.uuid,delta:3,category:'focus'}]);
   assert.deepEqual(e.target.effects.map(f=>f.statuses[0]),['mmrpg.stunned'],name);
   assert.equal(e.target.effects[0].flags['multiverse-d616'].powerCondition.expires,
     name==='Covering Fire'?'round':'turn');
  }
 }finally{globalThis.game=saveGame;}
});
