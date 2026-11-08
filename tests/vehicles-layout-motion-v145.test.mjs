import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {followVehicleDuringMovement} from '../scripts/vehicles/vehicle-system.mjs';
const get = path => readFileSync(new URL(path,import.meta.url),'utf8');

test('Vehicle 1.3 crew panel below powers and traits with same GM/player markup',()=>{
 const html=get('../templates/actor/actor-vehicle-sheet.hbs');
 assert.ok(html.indexOf('<div class="mm-v2-npc-bottom">')<html.indexOf('<section class="m616-vehicle-crew mm-v2-card"'));
 for (const expected of ['m616-vehicle-movement','m616-vehicle-visibility','m616-vehicle-role','m616-vehicle-disembark'])
   assert.ok(html.includes(expected));
 assert.match(html,/class="m616-vehicle-role"[^>]*{{#unless @root.vehicleCanManage}}disabled{{\/unless}}/);
 assert.match(html,/class="m616-vehicle-disembark"[^>]*{{#unless @root.vehicleCanManage}}disabled{{\/unless}}/);
 assert.match(html,/class="m616-vehicle-visibility"[^>]*{{#unless vehicleCanManage}}disabled{{\/unless}}/);
});

test('Vehicle 1.3 non-GM still sees fully sized controls but cannot change crew',()=>{
 const main=get('../multiverse-d616.mjs');
 const css=get('../styles/vehicle-sheet.css');
 assert.match(main,/context\.vehicleReadOnly = !context\.vehicleCanManage/);
 assert.match(main,/root\.classList\.toggle\('m616-vehicle-readonly', readonly\)/);
 assert.match(main,/control\.disabled=true/);
 for(const part of ['actor-powers.hbs','actor-traits.hbs','actor-tags.hbs'])
   assert.match(get('../templates/actor/parts/'+part), /@root\.vehicleReadOnly/);
 assert.match(css,/\.m616-view-only-controls/);
});

test('Vehicle 1.3 translation for vehicle sheet in pt-BR and en',()=>{
 for(const [lang, expected] of [['pt-BR','Veículo'],['en','Vehicle']]){
  const data=JSON.parse(get('../lang/'+lang+'.json'));
  assert.equal(data.TYPES.Actor.vehicle,expected);
 }
});

test('Vehicle 1.3 stays visually attached while the GM confirms final position',async()=>{
 let resolveEnd, resolveWrite;
 const ticks=new Set(),updates=[];
 const shipPos={x:100,y:100};const memberPos={x:100,y:100,set(x,y){this.x=x;this.y=y}};
 const shipActor={type:'vehicle',getFlag(_s,k){return k==='vehicleCrewVisibility'?'hidden':null}};
 const scene={id:'a',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id)}},
  updateEmbeddedDocuments(_type,patches){updates.push(patches);return new Promise(r=>resolveWrite=r)}};
 const ship={id:'s',actor:shipActor,x:100,y:100,width:2,height:2,parent:scene,
  object:{position:shipPos},getFlag(){return [{tokenId:'p',actorId:'hero',role:'pilot'}]}};
 const member={id:'p',object:{position:memberPos},x:100,y:100,parent:scene};
 scene.tokens.contents.push(ship,member);
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}}};
 globalThis.canvas={app:{ticker:{add(fn){ticks.add(fn)},remove(fn){ticks.delete(fn)}}},grid:{size:100},tokens:{get(){return null}}};
 const movement={animation:{ended:new Promise(r=>resolveEnd=r)},destination:{x:500,y:500}};
 followVehicleDuringMovement(ship,movement);
 shipPos.x=500;shipPos.y=500;
 resolveEnd();
 for(let i=0;i<10;i++) await Promise.resolve();
 assert.equal(updates.length,1);
 assert.equal(ticks.size,1,'visual follow stays active during the pending database write');
 resolveWrite();
 for(let i=0;i<10;i++) await Promise.resolve();
 assert.equal(ticks.size,0,'follow released once the snapshot is safely stored');
});
