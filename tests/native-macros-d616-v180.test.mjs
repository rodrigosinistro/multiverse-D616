import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGISTERED_AUTOMATIONS} from '../scripts/native-power-registry-data.mjs';
import {resolveNativePowerAutomation,resolveNativePowerByMacroId,planNativePowerDispatch,
  showMacroInfo,registerNativePowerAutomationAPI} from '../scripts/native-power-automations.mjs';

const root=new URL('../',import.meta.url);
const load=filename=>readFileSync(new URL(filename,root));
const catalog=JSON.parse(load('apps/charactermancer/data/powers.json')).items;
const inventory=JSON.parse(load('audit/native-power-inventory-v180.json')).powers;
const manifest=JSON.parse(load('system.json'));
const item=(name,set)=>catalog.find(p=>p.name===name&&p.system.powerSet===set);
const mockOwned=(name,set)=>{
 const original=item(name,set);
 return {...original,_id:'1234567890123456',id:'1234567890123456',
   flags:{core:{sourceId:`Compendium.multiverse-d616.powers.Item.${original._id}`}},
 };
};
// Read/validate WAL layouts as LevelDB write batches, independently of Python pack builder.
function readVar(data,pos){let n=0,shift=0;while(pos<data.length){const b=data[pos++];n+=(b&127)*2**shift;if(!(b&128))return[n,pos];shift+=7;}throw Error('Bad varint');}
function entriesOf(file){
 const buffer=load(file),batches=[];let fragment=Buffer.alloc(0);
 for(let offset=0;offset<buffer.length;offset+=32768){
  const block=buffer.subarray(offset,offset+32768);let index=0;
  while(index+7<=block.length){
   const length=block.readUInt16LE(index+4),kind=block[index+6];index+=7;
   if(!kind)break;
   assert.ok(index+length<=block.length,'fragment within LevelDB block');
   const segment=block.subarray(index,index+length);index+=length;
   if(kind===1)batches.push(segment);
   else if(kind===2)fragment=segment;
   else if(kind===3)fragment=Buffer.concat([fragment,segment]);
   else if(kind===4){batches.push(Buffer.concat([fragment,segment]));fragment=Buffer.alloc(0);}
   else assert.fail('Unexpected record type');
  }
 }
 const result=new Map();
 for(const batch of batches){const count=batch.readUInt32LE(8);let pos=12;
  for(let i=0;i<count;i++){
   assert.equal(batch[pos++],1);let len;[len,pos]=readVar(batch,pos);
   const key=batch.subarray(pos,pos+len).toString();pos+=len;
   [len,pos]=readVar(batch,pos);const value=JSON.parse(batch.subarray(pos,pos+len).toString());pos+=len;
   result.set(key,value);
  }
  assert.equal(pos,batch.length,'no stray bytes in LevelDB WriteBatch');
 }
 return result;
}

const bundled=entriesOf('packs/macros-d616/000002.log');
const sourcePowers=entriesOf('packs/mmc-powers-v0186/000002.log');
const originalPowers=[...sourcePowers].filter(([key])=>key.startsWith('!items!')).map(([,value])=>value);

test('v180: catalog inventory comes from REAL Powers compendium and lists exactly 398 unique IDs in 27 power sets',()=>{
 assert.equal(inventory.length,398);
 assert.equal(originalPowers.length,398);
 assert.equal(new Set(inventory.map(p=>p.powerId)).size,398);
 assert.equal(new Set(inventory.map(p=>p.powerSet)).size,27);
 for(const p of inventory){const source=sourcePowers.get(`!items!${p.powerId}`);
  assert.ok(source,`missing source ${p.powerId}`);
  assert.equal(p.icon,source.img,p.name);
  assert.equal(p.effect,source.system.effect,p.name);
  assert.equal(p.sourceUuid,`Compendium.multiverse-d616.powers.Item.${p.powerId}`);
 }
});

