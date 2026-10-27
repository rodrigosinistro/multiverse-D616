import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const hooks=[];
globalThis.Hooks={on:(name,fn)=>hooks.push([name,fn]),once:(name,fn)=>hooks.push([name,fn])};
const eventHandlers=new Map();
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(){}};
globalThis.document={
 addEventListener(name,fn){eventHandlers.set(name,fn);},
 removeEventListener(name,fn){if(eventHandlers.get(name)===fn) eventHandlers.delete(name);},
};
const values = new Map([['nativeActionHudWidth',294]]);
const registered = new Map();
globalThis.game={settings:{
 get(ns,key){assert.equal(ns,'multiverse-d616');return values.get(key);},
 async set(ns,key,value){assert.equal(ns,'multiverse-d616');values.set(key,value);return value;},
 register(ns,key,config){registered.set(key,config);},
 },user:{isGM:true}};
const {NativeActionHud,normalizeHudWidth,calculateUniformPowerWidth}=await import('../scripts/native-action-hud.mjs');

const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');

test('v0.2.89: uniform, content-sized shortcuts lay out left-to-right, row-by-row as width grows',()=>{
 assert.match(css,/\.mmrpg-native-action-hud__body\.is-powers\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill, var\(--mmrpg-power-cell-width, 280px\)\);[^}]*grid-auto-flow:\s*row;/s);
 assert.match(css,/\.mmrpg-native-action-hud__group-title\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
 assert.match(css,/\.mmrpg-native-action-hud__body\.is-abilities\s*\{[^}]*repeat\(auto-fill, 137px\)/s);
 assert.match(css,/\.mmrpg-native-action-hud__action\.power\s*\{[^}]*min-width:\s*0;/s);
 assert.doesNotMatch(css,/\.mmrpg-native-action-hud__action\.power\s*\{[^}]*min-width:\s*max-content;/s);
});

test('v0.2.89: power label and carrier label display on distinct lines, no duplicated action',()=>{
 assert.match(source,/powerName\.textContent=entry\.name/);
 assert.match(source,/equipmentName\.textContent=`\(\$\{carrier\.name\}\)`/);
 assert.match(source,/label\.append\(powerName,equipmentName\)/);
 assert.match(css,/\.attached-power \.name\s*\{[^}]*flex-direction:\s*column;/s);
 assert.match(source,/button\.dataset\.action='attached-power'/);
});

test('v0.2.89: width is per-client and clamped to viewport',()=>{
 assert.equal(normalizeHudWidth(294,1200),294);
 assert.equal(normalizeHudWidth(590,1200),590);
 assert.equal(normalizeHudWidth(5000,1200),1184);
 assert.equal(normalizeHudWidth(20,1200),294);
 assert.equal(normalizeHudWidth(800,260),244);
 const config=hooks.find(([name])=>name==='init')?.[1];
 assert.ok(config);config();
 assert.equal(registered.get('nativeActionHudWidth')?.scope,'client');
 assert.equal(registered.get('nativeActionHudWidth')?.config,false);
});

test('v0.2.89: resize grip persists width without moving header or firing an action',async()=>{
 const hud=new NativeActionHud();
 let resizing=false;
 const root={
  isConnected:true,style:{left:'78px',top:'82px',width:'294px'},
  classList:{add(n){if(n==='is-resizing')resizing=true;},remove(n){if(n==='is-resizing')resizing=false;}},
  getBoundingClientRect(){return {left:parseFloat(this.style.left),top:parseFloat(this.style.top),width:parseFloat(this.style.width),height:320};},
 };
 hud.root=root;
 hud.startResize({button:0,pointerId:7,clientX:200,preventDefault(){},stopPropagation(){}});
 assert.equal(resizing,true);
 eventHandlers.get('pointermove')({pointerId:7,clientX:504});
 assert.equal(root.style.width,'598px');
 eventHandlers.get('pointerup')({pointerId:7});
 // onUp is asynchronous because it stores the user setting.
 await Promise.resolve();await Promise.resolve();
 assert.equal(values.get('nativeActionHudWidth'),598);
 assert.equal(resizing,false);
 assert.equal(root.style.left,'78px');
 values.set('nativeActionHudWidth',910);
 hud.applyStoredWidth();assert.equal(root.style.width,'910px');
 window.innerWidth=500;
 hud.applyStoredWidth();assert.equal(root.style.width,'484px');
 assert.equal(values.get('nativeActionHudWidth'),910,'window resizing does not overwrite preferred width');
});

test('v0.2.89: cell width adapts to the longest POWER line while staying uniform', () => {
  const widthShort = calculateUniformPowerWidth(['Smash','Clobber'], text => text.length * 7, 1280);
  const widthLong = calculateUniformPowerWidth(['Smash','Unrelenting Smash','Elemental Protection 1'], text => text.length * 7, 1280);
  assert.ok(widthLong > widthShort);
  assert.equal(calculateUniformPowerWidth(['Elemental Protection 1','(Espada da Vingança)'], t => t.length * 7, 1280), widthLong);
  assert.equal(calculateUniformPowerWidth(['VERY LONG POWER '.repeat(40)], t => t.length * 7, 500), 472);
  assert.match(source,/updatePowerCellWidth\(body\);/);
  assert.match(css,/__action\.power\s*\{[^}]*height:\s*38px;/s);
  assert.match(source,/"\.power-name, \.equipment-name"/);
});
