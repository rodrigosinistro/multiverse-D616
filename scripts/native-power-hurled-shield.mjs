/**
 * Multiverse-D616 v0.2.207 — one incoming attack protected by Hurled Shield Block.
 *
 * GM alone creates/removes the marker on the chosen allied Token Actor.
 * It is deliberately NOT a persistent system.healthDamageReduction change:
 * damage cards may have been rolled before the Reaction was declared, and
 * this benefit protects one Health damage confirmation, not later attacks.
 * The ordinary MMDR damage-confirmation handler consumes the marker after
 * successfully resolving the selected target's damage (including zero damage).
 */
import {calculateD616Damage} from './damage-calculation.js';
import {effectiveTeamDamageReduction} from './team-maneuvers-effects.mjs';
import {nativePowerResultMessage} from './native-power-chat.mjs';
const NS='multiverse-d616';
const KEY='nativeHurledShieldBlock';
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const powerLevel=p=>p?.type==='power'&&p.system?.powerSet==='Shield Bearer'
  ?Number(/^Shield ([1-4])$/.exec(String(p.name))?.[1]??0):0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** An active Shield takes precedence over higher learned but inactive ones. */
export function sourceShieldLevel(caster){
  const powers=all(caster?.items).filter(p=>powerLevel(p)>0);
  const active=[];
  for(const effect of all(caster?.effects)){
    const flag=effect?.flags?.[NS]?.concentrationPower;
    if(!flag || effect.disabled || effect.duration?.expired)continue;
    const power=powers.find(p=>p.id===flag.itemId || (flag.itemUuid&&p.uuid===flag.itemUuid));
    if(power)active.push(powerLevel(power));
  }
  return Math.max(0,...(active.length?active:powers).map(p=>typeof p==='number'?p:powerLevel(p)));
}

export function pendingHurledShield(actor,{combat=globalThis.game?.combat,tokenId=null,sceneId=null}={}){
  // Never guess which instance of a linked actor is being protected.
  if(!combat?.started||!tokenId)return null;
  const effects=all(actor?.effects).filter(e=>{
    const record=e?.flags?.[NS]?.[KEY];
    return !e.disabled && !e.duration?.expired && record?.version===1 && !record.consumed &&
      String(record.combatId)===String(combat.id) &&
      String(record.targetTokenId)===String(tokenId) &&
      (!sceneId || String(record.sceneId)===String(sceneId));
  });
  return effects.length===1?{effect:effects[0],...effects[0].flags[NS][KEY]}:null;
}

/** Grid-cell center distance, including different token sizes. */
export function shieldBlockRange(source,target,scene,rank){
  const size=Number(scene?.grid?.size??globalThis.canvas?.grid?.size);
  if(!Number.isFinite(size)||size<=0||!Number.isInteger(rank)||rank<1)return false;
  const center=t=>({x:Number(t.x)+Number(t.width??1)*size/2,
    y:Number(t.y)+Number(t.height??1)*size/2});
  const a=center(source),b=center(target);
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return false;
  return Math.hypot(a.x-b.x,a.y-b.y)/size<=rank*5+1e-6;
}

export function inspectHurledShieldBlock({caster,sourceToken,targetToken,scene,combat}={}){
  if(!combat?.started)return {ok:false,reason:'Hurled Shield Block exige combate ativo.'};
  if(!caster||!sourceToken?.id||!targetToken?.id||!scene)return {ok:false,reason:'Selecione um aliado válido na cena.'};
  if(!targetToken.actor||targetToken.actor.uuid===caster.uuid||targetToken.id===sourceToken.id)
    return {ok:false,reason:'Hurled Shield Block exige um aliado diferente do lançador.'};
  if(Number(sourceToken.disposition)!==Number(targetToken.disposition))
    return {ok:false,reason:'Hurled Shield Block só protege aliados.'};
  const rank=Number(caster.system?.attributes?.rank?.value);
  if(!shieldBlockRange(sourceToken,targetToken,scene,rank))
    return {ok:false,reason:'Aliado fora do alcance de 5 × Rank espaços.'};
  const shield=sourceShieldLevel(caster);
  if(shield<1)return {ok:false,reason:'É necessário possuir Shield 1 ou superior.'};
  if(pendingHurledShield(targetToken.actor,{combat,tokenId:targetToken.id}))
    return {ok:false,reason:'Este aliado já possui Hurled Shield Block aguardando dano.'};
  return {ok:true,shield};
}

/**
 * One-shot GM transaction, called ONLY through the pre-existing verified
 * atomic support channel. Every resource and target comes from GM-resolved
 * scene documents, not from a client-supplied Actor UUID or DR value.
 */
