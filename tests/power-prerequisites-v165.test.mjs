import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
  applyVerifiedPowerPrerequisites,
  reconcilePowerCatalog,
  VERIFIED_POWER_PREREQUISITES,
  VERIFIED_POWER_IDS
} from '../apps/charactermancer/scripts/utils/mmc-power-catalog.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const fixList=[
  ['Energy Absorption','Basic','Rank 4'],
  ['Blazing Fast Fists','Super-Speed','Rank 2'],
  ['Grow 2','Resize','Grow 1'],
  ['Do This All Day','Martial Arts','Rank 2'],
  ['Do This All Day','Shield Bearer','Rank 2'],
  ['Speed Run 2','Super-Speed','Speed Run 1, Rank 3'],
  ['Return Fire','Ranged Weapons','Suppressive Fire, Rank 2']
];
const get=(name,set)=>catalog.find(p=>p.name===name && p.system.powerSet===set);
function getCompendiumRecords(){
  // Parse actual Foundry LevelDB WriteBatch log records (not a text search).
  const buf=readFileSync(new URL('../packs/mmc-powers-v0186/000002.log',import.meta.url));
  const logical=[]; let fragments=[]; const docs=new Map();
  for (let pos=0; pos<buf.length;) {
    const remaining=32768-(pos%32768);
    if (remaining<7) {pos+=remaining;continue;}
    const len=buf.readUInt16LE(pos+4),type=buf[pos+6];
    if (!len && !type){pos+=remaining;continue;}
    assert.ok([1,2,3,4].includes(type));
    const data=buf.subarray(pos+7,pos+7+len);
    assert.equal(data.length,len);
    fragments.push(data);pos+=7+len;
    if(type===1||type===4){logical.push(Buffer.concat(fragments));fragments=[];}
  }
  assert.equal(fragments.length,0);
  const varint=(data,at)=>{
    let n=0,mult=1;
    for(;;){const c=data[at++]; n+=(c&127)*mult; if(!(c&128))return [n,at]; mult*=128;}
  };
  for(const batch of logical){
    const n=batch.readUInt32LE(8);let pos=12;
    for(let i=0;i<n;i++){
      const op=batch[pos++];let size;
      [size,pos]=varint(batch,pos);
      const key=batch.subarray(pos,pos+size).toString('utf8');pos+=size;
      if(op===1){
        [size,pos]=varint(batch,pos);
        const value=JSON.parse(batch.subarray(pos,pos+size).toString('utf8'));pos+=size;
        docs.set(key,value);
      } else {assert.equal(op,0);docs.delete(key);}
    }
    assert.equal(pos,batch.length);
  }
  return docs;
}

test('v165: sete registros oficiais de requisito protegidos no catálogo sem perder poderes',()=>{
  assert.equal(catalog.length,398);
  assert.equal(Object.keys(VERIFIED_POWER_PREREQUISITES).length,7);
  assert.equal(Object.keys(VERIFIED_POWER_IDS).length,7);
  for(const [name,set,prereq] of fixList){
    const p=get(name,set);
    assert.ok(p,`${set} / ${name}`);
    assert.equal(p.system.prerequisites,prereq,`${set} / ${name}`);
    assert.equal(VERIFIED_POWER_IDS[p._id],prereq);
  }
});

test('v165: compêndio persistido corresponde ao catálogo de 398 poderes (incluindo pré-requisitos)',()=>{
  const items=getCompendiumRecords();
  assert.equal([...items.keys()].filter(k=>k.startsWith('!items!')).length,catalog.length);
  const differences=[];
  for(const p of catalog){
    const packed=items.get('!items!'+p._id);
    assert.ok(packed,`Poder ausente: ${p.name}`);
    if(packed.system.prerequisites!==p.system.prerequisites) differences.push({power:p.name,set:p.system.powerSet,pack:packed.system.prerequisites,catalog:p.system.prerequisites});
  }
  assert.deepEqual(differences,[]);
});

