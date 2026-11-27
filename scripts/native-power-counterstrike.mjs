/**
 * Multiverse-D616 v0.2.212 — Counterstrike Technique (Martial Arts).
 * Official FAQ: trigger only AFTER a close attack has dealt real damage while
 * Attack Stance is active. Recalculate the ATTACKER'S regular (non-Fantastic)
 * damage against the ATTACKER'S own Health RD, THEN halve and round UP.
 *
 * All reads/Focus/Reaction/card generation are GM-authoritative. A player sends
 * a bounded, atomic string packet on their owned WORLD Actor, using the
 * authenticated updateActor userId, exactly as in the v196 support protocol.
 * The generated MMDR card is NOT linked as a replay of the original attack:
 * GM alone clicks DANO, once, in the existing damage application engine.
 */
import {calculateD616Damage} from './damage-calculation.js';
import {effectiveTeamDamageReduction} from './team-maneuvers-effects.mjs';
import {hasAttackStanceConcentration} from './native-power-martial-stances.mjs';
import {focusAvailable,validateFocusSpend} from './focus-cost.mjs';
import {nativePowerResultMessage} from './native-power-chat.mjs';
import {findCasterToken,supportRequestChannel,encodeSupportPacket,decodeSupportPacket} from './native-power-support.mjs';
import {reactionCombatant} from './native-power-spider-defenses.mjs';
import {resolveNativePowerAutomation} from './native-power-automations.mjs';
const NS='multiverse-d616';
const POWER_ID='Z2bM6AFg0F0jtzm3';
const REQUEST='nativeCounterstrikeRequestV1';
const RESULT='nativeCounterstrikeResultV1';
const USED='nativeCounterstrikeUsedTokensV1';
const COST=5;
const ownedLevel=()=>globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3;
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=(doc,key)=>doc?.getFlag?.(NS,key)??doc?.flags?.[NS]?.[key];
const activeGM=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.user.id===game.users.activeGM.id);
const changeField=(changes,key)=>changes?.flags?.[NS]?.[key]??changes?.[`flags.${NS}.${key}`]??changes?.flags?.[`${NS}.${key}`];
const tokenUuid=(scene,token)=>`Scene.${scene.id}.Token.${token.id}`;
const canAct=item=>item?.type==='power'&&item.name==='Counterstrike Technique'&&item.system?.powerSet==='Martial Arts';

export function isCounterstrikeTechnique(item){return canAct(item);}

/** This identification is checked on the ACTUAL GM-owned embedded power. */
export function isOfficialCounterstrike(item){
  if(!canAct(item))return false;
  // The installed Item is a COPY of the official compendium power. Foundry
  // normally assigns Actor.<actorId>.Item.<NEW embedded ID>; that final ID is
  // *not* the compendium's POWER_ID. This also applies to synthetic token Actors.
  // Resolve against the immutable, internally registered POWER SET + NAME,
  // which already checks conflicts with other registered powers' provenance.
  const official=resolveNativePowerAutomation(item);
  if(official?.powerId!==POWER_ID||official?.handlerId!=='counterstrike-technique' ||
     !['native-active','native-partial'].includes(official.status))return false;
  const declared=item.flags?.[NS]?.nativeAutomation?.powerId;
  if(declared && declared!==POWER_ID)return false;
  // Explicit compendium identities are authoritative. Reject copies declared
  // to originate from a DIFFERENT compendium power; never treat an Actor/Token
  // embedded UUID as if it were a Compendium Power ID.
  for(const source of [item.flags?.core?.sourceId,item.flags?.['scene-packer']?.sourceId,
    item.flags?.[NS]?.sourcePowerUuid,item.uuid]){
    if(typeof source!=='string'||!source.startsWith('Compendium.'))continue;
    const match=source.match(/(?:^|\.)Item\.([a-zA-Z0-9]{16})$/);
    if(match&&match[1]!==POWER_ID)return false;
  }
  return true;
}

