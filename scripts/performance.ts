// Bounded diagnostic fixtures, not a campaign or economic grants in gameplay.
import {performance} from 'node:perf_hooks';
import {createWorld,freshCompany,step,W,H,type Company} from '../src/sim.ts';
import {route,navigationStats} from '../src/navigation.ts';

const c:Company={...freshCompany(7),fleetCapacity:6,enduranceLevel:3,
 fleetComposition:{impactMiner:3,laserMiner:0,scout:1,hauler:1,escort:1,miningRig:0},
 unlockedTypes:['impactMiner','scout','hauler','escort'],talents:['laserCutter','bulkCarrier'],
 extractionUpgrades:['highPowerOptics','resonanceMining'],
 environmentUpgrades:['radiationShielding','navigationStabilizers'],
 progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:true}};
const nav=createWorld(c),start=performance.now();
for(let i=0;i<12;i++){
 const target=nav.rocks[12+i%6];
 route({x:200,y:550},target,nav.rocks,target.id,W,H);
}
console.log(JSON.stringify({fixture:'alternating-rock-routes',calls:12,ms:Math.round(performance.now()-start),navigation:navigationStats(nav.rocks)}));
const w=createWorld(c);w.explored.fill(255);w.rocks.forEach(r=>w.identifiedRocks.add(r.id));
// Salvage-heavy existing saves amplify planning/claims costs.
const fragments=process.argv[2]===undefined?240:Number(process.argv[2]);
if(!Number.isInteger(fragments)||fragments<0||fragments>5000)throw Error('Fragment fixture must be 0–5000');
for(let i=0;i<fragments;i++)w.ores.push({id:w.nextId++,x:450+(i%20)*17,y:540+(Math.floor(i/20)%15)*17,value:1,mineral:i%3?'nickel':'ferrite',age:1});
const samples:number[]=[],wall=performance.now();
for(let i=0;i<900&&w.phase!=='done';i++){
 const t=performance.now();step(w);samples.push(performance.now()-t);
}
samples.sort((a,b)=>a-b);
const percentile=(p:number)=>Number(samples[Math.min(samples.length-1,Math.floor(samples.length*p))].toFixed(2));
console.log(JSON.stringify({fixture:'six-ships-salvage',fragments,steps:samples.length,ms:Math.round(performance.now()-wall),p95:percentile(.95),p99:percentile(.99),worst:percentile(1),delivered:w.delivered,extracted:w.extracted}));
