import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativePowerDescriptionHtml,nativePowerResultMessage} from '../scripts/native-power-chat.mjs';
import {executeNativeSupportTransaction} from '../scripts/native-power-support.mjs';

const catalog=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const power=(name,set)=>{
  const item=catalog.find(x=>x.name===name&&x.system.powerSet===set);
  assert.ok(item,`${set}::${name} must exist in the actual power catalog`);
  return item;
};

test('v201: Scatter presents both ORIGINAL catalog fields and action/duration, without dropping its automation receipt',()=>{
  const item=power('Scatter','Tactics');
  const result=nativePowerResultMessage(item,'<p>Darkstep: Caído.</p><p>Focus gasto: 10.</p>');
  assert.match(result.flavor,/power: Scatter/);
  assert.ok(result.content.includes(item.system.description));
  assert.ok(result.content.includes(item.system.effect));
  assert.match(result.content,/Ação:<\/span>.*Reaction/);
  assert.match(result.content,/Duração:<\/span>.*Instant/);
  assert.match(result.content,/Custo:<\/span>.*10 focus/);
  assert.match(result.content,/Darkstep: Caído/);
  assert.match(result.content,/Focus gasto: 10/);
  assert.equal((result.content.match(/class="mcpd-card"/g)||[]).length,1);
});

test('v201: other registered support powers also show their descriptions, not just the effect of the automation',()=>{
  for(const [name,set] of [['Healing Hands','Healing'],['Soothing Touch','Healing'],
    ['Hit the Dirt','Tactics'],['Rally on Me','Tactics'],['Battle Plan','Tactics'],
    ['Inspiration','Basic'],['Lucky You','Luck'],['Jinx You','Luck'],
    ['Evil Eye','Luck'],['Focus Fire','Tactics']]){
    const item=power(name,set),chat=nativePowerResultMessage(item,'<p>Automação aplicada.</p>');
    assert.ok(chat.content.includes(item.system.description),name);
    assert.ok(chat.content.includes(item.system.effect),name);
    assert.match(chat.content,/Automação aplicada/,name);
    assert.match(chat.content,/class="mcpd-card"/,name);
  }
});

test('v201: stored rich text is preserved and dynamic metadata is escaped',()=>{
  const item={name:'Power <b>Important</b>',system:{description:'<p><strong>Details</strong></p>',
    effect:'<ul><li>First</li></ul>',action:'<script>alert(1)</script>',duration:'Instant'}};
  const chat=nativePowerResultMessage(item,'<p>Done.</p>');
  assert.match(chat.content,/<strong>Details<\/strong>/);
  assert.match(chat.content,/<ul><li>First<\/li><\/ul>/);
  assert.doesNotMatch(chat.content,/<script>/);
  assert.match(chat.content,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(chat.flavor,/&lt;b&gt;Important&lt;\/b&gt;/);
  assert.match(chat.content,/Done/);
});

test('v201: missing description and effect do not render empty placeholders',()=>{
  const chat=nativePowerResultMessage({name:'Homebrew',system:{action:'Standard'}},'<p>Applied.</p>');
  assert.doesNotMatch(chat.content,/undefined|null/);
  assert.match(chat.content,/Ação/);
  assert.match(chat.content,/Applied/);
});

test('v201: GM Scatter transaction publishes official description plus real targets and expenditure ONCE',async()=>{
  const item={...power('Scatter','Tactics')};
  const caster={id:'caster',uuid:'Actor.caster',name:'Zima',effects:[],statuses:[],
    system:{focus:{value:100,max:120},attributes:{rank:{value:3}}},
    async update(patch){if(patch['system.focus.value']!==undefined)this.system.focus.value=patch['system.focus.value'];}};
  item.actor=caster;caster.items={contents:[item]};
  const ally={id:'ally',uuid:'Actor.ally',name:'Darkstep',effects:[],statuses:new Set(),
    async toggleStatusEffect(status,{active}){assert.equal(status,'mmrpg.prone');if(active)this.statuses.add(status);}};
  const scene={id:'scene',grid:{size:100},tokens:{contents:[]}};
  const source={id:'source',actorId:caster.id,actor:caster,disposition:1,parent:scene};
  const target={id:'target',actorId:ally.id,actor:ally,disposition:1,parent:scene};
  scene.tokens.contents=[source,target];scene.tokens.get=id=>scene.tokens.contents.find(t=>t.id===id);
  const combat={id:'combat',started:true,combatants:[{actor:caster,actorId:caster.id}]};
  const saved={game:globalThis.game,ChatMessage:globalThis.ChatMessage};
  const messages=[];let tracker=0;
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',isGM:true}},
    multiverseD616:{turnTracker:{getState:()=>({reactionUsed:0,reactionMax:1}),async trackItemUse(){tracker++;}}}};
  globalThis.ChatMessage={getSpeaker:()=>({alias:'Zima'}),async create(data){messages.push(data);return data;}};
  try{
    const result=await executeNativeSupportTransaction({caster,item,scene,sourceToken:source,targetTokens:[target],spent:10,combat});
    assert.equal(result.ok,true);
    assert.equal(caster.system.focus.value,90);
    assert.equal(ally.statuses.has('mmrpg.prone'),true);
    assert.equal(tracker,1);
    assert.equal(messages.length,1,'one chat message, no duplicated rules card');
    assert.ok(messages[0].content.includes(item.system.description));
    assert.ok(messages[0].content.includes(item.system.effect));
    assert.match(messages[0].content,/Darkstep: Caído/);
    assert.match(messages[0].content,/Focus gasto: 10/);
    assert.match(messages[0].flavor,/power: Scatter/);
  }finally{globalThis.game=saved.game;globalThis.ChatMessage=saved.ChatMessage;}
});
