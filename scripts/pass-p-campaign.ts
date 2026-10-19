import {freshCompany,createWorld,step,settle,buy,STEP,type Company} from '../src/sim.ts';
import {changeFleet,usedSlots} from '../src/fleet.ts';
import {research} from '../src/research.ts';
import {generateUniverse} from '../src/universe.ts';

function shift(c:Company){const w=createWorld(c);let steps=0;while(w.phase!=='done'&&steps++<12600)step(w,STEP);if(w.phase!=='done')throw Error('bounded shift exceeded 210 simulated seconds');return {world:w,company:settle(c,w)};}
export function campaign(seed=7,maxShifts=42){
 let c=freshCompany(seed);const records:Record<string,unknown>[]=[],u=generateUniverse(seed),platform=u.pois.find(p=>p.id==='derelict_excavation_platform')!;
 for(let round=0;round<maxShifts;round++){
  if(c.fleetCapacity===1&&c.credits>=28){c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',1)!;}
  if(c.fleetCapacity===2&&c.progress.rivalSeen&&c.fleetComposition.scout){c=changeFleet(c,'scout',-1)!;c=changeFleet(c,'escort',1)!;}
  if(c.fleetCapacity===2&&c.progress.rivalSeen&&c.credits>=58){c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',1)!;}
  if(c.fleetCapacity===3&&c.uniqueTechDiscoveries.includes(platform.id)&&c.credits>=155){
   c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',-1)!;c=changeFleet(c,'miningRig',1)!;
   c=changeFleet(c,'impactMiner',-1)!;c=changeFleet(c,'hauler',1)!;
  }
  if(c.techPointsAvailable&&c.talents.length===0)c=research(c,'ramSplitter')??c;
  const pin={x:800,y:3420},scoutTarget=c.uniqueTechDiscoveries.includes('first_nickel_delivery')?platform:pin;
  c={...c,focuses:{...c.focuses,scout:c.fleetComposition.scout?{x:scoutTarget.x,y:scoutTarget.y}:null,
   mining:c.progress.rivalSeen?pin:null}};
  const result=shift(c);c=result.company;
  records.push({round:round+1,capacity:c.fleetCapacity,used:usedSlots(c.fleetComposition),delivered:result.world.delivered,nickel:result.world.deliveredByMineral.nickel,
   credits:c.credits,tech:c.techPointsAvailable,contact:c.progress.rivalSeen,platformProgress:c.poiProgress[platform.id]??0,platform:c.unlockedTypes.includes('miningRig')});
  if(c.unlockedTypes.includes('miningRig')&&c.fleetCapacity>=4)break;
 }
 return {seed,company:c,records};
}
if(import.meta.url===`file://${process.argv[1]}`){const result=campaign(Number(process.argv[2]??7));console.log(JSON.stringify({seed:result.seed,records:result.records,techLedger:result.company.uniqueTechDiscoveries},null,2));}
