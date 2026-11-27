import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAdvance,isWebtrapping,isPhaseSelf,phaseSelfActive,phasePhysicalContact,
 advanceEligibility,validateAdvanceCredit,validCells,webtrappingRegionData,
 webtrapExpiry,phaseMoveOptions,ADVANCE_CREDIT,tokenFromTargetRef} from '../scripts/native-priority-lot3.mjs';
const S='multiverse-d616';
const official=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url))).items;
const power=(name,set)=>{const p=official.find(x=>x.name===name&&x.system.powerSet===set);assert.ok(p);return {...p,id:p._id};};
const actor=(power)=>({id:'a',system:{abilities:{ego:{defense:14}},attributes:{rank:{value:3}}},items:{get:id=>id===power.id?power:null},effects:[]});
const scene={id:'s1',grid:{size:100},width:1000,height:1000};
const phase=power('Phase Self','Phasing'),advance=power('Advance','Tactics'),web=power('Webtrapping','Spider-Powers');
test('v220: native priority 3 identities are scoped to actual sets',()=>{
 assert.equal(isAdvance(advance),true);assert.equal(isWebtrapping(web),true);assert.equal(isPhaseSelf(phase),true);
 assert.equal(isWebtrapping({...web,system:{...web.system,powerSet:'Magic'}}),false);
 assert.equal(isAdvance({...advance,type:'trait'}),false);
});
test('v220: Phase Self is bound exclusively to its LIVE Concentration effect',()=>{
 const self=actor(phase),target=actor(phase);
 assert.equal(phaseSelfActive(self),false);assert.equal(phasePhysicalContact(self,target),true);
 const fx={disabled:false,flags:{[S]:{concentrationPower:{itemId:phase.id,transient:true}}}};
 self.effects.push(fx);
 assert.equal(phaseSelfActive(self),true);
 assert.equal(phasePhysicalContact(self,target),false);
 assert.equal(phasePhysicalContact(self,target,'focus'),true,'Focus/mental is not physical Health');
 target.effects.push({...fx});assert.equal(phasePhysicalContact(self,target),true,'phased attackers can reach phased targets');
 fx.disabled=true;assert.equal(phaseSelfActive(self),false,'ending Concentration ends phasing');
});
test('v220: Advance demands a combat, selected enemy and Ego defense, no silent allegiance',()=>{
 const a=actor(advance);advance.actor=a;
 const before=globalThis.game;
 globalThis.game={user:{isGM:true},users:{activeGM:{id:'gm'}}};
 try{
  assert.equal(advanceEligibility(advance,{combat:{started:false},enemyToken:{actor:{}}}).ok,false);
  assert.equal(advanceEligibility(advance,{combat:{started:true},enemyToken:null}).ok,false);
  assert.equal(advanceEligibility(advance,{combat:{started:true},enemyToken:{actor:{}}}).limit,14);
 }finally{globalThis.game=before;}
});
test('v220: Advance grants exactly one toward-enemy movement in same combat/round/turn',()=>{
 const combat={started:true,id:'combat',round:2,turn:1},combatant={id:'ally',sceneId:'s1'};
 const enemy={id:'e',x:500,y:0,width:1,height:1,parent:scene};
 const credit={version:1,combatId:'combat',round:2,turn:1,combatantId:'ally',sceneId:'s1',enemyTokenId:'e',maximum:5,gridSize:100};
 const options={combat,combatant,source:{x:0,y:0},destination:{x:300,y:0},enemy,maximum:5};
 assert.equal(validateAdvanceCredit(credit,options).valid,true);
 assert.equal(validateAdvanceCredit(credit,{...options,destination:{x:-100,y:0}}).valid,false);
 assert.equal(validateAdvanceCredit(credit,{...options,destination:{x:600,y:0}}).valid,false);
 assert.equal(validateAdvanceCredit(credit,{...options,combat:{...combat,round:3}}).valid,false);
 assert.equal(validateAdvanceCredit({...credit,combatantId:'other'},options).valid,false);
 assert.equal(ADVANCE_CREDIT,'nativeAdvanceFreeMovement');
});
test('v220: Webtrapping validates up to 5 orthogonally connected unique squares',()=>{
 const cells=[{col:1,row:1},{col:2,row:1},{col:2,row:2},{col:1,row:2},{col:0,row:2}];
 assert.equal(validCells(cells,scene),true);
 assert.equal(validCells(cells.slice(0,2),scene),true);
 assert.equal(validCells([] ,scene),false);
 assert.equal(validCells([...cells,{col:0,row:1}],scene),false);
 assert.equal(validCells([cells[0],cells[0]],scene),false);
 assert.equal(validCells([cells[0],{col:6,row:6}],scene),false);
 assert.equal(validCells([{col:11,row:0}],scene),false);
 const region=webtrappingRegionData(cells,scene,{sourceMessageId:'m',expiresWorldTime:2700});
 assert.equal(region.shapes.length,5);assert.equal(region.shapes[0].type,'rectangle');
 assert.equal(region.behaviors[0].type,'modifyMovementCost');
 assert.equal(region.behaviors[0].system.difficulties.walk,2);
 assert.deepEqual(region.behaviors[1].system.events,['tokenEnter','tokenTurnStart']);
 assert.equal(region.flags[S].nativeWebtrapping.sourceMessageId,'m');
 assert.equal(webtrapExpiry({flags:region.flags},2699),false);
 assert.equal(webtrapExpiry({flags:region.flags},2700),true);
});
test('v220: Phase Self movement bypasses walls only for its explicit move command',()=>{
 const token={id:'a',parent:scene,width:1,height:1};
 const data=phaseMoveOptions(token,{x:248,y:323});
 assert.deepEqual(data,{waypoints:[{x:200,y:300}],constrainOptions:{ignoreWalls:true}});
 assert.throws(()=>phaseMoveOptions(token,{x:-5,y:4}),/fora do mapa/);
 assert.throws(()=>phaseMoveOptions(token,{x:1000,y:100}),/fora do mapa/);
});
test('v220: caller integration includes GM-based region lifecycle, phase guard and escape',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const tracker=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
 const escapes=readFileSync(new URL('../scripts/power-escapes.mjs',import.meta.url),'utf8');
 assert.match(main,/registerNativePriorityLot3Hooks\(\)/);
 assert.match(main,/activateNativeLot3AfterPay\(this,lot3Selection\)/);
 assert.match(main,/phasePhysicalContact\(actor,target,'health'\)/);
 assert.match(tracker,/combatant\.unsetFlag\(SYSTEM_ID,ADVANCE_CREDIT\)/);
 assert.match(tracker,/validateAdvanceCredit/);
 assert.match(escapes,/'Webtrapping': \{ability:'mle',tn:16/);
});
