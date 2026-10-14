import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOKEN_SIZE_DIMENSIONS, tokenSizeDimensions, effectiveActorTokenSize,
  syncActorTokenSize, removeLegacySizeTokenModifiers, registerTokenSizeHooks,
} from '../scripts/token-size.mjs';
import {applyGrowChoice} from '../scripts/grow-size.mjs';
import {applyShrinkChoice} from '../scripts/shrink-size.mjs';

const ids=['microscopic','miniature','tiny','little','small','average','big','huge','gigantic','titanic','gargantuan'];
const units=[.1,.3,.5,.7,.9,1,2,3,5,8,10];
const power=name=>({name,id:name.replaceAll(' ',''),type:'power'});
const sizeFx={sizeEffects:Object.fromEntries(ids.map(size=>[size,{
  name:`${size} Effects`,flags:{'multiverse-d616':{managedSize:true}},changes:[
    {key:'system.size',mode:5,value:size},
    {key:'system.abilities.mle.defense',mode:2,value:0}
  ]
}]))};
const initial = ()=>({width:1,height:1,depth:1});
let seq=0;
function token(name='Hero',linked=true) {
  return {id:`token-${++seq}`,uuid:`Scene.A.Token.${seq}`,actorLink:linked,name, ...initial(),x:400,y:600,elevation:10,
    calls:[],async update(patch,options){this.calls.push({patch,options});Object.assign(this,patch);return this;}};
}
function actor({size='average',synthetic=false,worldTokens=[],selfToken=null,managed=false}={}) {
  const a={_source:{system:{size}},isOwner:true,isToken:synthetic,token:selfToken,prototypeToken:initial(),effects:{contents:[]},updates:[],
    getActiveTokens(linked,document){assert.equal(linked,true); assert.equal(document,true);return worldTokens;},
    async update(changes,opts){this.updates.push({changes,opts});for(const [key,value] of Object.entries(changes))if(key.startsWith('prototypeToken.'))this.prototypeToken[key.slice(15)]=value;},
    async createEmbeddedDocuments(type,rows){assert.equal(type,'ActiveEffect');for(const data of rows)this.effects.contents.push({...structuredClone(data),id:`effect-${++seq}`});},
    async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');this.effects.contents=this.effects.contents.filter(effect=>!ids.includes(effect.id));},
  };
  if(managed)a.effects.contents.push({...structuredClone(sizeFx.sizeEffects[size]),id:`effect-${++seq}`});
  return a;
}
const resize=a=>a.effects.contents.filter(e=>e.flags?.['multiverse-d616']?.growChoice || e.flags?.['multiverse-d616']?.shrinkChoice);

test('All eleven categories map to Foundry v14 X/Y/Z token dimensions',()=>{
  assert.deepEqual(Object.keys(TOKEN_SIZE_DIMENSIONS),ids);
  for(let i=0;i<ids.length;i++)assert.deepEqual(tokenSizeDimensions(ids[i]),{width:units[i],height:units[i],depth:units[i]});
  assert.throws(()=>tokenSizeDimensions('tremendous'),/desconhecida/);
});

test('Grow updates placed linked tokens AND prototype (not x/y coordinates or elevation), restores average',async()=>{
  const a=actor({worldTokens:[token(),token()]});
  for(const size of ['big','huge','gigantic','titanic','gargantuan']) {
    await applyGrowChoice(a,power('Grow 4'),size,sizeFx);
    assert.deepEqual([a.prototypeToken.width,a.prototypeToken.height,a.prototypeToken.depth],[TOKEN_SIZE_DIMENSIONS[size],TOKEN_SIZE_DIMENSIONS[size],TOKEN_SIZE_DIMENSIONS[size]]);
    for(const t of a.getActiveTokens(true,true)) {
      assert.deepEqual([t.width,t.height,t.depth],[TOKEN_SIZE_DIMENSIONS[size],TOKEN_SIZE_DIMENSIONS[size],TOKEN_SIZE_DIMENSIONS[size]]);
      assert.deepEqual([t.x,t.y,t.elevation],[400,600,10]);
    }
    assert.equal(resize(a).length,1);
  }
  await applyGrowChoice(a,power('Grow 4'),'normal',sizeFx);
  assert.equal(resize(a).length,0);
  assert.deepEqual(a.prototypeToken,initial());
  assert.equal(a.getActiveTokens(true,true)[0].width,1);
});

