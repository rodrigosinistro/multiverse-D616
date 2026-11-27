/** Energy Absorption — explicit reaction on Item.roll(), followed by the GM's
 * authoritative post-DR damage application. The spent Focus and Reaction are
 * NEVER charged twice. The absorbed-Focus credit persists independently of
 * whether the current Focus is above its normal maximum.
 */
export const ENERGY_FLAG = 'customEnergyAbsorption';
export const ENERGY_CREDIT_KEY = 'energyAbsorptionCredit';
export const OVERFLOW_ACTORS_KEY = 'customEnergyAbsorptionOverflowActors';
export const ENERGY_PREPARED_STATUS = 'mmrpg.energy-absorption';
export const ENERGY_ACTIVE_STATUS = 'mmrpg.energy-absorption-active';
const SYSTEM = 'multiverse-d616';
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const concurrent = new Set();
const pendingSpendBalance = new WeakMap();
// Player requests travel as owner-authorized Actor updates. Foundry's updateActor
// hook supplies the authenticated updating user ID; the generic system socket
// does NOT supply a trustworthy sender ID as its second callback argument.
const PLAYER_REQUEST_KEY='energyAbsorptionPlayerRequest';
const PLAYER_RESULT_KEY='energyAbsorptionPlayerResult';
const playerRequests=new Map();
const gmRequests=new Set();
const flagFromChanges=(changes,key)=>{
  const nested=changes?.flags?.[SYSTEM]?.[key];
  if(nested!==undefined)return nested;
  const dotted=changes?.[`flags.${SYSTEM}.${key}`];
  if(dotted!==undefined)return dotted;
  return changes?.flags?.[`${SYSTEM}.${key}`];
};
const own = (object,key) => Object.prototype.hasOwnProperty.call(object??{},key);
const positive = value => Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
const activeGM = () => !!globalThis.game?.user?.isGM && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);

export const isEnergyAbsorptionPower = item => item?.type === 'power' && String(item.name??'').trim().toLowerCase() === 'energy absorption';
export function pendingAbsorption(actor) {
  // Legacy Central-created/manual conditions from v175 cannot grant free
  // absorption: only a paid HUD activation is eligible.
  return list(actor?.effects).find(effect => !effect.disabled && effect.duration?.expired!==true &&
    effect.flags?.[SYSTEM]?.[ENERGY_FLAG]?.armedByHud === true);
}
/** The Actor flag is the primary ledger. The ActiveEffect also stores the
 * credit, since token-delta / client synchronization may expose an effect
 * before the corresponding Actor flag is visible. Zero on an explicit Actor
 * flag is authoritative: do not resurrect a spent balance from a stale effect.
 */
const creditRecord = actor => actor?.getFlag?.(SYSTEM,ENERGY_CREDIT_KEY) ?? actor?.flags?.[SYSTEM]?.[ENERGY_CREDIT_KEY];
const activeEffects = actor => list(actor?.effects).filter(effect=>
  !effect.disabled && effect.duration?.expired!==true && effect.flags?.[SYSTEM]?.[ENERGY_FLAG]?.active === true);
export function absorbedFocusCredit(actor) {
  const pending=pendingSpendBalance.get(actor);
  if(pending && Number(actor?.system?.focus?.value)===pending.focusAfter)
    return positive(pending.updated.remaining);
  const stored=creditRecord(actor);
  const effectCredit=activeEffects(actor).reduce((max,effect)=>
    Math.max(max,positive(effect.flags?.[SYSTEM]?.[ENERGY_FLAG]?.remaining)),0);
  // A token Actor may expose the just-created ActiveEffect before its
  // corresponding Actor flag (or retain a stale zero from v176). Never show
  // the contradictory "Ativo (0 Focus)" while the effect has credit.
  if(effectCredit>0 && (!stored||positive(stored.remaining)===0))return effectCredit;
  if(stored && Number.isFinite(Number(stored.remaining)))return positive(stored.remaining);
  return effectCredit;
}
export function activeAbsorption(actor) {
  return absorbedFocusCredit(actor)>0;
}
/** The current limit doubles while absorption credit is unspent; the natural
 * maximum remains the actual resource formula. This is intentionally invoked
 * at the END of the actor's derived-resource calculation, rather than editing
 * the stored maximum (which the model recalculates every preparation).
 */
