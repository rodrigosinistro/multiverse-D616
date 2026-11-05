/** Multiverse-D616 v0.2.119 — Central 4.7: gatilhos de resultado por alvo e catálogo de poderes.
 * A whitelist of safe triggers/conditions/effects: no user-supplied JavaScript,
 * no arbitrary update paths, and no client-owned mutations. GM authority only.
 */
import {AUTOMATION_SYSTEM, AUTOMATION_MASTER_KEY} from './automation-settings.mjs';
import {getMarvelOutcome,normalizeConditionDefense} from './power-conditions.mjs';
import {adjudicateTargetOutcome,rollSignature,MULTI_TARGET_DECISION_KEY} from './multi-target-combat.mjs';
import {resolvePowerRoll} from './power-rolls.mjs';
import {crossingRegions} from './elemental-area-geometry.mjs';
import {CONDITION_RECOVERY_RULES} from './condition-actions.mjs';
import {cleanupExpiredElementalEffects} from './elemental-fantastic.mjs';
import {conditionReference} from './condition-reference.mjs';
import {powerConditionExpiryDecision} from './power-conditions.mjs';
import {playPowerVfx} from './power-vfx.mjs';

export const CUSTOM_RULES_KEY='customAutomationRules';
export const CUSTOM_RULES_ENABLED_KEY='customAutomationsEnabled';
export const CUSTOM_TRIGGERS=Object.freeze({
  powerRoll:'Ao rolar um poder',turnStart:'Início do turno',turnEnd:'Fim do turno',
  passiveAttack:'Passiva: ao realizar um ataque',
  targetHit:'Após acertar um alvo (resultado confirmado)',
});
export const CUSTOM_EFFECTS=Object.freeze({
  condition:'Aplicar uma condição',healing:'Recuperar Health',chat:'Enviar mensagem ao chat',
  edge:'Conceder Edge (vantagem)',trouble:'Impor Trouble (desvantagem)',
  vfx:'Executar animação configurada no poder (Sequencer)',
  damageBonus:'Modificar dano (cálculo nativo/MMDR)',
  ongoingDamage:'Dano contínuo por turno (Health/Focus)',
});
// Deliberately exclude concentration levels and system/internal statuses.
export const CUSTOM_ATTACK_SCOPES=Object.freeze({
  all:'Todos os ataques',melee:'Ataques corpo a corpo',ranged:'Ataques à distância',
});
export const CUSTOM_DAMAGE_MODES=Object.freeze({
  fixed:'Valor fixo adicional',ability:'Valor de um atributo do atacante',
  multiplier:'Multiplicar dano calculado (×2 ou ×3)',
});
export const CUSTOM_ONGOING_RESOURCES=Object.freeze({health:'Health',focus:'Focus'});
export const CUSTOM_DAMAGE_ABILITIES=Object.freeze({
  mle:'Melee',agl:'Agility',res:'Resilience',vig:'Vigilance',ego:'Ego',log:'Logic',
});
export const CUSTOM_TARGET_OUTCOMES=Object.freeze({
  success:'Qualquer acerto (incluindo Sucesso Fantástico)',
  fantastic:'Somente Sucesso Fantástico contra o alvo',
});
export const CUSTOM_STATUS_SUBJECTS=Object.freeze({
  caster:'Personagem que usou o poder',target:'Alvo atingido',
});
export const CUSTOM_CONDITION_DURATIONS=Object.freeze({
  manual:'Até remover manualmente / pela regra',
  turns:'Turnos do personagem afetado',
  rounds:'Rodadas de combate',
});
export const CUSTOM_STATUSES=Object.freeze({
  'mmrpg.prone':'Caído','mmrpg.stunned':'Atordoado','mmrpg.blinded':'Cego',
  'mmrpg.deafened':'Surdo','mmrpg.bleeding':'Sangrando','mmrpg.ablaze':'Em Chamas',
  'mmrpg.corroding':'Corroído','mmrpg.poisoned':'Envenenado','mmrpg.pinned':'Imobilizado',
  'mmrpg.restrained':'Restrito','mmrpg.paralyzed':'Paralisado','mmrpg.frightened':'Amedrontado',
  'mmrpg.demoralized':'Desmoralizado','mmrpg.exhausted':'Exausto',
  'mmrpg.confused':'Confuso','mmrpg.charmed':'Encantado',
  'mmrpg.dominated':'Dominado','mmrpg.shattered':'Arrasado',
  'mmrpg.surprised':'Surpreso','mmrpg.unconscious':'Inconsciente',
  'mmrpg.incapacitated':'Incapacitado','mmrpg.infected':'Infectado',
});
const list=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
const safeText=(x,max)=>String(x??'').trim().slice(0,max);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const hasOwn=(object,key)=>Object.hasOwn(object,key);
const normalizedName=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const rollEffects=new Set(['edge','trouble']);
const activeGM=()=>Boolean(globalThis.game?.user?.isGM) &&
  (!game.users?.activeGM || game.users.activeGM.id===game.user.id);

export const MAX_CUSTOM_EFFECTS=8;
/** Normalized actions are bounded and schema-whitelisted. Old v109-v115 rules
 * with flat effect fields are migrated in memory to a one-action sequence;
 * the legacy first-action fields remain for older integrations and worlds. */
