import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findCombatById } from '../scripts/combat/combat-lookup.mjs';
import { validateTurnConsumption, consumeTurnResources } from '../scripts/combat/turn-tracker-core.mjs';
// Concentration binds Foundry hooks at module evaluation time.
globalThis.Hooks ??= { once(){}, on(){} };

const current = { id: 'c-new' };
const old = { id: 'c-old' };
test('stale encounter IDs cannot fall back to the active combat', () => {
  const combats = new Map([[old.id, old],[current.id,current]]);
  assert.equal(findCombatById(combats,current,old.id),old);
  assert.equal(findCombatById(combats,current,'c-unknown'),null);
  assert.equal(findCombatById(new Map(),current,'c-old'),null);
  assert.equal(findCombatById(null,current,current.id),current);
  assert.equal(findCombatById(null,current,null),current);
  assert.equal(findCombatById(null,current,''),current);
  assert.equal(findCombatById(null,null,'c-new'),null);
});

test('Action/Reactions are only consumed while available, including Combat Reflexes', () => {
  const normal={actionUsed:0,actionMax:1,reactionUsed:0,reactionMax:1,movementUsed:0,movementMax:6};
  const once=consumeTurnResources(normal,['reaction'],6);
  assert.equal(validateTurnConsumption(normal,['reaction'],6),true);
  assert.equal(validateTurnConsumption(once,['reaction'],6),false);
  const reflexes={...normal,reactionMax:2,reactionUsed:1};
  assert.equal(validateTurnConsumption(reflexes,['reaction'],6),true);
  const twice=consumeTurnResources(reflexes,['reaction'],6);
  assert.equal(twice.reactionUsed,2);
  assert.equal(validateTurnConsumption(twice,['reaction'],6),false);
  assert.equal(validateTurnConsumption({...normal,actionUsed:1},['action'],6),false);
});

test('malformed, repeated and empty socket resource requests are rejected', () => {
  const state={actionUsed:0,actionMax:1,reactionUsed:0,reactionMax:2,movementMax:6};
  for (const resources of [[],null,undefined,'reaction',['reaction','reaction'],['reaction','hacked'],['action','action'],['action','reaction','movement','reaction']]) {
    assert.equal(validateTurnConsumption(state,resources,6),false,JSON.stringify(resources));
  }
  assert.equal(validateTurnConsumption(state,['action','reaction'],6),true);
  assert.equal(validateTurnConsumption(state,['movement'],6),true);
  assert.equal(validateTurnConsumption(state,['movement','reaction'],6),true);
});

test('GM tracker checks socket resources atomically after serializing each combatant',()=>{
  const code=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  assert.match(code,/validateTurnConsumption\(current, resources, movementMax\)/);
  assert.match(code,/findCombatById\(game\.combats, game\.combat, combatId\)/);
  assert.match(code,/pendingSpendWrites\.set\(key,job\)/);
});

test('Concentration effects only contain typed changes on Foundry v14',async()=>{
  const {concentrationPowerEffectData} = await import('../scripts/concentration.js');
  const actorItem={id:'p1',uuid:'Actor.x.Item.p1',name:'Shield 2',img:'shield.svg',
    system:{powerSet:'Shield Bearer',description:'escudo'},
    effects:[{system:{changes:[{key:'system.healthDamageReduction',value:2,type:'upgrade'}]}}]};
  const data=concentrationPowerEffectData(actorItem,true);
  assert.equal(data.type,'base');
  assert.deepEqual(data.changes,[],'clears old numeric records');
  assert.deepEqual(data.system.changes,[{key:'system.healthDamageReduction',type:'upgrade',value:2,phase:'initial',priority:null}]);
  assert.ok(data.system.changes.every(change=>!Object.hasOwn(change,'mode')));
  assert.equal(data.flags['multiverse-d616'].concentrationPower.countsTowardLevel,true);
});

test('non-modifier Concentration maintains its status and no legacy changes',async()=>{
  const {concentrationPowerEffectData} = await import('../scripts/concentration.js');
  const data=concentrationPowerEffectData({name:'Elemental Protection',id:'p2',system:{powerSet:'Elemental Control'}},false);
  assert.equal(data.type,'base');
  assert.deepEqual(data.changes,[]);
  assert.deepEqual(data.system.changes,[]);
  assert.equal(data.showIcon,2);
  assert.equal(data.flags['multiverse-d616'].concentrationPower.countsTowardLevel,false);
});
