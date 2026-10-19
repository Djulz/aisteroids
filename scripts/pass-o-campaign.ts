import {performance} from 'node:perf_hooks';
import {freshCompany,createWorld,step,settle,buy,STEP,type Company} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';

export function campaign(seed:number,rounds=8){
 let company=freshCompany(seed);const rows=[];
 for(let mission=1;mission<=rounds;mission++){
  if(company.fleetCapacity===1&&company.credits>=28)company=buy(company,'fleetSlot')!;
  if(company.fleetCapacity>=2&&company.fleetComposition.scout===0)company=changeFleet(company,'scout',1)!;
  if(company.fleetComposition.scout>0&&!company.focuses.scout)company={...company,focuses:{...company.focuses,scout:{x:800,y:3420}}};
  if(company.progress.rivalSeen&&company.fleetCapacity<3&&company.credits>=58)company=buy(company,'fleetSlot')!;
  if(company.fleetCapacity>=3&&company.progress.rivalSeen&&company.fleetComposition.escort===0)company=changeFleet(company,'escort',1)!;
  if(company.fleetComposition.escort>0)company={...company,focuses:{...company.focuses,mining:{x:800,y:3420}}};
  const start=performance.now(),world=createWorld(company);
  for(let tick=0;world.phase!=='done'&&tick<210/STEP;tick++)step(world);
  if(world.phase!=='done')throw Error(`Mission ${mission} did not settle`);
  const next=settle(company,world);
  rows.push({seed,mission,seconds:Math.round(performance.now()-start),slots:company.fleetCapacity,ships:`${company.fleetComposition.impactMiner}M/${company.fleetComposition.scout}S/${company.fleetComposition.escort}F`,earned:world.delivered,credits:next.credits,contact:next.progress.rivalSeen,regions:[...world.knownRegions].join(','),losses:world.lost,attacks:world.attacks,tech:next.techPointsAvailable});
  company=next;
 }
 return rows;
}
if(import.meta.url===`file://${process.argv[1]}`){
 for(const seed of [7,17,42])for(const row of campaign(seed,16))console.log(JSON.stringify(row));
}
