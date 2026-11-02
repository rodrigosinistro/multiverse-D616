import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marvelDieIsM,ruleFromPowerMessage,normalizeCustomRule,matchesCustomRule} from '../scripts/custom-automations.mjs';
import {D616AutomationCenter} from '../scripts/automation-center.mjs';

function rollWithMarvel(face,{isFantastic=false,active=true}={}){
  return {total:17,isFantastic,terms:[{rolls:[
    {dice:[{results:[{result:1,active:true}]}]},
    {dice:[{results:[{result:face,active}]}]},
    {dice:[{results:[{result:4,active:true}]}]},
  ]}]};
}
test('v113: M is read from the actual Marvel die even after ChatMessage deserialization',()=>{
  assert.equal(marvelDieIsM(rollWithMarvel(1,{isFantastic:false})),true);
  assert.equal(marvelDieIsM(rollWithMarvel(5,{isFantastic:false})),false);
  assert.equal(marvelDieIsM(rollWithMarvel(5,{isFantastic:true})),false,
    'real die beats an obsolete fantastic property');
  assert.equal(marvelDieIsM({isFantastic:true}),true,'legacy roll fallback');
});
test('v113: creates a power-roll event with M information but never turns it into target hit',()=>{
  const saved=globalThis.game;
  const actor={id:'a1',items:new Map([['p1',{type:'power',name:'Fast Attacks'}]])};
  globalThis.game={actors:new Map([['a1',actor]]),scenes:new Map()};
  try{
    const message={id:'m1',speaker:{actor:'a1'},rolls:[rollWithMarvel(1)],getFlag:(ns,key)=>key==='itemId'?'p1':null};
    const event=ruleFromPowerMessage(message);
    assert.equal(event.fantastic,true);
    assert.equal(event.trigger,'powerRoll');
    const old=normalizeCustomRule({id:'r1',name:'Fast Attack - Teste',trigger:'powerRoll',powerName:'Fast Attacks',
      fantasticOnly:true,effectType:'condition',effectStatus:'mmrpg.confused'});
    assert.equal(matchesCustomRule(old,event),true);
  }finally{globalThis.game=saved;}
});
test('v113: one-click conversion keeps existing rule and chooses confirmed fantastic target result',()=>{
  const fields=new Map(Object.entries({
    trigger:{value:'powerRoll'},effectType:{value:'condition'},fantasticOnly:{checked:true},
    hitOutcome:{value:'success'},statusSubject:{value:'target'},
    powerName:{value:'Fast Attacks'},effectStatus:{value:'mmrpg.confused'},
    requiresStatus:{value:''},name:{value:'Fast Attack - Teste'},
  }));
  const form={elements:{namedItem:k=>fields.get(k)}};
  const status={textContent:''};
  let updated=0;
  const app={_ruleEditingId:'r1',element:{querySelector:s=>s==='[data-rule-form]'?form:s==='[data-save-status]'?status:null},
    _syncRuleFields(){updated++;}};
  D616AutomationCenter.prototype._convertPowerRuleToTarget.call(app);
  assert.equal(fields.get('trigger').value,'targetHit');
  assert.equal(fields.get('hitOutcome').value,'fantastic');
  assert.equal(fields.get('fantasticOnly').checked,false);
  assert.equal(fields.get('powerName').value,'Fast Attacks');
  assert.equal(fields.get('effectStatus').value,'mmrpg.confused');
  assert.equal(app._ruleEditingId,'r1','the already-saved rule is edited, not duplicated');
  assert.match(status.textContent,/Salvar automação/);
  assert.equal(updated,1);
});
test('v113: without M requirement conversion chooses ordinary hit, not fantastic',()=>{
  const fields=new Map(Object.entries({trigger:{value:'powerRoll'},effectType:{value:'condition'},
    fantasticOnly:{checked:false},hitOutcome:{value:'fantastic'},statusSubject:{value:'caster'}}));
  const form={elements:{namedItem:k=>fields.get(k)}};
  const app={element:{querySelector:s=>s==='[data-rule-form]'?form:null},_syncRuleFields(){}};
  D616AutomationCenter.prototype._convertPowerRuleToTarget.call(app);
  assert.equal(fields.get('hitOutcome').value,'success');
});
test('v113: distinguishes caster from target visually without changing native controls',()=>{
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  assert.match(ui,/Este efeito será aplicado ao próprio atacante, NÃO ao alvo/);
  assert.match(ui,/data-convert-target/);
  assert.match(ui,/Destino: cada alvo atingido/);
  assert.match(ui,/data-caster-warning/);
});

test('v113: Fast Attacks M+hit+confirmed damage applies Confuso to Garras once, never the attacker',async()=>{
  const {syncCustomTargetRules}=await import('../scripts/custom-automations.mjs');
  const {rollSignature}=await import('../scripts/multi-target-combat.mjs');
  const before={game:globalThis.game,fromUuid:globalThis.fromUuid,CONFIG:globalThis.CONFIG};
  const roll=rollWithMarvel(1);
  const attacker={name:'Thermal Prime',statuses:new Set(),effects:[],items:new Map([
    ['fast',{id:'fast',type:'power',name:'Fast Attacks',system:{ability:'mle',attack:true,attackTarget:'mle'}}]
  ])};
  const garras={name:'Garras',statuses:new Set(),effects:[],system:{abilities:{mle:{defense:13}}},
    async toggleStatusEffect(id,opts){this.statuses.add(id);this.count=(this.count??0)+1;}};
  const scene={tokens:new Map()};
  const target={documentName:'Token',actor:garras,parent:scene};
  const flags={itemId:'fast',attackTarget:'mle',targets:[{uuid:'Scene.s1.Token.g1'}],
    customDamageConfirmation:{confirmed:true,rollSignature:rollSignature(roll),results:[{targetUuid:'Scene.s1.Token.g1',delta:36}]}};
  const message={id:'fast-card',speaker:{actor:'a1'},rolls:[roll],getFlag:(ns,key)=>flags[key],
    async setFlag(ns,key,val){flags[key]=val;return val;}};
  const rule=normalizeCustomRule({id:'confused-fast',name:'Fast Attack - Teste',trigger:'targetHit',powerName:'Fast Attacks',
    hitOutcome:'fantastic',statusSubject:'caster',effectType:'condition',effectStatus:'mmrpg.confused'});
  const settings={get:(ns,key)=>({customAutomationRules:[rule],customAutomationsEnabled:true,disableAllAutomations:false})[key]};
  globalThis.game={settings,user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},actors:new Map([['a1',attacker]]),scenes:new Map([['s1',scene]])};
  globalThis.CONFIG={statusEffects:[{id:'mmrpg.confused'}]};
  globalThis.fromUuid=async uuid=>uuid==='Scene.s1.Token.g1'?target:null;
  try{
    assert.equal(await syncCustomTargetRules(message),1);
    assert.equal(garras.statuses.has('mmrpg.confused'),true);
    assert.equal(attacker.statuses.has('mmrpg.confused'),false);
    assert.equal(await syncCustomTargetRules(message),0);
    assert.equal(garras.count,1);
  }finally{Object.assign(globalThis,before);}
});
