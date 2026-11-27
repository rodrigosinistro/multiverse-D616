/**
 * Multiverse-D616 v0.2.201 — shared official power description for native chat.
 *
 * The support dispatcher exits Item.roll() before the ordinary power-description
 * card is published. Build that missing section from the actual embedded Item
 * used by the GM transaction, not from the untrusted request packet or name.
 * The original Item.roll() also displays description/effect as stored HTML;
 * preserve that same formatting (including any existing paragraph markup).
 * This helper only renders presentation and NEVER spends or modifies resources.
 */
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const filled=value=>value!==undefined&&value!==null&&String(value).trim()!=='';

export function nativePowerDescriptionHtml(item){
  const sys=item?.system??{};
  const description=filled(sys.description)?`<div>${String(sys.description)}</div>`:'';
  const effect=filled(sys.effect)?`<div>${String(sys.effect)}</div>`:'';
  const cost=sys.cost&&typeof sys.cost==='object'
    ?[sys.cost.value,sys.cost.type].filter(filled).join(' ')
    :sys.cost;
  const rows=[
    ['Ação',sys.action??sys.actionType],
    ['Duração',sys.duration],
    ['Custo',cost],
    ['Gatilho',sys.trigger],
    ['Alcance',sys.range],
  ].filter(([,value])=>filled(value)).map(([label,value])=>
    `<div class="mcpd-row"><span class="mcpd-label">${label}:</span> <span class="mcpd-value">${escapeHtml(value)}</span></div>`).join('');
  const metadata=rows?`<div class="mcpd-card">${rows}</div>`:'';
  return `<section class="m616-native-power-description">${description}${effect}${metadata}</section>`;
}

export function nativePowerResultMessage(item,resultHtml){
  return {
    flavor:`power: ${escapeHtml(item?.name??'')}`,
    content:`${nativePowerDescriptionHtml(item)}<section class="m616-native-power-result">${resultHtml}</section>`,
  };
}
