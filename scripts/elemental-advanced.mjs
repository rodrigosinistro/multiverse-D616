/**
 * Elemental advanced powers — Foundry v14.
 * The four source powers do not have identical success and damage rules.
 * Elemental/Telekinetic Barrier create real Walls plus ray templates as in the
 * user's Elemental Barrier v5 macro; Sphere and Prison keep Foundry Regions.
 */
import {getMarvelOutcome, normalizeConditionDefense} from './power-conditions.mjs';
import {parseFocusCost} from './focus-cost.mjs';
import {regionDataForPower,AREA_STRUCTURE_NAMES,AREA_WALL_NAMES,AREA_SPHERE_NAMES,tokenCenter} from './elemental-area-geometry.mjs';
import {captureCanvasCircle,captureCanvasWall} from './elemental-draw-pointer.mjs';
import {BARRIER_ELEMENTS,barrierMaterial,barrierLineValid,wallDocuments,barrierDocumentsForEffect} from './elemental-wall-geometry.mjs';

const SYSTEM='multiverse-d616';
const NAMES=new Set([...AREA_STRUCTURE_NAMES,'Elemental Suffocation','Elemental Push']);
const BARRIER=new Set(AREA_STRUCTURE_NAMES);
const GRID_DIRECTIONS=Object.freeze({N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]});
const list=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function isAdvancedElementalPower(name){return NAMES.has(String(name??'').trim());}
export function elementalProtection(actor){
  const protection=list(actor?.items).filter(item=>item.type==='power').map(item=>{
    const level=/^Elemental Protection ([1-4])$/i.exec(String(item.name??'').trim());
    if(!level)return null;
    const cost=parseFocusCost(item.system?.cost);
    return cost.hasFocus?{level:Number(level[1]),cost:cost.min,threshold:10*Number(level[1]),itemId:item.id}:null;
  }).filter(Boolean).sort((a,b)=>b.level-a.level);
  return protection[0]??null;
}
export function telekineticProtection(actor){
  const protection=list(actor?.items).filter(item=>item.type==='power').map(item=>{
    const match=/^Telekinetic Protection ([1-4])$/i.exec(String(item.name??'').trim());
    if(!match)return null;
    const level=Number(match[1]);
    return {level,cost:5*level,threshold:10*level,itemId:item.id};
  }).filter(Boolean).sort((a,b)=>b.level-a.level);
  return protection[0]??null;
}
export function areaPowerProtection(name,actor){
  if(AREA_WALL_NAMES.has(name))return {level:1,cost:5,threshold:10};
  return name.startsWith('Telekinetic')?telekineticProtection(actor):elementalProtection(actor);
}
export function resolvedAdvancedFocusItem(item,actor){
  if(!BARRIER.has(item?.name))return item;
  const shield=areaPowerProtection(item.name,actor);
  if(!shield)return null;
  return {type:'power',name:item.name,system:{cost:`${shield.cost} Focus`,effect:item.system?.effect??''}};
}
export function hasOwnElementalGrab(target,caster){
  if(!target||!caster)return false;
  return list(target.effects).some(effect=>{
    if(effect.disabled)return false;
    const flag=effect.flags?.[SYSTEM]?.powerCondition;
    if(flag?.status!=='grabbed'||flag?.sourceActorUuid!==caster.uuid)return false;
    const source=list(caster.items).find(item=>item.id===flag.sourceItemId);
    return source?.name==='Elemental Grab';
  });
}
export function validateAdvancedElementalTargets(name,caster,targets){
  if(!isAdvancedElementalPower(name))return {ok:true};
  if(BARRIER.has(name) && !AREA_WALL_NAMES.has(name) && !areaPowerProtection(name,caster))
    return {ok:false,reason:`${name} exige possuir ${name.startsWith('Telekinetic')?'Telekinetic':'Elemental'} Protection, que determina o custo e a resistência da estrutura.`};
  if(name==='Elemental Push'||name==='Elemental Suffocation'){
    if(targets.length!==1)return {ok:false,reason:`Marque exatamente um token-alvo antes de usar ${name}.`};
    if(!targets[0]?.actor)return {ok:false,reason:'O token selecionado não possui personagem.'};
  }
  if(name==='Elemental Suffocation'&&!hasOwnElementalGrab(targets[0]?.actor,caster))
    return {ok:false,reason:'Elemental Suffocation exige que o alvo esteja Agarrado pelo Elemental Grab deste personagem.'};
  return {ok:true};
}
export function advancedNeedsDamage(name,outcome,{displaced=false}={}){
  if(AREA_SPHERE_NAMES.has(name)&&!displaced)return false;
  return !!outcome?.success && (name==='Elemental Suffocation'||(outcome.fantastic&&isAdvancedElementalPower(name)));
}
export function advancedMayMove(name,outcome){return !!outcome?.success && (name==='Elemental Push'||AREA_SPHERE_NAMES.has(name));}
export function absorbElementalStructureHit(rawDamage,threshold){
  const damage=Number(rawDamage),limit=Number(threshold);
  if(!Number.isFinite(damage)||damage<0||!Number.isFinite(limit)||limit<=0)throw new Error('Dano ou proteção inválidos.');
  return {absorbed:true,destroyed:damage>limit,damageToOccupants:0,threshold:limit};
}
export function displacementTargetPosition(token,dir,spaces,grid,rank,scene){
  const direction=GRID_DIRECTIONS[dir];
  if(!direction)throw new Error('Direção inválida.');
  const amount=Number(spaces),size=Number(grid),max=Number(rank);
  if(!Number.isInteger(amount)||amount<1||!Number.isFinite(max)||max<1||amount>max)
    throw new Error(`A distância deve ser de 1 a ${max} espaços.`);
  if(!Number.isFinite(size)||size<=0)throw new Error('Grade indisponível.');
  const x=Number(token.x)+direction[0]*amount*size, y=Number(token.y)+direction[1]*amount*size;
  const maxX=Number(scene?.width)-Number(token.width??1)*size;
  const maxY=Number(scene?.height)-Number(token.height??1)*size;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>maxX||y>maxY)
    throw new Error('Destino fora dos limites da cena.');
  return {x,y};
}
const flagged=(message,key)=>message?.getFlag?.(SYSTEM,key);
async function origin(message){
  const scene=game.scenes?.get?.(message.speaker?.scene);
  const token=scene?.tokens?.get?.(message.speaker?.token);
  const actor=token?.actor??game.actors?.get?.(message.speaker?.actor);
  const item=actor?.items?.get?.(flagged(message,'itemId'));
  return {actor,item,token};
}
async function targetOutcomes(message){
  const {actor,item,token}=await origin(message);
  if(!actor||!item||!isAdvancedElementalPower(item.name))return {actor,item,token,targets:[]};
  const roll=message.rolls?.[0],defenseKey=flagged(message,'attackTarget')??item.system?.attackTarget;
  const targets=[];
  for(const ref of flagged(message,'targets')??[]){
    const uuid=ref?.uuid??ref;
    const doc=uuid?.startsWith?.('Scene.')?await fromUuid(uuid).catch(()=>null):null;
    if(!doc?.actor)continue;
    const ability=normalizeConditionDefense(defenseKey,doc.actor);
    const defense=Number(doc.actor.system?.abilities?.[ability]?.defense??0);
    const outcome=getMarvelOutcome(roll,defense);
    targets.push({doc,outcome});
  }
  return {actor,item,token,targets};
}
function activeGM(){return !!game.user?.isGM && (!game.users?.activeGM||game.users.activeGM.id===game.user.id);}
function currentConcentration(actor,item){return list(actor?.effects).find(e=>!e.disabled&&e.flags?.[SYSTEM]?.concentrationPower?.itemId===item?.id)??null;}
async function choose(title,content,field,choices){
  const D=foundry.applications?.api?.DialogV2;
  if(!D?.wait)throw new Error('Este controle requer Foundry VTT v14.');
  return D.wait({window:{title},content:`<form><p>${content}</p><div class="form-group"><label>${esc(field)}</label><select name="choice">${choices.map(c=>`<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select></div></form>`,
    rejectClose:false,buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'ok',label:'Confirmar',default:true,callback:(_event,button)=>button.form.elements.choice.value}]});
}
const ARROWS=Object.freeze({NW:'↖',N:'↑',NE:'↗',W:'←',E:'→',SW:'↙',S:'↓',SE:'↘'});
const SOCKET=`system.${SYSTEM}`;
function ownerOfRoll(message){return String(message?.user?.id??message?.user??'');}
function casterForMessage(message){
  const scene=game.scenes?.get?.(message?.speaker?.scene);
  return scene?.tokens?.get?.(message?.speaker?.token)?.actor??game.actors?.get?.(message?.speaker?.actor)??null;
}
/** The card may be GM-authored while the caster belongs to a player.
 * Verify Actor OWNER rights, not merely the chat-message author. */
export function mayControlElementalCard(message,user=game.user){
  if(!user)return false;
  if(user.isGM)return true;
  const caster=casterForMessage(message);
  if(caster){
    if(typeof caster.testUserPermission==='function')return !!caster.testUserPermission(user,globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3);
    return !!caster.isOwner&&user.id===game.user?.id;
  }
  // Legacy cards without a resolvable speaker: only the author can operate.
  return ownerOfRoll(message)===user.id;
}
function mayControl(message){return mayControlElementalCard(message,game.user);}
function validElementalRequester(message,userId){
  const user=game.users?.get?.(userId);
  return !!user && !user.isGM && mayControlElementalCard(message,user);
}
function actorRank(actor){return Math.max(1,Number(actor?.system?.attributes?.rank?.value??1));}
export function arrowForDirection(dir){return ARROWS[dir]??null;}
async function chooseDirection(name,target,limit){
  const D=foundry.applications?.api?.DialogV2;
  if(!D?.wait)throw new Error('Foundry VTT v14 é necessário.');
  const arrowButton=dir=>`<label style="display:flex;align-items:center;justify-content:center;cursor:pointer;padding:7px;border:1px solid #777;border-radius:5px"><input name="dir" type="radio" value="${dir}" ${dir==='N'?'checked':''} style="width:auto;margin-right:4px"> <span style="font-size:25px;font-weight:bold">${ARROWS[dir]}</span></label>`;
  const grid=['NW','N','NE','W',null,'E','SW','S','SE'].map(d=>d?arrowButton(d):'<div></div>').join('');
  const choices=Array.from({length:limit},(_,i)=>`<option value="${i+1}">${i+1} espaço${i?'s':''}</option>`).join('');
  return D.wait({window:{title:`${name} — Direção do alvo`},rejectClose:false,
    content:`<form><p>Escolha a direção e a distância para <b>${esc(target)}</b>.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:225px;margin:8px auto">${grid}</div><div class="form-group"><label>Distância</label><select name="steps">${choices}</select></div><p style="font-size:0.85em">Paredes e obstáculos devem ser conferidos na cena.</p></form>`,
    buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},{action:'ok',label:'Mover',default:true,callback:(_e,b)=>({dir:b.form.elements.dir.value,steps:Number(b.form.elements.steps.value)})}]});
}
async function performMovement(message,targetUuid,dir,steps,requestedBy=null){
  if(!activeGM())throw new Error('A movimentação precisa ser confirmada pelo Mestre ativo.');
  if(requestedBy && !validElementalRequester(message,requestedBy))throw new Error('Solicitante não controla o personagem atacante.');
  const {actor,item,targets}=await targetOutcomes(message);
  const t=targets.find(row=>row.doc.uuid===targetUuid);
  if(!t||!advancedMayMove(item?.name,t.outcome))throw new Error('Alvo sem acerto válido para deslocamento.');
  const rank=actorRank(actor),limit=item.name==='Elemental Push'?rank:5*rank;
  if(flagged(message,`elementalMoved_${t.doc.id}`))throw new Error('Este alvo já foi movimentado por este uso do poder.');
  const updated=displacementTargetPosition(t.doc,dir,steps,Number(t.doc.parent?.grid?.size),limit,t.doc.parent);
  await t.doc.update(updated);
  await message.setFlag(SYSTEM,`elementalMoved_${t.doc.id}`,{uuid:t.doc.uuid,x:updated.x,y:updated.y});
  ui.notifications?.info?.(`${item.name}: ${t.doc.name} movido ${steps} espaço(s) ${arrowForDirection(dir)}.`);
}
async function moveViaOwner(message,targetUuid){
  if(!mayControl(message))throw new Error('Apenas o atacante ou o Mestre podem escolher o deslocamento.');
  const {actor,item,targets}=await targetOutcomes(message);
  const target=targets.find(row=>row.doc.uuid===targetUuid);
  if(!target||!advancedMayMove(item?.name,target.outcome))throw new Error('O ataque não acertou este alvo.');
  if(flagged(message,`elementalMoved_${target.doc.id}`))throw new Error('O deslocamento deste alvo já foi realizado.');
  const limit=item.name==='Elemental Push'?actorRank(actor):5*actorRank(actor);
  const answer=await chooseDirection(item.name,target.doc.name,limit);
  if(!answer)return;
  if(activeGM())await performMovement(message,targetUuid,answer.dir,answer.steps);
  else {
    if(!game.users?.activeGM)throw new Error('O Mestre precisa estar conectado para mover um alvo de terceiros.');
    game.socket.emit(SOCKET,{type:'elemental-move',requesterId:game.user.id,messageId:message.id,targetUuid,dir:answer.dir,steps:answer.steps});
    ui.notifications?.info?.('Movimentação solicitada ao Mestre.');
  }
}
function concentrationForMessage(message){
  const scene=game.scenes?.get?.(message.speaker?.scene);
  const actor=scene?.tokens?.get?.(message.speaker?.token)?.actor??game.actors?.get?.(message.speaker?.actor);
  const item=actor?.items?.get?.(flagged(message,'itemId'));
  return {actor,item,effect:currentConcentration(actor,item)};
}
/** Legacy public helper used by old tests; runtime uses RegionDocument. */
export function templateDataForPower(name,center,rank,gridDistance,source={}){
  if(!BARRIER.has(name)||!Number.isFinite(Number(center?.x))||!Number.isFinite(Number(center?.y)))throw new Error('Ponto inválido.');
  return {t:AREA_WALL_NAMES.has(name)?'rect':'circle',x:Math.round(Number(center.x)),y:Math.round(Number(center.y)),
    distance:5*Math.max(1,Number(rank))*Number(gridDistance),
    fillColor:name==='Elemental Sphere'?'#6bb6ff':'#e8a761',
    flags:{[SYSTEM]:{elementalArea:{...source,name}}}};
}
async function createAreaRegion(message,draw,requester=null){
  if(!activeGM())throw new Error('O Mestre deve confirmar a criação da área.');
  if(requester && !validElementalRequester(message,requester))throw new Error('Solicitante não controla o conjurador.');
  const name=flagged(message,'elementalAreaPower')??flagged(message,'advancedElemental')?.name;
  if(!BARRIER.has(name))throw new Error('Este card não é de um poder de estrutura.');
  const {actor,item,effect}=concentrationForMessage(message);
  if(!actor||!item||item.name!==name||!effect)throw new Error('A Concentração desse poder não está ativa.');
  const scene=game.scenes?.get?.(message.speaker?.scene);
  if(!scene)throw new Error('Cena original indisponível.');
  const pixel=Number(scene.grid?.size??100),rank=actorRank(actor);
  const center={x:Number(draw?.center?.x),y:Number(draw?.center?.y)};
  const radius=Number(draw?.radius);
  if(AREA_WALL_NAMES.has(name)){
    const position=scene.tokens?.get?.(message.speaker?.token);
    const casterCenter=tokenCenter(position,scene);
    const validity=barrierLineValid({start:draw?.start,end:draw?.end,caster:casterCenter,rank,scene});
    if(!validity.ok)throw new Error(validity.reason);
    const elementKey=name==='Elemental Barrier'?draw?.elementKey:'telekinetic';
    // Validate on the GM too: clients may send forged socket payloads.
    const material=barrierMaterial(name,elementKey);
    const flags={sourceActorUuid:actor.uuid,sourceMessageId:message.id,
      concentrationId:effect.id,sourceTokenId:position?.id};
    const old=barrierDocumentsForEffect(scene,actor.uuid,effect.id,actor.id);
    if(old.templates.length)await scene.deleteEmbeddedDocuments('MeasuredTemplate',old.templates.map(d=>d.id));
    if(old.regions.length)await scene.deleteEmbeddedDocuments('Region',old.regions.map(d=>d.id));
    if(old.walls.length)await scene.deleteEmbeddedDocuments('Wall',old.walls.map(d=>d.id));
    const docs=wallDocuments(name,draw.start,draw.end,scene,flags,material.key);
    const wall=await scene.createEmbeddedDocuments('Wall',[docs.wall]);
    if(!wall?.length)throw new Error('Não foi possível criar a parede física.');
    try{
      await scene.createEmbeddedDocuments('MeasuredTemplate',[docs.template]);
    }catch(error){
      await scene.deleteEmbeddedDocuments('Wall',wall.map(w=>w.id));
      throw error;
    }
    ui.notifications?.info?.(`${name}: parede ${material.label} criada. A Wall bloqueia movimento, sem bloquear visão; o ataque é interceptado pelo sistema.`);
    return wall;
  }else{
    const maxRadius=5*rank*pixel;
    if(![center.x,center.y,radius].every(Number.isFinite) || center.x<0||center.y<0 ||
       center.x>scene.width||center.y>scene.height ||radius<pixel/4||radius>maxRadius+0.01)
      throw new Error('Área fora da cena ou excede o alcance permitido.');
    if(AREA_SPHERE_NAMES.has(name)){
      const creatorToken=scene.tokens?.get?.(message.speaker?.token);
      const fixed=tokenCenter(creatorToken,scene);
      if(!fixed)throw new Error('Token do conjurador não encontrado.');
      center.x=fixed.x;center.y=fixed.y;
    }
  }
  const data=regionDataForPower(name,center,radius,
    {sourceActorUuid:actor.uuid,sourceMessageId:message.id,concentrationId:effect.id});
  // Foundry V14 uses Scene Regions; MeasuredTemplate was deprecated.
  const existing=list(scene.regions).filter(r=>r.flags?.[SYSTEM]?.elementalArea?.sourceMessageId===message.id);
  if(existing.length)await scene.deleteEmbeddedDocuments('Region',existing.map(x=>x.id));
  const result=await scene.createEmbeddedDocuments('Region',[data]);
  ui.notifications?.info?.(`${name}: área desenhada. Arraste os controles da Região para editá-la.`);
  return result;
}
/** Interactive preview: mouse down starts the circle, drag establishes its
 * radius, release finalizes. Sphere always uses the creator's centre. */
