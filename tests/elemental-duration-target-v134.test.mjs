import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceElementalEffect, cleanupExpiredElementalEffects,
  findElementalTargetCombatant, elementalTargetExpiryRound,
  shouldExpireElementalTargetStatus} from '../scripts/elemental-fantastic.mjs';

const SYS='multiverse-d616';
const ice={label:'Ice',text:'O alvo fica Paralisado por 1 rodada.',statusId:'mmrpg.paralyzed',rounds:1,icon:'paralyzed.svg'};
function fixture({targetFirst=false, alreadyActive=false, sceneToken=true}={}){
  const previous=globalThis.game,operations=[];
  const effects=[];
  let count=0;
  const target={id:'sentinel',name:'Pensativo Sentinel',uuid:sceneToken?'Scene.scene.Token.target.Actor.sentinel':'Actor.sentinel',
    effects:{contents:effects,get(id){return effects.find(e=>e.id===id)},[Symbol.iterator](){return effects[Symbol.iterator]()}},
    statuses:new Set(alreadyActive?['mmrpg.paralyzed']:[]),
    async toggleStatusEffect(id,{active}){
      assert.equal(id,'mmrpg.paralyzed');
      if(active){this.statuses.add(id);effects.push(makeEffect({id:`e${++count}`,statuses:new Set([id]),duration:{value:null,expired:false}}));}
    },
    async deleteEmbeddedDocuments(type,ids){
      assert.equal(type,'ActiveEffect');operations.push(['delete',...ids]);
      for(const id of ids){const index=effects.findIndex(e=>e.id===id);if(index>=0)effects.splice(index,1);}
      this.statuses.delete('mmrpg.paralyzed');
    },
    async createEmbeddedDocuments(_type,items){return items.map(item=>{const effect=makeEffect({id:`e${++count}`,...item});effects.push(effect);return effect;})},
  };
  function makeEffect(data){return {...data,disabled:false,flags:{},
    async update(patch){operations.push(['update',patch]);Object.assign(this,patch);return this},
    getFlag(ns,key){return this.flags?.[ns]?.[key]}}}
  const zima={id:'zima',uuid:'Actor.zima',name:'Zima'};
  const z={id:'zima-turn',actor:zima,actorId:zima.id,tokenId:'zimatoken',sceneId:'scene'};
  const s={id:'sentinel-turn',actor:target,actorId:target.id,tokenId:'target',sceneId:'scene'};
  const turns=targetFirst?[s,z]:[z,s];
  const combat={id:'combat-134',started:true,round:2,turn:targetFirst?1:0,turns,
    combatants:turns,combatant:z};
  const gm={id:'gm',active:true,isGM:true};
  globalThis.game={combat,user:gm,users:{find:()=>gm},time:{worldTime:200}};
  function setTurn(round,who){combat.round=round;combat.turn=combat.turns.findIndex(c=>c===who);combat.combatant=who;}
  return {target,zima,z,s,combat,effects,operations,setTurn,restore:()=>{globalThis.game=previous}};
}

test('v134: Ice remains during the first Sentinel turn and the next round boundary; expires only at the second Sentinel turn',async()=>{
  const f=fixture();try{
    assert.equal(findElementalTargetCombatant(f.combat,f.target,'Scene.scene.Token.target'),f.s);
    const applied=await replaceElementalEffect(f.target,ice,{key:'ice',sourceActorUuid:f.zima.uuid,
      sourceSpeaker:{actor:'zima',token:'zimatoken',scene:'scene'},targetTokenUuid:'Scene.scene.Token.target'});
    const flags=applied.getFlag(SYS,'elementalFantastic');
    assert.equal(applied.duration.value,null,'do not give Foundry a native round timer');
    assert.equal(flags.targetCombatantId,f.s.id);
    assert.equal(flags.expireAtRound,3);
    f.setTurn(2,f.s);await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.effects.length,1,'Sentinel must remain Paralyzed on his first turn');
    f.setTurn(3,f.z);await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.effects.length,1,'round boundary cannot remove Paralyzed');
    f.setTurn(3,f.s);
    assert.equal(shouldExpireElementalTargetStatus(applied,f.combat),true);
    await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.effects.length,0,'status removed only when Sentinel acts again');
    assert.deepEqual(f.operations.filter(op=>op[0]==='delete'),[['delete',applied.id]]);
    await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.operations.filter(op=>op[0]==='delete').length,1);
  }finally{f.restore()}
});

test('v134: if Sentinel already acted, his next turn is first affected; expires on following turn',async()=>{
  const f=fixture({targetFirst:true});try{
    const fx=await replaceElementalEffect(f.target,ice,{key:'ice',targetTokenUuid:'Scene.scene.Token.target'});
    assert.equal(elementalTargetExpiryRound(f.combat,f.s,1),4);
    assert.equal(fx.getFlag(SYS,'elementalFantastic').expireAtRound,4);
    f.setTurn(3,f.s);await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.effects.length,1);
    f.setTurn(4,f.s);await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.effects.length,0);
  }finally{f.restore()}
});

test('v134: preexisting Paralysis is not claimed, changed or removed',async()=>{
  const f=fixture({alreadyActive:true});try{
    const fx=await replaceElementalEffect(f.target,ice,{key:'ice'});
    assert.equal(fx,null,'preexisting status is not ours and need not be rewritten');
    assert.equal(f.target.statuses.has('mmrpg.paralyzed'),true);
    f.setTurn(3,f.s);await cleanupExpiredElementalEffects(f.combat);
    assert.equal(f.target.statuses.has('mmrpg.paralyzed'),true);
    assert.equal(f.operations.filter(op=>op[0]==='delete').length,0);
  }finally{f.restore()}
});

test('v134: native elemental without an initiative target retains its normal native duration',async()=>{
  const f=fixture();try{
    f.combat.combatants=[f.z];f.combat.turns=[f.z];
    const fx=await replaceElementalEffect(f.target,ice,{key:'ice'});
    assert.equal(fx.duration.value,1);
    assert.equal(fx.getFlag(SYS,'elementalFantastic').managedTargetExpiry,false);
  }finally{f.restore()}
});

test('v134: the turn-notice reads effects only after elemental expiration cleanup',async()=>{
  const fs=await import('node:fs');
  const src=fs.readFileSync(new URL('../scripts/custom-automations.mjs',import.meta.url),'utf8');
  const begin=src.indexOf('export async function processCustomConditionTurn(combat)');
  const clean=src.indexOf('await cleanupExpiredElementalEffects(combat)',begin);
  const notices=src.indexOf('const entries=conditionTurnEntries(actor,combat)',begin);
  assert.ok(clean>begin && notices>clean);
});
