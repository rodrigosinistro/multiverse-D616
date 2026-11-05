import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const main = readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const begin = main.indexOf('const D616ActorSheetV2Base =');
const end = main.indexOf('/**\n * Extend the basic ItemSheet',begin);
const script = main.slice(begin,end);
assert.ok(begin > 0 && end > begin);

function makeHarness({type='character', count=80, withItems=true}={}) {
  let itemSerializations=0, systemSerializations=0, snapshotSerializations=0, enrichCalls=0;
  let changes=0;
  const entries = Array.from({length:count},(_,n)=>({
    _id:`p-${n}`,name:`Power ${n}`,type:'power',img:'icon.webp',
    system:{powerSet:n%2===0?'Basic':'Elemental Control'},
  }));
  const items = entries.map(item=>({
    ...item,toObject() {itemSerializations++;return structuredClone(item);},
  }));
  const actor = {
    id:'actor138',name:'Hero',type,img:'hero.webp',isOwner:true,
    ownership:{default:3},items,
    system:{
      abilities:{mle:{value:3}},powers:{},origins:[],
      health:{value:44,max:60},focus:{value:20,max:30},
      history:'<p>Uma longa história</p>',personality:'Calmo',
      distinguishingFeatures:'Capa vermelha',
      toObject(){systemSerializations++;return structuredClone({
        abilities:this.abilities,powers:this.powers,origins:this.origins,
        health:this.health,focus:this.focus,history:this.history,
        personality:this.personality,distinguishingFeatures:this.distinguishingFeatures,
      });},
    },
    toObject() {
      snapshotSerializations++;
      const snapshot={type,flags:{},system:{
        abilities:structuredClone(this.system.abilities),powers:{},origins:[],
        health:structuredClone(this.system.health),focus:structuredClone(this.system.focus),
        history:this.system.history,personality:this.system.personality,
        distinguishingFeatures:this.system.distinguishingFeatures,
      }};
      if(withItems) snapshot.items=structuredClone(entries);
      return snapshot;
    },
    getRollData(){return {abilities:{mle:{value:3}}}},
    allApplicableEffects(){return []},
    async update(payload){
      changes++;
      for (const [field,value] of Object.entries(payload)) {
        const segments=field.split('.');
        let root=this;
        for (const part of segments.slice(0,-1)) root=root[part];
        root[segments.at(-1)]=value;
      }
      return this;
    },
  };
  class Base {
    constructor(){this.actor=actor;this.isEditable=true;this.tabGroups={primary:'abilities'};}
    async _prepareContext(){return {base:true}}
    async _onRender(){}
  }
  class LegacyCharacter {
    _prepareItems(context){context.powers={Basic:context.items.filter(i=>i.type==='power')}}
    _prepareData(context){context.system.abilities.mle.label='Melee';}
  }
  class LegacyNpc { _prepareItems(context){context.powers={Basic:context.items.filter(i=>i.type==='power')}} _prepareCharacterData(){} }
  const context = {
    foundry:{utils:{deepClone:structuredClone},applications:{api:{HandlebarsApplicationMixin:b=>b},sheets:{ActorSheetV2:Base}}},
    LegacyMarvelMultiverseCharacterSheet:LegacyCharacter,
    LegacyMarvelMultiverseNPCSheet:LegacyNpc,
    CONFIG:{MULTIVERSE_D616:{sizes:{average:{label:'Average'}},teamManeuvers:[],elements:{},reverseSetList:{Basic:'basic'}}},
    game:{user:{isGM:true,id:'u1'},userId:'u1',i18n:{lang:'pt-BR',localize:t=>t}},
    actorHasOpenCombat:()=>false,
    prepareActiveEffectCategories:()=>({}),
    ui:{notifications:{warn(){},error(){}}},
    console,ImagePopout:class {},
    normalizeItemEffectDurations:data=>data,
    document:{createElement:()=>({})},
    TextEditor:{},
  };
  context.foundry.applications.ux={TextEditor:{implementation:{
    async enrichHTML(raw){enrichCalls++;return `ENRICHED:${raw}`;}
  }}};
  vm.createContext(context);
  vm.runInContext(`${script}\nglobalThis.Sheets138={MarvelMultiverseCharacterSheet,MarvelMultiverseNPCSheet};`,context);
  return {
    actor,context,
    Sheet:context.Sheets138[type==='character'?'MarvelMultiverseCharacterSheet':'MarvelMultiverseNPCSheet'],
    counters:()=>({itemSerializations,systemSerializations,snapshotSerializations,enrichCalls,changes}),
  };
}

