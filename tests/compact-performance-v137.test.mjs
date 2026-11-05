import test from 'node:test';
import assert from 'node:assert/strict';

const events=new Map();
function on(event, callback){events.set(event,[...(events.get(event)||[]), callback]);}
function emit(event,...args){for(const fn of events.get(event)||[])fn(...args);}
let positionReads=0;
const dom=new Map();
const settings={compactCombatHUD:true,compactInitiativePosition:{left:90,top:35}};
class FakeStrip {
  hidden=false;
  style={removeProperty(){}};
  classList={add(){},remove(){}};
  setAttribute(){}
  addEventListener(){}
  getBoundingClientRect(){positionReads++;return {left:90,top:35,width:380,height:46};}
  set innerHTML(value){this._html=value;}
  get innerHTML(){return this._html;}
}
globalThis.Hooks={once:on,on};
globalThis.foundry={utils:{escapeHTML:value=>String(value)}};
globalThis.game={system:{id:'multiverse-d616'},ready:true,user:{isGM:true},
  settings:{register(){},get:(_system,key)=>settings[key],set:async()=>{}},
  combat:{id:'c1',round:1,turn:0,started:true,scene:{id:'scene1'},
    turns:[{id:'a',name:'A',initiative:18,hidden:false,defeated:false,token:{texture:{src:'a.webp'}}}],
    combatant:{id:'a'}}};
globalThis.canvas={scene:{id:'scene1'}};
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener:(_event,fn)=>on('resize',fn)};
globalThis.document={getElementById:id=>dom.get(id)??null,createElement:tag=>new FakeStrip(),
  body:{appendChild:element=>{dom.set(element.id,element);}}};
globalThis.requestAnimationFrame=fn=>fn();
await import('../scripts/combat/compact-combat-display.mjs');

test('v137 compact initiative position is not remeasured on unrelated canvas events',()=>{
  emit('ready');
  const strip=dom.get('m616-compact-initiative');
  assert.ok(strip);
  assert.equal(strip.hidden,false);
  const initial=positionReads;
  assert.ok(initial>0);
  const html=strip.innerHTML;
  for(let i=0;i<10;i++){emit('hoverToken');emit('refreshToken');emit('canvasPan');}
  assert.equal(strip.innerHTML,html,'same initiative markup');
  assert.equal(positionReads,initial,'no repeated layout reads');
  game.combat.turn=1;
  emit('updateCombat');
  assert.equal(positionReads,initial+1,'turn change reclamps initiative strip');
  emit('resize');
  assert.equal(positionReads,initial+2,'viewport resize still reclamps initiative strip');
  game.combat=null;
  emit('deleteCombat');
  assert.equal(strip.hidden,true);
  game.combat={id:'c2',round:1,turn:0,started:true,scene:{id:'scene1'},turns:[],combatant:null};
  emit('createCombat');
  assert.equal(strip.hidden,false);
  assert.equal(positionReads,initial+3,'showing a new combat reclamps strip');
});
