import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POWER_CONDITIONS, conditionsForOutcome, getMarvelOutcome, normalizeConditionDefense,
  syncPowerConditions, expirePowerConditions, confirmPowerDamageFromCard,
 mustConfirmPowerDamage, filterDamageDependentRules, elementalSpecialForPower } from '../scripts/power-conditions.mjs';
const items=JSON.parse(readFileSync(new URL('../apps/charactermancer/data/powers.json',import.meta.url),'utf8')).items;
const foundryRoot=new URL('../',import.meta.url);
function item(name){return items.find(i=>i.name===name);}
const good={success:true,fantastic:false}, fantastic={success:true,fantastic:true}, miss={success:false,fantastic:true};
test('conjunto explícito contém apenas poderes existentes do catálogo',()=>{
 assert.ok(Object.keys(POWER_CONDITIONS).length>=20);
 for(const [name,rules] of Object.entries(POWER_CONDITIONS)){
  assert.ok(item(name),name);
  for(const rule of rules){
   if(rule.status!==null)assert.match(rule.status,/^(stunned|prone|bleeding|blinded|deafened|pinned|paralyzed|grabbed)$/);
   assert.ok(['success','fantastic'].includes(rule.on));
  }
 }
});
test('Disrupt Nerves: só atordoa no sucesso; fantástico inclui caído',()=>{
 assert.deepEqual(conditionsForOutcome('Disrupt Nerves',good).map(r=>r.status),['stunned']);
 assert.deepEqual(conditionsForOutcome('Disrupt Nerves',fantastic).map(r=>r.status),['stunned','prone']);
 assert.deepEqual(conditionsForOutcome('Disrupt Nerves',miss),[]);
});
test('Flare cega uma vez por turno e Webcasting tem imobilização fantástica',()=>{
 assert.equal(conditionsForOutcome('Flare',good)[0].expires,'turn');
 assert.deepEqual(conditionsForOutcome('Webcasting',good).map(r=>r.status),['paralyzed']);
 assert.deepEqual(conditionsForOutcome('Webcasting',fantastic).map(r=>r.status),['paralyzed','pinned']);
});
test('não aplica efeitos situacionais dependentes de dano nem escolhas',()=>{
 for(const name of ['Shut Down Powers','Cure-All']){
  assert.equal(conditionsForOutcome(name,fantastic).length,0);
 }
 assert.deepEqual(conditionsForOutcome('Elemental Grab',fantastic).map(r=>r.status),['grabbed','pinned']);
});
test('efeito no próprio usuário exige sucesso e regra explícita',()=>{
 assert.deepEqual(conditionsForOutcome('Speed Blast',fantastic,{self:true}).map(r=>r.status),['prone']);
 assert.deepEqual(conditionsForOutcome('Speed Blast',good,{self:true}).map(r=>r.status),[]);
});
test('trocas de defesa por traços não são ignoradas',()=>{
 const mk=n=>({items:[{type:'trait',name:n}]});
 assert.equal(normalizeConditionDefense('mle',mk('Evasion')),'agl');
 assert.equal(normalizeConditionDefense('agl',mk('Brawling')),'mle');
 assert.equal(normalizeConditionDefense('log',mk('Wisdom')),'ego');
 assert.equal(normalizeConditionDefense('ego',mk('Integrity')),'log');
 assert.equal(normalizeConditionDefense('res',mk('Evasion')),'res');
});
function roll(total,face=1,options={}){
 const die=n=>({results:[{active:true,result:n}]});
 const marvel={constructor:{name:'MarvelDie'},results:[{active:true,result:face}]};
 return {total,options,dice:[],terms:[{roll:{terms:[{rolls:[{dice:[die(3)]},{dice:[marvel]},{dice:[die(2)]}]}]}}]};
}
test('sucesso fantástico vs falha fantástica (MARVEL não é acerto automático)',()=>{
 assert.equal(getMarvelOutcome(roll(12),17).label,'FALHA FANTÁSTICA');
 assert.equal(getMarvelOutcome(roll(21),17).label,'SUCESSO FANTÁSTICO');
 assert.equal(getMarvelOutcome(roll(21,2),17).label,'SUCESSO');
 const natural=roll(5);natural.terms[0].roll.terms[0].rolls[0].dice[0].results[0].result=6;
 natural.terms[0].roll.terms[0].rolls[2].dice[0].results[0].result=6;
 assert.equal(getMarvelOutcome(natural,99).success,true);
 natural.options={forceMarvelM:true};assert.equal(getMarvelOutcome(natural,99).success,false);
});
function setupMock({name='Disrupt Nerves',defense=16,rollTotal=19,marvel=2,concentration=false}={}){
 let id=0;
 const effects=[];
 const makeActor=(uuid)=>({uuid,effects,items:new Map(),system:{abilities:{res:{defense},vig:{defense},mle:{defense},ego:{defense},agl:{defense},log:{defense}}},
  async createEmbeddedDocuments(type,entries){for(const e of entries)effects.push({...e,id:`ae${++id}`,async update(changes){for(const [path,value] of Object.entries(changes)){const keys=path.split('.');let cur=this;for(const k of keys.slice(0,-1))cur=cur[k]??=( {} );cur[keys.at(-1)]=value;}}});return entries;},
  async deleteEmbeddedDocuments(type,ids){for(const n of ids){const i=effects.findIndex(e=>e.id===n);if(i>=0)effects.splice(i,1);}}
 });
 const target=makeActor('Scene.s.Token.v.Actor.a'),source={uuid:'Actor.source',items:new Map(),effects:[],system:{defaultElement:'ice'}};
 const pow={id:'item1',type:'power',name,system:{attackTarget:item(name)?.system?.attackTarget,isElemental:item(name)?.system?.isElemental,element:''}};
 source.items.set('item1',pow);
 if(concentration)source.effects.push({id:'con1',flags:{'multiverse-d616':{concentrationPower:{itemId:'item1'}}}});
 const token={uuid:'Scene.s.Token.v',id:'v',documentName:'Token',parent:{id:'s'},actor:target};
 const scene={tokens:new Map([['v',token]])};
 const sourceToken={uuid:'Scene.s.Token.u',id:'u',documentName:'Token',parent:{id:'s'},actor:source};
 scene.tokens.set('u',sourceToken);
 const combatants=[{id:'c1',tokenId:'u',sceneId:'s',actor:source},{id:'c2',tokenId:'v',sceneId:'s',actor:target}];
 const combat={id:'combat1',started:true,round:1,turn:0,combatant:combatants[0],combatants};
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},scenes:new Map([['s',scene]]),actors:new Map([['source',source]]),combat};
 globalThis.CONFIG={statusEffects:{}};
 globalThis.fromUuid=async uuid=>uuid===token.uuid?token:uuid===sourceToken.uuid?sourceToken:null;
 const flags={itemId:'item1',attackTarget:pow.system.attackTarget,targets:[{uuid:token.uuid}]};
 const msg={id:'msg1',speaker:{scene:'s',token:'u',actor:'source'},rolls:[roll(rollTotal,marvel)],
  getFlag(ns,key){return flags[key];},async setFlag(ns,key,val){flags[key]=val;}};
 game.messages=new Map([['msg1',msg]]);

 return {source,target,combat,token,sourceToken,msg,effects,pow};
}
test('um acerto cria status na vítima, não duplica e remoção pertence apenas ao card',async()=>{
 const env=setupMock();
 await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned']);
 await syncPowerConditions(env.msg);assert.equal(env.effects.length,1);
 env.msg.rolls=[roll(10,1)];await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,0,'falha fantástica não mantém atordoado');
});
test('sucesso fantástico adiciona efeito específico e reroll remove só ele',async()=>{
 const env=setupMock({marvel:1});
 await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned','mmrpg.prone']);
 env.msg.rolls=[roll(19,2)];await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned']);
});
test('Concentração ausente impede condição que depende do poder',async()=>{
 const env=setupMock({name:'Elemental Grab'});
 await syncPowerConditions(env.msg); assert.equal(env.effects.length,0);
 env.source.effects.push({id:'con1',flags:{'multiverse-d616':{concentrationPower:{itemId:'item1'}}}});
 await syncPowerConditions(env.msg);assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed']);
});
test('stunned expira no turno seguinte do agressor',async()=>{
 const env=setupMock();await syncPowerConditions(env.msg);
 env.combat.round=1;env.combat.turn=1;env.combat.combatant=env.combat.combatants[1];
 await expirePowerConditions(env.combat);assert.equal(env.effects.length,1);
 env.combat.round=2;env.combat.turn=0;env.combat.combatant=env.combat.combatants[0];
 await expirePowerConditions(env.combat);assert.equal(env.effects.length,0);
});
test('blind de 1 turno expira ao final do próximo turno do alvo',async()=>{
 const env=setupMock({name:'Flare'});await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,1);
 env.combat.turn=1;env.combat.combatant=env.combat.combatants[1];
 await expirePowerConditions(env.combat);assert.equal(env.effects.length,1);
 env.combat.round=2;env.combat.turn=0;env.combat.combatant=env.combat.combatants[0];
 await expirePowerConditions(env.combat);assert.equal(env.effects.length,0);
});
test('efeito manual com o mesmo status não é removido por rerrolagem',async()=>{
 const env=setupMock();
 env.effects.push({id:'manual',statuses:['mmrpg.stunned'],flags:{}});
 await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,2);
 env.msg.rolls=[roll(8,1)];await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.id),['manual']);
});
test('efeito condicionado à Concentração mantém vínculo rastreável e independente',async()=>{
 const env=setupMock({name:'Telekinetic Grab',concentration:true});
 await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,1);
 const flag=env.effects[0].flags['multiverse-d616'].powerCondition;
 assert.equal(flag.concentrationEffectId,'con1');
 assert.equal(flag.sourceItemId,'item1');
 assert.equal(flag.expires,null);
});
test('falha fantástica contra traço Evasion compara atributo da defesa substituta',async()=>{
 const env=setupMock({name:'Shield Bash',marvel:1,rollTotal:14,defense:16});
 env.target.items.set('evasion',{type:'trait',name:'Evasion'});
 env.target.system.abilities.agl.defense=12;
 await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,0,'ataques danosos aguardam confirmação');
 const damageMessage={id:'dm1',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(damageMessage,'full',[{targetUuid:env.token.uuid,delta:12}]);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.prone']);
});

