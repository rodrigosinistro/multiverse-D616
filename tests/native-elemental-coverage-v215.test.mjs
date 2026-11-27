import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation} from '../scripts/native-power-automations.mjs';
import {confirmedRicochetDamage,isRicochetPower} from '../scripts/rico-shield-chain.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
import {getPowerDamageFactor} from '../scripts/power-fantastic-damage.mjs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';

const NATIVE='multiverse-d616';
const seven=[
 ['Elemental Barrage','reference-existing','elemental-damage-factor'],
 ['Elemental Burst','reference-existing','elemental-attack'],
 ['Elemental Grab','reference-existing','elemental-grab'],
 ['Elemental Prison','reference-existing','elemental-prison'],
 ['Elemental Push','reference-existing','elemental-push'],
 ['Elemental Ricochet','native-partial','elemental-ricochet'],
 ['Elemental Suffocation','reference-existing','elemental-suffocation'],
];
test('v215: 7 poderes elementais identificados pelo compêndio original sem macros executáveis privilegiadas',()=>{
 const original=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
 const registry=REGISTERED_AUTOMATIONS;
 assert.equal(registry.length,162);
 assert.equal(new Set(registry.map(x=>x.powerId)).size,registry.length);
 for(const [name,status,handlerId] of seven){
   const source=original.find(x=>x.name===name&&x.system.powerSet==='Elemental Control');
   assert.ok(source,`${name}: catálogo oficial`);
   const entry=registry.find(x=>x.powerName===name&&x.powerSet==='Elemental Control');
   assert.equal(entry?.powerId,source._id,`${name}: identidade real`);
   assert.equal(entry?.status,status);
   assert.equal(entry?.handlerId,handlerId);
   assert.deepEqual(resolveNativePowerAutomation({...source,type:'power'}),entry);
 }
 // A registry reference is only informational and never evaluates user-supplied JS.
 const script=readFileSync(new URL('../tools/build-native-macro-pack.py',import.meta.url),'utf8');
 assert.match(script,/showMacroInfo\(/);
 assert.doesNotMatch(script,/eval\(/);
});

test('reúso: Barrage mantém fator meio/inteiro e Grab preserva Ego contra Melee',()=>{
 assert.equal(getPowerDamageFactor('Elemental Barrage',{fantastic:false,enabled:true}),.5);
 assert.equal(getPowerDamageFactor('Elemental Barrage',{fantastic:true,enabled:true}),1);
 const original=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
 const grab=resolvePowerRoll(original.find(x=>x.name==='Elemental Grab'&&x.system.powerSet==='Elemental Control'));
 assert.equal(grab.ability,'ego');assert.equal(grab.attackTarget,'mle');
 assert.equal(grab.checkOnly,true);
});

test('ricochete de elemento não ativa poder homônimo de outro Power Set',()=>{
 assert.equal(isRicochetPower({type:'power',name:'Elemental Ricochet',system:{powerSet:'Elemental Control'}}),true);
 assert.equal(isRicochetPower({type:'power',name:'Elemental Ricochet',system:{powerSet:'Shield Bearer'}}),false);
 assert.equal(isRicochetPower({type:'power',name:'Rico-Shield',system:{powerSet:'Shield Bearer'}}),true);
 assert.equal(isRicochetPower({type:'power',name:'Rico-Shield',system:{powerSet:'Elemental Control'}}),false);
});

function receiptFixture(){
 const target='Scene.one.Token.foe',roll={total:18,options:{}};
 const flags={ricoShield:{version:1,lastTargetUuid:target,visited:[target]}};
 const source={id:'attack',rolls:[roll],getFlag(_ns,key){return flags[key];}};
 const item={name:'Elemental Ricochet',type:'power',system:{powerSet:'Elemental Control'}};
 const snapshot={sourceMessageId:source.id,rollSignature:rollSignature(roll),entries:[{targetUuid:target,hit:true,fantastic:true}]};
 const damageMessage={getFlag(_ns,key){return key==='damageApplication'?snapshot:null;}};
 const results=[{targetUuid:target,delta:7,blocked:false,heal:false}];
 const args={source,damageMessage,action:'full',results,actor:{id:'hero'},item};
 return {target,flags,snapshot,results,args};
}
test('ricochete depende de acerto resolvido e recibo atual, não de dano positivo',()=>{
 const f=receiptFixture();const check=()=>confirmedRicochetDamage(f.args);
 assert.equal(check(),true);
 f.args.action='heal';assert.equal(check(),false);
 f.args.action='half';assert.equal(check(),true);
 f.args.action='full';
 f.results[0].delta=0;assert.equal(check(),true,'dano zero por RD permite ricochetear');
 f.results[0].delta=7;f.results[0].blocked=true;assert.equal(check(),true,'bloqueio por escudo permite ricochetear');
 f.results[0].blocked=false;f.results[0].heal=true;assert.equal(check(),false);
 f.results[0].heal=false;
 f.results.splice(0);assert.equal(check(),false,'nenhuma resolução de alvo não libera ricochete');
 f.results.push({targetUuid:f.target,delta:0,blocked:true,heal:false});assert.equal(check(),true);
 f.results[0].targetUuid='Scene.one.Token.other';assert.equal(check(),false,'não aceita resultado de alvo diferente');
 f.results[0].targetUuid=f.target;assert.equal(check(),true);
 f.snapshot.entries=[{targetUuid:f.target,hit:false,fantastic:true}];assert.equal(check(),false);
 f.snapshot.entries=[{targetUuid:f.target,hit:true,fantastic:true}];
 f.snapshot.sourceMessageId='forged';assert.equal(check(),false);
 f.snapshot.sourceMessageId='attack';f.snapshot.rollSignature='stale';assert.equal(check(),false);
 f.snapshot.rollSignature=rollSignature(f.args.source.rolls[0]);
 f.flags.ricoShieldReady={confirmed:true};assert.equal(check(),false);
 delete f.flags.ricoShieldReady;f.flags.ricoShieldConsumed={};assert.equal(check(),false);
});
