import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFocusCost, focusMaintenanceDuration, validateFocusSpend } from '../scripts/focus-cost.mjs';

const catalog = JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url))).items;
const ongoing = catalog.filter(i => parseFocusCost(i.system?.cost).perTurn);

test('cobertura exata dos custos recorrentes do compêndio auxiliar', () => {
  const expected = ['Jinx You All', 'Lucky Us', 'Lucky Me', 'Time-Out Bubble', 'Wish You Luck', 'Time-Out', 'Lucky You', 'Jinx You', 'Venom Sword', 'Time-Out Tag', 'Evil Eye'];
  assert.deepEqual(new Set(ongoing.map(i => i.name)), new Set(expected));
  for (const item of ongoing) {
    const parsed = parseFocusCost(item.system.cost);
    assert.ok(parsed.hasFocus && parsed.min > 0 && parsed.perTurn, `${item.name}: ${item.system.cost}`);
  }
});
test('parser reconhece português/inglês, custos variáveis e ignora textos sem Focus', () => {
  for (const source of ['5 Focus', '5 Foco', '5 focus', '5 foco']) {
    assert.equal(parseFocusCost(source).min, 5);
    assert.equal(parseFocusCost(source).type, 'fixed');
  }
  for (const source of ['10 ou mais Focus', '5 or more Focus', '5 Foco ou mais']) {
    assert.equal(parseFocusCost(source).type, 'variable', source);
  }
  for (const source of ['3 Focus por turno', '10 Focus per turn', '5 Focus per round', '15 Focus por round.', '15 Focus por rodada']) {
    assert.equal(parseFocusCost(source).perTurn, true, source);
  }
  for (const source of ['', 'Varies', 'Mesmo que o poder X', '1 rodada por nível']) {
    assert.equal(parseFocusCost(source).hasFocus, false, source);
  }
});
test('rejeita Focus insuficiente e limite por uso 5 vezes o Rank', () => {
  const actor = { system: { focus: { value: 9 }, attributes: { rank: { value: 3 } } } };
  assert.equal(validateFocusSpend(actor, 5).ok, true);
  assert.equal(validateFocusSpend(actor, 10).ok, false);
  actor.system.focus.value = 50;
  assert.equal(validateFocusSpend(actor, 16).ok, false);
  assert.equal(validateFocusSpend(actor, 15).ok, true);
});
test('duração por Rank em Time-Out e não em poderes indefinidos', () => {
  const actor = { system: { attributes: { rank: { value: 3 } } } };
  for (const name of ['Time-Out', 'Time-Out Bubble', 'Time-Out Tag']) {
    assert.equal(focusMaintenanceDuration(catalog.find(i => i.name === name), actor), 3, name);
  }
  assert.equal(focusMaintenanceDuration(catalog.find(i => i.name === 'Lucky Me'), actor), null);
});

const rendered = [];
globalThis.ChatMessage = {
  create: async m => { rendered.push(m); return m; },
  getSpeaker: ({actor}) => ({alias:actor.name}),
};
globalThis.ui = { notifications: { error(){}, warn(){} } };
globalThis.Hooks = { handlers: {}, on(name, cb) { (this.handlers[name] ||= []).push(cb); }, once(name, cb) { (this.handlers[name] ||= []).push(cb); } };
globalThis.game = { user: { id: 'gm', isGM: true }, users: { activeGM: {id:'gm'} }, combat: null };
globalThis.fromUuid = async () => null;
const { beginFocusMaintenance, maintenanceEffects, processFocusMaintenanceTurn, endFocusMaintenance, registerFocusMaintenanceHooks } = await import('../scripts/focus-maintenance.mjs');

