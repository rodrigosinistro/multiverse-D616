import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCustomRule, getCustomRules, powerRollModifiers, processCustomAutomation, CUSTOM_STATUSES } from '../scripts/custom-automations.mjs';
import { resolveConditionEdges } from '../scripts/condition-edge.mjs';
import { D616AutomationCenter } from '../scripts/automation-center.mjs';

const SYSTEM = 'multiverse-d616';
const createRule=(overrides={})=>normalizeCustomRule({id:'elemental-edge',name:'Edge Elemental Blast',
  trigger:'powerRoll',powerName:'Elemental Blast',effectType:'edge',attackScope:'ranged',
  requiresStatus:'',enabled:true,...overrides});
function makeGame(rules){
  const values={customAutomationRules:rules,customAutomationsEnabled:true,disableAllAutomations:false};
  const settings={values,get(system,key){assert.equal(system,SYSTEM);return values[key];}};
  globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};
  return settings;
}
const actor=()=>({name:'Character',items:{contents:[{name:'Elemental Blast',type:'power'}]},statuses:new Set(),effects:[]});
const power=(name='Elemental Blast')=>({name,type:'power',system:{attack:true,ability:'agl',attackKind:'ranged',attackTarget:'agl'}});

// Default elemental blast compendium has attackEdgeMode=edge. The rule must NOT double count it.
test('v111: native Elemental Blast Edge is not duplicated by matching visual rule',()=>{
  makeGame([createRule()]);
  const result=resolveConditionEdges({actor:actor(),item:power(),ability:'agl',kind:'ranged',attack:true,baseMode:1});
  assert.equal(result.net,1);assert.equal(result.edgeMode,1);assert.equal(result.sources.length,0);
});

test('v111: Elemental Blast Edge affects just its own ranged roll when native Edge missing',()=>{
  makeGame([createRule()]);const a=actor();
  const ctx={actor:a,item:power(),attack:true,ability:'agl',kind:'ranged'};
  assert.equal(resolveConditionEdges(ctx).edgeMode,1);
  assert.match(resolveConditionEdges(ctx).sources[0].source,/Elemental Blast/);
  assert.equal(resolveConditionEdges({...ctx,item:power('Teleport 1')}).net,0);
  assert.equal(resolveConditionEdges({...ctx,item:power('Elemental Blast'),kind:'close'}).net,0);
  assert.equal(resolveConditionEdges({...ctx,attack:false}).net,0);
  assert.equal(resolveConditionEdges({...ctx,item:{...power(),type:'weapon'}}).net,0);
});

test('v111: Edge and Trouble combine with native and condition sources',()=>{
  makeGame([createRule({effectType:'trouble'})]);const a=actor();
  assert.equal(resolveConditionEdges({actor:a,item:power(),attack:true,ability:'agl',kind:'ranged',baseMode:1}).net,0);
  a.statuses.add('mmrpg.demoralized');
  assert.equal(resolveConditionEdges({actor:a,item:power(),attack:true,ability:'agl',kind:'ranged',baseMode:1}).net,-1);
  const settings=makeGame([createRule({effectType:'trouble'})]);
  assert.equal(resolveConditionEdges({actor:actor(),item:power(),attack:true,ability:'agl',kind:'ranged',baseMode:-1}).net,-1,'native Trouble not doubled');
  settings.values.customAutomationRules=[createRule()];
  assert.equal(resolveConditionEdges({actor:actor(),item:power(),attack:true,ability:'agl',kind:'ranged',baseMode:-1}).net,0);
});

test('v111: missing kind does not guess ranged unless scope all',()=>{
  makeGame([createRule()]);const a=actor(),item={...power(),system:{}};
  assert.equal(powerRollModifiers({actor:a,item,attack:true,ability:'agl'}).length,0);
  makeGame([createRule({attackScope:'all'})]);
  assert.equal(powerRollModifiers({actor:a,item,attack:true,ability:'agl'}).length,1);
});

test('v111: roll-time modifiers respect status prerequisites, pauses and rule toggle',()=>{
  const settings=makeGame([createRule({requiresStatus:'mmrpg.bleeding'})]);
  const a=actor(),args={actor:a,item:power(),attack:true,ability:'agl',kind:'ranged'};
  assert.equal(powerRollModifiers(args).length,0);
  a.statuses.add('mmrpg.bleeding');assert.equal(powerRollModifiers(args).length,1);
  settings.values.customAutomationsEnabled=false;assert.equal(powerRollModifiers(args).length,0);
  settings.values.customAutomationsEnabled=true;
  settings.values.disableAllAutomations=true;assert.equal(powerRollModifiers(args).length,0);
  settings.values.disableAllAutomations=false;
  settings.values.customAutomationRules=[createRule({enabled:false})];
  assert.equal(powerRollModifiers(args).length,0);
});

test('v111: event effects stay available; impossible turn Edge and post-die M Edge are rejected',()=>{
  const r=createRule(); assert.equal(r.attackScope,'ranged');
  assert.equal(createRule({effectType:'condition',effectStatus:'mmrpg.infected'}).effectStatus,'mmrpg.infected');
  assert.throws(()=>createRule({fantasticOnly:true}),/antes dos dados/);
  assert.throws(()=>normalizeCustomRule({name:'Too late',trigger:'turnStart',effectType:'edge',attackScope:'all'}),/Edge\/Trouble/);
  assert.throws(()=>createRule({attackScope:'hack'}),/tipo de ataque/);
  assert.equal(normalizeCustomRule({name:'Heal at end',trigger:'turnEnd',effectType:'healing',healAmount:3}).healAmount,3);
});

test('v111: all regular conditions in catalog accessible, but internal control states remain excluded',()=>{
  const catalogue=JSON.parse(readFileSync(new URL('../data/conditions.json',import.meta.url),'utf8'));
  const blocked=new Set(['mmrpg.grabbed','mmrpg.power-grabbed','mmrpg.shield-thrown']);
  const ordinary=catalogue.conditions.filter(x=>!x.id.startsWith('mmrpg.concentration.')&&!blocked.has(x.id));
  assert.equal(ordinary.length,22);
  for(const c of ordinary)assert.ok(CUSTOM_STATUSES[c.id],c.id);
  for(const c of catalogue.conditions.filter(x=>x.id.startsWith('mmrpg.concentration.')||blocked.has(x.id)))
    assert.equal(CUSTOM_STATUSES[c.id],undefined);
});

test('v111: Edge/Trouble not applied later by chat event hook or GM processor',async()=>{
  const settings=makeGame([createRule()]);
  const result=await processCustomAutomation({trigger:'powerRoll',powerName:'Elemental Blast',actor:actor()},settings);
  assert.equal(result,0);
  assert.equal(getCustomRules(settings).length,1);
});

test('v111: builder has power example, all power effects and per-roll resolver uses current item',async()=>{
  const source=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const original=globalThis.document;globalThis.document={createElement:()=>({className:'',innerHTML:''})};
  try{
    const root=await new D616AutomationCenter()._renderHTML();
    assert.match(root.innerHTML,/data-load-power-example/);
    assert.match(root.innerHTML,/Elemental Blast/);
    assert.match(root.innerHTML,/data-attack-scope/);
  }finally{globalThis.document=original;}
  assert.match(source,/option.disabled=passive\?!rollModifier:!power&&rollModifier/);
  assert.match(source,/form\.querySelector\('\[data-attack-scope\]'\)\.hidden=!rollModifier/);
  assert.match(engine,/attack: isAttackItem\(this\),\s*item: this/);
  assert.match(engine,/item:this,kind:this\.system\.attackKind/);
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.2.134');
});
