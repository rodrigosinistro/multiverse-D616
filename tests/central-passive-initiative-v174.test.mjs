import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCombatantInitiativeRoll} from '../scripts/combat/initiative-passive-roll.mjs';
import {normalizeCustomRule,passivePowerBenefits,CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY} from '../scripts/custom-automations.mjs';
const source=()=>readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const rule=normalizeCustomRule({id:'test',name:'Lightning Actions',powerName:'Lightning Actions',trigger:'passivePower',enabled:true,effects:[{effectType:'extraAction'},{effectType:'extraReaction'},{effectType:'initiativeMarvelM'}]});
const settings={get(_ns,key){if(key===CUSTOM_RULES_KEY)return [rule];if(key===CUSTOM_RULES_ENABLED_KEY)return true;return false;}};
const makeActor=(owned)=>({items:owned?[{name:'Lightning Actions',type:'power'}]:[]});
class MarvelRoll {
 constructor(formula,data,options={}) { this.formula=formula;this.data=data;this.options=options; }
}
const native=()=>({formula:'{1d6,1dm,1d6}+@attributes.init.value',data:{attributes:{init:{value:2}}},options:{rollMode:'publicroll'}});
const applyBenefits=(actor)=>passivePowerBenefits(actor,settings);

test('v174: Foundry v14 Combatant gets actual forced initiative roll when owning Lightning Actions',()=>{
 const c={actor:makeActor(true)};
 const roll=prepareCombatantInitiativeRoll(c,native(),MarvelRoll,applyBenefits);
 assert.ok(roll instanceof MarvelRoll);
 assert.equal(roll.formula,'{1d6,1dm,1d6}+@attributes.init.value');
 assert.equal(roll.data.attributes.init.value,2);
 assert.equal(roll.options.rollMode,'publicroll');
 assert.equal(roll.options.forceMarvelM,true);
 assert.equal(roll.options.initiativePassiveMarvelM,true);
 assert.equal(applyBenefits(c.actor).extraActions,1);
 assert.equal(applyBenefits(c.actor).extraReactions,1);
});

test('v174: Combatants without the owned power keep native initiative roll unchanged',()=>{
 const original=native();
 assert.equal(prepareCombatantInitiativeRoll({actor:makeActor(false)},original,MarvelRoll,applyBenefits),original);
 assert.equal(prepareCombatantInitiativeRoll({},original,MarvelRoll,applyBenefits),original);
});

test('v174: already customized MarvelRoll is preserved with forced M option',()=>{
 const original=new MarvelRoll('f',{a:1},{edgeMode:1});
 const result=prepareCombatantInitiativeRoll({actor:makeActor(true)},original,MarvelRoll,applyBenefits);
 assert.equal(result,original);
 assert.equal(result.options.edgeMode,1);
 assert.equal(result.options.forceMarvelM,true);
});

test('v174: system hooks Combatant.getInitiativeRoll in v14 and converts on evaluate before initiative is committed',()=>{
 const text=source();
 assert.match(text,/class MarvelMultiverseCombatant extends \(CONFIG\.Combatant\?\.documentClass \?\? foundry\.documents\.Combatant\)/);
 assert.match(text,/getInitiativeRoll\(formula\) \{[\s\S]*?prepareCombatantInitiativeRoll\(this, super\.getInitiativeRoll\(formula\),/);
 assert.match(text,/CONFIG\.Combatant\.documentClass = MarvelMultiverseCombatant;/);
 assert.match(text,/async evaluate\(options = \{\}\) \{[\s\S]*?await super\.evaluate\(options\);[\s\S]*?evaluated\.applyForcedMarvelM\?\.\(\);/);
 assert.match(text,/active\.result = 1;/);
 assert.match(text,/active\.count = 6;/);
 assert.match(text,/const oldPoolTotal = pool \? Number\(pool\.total\) : NaN;/);
 assert.match(text,/pool\._total = oldPoolTotal \+ delta;/);
 assert.match(text,/this\.options\.ultimateFantasticApplied = true;/);
});

test('v174: automatic M conversion maintains 6 numeric value and is never a natural 6 M 6',()=>{
 const text=source();
 const start=text.indexOf('  applyForcedMarvelM() {');
 assert.ok(start>0);
 const open=text.indexOf('{',start);
 let depth=0,end=-1;
 for(let i=open;i<text.length;i++){
  if(text[i]==='{')depth++;
  if(text[i]==='}'&&!--depth){end=i+1;break;}
 }
 assert.ok(end>0);
 const func=text.slice(start,end).replace('applyForcedMarvelM() {','function applyForcedMarvelM() {');
 class PoolTerm { constructor(die,face){this.die=die;this.face=face;this._total=face+3+2;}get total(){return this.die._total+this.face+2;} }
 const act=new Function('foundry',`return (${func.trim()})`)({dice:{terms:{PoolTerm,ParentheticalTerm:class{}}}});
 for(const face of [2,6]){
   const die={results:[{result:face,count:face,active:true,discarded:false}],_total:face};
   const pool=new PoolTerm(die,4);
   const before=4+face+2+1;
   const roll={_evaluated:true,options:{forceMarvelM:true},validD616Roll:true,
     dice:[{},die,{}],terms:[pool,{}],_total:before,total:before};
   assert.equal(act.call(roll),true);
   assert.equal(die.results[0].result,1,'M is represented by die face 1');
   assert.equal(die.results[0].count,6,'M counts as numeric 6');
   assert.equal(roll._total,before+6-face);
   assert.equal(pool._total,4+6+2);
   assert.equal(roll.options.ultimateFantasticApplied,true);
   assert.equal(act.call(roll),false,'cannot apply twice');
 }
});
