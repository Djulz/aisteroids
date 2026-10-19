// Controlled late-company fixtures: depletion + known geography, no combat.
import {performance} from 'node:perf_hooks';
import {createWorld,freshCompany,step,STEP,planMinerWork,type Company} from '../src/sim.ts';

for(const [seed,slots,cleared] of [[7,5,900],[7,6,900],[19,6,1300]] as const){
 const c:Company={...freshCompany(seed),fleetCapacity:slots,enduranceLevel:3,
  fleetComposition:{impactMiner:slots,laserMiner:0,scout:0,hauler:0,escort:0,miningRig:0},
  unlockedTypes:['impactMiner','scout'],talents:['laserCutter','longRangeOptics'],
  extractionUpgrades:['highPowerOptics','resonanceMining'],environmentUpgrades:['radiationShielding','navigationStabilizers']};
 const w=createWorld(c);w.explored.fill(255);w.rocks.forEach(r=>{w.identifiedRocks.add(r.id);if(Math.hypot(r.x-w.base.x,r.y-w.base.y)<cleared)r.hp=0;});
 w.wave=1;w.nextRaid=Infinity;
 const current=w.drones.map(()=>0),longest=w.drones.map(()=>0),trace:unknown[]=[];
 const wall=performance.now();let nextTrace=0;
 for(let i=0;i<5401&&w.phase==='mining';i++){
  step(w);
  w.drones.forEach((d,n)=>{
   if(d.state==='mine'&&d.cargo===0&&Math.hypot(d.x-w.base.x,d.y-w.base.y)<190&&Math.hypot(d.vx,d.vy)<3)current[n]+=STEP;else current[n]=0;
   longest[n]=Math.max(longest[n],current[n]);
  });
  if(w.time>=nextTrace){const d=w.drones[0],job=planMinerWork(w,d);trace.push({time:+w.time.toFixed(1),state:d.state,x:Math.round(d.x),y:Math.round(d.y),path:d.pathKey,points:d.path.length,job:job?.kind,hp:d.hp,cargo:d.cargo});nextTrace+=10;}
 }
 console.log(JSON.stringify({seed,slots,cleared,ms:Math.round(performance.now()-wall),worstBaseWait:+Math.max(...longest).toFixed(2),shots:w.shots,delivered:w.delivered,trace}));
}
