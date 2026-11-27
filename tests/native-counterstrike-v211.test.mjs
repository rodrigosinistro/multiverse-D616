import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {hasAttackStanceConcentration} from '../scripts/native-power-martial-stances.mjs';
import {isCounterstrikeTechnique,inspectCounterstrikeTrigger,
  calculateCounterstrikeReturn,latestPublicCounterstrikeAttack,
  isOfficialCounterstrike,
  latestCounterstrikeDamage,counterstrikeCardData,commitCounterstrike,registerCounterstrikeHooks}
  from '../scripts/native-power-counterstrike.mjs';
const NS='multiverse-d616';
const flag=(doc,name)=>doc.flags?.[NS]?.[name];
const official=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items
  .find(p=>p.name==='Counterstrike Technique'&&p.system.powerSet==='Martial Arts');
assert.ok(official);

function world({dr=2,focus=40,delta=29,ability='mle',fantastic=true,stance=true,
  attackCategory='health',transient=true}={}){
  const scene={id:'scene',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id);}}};
  const attacker={id:'atk-a',uuid:'Scene.scene.Token.atk',name:'Orgulhoso Sentinel',
    system:{healthDamageReduction:dr,focusDamageReduction:0,health:{value:150,max:150}}};
  const counter={...official,id:'ctr',flags:{'scene-packer':{sourceId:'Compendium.multiverse-d616.powers.Item.Z2bM6AFg0F0jtzm3'}},actor:null};
  const stancePower={id:'stance',type:'power',name:'Attack Stance',system:{powerSet:'Martial Arts'}};
  const defender={id:'def',uuid:'Actor.def',name:'Zima',system:{focus:{value:focus,max:120},attributes:{rank:{value:3}}},
    effects:stance?[{id:'ae',flags:{[NS]:{concentrationPower:{transient,itemId:'stance'}}}}]:[],
    items:{contents:[counter,stancePower],get(id){return this.contents.find(p=>p.id===id);}},
    async update(data){this.system.focus.value=data['system.focus.value'];}};
  counter.actor=defender;
  const atkToken={id:'atk',uuid:'Scene.scene.Token.atk',actorId:'atk-a',parent:scene,
    actor:attacker,name:'Orgulhoso Sentinel'};
  const defToken={id:'def',uuid:'Scene.scene.Token.def',actorId:'def',parent:scene,actor:defender,name:'Zima'};
  scene.tokens.contents=[atkToken,defToken];
  const attack={id:'attack-card',speaker:{scene:'scene',token:'atk'},rolls:[{total:18}],
    flags:{[NS]:{ability,combatChatResolution:{targets:[{targetUuid:defToken.uuid,damage:delta,
      category:attackCategory}],action:'full'}}},flavor:'ability: Melee',getFlag(scope,name){return this.flags[scope]?.[name];}};
  const damage={id:'damage-card',flags:{[NS]:{sourceMessageId:attack.id,
    mmdrResolved:{action:'full',results:[{targetUuid:defToken.uuid,delta,category:attackCategory}]},
    damageApplication:{entries:[{targetUuid:defToken.uuid,marvelDie:4,
      damageMultiplier:8,abilityDamage:5,flatBonus:0,
      fantastic,category:attackCategory}]}}},
    getFlag(scope,name){return this.flags[scope]?.[name];},
    async setFlag(scope,name,value){this.flags[scope]??={};this.flags[scope][name]=value;}};
  const combatant={id:'cc',actor:defender,actorId:defender.id,tokenId:defToken.id};
  const combat={id:'cmb',started:true,round:1,turn:0,combatants:[combatant]};
  const tracker={takes:0,refunds:0,accept:true,
    async trackItemUse(item){assert.equal(item,counter);this.takes++;return this.accept;},
    async refundReaction(){this.refunds++;}};
  const messages={contents:[attack,damage],get(id){return this.contents.find(m=>m.id===id);}};
  const prevGame=globalThis.game;
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',isGM:true}},combat,messages,
    multiverseD616:{turnTracker:tracker}};
  return {scene,defender,defToken,atkToken,attack,damage,combat,counter,tracker,messages,
    restore(){globalThis.game=prevGame;}};
}

