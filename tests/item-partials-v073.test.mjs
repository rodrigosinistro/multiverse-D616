import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const main = fs.readFileSync(path.join(root, 'multiverse-d616.mjs'), 'utf8');
const needle = 'const preloadHandlebarsTemplates = async () =>';
const i = main.indexOf(needle);
const j = main.indexOf('class MarvelMultiverseActorBase', i);
assert.ok(i !== -1 && j > i, 'Expected V14 handlebars preload function');
const preload = main.slice(i, j);
const itemTemplates = fs.readdirSync(path.join(root, 'templates/item'))
  .filter(name => /^item-.*\.hbs$/.test(name))
  .map(name => path.join(root, 'templates/item', name));

const expectedPath = 'systems/multiverse-d616/templates/item/parts/item-attached-powers.hbs';

test('v0.2.73: attached-powers partial is included exactly once in v14 startup preloader', () => {
  const occurrences = preload.split(`"${expectedPath}"`).length - 1;
  assert.equal(occurrences, 1);
  assert.ok(fs.existsSync(path.join(root, 'templates/item/parts/item-attached-powers.hbs')));
});

test('v0.2.73: Foundry v14 startup preloads every partial referenced from every Item sheet', async () => {
  const loaded = [];
  const context = { foundry: { applications: { handlebars: {
    async loadTemplates(paths) { loaded.push(...paths); return paths; }
  } } } };
  vm.createContext(context);
  const urls = await vm.runInContext(`${preload}\npreloadHandlebarsTemplates()`, context);
  assert.equal(urls.length, loaded.length);
  const loadedSet = new Set(loaded);
  assert.ok(loadedSet.has(expectedPath));
  for (const itemFile of itemTemplates) {
    const contents = fs.readFileSync(itemFile, 'utf8');
    for (const match of contents.matchAll(/\{\{>\s*["']([^"']+)["']/g)) {
      const url = match[1];
      assert.ok(loadedSet.has(url), `${path.basename(itemFile)} references a partial not preloaded: ${url}`);
      const prefix = 'systems/multiverse-d616/';
      assert.ok(url.startsWith(prefix), `Unexpected partial path ${url}`);
      assert.ok(fs.existsSync(path.join(root, url.slice(prefix.length))), `Partial absent from ZIP source: ${url}`);
    }
  }
});

test('v0.2.73: item and weapon Powers tabs use the same registered partial', () => {
  for(const type of ['item','weapon']) {
    const contents = fs.readFileSync(path.join(root, `templates/item/item-${type}-sheet.hbs`), 'utf8');
    assert.match(contents, /data-tab="powers"/);
    assert.ok(contents.includes(`{{> "${expectedPath}"}}`));
  }
});
