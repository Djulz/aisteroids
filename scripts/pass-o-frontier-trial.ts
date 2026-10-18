import {freshCompany,createWorld,step,settle,buy,STEP,type Company} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';
import {research} from '../src/research.ts';
function shift(c:Company){const w=createWorld(c);for(let i=0;w.phase!=='done'&&i<210/STEP;i++)step(w);if(w.phase!=='done')throw Error('Shift did not finish');return {w,c:settle(c,w)};}
export function trial(seed:number){
 let c=freshCompany(seed);
 for(let round=0;round<12&&c.fleetCapacity<3;round++){
  if(c.fleetCapacity===1&&c.credits>=28){c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',1)!;c={...c,focuses:{...c.focuses,scout:{x:800,y:3420}}};}
  if(c.progress.rivalSeen&&!c.unlockedTechnologies.includes('escortProgram'))c=research(c,'escortProgram')??c;
  if(c.unlockedTechnologies.includes('escortProgram')&&c.credits>=58){c=buy(c,'fleetSlot')!;break;}
  c=shift(c).c;
 }
 if(c.fleetCapacity<3||!c.unlockedTechnologies.includes('escortProgram'))throw Error('Third slot/Fighter unreachable');
 const measure=(protectedFleet:boolean)=>{
  let active=changeFleet(c,protectedFleet?'escort':'impactMiner',1)!;
  active={...active,focuses:{...active.focuses,mining:{x:800,y:3420}}};
  let delivered=0,nickel=0,minerDeaths=0,shots=0;
  for(let i=0;i<6;i++){const result=shift(active);active=result.c;delivered+=result.w.delivered;nickel+=result.w.deliveredByMineral.nickel;minerDeaths+=result.w.drones.filter(d=>d.state==='dead').length;shots+=result.w.attacks;}
  return {delivered,nickel,minerDeaths,shots};
 };
 return {seed,protected:measure(true),unprotected:measure(false)};
}
if(import.meta.url===`file://${process.argv[1]}`)for(const seed of [7,17,42])console.log(JSON.stringify(trial(seed)));
