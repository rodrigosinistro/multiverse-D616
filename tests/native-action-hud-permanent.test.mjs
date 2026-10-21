import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const listeners = [];
globalThis.Hooks = {
  on(name, callback) { listeners.push([name, callback]); },
  once(name, callback) { listeners.push([name, callback]); },
};
globalThis.window = { addEventListener() {} };
globalThis.game = {
  user: { isGM: true },
  i18n: { lang: 'pt-BR', localize: key => key },
};

const { isPermanentPower, isPowerAvailableForHud, NativeActionHud } =
  await import('../scripts/native-action-hud.mjs');
const items = JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json', import.meta.url), 'utf8')).items;
const permanent = items.filter(isPermanentPower);
const makePower = (name, duration = 'Permanent', type = 'power') => ({
  type, name, id: `test-${name}`, img: 'icons/test.svg', system: { duration },
});

const permitted = [
  'Charmed Life',
  'Disguise',
  'Domination',
  'Edit Memory',
  'Flexible Fingers',
  'Levitation',
  'Memory Blip',
  'Orders',
  'Resize Object',
  'Resize Other',
  'Rubberneck',
  'Shape-Shift',
  'Teleport Object',
];
const permittedSet = new Set(permitted);

// The power names and durations come directly from the shipped Charactermancer
// catalog, not from invented fixture data only.
test('audit identifies actionable Permanent powers in the shipped catalog', () => {
  assert.equal(items.length, 398);
  assert.equal(permanent.length, 88);
  const permanentNames = new Set(permanent.map(x => x.name));
  for (const name of permitted) {
    assert.ok(permanentNames.has(name), `Missing or nonpermanent catalog power: ${name}`);
    assert.equal(isPowerAvailableForHud(permanent.find(x => x.name === name)), true, name);
  }
});

test('Resize Object, Resize Other and Resize Others are visible for both duration spellings', () => {
  for (const name of ['Resize Object', 'Resize Other', 'Resize Others']) {
    for (const duration of ['Permanent', 'Permanente', { value: 'Permanent' }, ['Permanente']]) {
      assert.equal(isPermanentPower(makePower(name, duration)), true);
      assert.equal(isPowerAvailableForHud(makePower(name, duration)), true, name);
    }
  }
});

test('active telepathy powers are visible and contain Logic roll settings', () => {
  for (const name of ['Domination', 'Edit Memory', 'Memory Blip', 'Orders']) {
    const item = permanent.find(x => x.name === name);
    assert.equal(isPowerAvailableForHud(item), true, name);
    assert.equal(item.system.ability, 'log', name);
    assert.ok(item.system.formula.includes('1dm'), name);
  }
});

test('passive powers, false matches and nonpower items do not become actions', () => {
  for (const name of ['Flight 2', 'Stilt Steps', 'Mighty 4', 'Sturdy 4', 'Uncanny 2',
    'Lightning Actions', 'Speed Run 2', 'Power Slider', 'Iconic Weapon',
    'Extended Reach 1', 'Resize Object Advanced', 'Resize Other 2',
    'Grow 5', 'Shrink 5', 'Rubbernecked']) {
    assert.equal(isPowerAvailableForHud(makePower(name)), false, name);
  }
  assert.equal(isPowerAvailableForHud(makePower('Resize Object', 'Permanent', 'trait')), false);
  assert.equal(isPowerAvailableForHud(makePower('Domination', 'Permanent', 'weapon')), false);
  assert.equal(isPowerAvailableForHud(makePower('Blink', 'Instant')), true);
  assert.equal(isPowerAvailableForHud(makePower('Shield 1', 'Concentration')), true);
});

test('only 13 additional Permanent catalog powers plus Grow/Shrink are included', () => {
  const extra = permanent
    .filter(i => isPowerAvailableForHud(i))
    .filter(i => !/^Grow [1-4]$|^Shrink [1-4]$/.test(i.name));
  assert.deepEqual(new Set(extra.map(i => i.name)), permittedSet);
  assert.equal(extra.length, permitted.length);
  const all = permanent.filter(isPowerAvailableForHud);
  assert.equal(all.length, 21);
  assert.equal(permanent.length - all.length, 67);
});

test('the HUD renders Resize and other choices but hides passive bonuses', () => {
  const mocks = ['Resize Other', 'Resize Object', 'Domination', 'Mighty 1', 'Flight 2', 'Grow 2']
    .map(n => makePower(n));
  globalThis.document = {
    createElement: tag => ({
      tag, dataset: {}, className: '', children: [],
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      removeAttribute() {},
    }),
  };
  const body = {
    classList: { remove() {}, add() {} }, children: [],
    appendChild(child) { this.children.push(child); },
  };
  const hud = new NativeActionHud();
  hud.renderPowers(body, { items: mocks, system: {} });
  const names = body.children.map(btn => btn.children.find(c => c.className === 'name')?.textContent);
  assert.deepEqual(names, ['Domination', 'Grow 2', 'Resize Object', 'Resize Other']);
});

test('clicking Resize Other uses original item.roll workflow, without separate rolling', async () => {
  let calls = 0;
  const item = { ...makePower('Resize Other'), roll: async () => { calls++; } };
  const actor = { items: { get(id) { return id === item.id ? item : null; } } };
  const hud = new NativeActionHud();
  Object.defineProperty(hud, 'selectedActor', { value: actor });
  const button = {
    dataset: { action: 'power', itemId: item.id }, disabled: false,
    classList: { add() {}, remove() {} },
  };
  await hud.onClick({ target: { closest(sel) {
    return sel.includes("[data-action='ability']") ? button : null;
  } } });
  assert.equal(calls, 1);
  assert.equal(button.disabled, false);
});
