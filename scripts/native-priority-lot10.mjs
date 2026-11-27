/** Multiverse-D616 v0.2.232 — Vapors of Valtorr (Magic).
 * The caster first creates a GM-approved Concentration Region (lot 6).
 * On SUBSEQUENT turns, exactly one target inside that fog can be attacked
 * by an ordinary Marvel 3-die Ego vs Vigilance roll. Damage stays in MMDR;
 * blindness on Fantastic is resolved by the existing power condition engine.
 * Never re-pay the 10 Focus activation or duplicate an area for an attack.
 */
import {isVaporsOfValtorr,isPointInsideEnvironment} from './native-priority-lot6.mjs';
import {getConcentrationPowerEffects} from './concentration.js';
import {tokenCenter} from './elemental-area-geometry.mjs';
import {chooseSmartTargets} from './smart-targets.mjs';
import {resolveConditionEdges} from './condition-edge.mjs';
import {automationEnabled} from './automation-settings.mjs';
const S='multiverse-d616';
const all=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>!!game.user?.isGM&&(!game.users?.activeGM||game.user.id===game.users.activeGM.id);
const owner=(actor,user)=>!!actor&&(user?.isGM||actor.testUserPermission?.(user,'OWNER'));
export const VAPORS_FLAG='nativeVaporsControl';
export const VAPORS_ATTACK='nativeVaporsAttack';
function signedSource(control,scene){return scene?.tokens?.get?.(control?.sourceTokenId)??null;}
function activeEffect(actor,itemId){return getConcentrationPowerEffects(actor,{activeOnly:true}).find(e=>
 e.duration?.expired!==true&&e.flags?.[S]?.concentrationPower?.itemId===itemId);}
function worldFor(control){
 const scene=game.scenes?.get?.(control?.sceneId);
 const source=signedSource(control,scene),actor=source?.actor;
 const item=actor?.items?.get?.(control?.itemId);
 const region=scene?.regions?.get?.(control?.regionId);
 const meta=region?.flags?.[S]?.nativeEnvironment;
 const fx=activeEffect(actor,item?.id);
 if(!isVaporsOfValtorr(item)||!fx||!source||source.parent?.id!==scene.id||
    fx.id!==control.effectId||meta?.sourcePowerName!=='Vapors of Valtorr'||
    meta.sourceTokenId!==source.id||meta.sourceItemId!==item.id||meta.sourceActorUuid!==actor.uuid)return null;
 return {scene,source,actor,item,region,meta,fx};
}
export function vaporsTurnKey(combat,effectId){
 return combat?.started&&combat?.id&&Number.isFinite(Number(combat.round))&&Number.isFinite(Number(combat.turn))&&effectId?
 `${combat.id}:${combat.round}:${combat.turn}:${effectId}`:null;
}
export function vaporsCanAttack(control,{combat=globalThis.game?.combat,user=globalThis.game?.user,target=null}={}){
 if(!control||control.version!==1)return {ok:false,reason:'Controle de Vapors inválido.'};
 const live=worldFor(control);
 if(!live)return {ok:false,reason:'A névoa ou a Concentração não está mais ativa.'};
 if(!owner(live.actor,user))return {ok:false,reason:'Você não controla o conjurador.'};
 if(!combat?.started)return {ok:false,reason:'O ataque em turnos seguintes exige combate ativo; fora dele, o Mestre resolve manualmente.'};
 if(combat.combatant?.tokenId!==live.source.id||
    (combat.scene?.id??combat.sceneId??combat.combatant?.sceneId)!==live.scene.id)
  return {ok:false,reason:'A névoa só pode atacar no turno do conjurador.'};
 const key=vaporsTurnKey(combat,live.fx.id);
 if(!key)return {ok:false,reason:'Turno de combate inválido.'};
 const activation=control.activationCombatId===combat.id&&
  Number(control.activationRound)===Number(combat.round)&&Number(control.activationTurn)===Number(combat.turn);
 if(activation)return {ok:false,reason:'O ataque só é permitido nos turnos seguintes à criação da névoa.'};
 if(all(game.messages).some(m=>m.getFlag?.(S,VAPORS_ATTACK)?.key===key))
  return {ok:false,reason:'Vapors of Valtorr já atacou neste turno.'};
 if(target){
  const doc=target.document??target;
  if(doc.parent?.id!==live.scene.id||!doc.actor||doc.id===live.source.id)
   return {ok:false,reason:'Selecione outro personagem válido na mesma cena.'};
  if(!isPointInsideEnvironment(tokenCenter(doc,live.scene),live.meta,Number(live.scene.grid?.size)||100))
   return {ok:false,reason:'O alvo precisa estar dentro da névoa de Vapors of Valtorr.'};
 }
 return {ok:true,key,...live};
}
function actorDMContext(actor,ability='ego'){
 const rank=Number(actor?.system?.attributes?.rank?.value??0)||0;
 const raw=globalThis.foundry?.utils?.getProperty?.(actor?._source,`system.abilities.${ability}.damageMultiplier`);
 const base=(Number(raw??0)||0)+rank;
 const derived=Number(actor?.system?.abilities?.[ability]?.damageMultiplier??base);
 const delta=(Number.isFinite(derived)?derived:base)-base;
 const otherBonus=Math.max(0,delta),otherPenalty=Math.min(0,delta);
 return {base,otherBonus,otherPenalty,weaponBonus:0,effectiveBonus:otherBonus,finalDM:base+delta};
}
const pending=new Set();
/** The native Smart Target dialog keeps Edge/Trouble and visible dice exactly
 * like a normal power attack. A canceled dialog never consumes the Action. */