export function applyAbsorptionFocusCapacity(model){
  const normal=Number(model?.focus?.max);
  if(!Number.isFinite(normal)||normal<=0)return false;
  const actor=model?.parent;
  const combat=globalThis.game?.combat;
  const sourceCombatId=creditRecord(actor)?.combatId ||
    activeEffects(actor)[0]?.flags?.[SYSTEM]?.[ENERGY_FLAG]?.combatId;
  // Temporary double capacity is available only in the encounter where it
  // was gained. Remaining credit can still block reuse after that encounter.
  if(combat?.started && combat.id===sourceCombatId && absorbedFocusCredit(actor)>0){
    model.focus.max=normal*2;
    return true;
  }
  return false;
}
/** Return the permanent maximum, even while the HUD shows double capacity. */
export function normalAbsorptionFocusMaximum(actor){
  const displayed=Number(actor?.system?.focus?.max);
  const record=creditRecord(actor);
  const effect=activeEffects(actor)[0]?.flags?.[SYSTEM]?.[ENERGY_FLAG];
  const stored=Number(record?.normalMax ?? effect?.normalMax);
  if(Number.isFinite(stored)&&stored>0){
    // Account for permanent abilities and effects changing the natural limit.
    return Number.isFinite(displayed)&&displayed>stored*1.5 ? displayed/2 : stored;
  }
  return Number.isFinite(displayed)&&displayed>0 ? displayed : 0;
}
export function absorptionFocusResult({focus,maximum,damage,cost=15}={}) {
  const current=Number(focus),max=Number(maximum),amount=Number(damage);
  if(!Number.isFinite(current)||!Number.isFinite(max)||max<=0||!Number.isFinite(amount)||amount<=0||current<cost)
    return null;
  const afterCost=Math.max(0,current-cost);
  const next=Math.min(max*2,afterCost+amount);
  return {before:current,after:next,focusGained:Math.max(0,next-afterCost),cost,absorbed:amount,cap:max*2};
}
export function participant(actor,tokenDoc=null) {
  const combat=globalThis.game?.combat;
  if(!combat?.started)return null;
  const possible=list(combat.combatants).filter(c=>c.actor?.uuid===actor?.uuid||c.actorId===actor?.id||c.actor?.id===actor?.id);
  const token=tokenDoc ?? (globalThis.canvas?.tokens?.controlled??[]).find(t=>
    t.actor?.uuid===actor?.uuid||t.actor?.id===actor?.id)?.document;
  if(token?.id){const exact=possible.find(c=>c.tokenId===token.id);if(exact)return exact;}
  return possible.length===1?possible[0]:null;
}
const effectData=(kind,{itemId='',amount=0,normalMax=0,focusAfter=0,combatId=''}={})=>({
  name:kind==='prepared'?'Energy Absorption — Preparado':`Energy Absorption — Ativo (${amount} Focus)`,
  img:`systems/${SYSTEM}/icons/m.svg`,
  statuses:[kind==='prepared'?ENERGY_PREPARED_STATUS:ENERGY_ACTIVE_STATUS],
  disabled:false,transfer:false,showIcon:2,duration:{},changes:[],
  flags:{core:{statusId:kind==='prepared'?ENERGY_PREPARED_STATUS:ENERGY_ACTIVE_STATUS},
    [SYSTEM]:{[ENERGY_FLAG]:{version:3,armedByHud:kind==='prepared',active:kind==='active',itemId,combatId,
      remaining:kind==='active'?amount:0,total:kind==='active'?amount:0,normalMax,focusAfter}}},
});
/** Called by Item.roll() BEFORE its generic Focus/chat/turn workflow. */
export async function activateEnergyAbsorption(item,{tokenDoc=null,tracker=globalThis.game?.multiverseD616?.turnTracker}={}) {
  if(!isEnergyAbsorptionPower(item)||!item.actor)return false;
  const actor=item.actor,lock=actor.uuid??actor.id;
  if(concurrent.has(lock))return false;
  concurrent.add(lock);
  try {
    if(pendingAbsorption(actor)||activeAbsorption(actor)) {
      globalThis.ui?.notifications?.warn?.('Energy Absorption já está preparado ou ativo: gaste o Focus absorvido antes de usar novamente.');
      return false;
    }
    // Remove a stale v176 active marker with no recoverable absorbed credit.
    // It must not survive into a new activation as a second active status.
    if(!absorbedFocusCredit(actor))await syncAbsorptionActiveEffect(actor);
    const focus=Number(actor.system?.focus?.value);
    if(!Number.isFinite(focus)||focus<15){ui?.notifications?.warn?.('Energy Absorption exige 15 Focus disponíveis.');return false;}
    const rank=Number(actor.system?.attributes?.rank?.value??0);
    if(rank>0 && 5*rank<15){ui?.notifications?.warn?.('O limite de gasto de Focus deste personagem é inferior a 15.');return false;}
    const combatant=participant(actor,tokenDoc);
    const state=combatant && tracker?.getState?.(combatant);
    if(!combatant||!state||!tracker?.consumeReaction||positive(state.reactionUsed)>=positive(state.reactionMax)) {
      ui?.notifications?.warn?.('Energy Absorption exige uma Reação disponível em um combate ativo.');return false;
    }
    // A normal player cannot rely on the system socket's unauthenticated
    // sender argument. The owner submits a bounded request via an Actor update;
    // Foundry enforces Actor permissions and supplies the true userId to the GM.
    // Focus and Reaction are BOTH spent by the GM only after validation.
    if(!game.user?.isGM && game.socket){
      return await requestPlayerEnergyAbsorption(item,combatant);
    }
    // Deduct Focus first, then request authoritative Reaction consumption.
    // If the GM rejects a stale or exhausted reaction, refund the Focus.
    await actor.update({'system.focus.value':focus-15},{d616EnergyAbsorptionInternal:true});
    let spent=false;
    try{spent=!!await tracker.consumeReaction(combatant);}catch(error){console.warn('[D616] Energy Absorption: reação indisponível.',error);}
    if(!spent){
      await actor.update({'system.focus.value':positive(actor.system?.focus?.value)+15},{d616EnergyAbsorptionInternal:true});
      ui?.notifications?.warn?.('A Reação não foi autorizada pelo Mestre. Os 15 Focus foram estornados.');
      return false;
    }
    try {
      await actor.createEmbeddedDocuments('ActiveEffect',[effectData('prepared',{itemId:item.id,combatId:game.combat?.id??''})]);
    } catch(error) {
      console.error('[D616] Não foi possível preparar Energy Absorption',error);
      try{await actor.update({'system.focus.value':positive(actor.system?.focus?.value)+15},{d616EnergyAbsorptionInternal:true});}catch(e){console.error('[D616] Estorno de Focus falhou',e);}
      try{await tracker.refundReaction?.(combatant);}catch(e){console.error('[D616] Estorno de Reação falhou',e);}
      ui?.notifications?.error?.('Falha ao preparar Energy Absorption; recursos estornados quando possível.');
      return false;
    }
    // Remove obsolete v175 manual/Central conditions so a migrated character
    // never displays two visually identical "Prepared" statuses.
    const legacy=list(actor.effects).filter(e=>{
      const f=e.flags?.[SYSTEM]?.[ENERGY_FLAG];
      return f?.version===1 || (!f && (e.statuses?.has?.(ENERGY_PREPARED_STATUS)||
        Array.isArray(e.statuses)&&e.statuses.includes(ENERGY_PREPARED_STATUS)));
    });
    if(legacy.length)try{await actor.deleteEmbeddedDocuments('ActiveEffect',legacy.map(e=>e.id));}
      catch(error){console.warn('[D616] Condição legada Energy Absorption',error);}
    globalThis.ui?.notifications?.info?.('Energy Absorption preparado: o próximo dano Health confirmado será convertido em Focus.');
    if(globalThis.ChatMessage?.create){
      try{await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),
        content:'<p><strong>Energy Absorption — Preparado</strong></p><p>1 Reação e 15 Focus gastos. O próximo dano Health confirmado será convertido em Focus, respeitando o limite de 2× Focus máximo.</p>'});}
      catch(error){console.warn('[D616] Falha apenas no anúncio de Energy Absorption',error);}
    }
    return true;
  }catch(error){console.error('[D616] Falha ao ativar Energy Absorption',error);ui?.notifications?.error?.('Energy Absorption não foi ativado.');return false;}
  finally{concurrent.delete(lock);}
}
/** Player-side transaction: never spend local Focus or Reaction while awaiting
 * the GM. A response contains only success/reason, not executable commands.
 */
