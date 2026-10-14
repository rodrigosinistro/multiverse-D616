import assert from 'node:assert/strict';
import { prepareD616Movement, SIZE_SPEED } from '../scripts/movement-calculator.mjs';
import { readFileSync, existsSync } from 'node:fs';

const defaultModes=['run','climb','swim','jump','flight','glide','swingline','levitation'];
function scenario({ agility=4, rank=3, size='average', naturalSize=size, run=5, reach=1, effects=[], unusual=false,
  runCalc='', flightCalc='rank', jumpCalc='', climbCalc='', swimCalc='', glideCalc='', flightMultiplier=3, runMultiplier=1, extraTraits=[] }={}) {
  const movement=Object.fromEntries(defaultModes.map(k=>[k, { value: k==='run'?run:5, noncom:5, calc:({run:runCalc, flight:flightCalc, jump:jumpCalc, climb:climbCalc, swim:swimCalc, glide:glideCalc})[k]??'', active:true }]));
  movement.flight.noncom=5*flightMultiplier;movement.run.noncom=5*runMultiplier;
  const system={movement, size, reach, attributes:{rank:{value:rank}}, abilities:{agl:{value:agility}}};
  const actor={ _source:{ system:{size:naturalSize,reach,movement:{run:{value:run},flight:{noncom:5}}} },
    items:{contents:[...(unusual?[{type:'trait',name:'Unusual Size'}]:[]),...extraTraits]},
    effects:{contents:effects}};
  for (const e of effects) {
    for (const c of e.system?.changes??e.changes??[]) {
      if(c.key==='system.movement.run.value') {
        if(c.type==='multiply')system.movement.run.value*=Number(c.value);
        if(c.type==='add')system.movement.run.value+=Number(c.value);
      }
      const m=/^system\.movement\.(\w+)\.noncomFactor$/.exec(c.key);
      if(m && c.type==='upgrade')system.movement[m[1]].noncomFactor=Math.max(
        system.movement[m[1]].noncomFactor??1,Number(c.value));
    }
  }
  prepareD616Movement(system,actor);
  return system;
}
let tests=0;
function check(label,opts,expected){ const s=scenario(opts);for(const [path,value]of Object.entries(expected)){
 const actual=path.split('.').reduce((obj,k)=>obj?.[k],s);
 assert.equal(actual,value,`${label}: ${path} wanted ${value}, got ${actual}`);}
 tests++;
}
const legacy=(size,runValue,type='multiply')=>({name:`${size[0].toUpperCase()+size.slice(1)} Effects`,disabled:false,system:{changes:[
 {key:'system.size',type:'override',value:size},
 {key:'system.movement.run.value',type,value:runValue}
]}});
check('Average Agility 4',{},{'movement.run.value':5,'movement.flight.value':15,'movement.climb.value':3,'movement.flight.noncom':45});
check('Agility 5',{agility:5},{'movement.run.value':6,'movement.flight.value':18,'movement.climb.value':3});
check('Agility 10',{agility:10},{'movement.run.value':7,'movement.flight.value':21,'movement.climb.value':4});
check('Agility already included legacy',{agility:5,run:6},{'movement.run.value':6,'movement.flight.value':18});
check('big',{size:'big'},{'movement.run.value':6,'movement.flight.value':15,'movement.climb.value':3});
check('big Speed Run rank',{size:'big',runCalc:'rank'},{'movement.run.value':18,'movement.flight.value':15,'movement.climb.value':9});
check('small',{size:'small'},{'movement.run.value':4,'movement.flight.value':15,'movement.climb.value':2});
check('little',{size:'little'},{'movement.run.value':1,'movement.flight.value':15,'movement.climb.value':1,'reach':0});
for (const size of ['tiny','miniature','microscopic'])check(size,{size},{'movement.run.value':0,'movement.flight.value':15,'movement.climb.value':0,'reach':0});
for (const [size,factor]of [['huge',5],['gigantic',20],['titanic',80],['gargantuan',320]]) {
 check(size,{size},{'movement.run.value':5*factor,'movement.flight.value':15,'reach':factor});
 check(size+' Unusual Size',{size,unusual:true},{'movement.run.value':5*factor,'movement.flight.value':18});
 check(size+' old effect',{size,unusual:true,effects:[legacy(size,factor)]},{'movement.run.value':5*factor,'movement.flight.value':18});
}
check('Sentinela saved Huge Effects',{size:'huge',unusual:true,effects:[legacy('huge',5)]},{'movement.run.value':25,'movement.flight.value':18,'movement.flight.noncom':54,'movement.climb.value':13});
check('Sentinela without Unusual Size',{size:'huge',effects:[legacy('huge',5)]},{'movement.run.value':25,'movement.flight.value':15,'movement.flight.noncom':45});
check('Huge wrongly set without effect',{size:'huge'},{'movement.run.value':25,'movement.flight.value':15});
check('Big old add effect',{size:'big',effects:[legacy('big',1,'add')]},{'movement.run.value':6,'movement.flight.value':15});
check('Small old subtract effect',{size:'small',effects:[legacy('small',-1,'add')]},{'movement.run.value':4,'movement.flight.value':15});
check('Flight fixed while temporary shrink, Unusual Huge',{size:'little',naturalSize:'huge',unusual:true},{'movement.run.value':1,'movement.flight.value':18});
check('No double SpeedRun Flight',{runCalc:'rank',flightCalc:'rank'},{'movement.run.value':15,'movement.flight.value':15,'movement.jump.value':8});
check('After doubling Run, climb follows',{runCalc:'double'},{'movement.run.value':10,'movement.climb.value':5,'movement.swim.value':5,'movement.jump.value':5});
check('Jump power from regular Run, not Speed Run',{runCalc:'rank',jumpCalc:'runspeed'},{'movement.run.value':15,'movement.jump.value':8});
check('Jump 1 from regular Run',{jumpCalc:'runspeed'},{'movement.jump.value':5});
check('Glide own speed with size',{size:'huge',glideCalc:'rank'},{'movement.glide.value':75,'movement.flight.value':15});
check('Agility + size calculated once',{agility:5,size:'huge',effects:[legacy('huge',5)]},{'movement.run.value':30,'movement.flight.value':18});
// Extended Reach 1/2 must use the strongest factor, not x4*x10, and
// size adjustments must never erase power-granted reach.
const extendEffect=(level,old=false)=>({name:`Reach x${level===1?4:10}`,transfer:true,disabled:false,system:{changes:[{
 key:old?'system.reach':'system.reachFactor',value:level===1?4:10,type:old?'multiply':'upgrade'}]}});
