// Paid, persistent B2-to-Aurite reference policy. No free Credits, Tech or map.
import {campaign} from './pass-p-campaign.ts';
import {createWorld,step,settle,buy,STEP,type Company,type Purchase} from '../src/sim.ts';
import {generateUniverse} from '../src/universe.ts';
import {currentObjective} from '../src/progression.ts';

export function auriteCampaign(seed=7,limit=70){
 const start=campaign(seed,35),u=generateUniverse(seed);
 let c:Company=start.company;
 const records:{shift:number;objective:string;purchase?:string;credits:number;delivered:number;aurite:number;extractedAurite:number;knownAurite:number;focusDistance:number|null;scoutDistance:number;losses:number;outpost:boolean;operated:boolean}[]=[];
 for(let i=0;i<limit&&!c.progress.outpostOperated;i++){
  let purchase:Purchase|undefined;
  const priorities:Purchase[]=['endurance','deflectorShields','highPowerOptics','outpost'];
  for(const item of priorities){
   if(item==='endurance'&&c.enduranceLevel>=2||item==='deflectorShields'&&c.deflectorShields||item==='highPowerOptics'&&c.extractionUpgrades.includes(item)||item==='outpost'&&c.outpost)continue;
   const next=buy(c,item);if(next){c=next;purchase=item;break;}
  }
  const station=c.uniqueTechDiscoveries.includes('abandoned_research_station');
  const first=c.uniqueTechDiscoveries.includes('first_aurite_delivery');
  const target=c.outpost?u.outpost:station?first?u.outpost:{x:2550,y:2200}:{x:1700,y:2300};
  const map=createWorld(c);
  const aurite=map.rocks.filter(r=>r.hp>0&&r.mineral==='aurite'&&c.identifiedRocks.includes(r.id))
   .sort((a,b)=>Math.hypot(a.x-(c.outpost?u.outpost.x:u.hq.x),a.y-(c.outpost?u.outpost.y:u.hq.y))-Math.hypot(b.x-(c.outpost?u.outpost.x:u.hq.x),b.y-(c.outpost?u.outpost.y:u.hq.y)))[0];
  const nickel=map.rocks.filter(r=>r.hp>0&&r.mineral==='nickel'&&c.identifiedRocks.includes(r.id))
   .sort((a,b)=>Math.hypot(a.x-u.hq.x,a.y-u.hq.y)-Math.hypot(b.x-u.hq.x,b.y-u.hq.y))[0];
  c={...c,fleetComposition:{impactMiner:2,laserMiner:0,escort:1,scout:1,hauler:0,miningRig:0},
   focuses:{scout:{x:target.x,y:target.y},mining:c.extractionUpgrades.includes('highPowerOptics')&&aurite?{x:aurite.x,y:aurite.y}:nickel?{x:nickel.x,y:nickel.y}:null}};
  const objective=currentObjective(c).id,w=createWorld(c);let steps=0;
  while(w.phase!=='done'&&steps++<16200)step(w,STEP);
  if(w.phase!=='done')throw Error(`Shift ${c.rounds+1} did not finish`);
  c=settle(c,w);
  records.push({shift:c.rounds,objective,purchase,credits:c.credits,delivered:w.delivered,aurite:w.deliveredByMineral.aurite,extractedAurite:w.extractedByMineral.aurite,
   knownAurite:w.rocks.filter(r=>r.mineral==='aurite'&&c.identifiedRocks.includes(r.id)).length,
   focusDistance:c.focuses.mining?Math.round(Math.hypot(c.focuses.mining.x-u.hq.x,c.focuses.mining.y-u.hq.y)):null,
   scoutDistance:Math.round(Math.hypot(w.scouts[0].x-u.hq.x,w.scouts[0].y-u.hq.y)),
   losses:w.drones.filter(d=>d.state==='dead').length+w.scouts.filter(d=>d.state==='dead').length+w.guards.filter(d=>d.hp<=0).length,outpost:c.outpost,operated:c.progress.outpostOperated});
  if(import.meta.url===`file://${process.argv[1]}`&&(i+1)%5===0)console.error(`Aurite campaign: ${i+1}/${limit} continuation shifts, ${c.credits} Credits, objective ${currentObjective(c).id}`);
 }
 return {seed,company:c,startingShifts:start.company.rounds,records};
}
if(import.meta.url===`file://${process.argv[1]}`){const r=auriteCampaign(Number(process.argv[2]??7),Number(process.argv[3]??70));console.log(JSON.stringify({seed:r.seed,startingShifts:r.startingShifts,endingShifts:r.company.rounds,credits:r.company.credits,objective:currentObjective(r.company).id,progress:r.company.progress,records:r.records},null,2));}
