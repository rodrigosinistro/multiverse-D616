/** Multiverse-D616 v0.2.219 — audited power mechanisms, batch 2.
 * Keep authoritative damage and roll changes in the original GM/player workflows.
 * Source rolls and token UUIDs are explicitly bound to each special effect.
 */
import {getMarvelOutcome} from './power-conditions.mjs';
import {rollSignature} from './multi-target-combat.mjs';
import {chooseD616Dialog} from './dialog-v14.mjs';
import {reactionCombatant} from './native-power-spider-defenses.mjs';
const S='multiverse-d616';
const scoped=(item,name,set)=>item?.type==='power'&&item?.name===name&&item?.system?.powerSet===set;
export const isExploit=i=>scoped(i,'Exploit','Melee Weapons');
export const isCatchBullets=i=>scoped(i,'Catch Bullets','Super-Speed');
export const isQuickToss=i=>scoped(i,'Quick Toss','Super-Strength');
export const isProtectionHex=i=>scoped(i,'Protection Hex','Magic');
export const isInstantReplay=i=>scoped(i,'Instant Replay','Omniversal Travel');
const values=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function messageActor(m){const scene=globalThis.game?.scenes?.get?.(m?.speaker?.scene);
 return scene?.tokens?.get?.(m?.speaker?.token)?.actor??globalThis.game?.actors?.get?.(m?.speaker?.actor);}
function messageItem(m){return messageActor(m)?.items?.get?.(m?.getFlag?.(S,'itemId'))??null;}
function savedTargets(m){return values(m?.getFlag?.(S,'targets')??[]).map(t=>t?.uuid??t).filter(Boolean);}
const sameCombat=(mark,combat=globalThis.game?.combat)=>Boolean(combat?.started&&mark?.combatId===combat.id&&Number(mark.round)===Number(combat.round));

/** Only real, GM-committed positive Health damage from an armed weapon Fantastic. */
export function exploitDamageTrigger(source,snapshot,receipt,action='full'){
 const weapon=messageItem(source);
 if(weapon?.type!=='weapon'||!source?.rolls?.length||action==='heal'||!snapshot?.entries?.length)return null;
 if(snapshot.sourceMessageId!==source.id||snapshot.rollSignature!==rollSignature(source.rolls[0]))return null;
 const valid=new Set(snapshot.entries.filter(e=>e.category==='health'&&e.hit!==false&&e.fantastic===true).map(e=>e.targetUuid));
 const hit=values(receipt).filter(r=>valid.has(r.targetUuid)&&r.category==='health'&&!r.heal&&!r.blocked&&Number(r.delta)>0);
 if(!hit.length)return null;
 return {version:1,sourceMessageId:source.id,weaponId:weapon.id,
  targetUuids:[...new Set(hit.map(x=>x.targetUuid))],signature:rollSignature(source.rolls[0])};
}
export async function armExploitFromDamage({damageMessage,action,receipt,combat=globalThis.game?.combat}={}){
 if(!globalThis.game?.user?.isGM||!combat?.started)return false;
 const source=globalThis.game?.messages?.get?.(damageMessage?.getFlag?.(S,'sourceMessageId'));
 const actor=messageActor(source),snapshot=damageMessage?.getFlag?.(S,'damageApplication');
 if(!actor||!values(actor.items).some(isExploit))return false;
 const trigger=exploitDamageTrigger(source,snapshot,receipt,action);
 if(!trigger)return false;
 await actor.setFlag(S,'nativeExploitReady',{...trigger,combatId:combat.id,round:Number(combat.round),
  turn:Number(combat.turn),used:false});
 return true;
}
export function exploitEligibility(item,{targets=[],combat=globalThis.game?.combat}={}){
 if(!isExploit(item))return {ok:true,applicable:false};
 const mark=item.actor?.getFlag?.(S,'nativeExploitReady')??item.actor?.flags?.[S]?.nativeExploitReady;
 if(!sameCombat(mark,combat)||mark.used)return {ok:false,reason:'Exploit: é necessário um Sucesso Fantástico recente com arma que cause dano real de Health.'};
 if(Number(mark.turn)!==Number(combat.turn))return {ok:false,reason:'Exploit: o gatilho pertence a outro turno.'};
 if(targets.length!==1||!mark.targetUuids?.includes(targets[0]?.uuid))
  return {ok:false,reason:'Exploit: selecione o mesmo alvo atingido pelo golpe Fantástico com arma.'};
 return {ok:true,applicable:true,mark};
}
export async function consumeExploit(item,mark){
 if(!isExploit(item)||!mark?.sourceMessageId)return false;
 const latest=item.actor?.getFlag?.(S,'nativeExploitReady');
 if(!latest||latest.used||latest.sourceMessageId!==mark.sourceMessageId)return false;
 await item.actor.setFlag(S,'nativeExploitReady',{...latest,used:true});return true;
}
/** Health DR is bypassed for the one Exploit roll only; never change target's permanent DR. */
export function exploitDamageReduction(power,source,dr,category){
 return isExploit(power)&&category==='health'&&source?.getFlag?.(S,'nativeExploit')?.version===1?0:dr;
}

