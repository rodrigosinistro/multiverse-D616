/**
 * Macros_D616 v0.2.196: atomic owner-authenticated, GM-authoritative support powers.
 * No GM-executed macro code, no arbitrary document paths or supplied formulas.
 * Only exact registered official powers enter this dispatcher.
 * Requests are submitted via the WORLD base Actor as owner-permitted atomic
 * JSON string flag updates. Foundry updateActor only exposes CHANGED FIELDS;
 * a nested object flag yields incomplete incremental diffs (the confirmed
 * v0.2.191-195 live-client issue). A single serialized string always carries
 * the entire packet in one changed field. updateActor userId authenticates
 * its sender. A normal untrusted socket message is NOT used.
 */
import {focusSpendLimit,focusAvailable,validateFocusSpend} from './focus-cost.mjs';
import {promptD616FocusExtra,chooseD616Dialog} from './dialog-v14.mjs';
import {resolveNativePowerAutomation} from './native-power-automations.mjs';
import {chooseSmartTargets} from './smart-targets.mjs';
import {inspectFortuneTargets,applyFortuneConcentration} from './native-power-fortune.mjs';
import {inspectJinxTouchMessage} from './native-power-touch.mjs';
import {nativePowerResultMessage} from './native-power-chat.mjs';
import {canCreateTacticalOnce,createTacticalOnce} from './native-power-tactical-once.mjs';
import {inspectHurledShieldBlock,commitHurledShieldBlock} from './native-power-hurled-shield.mjs';
const SYSTEM='multiverse-d616';
const REQUEST='nativeSupportPlayerRequestV2';
const RESULT='nativeSupportPlayerResultV2';
const RULES=Object.freeze({
  'Healing::Healing Hands':Object.freeze({id:'v4wnQsxkb32CNQay',min:10,kind:'heal',resource:'health',action:'standard'}),
  'Healing::Soothing Touch':Object.freeze({id:'9I9DWkokKaIbn5Z6',min:10,kind:'heal',resource:'focus',action:'standard'}),
  'Basic::Inspiration':Object.freeze({id:'2R91cvYJiOvcpkgy',min:0,kind:'edge',action:'standard'}),
  'Tactics::Battle Plan':Object.freeze({id:'bOANdTD4xJzT89Wh',min:10,kind:'edge',action:'standard'}),
  'Tactics::Keep Moving':Object.freeze({id:'OGG5E7tOsgNjYN9h',min:0,kind:'clear',action:'reaction'}),
  'Tactics::On Your Feet':Object.freeze({id:'cyTvEpX8ksmKkRRJ',min:5,kind:'stand',action:'reaction'}),
  'Tactics::Rally on Me':Object.freeze({id:'cqeheSqQsI2QgOHA',min:10,kind:'rally',action:'standard'}),
  // v203: one eligible ally receives one roll-only tactical effect.
  'Tactics::Change of Plans':Object.freeze({id:'Iqikk9oo5YrtztBc',min:5,kind:'tactical-once',modifier:'edge',action:'reaction'}),
  'Tactics::Combat Support':Object.freeze({id:'n7LkZDiJaeOk3ChY',min:10,kind:'tactical-once',modifier:'marvelM',action:'standard'}),
  // v207: use the same authenticated GM channel for a single allied Shield RD,
  // keeping its official registration under the reactive-guard handler.
  'Shield Bearer::Hurled Shield Block':Object.freeze({id:'327efF8NUh544gW0',min:5,kind:'shield-block',action:'reaction'}),
  // v200: selected, consenting allies take Prone; attack cancellation and
  // Scatter's half-speed movement are still adjudicated by the Narrator.
  'Tactics::Hit the Dirt':Object.freeze({id:'P98NrsKdIy43geOF',min:5,kind:'prone',action:'reaction'}),
  'Tactics::Scatter':Object.freeze({id:'ZuG8VGoLf8zsQtGz',min:10,kind:'prone',action:'reaction',movement:'half-away'}),
  // v198: Jinx You now requires a real Marvel Melee touch-check card before
  // the GM may commit the target's Trouble. Sight/hearing remain narrative.
  'Luck::Lucky You':Object.freeze({id:'aDQAA9CNtLbW8OoP',min:5,kind:'fortune',action:'standard',sign:1,targetMode:'single-ally',touch:true}),
  'Luck::Wish You Luck':Object.freeze({id:'ZG9F6lSg6MlALFvP',min:5,kind:'fortune',action:'standard',sign:1,targetMode:'single-ally',range:'rank5'}),
  'Luck::Lucky Us':Object.freeze({id:'MfC05kdl2BW3ql4R',min:10,kind:'fortune',action:'standard',sign:1,targetMode:'multi-ally',range:'rank5'}),
  'Luck::Evil Eye':Object.freeze({id:'zFthXeiXzdI646hT',min:5,kind:'fortune',action:'standard',sign:-1,targetMode:'single-enemy',range:'rank5'}),
  'Luck::Jinx You':Object.freeze({id:'c2t2WUvH8Bx4Qnzi',min:5,kind:'fortune',action:'standard',sign:-1,targetMode:'touch-foe',touch:true}),
  'Luck::Jinx You All':Object.freeze({id:'5BtL6zSWMG42soLy',min:10,kind:'fortune',action:'standard',sign:-1,targetMode:'multi-enemy',range:'rank5'}),
  'Tactics::Focus Fire':Object.freeze({id:'inK06lDXeL653TFf',min:10,kind:'fortune',action:'standard',sign:1,targetMode:'focus-fire'}),
  'Tactics::Operations Center':Object.freeze({id:'j9lS4vUptRActg2k',min:15,kind:'fortune',action:'standard',sign:1,targetMode:'operations-center'}),
});
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const integer=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeGM=()=>!!game?.user?.isGM&&(!game.users?.activeGM||game.user.id===game.users.activeGM.id);
const requests=new Map(),processing=new Set(),processingActors=new Set();
const ownerLevel=()=>globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3;
const field=(change,name)=>change?.flags?.[SYSTEM]?.[name]??change?.[`flags.${SYSTEM}.${name}`]??change?.flags?.[`${SYSTEM}.${name}`];
/** Transport packets must be ATOMIC. Foundry can delta-compress an object flag
 * into only changed leaf fields, omitting sceneId, sourceTokenId, targetIds, etc.
 * A string on a fresh flag is replaced as a whole, even when only one property
 * changes between requests. A request is NOT authorized by this serialization:
 * GM still validates the authenticated user, actor, scene, token, embedded
 * official power, target IDs, cost and action rules before executing anything.
 */
