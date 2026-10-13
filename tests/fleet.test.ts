import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,createWorld,freshCompany,settle,step,ROUND_TIME,type Company} from '../src/sim.ts';
import {fleetForCounts,renameDrone} from '../src/fleet.ts';
import {parseSave} from '../src/storage.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';

const view:LobbyView={tab:'hangar',selectedId:'miner-1',editing:false,doctrineOpen:false,planOpen:false,error:'',storageOK:true};

test('individual IDs survive purchases, renames, missions and reloads',()=>{
 let c={...freshCompany(),credits:1000};
 const originalId=c.fleet[0].id;
 c={...c,fleet:renameDrone(c.fleet,originalId,'BULT-01')!};
 c=buy(c,'drone')!;
 assert.deepEqual(c.fleet.map(d=>d.id),['miner-1','miner-2']);
 assert.equal(c.fleet[0].name,'BULT-01');
 c={...c,progress:{...c.progress,rivalSeen:true}};
 c=buy(c,'guard')!;
 assert.deepEqual(c.fleet.map(d=>d.role),['miner','miner','escort']);
 const saved=parseSave(JSON.stringify(c));
 assert.deepEqual(saved.fleet,c.fleet);
 const world=createWorld(saved);
 assert.equal(world.drones[0].identityId,originalId);
 assert.equal(world.drones[0].name,'BULT-01');
 assert.equal(world.guards[0].identityId,'escort-1');
 world.drones[0].state='dead';
 const after=settle(saved,world);
 assert.deepEqual(after.fleet,saved.fleet,'destruction does not erase or replace a drone');
});

test('existing saves gain exactly the owned identities; invalid and duplicate records cannot change ownership',()=>{
 const old={...freshCompany(),version:5,drones:4,guards:1,fleet:undefined,credits:190,laser:true};
 const restored=parseSave(JSON.stringify(old));
 assert.equal(restored.credits,190);assert.equal(restored.laser,true);
 assert.deepEqual(restored.fleet.map(d=>d.id),['miner-1','miner-2','miner-3','miner-4','escort-1']);
 const corrupt={...old,fleet:[{id:'miner-1',role:'miner',name:'SPARK-02'},{id:'miner-2',role:'miner',name:'SPARK-02'},{id:'miner-3',role:'escort',name:'FAKE'},{id:'miner-5',role:'miner',name:'EXTRA'}]};
 const sanitized=parseSave(JSON.stringify(corrupt));
 assert.equal(sanitized.fleet.length,5);
 assert.equal(new Set(sanitized.fleet.map(d=>d.id)).size,5);
 assert.equal(new Set(sanitized.fleet.map(d=>d.name.toLowerCase())).size,5);
 assert.equal(sanitized.fleet[2].role,'miner');
 assert.equal(sanitized.fleet.some(d=>d.name==='EXTRA'),false);
});

test('renaming rejects duplicate and invalid names without changing stable IDs',()=>{
 const fleet=fleetForCounts(2,0);
 assert.equal(renameDrone(fleet,'miner-2','BOLT-01'),null);
 assert.equal(renameDrone(fleet,'miner-1',' '),null);
 assert.equal(renameDrone(fleet,'miner-7','Ghost'),null);
 const updated=renameDrone(fleet,'miner-1','The <Captain>')!;
 assert.equal(updated[0].id,fleet[0].id);
 assert.equal(updated[0].name,'The <Captain>');
 assert.equal(fleet[0].name,'BOLT-01');
});

test('lobby renders individual engineering, mission plan and doctrine',()=>{
 const c={...freshCompany(),drones:2,guards:1,doctrine:'convoy' as const,fleet:fleetForCounts(2,1)};
 c.fleet=renameDrone(c.fleet,'miner-1','The <Captain>')!;
 const hangar=renderLobby(c,view);
 assert.match(hangar,/The &lt;Captain&gt;/);
 assert.match(hangar,/GUARD-01/);
 assert.match(hangar,/3 OWNED · 1 ESCORT SLOT/);
 assert.match(hangar,/Convoy Protocol/);
 assert.match(hangar,/FRAME <b>Standard/);
 assert.doesNotMatch(hangar,/data-directive=/);
 const edit=renderLobby(c,{...view,editing:true});
 assert.match(edit,/id="tinker-form"/);assert.match(edit,/data-frame="heavy"/);assert.match(edit,/data-module-slot="1"/);
 const shop=renderLobby(c,{...view,tab:'workshop'});
 assert.match(shop,/Extra Drone/);assert.match(shop,/data-buy="drone"/);
 assert.match(shop,/data-buy="guard"[^>]*disabled/);
});

test('renamed miners still complete outpost recall and remain owned after a total fleet loss',()=>{
 const c:Company={...freshCompany(),outpost:true,launchSite:'far',drones:2,laser:true,fleet:renameDrone(fleetForCounts(2,0),'miner-2','Pip')!};
 const w=createWorld(c);w.time=ROUND_TIME;
 for(const d of w.drones){d.cargo=12;d.state='return';d.x=535;d.y=600;}
 for(let i=0;i<1200&&w.phase!=='done';i++)step(w);
 assert.equal(w.phase,'done');assert.equal(w.delivered,24);
 assert.equal(settle(c,w).fleet[1].name,'Pip');
 const lost=createWorld(c);lost.drones.forEach(d=>d.state='dead');
 for(let i=0;i<200&&lost.phase!=='done';i++)step(lost);
 assert.equal(lost.phase,'done');assert.equal(settle(c,lost).fleet[1].name,'Pip');
});