export function normalizeCustomEffect(input,trigger){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Efeito inválido.');
  const effectType=safeText(input.effectType,30);
  if(!hasOwn(CUSTOM_EFFECTS,effectType))throw new Error('Efeito não disponível.');
  const passive=trigger==='passiveAttack',rollModifier=rollEffects.has(effectType);
  if(passive&&!rollModifier)throw new Error('Gatilhos passivos só podem conceder Edge/Trouble.');
  if(rollModifier&&!passive&&trigger!=='powerRoll')
    throw new Error('Edge/Trouble só pode ser aplicado durante rolagem de poder ou ataque passivo.');
  if(effectType==='vfx'&&trigger!=='powerRoll'&&trigger!=='targetHit')
    throw new Error('Animações exigem um gatilho de poder ou de alvo atingido.');
  if(effectType==='damageBonus'&&trigger!=='targetHit')
    throw new Error('Dano personalizado exige o gatilho Após acertar um alvo.');
  if(effectType==='ongoingDamage'&&trigger==='passiveAttack')
    throw new Error('Dano contínuo não é compatível com gatilho passivo de ataque.');
  const ongoingAmount=effectType==='ongoingDamage'?Number(input.ongoingAmount):0;
  const ongoingTurns=effectType==='ongoingDamage'?Number(input.ongoingTurns):0;
  const ongoingResource=effectType==='ongoingDamage'?safeText(input.ongoingResource,10):'health';
  if(effectType==='ongoingDamage'&&(!Number.isInteger(ongoingAmount)||ongoingAmount<1||ongoingAmount>100))
    throw new Error('Dano contínuo deve ser de 1 a 100 por turno.');
  if(effectType==='ongoingDamage'&&(!Number.isInteger(ongoingTurns)||ongoingTurns<1||ongoingTurns>20))
    throw new Error('Duração do dano contínuo deve ser entre 1 e 20 turnos.');
  if(effectType==='ongoingDamage'&&!hasOwn(CUSTOM_ONGOING_RESOURCES,ongoingResource))
    throw new Error('Recurso de dano contínuo inválido.');
  const damageBonusMode=effectType==='damageBonus'?safeText(input.damageBonusMode??'fixed',20):'fixed';
  if(effectType==='damageBonus'&&!hasOwn(CUSTOM_DAMAGE_MODES,damageBonusMode))
    throw new Error('Escolha um tipo de dano adicional válido.');
  const damageBonusAmount=effectType==='damageBonus'&&damageBonusMode==='fixed'?Number(input.damageBonusAmount):0;
  if(effectType==='damageBonus'&&damageBonusMode==='fixed'&&
    (!Number.isInteger(damageBonusAmount)||damageBonusAmount<1||damageBonusAmount>100))
    throw new Error('Dano adicional fixo deve estar entre 1 e 100.');
  const damageMultiplierFactor=effectType==='damageBonus'&&damageBonusMode==='multiplier'
    ?Number(input.damageMultiplierFactor):2;
  if(effectType==='damageBonus'&&damageBonusMode==='multiplier'&&
    ![2,3].includes(damageMultiplierFactor))
    throw new Error('Multiplicador de dano deve ser ×2 ou ×3.');
  const damageAbility=effectType==='damageBonus'&&damageBonusMode==='ability'
    ?safeText(input.damageAbility,10):'';
  if(effectType==='damageBonus'&&damageBonusMode==='ability'&&!hasOwn(CUSTOM_DAMAGE_ABILITIES,damageAbility))
    throw new Error('Selecione o atributo de dano do atacante.');
  const attackScope=rollModifier?safeText(input.attackScope,30):'';
  if(rollModifier&&!hasOwn(CUSTOM_ATTACK_SCOPES,attackScope))
    throw new Error('Selecione o tipo de ataque afetado.');
  const effectStatus=effectType==='condition'?safeText(input.effectStatus,80):'';
  if(effectType==='condition'&&!hasOwn(CUSTOM_STATUSES,effectStatus))throw new Error('Escolha uma condição a aplicar.');
  const conditionDurationMode=effectType==='condition'?safeText(input.conditionDurationMode??'manual',20):'manual';
  if(effectType==='condition'&&!hasOwn(CUSTOM_CONDITION_DURATIONS,conditionDurationMode))
    throw new Error('Escolha uma duração válida para a condição.');
  const conditionDurationCount=effectType==='condition'&&conditionDurationMode!=='manual'
    ?Number(input.conditionDurationCount??1):0;
  if(effectType==='condition'&&conditionDurationMode!=='manual'&&
    (!Number.isInteger(conditionDurationCount)||conditionDurationCount<1||conditionDurationCount>20))
    throw new Error('A duração deve estar entre 1 e 20 turnos/rodadas.');
  const conditionRemoval=effectType==='condition'?safeText(input.conditionRemoval,200):'';
  const healAmount=effectType==='healing'?Number(input.healAmount):0;
  if(effectType==='healing'&&(!Number.isInteger(healAmount)||healAmount<1||healAmount>100))
    throw new Error('A cura deve estar entre 1 e 100 Health.');
  const message=effectType==='chat'?safeText(input.message,250):'';
  if(effectType==='chat'&&!message)throw new Error('Escreva a mensagem para o chat.');
  return {effectType,effectStatus,conditionDurationMode,conditionDurationCount,
    conditionRemoval,healAmount,message,attackScope,damageBonusMode,damageBonusAmount,damageAbility,damageMultiplierFactor,
    ongoingAmount,ongoingTurns,ongoingResource};
}
export function ruleEffects(rule){
  return Array.isArray(rule?.effects)&&rule.effects.length ? rule.effects:[rule];
}
export function normalizeCustomRule(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Dados inválidos.');
  const name=safeText(input.name,80);
  if(!name)throw new Error('Informe um nome para a automação.');
  const trigger=safeText(input.trigger,30);
  if(!hasOwn(CUSTOM_TRIGGERS,trigger))throw new Error('Gatilho não disponível.');
  const rawEffects=Array.isArray(input.effects)?input.effects:[input];
  if(rawEffects.length<1||rawEffects.length>MAX_CUSTOM_EFFECTS)
    throw new Error(`Escolha entre 1 e ${MAX_CUSTOM_EFFECTS} efeitos por regra.`);
  const effects=rawEffects.map(effect=>normalizeCustomEffect(effect,trigger));
  if(trigger==='powerRoll'&&input.fantasticOnly===true&&effects.some(e=>rollEffects.has(e.effectType)))
    throw new Error('Edge/Trouble altera a rolagem antes dos dados: não pode exigir M nessa mesma rolagem.');
  const passive=trigger==='passiveAttack',targetHit=trigger==='targetHit';
  const powerName=(trigger==='powerRoll'||passive||targetHit)?safeText(input.powerName,100):'';
  if(trigger==='powerRoll'&&!powerName)throw new Error('Informe o nome do poder para o gatilho.');
  if(passive&&!powerName)throw new Error('Informe o poder passivo que concede o modificador.');
  if(targetHit&&!powerName)throw new Error('Selecione o poder que deve atingir o alvo.');
  const hitOutcome=targetHit?safeText(input.hitOutcome??'success',20):'success';
  if(!hasOwn(CUSTOM_TARGET_OUTCOMES,hitOutcome))throw new Error('Resultado do ataque não suportado.');
  const statusSubject=targetHit?safeText(input.statusSubject??'caster',20):'caster';
  if(!hasOwn(CUSTOM_STATUS_SUBJECTS,statusSubject))throw new Error('Origem da condição exigida inválida.');
  const requiresStatus=safeText(input.requiresStatus,80);
  if(requiresStatus&&!hasOwn(CUSTOM_STATUSES,requiresStatus))throw new Error('Condição exigida não suportada.');
  return {
    id:safeText(input.id,70),name,trigger,powerName,hitOutcome,statusSubject,
    fantasticOnly:trigger==='powerRoll'&&input.fantasticOnly===true,
    requiresStatus,effects, ...effects[0],enabled:input.enabled!==false,
  };
}