test('v180: new native Macro compendium is a valid foldered LevelDB, with original icons and inert scripts',()=>{
 const pack=manifest.packs.find(p=>p.name==='macros-d616');
 assert.equal(manifest.version,'0.2.237');assert.equal(pack.type,'Macro');
 assert.equal(pack.label,'Macros_D616');
 assert.equal(pack.ownership.PLAYER,'OBSERVER');
 assert.equal([...bundled.keys()].filter(k=>k.startsWith('!folders!')).length,27);
 const macros=[...bundled.entries()].filter(([k])=>k.startsWith('!macros!')).map(([,v])=>v);
 assert.equal(macros.length,162);
 assert.equal(REGISTERED_AUTOMATIONS.length,162);
 for(const macro of macros){
  assert.equal(macro.type,'script');assert.equal(macro.scope,'global');
  assert.ok(bundled.has(`!folders!${macro.folder}`));
  const id=macro.flags['multiverse-d616'].nativeAutomation.powerId;
  assert.equal(macro.img,sourcePowers.get(`!items!${id}`).img,'compendium icon matches original source');
  assert.match(macro.command,/^game\.multiverseD616\?\.nativePowerAutomations\?\.showMacroInfo\("[a-f0-9]{16}"\);$/);
  assert.ok(!/\b(eval|Function|update|execute|socket|fetch)\b/i.test(macro.command));
 }
});

test('v180: names repeated in different power sets never resolve by name alone',()=>{
 assert.equal(resolveNativePowerAutomation({type:'power',name:'Anger',system:{powerSet:'Magic'}}),null);
 assert.equal(resolveNativePowerAutomation({type:'weapon',name:'Anger',system:{powerSet:'Basic'}}),null);
 assert.equal(resolveNativePowerAutomation({type:'power',name:'Energy Absorption',system:{powerSet:'Basic'}})?.powerId,item('Energy Absorption','Basic')._id);
 const tampered=mockOwned('Anger','Basic');
 tampered.flags['multiverse-d616']={nativeAutomation:{powerId:item('Energy Absorption','Basic')._id}};
 assert.equal(resolveNativePowerAutomation(tampered),null);
 assert.equal(resolveNativePowerAutomation(mockOwned('Anger','Basic'))?.powerId,item('Anger','Basic')._id);
});

test('v181: registry dispatches Anger only; previous power activations are untouched',()=>{
 const anger=planNativePowerDispatch(mockOwned('Anger','Basic'));
 assert.equal(anger.mode,'native-active');assert.equal(anger.matched,true);
 assert.equal(planNativePowerDispatch({type:'weapon',name:'Anger'}).mode,'generic-legacy');
 const legacy=planNativePowerDispatch(mockOwned('Lightning Actions','Super-Speed'));
 assert.equal(legacy.mode,'requires-configuration');
 const mockGame={};const api=registerNativePowerAutomationAPI(mockGame);
 assert.equal(api,registerNativePowerAutomationAPI(mockGame));
 assert.ok(Object.isFrozen(api));assert.equal(api.list().length,162);
 const m=api.getByItem(mockOwned('Anger','Basic'));
 assert.equal(api.getByMacroId(m.macroId),m);
 assert.equal(resolveNativePowerByMacroId('missing'),null);
 assert.equal(showMacroInfo('missing'),false);
 const main=load('multiverse-d616.mjs').toString();
 assert.match(main,/if\(isEnergyAbsorptionPower\(this\)\)return dispatchNativeExistingPreRoll\(this\)/);
 assert.match(main,/commitNativePowerAfterFocus/);
 assert.match(main,/nativeDamageBonusForAttack/);
});

test('v180: Anger is documented without applying +15 to damage MULTIPLIER',()=>{
 const a=inventory.find(p=>p.name==='Anger'&&p.powerSet==='Basic');
 assert.match(a.effect,/Para cada 10 pontos de Focus gastos/i);
 assert.match(a.effect,/\+15 ao bônus de dano de Melee/);
 assert.match(a.effect,/-2 em sua Logic/);
 assert.match(a.effect,/não pode usar outros poderes que exijam concentração/);
 assert.equal(a.automationStatus,'planejada');
});
