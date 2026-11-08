import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { expectedVehicleOwners, vehicleOwnerGrantPatch } from '../scripts/vehicles/vehicle-ownership.mjs';
import { boardPassenger, disembarkPassenger, grantVehicleCrewOwnership, releaseDeletedVehicleToken } from '../scripts/vehicles/vehicle-system.mjs';

function setup({vehicleOwnership={default:0}, passengerOwnership={default:0,alice:3}, users=['alice','bob']}={}) {
  const liveUsers=users.map(id=>({id,isGM:false}));
  const vehicle={id:'ship',type:'vehicle',ownership:{...vehicleOwnership},updates:[],flags:{},
    getFlag(_scope,key){return this.flags[key]},
    async update(patch){
      this.updates.push(patch);
      assert.deepEqual(Object.keys(patch),['ownership']);
      assert.ok(!Object.values(patch.ownership).some(v=>v===null||typeof v!=='number'));
      this.ownership={...patch.ownership};
    },
    async setFlag(_scope,key,value){this.flags[key]=structuredClone(value)},
  };
  const passenger={id:'pc1',name:'Override',type:'character',ownership:passengerOwnership};
  const scene={id:'scene1',grid:{size:100},tokens:{contents:[],get(id){return this.contents.find(t=>t.id===id)}},
    async updateEmbeddedDocuments(_type,updates){for(const patch of updates){
      const item=this.tokens.get(patch._id);if(item)Object.assign(item,patch);
    }}
  };
  const crewFlags={};
  const memberToken={id:'passenger',actorId:passenger.id,actor:passenger,parent:scene,x:600,y:100,hidden:false,flags:{},
    getFlag(_scope,key){return this.flags[key]},
    async unsetFlag(_scope,key){delete this.flags[key]},
    async update(patch){Object.assign(this,patch);if(patch['flags.multiverse-d616.embarked'])this.flags.embarked=patch['flags.multiverse-d616.embarked']},
  };
  const shipToken={id:'shipToken',actorId:vehicle.id,actor:vehicle,parent:scene,width:3,height:3,x:100,y:100,elevation:0,
    getFlag(_scope,key){return crewFlags[key]},
    async setFlag(_scope,key,value){crewFlags[key]=structuredClone(value)},
  };
  scene.tokens.contents.push(shipToken,memberToken);
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'},contents:[...liveUsers,{id:'gm',isGM:true}]},
    actors:{get:id=>id==='pc1'?passenger:vehicle},scenes:{contents:[scene]}};
  globalThis.canvas={scene,grid:{size:100},tokens:{controlled:[{document:shipToken}]}};
  globalThis.ui={notifications:{warn(){},error(){}}};
  return {vehicle,passenger,scene,memberToken,shipToken,crewFlags};
}

test('Permanent ownership grant contains only numeric levels; no forced deletion or null',()=>{
 const patch=vehicleOwnerGrantPatch({default:0,alice:1,bob:2},new Set(['alice']));
 assert.deepEqual(patch,{ownership:{default:0,alice:3,bob:2}});
 assert.equal(vehicleOwnerGrantPatch({default:0,alice:3},new Set(['alice'])),null);
 assert.equal(vehicleOwnerGrantPatch({default:3},new Set(['alice'])),null);
 assert.equal(vehicleOwnerGrantPatch({default:0},new Set(['alice.-=id'])),null);
});

test('Board grants OWNER to controller, preserves other permissions, and leave never revokes',async()=>{
 const f=setup({vehicleOwnership:{default:0,alice:1,bob:2}});
 assert.equal(await boardPassenger(f.vehicle,f.passenger,f.memberToken),true);
 assert.equal(f.vehicle.ownership.alice,3);
 assert.equal(f.vehicle.ownership.bob,2);
 assert.equal(f.memberToken.flags.embarked.vehicleTokenId,'shipToken');
 assert.equal(f.vehicle.updates.length,1);
 assert.equal(await disembarkPassenger(f.vehicle,f.memberToken.id),true);
 assert.equal(f.memberToken.flags.embarked,undefined);
 assert.equal(f.vehicle.ownership.alice,3,'OWNER remains after leave');
 assert.equal(f.vehicle.updates.length,1,'leave must not send a permission update');
});

test('The GM alone can change an existing owner after leave, including before scene reload',async()=>{
 const f=setup();
 await boardPassenger(f.vehicle,f.passenger,f.memberToken);
 await disembarkPassenger(f.vehicle,f.memberToken.id);
 f.vehicle.ownership.alice=1; // manual Foundry Permissions dialog
 assert.equal(f.vehicle.ownership.alice,1);
 const before=f.vehicle.updates.length;
 await releaseDeletedVehicleToken(f.shipToken);
 assert.equal(f.vehicle.ownership.alice,1,'deleting ship cannot grant or revoke ownership');
 assert.equal(f.vehicle.updates.length,before);
});

test('Granting OWNER a second time to an already-owned player is a no-op',async()=>{
 const f=setup({vehicleOwnership:{default:0,alice:3}});
 await grantVehicleCrewOwnership(f.vehicle,f.passenger);
 assert.equal(f.vehicle.updates.length,0);
});

test('Access is only granted to players who own the embarked character',async()=>{
 const f=setup({vehicleOwnership:{default:1,bob:2},passengerOwnership:{default:0,alice:3}});
 const desired=expectedVehicleOwners([f.passenger],globalThis.game.users.contents);
 assert.deepEqual([...desired],['alice']);
 await boardPassenger(f.vehicle,f.passenger,f.memberToken);
 assert.equal(f.vehicle.ownership.alice,3);
 assert.equal(f.vehicle.ownership.bob,2);
 assert.equal(f.vehicle.ownership.default,1);
});

test('No permission synchronization on disembark, token removal or canvas refresh',()=>{
 const src=fs.readFileSync(new URL('../scripts/vehicles/vehicle-system.mjs',import.meta.url),'utf8');
 assert.match(src,/await grantVehicleCrewOwnership\(vehicleActor, token\.actor\)/);
 assert.doesNotMatch(src,/reconcileVehicleCrewOwnership|crewOwnershipBackup|ForcedDeletion/);
 assert.doesNotMatch(src,/Hooks\.on\('canvasReady'/);
 const source=fs.readFileSync(new URL('../scripts/vehicles/vehicle-ownership.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/ForcedDeletion|ownership\.\-=|crewOwnershipBackup|delete\s+ownership/);
});
