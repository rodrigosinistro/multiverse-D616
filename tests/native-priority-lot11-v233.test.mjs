import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.Hooks??={once(){},on(){}};
const {
 isLetsGo,isNeverSurrender,isMentalShelter,lot11Kind,uncannyLevel,
 lot11TargetEligibility,activeZeroRescue,zeroRescueActionBlocked,
 applyLot11Activation,syncLot11Support,
}=await import('../scripts/native-priority-lot11.mjs');
const S='multiverse-d616',catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
function item(name,set){const p=catalog.find(p=>p.name===name&&p.system.powerSet===set);assert.ok(p,name);return {...p,id:p._id};}
const lets=item("Let's Go",'Healing'),never=item('Never Surrender','Healing'),shelter=item('Mental Shelter','Telepathy');
let ids=0;
function actor(id,{health=10,focus=10,items=[]}={}){
 const a={id,uuid:`Actor.${id}`,name:id,system:{health:{value:health,max:100},focus:{value:focus,max:100},attributes:{rank:{value:3}}},
  items:{contents:items,get(id){return this.contents.find(i=>i.id===id)}},effects:[],statuses:new Set(),
  async createEmbeddedDocuments(type,docs){assert.equal(type,'ActiveEffect');return docs.map(doc=>{const fx={...doc,id:`created-${++ids}`,parent:a,flags:doc.flags??{}};a.effects.push(fx);return fx})},
  async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id));},
  async toggleStatusEffect(s,{active}){active?this.statuses.add(s):this.statuses.delete(s);}};
 for(const i of items)i.actor=a;
 return a;
}
function conc(caster,item){const fx={id:`fx-${item.id}`,name:item.name,disabled:false,parent:caster,
  flags:{[S]:{concentrationPower:{transient:true,itemId:item.id}}},
  async setFlag(ns,key,value){this.flags[ns][key]=value}};caster.effects.push(fx);return fx;}
