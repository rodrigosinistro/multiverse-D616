import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
test('v0.2.99 anchored bottom-left with player list moved above, hidden position setting',()=>{
  const finalRules=css.slice(css.lastIndexOf('/* v0.2.93'));
  assert.match(finalRules,/left:\s*0 !important/);
  assert.match(finalRules,/bottom:\s*17px !important/);
  assert.match(finalRules,/#players[\s\S]*bottom:\s*var\(--mmrpg-d616-player-offset, 275px\) !important/);
  assert.doesNotMatch(source,/SETTING_PERSISTENT_POSITION/);
  assert.doesNotMatch(source,/data-action="pin"/);
});
test('v0.2.99 persistent always shows powers; classic abilities preserved',()=>{
  assert.match(source,/const tab = persistent \? "powers" :/);
  assert.match(source,/if \(tab === "powers"\) \{[\s\S]*?this\.renderPowers\(body, actor\)/);
  assert.match(source,/this\.renderAbilities\(body, actor\)/);
  const finalRules=css.slice(css.lastIndexOf('/* v0.2.93'));
  assert.match(finalRules,/mmrpg-native-action-hud__tabs,[\s\S]*?display:\s*none !important/);
});
test('v0.2.99 shortcuts are icon-only with tooltip and remain clickable',()=>{
  const finalRules=css.slice(css.lastIndexOf('/* v0.2.93'));
  assert.match(finalRules,/mmrpg-hotbar-slot-size:\s*39px/);
  assert.match(finalRules,/mmrpg-native-action-hud__action \.name,[\s\S]*?clip-path:\s*inset\(50%\)/);
  assert.match(source,/button\.setAttribute\("aria-label", label\)/);
  assert.match(source,/button\.title = label/);
  assert.match(source,/if \(item\?\.type === "power" \|\| isEquippedWeaponForHud\(item\)\) await item\.roll\(\)/);
  assert.match(source,/await activateAttachedPower\(carrier,actionButton\.dataset\.powerId,actor\)/);
});
test('v0.2.99 six full-name two-line clickable ability buttons use original test engine',()=>{
  assert.match(source,/const chip = document\.createElement\("button"\)/);
  assert.match(source,/chip\.dataset\.action = "ability"/);
  assert.match(source,/chip\.dataset\.ability = key/);
  assert.match(source,/label\.textContent = ABILITY_LABELS\[key\]/);
  assert.match(source,/value\.className = "ability-value"/);
  assert.match(source,/await rollAbility\(actor, actionButton\.dataset\.ability\)/);
  for(const label of ['Melee','Agility','Resilience','Vigilance','Ego','Logic'])
    assert.ok(source.includes(label));
  const finalRules=css.slice(css.lastIndexOf('/* v0.2.93'));
  assert.match(finalRules,/mmrpg-native-action-hud__quick-ability \{[\s\S]*?flex-direction:\s*column/);
  assert.equal(manifest.version,'0.2.106');
});
