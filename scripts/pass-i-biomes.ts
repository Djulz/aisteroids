import {biomeAt,BIOMES,ENVIRONMENT_UPGRADES,type BiomeId} from '../src/biomes.ts';
import {buy,buyEnvironment,cost,createWorld,freshCompany,focusSurvey,lockTarget,settle,step,STEP,type World,type Company} from '../src/sim.ts';
import {COLS,CELLS,CELL,hasCell,mapCount} from '../src/knowledge.ts';
import {changeFleet} from '../src/fleet.ts';
import {research} from '../src/research.ts';

function coverage(w:World){const result=Object.fromEntries(Object.keys(BIOMES).map(id=>[id,0])) as Record<BiomeId,number>;
 for(let i=0;i<CELLS;i++){const x=(i%COLS+.5)*CELL,y=(Math.floor(i/COLS)+.5)*CELL;if(hasCell(w.explored,x,y))result[biomeAt(x,y)]++;}return result;
}
function run(w:World,focus=false){if(focus)focusSurvey(w,{x:305,y:550});
 let ionTicks=0,deadTicks=0;for(let i=0;i<18000&&w.phase!=='done';i++){
  for(const s of w.scouts){if(s.state==='dead'||s.state==='docked')continue;const biome=biomeAt(s.x,s.y);if(biome==='ion_storm')ionTicks++;if(biome==='dead_zone')deadTicks++;}
  step(w,STEP);
 }
 if(w.phase!=='done')throw Error('Unbounded shift');
 return {delivered:w.delivered,charted:mapCount(w.explored),byBiome:coverage(w),scouts:w.scouts.map(s=>({state:s.state,hp:+s.hp.toFixed(2)})),ionSeconds:+(ionTicks*STEP).toFixed(1),deadSeconds:+(deadTicks*STEP).toFixed(1),rivalShots:w.attacks,escortIntercepts:w.intercepts,recallFailures:w.recallFailures,completion:+w.time.toFixed(1)};
}
const base=freshCompany(),scouting={...base,fleetCapacity:2,fleetComposition:{...base.fleetComposition,scout:1}};
const fresh=run(createWorld(base)),scout30=run(createWorld(scouting));
const long={...scouting,enduranceLevel:3},automatic=run(createWorld(long)),focused=run(createWorld(long),true);
const remote={...long,outpost:true,launchSite:'far' as const};const remoteRun=run(createWorld(remote));
function exposure(shielded:boolean){
 const c={...scouting,environmentUpgrades:shielded?['radiationShielding' as const]:[]},w=createWorld(c),s=w.scouts[0];
 s.x=2440;s.y=1950;s.targetX=s.x;s.targetY=s.y;s.targetUntil=Infinity;w.missionDuration=25;
 let seconds=0;for(let i=0;i<20/STEP;i++){if(biomeAt(s.x,s.y)==='dead_zone'&&s.state!=='dead')seconds+=STEP;step(w,STEP);}
 return {hp:+s.hp.toFixed(2),state:s.state,secondsInDeadZone:+seconds.toFixed(2)};
}
let company:Company=freshCompany(),relayInvestigation=0,sensorsPurchased=0;
for(let round=1;round<=75&&!sensorsPurchased;round++){
 const w=createWorld(company),site=ENVIRONMENT_UPGRADES.advancedSensors.site;
 for(let i=0;i<18000&&w.phase!=='done';i++){
  step(w,STEP);
  if(w.discoveredPois.has(site)&&w.guards.some(g=>g.hp>0)&&!company.uniqueTechDiscoveries.includes(site)&&!w.pendingTech.some(e=>e.id===site)&&!w.activeTarget)lockTarget(w,site);
 }
 if(w.phase!=='done')throw Error('Unbounded campaign');
 company=settle(company,w);
 if(!relayInvestigation&&company.uniqueTechDiscoveries.includes(site))relayInvestigation=round;
 company=research(company,'escortProgram')??company;
 if(company.fleetCapacity<2&&company.credits>=cost(company,'fleetSlot')){company=changeFleet(buy(company,'fleetSlot')!,'impactMiner',1)!;}
 if(company.fleetCapacity<3&&company.credits>=cost(company,'fleetSlot')){company=changeFleet(buy(company,'fleetSlot')!,'scout',1)!;}
 if(company.fleetCapacity<4&&company.unlockedTypes.includes('escort')&&company.credits>=cost(company,'fleetSlot')){company=changeFleet(buy(company,'fleetSlot')!,'escort',1)!;}
 if(company.enduranceLevel<2&&company.credits>=cost(company,'endurance'))company=buy(company,'endurance')!;
 const purchased=buyEnvironment(company,'advancedSensors');if(purchased){company=purchased;sensorsPurchased=round;}
}
console.log(JSON.stringify({note:'Remote Outpost and initial Dead Zone Scout placement are controlled fixtures; the sensor campaign pays for fleet, Endurance and upgrade with actual earned Minerals.',fresh,scout30,automatic,focused,remote:remoteRun,radiation:{unshielded:exposure(false),shielded:exposure(true)},campaign:{relayInvestigation,sensorsPurchased,rounds:company.rounds,credits:company.credits,techEarned:company.techPointsEarned,installed:company.environmentUpgrades}},null,2));
