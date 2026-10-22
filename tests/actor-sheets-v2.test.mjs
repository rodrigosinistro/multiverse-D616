import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeItemEffectDurations} from '../scripts/active-effect-v14-compat.mjs';

const main = fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const start = main.indexOf('const D616ActorSheetV2Base =');
const end = main.indexOf('/**\n * Extend the basic ItemSheet',start);
assert.ok(start>0 && end>start,'Expected actor-sheet migration block');
const script = main.slice(start,end);
const makeFixture = (type='character') => {
  const actor = {
    id:'actor1',name:'Teste',img:'face.webp',type,
    ownership:{default:3},isOwner:true,
    system:{
      toObject(){return {abilities:{mle:{value:3}},powers:{},origins:[],
        health:{value:50,max:50},focus:{value:35,max:35}};},
      defaultElement:'Ice'
    },
    items:[],effects:{contents:[]},
    getRollData(){return {mle:3};},
    toObject(){return {type,flags:{},system:this.system.toObject()};},
    allApplicableEffects(){return [];},
    createEmbeddedDocuments(_type,items){this.added=items;return Promise.resolve(items)},
    deleteEmbeddedDocuments(){return Promise.resolve([])}
  };
  return actor;
};
const makeHarness = (actor=makeFixture()) => {
  class V2Base {
    constructor(){this.actor=actor;this.tabGroups={primary:'abilities'};this.isEditable=true;}
    static get instances(){return new Map();}
    async _prepareContext(){return {base:true};}
    async _onRender(){}
    async render(){this.wasRendered=true;return this;}
    async _onDropItem(){this.wasSorted=true;return 'sorted';}
    async _onDropDocument(){this.wasSorted=true;return 'sorted';}
  }
  class LegacyCharacter { _prepareItems(context){context.legacyItems=true;} _prepareData(context){context.preparedCharacter=true;} }
  class LegacyNPC { _prepareItems(context){context.legacyItems=true;} _prepareCharacterData(context){context.preparedCharacter=true;} }
  const context = {
    foundry:{utils:{deepClone:v=>structuredClone(v)},applications:{api:{HandlebarsApplicationMixin:base=>base},sheets:{ActorSheetV2:V2Base}}},
    LegacyMarvelMultiverseCharacterSheet: LegacyCharacter,
    LegacyMarvelMultiverseNPCSheet: LegacyNPC,
    CONFIG:{MULTIVERSE_D616:{sizes:{average:{label:'Average'}},teamManeuvers:[],elements:{},reverseSetList:{Basic:'basic'}}},
    game:{userId:'u1',user:{isGM:true,id:'u1'},i18n:{localize:v=>v}},
    CONST:{DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,LIMITED:1}},
    actorHasOpenCombat:()=>false,
    prepareActiveEffectCategories:()=>({passive:[],temporary:[]}),
    ui:{notifications:{warn() {}}},
    normalizeItemEffectDurations,
    console,
    ImagePopout:class{},
    document:{createElement(){return {}}},
  };
  vm.createContext(context);
  vm.runInContext(`${script}\nglobalThis._sheetClasses = {MarvelMultiverseCharacterSheet,MarvelMultiverseNPCSheet,d616DropActorItem,d616ActivateTab};`,context);
  return {classes:context._sheetClasses,actor,context};
};

