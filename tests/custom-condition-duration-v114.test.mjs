import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishConditionReferences,conditionReference} from '../scripts/condition-reference.mjs';
import {
  normalizeCustomRule,executeCustomRule,processCustomConditionTurn,
  customConditionDurationText,conditionTurnEntries,expireCustomConditionRounds,
  clearCustomConditionCombat,matchingConditionCombatant,
} from '../scripts/custom-automations.mjs';
const SYS='multiverse-d616';
const status='mmrpg.confused';
const rule=(extra={})=>normalizeCustomRule({id:'test114',name:'Fast Attacks: Confuso',trigger:'targetHit',
  powerName:'Fast Attacks',effectType:'condition',effectStatus:status,
  conditionDurationMode:'turns',conditionDurationCount:2,...extra});
const old=()=>normalizeCustomRule({id:'old',name:'regra antiga',trigger:'powerRoll',powerName:'Fast Attacks',
  effectType:'condition',effectStatus:status});
let fixtureIndex=0;
function fixture(){
  const before={game:globalThis.game,ChatMessage:globalThis.ChatMessage,
    CONFIG:globalThis.CONFIG,ui:globalThis.ui};
  const messages=[];const warnings=[];
  function makeActor(name,id){
    return {name,id,uuid:`Actor.${id}`,effects:[],statuses:new Set(),
      async createEmbeddedDocuments(type,raw){
        assert.equal(type,'ActiveEffect');
        const added=raw.map((e,i)=>({id:`effect-${this.effects.length+i+1}`,...e,
          async update(changes){for(const [path,value] of Object.entries(changes)){
            const parts=path.split('.');let ref=this;
            for(const segment of parts.slice(0,-1))ref=ref[segment]??={};
            ref[parts.at(-1)]=value;
          }},}));
        for(const e of added){this.effects.push(e);for(const id of e.statuses)this.statuses.add(id);}
        return added;
      },
      async deleteEmbeddedDocuments(type,ids){
        assert.equal(type,'ActiveEffect');this.effects=this.effects.filter(e=>!ids.includes(e.id));
        this.statuses=new Set(this.effects.flatMap(e=>[...e.statuses]));
      },
    };
  }
  const attacker=makeActor('Thermal Prime','a1'),target=makeActor('Garras','a2');
  const c1={id:'c1',actor:attacker,sceneId:'s1',tokenId:'t1'};
  const c2={id:'c2',actor:target,sceneId:'s1',tokenId:'t2'};
  const combat={id:`combat-${++fixtureIndex}`,round:1,turn:0,started:true,combatant:c1,combatants:[c1,c2]};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},combat,
    actors:new Map([['a1',attacker],['a2',target]]),scenes:new Map(),messages};
  globalThis.CONFIG={statusEffects:[{id:status,img:'icons/confused.webp'},
    {id:'mmrpg.ablaze',name:'Em Chamas'}, {id:'mmrpg.poisoned',name:'Envenenado'}]};
  globalThis.ui={notifications:{warn:t=>warnings.push(t)}};
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),
    async create(data){const msg={...data,getFlag:(ns,key)=>data.flags?.[ns]?.[key]};messages.push(msg);return msg;}};
  return {attacker,target,combat,c1,c2,messages,warnings,restore(){Object.assign(globalThis,before);}};
}

test('v114: legacy rule defaults to manual, validates safe timing and removal note',()=>{
  assert.equal(old().conditionDurationMode,'manual');
  assert.equal(old().conditionDurationCount,0);
  assert.equal(rule().conditionDurationCount,2);
  assert.throws(()=>rule({conditionDurationMode:'script'}),/duração válida/);
  assert.throws(()=>rule({conditionDurationCount:0}),/entre 1 e 20/);
  assert.throws(()=>rule({conditionDurationCount:21}),/entre 1 e 20/);
  assert.throws(()=>rule({conditionDurationCount:1.5}),/entre 1 e 20/);
  assert.equal(rule({conditionRemoval:'<img onerror=alert(1)>'}).conditionRemoval,'<img onerror=alert(1)>');
});

