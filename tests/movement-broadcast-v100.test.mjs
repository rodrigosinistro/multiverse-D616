import test from 'node:test';
import assert from 'node:assert/strict';

class FakeElement {
  constructor(tag='div'){
    this.tag=tag;this.children=[];this.classes=new Set();this.hidden=false;
    this.style={};this.attributes={};this.textContent='';
    this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};
  }
  set className(s){this.classes=new Set(s.split(' '));}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.append(node);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  querySelector(selector){
    for(const child of this.children){if(child.classes.has(selector.slice(1)))return child; const found=child.querySelector(selector);if(found)return found;}
    return null;
  }
}
const hooks=new Map(), documentEvents=new Map(), roots=[];
function on(name,listener){hooks.set(name,[...(hooks.get(name)||[]),listener]);}
function trigger(name,...args){for(const callback of hooks.get(name)||[])callback(...args);}
let socketReceiver;
const packets=[];
globalThis.Hooks={once:on,on};
globalThis.document={body:{appendChild:r=>roots.push(r)},getElementById:id=>roots.find(r=>r.id===id),
  createElement:tag=>new FakeElement(tag),createElementNS:(_,tag)=>new FakeElement(tag),
  addEventListener:(name,listener)=>documentEvents.set(name,listener)};
globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(){}};
globalThis.requestAnimationFrame=fn=>fn();
globalThis.ui={notifications:{warn(){}}};
const localUser={id:'gm',isGM:true}, otherUser={id:'p1',isGM:false};
globalThis.game={system:{id:'multiverse-d616'},user:localUser,combat:null,
  users:new Map([[localUser.id,localUser],[otherUser.id,otherUser]]),
  socket:{on:(_name,listener)=>{socketReceiver=listener;},emit:(name,payload)=>packets.push({name,payload})},
  modules:new Map(),settings:{get:()=>true,register(){}},
  multiverseD616:{turnTracker:{getState:()=>({movementUsed:1,movementMax:5,actionUsed:0})}}};
const actor={system:{movement:{run:{value:5,active:true}}}};
const makeToken=(id,x)=>({id,x,y:0,w:100,h:100,visible:true,isOwner:true,actor,
  document:{id,hidden:false,elevation:0,movementAction:'walk',testUserPermission:(_user,level)=>level==='OWNER'}});
const own=makeToken('own',0),remoteToken=makeToken('remote',300);
globalThis.canvas={ready:true,tokens:{controlled:[own],placeables:[own,remoteToken],hover:null,
  get:id=>[own,remoteToken].find(t=>t.id===id),_draggedToken:null},
  stage:{worldTransform:{apply:p=>p,applyInverse:p=>p},on(){},off(){}},
  app:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})},renderer:{screen:{width:1200,height:800}}},
  scene:{id:'test-scene',grid:{size:100,distance:5}},dimensions:{size:100},
  grid:{measurePath:([a,b])=>({spaces:Math.hypot(b.x-a.x,b.y-a.y)/100})}};

await import('../scripts/combat/native-distance-display.mjs');
trigger('init');trigger('ready');trigger('canvasReady');
const root=()=>document.getElementById('m616-native-distance');
const frame=(operation,overrides={})=>({
  type:'m616NativeMovementPreview',operation,userId:'p1',sceneId:'test-scene',sequence:operation==='stop'?4:3,
  tokenId:'remote',origin:{x:350,y:50,elevation:0},end:{x:450,y:50,elevation:0},
  labelText:'Caminhada 5 · Distância: 1 espaços · Restam 4',secondaryText:'Ação Padrão necessária',
  secondaryKind:'action',exceeds:true,...overrides,
});
test('movimento local é transmitido com mesma prévia, sem alterar ficha ou token',()=>{
  canvas.tokens._draggedToken=own;
  documentEvents.get('pointermove')({clientX:250,clientY:50});
  assert.equal(root().hidden,false);
  const framePacket=packets.find(p=>p.payload.operation==='frame')?.payload;
  assert.ok(framePacket,'prévia emitida durante arrasto');
  assert.equal(framePacket.sceneId,'test-scene');
  assert.equal(framePacket.tokenId,'own');
  assert.deepEqual(framePacket.anchor,{x:50,y:0,elevation:0},'ângulo da etiqueta próximo ao token também é transmitido');
  assert.match(framePacket.labelText,/Caminhada|Distância/);
  canvas.tokens._draggedToken=null;
  documentEvents.get('pointerup')();
  assert.equal(packets.at(-1).payload.operation,'stop');
  assert.equal(root().hidden,true);
});
test('Mestre vê a régua de outro jogador com personagem próprio selecionado',()=>{
  assert.ok(socketReceiver);
  socketReceiver(frame('frame'));
  assert.equal(root().hidden,false);
  assert.match(root().querySelector('.m616-distance-pill').textContent,/Restam 4/);
  assert.equal(root().querySelector('.m616-distance-guide').attributes.d,'M350,50 L450,50');
  socketReceiver(frame('stop'));
  assert.equal(root().hidden,true);
});
test('Mestre recebe posição de etiqueta acima do token, não no fim do caminho',()=>{
  socketReceiver(frame('frame',{sequence:10,anchor:{x:350,y:220,elevation:0}}));
  assert.equal(root().hidden,false);
  assert.equal(root().querySelector('.m616-distance-pill').style.left,'220px');
  assert.equal(root().querySelector('.m616-distance-pill').style.top,'159px');
  socketReceiver(frame('stop',{sequence:11}));
  assert.equal(root().hidden,true);
});
test('rejeita emissor falso, cena diferente, mensagens antigas e tokens invisíveis',()=>{
  socketReceiver(frame('frame',{sequence:5,userId:'falso'}),'p1');
  assert.equal(root().hidden,true);
  socketReceiver(frame('frame',{sequence:6,sceneId:'outra-cena'}));
  assert.equal(root().hidden,true);
  socketReceiver(frame('frame',{sequence:3}));
  assert.equal(root().hidden,true,'pacote repetido após stop não ressuscita linha');
  game.user.isGM=false;
  remoteToken.document.hidden=true;
  socketReceiver(frame('frame',{sequence:7}));
  assert.equal(root().hidden,true);
  remoteToken.document.hidden=false;
  game.user.isGM=true;
});
