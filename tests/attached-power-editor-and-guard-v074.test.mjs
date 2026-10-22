import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  attachPower, getAttachedPowers, updateAttachedPower, editAttachedPower,
  makeAttachedPowerDocument, findUsableAttachedPower, detachPower,
} from '../scripts/item-attached-powers.mjs';
import {activeElementalGuards, selectElementalDefense, assessGuardHit, consumeGuard}
  from '../scripts/elemental-shields.mjs';
import {getElementalFantasticMetadata} from '../scripts/elemental-fantastic.mjs';

const SYS='multiverse-d616';
let uid=0;
globalThis.foundry={utils:{randomID:()=>`ap${++uid}`,deepClone:structuredClone}};
globalThis.CONFIG={MULTIVERSE_D616:{elements:{fire:{label:'Fire'},ice:{label:'Ice'},electricity:{label:'Electricity'}}},Item:{documentClass:class {
  constructor(data,options){this.data=data;this.system=data.system;this.actor=options.parent;this.id=data._id;}
  roll(){return this.data;}
}}};
const fixture=(equipped=true,kind='weapon')=>{
  const actor={id:'zim',system:{defaultElement:'ice'},items:new Map(),effects:[],
    async deleteEmbeddedDocuments(type, ids){assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
  const weapon={id:'item',type:kind,actor,system:{equipped},isOwner:true,name:'Espada de Vingança',
    flags:{[SYS]:{}},async update(patch){this.flags[SYS].attachedPowers=patch[`flags.${SYS}.attachedPowers`];return this;}};
  actor.items.set('item',weapon);
  return {actor,weapon};
};
const mkPower=(name='Elemental Protection 1', element='')=>({
  type:'power',name,img:'icons/ice.svg',uuid:`Power.${name}`,
  toObject(){return {type:'power',name,img:'icons/ice.svg',system:{isElemental:true,element,
    effect:'Absorve ataques',duration:'Concentration',cost:'5 Focus'},effects:[]};},
});

test('v074: edit copied elemental power, independent of source and original caster element',async()=>{
  const {actor,weapon}=fixture();
  const source=mkPower('Elemental Blast','');
  const entry=(await attachPower(weapon,source)).entry;
  const updated=await updateAttachedPower(weapon,entry.id,{element:'fire',name:'Chamas da Vingança',cost:'7 Focus',effect:'Ataque de fogo'});
  assert.equal(updated.data.system.element,'fire');
  assert.equal(updated.name,'Chamas da Vingança');
  assert.equal(getAttachedPowers(weapon)[0].data.system.effect,'Ataque de fogo');
  assert.equal(actor.system.defaultElement,'ice');
  assert.equal(source.toObject().system.element,'');
  const cast=makeAttachedPowerDocument(weapon,entry.id);
  assert.equal(cast.data.system.element,'fire');
  assert.equal(getElementalFantasticMetadata(cast,actor)?.key,'fire');
  await assert.rejects(updateAttachedPower(weapon,entry.id,{name:''}),/nome/);
  assert.equal(getAttachedPowers(weapon)[0].name,'Chamas da Vingança');
});

test('v074: edit permission, independent copies on two weapons, removal',async()=>{
  const {actor,weapon}=fixture();
  const a=(await attachPower(weapon,mkPower('Elemental Burst'))).entry;
  const second={...weapon,id:'other',flags:{[SYS]:{}},async update(p){this.flags[SYS].attachedPowers=p[`flags.${SYS}.attachedPowers`];return this;}};
  actor.items.set('other',second);
  const b=(await attachPower(second,mkPower('Elemental Burst'))).entry;
  await updateAttachedPower(weapon,a.id,{element:'electricity'});
  assert.equal(getAttachedPowers(second)[0].id,b.id);
  assert.equal(getAttachedPowers(second)[0].data.system.element,'');
  weapon.isOwner=false;
  await assert.rejects(updateAttachedPower(weapon,a.id,{element:'fire'}),/permissão/);
  weapon.isOwner=true;
  assert.equal(await detachPower(weapon,a.id),true);
  await assert.rejects(updateAttachedPower(weapon,a.id,{element:'fire'}),/não foi encontrado/);
});

test('v074: equipment protection active via transient item id absorbs Health AND Focus',async()=>{
  const {actor,weapon}=fixture();
  const e=(await attachPower(weapon,mkPower())).entry;
  actor.effects.push({id:'conc',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:e.id}}}});
  const linked=findUsableAttachedPower(actor,e.id);
  assert.equal(linked.carrier,weapon);
  assert.equal(linked.name,'Elemental Protection 1');
  const guard=selectElementalDefense({actor})?.guard;
  assert.equal(guard.threshold,10);
  assert.equal(selectElementalDefense({actor,category:'focus'})?.guard?.threshold,10);
  const hit=assessGuardHit(12,guard);
  assert.equal(hit.blocked,true);
  assert.equal(hit.damageToTarget,0);
  assert.equal(hit.destroyed,true);
  await consumeGuard(actor,guard,hit);
  assert.equal(actor.effects.length,0);
});

