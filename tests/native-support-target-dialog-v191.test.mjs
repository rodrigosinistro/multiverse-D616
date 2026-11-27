import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispatchNativeSupportPower,findCasterToken,isCasterToken,inspectSupportRequest}
  from '../scripts/native-power-support.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
let seq=0;
function actor({focus=60,health=50,vig=5,rank=4,status=[]}={}){
  const id=`p${++seq}`;
  const obj={id,uuid:`Actor.${id}`,name:id,flags:{},system:{focus:{value:focus,max:100},health:{value:health,max:100},
    abilities:{vig:{value:vig}},attributes:{rank:{value:rank}}},effects:[],powers:[],
    async update(patch){for(const [path,value] of Object.entries(patch)){
      const segments=path.split('.');let target=this;
      for(const p of segments.slice(0,-1))target=target[p]??=(Object.create(null));
      target[segments.at(-1)]=value;
    }return this;},
    async createEmbeddedDocuments(_type,effects){for(const effect of effects)this.effects.push({...effect,id:`fx${++seq}`});return effects;},
    async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(e=>!ids.includes(e.id));return ids;},
    testUserPermission(){return true},items:{get(itemId){return obj.powers.find(p=>p.id===itemId)}},};
  obj.effects.push(...status.map(s=>({id:`status${++seq}`,disabled:false,statuses:new Set([s])})));
  return obj;
}
const power=(a,name,powerSet)=>{
  const orig=catalog.find(p=>p.name===name&&p.system.powerSet===powerSet);assert.ok(orig);
  const item={...orig,id:orig._id,actor:a,flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${orig._id}`}}};
  a.powers.push(item);return item;
};
function context({caster,target,combat=false,syntheticSource=false,marked=true}={}){
  const scene={id:'room1',grid:{size:100}};
  const origin={id:'tokA',actorId:caster.id,actor:syntheticSource?{id:caster.id,uuid:'Scene.room1.Token.tokA.Actor.other'}:caster,
    parent:scene,x:0,y:0,width:1,height:1,disposition:1,name:'Origin'};
  const other={id:'tokB',actorId:target.id,actor:target,parent:scene,x:100,y:0,width:1,height:1,disposition:1,name:'Ally'};
  const tokens=new Map([[origin.id,origin],[other.id,other]]);
  scene.tokens={get:id=>tokens.get(id),values:()=>tokens.values()};
  const combatObj=combat?{id:'combat1',started:true,round:2,turn:1,
    combatants:[{id:'combatant1',actor:caster,actorId:caster.id}]}:null;
  const initial=marked?['tokB']:[];
  let targetIds=initial.slice(),dialogs=[],chatMessages=0,committed=0;
  const old={game:globalThis.game,canvas:globalThis.canvas,foundry:globalThis.foundry,
    ChatMessage:globalThis.ChatMessage,ui:globalThis.ui};
  globalThis.game={user:{id:'gm',isGM:true,get targets(){return new Set(targetIds.map(id=>({document:tokens.get(id)})));},
    async updateTokenTargets(ids){targetIds=ids.slice();}},users:{activeGM:{id:'gm',isGM:true}},combat:combatObj,
    settings:{get:()=> 'manual'},multiverseD616:{turnTracker:{async trackItemUse(){committed++;},
      getState:()=>({reactionUsed:0,reactionMax:1})}}};
  globalThis.canvas={scene,tokens:{controlled:syntheticSource?[]:[{document:origin}]}};
  globalThis.foundry={applications:{api:{DialogV2:{wait:async data=>{
    dialogs.push(data);
    const preferred=data.buttons.some(b=>b.action==='marked')?'marked':
      data.buttons.some(b=>b.action==='new')?'cancel':
      data.buttons.some(b=>b.action==='ok')?'ok':
      data.buttons.some(b=>b.action==='yes')?'yes':'cancel';
    const btn=data.buttons.find(b=>b.action===preferred);
    return btn.callback({}, {form:{elements:{namedItem(){return {value:'0'}}}}}, {});
  }}}}};
  globalThis.ChatMessage={getSpeaker:()=>({alias:'Caster'}),async create(){chatMessages++;}};
  globalThis.ui={notifications:{info(){},warn(){}}};
  return {origin,other,scene,combat:combatObj,dialogs,get chatMessages(){return chatMessages;},
    get committed(){return committed;},get targets(){return targetIds;},restore(){Object.assign(globalThis,old);}};
}

test('v191: support dialog is forced even when smart-target setting is manual; five powers',async()=>{
  const examples=[
    ['Healing Hands','Healing',false],['Soothing Touch','Healing',false],
    ['Rally on Me','Tactics',true],['Inspiration','Basic',true],['Battle Plan','Tactics',true],
  ];
  for(const [name,set,combat] of examples){
    const caster=actor(),target=actor({focus:40,health:30});
    const item=power(caster,name,set),env=context({caster,target,combat,marked:true});
    try{
      assert.equal(await dispatchNativeSupportPower(item),true,name);
      assert.match(env.dialogs[0].window.title, /Alvos/, name);
      assert.deepEqual(env.dialogs[0].buttons.map(b=>b.action),['marked','new','cancel'],name);
      assert.equal(env.targets.length,1);
      assert.equal(env.committed,1,`${name} must use transaction only once`);
      assert.equal(env.chatMessages,1);
      if(name==='Healing Hands')assert.equal(target.system.health.value,40);
      if(name==='Soothing Touch')assert.equal(target.system.focus.value,50);
      if(name==='Rally on Me')assert.equal(target.system.focus.value,60);
      if(name==='Inspiration'||name==='Battle Plan')assert.equal(target.effects.length,1);
    }finally{env.restore();}
  }
});

test('v191: cancel target selection before Focus spend, even for Healing Hands',async()=>{
  const caster=actor(),target=actor(),item=power(caster,'Healing Hands','Healing');
  const env=context({caster,target,marked:false});
  try{
    assert.equal(await dispatchNativeSupportPower(item),false);
    assert.match(env.dialogs[0].window.title,/Alvos/);
    assert.deepEqual(env.dialogs[0].buttons.map(b=>b.action),['new','cancel']);
    assert.equal(caster.system.focus.value,60);
    assert.equal(target.system.health.value,50);
    assert.equal(env.committed,0);
    assert.equal(env.chatMessages,0);
  }finally{env.restore();}
});

test('v191: authenticated GM resolves unlinked token by base actorId, rejects unrelated token',async()=>{
  const caster=actor(),target=actor(),item=power(caster,'Healing Hands','Healing');
  const env=context({caster,target,syntheticSource:true});
  try{
    assert.equal(isCasterToken(env.origin,caster,env.scene),true);
    assert.equal(isCasterToken(env.other,caster,env.scene),false);
    assert.equal(findCasterToken(caster,env.scene,[]),env.origin);
    assert.equal(inspectSupportRequest({caster,item,scene:env.scene,sourceToken:env.origin,
      targetTokens:[env.other],spent:10}).ok,true);
    assert.equal(await dispatchNativeSupportPower(item),true);
  }finally{env.restore();}
});

test('v191: source identity is limited to scene and base actor, even if request claims another origin',()=>{
  const caster=actor(),target=actor(),env=context({caster,target});
  try{
    assert.equal(isCasterToken({...env.origin,actorId:'forged',actor:{id:'forged',uuid:'Actor.forged'}},caster,env.scene),false);
    assert.equal(isCasterToken({...env.origin,parent:{id:'otherScene'}},caster,env.scene),false);
  }finally{env.restore();}
});
