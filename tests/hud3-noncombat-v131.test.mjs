import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

globalThis.Hooks={on(){},once(){}};
globalThis.window={addEventListener(){},innerWidth:1200,innerHeight:900};
globalThis.document={createElement:tag=>new Node(tag)};
globalThis.canvas={tokens:{controlled:[]}};
globalThis.game={combat:null,user:{isGM:true,id:'gm',targets:{size:1}},settings:{get(){return null},register(){}},i18n:{localize:key=>key}};
globalThis.ChatMessage={getSpeaker:()=>({alias:'Darkstep'})};
globalThis.CONFIG={Dice:{}};
globalThis.ui={notifications:{warn(){throw new Error('Unexpected denied roll')}}};

class Node {
 constructor(tag='div'){this.tag=tag;this.textContent='';this.children=[];this.dataset={};this.style={width:''};this.className='';this.title='';this.attrs={};this.disabled=false;this.classList={add(){},remove(){}};}
 append(...nodes){this.children.push(...nodes)}
 appendChild(node){this.children.push(node)}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(key,value){this.attrs[key]=value}
 querySelector(selector){return null}
}
const {NativeActionHud,abilityHudMode,abilityHudValue,abilityHudText,rollAbility}=await import('../scripts/native-action-hud.mjs');
const version=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
const abilities={mle:{label:'Melee',value:0,noncom:3},agl:{label:'Agility',value:6,noncom:9},res:{label:'Resilience',value:3,noncom:3},vig:{label:'Vigilance',value:2,noncom:2},ego:{label:'Ego',value:0,noncom:0},log:{label:'Logic',value:1,noncom:4}};
const actor={id:'dark',uuid:'Actor.dark',name:'Darkstep',system:{abilities,attributes:{rank:{value:3}},health:{value:90,max:90},focus:{value:60,max:60},karma:{value:2}},getRollData(){return {abilities}},testUserPermission(){return true},items:[]};

function quickButtons(hud){
 const quick=new Node('div');
 const faux={querySelector(selector){
   if(selector==='.mmrpg-native-action-hud__profile')return profile;
   return null;
 }};
 const portrait=new Node('img'),name=new Node('strong'),rank=new Node('span'),karma=new Node('span');
 const parts={
 '.mmrpg-native-action-hud__portrait img':portrait,
 '.mmrpg-native-action-hud__profile-name':name,
 '.mmrpg-native-action-hud__profile-rank':rank,
 '.mmrpg-native-action-hud__profile-karma':karma,
 '.mmrpg-native-action-hud__quick-abilities':quick,
 '.mmrpg-native-action-hud__resource.health':{querySelector:s=>s==='b'?new Node('b'):{style:{width:''}}},
 '.mmrpg-native-action-hud__resource.focus':{querySelector:s=>s==='b'?new Node('b'):{style:{width:''}}},
 };
 const profile={querySelector:s=>parts[s]};
 hud.updatePortraitTurnResources=()=>{};
 hud.updatePersistentProfile(faux,actor);
 return quick.children;
}

test('v131 HUD uses derived non-combat values when a round is not running',()=>{
 game.combat=null;
 assert.equal(abilityHudMode(),'noncom');
 assert.equal(abilityHudText(actor,'agl'),'+9');
 assert.equal(abilityHudValue(actor,'mle'),3);
 const hud=new NativeActionHud();
 let chips=quickButtons(hud);
 assert.equal(chips.length,6);
 assert.equal(chips[1].children[1].textContent,'+9');
 assert.match(chips[1].title,/Non-Combat Check: \+9/);
 const body=new Node('div');hud.renderAbilities(body,actor);
 assert.equal(body.children[1].children[1].textContent,'+9');
 assert.equal(body.children[5].children[1].textContent,'+4');
});

test('v131 entering combat switches values; leaving restores non-combat values',()=>{
 const hud=new NativeActionHud();
 game.combat={started:true,round:1};
 assert.equal(abilityHudMode(),'combat');
 assert.equal(abilityHudText(actor,'agl'),'+6');
 assert.equal(quickButtons(hud)[1].children[1].textContent,'+6');
 const signature1=hud.signature(actor,'powers',false);
 game.combat=null;
 const signature2=hud.signature(actor,'powers',false);
 assert.notEqual(signature1,signature2,'render signature must refresh when combat changes');
 assert.equal(quickButtons(hud)[1].children[1].textContent,'+9');
});

test('v131 button roll formula matches the displayed modifier in both modes',async()=>{
 class FakeRoll { constructor(formula,data,options){this.formula=formula;this.options=options;FakeRoll.calls.push(this)} async toMessage(){return {}} }
 FakeRoll.calls=[]; CONFIG.Dice.MarvelMultiverseRoll=FakeRoll;
 game.combat=null;
 await rollAbility(actor,'agl');
 await rollAbility(actor,'mle');
 assert.match(FakeRoll.calls[0].formula,/@abilities\.agl\.noncom$/);
 assert.match(FakeRoll.calls[1].formula,/@abilities\.mle\.noncom$/);
 game.combat={started:true,round:1};
 await rollAbility(actor,'agl');
 assert.match(FakeRoll.calls[2].formula,/@abilities\.agl\.value$/);
});

test('v131 preserves current native ability scores for missing legacy noncom values',()=>{
 game.combat=null;
 assert.equal(abilityHudText({system:{abilities:{mle:{value:2}}}},'mle'),'+2');
 assert.equal(abilityHudText({system:{abilities:{}}},'mle'),'—');
 assert.equal(version.version,'0.2.153');
});
