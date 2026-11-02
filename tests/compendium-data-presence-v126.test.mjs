import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const EXPECTED={
  powers:600000,
  origins:100000,
  traits:50000,
  tags:30000,
  occupations:20000,
  items:10000,
};
test('v126: all six LevelDB compendiums include their document logs, not just control files',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
  assert.equal(manifest.packs.length,6);
  const seen=new Set();
  for(const p of manifest.packs){
    assert.ok(p.path.startsWith('packs/'),'Pack path must remain under the system');
    const data=readFileSync(new URL(`../${p.path}/000002.log`,import.meta.url));
    assert.ok(data.length>EXPECTED[p.name],`${p.name}: LevelDB data is empty or missing`);
    for(const name of ['CURRENT','MANIFEST-000001'])assert.ok(readFileSync(new URL(`../${p.path}/${name}`,import.meta.url)).length>0);
    seen.add(p.name);
  }
  assert.deepEqual([...seen].sort(),Object.keys(EXPECTED).sort());
});
