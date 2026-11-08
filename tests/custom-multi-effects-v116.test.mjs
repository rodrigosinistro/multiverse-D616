import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MAX_CUSTOM_EFFECTS, CUSTOM_RULES_KEY, normalizeCustomRule,ruleEffects,
  processCustomAutomation, syncCustomTargetRules,powerRollModifiers,passiveAttackModifiers,
} from '../scripts/custom-automations.mjs';
import {D616AutomationCenter} from '../scripts/automation-center.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';

const namespace='multiverse-d616';
const legacy={id:'old1',name:'Legado',trigger:'powerRoll',powerName:'Venom Burst',effectType:'chat',message:'Legado!',enabled:true};
const targetRule=(effects,opts={})=>normalizeCustomRule({id:'many',name:'Sequência',trigger:'targetHit',powerName:'Fast Attacks',
  hitOutcome:'fantastic',effects,...opts});
const chat=(message='Olá')=>({effectType:'chat',message});
const heal=(healAmount=4)=>({effectType:'healing',healAmount});
const condition=(duration='turns')=>({effectType:'condition',effectStatus:'mmrpg.confused',conditionDurationMode:duration,
  conditionDurationCount:2,conditionRemoval:'Logic TN 12'});

function fixture(rules){
  const previous={game:globalThis.game,fromUuid:globalThis.fromUuid,CONFIG:globalThis.CONFIG,
    ChatMessage:globalThis.ChatMessage};
  const actor={id:'a1',name:'Atacante',statuses:new Set(),effects:[],items:new Map([
    ['p1',{id:'p1',type:'power',name:'Fast Attacks',system:{attack:true,attackTarget:'mle'}}]
  ])};
  const makeTarget=id=>({id,name:'Alvo '+id,statuses:new Set(),effects:[],
    system:{health:{value:4,max:20},abilities:{mle:{defense:13}}},
    async update(change){this.system.health.value=change['system.health.value'];},
    async toggleStatusEffect(id){this.statuses.add(id);this.added.push(id);},added:[]});
  const t1=makeTarget('1'),t2=makeTarget('2');
  const scene={tokens:new Map()};
  const uuids=['Scene.s1.Token.t1','Scene.s1.Token.t2'];
  const docs=uuids.map((uuid,i)=>({documentName:'Token',actor:i?t2:t1,parent:scene,uuid}));
  const flags={itemId:'p1',attackTarget:'mle',targets:uuids.map(uuid=>({uuid}))};
  const roll={total:20,isFantastic:true},message={id:'m1',rolls:[roll],speaker:{actor:'a1'},
    getFlag:(ns,key)=>flags[key],async setFlag(ns,key,value){flags[key]=value;}};
  flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(roll),
    results:uuids.map(targetUuid=>({targetUuid,delta:6}))};
  const settings={get:(ns,key)=>({[CUSTOM_RULES_KEY]:rules,customAutomationsEnabled:true,disableAllAutomations:false})[key]};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings,
    scenes:new Map([['s1',scene]]),actors:new Map([['a1',actor]])};
  globalThis.fromUuid=async uuid=>docs.find(t=>t.uuid===uuid);
  globalThis.CONFIG={statusEffects:[{id:'mmrpg.confused',img:'icon.png'}]};
  const messages=[];globalThis.ChatMessage={create:async options=>{messages.push(options);},getSpeaker:()=>({})};
  return {actor,t1,t2,flags,message,messages,docs,settings,
    restore(){Object.assign(globalThis,previous);}};
}

test('v116: old rules migrate to a one-effect array with first-action compatibility fields',()=>{
  const restored=normalizeCustomRule(legacy);
  assert.equal(restored.effects.length,1);
  assert.equal(restored.effectType,'chat');
  assert.equal(restored.message,'Legado!');
  assert.equal(ruleEffects(restored)[0].message,'Legado!');
  assert.deepEqual(normalizeCustomRule(restored),restored);
});

test('v116: rule accepts ordered condition, healing, chat and animation, no script fields',()=>{
  const rule=targetRule([condition(),heal(7),chat('Feito'),{effectType:'vfx'}]);
  assert.deepEqual(rule.effects.map(e=>e.effectType),['condition','healing','chat','vfx']);
  assert.equal(rule.effects[0].conditionDurationCount,2);
  assert.equal(rule.effects[1].healAmount,7);
  assert.equal(rule.effects[3].effectType,'vfx');
  assert.equal('javascript' in rule.effects[3],false);
});

