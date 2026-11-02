import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  normalizeCustomRule,targetRuleOutcome,syncCustomTargetRules,
  confirmCustomTargetDamageFromCard,getCustomRules,
} from '../scripts/custom-automations.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
const NS='multiverse-d616';
const uri='Scene.s1.Token.t1';
const rules=(opts={})=>normalizeCustomRule({id:'r1',name:'Cair após acerto',trigger:'targetHit',powerName:'Venom Burst',
  hitOutcome:'success',statusSubject:'caster',requiresStatus:'',effectType:'condition',effectStatus:'mmrpg.prone',enabled:true,...opts});
function fixture({power='Venom Burst',attack=true,damage=true,rollTotal=15,fantastic=true,rule=rules()}={}){
  const roll={total:rollTotal,isFantastic:fantastic};
  const flags={itemId:'i1',targets:[{uuid:uri}],attackTarget:'agl',powerTargetNumber:0};
  const scene={tokens:{get:()=>null}};
  const actor={id:'a1',name:'Herói',statuses:new Set(),effects:[],items:new Map([
    ['i1',{id:'i1',type:'power',name:power,system:{ability:'agl',attack,attackTarget:'agl'}}]
  ])};
  const target={name:'Alvo',system:{abilities:{agl:{defense:12}}},statuses:new Set(),effects:[],
    async toggleStatusEffect(id,opts){this.statuses.add(id);this.record.push({id,opts});},record:[]};
  const targetDoc={documentName:'Token',actor:target,parent:scene,uuid:uri};
  const message={id:'m1',speaker:{actor:'a1'},rolls:[roll],getFlag:(ns,key)=>flags[key],
    async setFlag(ns,key,value){flags[key]=value;return value;}};
  const originals={game:globalThis.game,fromUuid:globalThis.fromUuid,CONFIG:globalThis.CONFIG};
  const settings={values:{customAutomationRules:[rule],customAutomationsEnabled:true,disableAllAutomations:false},
    get(ns,key){assert.equal(ns,NS);return this.values[key];}};
  globalThis.game={settings,user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},actors:new Map([['a1',actor]]),
    scenes:new Map([['s1',scene]]),messages:new Map([['m1',message]])};
  globalThis.fromUuid=async u=>u===uri?targetDoc:null;
  globalThis.CONFIG={statusEffects:[{id:'mmrpg.prone'}]};
  return {roll,flags,actor,target,targetDoc,message,settings,
    restore(){globalThis.game=originals.game;globalThis.fromUuid=originals.fromUuid;globalThis.CONFIG=originals.CONFIG;}};
}

test('v112: gatilho por alvo valida origem, sucesso e proíbe Edge/Trouble pós-rolagem',()=>{
  assert.equal(rules().hitOutcome,'success');
  assert.equal(rules({hitOutcome:'fantastic',statusSubject:'target'}).statusSubject,'target');
  assert.throws(()=>rules({hitOutcome:'critical-hit'}),/Resultado do ataque/);
  assert.throws(()=>rules({effectType:'edge',attackScope:'all'}),/Edge\/Trouble/);
  assert.throws(()=>rules({powerName:''}),/Selecione o poder/);
  assert.equal(rules({effectType:'healing',healAmount:5}).healAmount,5);
  assert.equal(rules({effectType:'chat',message:'Atingiu!'}).message,'Atingiu!');
  assert.equal(normalizeCustomRule({id:'legacy',name:'Legado',trigger:'powerRoll',powerName:'Elemental Blast',effectType:'chat',message:'OK'}).hitOutcome,'success');
});

test('v112: usa defesa do sistema e reconhece Sucesso Fantástico somente se acerta',()=>{
  const f=fixture({rule:rules({hitOutcome:'fantastic'})});
  try{
    const args={rule:getCustomRules()[0],item:f.actor.items.get('i1'),roll:f.roll,
      targetActor:f.target,targetUuid:uri,message:f.message};
    assert.equal(targetRuleOutcome({...args,confirmed:true})?.success,true);
    f.roll.total=10;
    assert.equal(targetRuleOutcome({...args,confirmed:true}),null);
    f.roll.total=15;f.roll.isFantastic=false;
    assert.equal(targetRuleOutcome({...args,confirmed:true}),null);
    f.roll.isFantastic=true;
    assert.equal(targetRuleOutcome({...args,confirmed:false}),null,'ataque de dano requer confirmação do Mestre');
  }finally{f.restore();}
});

