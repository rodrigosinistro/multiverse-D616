import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const character = fs.readFileSync(new URL('../templates/actor/actor-character-sheet.hbs',import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../styles/actor-sheet-v2.css',import.meta.url),'utf8');
const npc = fs.readFileSync(new URL('../templates/actor/actor-npc-sheet.hbs',import.meta.url),'utf8');

test('V2 character ability block has a visible localized heading above its rows',()=>{
  assert.match(character,/class="flexrow mm-styled-container mm-abilities-block mm-v2-character-attributes">\s*<h3 class="mm-v2-character-attributes-title">Atributos<\/h3>/);
  assert.match(css,/\.mm-v2-character-attributes > h3\.mm-v2-character-attributes-title\s*\{[^}]*display:flex !important;[^}]*flex:0 0 30px !important;/s);
});
test('V2 powers and traits are side by side, top aligned, and use repeating texture',()=>{
  assert.match(character,/class="flexrow -gap-sm -nowrap mm-v2-character-columns"/);
  assert.match(css,/form\.character \.mm-v2-character-columns\s*\{[^}]*display:grid !important;[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[^}]*align-items:start !important;/s);
  assert.match(css,/form\.character \.mm-v2-character-columns > \.mm-styled-container\s*\{[^}]*align-self:start !important;/s);
  assert.match(css,/\.mm-v2-character-columns > \.mm-styled-container > \.mm-styled-container-body\s*\{[^}]*background-repeat:no-repeat,repeat-y;/s);
});
test('Character layout CSS scope does not include NPC and NPC retains its existing dashboard',()=>{
  assert.match(npc,/mm-v2-npc-top/);
  assert.match(npc,/mm-v2-npc-bottom/);
  const fragment=css.slice(css.indexOf('/* v0.2.35'));
  assert.ok(fragment.length>100);
  assert.doesNotMatch(fragment,/form\.mm-v2-npc/);
  assert.ok(fragment.includes('form.character'));
});
