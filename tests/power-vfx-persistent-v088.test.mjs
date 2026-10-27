import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  getPowerVfxConfig, resolvePowerVfx, playPowerVfx,
  concentrationForVfx,persistentVfxName,registerPowerVfxLifecycleHooks
} from '../scripts/power-vfx.mjs';
import {updateAttachedPower,attachPower,getAttachedPowers} from '../scripts/item-attached-powers.mjs';
const NS='multiverse-d616';
const fixture=()=>{
 const actor={id:'hero',effects:[]};
 const token={actor,isVisible:true};
 const effect={id:'conc1',uuid:'Actor.hero.ActiveEffect.conc1',disabled:false,
   flags:{[NS]:{concentrationPower:{itemId:'shieldItem',transient:true}}}};
 actor.effects=[effect];
 const item={id:'shieldItem',type:'power',name:'Shield of the Seraphim',actor,
   system:{duration:'Concentration'},flags:{[NS]:{vfx:{file:'JB2A.SHIELD_THEMED.ABOVE.FIRE.01.BLUE',mode:'self',scale:1.75}}}};
 return {actor,token,effect,item};
};
test('v088 defaults persistent for Shield of the Seraphim but permits explicit disable; other powers are opt-in',()=>{
 const {item}=fixture();
 assert.equal(getPowerVfxConfig(item).persistent,true);
 assert.equal(getPowerVfxConfig(item).layer,'above');
 assert.equal(resolvePowerVfx(item).persistent,true);
 item.flags[NS].vfx.persistent=false;
 assert.equal(resolvePowerVfx(item).persistent,undefined);
 assert.equal(getPowerVfxConfig({...item,name:'Elemental Protection 1'}).persistent,false);
});
test('v088 permanent animation attaches above token, binds to own AE, keeps scale, dedupes and normalizes JB2A key',async()=>{
 const {actor,token,effect,item}=fixture(); const events=[];
 globalThis.canvas={ready:true,tokens:{controlled:[token],placeables:[token]}};
 globalThis.game={modules:new Map([['sequencer',{active:true}]]),settings:{get:()=>true},user:{id:'u1',targets:new Set()}};
 globalThis.Sequencer={Database:{entryExists:k=>{events.push(['exists',k]);return true;}},EffectManager:{endEffects:async x=>{events.push(['end',x]);}}};
 class Sequence {
   effect(){events.push('effect');return this;}
   file(x){events.push(['file',x]);return this;}
   attachTo(x){events.push(['attach',x]);return this;}
   atLocation(x){events.push(['at',x]);return this;}
   belowTokens(x){events.push(['below',x]);return this;}
   zIndex(x){events.push(['z',x]);return this;}
   scaleToObject(x){events.push(['scale',x]);return this;}
   name(x){events.push(['name',x]);return this;}
   persist(){events.push('persist');return this;}
   tieToDocuments(x){events.push(['tie',x]);return this;}
   fadeIn(){return this;} fadeOut(){return this;}
   play(){events.push('play');return Promise.resolve();}
 }
 globalThis.Sequence=Sequence;
 assert.equal(concentrationForVfx(item),effect);
 assert.equal(await playPowerVfx(item),true);
 assert.ok(events.some(e=>e[0]==='file' && e[1]==='jb2a.shield_themed.above.fire.01.blue'));
 assert.ok(events.some(e=>e[0]==='attach' && e[1]===token));
 assert.ok(events.some(e=>e[0]==='tie' && e[1]===effect));
 assert.ok(events.some(e=>e[0]==='scale' && e[1]===1.75));
 assert.ok(events.some(e=>e[0]==='below' && e[1]===false));
 assert.ok(events.some(e=>e[0]==='end' && e[1].name===persistentVfxName(effect)));
 assert.ok(events.includes('persist'));
 assert.ok(events.some(e=>e[0]==='name' && e[1]===persistentVfxName(effect)));
 // Preview must never create a persistent effect.
 events.length=0;
 assert.equal(await playPowerVfx(item,{preview:true}),true);
 assert.ok(!events.includes('persist'));
 assert.ok(!events.some(e=>e[0]==='end'));
});
test('v088 does not leave an endless animation if no matching active Concentration effect',async()=>{
 const {actor,item}=fixture();actor.effects=[];
 const events=[];
 globalThis.ui={notifications:{warn:x=>events.push(x)}};
 assert.equal(await playPowerVfx(item),false);
 assert.ok(events[0].includes('Concentração'));
});
test('v088 ending or disabling a specific Power Concentration effect ends only its named VFX',async()=>{
 const {effect}=fixture();const callbacks={};const names=[];
 globalThis.Hooks={on:(n,cb)=>{callbacks[n]=cb;}};
 globalThis.Sequencer={EffectManager:{endEffects:async ({name})=>names.push(name)}};
 globalThis.game={user:{id:'u1'}};
 registerPowerVfxLifecycleHooks();
 callbacks.deleteActiveEffect(effect,{},'u2');
 callbacks.deleteActiveEffect(effect,{},'u1');
 callbacks.updateActiveEffect(effect,{disabled:true},{},'u1');
 callbacks.updateActiveEffect(effect,{disabled:false},{},'u1');
 await Promise.resolve();
 assert.deepEqual(names,[persistentVfxName(effect),persistentVfxName(effect)]);
});
test('v088 attached powers have persistent and layering independent of their source',async()=>{
 globalThis.foundry={utils:{randomID:()=> 'copy1',deepClone:structuredClone}};
 const actor={id:'x'};
 const carrier={type:'weapon',name:'Espada',actor,isOwner:true,system:{equipped:true},flags:{[NS]:{}},
   async update(data){this.flags[NS].attachedPowers=data[`flags.${NS}.attachedPowers`];}};
 const source={type:'power',name:'Shield of the Seraphim',uuid:'Power.original',system:{duration:'Concentration'},flags:{[NS]:{}},effects:[],toObject(){return {type:this.type,name:this.name,system:this.system,flags:this.flags,effects:[]}}};
 const id=(await attachPower(carrier,source)).entry.id;
 await updateAttachedPower(carrier,id,{vfxPersistent:true,vfxLayer:'below',vfxScale:1.8});
 const value=getAttachedPowers(carrier)[0].data.flags[NS].vfx;
 assert.deepEqual({persistent:value.persistent,layer:value.layer,scale:value.scale},{persistent:true,layer:'below',scale:1.8});
 assert.equal(source.flags[NS].vfx,undefined);
});
test('v088 UI has visible persistence/layer controls for both owned power and equipment copy',()=>{
 const tpl=readFileSync(new URL('../templates/item/parts/item-power-vfx.hbs',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../scripts/item-attached-powers.mjs',import.meta.url),'utf8');
 const app=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
 assert.match(tpl,/data-vfx-field="persistent"/);
 assert.match(tpl,/data-vfx-field="layer"/);
 assert.match(editor,/name="vfxPersistent"/);
 assert.match(editor,/name="vfxLayer"/);
 assert.match(app,/registerPowerVfxLifecycleHooks\(\)/);
});
