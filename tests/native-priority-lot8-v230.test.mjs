import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={on:()=>{},once:()=>{}};
const S='multiverse-d616';
const {
 isExtendInvisibility,groupLimits,validateGroupSelection,groupTargetEffectData,
 groupReminderKey,publishGroupTurnControls,isAuthorizedReminder,GROUP_FLAG
}=await import('../scripts/native-priority-lot7.mjs');
const {
 isIllumination,isAreaLot6,areaMaxRadiusSpaces,
 validateEnvironmentalSelection,environmentalRegionData,applyEnvironmentalRequest
}=await import('../scripts/native-priority-lot6.mjs');
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const power=(name,set)=>{const p=items.find(p=>p.name===name&&p.system.powerSet===set);return {...p,id:p._id};};
const extend=power('Extend Invisibility','Illusion'),illumination=power('Illumination','Illusion');
const flight=power('Group Flight','Basic');
const caster={id:'caster',uuid:'Actor.caster',name:'Usuário',system:{attributes:{rank:{value:3}},size:'average',abilities:{ego:{value:4,defense:13}},movement:{flight:{value:12}}},items:new Map(),effects:[],testUserPermission:()=>true};
extend.actor=caster;illumination.actor=caster;flight.actor=caster;
const scene={id:'scene',width:50000,height:50000,grid:{size:100,distance:5},tokens:new Map(),regions:new Map(),lights:[]};
const source={id:'token-a',actorId:'caster',actor:caster,x:1000,y:1000,width:1,height:1,parent:scene,name:'Usuário'};
const target={id:'token-b',actor:{system:{size:'average'}},x:1500,y:1000,width:1,height:1,parent:scene,name:'Alvo'};
scene.tokens.set(source.id,source);scene.tokens.set(target.id,target);
test('v230: Extend Invisibility reuses the proven group invisibility effect, but exactly one target at 10 spaces',()=>{
 assert.equal(isExtendInvisibility(extend),true);
 assert.equal(isExtendInvisibility({...extend,name:'Invisibility'}),false);
 caster.items.set('invisibility',{name:'Invisibility',type:'power',system:{powerSet:'Illusion'}});
 const limits=groupLimits(extend);
 assert.equal(limits.kind,'invisibility');assert.equal(limits.max,1);assert.equal(limits.range,10);
 const sel=ids=>({version:1,kind:'invisibility',sceneId:scene.id,sourceTokenId:source.id,tokenIds:ids});
 assert.equal(validateGroupSelection(extend,sel(['token-b']),scene,source).ok,true);
 assert.equal(validateGroupSelection(extend,sel(['token-b','token-a']),scene,source).ok,false);
 assert.equal(validateGroupSelection(extend,sel(['token-a']),scene,source).ok,true);
 const far={...target,x:2800};scene.tokens.set(far.id,far);
 assert.equal(validateGroupSelection(extend,sel(['token-b']),scene,source).ok,false);
 scene.tokens.set(target.id,target);
 caster.items.delete('invisibility');
 assert.equal(validateGroupSelection(extend,sel(['token-b']),scene,source).ok,false);
 caster.items.set('invisibility',{name:'Invisibility',type:'power',system:{powerSet:'Illusion'}});
 const effect=groupTargetEffectData({kind:'invisibility',sceneId:scene.id,tokenId:target.id,sourceActorUuid:caster.uuid,sourceEffectId:'fx',sourceTokenId:source.id});
 assert.ok(effect.statuses.includes('invisible'));
 caster.items.delete('invisibility');
});
test('v230: Illumination creates a real bright light attached to a Concentration region',async()=>{
 assert.ok(isIllumination(illumination));assert.ok(isAreaLot6(illumination));
 assert.equal(areaMaxRadiusSpaces('illumination',3),20);
 const chosen={version:1,kind:'illumination',mode:'create',sceneId:scene.id,sourceTokenId:source.id,center:{x:1900,y:1100},radiusSpaces:5};
 assert.equal(validateEnvironmentalSelection(illumination,chosen,scene,source).ok,true);
 assert.equal(validateEnvironmentalSelection(illumination,{...chosen,center:{x:15000,y:1100}},scene,source).ok,false);
 assert.equal(validateEnvironmentalSelection(illumination,{...chosen,radiusSpaces:25},scene,source).ok,false);
 const region=environmentalRegionData(chosen,illumination,source.id,scene);
 assert.equal(region.flags[S].nativeEnvironment.kind,'illumination');
 const effect={id:'concentration',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:illumination.id}}}};
 caster.effects=[effect];caster.items.set(illumination.id,illumination);
 const old={game:globalThis.game,foundry:globalThis.foundry};
 const created=[];
 scene.createEmbeddedDocuments=async(type,data)=>{
  created.push({type,data});
  return data.map((e,i)=>({id:`${type}-${i}`,flags:e.flags,name:e.name}));
 };
 const msgFlags={[S]:{itemId:illumination.id}};
 const message={id:'m',speaker:{scene:scene.id,token:source.id,actor:caster.id},
  getFlag(s,k){return msgFlags[s]?.[k];},async setFlag(s,k,v){msgFlags[s][k]=v;}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes:new Map([[scene.id,scene]])};
 globalThis.foundry={applications:{api:{DialogV2:{confirm:async()=>true}}}};
 try{
  await applyEnvironmentalRequest(message,chosen);
  const light=created.find(x=>x.type==='AmbientLight');
  assert.ok(light,'real AmbientLight must be created');
  assert.equal(light.data[0].config.negative,false);
  assert.equal(light.data[0].config.bright,25);
  assert.equal(light.data[0].flags[S].nativeEnvironmentRegionId,'Region-0');
  assert.equal(msgFlags[S].nativeEnvironmentResolved.regionId,'Region-0');
 }finally{globalThis.game=old.game;globalThis.foundry=old.foundry;delete scene.createEmbeddedDocuments;caster.effects=[];caster.items.clear();}
});
test('v230: caster gets one fresh Group Flight/Levitation control card per combat turn with GM authorization',async()=>{
 const old={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 const fx={id:'fx',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:flight.id},[GROUP_FLAG]:{
  version:1,kind:'flight',sceneId:scene.id,sourceTokenId:source.id,tokenIds:['token-b'],range:15,speed:6,moves:{}
 }}}};
 caster.effects=[fx];caster.items.set(flight.id,flight);
 const combatant={id:'combatant',tokenId:source.id};
 const combat={id:'combat',started:true,round:1,turn:0,combatant,scene};
 const messages=[];
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes:new Map([[scene.id,scene]]),messages};
 globalThis.ChatMessage={create:async(data)=>{const msg={id:`msg-${messages.length}`,author:{id:'gm',isGM:true},user:{id:'gm',isGM:true},speaker:data.speaker,
  getFlag(s,k){return data.flags?.[s]?.[k];},...data};messages.push(msg);return msg;}};
 try{
  assert.equal(await publishGroupTurnControls(combat),1);
  assert.equal(messages.length,1);
  assert.equal(await publishGroupTurnControls(combat),0,'same turn should not create another card');
  assert.ok(messages[0].content.includes('seu turno'));
  assert.ok(isAuthorizedReminder(messages[0],caster,flight));
  combat.round=2;
  assert.equal(await publishGroupTurnControls(combat),1,'a new round should get a new card');
  assert.notEqual(groupReminderKey({...combat,round:1},combatant,fx),groupReminderKey(combat,combatant,fx));
  assert.equal(messages.length,2);
  caster.effects=[];
  combat.round=3;
  assert.equal(await publishGroupTurnControls(combat),0,'concentration ended; no card');
  assert.equal(isAuthorizedReminder(messages[0],caster,flight),false,'old card is no longer authorized');
 }finally{globalThis.game=old.game;globalThis.ChatMessage=old.ChatMessage;caster.effects=[];caster.items.clear();}
});