/** Inspect the immutable confirmed MMDR receipt, never an unconfirmed attack
 * roll or a client-supplied damage number. Returns a source power roll exactly
 * as captured BEFORE a Fantastic damage multiplier is applied.
 */
export function inspectCounterstrikeTrigger({damageMessage,attackMessage,scene,defenderToken,combat,
  attackerToken=null}={}){
  if(!combat?.started||!scene?.id||!defenderToken?.id)
    return {ok:false,reason:'Counterstrike Technique exige combate iniciado e token defensor na cena.'};
  if(!damageMessage?.id||!attackMessage?.id||!attackMessage.rolls?.length)
    return {ok:false,reason:'Não foi encontrado um ataque com card de dano original.'};
  const sourceId=flag(damageMessage,'sourceMessageId');
  if(sourceId!==attackMessage.id)return {ok:false,reason:'O card de dano não corresponde ao ataque informado.'};
  if(attackMessage.speaker?.scene!==scene.id)return {ok:false,reason:'O ataque pertence a outra cena.'};
  const token=attackerToken??scene.tokens?.get?.(attackMessage.speaker?.token);
  if(!token?.id||token.id===defenderToken.id||token.parent?.id&&token.parent.id!==scene.id)
    return {ok:false,reason:'Token do atacante original não encontrado.'};
  const ability=String(flag(attackMessage,'ability')??'').toLowerCase().trim();
  const displayed=String(attackMessage.flavor??'');
  if(!['mle','melee'].includes(ability)&&!/\bability\s*:\s*melee\b/i.test(displayed)&&
    !/\[ability\]\s*mle\b/i.test(displayed))
    return {ok:false,reason:'Counterstrike Technique exige que o dano venha de ataque corpo a corpo (Melee).'};
  if(flag(attackMessage,'powerCheck')===true)
    return {ok:false,reason:'Um teste sem ataque não aciona Counterstrike Technique.'};
  const publicReceipt=flag(attackMessage,'combatChatResolution');
  if(!publicReceipt?.targets?.some(t=>t.targetUuid===tokenUuid(scene,defenderToken)&&Number(t.damage)>0))
    return {ok:false,reason:'O resultado real do ataque ainda não foi publicado pelo Mestre.'};
  const receipt=flag(damageMessage,'mmdrResolved');
  if(!receipt||receipt.action==='heal'||!Array.isArray(receipt.results))
    return {ok:false,reason:'O Mestre ainda não confirmou DANO nesse ataque.'};
  const victim=tokenUuid(scene,defenderToken);
  const result=receipt.results.find(r=>r.targetUuid===victim && !r.heal&&!r.blocked&&Number(r.delta)>0);
  if(!result)return {ok:false,reason:'O ataque não causou dano real ao personagem protegido.'};
  const snapshot=flag(damageMessage,'damageApplication');
  const entry=(snapshot?.entries??[]).find(e=>e.targetUuid===victim);
  if(!entry||!['health','focus'].includes(String(entry.category??'health').toLowerCase()))
    return {ok:false,reason:'O card original não possui uma fórmula de dano verificável.'};
  const marvelDie=Number(entry.marvelDie),damageMultiplier=Number(entry.damageMultiplier),
    abilityDamage=Number(entry.abilityDamage??0),flatBonus=Number(entry.flatBonus??0);
  if(![marvelDie,damageMultiplier,abilityDamage,flatBonus].every(Number.isFinite)||
     !Number.isSafeInteger(marvelDie)||marvelDie<1||marvelDie>6||
     !Number.isFinite(damageMultiplier)||damageMultiplier<=0)
    return {ok:false,reason:'Os dados originais não permitem calcular o dano regular do atacante.'};
  if(all(flag(damageMessage,USED)).includes(defenderToken.id))
    return {ok:false,reason:'Counterstrike Technique já foi usado contra este ataque pelo personagem.'};
  return {ok:true,attackerToken:token,entry,result,damageMessage,attackMessage,
    snapshot:{marvelDie,damageMultiplier,abilityDamage,flatBonus,category:entry.category==='focus'?'focus':'health'}};
}