test('v211: exactly the official Martial Arts Item is recognized; registry contains one more partial macro',()=>{
  assert.equal(isCounterstrikeTechnique(official),true);
  assert.equal(isCounterstrikeTechnique({...official,system:{...official.system,powerSet:'Basic'}}),false);
  assert.equal(REGISTERED_AUTOMATIONS.length,162);
  assert.equal(REGISTERED_AUTOMATIONS.filter(x=>x.powerName==='Counterstrike Technique'&&x.powerSet==='Martial Arts').length,1);
  assert.equal(REGISTERED_AUTOMATIONS.find(x=>x.powerId==='Z2bM6AFg0F0jtzm3')?.handlerId,'counterstrike-technique');
});

test('v212: GM accepts a real Actor-embedded copy with DIFFERENT local Item ID/UUID',async()=>{
  const e=world();try{
    e.counter.uuid='Actor.def.Item.abcdefghijklmnop';
    assert.equal(isOfficialCounterstrike(e.counter),true,
      'local Actor item UUID must not be compared to the original compendium ID');
    const cards=[];
    const result=await commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker,
      createMessage:async data=>{cards.push(data);return {id:'confirmed-card'};}});
    assert.equal(result.ok,true);assert.equal(result.damage,15);
    assert.equal(cards.length,1);assert.equal(e.defender.system.focus.value,35);
  }finally{e.restore();}
});

test('v212: GM resolves a unique official token copy even if player Item ID differs',async()=>{
  const e=world();try{
    e.counter.uuid='Scene.scene.Token.def.Actor.def.Item.abcdefghijklmnop';
    assert.equal(isOfficialCounterstrike(e.counter),true);
    const prev={Hooks:globalThis.Hooks,ChatMessage:globalThis.ChatMessage};
    try{
      const player={id:'player',isGM:false},gm={id:'gm',isGM:true};
      globalThis.game.users={activeGM:gm,get(id){return id==='player'?player:id==='gm'?gm:null;}};
      globalThis.game.scenes={get:id=>id==='scene'?e.scene:null};
      e.defender.testUserPermission=user=>user?.id==='player';
      const handlers=[];globalThis.Hooks={on(_name,fn){handlers.push(fn);}};
      registerCounterstrikeHooks();
      let response;
      const channel={id:'world-def',isToken:false,testUserPermission:()=>true,
        async update(data){response=JSON.parse(data[`flags.${NS}.nativeCounterstrikeResultV1`]);}};
      const cards=[];
      globalThis.ChatMessage={async create(data){cards.push(data);return {id:'counter-card'};}};
      const packet={id:'v212-request',sceneId:'scene',sourceTokenId:'def',sourceActorId:'def',
        itemId:'other-client-item-id',powerId:'Z2bM6AFg0F0jtzm3',attackMessageId:'attack-card'};
      handlers[0](channel,{flags:{[NS]:{nativeCounterstrikeRequestV1:JSON.stringify(packet)}}},{},'player');
      for(let i=0;i<25&&!response;i++)await new Promise(resolve=>setTimeout(resolve,2));
      assert.equal(response?.ok,true,response?.reason);assert.equal(cards.length,1);
      assert.equal(e.defender.system.focus.value,35);
    }finally{globalThis.Hooks=prev.Hooks;globalThis.ChatMessage=prev.ChatMessage;}
  }finally{e.restore();}
});

