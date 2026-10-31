import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hudResourceState} from '../scripts/combat/hud-resource-state.mjs';

const src = (file) => readFileSync(new URL(file,import.meta.url),'utf8');
const hero={id:'hero',uuid:'Actor.hero',name:'Herói'};
const foe={id:'foe',uuid:'Actor.foe',name:'Inimigo'};
const token=(actor,id,owner=true,scene='scene1')=>({id,visible:true,isOwner:owner,actor,
  document:{id,parent:{id:scene},isOwner:owner,movementAction:'walk'}});
const friendly=token(hero,'tok1');
const enemy=token(foe,'tok2',false);
const combatant={id:'combatant1',tokenId:'tok1',sceneId:'scene1',getFlag(){return null;}};
const hostile={id:'combatant2',tokenId:'tok2',sceneId:'scene1',getFlag(){return null;}};
const combat={id:'cmb',started:true,scene:{id:'scene1'},combatants:new Map([['a',combatant],['b',hostile]])};
const state={actionMax:2,actionUsed:0,reactionMax:1,reactionUsed:0,movementMax:8,movementUsed:2};
const tracker={getState(c){return c===combatant ? state : {...state,actionMax:4,reactionMax:3};}};
const resolve=(options={})=>hudResourceState({actor:hero,token:friendly,combat,tracker,isGM:false,...options});

test('v104: resources reflect only own selected combatant and movement quarters',()=>{
  assert.deepEqual(resolve(),{actions:2,reactions:1,movement:[1,1,1,0],remaining:6,maximum:8,mode:'walk'});
  state.actionUsed=1;state.reactionUsed=1;state.movementUsed=3;
  assert.deepEqual(resolve().movement,[1,1,.5,0]);
  assert.equal(resolve().actions,1);
  assert.equal(resolve().reactions,0);
  state.actionUsed=0;state.reactionUsed=0;state.movementUsed=2;
});
test('v104: hover or unowned target cannot expose combat resources',()=>{
  assert.equal(resolve({actor:foe,token:enemy}),null);
  assert.equal(resolve({token:enemy}),null);
  assert.deepEqual(resolve(),{actions:2,reactions:1,movement:[1,1,1,0],remaining:6,maximum:8,mode:'walk'});
  assert.equal(resolve({actor:foe,token:enemy,isGM:true}).actions,4,'GM can select and inspect enemy in own HUD');
});
test('v104: combat must be active, same scene and contain selected token',()=>{
  assert.equal(resolve({token:token(hero,'unknown')}),null);
  assert.equal(resolve({token:token(hero,'tok1',true,'other')}),null);
  assert.equal(resolve({combat:{...combat,started:false}}),null);
  assert.equal(resolve({tracker:null}),null);
  assert.equal(resolve({token:null}),null);
});
test('v104: teleport resource is temporary and does not modify authoritative state',()=>{
  combatant.getFlag=()=>({kind:'teleport',maximum:30});
  assert.equal(resolve().maximum,30);
  assert.equal(resolve().remaining,30);
  assert.deepEqual(resolve().movement,[1,1,1,1]);
  assert.equal(resolve().mode,'Teleporte');
  assert.equal(state.movementMax,8);
  combatant.getFlag=()=>null;
});
test('v104: map keeps initiative but never draws combat resource icons on token',()=>{
  const compact=src('../scripts/combat/compact-combat-display.mjs');
  assert.match(compact,/strip\.innerHTML\s*=\s*stripMarkup/);
  assert.match(compact,/clearTokenUnderlays\(\)/);
  assert.doesNotMatch(compact,/renderTokenUnderlays\(/);
  assert.doesNotMatch(compact,/focusedCombatTokens\(/);
  assert.doesNotMatch(compact,/tokenMarkup\(/);
});
test('v104: portrait includes private resources, vector icons and refresh hooks',()=>{
  const hud=src('../scripts/native-action-hud.mjs');
  const css=src('../styles/native-action-hud.css');
  assert.match(hud,/mmrpg-native-action-hud__portrait-frame/);
  assert.match(hud,/this\.updatePortraitTurnResources\(profile,actor\)/);
  assert.match(hud,/token:this\.selectedToken/);
  assert.match(hud,/Hooks\.on\("updateCombatant"/);
  assert.match(hud,/hand-fist\.svg/);
  assert.match(hud,/shield-halved\.svg/);
  assert.match(hud,/chevron-right\.svg/);
  assert.match(css,/mmrpg-native-action-hud__combat-icons\.is-hidden/);
  assert.match(css,/pointer-events:\s*none/);
  assert.match(css,/mmrpg-native-action-hud__quick-ability\s*\{\s*background:\s*#07080b;/);
  assert.match(css,/\.ability-label\s*\{\s*font-size:\s*11px;/);
});

test('v104: UI paints portrait resources and clears them when selection disappears',async()=>{
  const hooks=[];
  globalThis.Hooks={on:(name,fn)=>hooks.push([name,fn]),once:(name,fn)=>hooks.push([name,fn])};
  globalThis.window={addEventListener(){},innerWidth:1280,innerHeight:800};
  class Element {
    constructor(){this.children=[];this.style={width:''};this.title='';this._classes={};this.classList={toggle:(k,on)=>this._classes[k]=on};}
    appendChild(child){this.children.push(child);return child;}
    append(...children){this.children.push(...children);}
    replaceChildren(){this.children=[];}
  }
  globalThis.document={createElement:()=>new Element(),body:{style:{removeProperty(){},setProperty(){}}}};
  globalThis.game={user:{isGM:false},combat, multiverseD616:{turnTracker:tracker}};
  const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
  const wrapper=new Element(),resources=new Element(),movement=new Element();
  wrapper.querySelector=selector=>selector.includes('turn-resources')?resources:movement;
  const profile={querySelector:()=>wrapper};
  const context={selectedToken:friendly};
  NativeActionHud.prototype.updatePortraitTurnResources.call(context,profile,hero);
  assert.equal(wrapper._classes['is-hidden'],false);
  assert.equal(resources.children.length,3);
  assert.equal(movement.children.length,4);
  assert.equal(movement.children[3].children[1].style.width,'0%');
  context.selectedToken=enemy;
  NativeActionHud.prototype.updatePortraitTurnResources.call(context,profile,hero);
  assert.equal(wrapper._classes['is-hidden'],true);
  assert.equal(resources.children.length,0);
  assert.equal(movement.children.length,0);
});