export function encodeSupportPacket(packet){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('Pacote de suporte inválido.');
  const raw=JSON.stringify(packet);
  if(raw.length>8192)throw new Error('Pacote de suporte excede o limite.');
  return raw;
}
export function decodeSupportPacket(raw){
  if(typeof raw!=='string'||raw.length===0||raw.length>8192)return null;
  try{
    const obj=JSON.parse(raw);
    if(!obj||typeof obj!=='object'||Array.isArray(obj)||typeof obj.id!=='string'||obj.id.length<1||obj.id.length>128)return null;
    return obj;
  }catch{return null;}
}

export function nativeSupportRule(item){
  if(item?.type!=='power')return null;
  const rule=RULES[`${item?.system?.powerSet}::${item?.name}`];
  if(!rule)return null;
  const official=resolveNativePowerAutomation(item);
  return ['native-active','native-partial'].includes(official?.status) && official?.powerId===rule.id&&official?.handlerId===(rule.kind==='shield-block'?'reactive-guard':rule.kind)?rule:null;
}
export function hasStatus(actor,id){
  return list(actor?.effects).some(e=>!e.disabled&&e.duration?.expired!==true&&list(e.statuses).includes(id)) ||
    list(actor?.statuses).includes(id);
}
function canChange(actor){return actor?.update&&Number.isFinite(Number(actor?.system?.focus?.value));}
/** Always resolve a token from the authoritative Scene collection. Avoid
 * comparing TokenDocument.parent to a Scene object from another client: its
 * contextual/embedded references are not what authenticates the request.
 */
const tokenDocs=scene=>list(scene?.tokens).map(t=>t?.document??t).filter(Boolean);
function tokenAt(scene,id){
  if(!scene || typeof id!=='string' || !id)return null;
  const fromCollection=scene.tokens?.get?.(id)??scene.getEmbeddedDocument?.('Token',id)??
    tokenDocs(scene).find(t=>t.id===id);
  const token=fromCollection?.document??fromCollection;
  // The lookup is restricted to the specified Scene, not to the canvas, a
  // client-supplied arbitrary UUID or any other world collection.
  return token?.id===id?token:null;
}
export function tokenBelongsToScene(token,scene){
  return !!token?.id && !!tokenAt(scene,token.id);
}
/** GM and player can receive different synthetic Actor UUIDs for the same
 * unlinked token. Verify token ancestry and its base actorId, not solely the
 * client-side synthetic Actor UUID. Never accept an arbitrary target token. */
/** Foundry v14 TokenDocument.actor may be an unlinked synthetic Actor, while
 * TokenDocument.baseActor is the stable world document across all clients.
 * isToken (not the mere existence of actor.token) distinguishes both cases.
 */
export function isCasterToken(token,caster,scene){
  if(!token||!caster||!tokenBelongsToScene(token,scene))return false;
  const canonical=tokenAt(scene,token.id);
  if(token!==canonical){
    // A placeable/document wrapper is fine. A forged object with an existing
    // token ID but a different Actor or parent Scene is never accepted.
    if((token.actorId&&token.actorId!==canonical.actorId)||
       (token.actor?.uuid&&token.actor.uuid!==canonical.actor?.uuid)||
       (token.parent?.id&&token.parent.id!==scene.id))return false;
  }
  if(canonical.actor?.uuid===caster.uuid)return true;
  if(caster.isToken===true){
    const tokenDoc=caster.token??(caster.parent?.documentName==='Token'?caster.parent:null);
    return !!tokenDoc?.id&&tokenDoc.id===canonical.id&&tokenBelongsToScene(tokenDoc,scene);
  }
  return !!canonical.actorId&&canonical.actorId===caster.id;
}
export function findCasterToken(caster,scene,controlled=[]){
  return [...list(controlled),...list(scene?.tokens)].map(t=>t.document??t).find(t=>isCasterToken(t,caster,scene))??null;
}
/** A player always submits the authenticated request on the WORLD actor,
 * while the target selection and actual effects stay bound to the chosen
 * token's effective Actor (including unlinked ActorDelta overrides).
 */
export function supportRequestChannel(caster,sourceToken){
  const base=sourceToken?.baseActor??game?.actors?.get?.(sourceToken?.actorId)??
    (caster?.isToken===true?null:caster);
  if(!base||base.isToken===true||!sourceToken?.actorId||base.id!==sourceToken.actorId)return null;
  return base;
}
/** A world Actor's updateActor userId authenticates the transport channel.
 * The channel does not need to be the token's base Actor: Foundry v14 clients
 * can resolve a synthetic token's ancestry differently. The GM authorizes
 * the *operation* independently using the effective Actor on the trusted Scene
 * and the actual authenticated player, not an equality assertion between two
 * client-resolved Actor IDs. Both channel and effective Actor require OWNER.
 * Arbitrary code/formulas or unowned token actions are never accepted.
 */
