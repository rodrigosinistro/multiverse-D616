import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statusIds,resolveConditionEdges,mandatoryTroubleDieIndex,resolveConditionReroll} from '../scripts/condition-edge.mjs';
const actor=(...s)=>({statuses:new Set(s.map(x=>'mmrpg.'+x)),effects:[]});
const resolve=(a,extra={})=>resolveConditionEdges({actor:a,action:'standard',...extra});
test('registra somente condições ativas e não duplica dois efeitos do mesmo estado',()=>{
 const e={disabled:false,statuses:new Set(['mmrpg.pinned','mmrpg.stunned'])};
 const a={statuses:new Set(['mmrpg.pinned']),effects:[e,{disabled:true,statuses:['mmrpg.demoralized']}]};
 assert.deepEqual([...statusIds(a)].sort(),['mmrpg.pinned','mmrpg.stunned']);
 assert.equal(resolve(a,{ability:'mle'}).troubles,2);
});
test('Desmoralizado/Exausto em qualquer teste e atordoado em ação ou reação',()=>{
 assert.equal(resolve(actor('demoralized'),{ability:'log'}).edgeMode,-1);
 assert.equal(resolve(actor('exhausted'),{ability:'ego'}).edgeMode,-1);
 assert.equal(resolve(actor('stunned'),{action:'reaction'}).edgeMode,-1);
 assert.equal(resolve(actor('stunned'),{action:'movement'}).edgeMode,0);
 assert.equal(resolve(actor('shattered'),{action:'standard'}).edgeMode,-1);
});
test('Pinned usa Melee/Agility mas não prejudica testes de Logic',()=>{
 assert.equal(resolve(actor('pinned'),{ability:'mle'}).net,-1);
 assert.equal(resolve(actor('pinned'),{ability:'agl'}).net,-1);
 assert.equal(resolve(actor('pinned'),{ability:'log'}).net,0);
});
test('Caído distingue ataque próximo, à distância e teste simples',()=>{
 assert.equal(resolve(actor('prone'),{ability:'mle',attack:true,kind:'close'}).net,-1);
 assert.equal(resolve(actor('prone'),{ability:'mle',attack:false}).net,0);
 assert.equal(resolve(actor(),{ability:'agl',attack:true,kind:'ranged',targetActors:[actor('prone')]}).net,-1);
 assert.equal(resolve(actor(),{ability:'mle',attack:true,kind:'close',targetActors:[actor('prone')]}).net,1);
});
test('ataques a Cego, Restrito, Atordoado e Arrasado aplicam Edge sem confundir auto-condições',()=>{
 for(const s of ['blinded','restrained','stunned','shattered']) {
   const result=resolve(actor(),{ability:'ego',attack:true,targetActors:[actor(s)]});
   assert.equal(result.edgeMode,1,s);
 }
 assert.equal(resolve(actor(),{ability:'ego',attack:false,targetActors:[actor('stunned')]}).net,0);
});
test('Agarrado difere conforme ataque seleciona alvo específico',()=>{
 assert.equal(resolve(actor('grabbed'),{attack:true,targeted:true,ability:'mle'}).net,-1);
 assert.equal(resolve(actor('grabbed'),{attack:true,targeted:false,ability:'mle'}).net,1);
 assert.equal(resolve(actor('grabbed'),{attack:false,ability:'mle'}).net,0);
});
test('Edge do poder cancela Trouble da condição em vez de duplicar',()=>{
 const a=resolve(actor('pinned'),{ability:'mle',baseMode:1});
 assert.equal(a.net,0);assert.equal(a.edgeMode,0);assert.equal(a.autoCount,0);
 const b=resolve(actor('prone','pinned'),{ability:'mle',attack:true,baseMode:1});
 assert.equal(b.net,-1);assert.equal(b.troubles,2);
});
test('múltiplos alvos divergentes nunca compartilham um Edge/Trouble só',()=>{
 const mixed=resolve(actor(),{attack:true,ability:'mle',kind:'close',targetActors:[actor('prone'),actor()]});
 assert.equal(mixed.net,0);assert.equal(mixed.ambiguousTargets,true);
 const same=resolve(actor(),{attack:true,ability:'mle',kind:'close',targetActors:[actor('prone'),actor('prone')]});
 assert.equal(same.net,1);assert.equal(same.edges,1);
});
test('condições sensoriais contextuais não geram Trouble genérico',()=>{
 assert.equal(resolve(actor('blinded','deafened'),{attack:false,ability:'log'}).net,0);
});
const die=(face)=>({terms:[{results:[{result:face,active:true,discarded:false}]}]});
const mock=(faces)=>({terms:[{rolls:faces.map(x=>die(x))}]});
test('Trouble obrigatório rerrola o melhor dado, prioriza M, respeita 6-M-6',()=>{
 assert.equal(mandatoryTroubleDieIndex(mock([2,1,5])),1);
 assert.equal(mandatoryTroubleDieIndex(mock([6,4,5])),0);
 assert.equal(mandatoryTroubleDieIndex(mock([6,1,6])),null);
});
test('aplicação de Trouble único delega ao motor de retro Edge existente; Edge deixa escolha ao jogador',async()=>{
 const calls=[];const msg={id:'m',flavor:'test',rolls:[mock([2,1,5])],_handleChatButton:async(...args)=>calls.push(args)};
 await resolveConditionReroll(msg,{autoCount:1,edgeMode:-1});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,3),['trouble','m',1]);
 await resolveConditionReroll(msg,{autoCount:1,edgeMode:1});assert.equal(calls.length,1);
});
test('todas as principais origens de rolagem importam o motor de condições',()=>{
 for(const name of ['multiverse-d616.mjs','scripts/native-action-hud.mjs','scripts/power-escapes.mjs']){
   const src=readFileSync(new URL('../'+name,import.meta.url),'utf8');
   assert.match(src,/resolveConditionEdges/,name);
   assert.match(src,/resolveConditionReroll/,name);
 }
});

test('Force temporário conta como uma única origem mesmo com vários efeitos, sem duplicar Edge do item',()=>{
 const f={disabled:false,flags:{'multiverse-d616':{elementalFantastic:{custom:'forceTrouble'}}}};
 const a={statuses:new Set(),effects:[f,{...f}]};
 const r=resolve(a,{ability:'ego',baseMode:1});
 assert.equal(r.troubles,1);assert.equal(r.edgeMode,0);assert.equal(r.sources.filter(x=>x.source.includes('Force')).length,1);
});

test('Combat Trickery impede Trouble no dado Marvel, mas deixa os outros dados afetados',async()=>{
 const calls=[];const msg={id:'ct',flavor:'ct',rolls:[mock([3,1,5])],
   getFlag:()=>({noMarvelTrouble:true}),_handleChatButton:async(...args)=>calls.push(args)};
 await resolveConditionReroll(msg,{autoCount:1,edgeMode:-1});
 assert.equal(calls.length,1);assert.equal(calls[0][2],2);
});
