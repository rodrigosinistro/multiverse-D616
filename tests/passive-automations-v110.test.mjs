import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCustomRule,passiveAttackModifiers,matchesCustomRule,processCustomAutomation} from '../scripts/custom-automations.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
const system='multiverse-d616';
const mkRule=(overrides={})=>normalizeCustomRule({id:'edge-blazing',name:'Edge corpo a corpo',
  trigger:'passiveAttack',powerName:'Blazing Fast Fists',attackScope:'melee',effectType:'edge',enabled:true,...overrides});
const mkSettings=(rules)=>({values:{disableAllAutomations:false,customAutomationRules:rules,customAutomationsEnabled:true},
  get(ns,key){assert.equal(ns,system);return this.values[key];}});
const actor=(powers=['Blazing Fast Fists'],statuses=[])=>({statuses:new Set(statuses),effects:[],
  items:{contents:powers.map(name=>({type:'power',name}))}});
const assign=(rules)=>{const settings=mkSettings(rules);globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};return settings;};

test('v110: schema accepts passive Edge/Trouble and rejects incompatible events/actions',()=>{
  const r=mkRule();
  assert.equal(r.attackScope,'melee');assert.equal(r.powerName,'Blazing Fast Fists');
  assert.throws(()=>mkRule({powerName:''}),/poder passivo/);
  assert.throws(()=>mkRule({attackScope:'script'}),/tipo de ataque/);
  assert.throws(()=>mkRule({effectType:'chat',message:'x'}),/Edge\/Trouble/);
  assert.throws(()=>normalizeCustomRule({name:'x',trigger:'turnStart',effectType:'edge',attackScope:'melee'}),/Edge\/Trouble/);
  assert.equal(normalizeCustomRule({name:'x',trigger:'powerRoll',powerName:'P',effectType:'trouble',attackScope:'all'}).effectType,'trouble');
  assert.equal(mkRule({fantasticOnly:true}).fantasticOnly,false);
});

test('v110: Blazing Fast Fists grants one Edge only on attack and only to its holder',()=>{
  assign([mkRule()]);const owner=actor(),other=actor([]);
  const melee={attack:true,ability:'mle',kind:'close',action:'standard'};
  const result=resolveConditionEdges({actor:owner,...melee});
  assert.equal(result.edgeMode,1);assert.equal(result.net,1);assert.equal(result.autoCount,1);
  assert.match(result.sources[0].source,/Blazing Fast Fists/);
  assert.equal(resolveConditionEdges({actor:other,...melee}).net,0);
  assert.equal(resolveConditionEdges({actor:owner,attack:false,ability:'mle'}).net,0);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'agl',kind:'ranged'}).net,0);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'mle',kind:'ranged'}).net,0);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'mle'}).net,1);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'agl',kind:'close'}).net,1);
});

test('v110: passive cancels Trouble, composes with other Edge and condition prerequisite',()=>{
  assign([mkRule({requiresStatus:'mmrpg.bleeding'})]);
  const owner=actor(['Blazing Fast Fists'],['mmrpg.bleeding','mmrpg.demoralized']);
  const context={actor:owner,attack:true,ability:'mle',kind:'melee'};
  assert.equal(resolveConditionEdges(context).net,0,'passive Edge cancels Demoralized');
  owner.statuses.delete('mmrpg.bleeding');
  assert.equal(resolveConditionEdges(context).net,-1,'passive no longer applies');
  assign([mkRule({effectType:'trouble'}),mkRule({id:'edge2',name:'Outro Edge'})]);
  assert.equal(resolveConditionEdges({actor:actor(),attack:true,ability:'mle'}).net,0);
});

test('v110: settings and individual enable/disable are respected without changing actor',()=>{
  const settings=assign([mkRule()]);const owner=actor();
  const ctx={actor:owner,attack:true,ability:'mle'};
  assert.equal(resolveConditionEdges(ctx).net,1);
  settings.values.customAutomationsEnabled=false;
  assert.equal(resolveConditionEdges(ctx).net,0);
  settings.values.customAutomationsEnabled=true;
  settings.values.disableAllAutomations=true;
  assert.equal(resolveConditionEdges(ctx).net,0);
  settings.values.disableAllAutomations=false;
  settings.values.customAutomationRules=[mkRule({enabled:false})];
  assert.equal(resolveConditionEdges(ctx).net,0);
  settings.values.customAutomationRules=[mkRule()];
  owner.items.contents=[];
  assert.equal(resolveConditionEdges(ctx).net,0);
});

test('v110: filters ranged/all attacks, never guesses non-melee kind; power names case/accents tolerant',()=>{
  assign([mkRule({powerName:'Blázing Fast Fists',attackScope:'ranged',effectType:'trouble'})]);
  const owner=actor(['BLAZING FAST FISTS']);
  assert.equal(passiveAttackModifiers({actor:owner,attack:true,ability:'agl',kind:'ranged'}).length,1);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'agl',kind:'ranged'}).net,-1);
  assert.equal(resolveConditionEdges({actor:owner,attack:true,ability:'agl',kind:''}).net,0);
  assign([mkRule({attackScope:'all'})]);
  assert.equal(resolveConditionEdges({actor:actor(),attack:true,ability:'ego'}).net,1);
});

test('v110: passive rules are never executed by turn/power message effects',async()=>{
  const settings=assign([mkRule()]);const a=actor();
  assert.equal(matchesCustomRule(mkRule(),{trigger:'powerRoll',actor:a,powerName:'Blazing Fast Fists'}),false);
  assert.equal(await processCustomAutomation({trigger:'turnStart',actor:a},settings),0);
});

test('v110: builder offers passive trigger, source power, type scope and guided example',()=>{
 const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
 assert.match(ui,/data-passive-hint/);assert.match(ui,/data-attack-scope/);
 assert.match(ui,/data-load-example/);assert.match(ui,/Blazing Fast Fists/);
 assert.match(ui,/CUSTOM_ATTACK_SCOPES/);
 const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
 assert.equal(manifest.version,'0.2.126');
});
