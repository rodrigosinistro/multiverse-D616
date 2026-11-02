import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  inspectPowerIndex,inspectAutomationEntries,inspectActorDocuments,inspectDependencyModules,
  runSystemDiagnostic,
} from '../scripts/system-diagnostics.mjs';
import {
  D616DiagnosticCenter,registerDiagnosticCenterMenu,diagnosticReportJSON,diagnosticReportFilename,
} from '../scripts/diagnostic-center.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const testRule={id:'r1',name:'Teste de duração',trigger:'targetHit',powerName:'Fast Attacks',
  enabled:true,hitOutcome:'fantastic',requiresStatus:'',effects:[{
    effectType:'condition',effectStatus:'mmrpg.confused',conditionDurationMode:'turns',conditionDurationCount:2,
  }]};

function mockGame({rules=[testRule],library=[],packs='ok',gm=true,actorEffects=[]}={}){
  const packMap=new Map();
  for(const name of ['powers','traits','tags','origins','occupations','items']){
    if(packs==='missing'&&name==='powers')continue;
    const index=(packs==='empty-all'||(packs==='empty-powers'&&name==='powers'))?[]:
      name==='powers'?catalog.map(({_id,name,type})=>({_id,name,type})):[{_id:`sample-${name}`,name,type:'Item'}];
    packMap.set(`multiverse-d616.${name}`,{getIndex:async()=>index});
  }
  const values={customAutomationRules:rules,customAutomationLibrary:library,automationPowerOverrides:{}};
  const actor={id:'actor1',name:'Garras',items:{contents:[{type:'power',name:'Fast Attacks'}]},effects:{contents:actorEffects}};
  const writes=[];
  return {user:{isGM:gm},system:{id:'multiverse-d616',version:'0.2.126'},version:'14.0',world:{id:'test-world'},
    packs:packMap,modules:new Map(),actors:{contents:[actor]},
    settings:{get(ns,key){assert.equal(ns,'multiverse-d616');return values[key];},set(...args){writes.push(args);throw Error('Diagnostic must never write settings');}},
    writes};
}

test('v125: index comparison detects missing IDs and renamed powers without false mismatch for same-name variants',()=>{
  const source=catalog.slice(0,3);const index=source.map(x=>({_id:x._id,name:x.name,type:'power'}));
  assert.equal(inspectPowerIndex(source,index).findings.length,0);
  index[0].name='Erro';index.pop();
  const result=inspectPowerIndex(source,index);
  assert.deepEqual(result.findings.map(f=>f.code).sort(),['missing-power','power-name']);
  assert.equal(result.expectedCount,3);
});

test('v125: scanner detects invalid raw automations hidden by normal read',()=>{
  const result=inspectAutomationEntries([testRule,{id:'r2',name:'Quebrada',trigger:'invalid',effectType:'condition'}],
    {knownPowers:['Fast Attacks']});
  assert.equal(result.count,2);
  assert.equal(result.findings.find(f=>f.code==='invalid-rule')?.severity,'error');
  assert.equal(result.findings.some(f=>f.code==='custom-power'),false);
});

test('v125: accepted custom powers are informational, not mistaken for broken rules',()=>{
  const result=inspectAutomationEntries([{...testRule,powerName:'Custom Homebrew'}],{knownPowers:[]});
  assert.deepEqual(result.findings.map(f=>f.severity),['info']);
});

test('v125: status audit checks only own mmrpg namespace and never modifies effects',()=>{
  const effect={name:'Efeito customizado',statuses:new Set(['thirdparty.custom','mmrpg.missing']),flags:{}};
  const actor={id:'a',name:'Personagem',items:{contents:[]},effects:{contents:[effect]}};
  const report=inspectActorDocuments({contents:[actor]},['mmrpg.prone']);
  assert.equal(report.findings.length,1);
  assert.equal(report.findings[0].code,'unknown-status');
  assert.deepEqual([...effect.statuses],['thirdparty.custom','mmrpg.missing']);
});

