import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY,CUSTOM_STATUSES,
  normalizeCustomRule,getCustomRules,customRulesEnabled,matchesCustomRule,
  executeCustomRule,processCustomAutomation,ruleFromPowerMessage,
  registerCustomAutomationHooks,registerCustomAutomationSettings,
} from '../scripts/custom-automations.mjs';
import {D616AutomationCenter} from '../scripts/automation-center.mjs';
import {AUTOMATION_MASTER_KEY} from '../scripts/automation-settings.mjs';
const system='multiverse-d616';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
function mockSettings(rules=[],extras={}){
  const values={[AUTOMATION_MASTER_KEY]:false,[CUSTOM_RULES_KEY]:rules,[CUSTOM_RULES_ENABLED_KEY]:true,...extras};
  return {values,registered:[],get(ns,key){assert.equal(ns,system);return values[key];},
    async set(ns,key,v){assert.equal(ns,system);values[key]=v;return v;},
    register(ns,key,opt){assert.equal(ns,system);this.registered.push({key,...opt});}};
}
const rule=(updates={})=>normalizeCustomRule({id:'rule1',name:'Testar regra',trigger:'powerRoll',powerName:'Venom Burst',
  fantasticOnly:false,requiresStatus:'',effectType:'chat',message:'Mensagem segura',enabled:true,...updates});
function setGame(settings){globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:new Map(),scenes:new Map()};}

test('v109: registers independent world-level rule list and execution flag without altering native keys',()=>{
  const settings=mockSettings();setGame(settings);registerCustomAutomationSettings();
  assert.deepEqual(settings.registered.map(x=>x.key),[CUSTOM_RULES_KEY,'customAutomationLibrary',CUSTOM_RULES_ENABLED_KEY]);
  assert.equal(settings.registered[0].type,Array);assert.equal(settings.registered[0].scope,'world');
  assert.deepEqual(settings.registered[0].default,[]);
  assert.deepEqual(settings.registered[1].default,[]);
  assert.equal(settings.registered[2].default,true);
  assert.equal(settings.registered.every(x=>x.config===false),true);
});

test('v109: editor validates trigger, effect, statuses, healing bounds and required content',()=>{
  assert.equal(rule().powerName,'Venom Burst');
  assert.throws(()=>rule({name:''}),/nome/);
  assert.throws(()=>rule({trigger:'javascript'}),/Gatilho/);
  assert.throws(()=>rule({effectType:'eval'}),/Efeito/);
  assert.throws(()=>rule({requiresStatus:'mmrpg.concentration.6'}),/Condição exigida/);
  assert.throws(()=>rule({effectType:'condition',effectStatus:'mmrpg.power-grabbed'}),/condição a aplicar/);
  assert.throws(()=>rule({effectType:'healing',healAmount:-3}),/cura/);
  assert.throws(()=>rule({effectType:'healing',healAmount:101}),/cura/);
  assert.throws(()=>rule({effectType:'chat',message:'   '}),/mensagem/);
  assert.throws(()=>rule({powerName:''}),/nome do poder/);
  assert.deepEqual(rule({trigger:'turnEnd',powerName:'Venom Burst',fantasticOnly:true}).powerName,'');
  assert.equal(rule({trigger:'turnEnd',fantasticOnly:true}).fantasticOnly,false);
});

test('v109: enabled rules run only on matching actor, power, M die and actor status',()=>{
  const testRule=rule({requiresStatus:'mmrpg.bleeding',fantasticOnly:true});
  const actor={statuses:new Set(['mmrpg.bleeding'])};
  assert.equal(matchesCustomRule(testRule,{trigger:'powerRoll',actor,powerName:'VENOM BURST',fantastic:true}),true);
  assert.equal(matchesCustomRule(testRule,{trigger:'powerRoll',actor,powerName:'Venom Burst',fantastic:false}),false);
  assert.equal(matchesCustomRule(testRule,{trigger:'turnEnd',actor,powerName:'Venom Burst',fantastic:true}),false);
  assert.equal(matchesCustomRule(testRule,{trigger:'powerRoll',actor:{statuses:new Set()},powerName:'Venom Burst',fantastic:true}),false);
  assert.equal(matchesCustomRule({...testRule,enabled:false},{trigger:'powerRoll',actor,powerName:'Venom Burst',fantastic:true}),false);
});

test('v109: safe chat output escapes user-supplied markup and contains no arbitrary code path',async()=>{
  let result;
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{result=data;}};
  const testRule=rule({name:'<b>X</b>',message:'<img src=x onerror=alert(1) />'});
  assert.equal(await executeCustomRule(testRule,{name:'Personagem'}),true);
  assert.doesNotMatch(result.content,/<img|<b>X/);
  assert.match(result.content,/&lt;img/);
  assert.match(result.content,/&lt;b&gt;X&lt;\/b&gt;/);
});