test('efeito de Poder sempre exibe o M no token do Foundry v14', async()=>{
 const env=setupMock();await syncPowerConditions(env.msg);
 assert.equal(env.effects[0]?.showIcon,2);
 assert.equal(env.effects[0]?.img,'systems/multiverse-d616/icons/m.svg');
 assert.equal(env.effects[0]?.flags?.core?.statusId,'mmrpg.stunned');
});
test('Wisecracker aguarda confirmação de dano; não exige dano positivo para stun fantástico',async()=>{
 const env=setupMock({name:'Wisecracker',marvel:1});
 assert.equal(mustConfirmPowerDamage('Wisecracker'),true);
 await syncPowerConditions(env.msg);assert.equal(env.effects.length,0);
 const damageMessage={id:'dm1',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 assert.equal(await confirmPowerDamageFromCard(damageMessage,'heal',[{targetUuid:env.token.uuid,delta:10}]),false);
 assert.equal(env.effects.length,0);
 assert.equal(await confirmPowerDamageFromCard(damageMessage,'full',[{targetUuid:env.token.uuid,delta:0}]),true);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned']);
 await syncPowerConditions(env.msg);assert.equal(env.effects.length,1,'confirmação e atualização não duplicam');
 env.msg.rolls=[roll(8,1)];await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,0,'Edge/Trouble corrigido para falha remove condição');
});
test('sangramento de Razorwebs depende de perda efetiva de Health após redução',async()=>{
 const env=setupMock({name:'Razorwebs',marvel:1});
 const dm={id:'dm2',getFlag(ns,k){return k==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:0}]);
 assert.equal(env.effects.length,0);
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:6}]);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.bleeding']);
});
test('somente alvo que recebeu a confirmação de dano pode receber condição',async()=>{
 const env=setupMock({name:'Shield Bash',marvel:1});
 await syncPowerConditions(env.msg);assert.equal(env.effects.length,0);
 const dm={id:'dm3',getFlag(ns,k){return k==='sourceMessageId'?'msg1':null;}};
 const result=await confirmPowerDamageFromCard(dm,'full',[{targetUuid:'Scene.s.Token.outro',delta:10}]);
 assert.equal(result,true);assert.equal(env.effects.length,0);
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:0}]);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.prone'],'prone ao acertar mesmo com DR total');
});
test('regras declaradas podem exigir dano real sem modificar regra padrão de acerto',()=>{
 const rules=[{status:'prone'},{status:'bleeding',requiresDamage:true}];
 assert.deepEqual(filterDamageDependentRules(rules,0).map(x=>x.status),['prone']);
 assert.deepEqual(filterDamageDependentRules(rules,3).map(x=>x.status),['prone','bleeding']);
});

