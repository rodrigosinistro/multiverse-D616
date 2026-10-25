import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Full browser/Foundry stub for the real distance module (not just regex).
class FakeElement {
  constructor(tag='div') {
    this.tag=tag; this.children=[]; this.style={}; this.hidden=false; this.attributes={};
    this.classes=new Set();this.textContent='';
    this.classList={
      add:name=>this.classes.add(name),
      remove:name=>this.classes.delete(name),
      toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),
    };
  }
  set className(value){this.classes=new Set(String(value).split(/\s+/).filter(Boolean));}
  get className(){return [...this.classes].join(' ');}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.append(node);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  querySelector(selector){
    const match=e=>selector.startsWith('.')?e.classes.has(selector.slice(1)):e.tag===selector;
    const walk=e=>{
      for(const child of e.children){if(match(child))return child;const found=walk(child);if(found)return found;}
      return null;
    };
    return walk(this);
  }
}

const listeners = new Map();
const documentEvents=new Map();
const windowEvents=new Map();
const rootNodes=[];
let warningCount=0;
let warningText='';
function on(name,fn){listeners.set(name,[...(listeners.get(name)||[]),fn]);}
function trigger(name,...args){for(const fn of listeners.get(name)||[])fn(...args);}
globalThis.Hooks={on,once:on};
globalThis.document={
  body:{appendChild:node=>rootNodes.push(node)},
  createElement:tag=>new FakeElement(tag),
  createElementNS:(_ns,tag)=>new FakeElement(tag),
  getElementById:id=>rootNodes.find(node=>node.id===id)||null,
  addEventListener:(name,fn)=>documentEvents.set(name,fn),
};
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener:(name,fn)=>windowEvents.set(name,fn)};
globalThis.requestAnimationFrame=fn=>fn();
globalThis.ui={notifications:{warn:message=>{warningCount++;warningText=message;}}};
const installedSettings=new Map();
globalThis.game={
  system:{id:'multiverse-d616'},
  user:{isGM:true},
  modules:new Map([['hover-distance',{active:true}]]),
  settings:{register:(_id,key,settings)=>installedSettings.set(key,settings),get:()=>true},
  combat:null,
  multiverseD616:{turnTracker:{getState:()=>({movementUsed:12})}},
};

// The document pointer handler is registered during module evaluation.
await import('../scripts/combat/native-distance-display.mjs');

function setupScene(){
  const actor={system:{movement:{run:{value:5,active:true},flight:{value:30,active:true}}}};
  const makeToken=(id,x)=>({id,x,y:0,w:100,h:100,visible:true,isOwner:true,actor,
    document:{hidden:false,elevation:0,movementAction:'fly'}});
  const source=makeToken('source',0),target=makeToken('target',300);
  globalThis.canvas={
    ready:true,
    tokens:{controlled:[source],placeables:[source,target],hover:null,_draggedToken:null,
      get:id=>[source,target].find(t=>t.id===id)},
    stage:{worldTransform:{apply:p=>p,applyInverse:p=>p},on:()=>{},off:()=>{}},
    app:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})},renderer:{screen:{width:1200,height:800}}},
    scene:{grid:{distance:5,size:100}},dimensions:{size:100},
    grid:{measurePath:([a,b])=>({spaces:Math.hypot(b.x-a.x,b.y-a.y)/100})},
  };
  game.combat={started:true,combatant:{id:'ca',tokenId:source.id},combatants:new Map([['ca',{id:'ca',tokenId:source.id,actor}]])};
  trigger('canvasReady');
  return {source,target};
}
function overlay(){return document.getElementById('m616-native-distance');}

test('initial pointer move before canvas is loaded cannot throw; module warning appears once on ready',()=>{
  // The original release threw a ReferenceError at this early pointer listener.
  assert.doesNotThrow(()=>documentEvents.get('pointermove')({clientX:0,clientY:0}));
  trigger('init');
  assert.equal(installedSettings.get('nativeTokenDistance').default,true);
  trigger('ready');
  assert.equal(warningCount,1);
  assert.match(warningText,/Hover Distance/);
  assert.match(warningText,/desativar/);
});

test('hover text is identical in combat and outside, and hides after hover end',()=>{
  const {target}=setupScene();
  trigger('hoverToken',target,true);
  assert.equal(overlay().hidden,false);
  assert.equal(overlay().querySelector('.m616-distance-pill').textContent,'Distância: 3 espaços');
  assert.ok(overlay().querySelector('.m616-distance-guide').attributes.d.startsWith('M'));
  game.combat.started=false;
  trigger('hoverToken',target,true);
  assert.equal(overlay().querySelector('.m616-distance-pill').textContent,'Distância: 3 espaços');
  trigger('hoverToken',target,false);
  assert.equal(overlay().hidden,true);
});

test('distance appears when active combat token is unselected but owned',()=>{
  const {source,target}=setupScene();
  canvas.tokens.controlled=[];
  trigger('hoverToken',target,true);
  assert.equal(overlay().querySelector('.m616-distance-pill').textContent,'Distância: 3 espaços');
  source.isOwner=false;game.user.isGM=false; source.actor.isOwner=false;
  trigger('hoverToken',target,true);
  assert.equal(overlay().hidden,true);
  game.user.isGM=true;
  trigger('hoverToken',target,false);
});

test('drag is preview-only; after pointerup and committed move no trajectory remains',()=>{
  const {source}=setupScene();
  canvas.tokens._draggedToken=source;
  documentEvents.get('pointermove')({clientX:500,clientY:50});
  assert.equal(overlay().hidden,false);
  assert.match(overlay().querySelector('.m616-distance-pill').textContent,/Voo 30/);
  assert.match(overlay().querySelector('.m616-distance-pill').textContent,/Restam/);
  // One temporary guide; there is no route history element anymore.
  assert.equal(overlay().querySelector('.m616-distance-trail'),null);
  assert.ok(overlay().querySelector('.m616-distance-guide').attributes.d);
  canvas.tokens._draggedToken=null;
  documentEvents.get('pointerup')();
  assert.equal(overlay().hidden,true);
  trigger('moveToken',{id:source.id},{destination:{x:500,y:0}});
  trigger('updateToken',{id:source.id},{x:500});
  assert.equal(overlay().hidden,true);
  // The authoritative counter is not changed by this display.
  assert.deepEqual(game.multiverseD616.turnTracker.getState(),{movementUsed:12});
});

test('hidden combatant cannot be measured; hovering is restored when visible',()=>{
  const {target}=setupScene();
  game.user.isGM=false;
  target.document.hidden=true;
  trigger('hoverToken',target,true);
  assert.equal(overlay().hidden,true);
  target.document.hidden=false;
  trigger('hoverToken',target,true);
  assert.equal(overlay().hidden,false);
  trigger('hoverToken',target,false);
  game.user.isGM=true;
});

test('no persistent trails or README release notes; manifest and changelog reflect update',()=>{
  const src=readFileSync(new URL('../scripts/combat/native-distance-display.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(src,/trails\s*=\s*new Map|recordMove\s*\(/);
  assert.match(src,/Hooks\.on\('moveToken',finishPreview\)/);
  assert.match(src,/globalThis\.canvas\?\.ready/);
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
  assert.equal(manifest.version,'0.2.84');
  const changelog=readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8');
  assert.match(changelog,/^## v0\.2\.84/);
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.doesNotMatch(readme,/v0\.2\.82/);
});