export async function attackWithVapors(control,{target=null,roller=globalThis.CONFIG?.Dice?.MarvelMultiverseRoll}={}){
 let ready=vaporsCanAttack(control);if(!ready.ok)throw Error(ready.reason);
 const key=ready.key;
 if(pending.has(key))throw Error('Já existe um ataque com a névoa em andamento.');
 pending.add(key);
 try{
  if(!target){
   const selected=await chooseSmartTargets(ready.item,{force:true,requireTargets:true});
   if(!selected)return null;
   const marked=all(game.user?.targets);
   if(marked.length!==1)throw Error('Vapors of Valtorr exige exatamente um alvo.');
   target=marked[0].document??marked[0];
  }
  ready=vaporsCanAttack(control,{target});if(!ready.ok)throw Error(ready.reason);
  if(!roller||typeof ready.item.getRollData!=='function')throw Error('O motor Marvel de rolagem não está disponível.');
  const item=ready.item,actor=ready.actor,ref={uuid:target.uuid,actorUuid:target.actor?.uuid??'',name:target.name??target.actor?.name??'Alvo',img:target.texture?.src??target.actor?.img??''};
  const baseMode=String(item.system?.attackEdgeMode??'').toLowerCase()==='edge'?1:
    String(item.system?.attackEdgeMode??'').toLowerCase()==='trouble'?-1:0;
  const edges=resolveConditionEdges({actor,targetActors:[target.actor],ability:'ego',attack:true,
    item,kind:'ranged',action:'standard',targeted:true,baseMode});
  // This is a new Standard Action on a following turn, NOT a new activation.
  if(automationEnabled('turnActions')){
   const tracked=await game.multiverseD616?.turnTracker?.trackItemUse?.(item);
   if(!tracked)throw Error('O rastreador não autorizou a Ação Padrão neste turno. Nenhum ataque foi rolado.');
  }
  // Recheck after async Action request to protect against expired concentration.
  ready=vaporsCanAttack(control,{target});if(!ready.ok)throw Error(ready.reason);
  const data=item.getRollData();const options={};if(edges.edgeMode)options.edgeMode=edges.edgeMode;
  const roll=new roller(data.formula,data.actor,options);
  const flags={actorId:actor.id,itemId:item.id,ability:'ego',attackTarget:'vig',damageType:'health',
   targets:[ref],damageMultiplier:actorDMContext(actor),focusAuto:true,focusSpent:0,
   [VAPORS_ATTACK]:{version:1,key,sceneId:ready.scene.id,regionId:ready.region.id,
     sourceTokenId:ready.source.id,concentrationEffectId:ready.fx.id,targetUuid:ref.uuid}};
  if(edges.sources?.length)flags.conditionEdges=edges;
  const speaker={scene:ready.scene.id,token:ready.source.id,actor:actor.id,alias:actor.name};
  let messageMode='public';try{messageMode=game.settings?.get?.('core','messageMode')??'public';}catch{}
  const result=await roll.toMessage({title:item.name,speaker,
   flavor:`ability: Ego<br/>power: ${item.name}<br/>damagetype: health, [ability] ego<br/>`+
    `<b>Vapors of Valtorr:</b> ataque posterior contra ${escape(ref.name)}; sem novo custo de 10 Focus. `+
    `Sucesso: dano normal; Fantástico: dano dobrado e Cego por 1 turno após confirmação do Mestre.`,
   flags:{[S]:flags}},{messageMode,itemId:item.id});
  if(!result?.id)throw Error('A rolagem de Vapors não foi publicada. Confira a Ação Padrão com o Mestre.');
  return result;
 }finally{pending.delete(key);}
}
/** GM reminder: one signed control per turn, including after page refresh. */
const sending=new Set();
export async function publishVaporsTurnControls(combat=globalThis.game?.combat){
 if(!isGM()||!combat?.started||!combat?.combatant)return 0;
 const scene=game.scenes?.get?.(combat.scene?.id??combat.sceneId??combat.combatant.sceneId);
 const source=scene?.tokens?.get?.(combat.combatant.tokenId),actor=source?.actor;
 if(!actor)return 0;
 let created=0;
 for(const fx of getConcentrationPowerEffects(actor,{activeOnly:true})){
  const item=actor.items?.get?.(fx.flags?.[S]?.concentrationPower?.itemId);
  if(!isVaporsOfValtorr(item))continue;
  const region=all(scene.regions).find(r=>r.flags?.[S]?.nativeEnvironment?.sourcePowerName==='Vapors of Valtorr'&&
   r.flags[S].nativeEnvironment.sourceTokenId===source.id&&r.flags[S].nativeEnvironment.sourceItemId===item.id);
  if(!region)continue;
  const initial=all(game.messages).find(m=>m.getFlag?.(S,VAPORS_FLAG)?.regionId===region.id);
  const control=initial?.getFlag?.(S,VAPORS_FLAG);
  if(!control)continue;
  const can=vaporsCanAttack(control,{combat,user:game.user});if(!can.ok)continue;
  const key=can.key;
  if(sending.has(key)||all(game.messages).some(m=>m.getFlag?.(S,'nativeVaporsReminder')?.key===key))continue;
  sending.add(key);
  try{
   // A previous async operation may have ended concentration or advanced turn.
   if(!vaporsCanAttack(control,{combat,user:game.user}).ok)continue;
   await ChatMessage.create({speaker:{scene:scene.id,token:source.id,actor:actor.id,alias:actor.name},
    content:`<p><b>Vapors of Valtorr — turno de ${escape(actor.name)}</b></p><p>Um ataque de Ego contra Vigilância em um alvo dentro da névoa. Use <b>Atacar com névoa</b> para selecionar o alvo; sem repetir a ativação.</p>`,
    flags:{[S]:{itemId:item.id,[VAPORS_FLAG]:control,nativeVaporsReminder:{key,combatId:combat.id,round:combat.round,turn:combat.turn,effectId:fx.id}}}});
   created++;
  }finally{sending.delete(key);}
 }
 return created;
}
export function registerNativePriorityLot10Hooks({hooks=globalThis.Hooks}={}){
 hooks.on('renderChatMessageHTML',(message,html)=>{
  const control=message?.getFlag?.(S,VAPORS_FLAG);
  if(!control||!owner(signedSource(control,game.scenes?.get?.(control.sceneId))?.actor,game.user))return;
  const content=html?.querySelector?.('.message-content');if(!content)return;
  const button=document.createElement('button');button.type='button';button.textContent='Atacar com névoa';
  const enabled=vaporsCanAttack(control);
  button.disabled=!enabled.ok;button.title=enabled.ok?'Ego vs Vigilância — um alvo dentro da névoa':enabled.reason;
  button.addEventListener('click',()=>void attackWithVapors(control).catch(e=>ui.notifications?.warn?.(String(e?.message??e))));
  content.append(button);
 });
 hooks.on('updateCombat',(combat,change)=>{
  if(!Object.hasOwn(change??{},'turn')&&!Object.hasOwn(change??{},'round'))return;
  void publishVaporsTurnControls(combat).catch(e=>console.error('[D616] Vapors turno:',e));
 });
}
