import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISABLE_COMBAT_INTELLIGENCE_SETTING, registerCombatIntelligenceSettings, combatIntelligenceDisabled, confirmAttackPreflight} from '../scripts/combat-preflight.mjs';
import {isEffectChangeType} from '../scripts/active-effect-types.mjs';

const ROOT=new URL('../',import.meta.url);
test('configuração global: Cancelar Combate Inteligente marcada por padrão',()=>{
  const old=globalThis.game;
  let actual=null;
  globalThis.game={settings:{register:(system,key,config)=>{actual={system,key,...config};}}};
  try { registerCombatIntelligenceSettings(); }
  finally { if(old===undefined)delete globalThis.game;else globalThis.game=old; }
  assert.equal(actual.system,'multiverse-d616');
  assert.equal(actual.key,DISABLE_COMBAT_INTELLIGENCE_SETTING);
  assert.equal(actual.name,'Cancelar Combate Inteligente');
  assert.equal(actual.scope,'world');
  assert.equal(actual.config,true);
  assert.equal(actual.type,Boolean);
  assert.equal(actual.default,true);
});
test('marcada: bypass; desmarcada: preflight ativo; settings ausentes: não ativa por acidente',async()=>{
  assert.equal(combatIntelligenceDisabled({get:()=>true}),true);
  assert.equal(combatIntelligenceDisabled({get:()=>false}),false);
  assert.equal(combatIntelligenceDisabled({get:()=>{throw Error('unregistered');}}),true);
  assert.equal(combatIntelligenceDisabled(null),true);
  const old=globalThis.game;
  try {
    globalThis.game={settings:{get:()=>true}};
    const result=await confirmAttackPreflight({actor:{id:'1'},type:'power'}, {attack:true});
    assert.deepEqual(result,{ok:true,results:[],overridden:[]});
  } finally {if(old===undefined)delete globalThis.game;else globalThis.game=old;}
});
test('API v14: nunca lê o getter numérico depreciado quando type está presente',()=>{
  let hits=0;
  const change={key:'system.movement.run.value',type:'add',value:2};
  Object.defineProperty(change,'mode',{get(){hits++;throw Error('getter depreciado');}});
  assert.equal(isEffectChangeType(change,'add'),true);
  assert.equal(isEffectChangeType(change,'multiply'),false);
  assert.equal(hits,0);
});
test('compatibilidade de modos serializados de versões antigas',()=>{
  for(const [mode,type] of [[0,'custom'],[1,'multiply'],[2,'add'],[3,'downgrade'],[4,'upgrade'],[5,'override']]){
    assert.equal(isEffectChangeType({mode},type),true);
    assert.equal(isEffectChangeType({mode},'invalid'),false);
  }
  assert.equal(isEffectChangeType({type:'multiply',mode:2},'add'),false);
  assert.equal(isEffectChangeType({},'add'),false);
});
test('modernização do chat de Focus usa HTMLElement e hook correto sem listeners antigos',()=>{
  const src=readFileSync(new URL('../scripts/focus-maintenance.mjs',import.meta.url),'utf8');
  assert.match(src,/Hooks\.on\('renderChatMessageHTML'/);
  assert.doesNotMatch(src,/Hooks\.on\('renderChatMessage'/);
  assert.match(src,/root\?\.querySelectorAll\?/);
});
test('sistema registra configuração ao inicializar e compêndios permanecem inalterados',()=>{
  const src=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(src,/registerCombatIntelligenceSettings\(\)/);
  assert.match(src,/registerSmartTargetSettings\(\)/);
});

test('diálogo v14 usa DialogV2.wait com botões/ações do ApplicationV2',async()=>{
 const {askCombatPreflight}=await import('../scripts/combat-preflight.mjs');
 const previous=globalThis.foundry;
 let config=null;
 try{
   globalThis.foundry={applications:{api:{DialogV2:{wait:async options=>{config=options;return 'proceed';}}}}};
   const result=await askCombatPreflight('Meu ataque','<p>Alvo distante</p>');
   assert.equal(result,'proceed');
   assert.equal(config.window.title,'Meu ataque');
   assert.equal(config.buttons.length,3);
   assert.equal(config.buttons[0].action,'proceed');
   assert.equal(config.buttons[1].default,true);
   assert.equal(config.rejectClose,false);
 }finally{if(previous===undefined)delete globalThis.foundry;else globalThis.foundry=previous;}
});
