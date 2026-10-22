import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeItemEffectDurations } from '../scripts/active-effect-v14-compat.mjs';
import { adamantiumEffectData, weaponAdamantiumValue } from '../scripts/adamantium.mjs';

const main=fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const start=main.indexOf('const D616ActorSheetV2Base =');
const end=main.indexOf('/**\n * Extend the basic ItemSheet',start);
assert.ok(start>0&&end>start);
const script=main.slice(start,end);

const adam=adamantiumEffectData({uuid:'Item.ABC'});

test('0.2.70 — Adamantium usa schema v14 e duração indefinida válida',()=>{
 assert.equal(adam.type,'base');
 assert.equal(adam.transfer,false);
 assert.deepEqual(adam.duration,{value:null,units:'seconds',expiry:null,expired:false});
 assert.deepEqual(adam.system.changes,[{key:'flags.multiverse-d616.adamantiumHealthDrIgnore',type:'add',value:1,phase:'initial',priority:null}]);
 assert.ok(!('duration.rounds' in adam));
 assert.ok(!('system.changes' in adam));
});

test('0.2.70 — sanitização remove somente valores de duração inválidos',()=>{
 const original={type:'weapon',effects:[
  {duration:{value:'',units:'seconds'}},
  {duration:{value:'3',units:'rounds'}},
  {duration:{value:Infinity,units:'minutes'}},
  {duration:{value:'undefined',units:'hours'}},
  {duration:{value:2,units:'rounds'}},
  {duration:{value:null,units:'seconds'}},
 ]};
 const copy=structuredClone(original);
 const result=normalizeItemEffectDurations(copy);
 assert.equal(result,copy);
 assert.deepEqual(copy.effects.map(e=>e.duration.value),[null,3,null,null,2,null]);
 assert.equal(original.effects[0].duration.value,''); // does not mutate original
});

test('0.2.70 — arrastar arma com Adamantium à ficha v14 cria documento válido',async()=>{
 const actor={id:'testActor',items:[],system:{defaultElement:'Fire'},
  async createEmbeddedDocuments(type,items){
   assert.equal(type,'Item');
   for(const it of items) for(const effect of it.effects??[])
    assert.ok(effect.duration.value===null||Number.isInteger(effect.duration.value),
     'v14: ActiveEffect.duration.value must be integer or null');
   this.added=items; return items;
  }
 };
 class Base {
  constructor(){this.actor=actor;this.isEditable=true;}
  static DEFAULT_OPTIONS={};
  async _onDropDocument(){throw new Error('Base should not copy unsanitized Item');}
  async _onDropItem(){throw new Error('Base _onDropItem should not copy unsanitized Item');}
 }
 class LegacyCharacter{} class LegacyNPC{}
 const context={
   foundry:{applications:{api:{HandlebarsApplicationMixin:base=>base},sheets:{ActorSheetV2:Base}},
            utils:{deepClone:v=>structuredClone(v)}},
   LegacyMarvelMultiverseCharacterSheet:LegacyCharacter,
   LegacyMarvelMultiverseNPCSheet:LegacyNPC,
   CONFIG:{},game:{},normalizeItemEffectDurations,
 };
 vm.createContext(context);
 vm.runInContext(`${script}\nglobalThis.TestSheet=MarvelMultiverseCharacterSheet`,context);
 const Item={documentName:'Item',type:'weapon',parent:null, toObject(){return structuredClone({
  type:'weapon', name:'Martelo Rompe Tempestade',system:{equipped:false},
  effects:[{...adam,duration:{value:'',units:'seconds',expiry:null,expired:false}}],
 });}};
 const sheet=new context.TestSheet();
 const result=await sheet._onDropDocument({},Item);
 assert.ok(result);
 assert.equal(actor.added[0].effects[0].duration.value,null);
 const effect=actor.added[0].effects[0];
 const model={type:'weapon',system:{equipped:true},effects:[effect]};
 assert.equal(weaponAdamantiumValue(model),1);
 assert.equal(Item.toObject().effects[0].duration.value,''); // source unchanged
});

test('0.2.70 — item com duração válida preserva temporização',()=>{
 const item={effects:[{duration:{value:2,units:'rounds',expiry:'turnStart'}}]};
 normalizeItemEffectDurations(item);
 assert.equal(item.effects[0].duration.value,2);
 assert.equal(item.effects[0].duration.expiry,'turnStart');
});

test('0.2.70 — criação manual de efeitos usa campos atuais',()=>{
 assert.match(main,/type: 'base',\s*system: \{ changes: \[\] \},\s*duration:/);
 assert.doesNotMatch(main,/'duration\.rounds'/);
 assert.match(script,/_onDropDocument\(event, document\)/);
 assert.match(script,/normalizeItemEffectDurations\(item\.toObject\(false\)\)/);
});