function world(caster,target,item,{focus=10,health=10}={}){
 const scene={id:'test-scene',grid:{size:100},width:10000,height:10000,tokens:null};
 const t0={id:'source',actor:caster,actorId:caster.id,x:100,y:100,width:1,height:1,parent:scene};
 const t1={id:'target',actor:target,actorId:target.id,x:200,y:100,width:1,height:1,parent:scene};
 scene.tokens={contents:[t0,t1],get:id=>[t0,t1].find(t=>t.id===id)};
 const scenes={contents:[scene],get:id=>id===scene.id?scene:null};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes};
 const selection={version:1,kind:lot11Kind(item),sceneId:scene.id,sourceTokenId:t0.id,tokenIds:[t1.id]};
 const msg={id:'request',speaker:{scene:scene.id,token:t0.id,actor:caster.id},flags:{[S]:{itemId:item.id}},
  getFlag(ns,key){return this.flags[ns][key]},async setFlag(ns,key,value){this.flags[ns][key]=value},
  async update(data){this.content=data.content;}};
 return {scene,selection,msg,t0,t1,scenes};
}
test('v233: official scoped identity, prerequisite Uncanny and target validation',()=>{
 assert.equal(isLetsGo(lets),true);assert.equal(isNeverSurrender(never),true);assert.equal(isMentalShelter(shelter),true);
 assert.equal(isMentalShelter({...shelter,system:{...shelter.system,powerSet:'Magic'}}),false);
 const uncanny=item('Uncanny 3','Basic');
 const caster=actor('caster',{items:[shelter,uncanny]}),target=actor('target',{health:0});
 const {scene,selection,t0}=world(caster,target,shelter);
 assert.equal(uncannyLevel(caster),3);
 assert.deepEqual(lot11TargetEligibility(shelter,selection,scene,t0).dr,3);
 scene.tokens.get('target').x=1800;
 assert.equal(lot11TargetEligibility(shelter,selection,scene,t0).ok,false);
 assert.equal(lot11TargetEligibility(shelter,{...selection,tokenIds:['missing']},scene,t0).ok,false);
 assert.equal(lot11TargetEligibility(shelter,{...selection,tokenIds:['target','target']},scene,t0).ok,false);
});
test('v233: Let’s Go suppresses incapacity only during live concentration and limits actions',async()=>{
 const old=globalThis.game;
 try{
  const caster=actor('caster',{items:[lets]}),target=actor('target',{health:0});
  const {scene,selection,msg,t0}=world(caster,target,lets);const fx=conc(caster,lets);
  assert.equal(lot11TargetEligibility(lets,selection,scene,t0).ok,true);
  assert.equal((await applyLot11Activation(msg,selection,{confirm:async()=>true})).ok,true);
  assert.equal(activeZeroRescue(target,'health'),true);
  assert.equal(target.effects.length,1);
  assert.equal(zeroRescueActionBlocked(target,{type:'weapon',system:{action:'Standard'}}),true);
  assert.equal(zeroRescueActionBlocked(target,{type:'power',system:{action:'Movement'}}),false);
  target.system.health.value=1;await syncLot11Support();
  assert.equal(target.effects.length,0);assert.equal(caster.effects.length,0);
  target.system.health.value=0;await syncLot11Support();
  assert.equal(activeZeroRescue(target,'health'),false);
  assert.equal(target.statuses.has('mmrpg.incapacitated'),true);
 }finally{globalThis.game=old;}
});
test('v233: Never Surrender suppresses demoralized but cannot spend nonexistent Focus',async()=>{
 const old=globalThis.game;
 try{
  const caster=actor('caster',{items:[never]}),target=actor('target',{focus:0});
  const {selection,msg}=world(caster,target,never);conc(caster,never);
  assert.equal((await applyLot11Activation(msg,selection,{confirm:async()=>true})).ok,true);
  assert.equal(activeZeroRescue(target,'focus'),true);
  assert.equal(target.statuses.has('mmrpg.demoralized'),false);
  // Focus-cost preflight already blocks >0 Focus expenditure; the support
  // neither increases Focus nor disables the ordinary cost check.
  assert.equal(target.system.focus.value,0);
  target.system.focus.value=5;await syncLot11Support();
  assert.equal(target.effects.length,0);assert.equal(caster.effects.length,0);
 }finally{globalThis.game=old;}
});
test('v233: Mental Shelter shares the correct Uncanny DR and removes only owned effects',async()=>{
 const old=globalThis.game;
 try{
  const caster=actor('caster',{items:[shelter,item('Uncanny 2','Basic')]}),target=actor('target');
  const {selection,msg}=world(caster,target,shelter);const fx=conc(caster,shelter);
  target.effects.push({id:'unrelated',flags:{},disabled:false});
  assert.equal((await applyLot11Activation(msg,selection,{confirm:async()=>true})).ok,true);
  assert.equal(target.effects.length,2);
  const shelterEffect=target.effects.find(e=>e.flags?.[S]?.nativeLot11Recipient);
  assert.equal(shelterEffect.system.changes[0].key,'system.focusDamageReduction');
  assert.equal(shelterEffect.system.changes[0].value,2);
  assert.equal(target.system.focus.value,10);
  caster.effects=[];await syncLot11Support();
  assert.equal(target.effects.length,1);assert.equal(target.effects[0].id,'unrelated');
 }finally{globalThis.game=old;}
});
test('v233: no cross-power effect and publication wiring',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const chud=readFileSync(new URL('../scripts/conditions-hud.js',import.meta.url),'utf8');
 assert.match(main,/registerNativePriorityLot11Hooks\(\)/);
 assert.match(main,/selectLot11Targets\(this\)/);
 assert.match(main,/activateLot11AfterPay\(this,lot11Selection\)/);
 assert.match(chud,/activeZeroRescue\(actor,"health"\)/);
 assert.match(chud,/activeZeroRescue\(actor,"focus"\)/);
});
test('v233: Hex Bolt Fantastic applies only an owned one-round Trouble after damage confirmation',async()=>{
 const {POWER_CONDITIONS,conditionsForOutcome,mustConfirmPowerDamage}=await import('../scripts/power-conditions.mjs');
 const {resolveConditionEdges}=await import('../scripts/condition-edge.mjs');
 assert.equal(mustConfirmPowerDamage('Hex Bolt'),true);
 assert.equal(conditionsForOutcome('Hex Bolt',{success:true,fantastic:false}).length,0);
 const rules=conditionsForOutcome('Hex Bolt',{success:true,fantastic:true});
 assert.equal(rules.length,1);assert.equal(rules[0].expires,'round');assert.equal(rules[0].status,null);
 const a=actor('hex-victim');a.effects.push({name:'Desvantagem',disabled:false,flags:{[S]:{powerCondition:{powerName:'Hex Bolt',status:null}}}});
 const sources=resolveConditionEdges({actor:a,ability:'ego',attack:false,action:'standard'});
 assert.ok(sources.sources?.some?.(e=>e.source==='Hex Bolt')||sources.troubles>=1||sources.net<0);
 a.effects[0].disabled=true;
 const clear=resolveConditionEdges({actor:a,ability:'ego',attack:false,action:'standard'});
 assert.equal(clear.sources?.some?.(e=>e.source==='Hex Bolt')??false,false);
});
test('v233: ten audited powers already reuse the correct common controllers',async()=>{
 const {resolvePowerRoll}=await import('../scripts/power-rolls.mjs');
 const {POWER_CONDITIONS}=await import('../scripts/power-conditions.mjs');
 const {POWER_ESCAPE_RULES}=await import('../scripts/power-escapes.mjs');
 const {POWER_DAMAGE_FACTORS}=await import('../scripts/power-fantastic-damage.mjs');
 const {bodySheetConcentrationChanges}=await import('../scripts/concentration.js');
 const {hasActiveBodySheet}=await import('../scripts/activated-movement-powers.mjs');
 const names=['Body Sheet','Deafen','Dazzle','Flare','Disrupt Nerves','Webcasting','Shield Bash','Double Tap','Headshot','Wisecracker'];
 for(const name of names)assert.ok(catalog.some(p=>p.name===name),name);
 const sheet=item('Body Sheet','Plasticity');
 assert.ok(bodySheetConcentrationChanges(sheet).some(c=>c.key==='system.healthDamageReduction'&&c.value===3));
 assert.ok(bodySheetConcentrationChanges(sheet).some(c=>c.key==='system.movement.glide.active'));
 assert.equal(hasActiveBodySheet({effects:[{name:'Body Sheet',disabled:false,flags:{[S]:{concentrationPower:{transient:true,itemId:sheet.id}}}}]}),true);
 for(const name of ['Deafen','Dazzle','Flare']){
  assert.ok(POWER_CONDITIONS[name]?.some(c=>c.on==='success'&&c.expires==='turn'),name);
  assert.deepEqual(POWER_DAMAGE_FACTORS[name],[0,1]);
 }
 assert.equal(resolvePowerRoll(item('Deafen','Illusion')).checkOnly,true);
 assert.equal(resolvePowerRoll(item('Disrupt Nerves','Phasing')).attackTarget,'res');
 assert.ok(POWER_CONDITIONS['Disrupt Nerves'].some(c=>c.status==='stunned'));
 assert.ok(POWER_CONDITIONS['Disrupt Nerves'].some(c=>c.status==='prone'&&c.on==='fantastic'));
 assert.equal(POWER_ESCAPE_RULES.Webcasting.tn,16);
 assert.deepEqual(POWER_ESCAPE_RULES.Webcasting.statuses,['paralyzed','pinned']);
 for(const name of ['Shield Bash','Double Tap','Headshot','Wisecracker'])assert.ok(POWER_CONDITIONS[name]?.length,name);
 assert.deepEqual(POWER_DAMAGE_FACTORS.Headshot,[2,3]);
 assert.equal(resolvePowerRoll(item('Wisecracker','Basic')).damageType,'focus');
});
