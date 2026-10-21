import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import type {Company,World} from '../../src/sim.ts';
import type {Job} from './types.ts';
export async function loadEngine(root:string){
 const get=(path:string)=>import(pathToFileURL(resolve(root,'src',path+'.ts')).href);
 return {sim:await get('sim') as typeof import('../../src/sim.ts'),research:await get('research') as typeof import('../../src/research.ts'),fleet:await get('fleet') as typeof import('../../src/fleet.ts'),universe:await get('universe') as typeof import('../../src/universe.ts')};
}
export type Engine=Awaited<ReturnType<typeof loadEngine>>;
export function fixture(engine:Engine,job:Job):Company{
 const s=engine.sim;
 let c=engine.research.awardTech({...s.freshCompany(job.seed),rounds:3+job.phase,total:0,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],fleetCapacity:engine.fleet.usedSlots(job.fleet),fleetComposition:{...job.fleet},progress:{...s.freshProgress(),rivalSeen:true,outpostSurveyed:true,protectedAuriteDelivery:true}},engine.research.discoveryIds);
 c.enduranceLevel=([30,45,60,90] as number[]).indexOf(job.duration);
 if(c.enduranceLevel<0)throw Error('Unsupported fixed-step shift duration');
 c.deflectorShields=['aurite','storm','void'].includes(job.terrain);
 c.extractionUpgrades=job.terrain==='void'?['highPowerOptics','resonanceMining']:['aurite','storm'].includes(job.terrain)?['highPowerOptics']:[];
 c.environmentUpgrades=job.terrain==='void'?['navigationStabilizers','radiationShielding']:job.terrain==='storm'?['navigationStabilizers']:[];
 c.outpost=['aurite','storm','void'].includes(job.terrain);c.launchSite=c.outpost?'far':'home';
 for(const id of job.build.talents){const next=engine.research.research(c,id);if(!next)throw Error('Illegal fixture research: '+id);c=next;}
 const w=s.createWorld(c);w.explored.fill(255);
 const mineral=job.terrain==='nickel'?'nickel':job.terrain==='aurite'?'aurite':job.terrain==='storm'?'cryonite':job.terrain==='void'?'voidite':'ferrite';
 const candidates=w.rocks.filter(r=>r.mineral===mineral&&r.hp>0&&(mineral!=='ferrite'||engine.universe.regionAt(job.seed,r.x,r.y)==='home_belt'));
 const density=(r:World['rocks'][number])=>w.rocks.filter(p=>p.hp>0&&Math.hypot(r.x-p.x,r.y-p.y)<180).length;
 const score=(r:World['rocks'][number])=>Math.hypot(r.x-w.base.x,r.y-w.base.y)*.02+(job.terrain==='home_sparse'?density(r): -density(r));
 candidates.sort((a,b)=>score(a)-score(b)||a.id-b.id);
 if(!candidates.length)throw Error('No target mineral for '+job.terrain);
 c.focuses={mining:{x:candidates[0].x,y:candidates[0].y},scout:null};
 c.explored=Array.from(w.explored,b=>b.toString(16).padStart(2,'0')).join('');c.identifiedRocks=w.rocks.map(r=>r.id);
 return c;
}
export function prepareCampaign(engine:Engine,c:Company,job:Job){
 const purchases:{item:string;cost:number}[]=[];
 const desired=!c.basicUpgrades.includes('cargoAwareness')?'cargoAwareness':!c.basicUpgrades.includes('navigationAssist')?'navigationAssist':!c.basicUpgrades.includes('workPlanner')?'workPlanner':c.fleetCapacity===1?'fleetSlot':c.enduranceLevel===0?'endurance':c.fleetCapacity===2?'fleetSlot':c.fleetCapacity===3&&c.uniqueTechDiscoveries.includes('first_nickel_delivery')?'fleetSlot':c.enduranceLevel===1&&c.uniqueTechDiscoveries.includes('first_nickel_delivery')?'endurance':null;
 if(desired){const next=engine.sim.buy(c,desired);if(next){purchases.push({item:desired,cost:c.credits-next.credits});c=next;}}
 const path=job.policy==='laser'?['laserCutter','longRangeOptics']:job.policy==='bulk-cart'?['ramSplitter','bulkCarrier','geminiCart']:job.policy==='express-jump'?['ramSplitter','expressDelivery','precisionJump']:job.policy==='rig'?['ramSplitter','wideAreaDrilling','loadingGantry']:['ramSplitter','rapidRecovery'];
 for(const id of path){if(c.talents.includes(id as never))continue;const next=engine.research.research(c,id as Parameters<Engine['research']['research']>[1]);if(next)c=next;}
 const needsContact=!c.progress.rivalSeen,needsPlatform=job.policy==='rig'&&!c.unlockedTypes.includes('miningRig');
 let f={...engine.fleet.freshComposition()};
 if(c.fleetCapacity>=2){if(needsContact||needsPlatform||!c.unlockedTypes.includes('hauler'))f.scout=1;else if(c.unlockedTypes.includes('escort'))f.escort=1;}
 if(c.fleetCapacity>=3){if(c.progress.rivalSeen)f.escort=1;if(!f.scout&&c.unlockedTypes.includes('hauler')&&['rig','bulk-cart','express-jump'].includes(job.policy??''))f.hauler=1;else if(!f.scout)f.impactMiner++;}
 if(c.fleetCapacity>=4&&c.unlockedTypes.includes('hauler')&&['rig','bulk-cart','express-jump'].includes(job.policy??'')){
  f.scout=0;f.escort=c.progress.rivalSeen?1:0;f.hauler=1;
  if(job.policy==='rig'&&c.unlockedTypes.includes('miningRig'))f.miningRig=1;
 }
 while(engine.fleet.usedSlots(f)<c.fleetCapacity)f.impactMiner++;
 if(engine.fleet.fleetError({...c,fleetComposition:f}))throw Error('Campaign policy attempted invalid fleet');
 c={...c,fleetComposition:f};
 const known=engine.sim.createWorld(c).rocks.filter(r=>c.identifiedRocks.includes(r.id)&&r.hp>0&&r.mineral==='nickel');
 known.sort((a,b)=>Math.hypot(a.x-800,a.y-3420)-Math.hypot(b.x-800,b.y-3420));
 // An initial exploration direction is policy input, not knowledge of hidden sites.
 const site=engine.universe.generateUniverse(c.worldSeed).pois.find(p=>p.id===(needsPlatform?'derelict_excavation_platform':'abandoned_cargo_relay')&&c.discoveredPois.includes(p.id));
 c.focuses={mining:c.fleetCapacity>=3&&known[0]?{x:known[0].x,y:known[0].y}:null,scout:site?{x:site.x,y:site.y}:{x:800,y:3420}};
 return {company:c,purchases};
}