/** Weapon-specific special text remains GM-adjudicated: there is no universal
 * weapon effect schema to execute safely for every equipped weapon. */
export async function postExploitSpecial({damageMessage,action='full',receipt,post=data=>globalThis.ChatMessage?.create?.(data)}={}){
 if(!globalThis.game?.user?.isGM||action==='heal')return false;
 const source=globalThis.game?.messages?.get?.(damageMessage?.getFlag?.(S,'sourceMessageId'));
 const caster=messageActor(source),power=messageItem(source),mark=source?.getFlag?.(S,'nativeExploit');
 const snap=damageMessage?.getFlag?.(S,'damageApplication');
 if(!isExploit(power)||mark?.version!==1||snap?.sourceMessageId!==source?.id||
   snap.rollSignature!==rollSignature(source.rolls?.[0]))return false;
 const hit=new Set(values(snap.entries).filter(x=>x.hit!==false&&x.fantastic===true).map(x=>x.targetUuid));
 if(!values(receipt).some(r=>hit.has(r.targetUuid)&&!r.heal))return false;
 const weapon=caster?.items?.get?.(mark.weaponId);
 const rule=String(weapon?.system?.rule??'').trim();
 await post({speaker:source.speaker,content:`<div class="m616-exploit-special"><b>Exploit — Sucesso Fantástico:</b> `+
  `dano dobrado pela regra do ataque; <b>efeito especial da arma ${escape(weapon?.name??'original')}</b> `+
  `deve ser confirmado pelo Mestre.${rule?`<p>${escape(rule)}</p>`:''}</div>`});
 return true;
}

/** Quick Toss has TWO distinct targets: thrown person gets normal damage even on miss. */
export function quickTossRoles(targets,thrownUuid){
 const refs=values(targets).filter(t=>t?.uuid&&String(t.uuid).startsWith('Scene.'));
 if(refs.length!==2||new Set(refs.map(t=>t.uuid)).size!==2)return null;
 const thrown=refs.find(t=>t.uuid===thrownUuid),struck=refs.find(t=>t.uuid!==thrownUuid);
 return thrown&&struck?{version:1,thrownUuid:thrown.uuid,struckUuid:struck.uuid}:null;
}
export async function selectQuickTossTargets(item,targets){
 if(!isQuickToss(item))return null;
 const refs=values(targets);
 if(refs.length!==2||!refs.every(r=>String(r.uuid??'').startsWith('Scene.')))
  throw Error('Quick Toss: selecione exatamente duas pessoas: a arremessada e o alvo do arremesso.');
 const options=refs.map((t,n)=>({action:`thrown${n}`,label:`Arremessar ${String(t.name??'personagem').slice(0,35)}`,value:t.uuid}));
 options.push({action:'cancel',label:'Cancelar',value:null});
 const chosen=await chooseD616Dialog({title:'Quick Toss — quem será arremessado?',
  content:'<p>Escolha quem já está <strong>Agarrado</strong> e pode ser levantado. O Mestre confirma o alcance, o tamanho e o agarrão antes do arremesso.</p><p>A pessoa arremessada sofre dano normal, mesmo se o alvo não for atingido.</p>',
  buttons:options,width:500,defaultAction:'thrown0'});
 return chosen?quickTossRoles(refs,chosen):null;
}
export function quickTossOutcome(outcome,refUuid,roles){
 if(roles?.version!==1||roles.thrownUuid!==refUuid)return outcome;
 return {success:true,fantastic:false,pending:false,label:'ARREMESSADO (DANO NORMAL)',thrown:true};
}

