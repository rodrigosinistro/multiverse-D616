import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getPowerVfxConfig,resolvePowerVfx,playPowerVfx,registerPowerVfxSettings} from '../scripts/power-vfx.mjs';
import {attachPower,updateAttachedPower,getAttachedPowers} from '../scripts/item-attached-powers.mjs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const ns='multiverse-d616';
const baseItem=(name='Elemental Blast',element='fire',vfx=null)=>({
  type:'power',name,system:{element,attack:true},actor:{id:'actor1'},
  flags:{[ns]:vfx?{vfx}:{}},
});

test('v085: automatic documented presets are conservative, respecting custom files and disable flags',()=>{
  assert.deepEqual(resolvePowerVfx(baseItem()),{file:'jb2a.fire_bolt.orange',mode:'projectile',scale:1});
  assert.equal(resolvePowerVfx(baseItem('Elemental Blast','ice')),null);
  assert.equal(resolvePowerVfx(baseItem('Elemental Blast','fire',{enabled:false})),null);
  assert.deepEqual(resolvePowerVfx(baseItem('Elemental Blast','ice',{file:'custom.webm',mode:'target',scale:2})),
    {file:'custom.webm',mode:'target',scale:2});
  assert.deepEqual(resolvePowerVfx(baseItem('Teleport 1','',{mode:'auto'})),
    {file:'jb2a.misty_step.02.blue',mode:'self',scale:1});
  assert.deepEqual(getPowerVfxConfig(baseItem('Other','',{scale:800})).scale,5);
});

test('v085: visual settings are registered at world level and do not depend on module',()=>{
  const calls=[];
  globalThis.game={settings:{register:(...args)=>calls.push(args)}};
  registerPowerVfxSettings();
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],ns);
  assert.equal(calls[0][1],'powerVfxEnabled');
  assert.equal(calls[0][2].scope,'world');
  assert.equal(calls[0][2].default,true);
});

test('v085: when Sequencer is absent, playVfx does not throw or alter game state',async()=>{
  globalThis.game={settings:{get:()=>true},modules:new Map()};
  assert.equal(await playPowerVfx(baseItem()),false);
});

test('v085: a projectile plays exactly once with a source and target, never performs rules updates',async()=>{
  const events=[];
  const source={actor:{id:'actor1'},isVisible:true};
  const target={actor:{id:'target'},isVisible:true};
  globalThis.canvas={ready:true,tokens:{controlled:[source],placeables:[source,target]}};
  class Sequence {
    effect(){events.push('effect');return this;}
    file(p){events.push(['file',p]);return this;}
    atLocation(token){events.push(['from',token]);return this;}
    stretchTo(token){events.push(['to',token]);return this;}
    play(){events.push('play');return Promise.resolve();}
  }
  globalThis.Sequence=Sequence;
  globalThis.Sequencer={Database:{entryExists:()=>true}};
  globalThis.game={settings:{get:()=>true},modules:new Map([['sequencer',{active:true}]]),user:{targets:new Set([target])}};
  const done=await playPowerVfx(baseItem());
  assert.equal(done,true);
  assert.deepEqual(events,[
    'effect',['file','jb2a.fire_bolt.orange'],['from',source],['to',target],'play'
  ]);
});

test('v085: global toggle and missing target disable VFX without affecting power use',async()=>{
  const item=baseItem();
  globalThis.game.settings.get=()=>false;
  assert.equal(await playPowerVfx(item),false);
  globalThis.game.settings.get=()=>true;
  globalThis.game.user.targets=new Set();
  assert.equal(await playPowerVfx(item),false);
});

test('v085: equipment-copied power keeps independent VFX flags',async()=>{
  let counter=0;
  globalThis.foundry={utils:{randomID:()=>`id${++counter}`,deepClone:structuredClone}};
  const actor={id:'owner'};
  const carrier={type:'weapon',actor,isOwner:true,flags:{[ns]:{}},name:'Sword',system:{equipped:true},
    async update(data){this.flags[ns].attachedPowers=data[`flags.${ns}.attachedPowers`];}};
  const power=baseItem('Elemental Burst','ice');
  power.uuid='Power.base';
  power.toObject=()=>({...power,flags:structuredClone(power.flags),system:structuredClone(power.system),effects:[]});
  const id=(await attachPower(carrier,power)).entry.id;
  const result=await updateAttachedPower(carrier,id,{vfxFile:'modules/custom/ice.webm',vfxMode:'target',vfxEnabled:true});
  assert.equal(result.data.flags[ns].vfx.file,'modules/custom/ice.webm');
  assert.equal(power.flags[ns].vfx,undefined);
  assert.equal(getAttachedPowers(carrier)[0].data.flags[ns].vfx.mode,'target');
});

test('v085: ItemSheets expose VFX tab, registered partial and action integration',()=>{
  const main=read('../multiverse-d616.mjs');
  for(const name of ['power','weapon']){
    const hbs=read(`../templates/item/item-${name}-sheet.hbs`);
    assert.match(hbs,/data-tab="visual"/);
    assert.match(hbs,/parts\/item-power-vfx\.hbs/);
  }
  assert.match(main,/getPowerVfxConfig\(this\.item\)/);
  assert.match(main,/await this\.item\.update\(\{'flags\.multiverse-d616\.vfx'/);
  assert.match(main,/registerPowerVfxSettings\(\)/);
  assert.match(main,/void playPowerVfx\(this\)/);
  assert.match(main,/"systems\/multiverse-d616\/templates\/item\/parts\/item-power-vfx\.hbs"/);
});
