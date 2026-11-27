import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {naturalSixM6,combatAttackLabel,combatChatVisibleOutcome,
  combatChatPublicResolution,combatChatDamageBreakdown} from '../scripts/combat-chat-v164.mjs';
import {checkPowerOutcome} from '../scripts/power-rolls.mjs';
import {calculateD616Damage} from '../scripts/damage-calculation.js';

const SYS='multiverse-d616';
const term=n=>({dice:[{results:[{result:n,active:true,discarded:false}]}]});
const ultimate=(options={})=>({terms:[{roll:{terms:[{rolls:[term(6),term(1),term(6)]}]}}],total:24,options});
const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../css/multiverse-d616.css',import.meta.url),'utf8');

test('v164 recognizes a real natural 6 M 6 in the Foundry nested pool',()=>{
  assert.equal(naturalSixM6(ultimate()),true);
  assert.equal(naturalSixM6({...ultimate(),terms:[{rolls:[term(6),term(1),term(6)]}]}),true);
  assert.equal(naturalSixM6(ultimate({forceMarvelM:true})),false);
  assert.equal(naturalSixM6(ultimate({combatTrickery:true})),false);
  assert.equal(naturalSixM6(ultimate({ultimateFantasticApplied:true})),false);
  const notUltimate=ultimate();notUltimate.terms[0].roll.terms[0].rolls[2]=term(5);
  assert.equal(naturalSixM6(notUltimate),false);
});

test('v164 has five separate results; 6 M 6 beats any target number',()=>{
  const states=[
    [{success:true,fantastic:false},'ACERTOU'],
    [{success:false,fantastic:false},'ERROU'],
    [{success:true,fantastic:true},'ACERTO FANTÁSTICO'],
    [{success:false,fantastic:true},'FALHA FANTÁSTICA'],
    [{success:true,fantastic:true},'SUCESSO FANTÁSTICO',true],
  ];
  for(const [outcome,label,auto] of states)
    assert.equal(combatAttackLabel(outcome,{ultimate:!!auto}),label);
  assert.equal(combatAttackLabel({pending:true}), 'REVISAR EDGE/TROUBLE');
  assert.equal(checkPowerOutcome(24,50,{fantastic:true,ultimate:true}).success,true);
  assert.equal(checkPowerOutcome(24,50,{fantastic:true,ultimate:false}).success,false);
});

test('v164 only GM knows attack result before confirmation; player sees ?? and ATAQUE REALIZADO',()=>{
  const id='Scene.X.Token.Y';const outcome={success:true,fantastic:true};
  assert.equal(combatChatVisibleOutcome({isGM:true,liveOutcome:outcome}), 'ACERTO FANTÁSTICO');
  assert.equal(combatChatVisibleOutcome({isGM:false,targetUuid:id,liveOutcome:outcome}),'ATAQUE REALIZADO');
  const resolved=combatChatPublicResolution([{targetUuid:id,label:'ACERTO FANTÁSTICO',category:'health',defense:40}],
    [{targetUuid:id,delta:28,defense:40,damageMultiplier:7}],{signature:'the-roll'});
  assert.equal(combatChatVisibleOutcome({resolved,targetUuid:id}),'ACERTO FANTÁSTICO');
  assert.equal(resolved.targets[0].damage,28);
  assert.equal(JSON.stringify(resolved).includes('defense'),false);
  assert.equal(JSON.stringify(resolved).includes('damageMultiplier'),false);
});

test('v164 public results handle misses, fantastic failures, multiple targets and applied HALF damage',()=>{
  const outcomes=[{targetUuid:'A',label:'ACERTOU'},{targetUuid:'B',label:'FALHA FANTÁSTICA'},
    {targetUuid:'C',label:'SUCESSO FANTÁSTICO'}];
  const release=combatChatPublicResolution(outcomes,[{targetUuid:'A',delta:12},{targetUuid:'C',delta:24}],{action:'half',signature:'x'});
  assert.deepEqual(release.targets.map(t=>t.damage),[12,0,24]);
  assert.equal(release.targets[1].label,'FALHA FANTÁSTICA');
  assert.equal(release.targets[2].label,'SUCESSO FANTÁSTICO');
  assert.equal(release.action,'half');
});

