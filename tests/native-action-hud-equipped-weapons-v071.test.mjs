import assert from 'node:assert/strict';
import test from 'node:test';

const handlers = new Map();
globalThis.Hooks = {
  on(name, callback) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(callback); },
  once(name, callback) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(callback); },
};
globalThis.window = { addEventListener() {} };
globalThis.game = {
  user: { id: 'gm', isGM: true },
  combat: null,
  i18n: { lang: 'pt-BR', localize(key) { return ({
    'MULTIVERSE_D616.ActionHud.EquippedWeapons': 'ARMAS EQUIPADAS',
    'MULTIVERSE_D616.ActionHud.NoPowers': 'Nenhum poder acionável ou arma equipada.',
  })[key] ?? key; } },
};
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } };
globalThis.ui = { notifications: { warn() {}, error(e) { throw new Error(e); } } };

actionFixtures();
function actionFixtures() {
  globalThis.document = {
    createElement(tag) { return {
      tag, dataset: {}, className: '', textContent: '', children: [],
      append(...items) { this.children.push(...items); },
      appendChild(item) { this.children.push(item); },
      removeAttribute() {},
      classList: { add() {}, remove() {} },
    }; },
  };
}

const { NativeActionHud, isEquippedWeaponForHud } = await import('../scripts/native-action-hud.mjs');

const item = (name, type, equipped, id = name) => ({
  id, name, type, img: '', system: { equipped, duration: 'Instant' },
  calls: 0, async roll() { this.calls += 1; return this.name; },
});
function fixture(items) {
  const collection = [...items];
  collection.get = id => collection.find(x => x.id === id) ?? null;
  return {
    id: 'zima', uuid: 'Actor.zima', name: 'Zima', system: { abilities: {} },
    items: collection, testUserPermission() { return true; },
  };
}
function render(actor) {
  const hud = new NativeActionHud();
  const body = { children: [], classList: { add() {}, remove() {} }, appendChild(x) { this.children.push(x); } };
  hud.renderPowers(body, actor);
  return { hud, body, buttons: body.children.filter(x => x?.dataset?.action) };
}
function clickEvent(button) {
  return { target: { closest(selector) {
    if (selector === "[data-action='collapse']" || selector === '[data-tab]') return null;
    return selector.includes(`[data-action='${button.dataset.action}']`) ? button : null;
  } } };
}

test('v0.2.72: only weapon Items explicitly marked equipped appear', () => {
  for (const [type, flag, expected] of [
    ['weapon', true, true], ['weapon', false, false], ['weapon', undefined, false],
    ['item', true, false], ['power', true, false], ['weapon', 'true', false],
  ]) assert.equal(isEquippedWeaponForHud({ type, system: { equipped: flag } }), expected);
});

test('v0.2.72: POWERS includes equipped weapons under a separate heading, alphabetically', () => {
  const actor = fixture([
    item('Zeta Sword', 'weapon', true),
    { ...item('Sturdy 3', 'power', false), system: { duration: 'Permanent' } },
    item('Unused Gun', 'weapon', false),
    item('Blizzard', 'power', false),
    item('Alpha Hammer', 'weapon', true),
  ]);
  const { body, buttons } = render(actor);
  assert.deepEqual(buttons.map(x => [x.dataset.action, x.children.find(c => c.className === 'name')?.textContent]), [
    ['power', 'Blizzard'],
    ['weapon', 'Alpha Hammer'],
    ['weapon', 'Zeta Sword'],
  ]);
  const heading = body.children.find(x => x.className === 'mmrpg-native-action-hud__group-title');
  assert.equal(heading?.textContent, 'ARMAS EQUIPADAS');
  assert.equal(buttons[1].dataset.mmhtType, 'Weapon');
  assert.match(buttons[1].children[0].src, /icons\/weapons.svg$/);
});

test('v0.2.72: weapon alone appears, no misleading empty POWERS message', () => {
  const { body, buttons } = render(fixture([item('Espada Vingadora', 'weapon', true)]));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, 'weapon');
  assert.equal(body.children.some(c => c.className?.includes('empty')), false);
});

test('v0.2.72: no equipped weapons -> no heading and existing powers remain', () => {
  const { body, buttons } = render(fixture([item('Blizzard', 'power', false), item('Gun', 'weapon', false)]));
  assert.equal(body.children.some(x => x.className === 'mmrpg-native-action-hud__group-title'), false);
  assert.deepEqual(buttons.map(b => b.dataset.action), ['power']);
});

test('v0.2.72: signature changes on equip/unequip, and on weapon name and icon', () => {
  const weapon = item('Sword', 'weapon', false);
  const actor = fixture([weapon]);
  const { hud } = render(actor);
  const previous = hud.signature(actor, 'powers', false);
  weapon.system.equipped = true;
  const afterEquip = hud.signature(actor, 'powers', false);
  assert.notEqual(previous, afterEquip);
  weapon.name = 'Renamed Sword';
  const afterRename = hud.signature(actor, 'powers', false);
  assert.notEqual(afterEquip, afterRename);
  weapon.img = 'icons/sword.svg';
  assert.notEqual(afterRename, hud.signature(actor, 'powers', false));
  weapon.system.equipped = false;
  assert.equal(render(actor).buttons.filter(x => x.dataset.action === 'weapon').length, 0);
});

