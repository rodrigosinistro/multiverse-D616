import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishConditionReferences} from '../scripts/condition-reference.mjs';
import {registerCustomAutomationHooks,conditionTurnEntries} from '../scripts/custom-automations.mjs';

const SYS='multiverse-d616';
let serial=0;

function setup(){
  const originals={game:globalThis.game,CONFIG:globalThis.CONFIG,ChatMessage:globalThis.ChatMessage,Hooks:globalThis.Hooks};
  const handlers=new Map(),messages=[];
  globalThis.Hooks={on(name,fn){const list=handlers.get(name)??[];list.push(fn);handlers.set(name,list);}};
  const caster={id:'zima',uuid:'Actor.zima',name:'Zima',statuses:new Set(),effects:[]};
  const effect={id:'fx-ice',disabled:false,duration:{expired:false},statuses:new Set(['mmrpg.paralyzed']),
    flags:{[SYS]:{elementalFantastic:{source:'fantastic',element:'ice',rounds:1,appliedRound:1}}}};
  const target={id:'sentinel',uuid:'Actor.sentinel',name:'Pensativo Sentinel',
    statuses:new Set(['mmrpg.paralyzed']),effects:[effect]};
  const c0={id:'zima-turn',actor:caster};
  const c1={id:'sentinel-turn',actor:target,token:{actor:target}};
  const combat={id:`elemental-turn-v133-${++serial}`,started:true,round:2,turn:1,
    combatant:c1,turns:[c0,c1],combatants:[c0,c1]};
  // A missing combat.previous replicates Foundry v14 turn tracking in which
  // the document updates but the old turn is not exposed to this hook.
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},
    combat,actors:new Map([['zima',caster],['sentinel',target]]),scenes:new Map(),messages,
    settings:{get(_ns,key){return key==='customAutomationRules'?[]:false;}}};
  globalThis.CONFIG={statusEffects:[{id:'mmrpg.paralyzed',name:'Paralisado'}]};
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),
    async create(data){const msg={...data,getFlag(ns,key){return data.flags?.[ns]?.[key]}};messages.push(msg);return msg;}};
  publishConditionReferences(JSON.parse(readFileSync(new URL('../data/conditions.json',import.meta.url),'utf8')).conditions);
  registerCustomAutomationHooks();
  const fire=(change)=>{for(const fn of handlers.get('updateCombat')??[])fn(combat,change);};
  return {combat,caster,target,effect,messages,fire,
    restore(){publishConditionReferences([]);Object.assign(globalThis,originals);}};
}
const drain=()=>new Promise(resolve=>setImmediate(resolve));

test('v133: ice Elemental Blast Paralisado native status is announced on target turn even without combat.previous',async()=>{
  const f=setup();try{
    const entries=conditionTurnEntries(f.target,f.combat);
    assert.equal(entries.length,1);
    assert.match(entries[0].duration,/1 rodada/);
    assert.match(entries[0].description,/./);
    f.fire({round:2,turn:1});await drain();
    assert.equal(f.messages.length,1);
    assert.match(f.messages[0].content,/Condições de Pensativo Sentinel — início do turno/);
    assert.match(f.messages[0].content,/Paralisado/);
    assert.match(f.messages[0].content,/1 rodada \(efeito elemental\)/);
    assert.match(f.messages[0].content,/Como remover:|Paralisado/);
    f.fire({turn:1});await drain();
    assert.equal(f.messages.length,1,'no duplicate when updateCombat fires again in the same turn');
    assert.equal(f.target.effects[0],f.effect,'read-only turn notice never deletes the native effect');
  }finally{f.restore();}
});

test('v133: positively identified rewind stays silent, even with an active elemental effect',async()=>{
  const f=setup();try{
    f.combat.previous={round:3,turn:1};
    f.fire({round:2,turn:1});await drain();
    assert.equal(f.messages.length,0);
  }finally{f.restore();}
});

test('v133: registered hook uses current combatant after round transition where previous turn is incomplete',async()=>{
  const f=setup();try{
    f.combat.previous={round:1};
    f.fire({round:2,turn:1});await drain();
    assert.equal(f.messages.length,1);
    assert.match(f.messages[0].content,/Pensativo Sentinel/);
  }finally{f.restore();}
});