export async function requestPlayerEnergyAbsorption(item,combatant){
  const actor=item?.actor;
  const gm=globalThis.game?.users?.activeGM;
  if(!actor || !combatant || !gm?.active || !gm.isGM){
    ui?.notifications?.warn?.('Energy Absorption precisa de um Mestre conectado para registrar a Reação.');
    return false;
  }
  const owner=globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3;
  if(!actor?.testUserPermission?.(game.user,owner)){
    ui?.notifications?.warn?.('Você precisa ser DONO do personagem para usar Energy Absorption.');
    return false;
  }
  const id=globalThis.foundry?.utils?.randomID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const request={id,itemId:item.id,combatId:game.combat?.id,combatantId:combatant.id};
  // Register BEFORE sending so a fast GM response cannot be lost.
  const result=new Promise(resolve=>{
    const timeout=setTimeout(()=>{
      playerRequests.delete(id);
      resolve({ok:false,timeout:true});
    },15000);
    playerRequests.set(id,response=>{
      clearTimeout(timeout);
      playerRequests.delete(id);
      resolve(response);
    });
  });
  try{
    await actor.update({[`flags.${SYSTEM}.${PLAYER_REQUEST_KEY}`]:request},
      {d616EnergyAbsorptionRequest:true});
  }catch(error){
    playerRequests.get(id)?.({ok:false,reason:'Não foi possível solicitar a ativação ao Mestre.'});
    console.warn('[D616] Solicitação Energy Absorption não foi registrada',error);
  }
  const ack=await result;
  if(!ack.ok){
    ui?.notifications?.warn?.(ack.timeout?
      'Energy Absorption: sem confirmação do Mestre. Nenhum recurso foi descontado por esta solicitação no cliente; verifique o HUD antes de tentar novamente.':
      (ack.reason??'Energy Absorption não foi autorizado. Focus e Reação não foram gastos nesta solicitação.'));
  }
  return !!ack.ok;
}

