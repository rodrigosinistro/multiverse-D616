import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={once:()=>{},on:()=>{}};
const {isDarkness,isSilenceArea,isControlFog,isAreaLot6,areaMaxRadiusSpaces,
 validateEnvironmentalSelection,environmentalRegionData,isPointInsideEnvironment,
 fogAdjustedRange,fogVisionLimit}=await import('../scripts/native-priority-lot6.mjs');
const {fogSightBlocked}=await import('../scripts/elemental-area-geometry.mjs');
const S='multiverse-d616';
const powers=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const p=(n,set)=>{const raw=powers.find(i=>i.name===n&&i.system.powerSet===set);assert.ok(raw);return {...raw,id:raw._id};};
const dark=p('Darkness','Illusion'),silence=p('Silence Area','Illusion'),fog=p('Control Fog','Weather Control');
const rank=3;
const scene={id:'s',width:25000,height:25000,grid:{size:100,distance:5},regions:new Map()};
const token={id:'t',x:500,y:500,width:1,height:1,parent:scene};
const character={id:'a',uuid:'Actor.a',system:{attributes:{rank:{value:rank}}},token};
for(const item of [dark,silence,fog])item.actor=character;
const make=(item,center={x:1500,y:1500},radiusSpaces=3)=>({version:1,kind:item.name==='Darkness'?'darkness':item.name==='Silence Area'?'silence':'fog',
 mode:'create',sceneId:scene.id,sourceTokenId:token.id,center,radiusSpaces});
test('v226: official powers and exact sets are recognized (not unrelated items)',()=>{
 assert.equal(isDarkness(dark),true);assert.equal(isSilenceArea(silence),true);assert.equal(isControlFog(fog),true);
 assert.equal(isAreaLot6({...fog,system:{...fog.system,powerSet:'Illusion'}}),false);
 assert.equal(isDarkness({...dark,type:'trait'}),false);
});
test('v226: Illusion WIDTH is 5 spaces per rank, never radius',()=>{
 assert.equal(areaMaxRadiusSpaces('darkness',3),7.5);
 assert.equal(areaMaxRadiusSpaces('silence',4),10);
 assert.equal(areaMaxRadiusSpaces('fog',3),150);
});
test('v226: location/diameter limits checked GM-side from character rank',()=>{
 assert.equal(validateEnvironmentalSelection(dark,make(dark,{x:1500,y:1500},7.5),scene,token).ok,true);
 assert.equal(validateEnvironmentalSelection(dark,make(dark,{x:1500,y:1500},7.6),scene,token).ok,false);
 assert.equal(validateEnvironmentalSelection(silence,make(silence,{x:5800,y:550},4),scene,token).ok,false,'50-space range');
 assert.equal(validateEnvironmentalSelection(dark,make(dark,{x:-1,y:550},4),scene,token).ok,false);
 assert.equal(validateEnvironmentalSelection(fog,make(fog,{x:550,y:550},150),scene,token).ok,true);
 assert.equal(validateEnvironmentalSelection(fog,make(fog,{x:650,y:550},5),scene,token).ok,false);
 assert.equal(validateEnvironmentalSelection(fog,make(fog,{x:550,y:550},150.1),scene,token).ok,false);
});
test('v226: native Foundry V14 Region has proper circle and metadata',()=>{
 const sel=make(dark,{x:1100,y:1200},5);
 const region=environmentalRegionData(sel,dark,'t',scene);
 assert.equal(region.shapes[0].type,'circle');assert.equal(region.shapes[0].radius,500);
 assert.deepEqual(region.flags[S].nativeEnvironment.center,sel.center);
 assert.equal(region.flags[S].nativeEnvironment.sourceItemId,dark.id);
 assert.equal(region.flags[S].nativeEnvironment.sourceActorUuid,character.uuid);
 assert.equal(region.name.startsWith('Darkness'),true);
});
test('v226: fog vision gets capped and can be restored without replacing smaller existing ranges',()=>{
 assert.equal(fogVisionLimit(scene),50); // 10 spaces * 5 scene-distance units
 assert.equal(fogAdjustedRange(0,50),50); // Foundry 0 = unlimited
 assert.equal(fogAdjustedRange(120,50),50);
 assert.equal(fogAdjustedRange(35,50),35);
 assert.equal(isPointInsideEnvironment({x:550,y:550},{center:{x:550,y:550},radius:10},100),true);
 assert.equal(isPointInsideEnvironment({x:1551,y:550},{center:{x:550,y:550},radius:10},100),false);
});
test('v226: power activation uses existing focus/concentration before authorized scene creation',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(main,/registerNativePriorityLot6Hooks\(\)/);
 assert.match(main,/chooseEnvironmentSelection\(this\)/);
 assert.match(main,/activateEnvironmentalAfterPay\(this,lot6Selection\)/);
 assert.ok(main.indexOf('chooseEnvironmentSelection(this)')<main.indexOf('beginFocusMaintenance(this.actor, this)'));
 assert.ok(main.indexOf('activateEnvironmentalAfterPay(this,lot6Selection)')>main.indexOf('beginFocusMaintenance(this.actor, this)'));
});