test('v114: timed condition creates Foundry v14 effect and exact recipient token anchor',async()=>{
  const f=fixture();try{
    assert.equal(matchingConditionCombatant(f.combat,f.target,'Scene.s1.Token.t2').id,'c2');
    assert.equal(matchingConditionCombatant(f.combat,f.target,'Scene.s1.Token.wrong'),null);
    assert.equal(await executeCustomRule(rule({conditionRemoval:'Logic TN 12'}),f.target,
      {targetTokenUuid:'Scene.s1.Token.t2'}),true);
    const effect=f.target.effects[0];const flag=effect.flags[SYS].customAutomationCondition;
    assert.equal(flag.mode,'turns');assert.equal(flag.count,2);assert.equal(flag.anchorId,'c2');
    assert.equal(flag.removalNote,'Logic TN 12');assert.deepEqual(effect.duration,{});
    assert.equal(customConditionDurationText(effect,f.combat),'2 turnos do alvo');
    assert.equal(await executeCustomRule(rule(),f.target,{targetTokenUuid:'Scene.s1.Token.t2'}),false,
      'does not extend existing condition');
    assert.equal(f.target.effects.length,1);
  }finally{f.restore();}
});

test('v114: temporary rule outside combat does not become accidentally permanent',async()=>{
  const f=fixture();try{
    f.combat.started=false;
    assert.equal(await executeCustomRule(rule(),f.target),false);
    assert.equal(f.target.effects.length,0);assert.match(f.warnings[0],/inicie um combate/);
  }finally{f.restore();}
});

test('v114: target-start notices show remaining turns and removal, then expire on correct turn',async()=>{
  const f=fixture();try{
    assert.equal(await executeCustomRule(rule({conditionRemoval:'Remover com descanso'}),f.target,
      {targetTokenUuid:'Scene.s1.Token.t2'}),true);
    f.combat.combatant=f.c2;f.combat.turn=1;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    assert.match(f.messages[0].content,/Confuso/);
    assert.match(f.messages[0].content,/2 turnos do alvo/);
    assert.match(f.messages[0].content,/Remover com descanso/);
    assert.equal(await processCustomConditionTurn(f.combat),false,'no duplicate in same combat turn');
    assert.equal(f.target.effects[0].flags[SYS].customAutomationCondition.turnStarts,1);
    f.combat.round=2;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    assert.match(f.messages[1].content,/1 turno do alvo/);
    f.combat.round=3;
    assert.equal(await processCustomConditionTurn(f.combat),false);
    assert.equal(f.target.effects.length,0,'expires BEFORE third affected turn');
    assert.equal(f.messages.length,2);
  }finally{f.restore();}
});

test('v114: applying one-turn condition during its own turn expires on next target turn',async()=>{
  const f=fixture();try{
    f.combat.combatant=f.c2;f.combat.turn=1;
    const r=rule({conditionDurationCount:1});
    assert.equal(await executeCustomRule(r,f.target,{targetTokenUuid:'Scene.s1.Token.t2'}),true);
    assert.equal(f.target.effects[0].flags[SYS].customAutomationCondition.turnStarts,1);
    f.combat.round=2;
    assert.equal(await processCustomConditionTurn(f.combat),false);
    assert.equal(f.target.effects.length,0);assert.equal(f.messages.length,0);
  }finally{f.restore();}
});

test('v114: round duration expires at round boundary even when victim not current actor',async()=>{
  const f=fixture();try{
    const r=rule({conditionDurationMode:'rounds',conditionDurationCount:2});
    assert.equal(await executeCustomRule(r,f.target,{targetTokenUuid:'Scene.s1.Token.t2'}),true);
    f.combat.combatant=f.c2;f.combat.turn=1;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    assert.match(f.messages[0].content,/2 rodadas/);
    f.combat.round=2;f.combat.turn=0;f.combat.combatant=f.c1;
    assert.equal(await expireCustomConditionRounds(f.combat),0);
    f.combat.round=3;
    assert.equal(await expireCustomConditionRounds(f.combat),1);
    assert.equal(f.target.effects.length,0);
  }finally{f.restore();}
});

test('v114: manual condition and native condition coexist, native TN guidance is grounded',async()=>{
  const f=fixture();try{
    assert.equal(await executeCustomRule(old(),f.target),true);
    await f.target.createEmbeddedDocuments('ActiveEffect',[{name:'Chamas',statuses:['mmrpg.ablaze'],flags:{}}]);
    const entries=conditionTurnEntries(f.target,f.combat);
    assert.equal(entries.length,2);
    assert.match(entries.find(e=>e.id===status).duration,/remoção/);
    assert.match(entries.find(e=>e.id==='mmrpg.ablaze').removal,/Agility TN 10/);
    f.combat.combatant=f.c2;f.combat.turn=1;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    assert.match(f.messages[0].content,/Em Chamas/);
    f.combat.round=7;
    assert.equal(await expireCustomConditionRounds(f.combat),0);
    assert.equal(f.target.effects.length,2);
  }finally{f.restore();}
});

