/**
 * Macros_D616 internal registry: native Anger/Real Jinx/recoveries, Martial Arts stances and bounded legacy delegates, v0.2.187.
 * Macros remain inert library references, not scripts executed as GM.
 * The bounded internal dispatcher runs Anger from Item.roll(); Real Jinx is evaluated only on targeted attacks.
 * Existing power controllers stay untouched.
 */
import { REGISTERED_AUTOMATIONS } from './native-power-registry-data.mjs';
import {checkAngerConcentrationCompatibility,applyAngerConcentration,angerMeleeBonusForAttack} from './native-power-anger.mjs';
import {dispatchLegacyEnergyBeforeRoll,legacyControllerDescriptor,inspectLegacyController} from './native-power-legacy-bridge.mjs';
import {checkNativeRecoveryUse,applyNativeRecovery} from './native-power-recovery.mjs';
import {applyAttackStance,attackStanceMeleeBonus} from './native-power-martial-stances.mjs';
import {focusedMeleeFocusDamage,focusedMeleeFocusHint} from './native-power-focused-attacks.mjs';
import {checkNativeBlurUse,applyNativeBlur} from './native-power-blur.mjs';
const SYSTEM = 'multiverse-d616';
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
const scopedKey = (powerSet, name) => `${norm(powerSet)}::${norm(name)}`;

const byId = new Map();
const byMacro = new Map();
const byScopedName = new Map();
for (const metadata of REGISTERED_AUTOMATIONS) {
  const entry = Object.freeze({...metadata});
  if (byId.has(entry.powerId) || byMacro.has(entry.macroId) || byScopedName.has(scopedKey(entry.powerSet,entry.powerName)))
    throw new Error(`Macros_D616: conflicting registered identity for ${entry.powerName}`);
  byId.set(entry.powerId,entry);
  byMacro.set(entry.macroId,entry);
  byScopedName.set(scopedKey(entry.powerSet,entry.powerName),entry);
}

/** Resolve only a bounded, internally known record. The item's embedded ID
 * can change on import, so secondary matching checks Power Set AND name.
 * Never trust a handler ID supplied by an actor or a macro script.
 */
export function resolveNativePowerAutomation(item) {
  if (item?.type !== 'power') return null;
  const set=String(item.system?.powerSet??'');
  const name=String(item.name??'');
  const scoped=byScopedName.get(scopedKey(set,name));
  if (!scoped) return null;
  // Compendium IDs are authoritative only together with the correct scope.
  // An explicitly mapped different official ID must not run a wrong handler.
  const declared=item.flags?.[SYSTEM]?.nativeAutomation?.powerId;
  if (declared && byId.has(String(declared)) && byId.get(String(declared))!==scoped) return null;
  const sourceCandidates=[item.flags?.core?.sourceId,item.flags?.['scene-packer']?.sourceId,
    item.flags?.[SYSTEM]?.sourcePowerUuid,item.uuid];
  for (const source of sourceCandidates) {
    if (typeof source!=='string') continue;
    const ref=source.match(/(?:^|\.)Item\.([a-zA-Z0-9]{16})$/);
    if (ref && byId.has(ref[1]) && byId.get(ref[1])!==scoped) return null;
  }
  return scoped;
}

export function resolveNativePowerByMacroId(macroId) {
  return byMacro.get(String(macroId??'')) ?? null;
}

/** Runtime routing description: legacy powers remain with their original
 * controllers. Lightning Actions requires a configured Central passive rule. */
export function planNativePowerDispatch(item) {
  const entry=resolveNativePowerAutomation(item);
  if (!entry) return Object.freeze({matched:false,mode:'generic-legacy'});
  return Object.freeze({matched:true,
    mode:entry.status==='native-active'?'native-active':entry.status==='native-partial'?'native-partial':entry.status==='requires-configuration'?'requires-configuration':'preserve-existing',
    powerId:entry.powerId,macroId:entry.macroId,handlerId:entry.handlerId,
    executionMode:entry.executionMode,controller:legacyControllerDescriptor(entry)});
}

/** Use official scoped registry entries, never a script or user-provided
 * handler ID. The existing Focus pipeline commits the cost and stores the
 * returned bonus in one focusDamageBonus snapshot on the attack card.
 */
