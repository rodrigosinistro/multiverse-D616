/** Safe Active Effect change interpretation for Foundry VTT v14.
 * Modern changes expose a string `type`; legacy serialized plain objects can
 * still carry an own numeric `mode`. Never access the deprecated numeric mode
 * getter on live Foundry ActiveEffectChange instances.
 */
const LEGACY_MODES=Object.freeze({custom:0,multiply:1,add:2,downgrade:3,upgrade:4,override:5});
export function isEffectChangeType(change,kind){
  if(!change||typeof change!=='object')return false;
  const modern=change.type;
  if(typeof modern==='string'&&modern.trim())return modern.toLowerCase()===kind;
  const descriptor=Object.getOwnPropertyDescriptor(change,'mode');
  return Boolean(descriptor && Object.hasOwn(descriptor,'value') &&
    Number(descriptor.value)===LEGACY_MODES[kind]);
}
