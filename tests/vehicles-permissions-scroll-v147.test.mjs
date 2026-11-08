import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {expectedVehicleOwners,vehicleOwnerGrantPatch} from '../scripts/vehicles/vehicle-ownership.mjs';
const get=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
test('Embarking grants OWNER only to controllers of embarked characters',()=>{
 const players=[{id:'alice',isGM:false},{id:'bob',isGM:false},{id:'sue',isGM:false},{id:'gm',isGM:true}];
 const actors=[{ownership:{default:0,alice:3}},{ownership:{default:0,bob:3}}];
 const desired=expectedVehicleOwners(actors,players);
 assert.deepEqual([...desired].sort(),['alice','bob']);
 assert.deepEqual(vehicleOwnerGrantPatch({default:0,alice:1,bob:2},desired),{
   ownership:{default:0,alice:3,bob:3}
 });
});
test('Permanent OWNER grant never restores, removes, or overwrites unrelated permissions',()=>{
 const old={default:0,alice:2,bob:1};
 const patch=vehicleOwnerGrantPatch(old,new Set(['alice']));
 assert.deepEqual(patch,{ownership:{default:0,alice:3,bob:1}});
 assert.deepEqual(old,{default:0,alice:2,bob:1},'source is not mutated');
 assert.equal(vehicleOwnerGrantPatch(patch.ownership,new Set(['alice'])),null);
});
test('Vehicle 1.5 crew events preserve sheet scroll before every async change',()=>{
 const main=get('../multiverse-d616.mjs');
 const scope=main.slice(main.indexOf('class MarvelMultiverseVehicleSheet extends'), main.indexOf('class LegacyMarvelMultiverseItemSheet'));
 assert.match(scope,/_d616RememberVehicleScroll\(\)/);
 assert.match(scope,/\.window-content, form, \.sheet-body/);
 for(const action of ['boardByUuid','boardPassenger','setVehicleVisibility','setCrewRole','disembarkPassenger']) {
   const match=scope.indexOf('await '+action);
   assert.ok(match>=0,`${action} exists`);
   assert.match(scope.slice(Math.max(0,match-125),match),/_d616RememberVehicleScroll\(\)/,`${action} snapshots scroll`);
 }
});
test('Vehicle players see the same power cards but may roll, not modify crew',()=>{
 const main=get('../multiverse-d616.mjs');
 const power=get('../templates/actor/parts/actor-powers.hbs');
 assert.match(main,/context.vehicleCanRoll\s*=\s*Boolean/);
 assert.match(power,/else if @root\.vehicleCanRoll/);
 assert.match(power,/class="rollable" data-roll-type="item"/);
 assert.match(main,/context.vehicleCanManage\s*=\s*Boolean\(game\.user\?\.isGM/);
 assert.match(get('../templates/actor/actor-vehicle-sheet.hbs'),/vehicleCanManage/);
});
test('Vehicle grants OWNER on board only; leaving and reloading preserve permissions',()=>{
 const src=get('../scripts/vehicles/vehicle-system.mjs');
 assert.match(src,/await grantVehicleCrewOwnership\(vehicleActor, token\.actor\)/);
 assert.doesNotMatch(src,/reconcileVehicleCrewOwnership/);
 assert.doesNotMatch(src,/Hooks\.on\('canvasReady'/);
});
