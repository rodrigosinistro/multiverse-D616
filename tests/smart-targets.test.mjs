import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SMART_TARGET_MODES,filterValidTargetIds,shouldPromptForTargets,
 chooseSmartTargets,registerSmartTargetSettings,migrateSmartTargetSettings} from '../scripts/smart-targets.mjs';
const actor={uuid:'Actor.hero',name:'Hero'};
const item={type:'power',name:'Elemental Blast',actor};
function setup({mode='confirm',marked=[],response='marked',migrated=false}={}){
 const t1={id:'t1',name:'Sentinela',hidden:false,parent:{id:'scene'}};
 const t2={id:'t2',name:'Hydra',hidden:false,parent:{id:'scene'}};
 const scene={id:'scene',tokens:new Map([['t1',t1],['t2',t2]])};
 const token=id=>({document:scene.tokens.get(id)});
 let selected=marked.slice(),updates=0,dialogCalls=0,dialogData=null;
 let store={smartTargetMode:mode,smartTargetV022ManualDefault:migrated};
 globalThis.game={user:{id:'u1',isGM:false,get targets(){return new Set(selected.map(token));},
  updateTokenTargets(ids){updates++;selected=ids.slice();}},settings:{get:(_system,k)=>store[k],async set(_system,k,v){store[k]=v;},register(){} }};
 globalThis.canvas={scene};
 globalThis.foundry={applications:{api:{DialogV2:{wait:async(data)=>{
   dialogCalls++;dialogData=data;
   const button=data.buttons.find(b=>b.action===response);
   return button ? button.callback({}, {form:{elements:{}}}, {}) : null;
 }}}}};
 return {scene,get selected(){return selected;},get updates(){return updates;},get dialogCalls(){return dialogCalls;},
   get dialogData(){return dialogData;},get store(){return store;}};
}
test('configuração padrão manual, apenas dois modos, sem histórico de alvos',()=>{
 const names=[];globalThis.game={settings:{register:(_id,key,data)=>names.push([key,data])}};
 registerSmartTargetSettings();
 assert.deepEqual(SMART_TARGET_MODES,['manual','confirm']);
 assert.deepEqual(names.map(([k,v])=>[k,v.scope,v.default]),[
  ['smartTargetMode','client','manual'],['smartTargetV022ManualDefault','client',false]
 ]);
 assert.deepEqual(Object.keys(names[0][1].choices),['manual','confirm']);
 assert.equal(names[0][1].choices.manual,'Seleção manual do Foundry');
 assert.ok(!names.some(([name])=>name==='smartTargetHistory'));
});
test('migração muda antigos confirm/auto uma única vez para manual',async()=>{
 const c=setup({mode:'confirm'});
 assert.equal(await migrateSmartTargetSettings(),true);
 assert.equal(c.store.smartTargetMode,'manual');
 assert.equal(c.store.smartTargetV022ManualDefault,true);
 c.store.smartTargetMode='confirm';
 assert.equal(await migrateSmartTargetSettings(),false);
 assert.equal(c.store.smartTargetMode,'confirm');
 const a=setup({mode:'auto'});
 assert.equal(await migrateSmartTargetSettings(),true);
 assert.equal(a.store.smartTargetMode,'manual');
});
test('validação local de tokens evita IDs apagados, escondidos ou duplicados',()=>{
 const e=setup();assert.deepEqual(filterValidTargetIds(['bad','t1','t1'],e.scene),['t1']);
 e.scene.tokens.get('t1').hidden=true;
 assert.deepEqual(filterValidTargetIds(['t1'],e.scene),[]);
});
test('alvos exigidos por poderes/armas, mas não por poderes pessoais',()=>{
 assert.equal(shouldPromptForTargets({type:'power',name:'Grow 3'},{canRoll:false}),false);
 assert.equal(shouldPromptForTargets(item,{checkOnly:true,attackTarget:'mle'}),true);
 assert.equal(shouldPromptForTargets({type:'power',name:'Resize Other'},{canRoll:false}),true);
 assert.equal(shouldPromptForTargets({type:'weapon'},{canRoll:true}),true);
 assert.equal(shouldPromptForTargets({type:'power',name:'Cure-All'},{targetNumber:12}),false);
});
test('seleção manual não abre janela nem altera alvos, incluindo auto legado',async()=>{
 const m=setup({mode:'manual',marked:['t2']});assert.equal(await chooseSmartTargets(item),true);
 assert.deepEqual(m.selected,['t2']);assert.equal(m.updates,0);assert.equal(m.dialogCalls,0);
 const legacy=setup({mode:'auto',marked:['t2']});assert.equal(await chooseSmartTargets(item),true);
 assert.deepEqual(legacy.selected,['t2']);assert.equal(legacy.updates,0);assert.equal(legacy.dialogCalls,0);
});
test('janela usa tema D616 e não oferece último alvo em opção, texto ou botão',async()=>{
 const e=setup({mode:'confirm',marked:['t2'],response:'marked'});
 assert.equal(await chooseSmartTargets(item),true);
 assert.deepEqual(e.selected,['t2']);assert.equal(e.updates,1);
 const data=e.dialogData;
 assert.deepEqual(data.buttons.map(b=>b.action),['marked','new','none','cancel']);
 assert.doesNotMatch(data.content,/último alvo|last target/i);
 assert.match(data.content,/Alvos marcados no Foundry/);
 assert.match(data.content,/Hydra/);
 assert.ok(data.classes.includes('m616-smart-target-dialog'));
 assert.ok(data.classes.includes('m616-dialog-v14'));
});
test('sem alvo marcado não oferece botão de alvos anteriores',async()=>{
 const e=setup({marked:[],response:'none'});
 assert.equal(await chooseSmartTargets(item),true);
 assert.deepEqual(e.selected,[]);
 assert.deepEqual(e.dialogData.buttons.map(b=>b.action),['new','none','cancel']);
});
test('cancelamento não altera a seleção; ação sem alvo remove marcações só após confirmação',async()=>{
 const c=setup({response:'cancel',marked:['t2']});assert.equal(await chooseSmartTargets(item),false);
 assert.deepEqual(c.selected,['t2']);assert.equal(c.updates,0);
 const n=setup({response:'none',marked:['t2']});assert.equal(await chooseSmartTargets(item),true);
 assert.deepEqual(n.selected,[]);assert.equal(n.updates,1);
});
test('seletor fica antes do gasto de Focus e CSS foi registrado no manifesto',()=>{
 const base=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.ok(base.indexOf('await chooseSmartTargets(this)')<base.indexOf('await mmPreSpendFocusForPowerUse(this.actor'));
 assert.match(base,/void migrateSmartTargetSettings\(\)/);
 const code=readFileSync(new URL('../scripts/smart-targets.mjs',import.meta.url),'utf8');
 assert.match(code,/document\.addEventListener\('pointerdown',onDown,true\)/);
 assert.match(code,/document\.removeEventListener\('pointerdown',onDown,true\)/);
 assert.doesNotMatch(code,/smartTargetHistory|options\.last|type==='last'/);
 const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
 assert.equal(manifest.version,'0.2.84');
 assert.ok(manifest.styles.includes('styles/smart-targets.css'));
 assert.ok(manifest.styles.includes('styles/dialog-v14.css'));
 const css=readFileSync(new URL('../styles/smart-targets.css',import.meta.url),'utf8');
 assert.match(css,/\.m616-smart-target-dialog \.window-header/);
 assert.match(css,/\.m616-smart-target-dialog \.window-content/);
 assert.match(css,/\.m616-smart-target-picker/);
});
class FakeNode{
 constructor(){this.handlers=new Map();this.style={};this.children=[];this.isRemoved=false;}
 addEventListener(name,fn){this.handlers.set(name,[...(this.handlers.get(name)??[]),fn]);}
 removeEventListener(name,fn){this.handlers.set(name,(this.handlers.get(name)??[]).filter(x=>x!==fn));}
 emit(name,event){for(const handler of this.handlers.get(name)??[])handler(event);}
 append(...nodes){this.children.push(...nodes);}
 remove(){this.isRemoved=true;}
 contains(){return false;}
 getBoundingClientRect(){return {left:0,top:0,width:400,height:400};}
}
test('seleção por clique no mapa suporta múltiplos tokens e limpa listeners',async()=>{
 const {pickTokensOnMap}=await import('../scripts/smart-targets.mjs');
 const view=new FakeNode(),documentHub=new FakeNode(),windowHub=new FakeNode();
 const t1={id:'t1',name:'Sentinela',parent:{id:'scene'},x:0,y:0,width:1,height:1},
       t2={id:'t2',name:'Hydra',parent:{id:'scene'},x:100,y:0,width:1,height:1};
 const scene={id:'scene',grid:{size:100},tokens:new Map([['t1',t1],['t2',t2]])};
 globalThis.game={user:{id:'u1',isGM:false}};
 globalThis.canvas={ready:true,scene,grid:{size:100},app:{view,renderer:{screen:{width:400,height:400}}},
  stage:{toLocal:p=>p},tokens:{placeables:[{document:t1,visible:true},{document:t2,visible:true}]}};
 documentHub.createElement=()=>new FakeNode();documentHub.body=new FakeNode();
 globalThis.document=documentHub;globalThis.window=windowHub;
 const hooks=new Map();globalThis.Hooks={on:(n,fn)=>{hooks.set(n,fn);return 1;},off:(n)=>hooks.delete(n)};
 const run=pickTokensOnMap(scene,[]);
 const event=(x,y)=>({button:0,pointerId:3,clientX:x,clientY:y,target:view,composedPath:()=>[view],
  preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 for(const xy of [[40,40],[150,40]]){
   const down=event(...xy),up=event(...xy);
   documentHub.emit('pointerdown',down);documentHub.emit('pointerup',up);
   assert.equal(down.prevented,true);assert.equal(down.stopped,true);
 }
 windowHub.emit('keydown',{key:'Enter',preventDefault(){}});
 assert.deepEqual(await run,['t1','t2']);
 assert.equal(documentHub.handlers.get('pointerdown').length,0);
 assert.equal(documentHub.body.children[0].isRemoved,true);
 assert.equal(hooks.size,0);
 delete globalThis.document;delete globalThis.window;delete globalThis.Hooks;
});
