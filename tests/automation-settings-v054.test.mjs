import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AUTOMATION_GROUPS, AUTOMATION_MASTER_KEY, automationEnabled, registerAutomationSettings} from '../scripts/automation-settings.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('v0.2.54: automações começam ligadas e opção geral começa desligada',()=>{
 const registered=new Map();
 globalThis.game={settings:{register:(scope,key,entry)=>{assert.equal(scope,'multiverse-d616');registered.set(key,entry);}}};
 registerAutomationSettings();
 assert.equal(registered.get(AUTOMATION_MASTER_KEY).default,false);
 assert.equal(registered.get(AUTOMATION_MASTER_KEY).scope,'world');
 assert.equal(Object.keys(AUTOMATION_GROUPS).length,8);
 for(const key of Object.keys(AUTOMATION_GROUPS)){
   const record=registered.get('automation_'+key);
   assert.equal(record.default,true,key);
   assert.equal(record.scope,'world',key);
   assert.equal(record.config,true,key);
 }
 delete globalThis.game;
});
test('v0.2.54: chave geral tem prioridade e grupos são independentes (leitura ao vivo)',()=>{
 const values=new Map();
 const settings={get:(scope,key)=>{assert.equal(scope,'multiverse-d616');return values.get(key);}};
 for(const group of Object.keys(AUTOMATION_GROUPS)) assert.equal(automationEnabled(group,settings),true);
 values.set('automation_powerConditions',false);
 assert.equal(automationEnabled('powerConditions',settings),false);
 assert.equal(automationEnabled('elementalEffects',settings),true);
 values.set(AUTOMATION_MASTER_KEY,true);
 for(const group of Object.keys(AUTOMATION_GROUPS)) assert.equal(automationEnabled(group,settings),false);
 values.set(AUTOMATION_MASTER_KEY,false);
 assert.equal(automationEnabled('powerConditions',settings),false);
 assert.equal(automationEnabled('elementalEffects',settings),true);
 assert.equal(automationEnabled('unregistered',settings),true);
 assert.equal(automationEnabled('powerConditions',{get(){throw Error('not registered');}}),true);
});
test('v0.2.54: controles são consultados nas automações em tempo de uso',()=>{
 const gates={
   'scripts/power-conditions.mjs':['powerConditions','elementalEffects'],
   'multiverse-d616.mjs':['fantasticDamage'],
   'scripts/elemental-fantastic.mjs':['elementalEffects'],
   'scripts/poisoned-turn.mjs':['ongoingConditions'],
   'scripts/ongoing-power-effects.mjs':['ongoingConditions'],
   'scripts/conditions-hud.js':['ongoingConditions'],
   'scripts/condition-actions.mjs':['conditionRecovery'],
   'scripts/concentration.js':['concentration'],
   'scripts/focus-maintenance.mjs':['concentration'],
   'scripts/combat/turn-tracker.mjs':['turnActions'],
 };
 for(const [file,groups] of Object.entries(gates)){
   const s=source(file);
   for(const group of groups)assert.ok(s.includes(`'${group}'`),`${file}: ${group}`);
 }
 const manifest=JSON.parse(source('system.json'));
 assert.equal(manifest.version,'0.2.84');
 assert.ok(source('multiverse-d616.mjs').includes('registerAutomationSettings()'));
});
function instantiateExporter(old='red',newColor='red',isGM=true){
 const callbacks={};const defs=new Map();const stored=new Map([['sheet-export-m616.templateTheme',old],['multiverse-d616.templateTheme',newColor]]);
 const settings={
   register:(scope,key,def)=>defs.set(scope+'.'+key,def),
   get:(scope,key)=>{const full=scope+'.'+key;return stored.has(full)?stored.get(full):defs.get(full)?.default;},
   set:async(scope,key,value)=>{stored.set(scope+'.'+key,value);return value;},
 };
 const hooks={once:(name,callback)=>{callbacks[name]=callback;},on:()=>{}};
 const context={Hooks:hooks,game:{settings,user:{isGM}},console:{log:()=>{},warn:()=>{}},window:{}};
 vm.runInNewContext(source('features/sheet-export-m616/m616-export.js'),context);
 return {callbacks,settings,defs,stored};
}
test('v0.2.54: template PDF sai da categoria não mapeada e migra preferências legadas',async()=>{
 for(const old of ['purple','black','blue','gray','orange','pink']){
   const m=instantiateExporter(old);m.callbacks.init();
   assert.equal(m.defs.get('sheet-export-m616.templateTheme')?.config,false);
   assert.equal(m.defs.get('multiverse-d616.templateTheme')?.config,true);
   await m.callbacks.ready();
   assert.equal(m.settings.get('multiverse-d616','templateTheme'),old);
   assert.equal(m.settings.get('multiverse-d616','templateThemeMigrated054'),true);
   await m.settings.set('multiverse-d616','templateTheme','red');
   await m.callbacks.ready();
   assert.equal(m.settings.get('multiverse-d616','templateTheme'),'red','não sobrescrever escolha nova');
 }
 const keep=instantiateExporter('black','blue');keep.callbacks.init();await keep.callbacks.ready();
 assert.equal(keep.settings.get('multiverse-d616','templateTheme'),'blue');
 const player=instantiateExporter('pink','red',false);player.callbacks.init();await player.callbacks.ready();
 assert.equal(player.settings.get('multiverse-d616','templateTheme'),'red');
});
