import assert from 'node:assert/strict';
import { prepareD616Movement, SIZE_SPEED } from '../scripts/movement-calculator.mjs';
import { readFileSync, existsSync } from 'node:fs';

const defaultModes=['run','climb','swim','jump','flight','glide','swingline','levitation'];
function scenario({ agility=4, rank=3, size='average', naturalSize=size, run=5, reach=1, effects=[], unusual=false,
  runCalc='', flightCalc='rank', jumpCalc='', climbCalc='', swimCalc='', glideCalc='', flightMultiplier=3, extraTraits=[] }={}) {
  const movement=Object.fromEntries(defaultModes.map(k=>[k, { value: k==='run'?run:5, noncom:5, calc:({run:runCalc, flight:flightCalc, jump:jumpCalc, climb:climbCalc, swim:swimCalc, glide:glideCalc})[k]??'', active:true }]));
  movement.flight.noncom=5*flightMultiplier;
  const system={movement, size, reach, attributes:{rank:{value:rank}}, abilities:{agl:{value:agility}}};
  const actor={ _source:{ system:{size:naturalSize,reach,movement:{run:{value:run},flight:{noncom:5}}} },
    items:{contents:[...(unusual?[{type:'trait',name:'Unusual Size'}]:[]),...extraTraits]},
    effects:{contents:effects}};
  for (const e of effects) {
    for (const c of e.system?.changes??[]) {
      if(c.key==='system.movement.run.value') {
        if(c.type==='multiply')system.movement.run.value*=Number(c.value);
        if(c.type==='add')system.movement.run.value+=Number(c.value);
      }
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
