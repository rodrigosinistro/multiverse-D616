import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={on:()=>{},once:()=>{}};
const S='multiverse-d616';
const {isMistsOfMunnopor,isAreaLot6,areaKind,areaMaxRadiusSpaces,
 validateEnvironmentalSelection,environmentalRegionData,syncEnvironmentTokens}=await import('../scripts/native-priority-lot6.mjs');
const {syncGroupEffects,releaseGroupTarget,GROUP_FLAG,TARGET_FLAG}=await import('../scripts/native-priority-lot7.mjs');
const {actorMovementForAction}=await import('../scripts/combat/turn-tracker-core.mjs');
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const get=(name,set)=>{const x=items.find(p=>p.name===name&&p.system.powerSet===set);return {...x,id:x._id};};
const mist=get('Mists of Munnopor','Magic'),fog=get('Control Fog','Weather Control');
const actor={uuid:'Actor.caster',id:'caster',effects:[],system:{attributes:{rank:{value:3}},movement:{flight:{active:true,value:10},glide:{active:true,value:8},swingline:{active:true,value:6},run:{active:true,value:5}}},
 async createEmbeddedDocuments(_type,data){for(const effect of data){effect.id=`fx${this.effects.length}`;this.effects.push(effect);}return data;},
 async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
const scene={id:'s',width:100000,height:100000,grid:{size:100,distance:5},tokens:new Map(),regions:new Map()};
const source={id:'source',actorId:actor.id,actor,x:1000,y:1000,width:1,height:1,parent:scene};
scene.tokens.set(source.id,source);
mist.actor=actor;fog.actor=actor;
test('v231: magical mist has its official 100-spaces-per-rank radius and shares the fog LOS engine',()=>{
 assert.equal(isMistsOfMunnopor(mist),true);
 assert.equal(isAreaLot6(mist),true);assert.equal(areaKind(mist),'fog');
 assert.equal(areaMaxRadiusSpaces('fog',3,'Mists of Munnopor'),300);
 assert.equal(areaMaxRadiusSpaces('fog',3),150);
 assert.equal(isMistsOfMunnopor({...mist,system:{...mist.system,powerSet:'Illusion'}}),false);
 const choose=(radiusSpaces,center={x:1050,y:1050})=>({version:1,kind:'fog',mode:'create',sceneId:scene.id,sourceTokenId:source.id,center,radiusSpaces});
 assert.equal(validateEnvironmentalSelection(mist,choose(280),scene,source).ok,true);
 assert.equal(validateEnvironmentalSelection(mist,choose(301),scene,source).ok,false);
 assert.equal(validateEnvironmentalSelection(fog,choose(200),scene,source).ok,false);
 assert.equal(validateEnvironmentalSelection(mist,choose(5,{x:1200,y:1050}),scene,source).ok,false);
 assert.equal(validateEnvironmentalSelection(mist,{...choose(5),mode:'disperse',regionId:'some'},scene,source).ok,false);
 const meta=environmentalRegionData(choose(30),mist,source.id,scene);
 assert.equal(meta.flags[S].nativeEnvironment.kind,'fog');
 assert.equal(meta.flags[S].nativeEnvironment.sourcePowerName,'Mists of Munnopor');
 assert.match(meta.name,/Munnopor/);
});
test('v231: entering magical fog blocks flight/gliding/swingline; exit restores, keeping unrelated effects',async()=>{
 const previous=globalThis.game;
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}};
 const meta={version:1,kind:'fog',sourcePowerName:'Mists of Munnopor',center:{x:1050,y:1050},radius:4};
 const region={id:'mist',flags:{[S]:{nativeEnvironment:meta}}};
 scene.regions.set(region.id,region);
 actor.effects.push({id:'other',flags:{},name:'Invisibilidade'});
 try{
  await syncEnvironmentTokens(scene);
  assert.equal(actor.effects.filter(e=>e.flags?.[S]?.nativeMunnoporRegionId).length,1);
  for(const mode of ['flight','glide','swingline'])assert.equal(actorMovementForAction(actor,mode).maximum,0);
  assert.equal(actorMovementForAction(actor,'walk').maximum,5);
  source.x=4000;source.y=4000;
  await syncEnvironmentTokens(scene);
  assert.equal(actor.effects.filter(e=>e.flags?.[S]?.nativeMunnoporRegionId).length,0);
  assert.equal(actorMovementForAction(actor,'flight').maximum,10);
  assert.ok(actor.effects.some(e=>e.id==='other'));
 }finally{scene.regions.clear();actor.effects=[];source.x=1000;source.y=1000;globalThis.game=previous;}
});
test('v231: rapid double group cleanup is serialized; missing ActiveEffect errors cannot occur',async()=>{
 const previous=globalThis.game;
 const caster={id:'a',uuid:'Actor.a',items:new Map([['power',{id:'power',name:'Group Flight'}]]),effects:[]};
 const target={id:'b',uuid:'Actor.b',effects:[],created:0,deletions:0,
  async createEmbeddedDocuments(_type,data){this.created+=data.length;this.effects.push(...data.map(e=>({...e,id:'owned'})));},
  async deleteEmbeddedDocuments(_type,ids){this.deletions++;await new Promise(r=>setTimeout(r,4));
   if(!this.effects.some(e=>ids.includes(e.id)))throw Error(`ActiveEffect ${ids[0]} does not exist!`);
   this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 const local={id:'sync',grid:{size:100},tokens:new Map()};
 const casterToken={id:'ca',actor:caster,parent:local,x:100,y:100,width:1,height:1};
 const victimToken={id:'vi',actor:target,parent:local,x:150,y:100,width:1,height:1};
 local.tokens.set('ca',casterToken);local.tokens.set('vi',victimToken);
 const group={version:1,kind:'flight',sceneId:local.id,sourceTokenId:'ca',tokenIds:['vi'],range:15,speed:5};
 const effect={id:'source-fx',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:'power'},[GROUP_FLAG]:group}},
 async setFlag(_s,_key,newGroup){this.flags[S][GROUP_FLAG]=newGroup;}};
 caster.effects=[effect];
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},scenes:new Map([[local.id,local]])};
 try{
  await syncGroupEffects();assert.equal(target.created,1);
  const original={speaker:{scene:'sync',token:'ca',actor:'a'},getFlag(s,k){
   return s===S && k==='itemId'?'power':s===S && k==='nativeGroupLot7Activated'?{sceneId:'sync',sourceTokenId:'ca'}:null;
  }};
  await Promise.all([releaseGroupTarget(original,'vi'),syncGroupEffects(),syncGroupEffects()]);
  assert.deepEqual(effect.flags[S][GROUP_FLAG].tokenIds,[]);
  assert.equal(target.deletions,1,'at most one attempt to delete the original ActiveEffect');
  assert.equal(target.effects.length,0);
 }finally{globalThis.game=previous;}
});