export function resolveSupportGMContext({requestActor,request,scene,user}={}){
  if(!scene?.id)throw new Error('Cena da solicitação não encontrada no mundo do Mestre.');
  if(!requestActor?.id||requestActor?.isToken===true)
    throw new Error('Canal de solicitação inválido: é necessário um Actor mundial.');
  let sourceToken=tokenAt(scene,request?.sourceTokenId);
  // If the selected client's token ID cannot be resolved in the GM's Scene
  // view, an UNAMBIGUOUS base-Actor match can recover a legitimate request.
  // Never fall back across scenes or to a token belonging to another Actor.
  if(!sourceToken && request?.sourceActorId===requestActor.id){
    const candidates=tokenDocs(scene).filter(t=>t.actorId===requestActor.id &&
      t.actor?.testUserPermission?.(user,ownerLevel()));
    if(candidates.length===1)sourceToken=candidates[0];
    else if(candidates.length>1)throw new Error('Mais de um token deste personagem na cena: selecione um token de origem único.');
  }
  if(!sourceToken)throw new Error('Token de origem não encontrado na cena informada.');
  if(request?.sourceActorId && sourceToken.actorId!==request.sourceActorId)
    throw new Error('O token de origem não corresponde ao Actor-base informado.');
  // The channel Actor is never used as the caster. The scene/token/actor are
  // resolved by the GM, and both permissions are checked with the server-
  // authenticated userId from updateActor (not a userId in the request).
  const caster=sourceToken.actor;
  if(!requestActor.testUserPermission?.(user,ownerLevel())||
      !caster?.testUserPermission?.(user,ownerLevel()))
    throw new Error('Você precisa ser DONO do personagem.');
  if(!caster?.items)throw new Error('Personagem do token indisponível ao Mestre.');
  const powerId=String(request?.powerId??'');
  if(!/^[a-zA-Z0-9]{16}$/.test(powerId))throw new Error('Identidade do poder inválida.');
  const exact=caster.items.get?.(request?.itemId);
  const valid=item=>nativeSupportRule(item)?.id===powerId;
  let item=null;
  if(exact){
    if(!valid(exact))throw new Error('O poder solicitado não corresponde ao item do personagem.');
    item=exact;
  }else{
    // Token Actor copies can have different Item IDs, but official compendium
    // identity must still resolve to exactly one owned embedded power.
    const matches=list(caster.items).filter(valid);
    if(matches.length!==1)throw new Error('Poder oficial indisponível neste personagem.');
    item=matches[0];
  }
  return {caster,item,sourceToken};
}
function overlapsOrTouches(source,target,size){
  // Touch means adjacent rectangles, including diagonals, not one empty square
  // between them. Token widths are in grid cells and can differ.
  if(!Number.isFinite(size)||size<=0)return false;
  const rect=t=>({x:Number(t.x),y:Number(t.y),w:Number(t.width)*size,h:Number(t.height)*size});
  const a=rect(source),b=rect(target);
  if(!Object.values(a).every(Number.isFinite)||!Object.values(b).every(Number.isFinite))return false;
  const dx=Math.max(0,a.x-(b.x+b.w),b.x-(a.x+a.w));
  const dy=Math.max(0,a.y-(b.y+b.h),b.y-(a.y+a.h));
  return dx<1e-6&&dy<1e-6;
}
const affectedResource=(actor,key)=>{
  const current=Number(actor?.system?.[key]?.value),max=Number(actor?.system?.[key]?.max);
  if(!Number.isFinite(current)||!Number.isFinite(max)||max<=0)return null;
  return {current,maximum:max};
};
function effectTargets(actor,ids){
  return list(actor?.effects).filter(e=>!e.disabled&&list(e?.statuses).some(s=>ids.includes(s)));
}
async function clearStatuses(actor,allowed){
  let removed=0;
  for(const effect of effectTargets(actor,allowed)){
    const before=list(effect?.statuses),remaining=before.filter(s=>!allowed.includes(s));
    if(remaining.length===before.length)continue;
    if(remaining.length)await effect.update({statuses:remaining});
    else await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);
    removed+=before.length-remaining.length;
  }
  return removed;
}
export function inspectSupportRequest({caster,item,scene,sourceToken,targetTokens=[],spent,combat=null}={}){
  const rule=nativeSupportRule(item);
  if(!caster||!rule||item.actor?.uuid!==caster.uuid)return {ok:false,reason:'Poder oficial indisponível neste personagem.'};
  if(!isCasterToken(sourceToken,caster,scene))
    return {ok:false,reason:'Selecione o token do personagem na cena dos alvos.'};
  if(!integer(spent)||Number(spent)<rule.min || (rule.kind==='heal'&&Number(spent)<=0))
    return {ok:false,reason:'Gasto de Focus abaixo do custo mínimo.'};
  const spendCheck=validateFocusSpend(caster,Number(spent));
  if(!spendCheck.ok)return spendCheck;
  if(rule.kind==='shield-block'&&Number(spent)!==5)
    return {ok:false,reason:'Hurled Shield Block exige exatamente 5 Focus.'};
  if(!targetTokens.length || (!['stand','rally','edge','fortune','prone'].includes(rule.kind)&&targetTokens.length!==1) || (item.name==='Inspiration'&&targetTokens.length!==1))
    return {ok:false,reason:'Marque a quantidade correta de alvos.'};
  const distinct=new Set(targetTokens.map(t=>t?.id));
  if(distinct.size!==targetTokens.length)return {ok:false,reason:'Alvos repetidos.'};
  if(rule.kind==='shield-block'){
    if(targetTokens.length!==1)return {ok:false,reason:'Hurled Shield Block protege exatamente um aliado.'};
    const examined=inspectHurledShieldBlock({caster,sourceToken,targetToken:targetTokens[0],scene,combat});
    return examined.ok?{ok:true,rule}:examined;
  }
  if(rule.kind==='fortune'){
    const examined=inspectFortuneTargets({caster,item,scene,sourceToken,targetTokens,rule,combat});
    return examined.ok?{ok:true,rule}:examined;
  }
  const size=Number(scene.grid?.size??globalThis.canvas?.grid?.size??0);
  if(rule.kind==='tactical-once'){
    if(!combat?.started)return {ok:false,reason:'Este poder tático exige combate ativo.'};
    if(targetTokens.length!==1||targetTokens[0]?.actor?.uuid===caster.uuid)return {ok:false,reason:'Selecione exatamente um aliado diferente do lançador.'};
    if(!list(combat.combatants).some(c=>c.actor?.uuid===caster.uuid||c.actorId===caster.id))
      return {ok:false,reason:'O lançador precisa estar na iniciativa.'};
    if(!canCreateTacticalOnce(targetTokens[0]?.actor,rule.modifier,combat))
      return {ok:false,reason:'O alvo já possui esse benefício tático pendente.'};
    if(item.name==='Combat Support'&&caster.flags?.[SYSTEM]?.nativeCombatSupportUsedCombatId===combat.id)
      return {ok:false,reason:'Combat Support já foi utilizado neste combate.'};
  }
  if(rule.kind==='edge'&&!combat?.started)return {ok:false,reason:'A inspiração temporária exige combate ativo para expirar no início do próximo turno.'};
  if(rule.kind==='prone'){
    if(!combat?.started)return {ok:false,reason:`${item.name} exige combate ativo para uso de Reação.`};
    const rank=Number(caster.system?.attributes?.rank?.value);
    if(item.name==='Scatter'&&(!Number.isInteger(rank)||rank<1||targetTokens.length>rank))
      return {ok:false,reason:'Scatter permite no máximo Rank aliados.'};
  }
  if(rule.kind==='rally'||item.name==='Battle Plan'){
    if(!combat?.started)return {ok:false,reason:`${item.name} exige combate ativo para expiração segura do efeito.`};
    if(rule.kind==='rally'&&caster.flags?.[SYSTEM]?.nativeSupportRallyCombatId===combat.id)return {ok:false,reason:'Rally on Me já foi utilizado neste combate.'};
    const vig=Number(caster.system?.abilities?.vig?.value);
    if(!Number.isInteger(vig)||vig<=0||targetTokens.length>vig)
      return {ok:false,reason:'Rally on Me excede o limite de aliados (Vigilance).'};
  }
  for(const target of targetTokens){
    if(!target?.actor||!tokenBelongsToScene(target,scene))
      return {ok:false,reason:'Alvo inválido ou fora da cena.'};
    if(rule.kind==='heal'&&!overlapsOrTouches(sourceToken,target,size))
      return {ok:false,reason:`${item.name} exige tocar o alvo.`};
    if(rule.kind==='heal'){
      const pool=affectedResource(target.actor,rule.resource);
      if(!pool || pool.current>=pool.maximum)return {ok:false,reason:`${item.name}: o alvo não precisa recuperar ${rule.resource==='health'?'Health':'Focus'}.`};
    }
    if(rule.kind==='clear'&&!['mmrpg.stunned','mmrpg.demoralized'].some(s=>hasStatus(target.actor,s)))
      return {ok:false,reason:'Keep Moving exige um aliado atordoado ou desmoralizado.'};
    if(rule.kind==='prone'){
      if(target.actor.uuid===caster.uuid)return {ok:false,reason:`${item.name} afeta aliados, não o lançador.`};
      if(hasStatus(target.actor,'mmrpg.prone'))return {ok:false,reason:`${target.actor.name} já está Caído.`};
      if(hasStatus(target.actor,'mmrpg.incapacitated'))return {ok:false,reason:`${target.actor.name} não pode escolher se jogar no chão.`};
    }
    if(rule.kind==='stand'&&!hasStatus(target.actor,'mmrpg.prone'))
      return {ok:false,reason:'On Your Feet exige alvos caídos.'};
    if(rule.kind==='rally'){
      if(!overlapsOrTouches(sourceToken,target,size))return {ok:false,reason:'Rally on Me: o aliado deve estar ao alcance após se movimentar.'};
      const pool=affectedResource(target.actor,'focus');
      if(!pool||pool.current>=pool.maximum)return {ok:false,reason:'Rally on Me: um alvo já está com Focus completo.'};
    }
    // Healing may target self. Tactics and Inspiration affect allies, not enemies.
    if(['edge','tactical-once'].includes(rule.kind)&&target.actor.uuid===caster.uuid)return {ok:false,reason:'Inspiration/Battle Plan precisam beneficiar aliados.'};
    if(rule.kind!=='heal'&&target.actor.uuid!==caster.uuid){
      if(Number(target.disposition)!==Number(sourceToken.disposition))
        return {ok:false,reason:'Poder de Tactics requer alvos aliados.'};
    }
  }
  if(rule.kind==='stand'&&!targetTokens.some(t=>!hasStatus(t.actor,'mmrpg.incapacitated')))
    return {ok:false,reason:'Nenhum dos aliados caídos consegue se levantar.'};
  return {ok:true,rule};
}
export async function executeNativeSupportTransaction({caster,item,scene,sourceToken,targetTokens,spent,combat,
  attackMessageId=null,requestUser=globalThis.game?.user,requestItemId=item?.id}={}){
  const validated=inspectSupportRequest({caster,item,scene,sourceToken,targetTokens,spent,combat});
  if(!validated.ok)throw new Error(validated.reason);
  const {rule}=validated;
  if(rule.kind==='shield-block'){
    // Delegated one-shot transaction: GM validates the target, commits the
    // Reaction and Focus once, then creates a token-scoped one-use effect.
    return commitHurledShieldBlock({caster,item,sourceToken,targetToken:targetTokens[0],scene,combat});
  }
  const isJinxTouch=rule.kind==='fortune'&&rule.targetMode==='touch-foe';
  // Only the actual final Marvel dice card can authorize Jinx You. GM validates
  // the rolling user, official power, source, target and current Melee defense.
  // The packet itself NEVER contains a trusted `hit` or `fantastic` boolean.
  const jinx=isJinxTouch?inspectJinxTouchMessage({
    request:{powerId:rule.id,itemId:requestItemId,attackMessageId,
      sceneId:scene.id,sourceTokenId:sourceToken?.id,targetIds:targetTokens.map(t=>t.id)},
    message:globalThis.game?.messages?.get?.(attackMessageId),user:requestUser,scene,
    sourceToken,targetToken:targetTokens[0]
  }):null;
  if(jinx&&!jinx.ok)throw new Error(jinx.reason);
  const state=game.multiverseD616?.turnTracker;
  if(rule.action==='reaction'&&combat?.started){
    const combatant=list(combat.combatants).find(c=>c.actor?.uuid===caster.uuid||c.actorId===caster.id);
    const resource=combatant?state?.getState?.(combatant):null;
    if(!resource||!Number.isFinite(Number(resource.reactionUsed))||!Number.isFinite(Number(resource.reactionMax))||
      Number(resource.reactionUsed)>=Number(resource.reactionMax))throw new Error('O personagem não possui Reação disponível.');
  }
  const start=focusAvailable(caster);
  if(!canChange(caster))throw new Error('Focus do personagem está indisponível.');
  // Lock the touch roll BEFORE mutating resources. A repeated request with a
  // new request ID cannot apply the same hit or spend the same attack again.
  // Retro EDGE/TROUBLE also refuses to modify a settled touch check.
  if(jinx)await jinx.message.setFlag(SYSTEM,'nativeJinxTouchResolved',{
    processed:true,hit:jinx.hit,sign:jinx.fantastic?'fantastic':'normal',
    sceneId:scene.id,sourceTokenId:sourceToken.id,targetTokenId:targetTokens[0].id,
  });
  // Costs are committed by this one GM-owned transaction, not Item.roll().
  if(spent>0)await caster.update({'system.focus.value':start-spent});
  let committed=0;
  try{
    const events=[];
    if(rule.kind==='fortune'){
      if(jinx&&!jinx.hit){
        // A missed touch still uses its Standard Action and the initial 5 Focus,
        // but NEVER creates Concentration, maintenance or an enemy Trouble.
        try{await state?.trackItemUse?.(item);}catch(error){console.warn('[D616] Tracker Jinx You:',error);}
        events.push(`Jinx You: teste Melee ${jinx.total} contra Defesa ${jinx.defense} — ERROU. Nenhum Trouble aplicado`);
        try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:caster}),
          ...nativePowerResultMessage(item,`<p><strong>Jinx You</strong> — toque não acertou; Focus gasto: ${spent}. Nenhuma Concentração ou Trouble criada.</p>`)});}
        catch(error){console.warn('[D616] Chat de Jinx You:',error);}
        return {ok:true,events,spent,hit:false};
      }
      // The v196 atomic channel remains the only cross-user transport.
      // Existing concentration maintenance handles every later Focus payment.
      const applied=await applyFortuneConcentration({caster,item,scene,sourceToken,targetTokens,rule,combat});
      committed=applied.changed;
      events.push(`${item.name}: efeito de ${rule.sign>0?'Edge':'Trouble'} aplicado em ${applied.changed} alvo(s) durante a Concentração`);
      if(jinx)events.push(jinx.fantastic?'Toque Melee FANTÁSTICO: dano Melee normal pelo card, não dobrado':'Toque Melee acertou: Jinx You ativado');
      if(item.name==='Lucky Us')events.push(`${caster.name}: Edge do próprio lançador`);
      try{await state?.trackItemUse?.(item);}catch(error){console.warn('[D616] Tracker de sorte:',error);}
      try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:caster}),
        ...nativePowerResultMessage(item,`<p><strong>${esc(item.name)}</strong> — automação nativa.</p><p>${events.map(esc).join('; ')}</p><p>Focus inicial: ${spent}; manutenção por turno ativa. Rerolls manuais.</p>`)});}catch(error){console.warn('[D616] Chat de sorte:',error);}
      return {ok:true,events,spent};
    }
    for(const token of targetTokens){
      const target=token.actor;
      if(rule.kind==='heal'||rule.kind==='rally'){
        const resource=rule.kind==='rally'?'focus':rule.resource;
        const pool=affectedResource(target,resource);
        const rank=Number(caster.system?.attributes?.rank?.value);
        const gain=rule.kind==='rally'?5*rank:Number(spent);
        // If the caster is also the target, read the current post-cost pool.
        const real=affectedResource(target,resource);
        const after=Math.min(real.maximum,real.current+gain);
        await target.update({[`system.${resource}.value`]:after});
        committed++;
        events.push(`${target.name}: +${after-real.current} ${resource==='focus'?'Focus':'Health'}`);
      }else if(rule.kind==='tactical-once'){
        await createTacticalOnce({source:caster,target,item,kind:rule.modifier,combat});
        committed++;events.push(`${target.name}: ${rule.modifier==='marvelM'?'dado Marvel M (1), protegido de Trouble':'1 Edge manual'} no próximo teste de ação`);
      }else if(rule.kind==='prone'){
        // The selected player/GM has already confirmed the ally's voluntary
        // action, and any Scatter movement is handled on the scene first.
        if(typeof target.toggleStatusEffect!=='function')
          throw new Error(`Não é possível aplicar Caído em ${target.name}.`);
        await target.toggleStatusEffect('mmrpg.prone',{active:true});
        committed++;
        events.push(`${target.name}: Caído (escolha voluntária confirmada)`);
      }else if(rule.kind==='edge'){
        const sourceCombatant=list(combat?.combatants).find(c=>c.actor?.uuid===caster.uuid||c.actorId===caster.id);
        if(!sourceCombatant)throw new Error('Efeito temporário exige que o lançador participe do combate.');
        const previous=list(target.effects).filter(e=>e.flags?.[SYSTEM]?.nativeSupportEdge?.sourceActorUuid===caster.uuid &&
          e.flags?.[SYSTEM]?.nativeSupportEdge?.itemId===item.id);
        if(previous.length)await target.deleteEmbeddedDocuments('ActiveEffect',previous.map(e=>e.id));
        await target.createEmbeddedDocuments('ActiveEffect',[{name:`${item.name} — Inspiração`,img:item.img,disabled:false,transfer:false,changes:[],
          duration:{},flags:{[SYSTEM]:{nativeSupportEdge:{version:1,sourceActorUuid:caster.uuid,itemId:item.id,
            combatId:combat.id,round:combat.round,turn:combat.turn}}}}]);
        committed++;events.push(`${target.name}: 1 Edge até o próximo turno do lançador`);
      }else{
        if(rule.kind==='stand'&&hasStatus(target,'mmrpg.incapacitated')){
          events.push(`${target.name}: incapaz de levantar, não afetado`);
          continue;
        }
        const statuses=rule.kind==='stand'?['mmrpg.prone']:['mmrpg.stunned','mmrpg.demoralized'];
        const removed=await clearStatuses(target,statuses);
        if(!removed)throw new Error(`A condição já não está ativa em ${target.name}.`);
        committed++;
        events.push(`${target.name}: condição removida`);
      }
    }
    if(rule.kind==='tactical-once'&&item.name==='Combat Support')
      await caster.update({[`flags.${SYSTEM}.nativeCombatSupportUsedCombatId`]:combat.id});
    if(rule.kind==='rally')await caster.update({[`flags.${SYSTEM}.nativeSupportRallyCombatId`]:combat.id});
    try{await state?.trackItemUse?.(item);}catch(error){console.warn('[D616] Tracker de suporte:',error);}
    try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:caster}),
      ...nativePowerResultMessage(item,`<p><strong>${esc(item.name)}</strong> — automação nativa.</p><p>${events.map(esc).join('; ')}.</p><p>Focus gasto: ${spent}. ${rule.kind==='stand'||rule.kind==='clear'?'Reação registrada quando o rastreador estiver habilitado.':''}</p>`)});}
    catch(error){console.warn('[D616] Chat de suporte:',error);}
    return {ok:true,events,spent};
  }catch(error){
    // Only refund if NO target was changed; otherwise a partial result is real
    // and the caster cannot receive the benefit for free.
    if(!committed&&spent>0){try{await caster.update({'system.focus.value':focusAvailable(caster)+spent});}catch(refund){console.error('[D616] Estorno de suporte falhou',refund);}}
    throw new Error(committed?`Efeito parcial aplicado (${committed} alvo/s): ${error?.message??error}. Focus não foi estornado.`:String(error?.message??error));
  }
}
async function gmProcess(actor,request,userId){
  if(!activeGM()||!request||typeof request.id!=='string'||request.id.length>128||!request.id)return;
  const user=game.users?.get?.(userId);
  if(!user||user.isGM||!user.active||!actor.testUserPermission?.(user,ownerLevel()))return;
  const key=`${actor.uuid}:${request.id}`;
  if(processing.has(key))return;
  if(processingActors.has(actor.uuid)){
    await actor.update({[`flags.${SYSTEM}.${RESULT}`]:encodeSupportPacket({id:request.id,ok:false,reason:'Já existe uma ativação de suporte em andamento neste personagem.'})});
    return;
  }
  const old=decodeSupportPacket(actor.flags?.[SYSTEM]?.[RESULT]);if(old?.id===request.id)return;
  processing.add(key);processingActors.add(actor.uuid);
  let response={id:request.id,ok:false,reason:'Solicitação de suporte recusada.'};
  try{
    const scene=game.scenes?.get?.(request.sceneId);
    const {caster,item,sourceToken}=resolveSupportGMContext({requestActor:actor,request,scene,user});
    const targetTokens=Array.isArray(request.targetIds)&&request.targetIds.length<=30
      ?request.targetIds.map(id=>tokenAt(scene,id)):[];
    const result=await executeNativeSupportTransaction({caster,item,scene,sourceToken,targetTokens,
      spent:request.spent,combat:game.combat,attackMessageId:request.attackMessageId,
      requestUser:user,requestItemId:request.itemId});
    response={id:request.id,...result};
  }catch(error){
    response={id:request.id,ok:false,reason:String(error?.message??error)};
    const rejectedScene=game.scenes?.get?.(request.sceneId);
    const source=tokenAt(rejectedScene,request.sourceTokenId);
    // A TEXT diagnostic is intentionally used so exported Foundry consoles
    // retain the actual evidence instead of collapsing it into 'Object'.
    console.warn(`[D616][SUPPORT-GM] ${String(error?.message??error)} | `+
      `scene=${request.sceneId??'none'} sceneFound=${!!rejectedScene} `+
      `source=${request.sourceTokenId??'none'} sourceFound=${!!source} `+
      `sceneTokens=${tokenDocs(rejectedScene).length} `+
      `sourceActor=${request.sourceActorId??'none'} `+
      `channelActor=${actor?.id??'none'} `+
      `channelOwner=${!!actor?.testUserPermission?.(user,ownerLevel())} `+
      `sourceOwner=${!!source?.actor?.testUserPermission?.(user,ownerLevel())} `+
      `targets=${Array.isArray(request.targetIds)?request.targetIds.length:'invalid'}`);
  }
  try{await actor.update({[`flags.${SYSTEM}.${RESULT}`]:encodeSupportPacket(response)});}
  catch(error){console.error('[D616] Não foi possível confirmar suporte ao jogador:',error);}
  finally{processing.delete(key);processingActors.delete(actor.uuid);}
}
export function registerNativeSupportRequestHooks(){
  const receive=(actor,changes,userId)=>{
    const answer=decodeSupportPacket(field(changes,RESULT));
    if(answer?.id&&userId===game.users?.activeGM?.id&&game.users?.get?.(userId)?.isGM)
      requests.get(answer.id)?.(answer);
    const request=decodeSupportPacket(field(changes,REQUEST));
    if(request?.id&&activeGM()&&userId&&!game.users?.get?.(userId)?.isGM)
      void gmProcess(actor,request,userId);
  };
  // Only world Actor updates are used as requests/acknowledgments. Synthetic
  // ActorDelta (updateToken) events have client-dependent identities and were
  // responsible for GM rejection and missing player confirmation in v192.
  Hooks.on('updateActor',(actor,changes,_opts,userId)=>{
    if(actor?.isToken===true)return;
    receive(actor,changes,userId);
  });
}
/** The next turn of the inspiring character ends one-round Edges. Only the
 * primary GM removes the effects; disabled/expired effects never grant Edge.
 */
