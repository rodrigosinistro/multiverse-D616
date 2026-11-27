import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {getPowerDamageFactor,calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';
import {focusedMeleeFocusDamage} from '../scripts/native-power-focused-attacks.mjs';
import {nativeFocusedDamageForPower} from '../scripts/native-power-automations.mjs';
import {resolveConditionEdges} from '../scripts/condition-edge.mjs';
import {untouchableExpiration,untouchableTargetModifier,markUntouchableAfterAttack,
 untouchableAttackRecipients} from '../scripts/native-power-untouchable.mjs';
import {evaluateAttackTargets} from '../scripts/combat-preflight.mjs';
const NS='multiverse-d616';
const P=(name,ps='Martial Arts',id=name)=>({name,id,type:'power',img:'orig.webp',system:{powerSet:ps,attack:true,attackTarget:'mle'}});
const col=xs=>({contents:xs,get:id=>xs.find(x=>x.id===id),values:()=>xs.values()});
const def=()=>{
 const items=[P('Untouchable Position')],effects=[];
 return {uuid:'Actor.def',id:'def',items:col(items),effects:col(effects),created:[],
  async createEmbeddedDocuments(_,data){this.created.push(...data);effects.push(...data);return data;}};
};
const setup=()=>{
 const defense=def(),att={id:'attack',uuid:'Actor.attack',items:col([{id:'melee',type:'weapon',name:'Weapon',system:{attackTarget:'mle'}}])};
 const tokens=[{id:'ta',actor:att},{id:'td',actor:defense}];
 const scene={id:'s',tokens:{get:id=>tokens.find(t=>t.id===id)}};
 const combatants=[{id:'ca',tokenId:'ta',actor:att},{id:'cd',tokenId:'td',actor:defense}];
 const combat={started:true,id:'combat',round:2,turn:0,turns:combatants,combatants};
 const msg={author:{isGM:true},speaker:{scene:'s',token:'ta',actor:'attack'},rolls:[{}],flags:{[NS]:{
  itemId:'melee',attackTarget:'mle',targets:[{uuid:'Scene.s.Token.td'}]}}};
 return {defense,att,scene,combat,msg};
};
test('v199: exactly 113 bounded macros; four new/expanded rules scoped to official Power Sets',()=>{
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 assert.equal(new Set(REGISTERED_AUTOMATIONS.map(x=>x.powerId)).size,162);
 const map=new Map(REGISTERED_AUTOMATIONS.map(x=>[`${x.powerSet}::${x.powerName}`,x]));
 for(const name of ['Sniping','Snap Shooting'])assert.equal(map.get(`Ranged Weapons::${name}`)?.status,'native-partial');
 for(const key of ['Martial Arts::Untouchable Position','Melee Weapons::Furious Attacks'])assert.equal(map.get(key)?.status,'native-partial');
});
test('v199: Sniping Fantastic damage x3, Snap Shooting / Furious Attacks half/full, Health RD unchanged',()=>{
 for(const [name,ordinary,fantastic] of [['Sniping',1,3],['Snap Shooting',.5,1],['Furious Attacks',.5,1]]){
  assert.equal(getPowerDamageFactor(name,{enabled:true}),ordinary);
  assert.equal(getPowerDamageFactor(name,{fantastic:true,enabled:true}),fantastic);
 }
 const normal=calculatePowerDamage({powerName:'Sniping',marvelDie:6,damageMultiplier:4,ability:2,damageReduction:2,enabled:true});
 const fancy=calculatePowerDamage({powerName:'Sniping',marvelDie:6,damageMultiplier:4,ability:2,damageReduction:2,fantastic:true,enabled:true});
 assert.equal(fancy.damage,normal.damage*3);
 assert.equal(fancy.damageReduction,normal.damageReduction);
});
test('v199: Furious Attacks uses one typed +1 / 2 Focus snapshot; no second Focus debit',()=>{
 const item=P('Furious Attacks','Melee Weapons');
 assert.equal(focusedMeleeFocusDamage(item,10).bonus,5);
 assert.equal(nativeFocusedDamageForPower(item,15).bonus,7);
 assert.equal(nativeFocusedDamageForPower(item,20).bonus,10);
 assert.throws(()=>focusedMeleeFocusDamage(item,5),/mínimo 10/);
 assert.equal(nativeFocusedDamageForPower({...item,system:{powerSet:'Martial Arts',attack:true}},10),null);
});
test('v199: Sniping minimum 20 spaces warning with override possible; no fabricated max range',()=>{
 const item=P('Sniping','Ranged Weapons');item.system.attackKind='ranged';
 const source={id:'s0',x:0,y:0,width:1,height:1,parent:{id:'sc'}};
 const near={id:'n',x:600,y:0,width:1,height:1,parent:{id:'sc'}};
 const far={id:'f',x:2400,y:0,width:1,height:1,parent:{id:'sc'}};
 const scene={id:'sc',grid:{size:100,distance:5,type:1}};
 const result=evaluateAttackTargets({item,actor:{},source,targets:[near,far],scene,grid:{size:100},polygonClass:null});
 assert.equal(result.length,2);
 assert.match(result[0].warning.join(' '),/pelo menos 20 espaços/);
 assert.equal(result[1].warning.some(w=>/pelo menos 20 espaços/.test(w)),false);
});
test('v199: Untouchable starts AFTER attack card, troubles subsequent close attacks, stops next turn',async()=>{
 const {defense,scene,combat,msg}=setup();
 const previous={actor:{items:col([])},targetActors:[defense],ability:'mle',kind:'close',attack:true,targeted:true};
 globalThis.game={combat};
 assert.equal(resolveConditionEdges(previous).net,0);
 assert.equal(untouchableAttackRecipients(msg,{scene,combat}).length,1);
 assert.equal(await markUntouchableAfterAttack(msg,{scene,combat}),1);
 assert.equal(await markUntouchableAfterAttack(msg,{scene,combat}),0);
 assert.equal(defense.created.length,1);
 assert.deepEqual(defense.created[0].flags[NS].nativeUntouchable,{version:1,combatId:'combat',expiresRound:2,expiresTurn:1});
 assert.equal(resolveConditionEdges(previous).net,-1);
 assert.equal(resolveConditionEdges({...previous,kind:'ranged',ability:'agl'}).net,0);
 assert.equal(resolveConditionEdges({...previous,targeted:false}).net,0);
 combat.turn=1;
 assert.equal(resolveConditionEdges(previous).net,0);
 delete globalThis.game;
});
test('v199: Untouchable expiry wraps next round; no state for counterfeit or invalid target',async()=>{
 const {defense,scene,combat,msg}=setup();combat.turn=1;
 assert.deepEqual(untouchableExpiration(combat,combat.turns[0]),{combatId:'combat',expiresRound:3,expiresTurn:0});
 assert.equal(untouchableAttackRecipients({...msg,author:{isGM:false}}, {scene,combat}).length,0);
 assert.equal(untouchableAttackRecipients({...msg,flags:{[NS]:{...msg.flags[NS],itemId:'fake'}}},{scene,combat}).length,0);
 assert.equal(untouchableAttackRecipients({...msg,flags:{[NS]:{...msg.flags[NS],targets:[{uuid:'Scene.other.Token.td'}]}}},{scene,combat}).length,0);
 defense.items.contents.length=0;
 assert.equal(await markUntouchableAfterAttack(msg,{scene,combat}),0);
});
