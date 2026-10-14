import assert from 'node:assert/strict';
import test from 'node:test';

// Foundry's hooks register when the native HUD module is imported.
const hooks = [];
globalThis.Hooks = {
  on(name, handler) { hooks.push({name, handler}); },
  once(name, handler) { hooks.push({name, handler}); },
};
globalThis.window = { addEventListener() {} };
globalThis.game = {
  user: { isGM: true },
  i18n: { lang: 'pt-BR', localize: key => key },
};

const { isPermanentPower, isPowerAvailableForHud, NativeActionHud } =
  await import('../scripts/native-action-hud.mjs');

const power = (name, duration, type='power') => ({
  id: name.replace(/\W/g, ''), name, type, system: { duration }, img: 'icons/test.svg',
});

test('Grow 1–4 remain visible in native shortcuts despite Permanent duration', () => {
  for (let level = 1; level <= 4; level++) {
    for (const duration of ['Permanent', 'Permanente', { value: 'Permanent' }, ['Permanente']]) {
      const item = power(`Grow ${level}`, duration);
      assert.equal(isPermanentPower(item), true);
      assert.equal(isPowerAvailableForHud(item), true);
    }
  }
});

test('Shrink 1–4 remain visible while Shrinking Dodge remains normally actionable', () => {
  for (let level=1;level<=4;level++) {
    for (const duration of ['Permanent','Permanente',{value:'Permanent'},['Permanente']]) {
      const item=power(`Shrink ${level}`, duration);
      assert.equal(isPermanentPower(item),true);
      assert.equal(isPowerAvailableForHud(item),true);
    }
  }
  assert.equal(isPowerAvailableForHud(power('Shrinking Dodge','Permanent')),false);
  assert.equal(isPowerAvailableForHud(power('Shrink 5','Permanent')),false);
  assert.equal(isPowerAvailableForHud(power('Shrink 2','Permanent','weapon')),false);
});

test('every other Permanent power is still hidden; nonpermanent powers remain', () => {
  for (const name of ['Mighty 1', 'Sturdy 2', 'Flight 2', 'Growing Attack', 'Grow 5', 'Grow 10']) {
    assert.equal(isPowerAvailableForHud(power(name, 'Permanent')), false, name);
  }
  assert.equal(isPowerAvailableForHud(power('Blink', 'Instant')), true);
  assert.equal(isPowerAvailableForHud(power('Shield 1', 'Concentration')), true);
  assert.equal(isPowerAvailableForHud(power('Grow 1', 'Permanent', 'weapon')), false);
});

test('native Powers rendering includes Grow, excludes other Permanent powers', () => {
  const items = [power('Mighty 1','Permanent'), power('Grow 4','Permanent'), power('Shrink 3','Permanent'), power('Blink','Instant')];
  const actor = { items, system:{} };
  const makeElement = (tag) => ({
    tag, dataset:{}, className:'', style:{}, children:[],
    append(...items){this.children.push(...items);},
    appendChild(item){this.children.push(item);},
    removeAttribute(){},
  });
  globalThis.document = { createElement: makeElement };
  const body = {
    classList: {remove(){},add(){}},
    children: [],
    appendChild(item){this.children.push(item);},
  };
  const hud = new NativeActionHud();
  hud.renderPowers(body, actor);
  assert.deepEqual(body.children.map(node => node.children.find(el => el.className === 'name')?.textContent), ['Blink','Grow 4','Shrink 3']);
});

test('clicking Grow/Shrink shortcut calls existing item.roll workflow (size selection)', async () => {
  let rolled = 0;
  const item = {...power('Grow 2','Permanent'), roll: async () => rolled++};
  const actor = {items:{get: id => id === item.id ? item : null}};
  const hud = new NativeActionHud();
  Object.defineProperty(hud, 'selectedActor', {value:actor});
  const button = {
    dataset: {action:'power',itemId:item.id},
    disabled: false,
    classList: {add(){},remove(){}},
  };
  await hud.onClick({target:{closest:selector => selector.includes("[data-action='ability']") ? button : null}});
  assert.equal(rolled, 1);
  const shrinkItem = {...power('Shrink 4','Permanent'), roll: async () => rolled++};
  actor.items.get = id => id === shrinkItem.id ? shrinkItem : null;
  button.dataset.itemId=shrinkItem.id;
  await hud.onClick({target:{closest:selector=>selector.includes("[data-action='ability']") ? button : null}});
  assert.equal(rolled,2);
});