export async function commitHurledShieldBlock({caster,item,sourceToken,targetToken,scene,combat,
  tracker=globalThis.game?.multiverseD616?.turnTracker,
  post=async data=>globalThis.ChatMessage?.create?.(data),
  speaker=options=>globalThis.ChatMessage?.getSpeaker?.(options),
}={}){
  const valid=inspectHurledShieldBlock({caster,sourceToken,targetToken,scene,combat});
  if(!valid.ok)throw new Error(valid.reason);
  if(!tracker?.trackItemUse || !tracker?.getState)throw new Error('Rastreador de Reações indisponível.');
  const combatants=all(combat.combatants).filter(c=>c.actor?.uuid===caster.uuid ||
    (c.tokenId===sourceToken.id&&c.actorId===sourceToken.actorId));
  const sourceCombatant=combatants.find(c=>c.tokenId===sourceToken.id)??(combatants.length===1?combatants[0]:null);
  if(!sourceCombatant)throw new Error('O lançador precisa estar na iniciativa.');
  const state=tracker.getState(sourceCombatant);
  if(!state||Number(state.reactionUsed)>=Number(state.reactionMax))throw new Error('Não há Reação disponível.');
  const focus=Number(caster.system?.focus?.value);
  if(!Number.isFinite(focus)||focus<5)throw new Error('Focus insuficiente: requer 5.');
  if(!targetToken.actor.createEmbeddedDocuments)throw new Error('Não é possível aplicar proteção ao aliado.');
  const saved={version:1,level:valid.shield,combatId:String(combat.id),sceneId:String(scene.id),
    sourceActorUuid:String(caster.uuid),sourceCombatantId:String(sourceCombatant.id),
    sourceTokenId:String(sourceToken.id),targetTokenId:String(targetToken.id),
    round:Number(combat.round),turn:Number(combat.turn)};
  let used=false,spent=false,effectId=null,posted=false;
  try{
    used=Boolean(await tracker.trackItemUse(item));
    if(!used)throw new Error('A Reação não foi autorizada.');
    await caster.update({'system.focus.value':focus-5});spent=true;
    const created=await targetToken.actor.createEmbeddedDocuments('ActiveEffect',[{
      name:`Hurled Shield Block — RD ${valid.shield} (1 ataque)`,img:item.img,
      disabled:false,transfer:false,changes:[],duration:{},
      flags:{[NS]:{[KEY]:saved}},
    }]);
    effectId=created?.[0]?.id;
    if(!effectId)throw new Error('Não foi possível confirmar o efeito no alvo.');
    const content=`<p><strong>Alvo:</strong> ${esc(targetToken.name??targetToken.actor.name)}. `+
      `<strong>RD de Health temporária:</strong> ${valid.shield} (Shield ${valid.shield} do lançador).</p>`+
      '<p>A proteção vale para <strong>um único ataque</strong> e será consumida automaticamente quando o Mestre confirmar o dano de Health desse alvo, mesmo se o card de dano tiver sido calculado antes da Reação. Não soma com RD própria: prevalece a maior.</p>'+
      '<p><strong>Focus gasto:</strong> 5. <strong>Reação:</strong> 1. O escudo retorna no início do próximo turno do lançador; as restrições do escudo até lá são arbitradas pelo Mestre.</p>';
    const data={speaker:typeof speaker==='function'?speaker({actor:caster}):{},...nativePowerResultMessage(item,content)};
    await post(data);posted=true;
    return {ok:true,events:[`${targetToken.actor.name}: RD Health ${valid.shield} até o dano de um ataque`],spent:5};
  }catch(error){
    if(!posted&&effectId){try{await targetToken.actor.deleteEmbeddedDocuments('ActiveEffect',[effectId]);}
      catch(e){console.error('[D616] Hurled Shield Block: falha ao remover efeito na reversão.',e);}}
    if(!posted&&spent){try{await caster.update({'system.focus.value':Number(caster.system.focus.value)+5});}
      catch(e){console.error('[D616] Hurled Shield Block: estorno Focus falhou.',e);}}
    if(!posted&&used){try{await tracker.refundReaction?.(sourceCombatant);}
      catch(e){console.error('[D616] Hurled Shield Block: estorno de Reação falhou.',e);}}
    throw error;
  }
}