test('Elemental Grab normal aplica apenas Grabbed; fantástico adiciona Pinned e especial do elemento',async()=>{
 const env=setupMock({name:'Elemental Grab',concentration:true,marvel:2});
 await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed']);
 env.msg.rolls=[roll(19,1)]; await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed','mmrpg.pinned','mmrpg.paralyzed']);
 const ice=env.effects.find(e=>e.flags['multiverse-d616'].elementalFantastic);
 assert.equal(ice.name.includes('Ice'),true);
 assert.equal(ice.flags['multiverse-d616'].powerCondition.expires,'round');
 assert.equal(ice.showIcon,2);
 // Retro Edge/Trouble removes ONLY the effects created by this attack.
 env.msg.rolls=[roll(8,1)];await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,0);
});
test('elemento Earth reduz velocidade, Force gera Trouble, sem dano nem espera por DAMAGE',async()=>{
 for(const [element,custom] of [['earth','halfMovement'],['force','forceTrouble']]){
  const env=setupMock({name:'Elemental Grab',concentration:true,marvel:1});
  env.source.system.defaultElement=element;
  await syncPowerConditions(env.msg);
  const special=env.effects.find(e=>e.flags?.['multiverse-d616']?.elementalFantastic);
  assert.ok(special,element);
  assert.equal(special.flags['multiverse-d616'].elementalFantastic.custom,custom);
  assert.equal(special.statuses.length,0,'efeito customizado sem status incorreto');
  assert.equal(special.flags['multiverse-d616'].powerCondition.expires,'round');
 }
});
test('Elemental Grab Plants/Iron não duplica Grabbed ou Pinned',async()=>{
 for(const [element,expected] of [['plants',['mmrpg.power-grabbed','mmrpg.pinned']],['iron',['mmrpg.power-grabbed','mmrpg.pinned']]]){
  const env=setupMock({name:'Elemental Grab',concentration:true,marvel:1});
  env.source.system.defaultElement=element;
  await syncPowerConditions(env.msg);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),expected);
 }
});
test('Elemental Grab mantém efeito especial temporário mesmo que Concentração termine',async()=>{
 const env=setupMock({name:'Elemental Grab',concentration:true,marvel:1});
 await syncPowerConditions(env.msg);
 const special=env.effects.find(e=>e.flags?.['multiverse-d616']?.elementalFantastic);
 assert.equal(special.flags['multiverse-d616'].powerCondition.concentrationEffectId,null);
 const normal=env.effects.filter(e=>!e.flags?.['multiverse-d616']?.elementalFantastic);
 assert.ok(normal.every(e=>e.flags['multiverse-d616'].powerCondition.concentrationEffectId==='con1'));
});
test('Elemental Barrier: fantástico aplica especial, normal não altera status',async()=>{
 const env=setupMock({name:'Elemental Barrier',marvel:2});
 await syncPowerConditions(env.msg);assert.equal(env.effects.length,0);
 env.msg.rolls=[roll(19,1)];await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.paralyzed']);
});
test('Telekinetic Grab, Webgrabbing e Crimson Bands tratam normal e fantástico sem dano',async()=>{
 const scenarios=[
  ['Telekinetic Grab',true,['mmrpg.power-grabbed'],['mmrpg.power-grabbed','mmrpg.pinned']],
  ['Webgrabbing',false,['mmrpg.power-grabbed'],['mmrpg.power-grabbed','mmrpg.pinned']],
  ['Crimson Bands of Cyttorak',true,['mmrpg.paralyzed'],['mmrpg.paralyzed','mmrpg.pinned']],
 ];
 for(const [name,concentration,normal,fantasticResult] of scenarios){
  const env=setupMock({name,concentration,marvel:2});
  await syncPowerConditions(env.msg);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),normal,`${name} normal`);
  env.msg.rolls=[roll(19,1)];await syncPowerConditions(env.msg);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),fantasticResult,`${name} fantastico`);
  env.msg.rolls=[roll(8,1)];await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,0,`${name} falha fantástica`);
 }
});
test('efeito especial não é criado em Falha Fantástica nem quando tipo de elemento está ausente',()=>{
 const power=item('Elemental Grab');
 const simulated={type:'power',name:'Elemental Grab',system:power.system};
 assert.deepEqual(elementalSpecialForPower(simulated,{system:{defaultElement:'ice'}},miss,[]),[]);
 assert.deepEqual(elementalSpecialForPower(simulated,{system:{defaultElement:''}},fantastic,[]),[]);
 const ice=elementalSpecialForPower(simulated,{system:{defaultElement:'ice'}},fantastic,[]);
 assert.equal(ice.length,1);assert.equal(ice[0].status,'paralyzed');
});
test('efeito especial de 1 rodada expira, enquanto agarramento continua por Concentração',async()=>{
 const env=setupMock({name:'Elemental Grab',concentration:true,marvel:1});
 await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,3);
 env.combat.round=2;env.combat.turn=0;env.combat.combatant=env.combat.combatants[0];
 await expirePowerConditions(env.combat);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed','mmrpg.pinned']);
});
test('alterar elemento na ficha e recalcular mesma rolagem troca somente o especial',async()=>{
 const env=setupMock({name:'Elemental Grab',concentration:true,marvel:1});
 env.source.system.defaultElement='electricity';
 await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed','mmrpg.pinned','mmrpg.stunned']);
 env.source.system.defaultElement='energy';await syncPowerConditions(env.msg);
 assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.power-grabbed','mmrpg.pinned','mmrpg.blinded']);
});
test('Elemental Prison: confinamento imediato sem dano, fantástico adicional só após confirmar dano',async()=>{
 const e=setupMock({name:'Elemental Prison',marvel:2,concentration:true});
 await syncPowerConditions(e.msg);
 assert.equal(e.effects.length,1);assert.match(e.effects[0].name,/Dentro da Prisão/);
 assert.deepEqual(e.effects[0].statuses,[]);
 e.msg.rolls=[roll(19,1)];await syncPowerConditions(e.msg);
 assert.equal(e.effects.length,1,'marvel fantástico sozinho não aplica especial sem dano');
 const dm={id:'dprison',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:e.token.uuid,delta:7}]);
 assert.deepEqual(e.effects.map(x=>x.statuses[0]),[undefined,'mmrpg.paralyzed']);
 e.msg.rolls=[roll(19,2)];await syncPowerConditions(e.msg);
 assert.equal(e.effects.length,1,'Edge remove apenas extra e preserva confinamento');
});
test('Elemental Sphere: efeito elemental fantástico aguarda dano, sem condição na rolagem normal',async()=>{
 const e=setupMock({name:'Elemental Sphere',marvel:1,concentration:true});
 await syncPowerConditions(e.msg);assert.equal(e.effects.length,0);
 const dm={id:'dsphere',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:e.token.uuid,delta:0}]);
 assert.deepEqual(e.effects.map(x=>x.statuses[0]),['mmrpg.paralyzed']);
});
test('Elemental Suffocation: no normal só dano; no fantástico Imobilizado e especial após dano',async()=>{
 const e=setupMock({name:'Elemental Suffocation',marvel:2});
 const dm={id:'dsuff',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await syncPowerConditions(e.msg);assert.equal(e.effects.length,0);
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:e.token.uuid,delta:5}]);assert.equal(e.effects.length,0);
 e.msg.rolls=[roll(19,1)];await syncPowerConditions(e.msg);
 assert.equal(e.effects.length,0,'rerrolagem invalida a confirmação antiga');
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:e.token.uuid,delta:5}]);
 assert.deepEqual(e.effects.map(x=>x.statuses[0]),['mmrpg.pinned','mmrpg.paralyzed']);
});
test('Elemental Push: no sucesso simples não aplica Caído, no fantástico só após confirmar dano',async()=>{
 const e=setupMock({name:'Elemental Push',marvel:2});
 await syncPowerConditions(e.msg);assert.equal(e.effects.length,0);
 e.msg.rolls=[roll(19,1)];await syncPowerConditions(e.msg);assert.equal(e.effects.length,0);
 const dm={id:'dpush',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:e.token.uuid,delta:0}]);
 assert.deepEqual(e.effects.map(x=>x.statuses[0]),['mmrpg.prone','mmrpg.paralyzed']);
});

