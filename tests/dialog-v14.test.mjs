import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseD616Dialog,promptD616FocusExtra} from '../scripts/dialog-v14.mjs';

async function invoke(fn,{action='ok',form=null,closed=false}={}){
  const previous=globalThis.foundry;
  let recorded;
  try{
    globalThis.foundry={applications:{api:{DialogV2:{wait:async config=>{
      recorded=config;
      if(closed)return null;
      const button=config.buttons.find(b=>b.action===action);
      assert.ok(button,`missing ${action}`);
      // Foundry's default: null callback results become the action name.
      const result=await button.callback({}, {form}, {});
      return result ?? action;
    }}}}};
    return {value:await fn(),config:recorded};
  }finally{if(previous===undefined)delete globalThis.foundry;else globalThis.foundry=previous;}
}

test('DialogV2 selector preserves true, false and explicit cancel values',async()=>{
  const config={title:'Teste situacional',content:'<p>Atacar?</p>',defaultAction:'yes',buttons:[
    {action:'yes',label:'Sim',value:true},
    {action:'no',label:'Não',value:false},
    {action:'cancel',label:'Cancelar',value:null},
  ]};
  const yes=await invoke(()=>chooseD616Dialog(config),{action:'yes'});
  assert.equal(yes.value,true);
  assert.equal(yes.config.window.title,'Teste situacional');
  assert.equal(yes.config.buttons.find(b=>b.action==='yes').default,true);
  assert.equal(yes.config.rejectClose,false);
  assert.ok(yes.config.classes.includes('m616-dialog-v14'));
  const no=await invoke(()=>chooseD616Dialog(config),{action:'no'});
  assert.equal(no.value,false);
  const cancel=await invoke(()=>chooseD616Dialog(config),{action:'cancel'});
  assert.equal(cancel.value,null,'cancel must not become the string "cancel"');
  const close=await invoke(()=>chooseD616Dialog(config),{closed:true});
  assert.equal(close.value,null);
});
test('DialogV2 supports configurable close value for reaction offer',async()=>{
  const value=await invoke(()=>chooseD616Dialog({title:'Escapar',content:'',buttons:[
    {action:'react',label:'Reação',value:true},
    {action:'later',label:'Depois',value:false}
  ],closeValue:false}),{closed:true});
  assert.equal(value.value,false);
});
test('Focus variable: native form, input min/max, non-stacking cost, bounded total',async()=>{
  const opts={title:'Gastar Focus',min:5,maxTotal:15,maxSpend:15,available:18,currentExtra:4,scalingHelp:'A cada 2 Focus +1 dano'};
  const x=await invoke(()=>promptD616FocusExtra(opts),{form:{elements:{extra:{value:'3'},namedItem(name){return this[name];}}}});
  assert.equal(x.value,8);
  assert.match(x.config.content,/name="extra"/);
  assert.match(x.config.content,/value="4"/);
  assert.match(x.config.content,/max="10"/);
  assert.doesNotMatch(x.config.content,/<form\b/i, 'DialogV2 owns outer form');
  assert.ok(x.config.classes.includes('m616-focus-dialog'));
  const cap=await invoke(()=>promptD616FocusExtra(opts),{form:{elements:{extra:{value:'999'},namedItem(name){return this[name];}}}});
  assert.equal(cap.value,15);
  const canceled=await invoke(()=>promptD616FocusExtra(opts),{action:'cancel'});
  assert.equal(canceled.value,null);
  const closed=await invoke(()=>promptD616FocusExtra(opts),{closed:true});
  assert.equal(closed.value,null);
  const malformed=await invoke(()=>promptD616FocusExtra(opts),{form:{elements:{extra:{value:'x'}}}});
  assert.equal(malformed.value,null);
});
test('Modernized UI flows occur before Focus spend, no legacy dialogs for key use flows',()=>{
  const base=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(base,/import \{ chooseD616Dialog, promptD616FocusExtra \}/);
  assert.match(base,/requestPowerRoll = await chooseD616Dialog/);
  assert.match(base,/const chosen = await promptD616FocusExtra/);
  assert.match(base,/newSpent = await promptD616FocusExtra/);
  assert.ok(base.indexOf('requestPowerRoll = await chooseD616Dialog')<base.indexOf('await mmPreSpendFocusForPowerUse(this.actor'));
  const picker=readFileSync(new URL('../scripts/smart-targets.mjs',import.meta.url),'utf8');
  assert.match(picker,/return chooseD616Dialog\(/);
  assert.doesNotMatch(picker,/\bDialog\.wait\(/);
  const escape=readFileSync(new URL('../scripts/power-escapes.mjs',import.meta.url),'utf8');
  assert.match(escape,/const answer=await chooseD616Dialog/);
  assert.doesNotMatch(escape,/\bDialog\.wait\(/);
  const css=readFileSync(new URL('../styles/dialog-v14.css',import.meta.url),'utf8');
  assert.match(css,/\.m616-dialog-v14/);
  assert.match(css,/\.form-footer/);
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.2.68');
  assert.ok(manifest.styles.includes('styles/dialog-v14.css'));
});