/** The actual damage is resolved from the saved card, AFTER the Reaction. */
export function hurledShieldDamageForEntry(entry,{actor,tokenId,sceneId=null,combat=globalThis.game?.combat,
  damageMessage=null,action='full',piercing=null}={}){
  if(!damageMessage||action==='heal')return null; // no recurring/periodic damage or cures
  const guard=pendingHurledShield(actor,{combat,tokenId,sceneId});
  if(!guard)return null;
  const category=entry.category;
  if(category!=='health')return {guard,damage:Math.max(0,Number(entry.damage)||0),mitigated:0,health:false};
  const factor=Number(entry.damageFactor);
  const custom=Number(entry.customDamageMultiplier);
  const damageFactor=Number.isFinite(factor)&&factor>=0?factor:(entry.fantastic?2:1);
  // Adamantium reduces both personal RD and the temporary shield. The
  // original card already stores its own *effective* DR after piercing.
  const ignored=Math.max(0,Number(piercing??entry.adamantiumIgnored)||0);
  const ownDR=Math.max(0,Number(entry.damageReduction)||0,
    effectiveTeamDamageReduction(actor,'health',combat)-ignored);
  const shieldDR=Math.max(0,guard.level-ignored);
  const newDR=Math.max(ownDR,shieldDR);
  const old=Number(entry.damage)||0;
  const die=Number(entry.marvelDie),dm=Number(entry.damageMultiplier);
  let revised=old;
  if(Number.isFinite(die)&&die>=0&&Number.isFinite(dm)&&dm>0&&newDR>Number(entry.damageReduction||0)){
    const oldNormal=calculateD616Damage({marvelDie:die,damageMultiplier:dm,
      damageReduction:Number(entry.damageReduction)||0,ability:Number(entry.abilityDamage)||0,
      bonus:Number(entry.flatBonus)||0}).damage;
    const newNormal=calculateD616Damage({marvelDie:die,damageMultiplier:dm,
      damageReduction:newDR,ability:Number(entry.abilityDamage)||0,
      bonus:Number(entry.flatBonus)||0}).damage;
    const scaled=n=>Math.ceil(n*damageFactor*(Number.isFinite(custom)&&custom>0?custom:1));
    // Formula-only path preserves power-specific half/triple damage. If the
    // original card includes extra custom changes, keep its exact total and
    // subtract only the difference produced by this additional RD.
    const baseline=scaled(oldNormal),withShield=scaled(newNormal);
    revised=baseline===old?withShield:Math.max(0,old-(baseline-withShield));
  }
  revised=Math.max(0,Math.min(old,revised));
  return {guard,damage:revised,mitigated:old-revised,health:true,level:guard.level};
}

/** Only the GM consumes the protection after the target's damage has resolved. */
export async function consumeHurledShield(actor,guard){
  if(!actor?.deleteEmbeddedDocuments||!guard?.effect?.id)return false;
  try{
    await actor.deleteEmbeddedDocuments('ActiveEffect',[guard.effect.id]);
    return true;
  }catch(error){
    // Damage may ALREADY have been applied. Never fail the whole confirmation
    // here and expose a second clickable DANO that could duplicate the hit.
    // Mark as consumed first if deletion is transiently unavailable.
    try{await guard.effect.update({[`flags.${NS}.${KEY}.consumed`]:true});}
    catch(markError){console.error('[D616] Hurled Shield Block: falha ao inutilizar o efeito após o dano.',markError);}
    console.error('[D616] Hurled Shield Block: falha ao remover o efeito consumido.',error);
    globalThis.ui?.notifications?.warn?.('Hurled Shield Block: dano aplicado, mas não foi possível remover o efeito visual; o Mestre deve removê-lo manualmente.');
    return false;
  }
}

/** Do not leave a one-attack marker active for later attacks if no damage was
 * ever confirmed: the shield returns at the start of its owner's next turn. */
export function isHurledShieldExpired(record,combat){
  if(!record||!combat||!combat.started||record.combatId!==String(combat.id))return true;
  if(String(combat.combatant?.id)!==String(record.sourceCombatantId))return false;
  return Number(combat.round)>Number(record.round) ||
    (Number(combat.round)===Number(record.round)&&Number(combat.turn)!==Number(record.turn));
}
export function registerHurledShieldExpiryHooks(){
  const isGM=()=>globalThis.game?.user?.isGM &&
    (!game.users?.activeGM||game.user.id===game.users.activeGM.id);
  const clean=async combat=>{
    if(!isGM())return;
    const actors=new Set([...all(game.actors),...all(game.scenes).flatMap(s=>all(s.tokens).map(t=>t.actor)),
      ...all(combat?.combatants).map(c=>c.actor)].filter(Boolean));
    for(const actor of actors){
      const ids=all(actor.effects).filter(e=>{
        const record=e.flags?.[NS]?.[KEY];
        return record?.version===1&&isHurledShieldExpired(record,combat);
      }).map(e=>e.id).filter(Boolean);
      if(ids.length)try{await actor.deleteEmbeddedDocuments('ActiveEffect',ids);}
      catch(error){console.error('[D616] Hurled Shield Block: expiração automática falhou.',error);}
    }
  };
  globalThis.Hooks?.on?.('updateCombat',(combat,changes)=>{
    if(Object.hasOwn(changes??{},'round')||Object.hasOwn(changes??{},'turn')||
      Object.hasOwn(changes??{},'started'))void clean(combat).catch(console.error);
  });
  globalThis.Hooks?.on?.('deleteCombat',()=>void clean(null).catch(console.error));
  void clean(globalThis.game?.combat??null).catch(console.error);
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerHurledShieldExpiryHooks);
