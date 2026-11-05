import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const hooks = [];
globalThis.Hooks = { once: (event,callback) => hooks.push([event,callback]), on() {} };
globalThis.window = { addEventListener() {}, innerWidth:1200, innerHeight:800 };
globalThis.CONFIG = { statusEffects: [
  {id:'mmrpg.confused',name:'Confuso',img:'systems/multiverse-d616/icons/m.svg'},
  {id:'mmrpg.concentration.1',name:'Concentração 1'},
]};
const settings = new Map();
const setCalls=[];
globalThis.game = {
 user: { isGM: false }, combat: null,
 settings: { get(ns,key) { return settings.get(key); },
   async set(ns,key,value) { setCalls.push({ns,key,value});settings.set(key,value);return value; },
   register() {} },
};
const {
  favoriteItemKey, hudActorFavorites, withFavoriteFirst,
  hudConditionSnapshot, hudConcentrationSnapshot,
} = await import('../scripts/hud3-presentation.mjs');
const {NativeActionHud} = await import('../scripts/native-action-hud.mjs');
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
const combat = {id:'combat-a',started:true,round:2,turn:0,combatant:{id:'x'}};
const actor = {
 id:'actor-1',uuid:'Actor.actor-1',system:{attributes:{rank:{value:3}}},
 statuses:new Set(['mmrpg.confused','mmrpg.concentration.1']),
 effects: [
  {id:'c1',disabled:false,statuses:new Set(['mmrpg.confused']),
   flags: {'multiverse-d616': {customAutomationCondition: {mode:'turns',count:2,turnStarts:1,combatId:'combat-a',removalNote:'Teste de Logic TN 12'}}}},
  {id:'conc',name:'Telekinetic Grab',disabled:false,statuses:new Set(['mmrpg.concentration-power.telekinetic-grab']),
   flags:{'multiverse-d616':{concentrationPower:{transient:true,statusId:'mmrpg.concentration-power.telekinetic-grab',countsTowardLevel:true}}}},
 ]
};

test('v127 conditions show active native icon, duration and custom removal, omitting concentration bookkeeping',()=>{
 const data=hudConditionSnapshot(actor,combat);
 assert.equal(data.length,1);
 assert.equal(data[0].label,'Confuso');
 assert.equal(data[0].duration,'1 turno do alvo');
 assert.equal(data[0].removal,'Teste de Logic TN 12');
 assert.match(data[0].icon,/m\.svg$/);
 assert.deepEqual(hudConditionSnapshot(null,combat),[]);
});

test('v127 concentration uses existing level and rank cap, not count of power effects',()=>{
 assert.deepEqual(hudConcentrationSnapshot(actor),{used:1,maximum:3,names:['Telekinetic Grab']});
 assert.deepEqual(hudConcentrationSnapshot(null),{used:0,maximum:0,names:[]});
});

test('v127 favorite keys are action-scoped, per-actor and preserve unchanged order for nonfavorites',()=>{
 assert.equal(favoriteItemKey('power','abc'),'power:abc');
 assert.equal(favoriteItemKey('weapon','abc'),'weapon:abc');
 assert.equal(favoriteItemKey('attached-power','shield','p2'),'attached-power:shield:p2');
 assert.equal(favoriteItemKey('condition-recovery','abc'),'');
 const selection={'Actor.actor-1':['power:B','power:B','weapon:W'],'Actor.another':['power:A']};
 assert.deepEqual(hudActorFavorites(selection,actor),['power:B','weapon:W']);
 const powers=[{id:'A',name:'Alpha'},{id:'B',name:'Bravo'},{id:'C',name:'Charlie'}];
 const ordered=withFavoriteFirst(powers,item=>favoriteItemKey('power',item.id),['power:B'],(a,b)=>a.name.localeCompare(b.name));
 assert.deepEqual(ordered.map(x=>x.id),['B','A','C']);
 assert.deepEqual(powers.map(x=>x.id),['A','B','C'],'source data untouched');
});

test('v127 toggling a favorite only changes local client preferences, not actor',async()=>{
 const hud=new NativeActionHud();hud.scheduleRender=()=>{};
 settings.set('nativeActionHudFavorites',{});
 await hud.toggleFavorite(actor,'power:A');
 assert.deepEqual(settings.get('nativeActionHudFavorites')['Actor.actor-1'],['power:A']);
 assert.equal(setCalls.at(-1).key,'nativeActionHudFavorites');
 await hud.toggleFavorite(actor,'power:A');
 assert.deepEqual(settings.get('nativeActionHudFavorites')['Actor.actor-1'],[]);
});

test('v127 updates HUD panels using read-only statuses and keeps both HUD modes',()=>{
 assert.match(source,/this\.updateHud3Status\(root, actor\)/);
 assert.match(source,/this\.updateHud3Status\(this\.root, actor\)/);
 assert.match(source,/mmrpg-native-action-hud__hud3-status is-persistent-status/);
 assert.match(source,/mmrpg-native-action-hud__hud3-status is-classic-status/);
 assert.match(css,/mmrpg-native-action-hud__concentration/);
 assert.match(css,/is-persistent.*__hud3-status\.is-persistent-status/s);
 assert.match(source,/await item\.roll\(\)/);
 assert.equal(manifest.version,'0.2.141');
});
