import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 isBrainDrain,isKillZone,isVenomSword,isVenomSwordWeapon,
 brainDrainRecovery,cappedFocusRecovery,confirmBrainDrain,
 checkKillZone,finishKillZone,applyVenomSword,isActiveVenomSwordWeapon,
} from '../scripts/native-priority-lot1.mjs';

const SYS='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
function power(name,set){
 const original=catalog.find(p=>p.name===name&&p.system.powerSet===set);
 assert.ok(original);
 return {name,type:'power',id:`owned-${original._id}`,system:{...original.system}};
}
function itemsOf(values){return {contents:values,get(id){return this.contents.find(i=>i.id===id)}};}
function caster(){
 const brain=power('Brain Drain','Magic'),kill=power('Kill Zone','Ranged Weapons'),venom=power('Venom Sword','Spider-Powers');
 const actor={id:'hero',name:'Hero',uuid:'Actor.hero',effects:[],flags:{[SYS]:{}},
   system:{focus:{value:60,max:100}},items:itemsOf([brain,kill,venom]),
   getFlag(ns,key){return this.flags?.[ns]?.[key]},
   async setFlag(ns,key,val){this.flags[ns]??={};this.flags[ns][key]=val},
   async update(patch){if('system.focus.value'in patch)this.system.focus.value=patch['system.focus.value']},
   async createEmbeddedDocuments(type,list){assert.equal(type,'Item');return list.map(item=>{
     const weapon={...item,id:`generated-${this.items.contents.length}`,actor:this,
       async update(patch){for(const [key,v] of Object.entries(patch)){
         if(key==='name')this.name=v;
         if(key.startsWith('system.'))this.system[key.split('.')[1]]=v;
         if(key===`flags.${SYS}.nativeVenomSwordWeapon`)this.flags[SYS].nativeVenomSwordWeapon=v;
       }}};
     this.items.contents.push(weapon);return weapon;
   });},
 };
 for(const item of actor.items.contents)item.actor=actor;
 return {actor,brain,kill,venom};
}
const ref='Scene.scene.Token.target';
function message(id,flags={},extra={}){return {id,speaker:{scene:'scene',token:'caster',actor:'hero'},rolls:[{}],
  flags:{[SYS]:flags},getFlag(ns,key){return this.flags?.[ns]?.[key]},
  async setFlag(ns,key,val){this.flags[ns]??={};this.flags[ns][key]=val},...extra};}

test('v218: catalog power identity is scoped to the official Power Set',()=>{
 const {brain,kill,venom}=caster();
 assert.ok(isBrainDrain(brain));assert.ok(isKillZone(kill));assert.ok(isVenomSword(venom));
 assert.equal(isKillZone({...kill,system:{...kill.system,powerSet:'Magic'}}),false);
 assert.equal(isVenomSword({...venom,type:'trait'}),false);
});

test('v218: Brain Drain heals half actual Focus loss, full on Fantastic; mitigation to 0 heals 0',()=>{
 const entries=[{targetUuid:'a',category:'focus',hit:true,fantastic:false},
  {targetUuid:'b',category:'focus',hit:true,fantastic:true}];
 const results=[{targetUuid:'a',category:'focus',delta:5},
  {targetUuid:'b',category:'focus',delta:7}];
 assert.deepEqual(brainDrainRecovery(results,entries),{loss:12,recovery:10});
 assert.deepEqual(brainDrainRecovery([{...results[0],delta:0,blocked:true}],entries),{loss:0,recovery:0});
 assert.deepEqual(brainDrainRecovery(results,entries,'heal'),{loss:0,recovery:0});
 assert.deepEqual(brainDrainRecovery([results[0],results[0]],entries),{loss:5,recovery:3});
 assert.deepEqual(cappedFocusRecovery({system:{focus:{value:98,max:100}}},30),{before:98,maximum:100,applied:2});
});

test('v218: GM Brain Drain receipt processes only once and respects max Focus',async()=>{
 const {actor,brain}=caster();actor.system.focus.value=96;
 const source=message('source',{itemId:brain.id,damageType:'focus'});
 const technical=message('tech',{sourceMessageId:'source',damageApplication:{version:1,sourceMessageId:'source',
   entries:[{targetUuid:ref,category:'focus',hit:true,fantastic:true}]}});
 const saved=globalThis.game;
 const posted=[];
 try{
  globalThis.game={user:{isGM:true}};
  const params={damageMessage:technical,action:'full',results:[{targetUuid:ref,category:'focus',delta:12,blocked:false}],
    messages:{get:id=>id==='source'?source:null},scenes:{get:()=>({tokens:{get:()=>({actor})}})},actors:{get:()=>actor},
    post:async x=>{posted.push(x);return x}};
  assert.equal((await confirmBrainDrain(params)).applied,4);
  assert.equal(actor.system.focus.value,100);
  assert.equal((await confirmBrainDrain(params)),null);
  assert.equal(posted.length,1);
  assert.equal(technical.getFlag(SYS,'nativeBrainDrainResolved').focusDamage,12);
 }finally{globalThis.game=saved;}
});

