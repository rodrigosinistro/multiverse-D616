import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
import { confirmFaltineDamage, FLAME_DAMAGE,hasFaltineFlames,hasHealingFactor,
  healingAmount,nextHealingHealth,damageFromFaltine,getOngoingPowerTrayEntries,
  gmRemoveFlames,combatAdvanceInfo,processRecurringPowerTurn,extinguishFaltine,healOutsideCombat } from '../scripts/ongoing-power-effects.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const power=n=>catalog.find(p=>p.name===n);
const gm={id:'gm',isGM:true};
const makeRoll=(fantastic=true,total=23)=>{
  const d=n=>({results:[{result:n,active:true}]});
  return {total,options:{},terms:[{roll:{terms:[{rolls:[{dice:[d(3)]},
    {dice:[{constructor:{name:'MarvelDie'},results:[{result:fantastic?1:2,active:true}]}]},
    {dice:[d(3)]}]}]}}]};
};
function makeWorld(){
  const target={id:'t',name:'Vítima',uuid:'Actor.t',system:{health:{value:32,max:50},
    healthDamageReduction:0,abilities:{agl:{defense:16},res:{value:4}}},effects:[],items:[],
    async createEmbeddedDocuments(type,docs){assert.equal(type,'ActiveEffect');for(const d of docs){
      const obj={...d,id:`fx${this.effects.length+1}`,update:async function(changes){
        for(const [key,v] of Object.entries(changes)){
          if(key.includes('.')){
            const bits=key.split('.');let x=this;for(const k of bits.slice(0,-1))x=x[k]??=(k==='lastProcessedRound'?null:{});
            x[bits.at(-1)]=v;
          }else this[key]=v;
        }
      }};this.effects.push(obj);
    }},async update(changes){const hp=changes['system.health.value'];if(hp!==undefined)this.system.health.value=hp;},
    flags:{},getFlag(ns,k){return this.flags?.[ns]?.[k]},async setFlag(ns,k,v){(this.flags[ns]??={})[k]=v;},
    testUserPermission(){return true;},
  };
  const healing={id:'heal',name:'Healing Factor',type:'power'};
  const caster={id:'caster',name:'Feiticeiro',uuid:'Actor.caster',effects:[],items:new Map([['flame',{
    ...power('Flames of the Faltine'),id:'flame'
  }]])};
  const combatants=[{id:'cCaster',tokenId:'s',actor:caster},{id:'cVictim',tokenId:'v',actor:target}];
  const combat={id:'combat1',started:true,round:1,turn:0,previous:{round:1,turn:0},
    turns:combatants,combatants,combatant:combatants[0]};
  const flags={itemId:'flame',targets:[{uuid:'Scene.scene.Token.v'}],attackTarget:'agl'};
  const original={id:'original',speaker:{scene:'scene',token:'s',actor:'caster'},rolls:[makeRoll()],
    getFlag(ns,k){return flags[k]},async setFlag(ns,k,v){flags[k]=v;}};
  const card={id:'card',getFlag(ns,k){return k==='sourceMessageId'?'original':null;}};
  const tk={uuid:'Scene.scene.Token.v',documentName:'Token',actor:target,id:'v',parent:{id:'scene'}};
  const st={uuid:'Scene.scene.Token.s',documentName:'Token',actor:caster,id:'s',parent:{id:'scene'}};
  const scene={tokens:new Map([['v',tk],['s',st]])};
  const messages=[];
  globalThis.game={user:gm,users:{activeGM:gm},combat,actors:new Map([['victim',target],['caster',caster]]),
    scenes:new Map([['scene',scene]]),messages:new Map([['original',original]]),settings:{get(){return true}}};
  // switch groups ON, master OFF (see automationEnabled)
  game.settings.get=(system,key)=>key==='disableAllAutomations'?false:true;
  globalThis.fromUuid=async uuid=>uuid===tk.uuid?tk:null;
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),
    async create(p){messages.push(p);return p;}};
  globalThis.foundry={utils:{escapeHTML:t=>t}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
  globalThis.canvas={tokens:{controlled:[{actor:target,document:{id:'v'}}]}};
  return {target,caster,combat,combatants,original,card,flags,messages,healing};
}
test('catalog: Flames and Healing Factor have explicit recurring timing; attack metadata repaired',()=>{
 assert.equal(power('Flames of the Faltine').system.attack,false);
 assert.equal(resolvePowerRoll(power('Flames of the Faltine')).attack,true);
 assert.equal(resolvePowerRoll(power('Flames of the Faltine')).attackTarget,'agl');
 assert.match(power('Flames of the Faltine').system.effect,/final de cada rodada/);
 assert.match(power('Healing Factor').system.effect,/final do turno/);
 assert.equal(FLAME_DAMAGE,5);
});
test('Fantastic confirmation ignites exactly once, with no native Ablaze status or DR bypass',async()=>{
 const w=makeWorld();
 assert.equal(await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]),true);
 assert.equal(w.target.effects.length,1);
 assert.equal(hasFaltineFlames(w.target),true);
 assert.equal(w.target.effects[0].statuses.length,0);
 assert.equal(getOngoingPowerTrayEntries(w.target).length,1);
 assert.match(getOngoingPowerTrayEntries(w.target)[0].name,/Faltine/);
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 assert.equal(w.target.effects.length,1,'no duplicate on repeated Fantastic');
});
test('normal success, Fantastic failure, missing target and blocked attack do not ignite',async()=>{
 const w=makeWorld();
 w.original.rolls[0]=makeRoll(false);
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 assert.equal(w.target.effects.length,0);
 w.original.rolls[0]=makeRoll(true,2);
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 assert.equal(w.target.effects.length,0);
 w.original.rolls[0]=makeRoll(true);
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:0,blocked:true}]);
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.unknown',category:'health',delta:3}]);
 assert.equal(w.target.effects.length,0);
});
test('periodic flames tick exactly once at end of round, respecting DR and next round',async()=>{
 const w=makeWorld();w.target.system.healthDamageReduction=0;
 await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 w.combat.previous={round:1,turn:1};w.combat.round=2;w.combat.turn=0;w.combat.combatant=w.combatants[0];
 assert.equal((await processRecurringPowerTurn(w.combat,{round:2,turn:0})),true);
 assert.equal(w.target.system.health.value,27);
 assert.equal(w.target.effects[0].flags['multiverse-d616'].ongoingPower.lastProcessedRound,1);
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,27,'duplicate hook ignored');
 w.combat.previous={round:2,turn:0};w.combat.round=2;w.combat.turn=1;w.combat.combatant=w.combatants[1];
 await processRecurringPowerTurn(w.combat,{turn:1});
 assert.equal(w.target.system.health.value,27,'no burn at end of victim turn');
 w.target.system.healthDamageReduction=1;
 w.combat.previous={round:2,turn:1};w.combat.round=3;w.combat.turn=0;w.combat.combatant=w.combatants[0];
 await processRecurringPowerTurn(w.combat,{round:3,turn:0});
 assert.equal(w.target.system.health.value,27,'DR prevents flat 5');
});
test('Healing Factor works at end of turn, caps at max, never again on duplicate/rewind',async()=>{
 const w=makeWorld();w.target.items=[w.healing];w.target.system.health.value=46;
 assert.equal(hasHealingFactor(w.target),true);assert.equal(healingAmount(w.target),4);
 assert.equal(nextHealingHealth(w.target),50);
 w.combat.previous={round:1,turn:1};w.combat.round=2;w.combat.turn=0;w.combat.combatant=w.combatants[0];
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,50);
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,50);
 w.target.system.health.value=36;
 w.combat.previous={round:2,turn:1};w.combat.round=1;w.combat.turn=1;
 await processRecurringPowerTurn(w.combat,{round:1,turn:1});
 assert.equal(w.target.system.health.value,36,'rewind must never heal');
});
test('extinguish own Flames requires Standard Action, and GM manual removal is exact',async()=>{
 const w=makeWorld();await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 const fx=w.target.effects[0];
 const tracker={getState:()=>({actionUsed:0,actionMax:1}),async consumeAction(){return true;}};
 game.multiverseD616={turnTracker:tracker};
 w.combat.turn=1;w.combat.combatant=w.combatants[1];
 assert.equal(await extinguishFaltine(w.target),true);
 assert.equal(fx.disabled,true);
 assert.equal(hasFaltineFlames(w.target),false);
 assert.equal(await gmRemoveFlames(w.target,fx),false);
});
test('master disable stops new ignition and periodic automation, without blocking manual cleanup',async()=>{
 const w=makeWorld();await confirmFaltineDamage(w.card,'damage',[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}]);
 game.settings.get=(system,key)=>key==='disableAllAutomations';
 w.combat.previous={round:1,turn:1};w.combat.round=2;w.combat.turn=0;
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,32);
 assert.equal(await gmRemoveFlames(w.target,w.target.effects[0]),true);
 assert.equal(w.target.effects[0].disabled,true);
});

