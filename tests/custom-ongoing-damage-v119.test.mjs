import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCustomRule,executeCustomRule,processCustomOngoingDamageTurn,clearCustomConditionCombat,
  CUSTOM_ONGOING_RESOURCES,getCustomRules} from '../scripts/custom-automations.mjs';
const SYSTEM='multiverse-d616';
const effect=(extra={})=>({effectType:'ongoingDamage',ongoingAmount:5,ongoingResource:'health',ongoingTurns:3,...extra});
const rule=(extra={})=>normalizeCustomRule({id:'r119',name:'Fogo persistente',trigger:'targetHit',
  powerName:'Elemental Blast',effects:[effect()],...extra});
let i=0;
function setup(){
  const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage,ui:globalThis.ui};
  const notes=[],calls=[];
  const actor={uuid:`Actor.target${++i}`,id:'target',name:'Garras',effects:[],statuses:new Set(),
    async createEmbeddedDocuments(_kind,docs){for(const doc of docs){
      const inst={...doc,id:`ef-${this.effects.length+1}`,
        async update(values){for(const [path,value] of Object.entries(values)){
          const keys=path.split('.');let pointer=this;
          for(const key of keys.slice(0,-1))pointer=pointer[key]??={};
          pointer[keys.at(-1)]=value;
        }} };
      this.effects.push(inst);
    }},
    async deleteEmbeddedDocuments(_kind,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));},
  };
  const combatant={id:'c-target',sceneId:'s1',tokenId:'t-target',actor};
  const combat={id:`combat-${i}`,round:1,turn:0,started:true,combatant,combatants:[combatant]};
  const game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat,
    actors:new Map([['target',actor]]),scenes:new Map(),messages:[],
    multiverseD616:{applyCustomRecurringDamage:async data=>{calls.push(data);return {applied:true,delta:data.amount,dr:0};}}};
  globalThis.game=game;
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),
    async create(data){notes.push(data);return data;}};
  globalThis.ui={notifications:{warn:()=>{}}};
  return {actor,game,combat,combatant,calls,notes,restore(){Object.assign(globalThis,old);}};
}
function tick(f,round){f.combat.round=round;f.combat.turn=0;}

test('v119: schema supports Health/Focus and bounded 1..20 ticks; old worlds migrate',()=>{
  assert.equal(CUSTOM_ONGOING_RESOURCES.focus,'Focus');
  assert.equal(rule().effects[0].ongoingAmount,5);
  assert.equal(rule({effects:[effect({ongoingResource:'focus',ongoingTurns:20})]}).effects[0].ongoingTurns,20);
  for(const property of ['ongoingAmount','ongoingTurns'])for(const value of [0,-1,1.2,101,'invalid'])
    assert.throws(()=>rule({effects:[effect({[property]:value})]}),/dano contínuo|Duração do dano contínuo/i);
  assert.throws(()=>rule({effects:[effect({ongoingTurns:21})]}),/Duração/);
  assert.throws(()=>rule({effects:[effect({ongoingResource:'karma'})]}),/Recurso/);
  assert.throws(()=>normalizeCustomRule({name:'passiva',trigger:'passiveAttack',powerName:'Fast Fists',effects:[effect()]}),/passivo/);
  const previous=normalizeCustomRule({id:'old',name:'Antiga',trigger:'powerRoll',powerName:'Fast Attacks',effectType:'chat',message:'Oi'});
  assert.equal(previous.effects.length,1);
  assert.equal(previous.effectType,'chat');
  const settings={get:(_ns,key)=>key==='customAutomationRules'?[previous,rule()]:true};
  assert.equal(getCustomRules(settings).length,2);
});

test('v119: schedules a target effect on combatant, never damages immediately, does not stack same rule',async()=>{
  const f=setup();try{
    const r=rule();
    const ctx={targetTokenUuid:'Scene.s1.Token.t-target',effectIndex:0};
    assert.equal(await executeCustomRule({...r,...r.effects[0]},f.actor,ctx),true);
    assert.equal(f.calls.length,0);
    assert.equal(f.actor.effects.length,1);
    const meta=f.actor.effects[0].flags[SYSTEM].customAutomationOngoing;
    assert.equal(meta.total,3);assert.equal(meta.amount,5);assert.equal(meta.anchorId,'c-target');
    assert.equal(await executeCustomRule({...r,...r.effects[0]},f.actor,ctx),false);
    assert.equal(f.actor.effects.length,1);
    assert.equal(await executeCustomRule({...r,...r.effects[0]},f.actor,{...ctx,effectIndex:1}),true,
      'distinct steps in one sequence have separate timing');
    assert.equal(f.actor.effects.length,2);
  }finally{f.restore();}
});

test('v119: ticks exactly three times, one per start; chat shows resource and remaining duration',async()=>{
  const f=setup();try{
    const r=rule({effects:[effect({ongoingResource:'focus',ongoingTurns:3})]});
    await executeCustomRule({...r,...r.effects[0]},f.actor,{targetTokenUuid:'Scene.s1.Token.t-target'});
    tick(f,2);
    assert.equal(await processCustomOngoingDamageTurn(f.combat),1);
    assert.equal(await processCustomOngoingDamageTurn(f.combat),0);
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].resource,'focus');
    assert.match(f.notes[0].content,/Focus/);assert.match(f.notes[0].content,/2 turnos restantes/);
    tick(f,3);assert.equal(await processCustomOngoingDamageTurn(f.combat),1);
    assert.match(f.notes[1].content,/1 turno restante/);
    tick(f,4);assert.equal(await processCustomOngoingDamageTurn(f.combat),1);
    assert.match(f.notes[2].content,/efeito encerrado/);
    assert.equal(f.actor.effects.length,0);
    assert.equal(f.calls.length,3);
  }finally{f.restore();}
});

test('v119: deferred when MMDR missing, zero damage ticks still count, cleanup deletes on end combat',async()=>{
  const f=setup();try{
    const r=rule({effects:[effect({ongoingTurns:2})]});
    await executeCustomRule({...r,...r.effects[0]},f.actor,{targetTokenUuid:'Scene.s1.Token.t-target'});
    tick(f,9);
    const old=console.error;console.error=()=>{};
    try{delete f.game.multiverseD616.applyCustomRecurringDamage;
      assert.equal(await processCustomOngoingDamageTurn(f.combat),0);
    }finally{console.error=old;}
    assert.equal(f.actor.effects.length,1);
    f.game.multiverseD616.applyCustomRecurringDamage=async ()=>({applied:true,delta:0,dr:2});
    tick(f,10);
    assert.equal(await processCustomOngoingDamageTurn(f.combat),1);
    assert.match(f.notes[0].content,/0 de dano/);
    assert.equal(await clearCustomConditionCombat(f.combat),1);
    assert.equal(f.actor.effects.length,0);
  }finally{f.restore();}
});

test('v119: editor supports first and extra recurring effects with auto-save snapshots',()=>{
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
  assert.match(ui,/data-ongoing-effect/);assert.match(ui,/data-extra-ongoing/);
  assert.match(ui,/data-effect-field="ongoingAmount"/);
  assert.match(ui,/ongoingAmount:field\('ongoingAmount'\)/);
  assert.match(ui,/'ongoingAmount','ongoingTurns','ongoingResource'/);
  assert.match(mmdr,/export async function applyCustomRecurringDamage/);
  assert.match(mmdr,/await applyExactEntries\(\[entry\]/);
  assert.match(mmdr,/applyCustomRecurringDamage = applyCustomRecurringDamage/);
});
