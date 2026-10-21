/** Multiverse D616 v0.2.64 — Rico-Shield's optional Fantastic bounce.
 * Each ricochet is a NEW independent attack roll against a DIFFERENT token,
 * but never a second activation, action, Focus cost or shield throw.
 * The Narrator must first confirm the previous Fantastic hit's damage.
 */
import { automationEnabled } from './automation-settings.mjs';
import { getMarvelOutcome, normalizeConditionDefense } from './power-conditions.mjs';
import { rollSignature } from './multi-target-combat.mjs';
import { centerDistanceInSpaces, sightCollision } from './combat-preflight.mjs';
import { resolveConditionEdges, resolveConditionReroll } from './condition-edge.mjs';

const SYSTEM='multiverse-d616';
const BUTTON='m616-rico-follow-up';
export const RICOCHET_POWERS=Object.freeze(['Rico-Shield','Elemental Ricochet']);
export function isRicochetPower(item){return item?.type==='power'&&RICOCHET_POWERS.includes(item.name);}
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
 if(!automationEnabled('extraAttacks'))return {ok:false,reason:'Ataques adicionais desativados nas configurações.'};
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
export async function confirmRicoShieldDamage(damageMessage,action,results){
 if(!automationEnabled('extraAttacks')||action==='heal')return false;
 if(!game.user?.isGM)return false;
 const sourceId=damageMessage?.getFlag?.(SYSTEM,'sourceMessageId');
 const source=sourceId?game.messages?.get?.(sourceId):null;
 const {actor,item}=source?powerForMessage(source):{};
 if(!isRicochetPower(item)||!actor)return false;
 const chain=source.getFlag(SYSTEM,'ricoShield');
 const target=chain?.lastTargetUuid;
 if(!target||source.getFlag(SYSTEM,'ricoShieldConsumed'))return false;
 const signature=rollSignature(source.rolls?.[0]);
 if(damageMessage?.getFlag?.(SYSTEM,'damageApplication')?.rollSignature!==signature)return false;
 const matched=results?.some(r=>r.targetUuid===target&&!r.blocked&&!r.heal);
 if(!matched)return false;
 const token=await globalThis.fromUuid?.(target);
 if(!token?.actor)return false;
 const defenseKey=normalizeConditionDefense(source.getFlag(SYSTEM,'attackTarget')??'agl',token.actor);
 const defense=Number(token.actor.system?.abilities?.[defenseKey]?.defense??0);
 const outcome=getMarvelOutcome(source.rolls[0],defense);
 if(!outcome?.success||!outcome.fantastic)return false;
 // Do not offer the next bounce before the GM has confirmed REAL damage.
 // The prior attack may have been absorbed entirely by a separate barrier.
 await source.setFlag(SYSTEM,'ricoShieldReady',{
   rollSignature:signature,targetUuid:target,damageMessageId:damageMessage.id,confirmed:true,
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
   const message=await roll.toMessage({title:item.name,speaker,
     flavor:`ability: Agility<br/>power: ${item.name}<br/>damagetype: health, [ability] agl`,
     content:`<p><b>${item.name} — Ricochete ${next.step}</b></p><p>Ataque extra contra ${foundry.utils.escapeHTML(targetRef.name)}. Sem nova Ação Padrão nem Focus.</p><p>Distância acumulada: ${checked.travel.toFixed(1)} / ${rank(actor)*10} espaços.</p>`,
     flags:{[SYSTEM]:flags}}, {messageMode,itemId:item.id});
   if(edges.sources.length&&edges.autoCount)await resolveConditionReroll(message,edges);
   return message;
 }catch(error){
   // A transient chat/roll failure must not consume the optional bounce.
   await source.unsetFlag?.(SYSTEM,'ricoShieldConsumed');
   throw error;
 }
}
export function registerRicoShieldHooks(){
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
   try {await useRicoShieldBounce(message);}
   catch(error){ui.notifications?.warn?.(`Ricochete: ${error.message}`);}
   finally {pending.delete(sourceId);button.disabled=false;}
 },true);
}