test('v112: aplicação por alvo espera confirmação, deduplica e não afeta o lançador',async()=>{
  const f=fixture();
  try{
    assert.equal(await syncCustomTargetRules(f.message),0);
    assert.equal(f.target.record.length,0);
    f.flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(f.roll),
      results:[{targetUuid:uri,delta:5}]};
    assert.equal(await syncCustomTargetRules(f.message),1);
    assert.equal(f.target.record.length,1);
    assert.deepEqual(f.target.record[0],{id:'mmrpg.prone',opts:{active:true}});
    assert.equal(await syncCustomTargetRules(f.message),0);
    assert.deepEqual(f.flags.customTargetExecutions,[`r1|${uri}`]);
    assert.equal(f.actor.statuses.has('mmrpg.prone'),false);
  }finally{f.restore();}
});

test('v112: dano bloqueado, decisão pendente ou falha nunca aciona automação',async()=>{
  const f=fixture();
  try{
    f.flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(f.roll),results:[]};
    assert.equal(await syncCustomTargetRules(f.message),0);
    f.flags.customDamageConfirmation.results=[{targetUuid:uri,delta:2}];
    f.flags.conditionEdges={ambiguousTargets:true};
    assert.equal(await syncCustomTargetRules(f.message),0);
    f.flags.multiTargetDecisionRollSignature=rollSignature(f.roll);
    f.flags.multiTargetDecisions={[uri]:'miss'};
    assert.equal(await syncCustomTargetRules(f.message),0);
    f.flags.multiTargetDecisions={[uri]:'hit'};
    assert.equal(await syncCustomTargetRules(f.message),1);
  }finally{f.restore();}
});

test('v112: card MMDR confirma dano para poderes com regras customizadas e rejeita roll antigo',async()=>{
  const f=fixture();
  try{
    const cardFlags={sourceMessageId:'m1',damageApplication:{rollSignature:rollSignature(f.roll)}};
    const card={getFlag:(ns,key)=>cardFlags[key]};
    assert.equal(await confirmCustomTargetDamageFromCard(card,'full',[{targetUuid:uri,delta:10,blocked:true}]),false);
    assert.equal(await confirmCustomTargetDamageFromCard(card,'full',[{targetUuid:uri,delta:10}]),true);
    assert.equal(f.target.record.length,1);
    assert.equal(f.flags.customDamageConfirmation.confirmed,true);
    f.roll.total=9;
    assert.equal(await confirmCustomTargetDamageFromCard(card,'full',[{targetUuid:uri,delta:10}]),false);
  }finally{f.restore();}
});

test('v112: painel oferece seleção de poderes e decisão por alvo; MMDR chama motor',()=>{
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
  assert.match(ui,/data-power-picker/);
  assert.match(ui,/getIndex\?\.\(\{fields:\['name','type'\]\}\)/);
  assert.match(ui,/data-target-outcome/);
  assert.match(ui,/data-status-subject/);
  assert.match(mmdr,/await confirmCustomTargetDamageFromCard\(message, action, results/);
});

test('v112: cura no limite e condição já ativa consomem evento sem reaplicação tardia',async()=>{
  const heal=rules({effectType:'healing',healAmount:5});
  const f=fixture({rule:heal});
  try{
    f.target.system.health={value:10,max:10};
    f.target.update=async changes=>{f.target.system.health.value=changes['system.health.value'];};
    f.flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(f.roll),
      results:[{targetUuid:uri,delta:3}]};
    assert.equal(await syncCustomTargetRules(f.message),0);
    assert.deepEqual(f.flags.customTargetExecutions,[`r1|${uri}`]);
    f.target.system.health.value=4;
    assert.equal(await syncCustomTargetRules(f.message),0);
    assert.equal(f.target.system.health.value,4,'não cura por atualização posterior do card');
  }finally{f.restore();}
});

test('v112: condição exigida pode ser verificada no alvo e não no atacante',async()=>{
  const f=fixture({rule:rules({requiresStatus:'mmrpg.bleeding',statusSubject:'target'})});
  try{
    f.actor.statuses.add('mmrpg.bleeding');
    f.flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(f.roll),
      results:[{targetUuid:uri,delta:3}]};
    assert.equal(await syncCustomTargetRules(f.message),0);
    f.target.statuses.add('mmrpg.bleeding');
    assert.equal(await syncCustomTargetRules(f.message),1);
  }finally{f.restore();}
});

test('v112: poder de teste sem dano executa ao acertar, antes de existir card MMDR',async()=>{
  const f=fixture({power:'Disrupt Nerves',attack:false,rule:rules({powerName:'Disrupt Nerves'})});
  try{
    assert.equal(await syncCustomTargetRules(f.message),1);
    assert.equal(f.target.record.length,1);
  }finally{f.restore();}
});
