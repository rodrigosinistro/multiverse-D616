/**
 * Multiverse-D616 v0.2.218 — priority audit, batch 1.
 * Brain Drain: actual confirmed Focus damage only, GM-authoritative recovery.
 * Kill Zone: per-combat/round/target identity + return the spent Reaction.
 * Venom Sword: one explicitly selected, temporary Melee weapon (no global DM).
 * All three use existing Item.roll, MMDR, Concentration, Focus upkeep and status engines.
 */
import { reactionCombatant } from './native-power-spider-defenses.mjs';

const SYSTEM='multiverse-d616';
const BRAIN='Brain Drain';
const ZONE='Kill Zone';
const SWORD='Venom Sword';
const WEAPON_FLAG='nativeVenomSwordWeapon';
const CONFIRM_FLAG='nativeBrainDrainResolved';
const ZONE_FLAG='nativeKillZone';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const all=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
const official=(item,name,set)=>item?.type==='power'&&item?.name===name&&item?.system?.powerSet===set;
export const isBrainDrain=item=>official(item,BRAIN,'Magic');
export const isKillZone=item=>official(item,ZONE,'Ranged Weapons');
export const isVenomSword=item=>official(item,SWORD,'Spider-Powers');
export const isVenomSwordWeapon=item=>item?.type==='weapon'&&item?.flags?.[SYSTEM]?.[WEAPON_FLAG]?.version===1;

export function brainDrainRecovery(results,entries,action='full'){
  if(action==='heal'||!Array.isArray(results)||!Array.isArray(entries))return {loss:0,recovery:0};
  const permitted=new Map(entries.filter(e=>e?.targetUuid&&e.category==='focus'&&e.hit!==false)
    .map(e=>[e.targetUuid,e]));
  let loss=0,recovery=0;
  const seen=new Set();
  for(const r of results){
    if(!r?.targetUuid||seen.has(r.targetUuid)||r.heal||r.blocked||r.category!=='focus')continue;
    const original=permitted.get(r.targetUuid);
    if(!original)continue;
    seen.add(r.targetUuid);
    const actual=Math.max(0,Math.floor(Number(r.delta)||0));
    loss+=actual;
    recovery+=original.fantastic===true?actual:Math.ceil(actual/2);
  }
  return {loss,recovery};
}

export function cappedFocusRecovery(actor,amount){
  const current=Math.max(0,Number(actor?.system?.focus?.value)||0);
  const max=Math.max(0,Number(actor?.system?.focus?.max)||0);
  const desired=Math.max(0,Math.floor(Number(amount)||0));
  return {before:current,maximum:max,applied:Math.max(0,Math.min(desired,max-current))};
}

/** Called only by MMDR after it stamps the immutable damage receipt. */
export async function confirmBrainDrain({damageMessage,action,results,
  messages=globalThis.game?.messages,scenes=globalThis.game?.scenes,actors=globalThis.game?.actors,
  post=data=>globalThis.ChatMessage?.create?.(data)}={}){
  if(!globalThis.game?.user?.isGM||!damageMessage?.getFlag)return null;
  if(damageMessage.getFlag(SYSTEM,CONFIRM_FLAG))return null;
  const originalId=damageMessage.getFlag(SYSTEM,'sourceMessageId');
  const source=messages?.get?.(originalId);
  if(!source?.rolls?.length ||source.getFlag(SYSTEM,'damageType')!=='focus')return null;
  const scene=scenes?.get?.(source.speaker?.scene);
  const caster=scene?.tokens?.get?.(source.speaker?.token)?.actor??actors?.get?.(source.speaker?.actor);
  const power=caster?.items?.get?.(source.getFlag(SYSTEM,'itemId'));
  if(!isBrainDrain(power))return null;
  const snapshot=damageMessage.getFlag(SYSTEM,'damageApplication');
  if(!snapshot?.version||snapshot.sourceMessageId!==source.id)return null;
  const amount=brainDrainRecovery(results,snapshot.entries,action);
  const cap=cappedFocusRecovery(caster,amount.recovery);
  // The MMDR transaction already ensures only a single confirmed DAMAGE card
  // per roll. Claim this effect BEFORE changing Focus; a rerender or GM double
  // click can never heal the caster twice. The receipt includes zero recovery.
  await damageMessage.setFlag(SYSTEM,CONFIRM_FLAG,{
    version:1,sourceMessageId:source.id,focusDamage:amount.loss,
    entitled:amount.recovery,applied:cap.applied,claimedAt:Date.now(),
  });
  if(cap.applied>0)await caster.update({'system.focus.value':cap.before+cap.applied});
  if(typeof post==='function'){
    try{await post({speaker:{actor:caster.id,alias:caster.name},
      content:`<div class="m616-focus-recovery"><b>Brain Drain:</b> ${escape(caster.name)} recuperou `+
        `<b>${cap.applied} Focus</b> (dano de Focus confirmado: ${amount.loss}; `+
        `recuperação calculada: ${amount.recovery}; máximo: ${cap.maximum}).</div>`,
      flags:{[SYSTEM]:{nativeBrainDrainAnnouncement:{sourceMessageId:source.id,damageMessageId:damageMessage.id}}},
    });}catch(error){console.warn('[D616] Brain Drain: aviso não publicado',error);}
  }
  return {...amount,...cap};
}

