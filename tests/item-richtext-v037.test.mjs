import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../',import.meta.url);
const get=file=>fs.readFileSync(new URL(file,base),'utf8');
const main=get('multiverse-d616.mjs');
const first=main.indexOf('class LegacyMarvelMultiverseItemSheet extends');
const last=main.indexOf('/**\n * Define a set of template paths',first);
assert.ok(first>0&&last>first);
const source=main.slice(first,last);
function sheet({editable=true,type='power',raw='<p><b>HTML</b> safely saved</p>'}={}){
 const item={type,id:'p123',uuid:'Actor.a.Item.p123',name:'Elemental Blast',img:'',isOwner:true,
  _source:{system:{description:raw,effect:'<p>Real effect</p>'}},
  system:{description:raw,effect:'<p>Real effect</p>',toObject(){return {description:this.description,effect:this.effect};}},
  effects:{contents:[]},getRollData(){return {};},
  toObject(){return {system:{description:raw,effect:'<p>Real effect</p>'},flags:{}}}
 };
 class LegacyBase {static get defaultOptions(){return {}}}
 class ModernBase {constructor(){this.item=item;this.isEditable=editable;this.tabGroups={primary:null};} async _prepareContext(){return {}}}
 const win={
  foundry:{appv1:{sheets:{ItemSheet:LegacyBase}},applications:{api:{HandlebarsApplicationMixin:K=>K},sheets:{ItemSheetV2:ModernBase},ux:{TextEditor:{implementation:{async enrichHTML(html){return '<div class="enriched">'+html+'</div>';}}}}},utils:{deepClone:obj=>structuredClone(obj),duplicate:obj=>structuredClone(obj),escapeHTML:s=>s.replace(/</g,'&lt;')}},
  game:{i18n:{localize:s=>s}},CONFIG:{MULTIVERSE_D616:{elements:{},abilities:{}}},
  prepareActiveEffectCategories:()=>({}),console,TextEditor:{},Dialog:class{},ui:{notifications:{}},Item:{},fromUuid:async()=>null
 };
 vm.createContext(win);
 vm.runInContext(`${source}\nglobalThis._sheets=D616ItemSheetsByType`,win);
 return {instance:new win._sheets[type](),item};
}
test('ItemSheetV2 exposes raw HTML and stable Item identity',async()=>{
 const {instance,item}=sheet();
 const ctx=await instance._prepareContext();
 assert.equal(ctx.richTextSource.description,item._source.system.description);
 assert.equal(ctx.richTextSource.effect,item._source.system.effect);
 assert.equal(ctx.item.uuid,'Actor.a.Item.p123');
 assert.equal(ctx.editable,true);
});
test('read-only V2 ItemSheet enriches description and effect without offering an editable control',async()=>{
 const {instance}=sheet({editable:false});
 const ctx=await instance._prepareContext();
 assert.match(ctx.enriched.description,/<div class="enriched"><p><b>HTML<\/b>/);
 assert.match(ctx.enriched.effect,/Real effect/);
 assert.equal(ctx.editable,false);
});
test('all ItemSheetV2 templates have readable stored HTML and visible edit controls',()=>{
 for(const type of ['power','weapon','trait','tag','origin','occupation','item']){
  const hbs=get(`templates/item/item-${type}-sheet.hbs`);
  assert.doesNotMatch(hbs,/{{editor\s/);
  assert.match(hbs,/mm-item-richtext-edit" data-field="description"/);
  assert.match(hbs,/contenteditable="true"/);
  assert.match(hbs,/mm-item-richtext-actions/);
  assert.match(hbs,/mm-item-save-richtext/);
  assert.match(hbs,/mm-item-cancel-richtext/);
  assert.match(hbs,/{{{enriched.description}}}/);
 }
 const power=get('templates/item/item-power-sheet.hbs');
 assert.match(power,/mm-item-richtext-edit" data-field="effect"/);
 assert.match(power,/{{{enriched.effect}}}/);
});
test('Item form CSS has black field captions, editor layering, and visible Effects headers',()=>{
 const css=get('styles/item-sheet-v2.css');
 assert.match(css,/\.mm-styled-label \{color:#151515 !important;\}/);
 assert.match(css,/\.mm-item-richtext-editable/);
 assert.match(css,/z-index:2/);
 assert.match(css,/\.mm-item-header[\s\S]*grid-template-columns:/);
 assert.match(css,/background:#fff2ec;\s*color:#151515/);
});
