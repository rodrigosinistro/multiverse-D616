import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const hooks=[];
const values=new Map([
 ['nativeActionHudPersistent',false], ['nativeActionHudPinnedActor',''],
 ['nativeActionHudPersistentPosition','left'], ['nativeActionHudWidth',294],
]);
const registered=new Map();
globalThis.Hooks={on:(n,f)=>hooks.push([n,f]),once:(n,f)=>hooks.push([n,f])};
globalThis.window={innerWidth:1280,innerHeight:800,addEventListener(){}};
globalThis.document={addEventListener(){},removeEventListener(){}};
const owned={id:'hero1',name:'Hero 1',img:'hero.webp',system:{},testUserPermission(){return true}};
const other={id:'hero2',name:'Hero 2',img:'other.webp',system:{},testUserPermission(){return false}};
globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
globalThis.game={
 user:{isGM:false,character:owned},
 actors:{get(id){return id==='hero1'?owned:id==='hero2'?other:null}},
 settings:{get(ns,key){assert.equal(ns,'multiverse-d616');return values.get(key)},
  async set(ns,key,v){assert.equal(ns,'multiverse-d616');values.set(key,v);return v},
  register(ns,key,opt){registered.set(key,opt)}},
};
globalThis.canvas={tokens:{controlled:[],placeables:[]}};
const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');

// Configuration remains safe by default, and each user's choice is local.
test('v0.2.99: persistent mode remains opt-in and position choice is removed',()=>{
  hooks.find(([n])=>n==='init')[1]();
  assert.equal(registered.get('nativeActionHudPersistent').default,false);
  assert.equal(registered.get('nativeActionHudPersistent').scope,'client');
  assert.equal(registered.has('nativeActionHudPersistentPosition'),false);
  assert.equal(registered.get('nativeActionHudPinnedActor').config,false);
});

test('v0.2.91: persistent HUD uses assigned actor without token and ignores inaccessible pins',()=>{
  const hud=new NativeActionHud();
  assert.equal(hud.selectedActor,null,'classic mode requires a selected token');
  values.set('nativeActionHudPersistent',true);
  assert.equal(hud.selectedActor,owned,'assigned character fallback');
  values.set('nativeActionHudPinnedActor','hero2');
  assert.equal(hud.selectedActor,owned,'cannot expose an actor without ownership');
  values.set('nativeActionHudPinnedActor','hero1');
  assert.equal(hud.selectedActor,owned,'owned pinned actor');
  values.set('nativeActionHudPinnedActor','');
  values.set('nativeActionHudPersistent',false);
});

test('v0.2.99: legacy pinned actor is ignored and pin UI no longer exists',async()=>{
  values.set('nativeActionHudPersistent',true);
  values.set('nativeActionHudPinnedActor','hero2');
  const hud=new NativeActionHud();
  assert.equal(hud.selectedActor,owned);
  assert.doesNotMatch(source,/data-action=\"pin\"/);
  assert.doesNotMatch(source,/game\.settings\.set\(SYSTEM_ID, SETTING_PINNED_ACTOR/);
  values.set('nativeActionHudPinnedActor','');
  values.set('nativeActionHudPersistent',false);
});

test('v0.2.91: persistent layout retains existing shortcut and actor.roll pipelines',()=>{
  assert.match(css,/#mmrpg-native-action-hud\.is-persistent/);
  assert.match(css,/mmrpg-native-action-hud__resource\.health/);
  assert.match(css,/mmrpg-native-action-hud__resource\.focus/);
  assert.match(source,/this\.renderPowers\(body, actor\)/);
  assert.match(source,/await item\.roll\(\)/);
  assert.match(source,/activateAttachedPower\(carrier,actionButton\.dataset\.powerId,actor\)/);
  assert.match(source,/const persistent = persistentMode\(\)/);
  assert.match(source,/applyPersistentPosition\(\)/);
  assert.equal(JSON.parse(readFileSync(new URL('../system.json',import.meta.url))).version,'0.2.106');
});