/** The trusted request comes from a Foundry Actor document update, which
 * provides authenticated userId. Never trust a userId inside the flag data.
 * The GM revalidates the Actor owner, Power and active Combatant before any
 * spending. No macro, function name, or arbitrary JS comes from the request.
 */
export async function processPlayerEnergyAbsorptionRequest(actor,request,userId){
  if(!activeGM() || !request || typeof request!=='object' || typeof request.id!=='string' ||
     !request.id || request.id.length>128)return false;
  const gm=game.user;
  const user=game.users?.get?.(userId);
  if(!user || user.isGM || !user.active)return false;
  const owner=globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3;
  if(!actor?.testUserPermission?.(user,owner))return false;
  const requestKey=`${actor.uuid??actor.id}:${request.id}`;
  if(gmRequests.has(requestKey))return false;
  const previous=actor.getFlag?.(SYSTEM,PLAYER_RESULT_KEY)??actor.flags?.[SYSTEM]?.[PLAYER_RESULT_KEY];
  if(previous?.id===request.id)return !!previous.ok;
  gmRequests.add(requestKey);
  let ok=false,reason='Ativação recusada: confira Focus, Reação e condições do poder.';
  try{
    const item=actor.items?.get?.(request.itemId)??list(actor.items).find(i=>i.id===request.itemId);
    const combat=game.combat;
    const c=combat?.combatants?.get?.(request.combatantId)??list(combat?.combatants).find(c=>c.id===request.combatantId);
    const sameActor=!!c && (c.actor?.uuid===actor.uuid || c.actor?.id===actor.id || c.actorId===actor.id);
    if(!isEnergyAbsorptionPower(item)||item.actor?.uuid!==actor.uuid||!combat?.started||
       request.combatId!==combat.id||!sameActor){
      reason='Solicitação inválida ou personagem fora do combate atual.';
    }else{
      const state=game.multiverseD616?.turnTracker?.getState?.(c);
      if(!state || positive(state.reactionUsed)>=positive(state.reactionMax)){
        reason='O personagem não possui uma Reação disponível.';
      }else if(pendingAbsorption(actor)||activeAbsorption(actor)){
        reason='Energy Absorption já está preparado ou ativo.';
      }else{
        ok=!!await activateEnergyAbsorption(item,{tokenDoc:c.token,tracker:game.multiverseD616?.turnTracker});
        if(!ok)reason='Energy Absorption não foi ativado. Confira as condições e os recursos.';
      }
    }
  }catch(error){
    reason='Falha ao registrar a ativação de Energy Absorption.';
    console.error('[D616] Energy Absorption: pedido autenticado falhou',error);
  }finally{
    try{await actor.update({[`flags.${SYSTEM}.${PLAYER_RESULT_KEY}`]:{id:request.id,ok,reason}},
      {d616EnergyAbsorptionResult:true});}
    catch(error){console.error('[D616] Energy Absorption: resposta ao jogador falhou',error);}
    gmRequests.delete(requestKey);
  }
  return ok;
}

