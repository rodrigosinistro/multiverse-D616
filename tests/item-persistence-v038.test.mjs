import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const main = fs.readFileSync(new URL('multiverse-d616.mjs', base),'utf8');
const start = main.indexOf('class LegacyMarvelMultiverseItemSheet extends');
const end = main.indexOf('/**\n * Define a set of template paths',start);
assert.ok(start > 0 && end > start);
const code=main.slice(start,end);

function createSheet(){
 const updates=[];
 const system={element:'fire', description:'<p>Descrição original</p>', effect:'<p>Efeito original</p>', attackRange:10, powerCheck:false};
 const item={id:'xyz', uuid:'Actor.hero.Item.xyz', type:'power', name:'Blast', isOwner:true, img:'', system,
  _source:{system:{...system}}, getRollData(){return{};}, effects:[],
  toObject(){return{system:{...system},flags:{}};},
  async update(patch){
   updates.push(structuredClone(patch));
   for(const [key,value] of Object.entries(patch)){
    if(key.startsWith('system.')) {const field=key.slice(7);system[field]=value;this._source.system[field]=value;}
    else this[key]=value;
   }
   return this;
  }
 };
 class LegacyItemSheet {static get defaultOptions(){return{}}}
 class V2ItemSheet {constructor(){this.item=item;this.tabGroups={primary:null};this.isEditable=true;} async _prepareContext(){return {source:{system:{...system}}};} async _onRender(){} async _preClose(){} }
 const win={
  foundry:{appv1:{sheets:{ItemSheet:LegacyItemSheet}},applications:{api:{HandlebarsApplicationMixin:C=>C},sheets:{ItemSheetV2:V2ItemSheet},ux:{TextEditor:{implementation:{async enrichHTML(html){return html;}}}}},utils:{deepClone:structuredClone,duplicate:structuredClone,escapeHTML:s=>s}},
  game:{i18n:{localize:s=>s}},CONFIG:{MULTIVERSE_D616:{elements:{fire:{label:'Fire'},ice:{label:'Ice'}},abilities:{}}},
  prepareActiveEffectCategories:()=>({}),console,TextEditor:{},ui:{notifications:{}},Item:{},Dialog:class{},fromUuid:async()=>null
 };
 vm.createContext(win);
 vm.runInContext(`${code}\nglobalThis.sheetRegistry=D616ItemSheetsByType`,win);
 return {sheet:new win.sheetRegistry.power(), item, system, updates};
}

test('changing Element saves only system.element and preserves Description and Effect',async()=>{
 const {sheet,system,updates}=createSheet();
 await sheet._d616SaveSimpleField({currentTarget:{name:'system.element',type:'select-one',value:'ice',dataset:{}}});
 assert.equal(system.element,'ice');
 assert.equal(system.description,'<p>Descrição original</p>');
 assert.equal(system.effect,'<p>Efeito original</p>');
 assert.deepEqual(updates,[{'system.element':'ice'}]);
});


function panel(field, initialHTML='<p>Original</p>') {
 const preview={innerHTML:initialHTML};
 const content={innerHTML:'',focus(){this.focused=true;}};
 const edit={hidden:true};
 const button={setAttribute(k,v){this[k]=v;}};
 const elements={
   '.mm-item-richtext-readonly':preview,
   '.mm-item-richtext-editable':content,
   '.mm-item-richtext-editor':edit,
   '.mm-item-richtext-edit':button
 };
 return {dataset:{field},querySelector(selector){return elements[selector];},preview,content,edit,button};
}

test('description editing is visible, editable and saved without overwriting Effect or Element',async()=>{
 const {sheet,system,updates}=createSheet();
 const itemPanel=panel('description','<p>Descrição original</p>');
 sheet._d616OpenRichText(itemPanel);
 assert.equal(itemPanel.edit.hidden,false);
 assert.equal(itemPanel.content.innerHTML,'<p>Descrição original</p>');
 assert.equal(itemPanel.button['aria-expanded'],'true');
 itemPanel.content.innerHTML='<p>Alteração <strong>nova</strong></p>';
 await sheet._d616SaveRichTextPanel(itemPanel);
 assert.equal(system.description,'<p>Alteração <strong>nova</strong></p>');
 assert.equal(system.effect,'<p>Efeito original</p>');
 assert.equal(system.element,'fire');
 assert.equal(itemPanel.edit.hidden,true);
 assert.deepEqual(updates,[{'system.description':system.description}]);
});