test('v164 damage preserves native RD multiplier-before-fantastic calculation and zero DM',()=>{
  const common={marvelDie:6,damageMultiplier:5,damageReduction:2,ability:6};
  assert.deepEqual(calculateD616Damage({...common,fantastic:false}),
    {damage:24,damageReduction:2,effectiveDamageMultiplier:3});
  assert.equal(calculateD616Damage({...common,fantastic:true}).damage,48);
  assert.equal(calculateD616Damage({...common,damageReduction:6,fantastic:true}).damage,0);
  const breakdown=combatChatDamageBreakdown({marvelDie:6,damageMultiplier:5,
    damageReduction:2,effectiveDamageMultiplier:3,abilityDamage:6,
    normalDamage:24,damage:48,fantastic:true});
  assert.equal(breakdown.normal,24);assert.equal(breakdown.final,48);
  assert.equal(breakdown.effective,3);assert.equal(breakdown.fantastic,true);
});

test('v164 dice and 3 Edge/Trouble per-die controls are intact, Trouble locked on natural 6 M 6',()=>{
  const tooltip=readFileSync(new URL('../templates/chat/roll-breakdown.hbs',import.meta.url),'utf8');
  assert.match(tooltip,/data-index="\{\{@index\}\}"/);
  assert.match(tooltip,/data-retro-action="edge"/);
  assert.match(tooltip,/data-retro-action="trouble"/);
  assert.match(main,/naturalUltimateRoll && action === "trouble"/);
  assert.match(main,/action === "trouble" && naturalSixM6\(chatMessage\.rolls\?\.\[0\]\)/);
  assert.match(main,/const naturalUltimate = !suppressFantastic\(attackRoll,this\)&&\(naturalSixM6\(attackRoll\)/);
});

test('v164 GM attack displays all 3 controls and hooks existing damage/guard pipeline; players cannot apply',()=>{
  assert.match(main,/data-m616-quick="full">DANO/);
  assert.match(main,/data-m616-quick="half">1\/2 DANO/);
  assert.match(main,/data-m616-quick="heal">CURA/);
  assert.match(main,/if \(isGM && !isCheck && targets\.length\)/);
  assert.match(mmdr,/game\.multiverseD616\.applyAttackQuickAction = applyAttackQuickAction/);
  assert.match(mmdr,/return await confirmDamageMessage\(card,action,null,null\)/);
  assert.match(mmdr,/await applyExactEntries\(exactEntries, action,modes,message\)/);
  assert.match(mmdr,/renderGuardSelector\(entry,card\)/);
});

test('v164 GM-only calculation is hidden by default and title chevron opens native details',()=>{
  assert.match(main,/document\.createElement\('details'\)/);
  assert.match(main,/details\.className='m616-v164-details'/);
  assert.match(main,/<summary>Resolução do Dano <i class="fas fa-chevron-right" aria-hidden="true"><\/i><small>Detalhes<\/small><\/summary>/);
  assert.match(style,/\.m616-v164-details\[open\] summary i\s*\{/);
  assert.match(main,/if\(isGM\)\{\s*const details=document\.createElement/);
  assert.doesNotMatch(main,/details\.open\s*=\s*true/);
});

test('v164 release remains private and no second damage confirmation is possible',()=>{
  assert.match(main,/msgData\.whisper=gmIds/);
  assert.match(main,/!game\.user\?\.isGM \|\| this\.getFlag\("multiverse-d616", "mmdrResolved"\)/);
  assert.match(mmdr,/message\.getFlag\(MODULE_ID,'mmdrResolved'\)/);
  assert.match(mmdr,/pendingDamageCards\.has\(message\.id\)/);
  assert.match(mmdr,/combatChatPublicResolution\(snapshot\.chatOutcomeRecords\?\?\[\],receipt/);
  assert.match(main,/const released = this\.getFlag\("multiverse-d616", "combatChatResolution"\)/);
});

test('v164 ultimate 6-M-6 ignores target-specific Edge/Trouble review even for mixed targets',async()=>{
  const {adjudicateTargetOutcome}=await import('../scripts/multi-target-combat.mjs');
  const auto={success:true,fantastic:true,ultimate:true,label:'SUCESSO FANTÁSTICO'};
  const a=adjudicateTargetOutcome(auto,{requiresReview:true});
  const b=adjudicateTargetOutcome(auto,{requiresReview:true,decision:'miss'});
  assert.deepEqual([a.success,a.pending,b.success,b.pending],[true,false,true,false]);
});