/** Defense is based on the last rolled Ego total, not on the actor's ability. */
export function activeProtectionHex(actor){
 for(const e of values(actor?.effects)){
  const cp=e?.flags?.[S]?.concentrationPower,mark=e?.flags?.[S]?.nativeProtectionHex;
  if(e?.disabled||e?.duration?.expired===true||!cp?.transient||!mark||mark.version!==1)continue;
  const power=actor?.items?.get?.(cp.itemId);
  if(isProtectionHex(power)&&String(mark.itemId)===String(power.id)&&Number.isFinite(Number(mark.defense)))return mark;
 }
 return null;
}
export function protectionHexDerived(model,actor){
 const mark=activeProtectionHex(actor);
 if(!mark)return false;
 const total=Number(mark.defense);
 if(!Number.isFinite(total))return false;
 for(const ability of Object.values(model?.abilities??{}))ability.defense=total;
 if(mark.fantastic===true)model.healthDamageReduction=Math.max(1,Number(model.healthDamageReduction)||0);
 return true;
}
export async function applyProtectionHexRoll(item,message){
 if(!isProtectionHex(item)||!message?.rolls?.[0])return false;
 const eff=values(item.actor?.effects).find(e=>!e.disabled&&e?.flags?.[S]?.concentrationPower?.transient&&
  String(e.flags[S].concentrationPower.itemId)===String(item.id));
 if(!eff)return false;
 const roll=message.rolls[0],outcome=getMarvelOutcome(roll,1);
 const snapshot={version:1,itemId:item.id,rollMessageId:message.id,
  signature:rollSignature(roll),defense:Number(roll.total),fantastic:outcome?.fantastic===true};
 const old=eff.getFlag?.(S,'nativeProtectionHex')??eff.flags?.[S]?.nativeProtectionHex;
 if(old?.signature===snapshot.signature&&old?.rollMessageId===message.id)return false;
 await eff.setFlag(S,'nativeProtectionHex',snapshot);
 return snapshot;
}

/** Intercept a single *original* projectile attack while it is still unresolved.
 * Narrator verifies that the attack uses PHYSICAL projectiles and is in reach. */
