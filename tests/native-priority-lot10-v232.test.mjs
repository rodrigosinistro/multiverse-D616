import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={on:()=>{},once:()=>{}};
const S='multiverse-d616';
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const original=items.find(p=>p.name==='Vapors of Valtorr'&&p.system.powerSet==='Magic');assert.ok(original);
const item={...original,id:original._id};
const {isVaporsOfValtorr,isAreaLot6,areaKind,areaMaxRadiusSpaces,validateEnvironmentalSelection,environmentalRegionData}=await import('../scripts/native-priority-lot6.mjs');
const {fogRayOcclusionStart,fogSightBlocked}=await import('../scripts/elemental-area-geometry.mjs');
const {VAPORS_FLAG,VAPORS_ATTACK,vaporsTurnKey,vaporsCanAttack,attackWithVapors,publishVaporsTurnControls}=await import('../scripts/native-priority-lot10.mjs');
const {POWER_CONDITIONS,mustConfirmPowerDamage}=await import('../scripts/power-conditions.mjs');
const caster={id:'a',uuid:'Actor.a',name:'Doutor',_source:{system:{abilities:{ego:{damageMultiplier:0}}}},
 system:{attributes:{rank:{value:3}},abilities:{ego:{value:5,damageMultiplier:3}}},effects:[],items:new Map(),
 testUserPermission:()=>true};
item.actor=caster;caster.items.set(item.id,item);
const scene={id:'s',width:40000,height:40000,grid:{size:100,distance:5},tokens:new Map(),regions:new Map()};
const source={id:'source',uuid:'Scene.s.Token.source',actor:caster,actorId:'a',x:1000,y:1000,width:1,height:1,parent:scene};
const foe={id:'foe',uuid:'Scene.s.Token.foe',name:'Alvo',actor:{id:'b',uuid:'Actor.b',name:'Alvo'},x:1300,y:1000,width:1,height:1,parent:scene};
const far={...foe,id:'far',uuid:'Scene.s.Token.far',x:20000,y:20000};
scene.tokens.set(source.id,source);scene.tokens.set(foe.id,foe);scene.tokens.set(far.id,far);
const selection={version:1,kind:'fog',mode:'create',sceneId:scene.id,sourceTokenId:source.id,center:{x:1050,y:1050},radiusSpaces:75};
const region={id:'vapors',flags:{[S]:{nativeEnvironment:environmentalRegionData(selection,item,source.id,scene).flags[S].nativeEnvironment}}};
scene.regions.set(region.id,region);
const concentration={id:'fx',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:item.id}}}};
caster.effects=[concentration];
const control={version:1,itemId:item.id,effectId:concentration.id,sourceTokenId:source.id,sceneId:scene.id,regionId:region.id,activationCombatId:'c',activationRound:1,activationTurn:0};
const turn={id:'c',started:true,round:2,turn:0,combatant:{id:'combatant',tokenId:'source',sceneId:'s'},sceneId:'s'};
const messages=[];
const previous=globalThis.game;
globalThis.game={user:{id:'player',isGM:false},users:{activeGM:{id:'gm'}},scenes:new Map([['s',scene]]),messages,
 settings:{get:(_s,k)=>k==='automation_turnActions'?false:undefined}};
