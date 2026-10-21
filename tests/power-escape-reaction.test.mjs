import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {attemptPowerEscape,canReactToEscape,offerEscapeReaction} from '../scripts/power-escapes.mjs';
function mock({used=0,ack=true,withinTurn=false}={}){
 const fx={id:'fx1',disabled:false,flags:{'multiverse-d616':{powerCondition:{powerName:'Elemental Grab',status:'grabbed',messageId:'m1',sourceActorUuid:'Actor.caster',recipientUuid:'Actor.target',sourceItemId:'item'}}}};
 const target={uuid:'Actor.target',name:'Alvo',effects:[fx],system:{abilities:{mle:{value:2}}},getRollData:()=>({abilities:{mle:{value:2}}}),testUserPermission:()=>true};
 const c={id:'c',actor:target,tokenId:'tok',sceneId:'scene'};
 const caster={id:'caster',system:{abilities:{mle:{defense:16}}},items:{get:()=>({name:'Elemental Grab'})}};
 const original={id:'m1',speaker:{actor:'caster'},getFlag:(_ns,key)=>key==='itemId'?'item':null};
 const gm={id:'gm',isGM:true},owner={id:'owner',isGM:false};let spent=0,posted=null;
 globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
 globalThis.canvas={tokens:{controlled:[{actor:target,document:{id:'tok',parent:{id:'scene'}}}]}};
 globalThis.game={user:owner,users:{get:id=>id==='gm'?gm:owner},actors:new Map([['caster',caster]]),scenes:new Map(),messages:new Map([['m1',original]]),combat:{started:true,combatant:withinTurn?c:{id:'other'},combatants:[c]},
  settings:{get:()=>0},multiverseD616:{turnTracker:{getState:()=>({actionUsed:0,actionMax:1,reactionUsed:used,reactionMax:1}),consumeReaction:async()=>{spent++;return ack;},consumeAction:async()=>{throw Error('should not consume action');}}}};
 globalThis.ui={notifications:{warn(){}}};
 globalThis.ChatMessage={getSpeaker:()=>({actor:'target'})};
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class{async evaluate(){return this;}async toMessage(data){posted=data;return {};}}}};
 return{target,get spent(){return spent;},get posted(){return posted;}};
}
test('Reação imediata fora do turno gasta reação e gera rolagem de escape',async()=>{
 const x=mock();const id='m1|Actor.target';assert.equal(canReactToEscape(x.target,{id}),true);
 assert.equal(await attemptPowerEscape(x.target,id,{mode:'reaction'}),true);
 assert.equal(x.spent,1);assert.equal(x.posted.flags['multiverse-d616'].escapeAttempt.mode,'reaction');
 assert.match(x.posted.flavor,/Reação/);
});
test('Reação já utilizada ou negada pelo Mestre impede a rolagem',async()=>{
 const a=mock({used:1});assert.equal(canReactToEscape(a.target,{id:'m1|Actor.target'}),false);
 assert.equal(await attemptPowerEscape(a.target,'m1|Actor.target',{mode:'reaction'}),false);assert.equal(a.spent,0);
 const b=mock({ack:false});assert.equal(await attemptPowerEscape(b.target,'m1|Actor.target',{mode:'reaction'}),false);
 assert.equal(b.spent,1);assert.equal(b.posted,null);
});
test('cancelar convite não consome reação; Reação pode ser usada fora do turno',async()=>{
 const a=mock();globalThis.foundry={applications:{api:{DialogV2:{wait:async(cfg)=>cfg.buttons.find(b=>b.action==='later').callback({},{}),}}}};assert.equal(await offerEscapeReaction(a.target,'m1|Actor.target'),false);assert.equal(a.spent,0);
});
test('integração de turnos confirma gasto por socket e serializa consumo no Mestre',()=>{
 const code=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
 assert.match(code,/consumeReaction: \(combatant\)/);assert.match(code,/waitForAck:true/);
 assert.match(code,/serializeSpend\(payload, requestingUser\)/);assert.match(code,/turnTrackerResult/);
 const escapes=readFileSync(new URL('../scripts/power-escapes.mjs',import.meta.url),'utf8');
 assert.match(escapes,/createActiveEffect/);assert.match(escapes,/offeredReactions/);assert.match(escapes,/Escapar com Reação/);
});