export function getCustomRules(settings=globalThis.game?.settings){
  try{
    const data=settings?.get?.(AUTOMATION_SYSTEM,CUSTOM_RULES_KEY);
    if(!Array.isArray(data))return [];
    return data.slice(0,100).flatMap(rule=>{
      try{const clean=normalizeCustomRule(rule);return clean.id?[clean]:[];}catch{return [];}
    });
  }catch{return [];}
}
export function customRulesEnabled(settings=globalThis.game?.settings){
  try{return settings?.get?.(AUTOMATION_SYSTEM,AUTOMATION_MASTER_KEY)!==true &&
    settings?.get?.(AUTOMATION_SYSTEM,CUSTOM_RULES_ENABLED_KEY)!==false;}catch{return true;}
}
function hasRequiredStatus(rule,actor){
  if(!rule.requiresStatus)return true;
  const statuses=new Set(actor?.statuses??[]);
  for(const fx of list(actor?.effects))if(!fx.disabled&&fx.duration?.expired!==true){
    for(const st of fx.statuses??[])statuses.add(st);
    if(fx.flags?.core?.statusId)statuses.add(fx.flags.core.statusId);
  }
  return statuses.has(rule.requiresStatus);
}
export function matchesCustomRule(rule,event){
  if(!rule?.enabled||rule.trigger!==event?.trigger||!event.actor)return false;
  if(rule.trigger==='powerRoll'){
    if(String(event.powerName??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()!==
       rule.powerName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())return false;
    if(rule.fantasticOnly&&!event.fantastic)return false;
  }
  return hasRequiredStatus(rule,event.actor);
}

/** Passive rules are queried at roll creation, on every client, without writing
 * actor updates. They affect only actual attacks; power-roll hooks are unrelated.
 * A power in the character's Items enables its own modifier while present.
 * An attached power inside equipment is deliberately not inferred as equipped.
 */
export function passiveAttackModifiers({actor,attack=false,kind='',ability='',settings=globalThis.game?.settings}={}){
  if(!actor||!attack||!customRulesEnabled(settings))return [];
  const name=normalizedName, ab=name(ability), attackKind=name(kind);
  const scope=(attackKind==='close'||attackKind==='melee'||
    (!attackKind&&(ab==='mle'||ab==='melee')))?'melee':
    attackKind==='ranged'?'ranged':'unknown';
  const owned=new Set(list(actor.items).filter(item=>item?.type==='power')
    .map(item=>name(item.name)));
  const modifiers=[];
  for(const rule of getCustomRules(settings)){
    if(!rule.enabled||rule.trigger!=='passiveAttack'||
       !owned.has(name(rule.powerName))||!hasRequiredStatus(rule,actor))continue;
    for(const effect of ruleEffects(rule)){
      if(!rollEffects.has(effect.effectType)||effect.attackScope!=='all'&&effect.attackScope!==scope)continue;
      modifiers.push({source:`Automação: ${rule.name} (${rule.powerName})`,
        reason:CUSTOM_ATTACK_SCOPES[effect.attackScope],
        sign:effect.effectType==='edge'?1:-1,ruleId:rule.id});
    }
  }
  return modifiers;
}

/** Edge/Trouble on a specific power is resolved before its own dice are rolled.
 * This is not a post-roll chat effect and must never affect another power.
 * When the source power already grants the same modifier natively, do not
 * stack its duplicate custom rule. Other independent modifiers remain valid.
 */
export function powerRollModifiers({actor,item,attack=false,kind='',ability='',baseMode=0,settings=globalThis.game?.settings}={}){
  if(!actor||item?.type!=='power'||!attack||!customRulesEnabled(settings))return [];
  const attackKind=normalizedName(kind||item.system?.attackKind);
  const ab=normalizedName(ability);
  const scope=(attackKind==='close'||attackKind==='melee'||(!attackKind&&(ab==='mle'||ab==='melee')))?'melee':
    attackKind==='ranged'?'ranged':'unknown';
  const nativeSign=Math.sign(Number(baseMode)||0);
  const modifiers=[];
  for(const rule of getCustomRules(settings)){
    if(!rule.enabled||rule.trigger!=='powerRoll'||
       normalizedName(rule.powerName)!==normalizedName(item.name)||!hasRequiredStatus(rule,actor))continue;
    for(const effect of ruleEffects(rule)){
      if(!rollEffects.has(effect.effectType)||effect.attackScope!=='all'&&effect.attackScope!==scope)continue;
      const sign=effect.effectType==='edge'?1:-1;
      if(nativeSign===sign)continue; // Existing power-granted Edge/Trouble is never duplicated.
      modifiers.push({source:`Automação: ${rule.name} (${item.name})`,
        reason:CUSTOM_ATTACK_SCOPES[effect.attackScope],sign,ruleId:rule.id});
    }
  }
  return modifiers;
}

/** Damage modifiers are evaluated when building the ORIGINAL damage card,
 * not after MMDR subtracts Health/Focus. This makes each target's calculated
 * amounts authoritative for the existing MMDR (DR/guard/half/full) pipeline.
 * Zero-damage powers remain zero due to calculatePowerDamage's native factor.
 * No mutations, rerolls, dynamic formulas, scripts, or second damage pass.
 */
export function customDamageBonusForTarget({actor,item,targetActor,outcome,settings=globalThis.game?.settings}={}){
  const empty={bonus:0,multiplier:1,sources:[]};
  if(!actor||!targetActor||item?.type!=='power'||!outcome?.success||!customRulesEnabled(settings))
    return empty;
  const sources=[];
  let bonus=0,multiplier=1;
  for(const rule of getCustomRules(settings)){
    if(!rule.enabled||rule.trigger!=='targetHit'||
       normalizedName(rule.powerName)!==normalizedName(item.name)||
       (rule.hitOutcome==='fantastic'&&!outcome.fantastic))continue;
    const statusActor=rule.statusSubject==='target'?targetActor:actor;
    if(!hasRequiredStatus(rule,statusActor))continue;
    for(const effect of ruleEffects(rule)){
      if(effect.effectType!=='damageBonus')continue;
      if(effect.damageBonusMode==='multiplier'){
        // One multiplier maximum per hit: multiple matching rules never multiply
        // each other. This is distinct from the native power Fantastic factor.
        if(effect.damageMultiplierFactor>multiplier){
          multiplier=effect.damageMultiplierFactor;
          for(let i=sources.length-1;i>=0;i--)
            if(sources[i].mode==='multiplier')sources.splice(i,1);
          sources.push({ruleId:rule.id,name:rule.name,mode:'multiplier',factor:multiplier});
        }
        continue;
      }
      const amount=effect.damageBonusMode==='ability'
        ?Math.max(0,Math.trunc(Number(actor.system?.abilities?.[effect.damageAbility]?.value)||0))
        :effect.damageBonusAmount;
      if(!Number.isSafeInteger(amount)||amount<1)continue;
      // Bounded effect fields + cap avoid pathological custom world settings.
      const allowed=Math.min(500-bonus,amount);
      if(allowed<=0)continue;
      bonus+=allowed;
      sources.push({ruleId:rule.id,name:rule.name,mode:effect.damageBonusMode,amount:allowed});
    }
  }
  return {bonus,multiplier,sources};
}

/** Multiply an already-calculated native damage result; never mutate actors
 * here. Both raw and DR-adjusted values travel together to the existing MMDR.
 * Native zero-damage outcomes remain zero even with custom multipliers.
 */
export function applyCustomDamageMultiplier(result, multiplier=1){
  const factor=[2,3].includes(multiplier)?multiplier:1;
  if(factor===1)return result;
  return {...result,damage:Math.ceil(Math.max(0,Number(result.damage)||0)*factor),
    rawDamage:Math.ceil(Math.max(0,Number(result.rawDamage)||0)*factor)};
}

/** Resolve a targeted hit by calling the EXISTING defense/outcome and
 * per-target adjudication engines. No attack dice, damage or defense are
 * independently reimplemented by the customization layer. */
export function targetRuleOutcome({rule,item,roll,targetActor,targetUuid,message,confirmed=false}={}){
  if(rule?.trigger!=='targetHit'||item?.type!=='power'||!targetActor||!roll||!message)return null;
  if(normalizedName(rule.powerName)!==normalizedName(item.name))return null;
  const context=resolvePowerRoll(item);
  const defenseKey=message.getFlag?.(AUTOMATION_SYSTEM,'attackTarget') || context.attackTarget;
  const tn=Number(message.getFlag?.(AUTOMATION_SYSTEM,'powerTargetNumber')??0)||context.targetNumber||0;
  if(!defenseKey&&!tn)return null;
  const key=normalizeConditionDefense(defenseKey,targetActor);
  const defense=tn||Number(targetActor.system?.abilities?.[key]?.defense??0);
  if(!Number.isFinite(defense)||defense<=0)return null;
  const outcome=getMarvelOutcome(roll,defense);
  const ambiguous=message.getFlag?.(AUTOMATION_SYSTEM,'conditionEdges')?.ambiguousTargets===true;
  const decisions=message.getFlag?.(AUTOMATION_SYSTEM,'multiTargetDecisionRollSignature')===rollSignature(roll)
    ?message.getFlag?.(AUTOMATION_SYSTEM,MULTI_TARGET_DECISION_KEY)??{}:{};
  const decided=adjudicateTargetOutcome(outcome,{requiresReview:ambiguous,
    decision:decisions[targetUuid]});
  if(decided.pending||!decided.success)return null;
  // Damage-producing attacks wait for the Narrator's confirmed DAMAGE card.
  // Non-damaging checks can be judged immediately against the target defense.
  if(context.attack&&!confirmed)return null;
  if(rule.hitOutcome==='fantastic'&&!decided.fantastic)return null;
  return decided;
}

function resolveSource(message){
  const scene=globalThis.game?.scenes?.get?.(message.speaker?.scene);
  const token=scene?.tokens?.get?.(message.speaker?.token)??null;
  return {actor:token?.actor??game.actors?.get?.(message.speaker?.actor),token};
}
const targetJobs=new Map();
export function enqueueCustomTargetSync(message){
  if(!message?.id)return Promise.resolve(0);
  const previous=targetJobs.get(message.id)??Promise.resolve();
  const job=previous.catch(()=>{}).then(()=>syncCustomTargetRules(message))
    .catch(err=>{console.error('[D616] Erro em automações por alvo',err);return 0;});
  targetJobs.set(message.id,job);
  void job.finally(()=>{if(targetJobs.get(message.id)===job)targetJobs.delete(message.id);});
  return job;
}
/** Per-target effects fire once per rule/target/original roll card. Both the
 * GM-approved damage flags and manual hit/miss decisions come from the native
 * combat engine. Repeated hooks/rerenders/retroactive rerolls cannot heal twice.
 * Effects already applied aren't retroactively undone when a die is edited. */
export async function syncCustomTargetRules(message,settings=globalThis.game?.settings){
  if(!activeGM()||!customRulesEnabled(settings)||!message?.id||!message?.rolls?.length)return 0;
  if(message.getFlag?.(AUTOMATION_SYSTEM,'skipPowerConditions')===true)return 0;
  const rules=getCustomRules(settings).filter(r=>r.enabled&&r.trigger==='targetHit');
  if(!rules.length)return 0;
  const {actor,token:casterToken}=resolveSource(message);
  const itemId=message.getFlag?.(AUTOMATION_SYSTEM,'itemId');
  const item=actor?.items?.get?.(itemId);
  if(item?.type!=='power')return 0;
  const itemName=normalizedName(item.name);
  const applicable=rules.filter(r=>normalizedName(r.powerName)===itemName);
  if(!applicable.length)return 0;
  const refs=message.getFlag?.(AUTOMATION_SYSTEM,'targets');
  if(!Array.isArray(refs)||!refs.length)return 0;
  const roll=message.rolls[0];
  const signature=rollSignature(roll);
  const confirmations=['powerConditionDamage','customDamageConfirmation'].map(k=>message.getFlag?.(AUTOMATION_SYSTEM,k));
  const confirmedTargets=new Set(confirmations.flatMap(c=>c?.confirmed && c.rollSignature===signature
    ?(c.results??[]).map(r=>r.targetUuid):[]));
  const already=new Set(message.getFlag?.(AUTOMATION_SYSTEM,'customTargetExecutions')??[]);
  let completed=0;
  const seen=new Set();
  for(const ref of refs){
    const uuid=String(ref?.uuid??'');
    if(!/^Scene\.[^.]+\.Token\.[^.]+$/.test(uuid)||seen.has(uuid))continue;
    seen.add(uuid);
    let targetDoc=null;
    try{targetDoc=await globalThis.fromUuid?.(uuid);}catch{}
    if(targetDoc?.documentName!=='Token'||!targetDoc.actor)continue;
    if(casterToken && crossingRegions(targetDoc.parent,casterToken,targetDoc).length)continue;
    const confirmedHit=confirmedTargets.has(uuid);
    const targetActor=targetDoc.actor;
    // All matching rules share the same defense, roll and GM decision for
    // this one target. Adjudicate ONCE, then apply each rule's Fantastic
    // requirement independently. No cross-message caching (rerolls stay live).
    const outcome=targetRuleOutcome({rule:{...applicable[0],hitOutcome:'success'},
      item,roll,targetActor,targetUuid:uuid,message,confirmed:confirmedHit});
    if(!outcome)continue;
    for(const rule of applicable){
      const legacyKey=`${rule.id}|${uuid}`;
      if(already.has(legacyKey))continue; // v112-v115 cards already executed this rule.
      if(rule.hitOutcome==='fantastic'&&!outcome.fantastic)continue;
      const statusActor=rule.statusSubject==='target'?targetActor:actor;
      if(!hasRequiredStatus(rule,statusActor))continue;
      const effects=ruleEffects(rule);
      for(let index=0;index<effects.length;index++){
        const key=effects.length===1?legacyKey:`${rule.id}|${uuid}|${index}`;
        if(already.has(key))continue;
        try{
          // Damage modifiers are baked into the saved damage card BEFORE MMDR.
        // Never apply them again after confirmation (nor on non-damage checks).
        if(effects[index].effectType==='damageBonus')continue;
        const applied=await executeCustomRule({...rule,...effects[index]},targetActor,{
            targetTokenUuid:uuid,powerItem:item,sourceToken:casterToken?.object,
            targetToken:targetDoc.object,effectIndex:index,
          });
          // Checkpoint EACH effect: on retries, earlier Health/chat/conditions
          // cannot run again when a later effect throws or the card refreshes.
          already.add(key);
          await message.setFlag(AUTOMATION_SYSTEM,'customTargetExecutions',Array.from(already));
          if(applied)completed++;
        }catch(error){console.error(`[D616] Efeito ${index+1} de "${rule.name}" falhou`,error);}
      }
    }
  }
  return completed;
}

/** Resolve an exact token for linked Actors with several tokens in one encounter. */
export function matchingConditionCombatant(combat,actor,tokenUuid=''){
  const members=list(combat?.combatants);
  const matched=/^Scene\.([^.]+)\.Token\.([^.]+)$/.exec(String(tokenUuid));
  if(matched){
    const token=members.find(c=>c.sceneId===matched[1]&&c.tokenId===matched[2]);
    if(token)return token;
    return null; // Never attach an effect to a different token of the same Actor.
  }
  const own=members.filter(c=>c.actor?.uuid===actor?.uuid||c.actor?.id===actor?.id);
  return own.length===1?own[0]:null;
}

/** Create a separate timed ActiveEffect without statuses, so damage over time
 * does not overwrite or lengthen the native Em Chamas/Sangrando conditions.
 * Only a combatant in an active encounter can own it. */
export async function startCustomOngoingDamage(rule,actor,context={}){
  const combat=globalThis.game?.combat;
  if(!combat?.started||!actor?.createEmbeddedDocuments){
    globalThis.ui?.notifications?.warn?.('Dano contínuo: o alvo precisa estar em um combate iniciado.');
    return false;
  }
  const anchor=matchingConditionCombatant(combat,actor,context.targetTokenUuid??'');
  if(!anchor){globalThis.ui?.notifications?.warn?.('Dano contínuo: personagem não está na iniciativa.');return false;}
  // Multiple applications of the SAME rule to the SAME combatant do not stack.
  const previous=list(actor.effects).find(e=>{
    const f=ongoingFlags(e);
    return f?.combatId===combat.id&&f.anchorId===anchor.id&&
      f.ruleId===rule.id&&f.effectIndex===Number(context.effectIndex??0);
  });
  if(previous)return false;
  const data={version:1,ruleId:rule.id,ruleName:rule.name,
    effectIndex:Number(context.effectIndex??0),combatId:combat.id,anchorId:anchor.id,
    amount:rule.ongoingAmount,resource:rule.ongoingResource,total:rule.ongoingTurns,
    ticksDone:0,lastTurnKey:'',appliedRound:combat.round};
  await actor.createEmbeddedDocuments('ActiveEffect',[{
    name:`${rule.name} — Dano contínuo (${CUSTOM_ONGOING_RESOURCES[rule.ongoingResource]})`,
    img:`systems/${AUTOMATION_SYSTEM}/icons/m.svg`,disabled:false,transfer:false,
    duration:{},changes:[],flags:{[AUTOMATION_SYSTEM]:{[ONGOING_FLAG]:data}},
  }]);
  return true;
}

export async function executeCustomRule(rule,actor,context={}){
  if(rule.effectType==='ongoingDamage')return startCustomOngoingDamage(rule,actor,context);
  if(rule.effectType==='vfx'){
    const power=context.powerItem??list(actor?.items).find(item=>item?.type==='power'&&
      normalizedName(item.name)===normalizedName(rule.powerName));
    if(!power)return false;
    // A confirmed target must never accidentally animate a different token
    // from the GM's current selection when the canvas Token is unavailable.
    const options={token:context.sourceToken??undefined};
    if(context.targetTokenUuid)options.targets=context.targetToken?[context.targetToken]:[];
    return playPowerVfx(power,options);
  }
  if(rule.effectType==='chat'){
    if(!globalThis.ChatMessage?.create)return false;
    await ChatMessage.create({speaker:ChatMessage.getSpeaker?.({actor})??{},
      content:`<div class="d616-custom-chat"><strong>${escapeHTML(rule.name)}</strong> — ${escapeHTML(actor.name)}: ${escapeHTML(rule.message)}</div>`});
    return true;
  }
  if(rule.effectType==='healing'){
    const current=Number(actor.system?.health?.value),max=Number(actor.system?.health?.max);
    if(!Number.isFinite(current)||!Number.isFinite(max)||max<=0)return false;
    const next=Math.min(max,Math.max(0,current+rule.healAmount));
    if(next<=current)return false;
    await actor.update({'system.health.value':next});return true;
  }
  if(rule.effectType==='condition'){
    if(!hasOwn(CUSTOM_STATUSES,rule.effectStatus))return false;
    const active=new Set(actor.statuses??[]);
    for(const fx of list(actor.effects))if(!fx.disabled){
      for(const st of fx.statuses??[])active.add(st);
      if(fx.flags?.core?.statusId)active.add(fx.flags.core.statusId);
    }
    // Never overwrite, extend, shorten or remove a condition of another source.
    if(active.has(rule.effectStatus))return false;
    const statuses=globalThis.CONFIG?.statusEffects;
    const template=list(Array.isArray(statuses)?statuses:Object.values(statuses??{}))
      .find(s=>s?.id===rule.effectStatus);
    if(!template)return false;
    const mode=rule.conditionDurationMode??'manual';
    const combat=globalThis.game?.combat?.started?game.combat:null;
    let anchor=null;
    if(mode!=='manual'){
      if(!combat){globalThis.ui?.notifications?.warn?.('Condição temporária: inicie um combate para contar turnos/rodadas.');return false;}
      anchor=matchingConditionCombatant(combat,actor,context.targetTokenUuid);
      if(!anchor){globalThis.ui?.notifications?.warn?.('A condição temporária exige o personagem na iniciativa.');return false;}
    }
    const flag={version:1,ruleId:rule.id??'',ruleName:rule.name,statusId:rule.effectStatus,
      mode,count:mode==='manual'?0:rule.conditionDurationCount,
      removalNote:rule.conditionRemoval??'',combatId:combat?.id??null,
      appliedRound:combat?.round??null,anchorId:anchor?.id??null,
      // If applied during the recipient's own turn, that turn counts as one.
      turnStarts:mode==='turns'&&anchor?.id===combat?.combatant?.id?1:0,
      lastTurnKey:'',};
    if(typeof actor.createEmbeddedDocuments==='function'){
      await actor.createEmbeddedDocuments('ActiveEffect',[{
        name:`${CUSTOM_STATUSES[rule.effectStatus]} — ${rule.name}`,
        img:template.img??template.icon??`systems/${AUTOMATION_SYSTEM}/icons/m.svg`,
        statuses:[rule.effectStatus],disabled:false,transfer:false,showIcon:2,
        duration:{},changes:[],
        flags:{core:{statusId:rule.effectStatus},[AUTOMATION_SYSTEM]:{customAutomationCondition:flag}},
      }]);
      return true;
    }
    // Compatibility fallback for actors without an embedded-document API.
    // Timed effects cannot be tracked safely without an ActiveEffect document.
    if(mode!=='manual'||typeof actor.toggleStatusEffect!=='function')return false;
    await actor.toggleStatusEffect(rule.effectStatus,{active:true});return true;
  }
  return false;
}

/** The same confirmed damage records used by native conditions are forwarded
 * from MMDR for ALL power attacks, including custom/homebrew powers without a
 * hardcoded POWER_CONDITIONS entry. Only accepted, non-blocked target entries. */
export async function confirmCustomTargetDamageFromCard(damageMessage,action,results=[]){
  if(!activeGM()||!customRulesEnabled()||action==='heal'||!results.length)return false;
  const sourceId=damageMessage?.getFlag?.(AUTOMATION_SYSTEM,'sourceMessageId')??
    damageMessage?.getFlag?.(AUTOMATION_SYSTEM,'damageApplication')?.sourceMessageId;
  const original=globalThis.game?.messages?.get?.(sourceId);
  if(!original?.rolls?.length)return false;
  const itemId=original.getFlag?.(AUTOMATION_SYSTEM,'itemId');
  const source=resolveSource(original);
  const power=source.actor?.items?.get?.(itemId);
  if(power?.type!=='power')return false;
  if(!getCustomRules().some(r=>r.enabled&&r.trigger==='targetHit'&&
    normalizedName(r.powerName)===normalizedName(power.name)))return false;
  const signature=rollSignature(original.rolls[0]);
  const cardSignature=damageMessage.getFlag?.(AUTOMATION_SYSTEM,'damageApplication')?.rollSignature;
  if(cardSignature && cardSignature!==signature)return false;
  const current=original.getFlag?.(AUTOMATION_SYSTEM,'customDamageConfirmation');
  const same=current?.rollSignature===signature;
  const confirmed=new Map((same?current?.results??[]:[]).map(r=>[r.targetUuid,r]));
  for(const r of results){
    if(!r?.targetUuid||r.blocked||r.heal)continue;
    confirmed.set(r.targetUuid,{targetUuid:r.targetUuid,delta:Math.max(0,Number(r.delta)||0)});
  }
  if(!confirmed.size)return false;
  await original.setFlag(AUTOMATION_SYSTEM,'customDamageConfirmation',{
    confirmed:true,rollSignature:signature,results:[...confirmed.values()],
  });
  await enqueueCustomTargetSync(original);
  return true;
}

// Hooks run on all clients. Only the active GM changes actors / posts cards.
export async function processCustomAutomation(event,settings=globalThis.game?.settings){
  if(!activeGM()||!customRulesEnabled(settings)||!event?.actor)return 0;
  let completed=0;
  for(const rule of getCustomRules(settings)){
    if(rule.trigger==='passiveAttack')continue; // passives modify the dice before they are rolled
    if(!matchesCustomRule(rule,event))continue;
    const effects=ruleEffects(rule);
    for(let index=0;index<effects.length;index++){
      const effect=effects[index];
      if(rollEffects.has(effect.effectType)||effect.effectType==='damageBonus')continue; // handled in roll/card
      try{if(await executeCustomRule({...rule,...effect},event.actor,{effectIndex:index}))completed++;}
      catch(error){console.error(`[D616] Efeito da automação "${rule.name}" falhou`,error);}
    }
  }
  return completed;
}

/** Read the Marvel die from the original D616 pool, including rolls loaded
 * back from Foundry's serialized ChatMessage data. A die showing M isn't an
 * automatic hit, and this predicate deliberately doesn't check defenses. */
export function marvelDieIsM(roll,fallback=false){
  if(!roll)return false;
  const first=roll.terms?.[0];
  const pool=first?.roll?.terms?.[0]?.rolls ? first.roll.terms[0] :
    first?.rolls ? first : null;
  const mRoll=pool?.rolls?.[1];
  const marvel=(mRoll?.dice??[]).find(d=>/marvel/i.test(d?.constructor?.name??''))??
    (mRoll?.terms??[]).find(d=>/marvel/i.test(d?.constructor?.name??''))??
    mRoll?.dice?.[0]??mRoll?.terms?.[0];
  const results=(marvel?.results??[]).filter(r=>r.active!==false&&!r.discarded);
  if(results.length)return results.some(r=>Number(r.result)===1);
  return Boolean(roll.isFantastic||fallback);
}

export function ruleFromPowerMessage(message){
  if(!message?.id||!message.rolls?.length)return null;
  const itemId=message.getFlag?.(AUTOMATION_SYSTEM,'itemId');
  if(!itemId)return null;
  const scene=game.scenes?.get?.(message.speaker?.scene);
  const actor=scene?.tokens?.get?.(message.speaker?.token)?.actor??game.actors?.get?.(message.speaker?.actor);
  const item=actor?.items?.get?.(itemId);
  if(!item||item.type!=='power')return null;
  return {trigger:'powerRoll',actor,powerName:item.name,
    fantastic:marvelDieIsM(message.rolls[0],message.fantastic)};
}
// Deduplicate messages during rapid hook updates; never re-run for a reroll/edit.
const processedMessages=new Set();
const processedTurns=new Set();
/** Conditions are recorded as ordinary Foundry ActiveEffects, with only
 * their custom timing metadata stored in flags (v14 duration schema safe).
 * Keep all timing authority with the active GM; independent from whether
 * optional new automations are currently paused. */
const CONDITION_FLAG='customAutomationCondition';
const ONGOING_FLAG='customAutomationOngoing';
const ongoingFlags=effect=>effect?.flags?.[AUTOMATION_SYSTEM]?.[ONGOING_FLAG];
const ongoingPending=new Set();
const ongoingSeen=new Set();
const conditionTurnPending=new Set();
const conditionTurnSeen=new Set();
const statusIds=effect=>[...(effect?.statuses??[]),effect?.flags?.core?.statusId].filter(Boolean);
const conditionFlags=effect=>effect?.flags?.[AUTOMATION_SYSTEM]?.[CONDITION_FLAG];
const turnId=combat=>`${combat.id}:${combat.round}:${combat.turn}:${combat.combatant?.id}`;
const plural=(n,singular,pluralForm)=>`${n} ${n===1?singular:pluralForm}`;
export function customConditionRemaining(effect,combat){
  const f=conditionFlags(effect);
  if(!f||f.mode==='manual')return null;
  if(!combat||!combat.started||f.combatId!==combat.id)return null;
  if(f.mode==='rounds')return Math.max(0,f.count-(Number(combat.round)-Number(f.appliedRound)));
  if(f.mode==='turns')return Math.max(0,f.count-(Number(f.turnStarts)||0));
  return null;
}
export function customConditionDurationText(effect,combat){
  const f=conditionFlags(effect);
  if(!f)return 'até remoção conforme a regra';
  if(f.mode==='manual')return 'até remoção manual ou pela regra';
  const remaining=customConditionRemaining(effect,combat);
  if(remaining===null)return 'duração vinculada a outro combate';
  return remaining===0?'expirando':f.mode==='turns'
    ?plural(remaining,'turno do alvo','turnos do alvo')
    :plural(remaining,'rodada','rodadas');
}
function conditionRemovalText(statusId,effect){
  const custom=conditionFlags(effect);
  if(custom?.removalNote)return custom.removalNote;
  // Same removal instruction as the condition tray, including world customizations.
  const reference=conditionReference(statusId);
  if(reference)return reference.remove || '';
  const recovery=CONDITION_RECOVERY_RULES[statusId];
  if(recovery)return `Ação Padrão: ${recovery.abilityLabel} TN ${recovery.tn}`+
    (statusId==='mmrpg.bleeding'?'; também pode cessar ao recuperar Health, se habilitado':'');
  if(statusId==='mmrpg.poisoned')return 'Início do turno: Resilience TN 18; Sucesso Fantástico remove a condição';
  return ''; // The condition tray does not provide a removal rule for this ID.
}
/** Return entries for native and custom statuses, de-duplicated by status ID.
 * The native expiry metadata is read only; its engine owns removal. */
export function conditionTurnEntries(actor,combat){
  const found=new Map();
  for(const effect of list(actor?.effects)){
    if(effect.disabled||effect.duration?.expired===true)continue;
    const custom=conditionFlags(effect);
    const native=effect.flags?.[AUTOMATION_SYSTEM]?.powerCondition;
    if(native && powerConditionExpiryDecision(native,combat)===true)continue;
    for(const id of statusIds(effect)){
      const registered=list(Array.isArray(globalThis.CONFIG?.statusEffects)?CONFIG.statusEffects:Object.values(globalThis.CONFIG?.statusEffects??{}))
        .find(entry=>entry?.id===id);
      if(!registered)continue;
      const label=CUSTOM_STATUSES[id]??registered.name??registered.label??id;
      const elemental=effect.flags?.[AUTOMATION_SYSTEM]?.elementalFantastic;
      // Fantastic elemental effects are native statuses, not rules created in
      // the Central. Their duration belongs to the elemental engine and must
      // not be presented as an indefinite status in the beginning-of-turn chat.
      const duration=custom?customConditionDurationText(effect,combat):native?.expires==='turn'
        ?'1 turno (controle nativo)':native?.expires==='round'?'1 rodada (controle nativo)':
          elemental?.source==='fantastic' && Number(elemental.rounds)>0
            ?plural(Number(elemental.rounds),'rodada (efeito elemental)','rodadas (efeito elemental)'):
            'até remoção conforme a regra';
      const record={id,label,duration,description:conditionReference(id)?.description ?? '',
        removal:conditionRemovalText(id,effect),custom:!!custom};
      if(!found.has(id)||custom)found.set(id,record);
    }
  }
  // Legacy statuses with no visible ActiveEffect are still announced.
  for(const id of actor?.statuses??[]){
    if(found.has(id))continue;
    const registered=list(Array.isArray(globalThis.CONFIG?.statusEffects)?CONFIG.statusEffects:Object.values(globalThis.CONFIG?.statusEffects??{}))
      .find(entry=>entry?.id===id);
    if(registered)found.set(id,{id,label:CUSTOM_STATUSES[id]??registered.name??registered.label??id,
      duration:'até remoção conforme a regra',description:conditionReference(id)?.description ?? '',
      removal:conditionRemovalText(id,null),custom:false});
  }
  return [...found.values()];
}
function allActorsWithEffects(){
  const actors=new Map();
  for(const actor of list(globalThis.game?.actors))if(actor?.uuid)actors.set(actor.uuid,actor);
  for(const scene of list(globalThis.game?.scenes))for(const token of list(scene.tokens))
    if(token?.actor?.uuid)actors.set(token.actor.uuid,token.actor);
  return [...actors.values()];
}
/** Expire rounds when the round boundary is crossed, not when the target next
 * gets an initiative slot. Turn-based effects expire at the next target turn
 * after the configured number of target turns was experienced. */
export async function expireCustomConditionRounds(combat){
  if(!activeGM()||!combat?.started)return 0;
  let removed=0;
  for(const actor of allActorsWithEffects()){
    const effects=list(actor.effects).filter(e=>{
      const f=conditionFlags(e);
      return f?.mode==='rounds'&&f.combatId===combat.id&&customConditionRemaining(e,combat)===0;
    });
    if(effects.length){await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));removed+=effects.length;}
  }
  return removed;
}
export async function processCustomConditionTurn(combat){
  if(!activeGM()||!combat?.started||!(combat.combatant?.token?.actor??combat.combatant?.actor))return false;
  const key=turnId(combat);
  if(conditionTurnPending.has(key)||conditionTurnSeen.has(key))return false;
  conditionTurnPending.add(key);
  try{
    await expireCustomConditionRounds(combat);
    // The status due at THIS target turn must be retired before the chat reads
    // the Actor effects, not on an unrelated round boundary or after notice.
    await cleanupExpiredElementalEffects(combat);
    const combatant=combat.combatant,actor=combatant.token?.actor??combatant.actor;
    const advance=[];
    for(const effect of list(actor.effects)){
      const f=conditionFlags(effect);
      if(f?.mode!=='turns'||f.combatId!==combat.id||f.anchorId!==combatant.id||f.lastTurnKey===key)continue;
      if((Number(f.turnStarts)||0)>=f.count){
        await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);
      }else advance.push({effect,f});
    }
    // Read remaining time BEFORE consuming this turn's tick for the chat.
    const entries=conditionTurnEntries(actor,combat);
    for(const {effect,f} of advance){
      await effect.update({[`flags.${AUTOMATION_SYSTEM}.${CONDITION_FLAG}.turnStarts`]:(Number(f.turnStarts)||0)+1,
        [`flags.${AUTOMATION_SYSTEM}.${CONDITION_FLAG}.lastTurnKey`]:key});
    }
    if(!entries.length){conditionTurnSeen.add(key);return false;}
    const already=list(globalThis.game?.messages).some(m=>m.getFlag?.(AUTOMATION_SYSTEM,'customConditionTurnNotice')?.turnKey===key);
    if(already){conditionTurnSeen.add(key);return false;}
    if(typeof globalThis.ChatMessage?.create!=='function')return false;
    // Use the very same descriptions and removal instructions shown by the tray.
    // Escape configured text: custom condition notes can be authored by the GM.
    const content=`<section class="d616-custom-condition-turn"><strong>Condições de ${escapeHTML(actor.name)} — início do turno</strong><ul>`+
      entries.map(c=>`<li><strong>${escapeHTML(c.label)}</strong> — Restante: ${escapeHTML(c.duration)}.`+
        (c.description?`<div>${escapeHTML(c.description)}</div>`:'')+
        (c.removal?`<div><strong>Como remover:</strong> ${escapeHTML(c.removal)}</div>`:'')+
        '</li>').join('')+'</ul></section>';
    await ChatMessage.create({author:game.user.id,speaker:ChatMessage.getSpeaker?.({actor})??{},content,
      flags:{[AUTOMATION_SYSTEM]:{customConditionTurnNotice:{version:1,turnKey:key,
        actorUuid:actor.uuid,combatId:combat.id}}}});
    conditionTurnSeen.add(key);
    if(conditionTurnSeen.size>500)conditionTurnSeen.delete(conditionTurnSeen.values().next().value);
    return true;
  }finally{conditionTurnPending.delete(key);}
}
/** A recurring-effect tick invokes the MMDR's shared damage application,
 * including the native DR and protection checks. The GM owns every mutation.
 * Effects start ticking on the recipient's NEXT turn after application.
 * Checkpoint before dealing damage so repeated combat hooks cannot double-hit.
 * Failed native processing keeps the effect and writes a diagnostic to console.
 */