export function registerNativeSupportExpiryHooks(){
  Hooks.on('updateCombat',(combat,changed)=>{
    if(!activeGM()||!combat?.started||(!Object.hasOwn(changed??{},'turn')&&!Object.hasOwn(changed??{},'round')))return;
    const current=combat.combatant?.actor?.uuid;
    if(!current)return;
    const actors=[...list(game.actors),...list(combat.combatants).map(c=>c.actor),
      ...list(game.scenes).flatMap(sc=>list(sc.tokens).map(t=>t.actor))].filter(Boolean);
    for(const actor of new Set(actors)){
      const stale=list(actor.effects).filter(e=>{
        const buff=e.flags?.[SYSTEM]?.nativeSupportEdge;
        return buff?.sourceActorUuid===current&&buff.combatId===combat.id&&
          (Number(combat.round)>Number(buff.round) ||
            (Number(combat.round)===Number(buff.round)&&Number(combat.turn)!==Number(buff.turn)));
      });
      if(stale.length)void actor.deleteEmbeddedDocuments('ActiveEffect',stale.map(e=>e.id))
        .catch(error=>console.error('[D616] Expiração de inspiração:',error));
    }
  });
  Hooks.on('deleteCombat',combat=>{
    if(!activeGM())return;
    const actors=[...list(game.actors),...list(game.scenes).flatMap(sc=>list(sc.tokens).map(t=>t.actor))].filter(Boolean);
    for(const actor of new Set(actors)){
      const stale=list(actor.effects).filter(e=>e.flags?.[SYSTEM]?.nativeSupportEdge?.combatId===combat.id);
      if(stale.length)void actor.deleteEmbeddedDocuments('ActiveEffect',stale.map(e=>e.id))
        .catch(error=>console.error('[D616] Limpeza de inspiração:',error));
    }
  });
}
if(globalThis.Hooks?.once)Hooks.once('ready',()=>{
  registerNativeSupportRequestHooks();registerNativeSupportExpiryHooks();
});

