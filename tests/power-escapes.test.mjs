import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {POWER_ESCAPE_RULES,listPowerEscapes,effectiveEscapeTN,resolvePowerEscapeMessage,attemptPowerEscape} from '../scripts/power-escapes.mjs';
import {POWER_CONDITIONS,conditionsForOutcome} from '../scripts/power-conditions.mjs';
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const sourceItem=name=>items.find(p=>p.name===name);
const names=['Elemental Grab','Telekinetic Grab','Webgrabbing','Webcasting','Crimson Bands of Cyttorak','Hellfire Chains','Coiling Crush'];
test('escapes possuem regras que constam literalmente nas descrições do compêndio',()=>{
 for(const name of names){
  const rule=POWER_ESCAPE_RULES[name];const entry=sourceItem(name);
  assert.ok(rule&&entry,name);assert.equal(rule.ability,'mle');
  assert.ok((rule.tn&&[16,20].includes(rule.tn))||rule.defense==='mle');
  assert.ok(/escap|libert|libertar|libertar-se|Libertar|libertar-se/i.test(entry.system.effect),name);
 }
 assert.equal(POWER_ESCAPE_RULES['Mists of Morpheus'],undefined,'não inventa CD para acordar');
});
test('Mists fantástico soma Sono profundo enquanto Concentração, sem CD inventada',()=>{
 assert.deepEqual(conditionsForOutcome('Mists of Morpheus',{success:true,fantastic:false}).map(e=>e.status),['stunned']);
 const fantastic=conditionsForOutcome('Mists of Morpheus',{success:true,fantastic:true});
 assert.equal(fantastic.length,2);assert.equal(fantastic[1].label,'Sono profundo');
 assert.equal(fantastic[1].concentration,true);assert.equal(fantastic[1].status,null);
});
function env({power='Elemental Grab',status='grabbed',total=23, tn=null, includeSpecial=false}={}){
 const source={uuid:'Actor.s',id:'s',system:{abilities:{mle:{defense:17}}},items:new Map([['p1',{name:power}]])};
 const original={id:'m1',speaker:{actor:'s'},getFlag:(ns,key)=>key==='itemId'?'p1':null};
 const fx=(id,st,flags={})=>({id,disabled:false,flags:{'multiverse-d616':{powerCondition:{messageId:'m1',recipientUuid:'Actor.t',sourceActorUuid:'Actor.s',sourceItemId:'p1',powerName:power,status:st,...flags}}}});
 const owned=fx('own',status),other=fx('other',status,{messageId:'different'}),manual={id:'manual',disabled:false,flags:{}};
 const effects=[owned,other,manual];if(includeSpecial)effects.push(fx('elemental','paralyzed',{ruleIndex:100,element:'ice'}));
 const target={uuid:'Actor.t',effects,
  async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');for(const id of ids){const i=effects.findIndex(e=>e.id===id);if(i>=0)effects.splice(i,1);}return [];},
  testUserPermission(){return true;}};
 const fakeUsers=new Map([['gm',{id:'gm',isGM:true}],['owner',{id:'owner',isGM:false}]]);
 const msgFlags={escapeAttempt:{version:1,id:'m1|Actor.t',power,ability:'mle',tn:tn??POWER_ESCAPE_RULES[power].tn??null,defense:POWER_ESCAPE_RULES[power].defense??null,sourceMessageId:'m1',sourceActorUuid:'Actor.s',recipientUuid:'Actor.t',sourceItemId:'p1',actorUuid:'Actor.t'}};
 const result={id:'escape1',author:{id:'owner'},rolls:[{total,isFantastic:false,terms:[]}],getFlag(ns,k){return msgFlags[k];},async setFlag(ns,k,v){msgFlags[k]=v;}};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'},get:k=>fakeUsers.get(k)},scenes:new Map(),actors:new Map([['s',source]]),messages:new Map([['m1',original]])};
 globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
 globalThis.fromUuid=async uuid=>uuid==='Actor.t'?target:null;
 return{source,owned,other,manual,effects,target,original,result,msgFlags};
}
test('HUD lista apenas restrições com procedência e agrupa vários status do mesmo acerto',()=>{
 const e=env({power:'Telekinetic Grab'});
 e.effects.push({...e.owned,id:'pinned',flags:{'multiverse-d616':{powerCondition:{...e.owned.flags['multiverse-d616'].powerCondition,status:'pinned'}}}});
 const options=listPowerEscapes(e.target);
 assert.equal(options.length,2);assert.equal(options.find(o=>o.id==='m1|Actor.t').power,'Telekinetic Grab');assert.equal(options[0].tn,20);
});
test('sucesso remove somente condições de imobilização criadas pelo card específico',async()=>{
 const e=env({power:'Elemental Grab',includeSpecial:true});
 assert.equal(await resolvePowerEscapeMessage(e.result),true);
 assert.deepEqual(e.effects.map(x=>x.id),['other','manual','elemental']);
 assert.equal(e.msgFlags.escapeResolution.label,'LIBERTOU-SE');
});
test('falha preserva status e registra resultado sem apagar efeito manual',async()=>{
 const e=env({power:'Webgrabbing',total:10});
 await resolvePowerEscapeMessage(e.result);
 assert.deepEqual(e.effects.map(x=>x.id),['own','other','manual']);
 assert.equal(e.msgFlags.escapeResolution.label,'CONTINUA PRESO');
});
test('Coiling Crush usa defesa de Melee do controlador atual, não TN fictícia',async()=>{
 const e=env({power:'Coiling Crush',status:'paralyzed',total:16});
 assert.equal(effectiveEscapeTN(listPowerEscapes(e.target)[0],e.source),17);
 await resolvePowerEscapeMessage(e.result);
 assert.equal(e.effects.some(x=>x.id==='own'),true);
 e.result.rolls[0].total=18;
 await resolvePowerEscapeMessage(e.result);
 assert.equal(e.effects.some(x=>x.id==='own'),false);
});
test('mensagem de terceiro sem permissão NÃO remove condição',async()=>{
 const e=env();e.target.testUserPermission=()=>false;
 assert.equal(await resolvePowerEscapeMessage(e.result),false);
 assert.equal(e.effects.length,3);
});
test('estado já liberado não recria efeitos se rolagem posteriormente é modificada',async()=>{
 const e=env();await resolvePowerEscapeMessage(e.result);
 e.result.rolls[0].total=3;
 assert.equal(await resolvePowerEscapeMessage(e.result),true);
 assert.deepEqual(e.effects.map(x=>x.id),['other','manual']);
});
test('HUD integra o botão Escapar e consumo de uma ação do Controle de Turno',()=>{
 const hud=readFileSync(new URL('../scripts/native-action-hud.mjs',import.meta.url),'utf8');
 const tracker=readFileSync(new URL('../scripts/combat/turn-tracker.mjs',import.meta.url),'utf8');
 assert.match(hud,/listPowerEscapes\(actor\)/);assert.match(hud,/choosePowerEscape\(actor,/);
 assert.match(tracker,/consumeAction: .*resources: \['action'\]/);
});

function mockAttempt({actions=0,onTurn=true}={}){
 const e=env();e.target.getRollData=()=>({abilities:{mle:{value:2}}});
 e.target.system={abilities:{mle:{value:2}}};
 let applied=0,created=null;
 const combatant={id:'c1',actor:e.target,tokenId:'t1',sceneId:'scene'};
 const token={actor:e.target,document:{id:'t1',parent:{id:'scene'}}};
 globalThis.canvas={tokens:{controlled:[token]}};
 game.user={id:'owner',isGM:false};
 game.combat={started:true,combatant:onTurn?combatant:{id:'other'},combatants:[combatant]};
 game.multiverseD616={turnTracker:{getState:()=>({actionUsed:actions,actionMax:1}),consumeAction:async()=>{applied++;return true;}}};
 game.settings={get:()=>0};
 globalThis.ChatMessage={getSpeaker:()=>({actor:'t'})};
 globalThis.CONFIG={Dice:{MarvelMultiverseRoll:class {
  constructor(formula,data){this.formula=formula;this.data=data;}
  async evaluate(){return this;}
  async toMessage(data){created=data;return {};}
 }}};
 let notice='';globalThis.ui={notifications:{warn:m=>{notice=m;}}};
 return{e,get applied(){return applied;},get created(){return created;},get notice(){return notice;}};
}
test('jogador rola Melee vs TN20 no próprio turno, gastando uma ação padrão',async()=>{
 const m=mockAttempt();
 assert.equal(await attemptPowerEscape(m.e.target,'m1|Actor.t'),true);
 assert.equal(m.applied,1);assert.equal(m.created.flags['multiverse-d616'].escapeAttempt.targetNumber,20);
 assert.match(m.created.flavor,/Melee/);
});
test('escape não gasta ação nem rola fora do turno ou sem ação padrão disponível',async()=>{
 const a=mockAttempt({onTurn:false});assert.equal(await attemptPowerEscape(a.e.target,'m1|Actor.t'),false);
 assert.equal(a.applied,0);
 const b=mockAttempt({actions:1});assert.equal(await attemptPowerEscape(b.e.target,'m1|Actor.t'),false);
 assert.equal(b.applied,0);
});