test('v109: Health recovery caps at maximum, rejects invalid stats and never damages actor',async()=>{
  const actor={system:{health:{value:8,max:10}},async update(change){this.system.health.value=change['system.health.value'];}};
  const heal=rule({trigger:'turnEnd',effectType:'healing',healAmount:5});
  assert.equal(await executeCustomRule(heal,actor),true);
  assert.equal(actor.system.health.value,10);
  assert.equal(await executeCustomRule(heal,actor),false);
  actor.system.health.max=undefined;
  assert.equal(await executeCustomRule(heal,actor),false);
});

test('v109: condition effect only adds registered native conditions and never toggles an existing condition off',async()=>{
  const active=[];
  globalThis.CONFIG={statusEffects:Object.keys(CUSTOM_STATUSES).map(id=>({id}))};
  const actor={statuses:new Set(),async toggleStatusEffect(id,opts){active.push({id,opts});this.statuses.add(id);}};
  const hit=rule({trigger:'turnStart',effectType:'condition',effectStatus:'mmrpg.stunned'});
  assert.equal(await executeCustomRule(hit,actor),true);
  assert.deepEqual(active,[{id:'mmrpg.stunned',opts:{active:true}}]);
  assert.equal(await executeCustomRule(hit,actor),false);
  assert.equal(active.length,1);
});

test('v109: pause stops custom actions and only active GM runs them',async()=>{
  let count=0;
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{count++;}};
  const settings=mockSettings([rule()]);setGame(settings);
  const event={trigger:'powerRoll',powerName:'Venom Burst',fantastic:false,actor:{name:'X',statuses:new Set()}};
  assert.equal(await processCustomAutomation(event),1);
  assert.equal(count,1);
  settings.values[CUSTOM_RULES_ENABLED_KEY]=false;
  assert.equal(await processCustomAutomation(event),0);
  settings.values[CUSTOM_RULES_ENABLED_KEY]=true;
  settings.values[AUTOMATION_MASTER_KEY]=true;
  assert.equal(customRulesEnabled(),false);assert.equal(await processCustomAutomation(event),0);
  settings.values[AUTOMATION_MASTER_KEY]=false;
  game.user.isGM=false;
  assert.equal(await processCustomAutomation(event),0);
  assert.equal(count,1);
});

test('v109: power roll hook resolves real actor/item via itemId and scene speaker',()=>{
  const actor={name:'A',items:new Map([['p1',{type:'power',name:'Venom Burst'}],['w1',{type:'weapon',name:'Sword'}]])};
  const settings=mockSettings();setGame(settings);game.actors.set('a1',actor);
  const message={id:'m1',rolls:[{isFantastic:true}],speaker:{actor:'a1'},getFlag:(ns,key)=>key==='itemId'?'p1':null};
  assert.deepEqual(ruleFromPowerMessage(message),{trigger:'powerRoll',actor,powerName:'Venom Burst',fantastic:true});
  assert.equal(ruleFromPowerMessage({...message,rolls:[]}),null);
  assert.equal(ruleFromPowerMessage({...message,getFlag:()=> 'w1'}),null);
});

test('v109: Foundry hooks register and trigger turn-start/turn-end on forward progression, not rewind',async()=>{
  const settings=mockSettings([rule({trigger:'turnEnd',powerName:'',effectType:'chat',message:'Fim'}),
    rule({id:'rule2',trigger:'turnStart',powerName:'',effectType:'chat',message:'Início'})]);
  setGame(settings);
  const calls=[];globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>{calls.push(data.content);}};
  const registered={};globalThis.Hooks={on(name,cb){(registered[name]??=[]).push(cb);}};
  registerCustomAutomationHooks();
  assert.equal(registered.createChatMessage.length,1);
  assert.equal(registered.updateCombat.length,1);
  const a={name:'A'},b={name:'B'};
  const combat={id:'combat109',started:true,previous:{round:1,turn:0},round:1,turn:1,
    turns:[{id:'a',actor:a},{id:'b',actor:b}]};
  registered.updateCombat[0](combat,{turn:1});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls.length,2);
  assert.match(calls[0],/Fim/);assert.match(calls[1],/Início/);
  registered.updateCombat[0](combat,{turn:1});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls.length,2,'duplicate update does not run twice');
  registered.updateCombat[0]({...combat,previous:{round:1,turn:1},turn:0},{turn:0});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls.length,2,'rewind does not execute rules');
});

test('v109: UI has two tabs, real editor and scroll restoration for native list',async()=>{
  const originalDocument=globalThis.document;
  globalThis.document={createElement:()=>({className:'',innerHTML:''})};
  try{
    const app=new D616AutomationCenter();
    const root=await app._renderHTML();
    assert.match(root.innerHTML,/data-tab="custom"/);
    assert.match(root.innerHTML,/data-tab="native"/);
    assert.match(root.innerHTML,/data-rule-form/);
    assert.match(root.innerHTML,/data-rule-list/);
    assert.match(root.innerHTML,/data-native-view/);
    const js=source('../scripts/automation-center.mjs');
    assert.match(js,/const previousScroll=wrapper\.scrollTop;wrapper\.replaceChildren\(\);/);
    assert.match(js,/wrapper\.scrollTop=previousScroll/);
    assert.match(js,/list\.scrollTop=previousScroll/);
  }finally{globalThis.document=originalDocument;}
});
