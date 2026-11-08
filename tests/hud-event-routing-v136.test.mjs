import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Foundry hook fixture: inspect the actual callbacks installed by the HUD.
const listeners = new Map();
globalThis.Hooks = {
  on(name, fn) { const list = listeners.get(name) ?? []; list.push(fn); listeners.set(name, list); },
  once() {},
};
globalThis.window = { addEventListener() {}, innerWidth: 1600, innerHeight: 900 };
const actor = {id:'actor-1', uuid:'Actor.actor-1', name:'Character'};
const other = {id:'actor-2', uuid:'Actor.actor-2', name:'Other'};
globalThis.canvas = {tokens: {controlled: [{actor, document:{id:'token-1',uuid:'Scene.demo.Token.token-1'}}]}};
globalThis.game = {
  user:{id:'gm',isGM:true}, combat:null,
  settings:{get() { return false; }, register() {}},
  i18n:{localize:key=>key},
};
const {NativeActionHud} = await import('../scripts/native-action-hud.mjs');

function freshHud({stubSchedule = true} = {}) {
  listeners.clear(); // Remove the singleton's fixture callbacks; test one HUD.
  const hud = new NativeActionHud();
  const calls = [];
  if (stubSchedule) hud.scheduleRender = force => calls.push(force);
  const fire = (hook, ...args) => {
    for (const fn of listeners.get(hook) ?? []) fn(...args);
  };
  return {hud,calls,fire};
}

test('v136 one ActiveEffect listener/event: local actor still forces shortcut refresh', () => {
  const {calls,fire} = freshHud();
  for (const hook of ['createActiveEffect','updateActiveEffect','deleteActiveEffect']) {
    assert.equal(listeners.get(hook)?.length, 1, hook+' must be registered once');
    fire(hook, {parent:actor});
  }
  assert.deepEqual(calls, [true,true,true]);
});

test('v136 Item-embedded selected effect forces; unrelated target effects use cheap refresh', () => {
  const {calls,fire} = freshHud();
  fire('updateActiveEffect', {parent:{actor}});
  fire('updateActiveEffect', {parent:other});
  assert.deepEqual(calls, [true,false]);
});

test('v136 chat and combat updates do not forcibly rebuild shortcut grid', () => {
  const {calls,fire} = freshHud();
  for (const hook of ['updateChatMessage','updateCombat','updateCombatant',
    'createCombatant','deleteCombatant','combatStart','createCombat','deleteCombat']) {
    fire(hook, {});
  }
  assert.deepEqual(calls, Array(8).fill(false));
});

test('v136 actor/item updates still force shortcuts; unrelated actors do not', () => {
  const {calls,fire} = freshHud();
  fire('updateActor',other);
  fire('updateActor',actor);
  fire('updateItem',{parent:actor});
  fire('createItem',{parent:other});
  assert.deepEqual(calls,[true,true]);
});

test('v136 coalesces fast events in one frame and upgrades to forced render for selected effect', async () => {
  const original = globalThis.requestAnimationFrame;
  const callbacks = [];
  globalThis.requestAnimationFrame = fn => callbacks.push(fn);
  try {
    const {hud} = freshHud({stubSchedule:false});
    const rendered = [];
    hud.render = async opts => {rendered.push(opts.force);};
    for (let i=0;i<10;i++) {
      for (const fn of listeners.get('updateChatMessage') ?? []) fn({});
    }
    assert.equal(callbacks.length,1);
    callbacks.shift()();
    assert.deepEqual(rendered,[false]);
    for (const fn of listeners.get('updateChatMessage') ?? []) fn({});
    for (const fn of listeners.get('updateActiveEffect') ?? []) fn({parent:actor});
    assert.equal(callbacks.length,1);
    callbacks.shift()();
    assert.deepEqual(rendered,[false,true]);
  } finally { globalThis.requestAnimationFrame = original; }
});

test('v136 release has correct version', () => {
  const json = JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
  assert.equal(json.version, '0.2.153');
  assert.match(json.download,/v0\.2\.153\/multiverse-d616-v0\.2\.153\.zip$/);
});
