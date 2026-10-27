import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const hooks=[];
const listeners=new Map();
const values=new Map([['nativeActionHudWidth', 294]]);
globalThis.Hooks={on:(n,f)=>hooks.push([n,f]),once:(n,f)=>hooks.push([n,f])};
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(){}};
globalThis.document={
  addEventListener(n,f){listeners.set(n,f);},
  removeEventListener(n,f){if(listeners.get(n)===f)listeners.delete(n);},
};
globalThis.game={settings:{
  get(ns,key){assert.equal(ns,'multiverse-d616');return values.get(key);},
  async set(ns,key,value){assert.equal(ns,'multiverse-d616');values.set(key,value);return value;},
  register(){},
},user:{isGM:true}};
const {NativeActionHud, normalizeHudWidth, snapHudWidthToPowerColumns} = await import('../scripts/native-action-hud.mjs');
const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));

function mockRoot(initialWidth='294px') {
 const properties=new Map();
 return {
   isConnected:true,
   style:{left:'78px',top:'82px',width:initialWidth,setProperty(n,v){properties.set(n,v);},getPropertyValue(n){return properties.get(n)||'';},removeProperty(n){properties.delete(n);}},
   classList:{add(){},remove(){}},
   getBoundingClientRect(){return {left:parseFloat(this.style.left),top:parseFloat(this.style.top),width:parseFloat(this.style.width),height:400};},
 };
}

test('v0.2.90: single-column widths fit the exact cell width plus HUD padding',()=>{
 assert.equal(snapHudWidthToPowerColumns(294,185,1200),197);
 assert.equal(snapHudWidthToPowerColumns(300,185,1200),197);
 assert.equal(snapHudWidthToPowerColumns(385,185,1200),197);
 assert.equal(snapHudWidthToPowerColumns(386,185,1200),386);
 assert.equal(snapHudWidthToPowerColumns(500,185,1200),500);
 assert.equal(snapHudWidthToPowerColumns(400,230,1200),242);
 // Viewport too narrow for two columns: keep the one visible column.
 assert.equal(snapHudWidthToPowerColumns(500,185,220),197);
 assert.equal(normalizeHudWidth(100,1200,197),197);
 assert.match(css,/__body\.is-powers\s*\{[^}]*repeat\(auto-fill, var\(--mmrpg-power-cell-width, 280px\)\)/s);
 assert.match(source,/this\._powerCellWidth\s*=\s*updatePowerCellWidth\(body\);[\s\S]*?this\.fitPowerWidthToContent\(\);/s);
});

test('v0.2.90: powers auto-fit without overwriting a user preference when an actor has shorter names',()=>{
 const hud=new NativeActionHud();
 hud.root=mockRoot();
 hud._currentTab='powers';hud._powerCellWidth=185;
 hud.fitPowerWidthToContent();
 assert.equal(hud.root.style.width,'197px');
 assert.equal(values.get('nativeActionHudWidth'),294);
 values.set('nativeActionHudWidth',550);
 hud.fitPowerWidthToContent();
 assert.equal(hud.root.style.width,'550px');
 hud._powerCellWidth=300;
 hud.fitPowerWidthToContent();
 assert.equal(hud.root.style.width,'312px');
 assert.equal(values.get('nativeActionHudWidth'),550);
});

test('v0.2.90: release resizing in one column snaps and saves a tight width',async()=>{
 const hud=new NativeActionHud();
 hud.root=mockRoot('197px');
 hud._currentTab='powers'; hud._powerCellWidth=185;
 hud.startResize({button:0,pointerId:8,clientX:100,preventDefault(){},stopPropagation(){}});
 listeners.get('pointermove')({pointerId:8,clientX:160});
 assert.equal(hud.root.style.width,'257px', 'a drag preview remains fluid');
 listeners.get('pointerup')({pointerId:8});
 await Promise.resolve(); await Promise.resolve();
 assert.equal(hud.root.style.width,'197px');
 assert.equal(values.get('nativeActionHudWidth'),197);
 // Widen enough to fit two cells, keeping their original, uniform width.
 hud.startResize({button:0,pointerId:9,clientX:100,preventDefault(){},stopPropagation(){}});
 listeners.get('pointermove')({pointerId:9,clientX:300});
 assert.equal(hud.root.style.width,'397px');
 listeners.get('pointerup')({pointerId:9});
 await Promise.resolve();await Promise.resolve();
 assert.equal(hud.root.style.width,'397px');
 assert.equal(values.get('nativeActionHudWidth'),397);
});

test('v0.2.90: ABILITIES keep prior minimum and empty-state does not force wide grid',()=>{
 assert.equal(normalizeHudWidth(120,1200),294);
 assert.match(css,/__empty\s*\{[^}]*min-width:\s*0;/s);
 assert.equal(manifest.version,'0.2.99');
 assert.match(manifest.download,/v0\.2\.99\/multiverse-d616-v0\.2\.99\.zip/);
});
