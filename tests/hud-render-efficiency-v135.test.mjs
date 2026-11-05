import test from 'node:test';
import assert from 'node:assert/strict';

// Lightweight DOM with counters: these tests ensure unmodified state does not
// destroy HUD elements, while genuine actor/turn changes still repaint.
class Node {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.dataset = {}; this.style = {};
    this.title = ''; this.textContent = ''; this.className = ''; this.attributes = {};
    this.disabled = false; this.replaceCount = 0;
    this.classList = {toggle() {}, add() {}, remove() {}};
  }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.replaceCount++; this.children = [...nodes]; }
  setAttribute(key, value) { this.attributes[key] = value; }
  querySelector() { return null; }
}
globalThis.document = {createElement: tag => new Node(tag)};
globalThis.Hooks = {on() {}, once() {}};
globalThis.window = {addEventListener() {}, innerWidth: 1600, innerHeight: 900};
globalThis.canvas = {tokens: {controlled: []}};
globalThis.CONFIG = {statusEffects: [{id:'mmrpg.confused', name:'Confuso', img:'confused.webp'}]};
globalThis.game = {
  user: {isGM: true, id:'gm'}, combat: null,
  settings: {get() { return false; }, register() {}},
  i18n: {localize: key => key},
};
const {NativeActionHud} = await import('../scripts/native-action-hud.mjs');
const abilities = {
  mle: {value:0, noncom:2}, agl: {value:6, noncom:9},
  res: {value:3, noncom:3}, vig: {value:2, noncom:2},
  ego: {value:0, noncom:0}, log: {value:1, noncom:4},
};
const actor = {id:'dark', uuid:'Actor.dark', name:'Darkstep', img:'dark.webp',
  system: {attributes:{rank:{value:3}}, abilities, health:{value:90,max:90},
    focus:{value:60,max:60},karma:{value:2}}, statuses:new Set(), effects:[],
  testUserPermission() { return true; }};

test('v135 condition/concentration/movement icons reuse DOM until displayed state changes', () => {
  const panel = new Node('div');
  const root = {querySelectorAll: () => [panel]};
  const hud = new NativeActionHud();
  hud.updateHud3Status(root, actor);
  assert.equal(panel.replaceCount, 1);
  const initial = panel.children[0];
  hud.updateHud3Status(root, actor);
  assert.equal(panel.replaceCount, 1, 'unchanged state must keep the same nodes');
  assert.equal(panel.children[0], initial);
  actor.statuses.add('mmrpg.confused');
  hud.updateHud3Status(root, actor);
  assert.equal(panel.replaceCount, 2, 'new condition must repaint');
  assert.ok(panel.children.some(child => child.className === 'mmrpg-native-action-hud__status-conditions'));
  hud.updateHud3Status(root, actor);
  assert.equal(panel.replaceCount, 2);
  actor.statuses.clear();
});

test('v135 six persistent ability buttons survive ordinary HUD refresh but update for combat', () => {
  const hud = new NativeActionHud();
  hud.updatePortraitTurnResources = () => {};
  const quick = new Node('div');
  const labels = {'.mmrpg-native-action-hud__portrait img':new Node('img'),
    '.mmrpg-native-action-hud__profile-name':new Node('span'),
    '.mmrpg-native-action-hud__profile-rank':new Node('span'),
    '.mmrpg-native-action-hud__profile-karma':new Node('span'),
    '.mmrpg-native-action-hud__quick-abilities':quick};
  const makeResource = () => ({querySelector: key => key === 'b' ? new Node('b') : new Node('div')});
  labels['.mmrpg-native-action-hud__resource.health'] = makeResource();
  labels['.mmrpg-native-action-hud__resource.focus'] = makeResource();
  const profile = {querySelector: key => labels[key]};
  const root = {querySelector: key => key === '.mmrpg-native-action-hud__profile' ? profile : null};
  hud.updatePersistentProfile(root, actor);
  assert.equal(quick.children.length, 6);
  const chips = [...quick.children];
  assert.equal(chips[1].children[1].textContent, '+9');
  hud.updatePersistentProfile(root, actor);
  assert.deepEqual(quick.children, chips, 'unchanged buttons should keep identity');
  assert.equal(quick.replaceCount, 1);
  game.combat = {started:true,round:1};
  hud.updatePersistentProfile(root, actor);
  assert.equal(quick.replaceCount, 1, 'combat must update text in place');
  assert.deepEqual(quick.children, chips);
  assert.equal(chips[1].children[1].textContent, '+6');
  assert.match(chips[1].title, /Combate: \+6/);
  game.combat = null;
  hud.updatePersistentProfile(root, actor);
  assert.equal(chips[1].children[1].textContent, '+9');
});

test('v135 action/reaction/movement icons only repaint if resources change', () => {
  const hud = new NativeActionHud();
  const turnActor = {id:'hero',uuid:'Actor.hero'};
  const token = {id:'tok', actor:turnActor, isOwner:true,
    document:{id:'tok', isOwner:true, movementAction:'walk', parent:{id:'scene'}}};
  const combatant = {id:'cb',tokenId:'tok',sceneId:'scene',getFlag(){return null;}};
  const state={actionMax:2, actionUsed:0,reactionMax:1,reactionUsed:0,movementMax:8,movementUsed:2};
  game.combat={started:true,scene:{id:'scene'},combatants:new Map([['cb',combatant]])};
  game.multiverseD616={turnTracker:{getState(){return state;}}};
  canvas.tokens.controlled=[token];
  const wrapper=new Node('div'),res=new Node('div'),movement=new Node('div');
  wrapper.querySelector=key => key.includes('turn-resources') ? res : movement;
  const profile = {querySelector: () => wrapper};
  hud.updatePortraitTurnResources(profile,turnActor);
  assert.equal(res.replaceCount,1);assert.equal(movement.replaceCount,1);
  hud.updatePortraitTurnResources(profile,turnActor);
  assert.equal(res.replaceCount,1);assert.equal(movement.replaceCount,1);
  state.actionUsed=1;
  hud.updatePortraitTurnResources(profile,turnActor);
  assert.equal(res.replaceCount,2);assert.equal(movement.replaceCount,2);
  canvas.tokens.controlled=[];
  hud.updatePortraitTurnResources(profile,turnActor);
  assert.equal(res.children.length,0);
  assert.equal(movement.children.length,0);
  assert.equal(res.replaceCount,3);
  hud.updatePortraitTurnResources(profile,turnActor);
  assert.equal(res.replaceCount,3);
  game.combat=null;
});