test('manual Healing Factor outside combat restores one turn-equivalent and respects maximum',async()=>{
 const w=makeWorld();w.target.items=[w.healing];w.target.system.health.value=47;
 w.combat.started=false;
 assert.equal(await healOutsideCombat(w.target),true);
 assert.equal(w.target.system.health.value,50);
 assert.equal(await healOutsideCombat(w.target),false);
 assert.equal(w.messages.length,1);
});
test('repeat the same round after later healing must not heal a second time',async()=>{
 const w=makeWorld();w.target.items=[w.healing];w.target.system.health.value=20;
 w.combat.previous={round:1,turn:1};w.combat.round=2;w.combat.turn=0;w.combat.combatant=w.combatants[0];
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,24);
 w.combat.previous={round:2,turn:1};w.combat.round=3;w.combat.turn=0;
 await processRecurringPowerTurn(w.combat,{round:3,turn:0});
 assert.equal(w.target.system.health.value,28);
 w.combat.previous={round:1,turn:1};w.combat.round=2;w.combat.turn=0;
 await processRecurringPowerTurn(w.combat,{round:2,turn:0});
 assert.equal(w.target.system.health.value,28,'rewind+replay cannot double-heal old rounds');
});
test('reapply after extinguishing reuses ActiveEffect instead of leaking duplicates',async()=>{
 const w=makeWorld();const damage=[{targetUuid:'Scene.scene.Token.v',category:'health',delta:3}];
 await confirmFaltineDamage(w.card,'damage',damage);
 assert.equal(await gmRemoveFlames(w.target,w.target.effects[0]),true);
 w.original.id='secondCast';game.messages.set('secondCast',w.original);
 await confirmFaltineDamage(w.card,'damage',damage);
 assert.equal(w.target.effects.length,1);
 assert.equal(hasFaltineFlames(w.target),true);
});
