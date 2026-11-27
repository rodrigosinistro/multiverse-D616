import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePowerRoll} from '../scripts/power-rolls.mjs';
import {phaseSelfActive,phasePhysicalContact,phaseDragOptions,isQuickPhase} from '../scripts/native-priority-lot3.mjs';
// concentration.js installs Foundry Hooks at module import time.
globalThis.Hooks ??= {once(){},on(){}};
const {isLeechLife,isDispelSpell,leechLifeRecovery,cappedHealthRecovery,confirmLeechLife,
 activeConcentrationPowers,magicalConcentrationPowers,dispelSpellEligibility,dispelFromRoll} = await import('../scripts/native-priority-lot4.mjs');
const S='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
function power(name,set){const p=catalog.find(p=>p.name===name&&p.system.powerSet===set);assert.ok(p);return {...p,id:p._id};}
const leech=power('Leech Life','Magic'),quick=power('Quick Phase','Phasing'),dispel=power('Dispel Spell','Magic');
const phase=power('Phase Self','Phasing');
const mkActor=(id,items=[leech])=>({id,name:`Hero ${id}`,uuid:`Actor.${id}`,system:{health:{value:20,max:100},abilities:{ego:{defense:12}}},items:{get:key=>items.find(x=>x.id===key)},effects:[],async update(change){if('system.health.value' in change)this.system.health.value=change['system.health.value']}});
const effect=(item,id)=>({id,name:item.name,disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:item.id}}}});
const fakeMessage=(id,flags={},speaker={scene:'scene',token:'caster',actor:'caster'},rolls=[{total:17,isFantastic:false}])=>({id,speaker,rolls,flags:{[S]:flags},getFlag(ns,key){return this.flags?.[ns]?.[key]},async setFlag(ns,key,val){this.flags[ns]??={};this.flags[ns][key]=val}});

