import {buy,cost,createWorld,freshCompany,lockTarget,settle,step,STEP,ROUND_TIME,type Company,type World} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';
import {mapCount,POIS} from '../src/knowledge.ts';
import {research} from '../src/research.ts';
const seeds=[1,3,7];
function run(w:World){for(let i=0;i<9000&&w.phase!=='done';i++)step(w,STEP);if(w.phase!=='done')throw Error('Unbounded recall');return w;}
const avg=(xs:number[])=>+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1);
function matched(seed:number,scout:boolean){const base=freshCompany();const c:Company={...base,worldSeed:seed,fleetCapacity:2,fleetComposition:{...base.fleetComposition,impactMiner:scout?1:2,scout:scout?1:0}};
 const w=run(createWorld(c,seed));return {delivered:w.delivered,cells:mapCount(w.explored),signals:w.discoveredPois.size,returnTime:+w.time.toFixed(1),scouts:w.scouts.map(s=>s.state)};}
const matchedResults=seeds.map(seed=>({seed,twoMiners:matched(seed,false),minerScout:matched(seed,true)}));
const mean={twoMiners:{delivered:avg(matchedResults.map(r=>r.twoMiners.delivered)),cells:avg(matchedResults.map(r=>r.twoMiners.cells)),signals:avg(matchedResults.map(r=>r.twoMiners.signals))},minerScout:{delivered:avg(matchedResults.map(r=>r.minerScout.delivered)),cells:avg(matchedResults.map(r=>r.minerScout.cells)),signals:avg(matchedResults.map(r=>r.minerScout.signals))}};
let company=freshCompany(),slot2Round=0,farRound=0,richRound=0,rivalRound=0,outpostRound=0;
for(let i=1;i<=35;i++){const w=run(createWorld(company,company.worldSeed));company=settle(company,w);
 if(!slot2Round&&company.credits>=28)slot2Round=i;
 if(!farRound&&company.progress.farSurveyed)farRound=i;
 if(!richRound&&company.progress.richSampled)richRound=i;
 if(!rivalRound&&company.progress.rivalSeen)rivalRound=i;
 if(!outpostRound&&company.progress.outpostSurveyed)outpostRound=i;
}
let scoutCompany=freshCompany(),scoutOutpostRound=0;
for(let i=1;i<=12;i++){const w=run(createWorld(scoutCompany,scoutCompany.worldSeed));scoutCompany=settle(scoutCompany,w);
 if(i===3){scoutCompany=buy(scoutCompany,'fleetSlot')!;scoutCompany=changeFleet(scoutCompany,'scout',1)!;}
 if(!scoutOutpostRound&&scoutCompany.progress.outpostSurveyed)scoutOutpostRound=i;
}
const base=freshCompany(),escortCompany:Company={...base,enduranceLevel:3,fleetCapacity:3,fleetComposition:{...base.fleetComposition,scout:1,escort:1},unlockedTypes:['impactMiner','scout','escort'],progress:{...base.progress,rivalSeen:true}};
const investigation=createWorld(escortCompany),site=POIS[0];
// Repeatable local detection fixture; the campaign benchmark covers travel from HQ.
investigation.scouts[0].x=site.x-120;investigation.scouts[0].y=site.y;
investigation.guards[0].x=site.x-100;investigation.guards[0].y=site.y;
let detection=-1,locked=-1,completed=-1;
for(let i=0;i<escortCompany.enduranceLevel*1800+1500&&investigation.phase!=='done';i++){
 step(investigation);if(detection<0&&investigation.discoveredPois.has(site.id)){detection=investigation.time;const result=lockTarget(investigation,site.id);if(!result.ok)throw Error(result.reason);locked=investigation.time;}
 if(completed<0&&investigation.pendingTech.some(e=>e.id===site.id))completed=investigation.time;
}
let mixed=freshCompany(),mixedMilestone=0,mixedOutput:unknown=null;
for(let i=1;i<=65;i++){
 const w=run(createWorld(mixed,mixed.worldSeed));mixed=settle(mixed,w);
 for(const id of ['haulerOperation','escortProgram'] as const){const next=research(mixed,id);if(next)mixed=next;}
 if(mixed.fleetCapacity<4&&(mixed.fleetCapacity===1||mixed.fleetCapacity===2&&mixed.unlockedTypes.includes('escort')||mixed.fleetCapacity===3&&mixed.unlockedTypes.includes('hauler'))&&mixed.credits>=cost(mixed,'fleetSlot')){
  mixed=buy(mixed,'fleetSlot')!;
  const role=mixed.fleetCapacity===2?'scout':mixed.fleetCapacity===3?'escort':'hauler';
  mixed=changeFleet(mixed,role,1)??mixed;
 }
 if(mixed.fleetComposition.scout&&mixed.fleetComposition.escort&&mixed.fleetComposition.hauler){mixedMilestone=i;const final=run(createWorld(mixed,mixed.worldSeed));mixedOutput={delivered:final.delivered,signals:final.discoveredPois.size,cells:mapCount(final.explored),scouts:final.scouts.map(s=>s.state),researched:mixed.unlockedTechnologies};break;}
}
console.log(JSON.stringify({seeds,matchedResults,mean,minerOnly:{slot2Round,farRound,richRound,rivalRound,outpostRound,after35:company.credits},minerScout:{outpostRound:scoutOutpostRound,after12:scoutCompany.credits},mixedFleet:{assembledRound:mixedMilestone,mission:mixedOutput},investigation:{detected:+detection.toFixed(2),locked:+locked.toFixed(2),completed:+completed.toFixed(2),secondsAfterLock:locked<0||completed<0?null:+(completed-locked).toFixed(2),pendingBeforeSettle:investigation.pendingTech.some(e=>e.id===site.id)},constants:{workShift:ROUND_TIME,scoutSensor:165,scoutSpeed:85}},null,2));
