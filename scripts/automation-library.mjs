/** Multiverse-D616 v0.2.120 — portable, data-only automation library.
 * Library entries are inert until the GM explicitly installs a copy as an inactive
 * custom automation. No script execution, arbitrary object paths or automatic imports.
 */
import {AUTOMATION_SYSTEM} from './automation-settings.mjs';
import {normalizeCustomRule} from './custom-automations.mjs';

export const CUSTOM_LIBRARY_KEY='customAutomationLibrary';
export const AUTOMATION_BUNDLE_FORMAT='multiverse-d616.automations';
export const AUTOMATION_BUNDLE_VERSION=1;
export const MAX_LIBRARY_ENTRIES=100;
export const MAX_BUNDLE_BYTES=1024*1024;
const createId=()=>globalThis.foundry?.utils?.randomID?.() ??
  `lib-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;

/** Revalidate all input against the existing engine's allowlist; strip runtime IDs. */
export function portableAutomationRule(input){
  const clean=normalizeCustomRule(input);
  const {id:discard,...portable}=clean;
  return {...portable,enabled:false};
}
function normalizedEntry(input,id){
  if(typeof id!=='string'||!id||id.length>70)throw new Error('Identificador de biblioteca inválido.');
  return {...portableAutomationRule(input),id};
}
export function getAutomationLibrary(settings=globalThis.game?.settings){
  try{
    const value=settings?.get?.(AUTOMATION_SYSTEM,CUSTOM_LIBRARY_KEY);
    if(!Array.isArray(value))return [];
    return value.slice(0,MAX_LIBRARY_ENTRIES).flatMap(item=>{
      try{return [normalizedEntry(item,item.id)];}catch{return [];}
    });
  }catch{return [];}
}
export function automationFingerprint(rule){
  return JSON.stringify(portableAutomationRule(rule));
}
/** Append non-identical entries, never overwrite; merge is an atomic pure operation. */
export function mergeAutomationLibrary(existing,incoming,{idFactory=createId}={}){
  if(!Array.isArray(existing)||!Array.isArray(incoming))throw new Error('Lista de automações inválida.');
  if(incoming.length>MAX_LIBRARY_ENTRIES)throw new Error('Arquivo excede 100 automações.');
  const entries=existing.map(item=>normalizedEntry(item,item.id));
  if(entries.length>MAX_LIBRARY_ENTRIES)throw new Error('Biblioteca acima do limite.');
  const seen=new Set(entries.map(automationFingerprint));
  const ids=new Set(entries.map(r=>r.id));
  let added=0,skipped=0;
  for(const raw of incoming){
    const rule=portableAutomationRule(raw),fingerprint=automationFingerprint(rule);
    if(seen.has(fingerprint)){skipped++;continue;}
    if(entries.length>=MAX_LIBRARY_ENTRIES)throw new Error('Limite de 100 modelos atingido. Nenhuma alteração foi salva.');
    const id=idFactory();
    if(typeof id!=='string'||!id||id.length>70||ids.has(id))throw new Error('Não foi possível gerar ID exclusivo.');
    entries.push({...rule,id});ids.add(id);seen.add(fingerprint);added++;
  }
  return {entries,added,skipped};
}
/** Copy a model into the active set, but always disabled for an explicit opt-in. */
export function installAutomationFromLibrary(libraryRule,activeRules,{idFactory=createId}={}){
  if(!Array.isArray(activeRules))throw new Error('Lista de regras inválida.');
  if(activeRules.length>=100)throw new Error('Limite de 100 regras por mundo.');
  const fresh=portableAutomationRule(libraryRule);
  if(activeRules.some(rule=>automationFingerprint(rule)===automationFingerprint(fresh)))
    throw new Error('Esta automação já existe nas suas regras.');
  const id=idFactory();
  if(typeof id!=='string'||!id||id.length>70||activeRules.some(r=>r.id===id))
    throw new Error('Identificador de regra inválido.');
  return [...activeRules,{...fresh,id,enabled:false}];
}
export function exportAutomationBundle(rules,{date=new Date().toISOString()}={}){
  if(!Array.isArray(rules)||rules.length>MAX_LIBRARY_ENTRIES)
    throw new Error('Máximo de 100 automações por arquivo.');
  return JSON.stringify({format:AUTOMATION_BUNDLE_FORMAT,version:AUTOMATION_BUNDLE_VERSION,
    system:AUTOMATION_SYSTEM,exportedAt:date,rules:rules.map(portableAutomationRule)},null,2);
}
export function parseAutomationBundle(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BUNDLE_BYTES)
    throw new Error('Arquivo inválido ou maior que 1 MB.');
  let data;
  try{data=JSON.parse(text);}catch{throw new Error('JSON inválido. Verifique o arquivo selecionado.');}
  if(!data||typeof data!=='object'||Array.isArray(data)||
     data.format!==AUTOMATION_BUNDLE_FORMAT||data.version!==AUTOMATION_BUNDLE_VERSION||
     data.system!==AUTOMATION_SYSTEM||!Array.isArray(data.rules))
    throw new Error('Arquivo de biblioteca incompatível com o Multiverse-D616.');
  if(data.rules.length>MAX_LIBRARY_ENTRIES)throw new Error('Máximo de 100 automações por arquivo.');
  try{return data.rules.map(portableAutomationRule);}catch(error){
    throw new Error(`Arquivo contém regra inválida: ${error.message}`);
  }
}
