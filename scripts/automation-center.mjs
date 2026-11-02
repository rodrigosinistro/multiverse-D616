/** Multiverse-D616 v0.2.120 — Central de Automações 5.0 e Biblioteca, Foundry VTT 14.
 * Only audited engine gates appear as individual switches. The existing world
 * settings and the v107 override object remain authoritative and compatible.
 */
import {
  AUTOMATION_SYSTEM as SYSTEM, AUTOMATION_GROUPS, AUTOMATION_MASTER_KEY,
  AUTOMATION_POWERS_KEY, POWER_SCOPED_AUTOMATIONS, powerOverrideKey,
  getAutomationPowerOverrides, automationEnabled,
} from './automation-settings.mjs';
import {POWER_CONDITIONS} from './power-conditions.mjs';
import {POWER_DAMAGE_FACTORS} from './power-fantastic-damage.mjs';
import {ELEMENTAL_FANTASTIC_RULES} from './elemental-fantastic.mjs';
import {RICOCHET_POWERS} from './rico-shield-chain.mjs';
import {CUSTOM_RULES_KEY,CUSTOM_RULES_ENABLED_KEY,CUSTOM_TRIGGERS,CUSTOM_EFFECTS,CUSTOM_STATUSES,CUSTOM_CONDITION_DURATIONS,CUSTOM_ATTACK_SCOPES,CUSTOM_TARGET_OUTCOMES,CUSTOM_STATUS_SUBJECTS,CUSTOM_DAMAGE_MODES,CUSTOM_DAMAGE_ABILITIES,CUSTOM_ONGOING_RESOURCES,MAX_CUSTOM_EFFECTS,ruleEffects,getCustomRules,normalizeCustomRule,customRulesEnabled} from './custom-automations.mjs';

import {CUSTOM_LIBRARY_KEY,MAX_BUNDLE_BYTES,getAutomationLibrary,mergeAutomationLibrary,
  installAutomationFromLibrary,exportAutomationBundle,parseAutomationBundle} from './automation-library.mjs';

const STATUS_LABELS=Object.freeze({
  stunned:'Atordoado',prone:'Caído',blinded:'Cego',deafened:'Surdo',bleeding:'Sangrando',
  paralyzed:'Paralisado',pinned:'Imobilizado',grabbed:'Agarrado',
});
const GROUP_ICONS=Object.freeze({
  fantasticDamage:'fa-burst',extraAttacks:'fa-crosshairs',powerConditions:'fa-shield-halved',
  elementalEffects:'fa-fire-flame-curved',ongoingConditions:'fa-hourglass-half',
  conditionRecovery:'fa-heart-pulse',concentration:'fa-brain',turnActions:'fa-person-running',
});
const GROUP_DETAILS=Object.freeze({
  extraAttacks:'Poderes de ataques adicionais e ricochetes. Cada chave interrompe somente os próximos ataques adicionais daquele poder; ataques normais continuam disponíveis.',
  elementalEffects:'Consequências automáticas dos elementos em Sucessos Fantásticos, tanto após confirmação de dano quanto nas rotas sem dano. Os efeitos já existentes continuam sua duração.',
  ongoingConditions:'Condições de fim de turno, teste de Envenenado, chamas recorrentes de Faltine e cura passiva de Healing Factor. Apagar/remover efeitos manualmente continua possível.',
  conditionRecovery:'A recuperação automática de Sangrando ao receber Health pode ser desligada sem impedir testes de recuperação manuais.',
  concentration:'A Concentração e a cobrança de Focus fazem parte do mesmo ciclo de manutenção. Permanecem juntas sob a chave do grupo para evitar custos inconsistentes.',
  turnActions:'Ações, Reações e Movimento compartilham o rastreador de combate. O controle segue por grupo para manter o consumo de recursos consistente.',
});
const ORDER=['powerConditions','fantasticDamage','extraAttacks','elementalEffects',
  'ongoingConditions','conditionRecovery','concentration','turnActions'];
const TURN_DAMAGE_IDS=Object.freeze(['mmrpg.ablaze','mmrpg.bleeding','mmrpg.corroding']);
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeEntry=(power,description,type='Poder',extra={})=>({power,description,type,...extra});

/** Only entries with an actual engine-side individual gate belong here. */
export function automationCatalog(){
  const items=Object.fromEntries(ORDER.map(g=>[g,[]]));
  for(const [power,rules] of Object.entries(POWER_CONDITIONS)){
    if(!rules.length)continue;
    const summary=[...new Set(rules.map(r=>r.label||STATUS_LABELS[r.status]||r.status||'Efeito'))].join(', ');
    items.powerConditions.push(makeEntry(power,`Condições: ${summary}.`));
  }
  for(const [power,[normal,fantastic]] of Object.entries(POWER_DAMAGE_FACTORS))
    items.fantasticDamage.push(makeEntry(power,`Dano: sucesso ${normal}×; sucesso fantástico ${fantastic}×.`));

  for(const power of ['Unstoppable Assault','Unrelenting Smash'])
    items.extraAttacks.push(makeEntry(power,'Permite repetir o ataque após o dano confirmado, pagando Focus e consumindo Movimento conforme a regra.'));
  for(const power of ['Hellfire Chains','Coiling Crush'])
    items.extraAttacks.push(makeEntry(power,'Habilita o ataque de acompanhamento de um alvo mantido, no turno válido.'));
  for(const power of RICOCHET_POWERS)
    items.extraAttacks.push(makeEntry(power,'Libera o ricochete após Sucesso Fantástico com dano confirmado.'));

  for(const [id,rule] of Object.entries(ELEMENTAL_FANTASTIC_RULES)){
    if(rule.noteOnly)continue; // Hellfire is a GM note, not an automatic status.
    items.elementalEffects.push(makeEntry(`element:${id}`,`${rule.label}: ${rule.text}`,'Elemento',{label:rule.label}));
  }
  for(const [id,label,description] of [
    ['mmrpg.poisoned','Envenenado','Teste automático de Resilience no início do turno.'],
    ['mmrpg.ablaze','Em Chamas','Dano de condição no fim do turno (dependente da configuração de dano automático do HUD de Condições).'],
    ['mmrpg.bleeding','Sangrando','Dano de condição no fim do turno (dependente da configuração de dano automático do HUD de Condições).'],
    ['mmrpg.corroding','Corroído','Dano de condição no fim do turno (dependente da configuração de dano automático do HUD de Condições).'],
    ['Flames of the Faltine','Flames of the Faltine','Aplicação de chamas após dano confirmado e dano recorrente no fim da rodada.'],
    ['Healing Factor','Healing Factor','Cura passiva no fim do turno em combate; avanço narrativo manual permanece disponível.'],
  ])items.ongoingConditions.push(makeEntry(id,description,id.startsWith('mmrpg.')?'Condição':'Poder',{label}));
  items.conditionRecovery.push(makeEntry('mmrpg.bleeding','Remove Sangrando automaticamente ao recuperar Health.','Condição',{label:'Sangrando ao curar'}));

  for(const group of POWER_SCOPED_AUTOMATIONS)
    items[group].sort((a,b)=>(a.label??a.power).localeCompare(b.label??b.power,'pt-BR',{sensitivity:'base'}));
  return items;
}

export function filteredAutomationCatalog(query,catalog=automationCatalog(),{onlyCustomized=false,overrides={}}={}){
  const term=normalize(query).trim();
  const result={};
  for(const group of ORDER){
    const [name,description]=AUTOMATION_GROUPS[group];
    const groupMatches=!term||normalize(name).includes(term);
    const generalMatches=normalize(`${description} ${GROUP_DETAILS[group]??''}`).includes(term);
    const powers=catalog[group].filter(entry=>{
      if(onlyCustomized&&overrides[powerOverrideKey(group,entry.power)]!==false)return false;
      return groupMatches||normalize(`${entry.label??entry.power} ${entry.power} ${entry.description} ${entry.type}`).includes(term);
    });
    if(onlyCustomized){if(powers.length)result[group]={powers,groupMatches};}
    else if(groupMatches||powers.length||(!catalog[group].length&&generalMatches))result[group]={powers,groupMatches};
  }
  return result;
}

/** Calculate the visible status, including genuine Foundry setting dependencies. */
export function automationStatus(group,power,settings=globalThis.game?.settings){
  let paused=false,groupOn=true,requirement=true;
  try{paused=settings?.get?.(SYSTEM,AUTOMATION_MASTER_KEY)===true;}catch(_e){}
  try{groupOn=settings?.get?.(SYSTEM,`automation_${group}`)!==false;}catch(_e){}
  if(group==='ongoingConditions'&&TURN_DAMAGE_IDS.includes(power)){
    try{requirement=settings?.get?.(SYSTEM,'autoTurnDamage')!==false;}catch(_e){}
  }
  const custom=getAutomationPowerOverrides(settings)[powerOverrideKey(group,power)]===false;
  const effective=automationEnabled(group,settings,power)&&requirement;
  const reason=paused?'Pausado pela chave geral':!groupOn?'Grupo desativado':custom?'Desativado individualmente':!requirement?'Depende do dano automático de condições':'Ativo';
  return {effective,reason,custom,dependencyMissing:!requirement};
}

