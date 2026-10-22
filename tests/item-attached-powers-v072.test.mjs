import assert from 'node:assert/strict';
import test from 'node:test';
import {attachPower, detachPower, supportsAttachedPowers, getAttachedPowers,
  attachedPowerUsable, makeAttachedPowerDocument, activateAttachedPower} from '../scripts/item-attached-powers.mjs';

let seed = 0;
globalThis.foundry = { utils: {
  randomID: () => `attachedPower${++seed}`,
  deepClone: value => structuredClone(value),
}};
const activations=[];
globalThis.CONFIG = {Item:{documentClass:class MockPowerItem {
  constructor(data,options){this.data=data;this.actor=options.parent;this.type=data.type;}
  async roll(){activations.push({data:this.data,actor:this.actor});return this.data.name;}
}}};

function fixture(type='weapon', equipped=true, withActor=true){
  const actor=withActor?{id:'h',name:'Hardlight',items:{}}:null;
  const item={type,uuid:'Item.sword',isOwner:true,name:'Espada Fantástica',
    system:{equipped},flags:{'multiverse-d616':{}},
    async update(patch){
      this.lastPatch=structuredClone(patch);
      this.flags['multiverse-d616'].attachedPowers=patch['flags.multiverse-d616.attachedPowers'];
      return this;
    },
  };
  item.actor=actor;
  return {item,actor};
}
function power(name='Elemental Blast',id='blast') {
 return {type:'power',uuid:`Compendium.multiverse-d616.powers.Item.${id}`,
   name,img:'icons/power.svg',toObject(){return {_id:'sourceid',type:'power',name,img:'icons/power.svg',
     system:{cost:{value:5},formula:'{1d6,1dm,1d6}',effect:'Explode',duration:'Instant'},
     effects:[{duration:{value:'Permanent'},changes:[{key:'system.foo',value:'yes'}]}]};}};
}

test('v072: weapon and ordinary item support powers; powers and traits do not',()=>{
  assert.equal(supportsAttachedPowers({type:'weapon'}),true);
  assert.equal(supportsAttachedPowers({type:'item'}),true);
  assert.equal(supportsAttachedPowers({type:'power'}),false);
  assert.equal(supportsAttachedPowers({type:'trait'}),false);
});

test('v072: drag copies full Power snapshot, only updates carrier flag, source unchanged',async()=>{
  const {item}=fixture(); const dragged=power();
  const first=dragged.toObject();
  const result=await attachPower(item,dragged);
  assert.equal(result.added,true);
  assert.equal(getAttachedPowers(item).length,1);
  assert.equal(getAttachedPowers(item)[0].data.system.cost.value,5);
  assert.equal(getAttachedPowers(item)[0].data.effects[0].duration.value,'Permanent');
  assert.equal(result.entry.data._id,undefined);
  assert.deepEqual(dragged.toObject(),first);
  assert.deepEqual(Object.keys(item.lastPatch),['flags.multiverse-d616.attachedPowers']);
});

test('v072: repeated same compendium power is deduplicated; different powers are allowed',async()=>{
  const {item}=fixture('item');
  assert.equal((await attachPower(item,power())).added,true);
  assert.equal((await attachPower(item,power())).added,false);
  assert.equal((await attachPower(item,power('Healing','heal'))).added,true);
  assert.equal(getAttachedPowers(item).length,2);
});

test('v072: remove detaches power without touching actor powers or the source',async()=>{
  const {item,actor}=fixture('item');
  actor.items={doNotModify:true};
  const entry=(await attachPower(item,power())).entry;
  assert.equal(await detachPower(item,entry.id),true);
  assert.equal(getAttachedPowers(item).length,0);
  assert.deepEqual(actor.items,{doNotModify:true});
  assert.equal(await detachPower(item,entry.id),false);
});

test('v072: disallow non-power and prevent writes to non-editable equipment',async()=>{
  const {item}=fixture();
  await assert.rejects(attachPower(item,{type:'item'}),/Poder/);
  item.isOwner=false;
  await assert.rejects(attachPower(item,power()),/permissão/);
  assert.equal(getAttachedPowers(item).length,0);
});

