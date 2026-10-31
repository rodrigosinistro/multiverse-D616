import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resetTurnState} from '../scripts/combat/turn-tracker-core.mjs';

const code=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
const pick=(start,end)=>{
  const a=code.indexOf(start),b=code.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,`Missing code ${start}`);
  return code.slice(a,b);
};
const implementation=[
  pick('function queueCombatantWrite(', '\nfunction serializeSpend('),
  pick('function turnResetKey(', '\nfunction tokenSceneId('),
  pick('function bonusOrderedIds(', '\nasync function consumeUltimateFantastic('),
].join('\n');

function setup({first='doctor',turn=0,bonusIds=['doctor'],spending={actionUsed:1,reactionUsed:1,movementUsed:4,movementExtraActionUsed:true},resetKey}={}) {
  const people=[
    {id:'doctor',state:{actionMax:1,reactionMax:1,movementMax:5,resetKey:resetKey??'encounter:regular:1:0:doctor',...spending}},
    {id:'zima',state:{actionUsed:1,reactionUsed:0,movementUsed:2,movementMax:5,resetKey:'encounter:bonus:1:1:zima'}},
  ];
  const combat={
    id:'encounter',started:true,round:1,turn,turns:people,
    combatants:new Map(people.map(p=>[p.id,p])),
    bonus:{active:true,eligibleIds:bonusIds}, updates:[],
    get combatant(){return this.turns[this.turn];},
    async unsetFlag(system,flag){assert.equal(flag,'bonusRound');this.bonus=null;},
    async update(change){this.updates.push(change); if('turn' in change)this.turn=change.turn;return this;},
    previousTurn(){throw new Error('unexpected previous turn');},nextTurn(){throw new Error('unexpected next turn');},
  };
  let writes=0;
  const context={
    Map,Promise,Set,Array,Number,String,
    pendingSpendWrites:new Map(),SYSTEM_ID:'multiverse-d616',BONUS_ROUND_FLAG:'bonusRound',
    game:{user:{id:'gm'}},
    ui:{notifications:{info(){}}},
    bonusRound:c=>c.bonus,
    isPrimaryGM:()=>true,
    stateFor:combatant=>({...combatant.state}),
    movementSpeedFor:()=>5,
    movementGrant:()=>null,
    clearMovementGrant:async()=>{},
    persistState:async(c,state)=>{writes++;c.state={...state};return true;},
    resetTurnState,
  };
  vm.createContext(context);
  vm.runInContext(implementation,context);
  return {combat,people,context,getWrites:()=>writes};
}

test('v105: fim da rodada bônus renova primeiro turno mesmo sem mudança do índice 0',async()=>{
  const {combat,people,context}=setup();
  assert.equal(combat.turn,0);
  await context.advanceBonusTurn(combat,1);
  assert.equal(combat.bonus,null);
  assert.deepEqual(JSON.parse(JSON.stringify(combat.updates)),[{turn:0}]);
  assert.equal(combat.combatant.id,'doctor');
  assert.equal(people[0].state.resetKey,'encounter:regular:1:0:doctor');
  assert.deepEqual([people[0].state.actionUsed,people[0].state.reactionUsed,people[0].state.movementUsed,people[0].state.movementExtraActionUsed],[0,0,0,false]);
  assert.equal(people[1].state.actionUsed,1,'outros combatentes permanecem intactos');
});

test('v105: bônus cria banco independente dos recursos da rodada normal',async()=>{
  const {combat,people,context}=setup({spending:{actionUsed:0,reactionUsed:0,movementUsed:0,movementExtraActionUsed:false}});
  await context.resetActiveCombatant(combat);
  assert.equal(people[0].state.resetKey,'encounter:bonus:1:0:doctor');
  people[0].state.actionUsed=1;people[0].state.reactionUsed=1;people[0].state.movementUsed=5;
  await context.advanceBonusTurn(combat,1);
  assert.equal(people[0].state.resetKey,'encounter:regular:1:0:doctor');
  assert.equal(people[0].state.actionUsed,0);
  assert.equal(people[0].state.reactionUsed,0);
  assert.equal(people[0].state.movementUsed,0);
});

test('v105: quando o último bônus termina em outro índice, só o primeiro da rodada 1 é renovado',async()=>{
  const {combat,people,context}=setup({turn:1,bonusIds:['zima']});
  await context.advanceBonusTurn(combat,1);
  assert.equal(combat.turn,0);
  assert.equal(people[0].state.actionUsed,0);
  assert.equal(people[1].state.actionUsed,1);
});

test('v105: gasto assíncrono anterior é finalizado antes da renovação',async()=>{
  const {combat,people,context}=setup();
  let release;
  const blocker=new Promise(resolve=>{release=resolve;});
  const spent=context.queueCombatantWrite('encounter','doctor',async()=>{
    await blocker;
    people[0].state.actionUsed=1; people[0].state.movementUsed=3;
  });
  const transition=context.advanceBonusTurn(combat,1);
  release();
  await Promise.all([spent,transition]);
  assert.equal(people[0].state.actionUsed,0);
  assert.equal(people[0].state.movementUsed,0);
  assert.equal(people[0].state.resetKey,'encounter:regular:1:0:doctor');
});

test('v105: o início da rodada bônus grava a chave bônus mesmo quando o turno não muda',()=>{
  const start=pick('async function maybeStartCombatAfterInitiative(', '\nfunction bonusOrderedIds(');
  assert.match(start,/await combat\.setFlag\(SYSTEM_ID, BONUS_ROUND_FLAG,/);
  assert.match(start,/if \(firstIndex >= 0 && Number\(combat\.turn\) !== firstIndex\)/);
  assert.match(start,/await resetActiveCombatant\(combat\);/);
  assert.ok(start.indexOf('await resetActiveCombatant(combat);') > start.indexOf('await combat.setFlag(SYSTEM_ID, BONUS_ROUND_FLAG'));
});