test('Both Actor sheets use the Foundry v14 Handlebars/ActorSheetV2 API',()=>{
  assert.match(script,/HandlebarsApplicationMixin\(\s*foundry\.applications\.sheets\.ActorSheetV2/);
  for(const Sheet of Object.values(makeHarness().classes).filter(v=>typeof v==='function'&&v.name.includes('Sheet'))) {
    assert.equal(Sheet.DEFAULT_OPTIONS.position.width,Sheet.name==='MarvelMultiverseNPCSheet'?900:690);
    assert.match(Sheet.PARTS.sheet.template,/templates\/actor\/actor-(?:character|npc)-sheet\.hbs/);
  }
  assert.match(main,/sheetConfig\.registerSheet\(foundry\.documents\.Actor,"multiverse-d616",MarvelMultiverseCharacterSheet/);
  assert.match(main,/sheetConfig\.registerSheet\(foundry\.documents\.Actor,"multiverse-d616",MarvelMultiverseNPCSheet/);
  assert.doesNotMatch(script,/\bthis\.state\s*=/,'Never override ApplicationV2.state');
});

test('Character sheet assembles the original Handlebars context without mutating Actor',async()=>{
  const {classes,actor}=makeHarness();
  const app=new classes.MarvelMultiverseCharacterSheet();
  const ctx=await app._prepareContext();
  assert.equal(ctx.actor,actor);
  assert.equal(ctx.editable,true);
  assert.equal(ctx.preparedCharacter,true);
  assert.equal(ctx.legacyItems,true);
  assert.equal(ctx.system.health.value,50);
  assert.deepEqual(Object.keys(ctx.powers),['Basic']);
  ctx.system.health.value=1;
  assert.equal(actor.system.toObject().health.value,50);
});

test('NPC sheet preserves context and leaves out actor-type-specific character preparation',async()=>{
  const {classes}=makeHarness(makeFixture('npc'));
  const app=new classes.MarvelMultiverseNPCSheet();
  const ctx=await app._prepareContext();
  assert.equal(ctx.preparedCharacter,undefined);
  assert.equal(ctx.legacyItems,true);
  assert.ok(Array.isArray(ctx.gear));
  assert.ok(ctx.powers.Basic);
});

test('V14 sheets preserve edit and item drop behavior while not duplicating items',async()=>{
  const {classes,actor}=makeHarness();
  const app=new classes.MarvelMultiverseCharacterSheet();
  const doc={parent:{id:'other'},toObject(){return {name:'Elemental Grab',type:'power',system:{powerSet:'Elemental Control'}};}};
  await app._onDropItem({},doc);
  assert.equal(actor.added[0].name,'Elemental Grab');
  assert.equal(actor.added[0].system.element,'Ice');
  actor.items.push({name:'Elemental Grab',type:'power'});
  actor.added=null;
  await app._onDropItem({},doc);
  assert.equal(actor.added,null,'Duplicate power should not be created');
  await app._onDropItem({}, {parent:{id:'actor1'}});
  assert.equal(app.wasSorted,true,'Native actor drag/drop should sort existing items');
});

test('V2 tabs retain active display and are not recreated per rendering',()=>{
  const {classes}=makeHarness();
  const app=new classes.MarvelMultiverseCharacterSheet();
  const nav=['abilities','biography','gear'].map(t=>({dataset:{tab:t},classList:{toggle(k,b){this[k]=b}},setAttribute(){}}));
  const tabs=['abilities','biography','gear'].map(t=>({dataset:{tab:t},classList:{toggle(k,b){this[k]=b}},style:{},hidden:false}));
  app.element={querySelectorAll:q=>q.includes('sheet-tabs')?nav:tabs};
  classes.d616ActivateTab(app,'gear');
  assert.equal(app.tabGroups.primary,'gear');
  assert.equal(tabs[0].hidden,true);
  assert.equal(tabs[2].hidden,false);
  assert.equal(nav[2].classList.active,true);
});

test('Sheet export PDF V2 integration exists',()=>{
  const exporter=fs.readFileSync(new URL('../features/sheet-export-m616/m616-export.js',import.meta.url),'utf8');
  assert.match(exporter,/globalThis\.multiverseD616ExportPDF\s*=\s*exportActor/);
  assert.match(script,/m616-export-inline/);
});


test('V2 renders tooltip attributes for character and NPC item rows without V1 hook',()=>{
  for (const type of ['character','npc']) {
    const {classes,actor}=makeHarness(makeFixture(type));
    const power={id:'p1',name:'Elemental Blast',type:'power',system:{
      cost:'5 Focus',action:'Standard',range:'10 spaces',description:'Ataque elemental',
      effect:'Causa dano elemental'} };
    actor.items=[power];
    actor.items.get=id=>actor.items.find(p=>p.id===id);
    const attrs={itemId:'p1'};
    const row={dataset:attrs};
    const root={querySelectorAll(){return [row];}};
    vm.runInNewContext('1+1');
    const application=new classes[type==='npc'?'MarvelMultiverseNPCSheet':'MarvelMultiverseCharacterSheet']();
    // Function extracted from the real source is exercised with a small DOM fixture.
    const code=script.slice(script.indexOf('function d616ActivateSheetTooltips'),script.indexOf('function d616ActivateTab'));
    const bind={};
    vm.createContext(bind);
    vm.runInContext(code+';globalThis.apply=d616ActivateSheetTooltips;',bind);
    bind.apply(application,root);
    assert.equal(attrs.mmhtType,'Power');
    assert.equal(attrs.mmhtTitle,'Elemental Blast');
    assert.equal(attrs.mmhtDesc,'Ataque elemental');
    assert.equal(attrs.mmhtEffect,'Causa dano elemental');
    assert.equal(attrs.mmhtCost,'5 Focus');
  }
});

test('V2 CSS restores vertical scrolling and NPC dashboard preserves power controls',()=>{
  const css=fs.readFileSync(new URL('../styles/actor-sheet-v2.css',import.meta.url),'utf8');
  const npc=fs.readFileSync(new URL('../templates/actor/actor-npc-sheet.hbs',import.meta.url),'utf8');
  assert.match(css,/\.window-content\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css,/\.sheet-body[^}]*overflow:\s*visible/s);
  assert.match(css,/grid-template-columns:[^;]+/);
  assert.match(npc,/mm-v2-npc-top/);
  assert.match(npc,/mm-v2-npc-bottom/);
  assert.match(npc,/actor-powers\.hbs/);
  assert.match(npc,/actor-traits\.hbs/);
  assert.match(npc,/actor-tags\.hbs/);
  for(const field of ['name','system.attributes.rank.value','system.health.value','system.health.max','system.focus.value','system.focus.max'])
    assert.ok(npc.includes('name="'+field+'"'),field);
});
