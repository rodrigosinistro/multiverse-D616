import { automationEnabled } from './automation-settings.mjs';
/** Multiverse-D616 v0.2.9 — persistence and upkeep for per-turn Focus powers.
 * Active Effect is the source of truth; deleting it ends the maintenance.
 * Concentration powers use the existing power-specific effect (and its hooks).
 * Only the primary active GM processes combat turns to avoid duplicate charges.
 */
import { parseFocusCost, focusAvailable, validateFocusSpend, focusMaintenanceDuration } from './focus-cost.mjs';
import { getConcentrationPowerEffects, itemHasConcentration } from './concentration.js';

const SYSTEM = 'multiverse-d616';
const MAINTENANCE = 'focusMaintenance';
const busy = new Set();
function flags(effect) { return effect?.flags?.[SYSTEM]?.[MAINTENANCE] ?? null; }
export function maintenanceEffects(actor) {
  return Array.from(actor?.effects ?? []).filter(effect => !effect.disabled && flags(effect)?.itemId);
}

export function combatTurnKey(combat) {
  if (!combat?.started && !combat?.active) return '';
  const combatant = combat?.combatant;
  if (!combatant?.id || !Number.isInteger(Number(combat.round))) return '';
  return `${combat.id}:${combat.round}:${combat.turn}:${combatant.id}`;
}
function actorIsCombatant(actor, combatant) {
  if (!actor || !combatant) return false;
  return actor.uuid === combatant.actor?.uuid || (actor.id === combatant.actor?.id && !actor.isToken);
}

/** Register upkeep after initial Focus was successfully spent and Concentration committed. */
export async function beginFocusMaintenance(actor, item, cost = parseFocusCost(item?.system?.cost)) {
  if (!automationEnabled('concentration')) return null;
  if (!actor || !item || !cost.perTurn || !cost.hasFocus) return null;
  const currentTurn = game.combat?.combatant;
  const lastPaidKey = actorIsCombatant(actor, currentTurn) ? combatTurnKey(game.combat) : '';
  const data = {
    itemId: String(item.id ?? ''), itemUuid: String(item.uuid ?? ''),
    amount: cost.min, lastPaidKey, turnsElapsed: 0,
    maxTurns: focusMaintenanceDuration(item, actor),
  };
  const current = maintenanceEffects(actor).find(e => flags(e).itemId === data.itemId);
  if (current?.id) {
    await current.update({ [`flags.${SYSTEM}.${MAINTENANCE}`]: data });
    await announceActivation(actor, item, data, current);
    return current;
  }
  if (itemHasConcentration(item)) {
    const power = getConcentrationPowerEffects(actor, { activeOnly: true }).find(
      e => String(e.flags?.[SYSTEM]?.concentrationPower?.itemId ?? '') === data.itemId
    );
    if (!power) throw new Error(`Concentração de ${item.name} não encontrada para manutenção de Focus.`);
    await power.update({ [`flags.${SYSTEM}.${MAINTENANCE}`]: data });
    await announceActivation(actor, item, data, power);
    return power;
  }
  const result = await actor.createEmbeddedDocuments('ActiveEffect', [{
    name: `Manutenção: ${item.name}`, img: item.img, disabled: false,
    flags: { [SYSTEM]: { [MAINTENANCE]: data } },
    changes: [], system: { changes: [] },
  }]);
  const created = result?.[0] ?? null;
  if (created) await announceActivation(actor, item, data, created);
  return created;
}

