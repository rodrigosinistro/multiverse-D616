import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=(name)=>readFileSync(join(root,name),'utf8');
const css=read('styles/native-action-hud.css');
const manifest=JSON.parse(read('system.json'));
const section=css.slice(css.lastIndexOf('/* v0.2.93'));

test('v0.2.99: five rows fit completely inside the persistent dock, above OS taskbar',()=>{
  const height=Number(section.match(/--mmrpg-persistent-dock-height:\s*(\d+)px/)?.[1]);
  const bottom=Number(section.match(/bottom:\s*(\d+)px !important/)?.[1]);
  const rows=5, slot=39, gap=4, padding=5, header=24;
  assert.ok(height >= rows*slot+(rows-1)*gap+2*padding+header,
    'dock must contain 5 rows plus spacing and header');
  assert.ok(bottom>0,'dock is lifted clear of the bottom edge');
  assert.match(section,/grid-auto-flow:\s*column/);
  assert.match(section,/grid-template-rows:\s*repeat\(var\(--mmrpg-persistent-body-rows\)/);
  assert.match(section,/\.is-item-shortcut\s*\{[\s\S]*?border-color:\s*#a73b3b/);
});

test('v0.2.99: manifest is internally consistent, references installed assets and documented release',()=>{
  assert.equal(manifest.id,'multiverse-d616');
  assert.equal(manifest.version,'0.2.106');
  assert.equal(manifest.compatibility.minimum,'14');
  assert.equal(manifest.compatibility.verified,'14');
  assert.equal(manifest.download,'https://github.com/rodrigosinistro/multiverse-D616/releases/download/v0.2.106/multiverse-d616-v0.2.106.zip');
  assert.match(read('CHANGELOG.md'),/^## v0\.2\.106/);
  assert.doesNotMatch(read('README.md'),/^## v0\.2\.\d+/m);
  for(const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l=>l.path), manifest.readme, manifest.license, manifest.changelog]){
    assert.ok(existsSync(join(root,path)),`missing referenced manifest asset: ${path}`);
  }
});
