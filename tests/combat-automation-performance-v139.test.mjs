import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCustomRule,syncCustomTargetRules} from '../scripts/custom-automations.mjs';
import {syncPowerConditions} from '../scripts/power-conditions.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
const NS='multiverse-d616';
const uuids=['Scene.s139.Token.t1','Scene.s139.Token.t2'];

function setupCustom(){
  const old={game:globalThis.game,fromUuid:globalThis.fromUuid,ChatMessage:globalThis.ChatMessage,CONFIG:globalThis.CONFIG};
  const rules=[
    {id:'a',hitOutcome:'success'},
    {id:'b',hitOutcome:'fantastic'},
    {id:'c',hitOutcome:'success'},
  ].map(({id,hitOutcome})=>normalizeCustomRule({id,name:id,trigger:'targetHit',powerName:'Fast Attacks',
    hitOutcome,effectType:'chat',message:id}));
  const caster={id:'caster',name:'Caster',statuses:new Set(),items:new Map([['p1',
    {id:'p1',name:'Fast Attacks',type:'power',system:{attack:true,attackTarget:'mle'}}]])};
  const targets=uuids.map((uuid,index)=>({uuid,name:`Target${index}`,statuses:new Set(),effects:[],
    system:{abilities:{mle:{defense:12}}}}));
  const scene={id:'s139',tokens:new Map()};
  const docs=targets.map((actor,i)=>({uuid:uuids[i],documentName:'Token',parent:scene,actor}));
  const flags={itemId:'p1',attackTarget:'mle',targets:uuids.map(uuid=>({uuid})),powerTargetNumber:0};
  const accesses=new Map();
  const roll={total:20,isFantastic:true};
  const message={id:'m139',speaker:{actor:'caster'},rolls:[roll],getFlag(_ns,key){
    accesses.set(key,(accesses.get(key)??0)+1);return flags[key];
  },async setFlag(_ns,key,v){flags[key]=v;return v;}};
  flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(roll),results:uuids.map(targetUuid=>({targetUuid,delta:5}))};
  const settings={get(_ns,key){return {[ 'customAutomationRules']:rules,customAutomationsEnabled:true,disableAllAutomations:false}[key];}};
  const chats=[];
  globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:new Map([['caster',caster]]),scenes:new Map()};
  globalThis.fromUuid=async uuid=>docs.find(d=>d.uuid===uuid);
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{chats.push(data);}};
  globalThis.CONFIG={statusEffects:[]};
  return {flags,roll,message,accesses,chats,settings,restore(){Object.assign(globalThis,old);}};
}

test('v139: três regras por dois alvos adjudicam somente uma vez por alvo',async()=>{
  const f=setupCustom();try{
    assert.equal(await syncCustomTargetRules(f.message),6);
    assert.equal(f.chats.length,6);
    assert.equal(f.accesses.get('attackTarget'),2,'a defesa é consultada uma vez por alvo, não por regra');
    assert.equal(f.accesses.get('powerTargetNumber'),2);
    assert.equal(f.flags.customTargetExecutions.length,6,'checkpoints por regra/alvo preservados');
    assert.equal(await syncCustomTargetRules(f.message),0,'nenhuma mensagem repetida');
    f.message.rolls=[{total:4,isFantastic:true}];
    assert.equal(await syncCustomTargetRules(f.message),0,'falha fantástica não executa efeitos');
  }finally{f.restore();}
});

test('v139: Sucesso Fantástico e decisão específica por alvo ainda são respeitados',async()=>{
  const f=setupCustom();try{
    f.flags.conditionEdges={ambiguousTargets:true};
    f.flags.multiTargetDecisionRollSignature=rollSignature(f.roll);
    f.flags.multiTargetDecisions={[uuids[0]]:'hit',[uuids[1]]:'miss'};
    assert.equal(await syncCustomTargetRules(f.message),3);
    assert.equal(f.chats.length,3);
    assert.equal(f.accesses.get('attackTarget'),2);
  }finally{f.restore();}
});

function setupPower(){
  const old={game:globalThis.game,fromUuid:globalThis.fromUuid,CONFIG:globalThis.CONFIG};
  const effects=[[],[]]; let seq=0;
  const targets=uuids.map((uuid,i)=>({uuid:`${uuid}.Actor.a`,effects:effects[i],items:new Map(),system:{abilities:{
    res:{defense:12},vig:{defense:12},mle:{defense:12},ego:{defense:12},agl:{defense:12},log:{defense:12}}},
    async createEmbeddedDocuments(_type,records){for(const e of records)effects[i].push({...e,id:`e${++seq}`});},
    async deleteEmbeddedDocuments(_type,ids){for(const id of ids){const k=effects[i].findIndex(e=>e.id===id);if(k>=0)effects[i].splice(k,1);}}
  }));
  const caster={uuid:'Actor.caster',effects:[],items:new Map([['p1',{id:'p1',name:'Disrupt Nerves',type:'power',system:{attackTarget:'res'}}]])};
  const scene={id:'s139',tokens:new Map()};
  const docs=targets.map((actor,i)=>({uuid:uuids[i],documentName:'Token',id:`t${i+1}`,actor,parent:scene}));
  for(const doc of docs)scene.tokens.set(doc.id,doc);
  const flags={itemId:'p1',attackTarget:'res',powerTargetNumber:0,targets:uuids.map(uuid=>({uuid}))};
  const accesses=new Map();
  const roll={total:19,isFantastic:false};
  const message={id:'p139',speaker:{actor:'caster'},rolls:[roll],getFlag(_ns,key){
    accesses.set(key,(accesses.get(key)??0)+1);return flags[key];}};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes:new Map([['s139',scene]]),
    actors:new Map([['caster',caster]])};
  globalThis.fromUuid=async uuid=>docs.find(d=>d.uuid===uuid);
  globalThis.CONFIG={statusEffects:{}};
  return {effects,roll,message,accesses,restore(){Object.assign(globalThis,old);}};
}

test('v139: condições nativas compartilham flags e decisões entre os alvos do mesmo card',async()=>{
  const f=setupPower();try{
    await syncPowerConditions(f.message);
    assert.deepEqual(f.effects.map(x=>x.length),[1,1]);
    assert.equal(f.accesses.get('conditionEdges'),1);
    assert.equal(f.accesses.get('multiTargetDecisionRollSignature'),1);
    f.roll.total=5;
    await syncPowerConditions(f.message);
    assert.deepEqual(f.effects.map(x=>x.length),[0,0],'nova rolagem reconcilia status sem cache anterior');
  }finally{f.restore();}
});
