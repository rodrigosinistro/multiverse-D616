import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CUSTOM_DAMAGE_MODES,CUSTOM_DAMAGE_ABILITIES,normalizeCustomRule,getCustomRules,
  customDamageBonusForTarget,ruleEffects,syncCustomTargetRules,
} from '../scripts/custom-automations.mjs';
import {calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';
import {rollSignature} from '../scripts/multi-target-combat.mjs';
const ns='multiverse-d616';
const bonus=(n=5)=>({effectType:'damageBonus',damageBonusMode:'fixed',damageBonusAmount:n});
const byAttribute=(damageAbility='mle')=>({effectType:'damageBonus',damageBonusMode:'ability',damageAbility});
const rule=(effects=[bonus()],other={})=>normalizeCustomRule({id:'damage1',name:'Impacto extra',trigger:'targetHit',powerName:'Elemental Blast',hitOutcome:'success',effects,...other});
const fakeSettings=(rules)=>({get(_ns,key){return ({customAutomationRules:rules,customAutomationsEnabled:true,disableAllAutomations:false})[key];}});
const makeActors=()=>({
  attacker:{name:'Herói',statuses:new Set(),effects:[],system:{abilities:{mle:{value:6},agl:{value:4},log:{value:3}}}},
  enemy:{name:'Alvo',statuses:new Set(),effects:[],system:{abilities:{agl:{defense:12}}}},
  item:{type:'power',name:'Elemental Blast',system:{attack:true}},
});
function actual(ruleSet,options={}){
  const actors=makeActors();
  return customDamageBonusForTarget({...actors,actor:actors.attacker,targetActor:actors.enemy,
    outcome:{success:true,fantastic:false},settings:fakeSettings(ruleSet),...options});
}
test('v117: allow bounded fixed and ability bonuses on confirmed target-hit trigger only',()=>{
  assert.equal(CUSTOM_DAMAGE_MODES.fixed,'Valor fixo adicional');
  assert.equal(Object.keys(CUSTOM_DAMAGE_ABILITIES).length,6);
  assert.equal(rule().effects[0].damageBonusAmount,5);
  assert.equal(rule([byAttribute('log')]).effects[0].damageAbility,'log');
  for(const n of [0,-3,1.5,101,'INVALID'])assert.throws(()=>rule([bonus(n)]),/Dano adicional fixo/);
  assert.throws(()=>rule([byAttribute('unknown')]),/Selecione o atributo/);
  assert.throws(()=>rule([{effectType:'damageBonus',damageBonusMode:'arbitrary',damageBonusAmount:5}]),/tipo de dano adicional/);
  assert.throws(()=>normalizeCustomRule({...rule(),trigger:'powerRoll'}),/Após acertar um alvo/);
  assert.throws(()=>normalizeCustomRule({...rule(),trigger:'passiveAttack'}),/passivos/);
  assert.equal(Object.hasOwn(rule(), 'script'),false);
});
test('v117: calculate individually, stack additive actions, use only positive actual ability values',()=>{
  const r1=rule([bonus(5),byAttribute('mle')]);
  const r2=rule([bonus(3)],{id:'r2',name:'Outro bônus'});
  assert.deepEqual(actual([r1,r2]).bonus,14);
  assert.deepEqual(actual([r1,r2]).sources.map(s=>s.amount),[5,6,3]);
  const result=actual([r1],{actor:{...makeActors().attacker,system:{abilities:{mle:{value:-4}}}}});
  assert.equal(result.bonus,5,'atributo negativo não causa dano negativo');
});
test('v117: proper trigger, power, per-target fantastic, prerequisites and switches',()=>{
  const r=rule([bonus(6)],{hitOutcome:'fantastic',requiresStatus:'mmrpg.bleeding',statusSubject:'target'});
  const a=makeActors();
  assert.equal(actual([r]).bonus,0,'sem condição exigida');
  a.enemy.statuses.add('mmrpg.bleeding');
  assert.equal(actual([r],{...a,actor:a.attacker,targetActor:a.enemy}).bonus,0,'acerto comum não satisfaz SF');
  assert.equal(actual([r],{...a,actor:a.attacker,targetActor:a.enemy,outcome:{success:true,fantastic:true}}).bonus,6);
  assert.equal(actual([r],{...a,actor:a.attacker,targetActor:a.enemy,outcome:{success:false,fantastic:true}}).bonus,0);
  assert.equal(actual([r],{...a,item:{type:'power',name:'Outro Poder'},actor:a.attacker,targetActor:a.enemy,outcome:{success:true,fantastic:true}}).bonus,0);
  assert.equal(actual([r],{...a,actor:a.attacker,targetActor:a.enemy,outcome:{success:true,fantastic:true},settings:fakeSettings([{...r,enabled:false}])}).bonus,0);
  assert.equal(actual([r],{...a,actor:a.attacker,targetActor:a.enemy,outcome:{success:true,fantastic:true},settings:{get:(_,key)=>key==='disableAllAutomations'?true:key==='customAutomationRules'?[r]:true}}).bonus,0);
});
test('v117: native damage calculation gets bonus BEFORE the power damage factor and preserves DR, half damage and raw protection amount',()=>{
  const added=actual([rule([bonus(5)])]).bonus;
  const params={powerName:'Fast Attacks',marvelDie:4,damageMultiplier:4,damageReduction:2,
    ability:3,bonus:added,fantastic:false,enabled:true};
  const value=calculatePowerDamage(params);
  assert.equal(value.powerDamageFactor,0.5);
  assert.equal(value.damage,Math.ceil((4*(4-2)+3+5)*0.5));
  assert.equal(value.rawDamage,Math.ceil((4*4+3+5)*0.5));
  const venom=calculatePowerDamage({...params,powerName:'Venom Burst'});
  assert.equal(venom.damage,0,'nativo Venom Burst continua sem dano no sucesso comum');
  const fantastic=calculatePowerDamage({...params,powerName:'Fast Attacks',fantastic:true});
  assert.equal(fantastic.damage,4*(4-2)+3+5);
});
test('v117: compatibility with earlier rule format and sequences',()=>{
  const previous=normalizeCustomRule({id:'old',name:'Antiga',trigger:'powerRoll',powerName:'Venom Burst',effectType:'chat',message:'ok'});
  assert.equal(getCustomRules(fakeSettings([previous,rule()])).length,2);
  assert.equal(previous.effects.length,1);
  assert.equal(ruleEffects(rule([bonus(),{effectType:'chat',message:'Terminado'}])).length,2);
});
test('v117: bonus action is not executed as a second damage pass after card confirmation',async()=>{
  const customRule=rule([bonus(5),{effectType:'chat',message:'Acertou!'}]);
  const old={game:globalThis.game,fromUuid:globalThis.fromUuid,ChatMessage:globalThis.ChatMessage};
  const actors=makeActors();actors.attacker.id='a1';actors.attacker.items=new Map([['p',{id:'p',...actors.item}]]);
  const uri='Scene.s1.Token.t1';const flags={itemId:'p',targets:[{uuid:uri}],powerTargetNumber:10,attackTarget:'agl'};
  const roll={total:15,isFantastic:true};const chat=[];
  flags.customDamageConfirmation={confirmed:true,rollSignature:rollSignature(roll),results:[{targetUuid:uri,delta:12}]};
  const message={id:'m',speaker:{actor:'a1'},rolls:[roll],getFlag:(_,key)=>flags[key],async setFlag(_,key,value){flags[key]=value;}};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:fakeSettings([customRule]),
    scenes:new Map([['s1',{tokens:{get:()=>null}}]]),actors:new Map([['a1',actors.attacker]])};
  globalThis.fromUuid=async targetUuid=>targetUuid===uri?{actor:actors.enemy,documentName:'Token',uuid:uri,parent:{}}:null;
  globalThis.ChatMessage={create:async data=>{chat.push(data);},getSpeaker:()=>({})};
  try{
    const result=await syncCustomTargetRules(message);
    assert.equal(result,1,'chat only executes after confirmation');
    assert.equal(chat.length,1);
    assert.deepEqual(flags.customTargetExecutions,[`damage1|${uri}|1`]);
    assert.equal(await syncCustomTargetRules(message),0);
    assert.equal(chat.length,1);
  }finally{Object.assign(globalThis,old);}
});
test('v117: real UI and original damage card include the bonus before MMDR, without adding a second Health update',()=>{
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
  assert.match(ui,/data-damage-effect/);
  assert.match(ui,/data-extra-damage-fixed/);
  assert.match(ui,/data-effect-field="damageBonusMode"/);
  assert.match(ui,/damageBonusAmount:field\('damageBonusAmount'\)/);
  assert.match(engine,/const customDamage=customDamageBonusForTarget/);
  assert.match(engine,/bonus:focusBonus\+customDamage.bonus/);
  assert.match(engine,/customDamageBonus:customDamage.bonus/);
  assert.match(mmdr,/await applyExactEntries\(exactEntries, action,modes,message\)/);
});