function actorAllowsCurrentUser(actor) {
  if (game.user?.isGM) return true;
  return actor?.isOwner === true;
}
function primaryProcessor() {
  const activeGM = game.users?.activeGM;
  if (activeGM) return game.user?.id === activeGM.id;
  return true; // No GM online: deterministic single-owner fallback below.
}
function isFallbackOwner(actor) {
  if (!actorAllowsCurrentUser(actor)) return false;
  if (game.user?.isGM) return true;
  const owners = Array.from(game.users ?? [])
    .filter(user => user.active && !user.isGM && actor.testUserPermission?.(user, 'OWNER'))
    .sort((a,b) => String(a.id).localeCompare(String(b.id)));
  return owners[0]?.id === game.user?.id;
}
function escape(text) {
  return String(text ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
async function announceActivation(actor, item, data, effect) {
  try {
    if (typeof ChatMessage?.create !== 'function') return;
    const content = `<div class="m616-focus-upkeep"><b>${escape(item.name)}</b>: ` +
      `manutenção ativa (${data.amount} Focus por turno). ` +
      `<button type="button" class="m616-end-focus-maintenance" data-actor-uuid="${escape(actor.uuid)}" ` +
      `data-effect-id="${escape(effect.id)}">Encerrar manutenção</button></div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  } catch (err) {
    // Chat is optional: never undo the maintenance because messaging failed.
    console.warn(`[${SYSTEM}] Não foi possível publicar o controle de manutenção`, err);
  }
}

async function announce(actor, itemName, amount, effect, ended = false, cause = '') {
  if (typeof ChatMessage?.create !== 'function') return;
  const message = ended
    ? `<b>${escape(itemName)}</b>: manutenção encerrada. ${escape(cause)}`
    : `<b>${escape(itemName)}</b>: −${amount} Focus de manutenção neste turno. ` +
      `<button type="button" class="m616-end-focus-maintenance" data-actor-uuid="${escape(actor.uuid)}" data-effect-id="${escape(effect.id)}">Encerrar manutenção</button>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="m616-focus-upkeep">${message}</div>` });
}

export async function processFocusMaintenanceTurn(combat) {
  if (!automationEnabled('concentration')) return;
  if (!combat || !primaryProcessor()) return;
  const combatant = combat.combatant, actor = combatant?.actor;
  if (!actor || !isFallbackOwner(actor)) return;
  const key = combatTurnKey(combat);
  if (!key) return;
  const lock = `${actor.uuid}:${key}`;
  if (busy.has(lock)) return;
  busy.add(lock);
  try {
    for (const effect of maintenanceEffects(actor)) {
      const info = flags(effect);
      if (!info || info.lastPaidKey === key || !effect.id) continue;
      // Don't charge a future turn for items no longer on the actor.
      const item = actor.items?.get?.(info.itemId);
      if (!item) {
        await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
        continue;
      }
      const cost = parseFocusCost(item.system?.cost);
      if (!cost.perTurn || !cost.hasFocus) {
        await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
        continue;
      }
      // Duration includes the activation round, so a Rank 3 power gets at
      // most 2 later maintenance payments and expires on the following turn.
      if (info.maxTurns && Number(info.turnsElapsed ?? 0) >= info.maxTurns - 1) {
        await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
        await announce(actor, item.name, 0, effect, true, 'A duração terminou.');
        continue;
      }
      const amount = cost.min;
      const check = validateFocusSpend(actor, amount);
      if (!check.ok) {
        await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
        await announce(actor, item.name, amount, effect, true, check.reason);
        continue;
      }
      // First stamp this turn, so a duplicate combat update cannot charge twice.
      await effect.update({ [`flags.${SYSTEM}.${MAINTENANCE}.lastPaidKey`]: key,
        [`flags.${SYSTEM}.${MAINTENANCE}.turnsElapsed`]: Number(info.turnsElapsed ?? 0) + 1 });
      const now = focusAvailable(actor);
      await actor.update({ 'system.focus.value': now - amount });
      await announce(actor, item.name, amount, effect);
    }
  } catch (err) {
    console.error(`[${SYSTEM}] Falha na manutenção de Focus`, err);
    ui.notifications?.error?.('Falha ao atualizar manutenção de Focus; confira o console.');
  } finally { busy.delete(lock); }
}

export async function endFocusMaintenance(actor, effectId) {
  if (!actorAllowsCurrentUser(actor)) return false;
  const effect = actor.effects?.get?.(effectId) ?? Array.from(actor.effects ?? []).find(e => e.id === effectId);
  if (!effect || !flags(effect)) return false;
  await actor.deleteEmbeddedDocuments('ActiveEffect', [effect.id]);
  return true;
}

export function registerFocusMaintenanceHooks() {
  Hooks.on('combatStart', combat => { void processFocusMaintenanceTurn(combat); });
  Hooks.on('updateCombat', (combat, changed) => {
    if ('turn' in changed || 'round' in changed || 'started' in changed) {
      void processFocusMaintenanceTurn(combat);
    }
  });
  Hooks.on('renderChatMessageHTML', (_message, root) => {
    root?.querySelectorAll?.('.m616-end-focus-maintenance').forEach(button => {
      button.addEventListener('click', async event => {
        event.preventDefault();
        const actor = await fromUuid(button.dataset.actorUuid);
        if (!actorAllowsCurrentUser(actor)) {
          ui.notifications?.warn?.('Somente o proprietário do personagem ou Mestre pode encerrar esta manutenção.');
          return;
        }
        try { await endFocusMaintenance(actor, button.dataset.effectId); }
        catch(err) { console.error(err); ui.notifications?.error?.('Não foi possível encerrar a manutenção.'); }
      });
    });
  });
}
