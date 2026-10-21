/**
 * Multiverse-D616 v0.2.24 — conservative, non-blocking pre-attack validation.
 * Uses the explicit range on an Item whenever available, plus a small set of
 * known legacy power ranges. Missing/ambiguous ranges are never invented.
 * Foundry V14 sight walls are consulted via PointSourcePolygon.testCollision.
 * No Focus, concentration, targets, or actor state are changed by inspection.
 */
import {tokenCenter} from './elemental-area-geometry.mjs';
import {chooseSmartTargets} from './smart-targets.mjs';

const SYSTEM='multiverse-d616';
export const DISABLE_COMBAT_INTELLIGENCE_SETTING='cancelarCombateInteligente';
/** A world-wide GM setting: checked means do not run range/sight preflight. */
export function registerCombatIntelligenceSettings(){
  game.settings.register(SYSTEM,DISABLE_COMBAT_INTELLIGENCE_SETTING,{
    name:'Cancelar Combate Inteligente',
    hint:'Marcado: não verificar alcance ou linha de visão antes dos ataques. Desmarque para ativar os avisos de Combate Inteligente.',
    scope:'world',config:true,type:Boolean,default:true,
  });
}
export function combatIntelligenceDisabled(settings=globalThis.game?.settings){
  try {return settings?.get?.(SYSTEM,DISABLE_COMBAT_INTELLIGENCE_SETTING) !== false;}
  catch(_e){return true;}
}
const LEGACY_RANGE=Object.freeze({
  'Elemental Grab':{type:'rank',value:5},
  'Telekinetic Grab':{type:'rank',value:5},
  'Elemental Barrier':{type:'rank',value:10},
});
const IGNORED_AREA=new Set(['Elemental Prison','Elemental Sphere']);
const clean=value=>String(value??'').replace(/<[^>]*>/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec=n=>Number(n.toFixed(1)).toLocaleString('pt-BR');
export function parseAttackRange(raw,rank=0) {
  const r=clean(raw);
  const level=Number(rank);
  if (!r||['varies','varia','variable','variavel'].includes(r))return {type:'unknown',spaces:null};
  if(['reach','alcance','touch','toque','melee'].includes(r))return {type:'reach',spaces:null};
  if(['unlimited','ilimitado','ilimitada'].includes(r))return {type:'unlimited',spaces:Infinity};
  const match=/^(\d+(?:[.,]\d+)?)(?:\s*(?:spaces?|espacos?))?(.*)$/.exec(r);
  if(!match)return {type:'unknown',spaces:null};
  const value=Number(match[1].replace(',','.'));
  const tail=match[2].trim();
  const rankSyntax=/^(?:(?:per|por)\s+(?:o\s+)?(?:rank|nivel)|(?:times|vezes|x|multiplicado por)\s+(?:(?:the|o|do|da|character'?s|personagem|seu|sua)\s+)*(?:rank|nivel)(?:\s+(?:do\s+personagem|do|da|personagem|character))?|(?:per|por)\s+(?:character'?s\s+)?(?:rank|nivel))$/;
  if(!tail)return {type:'fixed',spaces:value};
  if(rankSyntax.test(tail))return level>0?{type:'rank',spaces:value*level}:{type:'unknown',spaces:null};
  return {type:'unknown',spaces:null};
}
export function resolveItemRange(item,actor) {
  const s=item?.system??{};
  const rank=Number(actor?.system?.attributes?.rank?.value??actor?.system?.rank??0);
  const numeric=Number(s.attackRange);
  if(Number.isFinite(numeric)&&numeric>0)return {type:'fixed',spaces:numeric,source:'attackRange'};
  const parsed=parseAttackRange(s.range,rank);
  if(parsed.type!=='unknown')return {...parsed,source:'range'};
  if(!String(s.range??'').trim() && item?.type==='power' && LEGACY_RANGE[item.name]){
    const known=LEGACY_RANGE[item.name];
    return rank>0?{type:known.type,spaces:known.value*rank,source:'legacyDescription'}:{type:'unknown',spaces:null};
  }
  return parsed;
}
export function tokenGapInSpaces(a,b,gridSize) {
  const aa=a?.document??a,bb=b?.document??b;
  const g=Number(gridSize);
  if(!aa||!bb||!Number.isFinite(g)||g<=0)return null;
  const values=[aa.x,aa.y,aa.width,aa.height,bb.x,bb.y,bb.width,bb.height].map(Number);
  if(values.some(n=>!Number.isFinite(n)))return null;
  const [ax,ay,aw,ah,bx,by,bw,bh]=values;
  const x=Math.max(0,(bx-ax-aw*g)/g,(ax-bx-bw*g)/g);
  const y=Math.max(0,(by-ay-ah*g)/g,(ay-by-bh*g)/g);
  const overlap=ax<bx+bw*g&&ax+aw*g>bx&&ay<by+bh*g&&ay+ah*g>by;
  return overlap?0:1+Math.max(x,y);
}
export function centerDistanceInSpaces(a,b,scene,grid) {
  const from=tokenCenter(a,scene),to=tokenCenter(b,scene);
  const g=Number(grid?.size??scene?.grid?.size);
  if(!from||!to||!Number.isFinite(g)||g<=0)return null;
  const geometric = Math.hypot(from.x-to.x,from.y-to.y)/g;
  try{
    const result=grid?.measurePath?.([from,to]);
    // Foundry V14: GridlessGrid always reports `spaces: 0`, even when the
    // path is many units long. Respect its measured scene-unit distance instead.
    const isGridless = grid?.isGridless === true || grid?.type === 0 || scene?.grid?.type === 0;
    const spaces=Number(result?.spaces);
    const distance=Number(result?.distance);
    const unit=Number(scene?.grid?.distance ?? grid?.distance);
    if(isGridless || (spaces === 0 && geometric > 0.01)){
      if(Number.isFinite(distance)&&distance>=0&&Number.isFinite(unit)&&unit>0)return distance/unit;
      return geometric;
    }
    if(result?.spaces != null && Number.isFinite(spaces)&&spaces>=0)return spaces;
    if(result?.distance != null&&Number.isFinite(distance)&&distance>=0&&Number.isFinite(unit)&&unit>0)return distance/unit;
  }catch(_e){} // Measurement API unavailable — conservative geometric fallback.
  return geometric;
}
export function casterTokenForItem(actor,scene,placeables=[]){
  if(!actor||!scene)return null;
  // Exact token association is most reliable for synthetic/unlinked actors.
  const tokenDoc=actor.token?.document??actor.token;
  if(tokenDoc?.parent?.id===scene.id && tokenDoc?.id){
    const existing=placeables.find(t=>(t.document??t)?.id===tokenDoc.id);
    if(existing)return existing.document??existing;
  }
  const candidates=placeables.filter(t=>{
    const doc=t?.document??t;
    const tokenActor=t.actor??doc.actor;
    return doc?.parent?.id===scene.id && (
      tokenActor===actor || doc.actor===actor ||
      (actor.isToken && actor.token?.id===doc.id) ||
      // Foundry may materialize a different Actor wrapper for the same token.
      (tokenActor?.uuid && actor?.uuid && tokenActor.uuid===actor.uuid) ||
      (doc.actorLink!==false && (tokenActor?.id===actor.id || doc.actorId===actor.id))
    );
  });
  const picked=candidates.find(t=>t.controlled)??candidates[0];
  return picked?.document??picked??null;
}
export function sightCollision({source,target,scene,polygonClass}){
  if(!polygonClass||typeof polygonClass.testCollision!=='function')return 'unknown';
  const from=tokenCenter(source,scene),to=tokenCenter(target,scene);
  if(!from||!to)return 'unknown';
  // V14's PointSourcePolygon sight test understands region/wall restrictions.
  // Height differences may require a 3-D source decision by the Narrator.
  const a=Number((source?.document??source)?.elevation??0);
  const b=Number((target?.document??target)?.elevation??0);
  if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>0.01)return 'unknown';
  try{
    const result=polygonClass.testCollision(from,to,{type:'sight',mode:'any',scene});
    return typeof result==='boolean'?(result?'blocked':'clear'):'unknown';
  }catch(_e){return 'unknown';}
}
export function evaluateAttackTargets({item,actor,source,targets,scene,grid,polygonClass}){
  if(!item||!source||!scene||!Array.isArray(targets)||!targets.length)return [];
  const range=resolveItemRange(item,actor);
  const reach=Number(actor?.system?.reach??1);
  const isArea=IGNORED_AREA.has(item.name);
  const isAttack=item?.type==='weapon'||Boolean(item?.system?.attackTarget)||Boolean(item?.system?.attackKind);
  if(!isAttack || isArea)return [];
  return targets.filter(t=> (t?.document??t)?.parent?.id===scene.id).map(token=>{
    const doc=token.document??token;
    const dist=range.type==='reach'
      ?tokenGapInSpaces(source,doc,grid?.size??scene?.grid?.size)
      :centerDistanceInSpaces(source,doc,scene,grid);
    const limit=range.type==='reach'?(Number.isFinite(reach)&&reach>=0?reach:null):range.spaces;
    const outOfRange=Number.isFinite(dist)&&Number.isFinite(limit)&&dist>limit+1e-6;
    // Only test a sight wall for ranged attacks. Melee/touch through a wall is
    // a Narrator judgement, rather than claiming the wall is always opaque.
    const kind=clean(item.system?.attackKind??item.system?.kind);
    const ranged=kind==='ranged'||(kind!=='close'&&range.type!=='reach'&&Boolean(item?.system?.attackTarget));
    const sight=ranged?sightCollision({source,target:doc,scene,polygonClass}):'not-checked';
    const warning=[];
    if(outOfRange)warning.push(`fora do alcance (${dec(dist)} de ${dec(limit)} espaços)`);
    if(sight==='blocked')warning.push('possível bloqueio de linha de visão');
    return {id:doc.id,name:String(doc.name??doc.actor?.name??'Alvo'),distance:dist,limit,rangeType:range.type,sight,warning};
  });
}
export function summarizePreflight(results){
  return results.filter(r=>r.warning?.length).map(r=>({name:r.name,warning:[...r.warning]}));
}
function selectedTokens(scene){
  return Array.from(game.user?.targets??[]).map(t=>t.document??t).filter(t=>t.parent?.id===scene.id);
}
function usableCanvas(){return globalThis.canvas?.ready&&canvas?.scene&&canvas?.tokens?.placeables;}
/** Use the Foundry v14 ApplicationV2 dialog when available; retain the old
 * API only as a compatibility fallback for unusual host/test environments.
 * Nothing is charged before a user chooses whether to proceed.
 */
export async function askCombatPreflight(title,content){
  const DialogV2=globalThis.foundry?.applications?.api?.DialogV2;
  if(typeof DialogV2?.wait==='function')return DialogV2.wait({
    window:{title},position:{width:450},classes:['m616-combat-preflight-dialog'],
    content,rejectClose:false,
    buttons:[
      {action:'proceed',label:'Continuar mesmo assim'},
      {action:'select',label:'Trocar alvos',default:true},
      {action:'cancel',label:'Cancelar'},
    ],
  });
  return Dialog.wait({title,content,buttons:{
    proceed:{label:'Continuar mesmo assim',callback:()=> 'proceed'},
    select:{label:'Trocar alvos',callback:()=> 'select'},
    cancel:{label:'Cancelar',callback:()=> 'cancel'},
  },default:'select',close:()=> 'cancel'},
  {classes:['dialog','m616-combat-preflight-dialog'],width:450});
}

/** Warn only on concrete violations. Continue is GM/player override, never an auto block. */
export async function confirmAttackPreflight(item,rollInfo){
  if(combatIntelligenceDisabled())return {ok:true,results:[],overridden:[]};
  if(!usableCanvas()||!item?.actor)return {ok:true,results:[],overridden:[]};
  if(item.type!=='weapon'&&!(rollInfo?.attackTarget||rollInfo?.attack))return {ok:true,results:[],overridden:[]};
  const scene=canvas.scene;
  const from=casterTokenForItem(item.actor,scene,canvas.tokens.placeables);
  if(!from){
    // Never make a supposedly 'verified' attack when the source cannot be
    // located: be explicit and leave narrative permission with the Narrator.
    if(selectedTokens(scene).length) globalThis.ui?.notifications?.warn?.(
      `Alcance de ${item.name} não verificado: token do atacante não localizado nesta cena.`);
    return {ok:true,results:[],overridden:[]};
  }
  const polygonClass=globalThis.foundry?.canvas?.geometry?.PointSourcePolygon??null;
  for(let attempt=0;attempt<4;attempt++){
    const results=evaluateAttackTargets({item,actor:item.actor,source:from,targets:selectedTokens(scene),scene,grid:canvas.grid,polygonClass});
    const flagged=summarizePreflight(results);
    if(!flagged.length)return {ok:true,results,overridden:[]};
    const rows=flagged.map(r=>`<li><strong>${htmlEscape(r.name)}</strong>: ${r.warning.map(htmlEscape).join('; ')}</li>`).join('');
    const decision=await askCombatPreflight(`${item.name} — Verificação de combate`,
      `<div class="m616-combat-preflight"><p>O sistema identificou situações que precisam de atenção:</p><ul>${rows}</ul><p>A análise é um aviso: o Mestre pode autorizar o ataque mesmo assim. Nenhum Focus foi gasto.</p></div>`);
    if(decision==='proceed')return {ok:true,results,overridden:flagged};
    if(decision!=='select')return {ok:false,results,overridden:[]};
    // Reuse v0.2.22's manual-map picker without adding remembered targets.
    const ok=await chooseSmartTargets(item,{force:true});
    if(!ok)return {ok:false,results,overridden:[]};
  }
  // Excessive re-selection must not silently proceed past unresolved warnings.
  globalThis.ui?.notifications?.warn?.('Revise os alvos e tente novamente.');
  return {ok:false,results:[],overridden:[]};
}
