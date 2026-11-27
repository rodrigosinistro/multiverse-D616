import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createTurnTrackerResult,turnTrackerResultForRecipient,
} from '../scripts/combat/turn-tracker-result-protocol.mjs';
// The tracker registers hooks when loaded; no live Foundry UI is required.
globalThis.Hooks ??= {on(){},once(){}};
const {authorizedTurnSocketSender}=await import('../scripts/combat/turn-tracker.mjs');
const GM={id:'gm-id',isGM:true};
const PLAYER={id:'p1-id',isGM:false};
const OTHER={id:'p2-id',isGM:false};
const USERS=new Map([GM,PLAYER,OTHER].map(u=>[u.id,u]));
const ack=(recipient=PLAYER.id,success=true)=>createTurnTrackerResult({requestId:'rid-1',senderUserId:GM.id,recipientUserId:recipient,success});

function deliver(packet,senderId,viewerId,pendingId='rid-1'){
  const sender=authorizedTurnSocketSender(packet,senderId,USERS);
  return !!sender&&turnTrackerResultForRecipient(packet,sender,viewerId)&&packet.requestId===pendingId;
}

test('v210: GM acknowledgement of a player Reaction reaches the requesting client',()=>{
  const packet=ack();
  assert.equal(packet.userId,GM.id,'userId must denote authenticated sender, NEVER recipient');
  assert.equal(packet.recipientUserId,PLAYER.id);
  assert.equal(authorizedTurnSocketSender(packet,GM.id,USERS),GM);
  assert.equal(deliver(packet,GM.id,PLAYER.id),true);
  assert.equal(deliver(packet,GM.id,OTHER.id),false,'other client cannot resolve this spend');
});

test('v210: GM negative acknowledgement is delivered; it must not be treated as a successful spend',()=>{
  const packet=ack(PLAYER.id,false);
  assert.equal(deliver(packet,GM.id,PLAYER.id),true);
  assert.equal(packet.success,false);
});

test('v210: spoofed GM and self-declared sender cannot acknowledge or authorize a spend',()=>{
  const packet=ack();
  assert.equal(deliver(packet,PLAYER.id,PLAYER.id),false,'player cannot claim packet sent by GM');
  assert.equal(deliver({...packet,userId:PLAYER.id},PLAYER.id,PLAYER.id),false,'player-origin result forbidden');
  assert.equal(deliver({...packet,userId:PLAYER.id},GM.id,PLAYER.id),false,'sender mismatch forbidden');
  assert.equal(deliver(packet,undefined,PLAYER.id),false,'unverifiable sender forbidden');
  assert.equal(deliver(packet,'unknown',PLAYER.id),false);
});

test('v210: acknowledgement is routed to one recipient and one pending request only',()=>{
  const packet=ack();
  assert.equal(deliver(packet,GM.id,PLAYER.id,'rid-2'),false);
  assert.equal(deliver({...packet,recipientUserId:OTHER.id},GM.id,PLAYER.id),false);
  assert.equal(deliver({...packet,requestId:''},GM.id,PLAYER.id),false);
  assert.equal(deliver({...packet,success:'true'},GM.id,PLAYER.id),false);
});

test('v210: malformed acknowledgements fail closed',()=>{
  for(const payload of [
    {requestId:'rid-1',senderUserId:GM.id,recipientUserId:PLAYER.id},
    {requestId:'',senderUserId:GM.id,recipientUserId:PLAYER.id,success:true},
    {requestId:'rid-1',senderUserId:'',recipientUserId:PLAYER.id,success:true},
    {requestId:'rid-1',senderUserId:GM.id,recipientUserId:'',success:true},
  ])assert.throws(()=>createTurnTrackerResult(payload),/Malformed/);
});

test('v210: both GM success and error paths emit sender-authenticated routed acknowledgements',()=>{
  const src=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
  assert.match(src,/if\(!turnTrackerResultForRecipient\(payload,sender,game\.user\?\.id\)\)return/);
  assert.match(src,/if\(spendAcks\.has\(payload\.requestId\)\)spendAcks\.get\(payload\.requestId\)\(payload\.success\)/);
  const emissions=src.match(/game\.socket\.emit\(SOCKET_NAME,createTurnTrackerResult\(\{/g)??[];
  assert.equal(emissions.length,2,'success and caught-error ACK must both be routed');
  const senders=src.match(/senderUserId:game\.user\.id/g)??[];
  assert.equal(senders.length,2);
  assert.doesNotMatch(src,/type:'turnTrackerResult',requestId:payload\.requestId,userId:requestingUser\.id/);
});