function isRegisteredFocusedAttack(item){
  const record=resolveNativePowerAutomation(item);
  return record && ['focused-strike','focused-fury','furious-attacks'].includes(record.handlerId) &&
    ['native-active','native-partial'].includes(record.status);
}
export function nativeFocusedDamageForPower(item,spent){
  return isRegisteredFocusedAttack(item)?focusedMeleeFocusDamage(item,spent):null;
}
export function nativeFocusedDamageHint(item){
  return isRegisteredFocusedAttack(item)?focusedMeleeFocusHint(item):null;
}

/** Existing reaction entry-point remains EARLY in Item.roll(), so it never
 * reaches the generic Focus/Action pipeline. It delegates exactly once. */
export function dispatchNativeExistingPreRoll(item){
  return dispatchLegacyEnergyBeforeRoll(item);
}

/** The only executable dispatch keys are compiled into system code. */
export function checkNativePowerUse(actor,item) {
  // Blocking a new Concentration while owned Anger is active also applies to
  // powers without a native handler; the guard does not depend on an external macro.
  const concentration=checkAngerConcentrationCompatibility(actor,item);
  if(!concentration.ok)return concentration;
  const blur=checkNativeBlurUse(actor,item);
  if(!blur.ok)return blur;
  const record=resolveNativePowerAutomation(item);
  if(record?.status==='native-active' && ['regain-focus','do-this-all-day'].includes(record.handlerId))
    return checkNativeRecoveryUse(actor,item);
  return concentration;
}

import {isVenomSword,applyVenomSword} from './native-priority-lot1.mjs';

export async function commitNativePowerAfterFocus(actor,item,spent) {
  if(isVenomSword(item))return applyVenomSword(actor,item);
  const record=resolveNativePowerAutomation(item);
  if(record?.handlerId==='anger' && record.status==='native-active')
    return applyAngerConcentration(actor,item,spent);
  if(record?.handlerId==='blur' && record.status==='native-partial')
    return applyNativeBlur(actor,item,spent);
  if(record?.handlerId==='attack-stance' && record.status==='native-active')
    return applyAttackStance(actor,item);
  if(record?.status==='native-active' && ['regain-focus','do-this-all-day'].includes(record.handlerId))
    return applyNativeRecovery(actor,item,spent);
  return null;
}

export function nativeDamageBonusForAttack(actor,abilityKey,isAttack) {
  return angerMeleeBonusForAttack(actor,abilityKey,isAttack);
}

/** Separate signed snapshot; do not change old Anger flags or damage multiplier. */
export function nativeStanceDamageBonusForAttack(actor,abilityKey,isAttack) {
  return attackStanceMeleeBonus(actor,abilityKey,isAttack);
}

