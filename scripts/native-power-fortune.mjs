/**
 * v0.2.197 — signed Luck/Tactics concentration effects.
 * The power is activated by the *bounded* native support dispatcher over the
 * v196 atomic owner-authenticated transport. No macro script runs as GM.
 * The GM creates source concentration with the existing D616 ledger, charges
 * normal upkeep, and applies target-only marker effects. The dice engine reads
 * markers and leaves ALL Edge/Trouble rerolls manual.
 */
import {automationEnabled} from './automation-settings.mjs';
const NS='multiverse-d616';
const arr=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const active=e=>e&&!e.disabled&&e.duration?.expired!==true;
const rank=a=>Number(a?.system?.attributes?.rank?.value??0);
const vig=a=>Number(a?.system?.abilities?.vig?.value??0);
const concentrationEffects=actor=>arr(actor?.effects).filter(e=>active(e)&&e.flags?.[NS]?.concentrationPower?.transient===true);
const concentrationLevel=actor=>{
  const ids=[...arr(actor?.statuses),...arr(actor?.effects).filter(active).flatMap(e=>arr(e.statuses))].map(String);
  return Math.max(0,...ids.filter(id=>/^mmrpg\.concentration\.[1-6]$/.test(id)).map(id=>Number(id.at(-1))));
};
const effectFor=(actor,item)=>concentrationEffects(actor)
  .find(e=>String(e?.flags?.[NS]?.concentrationPower?.itemId??'')===String(item?.id??''));
const tokens=scene=>arr(scene?.tokens).map(t=>t?.document??t);
const isAlly=(a,b)=>Number(a?.disposition)===Number(b?.disposition);
const isEnemy=(a,b)=>Number(a?.disposition)!==Number(b?.disposition);
const distanceSpaces=(a,b,scene)=>{
  const size=Number(scene?.grid?.size);if(!Number.isFinite(size)||size<=0)return Infinity;
  const x=t=>Number(t.x)+Number(t.width)*size/2,y=t=>Number(t.y)+Number(t.height)*size/2;
  return Math.hypot(x(a)-x(b),y(a)-y(b))/size;
};
const touch=(a,b,scene)=>{
  const size=Number(scene?.grid?.size);if(!Number.isFinite(size)||size<=0)return false;
  const rect=t=>({x:Number(t.x),y:Number(t.y),w:Number(t.width)*size,h:Number(t.height)*size});
  const x=rect(a),y=rect(b);
  if(!Object.values(x).every(Number.isFinite)||!Object.values(y).every(Number.isFinite))return false;
  return Math.max(0,x.x-y.x-y.w,y.x-x.x-x.w)<1e-5 &&
    Math.max(0,x.y-y.y-y.h,y.y-x.y-x.h)<1e-5;
};

/** Deliberately conservative: LOS, hearing and Jinx You hit must be
 * confirmed by the player/Narrator. They are never guessed from canvas state. */
export function inspectFortuneTargets({caster,item,sourceToken,targetTokens=[],scene,rule,combat}={}){
  if(!rule||rule.kind!=='fortune')return {ok:false,reason:'Regra de sorte não registrada.'};
  if(!automationEnabled('concentration'))return {ok:false,reason:'A automação de Concentração precisa estar habilitada.'};
  if(!combat?.started)return {ok:false,reason:'Esta automação de sorte exige combate ativo para manutenção de Focus por turno.'};
  if(!Number.isInteger(rank(caster))||rank(caster)<1)return {ok:false,reason:'Rank inválido.'};
  if(!sourceToken||!targetTokens.length||targetTokens.some(t=>!t?.actor||!tokens(scene).some(x=>x.id===t.id)))
    return {ok:false,reason:'Selecione alvos válidos na cena.'};
  const amount=targetTokens.length;
  if(rule.targetMode==='single-ally'||rule.targetMode==='single-enemy'||rule.targetMode==='touch-foe'){
    if(amount!==1)return {ok:false,reason:'Este poder exige exatamente um alvo.'};
  }
  if(rule.targetMode==='multi-ally'&&amount>rank(caster))return {ok:false,reason:'Máximo de aliados: Rank do personagem.'};
  if(rule.targetMode==='multi-enemy'&&amount>rank(caster))return {ok:false,reason:'Máximo de inimigos: Rank do personagem.'};
  if(rule.targetMode==='operations-center'){
    const defense=Number(caster?.system?.abilities?.vig?.defense);
    if(!Number.isSafeInteger(defense)||defense<1||amount>defense)return {ok:false,reason:'Operations Center: limite de aliados pela defesa de Vigilance.'};
  }
  if(rule.targetMode==='focus-fire'){
    const foes=targetTokens.filter(t=>isEnemy(t,sourceToken)),allies=targetTokens.filter(t=>isAlly(t,sourceToken));
    if(foes.length!==1||!allies.length||allies.length>vig(caster)||allies.some(t=>t.id===sourceToken.id))
      return {ok:false,reason:'Focus Fire: marque um inimigo e de 1 até Vigilance aliados.'};
  }else for(const target of targetTokens){
    if(rule.sign>0&&(!isAlly(target,sourceToken)||target.id===sourceToken.id))
      return {ok:false,reason:'Este poder exige alvos aliados diferentes do lançador.'};
    if(rule.sign<0&&!isEnemy(target,sourceToken))return {ok:false,reason:'Este poder exige inimigos.'};
  }
  if(rule.touch){
    if(targetTokens.some(t=>!touch(sourceToken,t,scene)))return {ok:false,reason:'O alvo precisa estar ao alcance de toque.'};
  }else if(rule.range==='rank5'){
    if(targetTokens.some(t=>distanceSpaces(sourceToken,t,scene)>5*rank(caster)+0.01))
      return {ok:false,reason:'Alvo fora do alcance inicial de 5 espaços por Rank.'};
  }
  // No second arbitrary Concentration replacement dialog on the GM client.
  // Reuse the existing D616 concentration when refreshing this exact power.
  const owned=arr(caster.effects).some(e=>active(e)&&
    String(e.flags?.[NS]?.concentrationPower?.itemId??'')===String(item?.id??''));
  if(!owned&&concentrationLevel(caster)>=Math.min(rank(caster),6))
    return {ok:false,reason:'Limite de Concentração atingido. Encerre outro poder antes de usar este.'};
  return {ok:true,reason:''};
}