// v0.2.45: expansion of deterministic Fantastic Success conditions.
const FANTASTIC_045 = Object.freeze({
 'Smash':['stunned','round'],
 'Reverse Punch':['stunned','round'],
 'Telekinetic Attack':['stunned','round'],
 'Disrupt Person':['stunned','round'],
 'Bolts of Balthakk':['stunned','turn'],
 'Focused Strike':['stunned','turn'],
 'Mental Punch':['stunned','turn'],
 'Telepathic Blast':['stunned','turn'],
 'Venom Bash':['stunned','round'],
 'Venom Blast':['stunned','round'],
 'Point-Blank Parry':['bleeding',null],
 'Telekinetic Toss':['prone',null],
 'Flying Double Kick':['prone',null],
 'Dance of Death':['bleeding',null],
 'Orchestra of Overkill':['bleeding',null],
 'Unrelenting Smash':['prone',null],
});
test('v0.2.45: dezesseis poderes canônicos têm status explícito somente no sucesso fantástico',()=>{
 assert.equal(Object.keys(FANTASTIC_045).length,16);
 for(const [name,[status,expiration]] of Object.entries(FANTASTIC_045)){
  const record=item(name);
  assert.ok(record,`${name} está no compêndio`);
  assert.ok(record.system?.attackTarget,`${name} precisa ter alvo/defesa`);
  assert.equal(mustConfirmPowerDamage(name),true,`${name} só confirma depois do DAMAGE`);
  assert.deepEqual(conditionsForOutcome(name,good),[],name);
  assert.deepEqual(conditionsForOutcome(name,miss),[],name);
  const rules=conditionsForOutcome(name,fantastic);
  assert.equal(rules.length,1,name);
  assert.equal(rules[0].status,status,name);
  assert.equal(rules[0].expires,expiration,name);
 }
});
test('v0.2.45: automações aguardam o DAMAGE do Mestre e respeitam a conclusão da rolagem',async()=>{
 for(const [name,[status]] of Object.entries(FANTASTIC_045)){
  const env=setupMock({name,marvel:1});
  await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,0,`${name} não aplica antes do DAMAGE`);
  const dm={id:`damage-${name}`,getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
  await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:8,category:'health'}]);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),[ `mmrpg.${status}` ],name);
  await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,1,`${name} sem duplicação`);
  env.msg.rolls=[roll(19,2)];
  await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,0,`${name} elimina status quando perde fantástico`);
 }
});
test('v0.2.45: Venom exige dano REAL de Health, não Focus nem dano absorvido',async()=>{
 for(const name of ['Venom Bash','Venom Blast']){
  const env=setupMock({name,marvel:1});
  const dm={id:'dm-venom',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
  await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:0,category:'health'}]);
  assert.equal(env.effects.length,0,`${name} absorção total`);
  await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:9,category:'focus'}]);
  assert.equal(env.effects.length,0,`${name} Focus não é Health`);
  await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:1,category:'health'}]);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned'],name);
 }
 assert.equal(filterDamageDependentRules([{requiresDamage:true,damageCategory:'health'}],4).length,0,
   'um número sem a origem Health não permite presumir perda dessa reserva');
});
test('v0.2.45: confirmação de outro dado Marvel não sustenta condição obsoleta',async()=>{
 const env=setupMock({name:'Smash',marvel:1});
 const dm={id:'dm-original',getFlag(ns,key){return key==='sourceMessageId'?'msg1':null;}};
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:12,category:'health'}]);
 assert.equal(env.effects.length,1);
 env.msg.rolls=[roll(19,1,{forceMarvelM:true})];
 await syncPowerConditions(env.msg);
 assert.equal(env.effects.length,0,'mesmo Marvel mas outra assinatura invalida confirmação');
 await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:0,category:'health'}]);
 assert.equal(env.effects.length,1,'novo DAMAGE confirmado autoriza condição');
 const oldCard={id:'dm-stale',getFlag(ns,key){
  if(key==='sourceMessageId')return 'msg1';
  if(key==='damageApplication')return {rollSignature:'assinatura-velha'};
  return null;
 }};
 assert.equal(await confirmPowerDamageFromCard(oldCard,'full',[{targetUuid:env.token.uuid,delta:9,category:'health'}]),false,
   'bloqueia confirmação baseada em dados anteriores');
});