test('v114: chat escapes removal instructions and combat deletion clears ONLY tracked temporary conditions',async()=>{
  const f=fixture();try{
    await executeCustomRule(rule({conditionDurationMode:'rounds',conditionRemoval:'<script>alert(1)</script>'}),f.target,
      {targetTokenUuid:'Scene.s1.Token.t2'});
    f.combat.turn=1;f.combat.combatant=f.c2;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    assert.doesNotMatch(f.messages[0].content,/<script>/);
    assert.match(f.messages[0].content,/&lt;script&gt;/);
    await f.target.createEmbeddedDocuments('ActiveEffect',[{name:'Manual',statuses:['mmrpg.ablaze'],flags:{}}]);
    assert.equal(await clearCustomConditionCombat(f.combat),1);
    assert.equal(f.target.effects.length,1);
  }finally{f.restore();}
});

test('v114: editor displays duration/recovery and preserves existing rule settings',()=>{
  const text=readFileSync(new URL('../scripts/automation-center.mjs',import.meta.url),'utf8');
  assert.match(text,/Quanto tempo dura a condição/);
  assert.match(text,/conditionDurationMode/);
  assert.match(text,/conditionDurationCount/);
  assert.match(text,/conditionRemoval/);
  assert.match(text,/data-condition-timing/);
});


test('v132: turn notice shares exact native condition descriptions and removal guidance with the condition tray',async()=>{
  const catalog=JSON.parse(readFileSync(new URL('../data/conditions.json',import.meta.url),'utf8')).conditions;
  publishConditionReferences(catalog);
  const f=fixture();try{
    for(const id of ['mmrpg.blinded','mmrpg.ablaze','mmrpg.grabbed'])
      globalThis.CONFIG.statusEffects.push({id,name:id});
    await f.target.createEmbeddedDocuments('ActiveEffect',[
      {name:'Cego',statuses:['mmrpg.blinded'],flags:{}},
      {name:'Em Chamas',statuses:['mmrpg.ablaze'],flags:{}},
      {name:'Agarrado',statuses:['mmrpg.grabbed'],flags:{}}
    ]);
    const entries=conditionTurnEntries(f.target,f.combat);
    assert.equal(entries.find(e=>e.id==='mmrpg.blinded').description,
      conditionReference('mmrpg.blinded').description);
    assert.equal(entries.find(e=>e.id==='mmrpg.ablaze').removal,
      conditionReference('mmrpg.ablaze').remove);
    assert.equal(entries.find(e=>e.id==='mmrpg.grabbed').removal,'',
      'No invented recovery procedure when tray has none');
    f.combat.combatant=f.c2;f.combat.turn=1;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    const chat=f.messages[0].content;
    assert.match(chat,/Velocidade -50%/);
    assert.match(chat,/Trouble em ações visuais/);
    assert.match(chat,/Agility TN 10, 1 ação/);
    assert.match(chat,/Agarrador e alvo não se movem/);
    assert.equal((chat.match(/Como remover:/g)||[]).length,1,
      'Show removal text only when configured, without fake procedures');
    assert.match(chat,/Restante: até remoção conforme a regra/);
  }finally{publishConditionReferences([]);f.restore();}
});

test('v132: world override and rule-specific removal are reflected safely in chat',async()=>{
  publishConditionReferences([{id:'mmrpg.confused',name:'Confuso',
    description:'Descrição do Mestre <b>não executar</b>',
    remove:'Recuperar com uma Ação Padrão'}]);
  const f=fixture();try{
    await executeCustomRule(rule({conditionRemoval:'Teste <script>injetado</script>'}),f.target,
      {targetTokenUuid:'Scene.s1.Token.t2'});
    f.combat.combatant=f.c2;f.combat.turn=1;
    assert.equal(await processCustomConditionTurn(f.combat),true);
    const chat=f.messages[0].content;
    assert.match(chat,/Descrição do Mestre &lt;b&gt;não executar&lt;\/b&gt;/);
    assert.match(chat,/Teste &lt;script&gt;injetado&lt;\/script&gt;/);
    assert.doesNotMatch(chat,/<script>/);
    assert.doesNotMatch(chat,/Recuperar com uma Ação Padrão/,
      'The optional rule-specific recovery note has priority');
    assert.match(chat,/2 turnos do alvo/);
  }finally{publishConditionReferences([]);f.restore();}
});
