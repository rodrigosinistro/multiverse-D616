/** Multiverse D616 v0.2.217 — Rico-Shield / Elemental Ricochet Fantastic bounce.
 * Each ricochet is a NEW independent attack roll against a DIFFERENT token,
 * but never a second activation, action, Focus cost or shield throw.
 * The Narrator must first resolve the previous Fantastic hit. Actual damage
 * is NOT a requirement: DR, shields and absorption may reduce it to zero.
 */
import { automationEnabled } from './automation-settings.mjs';
import { getMarvelOutcome, normalizeConditionDefense } from './power-conditions.mjs';
import { rollSignature } from './multi-target-combat.mjs';
import { centerDistanceInSpaces, sightCollision } from './combat-preflight.mjs';
import { resolveConditionEdges, resolveConditionReroll } from './condition-edge.mjs';
import { chooseSmartTargets } from './smart-targets.mjs';

const SYSTEM='multiverse-d616';
const BUTTON='m616-rico-follow-up';
export const RICOCHET_POWERS=Object.freeze(['Rico-Shield','Elemental Ricochet']);
export function isRicochetPower(item){
 // A shared name is not an official identity: the two powers belong to
 // distinct Power Sets, and an imported Item may have a different local ID.
 return item?.type==='power' && (
   (item.name==='Rico-Shield'&&item.system?.powerSet==='Shield Bearer')||
   (item.name==='Elemental Ricochet'&&item.system?.powerSet==='Elemental Control'));
}
const pending=new Set();
const values=coll=>Array.from(coll?.contents??coll?.values?.()??coll??[]);
const normalized=n=>String(n??'').trim().toLowerCase();
function rank(actor){
 const n=Number(actor?.system?.attributes?.rank?.value??actor?.system?.rank?.value??actor?.system?.rank??0);
 return Number.isFinite(n)&&n>0?n:0;
}
function actorForMessage(message){
 const scene=game.scenes?.get?.(message?.speaker?.scene);
 const token=scene?.tokens?.get?.(message?.speaker?.token);
 return {actor:token?.actor??game.actors?.get?.(message?.speaker?.actor),scene,token};
}
function powerForMessage(message){
 const {actor,scene,token}=actorForMessage(message);
 const item=actor?.items?.get?.(message?.getFlag?.(SYSTEM,'itemId'));
 return {actor,scene,token,item};
}
function refForToken(token){
 return {uuid:token.uuid,actorUuid:token.actor?.uuid??'',name:token.name??token.actor?.name??'Alvo',
   img:token.texture?.src??token.actor?.img??''};
}
export function ricoOriginalContext(item,actor,targets,sourceToken,scene,grid){
 if(!isRicochetPower(item))return null;
 if(targets?.length!==1||!String(targets[0]?.uuid??'').startsWith('Scene.'))return null;
 const target=targets[0];
 const sceneId=String(target.uuid).split('.')[1];
 const tokenId=String(target.uuid).split('.')[3];
 const token=scene?.id===sceneId?scene.tokens?.get?.(tokenId):null;
 const distance=sourceToken&&token?centerDistanceInSpaces(sourceToken,token,scene,grid):null;
 return {step:0,visited:[target.uuid],lastTargetUuid:target.uuid,
   traveledSpaces:Number.isFinite(distance)?distance:null,
   combatId:game.combat?.started?game.combat.id:null,
   round:game.combat?.started?Number(game.combat.round):null,
   turn:game.combat?.started?Number(game.combat.turn):null};
}
export function ricoEligibility({source,ready,actor,item,user,combat}={}){
 if(!automationEnabled('extraAttacks',undefined,item?.name))return {ok:false,reason:'Ricochetes desativados pelo Mestre.'};
 if(!isRicochetPower(item)||!source?.rolls?.[0])return {ok:false,reason:'Não é um ataque de ricochete.'};
 const chain=source.getFlag(SYSTEM,'ricoShield');
 if(!chain?.lastTargetUuid||!Array.isArray(chain.visited))return {ok:false,reason:'Ataque sem sequência de ricochetes.'};
 if(!ready||ready.rollSignature!==rollSignature(source.rolls[0]) || ready.targetUuid!==chain.lastTargetUuid)
   return {ok:false,reason:'O ataque anterior ainda não tem um Sucesso Fantástico confirmado.'};
 if(source.getFlag(SYSTEM,'ricoShieldConsumed'))return {ok:false,reason:'O próximo ricochete já foi realizado.'};
 if(!(user?.isGM||source.author?.id===user?.id||actor?.testUserPermission?.(user,'OWNER')))
   return {ok:false,reason:'Você não controla o personagem.'};
 if(chain.combatId && (!combat?.started||combat.id!==chain.combatId ||
    Number(combat.round)!==Number(chain.round)||Number(combat.turn)!==Number(chain.turn)))
   return {ok:false,reason:'A sequência deve continuar no turno em que o escudo foi lançado.'};
 return {ok:true,chain};
}
export function ricoTargetCheck({chain,newTarget,lastTarget,sourceToken,scene,grid,maxRange}={}){
 if(!chain||!newTarget?.uuid||!newTarget.actor)return {ok:false,reason:'Selecione um alvo válido.'};
 if(chain.visited.includes(newTarget.uuid))return {ok:false,reason:'O ricochete exige outro alvo, ainda não atacado nesta sequência.'};
 if(!scene||newTarget.parent?.id!==scene.id||lastTarget?.parent?.id!==scene.id)
   return {ok:false,reason:'Os alvos precisam estar na mesma cena.'};
 const segment=centerDistanceInSpaces(lastTarget,newTarget,scene,grid);
 const initial=Number(chain.traveledSpaces);
 if(chain.traveledSpaces===null||!Number.isFinite(segment)||!Number.isFinite(initial)||!sourceToken)
   return {ok:false,reason:'Não foi possível verificar a trajetória do escudo. Peça ao Mestre para resolver manualmente.'};
 const travel=initial+segment;
 if(!Number.isFinite(maxRange)||maxRange<=0)return {ok:false,reason:'Rank ou alcance inválido.'};
 if(travel>maxRange+0.01)return {ok:false,reason:`Alcance acumulado do ricochete: ${travel.toFixed(1)} / ${maxRange} espaços.`};
 return {ok:true,travel,segment};
}
/** Only a GM-resolved attack card with the CURRENT roll signature may
 * authorize a new bounce. This guard establishes that the selected target was
 * actually processed (not a stale/pending card), even if a shield, damage
 * reduction, or Energy Absorption made the effective damage zero. The final
 * Fantastic success is independently checked against the target's defense by
 * confirmRicoShieldDamage, after any Edge/Trouble rerolls. */