const targetUuid=target=>String(target?.uuid??'');
export function checkKillZone(item,{combat=globalThis.game?.combat,targets=[],tracker=globalThis.game?.multiverseD616?.turnTracker}={}){
  if(!isKillZone(item))return {ok:true,applicable:false};
  if(!combat?.started||!combat?.id||!Number.isInteger(Number(combat.round)))
    return {ok:false,reason:'Kill Zone exige combate iniciado e rodada válida.'};
  const caster=item.actor;
  if(!caster)return {ok:false,reason:'Atacante não identificado.'};
  if(targets.length!==1||!targetUuid(targets[0])||!targetUuid(targets[0]).startsWith('Scene.'))
    return {ok:false,reason:'Kill Zone: selecione exatamente um inimigo na cena.'};
  const target=targets[0];
  if(target?.actor?.id===caster.id || target?.actorId===caster.id || target?.actorUuid===caster.uuid)
    return {ok:false,reason:'Kill Zone não pode atingir o próprio atacante.'};
  const state=caster.getFlag?.(SYSTEM,ZONE_FLAG)??caster.flags?.[SYSTEM]?.[ZONE_FLAG];
  if(state?.combatId===combat.id && Number(state.round)===Number(combat.round) &&
    (state.targetUuids??[]).includes(targetUuid(target)))
    return {ok:false,reason:'Kill Zone: este alvo já foi atacado nesta rodada.'};
  // Movement and enemy disposition are intentional, narrative triggers:
  // the GM must confirm the enemy has STARTED moving and is in line of sight.
  if(tracker?.getState){
    const combatant=reactionCombatant(caster,combat);
    if(!combatant)return {ok:false,reason:'Kill Zone: atacante não está na iniciativa.'};
    const state=tracker.getState(combatant);
    if(state && Number(state.reactionUsed)>=Number(state.reactionMax))
      return {ok:false,reason:'Kill Zone: nenhuma Reação disponível.'};
  }
  return {ok:true,applicable:true,targetUuid:targetUuid(target),round:Number(combat.round),combatId:combat.id};
}
export async function finishKillZone({item,combat=globalThis.game?.combat,targetUuid:targetId,
  tracker=globalThis.game?.multiverseD616?.turnTracker,refund=true,post=data=>globalThis.ChatMessage?.create?.(data)}={}){
  if(!isKillZone(item)||!targetId||!combat?.started)return null;
  const actor=item.actor;
  const existing=actor.getFlag?.(SYSTEM,ZONE_FLAG)??actor.flags?.[SYSTEM]?.[ZONE_FLAG]??{};
  const same=existing.combatId===combat.id&&Number(existing.round)===Number(combat.round);
  const entries=same?Array.from(new Set(existing.targetUuids??[])):[];
  if(entries.includes(targetId))return {duplicate:true,refunded:false};
  entries.push(targetId);
  await actor.setFlag(SYSTEM,ZONE_FLAG,{version:1,combatId:combat.id,round:Number(combat.round),targetUuids:entries});
  let refunded=false;
  if(refund){
    const combatant=reactionCombatant(actor,combat);
    if(combatant&&tracker?.refundReaction)refunded=!!(await tracker.refundReaction(combatant));
  }
  if(typeof post==='function'){
    try{await post({speaker:{actor:actor.id,alias:actor.name},
      content:`<div class="m616-kill-zone"><b>Kill Zone:</b> `+
        `alvo registrado nesta rodada. ${refunded?'Reação recuperada.':refund?'Mestre: confira o estorno da Reação.':'Reação sob controle manual.'} `+
        `Confirme o gatilho de movimento do inimigo.</div>`,
    });}catch(error){console.warn('[D616] Kill Zone: mensagem',error);}
  }
  return {duplicate:false,refunded,targetUuids:entries};
}