/** GM and player receive core document changes (including real userId).
 * The player only accepts the response if it was saved by the current GM.
 */
export function handlePlayerEnergyAbsorptionActorUpdate(actor,changes,userId){
  const response=flagFromChanges(changes,PLAYER_RESULT_KEY);
  if(response?.id && game.users?.get?.(userId)?.isGM &&
      userId===game.users?.activeGM?.id){
    playerRequests.get(response.id)?.(response);
  }
  const request=flagFromChanges(changes,PLAYER_REQUEST_KEY);
  if(request?.id && userId && activeGM() && !game.users?.get?.(userId)?.isGM){
    void processPlayerEnergyAbsorptionRequest(actor,request,userId).catch(error=>
      console.error('[D616] Energy Absorption: falha no processamento de solicitação',error));
  }
}

/** GM applies already-paid prepared reaction exactly once. No extra dialog. */
export async function tryAbsorbHealthDamage(actor,damage,{tokenDoc=null}={}) {
  if(!activeGM()||!actor||!Number.isFinite(Number(damage))||Number(damage)<=0)return null;
  const key=actor.uuid??actor.id;
  if(concurrent.has(key))return null;
  concurrent.add(key);
  try {
    const effect=pendingAbsorption(actor);
    if(!effect||activeAbsorption(actor))return null;
    const naturalMax=normalAbsorptionFocusMaximum(actor);
    const result=absorptionFocusResult({focus:actor.system?.focus?.value,maximum:naturalMax,damage,cost:0});
    if(!result)return null;
    const combat=game.combat;
    const overflow=result.after>naturalMax;
    if(overflow&&combat?.started){
      if(!actor.uuid||typeof combat.setFlag!=='function')return null;
      const previous=combat.getFlag?.(SYSTEM,OVERFLOW_ACTORS_KEY)??combat.flags?.[SYSTEM]?.[OVERFLOW_ACTORS_KEY]??[];
      try{await combat.setFlag(SYSTEM,OVERFLOW_ACTORS_KEY,[...new Set([...(Array.isArray(previous)?previous:[]),actor.uuid])]);}
      catch(error){console.warn('[D616] Energy Absorption: registro de Focus excedente falhou',error);return null;}
    }
    const previous=creditRecord(actor);
    const remaining=positive(previous?.remaining)+result.focusGained;
    const ledger={remaining,total:positive(previous?.total)+result.focusGained,
      normalMax:naturalMax,combatId:combat?.id??''};
    await actor.update({'system.focus.value':result.after,
      [`flags.${SYSTEM}.${ENERGY_CREDIT_KEY}`]:ledger,
      [`flags.${SYSTEM}.customEnergyAbsorptionOverflow`]:overflow},{d616EnergyAbsorptionInternal:true});
    try {
      if(result.focusGained>0)await actor.createEmbeddedDocuments('ActiveEffect',[effectData('active',{
        amount:remaining,normalMax:naturalMax,focusAfter:result.after,combatId:combat?.id??''})]);
      await actor.deleteEmbeddedDocuments('ActiveEffect',[effect.id]);
    }catch(error){
      // Damage was already prevented and converted. Never apply it again if
      // a cosmetic ActiveEffect fails: the persistent Actor flag still locks it.
      console.error('[D616] Energy Absorption: falha ao atualizar condição visual',error);
    }
    // Some Actor integrations constrain the current value to the old maximum
    // during the first update. Creating the active effect recomputes the new
    // doubled maximum, so retry the current value only if it was truncated.
    if(result.focusGained>0 && Number(actor.system?.focus?.value)!==result.after){
      try{await actor.update({'system.focus.value':result.after},{d616EnergyAbsorptionInternal:true});}
      catch(error){console.error('[D616] Energy Absorption: segunda gravação de Focus falhou',error);}
    }
    if(Number(actor.system?.focus?.value)!==result.after){
      // Never report that the full amount was received when the Actor actually
      // stored less, and never apply Health damage a second time.
      const actual=Math.max(0,Number(actor.system?.focus?.value)-result.before);
      const corrected={...result,after:Number(actor.system?.focus?.value),focusGained:actual};
      const fixed={...ledger,remaining:positive(previous?.remaining)+actual,
        total:positive(previous?.total)+actual};
      try{
        await actor.update({[`flags.${SYSTEM}.${ENERGY_CREDIT_KEY}`]:fixed},{d616EnergyAbsorptionInternal:true});
        await syncAbsorptionActiveEffect(actor,{remaining:fixed.remaining,normalMax:naturalMax});
      }catch(error){console.error('[D616] Energy Absorption: ajuste de crédito incompleto',error);}
      globalThis.ui?.notifications?.error?.('Energy Absorption: Focus gravado parcialmente. Verifique o valor na ficha do personagem.');
      return corrected;
    }
    return result;
  }catch(error){console.error('[D616] Energy Absorption: falha ao converter dano',error);return null;}
  finally{concurrent.delete(key);}
}
/** Pure preUpdateActor hook: keep the credit in the SAME atomic Focus update. */
export function applyAbsorbedFocusSpend(actor,changes,options={}){
  if(options?.d616EnergyAbsorptionInternal||options?.d616FocusDamage)return false;
  const remaining=absorbedFocusCredit(actor);
  if(!remaining)return false;
  const next=own(changes,'system.focus.value')?changes['system.focus.value']:changes?.system?.focus?.value;
  if(next==null||!Number.isFinite(Number(next)))return false;
  const before=Number(actor.system?.focus?.value);
  if(!Number.isFinite(before))return false;
  const spent=Math.min(remaining,Math.max(0,before-Number(next)));
  if(!spent)return false;
  const previous=creditRecord(actor)??activeEffects(actor)[0]?.flags?.[SYSTEM]?.[ENERGY_FLAG]??{};
  const updated={remaining:remaining-spent,total:positive(previous.total)||remaining,
    normalMax:positive(previous.normalMax)||normalAbsorptionFocusMaximum(actor),
    combatId:previous.combatId??''};
  // Foundry v14 preUpdate hooks receive a mutable nested change object;
  // writing the flag as a nested field is safer than appending a dotted key
  // alongside an existing nested system.focus.value update.
  (changes.flags??={})[SYSTEM]??={};
  changes.flags[SYSTEM][ENERGY_CREDIT_KEY]=updated;
  // A backup is used solely to synchronize the ActiveEffect once the Actor
  // update is confirmed. Do not update the effect in preUpdateActor.
  pendingSpendBalance.set(actor,{updated,focusAfter:Number(next)});
  return true;
}
/** Reconcile the visible status against the authoritative Focus-spend ledger.
 * If a client has not yet received the Actor flag, the effect's own remaining
 * credit is a persistence fallback; the expected update avoids a stale read
 * during the postUpdateActor notification.
 */