test('v0.2.72: clicking equipped weapon calls Item.roll() exactly once (no duplicate attack)', async () => {
  const weapon = item('Espada Vingadora', 'weapon', true);
  const actor = fixture([weapon]);
  const { hud, buttons } = render(actor);
  Object.defineProperty(hud, 'selectedActor', { value: actor });
  const button = buttons.find(x => x.dataset.action === 'weapon');
  await hud.onClick(clickEvent(button));
  assert.equal(weapon.calls, 1);
  assert.equal(button.disabled, false);
});

test('v0.2.72: stale shortcut cannot roll a newly unequipped or removed weapon', async () => {
  const weapon = item('Hammer', 'weapon', true);
  const actor = fixture([weapon]);
  const { hud, buttons } = render(actor);
  Object.defineProperty(hud, 'selectedActor', { value: actor });
  const button = buttons.find(x => x.dataset.action === 'weapon');
  weapon.system.equipped = false;
  await hud.onClick(clickEvent(button));
  assert.equal(weapon.calls, 0);
  actor.items.splice(0, 1);
  await hud.onClick(clickEvent(button));
  assert.equal(weapon.calls, 0);
});

test('v0.2.72: user without permission sees disabled weapon actions', () => {
  const actor = fixture([item('Hammer', 'weapon', true)]);
  actor.testUserPermission = () => false;
  game.user.isGM = false;
  try {
    const { buttons } = render(actor);
    assert.equal(buttons[0].disabled, true);
  } finally { game.user.isGM = true; }
});


function bindAttached(actor,carrier,powerName='Elemental Blast') {
  carrier.actor=actor;
  carrier.flags={'multiverse-d616':{attachedPowers:[{
    id:'p1',name:powerName,img:'',sourceUuid:'Item.demo',
    data:{name:powerName,img:'',type:'power',system:{duration:'Instant'},effects:[]},
  }]}};
  return carrier;
}

test('v0.2.72: equipped weapon gains own attached Power shortcut after weapon attack',()=>{
 const weapon=item('Espada', 'weapon',true);
 const actor=fixture([weapon]);bindAttached(actor,weapon);
 const {buttons}=render(actor);
 assert.deepEqual(buttons.map(b=>b.dataset.action),['weapon','attached-power']);
 assert.equal(buttons[1].dataset.powerId,'p1');
 assert.equal(buttons[1].dataset.itemId,'Espada');
 assert.equal(buttons[1].children[1].children[0].textContent, 'Elemental Blast');
 assert.equal(buttons[1].children[1].children[1].textContent, '(Espada)');
 assert.equal(buttons[1].disabled,false);
});

test('v0.2.72: hidden unequipped weapon also hides its attached Powers',()=>{
 const weapon=item('Espada','weapon',false);
 const actor=fixture([weapon]);bindAttached(actor,weapon);
 assert.equal(render(actor).buttons.length,0);
 weapon.system.equipped=true;
 assert.deepEqual(render(actor).buttons.map(b=>b.dataset.action),['weapon','attached-power']);
});

test('v0.2.72: item with attached Powers works in POWERS HUD without equipped property',()=>{
 const inventory=item('Anel Mágico','item',undefined);
 const actor=fixture([inventory]);bindAttached(actor,inventory,'Teleport');
 const {body,buttons}=render(actor);
 assert.deepEqual(buttons.map(b=>b.dataset.action),['attached-power']);
 assert.equal(buttons[0].disabled,false);
 assert.equal(body.children.find(c=>c.className==='mmrpg-native-action-hud__group-title')?.textContent,'PODERES DOS ITENS');
});

test('v0.2.72: attached power HUD signature changes when modifying power lists',()=>{
 const weapon=item('Sword','weapon',true);
 const actor=fixture([weapon]);bindAttached(actor,weapon);
 const {hud}=render(actor);
 const before=hud.signature(actor,'powers',false);
 weapon.flags['multiverse-d616'].attachedPowers[0].name='Alterado';
 assert.notEqual(hud.signature(actor,'powers',false),before);
});

test('v0.2.72: clicking attached power uses a temporary Power Item (no addition to actor)',async()=>{
 const weapon=item('Sword','weapon',true);
 const actor=fixture([weapon]);bindAttached(actor,weapon);
 const {hud,buttons}=render(actor);
 Object.defineProperty(hud,'selectedActor',{value:actor});
 const pressed=buttons.find(b=>b.dataset.action==='attached-power');
 const used=[];
 globalThis.CONFIG={Item:{documentClass:class{
  constructor(data,{parent}){this.data=data;this.parent=parent;}
  async roll(){used.push([this.data.name,this.parent]);}
 }}};
 globalThis.foundry={utils:{deepClone:v=>structuredClone(v)}};
 await hud.onClick(clickEvent(pressed));
 assert.equal(used.length,1);
 assert.deepEqual(used[0],['Elemental Blast',actor]);
 assert.equal(actor.items.length,1);
});