test('v072: transitory Power uses carrier owner for existing roll(), normalizes invalid V14 duration',async()=>{
  const {item,actor}=fixture();
  const entry=(await attachPower(item,power())).entry;
  const instance=makeAttachedPowerDocument(item,entry.id,actor);
  assert.equal(instance.actor,actor);
  assert.equal(instance.data._id,entry.id);
  assert.equal(instance.data.effects[0].duration.value,null);
  assert.equal(getAttachedPowers(item)[0].data.effects[0].duration.value,'Permanent');
  const before=activations.length;
  assert.equal(await activateAttachedPower(item,entry.id),'Elemental Blast');
  assert.equal(activations.length,before+1);
  assert.equal(activations.at(-1).actor,actor);
});

test('v072: unequipped weapons cannot activate powers, normal items can',async()=>{
  const {item,actor}=fixture('weapon',false);
  const entry=(await attachPower(item,power())).entry;
  assert.equal(attachedPowerUsable(item,actor),false);
  assert.equal(makeAttachedPowerDocument(item,entry.id),null);
  await assert.rejects(activateAttachedPower(item,entry.id),/Equipe a arma/);
  item.system.equipped=true;
  assert.equal(attachedPowerUsable(item,actor),true);
  const owned=fixture('item',false);
  const ep=(await attachPower(owned.item,power())).entry;
  assert.equal(attachedPowerUsable(owned.item),true);
  assert.equal(await activateAttachedPower(owned.item,ep.id),'Elemental Blast');
  const free=fixture('item',false,false);
  const np=(await attachPower(free.item,power())).entry;
  assert.equal(attachedPowerUsable(free.item),false);
  await assert.rejects(activateAttachedPower(free.item,np.id),/inventário/);
});

test('v072: attached Powers template present for both weapon and item, drag intercepted with ItemSheetV2',async()=>{
 const fs=await import('node:fs');
 const root=new URL('../',import.meta.url);
 const main=fs.readFileSync(new URL('multiverse-d616.mjs',root),'utf8');
 assert.match(main,/async _onDropDocument\(event, document\)/);
 assert.match(main,/attachPower\(this\.item,document\)/);
 for(const type of ['weapon','item']){
   const hbs=fs.readFileSync(new URL(`templates/item/item-${type}-sheet.hbs`,root),'utf8');
   assert.match(hbs,/data-tab="powers"/);
   assert.match(hbs,/item-attached-powers\.hbs/);
 }
 const partial=fs.readFileSync(new URL('templates/item/parts/item-attached-powers.hbs',root),'utf8');
 assert.match(partial,/data-attached-power-id/);
 assert.match(partial,/mm-attached-power-use/);
 assert.match(partial,/mm-attached-power-remove/);
});

test('v072: Foundry V14 ItemSheetV2 drop invokes equipment attach and opens Powers tab',async()=>{
  const fs=await import('node:fs');
  const vm=await import('node:vm');
  const source=fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const first=source.indexOf('class LegacyMarvelMultiverseItemSheet extends');
  const last=source.indexOf('/**\n * Define a set of template paths',first);
  const {item}=fixture();
  let attached=0;
  const context={
    foundry:{appv1:{sheets:{ItemSheet:class{static get defaultOptions(){return{};}}}},
      applications:{api:{HandlebarsApplicationMixin:K=>K},sheets:{ItemSheetV2:class {
        constructor(){this.item=item;this.isEditable=true;this.tabGroups={};}
        async _onDropDocument(){return 'fallback';}
      }}},utils:{deepClone:structuredClone}},
    game:{i18n:{localize:s=>s}},CONFIG:{MULTIVERSE_D616:{elements:{},abilities:{}}},
    supportsAttachedPowers, getAttachedPowers, attachPower:async (carrier,powerToAttach)=>{
      attached+=1; return attachPower(carrier,powerToAttach);
    },detachPower,attachedPowerUsable,activateAttachedPower,
    prepareActiveEffectCategories:()=>({}),
    ui:{notifications:{info(){},warn(){},error(msg){throw new Error(msg);}}},
    console,
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(first,last)}\nglobalThis.Sheet=D616WeaponItemSheet;`,context);
  const sheet=new context.Sheet();
  sheet.render=()=>{};
  const original=power('Elemental Blast','blade');
  const returned=await sheet._onDropDocument({},original);
  assert.equal(returned,original);
  assert.equal(attached,1);
  assert.equal(getAttachedPowers(item).length,1);
  assert.equal(sheet.tabGroups.primary,'powers');
  const unsupported=await sheet._onDropDocument({},{type:'trait'});
  assert.equal(unsupported,'fallback');
});
