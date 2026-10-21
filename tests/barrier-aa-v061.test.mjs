import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.Hooks ??= {once(){},on(){}};
const {concentrationPowerEffectData, createOrRefreshConcentrationPowerEffect, usesNativeWallVisual} = await import('../scripts/concentration.js');
const S='multiverse-d616';
const item = (name,flags={})=>({id:'p1',uuid:'Actor.z.Item.p1',type:'power',name,
  img:'icons/svg/shield.svg',system:{powerSet:'Elemental Control',description:'Concentrado'},flags});

test('apenas barreiras físicas são reconhecidas como visuais nativos',()=>{
 assert.equal(usesNativeWallVisual(item('Elemental Barrier')),true);
 assert.equal(usesNativeWallVisual(item('Telekinetic Barrier')),true);
 for(const name of ['Elemental Protection 2','Elemental Sphere','Telekinetic Sphere','Elemental Prison','Shield Wall'])
  assert.equal(usesNativeWallVisual(item(name)),false,name);
});

test('ActiveEffect das duas Walls não tenta animar um stretchTo sem destino',()=>{
 for(const name of ['Elemental Barrier','Telekinetic Barrier']){
  const original={version:5,isEnabled:true,primary:{menuType:'range',video:{path:'jb2a.test'}}};
  const i=item(name,{autoanimations:original});
  const ef=concentrationPowerEffectData(i,true);
  assert.deepEqual(ef.flags.autoanimations,{isEnabled:false});
  assert.deepEqual(i.flags.autoanimations,original,'não altera o poder equipado');
  assert.equal(ef.flags[S].concentrationPower.itemId,i.id);
  assert.equal(ef.showIcon,2);
 }
});

test('demais poderes continuam copiando animações personalizadas e não recebem bloqueio global',()=>{
 const flags={autoanimations:{isEnabled:true,primary:{menuType:'ontoken'}}};
 const normal=concentrationPowerEffectData(item('Telekinetic Protection 2',flags),true);
 assert.deepEqual(normal.flags.autoanimations,flags.autoanimations);
 const noAnim=concentrationPowerEffectData(item('Body Sheet'),true);
 assert.equal(Object.hasOwn(noAnim.flags,'autoanimations'),false);
});

test('reativar barreira atualiza efeito de Concentração antigo em vez de duplicá-lo',async()=>{
 const i=item('Elemental Barrier',{autoanimations:{isEnabled:true}});
 const effect={id:'existing',disabled:false,statuses:new Set(),flags:{[S]:{concentrationPower:{itemId:i.id,transient:true}},autoanimations:{isEnabled:true}}};
 const state={creates:[],updates:[]};
 const actor={effects:[effect],
   updateEmbeddedDocuments:async(_type,updates)=>{state.updates.push(...updates);return updates;},
   createEmbeddedDocuments:async(_type,creates)=>{state.creates.push(...creates);return creates;}};
 await createOrRefreshConcentrationPowerEffect(actor,i);
 assert.equal(state.creates.length,0);
 assert.equal(state.updates.length,1);
 assert.equal(state.updates[0]._id,'existing');
 assert.equal(state.updates[0].flags.autoanimations.isEnabled,false);
 assert.ok(!Object.hasOwn(state.updates[0],'flags.-=autoanimations'));
});