export function calculateCounterstrikeReturn(snapshot,attackerReduction){
  const dr=Number(attackerReduction);
  if(!snapshot||!Number.isFinite(dr)||dr<0||!Number.isInteger(dr))
    throw new Error('RD do atacante inválida.');
  const {marvelDie,damageMultiplier,abilityDamage,flatBonus}=snapshot;
  if(![marvelDie,damageMultiplier,abilityDamage,flatBonus].every(Number.isFinite) ||
      marvelDie<1||marvelDie>6||damageMultiplier<=0)
    throw new Error('Fórmula do golpe original inválida.');
  const normal=calculateD616Damage({marvelDie,damageMultiplier,damageReduction:dr,
    ability:abilityDamage,bonus:flatBonus,fantastic:false}).damage;
  return {normal,returnDamage:Math.ceil(normal/2),reduction:dr,
    effectiveMultiplier:Math.max(0,damageMultiplier-dr)};
}

/** The player's ChatLog may not contain the GM-only technical damage card.
 * The public original ATTACK card does contain the released, confirmed damage
 * after the Narrator clicks DANO. Send only its ID; the GM fetches the private
 * technical card and recomputes EVERYTHING from trusted documents.
 */
export function latestPublicCounterstrikeAttack(messages,scene,defenderToken){
  const victim=scene?.id&&defenderToken?.id?tokenUuid(scene,defenderToken):'';
  const recent=all(messages).slice(-100);
  for(let i=recent.length-1;i>=0;i--){
    const attack=recent[i],released=flag(attack,'combatChatResolution');
    if(!victim||attack?.speaker?.scene!==scene.id||!released?.targets?.some(t=>t.targetUuid===victim))continue;
    if(released.action==='heal'||released.targets.find(t=>t.targetUuid===victim)?.damage<=0)
      return {ok:false,reason:'O último ataque confirmado não causou dano ao personagem.'};
    if(flag(attack,'powerCheck')===true)return {ok:false,reason:'O último teste não foi um ataque.'};
    const ability=String(flag(attack,'ability')??'').toLowerCase().trim();
    if(!['mle','melee'].includes(ability)&&
       !/\bability\s*:\s*melee\b/i.test(String(attack.flavor??''))&&
       !/\[ability\]\s*mle\b/i.test(String(attack.flavor??'')))
      return {ok:false,reason:'O último ataque confirmado não foi um ataque Melee.'};
    return {ok:true,attackMessage:attack};
  }
  return {ok:false,reason:'Nenhum dano confirmado recente aparece no card público de ataque.'};
}

/** Resolve only the newest eligible, not a prior round's arbitrary target.
 * Sender chooses no formula or enemy UUID: GM resolves them from the stored
 * attack and damage receipts. Use recent chat cards in original chronology.
 */
export function latestCounterstrikeDamage(messages,scene,token,combat){
  const recent=all(messages).slice(-100);
  const byId=new Map(recent.map(m=>[m.id,m]));
  for(let i=recent.length-1;i>=0;i--){
    const damage=recent[i],attack=byId.get(flag(damage,'sourceMessageId'));
    const receipt=flag(damage,'mmdrResolved');
    if(!attack||!receipt?.results||attack.speaker?.scene!==scene?.id)continue;
    if(!receipt.results.some(r=>r.targetUuid===tokenUuid(scene,token)))continue;
    // The most recent confirmed attack on this token governs the trigger.
    // Never skip a spent/invalid trigger and reuse a stale older hit.
    return inspectCounterstrikeTrigger({damageMessage:damage,attackMessage:attack,
      scene,defenderToken:token,combat});
  }
  return {ok:false,reason:'Nenhum ataque Melee recente com dano confirmado contra este personagem. Confirme o dano antes de usar o poder.'};
}

