import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(new URL(file,import.meta.url),'utf8');

test('v087: the Sequencer library button is a visible sibling of the styled input rather than behind its ::before layer',()=>{
  const tpl=read('../templates/item/parts/item-power-vfx.hbs');
  // Styled input decorative overlay occupies the entire input background.
  assert.match(read('../css/multiverse-d616.css'),/\.mm-styled-input::before\s*\{/);
  const field=tpl.indexOf('data-vfx-field="file"');
  const button=tpl.indexOf('class="mm-vfx-browse"');
  assert.ok(field > 0 && button > field);
  assert.ok(tpl.slice(field,button).includes('</div>\n  </div>'), 'Button must be OUTSIDE the mm-styled-input and enclosing styled field');
  assert.match(tpl,/aria-label="Abrir biblioteca de animações"/);
  const css=read('../styles/power-vfx-browser.css');
  assert.match(css,/\.mm-item-v2 \.mm-vfx-config \.mm-vfx-browse\s*\{/);
  assert.match(css,/position:relative;z-index:2/);
  assert.match(css,/width:100%/);
});

test('v087: picker still calls the browser and saves the selected datapath without changing other VFX fields',()=>{
  const main=read('../multiverse-d616.mjs');
  const partial=read('../templates/item/parts/item-power-vfx.hbs');
  assert.match(main,/querySelectorAll\('\.mm-vfx-browse'\)/);
  assert.match(main,/openPowerVfxBrowser\(\{initial:input\?\.value\?\?''/);
  assert.match(main,/\.\.\.current,file:path/);
  assert.match(partial,/mm-vfx-field" data-vfx-field="file"/);
  assert.match(partial,/mm-vfx-enabled-label/);
  const manifest=JSON.parse(read('../system.json'));
  assert.equal(manifest.version,'0.2.99');
  assert.ok(manifest.styles.includes('styles/power-vfx-browser.css'));
});
