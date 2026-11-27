import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const S='multiverse-d616';
const source=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const power=(name,set)=>{const i=source.find(p=>p.name===name&&p.system.powerSet===set);assert.ok(i);return {...i,id:i._id};};
const infusion=power('Elemental Infusion','Elemental Control'),elemental=power('Elemental Reinforcement','Elemental Control'),telekinetic=power('Telekinetic Reinforcement','Telekinesis');
const {isElementalInfusion,isElementalReinforcement,isTelekineticReinforcement,isReinforcementPower,infusionEligibility,
 bindElementalInfusion,infusedWeaponAttack,infusionEligibleTargets,reinforcementOption,commitReinforcement,reinforcementForGuard}=
 await import('../scripts/native-priority-lot5.mjs');
const actor=(items=[])=>{
 const a={id:'owner',uuid:'Actor.owner',system:{defaultElement:'fire',focus:{value:90,max:100}},effects:[],
  items:{contents:items,get:id=>items.find(i=>i.id===id)},async update(updates){if('system.focus.value'in updates)this.system.focus.value=updates['system.focus.value'];}};
 items.forEach(i=>i.actor=a);return a;
};
const weapon=(id,equipped=true)=>({id,type:'weapon',name:'Espada '+id,system:{equipped,attackKind:'melee'}});
const effect=power=>({id:'effect'+power.id,disabled:false,flags:{[S]:{concentrationPower:{itemId:power.id,transient:true}}},
 async setFlag(ns,key,val){this.flags[ns][key]=val;}});
test('v223: authentic power scope and available equipped weapons',()=>{
 assert.ok(isElementalInfusion(infusion));assert.ok(isElementalReinforcement(elemental));assert.ok(isTelekineticReinforcement(telekinetic));
 assert.ok(isReinforcementPower(elemental)&&isReinforcementPower(telekinetic));
 assert.equal(isElementalInfusion({...infusion,system:{...infusion.system,powerSet:'Magic'}}),false);
 const w=weapon('a'),other=weapon('b',false);const a=actor([infusion,w,other]);
 assert.deepEqual(infusionEligibility(infusion).weapons,[w]);
 a.system.defaultElement='';assert.equal(infusionEligibility(infusion).ok,false);
});
test('v223: infused effect attaches only to chosen equipped weapon, and ends with concentration',async()=>{
 const w1=weapon('one'),w2=weapon('two'),a=actor([infusion,w1,w2]),e=effect(infusion);a.effects=[e];
 assert.equal(infusedWeaponAttack(w1),null);
 const mark=await bindElementalInfusion(infusion,w1.id);
 assert.equal(mark.weaponId,w1.id);
 assert.equal(infusedWeaponAttack(w2),null);
 assert.equal(infusedWeaponAttack(w1)?.key,'fire');
 assert.equal(infusedWeaponAttack(w1)?.elementalFantastic?.text,'O alvo fica Em Chamas.');
 w1.system.equipped=false;assert.equal(infusedWeaponAttack(w1),null);
 w1.system.equipped=true;e.disabled=true;assert.equal(infusedWeaponAttack(w1),null);
 e.disabled=false;a.system.defaultElement='ice';assert.equal(infusedWeaponAttack(w1),null);
});
test('v223: infused Fantastic effect is per-target and independent of damage delta, not blocked',()=>{
 const source={getFlag:(ns,k)=>k==='nativeElementalInfusion'?{version:1}:null};
 const entries=[{targetUuid:'t1',fantastic:true,hit:true},{targetUuid:'t2',fantastic:false,hit:true},{targetUuid:'t3',fantastic:true,hit:true}];
 const result=[{targetUuid:'t1',delta:0},{targetUuid:'t2',delta:7},{targetUuid:'t3',delta:0,blocked:true}];
 assert.deepEqual([...infusionEligibleTargets(source,entries,result)].sort(),['t1']);
 assert.equal(infusionEligibleTargets(source,entries,result,'heal'),null);
 assert.equal(infusionEligibleTargets({getFlag:()=>null},entries,result),null);
});
test('v223: reinforcements only protect matching personal shields on actual Health overflow',()=>{
 const a=actor([elemental,telekinetic]);
 const e={name:'Elemental Protection 2',threshold:20,kind:'protection'};
 const t={name:'Telekinetic Protection 4',threshold:40,kind:'protection'};
 assert.equal(reinforcementForGuard(a,e).name,'Elemental Reinforcement');
 assert.equal(reinforcementForGuard(a,t).name,'Telekinetic Reinforcement');
 assert.deepEqual(reinforcementOption({actor:a,guard:e,rawDamage:75,category:'health'}).overflow,55);
 assert.equal(reinforcementOption({actor:a,guard:e,rawDamage:20,category:'health'}),null);
 assert.equal(reinforcementOption({actor:a,guard:e,rawDamage:75,category:'focus'}),null);
 assert.equal(reinforcementOption({actor:a,guard:e,rawDamage:75,category:'health',mode:'bypass'}),null);
 assert.equal(reinforcementOption({actor:a,guard:{name:'Elemental Barrier',threshold:10,kind:'structure'},rawDamage:75,category:'health'}).overflow,65);
});
test('v223: GM commits Focus and Reaction only once and refunds Reaction on failed mutation',async()=>{
 const a=actor([elemental]);const option=reinforcementOption({actor:a,guard:{name:'Elemental Protection 2',threshold:20,kind:'protection'},rawDamage:75,category:'health'});
 const c={id:'combatant',actor:a,tokenId:'t'};let used=0,refunded=0;
 const tracker={getState:()=>({reactionUsed:used,reactionMax:1}),consumeReaction:async()=>{used++;return true;},refundReaction:async()=>{used--;refunded++;return true;}};
 const user={id:'gm',isGM:true};const old=globalThis.game;
 globalThis.game={user,users:{activeGM:user}};
 try{
  const first=await commitReinforcement(a,option,{combat:{started:true,combatants:[c]},tracker,user,tokenDoc:{id:'t'}});
  assert.equal(first.redirected,55);assert.equal(a.system.focus.value,35);assert.equal(used,1);
  a.system.focus.value=90;
  await assert.rejects(()=>commitReinforcement(a,option,{combat:{started:true,combatants:[c]},tracker,user}),/Reação/);
  assert.equal(a.system.focus.value,90);
  used=0;a.system.focus.value=90;a.update=async()=>{throw Error('DB failure')};
  await assert.rejects(()=>commitReinforcement(a,option,{combat:{started:true,combatants:[c]},tracker,user}),/DB failure/);
  assert.equal(refunded,1);assert.equal(used,0);assert.equal(a.system.focus.value,90);
 }finally{globalThis.game=old;}
});
test('v223: original damage, wall/Region, concentration and compendiums still use shared controllers',()=>{
 const roll=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const damage=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
 assert.match(roll,/bindElementalInfusion\(this,infusionWeaponId\)/);
 assert.match(roll,/infusedWeaponAttack\(this\)/);
 assert.match(damage,/commitReinforcement\(guardOwner,option/);
 assert.match(damage,/infusionEligibleTargets\(sourceMessage/);
 assert.match(damage,/applyElementalFantasticFromDamageMessage/);
});