function makeActor({ focus = 20, rank = 3, concentration = true, token = false } = {}) {
  const item = { id: 'lucky1', uuid:'Actor.a.Item.lucky1', name: 'Lucky Me', type:'power', img:'x.svg',
    system:{cost:'3 Focus por turno', duration: concentration ? 'Concentration' : 'Instant'} };
  const actor = {
    id:'a', name:'Herói', uuid:token?'Scene.x.Token.t.Actor.a':'Actor.a', isToken:token, isOwner:true,
    system:{focus:{value:focus},attributes:{rank:{value:rank}}},
    effects: [], items:{get(id){return id === item.id ? item : null}},
    async update(data){this.system.focus.value = data['system.focus.value'];},
    async createEmbeddedDocuments(_type, arr){return arr.map(v=>{
      const effect = {...v, id:`eff-${this.effects.length}`, flags: v.flags, parent:this,
        async update(data){for(const [key,val] of Object.entries(data)){
          if(key.startsWith('flags.multiverse-d616.focusMaintenance.')) this.flags['multiverse-d616'].focusMaintenance[key.split('.').at(-1)] = val;
          if(key === 'flags.multiverse-d616.focusMaintenance')this.flags['multiverse-d616'].focusMaintenance = val;
        }} };
      this.effects.push(effect); return effect;
    });},
    async deleteEmbeddedDocuments(_, ids){this.effects = this.effects.filter(e=>!ids.includes(e.id));},
  };
  if (concentration) {
    actor.effects.push({ id:'conc', disabled:false, name:'Lucky Me', parent:actor,
      flags:{'multiverse-d616':{concentrationPower:{transient:true,itemId:item.id}}},
      async update(data){ if(data['flags.multiverse-d616.focusMaintenance']) this.flags['multiverse-d616'].focusMaintenance=data['flags.multiverse-d616.focusMaintenance'];
        else if ('flags.multiverse-d616.focusMaintenance.lastPaidKey' in data){const f=this.flags['multiverse-d616'].focusMaintenance;f.lastPaidKey=data['flags.multiverse-d616.focusMaintenance.lastPaidKey']; f.turnsElapsed=data['flags.multiverse-d616.focusMaintenance.turnsElapsed'];}
      },
    });
  }
  return {actor,item};
}
function activeCombat(actor, round=1, turn=0) {
  return {id:'combat', started:true, active:true,round,turn, combatant:{id:'comb1',actor}};
}

test('manutenção na concentração usa efeito existente e não cobra no turno da ativação', async () => {
  const {actor,item}=makeActor(); game.combat=activeCombat(actor);
  await beginFocusMaintenance(actor,item);
  assert.equal(actor.effects.length,1);
  assert.equal(maintenanceEffects(actor).length,1);
  await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,20);
  game.combat=activeCombat(actor,2);
  await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,17);
  await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,17,'no double charge');
});
test('manutenção é encerrada automaticamente quando Focus está insuficiente', async () => {
  const {actor,item}=makeActor({focus:2}); game.combat=activeCombat(actor);
  await beginFocusMaintenance(actor,item);
  game.combat=activeCombat(actor,2);
  await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,2);
  assert.equal(maintenanceEffects(actor).length,0);
});
test('efeito não-concentração é independente e removível, inclusive por token sintético', async () => {
  const {actor,item}=makeActor({concentration:false,token:true});
  game.combat=activeCombat(actor);
  await beginFocusMaintenance(actor,item);
  assert.equal(maintenanceEffects(actor).length,1);
  game.combat=activeCombat(actor,2);
  await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,17);
  assert.equal(await endFocusMaintenance(actor, actor.effects[0].id),true);
  assert.equal(actor.effects.length,0);
});
test('recorrência expira pelo Rank e não cobra após duração', async () => {
  const {actor,item}=makeActor({concentration:false,rank:3});
  item.name='Time-Out';item.system.cost='15 Focus por round';item.system.duration='1 round por rank.';
  actor.system.focus.value=60;
  game.combat=activeCombat(actor);
  await beginFocusMaintenance(actor,item);
  game.combat=activeCombat(actor,2);await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,45);
  game.combat=activeCombat(actor,3);await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,30);
  game.combat=activeCombat(actor,4);await processFocusMaintenanceTurn(game.combat);
  assert.equal(actor.system.focus.value,30);
  assert.equal(actor.effects.length,0);
});
test('register hooks handles combat & chat', () => {
  registerFocusMaintenanceHooks();
  assert.ok(Hooks.handlers.updateCombat?.length);
  assert.ok(Hooks.handlers.renderChatMessageHTML?.length);
});