test('v212: the GM rejects false compendium provenance and a different registered identity',()=>{
  const e=world();try{
    e.counter.uuid='Actor.def.Item.abcdefghijklmnop';
    assert.equal(isOfficialCounterstrike(e.counter),true);
    e.counter.flags.core={sourceId:'Compendium.multiverse-d616.powers.Item.PGSginCgCb9Jh5ev'};
    assert.equal(isOfficialCounterstrike(e.counter),false);
    delete e.counter.flags.core;
    e.counter.flags[NS]={nativeAutomation:{powerId:'PGSginCgCb9Jh5ev'}};
    assert.equal(isOfficialCounterstrike(e.counter),false);
    delete e.counter.flags[NS];
    e.counter.flags['scene-packer'].sourceId='Compendium.multiverse-d616.powers.Item.Z2bM6AFg0F0jtzm3';
    assert.equal(isOfficialCounterstrike(e.counter),true);
    e.counter.flags['scene-packer'].sourceId='Compendium.world.powers.Item.aaaaaaaaaaaaaaaa';
    assert.equal(isOfficialCounterstrike(e.counter),false);
    delete e.counter.flags['scene-packer'];
    assert.equal(isOfficialCounterstrike(e.counter),true,
      'imported, otherwise unannotated official Item must match the bounded registry');
  }finally{e.restore();}
});

test('v211: Marvel FAQ She-Hulk example 37 normal, RD 0 returns 19, RD 2 returns 15',()=>{
  const snapshot={marvelDie:4,damageMultiplier:8,abilityDamage:5,flatBonus:0};
  assert.deepEqual(calculateCounterstrikeReturn(snapshot,0),{normal:37,returnDamage:19,reduction:0,effectiveMultiplier:8});
  assert.deepEqual(calculateCounterstrikeReturn(snapshot,2),{normal:29,returnDamage:15,reduction:2,effectiveMultiplier:6});
  assert.deepEqual(calculateCounterstrikeReturn(snapshot,8),{normal:0,returnDamage:0,reduction:8,effectiveMultiplier:0});
  assert.equal(calculateCounterstrikeReturn({...snapshot,flatBonus:3},2).returnDamage,16);
  assert.throws(()=>calculateCounterstrikeReturn(snapshot,NaN),/inválida/);
});

test('v211: trigger requires original attack and REAL positive confirmed Melee damage',()=>{
  const e=world();try{
    assert.equal(hasAttackStanceConcentration(e.defender),true);
    const trigger=inspectCounterstrikeTrigger({damageMessage:e.damage,attackMessage:e.attack,
      scene:e.scene,defenderToken:e.defToken,combat:e.combat});
    assert.equal(trigger.ok,true);assert.equal(trigger.snapshot.marvelDie,4);
    e.damage.flags[NS].mmdrResolved.results[0].delta=0;
    assert.match(inspectCounterstrikeTrigger({damageMessage:e.damage,attackMessage:e.attack,
      scene:e.scene,defenderToken:e.defToken,combat:e.combat}).reason,/não causou dano/);
    e.damage.flags[NS].mmdrResolved.results[0].delta=29;
    e.attack.flags[NS].ability='agl';e.attack.flavor='ability: Agility';
    assert.match(inspectCounterstrikeTrigger({damageMessage:e.damage,attackMessage:e.attack,
      scene:e.scene,defenderToken:e.defToken,combat:e.combat}).reason,/Melee/);
    e.attack.flags[NS].ability='mle';e.attack.flavor='ability: Melee';
    e.damage.flags[NS].mmdrResolved.action='heal';
    assert.match(inspectCounterstrikeTrigger({damageMessage:e.damage,attackMessage:e.attack,
      scene:e.scene,defenderToken:e.defToken,combat:e.combat}).reason,/confirmou DANO/);
  }finally{e.restore();}
});

test('v211: public client can locate confirmed ATTACK without private technical card',()=>{
  const e=world();try{
    const onlyPublic={contents:[e.attack]};
    assert.equal(latestPublicCounterstrikeAttack(onlyPublic,e.scene,e.defToken).attackMessage.id,e.attack.id);
    e.attack.flags[NS].combatChatResolution.targets[0].damage=0;
    assert.equal(latestPublicCounterstrikeAttack(onlyPublic,e.scene,e.defToken).ok,false);
  }finally{e.restore();}
});

test('v211: GM source reconstruction uses the latest receipt, not an older spent attack',()=>{
  const e=world();try{
    assert.equal(latestCounterstrikeDamage(e.messages,e.scene,e.defToken,e.combat).ok,true);
    e.damage.flags[NS].nativeCounterstrikeUsedTokensV1=['def'];
    assert.match(latestCounterstrikeDamage(e.messages,e.scene,e.defToken,e.combat).reason,/já foi usado/);
    e.damage.flags[NS].nativeCounterstrikeUsedTokensV1=[];
  }finally{e.restore();}
});

