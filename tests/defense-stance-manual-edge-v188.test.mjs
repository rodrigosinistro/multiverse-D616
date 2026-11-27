import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defenseStanceEffects,hasDefenseStanceConcentration,hasActualHealthLoss,
  endDefenseStanceOnHealthLoss,registerDefenseStanceDamageHooks} from '../scripts/native-power-martial-stances.mjs';
import {resolveConditionEdges,resolveConditionReroll} from '../scripts/condition-edge.mjs';
const NS='multiverse-d616';
function actor({health=60,defense=true}={}) {
 const d={id:'defense',type:'power',name:'Defense Stance',system:{powerSet:'Martial Arts'}};
 const other={id:'anger',type:'power',name:'Anger',system:{powerSet:'Basic'}};
 const items=[d,other];
 const make=id=>({id,disabled:false,
  flags:{[NS]:{concentrationPower:{transient:true,itemId:id}}}});
 const effects=[...(defense?[make('defense')]:[]),make('anger')];
 const a={id:'a',uuid:'Actor.A',system:{health:{value:health}},
  items:{contents:items,get:id=>items.find(i=>i.id===id)},effects,
  deleted:[],async deleteEmbeddedDocuments(type,ids){
   assert.equal(type,'ActiveEffect');this.deleted.push(...ids);
   this.effects=this.effects.filter(e=>!ids.includes(e.id));
   return ids;
  }};
 return a;
}
test('v188: only actual Health reduction removes Defense Stance and preserves other Concentrations',async()=>{
 const a=actor();
 assert.equal(hasDefenseStanceConcentration(a),true);
 for(const [before,after] of [[60,60],[60,61],[60,NaN],[undefined,50],[60,null]]){
  assert.equal(hasActualHealthLoss(before,after),false);
  assert.equal(await endDefenseStanceOnHealthLoss(a,before,after),false);
 }
 assert.equal(a.deleted.length,0);
 assert.equal(hasActualHealthLoss(60,59),true);
 assert.equal(await endDefenseStanceOnHealthLoss(a,60,59),true);
 assert.deepEqual(a.deleted,['defense']);
 assert.equal(hasDefenseStanceConcentration(a),false);
 assert.deepEqual(a.effects.map(e=>e.id),['anger']);
 assert.equal(await endDefenseStanceOnHealthLoss(a,59,30),false);
});
test('v188: disabled / forged / unrelated concentration never gets deleted',async()=>{
 const a=actor();
 a.effects[0].disabled=true;
 assert.equal(defenseStanceEffects(a).length,0);
 assert.equal(await endDefenseStanceOnHealthLoss(a,40,39),false);
 a.effects[0].disabled=false;
 a.items.contents[0].system.powerSet='Magic';
 assert.equal(defenseStanceEffects(a).length,0);
 assert.equal(await endDefenseStanceOnHealthLoss(a,40,39),false);
});
test('v188: authorized GM observes remote player Health damage; Focus-only and heal do nothing',async()=>{
 const a=actor();
 const listeners={};
 globalThis.Hooks={on:(name,handler)=>{(listeners[name]??=[]).push(handler)}};
 globalThis.game={actors:[a],user:{id:'GM',isGM:true},users:{activeGM:{id:'GM'}}};
 globalThis.canvas={tokens:{placeables:[]}};
 registerDefenseStanceDamageHooks();
 const fire=(name,...args)=>{for(const h of listeners[name]??[])h(...args);};
 a.system.health.value=40;
 fire('updateActor',a,{'system.focus.value':12},{},'PLAYER');
 assert.equal(a.deleted.length,0);
 fire('updateActor',a,{'system.health.value':40},{},'PLAYER');
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(a.deleted,['defense']);
 assert.deepEqual(a.effects.map(e=>e.id),['anger']);
 const b=actor({defense:true});b.uuid='Actor.B';
 fire('createActor',b);
 b.system.health.value=65;
 fire('updateActor',b,{'system.health.value':65},{},'PLAYER');
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(b.deleted,[]);
});
test('v188: unauthorized player client does not delete Concentration while GM connected',async()=>{
 const a=actor(); const listeners={};
 globalThis.Hooks={on:(name,handler)=>{(listeners[name]??=[]).push(handler)}};
 globalThis.game={actors:[a],user:{id:'PLAYER',isGM:false},users:{activeGM:{id:'GM'}}};
 globalThis.canvas={tokens:{placeables:[]}};
 registerDefenseStanceDamageHooks();
 a.system.health.value=25;
 for(const h of listeners.updateActor??[])h(a,{'system.health.value':25},{},'PLAYER');
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(a.deleted,[]);
});
test('v188: unlinked token delta Health loss is checked with its own actor snapshot',async()=>{
 const a=actor();a.uuid='Scene.X.Token.Y.Actor';
 const token={actor:a};
 const listeners={};
 globalThis.Hooks={on:(name,handler)=>{(listeners[name]??=[]).push(handler)}};
 globalThis.game={actors:[],user:{id:'GM',isGM:true},users:{activeGM:{id:'GM'}}};
 globalThis.canvas={tokens:{placeables:[token]}};
 registerDefenseStanceDamageHooks();
 a.system.health.value=44;
 for(const h of listeners.updateToken??[])h(token,{delta:{system:{health:{value:44}}}},{},'PLAYER');
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(a.deleted,['defense']);
 assert.deepEqual(a.effects.map(e=>e.id),['anger']);
});
test('v188: net condition Edge and Trouble are reported but never automatically rerolled',async()=>{
 const make=(...statuses)=>({statuses:new Set(statuses.map(s=>'mmrpg.'+s)),effects:[]});
 const edge=resolveConditionEdges({actor:make(),targetActors:[make('prone')],attack:true,ability:'mle',kind:'close',targeted:true});
 const trouble=resolveConditionEdges({actor:make('demoralized'),ability:'ego'});
 assert.equal(edge.net,1);assert.equal(edge.edgeMode,1);assert.equal(edge.autoCount,0);
 assert.equal(trouble.net,-1);assert.equal(trouble.edgeMode,-1);assert.equal(trouble.autoCount,0);
 let clicks=0;
 const msg={id:'attack',rolls:[],_handleChatButton(){clicks++;}};
 await resolveConditionReroll(msg,{autoCount:1,edgeMode:-1});
 await resolveConditionReroll(msg,{autoCount:1,edgeMode:1});
 assert.equal(clicks,0);
 const text=readFileSync(new URL('../scripts/condition-edge.mjs',import.meta.url),'utf8');
 assert.match(text,/Clique em EDGE ou TROUBLE/);
 assert.match(text,/registerDefenseStanceDamageHooks\(\)/);
 const css=readFileSync(new URL('../css/multiverse-d616.css',import.meta.url),'utf8');
 assert.match(css,/\.d616-condition-edge__net/);
 assert.match(css,/text-align:\s*center/);
});
