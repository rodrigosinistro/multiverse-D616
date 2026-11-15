import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCustomRule,passivePowerBenefits,CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY} from '../scripts/custom-automations.mjs';
import {actorReactionMaximum,resolveTurnResourceState} from '../scripts/combat/reaction-limits.mjs';
import {sanitizeTurnState,validateTurnConsumption,consumeTurnResources,resetTurnState} from '../scripts/combat/turn-tracker-core.mjs';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
function rule(id,name,powerName,effects){return normalizeCustomRule({id,name,trigger:'passivePower',powerName,effects,enabled:true});}
function setting(rules){const values={[CUSTOM_RULES_KEY]:rules,[CUSTOM_RULES_ENABLED_KEY]:true,disableAllAutomations:false};return {values,get(ns,key){return values[key];}};}
const power=name=>({type:'power',name});
const actor=(...items)=>({items,system:{attributes:{init:{edge:false,trouble:false}}}});

test('v173: three Lightning Actions effects require owned source power and passive trigger',()=>{
 const lightning=rule('l','Lightning Actions','Lightning Actions',[{effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]);
 const settings=setting([lightning]);
 assert.deepEqual(passivePowerBenefits(actor(power('Lightning Actions')),settings),{extraActions:1,extraReactions:1,marvelM:true,initiativeEdge:false,sources:['Lightning Actions']});
 assert.equal(passivePowerBenefits(actor(power('Clobber')),settings).extraActions,0);
 assert.equal(passivePowerBenefits(actor(power('Clobber')),settings).marvelM,false);
 assert.throws(()=>normalizeCustomRule({name:'Inválida',trigger:'turnStart',effectType:'extraAction'}),/Passiva/);
 assert.throws(()=>normalizeCustomRule({name:'Inválida',trigger:'passivePower',powerName:'Lightning Actions',effectType:'chat',message:'Exploit'}),/Passiva/);
});

test('v173: Edge on initiative is an independent reusable effect; duplicate rules capped',()=>{
 const bonus=rule('e','Percepção','Instinto',[{effectType:'initiativeEdge'}]);
 const lightning=rule('l','Lightning','Lightning Actions',[{effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]);
 const settings=setting([bonus,lightning]);
 assert.equal(passivePowerBenefits(actor(power('Instinto')),settings).initiativeEdge,true);
 assert.equal(passivePowerBenefits(actor(power('Lightning Actions')),settings).initiativeEdge,false);
 assert.equal(passivePowerBenefits(actor(power('Lightning Actions'),power('Instinto')),settings).marvelM,true);
 settings.values[CUSTOM_RULES_ENABLED_KEY]=false;
 assert.equal(passivePowerBenefits(actor(power('Lightning Actions')),settings).extraActions,0);
 settings.values[CUSTOM_RULES_ENABLED_KEY]=true;
 settings.values.disableAllAutomations=true;
 assert.equal(passivePowerBenefits(actor(power('Lightning Actions')),settings).marvelM,false);
});

test('v173: new action/reaction limits affect real resource exhaustion and reset',()=>{
 const lightning=rule('l','Lightning','Lightning Actions',[{effectType:'extraAction'},{effectType:'extraReaction'}]);
 const previous=globalThis.game;
 globalThis.game={settings:setting([lightning])};
 try{
   const a=actor(power('Lightning Actions'));
   const initial=resolveTurnResourceState(sanitizeTurnState({},5),a);
   assert.equal(initial.actionMax,2);
   assert.equal(initial.reactionMax,2);
   assert.equal(actorReactionMaximum(a),2);
   const afterFirst=consumeTurnResources(initial,['action','reaction']);
   assert.equal(validateTurnConsumption(afterFirst,['action','reaction']),true);
   const exhausted=consumeTurnResources(afterFirst,['action','reaction']);
   assert.equal(validateTurnConsumption(exhausted,['action']),false);
   assert.equal(validateTurnConsumption(exhausted,['reaction']),false);
   const reset=resetTurnState(exhausted,'combat:2:0');
   assert.equal(reset.actionUsed,0);
   assert.equal(reset.reactionUsed,0);
   assert.equal(reset.actionMax,2);
   assert.equal(reset.reactionMax,2);
   assert.equal(resolveTurnResourceState(reset,actor()).actionMax,1);
 }finally{globalThis.game=previous;}
});

test('v173: UI has reusable passive trigger, editor controls and one-click Lightning Actions example',()=>{
 const ui=source('../scripts/automation-center.mjs');
 const engine=source('../multiverse-d616.mjs');
 const tracker=source('../scripts/combat/turn-tracker.mjs');
 assert.match(ui,/data-load-lightning-example/);
 assert.match(ui,/_loadLightningExample\(\)/);
 assert.match(ui,/passivePower/);
 assert.match(ui,/initiativeEdge/);
 assert.match(engine,/passivePowerBenefits\(this\)\.marvelM/);
 assert.match(engine,/evaluated\.applyForcedMarvelM/);
 assert.match(tracker,/bonus\.initiativeEdge/);
 assert.match(engine,/initiativeMarvelLocked/);
});