/** GM-only called after authorized validation and a single cost deduction.
 * source marker is the ordinary D616 Concentration ActiveEffect; its deletion
 * removes only effects derived from that marker. */
export async function applyFortuneConcentration({caster,item,sourceToken,targetTokens,rule,scene,combat}={}){
  // Dynamic loading keeps offline pure rule/audit tests free of Foundry-only
  // initialization hooks. Foundry itself loads these modules normally.
  const [{handleConcentrationOnUse},{beginFocusMaintenance}]=await Promise.all([
    import('./concentration.js'),import('./focus-maintenance.mjs')]);
  const existing=effectFor(caster,item);
  const ok=await handleConcentrationOnUse(caster,item);
  if(!ok)throw new Error('Não foi possível iniciar Concentração.');
  const marker=effectFor(caster,item);
  if(!marker?.id)throw new Error('Concentração do poder não encontrada.');
  try { await beginFocusMaintenance(caster,item); }
  catch(error){
    if(!existing)try{await caster.deleteEmbeddedDocuments('ActiveEffect',[marker.id]);}catch(cleanup){console.error('[D616][fortune] manutenção/limpeza:',cleanup);}
    throw error;
  }
  let changed=0;
  try{
    const foes=rule.targetMode==='focus-fire' ? targetTokens.filter(t=>isEnemy(t,sourceToken)) : [];
    const applying=rule.targetMode==='focus-fire'?targetTokens.filter(t=>isAlly(t,sourceToken)):targetTokens;
    for(const targetToken of applying){
      const target=targetToken.actor;
      const before=arr(target.effects).filter(e=>e.flags?.[NS]?.nativeFortune?.sourceActorUuid===caster.uuid &&
        e.flags?.[NS]?.nativeFortune?.powerId===rule.id);
      if(before.length)await target.deleteEmbeddedDocuments('ActiveEffect',before.map(e=>e.id));
      const markerData={version:1,powerId:rule.id,sign:rule.sign,mode:rule.targetMode==='focus-fire'?'focus-fire':'all-checks',
        sourceActorUuid:caster.uuid,sourceEffectId:marker.id,sourceItemId:item.id,
        combatId:combat.id,...(foes[0]?{foeUuid:foes[0].actor.uuid}:{}),
        ...(rule.targetMode==='operations-center'?{oneRound:true,round:combat.round,turn:combat.turn}:{}),
      };
      await target.createEmbeddedDocuments('ActiveEffect',[{name:`${item.name} — ${rule.sign>0?'Sorte':'Azar'}`,
        img:item.img,disabled:false,changes:[],flags:{[NS]:{nativeFortune:markerData}}}]);
      changed++;
    }
    return {changed,markerId:marker.id,existing:!!existing};
  }catch(error){
    if(!existing&&changed===0){
      try{await caster.deleteEmbeddedDocuments('ActiveEffect',[marker.id]);}catch(cleanup){console.error('[D616][fortune] limpeza de Concentração:',cleanup);}
    }
    throw new Error(changed?`Efeito parcial aplicado a ${changed} alvo(s): ${error?.message??error}`:String(error?.message??error));
  }
}

const modifier=(name,sign)=>({source:`Sorte/Azar: ${name}`,reason:'Modificador do poder enquanto o lançador mantém Concentração',sign});
export function expiredFortuneOneRound(flag,combat=globalThis.game?.combat){
  if(!flag?.oneRound)return false;
  if(!combat?.started||flag.combatId!==combat.id)return true;
  const source=arr(combat.combatants).find(c=>c.actor?.uuid===flag.sourceActorUuid);
  if(!source)return true;
  return combat.combatant?.id===source.id&&
    (Number(combat.round)>Number(flag.round)||
      (Number(combat.round)===Number(flag.round)&&Number(combat.turn)!==Number(flag.turn)));
}
function effectSources(actor){return arr(actor?.effects).filter(active).map(e=>({name:e.name,flag:e.flags?.[NS]?.nativeFortune}))
  .filter(e=>e.flag?.version===1&&!expiredFortuneOneRound(e.flag));}
