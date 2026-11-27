/**
 * Multiverse-D616 v0.2.203 — one-use ally action-check effects.
 *
 * The GM-authenticated support dispatcher creates *data-only* ActiveEffects.
 * Ordinary Item and ability rolls consume them after publishing a real roll
 * card; nothing runs a compendium Macro with elevated privileges. No rerolls
 * are performed automatically. Effects expire no later than the caster's
 * next turn, even when an expiry hook is delayed.
 */
const SYSTEM = 'multiverse-d616';
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const ONE_SHOT='nativeTacticalOnce';
const getFlag=e=>e?.flags?.[SYSTEM]?.[ONE_SHOT];

/** Expiry is checked at roll-time, not just by the cleanup hook. */
export function tacticalOnceExpired(flag,combat){
  if(!flag||!combat?.started||!flag.combatId||combat.id!==flag.combatId)return true;
  const startRound=Number(flag.round),nowRound=Number(combat.round);
  const startTurn=Number(flag.turn),nowTurn=Number(combat.turn);
  if(!Number.isInteger(startRound)||!Number.isInteger(nowRound)||!Number.isInteger(startTurn)||!Number.isInteger(nowTurn))return true;
  if(nowRound<startRound)return true;
  if(nowRound>startRound+1)return true;
  // Foundry exposes combat.turn as the current index; when a Reaction is
  // used on another combatant's turn, the source may act later THIS round.
  // Resolve the source's actual initiative position rather than the turn
  // where the benefit was created.
  const roster=list(combat.turns?.length?combat.turns:combat.combatants);
  const sourceIndex=roster.findIndex(c=>c?.id===flag.sourceCombatantId);
  if(sourceIndex>=0){
    if(nowRound===startRound&&sourceIndex>startTurn&&nowTurn>=sourceIndex)return true;
    if(nowRound===startRound+1&&nowTurn>=sourceIndex)return true;
  }else if(combat.combatant?.id===flag.sourceCombatantId &&
      (nowRound!==startRound||nowTurn!==startTurn))return true;
  if(nowRound===startRound+1&&nowTurn>startTurn&&sourceIndex<0)return true;
  return false;
}
export function tacticalOnceEffects(actor,combat=globalThis.game?.combat){
  return list(actor?.effects).filter(e=>!e?.disabled&&e?.duration?.expired!==true&&
    ['edge','marvelM'].includes(getFlag(e)?.kind)&&!tacticalOnceExpired(getFlag(e),combat));
}
export function tacticalOnceModifier(actor,combat=globalThis.game?.combat){
  const effects=tacticalOnceEffects(actor,combat);
  return {
    edgeSources:effects.filter(e=>getFlag(e).kind==='edge').map(e=>({
      source:'Tactics: Change of Plans',reason:'1 Edge no próximo teste de ação; reroll manual',sign:1,
    })),
    forcedMarvelEffect:effects.find(e=>getFlag(e).kind==='marvelM')??null,
  };
}
export function canCreateTacticalOnce(actor,kind,combat=globalThis.game?.combat){
  if(!['edge','marvelM'].includes(kind))return false;
  return tacticalOnceEffects(actor,combat).every(e=>getFlag(e)?.kind!==kind);
}
export async function createTacticalOnce({source,target,item,kind,combat}){
  if(!combat?.started||!source||!target||!item||!canCreateTacticalOnce(target,kind,combat))
    throw new Error('O alvo já possui esse benefício tático pendente ou o combate não está ativo.');
  const casterCombatant=list(combat.combatants).find(c=>
    c.actor?.uuid===source.uuid||c.actorId===source.id);
  if(!casterCombatant)throw new Error('O lançador precisa estar na iniciativa.');
  const flags={version:1,kind,sourceActorUuid:source.uuid,
    sourceCombatantId:casterCombatant.id,sourceItemId:item.id,
    combatId:combat.id,round:Number(combat.round),turn:Number(combat.turn)};
  const created=await target.createEmbeddedDocuments('ActiveEffect',[{
    name:`${item.name} — próximo teste`,img:item.img,disabled:false,transfer:false,
    changes:[],duration:{},flags:{[SYSTEM]:{[ONE_SHOT]:flags}},
  }]);
  return created;
}
/** A real roll has been published. Consume only the types actually used. */
export async function consumeTacticalOnce(actor,{marvelM=false,edge=true,combat=globalThis.game?.combat}={}){
  const relevant=tacticalOnceEffects(actor,combat).filter(e=>{
    const kind=getFlag(e)?.kind;
    return kind==='edge'&&edge||kind==='marvelM'&&marvelM;
  });
  if(!relevant.length)return [];
  const ids=relevant.map(e=>e.id).filter(Boolean);
  if(ids.length!==relevant.length)throw new Error('Benefício tático sem identificação de efeito.');
  await actor.deleteEmbeddedDocuments('ActiveEffect',ids);
  return ids;
}
export function tacticalMarvelLock(message){
  return Boolean(message?.flags?.[SYSTEM]?.tacticalCombatSupport?.noMarvelTrouble);
}
export function registerTacticalOnceExpiryHooks(){
  const clear=async combat=>{
    if(!game?.user?.isGM||game.users?.activeGM?.id&&game.users.activeGM.id!==game.user.id)return;
    const actors=[...list(game.actors),...list(combat?.combatants).map(c=>c.actor),
      ...list(game.scenes).flatMap(s=>list(s.tokens).map(t=>t.actor))].filter(Boolean);
    for(const actor of new Set(actors)){
      const stale=list(actor.effects).filter(e=>{
        const f=getFlag(e);return f&&f.combatId===combat?.id&&tacticalOnceExpired(f,combat);
      });
      if(stale.length)try{await actor.deleteEmbeddedDocuments('ActiveEffect',stale.map(e=>e.id));}
      catch(error){console.warn('[D616] Expiração tática:',error);}
    }
  };
  Hooks.on('updateCombat',(combat,changed)=>{
    if(Object.hasOwn(changed??{},'round')||Object.hasOwn(changed??{},'turn'))void clear(combat);
  });
  Hooks.on('deleteCombat',combat=>void clear({...combat,started:false}));
}
if(globalThis.Hooks?.once)Hooks.once('ready',registerTacticalOnceExpiryHooks);
