import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {portableAutomationRule,mergeAutomationLibrary,installAutomationFromLibrary,
  parseAutomationBundle,exportAutomationBundle,getAutomationLibrary,
  AUTOMATION_BUNDLE_FORMAT,MAX_BUNDLE_BYTES} from '../scripts/automation-library.mjs';
import {normalizeCustomRule,ruleEffects} from '../scripts/custom-automations.mjs';
import {D616AutomationCenter} from '../scripts/automation-center.mjs';

const e=(effectType,overrides={})=>({effectType,...(effectType==='condition'
  ?{effectStatus:'mmrpg.confused',conditionDurationMode:'turns',conditionDurationCount:2,
     conditionRemoval:'Teste de Logic TN 12'}
  :effectType==='ongoingDamage'?{ongoingAmount:5,ongoingResource:'focus',ongoingTurns:3}
  :{message:'Resultado do poder no alvo'}),...overrides});
const rule=extra=>normalizeCustomRule({id:'old-world-id',name:'Fast Attacks — Exemplo',
  trigger:'targetHit',powerName:'Fast Attacks',hitOutcome:'fantastic',statusSubject:'target',
  effects:[e('condition'),e('ongoingDamage'),e('chat')],enabled:true,...extra});
const seq=()=>{let n=0;return()=>`new-${++n}`;};

test('v120: export and import of full effects is lossless while runtime identifiers and enabled state are not portable',()=>{
  const original=rule();
  const text=exportAutomationBundle([original],{date:'2026-11-02T00:00:00.000Z'});
  const document=JSON.parse(text);
  assert.equal(document.format,AUTOMATION_BUNDLE_FORMAT);
  assert.equal(document.rules[0].id,undefined);
  assert.equal(document.rules[0].enabled,false);
  const [back]=parseAutomationBundle(text);
  assert.equal(back.powerName,original.powerName);
  assert.equal(back.hitOutcome,'fantastic');
  assert.equal(back.statusSubject,'target');
  assert.deepEqual(ruleEffects(back),ruleEffects(original));
  assert.equal(back.effects[1].ongoingResource,'focus');
  assert.equal(back.effects[0].conditionRemoval,'Teste de Logic TN 12');
});

test('v120: merge ignores exact duplicates without overwriting or activating existing entries',()=>{
  const [first]=parseAutomationBundle(exportAutomationBundle([rule()]));
  const initial=mergeAutomationLibrary([], [first],{idFactory:seq()});
  assert.equal(initial.added,1);
  const retry=mergeAutomationLibrary(initial.entries,[rule()],{idFactory:seq()});
  assert.equal(retry.added,0);assert.equal(retry.skipped,1);
  assert.equal(retry.entries[0].id,initial.entries[0].id);
  assert.equal(retry.entries[0].enabled,false);
  const distinct=rule({effects:[e('condition',{conditionDurationCount:4})]});
  const merged=mergeAutomationLibrary(retry.entries,[distinct],{idFactory:()=>"new-2"});
  assert.equal(merged.added,1,'same name, changed behavior is a separate library snapshot');
  assert.equal(merged.entries.length,2);
});

test('v120: installing copies creates a new disabled rule; duplicates and ID collisions are rejected',()=>{
  const libraryRule=mergeAutomationLibrary([],[rule()],{idFactory:()=> 'lib-01'}).entries[0];
  const installed=installAutomationFromLibrary(libraryRule,[],{idFactory:()=> 'active-01'});
  assert.equal(installed[0].id,'active-01');
  assert.equal(installed[0].enabled,false);
  assert.equal(installed[0].effects.length,3);
  assert.throws(()=>installAutomationFromLibrary(libraryRule,installed),/já existe/);
  assert.throws(()=>installAutomationFromLibrary(libraryRule,[rule({name:'Outra regra'})],{idFactory:()=> 'old-world-id'}),/Identificador/);
});

test('v120: legacy flat rules remain portable and are migrated into one effect',()=>{
  const old={id:'old',name:'Alerta do turno',trigger:'turnStart',effectType:'chat',message:'Alerta!',enabled:true};
  const [entry]=parseAutomationBundle(exportAutomationBundle([old]));
  assert.equal(entry.effects.length,1);assert.equal(entry.effects[0].message,'Alerta!');
});

test('v120: rejecting invalid/malicious files is atomic, no arbitrary scripts or unsupported actions',()=>{
  const template=JSON.parse(exportAutomationBundle([rule()]));
  for(const change of [
    v=>v.format='other-format',v=>v.version=100,v=>v.system='evil',v=>v.rules='bad',
    v=>v.rules=[{name:'Unsafe',trigger:'turnStart',effectType:'runScript',script:'alert(1)'}],
    v=>v.rules=[{name:'Unsafe',trigger:'turnStart',effectType:'chat',message:''}],
    v=>v.rules=[{name:'Unsafe',trigger:'turnStart',effects:[{effectType:'chat',message:'a'}],id:'bad',requiresStatus:'root'}],
  ]){
    const bad=structuredClone(template);change(bad);
    assert.throws(()=>parseAutomationBundle(JSON.stringify(bad)));
  }
  assert.throws(()=>parseAutomationBundle('{invalid'),/JSON inválido/);
  assert.throws(()=>parseAutomationBundle('a'.repeat(MAX_BUNDLE_BYTES+1)),/maior que 1 MB/);
  assert.throws(()=>mergeAutomationLibrary([],[...Array(101).fill(rule())]),/excede 100/);
  const invalid=rule();invalid.effects[1].ongoingTurns=99;
  assert.throws(()=>mergeAutomationLibrary([], [rule(), invalid]),/Duração/);
});

test('v120: worlds have independent library values, settings absent is safe',()=>{
  const r=rule(),a=[{...portableAutomationRule(r),id:'one'}];
  const fromA=getAutomationLibrary({get:()=>a});
  const fromB=getAutomationLibrary({get:()=>[]});
  assert.equal(fromA.length,1);assert.equal(fromB.length,0);
  assert.equal(getAutomationLibrary({get:()=>[{id:'x',trigger:'invalid'}]}).length,0);
});

test('v120: Center UI exposes a true library tab, stores and exports rules, and survives malformed file selection',async()=>{
  const oldDocument=globalThis.document;
  globalThis.document={createElement:()=>({className:"",innerHTML:""})};
  const center=new D616AutomationCenter();
  const root=await center._renderHTML();
  globalThis.document=oldDocument;
  assert.match(root.innerHTML,/data-tab="library"/);
  assert.match(root.innerHTML,/data-import-library/);
  assert.match(root.innerHTML,/data-export-library/);
  assert.match(root.innerHTML,/data-export-active/);
  const src=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  assert.match(src,/data-store-library/);
  assert.match(src,/data-install-library/);
  assert.match(src,/this\._saveEditedRuleIfNeeded\(\)/);
  const old=globalThis.game;
  try{globalThis.game={user:{isGM:false}};
    await center._importLibraryFile({size:0,text:async()=> '{}'});
  }finally{globalThis.game=old;}
});
