import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks??={once(){},on(){},off(){}};
const {controlEligibility,controlCost,copiedItemData,resolvePowerControl,syncPowerControl}=await import('../scripts/native-power-control.mjs');
const {dampenedPower,dampenedAttackMultiplier,dampenedTransferData,copiedPowerUsable,COPY,DAMPEN,CONTROL}=await import('../scripts/power-control-rules.mjs');
const {resolveItemRange}=await import('../scripts/combat-preflight.mjs');
const {getMarvelOutcome}=await import('../scripts/power-conditions.mjs');
const {resolvePowerRoll}=await import('../scripts/power-rolls.mjs');
const S='multiverse-d616';
const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
let counter=0;
function collection(entries=[]){return Object.assign(entries,{get(id){return this.find(i=>i.id===id)}});}
function actor(id){const a={id,uuid:`Actor.${id}`,name:id,items:collection(),effects:collection(),system:{attributes:{rank:{value:6}},focus:{value:30},abilities:{ego:{defense:14}}},testUserPermission:()=>true,
 async update(data){if('system.focus.value' in data)this.system.focus.value=data['system.focus.value'];},
 async createEmbeddedDocuments(type,docs){const c=type==='Item'?this.items:this.effects;return docs.map(data=>{const d={...structuredClone(data),id:`new${++counter}`,parent:this};if(type==='Item')d.actor=this;c.push(d);return d;});},
 async deleteEmbeddedDocuments(type,ids){const c=type==='Item'?this.items:this.effects;for(const id of ids){const index=c.findIndex(d=>d.id===id);if(index>=0)c.splice(index,1);}}};return a;}
function power(a,name){const raw=structuredClone(catalog.find(i=>i.name===name));assert.ok(raw,name);const i={...raw,id:raw._id,actor:a,toObject(){return structuredClone(raw)}};a.items.push(i);return i;}
function setup(name,targetPower='Elemental Blast'){
 const a=actor('a'),b=actor('b'),item=power(a,name),p=power(b,targetPower);
 const scene={id:'s',grid:{size:100}},src={id:'a',uuid:'Scene.s.Token.a',actor:a,x:0,y:0,width:1,height:1,parent:scene},target={id:'b',uuid:'Scene.s.Token.b',actor:b,x:900,y:0,width:1,height:1,parent:scene,name:'b'};
 scene.tokens=collection([src,target]); const user={id:'gm',isGM:true};globalThis.game={user,users:{activeGM:user},actors:collection([a,b]),scenes:collection([scene])};
 const fx={id:'conc',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:item.id}}},async setFlag(s,k,v){this.flags[s][k]=v;},async unsetFlag(s,k){delete this.flags[s][k];}};a.effects.push(fx);
 const sel={version:1,sceneId:scene.id,sourceTokenId:src.id,targetTokenId:target.id,targetItemId:p.id,cost:name==='Dampen Power'?5:0};
 const message={id:`msg${++counter}`,author:user,speaker:{scene:'s',token:'a',actor:'a'},rolls:name==='Dampen Power'?[{total:16,isFantastic:false}]:[],flags:{[S]:{itemId:item.id,nativePowerControlRequest:sel,targets:[{uuid:target.uuid}]}},getFlag(s,k){return this.flags[s][k]},async setFlag(s,k,v){this.flags[s][k]=v}};
 return {a,b,item,p,scene,src,target,fx,sel,message};
}
const silent={post:async()=>{}};
test('Copy Power validates distinct target and 10-space limit; Dampen uses 20',()=>{const e=setup('Copy Power');assert.equal(controlEligibility(e.item,e.sel,e.scene).ok,true);e.target.x=1100;assert.equal(controlEligibility(e.item,e.sel,e.scene).ok,false);const d=setup('Dampen Power');d.target.x=2000;assert.equal(controlEligibility(d.item,d.sel,d.scene).ok,true);d.target.x=2100;assert.equal(controlEligibility(d.item,d.sel,d.scene).ok,false);});
test('copy clones data and effects, not document IDs or original ownership',()=>{const e=setup('Copy Power','Mighty 1');const data=copiedItemData(e.p,{activationId:'x'});assert.equal(data.name,'Mighty 1');assert.equal(data._id,undefined);assert.equal(data.effects[0]._id,undefined);assert.deepEqual(data.system,e.p.system);assert.equal(data.flags[S][COPY].activationId,'x');assert.ok(e.p.effects[0]._id);});
test('copy is usable and removed with concentration; original power remains',async()=>{const e=setup('Copy Power');assert.equal(await resolvePowerControl(e.message,silent),true);const copy=e.a.items.find(i=>i.flags?.[S]?.[COPY]);assert.ok(copy);assert.equal(copiedPowerUsable(copy),true);assert.equal(e.b.items.get(e.p.id),e.p);assert.equal(await resolvePowerControl(e.message,silent),false);await e.a.deleteEmbeddedDocuments('ActiveEffect',[e.fx.id]);assert.equal(copiedPowerUsable(copy),false);await syncPowerControl();assert.equal(e.a.items.get(copy.id),undefined);assert.equal(e.b.items.get(e.p.id),e.p);});
test('Dampen uses Ego defense, no direct damage, variable Focus validated',()=>{const e=setup('Dampen Power');assert.equal(resolvePowerRoll(e.item).attackTarget,'ego');assert.equal(resolvePowerRoll(e.item).checkOnly,true);assert.equal(controlCost(e.p,4).ok,false);assert.equal(controlCost(e.p,7).amount,7);assert.equal(controlCost({system:{cost:'10 Focus'}},3).amount,10);assert.equal(controlCost({system:{cost:''}}).amount,0);});
test('Dampen success charges once, halves range, leaves original intact and expires',async()=>{const e=setup('Dampen Power');assert.equal(await resolvePowerControl(e.message,silent),true);assert.equal(e.a.system.focus.value,25);assert.equal(dampenedPower(e.p),true);assert.equal(resolveItemRange(e.p,e.b).spaces,5);assert.equal(e.p.system.range,'10 spaces');assert.equal(await resolvePowerControl(e.message,silent),false);assert.equal(e.a.system.focus.value,25);await e.a.deleteEmbeddedDocuments('ActiveEffect',[e.fx.id]);await syncPowerControl();assert.equal(dampenedPower(e.p),false);assert.equal(resolveItemRange(e.p,e.b).spaces,10);});
test('Dampen miss neither spends Focus nor changes target',async()=>{const e=setup('Dampen Power');e.message.rolls[0].total=9;assert.equal(await resolvePowerControl(e.message,silent),true);assert.equal(e.a.system.focus.value,30);assert.equal(dampenedPower(e.p),false);assert.equal(e.a.effects.length,0);});
test('M cannot double damage or grant automatic success when dampened',()=>{const r={total:15,isFantastic:true,options:{nativeDampenedPower:true}};assert.equal(getMarvelOutcome(r,14).fantastic,false);assert.equal(getMarvelOutcome(r,20).success,false);assert.equal(getMarvelOutcome({...r,options:{}},14).fantastic,true);});
test('permanent multiplier change is scoped and never edits original effect',()=>{const e=setup('Dampen Power','Mighty 1');e.b.effects.push({flags:{[S]:{[DAMPEN]:{targetItemId:e.p.id}}}});const data={transfer:true,system:{changes:[{key:'system.abilities.mle.damageMultiplier',type:'upgrade',value:'1'},{key:'system.abilities.mle.noncom',type:'upgrade',value:'1'}]}};const fx={...data,parent:e.p,toObject:()=>structuredClone(data)};assert.equal(dampenedTransferData(fx).system.changes[0].value,'0');assert.equal(dampenedTransferData(fx).system.changes[1].value,'1');assert.equal(data.system.changes[0].value,'1');});

