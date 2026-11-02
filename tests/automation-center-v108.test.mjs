import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTOMATION_GROUPS,AUTOMATION_POWERS_KEY,AUTOMATION_MASTER_KEY,automationEnabled,powerOverrideKey} from '../scripts/automation-settings.mjs';
import {automationCatalog,filteredAutomationCatalog,automationStatus} from '../scripts/automation-center.mjs';
import {ELEMENTAL_FANTASTIC_RULES,applyElementalFantasticFromDamageMessage} from '../scripts/elemental-fantastic.mjs';
import {elementalSpecialForPower} from '../scripts/power-conditions.mjs';
import {repeatEligibility,heldFollowUpEligibility} from '../scripts/repeat-power-attacks.mjs';
import {ricoEligibility} from '../scripts/rico-shield-chain.mjs';
import {offerPoisonCheck} from '../scripts/poisoned-turn.mjs';
import {processRecurringPowerTurn} from '../scripts/ongoing-power-effects.mjs';

function makeSettings(){
  const values={
    [AUTOMATION_POWERS_KEY]:{},[AUTOMATION_MASTER_KEY]:false,autoTurnDamage:true,
    ...Object.fromEntries(Object.keys(AUTOMATION_GROUPS).map(g=>[`automation_${g}`,true])),
  };
  return {values,get(ns,key){assert.equal(ns,'multiverse-d616');return values[key];}};
}
const assignSettings=settings=>{globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};};
const disable=(settings,group,key)=>{settings.values[AUTOMATION_POWERS_KEY]={...settings.values[AUTOMATION_POWERS_KEY],[powerOverrideKey(group,key)]:false};};
const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('v108: catalog only exposes engine-backed powers, automatic elemental consequences and recurring conditions',()=>{
  const catalog=automationCatalog();
  assert.equal(catalog.extraAttacks.length,6);
  assert.deepEqual(new Set(catalog.extraAttacks.map(e=>e.power)),new Set(['Unstoppable Assault','Unrelenting Smash','Hellfire Chains','Coiling Crush','Rico-Shield','Elemental Ricochet']));
  assert.equal(catalog.elementalEffects.length,Object.values(ELEMENTAL_FANTASTIC_RULES).filter(x=>!x.noteOnly).length);
  assert.equal(catalog.elementalEffects.some(e=>e.power==='element:hellfire'),false,'only automated rules can be disabled');
  assert.equal(catalog.ongoingConditions.length,6);
  assert.equal(catalog.conditionRecovery[0].power,'mmrpg.bleeding');
  assert.equal(catalog.concentration.length,0,'focus upkeep cannot be independently bypassed');
  assert.equal(catalog.turnActions.length,0,'action/movement accounting remains one coherent unit');
  assert.equal(filteredAutomationCatalog('sangrando',catalog).conditionRecovery.powers.length,1);
  assert.equal(filteredAutomationCatalog('ricochet',catalog).extraAttacks.powers.length,2);
});

test('v108: filter for customized routines uses persistent exceptions, including elements and statuses',()=>{
  const settings=makeSettings(),catalog=automationCatalog();
  disable(settings,'elementalEffects','element:earth');
  disable(settings,'ongoingConditions','mmrpg.bleeding');
  const filtered=filteredAutomationCatalog('',catalog,{onlyCustomized:true,overrides:settings.values[AUTOMATION_POWERS_KEY]});
  assert.deepEqual(Object.keys(filtered),['elementalEffects','ongoingConditions']);
  assert.equal(filtered.elementalEffects.powers[0].power,'element:earth');
  assert.equal(filtered.ongoingConditions.powers[0].power,'mmrpg.bleeding');
  assert.deepEqual(filteredAutomationCatalog('air',catalog,{onlyCustomized:true,overrides:settings.values[AUTOMATION_POWERS_KEY]}),{});
});

test('v108: status explains paused group, individual switches, and a real external condition dependency',()=>{
  const settings=makeSettings();assignSettings(settings);
  assert.deepEqual(automationStatus('ongoingConditions','mmrpg.ablaze',settings),{
    effective:true,reason:'Ativo',custom:false,dependencyMissing:false,
  });
  settings.values.autoTurnDamage=false;
  assert.equal(automationStatus('ongoingConditions','mmrpg.ablaze',settings).reason,'Depende do dano automático de condições');
  assert.equal(automationStatus('ongoingConditions','Healing Factor',settings).effective,true,'healing unaffected by HUD option');
  disable(settings,'ongoingConditions','mmrpg.ablaze');
  assert.equal(automationStatus('ongoingConditions','mmrpg.ablaze',settings).custom,true);
  assert.equal(automationEnabled('ongoingConditions',settings,'mmrpg.ablaze'),false);
  settings.values.automation_ongoingConditions=false;
  assert.equal(automationStatus('ongoingConditions','Healing Factor',settings).reason,'Grupo desativado');
  settings.values[AUTOMATION_MASTER_KEY]=true;
  assert.equal(automationStatus('ongoingConditions','Healing Factor',settings).reason,'Pausado pela chave geral');
  settings.values[AUTOMATION_MASTER_KEY]=false;
  settings.values.automation_ongoingConditions=true;
  assert.equal(automationEnabled('ongoingConditions',settings,'Healing Factor'),true);
  assert.equal(automationEnabled('ongoingConditions',settings,'mmrpg.ablaze'),false);
});

