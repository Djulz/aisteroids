import {campaign} from './pass-p-campaign.ts';
import {createWorld,step,settle,STEP,type Company} from '../src/sim.ts';
import {research} from '../src/research.ts';
import type {FleetComposition} from '../src/fleet.ts';
const rig=(haulers:number):FleetComposition=>({impactMiner:0,laserMiner:0,escort:1,hauler:haulers,scout:0,miningRig:1});
const miners=(haulers:number):FleetComposition=>({impactMiner:2,laserMiner:0,escort:1,hauler:haulers,scout:0,miningRig:0});
function measure(base:Company,composition:FleetComposition,focus:{x:number;y:number},rounds=4){
 let c:Company={...base,enduranceLevel:3,fleetCapacity:usedCapacity(composition),fleetComposition:composition,focuses:{...base.focuses,mining:focus,scout:null}};
 const values={delivered:0,fragments:0,nickel:0,losses:0,seconds:0,extracted:0};
 for(let n=0;n<rounds;n++){const w=createWorld(c);let steps=0;while(w.phase!=='done'&&steps++<12600)step(w,STEP);if(w.phase!=='done')throw Error('bounded comparison exceeded 210 simulated seconds');
  values.delivered+=w.delivered;values.fragments+=w.deliveredFragments;values.nickel+=w.deliveredByMineral.nickel;
  values.losses+=[...w.drones,...w.haulers,...w.rigs].filter(d=>d.state==='dead').length;values.seconds+=w.time;values.extracted+=w.extracted;c=settle(c,w);
 }
 return values;
}
const usedCapacity=(f:FleetComposition)=>f.impactMiner+f.escort+f.hauler+f.scout+2*f.miningRig;
export function comparison(seed=7,haulers=2){if(![1,2].includes(haulers))throw Error('Hauler count must be 1 or 2');
 let base=campaign(seed).company;if(base.fleetCapacity<4)throw Error('comparison requires purchased four-slot company');
 base=research(base,'expressDelivery')??base;
 return {seed,baselineRounds:base.rounds,scenario:`controlled 90s endurance fixture, ${haulers} Hauler${haulers===1?'':'s'}, ${usedCapacity(rig(haulers))} slots; Express research earned, fifth slot is fixture-only when present`,
  sparse:{miners:measure(base,miners(haulers),{x:1170,y:2400}),rig:measure(base,rig(haulers),{x:1170,y:2400})},
  dense:{miners:measure(base,miners(haulers),{x:800,y:3420}),rig:measure(base,rig(haulers),{x:800,y:3420})}};}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(comparison(Number(process.argv[2]??7),Number(process.argv[3]??2)),null,2));
