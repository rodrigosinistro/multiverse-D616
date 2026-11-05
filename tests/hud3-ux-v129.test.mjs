import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
globalThis.Hooks = {on(){},once(){}};
globalThis.window = {innerWidth:1200,innerHeight:800,addEventListener(){}};
globalThis.game = {user:{isGM:true},settings:{get(){return false},register(){}},combat:null};
globalThis.canvas = {tokens:{controlled:[]}};
const {hudMovementSnapshot} = await import('../scripts/hud3-presentation.mjs');
const {NativeActionHud} = await import('../scripts/native-action-hud.mjs');
const css = readFileSync(new URL('../styles/native-action-hud.css', import.meta.url),'utf8');
const source = readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
const manifest = JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));

test('v129: native Foundry blink selection renders Teleport icon and tooltip without modifying the token',()=>{
  const actor={id:'p1',uuid:'Actor.p1'};
  const token={id:'t1',actor,document:{id:'t1',movementAction:'blink'}};
  const actions={
    walk:{icon:'fa-solid fa-person-walking',label:'Caminhada'},
    fly:{icon:'fa-solid fa-feather',label:'Voo'},
    blink:{icon:'fa-solid fa-person-rays',label:'Teleporte (Piscar)',teleport:true},
  };
  assert.deepEqual(hudMovementSnapshot(actor,token,null,actions),{label:'Teleporte (Piscar)',icon:'fa-solid fa-person-rays'});
  assert.equal(token.document.movementAction,'blink');
  token.document.movementAction='walk';
  assert.equal(hudMovementSnapshot(actor,token,null,actions).icon,actions.walk.icon);
  token.document.movementAction='fly';
  assert.equal(hudMovementSnapshot(actor,token,null,actions).icon,actions.fly.icon);
  // Existing special teleport power grant is honored separately from native blink.
  token.document.movementAction='walk';
  const combat={started:true,combatants:[{tokenId:'t1',getFlag:()=>({kind:'teleport',maximum:15})}]};
  assert.equal(hudMovementSnapshot(actor,token,combat,actions).icon,actions.blink.icon);
  assert.equal(token.document.movementAction,'walk');
  assert.deepEqual(hudMovementSnapshot({id:'other'},token,null,actions),null);
});

test('v129: native image movement config takes precedence over a fallback icon',()=>{
  const actor={id:'a'};const token={id:'t',actor,document:{movementAction:'blink'}};
  assert.deepEqual(hudMovementSnapshot(actor,token,null,{blink:{icon:'fa-solid fa-bolt',img:'icons/svg/portal.svg',teleport:true}}),
    {label:'Teleporte (Piscar)',icon:'fa-solid fa-bolt',img:'icons/svg/portal.svg'});
  assert.match(source,/if \(movement\.img\)/);
});

function stubButton(name, key = '', weapon = false) {
  const classes = new Set(['mmrpg-native-action-hud__action', ...(weapon?['weapon']:[])]);
  const star = [];
  return {
    name, dataset:{action:weapon?'weapon':'power',itemId:key || name},
    classList:{contains:s=>classes.has(s),toggle(s,value){if(value)classes.add(s);else classes.delete(s)}},
    querySelector(selector){return selector==='.name'?{textContent:name,querySelector(){return null}}:null},
    appendChild(node){star.push(node)},
    get star(){return star[0]?.textContent},
  };
}
test('v129: favorite group A-Z then nonfavorite group A-Z across powers and weapons',()=>{
  const buttons = [stubButton('Zulu'),stubButton('Beta'),stubButton('Alpha'),stubButton('Yankee','Y',true),stubButton('Bravo')];
  const headline = {remove(){this.removed=true}};
  const body={
    buttons,
    querySelectorAll(sel){
      if(sel==='.mmrpg-native-action-hud__action')return this.buttons;
      if(sel==='.mmrpg-native-action-hud__group-title')return [headline];
      return [];
    },
    appendChild(button){this.buttons.splice(this.buttons.indexOf(button),1);this.buttons.push(button)},
  };
  globalThis.document={createElement(){return {className:'',textContent:'',setAttribute(){}}}};
  const hud=new NativeActionHud();
  hud.getFavoriteKeys=()=>['power:Beta','weapon:Y'];
  hud.decorateFavoriteShortcuts(body,{id:'actor'});
  assert.deepEqual(body.buttons.map(b=>b.name),['Beta','Yankee','Alpha','Bravo','Zulu']);
  assert.equal(headline.removed,true);
  assert.equal(body.buttons[0].star,'★');
  assert.equal(body.buttons[2].star,'☆');
});

test('v129: alphabetic grid is column-major, bottom slots follow right after top',()=>{
  const hud=new NativeActionHud();let props={};
  const buttons=Array.from({length:9},()=>({style:{removeProperty(){}}}));
  const body={clientWidth:230,dataset:{},style:{setProperty(k,v){props[k]=v}},querySelectorAll(s){return s.includes('slot-empty')?[]:buttons}};
  hud.root={getBoundingClientRect(){return {width:670}},querySelector(){return {getBoundingClientRect(){return {width:440}}}}};
  hud.reflowPersistentHotbar(body);
  assert.equal(props['--mmrpg-persistent-body-columns'],'5');
  assert.equal(props['--mmrpg-persistent-body-rows'],'2');
  assert.match(css,/grid-auto-flow:\s*column;[\s\S]*grid-template-rows:\s*repeat\(var\(--mmrpg-persistent-body-rows\)/);
  assert.equal(manifest.version,'0.2.141');
});