test('v218: Kill Zone validates one enemy, deduplicates and refunds Reaction even on miss',async()=>{
 const {actor,kill}=caster();
 const combatant={id:'c1',actor,actorId:actor.id};
 const combat={id:'battle',round:3,started:true,combatants:[combatant]};
 const tracker={getState:()=>({reactionUsed:1,reactionMax:2}),
   refunded:0,async refundReaction(c){assert.equal(c,combatant);this.refunded++;return true}};
 const targets=[{uuid:ref,actorUuid:'Actor.enemy'}];
 assert.equal(checkKillZone(kill,{combat,targets,tracker}).ok,true);
 assert.equal(checkKillZone(kill,{combat,targets:[],tracker}).ok,false);
 assert.equal(checkKillZone(kill,{combat,targets:[{uuid:ref,actorUuid:actor.uuid}],tracker}).ok,false);
 const notes=[];
 const resolved=await finishKillZone({item:kill,combat,targetUuid:ref,tracker,post:async data=>{notes.push(data)}});
 assert.equal(resolved.refunded,true);assert.equal(tracker.refunded,1);
 assert.equal(checkKillZone(kill,{combat,targets,tracker}).ok,false);
 assert.equal((await finishKillZone({item:kill,combat,targetUuid:ref,tracker,post:async()=>{}})).duplicate,true);
 assert.equal(tracker.refunded,1);assert.equal(notes.length,1);
 combat.round++;
 assert.equal(checkKillZone(kill,{combat,targets,tracker}).ok,true);
});

test('v218: Venom Sword creates/reuses its own equipped Melee weapon and requires live Concentration',async()=>{
 const {actor,venom}=caster();
 const effect={id:'conc',disabled:false,flags:{[SYS]:{concentrationPower:{transient:true,itemId:venom.id}}}};
 actor.effects.push(effect);
 const result=await applyVenomSword(actor,venom);
 assert.equal(result.kind,'native-venom-sword');
 const sword=actor.items.get(result.weaponId);
 assert.ok(isVenomSwordWeapon(sword));assert.ok(isActiveVenomSwordWeapon(sword));
 assert.equal(sword.system.damageMultiplierBonus,'2');assert.equal(sword.system.attackTarget,'mle');
 await applyVenomSword(actor,venom);
 assert.equal(actor.items.contents.filter(isVenomSwordWeapon).length,1);
 effect.disabled=true;
 assert.equal(isActiveVenomSwordWeapon(sword),false);
});

test('v218: normal weapon attacks do not inherit sword DM or stun snapshot',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const conditions=readFileSync(new URL('../scripts/power-conditions.mjs',import.meta.url),'utf8');
 assert.match(main,/isVenomSwordWeapon\(this\)&&isActiveVenomSwordWeapon\(this\)/);
 assert.match(main,/Math\.max\(weaponBonus, otherBonus\)/);
 assert.match(conditions,/VENOM_SWORD_RULES[\s\S]*requiresDamage:true,damageCategory:'health'/);
 assert.match(conditions,/swordAttackFromMessage\(original,item\)/);
 assert.match(main,/killZoneContext\?\.applicable/);
});

test('v218: Venom Sword requires Fantastic and Health loss before applying Stunned',async()=>{
 const {venomSwordConditionRules}=await import('../scripts/power-conditions.mjs');
 const fantastic={success:true,fantastic:true};
 assert.equal(venomSwordConditionRules(fantastic,{delta:8,category:'health'}).length,1);
 assert.equal(venomSwordConditionRules(fantastic,{delta:0,category:'health'}).length,0);
 assert.equal(venomSwordConditionRules(fantastic,{delta:8,category:'focus'}).length,0);
 assert.equal(venomSwordConditionRules({success:true,fantastic:false},{delta:8,category:'health'}).length,0);
 assert.equal(venomSwordConditionRules({success:false,fantastic:true},{delta:8,category:'health'}).length,0);
});

test('v218: ending sword Concentration unequips its blade without deleting pending attack source',async()=>{
 const {registerNativePriorityLot1Hooks}=await import('../scripts/native-priority-lot1.mjs');
 const {actor,venom}=caster();
 const effect={id:'c-conc',parent:actor,disabled:false,
  flags:{[SYS]:{concentrationPower:{transient:true,itemId:venom.id}}}};
 actor.effects.push(effect);
 const {weaponId}=await applyVenomSword(actor,venom);
 const weapon=actor.items.get(weaponId);
 const handlers={};
 registerNativePriorityLot1Hooks({hooks:{on:(name,cb)=>{handlers[name]=cb}}});
 assert.equal(weapon.system.equipped,true);
 handlers.deleteActiveEffect(effect);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(weapon.system.equipped,false);
 assert.ok(actor.items.get(weaponId),'the attack Item remains for GM damage confirmation');
});
