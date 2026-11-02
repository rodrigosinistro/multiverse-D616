/** Multiverse-D616 v0.2.125 — read-only world diagnostics.
 * No document updates, hooks, settings writes, or module activation.
 * Designed to be called on demand by a GM; skipped checks are reported honestly.
 */
import {normalizeCustomRule, CUSTOM_EFFECTS, CUSTOM_TRIGGERS,
  CUSTOM_RULES_KEY} from './custom-automations.mjs';
import {CUSTOM_LIBRARY_KEY} from './automation-library.mjs';
import {AUTOMATION_GROUPS, AUTOMATION_POWERS_KEY, POWER_SCOPED_AUTOMATIONS} from './automation-settings.mjs';

const SYSTEM='multiverse-d616';
const PACK_NAMES=['powers','traits','tags','origins','occupations','items'];
const MAX_FINDINGS=300;
const asArray=(collection)=>Array.isArray(collection)?collection:Array.from(collection?.contents??collection?.values?.()??[]);
const cleanText=(v)=>String(v??'').trim();
const normalized=(v)=>cleanText(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const setting=(g,key)=>{try{return g?.settings?.get?.(SYSTEM,key);}catch{return undefined;}};
const rec=(section,severity,code,title,detail='',ref='')=>({section,severity,code,title:cleanText(title),detail:cleanText(detail),ref:cleanText(ref)});
const packByName=(g,name)=>g?.packs?.get?.(`${SYSTEM}.${name}`)??asArray(g?.packs).find(p=>p?.collection===`${SYSTEM}.${name}`);

/** Compares documents by identity, not merely the number of index rows. */
export function inspectPowerIndex(catalog,index){
  const findings=[];
  const records=asArray(index);
  const indexed=new Map();
  for(const entry of records){
    const id=entry?._id??entry?.id;
    if(!id)continue;
    if(indexed.has(id))findings.push(rec('compendios','warning','duplicate-id',`ID duplicado no índice: ${id}`,'Verifique o compêndio Powers.',id));
    else indexed.set(id,entry);
  }
  const expected=new Map();
  for(const item of asArray(catalog)){
    if(item?.type!=='power')continue;
    const id=item._id??item.id;
    if(!id)continue;
    expected.set(id,item);
    const existing=indexed.get(id);
    if(!existing)findings.push(rec('compendios','error','missing-power',`Poder ausente: ${item.name}`,'Presente no catálogo do sistema, mas não no índice do compêndio Powers.',id));
    else if(cleanText(existing.name)!==cleanText(item.name))
      findings.push(rec('compendios','warning','power-name',`Nome divergente: ${item.name}`,`No compêndio: ${existing.name}.`,id));
  }
  for(const [id,power] of indexed){
    if(!expected.has(id)&&power?.type==='power')
      findings.push(rec('compendios','info','extra-power',`Registro adicional: ${power.name}`,'Poder extra não presente no catálogo base. Pode ser uma personalização.',id));
  }
  return {findings,expectedCount:expected.size,indexedCount:indexed.size};
}

/** Validate the raw stored entries: getCustomRules() hides malformed entries. */
export function inspectAutomationEntries(raw,{library=false,knownPowers=[]}={}){
  const findings=[],where=library?'Biblioteca':'Minhas Automações';
  const names=new Set(knownPowers.map(normalized));
  if(raw===undefined)return {findings,count:0};
  if(!Array.isArray(raw))return {findings:[rec('automacoes','error','invalid-list',`${where}: armazenamento inválido`,'Era esperada uma lista de regras.')],count:0};
  const ids=new Set();
  if(raw.length>100)findings.push(rec('automacoes','warning','too-many-rules',`${where}: ${raw.length} regras`,'O limite suportado é 100 entradas.'));
  raw.forEach((entry,i)=>{
    const ref=`${where} #${i+1}`;
    if(typeof entry?.id!=='string'||!entry.id.trim())findings.push(rec('automacoes','error','missing-id',`${ref}: identificador ausente`,'A regra pode não ser carregada pelo editor.',ref));
    else if(ids.has(entry.id))findings.push(rec('automacoes','error','duplicate-id',`${ref}: identificador repetido`,'Duas regras compartilham o mesmo ID.',ref));
    else ids.add(entry.id);
    try{
      const rule=normalizeCustomRule(entry);
      if(rule.powerName&&!names.has(normalized(rule.powerName)))
        findings.push(rec('automacoes','info','custom-power',`${rule.name}: poder não encontrado no catálogo`,
          `Referência “${rule.powerName}”. Pode ser um poder personalizado presente em outra ficha ou módulo.`,ref));
      if(rule.effects.some(e=>e.effectType==='vfx')&&rule.enabled)
        findings.push(rec('automacoes','info','vfx-rule',`${rule.name}: utiliza animação`,'Confirme que o Sequencer está ativo e que o poder possui uma animação configurada.',ref));
    }catch(error){findings.push(rec('automacoes','error','invalid-rule',`${ref}: regra inválida`,error?.message??'Dados incompatíveis.',ref));}
  });
  return {findings,count:raw.length};
}

export function inspectActorDocuments(actors,validStatusIds=[],{maxActors=5000}={}){
  const findings=[];let effects=0,powers=0;
  const known=new Set(validStatusIds);
  const all=asArray(actors);
  for(const actor of all.slice(0,maxActors)){
    if(!actor)continue;
    const actorName=cleanText(actor.name)||'(sem nome)';
    for(const item of asArray(actor.items)){
      if(item?.type!=='power')continue;
      powers++;
      if(!cleanText(item.name))findings.push(rec('personagens','warning','unnamed-power',`${actorName}: poder sem nome`,'Revise o item na ficha.',actor.id));
    }
    for(const effect of asArray(actor.effects)){
      effects++;
      const statuses=[...(effect?.statuses??[])];
      if(effect?.flags?.core?.statusId)statuses.push(effect.flags.core.statusId);
      for(const status of new Set(statuses)){
        // Do not flag custom third-party statuses. Only the system namespace is authoritative.
        if(cleanText(status).startsWith('mmrpg.')&&known.size&&!known.has(status))
          findings.push(rec('personagens','warning','unknown-status',`${actorName}: condição não registrada`,
            `Efeito “${effect.name??effect.label??'sem nome'}” utiliza “${status}”.`,actor.id));
      }
      const f=effect?.flags?.[SYSTEM]?.customAutomationCondition;
      if(f&&['turns','rounds'].includes(f.mode)&&(!Number.isFinite(Number(f.count))||Number(f.count)<1))
        findings.push(rec('personagens','warning','condition-count',`${actorName}: duração inválida`,
          `Efeito “${effect.name??'sem nome'}” possui contagem inválida.`,actor.id));
      const ongoing=effect?.flags?.[SYSTEM]?.customAutomationOngoing;
      if(ongoing&&(!Number.isFinite(Number(ongoing.amount))||Number(ongoing.amount)<0))
        findings.push(rec('personagens','warning','ongoing-amount',`${actorName}: dano contínuo inválido`,
          `Efeito “${effect.name??'sem nome'}” precisa de revisão.`,actor.id));
    }
  }
  if(all.length>maxActors)findings.push(rec('personagens','info','actor-sample','Limite de fichas atingido',`Examinadas ${maxActors} de ${all.length} fichas.`));
  return {findings,actorsScanned:Math.min(all.length,maxActors),powerItems:powers,effects};
}

export function inspectDependencyModules(modules,rules=[]){
  const findings=[];
  const sequencer=modules?.get?.('sequencer');
  const active=sequencer?.active===true;
  const vfxCount=rules.filter(r=>r?.enabled!==false&&asArray(r?.effects??[r]).some(e=>e?.effectType==='vfx')).length;
  if(vfxCount&&!active)findings.push(rec('dependencias','warning','sequencer-required',
    'Sequencer indisponível para regras visuais',`${vfxCount} automação(ões) habilitada(s) utiliza(m) animação, mas o Sequencer não está ativo.`));
  else findings.push(rec('dependencias','info','sequencer-status',
    `Sequencer: ${active?'ativo':sequencer?'desativado':'não instalado'}`,
    active?'Integração opcional disponível.':'Módulo opcional; sua ausência não afeta as regras de combate.'));
  return findings;
}

/** Fetch only bundled catalog metadata (not user files); injectable for unit tests. */
export async function loadBundledPowerCatalog(){
  const url=`systems/${SYSTEM}/apps/charactermancer/data/powers.json`;
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const payload=await response.json();
  if(!Array.isArray(payload?.items))throw new Error('Catálogo não possui lista items.');
  return payload.items;
}

export async function runSystemDiagnostic({game:g=globalThis.game,loadCatalog=loadBundledPowerCatalog}={}){
  if(!g?.user?.isGM)throw new Error('Somente o Mestre pode executar este diagnóstico.');
  const findings=[],checks={};
  const add=(...entries)=>{findings.push(...entries);};
  const report={format:'multiverse-d616.diagnostic',schemaVersion:1,generatedAt:new Date().toISOString(),
    system:{id:g.system?.id??SYSTEM,version:g.system?.version??'desconhecida'},
    foundryVersion:g.version??g.release?.version??'desconhecida',
    world:g.world?.id??'não informado',checks,findings};
  let catalog=[];
  try{catalog=asArray(await loadCatalog());checks.catalog={status:'ok',count:catalog.filter(p=>p?.type==='power').length};}
  catch(error){checks.catalog={status:'unavailable'};add(rec('compendios','warning','catalog-unavailable',
    'Catálogo não pôde ser consultado',`A comparação de poderes foi pulada: ${error.message}`));}
  const indices={};
  for(const name of PACK_NAMES){
    const pack=packByName(g,name);
    if(!pack){checks[`pack_${name}`]={status:'missing'};add(rec('compendios','error','pack-missing',
      `Compêndio ausente: ${name}`,'O pacote esperado do sistema não foi encontrado.'));continue;}
    try{
      const index=await pack.getIndex({fields:['name','type']});
      const rows=asArray(index??pack.index);
      if(!rows.length){
        // A whole pack with an empty index is likely an installation/read failure.
        // Do not misreport hundreds of independently missing powers.
        checks[`pack_${name}`]={status:'empty',count:0};
        add(rec('compendios','error','pack-empty',
          `Compêndio sem registros: ${name}`,
          'O índice retornou zero itens. Confira a instalação completa do sistema e os arquivos do compêndio; não recrie os itens manualmente.'));
        continue;
      }
      indices[name]=rows;checks[`pack_${name}`]={status:'ok',count:rows.length};
    }catch(error){checks[`pack_${name}`]={status:'unavailable'};add(rec('compendios','warning','pack-unavailable',
      `Compêndio indisponível: ${name}`,`Não foi possível ler seu índice: ${error.message}`));}
  }
  if(catalog.length&&indices.powers){
    const result=inspectPowerIndex(catalog,indices.powers);add(...result.findings);
    checks.powerComparison={status:'ok',expected:result.expectedCount,found:result.indexedCount};
  }else checks.powerComparison={status:'skipped'};
  const rawRules=setting(g,CUSTOM_RULES_KEY),rawLibrary=setting(g,CUSTOM_LIBRARY_KEY);
  const powerNames=[...catalog.map(p=>p.name),...asArray(g.actors).flatMap(a=>asArray(a.items).filter(i=>i?.type==='power').map(i=>i.name))];
  const act=inspectAutomationEntries(rawRules,{knownPowers:powerNames});
  const lib=inspectAutomationEntries(rawLibrary,{knownPowers:powerNames,library:true});
  add(...act.findings,...lib.findings);
  checks.automations={status:rawRules===undefined&&rawLibrary===undefined?'unavailable':'ok',rules:act.count,library:lib.count};
  const overrides=setting(g,AUTOMATION_POWERS_KEY);
  if(overrides&&typeof overrides==='object'&&!Array.isArray(overrides)){
    const allowed=Object.keys(AUTOMATION_GROUPS);
    for(const key of Object.keys(overrides)){
      const [group]=key.split('::');
      if(!allowed.includes(group)||!POWER_SCOPED_AUTOMATIONS.includes(group)||!key.includes('::'))
        add(rec('automacoes','warning','unknown-override',`Exceção não reconhecida: ${key}`,'Pode ser uma configuração de versão antiga.'));
    }
  }
  const statuses=asArray(Array.isArray(globalThis.CONFIG?.statusEffects)?globalThis.CONFIG.statusEffects:Object.values(globalThis.CONFIG?.statusEffects??{}))
    .map(s=>s?.id).filter(Boolean);
  const actorResult=inspectActorDocuments(g.actors,statuses);
  add(...actorResult.findings);
  checks.actors={status:'ok',count:actorResult.actorsScanned,powerItems:actorResult.powerItems,effects:actorResult.effects};
  add(...inspectDependencyModules(g.modules,Array.isArray(rawRules)?rawRules:[]));
  checks.dependencies={status:'ok'};
  report.summary={errors:findings.filter(f=>f.severity==='error').length,
    warnings:findings.filter(f=>f.severity==='warning').length,
    info:findings.filter(f=>f.severity==='info').length,
    total:findings.length,displayLimit:MAX_FINDINGS};
  // Reports may be large in customized worlds; cap retained details and count omitted findings.
  if(findings.length>MAX_FINDINGS){
    report.omittedFindings=findings.length-MAX_FINDINGS;
    report.findings=findings.slice(0,MAX_FINDINGS);
  }
  return report;
}