test('v222: only official scoped items and no mutation of item compendiums',()=>{
 assert.ok(isLeechLife(leech));assert.ok(isQuickPhase(quick));assert.ok(isDispelSpell(dispel));
 assert.equal(isLeechLife({...leech,system:{...leech.system,powerSet:'Phasing'}}),false);
 assert.equal(isDispelSpell({...dispel,type:'trait'}),false);
 assert.deepEqual(resolvePowerRoll(leech).attackTarget,'res');
 assert.equal(resolvePowerRoll(leech).attack,true);
 assert.equal(resolvePowerRoll(leech).damageType,'health');
 assert.equal(resolvePowerRoll(dispel).checkOnly,true);
 assert.equal(resolvePowerRoll(dispel).attack,false);
 assert.equal(resolvePowerRoll(dispel).attackTarget,'ego');
});
test('v222: Leech Life restores half Health confirmed; full on Fantastic; no mitigation duplication',()=>{
 const entries=[{targetUuid:'t1',category:'health',hit:true,fantastic:false},{targetUuid:'t2',category:'health',hit:true,fantastic:true}];
 const receipt=[{targetUuid:'t1',category:'health',delta:5},{targetUuid:'t2',category:'health',delta:7}];
 assert.deepEqual(leechLifeRecovery(receipt,entries),{loss:12,recovery:10});
 assert.deepEqual(leechLifeRecovery([receipt[0],receipt[0]],entries),{loss:5,recovery:3});
 assert.deepEqual(leechLifeRecovery([{...receipt[0],delta:0,blocked:true}],entries),{loss:0,recovery:0});
 assert.deepEqual(leechLifeRecovery(receipt,entries,'heal'),{loss:0,recovery:0});
 assert.deepEqual(leechLifeRecovery([{...receipt[1],category:'focus'}],entries),{loss:0,recovery:0});
 assert.deepEqual(cappedHealthRecovery({system:{health:{value:85,max:120}}},74),{before:85,maximum:120,applied:35});
});
test('v222: GM damage receipt is claimed once and heals caster only to cap',async()=>{
 const before=globalThis.game;
 const caster=mkActor('caster',[leech]);caster.system.health={value:80,max:100};
 const actorTokens={get:id=>id==='caster'?{actor:caster}:null};
 const scene={id:'scene',tokens:actorTokens};
 const source=fakeMessage('source',{itemId:leech.id,damageType:'health'});
 const card=fakeMessage('damage',{sourceMessageId:'source',damageApplication:{version:1,sourceMessageId:'source',entries:[{targetUuid:'t',category:'health',hit:true,fantastic:true}]}});
 const messages={get:id=>id==='source'?source:null},scenes={get:id=>id==='scene'?scene:null};
 const posted=[];
 globalThis.game={user:{isGM:true}};
 try{
  const first=await confirmLeechLife({damageMessage:card,action:'full',results:[{targetUuid:'t',category:'health',delta:74}],messages,scenes,post:async x=>posted.push(x)});
  assert.equal(first.recovery,74);assert.equal(first.applied,20);assert.equal(caster.system.health.value,100);
  assert.match(posted[0].content,/calculada: 74/);
  const second=await confirmLeechLife({damageMessage:card,action:'full',results:[{targetUuid:'t',category:'health',delta:74}],messages,scenes,post:async x=>posted.push(x)});
  assert.equal(second,null);assert.equal(posted.length,1);
 }finally{globalThis.game=before;}
});
test('v222: Quick Phase uses the same live Concentration as Phase Self',()=>{
 const actor=mkActor('phase',[quick]);const normal=mkActor('normal',[]);
 assert.equal(phaseSelfActive(actor),false);
 actor.effects.push(effect(quick,'phase-effect'));
 assert.equal(phaseSelfActive(actor),true);
 assert.equal(phasePhysicalContact(actor,normal,'health'),false);
 assert.equal(phasePhysicalContact(actor,normal,'focus'),true);
 assert.equal(phaseDragOptions({constrainOptions:{x:1}},actor,{isGM:true}).constrainOptions.ignoreWalls,true);
 actor.effects[0].disabled=true;
 assert.equal(phaseSelfActive(actor),false);
 assert.equal(phaseDragOptions({},actor,{isGM:true}).constrainOptions,undefined);
});
test('v222: Dispel Spell preflight requires exactly one Magic concentration and Ego defense',()=>{
 const target=mkActor('target',[phase,leech]);target.effects=[effect(phase,'ph1'),effect(leech,'mg1')];
 const scene={id:'scene',tokens:{get:id=>id==='token'?{id:'token',parent:scene,actor:target,uuid:'Scene.scene.Token.token'}:null}};
 const attacker=mkActor('caster',[dispel]);dispel.actor=attacker;
 const prior=globalThis.game;globalThis.game={user:{isGM:true}};
 try{
  assert.equal(activeConcentrationPowers(target).length,2);
  assert.equal(magicalConcentrationPowers(target).length,1);
  assert.equal(dispelSpellEligibility(dispel,[],{scene}).ok,false);
  assert.equal(dispelSpellEligibility(dispel,[{uuid:'Scene.scene.Token.token'}],{scene}).ok,true);
  target.effects[1].disabled=true;
  assert.equal(dispelSpellEligibility(dispel,[{uuid:'Scene.scene.Token.token'}],{scene}).ok,false);
 }finally{globalThis.game=prior;}
});
test('v222: GM resolves normal Dispel against one Magic only, Fantastic removes all, failure none',async()=>{
 const oldGame=globalThis.game;
 const caster=mkActor('caster',[dispel]),target=mkActor('target',[leech,phase]);
 dispel.actor=caster;
 const t={id:'token',actor:target,uuid:'Scene.scene.Token.token'};
 const scene={id:'scene',tokens:{get:id=>id==='token'?t:id==='caster'?{actor:caster}:null}};
 t.parent=scene;
 const messages=[],scenes={get:id=>id==='scene'?scene:null};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes,actors:{get:id=>id==='caster'?caster:null}};
 const mark={version:1,sceneId:'scene',targetUuid:'Scene.scene.Token.token',targetActorUuid:'Actor.target',egoDefense:12};
 function make(total,fantastic){return fakeMessage('roll-'+messages.length,{itemId:dispel.id,nativeDispelSpell:mark},
  {scene:'scene',token:'caster',actor:'caster'},[{total,isFantastic:fantastic}]);}
 try{
  target.effects=[effect(leech,'m1'),effect(phase,'p1')];
  let removed=[];
  const first=await dispelFromRoll(make(17,false),{selectEffect:async list=>list[0].id,confirm:async()=>true,
   endOne:async(actor,id)=>{removed.push(id);actor.effects=actor.effects.filter(e=>e.id!==id)},post:async()=>{}});
  assert.equal(first.ok,true);assert.equal(first.removed,1);assert.deepEqual(removed,['m1']);assert.equal(target.effects.length,1);
  target.effects=[effect(leech,'m2'),effect(phase,'p2')];
  const msg=make(23,true);let count=0;
  const fancy=await dispelFromRoll(msg,{selectEffect:async()=>{throw Error('should not ask on fantastic')},confirm:async()=>true,
   endAll:async actor=>{count++;actor.effects=[]},post:async()=>{}});
  assert.equal(fancy.ok,true);assert.equal(fancy.removed,2);assert.equal(count,1);
  assert.equal((await dispelFromRoll(msg,{confirm:async()=>true})).ok,false,'cannot double-dispel');
  target.effects=[effect(leech,'m3')];
  const failure=await dispelFromRoll(make(3,false),{confirm:async()=>true,post:async()=>{}});
  assert.equal(failure.ok,true);assert.equal(failure.removed,0);assert.equal(target.effects.length,1);
  const noPermission=globalThis.game.user.isGM=false;
  assert.equal((await dispelFromRoll(make(17,false))).ok,false);
 }finally{globalThis.game=oldGame;}
});
test('v222: wiring is additive; compendiums and README not edited',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(main,/registerNativePriorityLot4Hooks\(\)/);
 assert.match(main,/dispelSpellEligibility\(this,mmD616CollectLocalTargets\(\)\)/);
 assert.match(main,/nativeDispelSpell:/);
 assert.match(main,/if\(chatMessage\.getFlag\(M616_SYSTEM_ID,'nativeDispelSpellResolved'\)\|\|chatMessage\.getFlag\(M616_SYSTEM_ID,'nativePowerControlResolved'\)\)/);
 assert.match(mmdr,/confirmLeechLife\(\{damageMessage:message,action,results:receipt\}\)/);
 assert.equal(JSON.parse(readFileSync(new URL('../system.json',import.meta.url))).version,'0.2.237');
});