function actualPower(caster,itemId){
  const exact=caster.items?.get?.(itemId);
  if(exact){if(!isOfficialCounterstrike(exact))throw new Error('O Item solicitado não é Counterstrike Technique oficial.');return exact;}
  const candidates=all(caster.items).filter(isOfficialCounterstrike);
  if(candidates.length!==1)throw new Error('Counterstrike Technique oficial não encontrado no personagem.');
  return candidates[0];
}

export function counterstrikeCardData({item,attackerToken,scene,trigger,calculation,defenderName}={}){
  if(!item||!attackerToken?.actor||!trigger?.damageMessage?.id||!scene?.id||!calculation)
    throw new Error('Dados insuficientes para gerar o card de Counterstrike Technique.');
  const targetUuid=tokenUuid(scene,attackerToken);
  const {marvelDie,damageMultiplier,abilityDamage,flatBonus,category}=trigger.snapshot;
  const data=nativePowerResultMessage(item,
    `<p><strong>Contra-ataque de ${esc(defenderName)} contra ${esc(attackerToken.name??attackerToken.actor.name)}.</strong></p>`+
    `<p>Golpe Melee confirmado: dado Marvel <strong>${marvelDie}</strong> × `+
    `(${damageMultiplier} − RD ${calculation.reduction})`+
    `${abilityDamage?` + ${abilityDamage} de habilidade`:''}`+
    `${flatBonus?` + ${flatBonus} de bônus`:''}`+
    ` = <strong>${calculation.normal} de dano normal</strong>. `+
    `Metade, arredondando para cima: <strong>${calculation.returnDamage} de ${category==='focus'?'Focus':'Health'}</strong>.</p>`+
    '<p><strong>Mestre:</strong> clique em <strong>DANO</strong> no card abaixo para aplicar ao ATACANTE original. '+
    'Nenhum dano é aplicado até a confirmação, e o card só pode ser resolvido uma vez.</p>');
  return {speaker:{scene:scene.id,token:trigger.defenderTokenId??null,actor:item.actor?.id,alias:defenderName},
    ...data,
    flags:{[NS]:{
      nativeCounterstrikeDamage:{version:1,originDamageMessageId:trigger.damageMessage.id,
        originAttackMessageId:trigger.attackMessage.id,attackerTokenUuid:targetUuid},
      damageApplication:{version:1,entries:[{targetUuid,actorUuid:attackerToken.actor.uuid,
        name:attackerToken.name??attackerToken.actor.name,category,
        damage:calculation.returnDamage,rawDamage:calculation.returnDamage,
        damageReduction:calculation.reduction,marvelDie,damageMultiplier,
        abilityDamage,flatBonus,normalDamage:calculation.normal,
        effectiveDamageMultiplier:calculation.effectiveMultiplier,
        fantastic:false,damageFactor:0.5}],isFantastic:false},
      targets:[{uuid:targetUuid,actorUuid:attackerToken.actor.uuid,
        name:attackerToken.name??attackerToken.actor.name}],
    }}};
}

/** Single authoritative commit. Transaction failures BEFORE message creation
 * refund the actual Focus/Reaction and free the origin's usage marker.
 */
