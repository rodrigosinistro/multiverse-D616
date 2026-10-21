/** Multiverse-D616 v0.2.9: normalized Focus cost parser, safe for offline tests. */
export function parseFocusCost(text) {
  const raw = String(text ?? "").trim();
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = normalized.match(/(\d+)\s*(?:points?\s*(?:of|de)\s*)?(?:(?:or\s+more|ou\s+mais)\s+)?(?:focus|foco)\b/);
  if (!match) return { hasFocus: false, type: "none", min: 0, perTurn: false, raw };
  const min = Number.parseInt(match[1], 10);
  const perTurn = /\b(?:per|por|cada)\s+(?:turn|turno|round|rodada)\b|\/\s*(?:turn|turno|round|rodada)\b/.test(normalized);
  const variable = /\b(?:or\s+more|ou\s+mais|minimum|minimo)\b|\b(?:focus|foco)\s*\+/.test(normalized);
  const type = variable ? "variable" : "fixed";
  return { hasFocus: min > 0, type, min, fixed: type === "fixed" ? min : undefined, perTurn, raw };
}

export function focusAvailable(actor) {
  const focus = Number(actor?.system?.focus?.value ?? 0);
  return Number.isFinite(focus) ? Math.max(0, focus) : 0;
}

export function focusSpendLimit(actor) {
  const rank = Number(actor?.system?.attributes?.rank?.value ?? actor?.system?.attributes?.rank ?? 1);
  return Number.isFinite(rank) && rank > 0 ? 5 * rank : 0;
}

export function validateFocusSpend(actor, spent) {
  if (!Number.isSafeInteger(spent) || spent < 0) return { ok: false, reason: "Gasto de Focus inválido." };
  if (spent === 0) return { ok: true };
  const max = focusSpendLimit(actor);
  if (spent > max) return { ok: false, reason: `Limite de ${max} Focus por uso (5×Rank).` };
  const available = focusAvailable(actor);
  if (spent > available) return { ok: false, reason: `Focus insuficiente: precisa de ${spent}, mas tem ${available}.` };
  return { ok: true };
}

/** Explicit finite-duration upkeep, limited by the actor's Rank. */
export function focusMaintenanceDuration(item, actor) {
  const d = String(item?.system?.duration ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/\b(?:1|one|uma?)\s*(?:round|rodada)\s*(?:per|por)\s*(?:rank|nivel)\b/.test(d)) return null;
  const rank = Number(actor?.system?.attributes?.rank?.value ?? 1);
  return Number.isFinite(rank) && rank > 0 ? Math.floor(rank) : null;
}