function candidateMessages(actor,{self=false,limit=6}={}){
 const id=actor?.id;
 // The trigger is immediate, never a roll from an earlier battle/session.
 // Foundry ChatMessages expose millisecond timestamps; test doubles may omit it.
 const fresh=m=>m?.timestamp==null ||
   (Number.isFinite(Number(m.timestamp))&&Math.abs(Date.now()-Number(m.timestamp))<=300000);
 const messages=values(globalThis.game?.messages).filter(m=>m?.rolls?.[0]&&fresh(m)&&!m.getFlag?.(S,'combatChatResolution')&&
  !m.getFlag?.(S,'nativeInstantReplayUsed')&&
  (self?messageActor(m)?.id===id:messageActor(m)?.id!==id));
 return messages.reverse().slice(0,limit);
}
export function checkCatchSource(item,source){
 if(!isCatchBullets(item)||!source?.rolls?.[0])return {ok:false,reason:'Ataque de origem ausente.'};
 if(messageActor(source)?.id===item.actor?.id)return {ok:false,reason:'Não é possível interceptar o próprio ataque.'};
 if(!savedTargets(source).length)return {ok:false,reason:'O ataque original não tem alvo registrado.'};
 if(source.getFlag?.(S,'combatChatResolution')||source.getFlag?.(S,'nativeCatchBulletsCanceled'))
  return {ok:false,reason:'O ataque já foi resolvido ou interceptado.'};
 const attack=messageItem(source);
 if(!attack||!(attack.type==='weapon' && (['ranged','range'].includes(String(attack.system?.attackKind??attack.system?.kind??'').toLowerCase()))) &&
    !(attack.type==='power'&&attack.system?.attackKind==='ranged'))
  return {ok:false,reason:'Catch Bullets requer um ataque à distância com projétil físico.'};
 return {ok:true};
}
export async function selectCatchSource(item){
 const choices=candidateMessages(item.actor).filter(m=>checkCatchSource(item,m).ok).slice(0,4);
 if(!choices.length)throw Error('Catch Bullets: nenhum ataque à distância pendente com alvo registrado.');
 const buttons=choices.map((m,n)=>({action:`attack${n}`,label:`${String(messageItem(m)?.name??'Ataque').slice(0,26)} — ${m.rolls[0].total}`,value:m.id}));
 buttons.push({action:'cancel',label:'Cancelar',value:null});
 const selected=await chooseD616Dialog({title:'Catch Bullets — ataque de projétil',width:520,
  content:'<p>Selecione o <strong>ataque original ainda não resolvido</strong>. O Mestre confirma que o projétil é físico e que o personagem protegido está ao alcance do poder.</p><p>Após a rolagem de Agility, o Mestre confirmará a interceptação no card.</p>',
  buttons});
 const source=selected?globalThis.game?.messages?.get?.(selected):null;
 if(!source)return null;
 const status=checkCatchSource(item,source);
 if(!status.ok)throw Error(status.reason);
 const targets=savedTargets(source);
 if(targets.length!==1)throw Error('Catch Bullets: selecione um ataque original com um único alvo.');
 return {version:1,sourceId:source.id,sourceSignature:rollSignature(source.rolls[0]),
  targetUuid:targets[0],attackTotal:Number(source.rolls[0].total),itemId:item.id};
}
export function catchDecision(result,source,ctx){
 if(!ctx||!source||rollSignature(source?.rolls?.[0])!==ctx.sourceSignature)return {ok:false};
 const outcome=getMarvelOutcome(result,ctx.attackTotal);
 return {ok:outcome?.success===true,fantastic:outcome?.success===true&&outcome?.fantastic===true};
}
export async function confirmCatchBullets(message){
 if(!globalThis.game?.user?.isGM)return false;
 const ctx=message?.getFlag?.(S,'nativeCatchBullets'),source=globalThis.game?.messages?.get?.(ctx?.sourceId);
 const actor=messageActor(message),item=actor?.items?.get?.(ctx?.itemId);
 if(!isCatchBullets(item)||!checkCatchSource(item,source).ok||!ctx?.targetUuid||
  !savedTargets(source).includes(ctx.targetUuid))throw Error('Catch Bullets: ataque original não é mais elegível.');
 const result=catchDecision(message.rolls?.[0],source,ctx);
 if(!result.ok)throw Error('Catch Bullets: teste de Agility não superou o resultado do ataque original.');
 await source.setFlag(S,'nativeCatchBulletsCanceled',{version:1,sourceId:source.id,
  targetUuid:ctx.targetUuid,defenderId:actor.id,defenseMessageId:message.id,
  sourceSignature:ctx.sourceSignature,defenseSignature:rollSignature(message.rolls[0])});
 await message.setFlag(S,'nativeCatchBulletsConfirmed',true);
 let refund=false;
 if(result.fantastic){
  const combatant=reactionCombatant(actor,globalThis.game?.combat);
  if(combatant)refund=!!(await globalThis.game?.multiverseD616?.turnTracker?.refundReaction?.(combatant));
 }
 await globalThis.ChatMessage?.create?.({speaker:message.speaker,
  content:`<p><b>Catch Bullets:</b> projétil interceptado. Ataque original anulado${result.fantastic?`; Sucesso Fantástico, ${refund?'Reação recuperada':'Mestre: confira estorno da Reação'}`:''}.</p>`});
 return {refunded:refund,fantastic:result.fantastic};
}
export function canceledCatchEntry(source,entry){
 const mark=source?.getFlag?.(S,'nativeCatchBulletsCanceled');
 return Boolean(mark?.version===1&&mark.sourceId===source?.id&&mark.targetUuid===entry?.targetUuid&&
  mark.sourceSignature===rollSignature(source?.rolls?.[0]));
}

/** "Just failed": only the latest original roll, same actor, current battle,
 * no damage resolution. GM confirmation of a failed unopposed test is explicit. */
