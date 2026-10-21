import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  powersInSelectedSet, reconcilePowerCatalog, prepareCharacterPowers
} from '../apps/charactermancer/scripts/utils/mmc-power-catalog.mjs';

const SRC = readFileSync(new URL('../apps/charactermancer/scripts/charactermancer.js',import.meta.url),'utf8');
const CATALOG = JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const P = (name,powerSet,effect) => ({_id: `${name}.${powerSet}`, name, system:{powerSet,effect}});

test('Spider-Powers shows only Spider-Powers Jump tiers, not Super-Strength', () => {
  const spider = powersInSelectedSet(CATALOG,'Spider-Powers');
  const jumps = spider.filter(p=>/^Jump [123]$/.test(p.name));
  assert.deepEqual(jumps.map(p=>p.name).sort(), ['Jump 1','Jump 2','Jump 3']);
  assert.ok(jumps.every(p=>p.system.powerSet === 'Spider-Powers'));
  const superStrength = powersInSelectedSet(CATALOG,'Super-Strength');
  assert.deepEqual(superStrength.filter(p=>/^Jump [123]$/.test(p.name)).map(p=>p.name).sort(),['Jump 1','Jump 2','Jump 3']);
  assert.ok(superStrength.every(p=>p.system.powerSet==='Super-Strength'));
});
test('power-set filter handles spacing, capitalization and accents',()=>{
  const items=[P('Flare','Magic','A'),P('Flare','Illusion','B'),P('Jump 1','Spider-Powers','C'), P('Other','Básico','D')];
  assert.deepEqual(powersInSelectedSet(items,'  SPIDER – POWERS '),[items[2]]);
  assert.deepEqual(powersInSelectedSet(items,'magic'),[items[0]]);
  assert.deepEqual(powersInSelectedSet(items,'Illusion'),[items[1]]);
});
test('filters do not mutate entries or erase homonyms of other sets',()=>{
  const entries=[P('Jump 1','Spider-Powers','A'),P('Jump 1','Super-Strength','B')];
  assert.deepEqual(powersInSelectedSet(entries,'Spider-Powers'),[entries[0]]);
  assert.deepEqual(powersInSelectedSet(entries,'Super-Strength'),[entries[1]]);
  assert.equal(reconcilePowerCatalog(entries).length,2);
  assert.deepEqual(entries.map(p=>p.system.powerSet),['Spider-Powers','Super-Strength']);
});
test('group filtering does not break selection of progression tiers',()=>{
  const chosen=[P('Jump 1','Spider-Powers','A'),P('Jump 2','Spider-Powers','B'),P('Jump 1','Super-Strength','C')];
  const selected=prepareCharacterPowers([],chosen);
  assert.deepEqual(selected.map(p=>`${p.system.powerSet}:${p.name}`),['Spider-Powers:Jump 2','Super-Strength:Jump 1']);
});
test('Charactermancer render uses strict group filter and does not expand same-name families',()=>{
  assert.match(SRC,/const shownList = powersInSelectedSet\(allP, setName\)/);
  assert.doesNotMatch(SRC,/const crossList = /);
  assert.doesNotMatch(SRC,/const baseNames = /);
});
