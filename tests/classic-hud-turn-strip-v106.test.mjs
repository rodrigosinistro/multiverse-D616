import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hudResourceState} from '../scripts/combat/hud-resource-state.mjs';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const hudSource = read('../scripts/native-action-hud.mjs');
const hudCSS = read('../styles/native-action-hud.css');

const actor={id:'hero',uuid:'Actor.hero',name:'Zima'};
const opponent={id:'enemy',uuid:'Actor.enemy',name:'Inimigo'};
const token=(character,id,owner=true)=>({id,actor:character,isOwner:owner,
  document:{id,isOwner:owner,parent:{id:'scene-1'},movementAction:'walk'}});
const friendly=token(actor,'token-hero');
const enemy=token(opponent,'token-enemy',false);
const combatant={id:'cmb-hero',tokenId:'token-hero',sceneId:'scene-1',getFlag(){return null;}};
const combat={started:true,scene:{id:'scene-1'},combatants:new Map([['hero',combatant]])};
const state={actionMax:1,actionUsed:0,reactionMax:2,reactionUsed:0,movementMax:8,movementUsed:0};
const tracker={getState(c){return c===combatant?state:null;}};

// Lightweight DOM: test the actual shared painter without importing a browser.
class MockElement {
  constructor(){
    this.children=[];this.title='';this.className='';this.src='';this.alt='';
    this.classes={};this.style={width:''};
    this.classList={toggle:(name,active)=>this.classes[name]=active};
  }
  replaceChildren(){this.children=[];}
  appendChild(el){this.children.push(el);return el;}
  append(...els){this.children.push(...els);}
}
const resources=new MockElement();
const movement=new MockElement();
const bar=new MockElement();
bar.querySelector = selector => selector.includes('turn-resources') ? resources : movement;
const root={querySelector:selector => selector.includes('classic-turn-strip') ? bar : null};

test('v106: classic strip is created immediately beneath ABILITIES/POWERS and above shortcuts',()=>{
  assert.match(hudSource,/root\.append\(header, profile, tabs, classicTurnStrip, body, resizeHandle\)/);
  assert.match(hudSource,/mmrpg-native-action-hud__classic-turn-strip is-hidden/);
  assert.match(hudSource,/this\.updatePortraitTurnResources\(root, actor, true\)/);
  assert.match(hudSource,/this\.updatePortraitTurnResources\(this\.root, actor, true\)/);
  assert.match(hudCSS,/#mmrpg-native-action-hud:not\(\.is-persistent\) \.mmrpg-native-action-hud__classic-turn-strip\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;/s);
  assert.match(hudCSS,/__turn-resources\s*\{[^}]*justify-content:\s*flex-start;/s);
  assert.match(hudCSS,/__turn-movement\s*\{[^}]*justify-content:\s*flex-end;/s);
});

test('v106: classic and portrait use a single authoritative renderer and resource state',async()=>{
  globalThis.Hooks={on(){},once(){}};
  globalThis.window={addEventListener(){}};
  globalThis.document={createElement:()=>new MockElement(),body:{style:{}}};
  globalThis.game={user:{isGM:false},combat,multiverseD616:{turnTracker:tracker}};
  const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
  const context={selectedToken:friendly};
  const paint=()=>NativeActionHud.prototype.updatePortraitTurnResources.call(context,root,actor,true);
  paint();
  assert.equal(bar.classes['is-hidden'],false);
  assert.equal(resources.children.length,3,'one action and two reactions on left');
  assert.deepEqual(resources.children.map(i=>i.className),[
    'mmrpg-native-action-hud__turn-icon is-action',
    'mmrpg-native-action-hud__turn-icon is-reaction',
    'mmrpg-native-action-hud__turn-icon is-reaction',
  ]);
  assert.equal(movement.children.length,4,'exactly four movement arrows on right');
  assert.equal(movement.children[0].children[1].style.width,'100%');
  state.actionUsed=1;state.reactionUsed=1;state.movementUsed=3;
  paint();
  assert.equal(resources.children.length,1,'spent action and one reaction disappear');
  assert.equal(movement.children[2].children[1].style.width,'50%','partial movement remains visible');
  assert.equal(movement.children[3].children[1].style.width,'0%');
  state.actionUsed=0;state.reactionUsed=0;state.movementUsed=0;
  paint();
  assert.equal(resources.children.length,3,'resources refresh on next turn');
  assert.equal(movement.children[3].children[1].style.width,'100%');
  context.selectedToken=enemy;
  paint();
  assert.equal(bar.classes['is-hidden'],true,'never reveal enemy when not selected/owned');
  assert.equal(resources.children.length,0);
  context.selectedToken=friendly;
  game.combat={...combat,started:false};
  paint();
  assert.equal(bar.classes['is-hidden'],true,'outside combat, strip disappears');
});

test('v106: no combat icon overlay on map; classic strip hidden when collapsed and in persistent mode',()=>{
  const compact = read('../scripts/combat/compact-combat-display.mjs');
  assert.doesNotMatch(compact,/renderTokenUnderlays\s*\(/);
  assert.match(hudCSS,/#mmrpg-native-action-hud\.is-persistent \.mmrpg-native-action-hud__classic-turn-strip/);
  assert.match(hudCSS,/#mmrpg-native-action-hud\.is-collapsed \.mmrpg-native-action-hud__classic-turn-strip\s*\{\s*display:\s*none;/s);
  assert.equal(hudResourceState({actor:opponent,token:enemy,combat,tracker,isGM:false}),null);
});
