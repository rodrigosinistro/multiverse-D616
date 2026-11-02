/**
 * Read-only audit of the bundled Charactermancer power catalog.
 * Derived from catalog metadata and runtime resolver: this is NOT a
 * substitute for a review against the rulebooks or Narrator customizations.
 * Do not use these findings to rewrite world Item documents automatically.
 */
import {resolvePowerRoll} from './power-rolls.mjs';
import {classifyItemAction} from './combat/turn-tracker-core.mjs';

const name = item => String(item?.name ?? '').trim();
const set = item => String(item?.system?.powerSet ?? '').trim();

export function auditPowerCatalog(items = []) {
  const findings = [];
  const powerSets = new Set();
  const identities = new Map();
  const totals = {records:0, powerSets:0, attacks:0, nonDamagingChecks:0, otherRolls:0, noRoll:0};
  for (const item of items) {
    if (item?.type !== 'power') continue;
    totals.records++;
    const powerName=name(item), powerSet=set(item), system=item.system ?? {};
    if (powerSet) powerSets.add(powerSet);
    const resolved=resolvePowerRoll(item);
    const issue=(severity,code,detail)=>findings.push({severity,code,power:powerName,powerSet,detail});
    if (!powerName || !powerSet) issue('high','identity','Missing name or power set');
    const identity=powerSet.toLocaleLowerCase()+'::'+powerName.toLocaleLowerCase();
    if (identities.has(identity)) issue('review','same-set-name','Same power name within a power set');
    identities.set(identity,true);
    if (!String(system.effect ?? '').trim()) issue('high','effect','No effect description');
    if (!String(system.description ?? '').trim()) issue('review','description','Missing short description');
    const action=String(system.action??'').trim();
    if(action && classifyItemAction(item).kind==='none' && !['permanent','passive'].includes(action.toLowerCase()))
      issue('review','action','Action text cannot be classified by the turn tracker');
    if (resolved.attack) {
      totals.attacks++;
      if(!resolved.ability) issue('high','attack-ability','Attack missing roll ability');
      if(!resolved.attackTarget) issue('high','attack-target','Damaging attack has no defense target');
    } else if (resolved.checkOnly) totals.nonDamagingChecks++;
    else if(resolved.canRoll) totals.otherRolls++;
    else totals.noRoll++;
    // This is a review queue, not a claim that the source metadata is wrong:
    // specialized/no-damage powers legitimately have attackKind without attack.
    if(system.attackKind && !resolved.attack && !resolved.checkOnly && resolved.canRoll)
      issue('review','attack-kind','Attack kind present but not classified as a damage attack or a check');
    if(String(system.action??'').trim().toLowerCase()==='permanent' &&
       String(system.duration??'').trim().toLowerCase()==='instant')
      issue('review','duration','Permanent action label and Instant duration need manual confirmation');
  }
  totals.powerSets=powerSets.size;
  return {totals,findings};
}
