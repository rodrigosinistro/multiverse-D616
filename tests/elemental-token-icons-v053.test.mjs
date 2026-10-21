import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceElementalEffect, retireElementalFantasticEffect, hasElementalForceTrouble } from '../scripts/elemental-fantastic.mjs';

function makeActor(custom = 'forceTrouble', existing = false) {
  const effects=[];
  const makeEffect = data => ({ id:'effect-one', ...data, async update(patch){ Object.assign(this,patch); return this; }});
  if (existing) effects.push(makeEffect({
    name:'Elemental — Force',img:'img.svg',showIcon:1,disabled:false,
    duration:{value:null,expired:false},statuses:new Set(),
    flags:{'multiverse-d616':{elementalFantastic:{source:'fantastic',element:'force',custom}}}
  }));
  const actor={id:'thermal',effects:{contents:effects,get(id){ return effects.find(e=>e.id===id); },[Symbol.iterator](){return effects[Symbol.iterator]();}},
    async createEmbeddedDocuments(_type,payload){ const next=makeEffect(payload[0]);effects.push(next);return [next]; }};
  return {actor,effects};
}
const configure = () => {
  const saved=globalThis.game;
  globalThis.game={combat:null,time:{worldTime:0}};
  return ()=>{globalThis.game=saved;};
};
const rule = (custom,label) => ({custom,label,rounds:1,icon:'systems/multiverse-d616/icons/four-elements.svg'});

test('Force recém-aplicado: Token recebe showIcon ALWAYS mesmo sem duração nativa',async()=>{
  const cleanup=configure();
  try {
    const {actor}=makeActor();
    const result=await replaceElementalEffect(actor,rule('forceTrouble','Force'),{key:'force'});
    assert.equal(result.showIcon,2);
    assert.equal(result.disabled,false);
    assert.deepEqual(result.statuses,[],'não inventar status para o Token HUD');
    assert.equal(result.duration.value,null,'não restaurar temporizador de uma rodada');
    assert.equal(hasElementalForceTrouble(actor),true);
    assert.equal(await retireElementalFantasticEffect(actor,result),true);
    assert.equal(result.disabled,true,'ícone desaparecerá junto com a desativação');
  } finally {cleanup();}
});

test('Earth recém-aplicado também ganha ícone visível no token',async()=>{
  const cleanup=configure();
  try {
    const {actor}=makeActor('halfMovement');
    const result=await replaceElementalEffect(actor,rule('halfMovement','Earth'),{key:'earth'});
    assert.equal(result.showIcon,2);
    assert.equal(result.duration.value,null);
    assert.equal(result.disabled,false);
  } finally {cleanup();}
});

test('Reaplicação atualiza efeito antigo que tinha showIcon condicional',async()=>{
  const cleanup=configure();
  try {
    const {actor,effects}=makeActor('forceTrouble',true);
    const original=effects[0];
    const result=await replaceElementalEffect(actor,rule('forceTrouble','Force'),{key:'force'});
    assert.strictEqual(result,original);
    assert.equal(result.showIcon,2);
    assert.equal(result.duration.value,null);
    assert.equal(effects.length,1);
  } finally {cleanup();}
});

test('Efeitos elementais de status padrão não ganham exibição forçada',async()=>{
  const cleanup=configure();
  try {
    const {actor}=makeActor();
    const result=await replaceElementalEffect(actor,{label:'Ice',statusId:'mmrpg.paralyzed',rounds:1,icon:'img.svg'},{key:'ice'});
    assert.equal(result.showIcon,undefined);
    assert.deepEqual(result.statuses,['mmrpg.paralyzed']);
    assert.equal(result.duration.value,1);
  } finally {cleanup();}
});
