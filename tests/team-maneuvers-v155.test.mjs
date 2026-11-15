import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Test the HUD status renderer with a compact DOM compatible with both modes.
globalThis.Hooks={on(){},once(){}};
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(){}};
globalThis.canvas={tokens:{controlled:[]}};
globalThis.game={user:{isGM:true},combat:null,settings:{get(){return false},register(){}}};
globalThis.CONFIG={statusEffects:[]};
class Node {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.className='';
    this.classList={toggle(){}};}
  append(...children){this.children.push(...children)}
  appendChild(node){this.children.push(node)}
  replaceChildren(...children){this.children=[...children]}
  setAttribute(key,value){this.attributes[key]=value}
}
globalThis.document={createElement:tag=>new Node(tag)};
const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
const hudSource=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles/team-maneuvers.css',import.meta.url),'utf8');
const hudCSS=readFileSync(new URL('../styles/native-action-hud.css',import.meta.url),'utf8');
const maneuverSource=readFileSync(new URL('../scripts/team-maneuvers.mjs',import.meta.url),'utf8');

function panelFor(actor){
  const panel=new Node('div');
  const root={querySelectorAll:selector=>selector==='.mmrpg-native-action-hud__hud3-status'?[panel]:[]};
  new NativeActionHud().updateHud3Status(root,actor);
  return panel;
}

test('team action is first, immediately before concentration in the shared classic/persistent status strip',()=>{
  const actor={id:'hero',uuid:'Actor.hero',type:'character',system:{attributes:{rank:{value:3}}},statuses:new Set(),effects:[]};
  const panel=panelFor(actor);
  assert.equal(panel.children[0].tagName,'button');
  assert.equal(panel.children[0].dataset.action,'team-maneuver');
  assert.equal(panel.children[0].children.at(-1).textContent,'Equipe');
  assert.match(panel.children[0].attributes['aria-label'],/Manobra de Equipe/);
  assert.equal(panel.children[1].className,'mmrpg-native-action-hud__concentration');
  assert.match(hudCSS,/mmrpg-native-action-hud__team-maneuver\s*\{[^}]*order:\s*-1/s);
  assert.match(hudSource,/mmrpg-native-action-hud__hud3-status is-persistent-status/);
  assert.match(hudSource,/mmrpg-native-action-hud__hud3-status is-classic-status/);
  const powersSection=hudSource.slice(hudSource.indexOf('  renderPowers(body, actor)'),hudSource.indexOf('  renderAttachedPowerButtons(body'));
  assert.doesNotMatch(powersSection,/team-maneuver|is-team-maneuver/,'no Power grid action remains');
});

test('utility button only shows for an owned character, not vehicles, NPCs, or empty selection',()=>{
  const actor={id:'ship',uuid:'Actor.ship',type:'vehicle',system:{attributes:{rank:{value:3}}},statuses:new Set(),effects:[]};
  assert.ok(!panelFor(actor).children.some(node=>node.dataset.action==='team-maneuver'));
  actor.type='npc';
  assert.ok(!panelFor(actor).children.some(node=>node.dataset.action==='team-maneuver'));
  assert.equal(panelFor(null).children.length,0);
  game.user.isGM=false;
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
  actor.type='character';actor.testUserPermission=()=>false;
  assert.ok(!panelFor(actor).children.some(node=>node.dataset.action==='team-maneuver'));
  actor.testUserPermission=()=>true;
  assert.equal(panelFor(actor).children[0].dataset.action,'team-maneuver');
  game.user.isGM=true;
});

test('chat report has guaranteed light background/dark foreground, dialog retains dark styling',()=>{
  assert.match(css,/\.chat-message \.message-content \.d616-team__report\s*\{[^}]*background:\s*#fffaf0;[^}]*color:\s*#1c2430/s);
  assert.match(css,/\.chat-message \.message-content \.d616-team__report :is\(p, li, strong, b\)/);
  assert.match(css,/\.chat-message \.message-content \.d616-team__report h3/);
  assert.match(css,/\.chat-message \.message-content \.d616-team__report \.d616-team__note/);
  assert.match(css,/\.d616-team__report\s*\{color:#e6ebf2/,'dark dialog style stays intact');
  assert.match(maneuverSource,/content:reportHTML\(plan,\{isProposal:true,round:combat.round\}\)/);
  assert.match(maneuverSource,/Focus descontado/);
});

test('release metadata advanced without changing README or base catalog',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,'0.2.178');
  assert.match(manifest.download,/v0\.2\.178/);
  assert.match(readFileSync(new URL('../CHANGELOG.md',import.meta.url),'utf8'),/^## v0\.2\.178/);
  assert.match(readFileSync(new URL('../README.md',import.meta.url),'utf8'),/Multiverse-D616/);
});