test('v0.2.47: Venom Burst derruba no acerto sem depender de dano',async()=>{
  const env=setupMock({name:'Venom Burst',marvel:2});
  assert.equal(mustConfirmPowerDamage('Venom Burst'),false);
  await syncPowerConditions(env.msg);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.prone']);
  env.msg.rolls=[roll(19,1)];await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,1,'fantástico não cria condição duplicada');
  env.msg.rolls=[roll(8,1)];await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,0,'falha fantástica não derruba');
});

test('v0.2.47: Headshot requer dano efetivo em sucesso normal, não em falha',async()=>{
  const env=setupMock({name:'Headshot',marvel:2});
  const damageMessage={id:'hs',getFlag(ns,k){return k==='sourceMessageId'?'msg1':null;}};
  await syncPowerConditions(env.msg);assert.equal(env.effects.length,0);
  await confirmPowerDamageFromCard(damageMessage,'full',[{targetUuid:env.token.uuid,delta:0,category:'health'}]);
  assert.equal(env.effects.length,0);
  await confirmPowerDamageFromCard(damageMessage,'full',[{targetUuid:env.token.uuid,delta:1,category:'health'}]);
  assert.deepEqual(env.effects.map(e=>e.statuses[0]),['mmrpg.stunned']);
  env.msg.rolls=[roll(10,1)];await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,0,'rerrolagem com falha cancela status do dano anterior');
});

