import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseAttackRange,resolveItemRange,tokenGapInSpaces,centerDistanceInSpaces,casterTokenForItem,sightCollision,evaluateAttackTargets,summarizePreflight} from '../scripts/combat-preflight.mjs';
const scene={id:'scene',grid:{size:100,distance:5}};
const caster={id:'a',system:{reach:1,attributes:{rank:{value:3}}}};
const token=(id,x,y=0,extra={})=>({id,name:id,parent:scene,actor:caster,x,y,width:1,height:1,elevation:0,...extra});
const source=token('attacker',0);
const target=token('sentinel',1200);
const item=(name,range,kind='ranged',other={})=>({name,type:'power',system:{range,attackRange:0,attackKind:kind,attackTarget:'agl',...other}});
const run=(i,targets=[target],opts={})=>evaluateAttackTargets({item:i,actor:caster,source,targets,scene,grid:{size:100},...opts});

test('distintos formatos de alcance em inglês, português e multiplicados por Rank',()=>{
  for(const val of ['10 spaces','10 espaços','10 Spaces','10'])assert.deepEqual(parseAttackRange(val,3),{type:'fixed',spaces:10});
  for(const val of ['5 spaces per rank','5 espaços por rank',"5 spaces times the character\'s rank",'5 espaços vezes o rank do personagem','5 spaces times the character\'s rank'])assert.deepEqual(parseAttackRange(val,3),{type:'rank',spaces:15},val);
  assert.equal(parseAttackRange('20 spaces',3).spaces,20);
  assert.equal(parseAttackRange('Reach',3).type,'reach');
  assert.equal(parseAttackRange('Alcance',3).type,'reach');
});
test('alcance ilimitado é reconhecido, mas texto narrativo ambíguo não é inventado',()=>{
  assert.equal(parseAttackRange('Unlimited').spaces,Infinity);
  for(const val of ['Varies','Varia','',null,'Range depends on focus','10 feet','5 spaces within an area'])assert.equal(parseAttackRange(val,3).type,'unknown',val);
  assert.equal(parseAttackRange('5 spaces per rank',0).type,'unknown');
});
test('attackRange positivo prevalece sobre range textual, mas 0 é tratado como não configurado',()=>{
  assert.equal(resolveItemRange(item('Blast','5 spaces','ranged',{attackRange:12}),caster).spaces,12);
  assert.equal(resolveItemRange(item('Blast','5 spaces'),caster).spaces,5);
});
test('poderes legados com alcance explícito na descrição oficial reconhecidos em fichas antigas',()=>{
  assert.equal(resolveItemRange(item('Elemental Grab',''),caster).spaces,15);
  assert.equal(resolveItemRange(item('Telekinetic Grab',''),caster).spaces,15);
  assert.equal(resolveItemRange(item('Elemental Barrier',''),caster).spaces,30);
  assert.equal(resolveItemRange(item('Elemental Push',''),caster).type,'unknown');
});
test('alcance reach considera tamanho dos tokens e reach aumentado',()=>{
  const near=token('close',100),two=token('two',200),huge=token('huge',300,0,{width:3,height:3});
  assert.equal(tokenGapInSpaces(source,near,100),1);
  assert.equal(tokenGapInSpaces(source,two,100),2);
  assert.equal(tokenGapInSpaces(source,source,100),0);
  assert.equal(tokenGapInSpaces(source,huge,100),3);
  const q=item('Knife','Reach','close');
  assert.equal(run(q,[near])[0].warning.length,0);
  assert.match(run(q,[two])[0].warning.join(),/fora do alcance/);
  assert.equal(evaluateAttackTargets({item:q,actor:{system:{reach:4}},source,targets:[two],scene,grid:{size:100}})[0].warning.length,0);
});
test('distância calcula centros em espaços, inclusive tokens grandes e fallback sem grid',()=>{
  assert.equal(centerDistanceInSpaces(source,token('far',1000),scene,{size:100}),10);
  assert.equal(centerDistanceInSpaces(source,token('far',1000),scene,{size:100,measurePath:()=>({distance:25})}),5);
  assert.equal(centerDistanceInSpaces(source,token('far',1000),scene,{size:100,measurePath:()=>({spaces:7})}),7);
});
test('cena SEM GRADE: spaces=0 não substitui distância real do Foundry v14',()=>{
  const gridlessScene={...scene,grid:{type:0,size:100,distance:5}};
  const zeroSteps={isGridless:true,size:100,measurePath:()=>({spaces:0,distance:76.6})};
  assert.equal(centerDistanceInSpaces(source,target,gridlessScene,zeroSteps),76.6/5);
  const far=token('far',1500);
  const result=evaluateAttackTargets({item:item('Elemental Blast','10 spaces'),actor:caster,source,
    targets:[far],scene:gridlessScene,grid:zeroSteps});
  assert.match(result[0].warning.join(),/fora do alcance/);
  assert.equal(result[0].limit,10);
});
test('espaços zero com centros diferentes não pode silenciar alcance mesmo se grid não informar tipo',()=>{
  const zeroResult={size:100,measurePath:()=>({spaces:0,distance:75})};
  assert.equal(centerDistanceInSpaces(source,target,scene,zeroResult),15);
  assert.equal(centerDistanceInSpaces(source,source,scene,zeroResult),0);
  assert.equal(centerDistanceInSpaces(source,target,scene,{size:100,measurePath:()=>({spaces:0})}),12);
});
test('identifica conjurador sintético com token próprio mesmo que wrappers Actor sejam diferentes',()=>{
  const unlinked={...source,id:'unlinked'};
  const unrelated={...source,id:'other',actorId:'not caster'};
  const actor={...caster,id:'a2',isToken:true,token:unlinked};
  const wrapped={document:unlinked,actor:{...actor,uuid:'different'},controlled:true};
  assert.equal(casterTokenForItem(actor,scene,[{document:unrelated,actor:{id:'other'}},wrapped]).id,'unlinked');
});
test('poderes do cenário real têm alcance e alvo corretamente reconhecidos',()=>{
  for(const name of ['Elemental Blast','Elemental Burst']){
    const example=item(name,'10 espaços','ranged',{attack:true});
    const far=token('Sentinel',1500,0);
    const result=run(example,[far],{grid:{size:100,measurePath:()=>({spaces:0,distance:75})}});
    assert.equal(result[0].limit,10);
    assert.match(result[0].warning.join(),/fora do alcance/);
  }
});
test('seleção do conjurador só aceita token daquele personagem na cena',()=>{
  const other={...token('other',0),actor:{id:'other'}};
  const own={document:source,actor:caster,controlled:false};
  const mine={document:{...source,id:'controlled'},actor:caster,controlled:true};
  assert.equal(casterTokenForItem(caster,scene,[other,own,mine]).id,'controlled');
  assert.equal(casterTokenForItem(caster,scene,[other,own]).id,'attacker');
  assert.equal(casterTokenForItem(caster,scene,[other]),null);
});
test('o teste de visão chama API oficial v14 e lida com bloqueio/erro sem presumir visão',()=>{
  const calls=[];
  const cls={testCollision:(a,b,config)=>{calls.push([a,b,config]);return true;}};
  assert.equal(sightCollision({source,target,scene,polygonClass:cls}),'blocked');
  assert.equal(calls[0][2].type,'sight');
  assert.equal(calls[0][2].mode,'any');
  assert.equal(sightCollision({source,target,scene,polygonClass:{testCollision:()=>false}}),'clear');
  assert.equal(sightCollision({source,target,scene,polygonClass:{testCollision:()=>{throw Error('API');}}}),'unknown');
  assert.equal(sightCollision({source,target,scene,polygonClass:null}),'unknown');
});
test('diferenças de elevação não são interpretadas como bloqueio 2D',()=>{
  assert.equal(sightCollision({source,target:{...target,elevation:20},scene,polygonClass:{testCollision:()=>true}}),'unknown');
});
test('apenas ataques conhecidos fora do alcance são sinalizados; desconhecido não gera falso positivo',()=>{
  assert.match(run(item('Elemental Blast','10 spaces'))[0].warning.join(),/fora do alcance/);
  assert.equal(run(item('Elemental Blast','20 spaces'))[0].warning.length,0);
  assert.equal(run(item('Mental Attack',''))[0].warning.length,0);
  assert.equal(run(item('Elemental Blast','10 spaces'),[],{}).length,0);
});
test('paredes de visão são avisadas sem bloquear ou interpretar toda parede como visão',()=>{
  assert.match(run(item('Blast','20 spaces'),[target],{polygonClass:{testCollision:()=>true}})[0].warning.join(),/linha de visão/);
  assert.equal(run(item('Blast','20 spaces'),[target],{polygonClass:{testCollision:()=>false}})[0].warning.length,0);
  assert.equal(run(item('Slash','Reach','close'),[target],{polygonClass:{testCollision:()=>true}})[0].sight,'not-checked');
});
test('Prison e Sphere mantêm posicionamento especializado sem aviso incorreto no alvo',()=>{
  assert.deepEqual(run(item('Elemental Prison','')) ,[]);
  assert.deepEqual(run(item('Elemental Sphere','')) ,[]);
});
test('sumário de warnings omite alvos regulares, preserva observações para o Mestre',()=>{
  const good=run(item('Blast','20 spaces'));
  const bad=run(item('Blast','10 spaces'),[target],{polygonClass:{testCollision:()=>true}});
  assert.deepEqual(summarizePreflight([...good,...bad]).map(r=>r.name),['sentinel']);
  assert.equal(summarizePreflight(bad)[0].warning.length,2);
});
test('o preflight é executado antes do gasto de Focus, Concentração e rolagem',()=>{
  const code=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  const start=code.indexOf('async roll() {'),check=code.indexOf('await confirmAttackPreflight',start),spend=code.indexOf('mmPreSpendFocusForPowerUse',start),conc=code.indexOf('await handleConcentrationOnUse',start),message=code.indexOf('ChatMessage.create',start);
  assert.ok(start<check &&check<spend&&check<conc&&check<message);
  assert.match(code,/combatPreflight: preflight.overridden/);
  assert.match(code,/if \(!preflight.ok\) return/);
});
test('não muda automaticamente os alvos ou o dano: o preflight só avalia/solicita confirmação',()=>{
  const src=readFileSync(new URL('../scripts/combat-preflight.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(src,/actor\.update\(|applyDamage\(|updateEmbeddedDocuments\(/);
  assert.match(src,/chooseSmartTargets\(item,\{force:true\}\)/);
  assert.match(src,/Continuar mesmo assim/);
});

async function withFoundryUi(targets,answers,fn){
  const saved={game:globalThis.game,canvas:globalThis.canvas,foundry:globalThis.foundry,Dialog:globalThis.Dialog,ui:globalThis.ui};
  const dialogs=[];
  globalThis.canvas={ready:true,scene,tokens:{placeables:[{document:source,actor:caster,controlled:true}]},grid:{size:100}};
  globalThis.game={user:{targets:new Set(targets.map(t=>({document:t})))},settings:{get:()=>false}};
  globalThis.foundry={canvas:{geometry:{PointSourcePolygon:{testCollision:()=>false}}}};
  globalThis.Dialog={wait:async args=>{dialogs.push(args);return answers.shift();}};
  globalThis.ui={notifications:{warn:()=>{}}};
  try{return await fn(dialogs);}finally{for(const [k,v] of Object.entries(saved)) {if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}

test('pré-ataque avisa e aceita continuação explícita, com avisos persistentes',async()=>{
  const {confirmAttackPreflight}=await import('../scripts/combat-preflight.mjs');
  await withFoundryUi([target],['proceed'],async(dialogs)=>{
    const current={...item('Blast','10 spaces'),actor:caster};
    const result=await confirmAttackPreflight(current,{attackTarget:'agl'});
    assert.equal(result.ok,true);
    assert.equal(result.overridden.length,1);
    assert.equal(dialogs.length,1);
    assert.match(dialogs[0].content,/fora do alcance/);
    assert.ok(globalThis.game.user.targets.size===1);
  });
});
test('UI mostra aviso e oferece opções em gridless Foundry v14',async()=>{
  const {confirmAttackPreflight}=await import('../scripts/combat-preflight.mjs');
  await withFoundryUi([target],['cancel'],async(dialogs)=>{
    globalThis.canvas.scene={...scene,grid:{type:0,size:100,distance:5}};
    globalThis.canvas.grid={isGridless:true,size:100,measurePath:()=>({spaces:0,distance:75})};
    const current={...item('Elemental Blast','10 espaços'),actor:caster};
    const response=await confirmAttackPreflight(current,{attackTarget:'agl'});
    assert.equal(response.ok,false);
    assert.equal(dialogs.length,1);
    assert.match(dialogs[0].content,/fora do alcance/);
  });
});
test('cancelamento antes da rolagem não muda seleção no Foundry',async()=>{
  const {confirmAttackPreflight}=await import('../scripts/combat-preflight.mjs');
  await withFoundryUi([target],['cancel'],async(dialogs)=>{
    const before=globalThis.game.user.targets;
    const result=await confirmAttackPreflight({...item('Blast','10 spaces'),actor:caster},{attack:true});
    assert.equal(result.ok,false);
    assert.equal(globalThis.game.user.targets,before);
    assert.equal(dialogs.length,1);
  });
});
test('alvo alcançável dispensa diálogo adicional',async()=>{
  const {confirmAttackPreflight}=await import('../scripts/combat-preflight.mjs');
  await withFoundryUi([target],[],async(dialogs)=>{
    const result=await confirmAttackPreflight({...item('Blast','20 spaces'),actor:caster},{attack:true});
    assert.equal(result.ok,true);assert.equal(result.overridden.length,0);
    assert.equal(dialogs.length,0);
  });
});
test('sem token no mapa, preflight falha aberto e não impede rolagem narrativa',async()=>{
  const {confirmAttackPreflight}=await import('../scripts/combat-preflight.mjs');
  await withFoundryUi([target],[],async(dialogs)=>{
    globalThis.canvas.tokens.placeables=[];
    const result=await confirmAttackPreflight({...item('Blast','10 spaces'),actor:caster},{attack:true});
    assert.equal(result.ok,true);assert.equal(dialogs.length,0);
  });
});