test('Dampen Smash reduces attack DM from 5 to 4 before RD, not flat bonuses or other powers',async()=>{
 const e=setup('Dampen Power','Smash');
 const other=power(e.b,'Elemental Blast');
 const {calculateD616Damage}=await import('../scripts/damage-calculation.js');
 assert.equal(dampenedAttackMultiplier(e.p,5),5);
 assert.equal(await resolvePowerControl(e.message,silent),true);
 const dm=dampenedAttackMultiplier(e.p,5);
 assert.equal(dm,4);
 const result=calculateD616Damage({marvelDie:6,damageMultiplier:dm,damageReduction:2,ability:6,bonus:2});
 assert.equal(result.effectiveDamageMultiplier,2);
 assert.equal(result.damage,20);
 assert.equal(dampenedAttackMultiplier(other,5),5);
 assert.equal(dampenedAttackMultiplier(e.p,0),0);
 await e.a.deleteEmbeddedDocuments('ActiveEffect',[e.fx.id]);await syncPowerControl();
 assert.equal(dampenedAttackMultiplier(e.p,5),5);
});
test('Dampen ordinary direct attack loses one DM without description matching',async()=>{
 const e=setup('Dampen Power','Elemental Blast');
 assert.equal(await resolvePowerControl(e.message,silent),true);
 assert.equal(dampenedAttackMultiplier(e.p,4),3);
});
test('Dampen does not double-reduce transferred passive DM or summoned weapon',()=>{
 const e=setup('Dampen Power','Mighty 1');
 e.b.effects.push({flags:{[S]:{[DAMPEN]:{targetItemId:e.p.id}}}});
 assert.ok(e.p.effects.length);
 assert.equal(dampenedAttackMultiplier(e.p,4),4);
 const weapon={type:'weapon',id:'sword',actor:e.b,flags:{[S]:{nativeVenomSwordWeapon:{sourceItemId:e.p.id}}}};
 assert.equal(dampenedPower(weapon),true);
 assert.equal(dampenedAttackMultiplier(weapon,4),4);
});
test('attack card snapshots reduced DM and GM uses snapshot before damage reduction',()=>{
 const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(source,/const finalDamageMultiplier = dampenedAttackMultiplier\(this,undampenedAttackDM\)/);
 assert.match(source,/finalDM: finalDamageMultiplier,\s*dampenPenalty/);
 assert.match(source,/const damageMultiplier = Number\.isFinite\(Number\(dmFlags\.finalDM\)\)\s*\? Number\(dmFlags\.finalDM\)/);
});
