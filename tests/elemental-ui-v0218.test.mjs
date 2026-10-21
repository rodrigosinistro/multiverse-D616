import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(name)=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('Selector de proteção spans the complete target table and dropdown fills its row',()=>{
  const js=file('scripts/damage-reduction-helper.js');
  const css=file('styles/damage-reduction-helper.css');
  assert.match(js, /<label class="mmdr-guard-line">Proteção ativa:<select class="mmdr-guard-mode"/);
  assert.match(css,/\.mmdr-multi \.tbl > \.mmdr-guard-line\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(css,/\.mmdr-multi \.tbl > \.mmdr-guard-line \.mmdr-guard-mode\s*\{[^}]*width:\s*100%/s);
  assert.match(js, /class="hdrrow"/);
  assert.match(css,/\.mmdr-multi \.tbl\s*\{[^}]*grid-template-columns:\s*1\.4fr \.8fr \.8fr/s);
});

test('Sphere/Prison show drawing controls but no obsolete manual structure-attack action',()=>{
  const js=file('scripts/elemental-advanced.mjs');
  assert.match(js,/Desenhar área —/);
  assert.doesNotMatch(js,/Resolver ataque contra a estrutura|async function absorbViaGM/);
  assert.doesNotMatch(js,/const info=document\.createElement\('p'\);info\.textContent=`Proteção:/);
  const shields=file('scripts/elemental-shields.mjs');
  const damage=file('scripts/damage-reduction-helper.js');
  assert.match(shields,/findCrossingElementalBarrier/);
  assert.match(damage,/findCrossingElementalBarrier/);
  assert.match(damage,/assessGuardHit\(rawAmount,guard\)/);
});
