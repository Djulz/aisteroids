import {buy,cost,createWorld,freshCompany,lockTarget,settle,step,STEP,ENDURANCE_DURATIONS,type Company,type World} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';
import {mapCount,POIS} from '../src/knowledge.ts';
import {research} from '../src/research.ts';

function finish(w:World){for(let i=0;i<18000&&w.phase!=='done';i++)step(w,STEP);if(w.phase!=='done')throw Error('Unbounded shift');return w;}
const scoutFleet=()=>{const c=freshCompany();return {...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,scout:1}};};
const tiers=ENDURANCE_DURATIONS.map((duration,level)=>{
 const c={...scoutFleet(),enduranceLevel:level},w=createWorld(c);w.drones[0].hp=1000;finish(w);
 return {duration,explored:mapCount(w.explored),delivered:w.delivered,returnTime:+w.time.toFixed(1),scout:w.scouts[0].state,recallFailures:w.recallFailures};
});

let c:Company=freshCompany();const purchases:{round:number;item:string}[]=[];
let firstOutpostSurvey=0,firstFarSignal=0,investigated=0,farLaunch:unknown=null;
for(let round=1;round<=100;round++){
 const w=createWorld(c);const target=POIS[0];
 for(let i=0;i<18000&&w.phase!=='done';i++){
  step(w,STEP);
  if(w.discoveredPois.has(target.id)&&w.guards.some(g=>g.hp>0)&&!c.uniqueTechDiscoveries.includes(target.id)&&!w.pendingTech.some(e=>e.id===target.id)&&!w.activeTarget)lockTarget(w,target.id);
 }
 if(w.phase!=='done')throw Error('Unbounded campaign shift');
 if(!firstFarSignal&&w.discoveredPois.size)firstFarSignal=round;
 c=settle(c,w);
 if(!firstOutpostSurvey&&c.progress.outpostSurveyed)firstOutpostSurvey=round;
 if(!investigated&&c.uniqueTechDiscoveries.includes(target.id))investigated=round;
 for(const id of ['escortProgram','haulerOperation'] as const)c=research(c,id)??c;
 if(c.fleetCapacity<2&&c.credits>=cost(c,'fleetSlot')){c=buy(c,'fleetSlot')!;c=changeFleet(c,'impactMiner',1)!;purchases.push({round,item:'second Miner'});}
 if(c.fleetCapacity<3&&c.credits>=cost(c,'fleetSlot')){c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',1)!;purchases.push({round,item:'Scout slot'});}
 if(c.fleetCapacity<4&&c.unlockedTypes.includes('escort')&&c.credits>=cost(c,'fleetSlot')){c=buy(c,'fleetSlot')!;c=changeFleet(c,'escort',1)!;purchases.push({round,item:'Escort slot'});}
 if(c.enduranceLevel<3&&c.credits>=cost(c,'endurance')){c=buy(c,'endurance')!;purchases.push({round,item:`${ENDURANCE_DURATIONS[c.enduranceLevel]} second shift`});}
 if(c.progress.outpostSurveyed&&!c.outpost&&c.credits>=cost(c,'outpost')){c=buy(c,'outpost')!;purchases.push({round,item:'Outer Outpost'});}
 if(c.outpost){const remote={...c,launchSite:'far' as const};const deployed=finish(createWorld(remote));farLaunch={round:round+1,base:deployed.base,delivered:deployed.delivered,recallFailures:deployed.recallFailures,explored:mapCount(deployed.explored)};break;}
}
console.log(JSON.stringify({tiers,purchases,firstFarSignal,firstOutpostSurvey,investigated,final:{rounds:c.rounds,credits:c.credits,explored:mapCount(createWorld(c).explored),outpost:c.outpost,farLaunch}},null,2));