const activeCaster=new Set();
export async function commitCounterstrike({caster,item,sourceToken,scene,combat,
  attackMessageId=null,
  tracker=globalThis.game?.multiverseD616?.turnTracker,
  messages=globalThis.game?.messages,
  createMessage=data=>globalThis.ChatMessage?.create?.(data),
}={}){
  const key=String(sourceToken?.uuid??`${scene?.id}:${sourceToken?.id}`);
  if(!key||activeCaster.has(key))throw new Error('Outra Reação deste personagem ainda está sendo processada.');
  activeCaster.add(key);
  let reserved=false,charged=false,marked=false,posted=false,prior=0;
  let trigger=null,previous=[];
  const combatant=reactionCombatant(caster,combat);
  try{
    if(!isOfficialCounterstrike(item)||!caster||!sourceToken?.id||!scene?.id||!combat?.started)
      throw new Error('Counterstrike Technique exige Item oficial, token e combate iniciado.');
    if(!hasAttackStanceConcentration(caster))throw new Error('Counterstrike Technique exige Attack Stance ativo.');
    if(!combatant)throw new Error('O personagem precisa participar do combate.');
    const cost=validateFocusSpend(caster,COST);
    if(!cost.ok)throw new Error(cost.reason);
    const found=latestCounterstrikeDamage(messages,scene,sourceToken,combat);
    if(!found.ok)throw new Error(found.reason);
    if(attackMessageId && found.attackMessage.id!==attackMessageId)
      throw new Error('O ataque confirmado mais recente mudou; verifique o card antes de usar a Reação.');
    trigger=found;
    if(!trigger.attackerToken.actor)throw new Error('O Actor do atacante original não está disponível.');
    const dr=effectiveTeamDamageReduction(trigger.attackerToken.actor,
      trigger.snapshot.category,combat);
    const calculation=calculateCounterstrikeReturn(trigger.snapshot,dr);
    if(typeof createMessage!=='function'||!tracker?.trackItemUse)
      throw new Error('Chat ou rastreador de Reações indisponível.');
    const card=counterstrikeCardData({item,scene,attackerToken:trigger.attackerToken,
      trigger:{...trigger,defenderTokenId:sourceToken.id},calculation,defenderName:caster.name});
    reserved=!!(await tracker.trackItemUse(item));
    if(!reserved)throw new Error('Reação não autorizada pelo rastreador. Nenhum Focus gasto.');
    prior=focusAvailable(caster);
    if(prior<COST)throw new Error('Focus insuficiente após reservar a Reação.');
    await caster.update({'system.focus.value':prior-COST});charged=true;
    previous=all(flag(trigger.damageMessage,USED));
    if(previous.includes(sourceToken.id))throw new Error('Essa Reação já foi utilizada neste ataque.');
    await trigger.damageMessage.setFlag(NS,USED,[...previous,sourceToken.id]);marked=true;
    const message=await createMessage(card);if(!message?.id)throw new Error('Não foi possível criar o card de dano.');
    posted=true;
    return {ok:true,cardId:message.id,damage:calculation.returnDamage,
      events:[`Contra-ataque calculado: ${calculation.returnDamage} dano; Mestre aplica pelo botão DANO.`]};
  }catch(error){
    if(!posted){
      if(marked)try{await trigger.damageMessage.setFlag(NS,USED,previous);}catch(e){console.error('[D616] Counterstrike: erro ao liberar gatilho',e);}
      if(charged)try{await caster.update({'system.focus.value':focusAvailable(caster)+COST});}catch(e){console.error('[D616] Counterstrike: erro ao estornar Focus',e);}
      if(reserved)try{await tracker.refundReaction?.(combatant);}catch(e){console.error('[D616] Counterstrike: erro ao estornar Reação',e);}
    }
    throw error;
  }finally{activeCaster.delete(key);}
}

const responses=new Map(),processing=new Set();
async function gmProcess(requestActor,packet,userId){
  const key=`${requestActor?.id}:${packet?.id}`;
  if(processing.has(key))return;
  processing.add(key);
  let reply;
  try{
    const user=game.users?.get?.(userId);
    if(!user||user.isGM||!requestActor?.testUserPermission?.(user,ownedLevel()))
      throw new Error('Solicitação sem permissão OWNER no canal do personagem.');
    const scene=game.scenes?.get?.(packet.sceneId);
    const token=scene?.tokens?.get?.(packet.sourceTokenId);
    if(!scene||!token||token.actorId!==packet.sourceActorId)
      throw new Error('Token de origem não corresponde à cena/Actor informado.');
    const caster=token.actor;
    if(!caster?.testUserPermission?.(user,ownedLevel()))throw new Error('Usuário sem permissão OWNER no token do personagem.');
    if(packet.powerId!==POWER_ID)throw new Error('Poder oficial inválido.');
    const item=actualPower(caster,packet.itemId);
    reply=await commitCounterstrike({caster,item,sourceToken:token,scene,
      combat:game.combat,attackMessageId:packet.attackMessageId});
  }catch(error){reply={ok:false,reason:String(error?.message??error)};
    console.warn('[D616][COUNTERSTRIKE-GM]',reply.reason);}
  try{await requestActor.update({[`flags.${NS}.${RESULT}`]:encodeSupportPacket({id:packet.id,...reply})});}
  catch(error){console.error('[D616] Counterstrike: confirmação ao jogador falhou',error);}
  finally{processing.delete(key);}
}