export function findReplaySource(actor){
 const candidate=candidateMessages(actor,{self:true,limit:1})[0];
 if(!candidate?.id||candidate.getFlag?.(S,'nativeInstantReplayUsed'))return null;
 if(values(globalThis.game?.messages).some(m=>m.getFlag?.(S,'damageApplication')?.sourceMessageId===candidate.id))return null;
 return candidate;
}
export function replayEligibility(item,{combat=globalThis.game?.combat,source=findReplaySource(item?.actor)}={}){
 if(!isInstantReplay(item))return {ok:true,applicable:false};
 if(!combat?.started)return {ok:false,reason:'Instant Replay só pode ser usado durante um combate.'};
 if(!source||!source.rolls?.[0]||!source.rolls[0].formula||source.getFlag?.(S,'combatChatResolution'))
  return {ok:false,reason:'Instant Replay: não há um último teste elegível ainda não resolvido.'};
 const mark=item.actor?.getFlag?.(S,'nativeInstantReplay');
 if(mark?.combatId===combat.id&&mark.used)return {ok:false,reason:'Instant Replay: já utilizado neste combate.'};
 return {ok:true,applicable:true,sourceId:source.id,signature:rollSignature(source.rolls[0]),combatId:combat.id};
}
export async function confirmReplayFailure(item,context){
 if(!context?.ok)return false;
 return await chooseD616Dialog({title:'Instant Replay — confirmar falha',width:490,
  content:'<p>O <b>último teste</b> deste personagem acabou de falhar? Confirme com o Mestre antes de gastar a Reação e 10 Focus.</p><p>O resultado novo <b>substituirá o original</b>, mesmo que seja pior. O poder só pode ser usado uma vez por combate.</p>',
  buttons:[{action:'yes',label:'Falha confirmada',value:true},{action:'cancel',label:'Cancelar',value:false}],defaultAction:'yes'});
}
const replayLocks=new Set();
export async function executeInstantReplay(item,context,{RollClass=globalThis.CONFIG?.Dice?.MarvelMultiverseRoll}={}){
 const actor=item.actor,source=globalThis.game?.messages?.get?.(context?.sourceId);
 if(!RollClass||!source?.rolls?.[0]||replayLocks.has(actor?.id))throw Error('Instant Replay indisponível.');
 if(rollSignature(source.rolls[0])!==context.signature)throw Error('Instant Replay: a rolagem original foi alterada.');
 if(!replayEligibility(item,{source}).ok)throw Error('Instant Replay: já utilizado ou a batalha terminou.');
 replayLocks.add(actor.id);
 try{
  const old=source.rolls[0];
  const next=new RollClass(old.formula,old.data??actor.getRollData(),{...old.options,configured:false});
  await next.evaluate({});
  const rendered=await next.toMessage({flavor:source.flavor},{create:false});
  // First replace the original roll; then record the once-per-combat use.
  await source.update({content:rendered?.content??source.content,
   rolls:rendered?.rolls??[next],
   [`flags.${S}.nativeInstantReplayUsed`]:{version:1,sourceId:source.id,
    oldTotal:Number(old.total),newTotal:Number(next.total),oldSignature:context.signature}});
  await actor.setFlag(S,'nativeInstantReplay',{version:1,combatId:context.combatId,
   used:true,sourceMessageId:source.id});
  return {oldTotal:Number(old.total),newTotal:Number(next.total),messageId:source.id};
 }finally{replayLocks.delete(actor.id);}
}

/** Player message author can update a Protection Hex after Edge/Trouble rerolls.
 * Catch Bullets is GM-approved to avoid players canceling enemy attacks. */
export function registerNativePriorityLot2Hooks({hooks=globalThis.Hooks}={}){
 hooks?.on?.('updateChatMessage',(message,changes)=>{
  if(!changes?.rolls&&!changes?.content)return;
  if(!globalThis.game?.user||(!message.isAuthor&&!globalThis.game.user.isGM))return;
  const actor=messageActor(message),item=actor?.items?.get?.(message?.getFlag?.(S,'itemId'));
  if(isProtectionHex(item))void applyProtectionHexRoll(item,message).catch(e=>console.warn('[D616] Protection Hex:',e));
 });
 hooks?.on?.('renderChatMessageHTML',(message,html)=>{
  if(!globalThis.game?.user?.isGM||!message?.rolls?.length||!html?.querySelector)return;
  const ctx=message.getFlag?.(S,'nativeCatchBullets');
  if(!ctx||message.getFlag?.(S,'nativeCatchBulletsConfirmed'))return;
  const container=html.querySelector('.message-content');if(!container)return;
  const source=globalThis.game?.messages?.get?.(ctx.sourceId);
  if(!catchDecision(message.rolls[0],source,ctx).ok)return;
  const btn=document.createElement('button');btn.type='button';btn.textContent='Catch Bullets — confirmar interceptação (Mestre)';
  btn.className='m616-catch-bullets-confirm';
  btn.addEventListener('click',async()=>{btn.disabled=true;try{await confirmCatchBullets(message);}
   catch(error){globalThis.ui?.notifications?.warn?.(String(error?.message??error));btn.disabled=false;}});
  container.append(btn);
 });
}
