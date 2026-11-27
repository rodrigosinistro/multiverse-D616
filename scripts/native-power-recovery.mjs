/**
 * Macros_D616 v0.2.186 — narrowly scoped official resource-recovery powers.
 * No new hooks, privileged macros, damage changes, or general Actor interceptors.
 * The ordinary Item.roll() pipeline validates and spends Focus, then calls us
 * once before tracking the Standard Action and creating the usual chat card.
 */

const RECOVERY_SET = Object.freeze({
  'Martial Arts': Object.freeze({
    'Regain Focus': 'focus',
    'Do This All Day': 'health',
  }),
  'Shield Bearer': Object.freeze({'Do This All Day': 'health'}),
});

const finite = value => Number.isFinite(Number(value)) ? Number(value) : NaN;
const wholeNonNegative = value => Number.isFinite(value) ? Math.max(0,Math.floor(value)) : NaN;

/** Never use name alone: Do This All Day exists in two official Power Sets. */
export function nativeRecoveryKind(item) {
  if(item?.type!=='power') return null;
  const set=String(item.system?.powerSet??'').trim();
  const name=String(item.name??'').trim();
  return RECOVERY_SET[set]?.[name]??null;
}

function pool(actor, key) {
  const current=wholeNonNegative(finite(actor?.system?.[key]?.value));
  const maximum=wholeNonNegative(finite(actor?.system?.[key]?.max));
  if(!Number.isFinite(current)||!Number.isFinite(maximum)||maximum<=0) return null;
  return {current:Math.min(current,maximum),maximum};
}

/** A full pool or malformed resource is rejected BEFORE the variable-cost
 * dialog, so an accidental click never consumes Focus or the Standard Action.
 * Return ok for every nonmatching power to preserve the old generic pipeline.
 */
export function checkNativeRecoveryUse(actor,item) {
  const kind=nativeRecoveryKind(item);
  if(!kind)return {ok:true};
  const resource=kind==='focus'?'focus':'health';
  const points=pool(actor,resource);
  if(!points)return {ok:false,reason:`${item.name}: o valor máximo de ${resource==='focus'?'Focus':'Health'} é inválido.`};
  if(points.current>=points.maximum)return {ok:false,reason:`${item.name}: ${resource==='focus'?'Focus':'Health'} já está no máximo.`};
  if(kind==='focus') {
    const vig=wholeNonNegative(finite(actor?.system?.abilities?.vig?.value));
    if(!Number.isFinite(vig)||vig===0)return {ok:false,reason:'Regain Focus: Vigilance deve ser maior que zero.'};
  }
  return {ok:true};
}

/** The caller has already committed Focus for Do This All Day. Do not spend it
 * again here. Throw on any invalid invocation, allowing the existing Item.roll
 * rollback path to refund a successful prior Focus charge.
 */
export async function applyNativeRecovery(actor,item,spent=0) {
  const kind=nativeRecoveryKind(item);
  if(!kind)return null;
  if(!actor?.update)throw new Error('Personagem indisponível para recuperação.');
  const cost=Number(spent);
  if(!Number.isSafeInteger(cost)||cost<0)throw new Error('Custo de Focus inválido.');
  if(kind==='focus'&&cost!==0)throw new Error('Regain Focus não possui custo de Focus.');
  if(kind==='health'&&cost<5)throw new Error('Do This All Day exige pelo menos 5 Focus.');
  const preflight=checkNativeRecoveryUse(actor,item);
  if(!preflight.ok)throw new Error(preflight.reason);
  const resource=kind==='focus'?'focus':'health';
  const points=pool(actor,resource);
  const amount=kind==='focus'
    ?wholeNonNegative(finite(actor.system.abilities?.vig?.value))
    :2*cost;
  const newValue=Math.min(points.maximum,points.current+amount);
  const gained=newValue-points.current;
  if(!Number.isSafeInteger(gained)||gained<1)throw new Error('Recuperação inválida.');
  // A single source-controlled resource write; no Active Effect or new flag.
  await actor.update({[`system.${resource}.value`]:newValue});
  return Object.freeze({kind:'native-recovery',resource,spent:cost,gained,
    before:points.current,after:newValue,maximum:points.maximum,
    powerSet:item.system.powerSet,powerName:item.name});
}