export function showMacroInfo(macroId) {
  const entry=resolveNativePowerByMacroId(macroId);
  if (!entry) return false;
  const partialDetails={
    'hurled-shield-block':'RD de Health do Shield do lançador aplicada ao aliado selecionado por um único ataque; o Mestre confirma o dano e a proteção desaparece automaticamente. Gatilho e escudo ausente até o próximo turno ainda requerem arbitragem.',
    'untouchable-position':'Trouble após o primeiro ataque recebido em combate, até o próximo turno; rerolls manuais e ataque precisa constar no chat',
    'sniping':'dano triplo no Fantástico e aviso de alvo a menos de 20 espaços; gasto de Movimento no turno ainda exige verificação',
    'furious-attacks':'bônus de dano a cada 2 Focus e metade/dano total; verificação de dois alvos e efeito especial da arma ficam com o Mestre',
    'unflappable-poise':'Trouble contra ataques corpo a corpo; rerolls continuam manuais',
    'focused-fury':'bônus de Focus nativo; efeito especial da arma depende do Narrador',
    'clear':'remoção de Atordoado/Desmoralizado; alcance da voz e recorrência de Desmoralizado exigem Mestre',
    'stand':'remoção de Caído nos aliados marcados; capacidade de levantar e alcance da voz exigem confirmação',
    'rally':'Focus recuperado após movimento confirmado; alcance da voz e movimento são manuais',
    'edge':'Edge temporário automático; o Mestre confirma alcance da voz/audição',
    'shield-wall':'Trouble enquanto concentrado; deslocamento do token interrompe a postura e deslocamento forçado exige conferência',
    'generic-focus-damage':'bônus de Focus já calculado pelo motor; área e dano parcial de Supernova exigem Narrador',
    'fortune':'Edge/Trouble e manutenção de Focus automáticos; Jinx You agora exige teste Melee real; alcance visual/voz depende do Mestre',
    'spider-sense':'Trouble contra Agility versus Vigilance; percepção de perigo ainda exige decisão narrativa',
    'blur':'Trouble defensivo por uma rodada, enquanto em combate; uso fora da iniciativa exige Narrador',
    'charmed-life':'ative pelo HUD para preparar 1 Edge no próximo teste elegível da rodada, sem acumular; reroll manual; fora de combate depende do Mestre',
    'tactical-once':'benefício de uma única rolagem para um aliado, sem reroll automático; alcance da audição e momento da reação precisam ser confirmados pelo Mestre',
    'sense-stealth':'fontes condicionais de Edge/Trouble para perceber ou passar despercebido; o card de atributo não distingue o propósito, portanto o Mestre confirma e o reroll permanece manual',
    'spider-pheromones':'Edge situacional em testes de Ego de intimidação/persuasão enquanto concentra; a adequação social do alvo depende do Mestre',
    'reactive-dodge':'Reação instantânea após o ataque ser anunciado/rolado; texto completo no chat; o atacante ou Mestre aplica TROUBLE no card original manualmente. Spider-Dodge permite salto opcional após erro.',
    'reactive-guard':'Reação instantânea após gatilho, com gasto único de Reação e do Focus aplicável; texto oficial no chat. Trouble, redução de recuo, Riposte e Point-Blank Parry requerem resolução manual pelo Mestre/atacante; nenhum segundo ataque é lançado automaticamente.',
    'counterstrike-technique':'após dano Melee real e Attack Stance ativo, o Mestre calcula o dano normal do atacante contra a RD dele, divide por dois (teto) e publica um card DANO de aplicação única; requer confirmação no card pelo Mestre.',
    'elemental-ricochet':'o motor existente permite novo ataque por Sucesso Fantástico resolvido pelo Mestre (mesmo quando toda a proteção absorve o dano), alcance acumulado e linha de visão; precisa selecionar outro alvo e não gasta novo Focus/Ação.',
  };
  const state=entry.status==='native-partial'
    ?(partialDetails[entry.handlerId]??'automação parcial: depende de decisão do Mestre')
    :entry.status==='native-active'
    ?(entry.handlerId==='scoped-reaction'?'passiva nativa: +1 Reação por rodada, exclusiva para poderes de Reação deste Power Set, consumida pelo rastreador de turnos'
      :entry.handlerId==='real-jinx'?'passiva nativa: Trouble contra ataques diretos elegíveis, sem somar a outro Trouble'
      :'automação nativa ativa pelo HUD ou ficha')
    :entry.status==='requires-configuration'?'depende da funcionalidade existente habilitada na Central; o compêndio não a executa'
    :'integrado por referência ao controlador existente, sem executar a macro ou duplicar efeitos';
  const passive=['real-jinx','passive-active-effect','passive-movement','defense-swap','danger-sense','healing-factor','lightning-actions','scoped-reaction','unflappable-poise','lucky-me','shield-wall'].includes(entry.handlerId);
  const usage=passive?'O efeito passivo depende de possuir o poder; não execute esta macro manualmente.'
    :'Use o poder pelo HUD ou ficha.';
  globalThis.ui?.notifications?.info?.(`${entry.powerName} (${entry.powerSet}): ${state}. ${usage}`);
  return true;
}

export function registerNativePowerAutomationAPI(gameInstance=globalThis.game) {
  if (!gameInstance) return null;
  const root=gameInstance.multiverseD616 = gameInstance.multiverseD616 || {};
  if(root.nativePowerAutomations)return root.nativePowerAutomations;
  const api=Object.freeze({getByItem:resolveNativePowerAutomation,
    getByMacroId:resolveNativePowerByMacroId,inspect:planNativePowerDispatch,
    checkUse:checkNativePowerUse,commitAfterFocus:commitNativePowerAfterFocus,
    getControllerByItem:item=>legacyControllerDescriptor(resolveNativePowerAutomation(item)),
    inspectController:(item,actor,settings)=>inspectLegacyController(resolveNativePowerAutomation(item),actor,settings),
    showMacroInfo,list:()=>Array.from(byId.values())});
  root.nativePowerAutomations=api;
  return api;
}

if(globalThis.Hooks?.once)Hooks.once('ready',()=>registerNativePowerAutomationAPI());