test('v165: não permite que cópias antigas do Mundo ocultem os requisitos oficiais',()=>{
  for(const [name,set,prereq] of fixList){
    const canonical=get(name,set);
    const old={...canonical,system:{...canonical.system, prerequisites:''}};
    const merged=reconcilePowerCatalog([canonical],[old],[old]);
    assert.equal(merged.length,1);
    assert.equal(merged[0].system.prerequisites,prereq,`${name}: cópia antiga`);
    const changedId={...old,_id:'world-old-'+name+'-'+set};
    assert.equal(reconcilePowerCatalog([canonical],[],[changedId]).length,1);
    assert.equal(reconcilePowerCatalog([canonical],[],[changedId])[0].system.prerequisites,prereq);
  }
});

test('v165: normalização conserva restrições extras, outras variantes e não altera a entrada original',()=>{
  const energy=get('Energy Absorption','Basic');
  const custom={...energy,system:{...energy.system,prerequisites:'Rank 2, Sorcerous'}};
  const hardened=applyVerifiedPowerPrerequisites(custom);
  assert.equal(hardened.system.prerequisites,'Rank 4, Sorcerous');
  assert.equal(custom.system.prerequisites,'Rank 2, Sorcerous');
  assert.equal(applyVerifiedPowerPrerequisites(hardened),hardened);
  const olderSpeed={...get('Speed Run 2','Super-Speed'),system:{powerSet:'Super-Speed',prerequisites:'Speed Run 1, Rank 2'}};
  assert.equal(applyVerifiedPowerPrerequisites(olderSpeed).system.prerequisites,'Speed Run 1, Rank 3');
  const oldReturn={...get('Return Fire','Ranged Weapons'),system:{powerSet:'Ranged Weapons',prerequisites:'Suppressive Fire, Rank 8'}};
  assert.equal(applyVerifiedPowerPrerequisites(oldReturn).system.prerequisites,'Suppressive Fire, Rank 2');
  assert.equal(applyVerifiedPowerPrerequisites({...energy,system:{...energy.system,prerequisites:'Rank 5'}}).system.prerequisites,'Rank 5');
  const other={_id:'homebrew',name:'Energy Absorption',system:{powerSet:'Homebrew',prerequisites:''}};
  assert.equal(applyVerifiedPowerPrerequisites(other),other);
});

test('v165: o validador real do Charactermancer bloqueia Energy Absorption para Rank 3',()=>{
  const src=readFileSync(new URL('../apps/charactermancer/scripts/charactermancer.js',import.meta.url),'utf8');
  class AppV2{constructor(){}}
  const ctx={
    foundry:{applications:{api:{ApplicationV2:AppV2}}},
    Hooks:{once:()=>{},on:()=>{}}, console,
    loadTraitsAndTags:()=>({traits:[],tags:[]}),
    dedupePowerCatalog:()=>[],reconcilePowerCatalog,prepareCharacterPowers:()=>[],
    powerIdentity:()=>'',samePower:()=>false
  };
  const Klass=vm.runInNewContext(src.replace(/^import .*;\s*$/gm,'')+'\nMMCCharactermancer;',ctx);
  const app=new Klass();
  const state={rank:3,data:{powers:catalog,traits:[],tags:[]},chosenPowers:[]};
  const power=get('Energy Absorption','Basic');
  assert.deepEqual(Array.from(app._meetsAllPrereqs(power.system.prerequisites,state).missing),['Rank 4']);
  assert.equal(app._meetsAllPrereqs(power.system.prerequisites,state).ok,false);
  state.rank=4;
  assert.equal(app._meetsAllPrereqs(power.system.prerequisites,state).ok,true);
  state.rank=1;
  assert.equal(app._meetsAllPrereqs(get('Blazing Fast Fists','Super-Speed').system.prerequisites,state).ok,false);
  state.rank=2;
  assert.equal(app._meetsAllPrereqs(get('Blazing Fast Fists','Super-Speed').system.prerequisites,state).ok,true);
  assert.equal(app._meetsAllPrereqs(get('Grow 2','Resize').system.prerequisites,state).ok,false);
  state.chosenPowers=[get('Grow 1','Resize')];
  assert.equal(app._meetsAllPrereqs(get('Grow 2','Resize').system.prerequisites,state).ok,true);
});