test('v228: Control Fog blocks after ten squares of sight when a ray crosses fog',()=>{
 const src={x:0,y:0,width:1,height:1},close={x:800,y:0,width:1,height:1},far={x:2000,y:0,width:1,height:1};
 const fogZone={flags:{[S]:{nativeEnvironment:{kind:'fog',center:{x:500,y:50},radius:50}}}};
 const x={...scene,regions:[fogZone]};
 assert.equal(fogSightBlocked(x,src,close),false,'8 squares inside are not blocked');
 assert.equal(fogSightBlocked(x,src,far),true,'20 squares inside are blocked');
 assert.equal(fogSightBlocked({...scene,regions:[]},src,far),false);
});

test('v226: GM transaction creates real negative light, and deletion removes ONLY its paired light',async()=>{
 const {applyEnvironmentalRequest,deleteEnvironmentRegion}=await import('../scripts/native-priority-lot6.mjs');
 const old={game:globalThis.game,canvas:globalThis.canvas,foundry:globalThis.foundry,fromUuid:globalThis.fromUuid};
 const mainItem={...dark};
 const effects=[{id:'effect1',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:dark.id}}}}];
 const actor={...character,effects,items:new Map([[dark.id,mainItem]])};
 const source={...token,actor};
 const regions=new Map(),lights=new Map();
 const createdScene={...scene,regions,lights,tokens:new Map([[source.id,source]]),
  async createEmbeddedDocuments(type,list){const col=type==='Region'?regions:lights;return list.map((data,i)=>{
   const doc={...data,id:(type==='Region'?'reg':'light')+(col.size+i),parent:createdScene};col.set(doc.id,doc);return doc;});},
  async deleteEmbeddedDocuments(type,ids){const col=type==='Region'?regions:lights;ids.forEach(id=>col.delete(id));}};
 source.parent=createdScene;actor.token=source;
 let flags={itemId:dark.id};
 const message={speaker:{scene:'s',token:source.id},getFlag(_s,n){return flags[n];},async setFlag(_s,n,v){flags[n]=v;}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes:new Map([['s',createdScene]]),actors:new Map([[actor.id,actor]])};
 globalThis.canvas={scene:createdScene};globalThis.foundry={applications:{api:{DialogV2:{confirm:async()=>true}}}};
 globalThis.fromUuid=async()=>actor;
 try{
  const selection=make(dark,{x:1500,y:1500},5);
  const result=await applyEnvironmentalRequest(message,selection);
  assert.equal(result.mode,'create');assert.equal(regions.size,1);assert.equal(lights.size,1);
  const light=[...lights.values()][0];assert.equal(light.config.negative,true);
  assert.equal(light.config.bright,25); // 5 squares * 5 grid distance
  const region=[...regions.values()][0];assert.equal(light.flags[S].nativeEnvironmentRegionId,region.id);
  assert.equal(flags.nativeEnvironmentResolved.regionId,region.id);
  await deleteEnvironmentRegion(createdScene,region);
  assert.equal(regions.size,0);assert.equal(lights.size,0);
 }finally{Object.assign(globalThis,old);}
});

