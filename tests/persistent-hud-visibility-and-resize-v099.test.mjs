import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settings = new Map([
  ['nativeActionHudPersistent', true],
  ['nativeActionHudEnabled', true],
  ['nativeActionHudPersistentSize', {}],
]);
const hooks = [];
const actor = {id:'x', name:'Herói', testUserPermission(){ return true; }};
globalThis.Hooks = {on(name, callback){hooks.push([name,callback]);}, once(name,callback){hooks.push([name,callback]);}};
globalThis.window = {innerWidth:1440,innerHeight:900,addEventListener(){}};
globalThis.document = {
  body:{style:{setProperty(){},removeProperty(){}}},
  addEventListener(){},removeEventListener(){},
};
globalThis.game = {
  user:{isGM:true,character:actor},
  settings:{get(_id,key){return settings.get(key);},async set(_id,key,value){settings.set(key,value);return value;},register(){}},
};
globalThis.canvas = {tokens:{controlled:[],placeables:[]}};
globalThis.CONST = {DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
const {NativeActionHud,persistentGridShape} = await import('../scripts/native-action-hud.mjs');
const source = readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css = readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const manifest = JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));

test('v0.2.99 GM sem token não herda personagem atribuído, com token HUD reaparece',()=>{
  const hud = new NativeActionHud();
  assert.equal(hud.selectedActor,null);
  canvas.tokens.controlled = [{actor}];
  assert.equal(hud.selectedActor,actor);
  canvas.tokens.controlled = [];
  assert.equal(hud.selectedActor,null);
  game.user.isGM = false;
  assert.equal(hud.selectedActor,actor,'jogador preserva fallback anterior');
  game.user.isGM = true;
});

test('v0.2.99 grid mantém cinco ícones por coluna, reduzindo colunas gera rolagem vertical',()=>{
  assert.deepEqual(persistentGridShape(19,4),{columns:4,rows:5,usedColumns:4});
  assert.deepEqual(persistentGridShape(19,2),{columns:2,rows:10,usedColumns:2});
  assert.deepEqual(persistentGridShape(19,1),{columns:1,rows:19,usedColumns:1});
  assert.deepEqual(persistentGridShape(2,6),{columns:6,rows:5,usedColumns:1});
});

test('v0.2.99 volta automaticamente à hotbar sem token e substitui minimização por redimensionamento',()=>{
  assert.match(source,/if \(!actor && \(!persistent \|\| game\.user\?\.isGM\)\)/);
  assert.match(source,/this\.remove\(\);\s*return;/);
  assert.match(source,/if \(persistentMode\(\)\) this\.startPersistentResize\(event\)/);
  assert.match(source,/if \(persistentMode\(\)\) return; \/\/ resized by pointer drag, not minimized/);
  assert.match(css,/body:has\(#mmrpg-native-action-hud\.is-persistent:not\(\.is-collapsed\)\) #hotbar\s*\{\s*display:\s*none !important;/);
});

test('v0.2.99 reflow usa células de 39 px e rolagem vertical, preserva modo clássico',()=>{
  const final = css.slice(css.lastIndexOf('/* v0.2.93'));
  assert.match(final,/grid-template-columns:\s*repeat\(var\(--mmrpg-persistent-body-columns\),\s*var\(--mmrpg-hotbar-slot-size\)\)/);
  assert.match(final,/overflow-y:\s*auto/);
  assert.match(final,/overflow-x:\s*hidden/);
  assert.match(final,/width:\s*100%/);
  assert.match(source,/button\.style\.gridColumn = String\(Math\.floor\(i \/ rows\) \+ 1\)/);
  assert.match(source,/button\.style\.gridRow = String\(\(i % rows\) \+ 1\)/);
  assert.match(source,/this\.renderAbilities\(body, actor\)/,'modo clássico ainda usa ABILITIES');
});

test('v0.2.99 preferencias de tamanho individuais e manifesto corretos',()=>{
  assert.equal(manifest.version,'0.2.106');
  assert.match(manifest.download,/v0\.2\.106\/multiverse-d616-v0\.2\.106\.zip$/);
  assert.match(source,/game\.settings\.register\(SYSTEM_ID, SETTING_PERSISTENT_SIZE,\s*\{\s*scope: "client", config: false/);
  assert.match(source,/await game\.settings\.set\(SYSTEM_ID, SETTING_PERSISTENT_SIZE/);
});