check('Extended Reach 1, ordinary size', {effects:[extendEffect(1)]},{reach:4});
check('Extended Reach 2, ordinary size', {effects:[extendEffect(2)]},{reach:10});
check('Extended Reach levels cannot multiply', {effects:[extendEffect(1),extendEffect(2)]},{reach:10});
check('Extended Reach 2 and Huge', {size:'huge',effects:[extendEffect(1),extendEffect(2)]},{reach:50});
check('Legacy Extended Reach x4 and x10 do not become x40', {effects:[extendEffect(1,true),extendEffect(2,true)]},{reach:10});
check('Legacy Extended Reach and Huge', {size:'huge',effects:[extendEffect(2,true)]},{reach:50});
// Optional real-world regression: pass two exported fixtures through env vars
// when running locally; they are intentionally NOT included in the public ZIP.
const withUnusualPath = process.env.D616_FIXTURE_SENTINEL_WITH;
const withoutUnusualPath = process.env.D616_FIXTURE_SENTINEL_WITHOUT;
if (withUnusualPath && withoutUnusualPath && existsSync(withUnusualPath) && existsSync(withoutUnusualPath)) {
  for (const [name,path,want] of [
    ['com Unusual Size',withUnusualPath,18], ['sem Unusual Size',withoutUnusualPath,15]
  ]) {
    const fixture=JSON.parse(readFileSync(path,'utf8'));
    const sys={...fixture.system,movement:structuredClone(fixture.system.movement)};
    sys.movement.run.value*=5;
    sys.movement.flight.active=true;
    sys.movement.flight.calc='rank';
    sys.movement.flight.noncom=15;
    const actor={...fixture,_source:{system:fixture.system},items:{contents:fixture.items},effects:{contents:fixture.effects}};
    prepareD616Movement(sys,actor);
    assert.equal(sys.movement.run.value,25,`real Sentinela ${name} run`);
    assert.equal(sys.movement.flight.value,want,`real Sentinela ${name} flight`);
    tests++;
  }
}
// Two competing run-power effects: highest isolated result wins, regardless
// of override order from legacy Active Effects.
const doublePower={name:'Double Run',disabled:false,system:{changes:[{key:'system.movement.run.calc',value:'double'}]}};
const rankPower={name:'Speed Run',disabled:false,system:{changes:[{key:'system.movement.run.calc',value:'rank'}]}};
check('Competing movement powers choose the highest', {effects:[doublePower,rankPower],runCalc:'double'},
  {'movement.run.value':15,'movement.flight.value':15});