export async function processCustomOngoingDamageTurn(combat,applyDamage=undefined){
  if(!activeGM()||!combat?.started)return 0;
  const combatant=combat.combatant;
  const actor=combatant?.token?.actor??combatant?.actor;
  if(!actor)return 0;
  const key=turnId(combat);
  if(ongoingPending.has(key)||ongoingSeen.has(key))return 0;
  ongoingPending.add(key);
  let applied=0;
  let hadError=false;
  try{
    // In Foundry the MMDR is initialized by ready; an injected function also
    // supports independent tests without loading its browser-level hooks.
    const native=applyDamage??globalThis.game?.multiverseD616?.applyCustomRecurringDamage;
    for(const effect of list(actor.effects)){
      const flag=ongoingFlags(effect);
      if(!flag||flag.combatId!==combat.id||flag.anchorId!==combatant.id||
        flag.lastTurnKey===key||!Number.isInteger(flag.total)||!Number.isInteger(flag.amount))continue;
      if(flag.ticksDone>=flag.total){await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);continue;}
      if(typeof native!=='function'){hadError=true;console.error('[D616] MMDR indisponível para dano contínuo.');break;}
      try{
        // Crash-safe preference: don't apply an uncheckpointed damage tick twice.
        await effect.update({[`flags.${AUTOMATION_SYSTEM}.${ONGOING_FLAG}.lastTurnKey`]:key});
        const result=await native({actor,combatant,amount:flag.amount,resource:flag.resource});
        if(!result?.applied){
          // Keep tick reserved, log to avoid silently misreporting damage.
          hadError=true;console.error('[D616] Dano contínuo não aplicado:',result);continue;
        }
        applied++;
        const done=flag.ticksDone+1,remaining=Math.max(0,flag.total-done);
        // The chat is informational, not the authority for decrementing damage.
        if(remaining)await effect.update({[`flags.${AUTOMATION_SYSTEM}.${ONGOING_FLAG}.ticksDone`]:done});
        else await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);
        if(globalThis.ChatMessage?.create){
          const name=escapeHTML(actor.name),source=escapeHTML(flag.ruleName);
          const actual=Math.max(0,Number(result.delta)||0);
          const suffix=result.blocked?' (absorvido pela proteção)':` (RD: ${Math.max(0,Number(result.dr)||0)})`;
          const remainingText=remaining?plural(remaining,'turno restante','turnos restantes'):'efeito encerrado';
          await ChatMessage.create({author:game.user.id,speaker:ChatMessage.getSpeaker?.({actor})??{},
            content:`<div class="d616-ongoing-damage"><strong>${source}</strong> — ${name}: ${actual} de dano em ${CUSTOM_ONGOING_RESOURCES[flag.resource]??'Health'}${escapeHTML(suffix)}. ${remainingText}.</div>`,
            flags:{[AUTOMATION_SYSTEM]:{ongoingDamageTick:{turnKey:key,ruleId:flag.ruleId,actorUuid:actor.uuid}}}});
        }
      }catch(error){hadError=true;console.error('[D616] Dano contínuo falhou',error);}
    }
    if(!hadError){ongoingSeen.add(key);if(ongoingSeen.size>500)ongoingSeen.delete(ongoingSeen.values().next().value);}
    return applied;
  }finally{ongoingPending.delete(key);}
}

