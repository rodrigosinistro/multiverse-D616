import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks={on:()=>{},once:()=>{}};
const {isGroupFlight,isGroupLevitation,isGroupInvisibility,isGroupLot7,groupLimits,sizeEligible,
 validateGroupSelection,validateGroupMove,groupTargetEffectData,groupMoveIsForced,applyGroupMovement,
 syncGroupEffects,applyGroupActivation,GROUP_FLAG,TARGET_FLAG}=await import('../scripts/native-priority-lot7.mjs');
const S='multiverse-d616';
const entries=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const get=(name,set)=>({...entries.find(p=>p.name===name&&p.system.powerSet===set),id:entries.find(p=>p.name===name&&p.system.powerSet===set)._id});
const flight=get('Group Flight','Basic'),lev=get('Group Levitation','Telekinesis'),inv=get('Group Invisibility','Illusion');
const caster={id:'a',uuid:'Actor.a',system:{attributes:{rank:{value:3}},abilities:{ego:{value:4,defense:13}},size:'average',movement:{flight:{value:12},run:{value:6}}},items:new Map()};
flight.actor=caster;lev.actor=caster;inv.actor=caster;
const scene={id:'s',grid:{size:100,distance:5},width:20000,height:20000,tokens:new Map()};
const src={id:'caster',actorId:'a',actor:caster,x:1000,y:1000,width:1,height:1,parent:scene};
const recipient={id:'b',actor:{uuid:'Actor.b',system:{size:'average'}},x:1400,y:1000,width:1,height:1,parent:scene};
const extra={id:'c',actor:{uuid:'Actor.c',system:{size:'average'}},x:1800,y:1000,width:1,height:1,parent:scene};
scene.tokens.set(src.id,src);scene.tokens.set(recipient.id,recipient);scene.tokens.set(extra.id,extra);
caster.items.set('f1',{type:'power',name:'Flight 1',system:{powerSet:'Basic'}});
const sel=(power,ids)=>({version:1,kind:groupLimits(power).kind,sceneId:scene.id,sourceTokenId:src.id,tokenIds:ids});
test('v229: identify three official powers, reject similar names or mismatched sets',()=>{
 assert.ok(isGroupLot7(flight));assert.ok(isGroupFlight(flight));assert.ok(isGroupLevitation(lev));assert.ok(isGroupInvisibility(inv));
 assert.ok(!isGroupLot7({...flight,system:{...flight.system,powerSet:'Illusion'}}));
 assert.ok(!isGroupLot7({...lev,name:'Levitation'}));
});
test('v229: Group Flight uses EGO score not defense and half flight speed',()=>{
 assert.deepEqual([groupLimits(flight).max,groupLimits(flight).range,groupLimits(flight).speed],[4,15,6]);
 assert.deepEqual([groupLimits(lev).max,groupLimits(lev).range,groupLimits(lev).speed],[3,15,6]);
 assert.deepEqual([groupLimits(inv).max,groupLimits(inv).allowSelf],[13,true]);
});
test('v229: validate bounded member selection and flight prerequisite',()=>{
 assert.equal(validateGroupSelection(flight,sel(flight,['b','c']),scene,src).ok,true);
 assert.equal(validateGroupSelection(flight,sel(flight,['b','b']),scene,src).ok,false);
 assert.equal(validateGroupSelection(flight,sel(flight,['caster']),scene,src).ok,false);
 assert.equal(validateGroupSelection(flight,sel(flight,[]),scene,src).ok,false);
 assert.equal(validateGroupSelection(flight,sel(flight,['b','nope']),scene,src).ok,false);
 assert.equal(validateGroupSelection(inv,sel(inv,['caster','b']),scene,src).ok,true);
 const far={...recipient,x:3000};scene.tokens.set('b',far);
 assert.equal(validateGroupSelection(lev,sel(lev,['b']),scene,src).ok,false);
 scene.tokens.set('b',recipient);
 caster.items.delete('f1');assert.equal(validateGroupSelection(flight,sel(flight,['b']),scene,src).ok,false);
 caster.items.set('f1',{type:'power',name:'Flight 1',system:{powerSet:'Basic'}});
});
test('v229: invisible respects per-rank increase of size categories',()=>{
 assert.equal(sizeEligible('average','gigantic',3),true);
 assert.equal(sizeEligible('average','titanic',3),false);
 assert.equal(sizeEligible('big','titanic',3),true);
 assert.equal(sizeEligible('average','gargantuan',3),false);
});
test('v229: group movement cap shared across multiple moves on caster turn',()=>{
 const combat={id:'cmb',started:true,round:2,turn:1};
 const g={...sel(flight,['b']),range:15,speed:6};
 const first=validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1800,y:1000},scene,combat});
 assert.equal(first.ok,true);assert.equal(first.spaces,4);
 const moves={[first.tag]:{b:4}};
 const second=validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1700,y:1000},scene,combat,moves});
 assert.equal(second.ok,false,'7 spaces in same turn must be rejected');
 assert.equal(validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1700,y:1000},scene,combat:{...combat,turn:2},moves}).ok,true);
 assert.equal(validateGroupMove({kind:'invisibility',selection:g,source:src,target:recipient,
  point:{x:1700,y:1000},scene,combat}).ok,false);
 assert.equal(validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:-50,y:0},scene,combat}).ok,false);
});
test('v229: invisibility has native special status, flight has ActiveEffect movement',()=>{
 const x={kind:'invisibility',sourceEffectId:'fx',sourceTokenId:'caster',sceneId:'s',tokenId:'b',sourceActorUuid:'Actor.a'};
 const invisible=groupTargetEffectData(x);
 assert.ok(invisible.statuses.includes('invisible'));assert.equal(invisible.showIcon,2);
 assert.ok(invisible.flags[S][TARGET_FLAG]);
 const flying=groupTargetEffectData({...x,kind:'flight',speed:6});
 assert.ok(flying.changes.some(c=>c.key==='system.movement.flight.active'));
 assert.ok(flying.changes.some(c=>c.key==='system.movement.flight.value'&&c.value===6));
 assert.equal(flying.statuses.length,0);
});
test('v229: GM-sync adds target effect and removes only source-owned status after Concentration ends',async()=>{
 const oldGame=globalThis.game;
 const actorB={...recipient.actor,effects:[],created:[],deleted:[],
  async createEmbeddedDocuments(_kind,data){this.created.push(...data);this.effects.push(...data.map((e,i)=>({...e,id:'new-'+i})));},
  async deleteEmbeddedDocuments(_kind,ids){this.deleted.push(...ids);this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 const effect={id:'fx',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:inv.id},[GROUP_FLAG]:{version:1,kind:'invisibility',sceneId:'s',sourceTokenId:'caster',tokenIds:['b'],range:null,speed:null}}}};
 const actorA={...caster,effects:[effect]};const tA={...src,actor:actorA},tB={...recipient,actor:actorB};
 const localScene={...scene,tokens:new Map([['caster',tA],['b',tB]])};tA.parent=localScene;tB.parent=localScene;
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},scenes:new Map([['s',localScene]])};
 try{
  await syncGroupEffects();assert.equal(actorB.created.length,1);
  await syncGroupEffects();assert.equal(actorB.created.length,1,'idempotent');
  actorB.effects.push({id:'other',flags:{myother:{key:1}},statuses:['invisible']});
  actorA.effects=[];
  await syncGroupEffects();assert.deepEqual(actorB.deleted,['new-0']);
  assert.equal(actorB.effects.some(x=>x.id==='other'),true,'other invisibility retained');
 }finally{globalThis.game=oldGame;}
});
test('v229: source includes GM-authority checks, cost preflight and tracker exemption',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const tracker=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
 assert.ok(main.includes('lot7Selection=await selectGroupTargets(this)'));
 assert.ok(main.indexOf('lot7Selection=await selectGroupTargets(this)')<main.indexOf('activateGroupAfterPay(this,lot7Selection)'));
 assert.ok(main.includes('registerNativePriorityLot7Hooks()'));
 assert.ok(tracker.includes('groupMoveIsForced(tokenDocument)'));
 assert.ok(tracker.includes('d616GroupForced'));
});
test('v229: GM activation binds exact concentration and creates only target-specific effect',async()=>{
 const previous={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
 const target={...recipient.actor,effects:[],async createEmbeddedDocuments(_type,docs){
  this.effects.push(...docs.map((d,i)=>({...d,id:`target-${i}`})));},
  async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));}};
 const ef={id:'concentration',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:inv.id}}},
  async setFlag(_s,key,value){this.flags[S][key]=value;}};
 const casterActor={...caster,effects:[ef],items:new Map([[inv.id,inv]])};
 const first={...src,actor:casterActor},second={...recipient,actor:target};
 const localScene={...scene,tokens:new Map([['caster',first],['b',second]])};first.parent=localScene;second.parent=localScene;
 const flags={[S]:{itemId:inv.id}},message={id:'msg',speaker:{actor:'a',scene:'s',token:'caster'},
  getFlag(s,key){return flags[s]?.[key];},async setFlag(s,key,val){flags[s][key]=val;},
  async update(update){this.content=update.content;}};
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},scenes:new Map([['s',localScene]])};
 globalThis.ChatMessage={async create(o){return o;}};
 try{
  await assert.rejects(()=>applyGroupActivation(message,sel(inv,['b','b']),{confirm:async()=>true}));
  assert.equal(ef.flags[S][GROUP_FLAG],undefined,'invalid selection not committed');
  const mark=await applyGroupActivation(message,sel(inv,['b']),{confirm:async()=>true});
  assert.equal(mark.tokenIds[0],'b');assert.equal(ef.flags[S][GROUP_FLAG].kind,'invisibility');
  assert.equal(target.effects.length,1);assert.ok(target.effects[0].statuses.includes('invisible'));
  assert.ok(message.content.includes('autorizado pelo Mestre'));
  await assert.rejects(()=>applyGroupActivation(message,sel(inv,['b']),{confirm:async()=>true}));
 }finally{globalThis.game=previous.game;globalThis.ChatMessage=previous.ChatMessage;}
});
test('v229: GM-managed group movement does not spend ally Movement and marks forced operation',async()=>{
 const old=globalThis.game;
 const group={version:1,kind:'flight',sceneId:'s',sourceTokenId:'caster',tokenIds:['b'],range:15,speed:6,moves:{}};
 const ef={id:'f',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:flight.id},[GROUP_FLAG]:group}},
  async setFlag(_s,key,v){this.flags[S][key]=v;}};
 const actor={...caster,effects:[ef],items:new Map([[flight.id,flight]])};
 const first={...src,actor},target={...recipient};
 const localScene={...scene,tokens:new Map([['caster',first],['b',target]])};first.parent=localScene;target.parent=localScene;
 const flags={[S]:{itemId:flight.id,nativeGroupLot7Activated:{effectId:'f'}}};
 const message={speaker:{scene:'s',token:'caster',actor:'a'},getFlag(s,key){return flags[s]?.[key];}};
 const combatant={id:'c1',tokenId:'caster'};
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},scenes:new Map([['s',localScene]]),
  combat:{id:'cmb',started:true,round:1,turn:0,combatant,combatants:[combatant]}};
 try{
  let called=0;
  const action=await applyGroupMovement(message,{tokenId:'b',point:{x:1600,y:1000}},
   {move:async t=>{called++;assert.equal(groupMoveIsForced(t),true);}});
  assert.equal(called,1);assert.equal(action.spaces,2);
  assert.equal(ef.flags[S][GROUP_FLAG].moves['cmb:1:0'].b,2);
  await assert.rejects(()=>applyGroupMovement(message,{tokenId:'b',point:{x:2100,y:1000}},
   {move:async()=>{called++;}}));
  assert.equal(called,1,'GM did not move target beyond the cumulative speed');
 }finally{globalThis.game=old;}
});