test('saving Effect touches only its own system field',async()=>{
 const {sheet,system,updates}=createSheet();
 const itemPanel=panel('effect','<p>Efeito original</p>');
 sheet._d616OpenRichText(itemPanel);
 itemPanel.content.innerHTML='<p><b>Novo efeito</b></p>';
 await sheet._d616SaveRichTextPanel(itemPanel);
 assert.equal(system.effect,'<p><b>Novo efeito</b></p>');
 assert.equal(system.description,'<p>Descrição original</p>');
 assert.deepEqual(updates,[{'system.effect':system.effect}]);
});

test('cancel editor does not update the Item',async()=>{
 const {sheet,system,updates}=createSheet();
 const itemPanel=panel('description','<p>Descrição original</p>');
 sheet._d616OpenRichText(itemPanel);
 itemPanel.content.innerHTML='<p>Descartar</p>';
 sheet._d616CancelRichText(itemPanel);
 assert.equal(itemPanel.edit.hidden,true);
 assert.equal(system.description,'<p>Descrição original</p>');
 assert.equal(updates.length,0);
});

test('closing an open inline editor saves pending content independently',async()=>{
 const {sheet,system,updates}=createSheet();
 const itemPanel=panel('effect','<p>Efeito original</p>');
 sheet._d616OpenRichText(itemPanel);
 itemPanel.content.innerHTML='<p>Ao fechar</p>';
 sheet.element={querySelectorAll:()=>[itemPanel]};
 await sheet._preClose({});
 assert.equal(system.effect,'<p>Ao fechar</p>');
 assert.equal(system.element,'fire');
 assert.deepEqual(updates,[{'system.effect':'<p>Ao fechar</p>'}]);
});

test('form is not submitted wholesale and edit buttons are bound explicitly',()=>{
 assert.match(main,/form:\s*\{submitOnChange:false,closeOnSubmit:false\}/);
 assert.match(main,/control.addEventListener\('change',event=>this\._d616SaveSimpleField\(event\)\)/);
 assert.match(main,/root.querySelectorAll\('\.mm-item-richtext-edit'\)/);
 assert.match(main,/root.querySelectorAll\('\.mm-item-save-richtext'\)/);
 assert.match(main,/root.querySelectorAll\('\.mm-item-cancel-richtext'\)/);
});

test('every Item template exposes an actual Edit button and uses a visible contenteditable editor',()=>{
 for(const type of ['power','weapon','trait','tag','origin','occupation','item']){
  const h=fs.readFileSync(new URL(`templates/item/item-${type}-sheet.hbs`,base),'utf8');
  assert.match(h,/mm-item-richtext-edit" data-field="description"/);
  assert.match(h,/contenteditable="true"/);
  assert.match(h,/mm-item-save-richtext/);
  assert.match(h,/mm-item-cancel-richtext/);
  assert.match(h,/\{\{\{enriched\.description\}\}\}/);
  assert.doesNotMatch(h,/<prose-mirror/);
 }
 const power=fs.readFileSync(new URL('templates/item/item-power-sheet.hbs',base),'utf8');
 assert.match(power,/mm-item-richtext-edit" data-field="effect"/);
 assert.match(power,/\{\{\{enriched\.effect\}\}\}/);
 const css=fs.readFileSync(new URL('styles/item-sheet-v2.css',base),'utf8');
 assert.match(css,/\.mm-item-richtext-actions/);
 assert.match(css,/\.mm-item-richtext-editor\[hidden\]/);
 assert.match(css,/\.mm-item \.effect-name span/);
});
