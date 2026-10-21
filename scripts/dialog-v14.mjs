/**
 * Multiverse-D616 v0.2.29 — small, native Foundry V14 DialogV2 adapters.
 * Only the user interface is replaced. Callers still own resource spending,
 * permission checks, and cancellation semantics.
 */
const CANCEL_MARKER = Symbol('D616-dialog-cancel');
const dialogApi = () => {
  const api = globalThis.foundry?.applications?.api?.DialogV2;
  if (typeof api?.wait !== 'function') throw new Error('Multiverse-D616 requer DialogV2 do Foundry VTT v14.');
  return api;
};

/**
 * Choose one action. Explicit callbacks return values so no caller relies on
 * the DialogV2 default return shape. Closing with X yields closeValue.
 */
export async function chooseD616Dialog({title,content,buttons,defaultAction=null,width=430,className='m616-dialog-v14',closeValue=null}) {
  if (!Array.isArray(buttons) || !buttons.length) throw new Error('Diálogo sem opções.');
  const valid=new Set();
  const configured=buttons.map(button=>{
    if (!button.action || valid.has(button.action)) throw new Error('Ações de diálogo inválidas ou duplicadas.');
    valid.add(button.action);
    return {
      action:button.action,label:button.label,
      default:button.action===defaultAction,
      callback:(_event,actionButton,dialog)=>{
        const result=typeof button.callback==='function'
          ? button.callback(actionButton,dialog) : button.value;
        // DialogV2 substitutes `action` when a callback returns null/undefined.
        return result == null ? CANCEL_MARKER : result;
      },
    };
  });
  const result=await dialogApi().wait({
    window:{title},position:{width},classes:[className,'m616-dialog-v14'],
    content,rejectClose:false,buttons:configured,
  });
  return result === CANCEL_MARKER || result == null ? closeValue : result;
}

/**
 * Select the EXTRA amount of Focus beyond a power's minimum. The form is
 * provided by DialogV2 in the button callback; validate all client input.
 */
export async function promptD616FocusExtra({title,min,maxTotal,available,maxSpend,currentExtra=0,scalingHelp=''}) {
  const lower=Math.max(0,Number(min)||0);
  const total=Math.max(lower,Number(maxTotal)||0);
  const cap=Math.max(0,total-lower);
  const initial=Math.max(0,Math.min(cap,Math.trunc(Number(currentExtra)||0)));
  const content=`<div class="m616-focus-spend-form">
    <p><strong>Custo mínimo:</strong> ${lower} Focus</p>
    <p><strong>Limite por uso:</strong> ${Math.max(0,Number(maxSpend)||0)} (5×Rank)</p>
    <p><strong>Disponível:</strong> ${Math.max(0,Number(available)||0)} Focus</p>
    <div class="form-group"><label for="m616-focus-extra">Quanto a mais você quer gastar além do mínimo? (0–${cap})</label>
    <input id="m616-focus-extra" type="number" name="extra" value="${initial}" min="0" max="${cap}" step="1" required></div>
    <p class="m616-dialog-hint">${String(scalingHelp).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
  </div>`;
  return chooseD616Dialog({title,content,width:440,className:'m616-focus-dialog',defaultAction:'ok',buttons:[
    {action:'ok',label:'Aplicar',callback:(button)=>{
      const field=button?.form?.elements?.namedItem?.('extra')??button?.form?.elements?.extra;
      const raw=String(field?.value??'').trim();
      if(!/^\d+$/.test(raw))return null;
      return lower+Math.min(cap,Math.max(0,Number(raw)));
    }},
    {action:'cancel',label:'Cancelar',value:null},
  ]});
}