test('v229: caster half Flight speed only while actively carrying passengers',async()=>{
 const {prepareD616Movement}=await import('../scripts/movement-calculator.mjs');
 const mk=()=>({size:'average',movement:Object.fromEntries(['run','flight','climb','swim','jump','glide','swingline','levitation'].map(key=>
  [key,{value:5,noncom:5,calc:key==='flight'?'rank':'',active:true}])),attributes:{rank:{value:3}},abilities:{agl:{value:4}}});
 const e={disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:flight.id},[GROUP_FLAG]:{kind:'flight',speed:6,tokenIds:['b']}}}};
 const actor={_source:{system:{size:'average',movement:{run:{value:5},flight:{noncom:5}}}},items:{contents:[]},effects:{contents:[e]}};
 let sys=mk();prepareD616Movement(sys,actor);assert.equal(sys.movement.flight.value,6);
 e.flags[S][GROUP_FLAG].tokenIds=[];sys=mk();prepareD616Movement(sys,actor);assert.equal(sys.movement.flight.value,15);
});

test('v229: collective flight/levitation validates altitude movement in 3D',()=>{
 const combat={id:'cmb',started:true,round:1,turn:0};
 const g={...sel(flight,['b']),range:15,speed:6};
 const good=validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1500,y:1000,elevation:10},scene,combat});
 assert.equal(good.ok,true);assert.ok(good.spaces>2&&good.spaces<3);
 const tooFar=validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1500,y:1000,elevation:80},scene,combat});
 assert.equal(tooFar.ok,false);
 assert.equal(validateGroupMove({kind:'flight',selection:g,source:src,target:recipient,
  point:{x:1500,y:1000,elevation:NaN},scene,combat}).ok,false);
});