const concentrationFor=(actor,itemId)=>all(actor?.effects).find(effect=>
  !effect?.disabled&&effect?.duration?.expired!==true&&
  effect?.flags?.[SYSTEM]?.concentrationPower?.transient===true&&
  String(effect.flags[SYSTEM].concentrationPower.itemId)===String(itemId));
export function isActiveVenomSwordWeapon(item){
  if(!isVenomSwordWeapon(item)||!item.actor)return false;
  const actor=item.actor;
  const marker=item.flags[SYSTEM][WEAPON_FLAG];
  const source=actor.items?.get?.(marker.sourceItemId);
  return isVenomSword(source)&&!!concentrationFor(actor,marker.sourceItemId);
}
const swordWeapons=actor=>all(actor?.items).filter(isVenomSwordWeapon);

/** Activation after the generic 5 Focus spend and Concentration creation. */
export async function applyVenomSword(actor,item){
  if(!isVenomSword(item))return null;
  const effect=concentrationFor(actor,item.id??item._id);
  if(!effect)throw new Error('Venom Sword: Concentração não foi ativada.');
  const list=swordWeapons(actor).filter(w=>w.flags[SYSTEM][WEAPON_FLAG].sourceItemId===item.id);
  let weapon=list[0];
  const data={
    name:'Venom Sword — Bioeletricidade',type:'weapon',img:item.img,
    system:{description:'Espada criada por Venom Sword. Ataques Melee; DM +2 não acumula com bônus equivalentes. No Fantástico, Atordoado por 1 turno somente se houver dano real.',
      ability:'mle',attackTarget:'mle',attackKind:'close',attack:true,damageType:'health',
      kind:'close',range:'Reach',formula:'{1d6,1dm,1d6}',quantity:1,
      equipped:true,damageMultiplierBonus:'2'},
    flags:{[SYSTEM]:{[WEAPON_FLAG]:{version:1,sourceItemId:item.id,concentrationEffectId:effect.id}}},
  };
  if(weapon){
    await weapon.update({name:data.name,'system.equipped':true,
      'system.damageMultiplierBonus':'2',[`flags.${SYSTEM}.${WEAPON_FLAG}`]:data.flags[SYSTEM][WEAPON_FLAG]});
  }else{
    weapon=(await actor.createEmbeddedDocuments('Item',[data]))?.[0];
  }
  if(!weapon)throw new Error('Venom Sword: não foi possível criar a espada temporária.');
  // Deactivate duplicate stale blades if an Actor was migrated or cloned.
  for(const extra of list.slice(1))if(extra.system?.equipped)await extra.update({'system.equipped':false});
  return {kind:'native-venom-sword',weaponId:weapon.id};
}

async function deactivateVenomSword(effect){
  const data=effect?.flags?.[SYSTEM]?.concentrationPower;
  if(!data?.transient||!data.itemId||!effect?.parent)return;
  const actor=effect.parent;
  const source=actor.items?.get?.(data.itemId);
  if(source && !isVenomSword(source))return;
  // Keep the unequipped Item so previously rolled attacks can still be
  // resolved by the GM even after Concentration ends.
  for(const weapon of swordWeapons(actor)){
    const mark=weapon.flags[SYSTEM][WEAPON_FLAG];
    if(mark.sourceItemId!==data.itemId||mark.concentrationEffectId!==effect.id)continue;
    if(weapon.system?.equipped)await weapon.update({'system.equipped':false});
  }
}
export function registerNativePriorityLot1Hooks({hooks=globalThis.Hooks}={}){
  hooks?.on?.('deleteActiveEffect',effect=>{void deactivateVenomSword(effect).catch(e=>console.warn('[D616] Venom Sword cleanup:',e));});
  hooks?.on?.('updateActiveEffect',(effect,patch)=>{
    if(patch.disabled===true||patch.duration?.expired===true)
      void deactivateVenomSword(effect).catch(e=>console.warn('[D616] Venom Sword cleanup:',e));
  });
}
