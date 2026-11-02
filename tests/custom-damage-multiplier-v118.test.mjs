import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CUSTOM_DAMAGE_MODES,normalizeCustomRule,getCustomRules,
  customDamageBonusForTarget,applyCustomDamageMultiplier,
} from '../scripts/custom-automations.mjs';
import {calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';
const ns='multiverse-d616';
const multiply=(factor=2)=>({effectType:'damageBonus',damageBonusMode:'multiplier',damageMultiplierFactor:factor});
const flat=(amount=5)=>({effectType:'damageBonus',damageBonusMode:'fixed',damageBonusAmount:amount});
const rule=(effects,extra={})=>normalizeCustomRule({
  id:'rule-x',name:'Dano especial',trigger:'targetHit',powerName:'Elemental Blast',
  hitOutcome:'fantastic',effects,...extra,
});
const settings=(rules)=>({get:(_,key)=>({customAutomationRules:rules,customAutomationsEnabled:true,disableAllAutomations:false})[key]});
const actors=()=>({actor:{statuses:new Set(),effects:[],system:{abilities:{mle:{value:5}}}},
  targetActor:{statuses:new Set(),effects:[],system:{abilities:{agl:{defense:13}}}},
  item:{type:'power',name:'Elemental Blast'},outcome:{success:true,fantastic:true}});
const bonuses=(rules,args={})=>customDamageBonusForTarget({...actors(),settings:settings(rules),...args});

test('v118: multiplier is a bounded predefined option, only for confirmed-hit rules',()=>{
  assert.match(CUSTOM_DAMAGE_MODES.multiplier,/Multiplicar/);
  assert.equal(rule([multiply(2)]).effects[0].damageMultiplierFactor,2);
  assert.equal(rule([multiply(3)]).effects[0].damageMultiplierFactor,3);
  for(const value of [0,1,4,1.5,-2,'invalid',null])
    assert.throws(()=>rule([multiply(value)]),/Multiplicador de dano/);
  assert.throws(()=>normalizeCustomRule({...rule([multiply(2)]),trigger:'powerRoll'}),/Após acertar um alvo/);
  assert.equal(Object.hasOwn(rule([multiply(2)]).effects[0],'script'),false);
});

test('v118: strongest multiplier wins; additive bonuses still accumulate and zero prerequisites block',()=>{
  const r1=rule([flat(5),multiply(2)],{id:'r1'});
  const r2=rule([multiply(3),flat(2)],{id:'r2'});
  const result=bonuses([r1,r2]);
  assert.equal(result.bonus,7);
  assert.equal(result.multiplier,3);
  assert.equal(result.sources.filter(s=>s.mode==='multiplier').length,1);
  assert.equal(result.sources.filter(s=>s.mode==='multiplier')[0].ruleId,'r2');
  assert.equal(bonuses([r1],{outcome:{success:true,fantastic:false}}).multiplier,1);
  assert.equal(bonuses([r1],{outcome:{success:false,fantastic:true}}).bonus,0);
  assert.equal(bonuses([r1],{item:{type:'power',name:'Outra Magia'}}).multiplier,1);
  const target=actors().targetActor;target.statuses.add('mmrpg.poisoned');
  const conditional=rule([multiply(2)],{requiresStatus:'mmrpg.poisoned',statusSubject:'target'});
  assert.equal(bonuses([conditional]).multiplier,1);
  assert.equal(bonuses([conditional],{targetActor:target}).multiplier,2);
  assert.equal(bonuses([r1],{settings:settings([{...r1,enabled:false}])}).multiplier,1);
});

test('v118: applied after native DR and Fantastic factor, includes raw damage for shields',()=>{
  const result=bonuses([rule([flat(5),multiply(2)])]);
  const base=calculatePowerDamage({powerName:'Elemental Blast',marvelDie:5,damageMultiplier:5,
    damageReduction:2,ability:3,bonus:result.bonus,fantastic:true,enabled:true});
  const calculated=applyCustomDamageMultiplier(base,result.multiplier);
  assert.equal(calculated.damage,base.damage*2);
  assert.equal(calculated.rawDamage,base.rawDamage*2);
  assert.equal(calculated.damageReduction,2);
  assert.equal(calculated.powerDamageFactor,2);
  assert.equal(base.damage,2*(5*(5-2)+3+5));
  assert.equal(calculated.damage,92);
  const zero=calculatePowerDamage({powerName:'Venom Burst',marvelDie:5,damageMultiplier:5,
    damageReduction:2,ability:3,bonus:5,fantastic:false,enabled:true});
  assert.equal(applyCustomDamageMultiplier(zero,3).damage,0);
  const half=calculatePowerDamage({powerName:'Fast Attacks',marvelDie:4,damageMultiplier:4,
    damageReduction:2,ability:3,bonus:0,fantastic:false,enabled:true});
  assert.equal(applyCustomDamageMultiplier(half,2).damage,half.damage*2);
  assert.equal(applyCustomDamageMultiplier(base,100),base,'invalid factors are ignored');
});

test('v118: previous custom rules survive, new multiplier appears in both effect editors and saved schema',()=>{
  const legacy=normalizeCustomRule({id:'old',name:'Original',trigger:'targetHit',powerName:'Elemental Blast',
    effectType:'damageBonus',damageBonusMode:'fixed',damageBonusAmount:6});
  assert.equal(legacy.effects[0].damageMultiplierFactor,2);
  assert.equal(getCustomRules(settings([legacy,rule([multiply(2)])])).length,2);
  const ui=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(ui, /data-damage-multiplier/);
  assert.match(ui, /data-extra-damage-multiplier/);
  assert.match(ui, /damageMultiplierFactor:field\('damageMultiplierFactor'\)\?\.value/);
  assert.match(ui, /'damageMultiplierFactor','enabled'/);
  assert.match(engine,/applyCustomDamageMultiplier\(calculatePowerDamage\(/);
  assert.match(engine,/customDamageMultiplier:customDamage\.multiplier/);
});