test('v125: Sequencer is optional unless active visual automation depends on it',()=>{
  assert.equal(inspectDependencyModules(new Map(),[])[0].severity,'info');
  const entry={enabled:true,effects:[{effectType:'vfx'}]};
  assert.equal(inspectDependencyModules(new Map(),[entry])[0].severity,'warning');
  assert.equal(inspectDependencyModules(new Map([['sequencer',{active:true}]]),[entry])[0].severity,'info');
});

test('v125: full diagnostics report is read only and scans six indexes, characters and rules',async()=>{
  const game=mockGame();
  const report=await runSystemDiagnostic({game,loadCatalog:async()=>catalog});
  assert.equal(report.format,'multiverse-d616.diagnostic');
  assert.equal(report.checks.powerComparison.status,'ok');
  assert.equal(report.checks.powerComparison.expected,398);
  assert.equal(report.checks.actors.count,1);
  assert.equal(report.checks.automations.rules,1);
  assert.equal(report.summary.errors,0);
  assert.equal(game.writes.length,0);
  assert.equal(JSON.parse(diagnosticReportJSON(report)).summary.errors,0);
  assert.match(diagnosticReportFilename(report),/^multiverse-d616-diagnostico-test-world-/);
});

test('v125: missing pack is reported and power comparison is safely skipped',async()=>{
  const report=await runSystemDiagnostic({game:mockGame({packs:'missing'}),loadCatalog:async()=>catalog});
  assert.equal(report.checks.powerComparison.status,'skipped');
  assert.equal(report.findings.some(f=>f.code==='pack-missing'&&f.severity==='error'),true);
});

test('v126: a totally empty compendium is one pack-wide error, not 398 power errors',async()=>{
  const report=await runSystemDiagnostic({game:mockGame({packs:'empty-powers'}),loadCatalog:async()=>catalog});
  assert.equal(report.checks.pack_powers.status,'empty');
  assert.equal(report.checks.powerComparison.status,'skipped');
  assert.equal(report.findings.filter(f=>f.code==='pack-empty').length,1);
  assert.equal(report.findings.filter(f=>f.code==='missing-power').length,0);
  assert.equal(report.summary.errors,1);
});

test('v126: all six empty packs are reported individually as missing pack data',async()=>{
  const report=await runSystemDiagnostic({game:mockGame({packs:'empty-all'}),loadCatalog:async()=>catalog});
  assert.equal(report.findings.filter(f=>f.code==='pack-empty').length,6);
  assert.equal(report.findings.filter(f=>f.code==='missing-power').length,0);
  assert.equal(report.summary.errors,6);
});

test('v125: catalog loader failure is honestly reported, not falsely marked 398/398',async()=>{
  const report=await runSystemDiagnostic({game:mockGame(),loadCatalog:async()=>{throw Error('offline');}});
  assert.equal(report.checks.catalog.status,'unavailable');
  assert.equal(report.checks.powerComparison.status,'skipped');
  assert.equal(report.findings.some(f=>f.code==='catalog-unavailable'),true);
});

test('v125: restricted GM access and dedicated ApplicationV2 menu',async()=>{
  await assert.rejects(runSystemDiagnostic({game:mockGame({gm:false}),loadCatalog:async()=>catalog}),/Somente o Mestre/);
  const menus=[];const before=globalThis.game;
  try{
    globalThis.game={settings:{registerMenu(ns,key,config){menus.push({ns,key,config});}}};
    registerDiagnosticCenterMenu();
    assert.equal(menus.length,1);
    assert.equal(menus[0].key,'diagnosticCenter');
    assert.equal(menus[0].config.restricted,true);
    assert.equal(menus[0].config.type,D616DiagnosticCenter);
  }finally{globalThis.game=before;}
});

test('v125: release registers menu, stylesheet and includes no write APIs in scanner',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const source=readFileSync(new URL('../scripts/system-diagnostics.mjs',import.meta.url),'utf8');
  assert.equal(manifest.version,'0.2.126');
  assert.ok(manifest.styles.includes('styles/diagnostic-center.css'));
  assert.match(main,/registerDiagnosticCenterMenu\(\);/);
  assert.doesNotMatch(source,/\.update\(|\.delete\(|\.createEmbeddedDocuments\(|\.setFlag\(|settings\.set\(/);
});