test('v0.2.47: paralisia de Penance Stare espera dano confirmado de Focus e sucesso fantástico',async()=>{
  const env=setupMock({name:'Penance Stare',marvel:1});
  assert.equal(mustConfirmPowerDamage('Penance Stare'),true);
  await syncPowerConditions(env.msg);assert.equal(env.effects.length,0);
  const dm={id:'penance',getFlag(ns,k){return k==='sourceMessageId'?'msg1':null;}};
  await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:6,category:'focus'}]);
  assert.equal(env.effects[0]?.statuses[0],'mmrpg.paralyzed');
  assert.equal(env.effects[0]?.flags['multiverse-d616'].powerCondition.expires,'turn');
});

test('v0.2.47: seis novas consequências de ataques exigem confirmação do card',async()=>{
  for (const [name,status] of [
    ['Double Tap','mmrpg.bleeding'],['Growing Attack','mmrpg.stunned'],
    ['Snap Shooting','mmrpg.bleeding'],['Spider-Strike','mmrpg.paralyzed'],
  ]) {
    const env=setupMock({name,marvel:1});
    assert.equal(mustConfirmPowerDamage(name),true,name);
    await syncPowerConditions(env.msg);assert.equal(env.effects.length,0,`${name} antes do dano`);
    const dm={id:`dm:${name}`,getFlag(ns,k){return k==='sourceMessageId'?'msg1':null;}};
    await confirmPowerDamageFromCard(dm,'full',[{targetUuid:env.token.uuid,delta:8,category:'health'}]);
    assert.deepEqual(env.effects.map(e=>e.statuses[0]),[status],name);
    await syncPowerConditions(env.msg);assert.equal(env.effects.length,1,`${name} sem duplicata`);
    env.msg.rolls=[roll(19,2)];await syncPowerConditions(env.msg);
    assert.equal(env.effects.length,0,`${name} sem fantástico remove somente sua condição`);
  }
});

