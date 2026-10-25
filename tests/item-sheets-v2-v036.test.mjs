import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const main=fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const from=main.indexOf('class LegacyMarvelMultiverseItemSheet extends');
const to=main.indexOf('/**\n * Define a set of template paths',from);
assert.ok(from>0&&to>from);
const source=main.slice(from,to);
const itemTypes=['power','weapon','trait','tag','origin','occupation','item'];
const p=new URL('../',import.meta.url);

function fixture(type='power') {
  const item={
    type,id:'item1',name:'Test '+type,img:'picture.png',isOwner:true,
    system:{
      element:'ice',description:'Description',effect:'Effect',powerSet:'Elemental Control',
      traits:[{name:'Combat Reflexes'}],tags:[{name:'Heroic'}],
      toObject(){return {element:this.element,description:this.description,effect:this.effect,
        powerSet:this.powerSet,traits:this.traits,tags:this.tags};}
    },effects:{contents:[]},flags:{},
    getRollData(){return {rank:3};},
    toObject(){return {name:this.name,img:this.img,type:this.type,flags:{},system:this.system.toObject()};},
    update(data){this.updated=data;return Promise.resolve(this)}
  };
  return item;
}
function loadHarness(item=fixture()) {
  class V1Sheet { static get defaultOptions(){return {}; } }
  class V2Sheet {
    constructor(){this.item=item;this.isEditable=true;this.tabGroups={primary:null};}
    async _prepareContext(){return {native:true};}
    async _onRender(){}
    async _onDrop(ev){this.nativeDrop=ev;return 'native';}
  }
  const context={
    foundry:{appv1:{sheets:{ItemSheet:V1Sheet}},applications:{api:{HandlebarsApplicationMixin:base=>base},
      sheets:{ItemSheetV2:V2Sheet}},utils:{deepClone:v=>structuredClone(v),duplicate:v=>structuredClone(v)}},
    game:{i18n:{localize:v=>v}},
    CONFIG:{MULTIVERSE_D616:{elements:{ice:{label:'Ice'}},abilities:{agl:'Agility'}}},
    prepareActiveEffectCategories:effects=>({temporary:{effects:effects.contents}}),
    onManageActiveEffect:(e,owner)=>{context.lastEffect={e,owner};},
    ui:{notifications:{}},Item:{},TextEditor:{},Dialog:class{},fromUuid:async()=>null,
    supportsAttachedPowers:()=>false,
    console
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis._items={D616ItemSheetsByType,d616ActivateItemTab,MarvelMultiverseItemSheet,d616ItemSheetTemplate};`,context);
  return {classes:context._items,item,context};
}

test('all seven Item subtypes register distinct stable V14 sheet templates',()=>{
  const {classes}=loadHarness();
  const sheets=classes.D616ItemSheetsByType;
  assert.deepEqual(Object.keys(sheets),itemTypes);
  for(const type of itemTypes){
    assert.match(sheets[type].PARTS.sheet.template,new RegExp(`item-${type}-sheet\\.hbs$`));
    assert.match(sheets[type].DEFAULT_OPTIONS.classes.join(' '),/mm-item-v2/);
  }
  assert.equal(new Set(Object.values(sheets)).size,7);
  assert.equal(new Set(Object.values(sheets).map(x=>x.name)).size,7);
  assert.match(main,/sheetConfig\.registerSheet\(foundry\.documents\.Item,"multiverse-d616",ItemSheetClass/);
  assert.match(main,/sheetConfig\.registerSheet\(foundry\.documents\.Item,"multiverse-d616-legacy",LegacyMarvelMultiverseItemSheet/);
  assert.doesNotMatch(main,/ItemsCollection\?\.registerSheet\?\.\("multiverse-d616", MarvelMultiverseItemSheet/);
});

test('concurrent power and occupation sheets never share a mutable template',()=>{
 const {classes}=loadHarness();
 const sheets=classes.D616ItemSheetsByType;
 const first=sheets.power.PARTS.sheet.template;
 const second=sheets.occupation.PARTS.sheet.template;
 new sheets.occupation();new sheets.power();
 assert.equal(sheets.power.PARTS.sheet.template,first);
 assert.equal(sheets.occupation.PARTS.sheet.template,second);
 assert.notEqual(first,second);
});

test('power context preserves descriptions, prerequisites and Attack/Edge fields',async()=>{
 const {classes,item}=loadHarness();
 const App=classes.D616ItemSheetsByType.power;
 const app=new App();
 const data=await app._prepareContext();
 assert.equal(data.item,item);
 assert.equal(data.editable,true);
 assert.equal(data.native,true);
 assert.equal(data.system.description,'Description');
 assert.equal(data.selectedElement,'ice');
 assert.equal(data.abilities.agl.label,'Agility');
 assert.equal(data.damageTypes.focus.label,'Focus');
 assert.equal(data.attackEdgeModes.edge.label,'Edge');
 data.system.description='Changed';
 assert.equal(item.system.description,'Description');
 assert.ok(data.effects.temporary);
});

test('Occupation context and controls retain embedded Traits and Tags',async()=>{
 const item=fixture('occupation');
 const {classes}=loadHarness(item);
 const app=new classes.D616ItemSheetsByType.occupation();
 const data=await app._prepareContext();
 assert.equal(data.system.traits[0].name,'Combat Reflexes');
 assert.equal(data.system.tags[0].name,'Heroic');
 assert.equal(await app._onDrop({target:{closest:()=>null}}),'native');
});

test('legacy effect data-action is removed from Item templates to avoid V2 action collision',()=>{
 const hbs=fs.readFileSync(new URL('../templates/item/parts/item-effects.hbs',import.meta.url),'utf8');
 assert.match(hbs,/data-effect-action="create"/);
 for(const action of ['edit','toggle','delete']) assert.match(hbs,new RegExp(`data-effect-action="${action}"`));
 assert.doesNotMatch(hbs,/\sdata-action=/);
 assert.match(main,/a\.dataset\.effectAction \?\? a\.dataset\.action/);
});

test('V2 item styles and Non-Combat Checks correction scoped only to character header',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../system.json',import.meta.url)));
 assert.equal(manifest.version,'0.2.84');
 assert.ok(manifest.styles.includes('styles/item-sheet-v2.css'));
 const styles=fs.readFileSync(new URL('../styles/item-sheet-v2.css',import.meta.url),'utf8');
 assert.match(styles,/\.sheet\.item\.mm-item-v2/);
 const css=fs.readFileSync(new URL('../styles/actor-sheet-v2.css',import.meta.url),'utf8');
 assert.match(css,/v0\.2\.36 — Non-Combat Checks/);
 assert.match(css,/color:#fff !important/);
 assert.match(css,/form\.character/);
});
