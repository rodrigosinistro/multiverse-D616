/** Scoped temporary Power Control state. No permanent edits to original powers. */
const S='multiverse-d616';
export const CONTROL='nativePowerControl';
export const COPY='nativeCopiedPower';
export const DAMPEN='nativeDampenedPower';
export const collectionValues=c=>Array.from(c?.contents??c?.values?.()??c??[]);
export const isCopyPower=i=>i?.type==='power'&&i.name==='Copy Power'&&i.system?.powerSet==='Power Control';
export const isDampenPower=i=>i?.type==='power'&&i.name==='Dampen Power'&&i.system?.powerSet==='Power Control';
export const isPowerControl=i=>isCopyPower(i)||isDampenPower(i);
export function controlEffect(actor,itemId){return collectionValues(actor?.effects).find(e=>!e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.transient===true&&String(e.flags[S].concentrationPower.itemId)===String(itemId));}
export function controlSource(mark,scenes=globalThis.game?.scenes){
 const token=scenes?.get?.(mark?.sceneId)?.tokens?.get?.(mark?.sourceTokenId),actor=token?.actor;
 if(!actor||actor.uuid!==mark?.sourceActorUuid)return null;
 const fx=controlEffect(actor,mark.sourceItemId),state=fx?.flags?.[S]?.[CONTROL];
 if(fx?.id!==mark.sourceEffectId||state?.activationId!==mark.activationId||!actor.items?.get?.(mark.sourceItemId))return null;
 return {actor,fx,state};
}
export function copiedPowerUsable(item){const mark=item?.flags?.[S]?.[COPY];return !mark||!!controlSource(mark);}
// Recipient effects are authoritative on every client; they are deleted by GM
// when the source Concentration is gone. No source-Actor permissions needed.
export function dampenedPower(item){const id=item?.flags?.[S]?.nativeVenomSwordWeapon?.sourceItemId??item?.id;return !!id&&collectionValues(item.actor?.effects).some(e=>!e.disabled&&e.duration?.expired!==true&&e.flags?.[S]?.[DAMPEN]?.targetItemId===id);}
export function dampenFactor(item){return dampenedPower(item)?0.5:1;}
export const suppressFantastic=(roll,message)=>roll?.options?.nativeDampenedPower===true||message?.getFlag?.(S,'nativeDampenedPower')===true;
export function halveKnownRange(range,item){return dampenedPower(item)&&Number.isFinite(range?.spaces)?{...range,spaces:range.spaces/2}:range;}
const dmChange=c=>/^(?:system\.abilities\.(mle|agl|res|vig|ego|log)\.damageMultiplier|system\.(?:health|focus)DamageReduction)$/.test(c.key)&&(['add','upgrade'].includes(c.type)||[2,4].includes(Number(c.mode)))&&Number(c.value)>0;
const effectChanges=fx=>fx?.system?.changes??fx?.changes??[];
export function passiveMultiplierChanges(power){return collectionValues(power?.effects).filter(fx=>!fx.disabled&&fx.transfer).flatMap(fx=>effectChanges(fx).filter(dmChange));}
// Transform only the specific transferred effect while preparing the actor.
// An unrelated stronger bonus remains available; no negative global modifier.
export function dampenedTransferData(effect){
 const item=effect?.parent;if(item?.type!=='power'||!dampenedPower(item)||!effect.transfer)return null;
 const changes=effectChanges(effect);if(!changes.some(dmChange))return null;
 const raw=effect.toObject();const replacement=changes.map(c=>dmChange(c)?{...c,value:String(Math.max(0,Number(c.value)-1))}:{...c});
 if(Array.isArray(raw.system?.changes))raw.system.changes=replacement;else raw.changes=replacement;
 return raw;
}
export function dampenedAttackMultiplier(item,value){
 if(!dampenedPower(item))return value;
 // Every direct damaging power attack loses one DM, including Smash,
 // regardless of whether its description explicitly mentions a multiplier.
 // Transferred passive effects and summoned weapons already have their own
 // scoped reduction; never subtract a second point from those benefits.
 if(item?.type!=='power'||passiveMultiplierChanges(item).length)return value;
 return Math.max(0,(Number(value)||0)-1);
}