test('v116: bounded 1-8 actions and strict per-action trigger/health/duration rules',()=>{
  assert.equal(MAX_CUSTOM_EFFECTS,8);
  assert.throws(()=>targetRule([]),/1 e 8/);
  assert.throws(()=>targetRule(Array.from({length:9},()=>chat())),/1 e 8/);
  assert.throws(()=>targetRule([chat(),{effectType:'javascript',message:'oops'}]),/Efeito não disponível/);
  assert.throws(()=>targetRule([condition(),heal(101)]),/cura/);
  assert.throws(()=>targetRule([condition('rounds'),{...condition('rounds'),conditionDurationCount:100}]),/20/);
  assert.throws(()=>targetRule([chat(),{effectType:'edge',attackScope:'all'}]),/Edge\/Trouble/);
  assert.throws(()=>normalizeCustomRule({...legacy,trigger:'passiveAttack',effects:[{effectType:'edge',attackScope:'all'},chat()]}),/passivos/);
  assert.throws(()=>normalizeCustomRule({...legacy,trigger:'turnStart',effects:[{effectType:'vfx'}]}),/Animações exigem/);
  assert.throws(()=>normalizeCustomRule({...legacy,fantasticOnly:true,
    effects:[{effectType:'edge',attackScope:'all'},chat()]}),/antes dos dados/);
});

test('v116: multiple ordinary effects execute sequentially for one turn/power event',async()=>{
  const rule=normalizeCustomRule({...legacy,effects:[heal(4),chat('Cura concluída'),heal(2)]});
  const f=fixture([rule]);try{
    f.actor.system={health:{value:6,max:20}};
    f.actor.update=async change=>{f.actor.system.health.value=change['system.health.value'];};
    assert.equal(await processCustomAutomation({trigger:'powerRoll',powerName:'Venom Burst',actor:f.actor}),3);
    assert.equal(f.actor.system.health.value,12);
    assert.match(f.messages[0].content,/Cura concluída/);
  }finally{f.restore();}
});

test('v116: pre-roll Edge and later chat in same active power rule run at different stages',async()=>{
  const rule=normalizeCustomRule({...legacy,effects:[{effectType:'edge',attackScope:'ranged'},chat('Pós rolagem')]});
  const f=fixture([rule]);try{
    const item={name:'Venom Burst',type:'power',system:{attackKind:'ranged'}};
    assert.equal(powerRollModifiers({actor:f.actor,item,attack:true,kind:'ranged',settings:f.settings}).length,1);
    assert.equal(await processCustomAutomation({trigger:'powerRoll',powerName:'Venom Burst',actor:f.actor}),1);
    assert.match(f.messages[0].content,/Pós rolagem/);
    assert.equal(powerRollModifiers({actor:f.actor,item,attack:true,kind:'ranged',baseMode:1,settings:f.settings}).length,0);
  }finally{f.restore();}
});

test('v116: passive rules accept multiple roll modifiers but never post-roll effects',()=>{
  const rule=normalizeCustomRule({id:'a',name:'Passiva',trigger:'passiveAttack',powerName:'Blazing Fast Fists',
    effects:[{effectType:'edge',attackScope:'melee'},{effectType:'trouble',attackScope:'ranged'}]});
  const f=fixture([rule]);try{
    f.actor.items.set('fast',{type:'power',name:'Blazing Fast Fists'});
    assert.equal(passiveAttackModifiers({actor:f.actor,attack:true,kind:'melee',settings:f.settings})[0].sign,1);
    assert.equal(passiveAttackModifiers({actor:f.actor,attack:true,kind:'ranged',settings:f.settings})[0].sign,-1);
  }finally{f.restore();}
});

test('v116: confirmed fantastic hit performs every action once for EACH target, never source',async()=>{
  const rule=targetRule([heal(4),chat('Pegou!'),condition('manual')]);
  const f=fixture([rule]);try{
    assert.equal(await syncCustomTargetRules(f.message),6);
    assert.equal(f.t1.system.health.value,8);assert.equal(f.t2.system.health.value,8);
    assert.deepEqual(f.t1.added,['mmrpg.confused']);assert.deepEqual(f.t2.added,['mmrpg.confused']);
    assert.equal(f.actor.statuses.size,0);
    assert.equal(f.messages.length,2);
    assert.equal(f.flags.customTargetExecutions.length,6);
    assert.equal(await syncCustomTargetRules(f.message),0);
    assert.equal(f.t1.system.health.value,8);assert.equal(f.messages.length,2);
  }finally{f.restore();}
});

test('v116: if effect 2 throws, effect 1 stays checkpointed and never runs again',async()=>{
  const f=fixture([targetRule([heal(3),chat('Agora sim')])]);try{
    let fails=true;
    globalThis.ChatMessage.create=async data=>{if(fails)throw new Error('chat offline');f.messages.push(data);};
    const old=console.error;console.error=()=>{};
    try{assert.equal(await syncCustomTargetRules(f.message),2);}finally{console.error=old;}
    assert.equal(f.t1.system.health.value,7);assert.equal(f.t2.system.health.value,7);
    assert.equal(f.flags.customTargetExecutions.length,2,'only health steps checkpointed');
    fails=false;
    assert.equal(await syncCustomTargetRules(f.message),2,'only previously failed chat actions execute');
    assert.equal(f.t1.system.health.value,7);assert.equal(f.t2.system.health.value,7);
    assert.equal(f.messages.length,2);
  }finally{f.restore();}
});