console.log(`PASS: ${tests} cenários de tamanho e movimento (incluindo ambos os JSONs do Sentinela).`);

// A v0.2.1 multiplied these factors together (Flight ×3×50; Run ×3×3).
// Both newly-created characters and un-migrated actors must use the strongest
// single multiplier. Size, Rank, and mode independence must remain unchanged.
const speedEffect=(key,value,old=false)=>({name:`${key} factor ${value}`,transfer:true,disabled:false,
  system:{changes:[{key:`system.movement.${key}.${old?'noncom':'noncomFactor'}`,
    type:old?'multiply':'upgrade',value}]}});
const newFlight=[speedEffect('flight',3),speedEffect('flight',50)];
const oldFlight=[speedEffect('flight',3,true),speedEffect('flight',50,true)];
const newRun=[speedEffect('run',3),speedEffect('run',50)];
const oldRun=[speedEffect('run',3,true),speedEffect('run',3,true)];
check('Flight 1/2 new max ×50 (not ×150)', {effects:newFlight},
  {'movement.flight.value':15,'movement.flight.noncom':750});
check('Flight 1/2 legacy max ×50 (not ×150)', {effects:oldFlight,flightMultiplier:150},
  {'movement.flight.value':15,'movement.flight.noncom':750});
check('Speed Run 1/2 new max ×50', {effects:newRun,runCalc:'rank'},
  {'movement.run.value':15,'movement.run.noncom':750});
check('Speed Run 1/2 legacy no ×9 (old character; strongest is ×3)', {effects:oldRun,runCalc:'rank',runMultiplier:9},
  {'movement.run.value':15,'movement.run.noncom':45});
check('Single legacy Flight 1 stays ×3', {effects:[speedEffect('flight',3,true)],flightMultiplier:3},
  {'movement.flight.noncom':45});
check('Single new Flight 2 ×50', {effects:[speedEffect('flight',50)]},
  {'movement.flight.noncom':750});
check('Flight + Speed Run use separate bases and factors',
  {effects:[...newFlight,...newRun],runCalc:'rank'},
  {'movement.run.value':15,'movement.flight.value':15,'movement.run.noncom':750,'movement.flight.noncom':750});
console.log('PASS: 7 cenários de não acumulação do movimento.');

// v0.2.2: independent modes (normal swim/climb vs run-based jumping/glide).
const formula=(key,value)=>({name:`${key}: ${value}`,disabled:false,
  system:{changes:[{key:`system.movement.${key}.calc`,value}]}});
check('Speed Swim rank × NORMAL Swim, not rank × Run',
  {swimCalc:'rank-swim',effects:[speedEffect('swim',3)]},
  {'movement.swim.value':9,'movement.swim.noncom':27,'movement.run.value':5});
check('Speed Swim does not multiply Speed Run bonus into its swim reference',
  {runCalc:'rank',swimCalc:'rank-swim',effects:[speedEffect('swim',3),formula('run','rank')]},
  {'movement.swim.value':9,'movement.swim.noncom':27,'movement.run.value':15});
check('Jump 2 gets Rank × regular Run and travel ×3',
  {jumpCalc:'rank',effects:[speedEffect('jump',3)]},
  {'movement.jump.value':15,'movement.jump.noncom':45});
check('Jump 3 gets Rank × regular Run and travel ×50',
  {rank:4,jumpCalc:'rank',effects:[speedEffect('jump',3),speedEffect('jump',50)]},
  {'movement.jump.value':20,'movement.jump.noncom':1000});
check('Speed Run + Jump 2 = non-stacking jump',
  {runCalc:'rank',jumpCalc:'rank'},
  {'movement.jump.value':15,'movement.run.value':15});
check('Stilt Steps doubles regular Run and Climb',
  {effects:[formula('run','double'),formula('climb','double-climb')]},
  {'movement.run.value':10,'movement.climb.value':6});
check('Stilt Steps and Speed Run compete independently on Run and Climb',
  {effects:[formula('run','double'),formula('run','rank'),formula('climb','double-climb')]},
  {'movement.run.value':15,'movement.climb.value':8});
check('Body Sheet glides at double normal Run',
  {glideCalc:'run-double'},
  {'movement.glide.value':10,'movement.glide.noncom':10});
check('Body Sheet glide does not reuse Speed Run boosted speed',
  {runCalc:'rank',glideCalc:'run-double'},
  {'movement.glide.value':10,'movement.run.value':15});
console.log('PASS: 9 cenários novos de Speed Swim, Jump, Stilt Steps e Body Sheet.');
