import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scrollCombatChatToResult } from '../scripts/combat-chat-scroll.mjs';

const main = readFileSync(new URL('../multiverse-d616.mjs', import.meta.url), 'utf8');
const mmdr = readFileSync(new URL('../scripts/damage-reduction-helper.js', import.meta.url), 'utf8');

test('v184 explicitly scrolls after combat damage is confirmed, not on every chat message', () => {
  assert.match(mmdr, /dbg\("applied", \{ messageId:message\.id, action, results \}\);\s*\/\/[^\n]+\n\s*void scrollCombatChatToResult\(\);/);
  assert.match(mmdr, /return \{requiresGuardDecision:true\};/);
  assert.match(mmdr, /void scrollCombatChatToResult\(\);\s*return \{requiresGuardDecision:true\};/);
  assert.match(main, /if \(damageCard\?\.id\) void scrollCombatChatToResult\(\);/);
  assert.doesNotMatch(mmdr, /Hooks\.on\(["'](?:createChatMessage|updateChatMessage)["']/);
});

test('v184 uses native Foundry v14 ChatLog scrollBottom and includes a popout', async () => {
  const calls = [];
  const chat = {scrollBottom: async (opts) => calls.push(opts)};
  const frames = [];
  const pending = scrollCombatChatToResult({chat, nextFrame: cb => frames.push(cb)});
  assert.equal(calls.length, 0);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(await pending, true);
  assert.deepEqual(calls, [{popout:true,waitImages:false,scrollOptions:{behavior:'auto',block:'end'}}]);
});

test('v184 never interrupts damage if chat is missing or scrolling fails', async () => {
  assert.equal(await scrollCombatChatToResult({chat:null}),false);
  assert.equal(await scrollCombatChatToResult({chat:{scrollBottom:async()=>{throw Error('ui gone');}},nextFrame:null}),false);
});
