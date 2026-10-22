import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../apps/charactermancer/scripts/charactermancer.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../apps/charactermancer/styles/styles.css', import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json', import.meta.url),'utf8'));

function makeMMC(){
  class AppV2 {
    constructor(o){this.options=o;this.element={querySelector:()=>null};}
    async render(force,opts){this._renderCalls=(this._renderCalls||0)+1;return this;}
    _onRender(){} _onClose(){}
  }
  const hooks=[];
  const ctx={
    foundry:{applications:{api:{ApplicationV2:AppV2}}},
    Hooks:{once:(...args)=>hooks.push(args),on:(...args)=>hooks.push(args)},
    console,
    loadTraitsAndTags:()=>({traits:[],tags:[]}),
    dedupePowerCatalog:()=>[],reconcilePowerCatalog:()=>[],prepareCharacterPowers:()=>[],
    powerIdentity:()=>'',samePower:()=>false,
  };
  const executable=src.replace(/^import .*;\s*$/gm,'');
  const klass=vm.runInNewContext(executable+'\nMMCCharactermancer;',ctx);
  return {MMC:klass,hooks};
}

test('Charactermancer extends ApplicationV2 and never depends on ApplicationV1 or jQuery render output',()=>{
  assert.match(src,/class MMCCharactermancer extends foundry\.applications\.api\.ApplicationV2/);
  assert.doesNotMatch(src,/foundry\.appv1\.api\.Application|\bget defaultOptions\b|\bactivateListeners\s*\(/);
  assert.doesNotMatch(src,/return \$\(wrap\)|this\.element\?\.\[0\]/);
  assert.match(src,/_renderHTML\(context, options\)/);
  assert.match(src,/_replaceHTML\(element, content, options\)/);
});
test('ApplicationV2 window uses 1100x700 resizable frame and six original steps',()=>{
  const {MMC}=makeMMC();
  assert.equal(MMC.DEFAULT_OPTIONS.position.width,1100);
  assert.equal(MMC.DEFAULT_OPTIONS.position.height,700);
  assert.equal(MMC.DEFAULT_OPTIONS.window.resizable,true);
  assert.ok(MMC.DEFAULT_OPTIONS.classes.includes('mmc-app'));
  const app=new MMC();
  assert.equal(app.steps.join(','),'rank-abilities,occupation,origin,traits-tags,powers,review');
});
test('V2 rerender remains compatible with previous render(true)/render(false) calls',async()=>{
  const {MMC}=makeMMC();const app=new MMC();app._loaded=true;
  assert.equal(await app.render(true),app);
  assert.equal(await app.render(false),app);
  assert.equal(app._renderCalls,2);
});
test('V2 content replacement uses native HTMLElement replaceChildren',()=>{
  const {MMC}=makeMMC();const app=new MMC();
  const el={name:'rendered'},calls=[];
  app._replaceHTML(el,{replaceChildren(...args){calls.push(args)}},{});
  assert.deepEqual(calls,[[el]]);
});
test('closing the V2 app cleans up the power effect popup',()=>{
  const {MMC}=makeMMC();const app=new MMC();
  let closed=false;app._mmcClosePowerEffect=()=>{closed=true};
  app._onClose({});
  assert.equal(closed,true);
});
test('V2 preserves six-step UI and shows a progress heading',()=>{
  assert.match(src,/ETAPA \$\{this\.step \+ 1\} DE \$\{this\.steps\.length\}/);
  assert.match(src,/this\._renderStep\(\)/);
  assert.match(src,/this\._onNext\(\)/);
  assert.match(src,/await actor\.createEmbeddedDocuments\([\"']Item[\"'], fixedItems\)/);
  assert.match(src,/prepareCharacterPowers\(grantedPowers, this\.mmcState\.chosenPowers/);
});
test('Charactermancer theme uses red/black/white scoped styles and retains system IDs',()=>{
  assert.match(css,/\.mmc-app \.mmc-heading/);
  assert.match(css,/\.mmc-app \.mmc-shell/);
  assert.match(css,/#9a332b/);
  assert.match(css,/#17181d/);
  assert.equal(manifest.version,'0.2.76');
  assert.ok(manifest.esmodules.includes('apps/charactermancer/scripts/charactermancer.js'));
  assert.ok(!manifest.esmodules.some(e=>e.includes('mmc-guard-core-listeners')||e.includes('mmc-compat-cleaner-titlebar')));
});

test('A propriedade ApplicationV2.state é somente leitura; os dados do personagem usam mmcState',()=>{
  // Simulates actual Foundry v14, where assigning app.state throws in strict-mode modules.
  class StrictAppV2 {
    #lifecycleState = 0;
    get state() { return this.#lifecycleState; }
    get options() { return {}; }
    get element() { return null; }
    render() { return Promise.resolve(this); }
    _onClose() {}
    _onRender() {}
  }
  const ctx={
    foundry:{applications:{api:{ApplicationV2:StrictAppV2}}},
    Hooks:{once:()=>{},on:()=>{}}, console,
    loadTraitsAndTags:()=>({traits:[],tags:[]}),
    dedupePowerCatalog:()=>[],reconcilePowerCatalog:()=>[],prepareCharacterPowers:()=>[],
    powerIdentity:()=>'',samePower:()=>false,
  };
  const MMC=vm.runInNewContext(src.replace(/^import .*;\s*$/gm,'')+'\nMMCCharactermancer;',ctx);
  const app = new MMC();
  assert.equal(app.state,0,'Core ApplicationV2 lifecycle state untouched');
  assert.equal(app.mmcState.rank,1);
  assert.equal(app.mmcState.chosenPowers.length,0);
  app.mmcState.rank = 3;
  assert.equal(app.mmcState.rank,3);
  assert.equal(app.state,0,'V2 lifecycle state preserved');
  assert.doesNotMatch(src,/this\.state\b/);
});
