import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,planMinerWork,step,STEP,type Company,type World} from '../../src/sim.ts';
import {clearSegment} from '../../src/navigation.ts';

function fleet(slots=1):Company{
 return {...freshCompany(7),fleetCapacity:slots,enduranceLevel:3,
  fleetComposition:{impactMiner:0,laserMiner:slots,scout:0,hauler:0,escort:0,miningRig:0},
  unlockedTypes:['impactMiner','scout','laserMiner'],unlockedTechnologies:['laserMining','rapidCooling'],
  extractionUpgrades:['highPowerOptics','resonanceMining'],environmentUpgrades:['radiationShielding','navigationStabilizers']};
}
function chart(w:World){w.explored.fill(255);w.rocks.forEach(r=>w.identifiedRocks.add(r.id));w.wave=1;w.nextRaid=Infinity;}
function run(w:World,seconds:number){for(let i=0;i<seconds/STEP&&w.phase!=='done';i++)step(w);}

test('late-shift mining and salvage use the work window; physical return has its own time',()=>{
 for(const kind of ['rock','ore'] as const){
  const w=createWorld(fleet()),d=w.drones[0];w.rocks=w.rocks.slice(0,1);
  Object.assign(w.rocks[0],{x:1200,y:550,r:18,hp:kind==='rock'?12:0,mineral:'ferrite'});
  if(kind==='ore')w.ores.push({id:w.nextId++,x:1200,y:550,value:1,mineral:'ferrite',age:1});
  chart(w);w.time=70;Object.assign(d,{x:200,y:550,angle:0});
  assert.equal(planMinerWork(w,d)?.kind,kind);
  run(w,18);
  assert.ok(d.x>1000,'dispatch travels to the distant work rather than sitting at base');
  assert.ok(kind==='rock'?w.shots>0:w.minerPickups>0,'useful work happens before recall');
  run(w,90);assert.equal(w.phase,'done');assert.equal(d.state,'docked');
  assert.equal(w.recallFailures,0);assert.equal(d.cargo,0);
  if(kind==='ore'){assert.equal(w.deliveredFragments,1);assert.equal(w.delivered,1);assert.equal(w.ores.length,0);}
 }
});

test('jobs that cannot be reached before recall are rejected and idle miners finish docking',()=>{
 const w=createWorld(fleet()),d=w.drones[0];w.rocks=w.rocks.slice(0,1);
 Object.assign(w.rocks[0],{x:2200,y:550,r:18,hp:12,mineral:'ferrite'});chart(w);w.time=70;
 assert.equal(planMinerWork(w,d),undefined);run(w,8);
 assert.equal(d.state,'docked');assert.equal(w.phase,'done');
 assert.equal(w.extracted,0);assert.equal(w.delivered,0);assert.equal(d.hp,d.maxHp);
});

test('a parked miner redispatches when known salvage matures without a chart or ore-count change',()=>{
 const c=fleet();c.fleetCapacity=2;c.fleetComposition.scout=1;
 const w=createWorld(c),d=w.drones[0];w.rocks=w.rocks.slice(0,1);
 Object.assign(w.rocks[0],{x:2300,y:2300,r:18,hp:12,mineral:'ferrite'});chart(w);w.time=55;
 // Keep a physical Scout in flight so the shift remains active after docking.
 Object.assign(w.scouts[0],{x:1500,y:1500,targetX:200,targetY:550,targetUntil:90,pathKey:''});
 for(let i=0;i<600&&d.state!=='docked';i++)step(w);
 assert.equal(d.state,'docked');assert.equal(w.phase,'mining');
 w.ores.push({id:w.nextId++,x:240,y:550,value:1,mineral:'nickel',age:0});
 const revision=w.mapRevision;run(w,3);
 assert.equal(w.mapRevision,revision);assert.ok(w.minerPickups>0);
 assert.equal(d.cargo,1);assert.equal(w.ores.length,0);assert.equal(w.delivered,0);
});

test('Laser approach chooses clear standoff beside a blocking incompatible asteroid',()=>{
 const c=fleet();c.extractionUpgrades=[];
 const w=createWorld(c),d=w.drones[0];w.rocks=w.rocks.slice(0,2);
 const [target,blocker]=w.rocks;
 Object.assign(target,{x:200,y:440,r:18,hp:12,mineral:'ferrite'});
 Object.assign(blocker,{x:200,y:525,r:18,hp:12,mineral:'voidite'});
 chart(w);Object.assign(d,{x:200,y:580,angle:-Math.PI/2});step(w);
 const approach={x:d.approachX,y:d.approachY};
 assert.equal(d.targetRock,target.id);assert.ok(clearSegment(approach,approach,w.rocks,-1,11));
 assert.ok(clearSegment(approach,target,w.rocks,target.id,0));
 run(w,10);assert.ok(w.shots>0);assert.equal(blocker.hp,12);assert.equal(d.hp,d.maxHp);
});

test('depleted Impact hull parks without unload/relaunch loops or free repairs',()=>{
 const c=freshCompany();c.enduranceLevel=3;
 const w=createWorld(c),d=w.drones[0];d.hp=1;chart(w);run(w,10);
 assert.equal(d.state,'docked');assert.equal(d.hp,1);assert.equal(w.collisions,0);assert.equal(w.extracted,0);
});

test('six-miner depleted Home Belt has no prolonged unexplained stationary base wait',()=>{
 const w=createWorld(fleet(6));chart(w);
 for(const r of w.rocks)if(Math.hypot(r.x-w.base.x,r.y-w.base.y)<900)r.hp=0;
 const waits=w.drones.map(()=>0);let longest=0;
 for(let i=0;i<5401&&w.phase==='mining';i++){
  step(w);
  w.drones.forEach((d,n)=>{
   const idle=d.state==='mine'&&d.cargo===0&&Math.hypot(d.x-w.base.x,d.y-w.base.y)<190&&Math.hypot(d.vx,d.vy)<3;
   waits[n]=idle?waits[n]+STEP:0;longest=Math.max(longest,waits[n]);
  });
 }
 assert.ok(longest<1,`longest unexplained base wait was ${longest.toFixed(2)} seconds`);
 assert.ok(w.shots>0);assert.ok(w.deliveredFragments>0);
});
