import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {D616AutomationCenter} from '../scripts/automation-center.mjs';
import {normalizeCustomRule} from '../scripts/custom-automations.mjs';

const savedRule=(id='r1')=>normalizeCustomRule({id,name:id==='r1'?'Fast Attack - TESTE':'Outra automação',
  trigger:'targetHit',powerName:'Fast Attacks',effectType:'condition',
  effectStatus:'mmrpg.confused',hitOutcome:'fantastic',conditionDurationMode:'manual'});

function setup(rules=[savedRule()]){
  const prev={game:globalThis.game,ui:globalThis.ui};
  let stored=structuredClone(rules),writes=0,fails=false;
  const settings={get:(ns,key)=>key==='customAutomationRules'?structuredClone(stored):true,
    async set(ns,key,value){assert.equal(key,'customAutomationRules');writes++;
      if(fails)throw new Error('save failed');stored=structuredClone(value);}};
  const warnings=[];globalThis.game={user:{isGM:true},settings};
  globalThis.ui={notifications:{info(){},warn(text){warnings.push(text);},error(text){warnings.push(text);}}};
  const fieldNames=['name','trigger','powerName','requiresStatus','effectType','effectStatus',
    'conditionDurationMode','conditionDurationCount','conditionRemoval','healAmount','message',
    'attackScope','damageBonusMode','damageBonusAmount','damageAbility','hitOutcome','statusSubject','fantasticOnly','enabled'];
  const defaultField={name:'',trigger:'powerRoll',powerName:'',requiresStatus:'',effectType:'condition',
    effectStatus:'mmrpg.confused',conditionDurationMode:'manual',conditionDurationCount:'1',
    conditionRemoval:'',healAmount:'1',message:'',attackScope:'all',damageBonusMode:'fixed',damageBonusAmount:'5',damageAbility:'mle',hitOutcome:'success',statusSubject:'caster',fantasticOnly:false,enabled:true};
  const fields=Object.fromEntries(fieldNames.map(name=>[name,{type:['enabled','fantasticOnly'].includes(name)?'checkbox':'text',
    value:String(defaultField[name]),checked:Boolean(defaultField[name]),focus(){}}]));
  const form={elements:{namedItem:n=>fields[n]},reset(){for(const name of fieldNames){fields[name].value=String(defaultField[name]);fields[name].checked=Boolean(defaultField[name]);}}};
  const status={textContent:''},hint={textContent:''},title={textContent:''};
  const root={querySelector(selector){if(selector==='[data-rule-form]')return form;
    if(selector==='[data-save-status]')return status;if(selector==='[data-editor-save-hint]')return hint;
    if(selector==='[data-editor-title]')return title;throw Error('Unexpected selector: '+selector);}};
  const app=new D616AutomationCenter();
  app.element={querySelector(selector){return selector==='.d616-auto'?root:selector==='[data-rule-form]'?form:null;}};
  app._syncRuleFields=()=>{};app._refreshRules=()=>{};
  return {app,fields,hint,status,title,get saved(){return structuredClone(stored);},get writes(){return writes;},
    get warnings(){return warnings;},set fails(value){fails=value;},restore(){globalThis.game=prev.game;globalThis.ui=prev.ui;}};
}

test('v115: editing existing condition, closing via X auto-saves and persists for reopening',async()=>{
  const x=setup();try{
    x.app._editRule('r1');assert.equal(x.app._hasUnsavedRuleChanges(),false);
    x.fields.conditionDurationMode.value='turns';x.fields.conditionDurationCount.value='1';
    assert.equal(x.app._hasUnsavedRuleChanges(),true);
    x.app._updateEditorSaveHint();assert.match(x.hint.textContent,/Alterações pendentes/);
    await x.app.close();assert.equal(x.writes,1);
    assert.equal(x.saved[0].conditionDurationMode,'turns');assert.equal(x.saved[0].conditionDurationCount,1);
    x.app._editRule('r1');assert.equal(x.fields.conditionDurationMode.value,'turns');
    assert.equal(x.fields.conditionDurationCount.value,'1');
  }finally{x.restore();}
});

test('v115: selecting another saved rule also saves edits before switching',async()=>{
  const x=setup([savedRule('r1'),savedRule('r2')]);try{
    x.app._editRule('r1');x.fields.conditionDurationMode.value='rounds';x.fields.conditionDurationCount.value='3';
    await x.app._switchRule('r2');assert.equal(x.writes,1);
    assert.equal(x.saved[0].conditionDurationCount,3);assert.equal(x.saved[0].conditionDurationMode,'rounds');
    assert.equal(x.app._ruleEditingId,'r2');assert.match(x.title.textContent,/Outra automação/);
  }finally{x.restore();}
});

test('v115: invalid condition prevents closing or switching; unsaved text remains in editor',async()=>{
  const x=setup([savedRule('r1'),savedRule('r2')]);try{
    x.app._editRule('r1');x.fields.conditionDurationMode.value='turns';x.fields.conditionDurationCount.value='30';
    assert.equal(await x.app.close(),x.app);assert.equal(x.writes,0);
    assert.equal(x.app._ruleEditingId,'r1');assert.equal(x.fields.conditionDurationCount.value,'30');
    await x.app._switchRule('r2');assert.equal(x.app._ruleEditingId,'r1');
    assert.ok(x.warnings.some(m=>/20/.test(m)));
  }finally{x.restore();}
});

test('v115: settings write failure keeps editor open without replacing current rule',async()=>{
  const x=setup();try{
    x.app._editRule('r1');x.fields.conditionDurationMode.value='turns';x.fields.conditionDurationCount.value='2';
    x.fails=true;
    const prevError=console.error;console.error=()=>{};
    try{assert.equal(await x.app.close(),x.app);}finally{console.error=prevError;}
    assert.equal(x.app._ruleEditingId,'r1');assert.equal(x.saved[0].conditionDurationMode,'manual');
    assert.equal(x.fields.conditionDurationMode.value,'turns');
  }finally{x.restore();}
});

test('v115: closing with a new unsaved rule never creates accidental new automation',async()=>{
  const x=setup();try{
    x.app._editRule(null);x.fields.name.value='Regra incompleta';
    await x.app.close();assert.equal(x.writes,0);assert.equal(x.saved.length,1);
  }finally{x.restore();}
});

test('v115: explicit Save preserves edits and resets pending state',async()=>{
  const x=setup();try{
    x.app._editRule('r1');x.fields.conditionDurationMode.value='turns';x.fields.conditionDurationCount.value='2';
    assert.equal(await x.app._saveRule(),true);
    assert.equal(x.saved[0].conditionDurationCount,2);assert.equal(x.app._hasUnsavedRuleChanges(),false);
    await x.app.close();assert.equal(x.writes,1,'closing an unchanged rule must not duplicate writes');
  }finally{x.restore();}
});

test('v115: UI states automatic save behavior and still offers explicit Save',async()=>{
  const source=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  assert.match(source,/data-editor-save-hint/);assert.match(source,/async close\(options=/);
  assert.match(source,/data-submit-rule/);assert.match(source,/this\._switchRule\(edit\.dataset\.editRule\)/);
});
