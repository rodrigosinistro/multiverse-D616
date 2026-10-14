import assert from 'node:assert/strict';
import test from 'node:test';
import {shrinkPowerLevel,availableShrinkSizes,shrinkChoiceOptions,promptShrinkChoice,applyShrinkChoice} from '../scripts/shrink-size.mjs';
import {applyGrowChoice,naturalGrowSize} from '../scripts/grow-size.mjs';

const power=(name)=>({name,type:'power',id:name.replace(/\W/g,'')});
const def=(s)=> ({microscopic:5,miniature:4,tiny:3,little:2,small:1,average:0,big:-1,huge:-2,gigantic:-3,titanic:-4,gargantuan:-5}[s]);
const values=['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan'];
const config={sizeEffects:Object.fromEntries(values.map(size=>[size,{name:`${size} Effects`,flags:{'multiverse-d616':{managedSize:true}},transfer:true,changes:[
  {key:'system.size',mode:5,value:size},
  {key:'system.abilities.agl.defense',mode:2,value:def(size)},
  {key:'system.abilities.mle.defense',mode:2,value:def(size)},
]}]))};
let sequence=0;
function actor(natural='average',managed=false){
  const obj={_source:{system:{size:natural}},effects:{contents:[]},logs:[],
    async createEmbeddedDocuments(type,arr){assert.equal(type,'ActiveEffect');for(const doc of arr)this.effects.contents.push({...doc,id:`e${++sequence}`});this.logs.push('create')},
    async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.effects.contents=this.effects.contents.filter(e=>!ids.includes(e.id));this.logs.push('delete')},
  };
  if(managed)obj.effects.contents.push({...structuredClone(config.sizeEffects[natural]),id:`n${++sequence}`});
  return obj;
}
const resizing=(obj)=>obj.effects.contents.filter(e=>e.flags?.['multiverse-d616']?.shrinkChoice || e.flags?.['multiverse-d616']?.growChoice);
const size=(obj)=>resizing(obj)[0]?.changes.find(c=>c.key==='system.size')?.value;

test('Shrinks 1–4 limits, labels and specific official max sizes',()=>{
  const all=['little','tiny','miniature','microscopic'];
  for(let level=1;level<=4;level++){
    const item=power(`Shrink ${level}`);
    assert.equal(shrinkPowerLevel(item),level);
    assert.deepEqual(availableShrinkSizes(level).map(s=>s.key),all.slice(0,level));
    assert.deepEqual(shrinkChoiceOptions(item,actor()).map(s=>s.key),['normal',...all.slice(0,level)]);
  }
  assert.deepEqual(availableShrinkSizes(2,'little').map(s=>s.key),['tiny']);
  assert.deepEqual(availableShrinkSizes(4,'tiny').map(s=>s.key),['miniature','microscopic']);
  assert.deepEqual(availableShrinkSizes(1,'little').map(s=>s.key),[]);
  assert.deepEqual(availableShrinkSizes(4,'microscopic').map(s=>s.key),[]);
  assert.equal(shrinkPowerLevel(power('Shrinking Dodge')),0);
  assert.equal(shrinkPowerLevel(power('Shrink 10')),0);
  assert.equal(shrinkPowerLevel({...power('Shrink 2'),type:'weapon'}),0);
  assert.equal(shrinkChoiceOptions(power('Shrink 2'),null).length,0);
});

test('Effect follows selection, does not rewrite natural size and restores cleanly',async()=>{
  const a=actor();
  await applyShrinkChoice(a,power('Shrink 4'),'miniature',config);
  assert.equal(size(a),'miniature');
  assert.equal(resizing(a)[0].changes.find(c=>c.key==='system.size').priority,1000);
  assert.equal(resizing(a)[0].transfer,false);
  assert.equal(a._source.system.size,'average');
  await applyShrinkChoice(a,power('Shrink 2'),'tiny',config);
  assert.equal(resizing(a).length,1);
  assert.equal(size(a),'tiny');
  await assert.rejects(()=>applyShrinkChoice(a,power('Shrink 1'),'miniature',config),/não é permitido/);
  assert.equal(size(a),'tiny');
  await applyShrinkChoice(a,power('Shrink 2'),'normal',config);
  assert.equal(resizing(a).length,0);
  assert.equal(a._source.system.size,'average');
});

test('Permanent natural-size AE is preserved; defensive bonuses do not stack',async()=>{
  const a=actor('small',true);
  assert.equal(naturalGrowSize(a),'small');
  await applyShrinkChoice(a,power('Shrink 3'),'miniature',config);
  assert.equal(a.effects.contents.length,2);
  assert.equal(resizing(a)[0].changes.find(c=>c.key==='system.abilities.mle.defense').value,3); // +4 total minus +1 natural
  assert.equal(resizing(a)[0].changes.find(c=>c.key==='system.abilities.agl.defense').value,3);
  await applyShrinkChoice(a,power('Shrink 3'),'normal',config);
  assert.equal(a.effects.contents.length,1);
  assert.equal(a.effects.contents[0].name,'small Effects');
});

test('Grow and Shrink choices replace one another, normal clears either resize only',async()=>{
  const a=actor('small',true);
  await applyGrowChoice(a,power('Grow 1'),'huge',config);
  assert.equal(size(a),'huge');
  assert.equal(resizing(a).length,1);
  await applyShrinkChoice(a,power('Shrink 4'),'microscopic',config);
  assert.equal(size(a),'microscopic');
  assert.equal(resizing(a).length,1);
  await applyGrowChoice(a,power('Grow 3'),'gigantic',config);
  assert.equal(size(a),'gigantic');
  assert.equal(resizing(a).length,1);
  await applyShrinkChoice(a,power('Shrink 1'),'normal',config);
  assert.equal(resizing(a).length,0);
  assert.equal(a.effects.contents[0].name,'small Effects');
});

test('Natural size from legacy managed effect is consulted for shrink limits',()=>{
  const a=actor('average');
  a.effects.contents.push({...config.sizeEffects.little,id:'n1'});
  assert.equal(naturalGrowSize(a),'little');
  assert.deepEqual(availableShrinkSizes(3,naturalGrowSize(a)).map(s=>s.key),['tiny','miniature']);
});

test('Dialog cancellation and tampering never apply an unapproved size',async()=>{
  const a=actor();
  globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>null}}}};
  assert.equal(await promptShrinkChoice(power('Shrink 3'),a),null);
  assert.equal(a.effects.contents.length,0);
  globalThis.foundry.applications.api.DialogV2.wait=async()=> 'microscopic';
  assert.equal(await promptShrinkChoice(power('Shrink 1'),a),null);
  globalThis.foundry.applications.api.DialogV2.wait=async()=> 'tiny';
  assert.equal(await promptShrinkChoice(power('Shrink 2'),a),'tiny');
});
