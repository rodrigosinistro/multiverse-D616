import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {combatResolutionWasPublished,installPlayerCombatChatAutoScroll} from '../scripts/combat-chat-player-scroll.mjs';
const mmdr=readFileSync(new URL('../scripts/damage-reduction-helper.js',import.meta.url),'utf8');

test('v200: only real, nonempty published damage receipts trigger the player event',()=>{
 const resolution={signature:'roll-1',targets:[{id:'t1',damage:8}]};
 assert.equal(combatResolutionWasPublished({flags:{'multiverse-d616':{combatChatResolution:resolution}}}),true);
 assert.equal(combatResolutionWasPublished({'flags.multiverse-d616.combatChatResolution':resolution}),true);
 assert.equal(combatResolutionWasPublished({flags:{'multiverse-d616.combatChatResolution':resolution}}),true);
 for(const change of [{flags:{'multiverse-d616':{targets:[1]}}},{flags:{'multiverse-d616':{combatChatResolution:{targets:[]}}}},{content:'new roll'},{}])
  assert.equal(combatResolutionWasPublished(change),false);
});
test('v200: player scrolls on GM damage release; GM and ordinary card updates do not',()=>{
 const calls={};const hooks={on:(name,cb)=>calls[name]=cb};let gm=false,scrolls=0;
 assert.equal(installPlayerCombatChatAutoScroll({hooks,isGM:()=>gm,scroll:()=>{scrolls++;return Promise.resolve(true);}}),true);
 assert.deepEqual(Object.keys(calls),['updateChatMessage']);
 const source={getFlag:()=>({signature:'roll-1',targets:[{id:'t1'}]})};
 const update={flags:{'multiverse-d616':{combatChatResolution:{signature:'roll-1',targets:[{id:'t1'}]}}}};
 calls.updateChatMessage(source,{content:'new roll'});assert.equal(scrolls,0);
 calls.updateChatMessage(source,update);assert.equal(scrolls,1);
 gm=true;calls.updateChatMessage(source,update);assert.equal(scrolls,1);
 gm=false;calls.updateChatMessage({getFlag:()=>({targets:[],signature:'roll-1'})},update);assert.equal(scrolls,1);
});
test('v200: listener installs in the existing damage-helper module, no global auto-scroll',()=>{
 assert.match(mmdr,/installPlayerCombatChatAutoScroll\(\)/);
 assert.ok(!mmdr.includes('Hooks.on("updateChatMessage"'));
});
