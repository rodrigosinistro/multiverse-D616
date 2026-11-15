import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatChatPublicResolution} from '../scripts/combat-chat-v164.mjs';
import {eligibleElementalDamageResults} from '../scripts/elemental-fantastic.mjs';
import {elementalAreaReplyMessage} from '../scripts/elemental-advanced.mjs';
const main=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/multiverse-d616.css',import.meta.url),'utf8');
const damage=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');
const areas=readFileSync(new URL('../scripts/elemental-advanced.mjs',import.meta.url),'utf8');
const elemental=readFileSync(new URL('../scripts/elemental-fantastic.mjs',import.meta.url),'utf8');

test('v167 target card has no image and five outcomes use a full-width illustrated status panel',()=>{
  assert.doesNotMatch(main,/<img src="\$\{esc\(img\?\?''\)\}" alt="\$\{esc\(name\)\}">/);
  assert.match(main,/m616-v167-status/);
  assert.match(css,/\.m616-v167-status\{/);
  assert.match(css,/\.m616-v167-status\.is-hit/);
  assert.match(css,/\.m616-v167-status\.is-miss/);
  assert.match(main,/const isUltimate=resultText==='SUCESSO FANTÁSTICO'/);
  assert.match(main,/combatChatVisibleOutcome\(\{isGM:false,resolved:releasedResolution,targetUuid:t\.uuid\}\)/);
});

test('v167 elemental Fantastic preview is never shown before actual damage; final appears once after summary',()=>{
  assert.doesNotMatch(main,/if \(isFantastic && elementalFantastic\?\.key && elementalFantastic\?\.text\)/);
  assert.match(main,/messageContent\.appendChild\(summary\)/);
  assert.doesNotMatch(main,/m616-v167-special/);
  assert.match(damage,/eligibleElementalDamageResults\(receipt,action\)/);
  assert.match(damage,/await postConfirmation\(results, action\)/);
  assert.match(damage,/await postElementalFantasticConfirmation\(message,elementalApplied\)/);
  assert.ok(damage.indexOf('await postConfirmation(results, action)')<damage.indexOf('await postElementalFantasticConfirmation(message,elementalApplied)'));
});

test('v167 only targets with actual positive non-healing damage receive elemental special',()=>{
  const receipts=[{targetUuid:'a',delta:38,blocked:false},{targetUuid:'b',delta:0},
    {targetUuid:'c',delta:100,blocked:true},{targetUuid:'d',delta:2,heal:true}];
  assert.deepEqual([...eligibleElementalDamageResults(receipts,'full')],['a']);
  assert.deepEqual([...eligibleElementalDamageResults(receipts,'half')],['a']);
  assert.equal(eligibleElementalDamageResults(receipts,'heal').size,0);
  assert.match(elemental,/positiveDamageTargetUuids && !positiveDamageTargetUuids\.has/);
});

test('v167 public receipt carries only applied elemental text and no defense or damage breakdown',()=>{
  const released=combatChatPublicResolution(
    [{targetUuid:'scene.token',label:'ACERTO FANTÁSTICO',defense:50}],
    [{targetUuid:'scene.token',delta:38,damageMultiplier:9}],
    {signature:'sig',specials:[{name:'Inquieto Sentinel',label:'Ice',text:'O alvo fica Paralisado por 1 rodada.',internal:55}]});
  assert.equal(released.targets[0].damage,38);
  assert.deepEqual(released.specials,[{name:'Inquieto Sentinel',label:'Ice',text:'O alvo fica Paralisado por 1 rodada.'}]);
  assert.doesNotMatch(JSON.stringify(released),/defense|damageMultiplier|internal/);
});

test('v167 area request waits for GM confirmation, offers approve/reject and acknowledges errors',()=>{
  assert.match(areas,/const pendingAreaRequests=new Map\(\)/);
  assert.match(areas,/async function requestAreaApproval\(/);
  assert.match(areas,/await requestAreaApproval\(message,draw\)/);
  assert.match(areas,/await confirmAreaRequest\(msg,claimed\)/);
  assert.match(areas,/label:'Recusar'/);
  assert.match(areas,/label:'Autorizar desenho'/);
  assert.match(areas,/type:'elemental-area-result'/);
  assert.match(areas,/pendingAreaRequests\.delete\(payload\.requestId\)/);
  assert.match(areas,/reply\(true,'Área criada e aprovada pelo Mestre\.'\)/);
  assert.equal(elementalAreaReplyMessage({ok:true,message:'Área criada'}),'Área criada');
  assert.equal(elementalAreaReplyMessage({ok:false,message:'Concentração expirada'}),'Concentração expirada');
});
