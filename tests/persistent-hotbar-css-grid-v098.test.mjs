import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const section=css.slice(css.indexOf('/* v0.2.93'));
const bodyRule=section.match(/#mmrpg-native-action-hud\.is-persistent \.mmrpg-native-action-hud__body,\s*[\s\S]*?\{([^}]+)\}/)?.[1] ?? '';

test('v0.2.99: fixed-width explicit column tracks override old fractional grid templates',()=>{
  assert.match(bodyRule,/grid-template-columns:\s*repeat\(var\(--mmrpg-persistent-body-columns\),\s*var\(--mmrpg-hotbar-slot-size\)\)/);
  assert.match(bodyRule,/grid-template-rows:\s*repeat\(var\(--mmrpg-persistent-body-rows\),\s*var\(--mmrpg-hotbar-slot-size\)\)/);
  assert.match(bodyRule,/grid-auto-flow:\s*column/);
  assert.match(bodyRule,/grid-auto-columns:\s*var\(--mmrpg-hotbar-slot-size\)/);
  assert.match(section,/width:\s*100%/);
});

test('v0.2.99: narrow viewport keeps explicit fixed-size columns instead of returning to 1fr',()=>{
  const responsive=section.match(/@media \(max-width: 860px\)\s*\{([\s\S]*?)(?=@media \(max-width: 580px\)|$)/)?.[1]??'';
  assert.match(responsive,/grid-template-columns:\s*repeat\(var\(--mmrpg-persistent-body-columns\),\s*var\(--mmrpg-hotbar-slot-size\)\)/);
});
