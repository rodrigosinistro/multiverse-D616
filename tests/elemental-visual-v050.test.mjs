import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ELEMENTAL_TRAY_PREFIX, getElementalFantasticTrayEntries, findElementalFantasticTrayEffect,
} from '../scripts/condition-visuals.mjs';

const base = (id, custom, additional={}) => ({
  id,
  name: 'Elemental — Force',
  img: 'systems/multiverse-d616/icons/four-elements.svg',
  disabled: false,
  statuses: new Set(),
  flags: {'multiverse-d616':{elementalFantastic:{source:'fantastic',element:'force',custom,rounds:1}}},
  ...additional,
});

test('Force aparece no painel com nome e explicação de Trouble, sem criar um status nativo',()=>{
  const actor={effects:{contents:[base('force1','forceTrouble')]}};
  const entries=getElementalFantasticTrayEntries(actor);
  assert.equal(entries.length,1);
  assert.equal(entries[0].id, `${ELEMENTAL_TRAY_PREFIX}force1`);
  assert.match(entries[0].name, /Force.*Trouble/);
  assert.match(entries[0].description, /Trouble.*1 rodada/);
  assert.equal(actor.effects.contents[0].statuses.size,0);
  assert.equal(findElementalFantasticTrayEffect(actor,entries[0].id)?.id,'force1');
});

test('Earth também é identificado; efeito manual ou com status próprio não é duplicado',()=>{
  const actor={effects:[
    base('earth1','halfMovement'),
    base('manual','forceTrouble',{flags:{}}),
    base('native','forceTrouble',{statuses:new Set(['mmrpg.stunned'])}),
    base('disabled','halfMovement',{disabled:true}),
    base('expired','forceTrouble',{duration:{expired:true}}),
    base('other','aCustomWhichDoesNotExist'),
    base('prototype','toString'),
  ]};
  const entries=getElementalFantasticTrayEntries(actor);
  assert.equal(entries.length,1);
  assert.match(entries[0].name,/Earth.*Movimento reduzido/);
  assert.match(entries[0].description,/metade da velocidade/);
  assert.equal(findElementalFantasticTrayEffect(actor,`${ELEMENTAL_TRAY_PREFIX}manual`),null);
  assert.equal(findElementalFantasticTrayEffect(actor,`${ELEMENTAL_TRAY_PREFIX}native`),null);
  assert.equal(findElementalFantasticTrayEffect(actor,`${ELEMENTAL_TRAY_PREFIX}earth1`)?.id,'earth1');
});

test('identificadores devem pertencer ao próprio ator, não a outro token',()=>{
  const tokenA={effects:[base('actorA','forceTrouble')]};
  const tokenB={effects:[base('actorB','halfMovement')]};
  const id=`${ELEMENTAL_TRAY_PREFIX}actorA`;
  assert.equal(findElementalFantasticTrayEffect(tokenA,id)?.id,'actorA');
  assert.equal(findElementalFantasticTrayEffect(tokenB,id),null);
  assert.equal(findElementalFantasticTrayEffect(tokenA,'mmrpg.blinded'),null);
});

test('HUD usa entradas elementais para exibir/remover efeito, sem adicioná-las à paleta de condições',()=>{
  const source=readFileSync(new URL('../scripts/conditions-hud.js',import.meta.url),'utf8');
  const visuals=readFileSync(new URL('../scripts/condition-visuals.mjs',import.meta.url),'utf8');
  assert.match(source,/getElementalFantasticTrayEntries\(actor\)/);
  assert.match(source,/elementalById\.get\(sid\)/);
  assert.match(source,/findElementalFantasticTrayEffect\(actor, condId\)/);
  assert.match(source,/retireElementalFantasticEffect\(actor, effect\)/);
  assert.doesNotMatch(visuals, /CONFIG\.statusEffects\s*=/);
});