test('v227: daylight fog never clamps global sight; migration safely restores v226 sight',async()=>{
 const {syncEnvironmentTokens}=await import('../scripts/native-priority-lot6.mjs');
 const old=globalThis.game;
 const fogRegion={id:'fog',flags:{[S]:{nativeEnvironment:{kind:'fog',center:{x:550,y:550},radius:20}}}};
 const regions=new Map([[fogRegion.id,fogRegion]]);
 const mockScene={...scene,regions,tokens:null};
 const actor={uuid:'one',effects:[],createEmbeddedDocuments:async()=>{},deleteEmbeddedDocuments:async()=>{}};
 const subject={id:'tok',x:500,y:500,width:1,height:1,parent:mockScene,sight:{range:50},flags:{[S]:{nativeFogOriginal:{range:180,forced:50}}},actor};
 mockScene.tokens=new Map([[subject.id,subject]]);
 let unsetCount=0;
 subject.update=async data=>{if('sight.range' in data)subject.sight.range=data['sight.range'];};
 subject.unsetFlag=async(_s,key)=>{assert.equal(key,'nativeFogOriginal');delete subject.flags[S].nativeFogOriginal;unsetCount++;};
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}}};
 try{
  await syncEnvironmentTokens(mockScene);
  assert.equal(subject.sight.range,180,'migrates old forced sight even while in fog');
  assert.equal(unsetCount,1,'uses v14 unsetFlag, not unsupported deletion syntax');
  await syncEnvironmentTokens(mockScene);
  assert.equal(subject.sight.range,180,'never clamps a lit scene globally');
  assert.equal(unsetCount,1,'legacy flag cleared once');
 }finally{globalThis.game=old;}
});

test('v226: Silence Area adds/removes only its own deafened effect, preserving other conditions',async()=>{
 const {syncEnvironmentTokens}=await import('../scripts/native-priority-lot6.mjs');
 const old=globalThis.game;
 const region={id:'silence1',flags:{[S]:{nativeEnvironment:{kind:'silence',center:{x:550,y:550},radius:4}}}};
 const mockScene={...scene,regions:new Map([[region.id,region]])};
 const actor={uuid:'shared-actor',effects:[{id:'unrelated',statuses:new Set(['mmrpg.stunned']),flags:{}}],
  async createEmbeddedDocuments(_type,items){for(const data of items)this.effects.push({...data,id:'own-silence'});},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 const inZone={id:'in',x:500,y:500,width:1,height:1,parent:mockScene,actor,flags:{},sight:{range:10},update:async()=>{}};
 const outside={id:'out',x:1800,y:1500,width:1,height:1,parent:mockScene,actor,flags:{},sight:{range:10},update:async()=>{}};
 mockScene.tokens=new Map([[inZone.id,inZone],[outside.id,outside]]);
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}}};
 try{
  await syncEnvironmentTokens(mockScene);
  assert.equal(actor.effects.length,2,'linked character gains just one sound effect');
  assert.equal(actor.effects[1].flags[S].nativeSilenceRegionId,region.id);
  assert.equal(actor.effects[1].showIcon,2,'visible token-status icon');
  assert.equal(actor.effects[1].flags.core.statusId,'mmrpg.deafened');
  assert.deepEqual(actor.effects[1].statuses,['mmrpg.deafened']);
  inZone.x=1900;await syncEnvironmentTokens(mockScene);
  assert.equal(actor.effects.length,1,'exiting removes own Silence effect');
  assert.equal(actor.effects[0].id,'unrelated','unrelated existing status preserved');
  inZone.x=500;await syncEnvironmentTokens(mockScene);
  assert.equal(actor.effects.length,2,'returning to Silence re-adds Surdo');
  inZone.x=1900;await syncEnvironmentTokens(mockScene);
  assert.equal(actor.effects.length,1,'repeated exit reliably clears the status');
 }finally{globalThis.game=old;}
});
