import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const hooks=[];
globalThis.Hooks={on:(n,f)=>hooks.push([n,f]),once:(n,f)=>hooks.push([n,f])};
globalThis.window={innerWidth:1440,innerHeight:900,addEventListener(){}};
globalThis.document={addEventListener(){},removeEventListener(){}};
globalThis.game={
  user:{isGM:true},settings:{get(_id,k){return k==='nativeActionHudPersistent';},register(){}},
  modules:{get(){return null}}
};
globalThis.canvas={tokens:{controlled:[],placeables:[]}};
const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));

function element(cls, title) {
 return {
  className:cls,
  textContent:title,
  title:'',dataset:{},children:[],
  attrs:{},classList:{added:new Set(),add(c){this.added.add(c)},contains(c){return cls.split(/\s+/).includes(c)||this.added.has(c)}},
  setAttribute(k,v){this.attrs[k]=v},
  insertBefore(node){this.inserted=node},
  querySelector(selector){return selector==='.name'?{textContent:title,querySelector(){return null}}:null},
 };
}

test('v0.2.99: hotbar sorts alphabetically in five-row columns and preserves all actions',()=>{
 const buttons=Array.from({length:13},(_,i)=>element('mmrpg-native-action-hud__action power',`Poder ${i}`));
 const extra=[];
 const styles={};
 const body={
  dataset:{},style:{setProperty(k,v){styles[k]=v}},classList:{toggle(n,on){this[n]=on}},
  querySelectorAll(selector){assert.equal(selector,'.mmrpg-native-action-hud__action');return buttons},
  appendChild(node){extra.push(node)},
 };
 const previous=document.createElement;
 document.createElement=(tag)=>{assert.equal(tag,'span');return element('');};
 try {new NativeActionHud().decoratePersistentHotbar(body)} finally {document.createElement=previous;}
 assert.equal(extra.filter(n=>n.className.includes('power')).length,13,'all 13 power buttons remain usable');
 assert.equal(extra.filter(n=>n.className==='mmrpg-native-action-hud__slot-empty').length,2);
 assert.equal(body.dataset.shortcuts,'13');
 assert.equal(body.classList['has-overflow-shortcuts'],false);
 assert.equal(styles['--mmrpg-persistent-body-rows'],'5');
 assert.equal(styles['--mmrpg-persistent-body-columns'],'3');
 assert.ok(buttons.every(b=>b.classList.added.has('is-hotbar-slot')));
 assert.equal(buttons[12].attrs['aria-label'],'Poder 12');
 assert.equal(extra[0].attrs['aria-label'],'Poder 0');
});

test('v0.2.99: five-row column padding is visual, not clickable controls',()=>{
 const buttons=[element('mmrpg-native-action-hud__action power','Shield 2')];
 const placeholders=[];
 const body={dataset:{},style:{setProperty(){}},classList:{toggle(){}},querySelectorAll:()=>buttons,appendChild:p=>placeholders.push(p)};
 const previous=document.createElement;
 document.createElement=()=>element('');
 try{new NativeActionHud().decoratePersistentHotbar(body)}finally{document.createElement=previous;}
 assert.equal(placeholders.length,5);
 assert.equal(placeholders.filter(p=>p.className==='mmrpg-native-action-hud__slot-empty').length,4);
 assert.equal(placeholders[0],buttons[0]);
 const empty=placeholders.slice(1);
 assert.ok(empty.every(p=>!p.dataset.action));
 assert.ok(empty.every(p=>p.attrs['aria-hidden']==='true'));
});

test('v0.2.92: layout keeps classic HUD CSS untouched and uses native action handlers',()=>{
 assert.match(css,/\.is-persistent \.mmrpg-native-action-hud__body\.is-powers[\s\S]*grid-template-columns: repeat\(5/);
 assert.match(css,/\.is-persistent \.mmrpg-native-action-hud__portrait/);
 assert.match(css,/\.is-persistent \.mmrpg-native-action-hud__quick-abilities/);
 assert.match(js,/await item\.roll\(\)/);
 assert.match(js,/await activateAttachedPower\(carrier,actionButton\.dataset\.powerId,actor\)/);
 assert.match(js,/const persistent = persistentMode\(\)/);
 assert.equal(manifest.version,'0.2.99');
});
