import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  AUTOMATION_MASTER_KEY,AUTOMATION_POWERS_KEY,AUTOMATION_GROUPS,POWER_SCOPED_AUTOMATIONS,
  powerOverrideKey,getAutomationPowerOverrides,automationEnabled,registerAutomationSettings,
} from '../scripts/automation-settings.mjs';
import {automationCatalog,filteredAutomationCatalog,registerAutomationCenterMenu,D616AutomationCenter} from '../scripts/automation-center.mjs';
import {POWER_CONDITIONS} from '../scripts/power-conditions.mjs';
import {POWER_DAMAGE_FACTORS,getPowerDamageFactor} from '../scripts/power-fantastic-damage.mjs';

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const makeSettings=(initial={})=>({
  values:{[AUTOMATION_MASTER_KEY]:false,[AUTOMATION_POWERS_KEY]:{},...Object.fromEntries(Object.keys(AUTOMATION_GROUPS).map(k=>[`automation_${k}`,true])),...initial},
  registrations:[],menus:[],
  get(ns,key){assert.equal(ns,'multiverse-d616');return this.values[key];},
  async set(ns,key,val){assert.equal(ns,'multiverse-d616');this.values[key]=val;return val;},
  register(ns,key,opts){assert.equal(ns,'multiverse-d616');this.registrations.push({key,...opts});},
  registerMenu(ns,key,opts){assert.equal(ns,'multiverse-d616');this.menus.push({key,...opts});},
});

test('v107: registers all 9 previous world settings with original keys/defaults and one new overrides map',()=>{
  const settings=makeSettings();globalThis.game={settings};
  registerAutomationSettings();registerAutomationCenterMenu();
  assert.equal(settings.registrations.length,10);
  assert.equal(settings.registrations.find(r=>r.key===AUTOMATION_MASTER_KEY)?.default,false);
  assert.equal(settings.registrations.find(r=>r.key===AUTOMATION_POWERS_KEY)?.type,Object);
  for(const group of Object.keys(AUTOMATION_GROUPS)){
    const setting=settings.registrations.find(r=>r.key===`automation_${group}`);
    assert.equal(setting?.scope,'world');assert.equal(setting?.default,true);
    assert.equal(setting?.config,false,'old controls are managed inside Center');
  }
  assert.equal(settings.menus.length,1);
  assert.equal(settings.menus[0].restricted,true);
  assert.equal(settings.menus[0].type,D616AutomationCenter);
});

test('v107: general pause overrides all, resumes the stored group and power preferences',async()=>{
  const settings=makeSettings();globalThis.game={settings};
  assert.equal(automationEnabled('powerConditions'),true);
  assert.equal(automationEnabled('powerConditions',settings,'Venom Burst'),true);
  const key=powerOverrideKey('powerConditions','Venom Burst');
  await settings.set('multiverse-d616',AUTOMATION_POWERS_KEY,{[key]:false});
  assert.equal(automationEnabled('powerConditions',settings,'Venom Burst'),false);
  assert.equal(automationEnabled('powerConditions',settings,'Headshot'),true);
  assert.equal(automationEnabled('powerConditions',settings),true,'old group-only reads must remain enabled');
  await settings.set('multiverse-d616',AUTOMATION_MASTER_KEY,true);
  assert.equal(automationEnabled('powerConditions',settings,'Headshot'),false);
  assert.equal(automationEnabled('extraAttacks',settings),false);
  await settings.set('multiverse-d616',AUTOMATION_MASTER_KEY,false);
  assert.equal(automationEnabled('powerConditions',settings,'Venom Burst'),false);
  assert.equal(automationEnabled('powerConditions',settings,'Headshot'),true);
  await settings.set('multiverse-d616','automation_powerConditions',false);
  assert.equal(automationEnabled('powerConditions',settings,'Headshot'),false);
  await settings.set('multiverse-d616','automation_powerConditions',true);
  assert.equal(automationEnabled('powerConditions',settings,'Headshot'),true);
});

test('v108: formerly unscoped attacks now respect individual overrides, unknown groups remain unchanged',()=>{
  const settings=makeSettings({[AUTOMATION_POWERS_KEY]:{
    [powerOverrideKey('extraAttacks','Rico-Shield')]:false,
    [powerOverrideKey('fantasticDamage','Headshot')]:false,
  }});
  assert.deepEqual(POWER_SCOPED_AUTOMATIONS,['powerConditions','fantasticDamage','extraAttacks','elementalEffects','ongoingConditions','conditionRecovery']);
  assert.equal(automationEnabled('extraAttacks',settings,'Rico-Shield'),false);
  assert.equal(automationEnabled('unknownThing',settings,'Rico-Shield'),true);
  assert.equal(getPowerDamageFactor('Headshot',{fantastic:true}),3,'without a game global uses default setting');
  globalThis.game={settings};
  assert.equal(getPowerDamageFactor('Headshot',{fantastic:true}),2,'individual disable reverts to ordinary Fantastic formula');
  assert.equal(getPowerDamageFactor('Flare',{fantastic:true}),1,'other powers unchanged');
  assert.equal(automationEnabled('fantasticDamage',settings,'Headshot'),false);
  assert.equal(getAutomationPowerOverrides(settings)[powerOverrideKey('fantasticDamage','Headshot')],false);
});

test('v108: catalog and search list only entries whose engine-specific checks exist',()=>{
  const catalog=automationCatalog();
  assert.deepEqual(Object.keys(catalog),['powerConditions','fantasticDamage','extraAttacks','elementalEffects','ongoingConditions','conditionRecovery','concentration','turnActions']);
  assert.equal(catalog.powerConditions.length,Object.values(POWER_CONDITIONS).filter(r=>r.length).length);
  assert.equal(catalog.fantasticDamage.length,Object.keys(POWER_DAMAGE_FACTORS).length);
  assert.equal(catalog.extraAttacks.length,6,'attack groups now have audited per-power switches');
  const found=filteredAutomationCatalog('venom burst',catalog);
  assert.deepEqual(Object.keys(found),['powerConditions','fantasticDamage']);
  assert.equal(found.powerConditions.powers[0].power,'Venom Burst');
  assert.equal(found.fantasticDamage.powers[0].power,'Venom Burst');
  assert.ok(Object.keys(filteredAutomationCatalog('sangrando',catalog)).includes('powerConditions'));
  assert.deepEqual(filteredAutomationCatalog('notexistingthing',catalog),{});
});

test('v107: power-condition and damage routes consult power-specific scopes, without touching core HUD',()=>{
  const power=source('../scripts/power-conditions.mjs');
  const damage=source('../scripts/power-fantastic-damage.mjs');
  const core=source('../multiverse-d616.mjs');
  const manifest=JSON.parse(source('../system.json'));
  assert.match(power,/automationEnabled\('powerConditions',undefined,item\.name\)/);
  assert.match(damage,/automationEnabled\('fantasticDamage',undefined,name\)/);
  assert.match(damage,/automationEnabled\('fantasticDamage',undefined,powerName\)/);
  assert.match(core,/registerAutomationCenterMenu\(\)/);
  assert.match(core,/automationEnabled\('fantasticDamage',undefined,item\.name\)/);
  assert.equal(manifest.version,'0.2.120');
  assert.ok(manifest.styles.includes('styles/automation-center.css'));
});