test('v211: GM spends exactly one Reaction and 5 Focus and creates a ONE-CLICK damage card for the ORIGINAL attacker',async()=>{
  const e=world();try{
    const cards=[];
    const result=await commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker,
      attackMessageId:e.attack.id,createMessage:async data=>{cards.push(data);return {id:'counter-card'};}});
    assert.equal(result.ok,true);assert.equal(result.damage,15);
    assert.equal(e.tracker.takes,1);assert.equal(e.tracker.refunds,0);
    assert.equal(e.defender.system.focus.value,35);
    assert.deepEqual(flag(e.damage,'nativeCounterstrikeUsedTokensV1'),['def']);
    assert.equal(cards.length,1);
    const card=cards[0],flags=card.flags[NS],entry=flags.damageApplication.entries[0];
    assert.equal(entry.targetUuid,e.atkToken.uuid);
    assert.equal(entry.actorUuid,e.atkToken.actor.uuid);
    assert.equal(entry.damage,15);assert.equal(entry.rawDamage,15);
    assert.equal(entry.category,'health');assert.equal(entry.fantastic,false);
    assert.equal(flags.sourceMessageId,undefined,'never attach as a duplicate of an already resolved original attack');
    assert.match(card.flavor,/Counterstrike Technique/);
    assert.match(card.content,/15 de Health/);
    assert.match(card.content,/clique em <strong>DANO<\/strong>/);
    assert.match(readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8'),/nativeCounterstrikeDamage/);
    await assert.rejects(commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker}),/já foi usado/);
    assert.equal(e.tracker.takes,1);assert.equal(e.defender.system.focus.value,35);
  }finally{e.restore();}
});

test('v211: Fantastic attack damage is NOT doubled when returning half normal damage',async()=>{
  const e=world({dr:0,fantastic:true,delta:74});try{
    const cards=[];await commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker,
      createMessage:async data=>{cards.push(data);return {id:'new'};}});
    assert.equal(cards[0].flags[NS].damageApplication.entries[0].damage,19);
    assert.equal(e.defender.system.focus.value,35);
  }finally{e.restore();}
});

test('v211: without Attack Stance, no Reaction, Focus or card is committed',async()=>{
  const e=world({stance:false});try{
    assert.equal(hasAttackStanceConcentration(e.defender),false);
    await assert.rejects(commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker}),/Attack Stance/);
    assert.equal(e.tracker.takes,0);assert.equal(e.defender.system.focus.value,40);
  }finally{e.restore();}
});

test('v211: refused reaction does not charge Focus or mark confirmed attack',async()=>{
  const e=world();try{
    e.tracker.accept=false;
    await assert.rejects(commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker}),/Reação não autorizada/);
    assert.equal(e.defender.system.focus.value,40);assert.equal(flag(e.damage,'nativeCounterstrikeUsedTokensV1'),undefined);
  }finally{e.restore();}
});

test('v211: if publishing the damage card fails, refund only own Focus, Reaction and trigger marker',async()=>{
  const e=world();try{
    await assert.rejects(commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker,
      createMessage:async()=>{throw Error('offline chat');}}),/offline chat/);
    assert.equal(e.defender.system.focus.value,40);assert.equal(e.tracker.refunds,1);
    assert.deepEqual(flag(e.damage,'nativeCounterstrikeUsedTokensV1'),[]);
  }finally{e.restore();}
});

test('v211: no pre-application to attacker; only the MMDR GM DANO action may change attacker Health',async()=>{
  const e=world();try{
    const previous=e.atkToken.actor.system.health.value;
    await commitCounterstrike({caster:e.defender,item:e.counter,sourceToken:e.defToken,
      scene:e.scene,combat:e.combat,messages:e.messages,tracker:e.tracker,
      createMessage:async()=>({id:'card-created'})});
    assert.equal(e.atkToken.actor.system.health.value,previous);
    const dmgSource=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
    assert.match(dmgSource,/if\(message.getFlag\?\.\(MODULE_ID,'nativeCounterstrikeDamage'\)&&action!=='full'\)/);
    assert.match(dmgSource,/await applyExactEntries\(exactEntries, action,modes,message\)/);
  }finally{e.restore();}
});

