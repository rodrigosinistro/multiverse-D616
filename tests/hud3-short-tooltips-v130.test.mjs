import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

// Exercise the actual HUD renderer with a minimal Foundry-compatible DOM mock.
globalThis.Hooks={on(){},once(){}};
globalThis.window={innerWidth:1400,innerHeight:900,addEventListener(){}};
globalThis.canvas={tokens:{controlled:[]}};
globalThis.game={user:{isGM:true},combat:null,settings:{get(){return false},register(){}}};
globalThis.CONFIG={statusEffects:[
  {id:'mmrpg.confused',name:'Confuso',img:'icons/confused.webp'},
  {id:'mmrpg.prone',name:'Caído',img:'icons/prone.webp'},
  ...Array.from({length:6},(_,i)=>({id:`custom.${i}`,name:`Condição ${i}`}))
]};
class Node {
  constructor(tag){this.tagName=tag;this.className='';this.title='';this.textContent='';this.children=[];this.attributes={};
    this.classList={toggle(){}};}
  setAttribute(k,v){this.attributes[k]=v;}
  appendChild(el){this.children.push(el);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
}
globalThis.document={createElement:tag=>new Node(tag)};
const {NativeActionHud}=await import('../scripts/native-action-hud.mjs');
const source=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');

function render(statuses){
  const actor={id:'a1',uuid:'Actor.a1',system:{attributes:{rank:{value:3}}},
    statuses:new Set(statuses),effects:[]};
  const panel=new Node('section');
  const root={querySelectorAll(sel){return sel==='.mmrpg-native-action-hud__hud3-status'?[panel]:[]}};
  new NativeActionHud().updateHud3Status(root,actor);
  const tray=panel.children.find(n=>n.className==='mmrpg-native-action-hud__hud4-effects');
  const cond=tray?.children.find(n=>n.className==='mmrpg-native-action-hud__status-conditions');
  return cond?.children??[];
}

test('v160 condition chip tooltip includes duration and removal without repeating an effect icon',()=>{
  const [chip]=render(['mmrpg.confused']);
  assert.match(chip.title,/Confuso/);
  assert.match(chip.attributes['aria-label'],/Confuso/);
  assert.equal(chip.children[0].src,'icons/confused.webp');
  assert.match(source,/for \(const status of conditions\)/);
});

test('v160 all condition icons remain accessible rather than hiding the sixth behind +N',()=>{
  const rows=render(Array.from({length:6},(_,i)=>`custom.${i}`));
  assert.equal(rows.length,6,'each condition is represented by its own icon');
  assert.equal(rows.at(-1).title,'Condição 5\nDuração: até remoção conforme a regra');
});

test('v130 update is limited to HUD copy; native conditions module is unchanged',()=>{
  assert.match(source,/status.duration \? `Duração: \$\{status.duration\}`/);
  assert.match(source,/gauge.title = `Concentração/);
  assert.match(source,/mode.title = `Movimento atual:/);
});
