// One bounded, purchase-driven policy from zero resources through both frontiers.
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {auriteCampaign} from './aurite-campaign.ts';
import {createWorld,step,settle,buy,buyEnvironment,STEP,type Company,type Purchase} from '../src/sim.ts';
import {currentObjective} from '../src/progression.ts';
import {generateUniverse} from '../src/universe.ts';
import {fleetError} from '../src/fleet.ts';

const checkpointPath=process.env.RBR_OUTER_CHECKPOINT??'balance-results/outer-campaign-checkpoint.json';
export function outerFrontierCampaign(seed=7,limit=85,resume=false){
 const saved=resume?JSON.parse(readFileSync(checkpointPath,'utf8')) as {seed:number;startingShifts:number;auriteShift:number;company:Company;records:RecordEntry[]}:null;
 if(saved&&saved.seed!==seed)throw Error('Checkpoint belongs to another seed');
 const prior=saved?{company:saved.company,startingShifts:saved.startingShifts}:auriteCampaign(seed,70),u=generateUniverse(seed);
 if(!prior.company.progress.outpostOperated)throw Error('Paid Aurite route did not establish the Outpost');
 let c:Company=prior.company;
 type Entry=RecordEntry;
 const records:Entry[]=saved?.records??[],auriteShift=saved?.auriteShift??prior.company.rounds;
 for(let i=records.length;i<limit&&!c.uniqueTechDiscoveries.includes('first_voidite_delivery');i++){
  let purchase:string|undefined;
  for(const id of ['navigationStabilizers','radiationShielding'] as const){
   const next=buyEnvironment(c,id);if(next){c=next;purchase=id;break;}
  }
  if(!purchase)for(const id of ['endurance','fleetSlot','resonanceMining'] as Purchase[]){
   if(id==='endurance'&&c.enduranceLevel>=3||id==='fleetSlot'&&c.fleetCapacity>=5)continue;
   const next=buy(c,id);if(next){c=next;purchase=id;break;}
  }
  const archive=u.pois.find(p=>p.id==='automated_sorting_archive')!,probe=u.pois.find(p=>p.id==='experimental_probe_salvaged')!;
  const firstCryonite=c.uniqueTechDiscoveries.includes('first_cryonite_delivery');
  const archiveKnown=c.discoveredPois.includes(archive.id),probeKnown=c.discoveredPois.includes(probe.id);
  const scout=firstCryonite&&!c.uniqueTechDiscoveries.includes(archive.id)?archiveKnown?archive:{x:4150,y:3580}:
   !c.uniqueTechDiscoveries.includes(probe.id)?probeKnown?probe:{x:2450,y:2000}:firstCryonite?{x:5450,y:3300}:{x:4000,y:3200};
  const known=createWorld(c).rocks.filter(r=>r.hp>0&&c.identifiedRocks.includes(r.id));
  const desired=firstCryonite&&c.extractionUpgrades.includes('resonanceMining')?'voidite':'cryonite';
  const threats=createWorld(c).enemies.filter(e=>e.hp>0);
  const pocket=(r:(typeof known)[number])=>Math.hypot(r.x-u.outpost.x,r.y-u.outpost.y)+
   (threats.some(e=>Math.hypot(e.x-r.x,e.y-r.y)<240)?650:0);
  const mineral=known.filter(r=>r.mineral===desired).sort((a,b)=>pocket(a)-pocket(b)||a.id-b.id)[0];
  const aurite=known.filter(r=>r.mineral==='aurite').sort((a,b)=>Math.hypot(a.x-u.outpost.x,a.y-u.outpost.y)-Math.hypot(b.x-u.outpost.x,b.y-u.outpost.y))[0];
  const hasHauler=c.unlockedTypes.includes('hauler')&&c.fleetCapacity>=5;
  const fleet={impactMiner:2,laserMiner:0,escort:1,scout:1,hauler:hasHauler?1:0,miningRig:0};
  if(fleetError({...c,fleetComposition:fleet}))throw Error('Policy cannot assign fleet');
  c={...c,launchSite:'far',fleetComposition:fleet,focuses:{scout:{x:scout.x,y:scout.y},mining:mineral?{x:mineral.x,y:mineral.y}:aurite?{x:aurite.x,y:aurite.y}:null}};
  const objective=currentObjective(c).id,w=createWorld(c);let steps=0;
  while(w.phase!=='done'&&steps++<16200)step(w,STEP);
  if(w.phase!=='done')throw Error(`Unbounded shift ${c.rounds+1}`);
  c=settle(c,w);
  records.push({shift:c.rounds,objective,purchase,credits:c.credits,delivered:w.delivered,cryonite:w.deliveredByMineral.cryonite,voidite:w.deliveredByMineral.voidite,
   extractedVoidite:w.extractedByMineral.voidite,losses:w.drones.filter(d=>d.state==='dead').length+w.haulers.filter(h=>h.state==='dead').length+w.scouts.filter(s=>s.state==='dead').length+w.guards.filter(g=>g.hp<=0).length,
   focus:mineral?desired:aurite?'aurite':'none',slots:c.fleetCapacity,gear:[...c.environmentUpgrades,...c.extractionUpgrades]});
  if(import.meta.url===`file://${process.argv[1]}`){
   mkdirSync('balance-results',{recursive:true});writeFileSync(checkpointPath,JSON.stringify({seed,startingShifts:prior.startingShifts,auriteShift,company:c,records}));
   if((i+1)%5===0)console.error(`Outer campaign: ${i+1}/${limit} later shifts, ${c.credits} Credits, ${currentObjective(c).id}`);
  }
 }
 return {seed,startingShifts:prior.startingShifts,auriteShift,endingShifts:c.rounds,credits:c.credits,objective:currentObjective(c).id,progress:c.progress,discoveries:c.uniqueTechDiscoveries,records};
}
type RecordEntry={shift:number;objective:string;purchase?:string;credits:number;delivered:number;cryonite:number;voidite:number;extractedVoidite:number;losses:number;focus:string;slots:number;gear:string[]};
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(outerFrontierCampaign(Number(process.argv[2]??7),Number(process.argv[3]??85),process.argv.includes('--resume')),null,2));
