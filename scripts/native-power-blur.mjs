/** Macros_D616 v0.2.200 — Blur (Super-Speed), one-round defensive Trouble.
 * Existing Item.roll() spends Focus and the action/reaction exactly once.
 * This controller only creates and expires the protection. No reroll is forced.
 */
const NS='multiverse-d616';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const active=e=>!e?.disabled&&e?.duration?.expired!==true;
export function isNativeBlur(item){
  return item?.type==='power'&&item.name==='Blur'&&item.system?.powerSet==='Super-Speed';
}
export function blurExpiration(combat,actor){
  if(!combat?.started||!actor)return null;
  const turns=list(combat.turns);
  const index=turns.findIndex(c=>c.actor?.uuid===actor.uuid||c.actorId===actor.id||c.actor?.id===actor.id);
  const now=Number(combat.turn),round=Number(combat.round);
  if(index<0||!Number.isInteger(now)||!Number.isInteger(round))return null;
  return {combatId:combat.id,expiresRound:round+(index<=now?1:0),expiresTurn:index};
}
export function blurExpired(flag,combat){
  if(!flag||flag.version!==1||!combat?.started||flag.combatId!==combat.id)return true;
  return Number(combat.round)>Number(flag.expiresRound)||
    (Number(combat.round)===Number(flag.expiresRound)&&Number(combat.turn)>=Number(flag.expiresTurn));
}
export function checkNativeBlurUse(actor,item,combat=globalThis.game?.combat){
  if(!isNativeBlur(item))return {ok:true};
  return blurExpiration(combat,actor)?{ok:true}:{ok:false,reason:'Blur requer combate ativo com o personagem na iniciativa para controlar a duração de 1 rodada.'};
}
export async function applyNativeBlur(actor,item,spent,{combat=globalThis.game?.combat}={}){
  if(!isNativeBlur(item))return null;
  if(Number(spent)!==5)throw new Error('Blur exige 5 Focus.');
  const expire=blurExpiration(combat,actor);
  if(!expire||!actor?.createEmbeddedDocuments)throw new Error('Blur: combate ou personagem inválido.');
  const old=list(actor.effects).filter(e=>e.flags?.[NS]?.nativeBlur?.version===1).map(e=>e.id).filter(Boolean);
  // Only the named Blur effect is replaced; Concentration and other buffs remain.
  if(old.length)await actor.deleteEmbeddedDocuments('ActiveEffect',old);
  await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Blur — defesa veloz',img:item.img,
    disabled:false,transfer:false,changes:[],flags:{[NS]:{nativeBlur:{version:1,...expire}}}}]);
  return {kind:'native-blur',...expire};
}
export function blurTargetModifier(actor,{attack=false,targeted=false,combat=globalThis.game?.combat}={}){
  if(!attack||!targeted||!combat?.started)return null;
  if(!list(actor?.effects).some(e=>active(e)&&e.flags?.[NS]?.nativeBlur?.version===1&&
    !blurExpired(e.flags[NS].nativeBlur,combat)))return null;
  return {source:'Alvo: Blur',reason:'1 Trouble em ataques contra Blur durante uma rodada',sign:-1};
}
export function registerNativeBlurHooks(){
  const primary=()=>globalThis.game?.user?.isGM&&
    (!game.users?.activeGM?.id||game.users.activeGM.id===game.user.id);
  const allActors=()=>new Set([...list(game?.actors),...list(game?.scenes).flatMap(s=>list(s.tokens).map(t=>t.actor)),
    ...list(game?.combat?.combatants).map(c=>c.actor)].filter(Boolean));
  const clear=combat=>{
    for(const actor of allActors()){
      const ids=list(actor.effects).filter(e=>e.flags?.[NS]?.nativeBlur&&blurExpired(e.flags[NS].nativeBlur,combat))
        .map(e=>e.id).filter(Boolean);
      if(ids.length)void actor.deleteEmbeddedDocuments('ActiveEffect',ids).catch(error=>console.warn('[D616] Blur:',error));
    }
  };
  Hooks.on('updateCombat',(combat,change)=>{
    if(primary()&&(Object.hasOwn(change??{},'round')||Object.hasOwn(change??{},'turn')))clear(combat);
  });
  Hooks.on('deleteCombat',combat=>{if(primary())clear(null);});
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerNativeBlurHooks);
