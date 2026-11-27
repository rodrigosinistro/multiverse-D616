import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleRetroactiveReinforcement,holdReinforcementGuard,candidatesForPower,
 applyRetroactiveReinforcement,reinforcementPendingFlag} from '../scripts/reinforcement-after-damage.mjs';
import {activeElementalGuards} from '../scripts/elemental-shields.mjs';
const S='multiverse-d616';
const power={id:'reinforce',name:'Elemental Reinforcement',type:'power',system:{powerSet:'Elemental Control'}};
function fixtures({reactionUsed=1,reactionMax=2,health=70,focus=65,failHealth=false}={}){
 const flag={};const owner={documentName:'Actor',id:'owner',uuid:'Actor.owner',name:'Zima',items:{contents:[power],get:id=>id==='reinforce'?power:null},effects:{contents:[],get:id=>owner.effects.contents.find(e=>e.id===id)},system:{focus:{value:focus,max:100}},testUserPermission:()=>true,
  async update(data){if('system.focus.value' in data)this.system.focus.value=data['system.focus.value'];}};
 const target={documentName:'Actor',id:'target',uuid:'Actor.target',name:'Zima',system:{health:{value:health,max:100}},async update(data){if(failHealth)throw Error('Erro na atualização de Health');if('system.health.value'in data)this.system.health.value=data['system.health.value'];}};
 const effect={id:'shield',disabled:false,flags:{[S]:{concentrationPower:{itemId:'shieldPower'}}},getFlag:(s,k)=>effect.flags[s]?.[k],setFlag:async(s,k,v)=>{effect.flags[s][k]=v;},unsetFlag:async(s,k)=>{delete effect.flags[s][k];}};
 const shieldPower={id:'shieldPower',name:'Elemental Protection 2',type:'power'};
 owner.items.contents.push(shieldPower);owner.items.get=id=>owner.items.contents.find(i=>i.id===id);
 owner.effects.contents.push(effect);
 const entry={category:'health',targetUuid:'Actor.target',actorUuid:'Actor.target',rawDamage:30};
 const candidate=eligibleRetroactiveReinforcement({owner,guard:{kind:'protection',name:'Elemental Protection 2',threshold:20,effect},entry,
  delta:10,damageMessageId:'damage',healthBefore:80,healthAfter:70});
 const flags={[S]:{mmdrResolved:{at:1,action:'full',results:[{targetUuid:'Actor.target',delta:10,category:'health'}],reinforcementCandidates:[candidate]}}};
 const message={id:'damage',getFlag:(s,k)=>flags[s]?.[k],setFlag:async(s,k,v)=>{flags[s][k]=v;}};
 const msgs={contents:[message],get:id=>id==='damage'?message:null};
 const gm={id:'gm',isGM:true},player={id:'player',isGM:false};
 let used=reactionUsed,refunded=0;const tracker={getState:()=>({reactionUsed:used,reactionMax}),
  consumeReaction:async()=>{if(used>=reactionMax)return false;used++;return true;},refundReaction:async()=>{used--;refunded++;}};
 const combatant={id:'c',actor:owner,actorId:'owner'};
 const combat={id:'combat',started:true,round:1,turn:2,combatants:[combatant]};
 // candidate was authored with the same turn as the attack
 candidate.combatId='combat';candidate.round=1;candidate.turn=2;
 const globalGame={user:gm,users:{activeGM:gm,get:id=>id==='gm'?gm:player},actors:[owner,target],messages:msgs,
  combat,multiverseD616:{turnTracker:tracker}};
 return {owner,target,effect,candidate,message,flags,globalGame,tracker,combat,used:()=>used,refunded:()=>refunded};
}
const withGame=async(game,callback)=>{
 const previous={game:globalThis.game,fromUuid:globalThis.fromUuid,ChatMessage:globalThis.ChatMessage};
 globalThis.game=game;
 globalThis.fromUuid=async uuid=>game.actors.find(a=>a.uuid===uuid)??null;
 globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>({})};
 try{return await callback();}finally{Object.assign(globalThis,previous);}
};
test('v225: candidate records actual health overflow and no candidate when absorbed or converted already',async()=>{
 const f=fixtures();
 await withGame(f.globalGame,async()=>{
  assert.equal(f.candidate.overflowDamage,10);
  assert.equal(f.candidate.healthRefund,10);
  assert.equal(eligibleRetroactiveReinforcement({owner:f.owner,guard:{name:'Elemental Protection 2',kind:'protection',threshold:20,effect:f.effect},
   entry:{category:'health',rawDamage:30},delta:0,damageMessageId:'damage',healthBefore:80,healthAfter:80}),null);
  assert.equal(eligibleRetroactiveReinforcement({owner:f.owner,guard:{name:'Elemental Protection 2',kind:'protection',threshold:20,effect:f.effect},
   entry:{category:'focus',rawDamage:30},delta:10,damageMessageId:'damage',healthBefore:80,healthAfter:70}),null);
  assert.equal(eligibleRetroactiveReinforcement({owner:f.owner,guard:{name:'Shield of the Seraphim',kind:'protection',threshold:20,effect:f.effect},
   entry:{category:'health',rawDamage:30},delta:10,damageMessageId:'damage',healthBefore:80,healthAfter:70}),null);
 });
});
test('v225: inactivated guard does not intercept another attack before the Reaction',async()=>{
 const f=fixtures();await withGame(f.globalGame,async()=>{
  assert.equal(activeElementalGuards(f.owner).length,1);
  assert.equal(await holdReinforcementGuard({effect:f.effect},f.candidate),true);
  assert.equal(activeElementalGuards(f.owner).length,0);
  assert.equal(candidatesForPower({...power,actor:f.owner}).length,1);
 });
});
test('v225: player conversion refunds Health, charges Focus and another Reaction, restores shield only once',async()=>{
 const f=fixtures();await withGame(f.globalGame,async()=>{
  await holdReinforcementGuard({effect:f.effect},f.candidate);
  const result=await applyRetroactiveReinforcement({messageId:'damage',sourcePowerId:'reinforce',targetUuid:'Actor.target',requestUserId:'player'});
  assert.equal(result.applied,true);assert.equal(f.target.system.health.value,80);
  assert.equal(f.owner.system.focus.value,55);assert.equal(f.used(),2);
  assert.equal(activeElementalGuards(f.owner).length,1);
  assert.equal(f.message.getFlag(S,'mmdrReinforcementApplied').length,1);
  await assert.rejects(()=>applyRetroactiveReinforcement({messageId:'damage',sourcePowerId:'reinforce',targetUuid:'Actor.target',requestUserId:'player'}),/já foi convertido/);
 });
});
test('v225: one spent protection Reaction does not magically grant a second one',async()=>{
 const f=fixtures({reactionUsed:1,reactionMax:1});await withGame(f.globalGame,async()=>{
  await holdReinforcementGuard({effect:f.effect},f.candidate);
  await assert.rejects(()=>applyRetroactiveReinforcement({messageId:'damage',sourcePowerId:'reinforce',targetUuid:'Actor.target',requestUserId:'player'}),/outra Reação disponível/);
  assert.equal(f.target.system.health.value,70);assert.equal(f.owner.system.focus.value,65);
 });
});
test('v225: failure to restore Health refunds Focus and Reaction; stale damage forbidden',async()=>{
 const f=fixtures({failHealth:true});await withGame(f.globalGame,async()=>{
  await holdReinforcementGuard({effect:f.effect},f.candidate);
  await assert.rejects(()=>applyRetroactiveReinforcement({messageId:'damage',sourcePowerId:'reinforce',targetUuid:'Actor.target',requestUserId:'player'}),/Erro na atualização de Health/);
  assert.equal(f.owner.system.focus.value,65);assert.equal(f.used(),1);assert.equal(f.refunded(),1);
 });
 const stale=fixtures();await withGame(stale.globalGame,async()=>{
  await holdReinforcementGuard({effect:stale.effect},stale.candidate);stale.target.system.health.value=61;
  await assert.rejects(()=>applyRetroactiveReinforcement({messageId:'damage',sourcePowerId:'reinforce',targetUuid:'Actor.target',requestUserId:'player'}),/Health do alvo mudou/);
 });
});
test('v225: damage card and power button share post-confirmation metadata, no replay',()=>{
 const dmg=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(dmg,/eligibleRetroactiveReinforcement/);
 assert.match(dmg,/holdReinforcementGuard/);
 assert.match(dmg,/reinforcementCandidates:results\.map/);
 assert.match(main,/useRetroactiveReinforcement\(this\)/);
 assert.match(main,/registerRetroactiveReinforcementHooks\(\)/);
});
