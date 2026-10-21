import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {POWER_CONDITIONS,conditionsForOutcome,mustConfirmPowerDamage} from '../scripts/power-conditions.mjs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
import {wallDocuments} from '../scripts/elemental-wall-geometry.mjs';
import {getPowerDamageFactor} from '../scripts/power-fantastic-damage.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const manifest=JSON.parse(readFileSync(resolve(root,'system.json'),'utf8'));
const catalog=JSON.parse(readFileSync(resolve(root,'apps/charactermancer/data/powers.json'),'utf8')).items;
const byName=name=>catalog.find(item=>item.name===name);
const normal={success:true,fantastic:false},fantastic={success:true,fantastic:true};
test('v0.2.68: Banging Heads aplica Caído apenas após confirmar dano no alvo correto',()=>{
 const entries=catalog.filter(i=>i.name==='Banging Heads');assert.equal(entries.length,2);
 assert.equal(mustConfirmPowerDamage('Banging Heads'),true);
 assert.deepEqual(conditionsForOutcome('Banging Heads',normal),[]);
 assert.deepEqual(conditionsForOutcome('Banging Heads',fantastic).map(e=>e.status),['prone']);
 assert.deepEqual(conditionsForOutcome('Banging Heads',{success:false,fantastic:true}),[]);
});
test('v0.2.68: Deafen não causa dano comum, Surdo dura um turno, Fantástico permite dano',()=>{
 const item=byName('Deafen');assert.ok(item);
 const roll=resolvePowerRoll(item);
 assert.equal(roll.ability,'ego');assert.equal(roll.attackTarget,'vig');
 assert.equal(roll.checkOnly,true);assert.equal(roll.attack,false);assert.equal(roll.fantasticDamage,true);
 assert.equal(mustConfirmPowerDamage('Deafen'),false);
 for(const outcome of [normal,fantastic])assert.deepEqual(conditionsForOutcome('Deafen',outcome).map(e=>[e.status,e.expires]),[['deafened','turn']]);
 assert.deepEqual(conditionsForOutcome('Deafen',{success:false,fantastic:true}),[]);
});
test('v0.2.68: Flare, Dazzle e Deafen só causam dano normal em Fantástico',()=>{
 for(const name of ['Flare','Dazzle','Deafen']){
  const resolved=resolvePowerRoll(byName(name));
  assert.equal(resolved.fantasticDamage,true,name);
  assert.equal(resolved.checkOnly,true,name);
  assert.equal(getPowerDamageFactor(name,{fantastic:false,enabled:true}),0,name);
  assert.equal(getPowerDamageFactor(name,{fantastic:true,enabled:true}),1,name);
 }
});
test('v0.2.68: paredes usam constantes de sentidos v14, sem modificar geometria e visuais',()=>{
 const old=globalThis.CONST;
 try{
  Object.defineProperty(globalThis,'CONST',{configurable:true,value:{WALL_MOVEMENT_TYPES:{NORMAL:20},EDGE_SENSE_TYPES:{NONE:0}}});
  const docs=wallDocuments('Elemental Barrier',{x:300,y:300},{x:600,y:300},{grid:{distance:5,size:100}},{concentrationId:'e1'});
  assert.equal(docs.wall.move,20);assert.equal(docs.wall.sight,0);assert.equal(docs.wall.light,0);assert.equal(docs.wall.sound,0);
  assert.equal(docs.template.t,'ray');assert.equal(docs.template.distance,15);
  const source=readFileSync(resolve(root,'scripts/elemental-wall-geometry.mjs'),'utf8');
  assert.doesNotMatch(source,/WALL_SENSE_TYPES/);
 } finally{if(old===undefined)delete globalThis.CONST;else globalThis.CONST=old;}
});
test('v0.2.68: manifesto GitHub e referências a artefatos internos prontos para release',()=>{
 assert.equal(manifest.id,'multiverse-d616');assert.equal(manifest.version,'0.2.68');
 assert.equal(manifest.download,'https://github.com/rodrigosinistro/multiverse-D616/releases/download/v0.2.68/multiverse-d616-v0.2.68.zip');
 assert.ok(manifest.manifest.endsWith('/main/system.json'));
 const refs=[...manifest.esmodules,...manifest.styles,...manifest.languages.map(l=>l.path),...manifest.packs.map(p=>p.path),manifest.background,manifest.readme,manifest.license,manifest.changelog];
 for(const name of refs){assert.equal(typeof name,'string');assert.ok(name);const local=name.startsWith('systems/multiverse-d616/')?name.slice('systems/multiverse-d616/'.length):name;const absolute=resolve(root,local);assert.ok(absolute.startsWith(root+'/'));assert.ok(existsSync(absolute),`Faltando: ${name}`);}
});
