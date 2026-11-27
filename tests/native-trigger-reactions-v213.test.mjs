import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation} from '../scripts/native-power-automations.mjs';
import {nativeGuardReactionRule,checkNativeGuardReaction,nativeGuardReactionCard,declareNativeGuardReaction}
  from '../scripts/native-power-reactive-guards.mjs';
import {isNativeReactiveDodge} from '../scripts/native-power-spider-defenses.mjs';

const cases=[
  {set:'Resize',name:'Shrinking Dodge',effect:'shrink-dodge',focus:5},
  {set:'Melee Weapons',name:'Riposte',effect:'riposte',focus:0},
  {set:'Ranged Weapons',name:'Point-Blank Parry',effect:'point-blank-parry',focus:5},
];
const actor=()=>({id:'hero',uuid:'Actor.hero',system:{focus:{value:30,max:50},attributes:{rank:{value:4}}},
  updates:[],async update(v){this.updates.push(v);this.system.focus.value=v['system.focus.value'];}});
const power=(row,a)=>({type:'power',id:`local-${row.name}`,name:row.name,img:'power.webp',actor:a,
  system:{powerSet:row.set,action:'Reaction',duration:'Instant',cost:row.focus?'5 Focus':'',
    description:`Descrição OFICIAL ${row.name}`,effect:`Efeito OFICIAL ${row.name}`,trigger:'Após o ataque'}});
function setup({reactionUsed=0,reactionMax=1,authorized=true,failChat=false}={}){
  const a=actor(),combat={id:'combat',started:true,combatants:[{id:'ct',actorId:'hero',actor:a,tokenId:'t1'}]};
  const log={taken:0,refunded:0,cards:[]};
  const tracker={getState:()=>({reactionUsed,reactionMax}),
    trackItemUse:async()=>{log.taken++;return authorized;},
    refundReaction:async()=>{log.refunded++;return true;}};
  const opts={combat,tracker,speaker:()=>({alias:'Herói'}),applyMode:x=>x,
    createMessage:async data=>{if(failChat)throw new Error('Chat indisponível');log.cards.push(data);return data;}};
  return {a,combat,log,opts};
}

test('v213 reactions retained among 162 macros; 3 official scoped post-trigger reactions, no neighboring power hijack',()=>{
  assert.equal(REGISTERED_AUTOMATIONS.length,162);
  assert.equal(new Set(REGISTERED_AUTOMATIONS.map(r=>r.powerId)).size,162);
  assert.equal(new Set(REGISTERED_AUTOMATIONS.map(r=>`${r.powerSet}/${r.powerName}`)).size,162);
  for(const row of cases){
    const p=power(row,actor()),entry=resolveNativePowerAutomation(p);
    assert.equal(entry.handlerId,'reactive-guard');assert.equal(entry.status,'native-partial');
    assert.equal(nativeGuardReactionRule(p)?.effect,row.effect);
    assert.equal(isNativeReactiveDodge(p),false);
  }
  for(const p of [power({...cases[0],set:'Magic'},actor()),power({...cases[1],set:'Martial Arts'},actor()),
    power({...cases[2],set:'Melee Weapons'},actor())])assert.equal(nativeGuardReactionRule(p),null);
});

test('v213 all cards include official Item text; original attack is never rerolled automatically',()=>{
  for(const row of cases){
    const c=nativeGuardReactionCard(power(row,actor()),row.focus);
    assert.match(c.content,new RegExp(`Descrição OFICIAL ${row.name}`));
    assert.match(c.content,new RegExp(`Efeito OFICIAL ${row.name}`));
    assert.match(c.content,/Reação declarada após o gatilho/);
    assert.match(c.content,/Focus gasto:/);
  }
  assert.match(nativeGuardReactionCard(power(cases[0],actor()),5).content,/TROUBLE/);
  assert.match(nativeGuardReactionCard(power(cases[1],actor()),0).content,/MANUALMENTE/);
  assert.match(nativeGuardReactionCard(power(cases[2],actor()),5).content,/2 espaços/);
});

test('v213 Shrinking Dodge spends 5 Focus + one Reaction and posts exactly one descriptive card',async()=>{
  const f=setup();await declareNativeGuardReaction(power(cases[0],f.a),f.opts);
  assert.deepEqual([f.log.taken,f.log.refunded,f.log.cards.length,f.a.system.focus.value],[1,0,1,25]);
  assert.match(f.log.cards[0].content,/card ORIGINAL/);
});

test('v213 Riposte is 0 Focus + one Reaction, with manual attack but NO duplicate Standard cost',async()=>{
  const f=setup();await declareNativeGuardReaction(power(cases[1],f.a),f.opts);
  assert.deepEqual([f.log.taken,f.log.refunded,f.log.cards.length,f.a.updates.length],[1,0,1,0]);
  assert.match(f.log.cards[0].content,/sem cobrar uma Ação Standard adicional/);
});

test('v213 Point-Blank Parry spends 5 Focus + one Reaction, with no automatic damage',async()=>{
  const f=setup();await declareNativeGuardReaction(power(cases[2],f.a),f.opts);
  assert.deepEqual([f.log.taken,f.log.refunded,f.log.cards.length,f.a.system.focus.value],[1,0,1,25]);
  assert.match(f.log.cards[0].content,/Nenhuma rolagem ou dano é aplicado automaticamente/);
});

test('v213 rejected/exhausted Reaction never spends Focus, never posts a card',async()=>{
  for(const row of cases){
    const f=setup({reactionUsed:1});const p=power(row,f.a);
    assert.equal(checkNativeGuardReaction(f.a,p,{combat:f.combat,tracker:f.opts.tracker}).ok,false);
    await assert.rejects(declareNativeGuardReaction(p,f.opts),/Reação disponível/);
    assert.deepEqual([f.log.taken,f.log.cards.length,f.a.system.focus.value],[0,0,30]);
    const g=setup({authorized:false});
    await assert.rejects(declareNativeGuardReaction(power(row,g.a),g.opts),/não foi autorizada/);
    assert.equal(g.a.system.focus.value,30);assert.equal(g.log.cards.length,0);
  }
});

test('v213 failed card publication refunds only the Focus and the Reaction actually used',async()=>{
  for(const row of cases){
    const f=setup({failChat:true});
    await assert.rejects(declareNativeGuardReaction(power(row,f.a),f.opts),/Chat indisponível/);
    assert.equal(f.a.system.focus.value,30);
    assert.deepEqual([f.log.taken,f.log.refunded,f.log.cards.length],[1,1,0]);
    assert.equal(f.a.updates.length,row.focus?2:0);
  }
});

test('v213 cannot activate after cancellation of combat or with missing caster',async()=>{
  const f=setup();f.combat.started=false;
  await assert.rejects(declareNativeGuardReaction(power(cases[0],f.a),f.opts),/combate ativo/);
  assert.equal(f.a.system.focus.value,30);
  const p=power(cases[1],null);
  await assert.rejects(declareNativeGuardReaction(p,f.opts),/Personagem não identificado/);
});
