/** v0.2.125 — on-demand, read-only diagnostic UI for Foundry VTT v14. */
import {runSystemDiagnostic} from './system-diagnostics.mjs';

const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS={compendios:'Compêndios',automacoes:'Automações',personagens:'Fichas e efeitos',dependencias:'Dependências'};
const ICONS={compendios:'fa-book',automacoes:'fa-gears',personagens:'fa-user-shield',dependencias:'fa-puzzle-piece'};
const SEVERITIES={error:'Erro',warning:'Revisar',info:'Informação'};

export function diagnosticReportFilename(report){
  const stamp=String(report?.generatedAt??'').replace(/[:.]/g,'-').slice(0,19)||'sem-data';
  const world=String(report?.world??'mundo').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,50)||'mundo';
  return `multiverse-d616-diagnostico-${world}-${stamp}.json`;
}
export function diagnosticReportJSON(report){
  if(report?.format!=='multiverse-d616.diagnostic')throw new Error('Relatório indisponível.');
  return JSON.stringify(report,null,2);
}

const ApplicationBase=globalThis.foundry?.applications?.api?.ApplicationV2??class {};
export class D616DiagnosticCenter extends ApplicationBase{
  static DEFAULT_OPTIONS={
    id:'d616-diagnostic-center',classes:['d616-diagnostic-window'],
    window:{title:'Multiverse-D616 | Central de Diagnóstico',icon:'fa-solid fa-stethoscope',resizable:true},
    position:{width:940,height:700},
  };
  constructor(...args){super(...args);this.report=null;this._busy=false;this._filter='all';}
  async _renderHTML(){
    const root=document.createElement('main');root.className='d616-diag';
    root.innerHTML=`<header class="d616-diag__hero">
      <div class="d616-diag__eyebrow">MULTIVERSE-D616 · FOUNDRY VTT 14 · DIAGNÓSTICO 1.0</div>
      <h2><i class="fa-solid fa-stethoscope" aria-hidden="true"></i> Central de Diagnóstico</h2>
      <p>Verificação sob demanda, somente leitura. Nenhuma ficha, compêndio, automação ou configuração será alterada.</p>
    </header>
    <div class="d616-diag__toolbar">
      <button type="button" data-run class="d616-diag__primary"><i class="fa-solid fa-magnifying-glass-chart"></i> Executar diagnóstico</button>
      <button type="button" data-export disabled><i class="fa-solid fa-file-arrow-down"></i> Exportar relatório JSON</button>
      <span data-scan-status role="status" aria-live="polite">Ainda não executado.</span>
    </div>
    <div class="d616-diag__metrics">
      <div><span>Erros</span><strong data-count="error">—</strong></div>
      <div><span>Para revisar</span><strong data-count="warning">—</strong></div>
      <div><span>Informações</span><strong data-count="info">—</strong></div>
      <div><span>Itens examinados</span><strong data-count="scanned">—</strong></div>
    </div>
    <div class="d616-diag__filters" aria-label="Filtrar resultados">
      <button type="button" data-filter="all" aria-pressed="true">Todos</button>
      <button type="button" data-filter="error" aria-pressed="false">Erros</button>
      <button type="button" data-filter="warning" aria-pressed="false">Revisar</button>
      <button type="button" data-filter="info" aria-pressed="false">Informações</button>
    </div>
    <div class="d616-diag__results" data-results><div class="d616-diag__empty"><i class="fa-solid fa-shield-halved"></i><strong>Seu mundo ainda não foi analisado.</strong><p>Clique em Executar diagnóstico para verificar as configurações atuais.</p></div></div>
    <footer class="d616-diag__footer"><i class="fa-solid fa-lock"></i> Acesso exclusivo ao Mestre · Nenhuma correção automática · O JSON pode conter nomes de fichas e do mundo; compartilhe somente quando desejar.</footer>`;
    return root;
  }
  _replaceHTML(result,container){container.replaceChildren(result);}
  _onRender(context,options){
    super._onRender?.(context,options);
    const root=this.element?.querySelector?.('.d616-diag');if(!root)return;
    root.addEventListener('click',event=>{
      if(event.target.closest('[data-run]')){void this._scan();return;}
      if(event.target.closest('[data-export]')){this._export();return;}
      const filter=event.target.closest('[data-filter]');if(filter){this._filter=filter.dataset.filter;this._show();}
    });
    this._show();
  }
  async _scan(){
    if(this._busy||!globalThis.game?.user?.isGM)return;
    this._busy=true;const root=this.element?.querySelector?.('.d616-diag');
    if(!root)return;
    root.querySelector('[data-run]').disabled=true;
    root.querySelector('[data-scan-status]').textContent='Consultando o mundo e os índices dos compêndios…';
    try{
      this.report=await runSystemDiagnostic();
      root.querySelector('[data-scan-status]').textContent=`Análise concluída em ${new Date(this.report.generatedAt).toLocaleString('pt-BR')}.`;
    }catch(error){
      console.error('[D616 Diagnostic] Falha no diagnóstico',error);
      root.querySelector('[data-scan-status]').textContent=`Não foi possível concluir: ${String(error.message??error)}`;
      globalThis.ui?.notifications?.error?.('Falha no diagnóstico. Consulte o console do Foundry.');
    }finally{this._busy=false;root.querySelector('[data-run]').disabled=false;this._show();}
  }
  _show(){
    const root=this.element?.querySelector?.('.d616-diag');if(!root)return;
    const report=this.report;
    root.querySelector('[data-export]').disabled=!report;
    for(const button of root.querySelectorAll('[data-filter]'))
      button.setAttribute('aria-pressed',String(button.dataset.filter===this._filter));
    if(!report)return;
    const c=report.checks??{},s=report.summary??{};
    for(const [key,val] of Object.entries({error:s.errors??0,warning:s.warnings??0,info:s.info??0,
      scanned:(c.actors?.count??0)+(c.powerComparison?.expected??0)+(c.automations?.rules??0)+(c.automations?.library??0)})){
      root.querySelector(`[data-count="${key}"]`).textContent=val;
    }
    const visible=report.findings.filter(f=>this._filter==='all'||f.severity===this._filter);
    let html='';
    if(!visible.length){html='<div class="d616-diag__empty"><i class="fa-solid fa-circle-check"></i><strong>Nenhum apontamento neste filtro.</strong><p>Verifique as categorias abaixo para saber quais exames foram concluídos.</p></div>';}
    for(const [category,title] of Object.entries(LABELS)){
      const entries=visible.filter(f=>f.section===category);
      const status=category==='compendios'?c.powerComparison?.status:category==='personagens'?c.actors?.status:category==='automacoes'?c.automations?.status:c.dependencies?.status;
      const meta=category==='compendios'?`Catálogo: ${c.catalog?.count??'indisponível'} · Powers: ${c.pack_powers?.count??'indisponível'}`:
        category==='personagens'?`${c.actors?.count??0} fichas · ${c.actors?.effects??0} efeitos`:
        category==='automacoes'?`${c.automations?.rules??0} regras · ${c.automations?.library??0} modelos`:'Módulos opcionais';
      html+=`<section class="d616-diag__section"><h3><i class="fa-solid ${ICONS[category]}"></i> ${title}<small>${escapeHTML(meta)} · ${status==='skipped'?'comparação ignorada':status==='unavailable'?'consulta indisponível':'verificado'}</small></h3>`;
      for(const f of entries){
        html+=`<article class="d616-diag__finding is-${f.severity}"><span class="d616-diag__severity">${SEVERITIES[f.severity]??'Info'}</span><div><strong>${escapeHTML(f.title)}</strong><p>${escapeHTML(f.detail)}</p>${f.ref?`<small>Referência: ${escapeHTML(f.ref)}</small>`:''}</div></article>`;
      }
      if(!entries.length)html+='<p class="d616-diag__ok">Nenhum apontamento nesta categoria para o filtro selecionado.</p>';
      html+='</section>';
    }
    if(report.omittedFindings)html+=`<p class="d616-diag__truncated">${report.omittedFindings} apontamentos adicionais não estão neste relatório. Execute a verificação após tratar as primeiras ocorrências.</p>`;
    root.querySelector('[data-results]').innerHTML=html;
  }
  _export(){
    if(!this.report||!globalThis.game?.user?.isGM)return;
    if(typeof globalThis.saveDataToFile!=='function'){
      globalThis.ui?.notifications?.warn?.('Exportação de arquivos indisponível neste cliente do Foundry.');return;
    }
    globalThis.saveDataToFile(diagnosticReportJSON(this.report),'application/json',diagnosticReportFilename(this.report));
  }
}
export function registerDiagnosticCenterMenu(){
  game.settings.registerMenu('multiverse-d616','diagnosticCenter',{
    name:'Central de Diagnóstico',label:'Abrir Central de Diagnóstico',
    hint:'Verifique compêndios, regras personalizadas, fichas, efeitos e dependências. Somente leitura; relatório exportável em JSON.',
    icon:'fa-solid fa-stethoscope',type:D616DiagnosticCenter,restricted:true,
  });
}
