import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL(file,import.meta.url),'utf8');
test('v172: indicador de turno MARVEL volta integralmente ao Foundry nativo',()=>{
  const manifest=JSON.parse(read('../system.json'));
  assert.equal(manifest.version,'0.2.178');
  assert.ok(!manifest.esmodules.some(m=>m.includes('turn-marker-under-token')));
  assert.equal(fs.existsSync(new URL('../scripts/combat/turn-marker-under-token.mjs',import.meta.url)),false);
  const scripts=fs.readdirSync(new URL('../scripts/combat/',import.meta.url));
  assert.ok(!scripts.some(m=>m.includes('under-token')));
  const loaded=manifest.esmodules.map(m=>read(`../${m}`)).join('\n');
  assert.doesNotMatch(loaded,/marvelUnderlayScale|compactTurnMarkerUnderToken|Combate — MARVEL atrás dos tokens/);
});
