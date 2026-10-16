import {buy,buyEnvironment,createWorld,freshCompany,settle,step,cost,unlocked,focusSurvey,exploredAt,HOME,FAR,type Company,type Purchase} from '../src/sim.ts';
import {research,researchReason,type TechnologyId} from '../src/research.ts';
import {changeFleet,usedSlots,type FleetType} from '../src/fleet.ts';
import {ENVIRONMENT_UPGRADES,environmentIds,biomeAt} from '../src/biomes.ts';
import {MINERALS,mineralIds,type MineralId} from '../src/minerals.ts';

type Milestones=Record<string,number>;
const priorities:TechnologyId[]=['laserMining','escortProgram','haulerOperation','rapidCooling','impactRecovery','threatTracking','expandedHauler'];
function equip(c:Company):Company{
 const desired:FleetType[]=['scout','laserMiner','escort','hauler','laserMiner'];
 const target:Partial<Record<FleetType,number>>={};
 for(const type of desired){if(usedSlots(c.fleetComposition)>=c.fleetCapacity)break;
  target[type]=(target[type]??0)+1;
  if(c.fleetComposition[type]>=(target[type]??0))continue;
  const next=changeFleet(c,type,1);if(next)c=next;
 }
 return c;
}
export function campaign(seed:number,limit=100){
 let c={...freshCompany(),worldSeed:seed},notes:Milestones={},earned=0,losses=0;
 const mark=(key:string,shift:number)=>{notes[key]??=shift;};
 for(let shift=1;shift<=limit;shift++){
  const w=createWorld(c,seed);const before=c;
  // A legitimate optional Survey Focus moves the Scout along charted edges.
  // It never targets deep Fog and does not grant map cells, sites or resources.
  if(w.scouts.length){
   const start=c.progress.outpostSurveyed?FAR:HOME,destination=c.progress.outpostSurveyed?{x:2440,y:1950}:FAR;
   for(let t=.03;t<=1;t+=.015){const point={x:start.x+(destination.x-start.x)*t,y:start.y+(destination.y-start.y)*t};
    if(!exploredAt(w,point)&&focusSurvey(w,point))break;
   }
  }
  for(let frame=0;frame<18000&&w.phase!=='done';frame++)step(w);
  if(w.phase!=='done')throw Error(`Unbounded shift ${shift} (${seed})`);
  c=settle(c,w);earned+=w.delivered;losses+=w.drones.filter(d=>d.state==='dead').length;
  if(c.progress.rivalSeen)mark('contact',shift);
  for(const id of c.uniqueTechDiscoveries)if(id==='abandoned_research_station'||id==='experimental_probe_salvaged'||id==='derelict_freight_shuttle')mark(id,shift);
  for(const id of mineralIds)if(w.deliveredByMineral[id]>0)mark(`delivered:${id}`,shift);
  for(const id of new Set([...w.ores.map(o=>o.mineral),...w.drones.flatMap(d=>d.cargoItems.map(item=>item.mineral))]))if(id!=='ferrite')mark(`seen:${id}`,shift);
  if(w.delivered>0&&c.progress.richSampled)mark('valuable delivery',shift);
  if(shift===1&&c.fleetCapacity!==1)throw Error('Starter phase was changed');
  for(const id of priorities){if(!researchReason(c,id)){c=research(c,id)!;mark(`research:${id}`,shift);}}
  for(const item of ['fleetSlot','endurance','highPowerOptics','resonanceMining','outpost'] as Purchase[]){
   if(!unlocked(c,item)||c.credits<cost(c,item))continue;
   // A first Scout, then a productive Laser, then an Escort make early
   // investment choices explicit without granting any future unlocks.
   if(item==='fleetSlot'&&c.fleetCapacity>=5)continue;
   const next=buy(c,item);if(next){c=next;mark(`buy:${item}:${item==='fleetSlot'?c.fleetCapacity:item==='endurance'?c.enduranceLevel:''}`,shift);}
  }
  for(const id of environmentIds){if(c.credits<ENVIRONMENT_UPGRADES[id].cost)continue;const next=buyEnvironment(c,id);if(next){c=next;mark(`buy:${id}`,shift);}}
  c=equip(c);
  if(c.outpost)c={...c,launchSite:'far'};
  if(shift%10===0)console.log(`Seed ${seed}, shift ${shift}: credits ${c.credits}, slots ${c.fleetCapacity}, endurance ${c.enduranceLevel}, Tech ${c.techPointsAvailable}, upgrades ${c.extractionUpgrades.join(',')}`);
  if(c.extractionUpgrades.includes('resonanceMining')&&w.ores.some(o=>o.mineral==='voidite'))mark('voidite extracted',shift);
  if(c.credits>Number.MAX_SAFE_INTEGER/2||earned>Number.MAX_SAFE_INTEGER/2)throw Error('Unsafe credit total');
  if(shift===limit||notes['delivered:voidite'])return {seed,shifts:shift,notes,credits:c.credits,earned,losses,slots:c.fleetCapacity,endurance:c.enduranceLevel,upgrades:c.extractionUpgrades,regions:[...new Set(w.rocks.map(r=>biomeAt(r.x,r.y)))],remaining:Object.fromEntries(Object.keys(MINERALS).map(id=>[id,w.rocks.filter(r=>r.mineral===id).reduce((n,r)=>n+r.hp,0)]))};
  if(before.rounds+1!==c.rounds)throw Error('Settlement did not advance exactly once');
 }
 throw Error('Campaign loop did not finish');
}

const inventory=createWorld(freshCompany()).rocks;
console.log('Deposits:',JSON.stringify(Object.fromEntries(Object.keys(MINERALS).map(id=>[id,{deposits:inventory.filter(r=>r.mineral===id).length,fragments:inventory.filter(r=>r.mineral===id).reduce((n,r)=>n+r.hp,0),credits:inventory.filter(r=>r.mineral===id).reduce((n,r)=>n+r.hp*MINERALS[id as MineralId].credits,0)}]))));
const seeds=process.argv[2]?[Number(process.argv[2])]:[7,19,41];
const limit=Number(process.argv[3]??100);
for(const seed of seeds){const result=campaign(seed,limit);console.log(JSON.stringify(result));
 if(seed===7&&limit>=100&&!result.notes['delivered:voidite'])throw Error('Default seed did not deliver Voidite within the bounded campaign');
}