test('v074: no protection from inactive, missing or unequipped weapon; regular power still protects',async()=>{
  const {actor,weapon}=fixture(false);
  const e=(await attachPower(weapon,mkPower())).entry;
  actor.effects.push({id:'conc',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:e.id}}}});
  assert.equal(findUsableAttachedPower(actor,e.id),null);
  assert.equal(activeElementalGuards(actor).length,0);
  weapon.system.equipped=true;
  assert.equal(activeElementalGuards(actor).length,1);
  actor.effects[0].disabled=true;
  assert.equal(activeElementalGuards(actor).length,0);
  actor.effects[0].disabled=false;
  await detachPower(weapon,e.id);
  assert.equal(activeElementalGuards(actor).length,0);
  actor.items.set('ownpower',{id:'ownpower',type:'power',name:'Elemental Protection 2'});
  actor.effects.push({id:'ownconc',flags:{[SYS]:{concentrationPower:{itemId:'ownpower'}}}});
  assert.equal(selectElementalDefense({actor})?.guard.threshold,20);
});

test('v074: edit button in weapon/item, dialog connected, targeted GUI with edit and remove controls',async()=>{
  const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const html=readFileSync(new URL('../templates/item/parts/item-attached-powers.hbs',import.meta.url),'utf8');
  assert.match(html,/mm-attached-power-edit/);
  assert.match(html,/fa-pen/);
  assert.match(main,/editAttachedPower\(this\.item,id\)/);
  assert.match(main,/mm-attached-power-edit/);
  assert.match(readFileSync(new URL('../system.json',import.meta.url),'utf8'),/"version": "0\.2\.76"/);
});

test('v074: dialog allows element-only update and cancel does not alter power',async()=>{
  const {weapon}=fixture();
  const entry=(await attachPower(weapon,mkPower('Elemental Blast'))).entry;
  globalThis.foundry.applications={api:{DialogV2:{wait:async()=>null}}};
  assert.equal(await editAttachedPower(weapon,entry.id),null);
  assert.equal(getAttachedPowers(weapon)[0].data.system.element,'');
  globalThis.foundry.applications.api.DialogV2.wait=async({content,buttons})=>{
    assert.match(content,/Herdar elemento do portador/);
    assert.match(content,/Editando/);
    const edits=Object.fromEntries(['name','element','powerSet','action','cost','duration','range',
      'ability','attackTarget','attackKind','attackEdgeMode','attackMultiplier',
      'attackRange','prerequisites','trigger','formula','description','effect'].map(k=>[k,{value:''}]));
    edits.name.value='Elemental Blast';
    edits.element.value='fire';
    edits.effect.value='Chamas';
    return buttons[1].callback(null,{form:{elements:{namedItem:k=>edits[k]}}});
  };
  await editAttachedPower(weapon,entry.id);
  assert.equal(getAttachedPowers(weapon)[0].data.system.element,'fire');
  assert.equal(getAttachedPowers(weapon)[0].data.system.effect,'Chamas');
});

test('v074: per-turn Focus maintenance also resolves still-owned equipped power by ID',()=>{
  const source=readFileSync(new URL('../scripts/focus-maintenance.mjs',import.meta.url),'utf8');
  assert.match(source,/actor\.items\?\.get\?\.\(info\.itemId\) \?\? findUsableAttachedPower\(actor,info\.itemId\)/);
});
