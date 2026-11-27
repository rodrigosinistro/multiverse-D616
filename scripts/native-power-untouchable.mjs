/** v0.2.199 — Untouchable Position. This is a targeted, GM-authoritative
 * marker of an ACTUAL attack roll, not an arbitrary player script/macro.
 * The first attack is never modified by this power; subsequent close attacks
 * take Trouble until the defender's next turn begins. Rerolls stay manual.
 */
const NS='multiverse-d616';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const active=e=>!e.disabled&&e?.duration?.expired!==true;
const owns=actor=>list(actor?.items).some(i=>i?.type==='power'&&i.name==='Untouchable Position'&&i.system?.powerSet==='Martial Arts');
const reached=(combat,marker)=>Number(combat?.round)>Number(marker?.expiresRound)||
  (Number(combat?.round)===Number(marker?.expiresRound)&&Number(combat?.turn)>=Number(marker?.expiresTurn));
export function untouchableExpiration(combat,defenderCombatant){
  if(!combat?.started||!defenderCombatant)return null;
  const turns=list(combat.turns);
  const index=turns.findIndex(c=>c.id===defenderCombatant.id);
  const now=Number(combat.turn),round=Number(combat.round);
  if(index<0||!Number.isInteger(now)||!Number.isInteger(round))return null;
  return {combatId:combat.id,expiresRound:round+(index<=now?1:0),expiresTurn:index};
}
export function untouchableTargetModifier(actor,{attack=false,targeted=false,close=false,combat=globalThis.game?.combat}={}){
  if(!attack||!targeted||!close||!owns(actor)||!combat?.started)return null;
  const marker=list(actor.effects).map(e=>active(e)?e.flags?.[NS]?.nativeUntouchable:null)
    .find(f=>f?.version===1&&f.combatId===combat.id&&!reached(combat,f));
  if(!marker)return null;
  return {source:'Alvo: Untouchable Position',reason:'Ataques corpo a corpo posteriores ao primeiro sofrem Trouble até o próximo turno',sign:-1};
}
function tokenByUuid(scene,uuid){
  const match=/^Scene\.([^.]+)\.Token\.([^.]+)$/.exec(String(uuid??''));
  return match&&match[1]===scene?.id?scene.tokens?.get?.(match[2]):null;
}
export function untouchableAttackRecipients(message,{scene,combat}={}){
  if(!combat?.started||!scene||!Array.isArray(message?.rolls)||!message.rolls.length)return [];
  const data=message.flags?.[NS]??{};
  if(!data.itemId||!data.attackTarget||!Array.isArray(data.targets))return [];
  const source=scene.tokens?.get?.(message.speaker?.token)?.actor??
    globalThis.game?.actors?.get?.(message.speaker?.actor);
  const item=source?.items?.get?.(data.itemId);
  const author=message.author??globalThis.game?.users?.get?.(message.user?.id??message.user);
  if(!author||!(author.isGM||source?.testUserPermission?.(author,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3)))return [];
  if(!item||item.type!=='power'&&item.type!=='weapon'||item.type==='power'&&
      !(item.system?.attack||item.system?.attackTarget))return [];
  if(message.speaker?.scene!==scene.id)return [];
  const result=[];
  for(const reference of data.targets){
    const token=tokenByUuid(scene,reference.uuid);
    const actor=token?.actor;
    if(!actor||!owns(actor))continue;
    const combatant=list(combat.combatants).find(c=>c.tokenId===token.id&&
      (c.actor?.uuid===actor.uuid||c.actor?.id===actor.id));
    const expiration=untouchableExpiration(combat,combatant);
    if(expiration)result.push({actor,token,expiration});
  }
  return result;
}
export async function markUntouchableAfterAttack(message,{scene,combat}={}){
  let count=0;
  for(const {actor,expiration} of untouchableAttackRecipients(message,{scene,combat})){
    const existing=list(actor.effects).filter(e=>active(e)&&e.flags?.[NS]?.nativeUntouchable?.combatId===combat.id&&
      !reached(combat,e.flags?.[NS]?.nativeUntouchable));
    if(existing.length)continue; // Never extend the expiry on later attacks.
    const power=list(actor.items).find(i=>i.type==='power'&&i.name==='Untouchable Position'&&i.system?.powerSet==='Martial Arts');
    await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Untouchable Position — ataques seguintes',img:power.img,
      disabled:false,changes:[],flags:{[NS]:{nativeUntouchable:{version:1,...expiration}}}}]);
    count++;
  }
  return count;
}
export function registerUntouchablePositionHooks(){
  if(!globalThis.Hooks?.on)return;
  const primary=()=>globalThis.game?.user?.isGM&&
    (!game.users?.activeGM?.id||game.users.activeGM.id===game.user.id);
  Hooks.on('createChatMessage',(message)=>{
    if(!primary()||!game.combat?.started)return;
    const scene=game.scenes?.get?.(message.speaker?.scene);
    if(!scene)return;
    void markUntouchableAfterAttack(message,{scene,combat:game.combat})
      .catch(e=>console.error('[D616] Untouchable Position:',e));
  });
  const cleanup=async (combat,{force=false}={})=>{
    if(!primary())return;
    for(const combatant of list(combat?.combatants)){
      const actor=combatant.actor;
      if(!actor?.deleteEmbeddedDocuments)continue;
      const expired=list(actor.effects).filter(e=>{
        const marker=e.flags?.[NS]?.nativeUntouchable;
        return marker?.version===1&&(force||marker.combatId!==combat.id||!combat.started||reached(combat,marker));
      });
      if(expired.length)await actor.deleteEmbeddedDocuments('ActiveEffect',expired.map(e=>e.id));
    }
  };
  Hooks.on('updateCombat',combat=>{void cleanup(combat).catch(e=>console.error('[D616] Untouchable cleanup:',e));});
  Hooks.on('deleteCombat',combat=>{void cleanup(combat,{force:true}).catch(e=>console.error('[D616] Untouchable cleanup:',e));});
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerUntouchablePositionHooks);
