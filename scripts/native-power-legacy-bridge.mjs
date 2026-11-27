/**
 * Macros_D616 v0.2.182: bounded adapters to EXISTING, already validated logic.
 * This module does not install hooks or register scripts, spend resources,
 * calculate damage or modify Actor documents. Existing controllers retain
 * exclusive ownership of their side effects and authority checks.
 */
import {activateEnergyAbsorption,isEnergyAbsorptionPower,pendingAbsorption,activeAbsorption} from './energy-absorption-custom.mjs';
import {activeElementalGuards} from './elemental-shields.mjs';
import {getCustomRules,customRulesEnabled,powerMatchesRule,ruleEffects} from './custom-automations.mjs';
import {automationEnabled} from './automation-settings.mjs';

const DESCRIPTORS=Object.freeze({
  'energy-absorption':Object.freeze({
    controllerId:'energy-absorption',controllerFile:'scripts/energy-absorption-custom.mjs',
    entryPoint:'activateEnergyAbsorption',trigger:'item-roll-before-generic-cost',
    configRequired:false,ownership:'existing-controller',
    summary:'Reação antes do dano; Focus, limite temporário e limpeza controlados pelo sistema existente.',
  }),
  'elemental-protection':Object.freeze({
    controllerId:'elemental-protection',controllerFile:'scripts/elemental-shields.mjs',
    entryPoint:'activeElementalGuards / selectElementalDefense',trigger:'existing-concentration-and-damage-resolution',
    configRequired:false,ownership:'existing-controller',
    summary:'Concentração e proteção por nível, absorção e encerramento pelo fluxo de dano existente.',
  }),
  'lightning-actions':Object.freeze({
    controllerId:'lightning-actions',controllerFile:'scripts/custom-automations.mjs',
    entryPoint:'passivePowerBenefits',trigger:'central-passive-power',
    configRequired:true,ownership:'central-configured',
    summary:'Regra passiva na Central: +Ação, +Reação e M na iniciativa; exige regra habilitada.',
  }),
  'passive-active-effect':Object.freeze({
    controllerId:'passive-active-effect',controllerFile:'scripts/migrations/v022-power-effects.mjs',
    entryPoint:'Foundry v14 transferable ActiveEffects',trigger:'actor-effect-preparation',
    configRequired:false,ownership:'existing-controller',
    summary:'Modificadores permanentes do item original via efeitos transferíveis; não aplicar novamente.',
  }),
  'passive-movement':Object.freeze({
    controllerId:'passive-movement',controllerFile:'scripts/movement-calculator.mjs',
    entryPoint:'prepareD616Movement',trigger:'actor-effect-preparation',
    configRequired:false,ownership:'existing-controller',
    summary:'Ajustes de movimento existentes, incluindo limite de não somar Speed Run 1 e Speed Run 2.',
  }),
  'defense-swap':Object.freeze({
    controllerId:'defense-swap',controllerFile:'scripts/power-conditions.mjs',
    entryPoint:'normalizeConditionDefense / mmD616ResolveDefenseAbility',trigger:'attack-defense-resolution',
    configRequired:false,ownership:'existing-controller',
    summary:'Defesa alternativa aplicada pelo resolvedor existente; nenhuma mudança de atributos.',
  }),
  'danger-sense':Object.freeze({
    controllerId:'danger-sense',controllerFile:'scripts/combat/turn-tracker.mjs',
    entryPoint:'maybeStartCombatAfterInitiative',trigger:'initiative-bonus-round',
    configRequired:false,ownership:'existing-controller',
    summary:'Concede participação na Rodada Bônus via rastreador existente, sem duplicar turnos.',
  }),
  'healing-factor':Object.freeze({
    controllerId:'healing-factor',controllerFile:'scripts/ongoing-power-effects.mjs',
    entryPoint:'hasHealingFactor / processOngoingPowerTurn',trigger:'owner-turn-end',
    configRequired:true,ownership:'central-configured',
    summary:'Cura ao fim do turno pelo motor existente; respeita chave da Central de Automações.',
  }),
});
const LIGHTNING_EFFECTS=Object.freeze(['extraAction','extraReaction','initiativeMarvelM']);

export function legacyControllerDescriptor(record){
  if(!record||record.status==='native-active')return null;
  return DESCRIPTORS[record.handlerId]??null;
}

/** Reuses the exact Energy Absorption pre-roll controller, once per Item.roll().
 * The fallback is intentional: custom/older powers bearing the same recognized
 * name previously used this handler even when not in the official registry.
 */
export function dispatchLegacyEnergyBeforeRoll(item){
  if(!isEnergyAbsorptionPower(item))return null;
  return activateEnergyAbsorption(item);
}

const status=(name,extra={})=>Object.freeze({state:name,...extra});
/** Read-only diagnostics; these NEVER execute a macro or grant a passive. */
export function inspectLegacyController(record,actor=null,settings=globalThis.game?.settings){
  const definition=legacyControllerDescriptor(record);
  if(!definition)return null;
  if(!actor)return status('not-evaluated',{controller:definition});
  if(record.handlerId==='energy-absorption'){
    return status(activeAbsorption(actor)?'active':pendingAbsorption(actor)?'prepared':'inactive',{
      controller:definition,
    });
  }
  if(record.handlerId==='elemental-protection'){
    const guards=activeElementalGuards(actor).filter(g=>g.kind==='protection' &&
      g.item?.name===record.powerName && (!g.item?.system?.powerSet || g.item.system.powerSet===record.powerSet));
    return status(guards.length?'active':'inactive',{
      controller:definition,threshold:guards.length?guards[0].threshold:0,
    });
  }
  if(['passive-active-effect','passive-movement','defense-swap','danger-sense','healing-factor'].includes(record.handlerId)){
    const owned=Array.from(actor.items?.contents??actor.items?.values?.()??actor.items??[])
      .filter(item=>item.type==='power'&&item.name===record.powerName&&item.system?.powerSet===record.powerSet);
    if(!owned.length)return status('power-not-owned',{controller:definition});
    if(record.handlerId==='healing-factor')return status(
      automationEnabled('ongoingConditions',settings,'Healing Factor')?'configured':'central-disabled',
      {controller:definition});
    // These are already owned by a separate, validated engine; this read-only
    // report does not pretend to validate each live AE or combat scenario.
    return status('power-owned',{controller:definition});
  }
  if(record.handlerId==='lightning-actions'){
    if(!customRulesEnabled(settings))return status('central-disabled',{controller:definition,enabledEffects:[]});
    const owned=Array.from(actor.items?.contents??actor.items?.values?.()??actor.items??[])
      .filter(item=>item.type==='power'&&item.name===record.powerName&&item.system?.powerSet===record.powerSet);
    if(!owned.length)return status('power-not-owned',{controller:definition,enabledEffects:[]});
    const found=new Set();
    for(const rule of getCustomRules(settings)){
      if(!rule.enabled||rule.trigger!=='passivePower'||!owned.some(item=>powerMatchesRule(rule,item)))continue;
      // The read-only report cannot infer arbitrary status prerequisites as
      // fulfilled; these rules remain conditional on the original engine.
      if(rule.requiresStatus)continue;
      for(const effect of ruleEffects(rule))if(LIGHTNING_EFFECTS.includes(effect.effectType))found.add(effect.effectType);
    }
    const enabledEffects=LIGHTNING_EFFECTS.filter(effect=>found.has(effect));
    return status(enabledEffects.length===3?'configured':enabledEffects.length?'partially-configured':'not-configured',{
      controller:definition,enabledEffects,
    });
  }
  return status('unknown',{controller:definition});
}