export function confirmedRicochetDamage({source,damageMessage,action,results,actor,item}={}){
 if(!isRicochetPower(item)||!actor||!source?.id||!['full','half'].includes(action))return false;
 const chain=source.getFlag?.(SYSTEM,'ricoShield');
 const target=chain?.lastTargetUuid;
 if(!target||source.getFlag?.(SYSTEM,'ricoShieldConsumed')||source.getFlag?.(SYSTEM,'ricoShieldReady'))return false;
 const snap=damageMessage?.getFlag?.(SYSTEM,'damageApplication');
 if(!snap||snap.sourceMessageId!==source.id||snap.rollSignature!==rollSignature(source.rolls?.[0]))return false;
 const entry=values(snap.entries).find(e=>e.targetUuid===target);
 if(!entry||entry.hit===false)return false;
 // A resolved Fantastic hit may ricochet when protection absorbs ALL damage.
 // `blocked`, `absorbed` and `delta === 0` are defensive outcomes, NOT misses.
 // Still require a real GM damage-resolution result for this same target;
 // healing, a different target, or an empty result set must not authorize it.
 if(!values(results).some(r=>r.targetUuid===target&&!r.heal))return false;
 return true;
}
export async function confirmRicoShieldDamage(damageMessage,action,results){
 if(!automationEnabled('extraAttacks')||!game.user?.isGM)return false;
 const sourceId=damageMessage?.getFlag?.(SYSTEM,'sourceMessageId');
 const source=sourceId?game.messages?.get?.(sourceId):null;
 const {actor,item}=source?powerForMessage(source):{};
 if(!actor||!automationEnabled('extraAttacks',undefined,item?.name)||
    !confirmedRicochetDamage({source,damageMessage,action,results,actor,item}))return false;
 const chain=source.getFlag(SYSTEM,'ricoShield');
 const token=await globalThis.fromUuid?.(chain.lastTargetUuid);
 if(!token?.actor)return false;
 const defenseKey=normalizeConditionDefense(source.getFlag(SYSTEM,'attackTarget')??'agl',token.actor);
 const defense=Number(token.actor.system?.abilities?.[defenseKey]?.defense??0);
 const outcome=getMarvelOutcome(source.rolls[0],defense,{message:source,targetActor:token.actor});
 if(!outcome?.success||!outcome.fantastic)return false;
 // The GM has resolved the attack in MMDR (including complete absorption).
 // Publish the next ricochet only after a confirmed Fantastic HIT.
 await source.setFlag(SYSTEM,'ricoShieldReady',{
   rollSignature:rollSignature(source.rolls[0]),targetUuid:chain.lastTargetUuid,
   damageMessageId:damageMessage.id,confirmed:true,
 });
 return true;
}
export async function useRicoShieldBounce(source,{targets=values(game.user?.targets),roller=globalThis.CONFIG?.Dice?.MarvelMultiverseRoll}={}){
 const {actor,scene,token,item}=powerForMessage(source);
 const ready=source?.getFlag?.(SYSTEM,'ricoShieldReady');
 const eligible=ricoEligibility({source,ready,actor,item,user:game.user,combat:game.combat});
 if(!eligible.ok)throw Error(eligible.reason);
 if(targets.length!==1)throw Error('Marque exatamente um novo alvo para o ricochete.');
 const target=targets[0]?.document??targets[0];
 const chain=eligible.chain;
 const last=await globalThis.fromUuid?.(chain.lastTargetUuid);
 const checked=ricoTargetCheck({chain,newTarget:target,lastTarget:last,sourceToken:token,scene,grid:canvas.grid,
   maxRange:rank(actor)*10});
 if(!checked.ok)throw Error(checked.reason);
 // Elemental Ricochet explicitly requires line of sight from the point of
 // impact to the next target. Foundry can prove a wall collision; elevation
 // ambiguities remain a Narrator decision instead of a guessed prohibition.
 if(item.name==='Elemental Ricochet'){
   const sight=sightCollision({source:last,target,scene,
     polygonClass:globalThis.foundry?.canvas?.geometry?.PointSourcePolygon});
   if(sight==='blocked')throw Error('Elemental Ricochet: o próximo alvo não está em linha de visão do anterior.');
 }
 if(!roller||!item.getRollData)throw Error('Motor de rolagem do poder indisponível.');
 const lastSignature=rollSignature(source.rolls[0]);
 if(lastSignature!==ready.rollSignature)throw Error('A rolagem foi alterada. Reconfirme o ataque.');
 // Mark the preceding roll as spent BEFORE beginning an asynchronous dice roll.
 await source.setFlag(SYSTEM,'ricoShieldConsumed',{at:Date.now(),targetUuid:target.uuid});
 try{
   const targetRef=refForToken(target);
   const data=item.getRollData();
   const rollContext=source.getFlag(SYSTEM,'damageMultiplier')??{};
   const baseMode=normalized(item.system?.attackEdgeMode)==='edge'?1:
     normalized(item.system?.attackEdgeMode)==='trouble'?-1:0;
   const edges=resolveConditionEdges({actor,targetActors:[target.actor],ability:'agl',attack:true,kind:'ranged',
     action:'standard',targeted:true,baseMode});
   const options={};
   if(edges.edgeMode)options.edgeMode=edges.edgeMode;
   const roll=new roller(data.formula,data.actor,options);
   const previous=source.getFlag(SYSTEM,'ricoShield');
   const next={...previous,step:Number(previous.step??0)+1,
     lastTargetUuid:target.uuid,visited:[...previous.visited,target.uuid],traveledSpaces:checked.travel};
   const flags={actorId:actor.id,itemId:item.id,ability:'agl',attackTarget:'agl',
     damageType:'health',damageMultiplier:rollContext,targets:[targetRef],
     ricoShield:next, ricoShieldPreviousMessageId:source.id,
     focusAuto:true,focusSpent:0,focusDamageBonus:Number(source.getFlag(SYSTEM,'focusDamageBonus')??0),
   };
   if(item.system?.isElemental) flags.elementalFantastic=source.getFlag(SYSTEM,'elementalFantastic')??null;
   if(edges.sources.length)flags.conditionEdges=edges;
   const speaker=source.speaker??ChatMessage.getSpeaker({actor});
   let messageMode='public';
   try {messageMode=game.settings?.get?.('core','messageMode')??'public';}catch(_e){}
   // An ordinary attack posts a Roll WITHOUT a custom `content` property:
   // Foundry then renders the 3d616 dice, and our standard attack card exposes
   // the per-die EDGE/TROUBLE controls. A custom content string hides that UI.
   // Keep the chain metadata in flavor and flags, not in the Roll body.
   const message=await roll.toMessage({title:item.name,speaker,
     flavor:`ability: Agility<br/>power: ${item.name}<br/>damagetype: health, [ability] agl<br/>`+
       `<strong>Ricochete ${next.step}</strong>: novo ataque contra ${foundry.utils.escapeHTML(targetRef.name)}; `+
       `sem nova Ação Padrão ou Focus. Distância acumulada: ${checked.travel.toFixed(1)} / ${rank(actor)*10} espaços.`,
     flags:{[SYSTEM]:flags}}, {messageMode,itemId:item.id});
   if(!message?.id)throw Error('O novo ataque de ricochete não foi publicado.');
   if(edges.sources.length&&edges.autoCount){
     try{await resolveConditionReroll(message,edges);}
     catch(error){console.warn('[D616] Ricochete: rerrolagem opcional indisponível',error);}
   }
   return message;
 }catch(error){
   // A transient chat/roll failure must not consume the optional bounce.
   await source.unsetFlag?.(SYSTEM,'ricoShieldConsumed');
   throw error;
 }
}
export function registerRicoShieldHooks({chooseTargets=chooseSmartTargets}={}){
 Hooks.on('renderChatMessageHTML',(message,html)=>{
   if(!(html instanceof HTMLElement)||!message?.rolls?.length)return;
   const {actor,item}=powerForMessage(message);
   if(!isRicochetPower(item))return;
   const ok=ricoEligibility({source:message,ready:message.getFlag(SYSTEM,'ricoShieldReady'),
     actor,item,user:game.user,combat:game.combat});
   if(!ok.ok)return;
   if(html.querySelector(`.${BUTTON}`))return;
   const container=html.querySelector('.message-content')??html;
   const button=document.createElement('button');button.type='button';
   button.className=BUTTON;button.dataset.messageId=message.id;
   button.textContent=`↪ ${item.name}: atacar outro alvo (sem nova Ação/Focus)`;
   container.appendChild(button);
 });
 document.addEventListener('click',async event=>{
   const button=event.target?.closest?.(`.${BUTTON}`);if(!button)return;
   event.preventDefault();event.stopImmediatePropagation();
   const sourceId=button.dataset.messageId;
   if(!sourceId||pending.has(sourceId))return;
   const message=game.messages?.get?.(sourceId);
   if(!message)return;
   pending.add(sourceId);button.disabled=true;
   try {
     const {item}=powerForMessage(message);
     if(!item)throw Error('O poder do ataque original não foi encontrado.');
     // Each bounce gets the SAME target picker as an ordinary power attack,
     // even if the client uses the default manual-targeting preference.
     // Cancellation costs nothing, creates no roll and does not consume bounce.
     if(!await chooseTargets(item,{force:true,requireTargets:true}))return;
     await useRicoShieldBounce(message);
   }
   catch(error){ui.notifications?.warn?.(`Ricochete: ${error.message}`);}
   finally {pending.delete(sourceId);button.disabled=false;}
 },true);
}
