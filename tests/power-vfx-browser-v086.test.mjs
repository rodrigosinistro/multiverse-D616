import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  listPublicSequencerVfx,searchSequencerVfx,previewFileFromSequencer,
  VFX_BROWSER_CATEGORIES,openPowerVfxBrowser
} from '../scripts/power-vfx-browser.mjs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('v086: library uses public Sequencer keys, removes duplicates and private entries',()=>{
  const db={publicFlattenedSimpleEntries:['jb2a.fire_bolt.orange','jb2a.misty_step.blue','jb2a.fire_bolt.orange','private.magic.secret',false],privateModules:['private']};
  assert.deepEqual(listPublicSequencerVfx(db),['jb2a.fire_bolt.orange','jb2a.misty_step.blue']);
  assert.deepEqual(listPublicSequencerVfx(null),[]);
});

test('v086: Portuguese search, categories and paging discover real datapaths',()=>{
  const list=['jb2a.fire_bolt.orange','jb2a.shield.blue','jb2a.ice_impact.blue','jb2a.energy_beam.blue','jb2a.misty_step.blue','other.fireball.red'];
  assert.deepEqual(searchSequencerVfx(list,{query:'gelo'}).items,['jb2a.ice_impact.blue']);
  assert.deepEqual(searchSequencerVfx(list,{query:'teleporte'}).items,['jb2a.misty_step.blue']);
  assert.deepEqual(searchSequencerVfx(list,{category:'shield'}).items,['jb2a.shield.blue']);
  assert.deepEqual(searchSequencerVfx(list,{query:'fogo',limit:1,offset:1}),{total:2,items:['other.fireball.red']});
  assert.ok(VFX_BROWSER_CATEGORIES.find(x=>x.id==='energy'));
});

test('v086: previews resolve local assets and do not embed dangerous paths',()=>{
  const db={getEntry:(key)=>({getAllFiles:()=>['modules/jb2a/first.webm'],getPreviewFile:()=>key==='bad'?'javascript:alert(1)':'modules/jb2a/firebolt.webm'})};
  assert.equal(previewFileFromSequencer(db,'jb2a.fire_bolt.orange'),'modules/jb2a/firebolt.webm');
  assert.equal(previewFileFromSequencer(db,'bad'),null);
  assert.equal(previewFileFromSequencer({getEntry:()=>false},'none'),null);
  assert.equal(previewFileFromSequencer({getEntry:()=>{throw Error('missing')}},'none'),null);
});

test('v086: browser gracefully warns when Sequencer is missing',async()=>{
  let warning='';
  globalThis.game={modules:new Map()};
  globalThis.ui={notifications:{warn:value=>warning=value}};
  assert.equal(await openPowerVfxBrowser(),null);
  assert.match(warning,/Ative o módulo Sequencer/);
  globalThis.game.modules.set('sequencer',{active:true});
  globalThis.Sequencer={Database:{publicFlattenedSimpleEntries:[]}};
  assert.equal(await openPowerVfxBrowser(),null);
  assert.match(warning,/biblioteca Sequencer está vazia/);
});

test('v086: both item sheets and copied powers support library button and independently saved keys',()=>{
  const partial=read('../templates/item/parts/item-power-vfx.hbs');
  const main=read('../multiverse-d616.mjs');
  const attached=read('../scripts/item-attached-powers.mjs');
  const manifest=JSON.parse(read('../system.json'));
  assert.match(partial,/mm-vfx-browse/);
  assert.match(main,/openPowerVfxBrowser\(\{initial:input\?\.value/);
  assert.match(main,/await this\.item\.update\(\{'flags\.multiverse-d616\.vfx':\{\.\.\.current,file:path\}\}\)/);
  assert.match(attached,/mm-vfx-browse-attached/);
  assert.match(attached,/document\?\.removeEventListener\?\.\('click',browseHandler,true\)/);
  assert.match(attached,/return result \? updateAttachedPower\(carrier,id,result\) : null/);
  assert.ok(manifest.styles.includes('styles/power-vfx-browser.css'));
  assert.equal(manifest.version,'0.2.106');
});