export async function clearCustomConditionCombat(combat){
  if(!activeGM()||!combat?.id)return 0;
  let count=0;
  for(const actor of allActorsWithEffects()){
    const effects=list(actor.effects).filter(e=>{
      const f=conditionFlags(e),ongoing=ongoingFlags(e);
      return (f?.combatId===combat.id&&f.mode!=='manual')||ongoing?.combatId===combat.id;
    });
    if(effects.length){await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));count+=effects.length;}
  }
  return count;
}

export function registerCustomAutomationHooks(){
  Hooks.on('createChatMessage',message=>{
    if(activeGM())void enqueueCustomTargetSync(message);
    if(!activeGM()||processedMessages.has(message.id))return;
    const event=ruleFromPowerMessage(message);
    if(!event)return;
    processedMessages.add(message.id);
    if(processedMessages.size>500)processedMessages.delete(processedMessages.values().next().value);
    void processCustomAutomation(event);
  });
  Hooks.on('updateChatMessage',(message,change)=>{
    const flags=change?.flags?.[AUTOMATION_SYSTEM];
    // A hit/miss decision or confirmed damage card may arrive after roll creation.
    if(activeGM()&&('rolls' in (change??{})||flags?.targets||flags?.multiTargetDecisions||
      flags?.powerConditionDamage))void enqueueCustomTargetSync(message);
  });
  Hooks.on('updateCombat',(combat,change)=>{
    if(!activeGM()||!combat?.started)return;
    if(!('round' in (change??{})||'turn' in (change??{})||change.started===true))return;
    const previous=combat.previous??{};
    const currentRound=Number(combat.round),currentTurn=Number(combat.turn);
    const previousRound=Number(previous.round),previousTurn=Number(previous.turn);
    // In Foundry v14, combat.previous is not guaranteed to be available when
    // updateCombat fires (notably after bonus-round transitions or a different
    // turn-tracker implementation). A missing previous snapshot must NOT silence
    // status reminders for the new combatant. We only skip positively proven
    // backwards navigation, and per-turn checkpointing prevents duplicates.
    const validPrevious=Number.isInteger(previousRound)&&previousRound>=0&&Number.isInteger(previousTurn);
    const forward=validPrevious && (currentRound>previousRound ||
      (currentRound===previousRound&&currentTurn>previousTurn));
    const backwards=validPrevious && (currentRound<previousRound ||
      (currentRound===previousRound&&currentTurn<previousTurn));
    if(backwards&&change.started!==true)return;
    void processCustomConditionTurn(combat).catch(e=>console.error('[D616] Aviso de condições',e));
    void processCustomOngoingDamageTurn(combat).catch(e=>console.error('[D616] Dano contínuo',e));
    const turns=list(combat.turns);
    const jobs=[];
    if(forward){
      const ended=turns[previousTurn]??null;
      if(ended?.actor)jobs.push({trigger:'turnEnd',actor:ended.actor,
        key:`${combat.id}:${previousRound}:${previousTurn}:end:${ended.id}`});
    }
    const starting=turns[currentTurn]??combat.combatant;
    if(starting?.actor)jobs.push({trigger:'turnStart',actor:starting.actor,
      key:`${combat.id}:${currentRound}:${currentTurn}:start:${starting.id}`});
    for(const job of jobs){
      if(processedTurns.has(job.key))continue;
      processedTurns.add(job.key);
      if(processedTurns.size>500)processedTurns.delete(processedTurns.values().next().value);
      void processCustomAutomation(job);
    }
  });
  Hooks.on('deleteCombat',combat=>{void clearCustomConditionCombat(combat)
    .catch(e=>console.error('[D616] Limpeza de condições temporárias',e));});
}

export function registerCustomAutomationSettings(){
  game.settings.register(AUTOMATION_SYSTEM,CUSTOM_RULES_KEY,{
    name:'Automações personalizadas',hint:'Regras criadas pelo Mestre na Central de Automações.',
    scope:'world',config:false,type:Array,default:[],
  });
  game.settings.register(AUTOMATION_SYSTEM,'customAutomationLibrary',{
    name:'Biblioteca de automações do Mestre',
    hint:'Modelos inativos para reutilizar e exportar para outros mundos.',
    scope:'world',config:false,type:Array,default:[],
  });
  game.settings.register(AUTOMATION_SYSTEM,CUSTOM_RULES_ENABLED_KEY,{
    name:'Executar automações personalizadas',hint:'Pausa apenas as regras criadas pelo Mestre, sem apagar os dados.',
    scope:'world',config:false,type:Boolean,default:true,
  });
}
