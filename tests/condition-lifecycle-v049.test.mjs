import test from 'node:test';
import assert from 'node:assert/strict';

const registered = new Map();
globalThis.Hooks = {
  once(name, handler) {registered.set(`once:${name}`,handler);},
  on(name, handler) {registered.set(name,handler);},
};

const {isLaterCombatPosition,powerConditionExpiryDecision,
  expirePowerConditions,clearDependentsOnConcentration} = await import('../scripts/power-conditions.mjs');
const {breaksConcentration,interruptConcentrationForCondition,
  CONCENTRATION_BREAKING_CONDITIONS} = await import('../scripts/concentration.js');

function combat(round=1,turn=0){
  const combatants=[{id:'caster'},{id:'victim'},{id:'bystander'}];
  return {id:'c1',started:true,round,turn,combatants,combatant:combatants[turn]};
}
function flag(type='turn',anchorId='victim',initial='1:0:caster',extra={}) {
  return {combatId:'c1',expires:type,anchorId,initialPosition:initial,witnessedTargetTurn:'',...extra};
}
function setTurn(c,round,turn){c.round=round;c.turn=turn;c.combatant=c.combatants[turn];}

test('um turno de efeito aplicado fora do turno do alvo: marca começo e termina após o turno',()=>{
  const c=combat(),f=flag();
  assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,1,1);
  assert.equal(powerConditionExpiryDecision(f,c),null);
  f.witnessedTargetTurn='1:1:victim';
  assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,1,2);
  assert.equal(powerConditionExpiryDecision(f,c),true);
});
test('Reação: duração 1 turno já conta o turno em andamento do alvo (inclusive v0.2.48 legado)',()=>{
  const c=combat(2,1),f=flag('turn','victim','2:1:victim');
  assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,2,2);
  assert.equal(powerConditionExpiryDecision(f,c),true);
});
test('retroceder rodada/turno não encerra prematuramente uma condição',()=>{
  const c=combat(3,1),f=flag('turn','victim','3:0:caster',{witnessedTargetTurn:'3:1:victim'});
  setTurn(c,3,0);
  assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,2,2);
  assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,3,2);
  assert.equal(powerConditionExpiryDecision(f,c),true);
  assert.equal(isLaterCombatPosition('3:2:bystander','3:1:victim'),true);
});
test('efeito de rodada vence no próximo turno do agressor, não por reordenar iniciativa na mesma rodada',()=>{
  const c=combat(),f=flag('round','caster','1:0:caster');
  setTurn(c,1,2);assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,1,0);assert.equal(powerConditionExpiryDecision(f,c),false);
  setTurn(c,2,0);assert.equal(powerConditionExpiryDecision(f,c),true);
});
test('condição temporária de combatente removido da iniciativa não fica presa para sempre',()=>{
  const c=combat(3,1),f=flag();
  c.combatants.splice(1,1);c.combatant=c.combatants[0];
  assert.equal(powerConditionExpiryDecision(f,c),true);
  assert.equal(powerConditionExpiryDecision({...f,combatId:'outro'},c),false);
});
function mockWorld(){
  const gm={id:'gm',isGM:true};
  globalThis.game={user:gm,users:{activeGM:gm},actors:new Map(),scenes:new Map()};
}
test('expiração remove somente efeito do card original e preserva mesmo status manual',async()=>{
  mockWorld();const c=combat(2,0);
  const victim={uuid:'Actor.victim',effects:[
    {id:'card1',flags:{'multiverse-d616':{powerCondition:flag('round','caster')}}},
    {id:'manual',flags:{},statuses:['mmrpg.stunned']},
  ],async deleteEmbeddedDocuments(_t,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
  game.actors.set('victim',victim);
  await expirePowerConditions(c);
  assert.deepEqual(victim.effects.map(x=>x.id),['manual']);
});
test('perder Concentração remove efeitos dependentes em vários alvos, sem remover efeitos manuais ou de outro poder',async()=>{
  mockWorld();const caster={uuid:'Actor.caster'},victim={uuid:'Actor.victim',effects:[]};
  const dep=(id,concentrationEffectId)=>({id,statuses:['mmrpg.power-grabbed'],flags:{'multiverse-d616':{
    powerCondition:{sourceActorUuid:'Actor.caster',concentrationEffectId}}}});
  victim.effects=[dep('from-grab','con1'),dep('from-other','con2'),{id:'manual',statuses:['mmrpg.power-grabbed'],flags:{}}];
  victim.deleteEmbeddedDocuments=async (_type,ids)=>{
    victim.effects=victim.effects.filter(e=>!ids.includes(e.id));
  };
  game.actors.set('caster',caster);game.actors.set('victim',victim);
  await clearDependentsOnConcentration({id:'con1',parent:caster,flags:{'multiverse-d616':{
    concentrationPower:{itemId:'elemental-grab'}}}});
  assert.deepEqual(victim.effects.map(x=>x.id),['from-other','manual']);
});
test('Atordoado e Desmoralizado encerram a Concentração; outros estados não',async()=>{
  mockWorld();
  const createdEffect=(id)=>({statuses:new Set([id]),disabled:false});
  assert.equal(CONCENTRATION_BREAKING_CONDITIONS.has('mmrpg.stunned'),true);
  assert.equal(breaksConcentration(createdEffect('mmrpg.stunned')),true);
  assert.equal(breaksConcentration(createdEffect('mmrpg.demoralized')),true);
  assert.equal(breaksConcentration(createdEffect('mmrpg.bleeding')),false);
  const actor={uuid:'Actor.actor',statuses:new Set(['mmrpg.concentration.1']),effects:[
    {id:'generic',disabled:false,statuses:new Set(['mmrpg.concentration.1'])},
    {id:'con1',disabled:false,statuses:new Set(['mmrpg.concentration-power.p1']),flags:{'multiverse-d616':{
      concentrationPower:{itemId:'p1',countsTowardLevel:true}}}},
    {id:'manual',disabled:false,statuses:new Set(['mmrpg.power-grabbed'])},
  ],async toggleStatusEffect(id,{active}){
    if(!active){this.statuses.delete(id);this.effects=this.effects.filter(e=>!e.statuses?.has(id));}
  },async deleteEmbeddedDocuments(type,ids){
    assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id));
  }};
  const stun={parent:actor,disabled:false,statuses:new Set(['mmrpg.stunned'])};
  assert.equal(await interruptConcentrationForCondition(stun),true);
  assert.deepEqual(actor.effects.map(e=>e.id),['manual']);
  assert.equal(actor.statuses.has('mmrpg.concentration.1'),false);
  assert.equal(await interruptConcentrationForCondition(stun),false,'não interrompe duas vezes');
});

test('hooks de criação de Atordoado acionam interrupção, sem precisar clicar manualmente em Concentração',async()=>{
  mockWorld();
  const {registerConcentrationEffectHooks}=await import('../scripts/concentration.js');
  registerConcentrationEffectHooks();
  const actor={uuid:'Actor.stun',statuses:new Set(['mmrpg.concentration.1']),effects:[
    {id:'level',statuses:new Set(['mmrpg.concentration.1'])},
    {id:'powered',statuses:new Set(['mmrpg.concentration-power.p']),flags:{'multiverse-d616':{
      concentrationPower:{itemId:'p'}}}},
  ],async toggleStatusEffect(status,{active}){
    if(!active){this.statuses.delete(status);this.effects=this.effects.filter(e=>!e.statuses.has(status));}
  },async deleteEmbeddedDocuments(_kind,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
  registered.get('createActiveEffect')({parent:actor,statuses:new Set(['mmrpg.stunned'])});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(actor.effects.length,0);
  assert.equal(actor.statuses.has('mmrpg.concentration.1'),false);
});
