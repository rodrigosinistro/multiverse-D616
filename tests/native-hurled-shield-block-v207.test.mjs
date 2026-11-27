import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeSupportRule,inspectSupportRequest,executeNativeSupportTransaction} from '../scripts/native-power-support.mjs';
import {nativeGuardReactionRule} from '../scripts/native-power-reactive-guards.mjs';
import {sourceShieldLevel,pendingHurledShield,inspectHurledShieldBlock,
  hurledShieldDamageForEntry,consumeHurledShield,isHurledShieldExpired} from '../scripts/native-power-hurled-shield.mjs';
const powers=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const official=powers.find(p=>p.name==='Hurled Shield Block'&&p.system.powerSet==='Shield Bearer');
assert.ok(official);
function setup({shield=2, focus=30,otherDR=0}={}){
  const caster={id:'caster',uuid:'Actor.caster',name:'Zima',effects:[],
    system:{attributes:{rank:{value:3}},focus:{value:focus,max:40}},items:{contents:[]},
    async update(p){this.system.focus.value=p['system.focus.value'];}};
  const shieldItem={id:'shield',uuid:'Actor.caster.Item.shield',type:'power',name:`Shield ${shield}`,system:{powerSet:'Shield Bearer'}};
  const power={...official,actor:caster,id:'shield-block'};
  caster.items.contents=[shieldItem,power];
  caster.effects.push({id:'shield-ae',flags:{'multiverse-d616':{concentrationPower:{itemId:'shield'}}}});
  const target={id:'ally',uuid:'Actor.ally',name:'Thermal Prime',effects:[],
    system:{healthDamageReduction:otherDR},created:0,deleted:[],
    async createEmbeddedDocuments(type,docs){assert.equal(type,'ActiveEffect');
      this.created++;const res=docs.map((d,i)=>({...d,id:`shield${this.created}-${i}`}));this.effects.push(...res);return res;},
    async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.deleted.push(...ids);this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
  const scene={id:'scene',grid:{size:100},tokens:{contents:[]}};
  const source={id:'src',actorId:'caster',actor:caster,disposition:1,parent:scene,x:0,y:0,width:1,height:1};
  const ally={id:'ally-token',actorId:'ally',actor:target,disposition:1,parent:scene,x:200,y:0,width:1,height:1,name:'Thermal Prime'};
  scene.tokens.contents=[source,ally];scene.tokens.get=id=>scene.tokens.contents.find(t=>t.id===id);
  const combatant={id:'ct',actor:caster,actorId:'caster',tokenId:'src'};
  const combat={id:'cmb',started:true,round:1,turn:2,combatant:{id:'foe'},combatants:[combatant]};
  const events=[],tracker={used:0,takes:0,refunds:0,
    getState(){return {reactionUsed:this.used,reactionMax:1};},
    async trackItemUse(){this.takes++;this.used++;return true;},
    async refundReaction(){this.refunds++;this.used--;}};
  const prev={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',isGM:true}},combat,
    multiverseD616:{turnTracker:tracker}};
  globalThis.ChatMessage={getSpeaker:()=>({alias:'Zima'}),async create(data){events.push(data);return data;}};
  return {caster,target,scene,source,ally,combat,tracker,power,events,
    params:{caster,item:power,scene,sourceToken:source,targetTokens:[ally],spent:5,combat},
    restore(){globalThis.game=prev.game;globalThis.ChatMessage=prev.ChatMessage;}};
}
const attack=({DR=0,die=5,DM=5,fantastic=false,factor=1,bonus=3,damage=null,category='health'}={})=>({
  category,marvelDie:die,damageMultiplier:DM,damageReduction:DR,
  abilityDamage:bonus,flatBonus:0,fantastic,damageFactor:factor,
  damage:damage??Math.ceil((Math.max(0,DM-DR)*die+bonus)*factor),
});
const shield=e=>pendingHurledShield(e.target,{combat:e.combat,tokenId:e.ally.id});
const calc=(e,entry,other={})=>hurledShieldDamageForEntry(entry,{actor:e.target,tokenId:e.ally.id,
  combat:e.combat,damageMessage:{id:'already-rolled-before-reaction'},...other});
test('v207 exact official Hurled Shield Block goes through atomic ally-targeting route, not the guard-only text',()=>{
  const e=setup();try{
    assert.equal(nativeSupportRule(e.power)?.kind,'shield-block');
    assert.equal(nativeGuardReactionRule(e.power),null);
    assert.equal(sourceShieldLevel(e.caster),2);
    assert.match(e.power.system.effect,/Redução de Dano de Health/);
  }finally{e.restore();}
});
test('v207 as GM and player path, one reaction and 5 Focus create one real token-scoped shield marker and full chat',async()=>{
  const e=setup();try{
    assert.equal(inspectSupportRequest(e.params).ok,true);
    const result=await executeNativeSupportTransaction(e.params);
    assert.equal(result.ok,true);
    assert.equal(e.caster.system.focus.value,25);
    assert.equal(e.tracker.takes,1);
    assert.equal(e.target.effects.length,1);
    assert.equal(shield(e).level,2);
    assert.match(e.events[0].content,/Redução de Dano de Health/);
    assert.match(e.events[0].content,/RD de Health temporária/);
    assert.match(e.events[0].content,/Thermal Prime/);
    assert.equal(shield(e).targetTokenId,'ally-token');
    assert.equal(shield(e).sourceCombatantId,'ct');
  }finally{e.restore();}
});
test('v207 after card was rolled, RD is applied at damage confirmation and never stacks with own RD',async()=>{
  const e=setup();try{
    await executeNativeSupportTransaction(e.params);
    assert.equal(calc(e,attack({DR:0})).damage,18); // 5 × (5 - 2) + 3
    assert.equal(calc(e,attack({DR:1,damage:23})).damage,18);
    e.target.system.healthDamageReduction=3;
    assert.equal(calc(e,attack({DR:3,damage:13})).damage,13,'better personal DR wins');
    e.target.system.healthDamageReduction=0;
    assert.equal(calc(e,attack({DR:0,DM:2})).damage,0,'at DM zero even ability bonus disappears');
    assert.equal(calc(e,attack({DR:0,category:'focus'})).damage,28,'Focus is not reduced');
    assert.equal(calc(e,attack({DR:0}),{damageMessage:null}),null,'recurring damage ignores the marker');
    assert.equal(calc(e,attack({DR:0}),{tokenId:'another-linked-token'}),null,'other token not protected');
    await consumeHurledShield(e.target,shield(e));
    assert.equal(shield(e),null,'one use is consumed after resolving target damage');
    assert.equal(calc(e,attack()),null,'next attack has no shield RD');
    assert.equal(e.caster.system.focus.value,25);
  }finally{e.restore();}
});
test('v207 fantastic damage, power factors, half damage and Adamantium respect the same DR difference',async()=>{
  const e=setup({shield:3});try{
    await executeNativeSupportTransaction(e.params);
    assert.equal(calc(e,attack({DM:5,fantastic:true,factor:2})).damage,26); // normal 5×2+3, then double
    assert.equal(calc(e,attack({DM:5,fantastic:true,factor:3})).damage,39);
    assert.equal(calc(e,attack({DM:5,factor:0.5})).damage,7);
    assert.equal(calc(e,attack({DM:5}),{action:'half'}).damage,13,'helper returns pre-half damage; GM half rounds up');
    assert.equal(calc(e,attack({DM:5}),{piercing:3}).damage,28,'Adamantium piercing 3 cancels RD 3');
  }finally{e.restore();}
});
test('v207 only one pending marker; cancel/missing target and invalid range consume nothing',async()=>{
  const e=setup();try{
    await executeNativeSupportTransaction(e.params);
    const again=inspectSupportRequest(e.params);
    assert.equal(again.ok,false);assert.match(again.reason,/já possui/);
    await assert.rejects(executeNativeSupportTransaction(e.params),/já possui/);
    assert.equal(e.tracker.takes,1);
    e.ally.x=20000;
    assert.match(inspectSupportRequest({...e.params,targetTokens:[e.ally]}).reason,/fora do alcance/);
    assert.equal(e.caster.system.focus.value,25);
  }finally{e.restore();}
});
test('v207 use refuses an enemy, self, not-in-combat and no Shield power',()=>{
  const e=setup();try{
    e.ally.disposition=-1;
    assert.match(inspectHurledShieldBlock({caster:e.caster,sourceToken:e.source,targetToken:e.ally,scene:e.scene,combat:e.combat}).reason,/aliados/);
    e.ally.disposition=1;
    assert.match(inspectHurledShieldBlock({caster:e.caster,sourceToken:e.source,targetToken:e.source,scene:e.scene,combat:e.combat}).reason,/aliado diferente/);
    e.caster.items.contents=[e.power];
    assert.match(inspectHurledShieldBlock({caster:e.caster,sourceToken:e.source,targetToken:e.ally,scene:e.scene,combat:e.combat}).reason,/Shield 1/);
  }finally{e.restore();}
});
test('v207 no reaction, chat failure and target-write failure refund exactly what was used',async()=>{
  for(const failure of ['reaction','chat','effect']){
    const e=setup();try{
      if(failure==='reaction')e.tracker.getState=()=>({reactionUsed:1,reactionMax:1});
      if(failure==='chat')globalThis.ChatMessage.create=async()=>{throw new Error('chat unavailable');};
      if(failure==='effect')e.target.createEmbeddedDocuments=async()=>{throw new Error('write forbidden');};
      await assert.rejects(executeNativeSupportTransaction(e.params));
      assert.equal(e.caster.system.focus.value,30,failure);
      assert.equal(e.target.effects.length,0,failure);
      assert.equal(e.tracker.used,0,failure==='reaction'? 'no spend':'refunded');
      assert.equal(e.tracker.refunds,failure==='reaction'?0:1);
    }finally{e.restore();}
  }
});
test('v207 expired at next caster turn or combat end, never on same turn',()=>{
  const e=setup();try{
    const r={version:1,combatId:'cmb',sourceCombatantId:'ct',round:1,turn:2};
    assert.equal(isHurledShieldExpired(r,e.combat),false);
    assert.equal(isHurledShieldExpired(r,{...e.combat,combatant:{id:'ct'}}),false);
    assert.equal(isHurledShieldExpired(r,{...e.combat,round:2,turn:0,combatant:{id:'ct'}}),true);
    assert.equal(isHurledShieldExpired(r,{...e.combat,started:false}),true);
  }finally{e.restore();}
});
test('v207 damage confirmation stays GM-only and consumes shield after application',()=>{
  const s=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
  assert.match(s,/hurledShieldDamageForEntry\(entry/);
  assert.match(s,/if\(oneShield\?\.guard\)await consumeHurledShield\(actor,oneShield.guard\)/);
  assert.ok(s.indexOf('await applyDelta({actor,category:entry.category,delta,heal})')<s.indexOf('await consumeHurledShield(actor,oneShield.guard)'));
  const primary=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.ok(primary.indexOf('if(nativeGuardReactionRule(this))')<primary.indexOf('if(nativeSupportRule(this))'));
});
