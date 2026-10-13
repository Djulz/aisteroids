import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,STEP,type Company,type World} from '../src/sim.ts';
import {doctrineIds} from '../src/doctrines.ts';
function run(w:World){for(let i=0;i<12000&&w.phase!=='done';i++)step(w,STEP);return w;}
test('each doctrine snapshots at launch and finishes a seeded mission',()=>{
 for(const doctrine of doctrineIds){const c={...freshCompany(),doctrine},w=createWorld(c,7);assert.equal(w.doctrine,doctrine);assert.equal(w.company.doctrine,doctrine);run(w);assert.equal(w.phase,'done');assert.ok(w.drones.length>0);}
});
test('careful retreat and convoy coordination still apply to type-based fleet',()=>{
 const c:Company={...freshCompany(),fleetCapacity:3,fleetComposition:{impactMiner:2,laserMiner:0,escort:1,hauler:0,miningRig:0},progress:{...freshCompany().progress,rivalSeen:true,richSampled:true},doctrine:'convoy'};
 const convoy=createWorld(c),careful=createWorld({...c,doctrine:'careful'});
 assert.equal(convoy.drones.length,2);assert.equal(convoy.guards.length,1);
 for(const w of [convoy,careful]){w.enemies.push({id:99,x:w.drones[0].x+30,y:w.drones[0].y-20,vx:0,vy:0,hp:3,cooldown:1,path:[],pathKey:'',pathAge:0});step(w,STEP);}
 assert.ok(careful.disengagements>=1);assert.equal(convoy.doctrine,'convoy');
});
test('Full Contact never converts Laser Miner to ramming',()=>{
 const base=freshCompany(),c:Company={...base,unlockedTypes:['impactMiner','laserMiner'],fleetComposition:{...base.fleetComposition,impactMiner:0,laserMiner:1},doctrine:'fullContact'};
 const w=run(createWorld(c));assert.ok(w.shots>0);assert.equal(w.collisions,0);
});
test('unlocked Escort and built HQ Turret still fire on valid in-range hostiles',()=>{
 const base=freshCompany(),c:Company={...base,turret:true,fleetCapacity:2,fleetComposition:{...base.fleetComposition,escort:1},progress:{...base.progress,rivalSeen:true}};
 const w=createWorld(c),g=w.guards[0];w.enemies.push({id:88,x:g.x+35,y:g.y-20,vx:0,vy:0,hp:3,cooldown:4,path:[],pathKey:'',pathAge:0});
 step(w,STEP);assert.ok(w.intercepts>=1);assert.ok(w.effects.some(e=>e.type==='guardShot'||e.type==='turretShot'));
});
