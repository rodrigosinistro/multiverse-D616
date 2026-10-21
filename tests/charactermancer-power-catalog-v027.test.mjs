import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  dedupePowerCatalog, reconcilePowerCatalog, prepareCharacterPowers,
  samePower, powerIdentity
} from '../apps/charactermancer/scripts/utils/mmc-power-catalog.mjs';

const P=(id,name,powerSet,effect,extra={})=>({
  _id:id,name,type:'power',system:{powerSet,effect,prerequisites:'',...extra},effects:[]
});
const src=readFileSync(new URL('../apps/charactermancer/scripts/charactermancer.js',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;

test('398 poderes auxiliares permanecem disponíveis, incluindo homônimos de diferentes conjuntos',()=>{
  assert.equal(catalog.length,398);
  assert.equal(dedupePowerCatalog(catalog).length,398);
  assert.ok(catalog.some(p=>p.name==='Flare'&&p.system.powerSet==='Magic'));
  assert.ok(catalog.some(p=>p.name==='Flare'&&p.system.powerSet==='Illusion'));
});
test('homônimos de conjuntos diferentes não são apagados',()=>{
  const a=P('a','Flare','Magic','Efeito A');
  const b=P('b','Flare','Illusion','Efeito B');
  assert.equal(reconcilePowerCatalog([a,b],[],[]).length,2);
  assert.equal(samePower(a,b),false);
  assert.notEqual(powerIdentity(a),powerIdentity(b));
});
test('variantes de mesmo nome e conjunto com efeitos distintos não são descartadas',()=>{
  const a=P('a','Steal Powers','Power Control','Um poder');
  const b=P('b','Steal Powers','Power Control','Todos os poderes');
  assert.equal(dedupePowerCatalog([a,b]).length,2);
  assert.equal(samePower(a,b),false);
});
test('a cópia de compêndio com mesmo ID mantém os Active Effects sem duplicar',()=>{
  const a=P('same','Mighty 2','Basic','Poder inicial');
  const p=P('same','Mighty 2','Basic','Poder atualizado');
  p.effects=[{name:'Mighty 2',changes:[{type:'upgrade',value:2}]}];
  const result=reconcilePowerCatalog([a],[p]);
  assert.equal(result.length,1);
  assert.equal(result[0].effects.length,1);
  assert.equal(result[0].system.effect,'Poder atualizado');
});
test('correção canônica de requisitos não é sobrescrita por compêndio antigo',()=>{
  const base=P('fix','Always Ready','Martial Arts','v2',{prerequisites:'Do This All Day'});
  const pack=P('fix','Alway Ready','Martial Arts','v1',{prerequisites:'Do This All Da'});
  const corrections=new Map([['fix',{name:'Always Ready',prerequisites:'Do This All Day'}]]);
  const found=reconcilePowerCatalog([base],[pack],[],corrections);
  assert.equal(found.length,1);
  assert.equal(found[0].name,'Always Ready');
  assert.equal(found[0].system.prerequisites,'Do This All Day');
});
test('poderes personalizados do Mundo têm preferência com identidade coincidente',()=>{
  const base=P('x','Elemental Blast','Elemental Control','Efeito base');
  const pack=P('x','Elemental Blast','Elemental Control','Efeito compêndio');
  const world=P('x','Elemental Blast','Elemental Control','Efeito personalizado');
  assert.equal(reconcilePowerCatalog([base],[pack],[world])[0].system.effect,'Efeito personalizado');
});
test('importação do Mundo com novo ID e mesmo conteúdo não duplica',()=>{
  const base=P('a','Elemental Burst','Elemental Control','Efeito X');
  const world=P('b','Elemental Burst','Elemental Control','Efeito X');
  assert.equal(reconcilePowerCatalog([base],[],[world]).length,1);
});
test('progressões numeradas usam maior nível por conjunto, mantendo homônimos em outros conjuntos',()=>{
  const powers=[
    P('a','Jump 1','Super-Strength','Salto de força'),
    P('b','Jump 2','Super-Strength','Salto maior'),
    P('c','Jump 1','Spider-Powers','Salto aracnídeo'),
    P('d','Jump 3','Spider-Powers','Salto aracnídeo maior')
  ];
  const result=prepareCharacterPowers([],powers);
  assert.deepEqual(new Set(result.map(p=>p._id)),new Set(['b','d']));
});
test('poderes concedidos e escolhidos são preservados quando não são o mesmo poder',()=>{
  const granted=P('grant','Flare','Illusion','Ofusca visão');
  const chosen=P('choice','Flare','Magic','Efeito místico');
  const both=prepareCharacterPowers([granted],[chosen]);
  assert.equal(both.length,2);
  assert.ok(both.includes(granted) && both.includes(chosen));
  assert.equal(prepareCharacterPowers([granted],[granted]).length,1);
});
test('Charactermancer compara versões escolhidas/concedidas por identidade, não só nome',()=>{
  assert.match(src,/const picked = \(this\.mmcState\.chosenPowers \|\| \[\]\)\.some\(x=>samePower\(x,p\)\)/);
  assert.match(src,/const granted = grantedPowers\.some\(x=>samePower\(x,p\)\)/);
  assert.match(src,/prepareCharacterPowers\(grantedPowers, this\.mmcState\.chosenPowers \|\| \[\]\)/);
  assert.match(src,/const tt = missingText \? ` title="Falta: \$\{missingText\}"`/);
});