const ApplicationBase=globalThis.foundry?.applications?.api?.ApplicationV2??class {};
export class D616AutomationCenter extends ApplicationBase{
  static DEFAULT_OPTIONS={
    id:'d616-automation-center',classes:['d616-automation-center-window'],
    window:{title:'Multiverse-D616 | Central de Automações',icon:'fa-solid fa-gears',resizable:true},
    position:{width:960,height:745},
  };
  constructor(...args){
    super(...args);this._query='';this._expanded=new Set(['powerConditions']);
    this._busy=false;this._onlyCustomized=false;this._catalog=automationCatalog();
    this._tab='custom';this._savedNativeScroll=0;this._ruleEditingId=null;this._powerChoices=null;
    this._editingSnapshot=null;this._pendingRuleSave=null;
  }
  async _renderHTML(){
    const root=document.createElement('main');root.className='d616-auto';
    root.innerHTML=`<div class="d616-auto__hero">
      <div class="d616-auto__eyebrow">MULTIVERSE-D616 · FOUNDRY VTT 14 · CENTRAL 5.0 · BIBLIOTECA DE AUTOMAÇÕES</div>
      <h2><i class="fa-solid fa-gears" aria-hidden="true"></i> Central de Automações</h2>
      <p>Crie regras sem scripts, organize modelos reutilizáveis e compartilhe-os em JSON entre mundos. A Biblioteca não executa regras até você instalá-las e ativá-las.</p>
    </div>
    <nav class="d616-auto__tabs" aria-label="Seções da Central">
      <button type="button" data-tab="custom" class="d616-auto__tab" aria-selected="true"><i class="fa-solid fa-wand-magic-sparkles"></i> Minhas Automações <span data-count-custom>0</span></button>
      <button type="button" data-tab="library" class="d616-auto__tab" aria-selected="false"><i class="fa-solid fa-book-open"></i> Biblioteca <span data-count-library>0</span></button>
      <button type="button" data-tab="native" class="d616-auto__tab" aria-selected="false"><i class="fa-solid fa-sliders"></i> Automações Nativas <span>107</span></button>
    </nav>
    <div data-native-view class="d616-auto__native" hidden>
    <div class="d616-auto__overview">
      <div class="d616-auto__metric"><span>Grupos ativos</span><strong data-summary-groups>—</strong></div>
      <div class="d616-auto__metric"><span>Rotinas configuráveis</span><strong data-summary-powers>—</strong></div>
      <div class="d616-auto__metric"><span>Exceções individuais</span><strong data-summary-overrides>—</strong></div>
      <label class="d616-auto__master"><span><strong><i class="fa-solid fa-power-off" aria-hidden="true"></i> Pausar todas</strong><small>As preferências ficam salvas para retomar depois</small></span><input type="checkbox" data-master aria-label="Pausar todas as automações" /></label>
    </div>
    <div class="d616-auto__toolbar">
      <label class="d616-auto__search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-search placeholder="Buscar poder, elemento, condição ou grupo..." aria-label="Pesquisar automações" /></label>
      <label class="d616-auto__custom-filter"><input type="checkbox" data-custom-filter /> Só alteradas</label>
      <button type="button" data-expand-all><i class="fa-solid fa-angles-down" aria-hidden="true"></i> Expandir</button>
      <button type="button" data-collapse-all><i class="fa-solid fa-angles-up" aria-hidden="true"></i> Recolher</button>
    </div>
    <div class="d616-auto__notice" data-notice aria-live="polite"></div>
    <div class="d616-auto__groups" data-groups></div>
    </div>
    <div data-custom-view class="d616-auto__custom">
      <div class="d616-auto__custom-intro"><div><strong>Automações criadas por você</strong><p>Selecione poderes das fichas ou compêndios. Use o resultado real de cada alvo, incluindo a confirmação de dano do Mestre, para criar novas regras sem scripts.</p></div>
        <button type="button" data-export-active title="Baixar todas as regras deste mundo em JSON"><i class="fa-solid fa-file-export"></i> Exportar minhas regras</button>
        <label class="d616-auto__custom-enabled"><input type="checkbox" data-custom-enabled checked /> Executar minhas automações</label>
      </div>
      <div class="d616-auto__builder">
        <section class="d616-auto__my-rules"><div class="d616-auto__builder-title"><strong>Minhas regras</strong><button type="button" data-new-rule><i class="fa-solid fa-plus"></i> Nova</button></div><div class="d616-auto__my-list" data-rule-list></div></section>
        <section class="d616-auto__editor"><div class="d616-auto__builder-title"><strong data-editor-title>Nova automação</strong><small>Gatilho → Condição → Efeitos</small></div>
          <form data-rule-form class="d616-auto__form" autocomplete="off">
            <label>Nome da automação<input type="text" name="name" required maxlength="80" placeholder="Ex.: Fúria do Venom" /></label>
            <div class="d616-auto__form-step"><strong><span>1</span> Quando executar?</strong>
              <label>Gatilho<select name="trigger">${Object.entries(CUSTOM_TRIGGERS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <div data-power-field class="d616-auto__power-picker">
                <label>Selecionar poder da ficha ou compêndio<select data-power-picker aria-label="Selecionar poder do catálogo"><option value="">Carregando poderes…</option></select></label>
                <label><span data-power-label>Poder selecionado</span><input name="powerName" maxlength="100" placeholder="Escolha acima ou digite um poder personalizado" /></label>
                <small data-picker-status>Buscando poderes das fichas e dos compêndios de Itens disponíveis.</small>
              </div>
              <p class="d616-auto__hint" data-passive-hint hidden>Esta regra entra em ação automaticamente enquanto o personagem possuir o poder na ficha. Você não precisa rolar o poder.</p>
              <label data-target-outcome hidden>Resultado necessário<select name="hitOutcome">${Object.entries(CUSTOM_TARGET_OUTCOMES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <p class="d616-auto__hint" data-target-hint hidden><strong>Destino: cada alvo atingido.</strong> Usa as defesas e decisões do combate nativo. Ataques com dano aguardam a confirmação do card de dano pelo Mestre; alvos não atingidos não recebem o efeito.</p>
              <label data-fantastic-field class="d616-auto__inline"><input type="checkbox" name="fantasticOnly" /> Apenas se o dado Marvel sair M <small>(não verifica se acertou)</small></label>
            </div>
            <div class="d616-auto__form-step"><strong><span>2</span> Exigir alguma condição? (opcional)</strong>
              <label data-status-subject hidden>Verificar a condição em<select name="statusSubject">${Object.entries(CUSTOM_STATUS_SUBJECTS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <label>O personagem precisa estar com<select name="requiresStatus"><option value="">Nenhuma condição exigida</option>${Object.entries(CUSTOM_STATUSES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
            </div>
            <div class="d616-auto__form-step" data-effect-entry="primary"><strong><span>3</span> O que acontece?</strong><div class="d616-auto__effect-controls" data-primary-effect-controls hidden><span>Efeito 1</span><button type="button" data-move-effect="1" data-direction="down">Descer ↓</button></div>
              <label>Efeito<select name="effectType">${Object.entries(CUSTOM_EFFECTS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <label data-condition-effect>Condição a aplicar<select name="effectStatus">${Object.entries(CUSTOM_STATUSES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <div data-condition-timing class="d616-auto__condition-timing">
                <label>Quanto tempo dura a condição?<select name="conditionDurationMode">${Object.entries(CUSTOM_CONDITION_DURATIONS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
                <label data-condition-count hidden>Quantidade de turnos/rodadas<input name="conditionDurationCount" type="number" min="1" max="20" step="1" value="1" /></label>
                <label>Como remover? (opcional)<textarea name="conditionRemoval" maxlength="200" rows="2" placeholder="Ex.: Teste de Logic TN 12 como Ação Padrão. Deixe vazio para usar as regras nativas quando existirem."></textarea></label>
                <p class="d616-auto__hint">Turnos e rodadas exigem combate iniciado. As condições temporárias expiram automaticamente; no começo do turno, o chat lista as condições ativas e como removê-las.</p>
              </div>
              <label data-healing-effect hidden>Quantidade de Health a recuperar<input name="healAmount" type="number" min="1" max="100" step="1" value="5" /></label>
              <label data-chat-effect hidden>Texto da mensagem<textarea name="message" rows="3" maxlength="250" placeholder="Ex.: As chamas envolvem o personagem!"></textarea></label>
              <label data-attack-scope hidden>Afeta quais ataques?<select name="attackScope">${Object.entries(CUSTOM_ATTACK_SCOPES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
              <div data-damage-effect hidden class="d616-auto__condition-timing">
                <label>Tipo de modificação de dano<select name="damageBonusMode">${Object.entries(CUSTOM_DAMAGE_MODES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
                <label data-damage-fixed>Valor de dano adicional<input name="damageBonusAmount" type="number" min="1" max="100" step="1" value="5" /></label>
                <label data-damage-ability hidden>Atributo do atacante<select name="damageAbility">${Object.entries(CUSTOM_DAMAGE_ABILITIES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
                <label data-damage-multiplier hidden>Multiplicador final<select name="damageMultiplierFactor"><option value="2">×2</option><option value="3">×3</option></select></label>
                <p class="d616-auto__hint">Bônus fixos/por atributo entram no dano base antes dos fatores nativos; ×2/×3 multiplica o resultado calculado (já com RD e fator especial), antes do MMDR. Multiplicadores de regras distintas não acumulam: prevalece o maior. Dano zero continua zero. Requer acerto confirmado e card de dano.</p>
              </div>
              <div data-ongoing-effect hidden class="d616-auto__condition-timing">
                <label>Dano por início de turno<input name="ongoingAmount" type="number" min="1" max="100" step="1" value="5" /></label>
                <label>Recurso afetado<select name="ongoingResource">${Object.entries(CUSTOM_ONGOING_RESOURCES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
                <label>Quantos turnos do alvo?<input name="ongoingTurns" type="number" min="1" max="20" step="1" value="3" /></label>
                <p class="d616-auto__hint">Após ativar a regra, o efeito começa a causar dano no próximo início de turno do personagem afetado. Exige combate e iniciativa; segue a RD e as proteções do sistema e avisa no chat.</p>
              </div>
              <div class="d616-auto__scope-warning" data-caster-warning hidden>
                <strong><i class="fa-solid fa-circle-exclamation"></i> Este efeito será aplicado ao próprio atacante, NÃO ao alvo.</strong>
                <p>O gatilho “Ao rolar um poder” executa antes da confirmação de acerto. Mesmo com M no dado Marvel, o golpe pode errar a defesa.</p>
                <button type="button" data-convert-target><i class="fa-solid fa-bullseye"></i> Converter para efeito no alvo atingido</button>
              </div>
              <p class="d616-auto__hint" data-vfx-hint hidden>Reproduz a animação já configurada na aba Visuais do poder. Requer Sequencer ativo e arquivo de animação disponível. Não altera dano nem condições.</p>
              <p class="d616-auto__hint" data-effect-hint>Os efeitos são aplicados ao personagem que rolou o poder ou que está iniciando/terminando o turno.</p>
              <div class="d616-auto__example" data-passive-example hidden><strong>Exemplo: Blazing Fast Fists</strong><p>Poder de origem: Blazing Fast Fists · Edge · Ataques corpo a corpo. O benefício é considerado na rolagem de um ataque, inclusive com arma corpo a corpo.</p><button type="button" data-load-example>Preencher este exemplo</button></div>
              <div class="d616-auto__example" data-power-example hidden><strong>Exemplo: Elemental Blast</strong><p>Ao rolar Elemental Blast · Edge · Ataques à distância. O poder original já traz Edge; a regra personalizada não duplica a vantagem nativa.</p><button type="button" data-load-power-example>Preencher este exemplo</button></div>
            </div>
            <div data-effects-list class="d616-auto__effect-list"></div>
            <div class="d616-auto__effect-toolbar"><button type="button" data-add-effect><i class="fa-solid fa-plus"></i> Adicionar efeito</button><span class="d616-auto__effect-count" data-effect-count>1 / 8 efeitos</span><small>Até 8 efeitos em ordem. Modificadores, dano contínuo, condições, cura, animações e mensagens podem compartilhar o mesmo gatilho.</small></div>
            <label class="d616-auto__inline"><input type="checkbox" name="enabled" checked /> Habilitar esta regra</label>
            <p class="d616-auto__hint" data-editor-save-hint>Ao editar uma regra existente, os efeitos e as demais alterações são salvos automaticamente ao fechar a Central ou escolher outra regra. Para uma regra nova, clique em Salvar automação.</p>
            <div class="d616-auto__form-actions"><button type="submit" data-submit-rule><i class="fa-solid fa-floppy-disk"></i> Salvar automação</button><button type="button" data-reset-rule>Limpar</button></div>
          </form>
        </section>
      </div>
    </div>
    <section data-library-view class="d616-auto__library" hidden>
      <div class="d616-auto__library-intro"><strong><i class="fa-solid fa-book-open"></i> Biblioteca de Automações do Mestre</strong>
        <p>Guarde cópias de regras como modelos. Exporte e importe arquivos JSON para compartilhar entre mundos. Importar não executa nenhuma regra; a instalação cria uma cópia desativada em Minhas Automações.</p>
        <div class="d616-auto__library-actions">
          <button type="button" data-import-library><i class="fa-solid fa-file-import"></i> Importar JSON</button>
          <button type="button" data-export-library><i class="fa-solid fa-file-export"></i> Exportar biblioteca</button>
          <input type="file" accept=".json,application/json" data-library-file hidden aria-label="Selecionar JSON de automações" />
        </div>
      </div>
      <div class="d616-auto__library-items" data-library-list></div>
      <p class="d616-auto__library-note"><i class="fa-solid fa-lock"></i> Somente Mestres podem importar, instalar ou excluir modelos. Nunca são importados scripts nem controles nativos globais.</p>
    </section>
    <footer class="d616-auto__footer"><span><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Somente Mestres podem alterar. Desligar uma automação não remove efeitos existentes.</span><span data-save-status aria-live="polite"></span></footer>`;
    return root;
  }
  _replaceHTML(result,container){container.replaceChildren(result);}
  _onRender(context,options){
    super._onRender?.(context,options);
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    root.querySelector('[data-search]').value=this._query;
    root.querySelector('[data-custom-filter]').checked=this._onlyCustomized;
    root.querySelector('[data-native-view]').hidden=this._tab!=='native';
    root.querySelector('[data-custom-view]').hidden=this._tab!=='custom';
    root.querySelector('[data-library-view]').hidden=this._tab!=='library';
    this._updateTabs(root);
    root.querySelector('[data-groups]').scrollTop=this._savedNativeScroll;
    root.addEventListener('input',event=>{
      if(event.target.matches('[data-search]')){this._query=event.target.value;this._refresh();}
      if(event.target.closest('[data-rule-form]'))this._updateEditorSaveHint();
    });
    root.addEventListener('submit',event=>{
      if(event.target.matches('[data-rule-form]')){event.preventDefault();this._trackRuleSave();}
    });
    root.addEventListener('click',event=>{
      const tab=event.target.closest('[data-tab]');
      if(tab){void this._selectTab(tab.dataset.tab);return;}
      if(event.target.closest('[data-export-active]')){void this._exportActiveRules();return;}
      if(event.target.closest('[data-export-library]')){this._exportLibrary();return;}
      if(event.target.closest('[data-import-library]')){
        if(globalThis.game?.user?.isGM)root.querySelector('[data-library-file]').click();return;
      }
      const saveModel=event.target.closest('[data-store-library]');
      if(saveModel){void this._storeRuleInLibrary(saveModel.dataset.storeLibrary);return;}
      const installModel=event.target.closest('[data-install-library]');
      if(installModel){void this._installLibraryModel(installModel.dataset.installLibrary);return;}
      const removeModel=event.target.closest('[data-delete-library]');
      if(removeModel){void this._deleteLibraryModel(removeModel.dataset.deleteLibrary);return;}
      if(event.target.closest('[data-new-rule]')){void this._switchRule(null);return;}
      if(event.target.closest('[data-reset-rule]')){this._editRule(null);return;}
      if(event.target.closest('[data-load-example]')){this._loadPassiveExample();return;}
      if(event.target.closest('[data-load-power-example]')){this._loadPowerExample();return;}
      if(event.target.closest('[data-convert-target]')){this._convertPowerRuleToTarget();return;}
      if(event.target.closest('[data-add-effect]')){this._changeEffects('add');return;}
      const removeEffect=event.target.closest('[data-remove-effect]');
      if(removeEffect){this._changeEffects('remove',Number(removeEffect.dataset.removeEffect));return;}
      const moveEffect=event.target.closest('[data-move-effect]');
      if(moveEffect){this._changeEffects('move',Number(moveEffect.dataset.moveEffect));return;}
      const edit=event.target.closest('[data-edit-rule]');
      if(edit){void this._switchRule(edit.dataset.editRule);return;}
      const remove=event.target.closest('[data-delete-rule]');
      if(remove){void this._deleteRule(remove.dataset.deleteRule);return;}
      if(event.target.closest('[data-expand-all]')){this._expanded=new Set(ORDER);this._refresh();return;}
      if(event.target.closest('[data-collapse-all]')){this._expanded.clear();this._refresh();return;}
      const expand=event.target.closest('[data-expand-group]');
      if(expand){const group=expand.dataset.expandGroup;
        if(this._expanded.has(group))this._expanded.delete(group);else this._expanded.add(group);
        this._refresh();}
    });
    root.addEventListener('change',event=>{
      const input=event.target;
      if(input.matches('[data-library-file]')){void this._importLibraryFile(input.files?.[0]);input.value='';return;}
      if(input.matches('[data-power-picker]')){
        if(input.value){const field=root.querySelector('[name="powerName"]');field.value=input.value;}return;
      }
      if(input.matches('[name="trigger"],[name="effectType"],[name="conditionDurationMode"],[name="damageBonusMode"],[data-effect-field="effectType"],[data-effect-field="conditionDurationMode"],[data-effect-field="damageBonusMode"]')){this._syncRuleFields();this._updateEditorSaveHint();return;}
      if(input.closest('[data-rule-form]'))this._updateEditorSaveHint();
      if(input.matches('[data-custom-enabled]')){void this._save(CUSTOM_RULES_ENABLED_KEY,input.checked);return;}
      if(input.matches('[data-rule-enabled]')){void this._setRuleEnabled(input.dataset.ruleEnabled,input.checked);return;}
      if(input.matches('[data-custom-filter]')){this._onlyCustomized=input.checked;this._refresh();return;}
      if(input.matches('[data-master]'))void this._save(AUTOMATION_MASTER_KEY,input.checked);
      else if(input.matches('[data-power]')){
        const {group,powerName:power}=input.dataset;
        // Never trust a synthetic/foreign power name: the setting is a shared world object.
        if(!POWER_SCOPED_AUTOMATIONS.includes(group)||!this._catalog[group]?.some(p=>p.power===power)){
          this._refresh();return;
        }
        const next={...getAutomationPowerOverrides()};const key=powerOverrideKey(group,power);
        if(input.checked)delete next[key];else next[key]=false;
        void this._save(AUTOMATION_POWERS_KEY,next);
      }else if(input.matches('[data-group]')&&ORDER.includes(input.dataset.group))
        void this._save(`automation_${input.dataset.group}`,input.checked);
    });
    this._refresh();
    this._refreshRules();
    this._refreshLibrary();
    this._syncRuleFields();
    void this._populatePowerPicker();
  }
  _refresh(){
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    const gm=Boolean(globalThis.game?.user?.isGM);
    const allPaused=Boolean(game.settings.get(SYSTEM,AUTOMATION_MASTER_KEY));
    const overrides=getAutomationPowerOverrides();
    const enabledCount=ORDER.filter(g=>game.settings.get(SYSTEM,`automation_${g}`)!==false).length;
    const entryCount=POWER_SCOPED_AUTOMATIONS.reduce((n,g)=>n+this._catalog[g].length,0);
    const known=new Set(POWER_SCOPED_AUTOMATIONS.flatMap(g=>this._catalog[g].map(e=>powerOverrideKey(g,e.power))));
    const customCount=Object.keys(overrides).filter(key=>known.has(key)&&overrides[key]===false).length;
    root.querySelector('[data-summary-groups]').textContent=allPaused?`0 / ${ORDER.length}`:`${enabledCount} / ${ORDER.length}`;
    root.querySelector('[data-summary-powers]').textContent=String(entryCount);
    root.querySelector('[data-summary-overrides]').textContent=String(customCount);
    root.querySelector('[data-master]').checked=allPaused;
    root.querySelector('[data-master]').disabled=this._busy||!gm;
    root.querySelector('[data-custom-filter]').checked=this._onlyCustomized;
    const notice=root.querySelector('[data-notice]');
    notice.textContent=allPaused?'Todas as automações opcionais estão pausadas. As escolhas abaixo continuam salvas.':'As chaves individuais afetam apenas novas aplicações. Concentração e consumo de ações são gerenciados em conjunto para não alterar regras fundamentais.';
    notice.classList.toggle('is-paused',allPaused);
    const matches=filteredAutomationCatalog(this._query,this._catalog,{onlyCustomized:this._onlyCustomized,overrides});
    const wrapper=root.querySelector('[data-groups]');
    const previousScroll=wrapper.scrollTop;wrapper.replaceChildren();
    const searchActive=Boolean(this._query.trim())||this._onlyCustomized;
    for(const group of ORDER){
      const filtered=matches[group];if(!filtered)continue;
      const [name,description]=AUTOMATION_GROUPS[group];
      const enabled=game.settings.get(SYSTEM,`automation_${group}`)!==false;
      const expanded=searchActive||this._expanded.has(group);
      const scoped=POWER_SCOPED_AUTOMATIONS.includes(group);
      const items=filtered.powers;
      const activeItems=(this._catalog[group]??[]).filter(({power})=>automationStatus(group,power,game.settings).effective).length;
      const groupBadge=allPaused?'Pausado':enabled?'Ativo':'Desativado';
      const section=document.createElement('section');section.className='d616-auto__group';
      section.innerHTML=`<div class="d616-auto__group-head">
        <button type="button" class="d616-auto__expand" data-expand-group="${group}" aria-expanded="${expanded}" aria-controls="d616-auto-body-${group}">
          <i class="fa-solid ${GROUP_ICONS[group]}" aria-hidden="true"></i>
          <span class="d616-auto__group-title"><strong>${escapeHTML(name)}</strong><small>${scoped?`${this._catalog[group].length} rotinas · ${activeItems} efetivas`:'Controle geral integrado'}</small></span>
          <span class="d616-auto__badge ${!allPaused&&enabled?'is-on':''}">${groupBadge}</span>
          <i class="fa-solid ${expanded?'fa-chevron-up':'fa-chevron-down'}" aria-hidden="true"></i>
        </button>
        <label class="d616-auto__toggle" title="${escapeHTML(name)}"><input type="checkbox" data-group="${group}" ${enabled?'checked':''} ${this._busy||!gm?'disabled':''} aria-label="Ativar ${escapeHTML(name)}"/><span aria-hidden="true"></span></label>
      </div><div id="d616-auto-body-${group}" class="d616-auto__body" ${expanded?'':'hidden'}>
        <p class="d616-auto__group-description">${escapeHTML(description)}</p>
        <div class="d616-auto__power-list"></div>
      </div>`;
      const list=section.querySelector('.d616-auto__power-list');
      if(scoped){
        const intro=document.createElement('p');intro.className='d616-auto__subheading';
        intro.textContent='EXCEÇÕES INDIVIDUAIS · As opções ficam armazenadas, mesmo com o grupo pausado';list.append(intro);
        if(group==='ongoingConditions'){
          const oldSetting=(()=>{try{return game.settings.get(SYSTEM,'autoTurnDamage');}catch{return true;}})();
          if(oldSetting===false){
            const warning=document.createElement('p');warning.className='d616-auto__dependency';
            warning.textContent='Dependência: “Aplicar dano de condições automaticamente no fim do turno” está desativada nas configurações do HUD de Condições. Em Chamas, Sangrando e Corroído não causam dano automático enquanto essa opção estiver desligada.';
            list.append(warning);
          }
        }
        for(const {power,label,description:detail,type} of items){
          const status=automationStatus(group,power,game.settings);
          const row=document.createElement('label');row.className='d616-auto__power';
          row.innerHTML=`<span class="d616-auto__power-copy"><strong>${escapeHTML(label??power)}</strong><small>${escapeHTML(detail)}</small><em>${escapeHTML(type)}</em></span>
            <span class="d616-auto__power-state ${status.effective?'is-on':status.dependencyMissing?'is-warning':''}" title="${escapeHTML(status.reason)}">${escapeHTML(status.reason)}</span>
            <input type="checkbox" data-power="1" data-group="${group}" data-power-name="${escapeHTML(power)}" ${status.custom?'':'checked'} ${this._busy||!gm?'disabled':''} aria-label="Automação individual: ${escapeHTML(label??power)}"/>`;
          list.append(row);
        }
        if(!items.length){const empty=document.createElement('p');empty.className='d616-auto__empty';empty.textContent='Nenhuma rotina corresponde ao filtro atual.';list.append(empty);}
      }else{
        const para=document.createElement('p');para.className='d616-auto__general';
        para.textContent=GROUP_DETAILS[group]??'Controle único disponível para esta categoria.';list.append(para);
      }
      wrapper.append(section);
    }
    if(!wrapper.childElementCount){const empty=document.createElement('div');empty.className='d616-auto__empty';
      empty.textContent=this._onlyCustomized?'Não há exceções individuais para esta pesquisa. Desmarque “Só alteradas” para ver todas.':'Nenhuma automação encontrada. Experimente outro termo.';wrapper.append(empty);}
    // Recreating the native rows must not jump the scroll pane to the top.
    wrapper.scrollTop=previousScroll;
    this._savedNativeScroll=wrapper.scrollTop;
  }
  async _save(key,value){
    const root=this.element?.querySelector?.('.d616-auto');
    if(!root||this._busy||!globalThis.game?.user?.isGM){this._refresh();return;}
    this._busy=true;root.querySelector('[data-save-status]').textContent='Salvando...';
    for(const input of root.querySelectorAll('input[type="checkbox"]'))input.disabled=true;
    try{
      await game.settings.set(SYSTEM,key,value);
      root.querySelector('[data-save-status]').textContent='Alterações salvas';
    }catch(error){
      console.error('[D616] Falha ao salvar Central de Automações:',error);
      globalThis.ui?.notifications?.error?.('Não foi possível salvar a automação. Verifique permissões ou conexão.');
      root.querySelector('[data-save-status]').textContent='Erro ao salvar';
    }finally{this._busy=false;this._refresh();this._refreshRules();}
  }
  _updateTabs(root){
    for(const button of root.querySelectorAll('[data-tab]')){
      const selected=button.dataset.tab===this._tab;
      button.setAttribute('aria-selected',String(selected));
      button.classList.toggle('is-selected',selected);
    }
  }
  async _selectTab(tab){
    if(!['custom','native','library'].includes(tab)||tab===this._tab)return;
    if(!await this._saveEditedRuleIfNeeded())return;
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    if(this._tab==='native')this._savedNativeScroll=root.querySelector('[data-groups]').scrollTop;
    this._tab=tab;
    root.querySelector('[data-native-view]').hidden=tab!=='native';
    root.querySelector('[data-custom-view]').hidden=tab!=='custom';
    root.querySelector('[data-library-view]').hidden=tab!=='library';
    if(tab==='native')root.querySelector('[data-groups]').scrollTop=this._savedNativeScroll;
    if(tab==='library')this._refreshLibrary();
    this._updateTabs(root);
  }
  async _populatePowerPicker(){
    const picker=this.element?.querySelector?.('[data-power-picker]');
    const status=this.element?.querySelector?.('[data-picker-status]');
    if(!picker)return;
    if(!this._powerChoices){
      const found=new Map();
      const add=(name,origin)=>{
        name=String(name??'').trim();if(!name||name.length>100)return;
        if(!found.has(name))found.set(name,origin);
      };
      const values=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
      for(const actor of values(globalThis.game?.actors))
        for(const item of values(actor?.items))if(item?.type==='power')add(item.name,'Ficha');
      const packs=values(globalThis.game?.packs).filter(p=>p.documentName==='Item' || p.metadata?.type==='Item');
      const indexes=await Promise.allSettled(packs.map(pack=>pack.getIndex?.({fields:['name','type']})));
      for(let i=0;i<packs.length;i++){
        if(indexes[i].status!=='fulfilled')continue;
        const index=indexes[i].value;
        for(const item of values(index))if(item?.type==='power')add(item.name,packs[i].metadata?.label??'Compêndio');
      }
      this._powerChoices=[...found].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR',{sensitivity:'base'})).slice(0,2500);
    }
    // The window may have been closed/re-rendered during an async pack lookup.
    if(this.element?.querySelector?.('[data-power-picker]')!==picker)return;
    const previous=picker.value;
    picker.replaceChildren();
    picker.add(new Option('Escolha um poder (ou digite abaixo)', ''));
    for(const [name,origin] of this._powerChoices)picker.add(new Option(`${name} · ${origin}`,name));
    if(this._powerChoices.some(([name])=>name===previous))picker.value=previous;
    if(status)status.textContent=`${this._powerChoices.length} poderes encontrados nas fichas e compêndios. Também é possível escrever um nome personalizado.`;
  }
  _syncRuleFields(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    const trigger=form.elements.namedItem('trigger')?.value;
    const passive=trigger==='passiveAttack',power=trigger==='powerRoll',target=trigger==='targetHit';
    const select=form.elements.namedItem('effectType');
    for(const option of select.options){
      const rollModifier=option.value==='edge'||option.value==='trouble';
      // Active power rolls can use any effect. Passive attacks only alter dice.
      // Turn events remain instantaneous: future-roll buffs need their own
      // duration and consumption logic, so are not falsely advertised here.
      option.disabled=passive?!rollModifier:!power&&rollModifier;
      if(option.value==='vfx'&&!(power||target))option.disabled=true;
      if(option.value==='damageBonus'&&!target)option.disabled=true;
      option.hidden=option.disabled;
    }
    if(select.selectedOptions[0]?.disabled)select.value=passive?'edge':'condition';
    const type=select.value,rollModifier=type==='edge'||type==='trouble';
    form.querySelector('[data-power-field]').hidden=!(power||passive||target);
    form.querySelector('[data-target-outcome]').hidden=!target;
    form.querySelector('[data-target-hint]').hidden=!target;
    form.querySelector('[data-status-subject]').hidden=!target;
    form.querySelector('[data-power-label]').textContent=passive?'Poder passivo (presente na ficha)':target?'Poder que acertou o alvo':'Nome exato do poder rolado';
    form.querySelector('[data-passive-hint]').hidden=!passive;
    form.querySelector('[data-fantastic-field]').hidden=!power||rollModifier;
    if(rollModifier)form.elements.namedItem('fantasticOnly').checked=false;
    form.querySelector('[data-condition-effect]').hidden=type!=='condition';
    form.querySelector('[data-condition-timing]').hidden=type!=='condition';
    form.querySelector('[data-condition-count]').hidden=type!=='condition'||form.elements.namedItem('conditionDurationMode')?.value==='manual';
    form.querySelector('[data-healing-effect]').hidden=type!=='healing';
    form.querySelector('[data-chat-effect]').hidden=type!=='chat';
    form.querySelector('[data-attack-scope]').hidden=!rollModifier;
    form.querySelector('[data-vfx-hint]').hidden=type!=='vfx';
    form.querySelector('[data-damage-effect]').hidden=type!=='damageBonus';
    form.querySelector('[data-ongoing-effect]').hidden=type!=='ongoingDamage';
    form.querySelector('[data-damage-fixed]').hidden=type!=='damageBonus'||form.elements.namedItem('damageBonusMode')?.value!=='fixed';
    form.querySelector('[data-damage-ability]').hidden=type!=='damageBonus'||form.elements.namedItem('damageBonusMode')?.value!=='ability';
    form.querySelector('[data-damage-multiplier]').hidden=type!=='damageBonus'||form.elements.namedItem('damageBonusMode')?.value!=='multiplier';
    form.querySelector('[data-effect-hint]').textContent=rollModifier
      ?passive?'A vantagem/desvantagem vale para ataques do personagem enquanto ele possuir o poder. Não modifica testes comuns.'
        :'Edge/Trouble entra ANTES dos dados serem rolados e só no ataque do poder selecionado. O poder precisa ser um ataque. Uma vantagem nativa idêntica não será duplicada.'
      :target?type==='damageBonus'?'Dano modificado no card MMDR do alvo atingido, respeitando RD e barreiras. Os demais efeitos continuam após a confirmação do Mestre.':type==='ongoingDamage'?'Após confirmar o acerto/dano, cria dano periódico no alvo; o primeiro tick acontece no próximo início de turno desse alvo.':'O efeito será aplicado individualmente a cada alvo realmente atingido. Não altera automaticamente a rolagem.'
      :'Os efeitos são aplicados ao personagem que rolou o poder ou que está iniciando/terminando o turno.';
    form.querySelector('[data-passive-example]').hidden=!passive;
    form.querySelector('[data-power-example]').hidden=!power;
    form.querySelector('[data-caster-warning]').hidden=!(power&&!rollModifier);
    for(const section of form.querySelectorAll?.('[data-multi-effect]')??[]){
      const select=section.querySelector('[data-effect-field="effectType"]');
      for(const option of select.options){
        const roll=option.value==='edge'||option.value==='trouble';
        option.disabled=passive?!roll:!power&&roll;
        if(option.value==='vfx')option.disabled=!(power||target);
        if(option.value==='damageBonus')option.disabled=!target;
        option.hidden=option.disabled;
      }
      if(select.selectedOptions[0]?.disabled)select.value=passive?'edge':'condition';
      const current=select.value;
      for(const node of section.querySelectorAll('[data-extra-kind]')){
        node.hidden=node.dataset.extraKind!==current && !(node.hasAttribute('data-extra-kind-roll')&&current==='trouble');
      }
      section.querySelector('[data-extra-count]').hidden=current!=='condition'||
        section.querySelector('[data-effect-field="conditionDurationMode"]').value==='manual';
      section.querySelector('[data-extra-ongoing]').hidden=current!=='ongoingDamage';
      section.querySelector('[data-extra-damage-fixed]').hidden=current!=='damageBonus'||section.querySelector('[data-effect-field="damageBonusMode"]').value!=='fixed';
      section.querySelector('[data-extra-damage-ability]').hidden=current!=='damageBonus'||section.querySelector('[data-effect-field="damageBonusMode"]').value!=='ability';
      section.querySelector('[data-extra-damage-multiplier]').hidden=current!=='damageBonus'||section.querySelector('[data-effect-field="damageBonusMode"]').value!=='multiplier';
    }
    const entries=form.querySelectorAll?.('[data-effect-entry]')??[];
    const header=form.querySelector('[data-primary-effect-controls]');
    if(header)header.hidden=entries.length<2;
    if((entries.length>1||rollModifier)&&form.elements.namedItem('fantasticOnly').checked&&
        Array.from(entries).some(node=>node.dataset.effectEntry==='primary'?
          ['edge','trouble'].includes(type):['edge','trouble'].includes(node.querySelector('[data-effect-field="effectType"]').value)))
      form.elements.namedItem('fantasticOnly').checked=false;
    const count=form.querySelector('[data-effect-count]');if(count)count.textContent=`${entries.length} / ${MAX_CUSTOM_EFFECTS} efeitos`;
    const add=form.querySelector('[data-add-effect]');if(add)add.disabled=entries.length>=MAX_CUSTOM_EFFECTS;
    for(const button of form.querySelectorAll?.('[data-direction="down"]')??[])
      button.disabled=Number(button.dataset.moveEffect)>=entries.length;
  }
  /** The rule stays unsaved until the Narrator reviews and clicks Save.
   * Preserve the selected power, status and optional prerequisite. Unlike
   * the M-only trigger, targetHit requires an ACTUAL successful attack.
   */
  _convertPowerRuleToTarget(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    if(form.elements.namedItem('trigger')?.value!=='powerRoll')return;
    const kind=form.elements.namedItem('effectType')?.value;
    if(kind==='edge'||kind==='trouble')return;
    const requiresM=form.elements.namedItem('fantasticOnly')?.checked===true;
    form.elements.namedItem('trigger').value='targetHit';
    form.elements.namedItem('hitOutcome').value=requiresM?'fantastic':'success';
    form.elements.namedItem('statusSubject').value='caster';
    form.elements.namedItem('fantasticOnly').checked=false;
    this._syncRuleFields();
    const status=this.element?.querySelector?.('[data-save-status]');
    if(status)status.textContent='Regra ajustada para o alvo. Confira o resultado exigido e clique em Salvar automação.';
  }
  _loadPassiveExample(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    this._ruleEditingId=null;
    form.reset();
    for(const [key,value] of Object.entries({name:'Blazing Fast Fists — Edge corpo a corpo',
      trigger:'passiveAttack',powerName:'Blazing Fast Fists',effectType:'edge',attackScope:'melee'}))
      form.elements.namedItem(key).value=value;
    this.element.querySelector('[data-editor-title]').textContent='Nova automação — exemplo';
    this._syncRuleFields();this._refreshRules();this._updateEditorSaveHint();
  }
  _loadPowerExample(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    this._ruleEditingId=null;
    form.reset();
    for(const [key,value] of Object.entries({name:'Elemental Blast — Edge à distância',
      trigger:'powerRoll',powerName:'Elemental Blast',effectType:'edge',attackScope:'ranged'}))
      form.elements.namedItem(key).value=value;
    this.element.querySelector('[data-editor-title]').textContent='Nova automação — exemplo';
    this._syncRuleFields();this._refreshRules();this._updateEditorSaveHint();
  }
  /** A single validated rule owns an ordered effect array; extra editors have
   * their own scoped fields, leaving legacy first-effect field names intact. */
  _additionalEffectMarkup(effect={},index=1){
    const types=Object.entries(CUSTOM_EFFECTS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('');
    const statuses=Object.entries(CUSTOM_STATUSES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('');
    const durations=Object.entries(CUSTOM_CONDITION_DURATIONS).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('');
    const scopes=Object.entries(CUSTOM_ATTACK_SCOPES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('');
    return `<section class="d616-auto__form-step d616-auto__extra-effect" data-effect-entry="extra" data-multi-effect>
      <div class="d616-auto__effect-controls"><strong>Efeito ${index+1}</strong>
        <button type="button" data-move-effect="${index}" data-direction="up">Subir ↑</button>
        <button type="button" data-move-effect="${index+1}" data-direction="down">Descer ↓</button>
        <button type="button" data-remove-effect="${index}" class="is-danger">Remover</button></div>
      <label>Efeito<select data-effect-field="effectType">${types}</select></label>
      <label data-extra-kind="condition">Condição a aplicar<select data-effect-field="effectStatus">${statuses}</select></label>
      <div data-extra-kind="condition" class="d616-auto__condition-timing">
        <label>Duração<select data-effect-field="conditionDurationMode">${durations}</select></label>
        <label data-extra-count>Quantidade de turnos/rodadas<input data-effect-field="conditionDurationCount" type="number" min="1" max="20" step="1" value="1"></label>
        <label>Como remover? (opcional)<textarea data-effect-field="conditionRemoval" rows="2" maxlength="200"></textarea></label>
      </div>
      <label data-extra-kind="healing">Health recuperado<input data-effect-field="healAmount" type="number" min="1" max="100" value="5"></label>
      <label data-extra-kind="chat">Mensagem<textarea data-effect-field="message" maxlength="250" rows="2"></textarea></label>
      <label data-extra-kind="edge" data-extra-kind-roll>Afeta quais ataques?<select data-effect-field="attackScope">${scopes}</select></label>
      <p data-extra-kind="vfx" class="d616-auto__hint">Reproduz a animação já configurada para o poder. Requer Sequencer.</p>
      <div data-extra-kind="ongoingDamage" class="d616-auto__condition-timing" data-extra-ongoing>
        <label>Dano por turno<input data-effect-field="ongoingAmount" type="number" min="1" max="100" value="5"></label>
        <label>Recurso<select data-effect-field="ongoingResource">${Object.entries(CUSTOM_ONGOING_RESOURCES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
        <label>Quantidade de turnos<input data-effect-field="ongoingTurns" type="number" min="1" max="20" value="3"></label>
        <p class="d616-auto__hint">Dano a cada início de turno, pelo motor MMDR. Requer combate e personagem na iniciativa.</p>
      </div>
      <div data-extra-kind="damageBonus" class="d616-auto__condition-timing">
        <label>Tipo de modificação<select data-effect-field="damageBonusMode">${Object.entries(CUSTOM_DAMAGE_MODES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
        <label data-extra-damage-fixed>Valor adicional<input data-effect-field="damageBonusAmount" type="number" min="1" max="100" value="5"></label>
        <label data-extra-damage-ability hidden>Atributo do atacante<select data-effect-field="damageAbility">${Object.entries(CUSTOM_DAMAGE_ABILITIES).map(([key,label])=>`<option value="${key}">${escapeHTML(label)}</option>`).join('')}</select></label>
        <label data-extra-damage-multiplier hidden>Multiplicador final<select data-effect-field="damageMultiplierFactor"><option value="2">×2</option><option value="3">×3</option></select></label>
        <p class="d616-auto__hint">Bônus fixos/por atributo entram na base; ×2/×3 multiplica o dano resultante após RD e fatores nativos. Prevalece o maior multiplicador, sem acumular regras. O MMDR confirma a aplicação; condição/cura/chat ocorrem depois.</p>
      </div>
    </section>`;
  }
  _extraFieldValues(section){
    const result={};
    for(const field of ['effectType','effectStatus','conditionDurationMode','conditionDurationCount',
      'conditionRemoval','healAmount','message','attackScope','damageBonusMode','damageBonusAmount','damageAbility','damageMultiplierFactor','ongoingAmount','ongoingTurns','ongoingResource'])
      result[field]=section.querySelector(`[data-effect-field="${field}"]`)?.value??'';
    return result;
  }
  _allEditorEffects(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return [];
    const field=name=>form.elements.namedItem(name);
    return [{effectType:field('effectType').value,effectStatus:field('effectStatus').value,
      conditionDurationMode:field('conditionDurationMode').value,
      conditionDurationCount:field('conditionDurationCount').value,conditionRemoval:field('conditionRemoval').value,
      healAmount:field('healAmount').value,message:field('message').value,
      attackScope:field('attackScope').value,damageBonusMode:field('damageBonusMode').value,
      damageBonusAmount:field('damageBonusAmount').value,damageAbility:field('damageAbility').value,
      damageMultiplierFactor:field('damageMultiplierFactor')?.value??'2',
      ongoingAmount:field('ongoingAmount')?.value??'5',ongoingTurns:field('ongoingTurns')?.value??'3',ongoingResource:field('ongoingResource')?.value??'health'},
      ...Array.from(form.querySelectorAll?.('[data-multi-effect]')??[],node=>this._extraFieldValues(node))];
  }
  _setFirstEffect(effect){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    for(const name of ['effectType','effectStatus','conditionDurationMode','conditionDurationCount',
      'conditionRemoval','healAmount','message','attackScope','damageBonusMode','damageBonusAmount','damageAbility','damageMultiplierFactor','ongoingAmount','ongoingTurns','ongoingResource']){
      const node=form.elements.namedItem(name);
      if(node)node.value=String(name==='conditionDurationCount'&&!Number(effect[name])?'1':
        name==='ongoingAmount'&&!Number(effect[name])?'5':name==='ongoingTurns'&&!Number(effect[name])?'3':
        name==='ongoingResource'&&!effect[name]?'health':effect[name]??'');
    }
  }
  _renderEffectEditors(effects){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return;
    const wrapper=form.querySelector?.('[data-effects-list]');if(!wrapper)return;
    this._setFirstEffect(effects[0]??{effectType:'condition'});
    wrapper.replaceChildren();
    for(let i=1;i<effects.length;i++){
      const node=document.createElement('div');node.innerHTML=this._additionalEffectMarkup(effects[i],i);
      const section=node.firstElementChild;
      wrapper.append(section);
      for(const [name,value] of Object.entries(effects[i])){
        const field=section.querySelector(`[data-effect-field="${name}"]`);
        if(field)field.value=String(name==='conditionDurationCount'&&!Number(value)?'1':
          name==='ongoingAmount'&&!Number(value)?'5':name==='ongoingTurns'&&!Number(value)?'3':
          name==='ongoingResource'&&!value?'health':value??'');
      }
    }
    this._syncRuleFields();
  }
  _changeEffects(action,index){
    const effects=this._allEditorEffects();if(!effects.length)return;
    if(action==='add'){
      if(effects.length>=MAX_CUSTOM_EFFECTS)return;
      effects.push({effectType:'chat',message:'',conditionDurationMode:'manual',
        conditionDurationCount:'1',healAmount:'5',attackScope:'all',damageBonusMode:'fixed',damageBonusAmount:'5',damageAbility:'mle',damageMultiplierFactor:'2',ongoingAmount:'5',ongoingTurns:'3',ongoingResource:'health'});
    }else if(action==='remove'){
      if(index<1||index>=effects.length)return;
      effects.splice(index,1);
    }else if(action==='move'){
      const from=index===1?0:index-1,to=from+1;
      if(from<0||to>=effects.length)return;
      [effects[from],effects[to]]=[effects[to],effects[from]];
    }
    const form=this.element?.querySelector?.('[data-rule-form]');const top=form?.scrollTop;
    this._renderEffectEditors(effects);
    if(form)form.scrollTop=top;
    this._updateEditorSaveHint();
  }
  /** Stable snapshot of the editor as the GM sees it (including unsaved invalid inputs).
   * A dirty check must not normalize away an invalid numeric value or empty name.
   */
  _ruleEditorSnapshot(){
    const form=this.element?.querySelector?.('[data-rule-form]');if(!form)return null;
    const fields=['name','trigger','powerName','fantasticOnly','hitOutcome','statusSubject',
      'requiresStatus','effectType','effectStatus','conditionDurationMode',
      'conditionDurationCount','conditionRemoval','healAmount','message','attackScope','damageBonusMode','damageBonusAmount','damageAbility','damageMultiplierFactor','enabled',
      'ongoingAmount','ongoingTurns','ongoingResource'];
    return JSON.stringify([...fields.map(field=>{
      const input=form.elements.namedItem(field);
      return input?.type==='checkbox'?Boolean(input.checked):String(input?.value??'');
    }),this._allEditorEffects().slice(1)]);
  }
  _hasUnsavedRuleChanges(){
    return Boolean(this._ruleEditingId&&this._editingSnapshot!==null&&
      this._ruleEditorSnapshot()!==this._editingSnapshot);
  }
  _updateEditorSaveHint(){
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    const hint=root.querySelector('[data-editor-save-hint]');
    if(!hint)return;
    hint.textContent=this._hasUnsavedRuleChanges()
      ?'Alterações pendentes: serão salvas automaticamente ao fechar a Central ou escolher outra regra. O botão Salvar automação também funciona.'
      :this._ruleEditingId
        ?'Regra salva. Edite os campos; as alterações serão salvas ao fechar ou escolher outra regra.'
        :'Nova regra: clique em Salvar automação para criar. Fechar a janela não cria regras novas.';
  }
  _trackRuleSave(){
    const promise=this._saveRule();this._pendingRuleSave=promise;
    void promise.catch(error=>{
      console.error('[D616] Falha inesperada no salvamento da regra:',error);
      globalThis.ui?.notifications?.error?.('Erro ao salvar a regra. As alterações continuam abertas.');
      return false;
    }).finally(()=>{if(this._pendingRuleSave===promise)this._pendingRuleSave=null;});
  }
  async _saveEditedRuleIfNeeded(){
    if(this._pendingRuleSave){
      const result=await this._pendingRuleSave;
      if(!result)return false;
    }
    if(!this._hasUnsavedRuleChanges())return true;
    const saved=await this._saveRule();
    if(!saved){
      globalThis.ui?.notifications?.warn?.('Não foi possível salvar as alterações. Corrija o formulário ou tente novamente antes de fechar.');
      return false;
    }
    return true;
  }
  async _switchRule(id){
    if(!await this._saveEditedRuleIfNeeded())return;
    this._editRule(id);
  }
  /** Window X calls ApplicationV2.close(): persist changes BEFORE the DOM is removed. */
  async close(options={}){
    if(!await this._saveEditedRuleIfNeeded())return this;
    return await super.close?.(options);
  }
  _editRule(id){
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    const form=root.querySelector('[data-rule-form]');
    const rule=id?getCustomRules().find(r=>r.id===id):null;
    if(id&&!rule)return;
    this._ruleEditingId=rule?.id??null;
    form.reset();
    for(const field of ['name','trigger','powerName','requiresStatus','effectType','effectStatus','conditionDurationMode','conditionDurationCount','conditionRemoval','healAmount','message','attackScope','damageBonusMode','damageBonusAmount','damageAbility','damageMultiplierFactor','ongoingAmount','ongoingTurns','ongoingResource','hitOutcome','statusSubject']){
      if(rule && form.elements.namedItem(field))form.elements.namedItem(field).value=
        field==='conditionDurationCount'&&(!rule.conditionDurationCount)?'1':
        field==='ongoingAmount'&&!Number(rule[field])?'5':field==='ongoingTurns'&&!Number(rule[field])?'3':
        field==='ongoingResource'&&!rule[field]?'health':String(rule[field]??'');
    }
    form.elements.namedItem('fantasticOnly').checked=rule?.fantasticOnly??false;
    form.elements.namedItem('enabled').checked=rule?.enabled??true;
    this._renderEffectEditors(rule?ruleEffects(rule):[{effectType:'condition',
      effectStatus:form.elements.namedItem('effectStatus').value,conditionDurationMode:'manual',
      conditionDurationCount:'1',healAmount:'5',attackScope:'all',damageBonusMode:'fixed',damageBonusAmount:'5',damageAbility:'mle',damageMultiplierFactor:'2',ongoingAmount:'5',ongoingTurns:'3',ongoingResource:'health'}]);
    root.querySelector('[data-editor-title]').textContent=rule?'Editar: '+rule.name:'Nova automação';
    this._syncRuleFields();this._refreshRules();
    this._editingSnapshot=this._ruleEditorSnapshot();this._updateEditorSaveHint();
    if(!rule)form.elements.namedItem('name').focus();
  }
  _refreshRules(){
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    const rules=getCustomRules();
    root.querySelector('[data-count-custom]').textContent=String(rules.length);
    root.querySelector('[data-custom-enabled]').checked=game.settings.get(SYSTEM,CUSTOM_RULES_ENABLED_KEY)!==false;
    root.querySelector('[data-custom-enabled]').disabled=this._busy||!game.user?.isGM;
    const list=root.querySelector('[data-rule-list]'),previousScroll=list.scrollTop;
    list.replaceChildren();
    const paused=!customRulesEnabled();
    for(const rule of rules){
      const item=document.createElement('article');item.className='d616-auto__my-rule';
      if(this._ruleEditingId===rule.id)item.classList.add('is-editing');
      item.innerHTML=`<div class="d616-auto__my-rule-head"><strong>${escapeHTML(rule.name)}</strong><label class="d616-auto__toggle" title="Ativar/desativar regra"><input type="checkbox" data-rule-enabled="${escapeHTML(rule.id)}" ${rule.enabled?'checked':''} ${this._busy||!game.user?.isGM?'disabled':''} aria-label="Habilitar ${escapeHTML(rule.name)}"/><span></span></label></div>
      <p>${escapeHTML(CUSTOM_TRIGGERS[rule.trigger])}${rule.powerName?' · '+escapeHTML(rule.powerName):''}${rule.fantasticOnly?' · Dado M':''}${rule.trigger==='targetHit'?' · '+escapeHTML(CUSTOM_TARGET_OUTCOMES[rule.hitOutcome])+' · No alvo':' '}</p>
      <p>${ruleEffects(rule).map((effect,index)=>`${index+1}. ${escapeHTML(CUSTOM_EFFECTS[effect.effectType])}${effect.effectType==='condition'?' · '+escapeHTML(CUSTOM_STATUSES[effect.effectStatus])+ ' (' +escapeHTML(effect.conditionDurationMode==='manual'?'Até remover':`${effect.conditionDurationCount} ${effect.conditionDurationMode==='turns'?'turno(s)':'rodada(s)'}`)+')':effect.effectType==='healing'?' · '+effect.healAmount+' Health':effect.effectType==='ongoingDamage'?' · '+effect.ongoingAmount+' '+(CUSTOM_ONGOING_RESOURCES[effect.ongoingResource]??'Health')+' / turno por '+effect.ongoingTurns+' turno(s)':effect.effectType==='damageBonus'?(effect.damageBonusMode==='multiplier'?' · ×'+effect.damageMultiplierFactor+' dano':' · +'+(effect.damageBonusMode==='ability'?escapeHTML(CUSTOM_DAMAGE_ABILITIES[effect.damageAbility]??'atributo'):effect.damageBonusAmount)+' dano'):''}`).join(' → ')}</p>
      <div class="d616-auto__my-rule-foot"><small>${!rule.enabled?'Desativada':paused?'Pausada':'Ativa'}</small><button type="button" data-edit-rule="${escapeHTML(rule.id)}"><i class="fa-solid fa-pen"></i> Editar</button><button type="button" data-store-library="${escapeHTML(rule.id)}"><i class="fa-solid fa-bookmark"></i> Guardar modelo</button><button type="button" data-delete-rule="${escapeHTML(rule.id)}" class="is-danger"><i class="fa-solid fa-trash"></i> Excluir</button></div>`;
      list.append(item);
    }
    if(!rules.length){const empty=document.createElement('div');empty.className='d616-auto__my-empty';
      empty.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i><strong>Nenhuma automação criada</strong><p>Preencha o formulário ao lado para criar sua primeira regra. Ela será executada de verdade quando o gatilho acontecer.</p>';
      list.append(empty);
    }
    list.scrollTop=previousScroll;
  }
  async _saveRule(){
    const root=this.element?.querySelector?.('.d616-auto');
    if(!root||this._busy||!game.user?.isGM)return false;
    const form=root.querySelector('[data-rule-form]');
    const field=name=>form.elements.namedItem(name);
    let rule;
    try{
      rule=normalizeCustomRule({
        id:this._ruleEditingId??'',name:field('name').value,trigger:field('trigger').value,
        powerName:field('powerName').value,fantasticOnly:field('fantasticOnly').checked,
        hitOutcome:field('hitOutcome').value,statusSubject:field('statusSubject').value,
        requiresStatus:field('requiresStatus').value,effectType:field('effectType').value,
        effectStatus:field('effectStatus').value,conditionDurationMode:field('conditionDurationMode').value,
        conditionDurationCount:field('conditionDurationCount').value,conditionRemoval:field('conditionRemoval').value,
        healAmount:field('healAmount').value,
        message:field('message').value,attackScope:field('attackScope').value,
        damageBonusMode:field('damageBonusMode').value,damageBonusAmount:field('damageBonusAmount').value,damageAbility:field('damageAbility').value,
        damageMultiplierFactor:field('damageMultiplierFactor')?.value??'2',
        ongoingAmount:field('ongoingAmount')?.value??'5',ongoingTurns:field('ongoingTurns')?.value??'3',
        ongoingResource:field('ongoingResource')?.value??'health',
        effects:this._allEditorEffects(),enabled:field('enabled').checked,
      });
    }catch(error){ui?.notifications?.warn?.(error.message);root.querySelector('[data-save-status]').textContent='Regra inválida — corrija o formulário';return false;}
    const rules=getCustomRules();
    const index=rules.findIndex(r=>r.id===this._ruleEditingId);
    if(index<0){
      if(rules.length>=100){ui?.notifications?.warn?.('Máximo de 100 automações por mundo.');return false;}
      rule.id=globalThis.foundry?.utils?.randomID?.()??`rule-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
      rules.push(rule);
    }else rules[index]=rule;
    const saved=await this._saveCustomData(CUSTOM_RULES_KEY,rules);
    if(saved){this._editRule(rule.id);ui?.notifications?.info?.('Automação salva e pronta para executar.');}
    return saved;
  }
  async _setRuleEnabled(id,enabled){
    if(this._busy||!game.user?.isGM)return;
    const rules=getCustomRules(),rule=rules.find(r=>r.id===id);
    if(!rule)return;
    rule.enabled=enabled;
    if(this._ruleEditingId===id){
      const input=this.element?.querySelector?.('[data-rule-form]')?.elements.namedItem('enabled');
      if(input){input.checked=enabled;
        if(this._editingSnapshot!==null){const baseline=JSON.parse(this._editingSnapshot);baseline[18]=enabled;this._editingSnapshot=JSON.stringify(baseline);}
        this._updateEditorSaveHint();}
    }
    await this._saveCustomData(CUSTOM_RULES_KEY,rules);
  }
  async _deleteRule(id){
    if(this._busy||!game.user?.isGM)return;
    const rules=getCustomRules(),rule=rules.find(r=>r.id===id);
    if(!rule)return;
    const DialogClass=globalThis.foundry?.applications?.api?.DialogV2;
    if(!DialogClass?.confirm){ui?.notifications?.warn?.('Confirmação de exclusão indisponível.');return;}
    const accepted=await DialogClass.confirm({window:{title:'Excluir automação'},
      content:`<p>Excluir permanentemente a automação <strong>${escapeHTML(rule.name)}</strong>?</p>`});
    if(!accepted)return;
    if(await this._saveCustomData(CUSTOM_RULES_KEY,rules.filter(r=>r.id!==id)) && this._ruleEditingId===id)
      this._editRule(null);
  }
  _refreshLibrary(){
    const root=this.element?.querySelector?.('.d616-auto');if(!root)return;
    const rules=getAutomationLibrary(),list=root.querySelector('[data-library-list]');
    const previousScroll=list.scrollTop;
    root.querySelector('[data-count-library]').textContent=String(rules.length);
    list.replaceChildren();
    for(const rule of rules){
      const el=document.createElement('article');el.className='d616-auto__library-card';
      el.innerHTML=`<div class="d616-auto__my-rule-head"><strong>${escapeHTML(rule.name)}</strong><span>Modelo · Inativo</span></div>
        <p>${escapeHTML(CUSTOM_TRIGGERS[rule.trigger])}${rule.powerName?' · '+escapeHTML(rule.powerName):''} · ${ruleEffects(rule).length} efeito(s)</p>
        <div class="d616-auto__library-card-actions">
          <button type="button" data-install-library="${escapeHTML(rule.id)}"><i class="fa-solid fa-plus"></i> Adicionar às minhas regras</button>
          <button type="button" data-delete-library="${escapeHTML(rule.id)}" class="is-danger"><i class="fa-solid fa-trash"></i> Remover modelo</button>
        </div>`;
      list.append(el);
    }
    if(!rules.length){const empty=document.createElement('div');empty.className='d616-auto__my-empty';
      empty.innerHTML='<i class="fa-solid fa-book-open"></i><strong>Biblioteca vazia</strong><p>Em Minhas Automações, clique em “Guardar modelo” ou importe um arquivo JSON. Nenhum modelo importado é ativado automaticamente.</p>';
      list.append(empty);
    }
    list.scrollTop=previousScroll;
  }
  async _storeRuleInLibrary(id){
    if(this._busy||!game.user?.isGM||!await this._saveEditedRuleIfNeeded())return;
    const source=getCustomRules().find(rule=>rule.id===id);if(!source)return;
    try{
      const result=mergeAutomationLibrary(getAutomationLibrary(),[source]);
      if(!result.added){ui?.notifications?.info?.('Esta versão já existe na biblioteca.');return;}
      if(await this._saveCustomData(CUSTOM_LIBRARY_KEY,result.entries)){
        this._refreshLibrary();ui?.notifications?.info?.('Modelo guardado na biblioteca (inativo).');
      }
    }catch(error){ui?.notifications?.warn?.(error.message);}
  }
  _downloadLibraryJSON(json,filename){
    if(typeof globalThis.saveDataToFile==='function'){
      globalThis.saveDataToFile(json,'application/json',filename);return;
    }
    const blob=new Blob([json],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async _exportActiveRules(){
    if(!game.user?.isGM||!await this._saveEditedRuleIfNeeded())return;
    const rules=getCustomRules();if(!rules.length){ui?.notifications?.warn?.('Não há regras para exportar.');return;}
    try{this._downloadLibraryJSON(exportAutomationBundle(rules),'d616-minhas-automacoes.json');}
    catch(error){ui?.notifications?.error?.(error.message);}
  }
  _exportLibrary(){
    if(!game.user?.isGM)return;
    const rules=getAutomationLibrary();
    if(!rules.length){ui?.notifications?.warn?.('Sua biblioteca está vazia.');return;}
    try{this._downloadLibraryJSON(exportAutomationBundle(rules),'d616-biblioteca-automacoes.json');}
    catch(error){ui?.notifications?.error?.(error.message);}
  }
  async _importLibraryFile(file){
    if(!file||this._busy||!game.user?.isGM)return;
    try{
      if(file.size>MAX_BUNDLE_BYTES)throw new Error('O JSON excede o limite de 1 MB.');
      const imported=parseAutomationBundle(await file.text());
      if(!imported.length){ui?.notifications?.warn?.('O arquivo não contém automações.');return;}
      const result=mergeAutomationLibrary(getAutomationLibrary(),imported);
      if(!result.added){ui?.notifications?.info?.('Todas as automações já estão na biblioteca.');return;}
      const DialogClass=globalThis.foundry?.applications?.api?.DialogV2;
      if(!DialogClass?.confirm){ui?.notifications?.warn?.('Não foi possível abrir a confirmação de importação.');return;}
      const confirmed=await DialogClass.confirm({window:{title:'Importar modelos na Biblioteca'},
        content:`<p>Adicionar <strong>${result.added}</strong> modelo(s) à biblioteca? ${result.skipped} duplicado(s) serão ignorados.</p><p>Os modelos não serão executados automaticamente. Você decidirá quais instalar e habilitar.</p>`});
      if(!confirmed)return;
      // Re-check current library on confirmation to avoid overwriting newer changes.
      const latest=mergeAutomationLibrary(getAutomationLibrary(),imported);
      if(await this._saveCustomData(CUSTOM_LIBRARY_KEY,latest.entries)){
        this._refreshLibrary();ui?.notifications?.info?.(`${latest.added} modelo(s) importado(s); ${latest.skipped} duplicado(s) ignorado(s).`);
      }
    }catch(error){ui?.notifications?.error?.(`Falha ao importar: ${error.message}`);}
  }
  async _installLibraryModel(id){
    if(this._busy||!game.user?.isGM||!await this._saveEditedRuleIfNeeded())return;
    const model=getAutomationLibrary().find(rule=>rule.id===id);if(!model)return;
    try{
      const rules=installAutomationFromLibrary(model,getCustomRules());
      if(await this._saveCustomData(CUSTOM_RULES_KEY,rules)){
        this._tab='custom';const root=this.element?.querySelector?.('.d616-auto');
        root.querySelector('[data-custom-view]').hidden=false;
        root.querySelector('[data-library-view]').hidden=true;
        this._updateTabs(root);this._editRule(rules.at(-1).id);
        ui?.notifications?.info?.('Regra instalada desativada. Confira e habilite quando desejar.');
      }
    }catch(error){ui?.notifications?.warn?.(error.message);}
  }
  async _deleteLibraryModel(id){
    if(this._busy||!game.user?.isGM)return;
    const rules=getAutomationLibrary(),model=rules.find(rule=>rule.id===id);
    if(!model)return;
    const DialogClass=globalThis.foundry?.applications?.api?.DialogV2;
    if(!DialogClass?.confirm){ui?.notifications?.warn?.('Confirmação de exclusão indisponível.');return;}
    const confirmed=await DialogClass.confirm({window:{title:'Remover modelo da biblioteca'},
      content:`<p>Remover o modelo <strong>${escapeHTML(model.name)}</strong> da biblioteca?</p><p>Isso não exclui automações ativas já instaladas.</p>`});
    if(confirmed&&await this._saveCustomData(CUSTOM_LIBRARY_KEY,rules.filter(rule=>rule.id!==id)))
      this._refreshLibrary();
  }
  async _saveCustomData(key,value){
    const root=this.element?.querySelector?.('.d616-auto');if(!root||this._busy||!game.user?.isGM)return false;
    this._busy=true;root.querySelector('[data-save-status]').textContent='Salvando...';
    let ok=false;
    try{
      await game.settings.set(SYSTEM,key,value);ok=true;
      root.querySelector('[data-save-status]').textContent='Alterações salvas';
    }catch(error){
      console.error('[D616] Erro ao salvar automação personalizada',error);
      ui?.notifications?.error?.('Não foi possível salvar a automação.');
      root.querySelector('[data-save-status]').textContent='Erro ao salvar';
    }finally{this._busy=false;this._refreshRules();if(key===CUSTOM_LIBRARY_KEY)this._refreshLibrary();}
    return ok;
  }

}

export function registerAutomationCenterMenu(){
  game.settings.registerMenu(SYSTEM,'automationCenter',{
    name:'Central de Automações',label:'Abrir Central de Automações',
    hint:'Crie automações, guarde modelos em biblioteca e exporte/importe JSON entre mundos ou gerencie as rotinas nativas.',
    icon:'fa-solid fa-gears',type:D616AutomationCenter,restricted:true,
  });
}