test('v232: exact identity/limits: 25 spaces x Rank, centered fog, not other power sets',()=>{
 assert.ok(isVaporsOfValtorr(item));assert.ok(isAreaLot6(item));assert.equal(areaKind(item),'fog');
 assert.equal(areaMaxRadiusSpaces('fog',3,item.name),75);
 assert.equal(areaMaxRadiusSpaces('fog',3,'Mists of Munnopor'),300);
 assert.equal(areaMaxRadiusSpaces('fog',3,'Control Fog'),150);
 assert.equal(isVaporsOfValtorr({...item,system:{...item.system,powerSet:'Illusion'}}),false);
 assert.equal(validateEnvironmentalSelection(item,selection,scene,source).ok,true);
 assert.equal(validateEnvironmentalSelection(item,{...selection,radiusSpaces:76},scene,source).ok,false);
 assert.equal(validateEnvironmentalSelection(item,{...selection,center:{x:1150,y:1050}},scene,source).ok,false);
 assert.equal(region.flags[S].nativeEnvironment.visibilitySpaces,5);
});
test('v232: exact target visibility of 5 in Vapors; existing Control Fog remains 10',()=>{
 const eye={x:1050,y:1050};const angle=0;
 assert.equal(fogRayOcclusionStart(scene,eye,angle),500);
 const at=(spaces)=>({x:1000+100*spaces,y:1000,width:1,height:1});
 assert.equal(fogSightBlocked(scene,source,at(4)),false);
 assert.equal(fogSightBlocked(scene,source,at(6)),true);
 region.flags[S].nativeEnvironment.visibilitySpaces=10;
 assert.equal(fogSightBlocked(scene,source,at(6)),false);
 assert.equal(fogSightBlocked(scene,source,at(11)),true);
 region.flags[S].nativeEnvironment.visibilitySpaces=5;
});
test('v232: source power has standard damage/fantastic x2 and confirmed 1-turn blind condition',()=>{
 assert.equal(item.system.action,'Standard');assert.equal(item.system.cost,'10 Focus');
 assert.equal(item.system.attackTarget,'vig');assert.equal(item.system.ability,'ego');
 assert.equal(mustConfirmPowerDamage(item.name),true);
 assert.deepEqual(POWER_CONDITIONS[item.name].map(r=>[r.status,r.on,r.expires]),[['blinded','fantastic','turn']]);
});
test('v232: combat turn gate, one attack per turn, no attack on activation turn, area & ownership bound',()=>{
 assert.equal(vaporsCanAttack(control,{combat:turn}).ok,true);
 assert.equal(vaporsCanAttack(control,{combat:{...turn,round:1,turn:0}}).ok,false);
 assert.equal(vaporsCanAttack(control,{combat:{...turn,combatant:{tokenId:'foe'}}}).ok,false);
 assert.equal(vaporsCanAttack(control,{combat:null}).ok,false);
 assert.equal(vaporsCanAttack(control,{combat:turn,target:foe}).ok,true);
 assert.equal(vaporsCanAttack(control,{combat:turn,target:far}).ok,false);
 const prev=globalThis.game.combat;globalThis.game.combat=turn;
 try{
  messages.push({getFlag(s,k){return s===S&&k===VAPORS_ATTACK?{key:vaporsTurnKey(turn,'fx')}:null;}});
  assert.equal(vaporsCanAttack(control,{combat:turn}).ok,false);
  messages.length=0;
  caster.effects=[];assert.equal(vaporsCanAttack(control,{combat:turn}).ok,false);
  caster.effects=[concentration];scene.regions.clear();assert.equal(vaporsCanAttack(control,{combat:turn}).ok,false);
  scene.regions.set(region.id,region);
 }finally{globalThis.game.combat=prev;messages.length=0;}
});
test('v232: subsequent turn attack posts normal 3-die card, no new Focus; one target',async()=>{
 const old={CONFIG:globalThis.CONFIG,ChatMessage:globalThis.ChatMessage,foundry:globalThis.foundry};
 let produced=null;let consumed=0;
 globalThis.game.combat=turn;
 globalThis.foundry={utils:{getProperty:(o,path)=>path.split('.').reduce((x,k)=>x?.[k],o)}};
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{
  constructor(formula,actorData,options){produced={formula,actorData,options};}
  async toMessage(data,options){produced={...produced,data,options};return {id:'attack',getFlag:()=>null};}
 }}};
 globalThis.ChatMessage={create:async()=>({id:'notice'})};
 caster.getRollData=()=>({});
 item.getRollData=()=>({formula:'{1d6,1dm,1d6}+@abilities.ego.value',actor:{abilities:{ego:{value:5}}}});
 try{
  const out=await attackWithVapors(control,{target:foe});assert.equal(out.id,'attack');
  assert.equal(produced.data.flags[S].focusSpent,0);
  assert.equal(produced.data.flags[S].focusAuto,true);
  assert.equal(produced.data.flags[S].targets[0].uuid,foe.uuid);
  assert.equal(produced.data.flags[S].attackTarget,'vig');
  assert.equal(produced.data.flags[S].ability,'ego');
  assert.ok(!Object.hasOwn(produced.data,'content'),'Foundry renders dice/EDGE without custom content');
  assert.match(produced.data.flavor,/sem novo custo de 10 Focus/);
  messages.push({getFlag(s,k){return s===S&&k===VAPORS_ATTACK?produced.data.flags[S][VAPORS_ATTACK]:null;}});
  await assert.rejects(()=>attackWithVapors(control,{target:foe}),/já atacou/);
  messages.length=0;
 }finally{globalThis.CONFIG=old.CONFIG;globalThis.ChatMessage=old.ChatMessage;globalThis.foundry=old.foundry;delete item.getRollData;delete globalThis.game.combat;}
});
test('v232: a signed GM control can be published once per subsequent turn; ends with Concentration',async()=>{
 const old={user:globalThis.game.user,combat:globalThis.game.combat,ChatMessage:globalThis.ChatMessage};
 globalThis.game.user={id:'gm',isGM:true};globalThis.game.combat=turn;
 const initial={getFlag(s,k){return s===S&&k===VAPORS_FLAG?control:null;}};
 messages.push(initial);
 const recorded=[];
 globalThis.ChatMessage={create:async data=>{const msg={id:`turn-${recorded.length}`,getFlag(s,k){return data.flags?.[s]?.[k];}};messages.push(msg);recorded.push(data);return msg;}};
 try{
  assert.equal(await publishVaporsTurnControls(turn),1);
  assert.equal(await publishVaporsTurnControls(turn),0);
  assert.equal(recorded.length,1);
  assert.equal(recorded[0].flags[S][VAPORS_FLAG].effectId,concentration.id);
  turn.round=3;
  assert.equal(await publishVaporsTurnControls(turn),1);
  caster.effects=[];turn.round=4;
  assert.equal(await publishVaporsTurnControls(turn),0);
 }finally{caster.effects=[concentration];turn.round=2;messages.length=0;globalThis.game.user=old.user;globalThis.game.combat=old.combat;globalThis.ChatMessage=old.ChatMessage;}
});
test.after(()=>{globalThis.game=previous;});
