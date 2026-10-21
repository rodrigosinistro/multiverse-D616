import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Hooks={on(){},once(){}};
globalThis.window={addEventListener(){}};
globalThis.game={user:{id:'gm',isGM:true},i18n:{localize:k=>k},settings:{get(){return true}}};
const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
const SYSTEM='multiverse-d616';
const mkEl=tag=>({tag,dataset:{},className:'',style:{},children:[],disabled:false,
  append(...children){this.children.push(...children)},appendChild(child){this.children.push(child)},
  classList:{add(){},remove(){}},removeAttribute(){}});
const renderButtons=(hud,actor)=>{
  globalThis.document={createElement:mkEl};
  const body={classList:{add(){},remove(){}},children:[],appendChild(x){this.children.push(x)}};
  hud.renderPowers(body,actor);
  return body.children.filter(c=>c?.dataset?.action);
};
// Simulate a real closest() CSS-match rather than blindly returning a button.
// This catches cases where a button is rendered, but omitted from the HUD's
// delegated click selector (regression seen in 0.2.62).
const click=async(hud,button)=>hud.onClick({target:{closest(selector){
  const types=[...selector.matchAll(/\[data-action='([^']+)'\]/g)].map(m=>m[1]);
  return types.includes(button.dataset.action)?button:null;
}}});
function makeActor({burning=true,heal=false}={}){
  const effects=[];
  if(burning)effects.push({id:'fx-flame',name:'Chamas de Faltine',disabled:false,
    flags:{[SYSTEM]:{ongoingPower:{kind:'faltineFlames'}}},
    async update(change){this.disabled=change.disabled;}});
  const items=heal?[{id:'healing-factor',name:'Healing Factor',type:'power',system:{duration:'Permanent'}}]:[];
  return {id:'actor',uuid:'Actor.actor',name:'Herói',items,effects,
    system:{health:{value:20,max:40},abilities:{res:{value:4}}},
    testUserPermission(){return true},async update(change){this.system.health.value=change['system.health.value']}};
}
function world(actor,{inCombat=true,actionUsed=0}={}){
  const gameUser={id:'gm',isGM:true};const combatant={id:'c1',actor,tokenId:'t1'};
  let consumeCount=0;const messages=[];const notices=[];
  globalThis.game={user:gameUser,combat:inCombat?{started:true,combatant,combatants:[combatant]}:{started:false},
    multiverseD616:{turnTracker:{getState(){return {actionUsed,actionMax:1}},async consumeAction(){consumeCount++;return true;}}},
    i18n:{localize:k=>k},settings:{get(){return true}}};
  globalThis.canvas={tokens:{controlled:[{actor,document:{id:'t1'}}]}};
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),async create(value){messages.push(value);return value}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
  globalThis.foundry={utils:{escapeHTML:s=>s}};
  globalThis.ui={notifications:{warn:s=>notices.push(s),error:s=>notices.push(s)}};
  return {messages,notices,consumes:()=>consumeCount};
}
test('POWERS renders and dispatches Apagar: Chamas de Faltine in the owner turn',async()=>{
  const actor=makeActor();const w=world(actor);const hud=new NativeActionHud();
  const button=renderButtons(hud,actor).find(b=>b.dataset.action==='extinguish-faltine');
  assert.ok(button,'the action must be shown for a burning token');
  await click(hud,button);
  assert.equal(actor.effects[0].disabled,true,'the ongoing condition must be removed');
  assert.equal(w.consumes(),1,'one Standard Action is consumed');
  assert.equal(w.messages.length,1);
  assert.match(w.messages[0].content,/apagou as Chamas de Faltine/);
});
test('Apagar does not extinguish or spend an action if the actor already used theirs',async()=>{
  const actor=makeActor();const w=world(actor,{actionUsed:1});const hud=new NativeActionHud();
  const button=renderButtons(hud,actor).find(b=>b.dataset.action==='extinguish-faltine');
  await click(hud,button);
  assert.equal(actor.effects[0].disabled,false);
  assert.equal(w.consumes(),0);
  assert.equal(w.messages.length,0);
  assert.match(w.notices[0],/Não há Ação Padrão/);
});
test('POWERS dispatches Healing Factor: recuperar outside combat and caps Health',async()=>{
  const actor=makeActor({burning:false,heal:true});const w=world(actor,{inCombat:false});
  actor.system.health.value=38;const hud=new NativeActionHud();
  const button=renderButtons(hud,actor).find(b=>b.dataset.action==='healing-factor-outside');
  assert.ok(button,'Healing Factor shortcut must be shown out of combat');
  await click(hud,button);
  assert.equal(actor.system.health.value,40);
  assert.equal(w.consumes(),0,'narrative turn needs no combat action');
  assert.equal(w.messages.length,1);
});
