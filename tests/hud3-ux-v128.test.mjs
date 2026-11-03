import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css = readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const saved=[];
globalThis.Hooks = {on(){},once(){}};
globalThis.window = {innerWidth:1300,innerHeight:800,addEventListener(){}};
globalThis.game = {
  user:{isGM:true},combat:null,
  settings:{get(_ns,key){return key==='nativeActionHudFavorites'?{}:false},register(){},async set(_ns,key,value){saved.push({key,value});return value}},
};
globalThis.canvas={tokens:{controlled:[]}};
const {hudMovementSnapshot} = await import('../scripts/hud3-presentation.mjs');
const {NativeActionHud} = await import('../scripts/native-action-hud.mjs');

test('v128 movement indicator reads selected token mode and does not mutate it',()=>{
 const actor={id:'a',uuid:'Actor.a'};
 const token={id:'t',actor,document:{id:'t',movementAction:'fly'}};
 assert.deepEqual(hudMovementSnapshot(actor,token),{label:'Voo',icon:'fa-feather'});
 token.document.movementAction='burrow';
 assert.equal(hudMovementSnapshot(actor,token).label,'Escavação');
 token.document.movementAction='walk';
 const combat={started:true,combatants:[{tokenId:'t',getFlag:()=>({kind:'teleport',maximum:15})}]};
 assert.equal(hudMovementSnapshot(actor,token,combat).label,'Teleporte (Piscar)');
 assert.equal(token.document.movementAction,'walk','do not write invalid teleport to Foundry');
 assert.equal(hudMovementSnapshot({id:'b'},token),null,'do not show other tokens mode');
});

test('v128 right-click anywhere on a shortcut toggles favorite, left-click never toggles',async()=>{
 const actor={id:'a',uuid:'Actor.a'};
 const hud=new NativeActionHud();
 let toggled=[];
 hud.toggleFavorite=async(a,key)=>toggled.push([a,key]);
 hud.root={contains(node){return node?.dataset?.favoriteKey==='power:p1'}};
 globalThis.canvas.tokens.controlled=[{actor}];
 let prevented=0,stopped=0;
 const btn={dataset:{favoriteKey:'power:p1'}};
 await hud.onShortcutContextMenu({target:{closest(){return btn}},preventDefault(){prevented++},stopPropagation(){stopped++}});
 assert.equal(prevented,1);assert.equal(stopped,1);
 assert.deepEqual(toggled,[[actor,'power:p1']]);
 const other={target:{closest(){return null}},preventDefault(){prevented++},stopPropagation(){stopped++}};
 await hud.onShortcutContextMenu(other);
 assert.equal(prevented,1,'do not hijack menus outside shortcuts');
 // No star hit area on the left click: existing power roll path is unchanged.
 assert.doesNotMatch(source,/const star = event\.target\.closest/);
 assert.match(source,/await item\.roll\(\)/);
 assert.match(css, /mmrpg-native-action-hud__star\s*\{\s*pointer-events: none/);
});

test('v128 persistent reflow fills rows without fake cells, adapts to available width',()=>{
 const hud=new NativeActionHud();
 let props={};
 const makeButton=()=>({style:{removeProperty(k){this[k]=''}}});
 const buttons=Array.from({length:9},makeButton);
 let removed=0;
 const body={clientWidth:230,dataset:{},style:{setProperty(k,v){props[k]=v}},querySelectorAll(selector){
   return selector.includes('slot-empty')?[{remove(){removed++}}]:buttons;
 }};
 hud.root={getBoundingClientRect(){return {width:670}},querySelector(){return {getBoundingClientRect(){return {width:440}}}}};
 hud.reflowPersistentHotbar(body);
 assert.equal(props['--mmrpg-persistent-body-columns'],'5');
 assert.equal(props['--mmrpg-persistent-body-rows'],'2');
 assert.equal(removed,1);
 assert.match(css,/grid-auto-flow:\s*column;[\s\S]*?grid-template-rows:\s*repeat\(var\(--mmrpg-persistent-body-rows\)/);
 assert.match(source,/No fake empty slots/);
});

test('v128 status order and icon dimensions are fixed in both HUDs',()=>{
 const method=source.slice(source.indexOf('  updateHud3Status(root, actor) {'),source.indexOf('  getFavoriteKeys(actor)'));
 const conc=method.indexOf("gauge.className = 'mmrpg-native-action-hud__concentration'");
 const mode=method.indexOf("mode.className = 'mmrpg-native-action-hud__movement-mode'");
 const cond=method.indexOf("block.className = 'mmrpg-native-action-hud__status-conditions'");
 assert.ok(conc>=0&&mode>conc&&cond>mode,'left-to-right order');
 assert.match(css,/mmrpg-native-action-hud__status-chip\s*\{\s*width:\s*29px/);
 assert.match(css,/mmrpg-native-action-hud__concentration\s*\{\s*order:\s*0/);
 assert.match(source,/buttons\.sort\(\(left, right\) =>/);
});
