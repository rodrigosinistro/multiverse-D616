/** D616 v0.2.54 — World-level switches for optional rule automation.
 * Never disable core dice, manual actions, damage buttons or ordinary Foundry status edits.
 * Reads are live; existing effects still expire/clean up when groups are switched off.
 */
export const AUTOMATION_SYSTEM = 'multiverse-d616';
export const AUTOMATION_GROUPS = Object.freeze({
  fantasticDamage: ['Dano especial por poder / Sucesso Fantástico', 'Ajusta apenas as fórmulas de dano de poderes com exceções expressas: metade/integral, triplo e efeitos sem dano. O Mestre ainda confirma o dano.'],
  extraAttacks: ['Ataques adicionais condicionais', 'Permite ataques extras por Sucesso Fantástico, incluindo os ricochetes de Rico-Shield, sem nova Ação ou Focus.'],
  powerConditions: ['Condições automáticas de poderes', 'Aplicação automática de condições por ataques e Sucessos Fantásticos. Rolagens e dano manual continuam disponíveis.'],
  elementalEffects: ['Efeitos elementais fantásticos', 'Aplicações automáticas dos elementos (Force, Earth e demais consequências de Sucesso Fantástico). Efeitos existentes ainda expiram.'],
  ongoingConditions: ['Efeitos contínuos: dano, cura e Envenenado', 'Dano automático de Sangrando, Em Chamas e Corroído; teste de Envenenado; efeitos recorrentes de Flames of the Faltine e recuperação de Healing Factor no fim dos turnos.'],
  conditionRecovery: ['Recuperação automática de condições', 'Remove Sangrando quando Health é recuperada. Testes acionados manualmente no HUD continuam disponíveis.'],
  concentration: ['Concentração e manutenção de Focus', 'Criação/limite automático da Concentração, interrupção por condições e cobrança periódica de Focus. Encerramento manual segue disponível.'],
  turnActions: ['Consumo automático de Ações e Movimento', 'Registra uso de poderes e deslocamento no Controle de Turno; ajustes manuais e testes de fuga seguem disponíveis.'],
});
export const AUTOMATION_MASTER_KEY='disableAllAutomations';
export function automationEnabled(group, settings = globalThis.game?.settings) {
  if (!Object.hasOwn(AUTOMATION_GROUPS, group)) return true;
  try {if (settings?.get?.(AUTOMATION_SYSTEM,AUTOMATION_MASTER_KEY)===true) return false;}catch(_e){}
  try {return settings?.get?.(AUTOMATION_SYSTEM,`automation_${group}`)!==false;}catch(_e){return true;}
}
export function registerAutomationSettings(){
  game.settings.register(AUTOMATION_SYSTEM,AUTOMATION_MASTER_KEY,{
    name:'Automações — DESATIVAR TODAS',
    hint:'Desliga todas as automações opcionais abaixo. Tem prioridade sobre os controles individuais; rolagens, botões manuais e operações fundamentais do Foundry continuam funcionando. Ao desmarcar, volta a respeitar cada grupo.',
    scope:'world',config:true,type:Boolean,default:false,
  });
  for(const [key,[name,hint]] of Object.entries(AUTOMATION_GROUPS)){
    game.settings.register(AUTOMATION_SYSTEM,`automation_${key}`,{
      name:`Automações — ${name}`, hint:'Ativado por padrão. '+hint,
      scope:'world',config:true,type:Boolean,default:true,
    });
  }
}