test('v0.2.49: efeito de um turno aplicado durante o turno do próprio alvo expira quando ele acaba',async()=>{
  const env=setupMock({name:'Flare'});
  env.combat.turn=1;env.combat.combatant=env.combat.combatants[1];
  await syncPowerConditions(env.msg);
  assert.equal(env.effects.length,1);
  const flags=env.effects[0].flags['multiverse-d616'].powerCondition;
  assert.equal(flags.anchorId,'c2');
  assert.equal(flags.witnessedTargetTurn,'1:1:c2');
  env.combat.round=2;env.combat.turn=0;env.combat.combatant=env.combat.combatants[0];
  await expirePowerConditions(env.combat);
  assert.equal(env.effects.length,0);
});

test('v0.2.67: Hellfire Chains só mantém Concentração quando Fantástico prende o alvo',async()=>{
 const normal=setupMock({name:'Hellfire Chains',defense:16,rollTotal:19,marvel:2,concentration:true});
 const removed=[];
 normal.source.deleteEmbeddedDocuments=async(type,ids)=>{removed.push(...ids);normal.source.effects=normal.source.effects.filter(e=>!ids.includes(e.id));};
 const damage={getFlag(ns,key){return key==='sourceMessageId'?normal.msg.id:null;}};
 const results=[{targetUuid:normal.token.uuid,delta:10,category:'health',blocked:false,heal:false}];
 assert.equal(await confirmPowerDamageFromCard(damage,'full',results),true);
 assert.deepEqual(removed,['con1'],'sucesso comum não deve manter a Concentração');
 assert.equal(normal.effects.length,0,'sucesso comum não imobiliza');
 const m=setupMock({name:'Hellfire Chains',defense:16,rollTotal:19,marvel:1,concentration:true});
 const removedM=[];
 m.source.deleteEmbeddedDocuments=async(type,ids)=>{removedM.push(...ids);};
 const mDamage={getFlag(ns,key){return key==='sourceMessageId'?m.msg.id:null;}};
 assert.equal(await confirmPowerDamageFromCard(mDamage,'full',[{targetUuid:m.token.uuid,delta:10,category:'health',blocked:false,heal:false}]),true);
 assert.deepEqual(removedM,[],'Fantástico mantém a Concentração');
 assert.deepEqual(m.effects.map(e=>e.flags['multiverse-d616'].powerCondition.status).sort(),['grabbed','paralyzed']);
});
