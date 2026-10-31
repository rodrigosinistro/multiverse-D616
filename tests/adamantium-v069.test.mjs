import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adamantiumEffectData, weaponAdamantiumValue, hasAdamantiumEffect,
        applyAdamantiumToHealthDr, ADAMANTIUM_CHANGE_KEY} from '../scripts/adamantium.mjs';
import {calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';

const effects = (...ratings) => ratings.map((rating) => ({
  name:'Adamantium', disabled:false,
  system:{changes:[{key:ADAMANTIUM_CHANGE_KEY,type:'add',value:rating}]},
}));
const weapon = (ratings=[1], equipped=true) => ({
  type:'weapon',system:{equipped},effects:effects(...ratings),
});

test('0.2.69 — cria Active Effect correto e editável sem transferir a RD ao portador', () => {
  const obj=adamantiumEffectData({uuid:'Actor.hero.Item.sword'});
  assert.equal(obj.name,'Adamantium');
  assert.equal(obj.disabled,false);
  assert.equal(obj.transfer,false);
  assert.equal(obj.origin,'Actor.hero.Item.sword');
  assert.equal(obj.type,'base');
  assert.deepEqual(obj.duration,{value:null,units:'seconds',expiry:null,expired:false});
  assert.deepEqual(obj.system.changes, [{
    key: ADAMANTIUM_CHANGE_KEY, type:'add', value:1,
    phase:'initial',priority:null,
  }]);
});

test('0.2.69 — escopo arma equipada, ignorando efeitos desativados', () => {
  assert.equal(hasAdamantiumEffect(weapon([1])),true);
  assert.equal(weaponAdamantiumValue(weapon([1])),1);
  assert.equal(weaponAdamantiumValue(weapon([1],false)),0);
  assert.equal(weaponAdamantiumValue({type:'power',system:{equipped:true},effects:effects(1)}),0);
  assert.equal(weaponAdamantiumValue({type:'weapon',system:{equipped:true},effects:[{...effects(1)[0],disabled:true}]}),0);
  assert.equal(weaponAdamantiumValue({type:'weapon',system:{equipped:true},effects:[{...effects(1)[0],isSuppressed:true}]}),0);
  assert.equal(weaponAdamantiumValue(weapon([1,2])),2); // não acumula
  assert.equal(weaponAdamantiumValue(weapon([1,'not-a-number'])),1);
  assert.equal(weaponAdamantiumValue(weapon([0])),0);
  assert.equal(weaponAdamantiumValue(weapon([-7])),0);
});

test('0.2.69 — Rd Health: neutraliza no máximo 1 sem diminuir valor real do alvo', () => {
  const target={system:{healthDamageReduction:3,focusDamageReduction:2}};
  const received=applyAdamantiumToHealthDr(target.system.healthDamageReduction,1,'health','weapon');
  assert.deepEqual(received,{originalDr:3,ignored:1,effectiveDr:2});
  assert.equal(target.system.healthDamageReduction,3);
  assert.deepEqual(applyAdamantiumToHealthDr(1,1,'health','weapon'),
    {originalDr:1,ignored:1,effectiveDr:0});
  assert.deepEqual(applyAdamantiumToHealthDr(1,2,'health','weapon'),
    {originalDr:1,ignored:1,effectiveDr:0});
  assert.deepEqual(applyAdamantiumToHealthDr(0,1,'health','weapon'),
    {originalDr:0,ignored:0,effectiveDr:0});
});

test('0.2.69 — nunca ignora Focus nem danos causados por poderes', () => {
  assert.equal(applyAdamantiumToHealthDr(2,1,'focus','weapon').effectiveDr,2);
  assert.equal(applyAdamantiumToHealthDr(2,1,'health','power').effectiveDr,2);
  assert.equal(applyAdamantiumToHealthDr(2,1,'health',undefined).effectiveDr,2);
  assert.equal(applyAdamantiumToHealthDr(2,0,'health','weapon').effectiveDr,2);
});

test('0.2.69 — usa RD efetiva no motor de dano, inclusive Fantastic', () => {
  const p={powerName:null,marvelDie:4,damageMultiplier:5,ability:2,bonus:0,enabled:false};
  const old=calculatePowerDamage({...p,damageReduction:3});
  const applied=applyAdamantiumToHealthDr(3,1,'health','weapon');
  const now=calculatePowerDamage({...p,damageReduction:applied.effectiveDr});
  assert.equal(old.damage,10);
  assert.equal(now.damage,14);
  assert.equal(now.damageReduction,2);
  assert.equal(now.rawDamage,22);
  const fantastic=calculatePowerDamage({...p,damageReduction:2,fantastic:true});
  assert.equal(fantastic.damage,28);
});

test('0.2.69 — integração: card congela valor por arma e exibe DR efetiva no dano', () => {
  const root=new URL('../',import.meta.url);
  const main=fs.readFileSync(new URL('multiverse-d616.mjs',root),'utf8');
  const template=fs.readFileSync(new URL('templates/item/item-weapon-sheet.hbs',root),'utf8');
  const helper=fs.readFileSync(new URL('scripts/damage-reduction-helper.js',root),'utf8');
  assert.match(template,/Adicionar Active Effect: Adamantium 1/);
  assert.match(template,/mm-add-adamantium-effect/);
  assert.match(main,/createEmbeddedDocuments\('ActiveEffect',\[adamantiumEffectData\(this\.item\)\]\)/);
  assert.match(main,/adamantiumHealthDrIgnore: this\.type === 'weapon' && this\.system\.equipped/);
  assert.match(main,/chatMessage\.getFlag\('multiverse-d616','adamantiumHealthDrIgnore'\) \?\? 0/);
  assert.match(main,/damageReduction:piercing\.effectiveDr/);
  assert.match(main,/originalDamageReduction: piercing\.originalDr/);
  assert.match(main,/adamantiumIgnored: piercing\.ignored/);
  assert.match(helper,/entry\.adamantiumIgnored/);
  const manifest=JSON.parse(fs.readFileSync(new URL('system.json',root),'utf8'));
  assert.equal(manifest.version,'0.2.106');
});