test('v211: authenticated GM handles PLAYER atomic Actor request and returns a complete atomic ACK',async()=>{
  const e=world();
  const prev={Hooks:globalThis.Hooks,ChatMessage:globalThis.ChatMessage};
  try{
    const player={id:'player',isGM:false},gm={id:'gm',isGM:true};
    globalThis.game.users={activeGM:gm,get(id){return id==='player'?player:id==='gm'?gm:null;}};
    globalThis.game.scenes={get(id){return id==='scene'?e.scene:null;}};
    e.defender.testUserPermission=user=>user.id==='player';
    const handlers=[];globalThis.Hooks={on(name,fn){if(name==='updateActor')handlers.push(fn);}};
    registerCounterstrikeHooks();assert.equal(handlers.length,1);
    const cards=[];
    globalThis.ChatMessage={async create(data){cards.push(data);return {id:'counter-chat-created'};}};
    let response;
    const channel={id:'world-def',isToken:false,testUserPermission:user=>user.id==='player',
      async update(data){const packet=data[`flags.${NS}.nativeCounterstrikeResultV1`];response=JSON.parse(packet);}};
    const packet={id:'request-1',sceneId:'scene',sourceTokenId:'def',sourceActorId:'def',
      itemId:'ctr',powerId:'Z2bM6AFg0F0jtzm3',attackMessageId:'attack-card'};
    handlers[0](channel,{flags:{[NS]:{nativeCounterstrikeRequestV1:JSON.stringify(packet)}}},{},'player');
    for(let i=0;i<15&&!response;i++)await new Promise(resolve=>setTimeout(resolve,2));
    assert.equal(response?.ok,true,response?.reason);assert.equal(response?.id,'request-1');
    assert.equal(response?.damage,15);assert.equal(e.defender.system.focus.value,35);
    assert.equal(e.tracker.takes,1);assert.equal(cards.length,1);
  }finally{e.restore();globalThis.Hooks=prev.Hooks;globalThis.ChatMessage=prev.ChatMessage;}
});

test('v211: GM rejects unauthorized / wrong-scene player packets before spending Focus',async()=>{
  const e=world();
  const prev={Hooks:globalThis.Hooks,ChatMessage:globalThis.ChatMessage};
  try{
    const player={id:'player',isGM:false},gm={id:'gm',isGM:true};
    globalThis.game.users={activeGM:gm,get(id){return id==='player'?player:id==='gm'?gm:null;}};
    globalThis.game.scenes={get:()=>e.scene};
    e.defender.testUserPermission=()=>false;
    const handlers=[];globalThis.Hooks={on(name,fn){if(name==='updateActor')handlers.push(fn);}};
    registerCounterstrikeHooks();
    globalThis.ChatMessage={create:async()=>{throw Error('must never publish');}};
    let response;const channel={id:'chan',isToken:false,testUserPermission:()=>true,
      async update(data){response=JSON.parse(data[`flags.${NS}.nativeCounterstrikeResultV1`]);}};
    handlers[0](channel,{flags:{[NS]:{nativeCounterstrikeRequestV1:JSON.stringify({
      id:'request-2',sourceActorId:'def',sceneId:'scene',sourceTokenId:'def',
      itemId:'ctr',powerId:'Z2bM6AFg0F0jtzm3',attackMessageId:'attack-card',
    })}}},{},'player');
    for(let i=0;i<15&&!response;i++)await new Promise(resolve=>setTimeout(resolve,2));
    assert.equal(response?.ok,false);assert.match(response.reason,/OWNER/);
    assert.equal(e.tracker.takes,0);assert.equal(e.defender.system.focus.value,40);
  }finally{e.restore();globalThis.Hooks=prev.Hooks;globalThis.ChatMessage=prev.ChatMessage;}
});
