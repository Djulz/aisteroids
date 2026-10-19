import {createWorld,step,settle,STEP,type Company} from '../src/sim.ts';
import {campaign} from './pass-p-campaign.ts';
function shift(c:Company){const w=createWorld(c);for(let i=0;w.phase!=='done'&&i<210/STEP;i++)step(w);if(w.phase!=='done')throw Error('Shift did not finish');return {w,c:settle(c,w)};}
export function trial(seed:number){
 let c=campaign(seed,36).company;
 if(c.fleetCapacity<3||!c.progress.rivalSeen)throw Error('Third slot/Fighter unreachable');
 const measure=(protectedFleet:boolean)=>{
  let active:Company={...c,fleetComposition:{impactMiner:protectedFleet?1:2,laserMiner:0,scout:1,escort:protectedFleet?1:0,hauler:0,miningRig:0}};
  active={...active,focuses:{...active.focuses,mining:{x:800,y:3420}}};
  let delivered=0,nickel=0,minerDeaths=0,shots=0;
  for(let i=0;i<6;i++){const result=shift(active);active=result.c;delivered+=result.w.delivered;nickel+=result.w.deliveredByMineral.nickel;minerDeaths+=result.w.drones.filter(d=>d.state==='dead').length;shots+=result.w.attacks;}
  return {delivered,nickel,minerDeaths,shots};
 };
 return {seed,protected:measure(true),unprotected:measure(false)};
}
if(import.meta.url===`file://${process.argv[1]}`)for(const seed of [7,17,42])console.log(JSON.stringify(trial(seed)));
