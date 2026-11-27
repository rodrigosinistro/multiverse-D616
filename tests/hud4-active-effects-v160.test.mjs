import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hudActiveEffectSnapshot} from '../scripts/hud4-active-effects.mjs';

const SYS = 'multiverse-d616';
const actor = () => ({id:'hero',uuid:'Actor.hero',system:{attributes:{rank:{value:4}}},
  effects:[],items:{get(id){return {name:`Item ${id}`,type:'item'};}}});
const combat = () => ({id:'combat1',started:true,round:2,
  flags:{[SYS]:{activeTeamManeuvers:[]}}});
function addTeam(combat,type,level,ids=['Actor.hero'],round=combat.round) {
  combat.flags[SYS].activeTeamManeuvers.push({combatId:combat.id,round,type,level,actorUuids:ids});
}
function effect(id,extra={}) {
  return {id,uuid:`Actor.hero.ActiveEffect.${id}`,name:`Efeito ${id}`,
    duration:{},statuses:new Set(),disabled:false,transfer:false,...extra};
}

test('v160 six offensive/defensive maneuver tiers are represented with authoritative expiry',()=>{
  const hero=actor(),fight=combat();
  for(const type of ['Offensive','Defensive'])for(let level=1;level<=3;level++)addTeam(fight,type,level);
  const icons=hudActiveEffectSnapshot(hero,fight);
  assert.deepEqual(icons.map(x=>x.name),['Edge +1','Ofensiva 2','Marvel → M','RD 2','RD 4','RD 8']);
  assert.ok(icons.every(x=>x.duration==='Até o fim desta rodada'));
  const old=combat();old.round=3;old.flags=fight.flags;
  assert.deepEqual(hudActiveEffectSnapshot(hero,old),[],'stale flags have no HUD effect');
  assert.deepEqual(hudActiveEffectSnapshot(hero,null),[],'outside combat no maneuvers');
  addTeam(fight,'Rally',1);assert.equal(hudActiveEffectSnapshot(hero,fight).length,6,'Rally stays descriptive');
  addTeam(fight,'Offensive',2,['Actor.other']);assert.equal(hudActiveEffectSnapshot(hero,fight).length,6,'other actor does not receive icons');
});

test('v163 no generic Active Effects from actor, powers, traits or equipment produce icons',()=>{
  const hero=actor(),fight=combat();
  hero.effects=[effect('active',{name:'Bônus próprio',duration:{rounds:3,startRound:1}}),
    effect('damage',{flags:{[SYS]:{customAutomationOngoing:{combatId:'combat1',ruleName:'Venom',total:4,ticksDone:2}}}}),
    effect('flames',{flags:{[SYS]:{ongoingPower:{kind:'faltineFlames'}}}})];
  hero.allApplicableEffects=()=>[effect('item',{name:'initiative edge',transfer:true,parent:{type:'trait',name:'Situational Awareness'},duration:{rounds:2}}),
    effect('focus',{name:'Extra Focus',transfer:true,parent:{type:'trait',name:'Battle Ready'}})];
  assert.deepEqual(hudActiveEffectSnapshot(hero,fight),[]);
  assert.deepEqual(hudActiveEffectSnapshot(hero,null),[]);
});

test('v163 Healing Factor and other passive powers never clutter the status tray',()=>{
  const hero=actor();
  assert.deepEqual(hudActiveEffectSnapshot(hero,null).map(e=>e.id),[]);
  assert.deepEqual(hudActiveEffectSnapshot(hero,null,{healingFactor:true}).map(e=>e.name),[]);
  hero.effects=[effect('factor',{name:'Healing Factor'})];
  assert.equal(hudActiveEffectSnapshot(hero,null,{healingFactor:true}).length,0,'native passive factor is also hidden');
});

test('v160 UI is read-only, uses shared classic/persistent panels and all icons remain scrollable',()=>{
  const hud=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
  assert.match(hud,/hudActiveEffectSnapshot\(actor, combat/);
  assert.match(hud,/for \(const status of conditions\)/);
  assert.match(hud,/for \(const effect of activeEffects\)/);
  assert.match(hud,/mmrpg-native-action-hud__hud4-effects/);
  assert.match(hud,/mmrpg-native-action-hud__hud3-status is-classic-status/);
  assert.match(hud,/mmrpg-native-action-hud__hud3-status is-persistent-status/);
  assert.match(css,/__hud4-effects\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css,/__hud4-chip\.is-offensive/);
  assert.match(css,/__hud4-chip\.is-defensive/);
  assert.doesNotMatch(readFileSync(new URL('../scripts/hud4-active-effects.mjs',import.meta.url),'utf8'),/\.update\(|\.setFlag\(|createEmbeddedDocuments\(/);
  const system=JSON.parse(readFileSync(new URL('../system.json',import.meta.url)));
  assert.equal(system.version,'0.2.237');
});