export function fortuneCheckModifiers(actor){
  const found=effectSources(actor).filter(e=>e.flag.mode==='all-checks').map(e=>modifier(e.name,e.flag.sign));
  // Lucky Us grants the caster Edge even when not explicitly selected as an ally.
  if(arr(actor?.effects).some(e=>active(e)&&e.flags?.[NS]?.concentrationPower?.transient===true&&
    arr(actor?.items).some(i=>i?.id===e.flags[NS].concentrationPower.itemId&&
      i?.type==='power'&&i.name==='Lucky Us'&&i.system?.powerSet==='Luck')))
    found.push(modifier('Lucky Us (lançador)',1));
  return found;
}
export function fortuneFocusFireTargetModifier(actor,target,{attack=false}={}){
  if(!attack||!target)return null;
  const buff=effectSources(actor).find(e=>e.flag.mode==='focus-fire'&&e.flag.foeUuid===target.uuid);
  return buff?modifier(buff.name,1):null;
}

/** Remove a target buff when source concentration ends (and on combat deletion).
 * No changes to unrelated effects or to the global duration engine. */
export async function clearFortuneDependents(effect){
  if(!globalThis.game?.user?.isGM||game.users?.activeGM?.id&&game.user.id!==game.users.activeGM.id)return 0;
  if(!effect?.flags?.[NS]?.concentrationPower?.transient)return 0;
  const caster=effect.parent?.uuid;
  if(!caster||!effect.id)return 0;
  const actors=[...arr(game.actors),...arr(game.scenes).flatMap(s=>tokens(s).map(t=>t.actor)),
    ...arr(game.combat?.combatants).map(c=>c.actor)];
  let removed=0;
  for(const actor of new Set(actors.filter(Boolean))){
    const ids=arr(actor.effects).filter(e=>e.flags?.[NS]?.nativeFortune?.sourceActorUuid===caster&&
      e.flags?.[NS]?.nativeFortune?.sourceEffectId===effect.id).map(e=>e.id).filter(Boolean);
    if(ids.length){await actor.deleteEmbeddedDocuments('ActiveEffect',ids);removed+=ids.length;}
  }
  return removed;
}
export function registerFortuneCleanupHooks(){
  Hooks.on('updateCombat',(combat,changes)=>{
    if(!game.user?.isGM||game.users?.activeGM?.id&&game.user.id!==game.users.activeGM.id)return;
    if(!Object.hasOwn(changes??{},'turn')&&!Object.hasOwn(changes??{},'round'))return;
    const actors=[...arr(game.actors),...arr(game.scenes).flatMap(s=>tokens(s).map(t=>t.actor))];
    for(const actor of new Set(actors.filter(Boolean))){
      const ids=arr(actor.effects).filter(e=>expiredFortuneOneRound(e.flags?.[NS]?.nativeFortune,combat)).map(e=>e.id).filter(Boolean);
      if(ids.length)void actor.deleteEmbeddedDocuments('ActiveEffect',ids).catch(console.error);
    }
  });
  Hooks.on('updateToken',(token,changes)=>{
    if(!game.user?.isGM||game.users?.activeGM?.id&&game.user.id!==game.users.activeGM.id)return;
    if(!Object.hasOwn(changes??{},'x')&&!Object.hasOwn(changes??{},'y'))return;
    const actor=token?.actor;
    if(!actor?.deleteEmbeddedDocuments)return;
    const affected=concentrationEffects(actor).filter(e=>{
      const id=e.flags?.[NS]?.concentrationPower?.itemId;
      const item=actor.items?.get?.(id);
      return item?.type==='power'&&item.name==='Operations Center'&&item.system?.powerSet==='Tactics';
    });
    if(affected.length)void actor.deleteEmbeddedDocuments('ActiveEffect',affected.map(e=>e.id)).catch(console.error);
  });
  Hooks.on('deleteCombat',combat=>{
    if(!game.user?.isGM||game.users?.activeGM?.id&&game.user.id!==game.users.activeGM.id)return;
    const actors=[...arr(game.actors),...arr(game.scenes).flatMap(s=>tokens(s).map(t=>t.actor))];
    for(const actor of new Set(actors.filter(Boolean))){
      const ids=arr(actor.effects).filter(e=>e.flags?.[NS]?.nativeFortune?.combatId===combat.id).map(e=>e.id).filter(Boolean);
      if(ids.length)void actor.deleteEmbeddedDocuments('ActiveEffect',ids).catch(console.error);
    }
  });
  Hooks.on('deleteActiveEffect',effect=>{void clearFortuneDependents(effect).catch(console.error);});
  Hooks.on('updateActiveEffect',(effect,changes)=>{
    if(changes?.disabled===true)void clearFortuneDependents(effect).catch(console.error);
  });
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerFortuneCleanupHooks);