test('v116: previously consumed single-effect target rule respects old execution marker',async()=>{
  const f=fixture([targetRule([chat('Não repetir')])]);try{
    f.flags.customTargetExecutions=['many|Scene.s1.Token.t1'];
    assert.equal(await syncCustomTargetRules(f.message),1);
    assert.equal(f.messages.length,1);
    assert.equal(f.flags.customTargetExecutions.length,2);
  }finally{f.restore();}
});

test('v116: per-action condition duration is preserved on ActiveEffect without extension of existing condition',async()=>{
  const f=fixture([targetRule([condition('manual'),heal(1)])]);try{
    const created=[];
    for(const a of [f.t1,f.t2])a.createEmbeddedDocuments=async(_type,docs)=>{created.push(...docs);a.statuses.add('mmrpg.confused');};
    assert.equal(await syncCustomTargetRules(f.message),4);
    assert.equal(created.length,2);
    for(const effect of created){
      const flag=effect.flags[namespace].customAutomationCondition;
      assert.equal(flag.mode,'manual');assert.equal(flag.removalNote,'Logic TN 12');
    }
  }finally{f.restore();}
});

test('v116: editor includes add/remove/reorder and duration per additional action',async()=>{
  const prior=globalThis.document;
  globalThis.document={createElement:()=>({className:'',innerHTML:''})};
  try{
    const html=(await new D616AutomationCenter()._renderHTML()).innerHTML;
    assert.match(html,/data-effects-list/);assert.match(html,/data-add-effect/);
    assert.match(html,/data-primary-effect-controls/);
    const extra=D616AutomationCenter.prototype._additionalEffectMarkup({effectType:'condition'},1);
    assert.match(extra,/data-remove-effect/);assert.match(extra,/data-move-effect/);
    assert.match(extra,/data-effect-field="conditionDurationCount"/);
    assert.match(extra,/data-effect-field="conditionRemoval"/);
  }finally{globalThis.document=prior;}
});

test('v116: package documentation and manifest select new release',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  assert.equal(manifest.version,'0.2.153');
  assert.match(ui,/Central de Automações 5\.0/);
});

test('v116: editor add/remove/reorder keeps action order, without losing scroll position',()=>{
  let current=[condition('manual'),chat('Primeira mensagem'),heal(3)],hints=0;
  const form={scrollTop:185};
  const app={_allEditorEffects:()=>current,
    _renderEffectEditors(next){current=next;},
    _updateEditorSaveHint(){hints++;},
    element:{querySelector:selector=>selector==='[data-rule-form]'?form:null}};
  D616AutomationCenter.prototype._changeEffects.call(app,'move',1);
  assert.deepEqual(current.map(x=>x.effectType),['chat','condition','healing']);
  D616AutomationCenter.prototype._changeEffects.call(app,'move',2);
  assert.deepEqual(current.map(x=>x.effectType),['chat','healing','condition']);
  D616AutomationCenter.prototype._changeEffects.call(app,'remove',1);
  assert.deepEqual(current.map(x=>x.effectType),['chat','condition']);
  D616AutomationCenter.prototype._changeEffects.call(app,'add');
  assert.deepEqual(current.map(x=>x.effectType),['chat','condition','chat']);
  assert.equal(form.scrollTop,185);
  assert.equal(hints,4);
});

test('v116: editor does not permit removing first effect, reordering beyond boundaries or exceeding eight actions',()=>{
  let current=[chat('I'),heal(2)],updated=0;
  const form={scrollTop:0};
  const app={_allEditorEffects:()=>current,_renderEffectEditors(next){current=next;updated++;},
    _updateEditorSaveHint(){},element:{querySelector:()=>form}};
  D616AutomationCenter.prototype._changeEffects.call(app,'remove',0);
  D616AutomationCenter.prototype._changeEffects.call(app,'move',2);
  assert.equal(updated,0);
  for(let i=0;i<15;i++)D616AutomationCenter.prototype._changeEffects.call(app,'add');
  assert.equal(current.length,8);
});

test('v116: legacy target action uses exact old execution marker when saved with a one-effect array',async()=>{
  const f=fixture([normalizeCustomRule({...legacy,id:'old',trigger:'targetHit',powerName:'Fast Attacks',
    effects:[chat('não duplicar')]})]);try{
    f.flags.customTargetExecutions=['old|Scene.s1.Token.t1'];
    await syncCustomTargetRules(f.message);
    assert.equal(f.messages.length,1);
    assert.ok(f.flags.customTargetExecutions.includes('old|Scene.s1.Token.t2'));
  }finally{f.restore();}
});
