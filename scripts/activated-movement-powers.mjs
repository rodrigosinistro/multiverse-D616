/** Concentration-based restrictions on attack actions — Foundry VTT v14. */
import { isConcentrationPowerEffect } from "./concentration.js";

export function hasActiveBodySheet(actor) {
  return Array.from(actor?.effects ?? []).some(e => e?.disabled !== true &&
    e.name === "Body Sheet" && isConcentrationPowerEffect(e));
}

export function isAttackItem(item) {
  if (!item) return false;
  if (item.type === "weapon") return true;
  if (item.type !== "power") return false;
  return Boolean(item.system?.formula && item.system?.ability &&
    (item.system?.attackKind || item.system?.attackTarget));
}
