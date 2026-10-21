import test from 'node:test';
import assert from 'node:assert/strict';
import {captureCanvasCircle,canvasPointerPosition} from '../scripts/elemental-draw-pointer.mjs';
import {mayControlElementalCard} from '../scripts/elemental-advanced.mjs';
import {readFileSync} from 'node:fs';
const SYS='multiverse-d616';

function setupPermission(){
 const owner={id:'playerA',isGM:false},other={id:'playerB',isGM:false},gm={id:'gm',isGM:true};
 const actor={testUserPermission:(u,level)=>{assert.equal(level,3);return u.id==='playerA'||u.isGM;}};
 const m={user:{id:'gm'},speaker:{scene:'scene1',token:'tok1'},getFlag:(_scope,key)=>key==='elementalAreaPower'?'Elemental Prison':null};
 globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
 globalThis.game={user:owner,scenes:{get:()=>({tokens:{get:()=>({actor})}})},users:{get:id=>[owner,other,gm].find(u=>u.id===id)}};
 return {m,owner,other,gm};
}
test('Sphere/Prison owner sees controls even when chat belongs to GM; other player cannot control',()=>{
 const {m,owner,other,gm}=setupPermission();
 assert.equal(mayControlElementalCard(m,owner),true);
 assert.equal(mayControlElementalCard(m,other),false);
 assert.equal(mayControlElementalCard(m,gm),true);
 delete globalThis.game;delete globalThis.CONST;
});
class Hub {
 listeners=new Map();
 addEventListener(k,cb,capture){if(k.startsWith('pointer')||k==='contextmenu'||k==='keydown')assert.equal(capture,true);this.listeners.set(k,[...(this.listeners.get(k)??[]),cb]);}
 removeEventListener(k,cb){this.listeners.set(k,(this.listeners.get(k)??[]).filter(f=>f!==cb));}
 emit(k,e){for(const cb of [...(this.listeners.get(k)??[])])cb(e);}
 count(){return [...this.listeners.values()].reduce((n,ls)=>n+ls.length,0);}
}
function pointer(type,view,x,y,id=7){return {type,clientX:x,clientY:y,button:0,pointerId:id,target:view,
 composedPath:()=>[view],preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
test('exclusive native pointer capture draws over tokens, suppresses Pixi click and cleans listeners',()=>{
 const doc=new Hub(),win=new Hub();
 const view={getBoundingClientRect:()=>({left:100,top:20,width:500,height:500}),contains:()=>true};
 const renderer={screen:{width:1000,height:1000}};
 const stage={toLocal:p=>p};
 const events=[];
 const started=captureCanvasCircle({view,renderer,stage,doc,win,
   onStart:p=>events.push(['start',p]),onMove:p=>events.push(['move',p]),onFinish:p=>events.push(['finish',p]),onCancel:()=>events.push(['cancel'])});
 const down=pointer('pointerdown',view,150,70);
 doc.emit('pointerdown',down);
 assert.equal(down.prevented,true);assert.equal(down.stopped,true);
 const move=pointer('pointermove',view,200,120);
 doc.emit('pointermove',move);
 const up=pointer('pointerup',view,250,170);
 doc.emit('pointerup',up);
 assert.deepEqual(events,[['start',{x:100,y:100}],['move',{x:200,y:200}],['finish',{x:300,y:300}]]);
 assert.equal(doc.count(),0);assert.equal(win.count(),0);
 started.cancel();assert.equal(events.length,3);
});
test('drawing cancels on Escape, right click or view change without moving tokens',()=>{
 const doc=new Hub(),win=new Hub();const view={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};
 let cancellations=0;
 captureCanvasCircle({view,renderer:{screen:{width:100,height:100}},stage:{toLocal:p=>p},doc,win,onCancel:()=>cancellations++});
 win.emit('keydown',{key:'Escape',preventDefault(){}});
 assert.equal(cancellations,1);assert.equal(doc.count(),0);
});
test('player controls, obsolete note and Pixi stage listeners cannot regress',()=>{
 const js=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
 assert.match(js,/mayControlElementalCard/);
 assert.doesNotMatch(js,/const info=document\.createElement\('p'\);info\.textContent=`Proteção:/);
 assert.match(js,/captureCanvasCircle\(/);
 assert.doesNotMatch(js,/stage\.on\('pointerdown'/);
 assert.match(js,/!validElementalRequester\(msg,claimed\)/);
});