export async function dispatchNativeSupportPower(item,{rollJinxTouch=null}={}){
  const rule=nativeSupportRule(item);if(!rule)return false;
  try{
    const caster=item.actor,scene=canvas?.scene;
    if(!scene)throw new Error('Este poder exige uma cena ativa com tokens.');
    const sourceToken=findCasterToken(caster,scene,canvas.tokens?.controlled??[]);
    if(!sourceToken)throw new Error('Selecione o token do personagem na cena dos alvos.');
    // Support powers bypass the generic Item.roll pipeline. Explicitly reuse
    // its existing Foundry v14 target dialog even in manual targeting mode.
    // Cancelled selection never spends Focus, Action or Reação.
    const confirmedTargets=await chooseSmartTargets(item,{force:true,requireTargets:true});
    if(!confirmedTargets)return false;
    const targetTokens=list(game.user?.targets).map(t=>t.document??t).filter(t=>tokenBelongsToScene(t,scene));
    if(!targetTokens.length)throw new Error('Marque no mapa o(s) token(s) que receberão o poder.');
    const spent=rule.kind==='heal'
      ?await promptD616FocusExtra({title:`${item.name} — Focus investido`,min:rule.min,
        maxTotal:Math.min(focusSpendLimit(caster),focusAvailable(caster)),available:focusAvailable(caster),
        maxSpend:focusSpendLimit(caster),scalingHelp:`Cada 1 Focus recupera 1 ${rule.resource==='focus'?'Focus':'Health'} no alvo.`})
      :rule.min;
    if(spent===null)return false;
    const info=inspectSupportRequest({caster,item,scene,sourceToken,targetTokens,spent,combat:game.combat});
    if(!info.ok)throw new Error(info.reason);
    if(['edge','stand','rally','fortune','prone','tactical-once','shield-block'].includes(rule.kind)||rule.kind==='clear') {
      const confirmation=await chooseD616Dialog({title:`${item.name} — Confirmar aliados`,
        content:`<p>Confirme com o Mestre os pré-requisitos narrativos: linha de visão, alcance da voz/audição, alcance de toque e consentimento quando necessário. O acerto de Jinx You será resolvido pelo teste Melee.</p>${rule.kind==='shield-block'?'<p><strong>Hurled Shield Block:</strong> selecione o aliado atacado contra sua Agility. O sistema aplicará RD de Health de um ataque e removerá o efeito ao resolver o dano.</p>':''}${rule.kind==='prone'?'<p><strong>Somente aliados que concordaram em ficar Caídos.</strong> Scatter exige que os aliados movam metade da velocidade para longe antes de confirmar. Se isso invalidar o ataque inimigo, o Mestre decide manualmente.</p>':''}<p><strong>Alvos marcados:</strong> ${targetTokens.map(t=>esc(t.name??t.actor?.name)).join(', ')}</p>`,
        buttons:[{action:'yes',label:'Confirmar alvos',value:true},{action:'cancel',label:'Cancelar',value:false}],
        defaultAction:'yes'});
      if(!confirmation)return false;
    }
    let attackMessageId=null;
    if(rule.kind==='fortune'&&rule.targetMode==='touch-foe'){
      if(typeof rollJinxTouch!=='function')throw new Error('Jinx You: o motor de ataque Melee não está disponível.');
      const gm=game.users?.activeGM;
      if(!activeGM()&&(!gm?.active||!gm.isGM))throw new Error('É necessário Mestre conectado para Jinx You.');
      const card=await rollJinxTouch(item,sourceToken,targetTokens[0]);
      attackMessageId=card?.id;
      if(!attackMessageId)throw new Error('Jinx You: não foi possível publicar o teste Melee.');
      // No reroll is executed for the player. The player may click EDGE or
      // TROUBLE manually on the normal card, then confirms to settle that
      // exact, final roll. The GM independently verifies it before spending.
      await chooseD616Dialog({title:'Jinx You — Teste Melee de toque',
        content:'<p>O teste de <strong>Melee contra Defesa de Melee</strong> foi lançado no chat.</p><p>Finalize os <strong>EDGE/TROUBLE manualmente</strong> no card. Depois, clique em <strong>Concluir teste</strong>. Em caso de erro, os 5 Focus são gastos, mas Trouble/Concentração não são aplicados. No Fantástico, use DANO no card para aplicar dano Melee normal.</p>',
        buttons:[{action:'complete',label:'Concluir teste',value:true}],defaultAction:'complete',width:460});
    }
    const args={itemId:item.id,powerId:rule.id,sceneId:scene.id,sourceTokenId:sourceToken.id,
      sourceActorId:sourceToken.actorId??sourceToken.baseActor?.id??null,
      targetIds:targetTokens.map(t=>t.id),spent:Number(spent),...(attackMessageId?{attackMessageId}:{})};
    let response;
    if(activeGM())response=await executeNativeSupportTransaction({caster,item,scene,sourceToken,targetTokens,spent:Number(spent),combat:game.combat,
      attackMessageId,requestUser:game.user,requestItemId:item.id});
    else{
      const gm=game.users?.activeGM;
      if(!gm?.active||!gm.isGM)throw new Error('É necessário um Mestre conectado para alterar os recursos dos alvos.');
      const channel=supportRequestChannel(caster,sourceToken);
      if(!channel||!channel.testUserPermission?.(game.user,ownerLevel())||
          !sourceToken.actor?.testUserPermission?.(game.user,ownerLevel()))
        throw new Error('Você precisa ser DONO do personagem para solicitar esta automação.');
      const id=foundry?.utils?.randomID?.()??`${Date.now()}-${Math.random()}`;
      const pending=new Promise(resolve=>{const t=setTimeout(()=>{requests.delete(id);resolve({ok:false,reason:'Sem resposta do Mestre. Confira os recursos antes de repetir.'});},15000);
        requests.set(id,result=>{clearTimeout(t);requests.delete(id);resolve(result);});});
      try{await channel.update({[`flags.${SYSTEM}.${REQUEST}`]:encodeSupportPacket({...args,id})});}
      catch(error){requests.get(id)?.({ok:false,reason:'Não foi possível enviar solicitação ao Mestre.'});}
      response=await pending;
    }
    if(!response?.ok)throw new Error(response?.reason??'Não foi possível aplicar a automação.');
    ui?.notifications?.info?.(`${item.name}: ${response.events?.join('; ')??'efeito aplicado'}`);
    return true;
  }catch(error){ui?.notifications?.warn?.(String(error?.message??error));return false;}
}
