import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  processPlayerEnergyAbsorptionRequest,
  handlePlayerEnergyAbsorptionActorUpdate,
  pendingAbsorption,
  requestPlayerEnergyAbsorption
} from '../scripts/energy-absorption-custom.mjs';
const SYS='multiverse-d616';
const reqkey='energyAbsorptionPlayerRequest';
const reskey='energyAbsorptionPlayerResult';
function setPath(o,p,v){const keys=p.split('.');let cur=o;for(const k of keys.slice(0,-1))cur=cur[k]??={};cur[keys.at(-1)]=v;}
function env({owner=true,focus=60,used=0}={}){
  const before={game:globalThis.game,ui:globalThis.ui,ChatMessage:globalThis.ChatMessage,CONST:globalThis.CONST};
  const player={id:'player',active:true,isGM:false};
  const gm={id:'gm',active:true,isGM:true};
  const users=new Map([[player.id,player],[gm.id,gm]]);
  users.activeGM=gm;
  const actor={id:'hero',uuid:'Actor.hero',effects:[],items:null,
    flags:{[SYS]:{}},system:{focus:{value:focus,max:60},attributes:{rank:{value:4}}},
    getFlag(sys,key){return this.flags?.[sys]?.[key]},
    testUserPermission(user,level){return level===3&&user?.id==='player'&&owner},
    async update(updates){for(const [k,v] of Object.entries(updates))setPath(this,k,v);},
    async createEmbeddedDocuments(type,source){assert.equal(type,'ActiveEffect');
      for(const doc of source)this.effects.push({id:'fx'+this.effects.length,...doc});return this.effects;},
    async deleteEmbeddedDocuments(type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));},
  };
  const item={id:'power',name:'Energy Absorption',type:'power',actor};
  actor.items=new Map([[item.id,item]]);
  const cb={id:'cb',tokenId:'token',actorId:actor.id,actor,token:{id:'token'}};
  const combat={id:'encounter',started:true,combatants:new Map([[cb.id,cb]])};
  let reaction=used;
  const tracker={getState(){return {reactionUsed:reaction,reactionMax:1}},
    async consumeReaction(){if(reaction)return false;reaction++;return true},
    async refundReaction(){if(!reaction)return false;reaction--;return true}};
  const messages=[];
  globalThis.game={user:gm,users,combat,multiverseD616:{turnTracker:tracker}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
  globalThis.ui={notifications:{warn(m){messages.push(m)},error(m){messages.push(m)},info(m){messages.push(m)}}};
  globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
  return {actor,item,gm,player,cb,combat,tracker,messages,
    reaction:()=>reaction,req:()=>({id:'unique-nonce',itemId:item.id,combatId:combat.id,combatantId:cb.id}),
    restore(){Object.assign(globalThis,before)}};
}
test('v183: GM receives authenticated owner Actor update and spends exactly 15 Focus + one Reaction',async()=>{
  const e=env();try{
    const req=e.req();
    assert.equal(await processPlayerEnergyAbsorptionRequest(e.actor,req,e.player.id),true);
    assert.equal(e.actor.system.focus.value,45);
    assert.equal(e.reaction(),1);
    assert.equal(e.actor.getFlag(SYS,reskey).ok,true);
    assert.ok(pendingAbsorption(e.actor));
    // duplicate authenticated packet never charges again
    assert.equal(await processPlayerEnergyAbsorptionRequest(e.actor,req,e.player.id),true);
    assert.equal(e.actor.system.focus.value,45);
    assert.equal(e.reaction(),1);
  }finally{e.restore()}
});
test('v183: an exhausted Reaction causes no Focus spend and no status',async()=>{
  const e=env({used:1});try{
    assert.equal(await processPlayerEnergyAbsorptionRequest(e.actor,e.req(),e.player.id),false);
    assert.equal(e.actor.getFlag(SYS,reskey).ok,false);
    assert.equal(e.actor.system.focus.value,60);
    assert.equal(e.reaction(),1);
    assert.equal(pendingAbsorption(e.actor),undefined);
  }finally{e.restore()}
});
test('v183: no privilege escalation from spoofed IDs or a non-owner',async()=>{
  for(const params of [{owner:false},{owner:true}]){
    const e=env(params);try{
      const request=e.req();
      const bad=params.owner ? 'unrecognized' : e.player.id;
      assert.equal(await processPlayerEnergyAbsorptionRequest(e.actor,request,bad),false);
      assert.equal(e.actor.system.focus.value,60);
      assert.equal(e.reaction(),0);
      assert.equal(e.actor.getFlag(SYS,reskey),undefined);
    }finally{e.restore()}
  }
});
test('v183: mismatched combatant/power and inactive encounter do not spend resources',async()=>{
  for(const change of ['combatId','combatantId','itemId','started']){
    const e=env();try{
      const request=e.req();if(change==='started')e.combat.started=false;else request[change]='other';
      assert.equal(await processPlayerEnergyAbsorptionRequest(e.actor,request,e.player.id),false);
      assert.equal(e.actor.system.focus.value,60);
      assert.equal(e.reaction(),0);
    }finally{e.restore()}
  }
});
test('v183: player accepts ACK only from authenticated active GM',()=>{
  const e=env();try{
    let called=0;
    const result={id:'x',ok:true};
    handlePlayerEnergyAbsorptionActorUpdate(e.actor,{flags:{[SYS]:{[reskey]:result}}},e.player.id);
    // Neither user claims nor an unknown sender may create a GM request.
    assert.equal(e.actor.system.focus.value,60);
    assert.equal(e.reaction(),0);
  }finally{e.restore()}
});
test('v183: player writes authorized actor request rather than using unauthenticated system socket or spending locally',()=>{
  const code=readFileSync(new URL('../scripts/energy-absorption-custom.mjs',import.meta.url),'utf8');
  assert.match(code,/if\(!game\.user\?\.isGM && game\.socket\)/);
  assert.match(code,/requestPlayerEnergyAbsorption\(item,combatant\)/);
  assert.match(code,/actor\?\.testUserPermission\?\.\(game\.user,owner\)/);
  assert.match(code,/actor\.update\(\{\[`flags\.\$\{SYSTEM\}\.\$\{PLAYER_REQUEST_KEY\}`\]:request\}/);
  assert.match(code,/processPlayerEnergyAbsorptionRequest\(actor,request,userId\)/);
  assert.match(code,/userId===game\.users\?\.activeGM\?\.id/);
});