export async function syncAbsorptionActiveEffect(actor,{remaining:override,normalMax:overrideMax,focusAfter:overrideFocus}={}){
  const effects=activeEffects(actor);
  if(!effects.length)return;
  const remaining=override!==undefined?positive(override):absorbedFocusCredit(actor);
  if(!remaining){await actor.deleteEmbeddedDocuments('ActiveEffect',effects.map(e=>e.id));return;}
  const name=`Energy Absorption — Ativo (${remaining} Focus)`;
  const updates=effects.map(effect=>{
    const state=effect.flags?.[SYSTEM]?.[ENERGY_FLAG]??{};
    const normalMax=positive(overrideMax)||positive(creditRecord(actor)?.normalMax)||positive(state.normalMax);
    const focusAfter=overrideFocus!==undefined?Number(overrideFocus):Number(actor.system?.focus?.value);
    const fields={_id:effect.id};
    if(effect.name!==name)fields.name=name;
    if(positive(state.remaining)!==remaining)
      fields[`flags.${SYSTEM}.${ENERGY_FLAG}.remaining`]=remaining;
    if(normalMax&&positive(state.normalMax)!==normalMax)
      fields[`flags.${SYSTEM}.${ENERGY_FLAG}.normalMax`]=normalMax;
    if(Number.isFinite(focusAfter)&&Number(state.focusAfter)!==focusAfter)
      fields[`flags.${SYSTEM}.${ENERGY_FLAG}.focusAfter`]=focusAfter;
    return fields;
  }).filter(patch=>Object.keys(patch).length>1);
  if(updates.length)await actor.updateEmbeddedDocuments('ActiveEffect',updates);
}
export async function clearAbsorptionAfterCombat(combat){
  if(!activeGM())return 0;
  // A prepared defender may have been removed from the tracker before combat
  // ends. Scan owned actors and scene token actors as well; a missing Actor in
  // Combat.combatants must not leave an unpaid-for pending reaction forever.
  const actors=new Set([
    ...list(combat?.combatants).map(c=>c?.token?.actor??c?.actor),
    ...list(game.actors),
    ...list(game.scenes).flatMap(scene=>list(scene.tokens).map(token=>token.actor)),
  ].filter(Boolean));
  const uuids=combat?.getFlag?.(SYSTEM,OVERFLOW_ACTORS_KEY)??combat?.flags?.[SYSTEM]?.[OVERFLOW_ACTORS_KEY]??[];
  for(const uuid of (Array.isArray(uuids)?uuids:[])){
    if(typeof uuid!=='string'||!uuid)continue;
    let actor=null;
    try{actor=typeof globalThis.fromUuid==='function'?await globalThis.fromUuid(uuid):null;}
    catch(error){console.warn('[D616] Energy Absorption: UUID indisponível',uuid,error);}
    if(!actor&&uuid.startsWith('Actor.'))actor=game.actors?.get?.(uuid.slice(6));
    if(actor?.actor)actor=actor.actor;
    if(actor)actors.add(actor);
  }
  let removed=0;
  for(const actor of actors){
    const prepared=list(actor.effects).filter(e=>{
      const f=e.flags?.[SYSTEM]?.[ENERGY_FLAG];
      if(!f||f.active)return false;
      if(f.combatId && f.combatId!==combat?.id)return false;
      return f.armedByHud===true || f.version===1;
    });
    if(prepared.length){await actor.deleteEmbeddedDocuments('ActiveEffect',prepared.map(e=>e.id));removed+=prepared.length;}
    const current=Number(actor.system?.focus?.value)||0,max=normalAbsorptionFocusMaximum(actor);
    const discarded=Math.max(0,current-max);
    const credit=creditRecord(actor)??activeEffects(actor)[0]?.flags?.[SYSTEM]?.[ENERGY_FLAG];
    const currentCredit=absorbedFocusCredit(actor);
    const oldOverflow=!!actor.flags?.[SYSTEM]?.customEnergyAbsorptionOverflow;
    if(discarded>0&&(oldOverflow||currentCredit>0)){
      const remaining=Math.max(0,currentCredit-discarded);
      await actor.update({'system.focus.value':max,
        [`flags.${SYSTEM}.customEnergyAbsorptionOverflow`]:false,
        ...(credit?{[`flags.${SYSTEM}.${ENERGY_CREDIT_KEY}`]:{
          ...credit,remaining,normalMax:max,combatId:credit.combatId??combat?.id??''}}:{})
      },{d616EnergyAbsorptionInternal:true});
      await syncAbsorptionActiveEffect(actor,{remaining,normalMax:max,focusAfter:max});
    }else{
      if(oldOverflow)await actor.update({[`flags.${SYSTEM}.customEnergyAbsorptionOverflow`]:false},
        {d616EnergyAbsorptionInternal:true});
      await syncAbsorptionActiveEffect(actor);
    }
  }
  return removed;
}
export function registerEnergyAbsorptionHooks(){
  // IMPORTANT: Foundry treats a literal `false` returned by preUpdateActor
  // as a veto of the ENTIRE Actor.update. The accounting helper deliberately
  // returns false when an update is unrelated to absorption. Never forward
  // that status to the Hook dispatcher: doing so blocks ordinary Health and
  // Focus damage, power costs, healing and other Actor updates for everyone.
  Hooks.on('updateActor',(actor,changes,options,userId)=>{
    handlePlayerEnergyAbsorptionActorUpdate(actor,changes,userId);
  });
  Hooks.on('preUpdateActor',(actor,changes,options)=>{
    applyAbsorbedFocusSpend(actor,changes,options);
    // No return: always allow Foundry to commit this Actor update.
  });
  Hooks.on('updateActor',(actor,changes,options,userId)=>{
    if(userId!==game.user?.id)return;
    const expected=pendingSpendBalance.get(actor);
    if(expected)pendingSpendBalance.delete(actor);
    if(expected||own(changes,`flags.${SYSTEM}.${ENERGY_CREDIT_KEY}`)||
        changes.flags?.[SYSTEM]?.[ENERGY_CREDIT_KEY])
      void syncAbsorptionActiveEffect(actor,expected?{
        remaining:expected.updated.remaining,normalMax:expected.updated.normalMax,
        focusAfter:expected.focusAfter}:{}).catch(error=>console.warn('[D616] Energy Absorption status',error));
  });
  Hooks.on('deleteCombat',combat=>{void clearAbsorptionAfterCombat(combat).catch(error=>console.error('[D616] Energy Absorption',error));});
  Hooks.on('updateCombat',(combat,change)=>{if(change?.started===false)void clearAbsorptionAfterCombat(combat).catch(error=>console.error('[D616] Energy Absorption',error));});
}
if(globalThis.Hooks?.on)registerEnergyAbsorptionHooks();