export function registerCounterstrikeHooks(){
  Hooks.on('updateActor',(actor,changes,_options,userId)=>{
    if(actor?.isToken===true)return;
    const response=decodeSupportPacket(changeField(changes,RESULT));
    if(response?.id&&userId===game.users?.activeGM?.id&&game.users?.get?.(userId)?.isGM)
      responses.get(response.id)?.(response);
    const request=decodeSupportPacket(changeField(changes,REQUEST));
    if(request?.id&&activeGM()&&userId&&!game.users?.get?.(userId)?.isGM)
      void gmProcess(actor,request,userId);
  });
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerCounterstrikeHooks);

export async function activateCounterstrike(item){
  try{
    if(!isCounterstrikeTechnique(item)||!item.actor)throw new Error('Item de Counterstrike Technique inválido.');
    const scene=globalThis.canvas?.scene,combat=globalThis.game?.combat;
    if(!scene||!combat?.started)throw new Error('Counterstrike Technique exige combate iniciado.');
    const caster=item.actor,sourceToken=findCasterToken(caster,scene,canvas.tokens?.controlled??[]);
    if(!sourceToken)throw new Error('Selecione o token que recebeu dano.');
    if(!hasAttackStanceConcentration(caster))throw new Error('Ative Attack Stance antes de usar Counterstrike Technique.');
    const found=latestPublicCounterstrikeAttack(game.messages,scene,sourceToken);
    if(!found.ok)throw new Error(found.reason);
    let reply;
    if(activeGM())reply=await commitCounterstrike({caster,item,sourceToken,scene,combat,
      attackMessageId:found.attackMessage.id});
    else{
      const gm=game.users?.activeGM;
      if(!gm?.active||!gm.isGM)throw new Error('O Mestre precisa estar conectado.');
      const channel=supportRequestChannel(caster,sourceToken);
      if(!channel?.testUserPermission?.(game.user,ownedLevel())||
          !sourceToken.actor?.testUserPermission?.(game.user,ownedLevel()))
        throw new Error('Você precisa ser DONO do personagem para ativar Counterstrike Technique.');
      const id=foundry?.utils?.randomID?.()??`${Date.now()}-${Math.random()}`;
      const wait=new Promise(resolve=>{
        const timeout=setTimeout(()=>{responses.delete(id);
          resolve({ok:false,reason:'Sem resposta do Mestre; confira o chat e os recursos antes de repetir.'});},15000);
        responses.set(id,result=>{clearTimeout(timeout);responses.delete(id);resolve(result);});
      });
      try{await channel.update({[`flags.${NS}.${REQUEST}`]:encodeSupportPacket({
        id,sceneId:scene.id,sourceTokenId:sourceToken.id,
        sourceActorId:sourceToken.actorId,itemId:item.id,powerId:POWER_ID,
        attackMessageId:found.attackMessage.id,
      })});}catch(error){responses.get(id)?.({ok:false,reason:'Não foi possível transmitir a Reação ao Mestre.'});}
      reply=await wait;
    }
    if(!reply?.ok)throw new Error(reply?.reason??'Counterstrike Technique não foi autorizado.');
    globalThis.ui?.notifications?.info?.('Counterstrike Technique: card de dano criado. O Mestre deve clicar em DANO.');
    return true;
  }catch(error){globalThis.ui?.notifications?.warn?.(String(error?.message??error));return false;}
}