test('v108: loop, held attack and Rico-Shield eligibility genuinely consult their own overrides',()=>{
  const settings=makeSettings();assignSettings(settings);
  disable(settings,'extraAttacks','Unstoppable Assault');
  assert.match(repeatEligibility({item:{name:'Unstoppable Assault'}}).reason,/desativada pelo Mestre/);
  assert.doesNotMatch(repeatEligibility({item:{name:'Unrelenting Smash'}}).reason??'',/desativada pelo Mestre/);
  disable(settings,'extraAttacks','Hellfire Chains');
  assert.match(heldFollowUpEligibility({powerName:'Hellfire Chains'}).reason,/desativado pelo Mestre/);
  disable(settings,'extraAttacks','Rico-Shield');
  assert.match(ricoEligibility({item:{name:'Rico-Shield',type:'power'}}).reason,/desativados pelo Mestre/);
  assert.doesNotMatch(ricoEligibility({item:{name:'Elemental Ricochet',type:'power'}}).reason,/desativados pelo Mestre/);
});

test('v108: non-damage elemental routine and damage confirmation respect individual element',async()=>{
  const settings=makeSettings();assignSettings(settings);
  const power={name:'Elemental Grab',system:{isElemental:true,element:'earth'}};
  const outcome={success:true,fantastic:true};
  assert.equal(elementalSpecialForPower(power,{},outcome).length,1);
  disable(settings,'elementalEffects','element:earth');
  assert.deepEqual(elementalSpecialForPower(power,{},outcome),[]);
  const msg={flags:{'multiverse-d616':{elementalFantastic:{key:'earth'}}},getFlag(ns,key){return this.flags[ns]?.[key];}};
  assert.deepEqual(await applyElementalFantasticFromDamageMessage(msg,'full'),[]);
  assert.equal(elementalSpecialForPower({...power,system:{...power.system,element:'air'}},{},outcome).length,1);
});

test('v108: Poisoned prompt does not start with its individual rule disabled',async()=>{
  const settings=makeSettings();assignSettings(settings);
  disable(settings,'ongoingConditions','mmrpg.poisoned');
  assert.equal(await offerPoisonCheck({started:true,id:'c',round:1,turn:0,combatant:{id:'a'}}),false);
});

test('v108: Healing Factor automatic recurring effect obeys its individual rule without disabling manual healing',async()=>{
  const settings=makeSettings();assignSettings(settings);
  const messages=[];
  globalThis.foundry={utils:{escapeHTML:s=>s}};
  globalThis.ChatMessage={create:async data=>messages.push(data),getSpeaker:()=>({})};
  const actor={id:'a',uuid:'Actor.A',name:'Heroína',items:[{name:'Healing Factor',type:'power'}],
    system:{health:{value:5,max:20},abilities:{res:{value:3}}},flags:[],getFlag(){return this.flags;},
    async setFlag(ns,key,value){this.flags=value;},async update(change){this.system.health.value=change['system.health.value'];}};
  const t0={id:'t0',actor},t1={id:'t1',actor};
  const combat={started:true,id:'combat-108',previous:{round:1,turn:0},round:1,turn:1,turns:[t0,t1]};
  assert.equal(await processRecurringPowerTurn(combat,{turn:1}),true);
  assert.equal(actor.system.health.value,8);
  assert.equal(messages.length,1);
  disable(settings,'ongoingConditions','Healing Factor');
  combat.previous={round:1,turn:1};combat.turn=2;
  assert.equal(await processRecurringPowerTurn(combat,{turn:2}),true);
  assert.equal(actor.system.health.value,8,'the subsequent turn must not heal automatically');
  assert.equal(messages.length,1);
});

test('v108: condition recovery and end-turn damage connect individual toggles without modifying manual actions',()=>{
  const actions=source('../scripts/condition-actions.mjs');
  const hud=source('../scripts/conditions-hud.js');
  assert.match(actions,/automationEnabled\('conditionRecovery',undefined,'mmrpg\.bleeding'\)/);
  assert.match(hud,/automationEnabled\?\.\('ongoingConditions',undefined,s\)/);
  assert.match(source('../scripts/ongoing-power-effects.mjs'),/automationEnabled\('ongoingConditions',undefined,'Flames of the Faltine'\)/);
  assert.match(source('../scripts/ongoing-power-effects.mjs'),/automationEnabled\('ongoingConditions',undefined,'Healing Factor'\)/);
  const manifest=JSON.parse(source('../system.json'));
  assert.equal(manifest.version,'0.2.126');
  assert.match(source('../CHANGELOG.md'),/^## v0\.2\.126/);
  assert.match(source('../README.md'),/Só alteradas/);
});

test('v108: paused Bleeding recovery still advances the Health baseline and cannot cure on a later damage update',async()=>{
  const {captureHealthBeforeUpdate,removeBleedingOnHeal}=await import('../scripts/condition-actions.mjs');
  const settings=makeSettings();assignSettings(settings);
  disable(settings,'conditionRecovery','mmrpg.bleeding');
  const actor={uuid:'Actor.Baseline',statuses:new Set(['mmrpg.bleeding']),system:{health:{value:10}}};
  captureHealthBeforeUpdate(actor,{'system.health.value':13});
  actor.system.health.value=13;
  assert.equal(await removeBleedingOnHeal(actor,{'system.health.value':13}),false);
  settings.values[AUTOMATION_POWERS_KEY]={};
  captureHealthBeforeUpdate(actor,{'system.health.value':12});
  actor.system.health.value=12;
  assert.equal(await removeBleedingOnHeal(actor,{'system.health.value':12}),false,'damage after resuming is not a heal');
  assert.equal(actor.statuses.has('mmrpg.bleeding'),true);
});
