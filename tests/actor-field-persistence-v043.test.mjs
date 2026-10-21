import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const start = main.indexOf('const D616ActorSheetV2Base =');
const end = main.indexOf('/**\n * Extend the basic ItemSheet',start);
const code = main.slice(start,end);

function harness(type='character') {
  const writes=[];
  const system={health:{value:90,max:90},focus:{value:100,max:120},abilities:{agl:{value:4}},
    defaultElement:'ice',size:'average',history:'<p>Antigo</p>',personality:'<p>Calma</p>',
    distinguishingFeatures:'<p>Marcas</p>',teamManeuver:{level:1}};
  const actor={id:'a1',name:'Teste',type,isOwner:true,ownership:{default:3},system,
    async update(data){writes.push(data);for (const [key,value] of Object.entries(data)) {
      if(key==='name'){this.name=value;continue;}
      const parts=key.split('.').slice(1);let target=system;
      for(const part of parts.slice(0,-1))target=target[part];
      target[parts.at(-1)]=value;
    }return this;},
    toObject(){return {system:structuredClone(system),flags:{}};},
    getRollData(){return {};},items:[],effects:{contents:[]},allApplicableEffects(){return [];}};
  system.toObject=()=>structuredClone({...system,toObject:undefined});
  class BaseV2 { constructor(){this.actor=actor;this.isEditable=true;this.element=null;} async _prepareContext(){return {};} async _onRender(){} async _preClose(){} }
  class LegacyCharacter { _prepareItems(){} _prepareData(){} }
  class LegacyNPC { _prepareItems(){} _prepareCharacterData(){} }
  const context={foundry:{applications:{api:{HandlebarsApplicationMixin:b=>b},sheets:{ActorSheetV2:BaseV2}},utils:{deepClone:structuredClone}},
    CONFIG:{MULTIVERSE_D616:{sizes:{},teamManeuvers:[],elements:{},reverseSetList:{}}},
    game:{user:{isGM:true,id:'gm'},userId:'gm',i18n:{localize:v=>v}},
    CONST:{DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,LIMITED:1}},actorHasOpenCombat:()=>false,
    prepareActiveEffectCategories:()=>({}),LegacyMarvelMultiverseCharacterSheet:LegacyCharacter,
    LegacyMarvelMultiverseNPCSheet:LegacyNPC,console,document:{},ui:{notifications:{error(){}}}};
  vm.createContext(context);
  vm.runInContext(`${code}\nglobalThis.Sheets={MarvelMultiverseCharacterSheet,MarvelMultiverseNPCSheet};`,context);
  const Sheet=type==='npc'?context.Sheets.MarvelMultiverseNPCSheet:context.Sheets.MarvelMultiverseCharacterSheet;
  return {sheet:new Sheet(),actor,writes};
}

for(const type of ['character','npc']){
  test(`${type} updates each Health/Focus/attribute input independently`,async()=>{
    const {sheet,writes,actor}=harness(type);
    for(const [name,value] of [['system.health.value','72'],['system.focus.value','83'],
      ['system.abilities.agl.value','6'],['system.health.max','110']]){
      await sheet._d616SaveActorField({currentTarget:{name,value,type:'number',dataset:{dtype:'Number'}}});
    }
    assert.deepEqual(writes.map(w=>Object.keys(w)),[['system.health.value'],['system.focus.value'],
      ['system.abilities.agl.value'],['system.health.max']]);
    assert.equal(actor.system.focus.max,120,'Do not erase untouched Focus max');
    assert.equal(actor.system.focus.value,83);
    assert.equal(actor.system.health.max,110);
    assert.equal(actor.system.abilities.agl.value,6);
  });
  test(`${type} saves name, rank and Team Maneuver and keeps size effect workflow`,async()=>{
    const {sheet,writes}=harness(type);
    await sheet._d616SaveActorField({currentTarget:{name:'name',value:'Outro',type:'text',dataset:{}}});
    await sheet._d616SaveActorField({currentTarget:{name:'system.attributes.rank.value',value:'3',type:'number',dataset:{}}});
    await sheet._d616SaveActorField({currentTarget:{name:'system.teamManeuver.level',value:'2',type:'select-one',dataset:{}}});
    await sheet._d616SaveActorField({currentTarget:{name:'system.size',value:'big',type:'select-one',dataset:{}}});
    await sheet._d616SaveActorField({currentTarget:{name:'system.karma.max',value:'0',type:'hidden',dataset:{}}});
    assert.equal(writes.length,3);
    assert.equal(writes[2]['system.teamManeuver.level'],2);
  });
}

test('Biography can save History, Personality, Features without overwriting one another',async()=>{
  const {sheet,writes,actor}=harness();
  for(const [field,value] of [['history','<p>Novo</p>'],['personality','<b>Ousada</b>'],
    ['distinguishingFeatures','<p>Tatuagem</p>']]){
    const editor={innerHTML:value};const preview={innerHTML:''};
    const box={hidden:false};const button={setAttribute(){}};
    const panel={dataset:{field,editing:'true'},querySelector:s=>({'.mm-actor-bio-content':editor,
      '.mm-actor-bio-preview':preview,'.mm-actor-bio-editor':box,'.mm-actor-bio-edit':button})[s]};
    await sheet._d616SaveBiography(panel);
    assert.equal(preview.innerHTML,value);
    assert.equal(panel.dataset.editing,undefined);
  }
  assert.deepEqual(writes.map(w=>Object.keys(w)),[['system.history'],['system.personality'],['system.distinguishingFeatures']]);
  assert.equal(actor.system.focus.value,100);
  assert.equal(actor.system.history,'<p>Novo</p>');
});

test('Biography editing and both actor templates have readable, editable controls',()=>{
  const bio=fs.readFileSync(new URL('../templates/actor/parts/actor-biography.hbs',import.meta.url),'utf8');
  const character=fs.readFileSync(new URL('../templates/actor/actor-character-sheet.hbs',import.meta.url),'utf8');
  const npc=fs.readFileSync(new URL('../templates/actor/actor-npc-sheet.hbs',import.meta.url),'utf8');
  assert.match(bio,/mm-actor-bio-edit/);
  assert.match(bio,/mm-actor-bio-save/);
  assert.match(bio,/mm-actor-bio-cancel/);
  assert.doesNotMatch(bio,/\{\{editor\b/);
  for(const file of [character,npc])for(const field of ['system.health.value','system.focus.value','system.abilities.{{key}}.value'])
    assert.ok(file.includes(`name="${field}"`),`missing ${field}`);
  assert.match(code,/submitOnChange:false/);
  assert.match(code,/addEventListener\('change',event => this\._d616SaveActorField/);
});