test('v0.2.72: stale attached power shortcut does not trigger when source weapon unequipped',async()=>{
 const weapon=item('Sword','weapon',true);
 const actor=fixture([weapon]);bindAttached(actor,weapon);
 const {hud,buttons}=render(actor);
 Object.defineProperty(hud,'selectedActor',{value:actor});
 const pressed=buttons.find(b=>b.dataset.action==='attached-power');
 weapon.system.equipped=false;
 await hud.onClick(clickEvent(pressed));
 assert.equal(pressed.disabled,true);
});

test('v0.2.76: attached passive Permanent powers use the same HUD filter as Actor powers',()=>{
  const weapon=item('Espada da Vingança','weapon',true);
  const actor=fixture([weapon]);bindAttached(actor,weapon,'Mighty 1');
  const entries=weapon.flags['multiverse-d616'].attachedPowers;
  entries[0].data.system.duration='Permanent';
  for (const [id,name,duration] of [
    ['sturdy','Sturdy 4','Permanent'],
    ['uncanny','Uncanny 2',{value:'Permanent'}],
    ['flight','Flight 2','Permanente'],
    ['burst','Elemental Burst','Instant'],
    ['protect','Elemental Protection 1','Concentration'],
    ['resize','Resize Object','Permanent'],
    ['grow','Grow 2','Permanent'],
  ]) entries.push({id,name,img:'',data:{type:'power',name,img:'',system:{duration},effects:[]}});
  const {buttons}=render(actor);
  assert.deepEqual(buttons.map(b=>b.dataset.action),[
    'weapon','attached-power','attached-power','attached-power','attached-power',
  ]);
  assert.deepEqual(buttons.filter(b=>b.dataset.action==='attached-power')
    .map(b=>[b.children[1].children[0].textContent,b.children[1].children[1].textContent]),[
      ['Elemental Burst','(Espada da Vingança)'],
      ['Elemental Protection 1','(Espada da Vingança)'],
      ['Resize Object','(Espada da Vingança)'],
      ['Grow 2','(Espada da Vingança)'],
    ]);
  // Passive copies remain on the weapon and continue to be handled by the
  // equipment-permanent-effects pipeline; only their HUD actions are hidden.
  assert.equal(entries.length,8);
});

test('v0.2.76: item with only Permanent passives shows no empty powers group',()=>{
  const trinket=item('Cinto','item');
  const actor=fixture([trinket]);bindAttached(actor,trinket,'Uncanny 2');
  trinket.flags['multiverse-d616'].attachedPowers[0].data.system.duration='Permanent';
  const {body,buttons}=render(actor);
  assert.equal(buttons.length,0);
  assert.equal(body.children.some(c=>c.className==='mmrpg-native-action-hud__group-title'),false);
  trinket.flags['multiverse-d616'].attachedPowers.push({
    id:'resize',name:'Resize Other',img:'',data:{type:'power',name:'Resize Other',system:{duration:'Permanent'},effects:[]},
  });
  const visible=render(actor);
  assert.deepEqual(visible.buttons.map(b=>b.dataset.action),['attached-power']);
  assert.deepEqual(visible.buttons[0].children[1].children.map(x=>x.textContent),['Resize Other','(Cinto)']);
  assert.equal(visible.body.children.find(c=>c.className==='mmrpg-native-action-hud__group-title')?.textContent,'PODERES DOS ITENS');
});

test('v0.2.76: HUD signature tracks duration edits in power copies',()=>{
  const weapon=item('Espada','weapon',true);const actor=fixture([weapon]);bindAttached(actor,weapon,'Mighty 1');
  const {hud}=render(actor);const initial=hud.signature(actor,'powers',false);
  weapon.flags['multiverse-d616'].attachedPowers[0].data.system.duration='Permanent';
  const after=hud.signature(actor,'powers',false);
  assert.notEqual(initial,after);
  assert.deepEqual(render(actor).buttons.map(b=>b.dataset.action),['weapon']);
  weapon.flags['multiverse-d616'].attachedPowers[0].data.name='Resize Object';
  assert.notEqual(after,hud.signature(actor,'powers',false));
  assert.deepEqual(render(actor).buttons.map(b=>b.dataset.action),['weapon','attached-power']);
});

test('v0.2.76: stale shortcuts do not activate equipment powers changed to passive',async()=>{
  const weapon=item('Espada','weapon',true);const actor=fixture([weapon]);bindAttached(actor,weapon,'Mighty 1');
  const {hud,buttons}=render(actor);
  Object.defineProperty(hud,'selectedActor',{value:actor});
  const pressed=buttons.find(b=>b.dataset.action==='attached-power');
  // A button left open during an update may still exist in the old DOM.
  weapon.flags['multiverse-d616'].attachedPowers[0].data.system.duration='Permanent';
  globalThis.CONFIG={Item:{documentClass:class{async roll(){throw new Error('Inactive passive rolled');}}}};
  await hud.onClick(clickEvent(pressed));
  assert.equal(pressed.disabled,true);
  assert.deepEqual(render(actor).buttons.map(b=>b.dataset.action),['weapon']);
});
