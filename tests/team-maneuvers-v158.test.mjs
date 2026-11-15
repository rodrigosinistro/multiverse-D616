import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teamOffensive3ForcesRoll,teamAttackSnapshot,teamFantasticForTarget} from '../scripts/team-maneuvers-effects.mjs';
import {getMarvelOutcome} from '../scripts/power-conditions.mjs';
import {calculatePowerDamage} from '../scripts/power-fantastic-damage.mjs';

function actor(name,rank){return {name,uuid:`Actor.${name}`,system:{attributes:{rank:{value:rank}}}};}
function combatWithOffensive3(attacker){
 const combat={id:'combat',round:4,started:true,
  flags:{'multiverse-d616':{activeTeamManeuvers:[{combatId:'combat',round:4,
   type:'Offensive',level:3,actorUuids:[attacker.uuid]}]}}};
 globalThis.game={combat};
 return combat;
}
function roll(total,face){return {total,terms:[{rolls:[{dice:[{results:[{result:3,active:true}]}]},
 {dice:[{results:[{result:face,active:true}],constructor:{name:'MarvelDie'}}]},
 {dice:[{results:[{result:4,active:true}]}]}]}],options:{}};}
function message(snapshot,targets){return {flags:{'multiverse-d616':{teamAttackBenefits:snapshot,targets}},
 getFlag(ns,key){return this.flags[ns]?.[key]}};}

test('Offensive 3: reusing an already marked eligible target forces the actual Marvel M',()=>{
 const a=actor('Thermal Prime',3),sentinel=actor('Sentinel',3),combat=combatWithOffensive3(a);
 const selectedTargets=[sentinel]; // existing target used without selection again
 assert.equal(teamOffensive3ForcesRoll(a,selectedTargets,combat),true);
 const snapshot=teamAttackSnapshot(a,combat);
 assert.deepEqual(snapshot.levels,[3]);
 const savedMessage=message(snapshot,[{uuid:'Scene.1.Token.existing',actorUuid:sentinel.uuid}]);
 const normal=roll(11,5);
 assert.deepEqual(getMarvelOutcome(normal,12,{message:savedMessage,targetActor:sentinel}),{
  success:true,fantastic:true,label:'SUCESSO FANTÁSTICO'});
 const forced=roll(12,1); // effect in the actual Roll has replaced 5 with M (6)
 assert.equal(teamFantasticForTarget(forced,savedMessage,sentinel).delta,0);
 assert.deepEqual(getMarvelOutcome(forced,12,{message:savedMessage,targetActor:sentinel}),{
  success:true,fantastic:true,label:'SUCESSO FANTÁSTICO'});
 const dmg=calculatePowerDamage({marvelDie:6,damageMultiplier:3,ability:1,
  damageReduction:0,fantastic:true,enabled:false});
 assert.equal(dmg.damage,38); // (6*3 + 1) x2; old roll's normal damage was 16
});

test('Offensive 3: missing, lower-rank or mixed-rank targets never force a shared M',()=>{
 const a=actor('Thermal Prime',3),sentinel=actor('Sentinel',3),weak=actor('Weak',2);
 const combat=combatWithOffensive3(a),snapshot=teamAttackSnapshot(a,combat);
 assert.equal(teamOffensive3ForcesRoll(a,[],combat),false);
 assert.equal(teamOffensive3ForcesRoll(a,[weak],combat),false);
 assert.equal(teamOffensive3ForcesRoll(a,[sentinel,weak],combat),false);
 assert.equal(teamOffensive3ForcesRoll(a,[sentinel,{}],combat),false);
 const mixedRoll=roll(11,5),attack=message(snapshot,[]);
 assert.equal(teamFantasticForTarget(mixedRoll,attack,sentinel).delta,1);
 assert.equal(teamFantasticForTarget(mixedRoll,attack,weak),null);
 assert.equal(getMarvelOutcome(mixedRoll,12,{message:attack,targetActor:weak}).fantastic,false);
 combat.round=5;
 assert.equal(teamOffensive3ForcesRoll(a,[sentinel],combat),false);
});

test('Offensive 3: actual-die force and Fantastic label wired into items and HUD',()=>{
 const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 const hud=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../styles/team-maneuvers.css',import.meta.url),'utf8');
 assert.match(main,/const forceTeamMarvelM = isAttackItem\(this\)/);
 assert.match(main,/combatTrickery\.apply \|\| forceTeamMarvelM/);
 assert.match(main,/rollOptions\.teamOffensive3Forced = true/);
 assert.match(hud,/options\.teamOffensive3Forced=true/);
 assert.match(main,/combatAttackLabel\(result,\{ultimate:naturalUltimate\}\)/);
 const chat=readFileSync(new URL('../scripts/combat-chat-v164.mjs',import.meta.url),'utf8');
 assert.match(chat,/ACERTO FANTÁSTICO/);
 assert.match(main,/Total efetivo: \$\{total\+\(teamFantastic\.delta\?\?0\)\}/);
 assert.match(styles,/m616-team-offensive3-note/);
 const config=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));
 assert.equal(config.version,'0.2.178');
});