/** Choose the eight visual elements from the submitted Elemental Barrier macro. */
async function chooseWallMaterial(name){
  if(name!=='Elemental Barrier')return 'telekinetic';
  const D=foundry.applications?.api?.DialogV2;
  if(!D?.wait)throw new Error('Foundry VTT v14 é necessário.');
  const opts=Object.entries(BARRIER_ELEMENTS).map(([key,v])=>
    `<option value="${esc(key)}">${esc(v.label)}</option>`).join('');
  return D.wait({window:{title:'Elemental Barrier — Tipo de elemento'},rejectClose:false,
    content:`<form><p>Escolha o elemento e a cor da parede.</p><div class="form-group"><label>Elemento</label><select name="element">${opts}</select></div></form>`,
    buttons:[{action:'cancel',label:'Cancelar',callback:()=>null},
      {action:'ok',label:'Posicionar Barreira',default:true,callback:(_e,b)=>b.form.elements.element.value}]});
}
async function drawWallFromCard(message,actor,elementKey){
  const name=flagged(message,'elementalAreaPower')??flagged(message,'advancedElemental')?.name;
  const material=barrierMaterial(name,elementKey);
  const scene=canvas.scene,rank=actorRank(actor),pixel=Number(scene.grid?.size??100);
  const source=scene.tokens?.get?.(message.speaker?.token);
  const caster=tokenCenter(source,scene);
  if(!caster)throw new Error('Token do conjurador não encontrado.');
  const view=canvas.app?.renderer?.canvas??canvas.app?.view??document.querySelector('#board');
  const renderer=canvas.app?.renderer,stage=canvas.stage;
  if(!view)throw new Error('Canvas indisponível.');
  const hud=document.createElement('div');
  Object.assign(hud.style,{position:'fixed',left:'50%',bottom:'90px',transform:'translateX(-50%)',
    zIndex:'100000',padding:'10px 16px',background:'rgba(10,20,30,.93)',
    border:`2px solid ${material.color}`,borderRadius:'8px',color:'white',fontWeight:'bold',
    textAlign:'center',pointerEvents:'none'});
  document.body.appendChild(hud);
  let preview=null;
  const snap=p=>({x:Math.round(p.x/pixel)*pixel,y:Math.round(p.y/pixel)*pixel});
  const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)/pixel;
  const cleanup=()=>{try{preview?.destroy?.();}catch(_e){}hud.remove();};
  const paint=(a,b)=>{
    const valid=barrierLineValid({start:a,end:b,caster,rank,scene});
    hud.textContent=`${name} — ${material.label} | ${length(a,b).toFixed(1)} / ${2*rank} espaços | ${valid.ok?'Clique para concluir · Esc cancela':valid.reason}`;
    if(!preview&&globalThis.PIXI?.Graphics){preview=new PIXI.Graphics();preview.eventMode='none';stage.addChild(preview);}
    if(!preview)return;
    preview.clear();const color=valid.ok?parseInt(material.color.slice(1),16):0xff5555;
    if(typeof preview.moveTo==='function'&&typeof preview.stroke==='function')
      preview.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color,width:Math.max(5,pixel*.1),alpha:.93});
    else preview.lineStyle(Math.max(5,pixel*.1),color,.93).moveTo(a.x,a.y).lineTo(b.x,b.y);
  };
  hud.textContent=`${name} — ${material.label}: clique onde a parede começa. Esc cancela.`;
  return new Promise(resolve=>{
    let first=null,finished=false;
    const done=v=>{if(finished)return;finished=true;cleanup();resolve(v);};
    captureCanvasWall({view,renderer,stage,doc:document,win:window,hooks:Hooks,
      onStart:p=>{first=snap(p);hud.textContent='Mova o mouse e clique para concluir a parede. Esc cancela.';},
      onMove:(_start,p)=>paint(first,snap(p)),
      onFinish:(_start,p)=>{
        const end=snap(p),valid=barrierLineValid({start:first,end,caster,rank,scene});
        if(!valid.ok){ui.notifications?.warn?.(valid.reason);paint(first,end);return false;}
        done({start:first,end,elementKey});return true;
      },onCancel:()=>done(null)});
  });
}
async function dragAreaFromCard(message){
  if(!mayControl(message))throw new Error('Somente o autor ou o Mestre podem desenhar a área.');
  const name=flagged(message,'elementalAreaPower')??flagged(message,'advancedElemental')?.name;
  const sceneId=message.speaker?.scene;
  if(canvas?.scene?.id!==sceneId)throw new Error('Abra a cena onde o poder foi utilizado.');
  const {actor,effect}=concentrationForMessage(message);
  if(!actor||!effect)throw new Error('O poder não possui Concentração ativa.');
  const stage=canvas.stage;
  const scene=canvas.scene;
  const view=canvas.app?.renderer?.canvas??canvas.app?.view??document.querySelector('#board');
  const renderer=canvas.app?.renderer;
  if(!view)throw new Error('Canvas não disponível para desenhar a área.');
  const pixel=Number(scene.grid?.size??100);
  const maxRadius=5*actorRank(actor)*pixel;
  const source=scene.tokens.get(message.speaker?.token);
  if(AREA_SPHERE_NAMES.has(name)&&!source)throw new Error('Token do conjurador não encontrado.');
  const fixed=AREA_SPHERE_NAMES.has(name)?tokenCenter(source,scene):null;
  const isWall=AREA_WALL_NAMES.has(name);
  if(isWall){
    const elementKey=await chooseWallMaterial(name);
    if(!elementKey)return null;
    return drawWallFromCard(message,actor,elementKey);
  }
  ui.notifications?.info?.(`${name}: clique e arraste sobre a cena para ${isWall?`definir a parede (até ${2*actorRank(actor)} espaços, a até ${10*actorRank(actor)} do conjurador)`:`definir o raio (até ${5*actorRank(actor)} espaços)`}; Esc cancela.`);
  return new Promise(resolve=>{
    let first=null,preview=null,finished=false;
    const cleanup=()=>{try{preview?.destroy?.();}catch(_e){}};
    const done=value=>{if(finished)return;finished=true;cleanup();resolve(value);};
    const paint=to=>{
      const c=fixed??first;
      if(!c||!to)return;
      const r=Math.min(maxRadius,Math.hypot(to.x-c.x,to.y-c.y));
      if(!preview && globalThis.PIXI?.Graphics){
        preview=new PIXI.Graphics();
        preview.eventMode='none';
        stage.addChild(preview);
      }
      if(preview){
        preview.clear();
        if(isWall){
          const horizontal=Math.abs(to.x-c.x)>=Math.abs(to.y-c.y);
          const length=Math.max(pixel,Math.min(2*actorRank(actor)*pixel,horizontal?Math.abs(to.x-c.x):Math.abs(to.y-c.y)));
          const x=horizontal?Math.min(c.x,c.x+(to.x>=c.x?length:-length)):c.x-pixel/2;
          const y=horizontal?c.y-pixel/2:Math.min(c.y,c.y+(to.y>=c.y?length:-length));
          if(typeof preview.rect==='function')preview.rect(x,y,horizontal?length:pixel,horizontal?pixel:length)
            .fill({color:0xb496ff,alpha:.28}).stroke({color:0xffffff,width:2,alpha:.85});
          else preview.beginFill(0xb496ff,.28).drawRect(x,y,horizontal?length:pixel,horizontal?pixel:length).endFill();
        }else if(typeof preview.circle==='function')preview.circle(c.x,c.y,r).fill({color:name.startsWith('Telekinetic')?0xb496ff:name==='Elemental Sphere'?0x6bb6ff:0xe8a761,alpha:.22}).stroke({color:0xffffff,width:3,alpha:.85});
        else preview.beginFill(0x6bb6ff,.22).drawCircle(c.x,c.y,r).endFill();
      }
    };
    captureCanvasCircle({view,renderer,stage,doc:document,win:window,hooks:Hooks,
      onStart:p=>{first=p;paint(p);},
      onMove:p=>{if(first)paint(p);},
      onFinish:p=>{
        if(!first)return done(null);
        const c=fixed??first;
        const radius=Math.min(maxRadius,Math.hypot(p.x-c.x,p.y-c.y));
        if(isWall){
          if(Math.hypot(p.x-c.x,p.y-c.y)<pixel/4){ui.notifications?.warn?.('Arraste para definir o comprimento da parede.');return done(null);}
          return done({start:c,end:p});
        }
        if(radius<pixel/4){ui.notifications?.warn?.('Arraste para definir uma área maior.');return done(null);}
        done({center:c,radius});
      },
      onCancel:()=>done(null)
    });
  });
}
async function drawAreaFromCard(message){
  const draw=await dragAreaFromCard(message);
  if(!draw)return;
  if(activeGM())await createAreaRegion(message,draw);
  else {
    if(!game.users?.activeGM)throw new Error('O Mestre deve estar online para criar a área.');
    game.socket.emit(SOCKET,{type:'elemental-area',requesterId:game.user.id,messageId:message.id,
      ...(AREA_WALL_NAMES.has(flagged(message,'elementalAreaPower')??flagged(message,'advancedElemental')?.name)
        ?{start:draw.start,end:draw.end,elementKey:draw.elementKey}:{x:draw.center.x,y:draw.center.y,radius:draw.radius})});
    ui.notifications?.info?.('Pedido de desenho enviado ao Mestre.');
  }
}
async function cleanupAreas(effect){
  if(!activeGM()||!effect?.flags?.[SYSTEM]?.concentrationPower?.itemId)return;
  const actor=effect.parent;
  const item=actor?.items?.get?.(effect.flags[SYSTEM].concentrationPower.itemId);
  if(!BARRIER.has(item?.name))return;
  for(const scene of list(game.scenes)){
    const ids=list(scene.regions).filter(r=>r.flags?.[SYSTEM]?.elementalArea?.sourceActorUuid===actor.uuid &&
      r.flags?.[SYSTEM]?.elementalArea?.concentrationId===effect.id).map(r=>r.id);
    if(ids.length)await scene.deleteEmbeddedDocuments('Region',ids);
    if(AREA_WALL_NAMES.has(item.name)){
      const old=barrierDocumentsForEffect(scene,actor.uuid,effect.id,actor.id);
      if(old.templates.length)await scene.deleteEmbeddedDocuments('MeasuredTemplate',old.templates.map(x=>x.id));
      if(old.walls.length)await scene.deleteEmbeddedDocuments('Wall',old.walls.map(x=>x.id));
    }
  }
}
export function registerElementalAdvancedHooks(){
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!mayControl(message))return;
    if(!message.rolls?.length && !BARRIER.has(flagged(message,'elementalAreaPower')))return;
    // Structure and drawing controls appear only in the DESCRIPTION card.
    // Sphere's per-target expulsion action remains on the dice result because
    // targets and hit outcomes are only known after the roll. No duplicate
    // 'Controles do Poder' panel is rendered in the dice result.
    if(message.rolls?.length && BARRIER.has(flagged(message,'advancedElemental')?.name)){
      if(AREA_SPHERE_NAMES.has(flagged(message,'advancedElemental')?.name) && activeGM() &&
          html instanceof HTMLElement && !html.querySelector('[data-m616-elemental-expel]')){
        const refs=flagged(message,'targets')??[];
        const panel=document.createElement('div');panel.dataset.m616ElementalExpel='1';
        for(const target of refs){
          const b=document.createElement('button');b.type='button';
          b.textContent=`Expulsar: ${target.name??'alvo'}`;
          b.addEventListener('click',async()=>{
            b.disabled=true;try{await moveViaOwner(message,target.uuid??target);}
            catch(e){ui.notifications?.warn?.(String(e.message??e));}finally{b.disabled=false;}
          });panel.appendChild(b);
        }
        if(panel.childElementCount)(html.querySelector('.message-content')??html).appendChild(panel);
      }
      return;
    }
    if(!isAdvancedElementalPower(flagged(message,'advancedElemental')?.name) && !BARRIER.has(flagged(message,'elementalAreaPower')))return;
    if(!(html instanceof HTMLElement)||html.querySelector('[data-m616-elemental-advanced]'))return;
    const name=flagged(message,'advancedElemental')?.name??flagged(message,'elementalAreaPower');
    const wrapper=document.createElement('div');wrapper.dataset.m616ElementalAdvanced='1';
    wrapper.className='m616-elemental-advanced';
    wrapper.style.cssText='margin:8px 0;padding:8px;border:1px solid var(--color-border-light-primary,#888);border-radius:5px';
    const intro=document.createElement('div');
    intro.innerHTML=`<b>${esc(name)} — Controles do Poder</b><p style="font-size:0.9em">${BARRIER.has(name)?'A estrutura é mantida por Concentração. Na esfera, expulse o alvo antes de aplicar dano Fantástico; paredes exigem escolher o lado dos alvos.':'Aplique deslocamento somente nos alvos atingidos.'}</p>`;
    wrapper.appendChild(intro);
    const targetList=flagged(message,'targets')??[];
    if(name==='Elemental Push'||(AREA_SPHERE_NAMES.has(name)&&activeGM())){
      for(const target of targetList){
        const tokenUuid=target.uuid??target;
        const b=document.createElement('button');b.type='button';b.textContent=`${name==='Elemental Push'?'Mover':'Expulsar'}: ${target.name??'alvo'}`;
        b.addEventListener('click',async()=>{b.disabled=true;try{await moveViaOwner(message,tokenUuid);}catch(e){ui.notifications?.warn?.(String(e.message??e));}finally{b.disabled=false;}});
        wrapper.appendChild(b);
      }
    }
    if(BARRIER.has(name)){
      const draw=document.createElement('button');draw.type='button';draw.textContent=`✎ Desenhar área — ${name}`;
      draw.addEventListener('click',async()=>{draw.disabled=true;try{await drawAreaFromCard(message);}catch(e){ui.notifications?.warn?.(String(e.message??e));}finally{draw.disabled=false;}});
      wrapper.appendChild(draw);
    }
    (html.querySelector('.message-content')??html).appendChild(wrapper);
  });
  if(game.socket)game.socket.on(SOCKET,async (payload,senderId)=>{
    if(!activeGM()||!['elemental-move','elemental-area'].includes(payload?.type))return;
    const msg=game.messages?.get?.(payload.messageId);
    const claimed=String(payload.requesterId??'');
    if(!msg||!validElementalRequester(msg,claimed) || (typeof senderId==='string' && senderId!==claimed))return;
    try{
      if(payload.type==='elemental-move')await performMovement(msg,payload.targetUuid,payload.dir,payload.steps,claimed);
      if(payload.type==='elemental-area')await createAreaRegion(msg,payload.start&&payload.end
        ?{start:payload.start,end:payload.end,elementKey:payload.elementKey}:{center:{x:Number(payload.x),y:Number(payload.y)},radius:Number(payload.radius)},claimed);
    }catch(e){console.warn(`[${SYSTEM}] Pedido elemental recusado:`,e);ui.notifications?.warn?.(String(e.message??e));}
  });
  Hooks.on('deleteActiveEffect',effect=>{void cleanupAreas(effect);});
  Hooks.on('updateActiveEffect',(effect,changes)=>{if(changes.disabled===true)void cleanupAreas(effect);});
}
