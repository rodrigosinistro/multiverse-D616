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
  const cond=panel.children.find(n=>n.className==='mmrpg-native-action-hud__status-conditions');
  return cond?.children??[];
}

test('v130 condition chip tooltip and accessible label include only condition name',()=>{
  const [chip]=render(['mmrpg.confused']);
  assert.equal(chip.title,'Confuso');
  assert.equal(chip.attributes['aria-label'],'Confuso');
  assert.equal(chip.children[0].src,'icons/confused.webp');
  assert.doesNotMatch(chip.title,/Duração|Remoção|turno|teste/i);
  assert.match(source,/more.title = conditions.slice\(5\).map\(c => c.label\)/);
});

test('v130 +N hover lists only additional condition names',()=>{
  const rows=render(Array.from({length:6},(_,i)=>`custom.${i}`));
  assert.equal(rows.length,6,'five icons plus one counter');
  const more=rows.at(-1);
  assert.equal(more.textContent,'+1');
  assert.equal(more.title,'Condição 5');
  assert.doesNotMatch(more.title,/Duração|Remoção|:/);
});

test('v130 update is limited to HUD copy; native conditions module is unchanged',()=>{
  assert.doesNotMatch(source,/chip.title = `\$\{status.label\}\nDuração/);
  assert.match(source,/gauge.title = `Concentração/);
  assert.match(source,/mode.title = `Movimento atual:/);
});
