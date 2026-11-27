/** v0.2.198 — validate Jinx You's actual Melee touch check on the GM.
 * The player rolls the normal Marvel dice card before the support transaction;
 * only its final result, after any MANUAL Edge/Trouble rerolls, can authorize
 * the Trouble effect. Do not trust any success/fantastic booleans in a request.
 */
import {getMarvelOutcome,normalizeConditionDefense} from './power-conditions.mjs';
const NS='multiverse-d616';
const JINX='c2t2WUvH8Bx4Qnzi';
const same=(a,b)=>String(a??'')===String(b??'')&&!!String(a??'');
const flag=(msg,name)=>msg?.getFlag?.(NS,name)??msg?.flags?.[NS]?.[name];
export function inspectJinxTouchMessage({request,message,user,scene,sourceToken,targetToken}={}){
  if(!request||!message||!user||!scene||!sourceToken||!targetToken)
    return {ok:false,reason:'Jinx You: teste Melee ou dados de cena ausentes.'};
  if(!same(request.powerId,JINX)||!same(message?.id,request.attackMessageId))
    return {ok:false,reason:'Jinx You: identidade do teste Melee inválida.'};
  if(!same(message.user?.id??message.author?.id,user.id))
    return {ok:false,reason:'Jinx You: a rolagem não pertence ao jogador que ativou o poder.'};
  if(flag(message,'nativeJinxTouchResolved'))
    return {ok:false,reason:'Jinx You: este teste Melee já foi resolvido.'};
  const check=flag(message,'nativeJinxTouchCheck');
  if(!check||!same(check.powerId,JINX)||!same(check.itemId,request.itemId)||
    !same(check.sceneId,scene.id)||!same(check.sceneId,request.sceneId)||
    !same(check.sourceTokenId,sourceToken.id)||!same(check.sourceTokenId,request.sourceTokenId)||
    !same(check.targetTokenId,targetToken.id)||
    !Array.isArray(request.targetIds)||request.targetIds.length!==1||
    !same(request.targetIds[0],targetToken.id))
    return {ok:false,reason:'Jinx You: o teste Melee não corresponde ao poder ou aos tokens escolhidos.'};
  if(flag(message,'ability')!=='mle'||flag(message,'attackTarget')!=='mle'||flag(message,'powerCheck')!==true)
    return {ok:false,reason:'Jinx You: a rolagem não é um teste de Melee contra Melee.'};
  const rolls=message.rolls??[];
  if(rolls.length!==1||!Number.isFinite(Number(rolls[0]?.total)))
    return {ok:false,reason:'Jinx You: rolagem Marvel não encontrada no card.'};
  const defenseAbility=normalizeConditionDefense('mle',targetToken.actor);
  const defense=Number(targetToken.actor?.system?.abilities?.[defenseAbility]?.defense);
  if(!Number.isFinite(defense)||defense<=0)
    return {ok:false,reason:'Jinx You: defesa Melee do alvo indisponível.'};
  const result=getMarvelOutcome(rolls[0],defense,{message,targetActor:targetToken.actor});
  if(!result)return {ok:false,reason:'Jinx You: não foi possível resolver o teste Melee.'};
  return {ok:true,hit:result.success===true,fantastic:result.success===true&&result.fantastic===true,
    total:Number(rolls[0].total),defense,message};
}
