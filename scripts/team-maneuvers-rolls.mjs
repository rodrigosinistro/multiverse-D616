/** Offensive 2 — one complete, optional reroll per eligible attack card.
 * A button on the original attack avoids duplicating attacks or spending
 * Focus/actions. The better roll is retained in the same chat message.
 */
import {activeTeamManeuvers} from './team-maneuvers-effects.mjs';
import {getMarvelOutcome} from './power-conditions.mjs';

const SYSTEM='multiverse-d616';
const inProgress=new Set();

export function teamRerollPermission(message,combat=globalThis.game?.combat) {
  const flag=message?.getFlag?.(SYSTEM,'teamAttackBenefits')??message?.flags?.[SYSTEM]?.teamAttackBenefits;
  if(!flag?.levels?.includes(2) || !message?.rolls?.[0]) return false;
  if (!combat?.started || String(flag.combatId)!==String(combat.id) ||
      Number(flag.round)!==Number(combat.round)) return false;
  if (message?.getFlag?.(SYSTEM,'teamOffensive2Used') === true) return false;
  if (activeTeamManeuvers(combat).every(entry=>entry.type!=='Offensive'||Number(entry.level)!==2||
      !(entry.actorUuids??[]).includes(flag.actorUuid)))return false;
  return true;
}

/** Preserve the most successful result, using Fantastic on a tie in total. */
export function chooseTeamReroll(original,newRoll) {
  const first=getMarvelOutcome(original,1);
  const second=getMarvelOutcome(newRoll,1);
  if (!Number.isFinite(Number(original?.total)) || !Number.isFinite(Number(newRoll?.total)))
    throw Error('Os dados da rolagem não puderam ser comparados.');
  const oldTotal=Number(original.total),newTotal=Number(newRoll.total);
  const useNew=newTotal>oldTotal || (newTotal===oldTotal && !!second?.fantastic&&!first?.fantastic);
  return {useNew, oldTotal, newTotal, oldFantastic:!!first?.fantastic,
    newFantastic:!!second?.fantastic};
}

function damageAlreadyGenerated(message){
  const all=globalThis.game?.messages?.contents??[];
  return all.some(other=>other?.getFlag?.(SYSTEM,'damageApplication')?.sourceMessageId===message.id);
}

export async function executeTeamOffensiveReroll(message,{combat=globalThis.game?.combat,
  user=globalThis.game?.user, RollClass=globalThis.CONFIG?.Dice?.MarvelMultiverseRoll}={}) {
  if(!message?.id || !teamRerollPermission(message,combat))
    throw Error('A Ofensiva 2 não está mais disponível para este ataque nesta rodada.');
  if(!user?.isGM && !message.isAuthor)
    throw Error('Somente o autor do ataque ou o Mestre pode repetir esses dados.');
  if (damageAlreadyGenerated(message))
    throw Error('O ataque já possui um card de dano. Não é possível repetir os dados após gerar o dano.');
  if(!RollClass)throw Error('O mecanismo de rolagem do sistema não está disponível.');
  if(inProgress.has(message.id))throw Error('Este ataque já está sendo repetido.');
  inProgress.add(message.id);
  try {
    if(message.getFlag?.(SYSTEM,'teamOffensive2Used')===true)
      throw Error('Este ataque já utilizou a repetição de Ofensiva 2.');
    const original=message.rolls[0];
    const next=new RollClass(original.formula,original.data??{},
      {...original.options,configured:false});
    await next.evaluate({});
    next.applyForcedMarvelM?.();
    const choice=chooseTeamReroll(original,next);
    const selected=choice.useNew?next:original;
    const summary=`Ofensiva 2: original ${choice.oldTotal}${choice.oldFantastic?' (M)':''}; `+
      `repetição ${choice.newTotal}${choice.newFantastic?' (M)':''}. `+
      `${choice.useNew?'A repetição foi mantida.':'O resultado original foi mantido.'}`;
    // Use the same roll serialization as the native Edge/Trouble chat pipeline.
    const update=await selected.toMessage({flavor:message.flavor},{create:false});
    await message.update({content:update?.content??message.content,
      rolls:update?.rolls??[selected],
      'flags.multiverse-d616.teamOffensive2Used':true,
      'flags.multiverse-d616.teamOffensive2Summary':summary});
    return {...choice,summary};
  }finally{inProgress.delete(message.id);}
}

export function registerTeamManeuverRollHooks(){
  globalThis.Hooks?.on?.('renderChatMessageHTML',(message,html)=>{
    if(!html?.querySelector || !message?.rolls?.length)return;
    const details=message.getFlag?.(SYSTEM,'teamAttackBenefits');
    const container=html.querySelector('.message-content');
    if(!details?.levels?.length||!container)return;
    if(html.querySelector('.d616-team-attack-benefits'))return;
    const node=document.createElement('div');
    node.className='d616-team-attack-benefits';
    const lines=[];
    if(details.levels.includes(1))lines.push('Ofensiva 1: 1 Edge incluído nos ataques da rodada.');
    if(details.levels.includes(3))lines.push('Ofensiva 3: M automático contra alvos de Rank igual ou superior ao atacante.');
    if(details.levels.includes(2)){
      const used=message.getFlag?.(SYSTEM,'teamOffensive2Used');
      if(used){
        lines.push(message.getFlag?.(SYSTEM,'teamOffensive2Summary')??'Ofensiva 2: repetição já utilizada.');
      }else if(teamRerollPermission(message) && (globalThis.game?.user?.isGM || message.isAuthor)) {
        const btn=document.createElement('button');
        btn.type='button';btn.className='d616-team-reroll';
        btn.textContent='Ofensiva 2 — repetir os 3 dados (1×)';
        btn.addEventListener('click',async event=>{
          event.preventDefault();event.stopPropagation();btn.disabled=true;
          try{const result=await executeTeamOffensiveReroll(message);
            globalThis.ui?.notifications?.info?.(result.summary);
          }catch(error){globalThis.ui?.notifications?.warn?.(error?.message??String(error));
            btn.disabled=false;console.warn('[D616 Team Maneuvers]',error);}
        });
        node.append(btn);
      }else{lines.push('Ofensiva 2: repetição indisponível após esta rodada ou após gerar o dano.');}
    }
    if(lines.length){const p=document.createElement('p');p.textContent=lines.join(' ');node.prepend(p);}
    container.append(node);
  });
}
