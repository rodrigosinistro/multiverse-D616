import test from 'node:test';
import assert from 'node:assert/strict';
import { retireElementalFantasticEffect, replaceElementalEffect,
  cleanupExpiredElementalEffects, currentElementalEffectStart,
  hasElementalForceTrouble, findElementalSourceCombatant,
  shouldExpireElementalFantasticEffect } from '../scripts/elemental-fantastic.mjs';

const SYS = 'multiverse-d616';
const makeTurn = (round = 2, index = 0) => {
  const combatants = [
    { id: 'sentinela', actorId: 'sentinel', tokenId:'s-token', sceneId:'scene', actor:{ id:'sentinel', uuid:'Actor.sentinel' } },
    { id: 'thermal', actorId: 'thermal', tokenId:'t-token', sceneId:'scene', actor:{ id:'thermal',uuid:'Actor.thermal' } },
  ];
  return { id:'combat1', started:true, round, turn:index,
    combatants, combatant:combatants[index] };
};
function fixture(custom = 'forceTrouble', metadata = {}) {
  const actions=[];
  const effect={
    id:'elementalA',name:'Elemental — Force',img:'img.svg',disabled:false,
    statuses:new Set(), duration:{value:null,units:'seconds',expired:false},
    flags:{[SYS]:{elementalFantastic:{source:'fantastic',element:'force',custom,
      combatId:'combat1',appliedRound:2,sourceCombatantId:'sentinela',rounds:1,...metadata}}},
    async update(patch){actions.push(['update',this.id,patch]);
      if(patch.flags?.[SYS]) this.flags={...this.flags,...patch.flags};
      Object.assign(this,patch);return this;},
  };
  const all=[effect];
  const actor={id:'thermal',uuid:'Actor.thermal',effects:{contents:all,
    get(id){return all.find(e=>e.id===id);}, [Symbol.iterator](){return all[Symbol.iterator]();}},
    async deleteEmbeddedDocuments(_kind,ids){actions.push(['DELETE',ids]);throw Error('Should never delete registered effect');},
    async createEmbeddedDocuments(_kind,items){actions.push(['create',items]);return items;},
  };
  return {actor,effect,actions};
}
function gmWorld(combat){
  const prior={game:globalThis.game,CONFIG:globalThis.CONFIG};
  const gm={id:'gm',isGM:true,active:true};
  globalThis.game={user:gm,users:{find:()=>gm},combat,time:{worldTime:555}};
  globalThis.CONFIG={ActiveEffect:{expiryAction:'delete'}};
  return ()=>{globalThis.game=prior.game;globalThis.CONFIG=prior.CONFIG;};
}

test('Fonte do Elemental Burst: localizar Sentinela no card, não Thermal Prime alvo',()=>{
  const c=makeTurn();
  assert.equal(findElementalSourceCombatant(c,{scene:'scene',token:'s-token',actor:'sentinel'},'Actor.sentinel'),'sentinela');
  assert.equal(findElementalSourceCombatant(c,{actor:'sentinel'},'Actor.sentinel'),'sentinela');
  assert.equal(findElementalSourceCombatant(c,{scene:'scene',token:'t-token',actor:'thermal'},'Actor.thermal'),'thermal');
  assert.equal(findElementalSourceCombatant(c,{},null),null);
});

test('Force dura turno inteiro de Thermal e termina apenas quando volta o Sentinela na rodada seguinte',async()=>{
  const {actor,effect,actions}=fixture();const c=makeTurn();const done=gmWorld(c);
  c.combatants[1].actor=actor;
  try {
    assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
    c.round=3;c.turn=1;c.combatant=c.combatants[1];
    assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
    await cleanupExpiredElementalEffects(c);
    assert.equal(effect.disabled,false);
    assert.equal(hasElementalForceTrouble(actor),true);
    c.turn=0;c.combatant=c.combatants[0];
    assert.equal(shouldExpireElementalFantasticEffect(effect,c),true);
    await cleanupExpiredElementalEffects(c);
    assert.equal(effect.disabled,true);
    assert.equal(actions.length,1);
    assert.equal(actions[0][0],'update');
    assert.equal(hasElementalForceTrouble(actor),false);
    await cleanupExpiredElementalEffects(c);
    assert.equal(actions.length,1,'already retired effect must not be updated again');
  } finally {done();}
});