test('Shrink updates placed token/prototype for four levels, restores natural size',async()=>{
  const a=actor({worldTokens:[token()]});
  for(const [powerName,size] of [['Shrink 1','little'],['Shrink 2','tiny'],['Shrink 3','miniature'],['Shrink 4','microscopic']]) {
    await applyShrinkChoice(a,power(powerName),size,sizeFx);
    assert.equal(a.prototypeToken.width,TOKEN_SIZE_DIMENSIONS[size]);
    assert.equal(a.getActiveTokens(true,true)[0].height,TOKEN_SIZE_DIMENSIONS[size]);
    assert.equal(a.getActiveTokens(true,true)[0].depth,TOKEN_SIZE_DIMENSIONS[size]);
  }
  await applyShrinkChoice(a,power('Shrink 4'),'normal',sizeFx);
  assert.deepEqual(a.prototypeToken,initial());
});

test('Shrink, Grow and normal interoperate without stacking tokens or changing natural size',async()=>{
  const a=actor({size:'small',managed:true,worldTokens:[token()]});
  await applyShrinkChoice(a,power('Shrink 4'),'tiny',sizeFx);
  assert.equal(a.prototypeToken.width,0.5);
  await applyGrowChoice(a,power('Grow 4'),'gigantic',sizeFx);
  assert.equal(a.prototypeToken.width,5);
  assert.equal(resize(a).length,1);
  await applyGrowChoice(a,power('Grow 4'),'normal',sizeFx);
  assert.equal(a.prototypeToken.width,.9);
  assert.equal(a._source.system.size,'small');
  assert.equal(a.effects.contents.length,1); // natural Unusual Size is preserved
});

test('Synthetic unlinked token updates only itself and leaves base prototype untouched',async()=>{
  const placement=token('Independent NPC',false);
  const a=actor({synthetic:true,selfToken:placement});
  await applyShrinkChoice(a,power('Shrink 3'),'miniature',sizeFx);
  assert.equal(placement.width,.3);
  assert.equal(placement.height,.3);
  assert.equal(placement.depth,.3);
  assert.deepEqual(a.prototypeToken,initial());
  assert.equal(a.updates.length,0);
});

test('World actor avoids changing unlinked copies, updates only linked tokens',async()=>{
  const linked=token('Linked',true);
  const unrelated=token('Unlinked Copy',false);
  const a=actor({worldTokens:[linked,unrelated]});
  await syncActorTokenSize(a,'huge');
  assert.equal(linked.width,3);
  assert.equal(unrelated.width,1);
});

test('Existing legacy prototype size Active Effects are cleaned and do not stack',async()=>{
  const a=actor({worldTokens:[token()]});
  const old={id:'e-old',name:'Huge Effects',flags:{'multiverse-d616':{managedSize:true}},changes:[
    {key:'system.size',mode:5,value:'huge'},
    {key:'prototypeToken.width',mode:5,value:5},
    {key:'prototypeToken.height',mode:5,value:5},
    {key:'system.abilities.mle.defense',mode:2,value:-2},
  ],async update(data){this.changes=data.changes;}};
  a.effects.contents.push(old);
  assert.equal(await removeLegacySizeTokenModifiers(a),1);
  assert.deepEqual(old.changes.map(c=>c.key),['system.size','system.abilities.mle.defense']);
  assert.equal(await removeLegacySizeTokenModifiers(a),0);
  assert.equal(effectiveActorTokenSize(a),'huge');
  await syncActorTokenSize(a,'huge');
  assert.equal(a.prototypeToken.depth,3);
  assert.equal(a.getActiveTokens(true,true)[0].depth,3);
});

test('No scene still updates world actor prototype for new tokens',async()=>{
  const a=actor();
  const result=await syncActorTokenSize(a,'titanic');
  assert.equal(a.prototypeToken.width,8);
  assert.equal(result.updated,1);
});

test('Idempotent synchronization skips identical values',async()=>{
  const t=token();
  const a=actor({worldTokens:[t]});
  await syncActorTokenSize(a,'average');
  assert.equal(a.updates.length,0);
  assert.equal(t.calls.length,0);
  await syncActorTokenSize(a,'big');
  await syncActorTokenSize(a,'big');
  assert.equal(a.updates.length,1);
  assert.equal(t.calls.length,1);
});

test('Registration handles deleted resize effects and ignores skip-marked changes',async()=>{
  const listeners=new Map();
  globalThis.Hooks={on:(name,fn)=>listeners.set(name,fn)};
  const t=token();
  const a=actor({worldTokens:[t]});
  await applyGrowChoice(a,power('Grow 1'),'huge',sizeFx);
  assert.equal(t.width,3);
  registerTokenSizeHooks();
  const [deleted] = resize(a);
  await a.deleteEmbeddedDocuments('ActiveEffect',[deleted.id]);
  deleted.parent=a;
  listeners.get('deleteActiveEffect')(deleted,{},undefined);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(t.width,1);
  await applyGrowChoice(a,power('Grow 1'),'huge',sizeFx);
  const existing=resize(a)[0];
  existing.parent=a;
  listeners.get('deleteActiveEffect')(existing,{d616SkipTokenSizeSync:true},undefined);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(t.width,3);
});
