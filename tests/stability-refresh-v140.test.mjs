import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {combatChangeAffectsActorSheets,makeCombatSheetRefreshScheduler} from '../scripts/combat/sheet-refresh-core.mjs';
import {registerConditionRecoveryHooks} from '../scripts/condition-actions.mjs';

const manifest=JSON.parse(readFileSync(new URL('../system.json',import.meta.url),'utf8'));

test('v140: Combat flag-only mutations do not rerender Actor sheets',()=>{
  assert.equal(combatChangeAffectsActorSheets({flags:{'multiverse-d616':{damage:4}}}),false);
  assert.equal(combatChangeAffectsActorSheets({sort:0}),false);
  assert.equal(combatChangeAffectsActorSheets({}),false);
  for(const field of ['turn','round','started','active','combatants','scene','sceneId'])
    assert.equal(combatChangeAffectsActorSheets({[field]:1}),true,field);
  assert.equal(combatChangeAffectsActorSheets(null),true,'unknown event must stay safe');
});

test('v140: a burst of 30 combat hooks schedules one sheet update per frame',()=>{
  let renders=0;
  const frames=[];
  const schedule=makeCombatSheetRefreshScheduler(()=>renders++,fn=>frames.push(fn));
  for(let i=0;i<30;i++)schedule();
  assert.equal(frames.length,1);
  assert.equal(renders,0);
  frames.shift()();
  assert.equal(renders,1);
  schedule();
  assert.equal(frames.length,1,'the next actual update must still render');
  frames.shift()();
  assert.equal(renders,2);
});

test('v140: condition recovery snapshots initialize immediately when registered inside ready',()=>{
  const old={game:globalThis.game,canvas:globalThis.canvas,Hooks:globalThis.Hooks};
  let reads=0;
  const actor=uuid=>({uuid,system:{health:{get value(){reads++;return 44;}}}});
  const worldActor=actor('Actor.world'),tokenActor=actor('Scene.x.Token.y.Actor.x');
  const callbacks=new Map();
  try{
    globalThis.game={actors:{contents:[worldActor]}};
    globalThis.canvas={tokens:{placeables:[{actor:tokenActor}]}};
    globalThis.Hooks={on(name,fn){callbacks.set(name,[...(callbacks.get(name)||[]),fn]);}};
    registerConditionRecoveryHooks();
    assert.equal(reads,2,'world Actor and synthetic token Actor should be observed at once');
    assert.equal(callbacks.has('ready'),false,'ready already fired before registration');
    assert.equal(callbacks.get('canvasReady')?.length,1);
    callbacks.get('canvasReady')[0]();
    assert.equal(reads,4,'canvas changes should refresh snapshots');
  }finally{
    for(const key of Object.keys(old)){
      if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];
    }
  }
});

test('v140: system manifest references resolvable runtime files and all six LevelDB packs',()=>{
  assert.equal(manifest.version,'0.2.153');
  assert.equal(manifest.packs.length,6);
  const referenced=[...manifest.esmodules,...manifest.styles,...manifest.languages.map(x=>x.path)];
  for(const file of referenced)assert.ok(existsSync(new URL(`../${file}`,import.meta.url)),`manifest path missing: ${file}`);
  for(const pack of manifest.packs){
    for(const f of ['CURRENT','MANIFEST-000001','000002.log'])
      assert.ok(existsSync(new URL(`../${pack.path}/${f}`,import.meta.url)),`${pack.name}/${f} missing`);
  }
});

test('v140: source wires the protective sheet scheduler into real combat hooks',()=>{
  const source=readFileSync(new URL('../multiverse-d616.mjs',import.meta.url),'utf8');
  assert.match(source,/makeCombatSheetRefreshScheduler\(\s*rerenderOpenD616ActorSheets/);
  assert.match(source,/hook === 'updateCombat' && !combatChangeAffectsActorSheets\(changed\)/);
  assert.match(source,/scheduleCombatActorSheetRefresh\(\)/);
});