test('Earth usa o mesmo relógio vinculado ao agressor',()=>{
  const {effect}=fixture('halfMovement');const c=makeTurn(3,1);
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
  c.turn=0;c.combatant=c.combatants[0];
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),true);
});

test('Sem contagem durante retrocesso de iniciativa, troca de combate ou efeito manual',()=>{
  const {effect}=fixture();const c=makeTurn(1,0);
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
  c.id='another';c.round=6;
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
  c.id='combat1';c.round=3;
  effect.flags[SYS].elementalFantastic.source='manual';
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
});

test('Vários tokens de mesmo ator: origem utiliza token exato; em empate sem token não assume outro',()=>{
  const c=makeTurn();
  c.combatants.push({id:'sentinela2', actorId:'sentinel',tokenId:'s-token2',sceneId:'scene',actor:{id:'sentinel'}});
  assert.equal(findElementalSourceCombatant(c,{scene:'scene',token:'s-token2',actor:'sentinel'},'Actor.sentinel'),'sentinela2');
  assert.equal(findElementalSourceCombatant(c,{actor:'sentinel'},'Actor.sentinel'),null);
});

test('Remoção manual desativa Force sem deletar documento do gerenciador nativo',async()=>{
  const {actor,effect,actions}=fixture();
  assert.equal(await retireElementalFantasticEffect(actor,effect),true);
  assert.equal(effect.disabled,true);
  assert.equal(await retireElementalFantasticEffect(actor,effect),false);
  assert.equal(actions.length,1);
  assert.equal(actions[0][0],'update');
});

test('Reaplicar Force reinicia relógio e remove duração nativa de 1 round',async()=>{
  const {actor,effect,actions}=fixture();const c=makeTurn(5,0);const done=gmWorld(c);
  effect.disabled=true;
  effect.duration={value:1,units:'rounds',expired:true};
  try {
    const current=await replaceElementalEffect(actor,
      {custom:'forceTrouble',label:'Force',rounds:1},
      {key:'force',sourceActorUuid:'Actor.sentinel',sourceSpeaker:{actor:'sentinel',token:'s-token',scene:'scene'}});
    assert.equal(current.id,effect.id);
    assert.equal(effect.disabled,false);
    assert.equal(effect.duration.value,null,'native 1-round expiry must be disabled');
    assert.equal(effect.duration.expired,false);
    const flag=effect.flags[SYS].elementalFantastic;
    assert.equal(flag.sourceCombatantId,'sentinela');
    assert.equal(flag.combatId,'combat1');
    assert.equal(flag.appliedRound,5);
    assert.equal(actions.length,1);
    c.round=6;c.turn=1;c.combatant=c.combatants[1];
    assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
    c.turn=0;c.combatant=c.combatants[0];
    assert.equal(shouldExpireElementalFantasticEffect(effect,c),true);
  } finally {done();}
});

test('Não remove efeito errado se id/flags não correspondem',async()=>{
  const {actor,effect,actions}=fixture();
  assert.equal(await retireElementalFantasticEffect(actor,{...effect,id:'absent'}),false);
  effect.flags={};
  assert.equal(await retireElementalFantasticEffect(actor,effect),false);
  assert.deepEqual(actions,[]);
});

test('Fonte removida da iniciativa pode encerrar depois de ao menos uma rodada',()=>{
  const {effect}=fixture();const c=makeTurn(2,1);
  c.combatants=c.combatants.filter(c=>c.id!=='sentinela');
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
  c.round=3;
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),true);
});

test('Sem informação do agressor nunca expira erroneamente no turno do alvo',()=>{
  const {effect}=fixture('forceTrouble',{sourceCombatantId:null,sourceActorUuid:null});
  const c=makeTurn(3,1);
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
  c.turn=0;c.combatant=c.combatants[0];
  assert.equal(shouldExpireElementalFantasticEffect(effect,c),false);
});

test('hora de início fora de combate não cria IDs fantasmas',()=>{
  assert.deepEqual(currentElementalEffectStart(null,10),{
    time:10, combat:null,combatant:null,initiative:null,round:null,turn:null,
  });
});
