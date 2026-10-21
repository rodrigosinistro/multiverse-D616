import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isPowerGrabbed,hasPhysicalGrab,isPowerGrabbedEffect,powerGrabStatusFor,mayMoveHeldToken,POWER_GRABBED_STATUS} from '../scripts/power-grabbed.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {selectElementalDefense,assessGuardHit} from '../scripts/elemental-shields.mjs';
const SYS='multiverse-d616';
const effect=(status,power=null)=>({statuses:new Set([status]),disabled:false,flags:{[SYS]:{powerCondition:power?{status:'grabbed',powerName:power}:null}}});
const actor=(...effects)=>({effects,statuses:new Set(effects.flatMap(e=>[...e.statuses]))});
const edge=(roller,target,other={})=>resolveConditionEdges({actor:roller,targetActors:[target],attack:true,ability:'agl',kind:'ranged',targeted:true,...other});
test('Elemental/Telekinetic/Web remote grabs turn into a separate condition',()=>{
 for(const name of ['Elemental Grab','Telekinetic Grab','Webgrabbing','Hellfire Chains'])
  assert.equal(powerGrabStatusFor({status:'grabbed',powerName:name}),POWER_GRABBED_STATUS);
 assert.equal(powerGrabStatusFor({status:'grabbed',powerName:'Grappling Technique'}),'mmrpg.grabbed');
 assert.equal(powerGrabStatusFor({status:'grabbed',powerName:'Leaping Leglock'}),'mmrpg.grabbed');
 assert.equal(powerGrabStatusFor({status:'stunned',powerName:'Elemental Grab'}),'mmrpg.stunned');
 assert.equal(powerGrabStatusFor({status:'grabbed',powerName:'Elemental Blast',elementalSpecial:true,element:'plants'}),POWER_GRABBED_STATUS);
});
test('remote holds cause exactly one Edge when target has duplicate identical effects',()=>{
 const victim=actor(effect(POWER_GRABBED_STATUS),effect(POWER_GRABBED_STATUS));
 const result=edge(actor(),victim);
 assert.equal(result.net,1);assert.equal(result.edges,1);assert.equal(result.troubles,0);
 assert.ok(result.sources[0].source.includes('Poder'));
});
test('unaffected caster can move and does not suffer a physical-grapple penalty',()=>{
 const caster=actor(),victim=actor(effect(POWER_GRABBED_STATUS));
 assert.equal(edge(caster,victim).net,1);
 assert.equal(resolveConditionEdges({actor:victim,attack:true,ability:'mle',kind:'close',targeted:true}).net,0);
});
test('physical grabs retain existing Trouble to targeted attacks and no automatic Edge against physical grab recipient',()=>{
 const grabbed=actor(effect('mmrpg.grabbed'));
 assert.equal(hasPhysicalGrab(grabbed),true);assert.equal(isPowerGrabbed(grabbed),false);
 assert.equal(resolveConditionEdges({actor:grabbed,attack:true,ability:'mle',targeted:true}).net,-1);
 assert.equal(edge(actor(),grabbed).net,0);
});
test('old saves with standard Grabbed plus source power flag behave as remote without migrating actor data',()=>{
 const grabbed=actor(effect('mmrpg.grabbed','Elemental Grab'));
 assert.equal(isPowerGrabbed(grabbed),true);assert.equal(hasPhysicalGrab(grabbed),false);
 assert.equal(edge(actor(),grabbed).net,1);
});
test('two DIFFERENT sources, a physical grab and power hold, retain independent mechanics',()=>{
 const victim=actor(effect('mmrpg.grabbed'),effect(POWER_GRABBED_STATUS));
 assert.equal(hasPhysicalGrab(victim),true);
 assert.equal(edge(actor(),victim).net,1);
 assert.equal(resolveConditionEdges({actor:victim,attack:true,ability:'mle',targeted:true}).net,-1);
});
test('failed/disabled effects are ignored, including after GM removes Concentration',()=>{
 const e=effect(POWER_GRABBED_STATUS);e.disabled=true;
 assert.equal(isPowerGrabbedEffect(e),false);assert.equal(isPowerGrabbed(actor(e)),false);
});
test('movement is denied to players but GM may force displacement; cosmetic edits do not block',()=>{
 const token={x:100,y:200,elevation:0,actor:actor(effect(POWER_GRABBED_STATUS))};
 assert.equal(mayMoveHeldToken(token,{x:110},{isGM:false}),false);
 assert.equal(mayMoveHeldToken(token,{y:201},{isGM:false}),false);
 assert.equal(mayMoveHeldToken(token,{elevation:1},{isGM:false}),false);
 assert.equal(mayMoveHeldToken(token,{rotation:15,width:2},{isGM:false}),true);
 assert.equal(mayMoveHeldToken(token,{x:110},{isGM:true}),true);
 assert.equal(mayMoveHeldToken({x:100,actor:actor()},{x:120},{isGM:false}),true);
});
test('single selection of elemental defenses prefers crossed boundary, otherwise stronger personal protection',()=>{
 const a={items:new Map([['p',{id:'p',name:'Elemental Protection 2'}]]),effects:[{id:'e',flags:{[SYS]:{concentrationPower:{itemId:'p'}}}}]};
 const owner={name:'Barrier caster'};
 const boundary={actor:owner,guard:{name:'Elemental Sphere',kind:'structure',threshold:30}};
 assert.equal(selectElementalDefense({actor:a})?.guard?.threshold,20);
 assert.equal(selectElementalDefense({actor:a,boundary})?.guard?.threshold,30);
 assert.equal(selectElementalDefense({actor:a,boundary})?.owner,owner);
 assert.equal(selectElementalDefense({actor:a,boundary,mode:'bypass'}),null);
});
test('raw damage is absorbed before normal DR; barrier breaks only when raw exceeds threshold',()=>{
 const guard={name:'Elemental Protection 2',threshold:20};
 assert.equal(assessGuardHit(20,guard).destroyed,false);
 assert.equal(assessGuardHit(21,guard).destroyed,true);
 assert.equal(assessGuardHit(21,guard).damageToTarget,0);
});
test('both legacy and structured damage paths go through a single elemental guard/DR pipeline',()=>{
 const src=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(src,/return applyExactEntries\(normalized,action,modes,message\)/);
 assert.match(src,/selectElementalDefense\(\{actor,boundary,mode,category:entry\.category\}\)/);
 assert.match(src,/const pendingDamageCards=new Set\(\)/);
 assert.match(src,/rawDamage: computedRaw\?\?/);
});
