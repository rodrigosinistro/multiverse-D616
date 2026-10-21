import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {endConcentrationOnLastEscape,endUnneededHellfireConcentration} from '../scripts/held-concentration.mjs';

const SYS='multiverse-d616';
function fixture(power='Hellfire Chains'){
 const concentration={id:'conc',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'held'}}}};
 const unrelated={id:'other',disabled:false,flags:{[SYS]:{concentrationPower:{itemId:'different'}}}};
 const caster={id:'caster',uuid:'Actor.caster',items:new Map(),effects:[concentration,unrelated],deleted:[],
  async deleteEmbeddedDocuments(type,ids){this.deleted.push(...ids);this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 function cond(id,status,who){return {id,disabled:false,flags:{[SYS]:{powerCondition:{powerName:power,status,sourceActorUuid:caster.uuid,
     sourceItemId:'held',concentrationEffectId:'conc',recipientUuid:who}}}};}
 const target1={id:'t1',uuid:'Actor.t1',effects:[]},target2={id:'t2',uuid:'Actor.t2',effects:[]};
 const t1=cond('a','grabbed','Token.a'),t2=cond('b','paralyzed','Token.a'),t3=cond('c','grabbed','Token.b');
 target1.effects=[t1,t2];target2.effects=[t3];
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:new Map([['a',caster],['b',target1],['c',target2]]),scenes:new Map()};
 return {caster,target1,target2,t1,t2,t3,concentration};
}
test('apagar apenas Paralisado não interrompe Concentracao enquanto Agarrado permanece',async()=>{
 const e=fixture();e.target1.effects.splice(1,1);
 assert.equal(await endConcentrationOnLastEscape(e.t2),false);
 assert.deepEqual(e.caster.deleted,[]);
});
test('liberar um alvo não remove Conc enquanto outro ainda está preso',async()=>{
 const e=fixture();e.target1.effects=[];
 assert.equal(await endConcentrationOnLastEscape(e.t1),false);
 assert.ok(e.caster.effects.includes(e.concentration));
});
test('última contenção removida encerra APENAS o poder de origem',async()=>{
 const e=fixture();e.target1.effects=[];e.target2.effects=[];
 assert.equal(await endConcentrationOnLastEscape(e.t3),true);
 assert.deepEqual(e.caster.deleted,['conc']);
 assert.equal(e.caster.effects.length,1);
 assert.equal(e.caster.effects[0].id,'other');
});
test('condição manual ou poder não associado não encerra concentração',async()=>{
 const e=fixture();e.target1.effects=[];e.target2.effects=[];
 const manual={flags:{},id:'manual'};
 assert.equal(await endConcentrationOnLastEscape(manual),false);
 assert.deepEqual(e.caster.deleted,[]);
});
test('Hellfire Chains normal encerra a Concentração ociosa, mas preserva alvos presos',async()=>{
 const e=fixture();
 assert.equal(await endUnneededHellfireConcentration(e.caster.uuid,'held'),false);
 e.target1.effects=[];e.target2.effects=[];
 assert.equal(await endUnneededHellfireConcentration(e.caster.uuid,'held'),true);
 assert.deepEqual(e.caster.deleted,['conc']);
});
test('automação não modifica nada quando não executada pelo GM ativo',async()=>{
 const e=fixture();e.target1.effects=[];e.target2.effects=[];
 game.user.isGM=false;
 assert.equal(await endConcentrationOnLastEscape(e.t1),false);
 assert.deepEqual(e.caster.deleted,[]);
});
test('cards separados de repetição e Focus condicionado ao clique em DAMAGE',()=>{
 const loop=fs.readFileSync(new URL('../scripts/repeat-power-attacks.mjs',import.meta.url),'utf8');
 const damage=fs.readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(loop,/followUpCardId/);
 assert.match(loop,/repeatAttackFollowUpReady/);
 assert.match(loop,/confirmHeldHellfireHealthDamage/);
 assert.match(damage,/await confirmHeldHellfireHealthDamage\(message,action,results\)/);
 assert.doesNotMatch(loop,/sofre \$\{damage\.damage\} de dano Focus/);
});