test('v0.2.138 reuses the complete detached Actor snapshot for a large sheet',async()=>{
  const {Sheet,actor,counters}=makeHarness({count:514});
  const app=new Sheet();
  const ctx=await app._prepareContext();
  assert.equal(ctx.items.length,514);
  assert.equal(ctx.powers.Basic.length,514);
  assert.equal(counters().snapshotSerializations,1);
  assert.equal(counters().itemSerializations,0,'embedded Items must not be serialized twice');
  assert.equal(counters().systemSerializations,1,'system DataModel values are retained for derived attributes');
  ctx.items[0].name='Mutated copy';
  ctx.system.health.value=1;
  assert.equal(actor.items[0].name,'Power 0');
  assert.equal(actor.system.health.value,44);
  assert.equal(ctx.data.system.health.value,44,'prepared derived data must remain separate from data snapshot');
});

test('v0.2.138 falls back to Item.toObject when snapshot does not include embedded Items',async()=>{
  const {Sheet,counters}=makeHarness({count:6,withItems:false,type:'npc'});
  const app=new Sheet();
  const ctx=await app._prepareContext();
  assert.equal(ctx.items.length,6);
  assert.equal(counters().itemSerializations,6);
  assert.equal(counters().systemSerializations,1);
});

test('v0.2.138 caches unchanged static biography but updates edits and permissions',async()=>{
  const {Sheet,actor,context,counters}=makeHarness({count:1});
  const app=new Sheet();
  const first=await app._prepareContext();
  assert.equal(first.enrichedBiography.history,'ENRICHED:<p>Uma longa história</p>');
  assert.equal(counters().enrichCalls,3);
  await app._prepareContext();
  assert.equal(counters().enrichCalls,3,'unchanged static biography should not re-enrich');
  actor.system.history='Outra história';
  const updated=await app._prepareContext();
  assert.equal(updated.enrichedBiography.history,'ENRICHED:Outra história');
  assert.equal(counters().enrichCalls,4);
  actor.isOwner=false;
  await app._prepareContext();
  assert.equal(counters().enrichCalls,7,'permission changes must invalidate cache');
  context.game.i18n.lang='en';
  await app._prepareContext();
  assert.equal(counters().enrichCalls,10,'locale changes must invalidate cache');
});

test('v0.2.138 does not cache dynamic Foundry references or inline rolls',async()=>{
  const {Sheet,actor,counters}=makeHarness({count:1});
  actor.system.history='@UUID[Actor.abc] [[1d6]]';
  const app=new Sheet();
  await app._prepareContext();
  await app._prepareContext();
  assert.equal(counters().enrichCalls,4,'two dynamic plus one-time static fields');
});

test('v0.2.138 ignores duplicate scalar change events but persists actual changes',async()=>{
  const {Sheet,actor,counters}=makeHarness({count:1});
  const app=new Sheet();
  const change=(name,value,type='text')=>({currentTarget:{name,value,type,dataset:{}}});
  await app._d616SaveActorField(change('name','Hero'));
  await app._d616SaveActorField(change('system.abilities.mle.value','3','number'));
  assert.equal(counters().changes,0);
  await app._d616SaveActorField(change('system.abilities.mle.value','5','number'));
  assert.equal(actor.system.abilities.mle.value,5);
  assert.equal(counters().changes,1);
  await app._d616SaveActorField(change('name','Hero Prime'));
  assert.equal(actor.name,'Hero Prime');
  assert.equal(counters().changes,2);
});

test('v0.2.138 groups empty character and NPC inventories without depending on a loop',()=>{
  const start=main.indexOf('class LegacyMarvelMultiverseCharacterSheet');
  const end=main.indexOf('/* -------------------------------------------------------------------------- */\n/* D616 Actor Sheets',start);
  assert.ok(end>start);
  const classSource=main.slice(start,end);
  const context={foundry:{appv1:{sheets:{ActorSheet:class {}}}},CONFIG:{MULTIVERSE_D616:{reverseSetList:{Basic:'basic'}}},Item:{DEFAULT_ICON:'default.webp'}};
  vm.createContext(context);
  vm.runInContext(`${classSource}\nglobalThis.Legacy138={Character:LegacyMarvelMultiverseCharacterSheet,NPC:LegacyMarvelMultiverseNPCSheet};`,context);
  for(const Legacy of Object.values(context.Legacy138)) {
    const sheetContext={items:[]};
    Legacy.prototype._prepareItems.call({},sheetContext);
    for(const key of ['gear','origins','occupations','weapons','traits','tags']) assert.equal(sheetContext[key].length,0);
    assert.ok(Array.isArray(sheetContext.powers.Basic));
  }
});
