import {CONTROL,COPY,DAMPEN,collectionValues as all,isCopyPower,isDampenPower,isPowerControl,controlEffect,controlSource,copiedPowerUsable,passiveMultiplierChanges,dampenedPower} from './power-control-rules.mjs';
import {parseFocusCost,validateFocusSpend,focusAvailable} from './focus-cost.mjs';
import {getMarvelOutcome} from './power-conditions.mjs';
import {rollSignature} from './multi-target-combat.mjs';
import {normalizeItemEffectDurations} from './active-effect-v14-compat.mjs';
const S='multiverse-d616';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gm=()=>!!globalThis.game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
const dlg=()=>globalThis.foundry?.applications?.api?.DialogV2;
const sourceToken=(actor,scene)=>actor?.token?.parent?.id===scene?.id?actor.token:globalThis.canvas?.tokens?.controlled?.find?.(t=>t.actor?.uuid===actor?.uuid)?.document??all(scene?.tokens).find(t=>t.actor?.uuid===actor?.uuid);
const dist=(a,b,scene)=>{const g=Number(scene?.grid?.size)||100;return Math.hypot((a.x-b.x)/g+(Number(a.width??1)-Number(b.width??1))/2,(a.y-b.y)/g+(Number(a.height??1)-Number(b.height??1))/2);};
export function controlEligibility(item,sel,scene){
 const source=scene?.tokens?.get?.(sel?.sourceTokenId),target=scene?.tokens?.get?.(sel?.targetTokenId),power=target?.actor?.items?.get?.(sel?.targetItemId);
 if(!isPowerControl(item)||sel?.version!==1||sel.sceneId!==scene?.id||!source?.actor||source.actor.uuid!==item.actor?.uuid||!target?.actor||source.actor.uuid===target.actor.uuid||power?.type!=='power'||!copiedPowerUsable(power))return {ok:false,reason:'Origem, alvo ou poder inválido.'};
 const max=isCopyPower(item)?10:20;
 if(dist(source,target,scene)>max+1e-6)return {ok:false,reason:`Alvo além de ${max} espaços.`};
 if(isCopyPower(item)&&all(source.actor.items).some(p=>p.type==='power'&&p.name===power.name&&p.system?.powerSet===power.system?.powerSet))return {ok:false,reason:'Você já possui esse poder; duplicar o mesmo benefício não é permitido pela automação.'};
 if(isDampenPower(item)&&dampenedPower(power))return {ok:false,reason:'Este poder já está enfraquecido.'};
 if(isDampenPower(item)&&!(Number(target.actor.system?.abilities?.ego?.defense)>0))return {ok:false,reason:'Defesa de Ego indisponível.'};
 return {ok:true,source,target,power,defense:Number(target.actor.system?.abilities?.ego?.defense)};
}
export function controlCost(power,chosen){
 const cost=parseFocusCost(power?.system?.cost),raw=String(power?.system?.cost??'').trim();
 const variable=cost.type==='variable'||(!cost.hasFocus&&!!raw&&!/^(?:none|nenhum|nenhuma|0|—|-|n\/a)$/i.test(raw));
 if(variable){const n=Number(chosen);return Number.isSafeInteger(n)&&n>=cost.min?{ok:true,amount:n,variable:true}:{ok:false,minimum:cost.min,variable:true};}
 return {ok:true,amount:cost.hasFocus?cost.min:0,variable:false};
}
export async function selectPowerControl(item){
 if(!game.user?.isGM&&!game.users?.activeGM)throw Error('É necessário um Mestre conectado.');
 if(game.multiverseD616?.automationEnabled?.('concentration')===false)throw Error('Ative a automação de Concentração.');
 if(controlEffect(item.actor,item.id))throw Error('Encerre a Concentração atual deste poder antes de escolher outro.');
 const scene=globalThis.canvas?.scene,source=sourceToken(item.actor,scene),D=dlg();
 if(!scene||!source||!D?.wait)throw Error('Selecione o token do personagem em uma cena ativa.');
 const max=isCopyPower(item)?10:20;
 const tokens=all(scene.tokens).filter(t=>t.actor&&t.actor.uuid!==source.actor.uuid&&dist(source,t,scene)<=max+1e-6&&(!t.hidden||game.user.isGM)&&all(t.actor.items).some(p=>p.type==='power'));
 if(!tokens.length)throw Error(`Nenhum alvo com poderes a até ${max} espaços.`);
 const targetId=await D.wait({window:{title:`${item.name} — alvo`},rejectClose:false,content:`<p>Escolha um alvo a até ${max} espaços.</p><select name="target">${tokens.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select>`,buttons:[{action:'confirm',label:'Selecionar',default:true,callback:(_e,b)=>b.form.querySelector('[name=target]').value},{action:'cancel',label:'Cancelar',callback:()=>null}]});
 if(!targetId)return null;
 const target=scene.tokens.get(targetId),powers=all(target.actor.items).filter(p=>p.type==='power'&&copiedPowerUsable(p)&&(!isDampenPower(item)||!dampenedPower(p))&&(!isCopyPower(item)||!all(item.actor.items).some(i=>i.type==='power'&&i.name===p.name&&i.system?.powerSet===p.system?.powerSet))).sort((a,b)=>a.name.localeCompare(b.name));
 if(!powers.length)throw Error('Nenhum poder elegível no alvo.');
 const id=await D.wait({window:{title:`${item.name} — ${target.name}`},rejectClose:false,content:`<p>Escolha o poder. O Mestre confirmará a aplicação.</p><select name="power">${powers.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.system?.cost||'sem custo')})</option>`).join('')}</select>`,buttons:[{action:'confirm',label:'Confirmar',default:true,callback:(_e,b)=>b.form.querySelector('[name=power]').value},{action:'cancel',label:'Cancelar',callback:()=>null}]});
 if(!id)return null;
 const sel={version:1,sceneId:scene.id,sourceTokenId:source.id,targetTokenId:target.id,targetItemId:id,cost:0};
 const check=controlEligibility(item,sel,scene);if(!check.ok)throw Error(check.reason);
 if(isDampenPower(item)){
  let cost=controlCost(check.power);
  if(!cost.ok){const amount=await D.wait({window:{title:'Dampen Power — custo variável'},rejectClose:false,content:`<p>Informe o custo efetivo de Focus do poder enfraquecido, de acordo com o Mestre.</p><input type="number" name="amount" min="${cost.minimum}" step="1" value="${cost.minimum}">`,buttons:[{action:'confirm',label:'Confirmar',default:true,callback:(_e,b)=>Number(b.form.querySelector('[name=amount]').value)},{action:'cancel',label:'Cancelar',callback:()=>null}]});if(amount===null||amount===undefined)return null;cost=controlCost(check.power,amount);if(!cost.ok&&!parseFocusCost(check.power.system?.cost).hasFocus&&Number.isSafeInteger(amount)&&amount>=0)cost={ok:true,amount,variable:true};}
  if(!cost.ok)throw Error('Custo inválido.');sel.cost=cost.amount;
  const payment=validateFocusSpend(item.actor,sel.cost);if(!payment.ok)throw Error(payment.reason);
 }
 if(typeof game.user.updateTokenTargets==='function')await game.user.updateTokenTargets([target.id]);else for(const t of canvas.tokens?.placeables??[])t.setTarget?.(t.document.id===target.id,{user:game.user,releaseOthers:false});return sel;
}
export function copiedItemData(power,mark){
 const raw=power.toObject?power.toObject():structuredClone({name:power.name,type:power.type,img:power.img,system:power.system,effects:all(power.effects)});
 const effects=(raw.effects??[]).map(e=>{const copy={...e};delete copy._id;delete copy._stats;delete copy.origin;return copy;});
 return normalizeItemEffectDurations({name:raw.name,type:'power',img:raw.img,system:raw.system,effects,flags:{[S]:{[COPY]:mark}}});
}
export async function postCopyRequest(item,selection){return ChatMessage.create({speaker:{scene:selection.sceneId,token:selection.sourceTokenId,actor:item.actor.id,alias:item.actor.name},content:`<p><b>Copy Power:</b> aguardando confirmação do Mestre para copiar o poder selecionado.</p>`,flags:{[S]:{itemId:item.id,nativePowerControlRequest:selection}}});}
const busy=new Set();
export async function resolvePowerControl(message,{confirm=async()=>true,post=async data=>ChatMessage.create(data)}={}){
 if(!gm())throw Error('Somente o Mestre ativo pode resolver este poder.');
 if(busy.has(message.id)||message.getFlag(S,'nativePowerControlResolved'))return false;
 busy.add(message.id);
 try{
  const sel=message.getFlag(S,'nativePowerControlRequest'),scene=game.scenes?.get?.(sel?.sceneId),source=scene?.tokens?.get?.(sel?.sourceTokenId),actor=source?.actor,item=actor?.items?.get?.(message.getFlag(S,'itemId'));
  if(!actor||message.speaker?.scene!==scene.id||message.speaker?.token!==source.id||message.speaker?.actor!==actor.id)throw Error('Origem do card inválida.');
  const author=message.author??message.user;if(!author?.isGM&&!actor.testUserPermission?.(author,'OWNER'))throw Error('Autor não autorizado.');
  const check=controlEligibility(item,sel,scene);if(!check.ok)throw Error(check.reason);
  const fx=controlEffect(actor,item.id);if(!fx||fx.flags?.[S]?.[CONTROL])throw Error('Concentração ausente ou já resolvida.');
  const damp=isDampenPower(item),roll=message.rolls?.[0];
  if(damp&&!roll)throw Error('Rolagem de Ego ausente.');
  if(damp&&!message.getFlag(S,'targets')?.some(t=>(t.uuid??t)===check.target.uuid))throw Error('O alvo da rolagem não corresponde ao poder escolhido.');
  const outcome=damp?getMarvelOutcome(roll,check.defense,{message,targetActor:check.target.actor}):{success:true};if(!outcome)throw Error('Rolagem não resolvida.');
  const signature=damp?rollSignature(roll):null;
  const cost=damp?controlCost(check.power,sel.cost):{ok:true,amount:0};
  if(damp&&!cost.ok&&cost.variable&&Number.isSafeInteger(sel.cost)&&sel.cost>=cost.minimum)Object.assign(cost,{ok:true,amount:sel.cost});
  if(!cost.ok||damp&&cost.amount!==sel.cost)throw Error('Custo do poder alterado.');
  if(!await confirm({actor,item,...check,outcome,cost:cost.amount}))return false;
  if(damp&&rollSignature(message.rolls[0])!==signature)throw Error('A rolagem mudou. Confirme novamente.');
  if(controlEffect(actor,item.id)?.id!==fx.id||!controlEligibility(item,sel,scene).ok)throw Error('A situação mudou; verifique novamente.');
  if(!outcome.success){await message.setFlag(S,'nativePowerControlResolved',{success:false});await actor.deleteEmbeddedDocuments('ActiveEffect',[fx.id]);await post({speaker:message.speaker,content:'<p><b>Dampen Power:</b> falha. Nenhum poder enfraquecido; nenhum Focus de enfraquecimento cobrado.</p>'});return true;}
  const payment=validateFocusSpend(actor,cost.amount);if(!payment.ok)throw Error(payment.reason);
  const mark={version:1,sceneId:scene.id,sourceTokenId:source.id,sourceActorUuid:actor.uuid,sourceItemId:item.id,sourceEffectId:fx.id,activationId:message.id,targetItemId:check.power.id};
  const state={...mark,kind:damp?'dampen':'copy',targetTokenId:check.target.id,targetActorUuid:check.target.actor.uuid};
  let created=null,paid=false;
  await fx.setFlag(S,CONTROL,state);
  try{
   if(damp){if(cost.amount){await actor.update({'system.focus.value':focusAvailable(actor)-cost.amount});paid=true;}
    [created]=await check.target.actor.createEmbeddedDocuments('ActiveEffect',[{name:`Dampen Power — ${check.power.name}`,img:item.img,disabled:false,changes:[],flags:{[S]:{[DAMPEN]:mark}}}]);
   }else [created]=await actor.createEmbeddedDocuments('Item',[copiedItemData(check.power,mark)]);
   if(!created)throw Error('O efeito não foi criado.');
   await message.setFlag(S,'nativePowerControlResolved',{success:true,activationId:message.id,cost:cost.amount});
  }catch(e){if(created){const parent=damp?check.target.actor:actor;await parent.deleteEmbeddedDocuments(damp?'ActiveEffect':'Item',[created.id]);}if(paid)await actor.update({'system.focus.value':focusAvailable(actor)+cost.amount});await fx.unsetFlag(S,CONTROL);throw e;}
  await post({speaker:message.speaker,content:`<p><b>${esc(item.name)}:</b> ${esc(check.power.name)} (${esc(check.target.name)}) — ${damp?`enfraquecido; ${cost.amount} Focus. Sem Fantásticos; alcance/área/duração pela metade e DM −1 quando aplicável. Efeitos especiais fora dos mecanismos integrados: Mestre resolve.`:'copiado temporariamente; use na ficha/HUD pagando os custos normais.'}</p>`});
  return true;
 }finally{busy.delete(message.id);}
}
let queue=Promise.resolve();
export function syncPowerControl(){const job=queue.catch(()=>{}).then(async()=>{
 if(!gm())return;
 const actors=new Map(all(game.actors).map(a=>[a.uuid,a]));for(const scene of all(game.scenes))for(const t of all(scene.tokens))if(t.actor)actors.set(t.actor.uuid,t.actor);
 for(const actor of actors.values()){
  for(const item of all(actor.items)){const m=item.flags?.[S]?.[COPY];if(!m||controlSource(m))continue;
   const conc=controlEffect(actor,item.id);if(conc&&actor.effects.get?.(conc.id))await actor.deleteEmbeddedDocuments('ActiveEffect',[conc.id]);
   if(actor.items.get?.(item.id))await actor.deleteEmbeddedDocuments('Item',[item.id]);
  }
  for(const fx of all(actor.effects)){const m=fx.flags?.[S]?.[DAMPEN];if(m&&(!controlSource(m)||!actor.items.get?.(m.targetItemId))&&actor.effects.get?.(fx.id))await actor.deleteEmbeddedDocuments('ActiveEffect',[fx.id]);}
 }
 });queue=job.catch(()=>{});return job;}
export function registerPowerControlHooks({hooks=globalThis.Hooks}={}){
 hooks.on('renderChatMessageHTML',(message,html)=>{if(!gm()||!message.getFlag(S,'nativePowerControlRequest')||message.getFlag(S,'nativePowerControlResolved'))return;
  const parent=html?.querySelector?.('.message-content');if(!parent||parent.querySelector('.m616-power-control-resolve'))return;
  const b=document.createElement('button');b.type='button';b.className='m616-power-control-resolve';b.textContent='Resolver Power Control (Mestre)';parent.append(b);
  b.addEventListener('click',async()=>{b.disabled=true;try{await resolvePowerControl(message,{confirm:ctx=>dlg().confirm({window:{title:`${ctx.item.name} — Mestre`},rejectClose:false,content:`<p>${esc(ctx.actor.name)} → ${esc(ctx.target.name)}: <b>${esc(ctx.power.name)}</b>.</p><p>${ctx.outcome.success?'Sucesso: aplicar efeito.':'Falha: encerrar tentativa.'} ${isDampenPower(ctx.item)&&ctx.outcome.success?`Custo: ${ctx.cost} Focus.`:''}</p>`})});}catch(e){ui.notifications?.warn?.(e.message);console.warn('[D616] Power Control',e);}finally{b.disabled=false;}});
 });
 for(const event of ['deleteActiveEffect','updateActiveEffect','deleteItem','deleteToken','deleteScene','canvasReady'])hooks.on(event,()=>void syncPowerControl().catch(e=>console.warn('[D616] Power Control cleanup',e)));
 void syncPowerControl().catch(e=>console.warn('[D616] Power Control startup',e));
}
