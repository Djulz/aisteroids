import {createWorld,freshCompany,settle,step,STEP,buy,cost,ROUND_TIME,FLEET_SLOT_PRICES,type Company,type World} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';
import {awardTech,research,researched,type DiscoveryId} from '../src/research.ts';

const seeds=[1,2,3,4,5,6,7,8,9,10];
type Result={delivered:number;extracted:number;impacts:number;shots:number;collected:number;attacks:number;hp:number;cooldownTime:number;idle:number;haulerStalled:number;minerReturn:number;recall:number;end:number;lost:number;floating:number;claims:number;releases:number;handoffs:number;deaths:number;haulerDeliveries:number;tech:number};
function mission(c:Company,seed=c.worldSeed){
 const w=createWorld(c,seed),ramTimes:number[]=[],shotTimes:number[]=[];let cooldownTime=0;
 for(let i=0;i<15000&&w.phase!=='done';i++){
  const oldRam=w.collisions,oldShots=w.shots;
  if(w.drones[0].cooldown>0&&w.drones[0].state==='mine')cooldownTime+=STEP;
  step(w,STEP);
  if(w.collisions>oldRam)ramTimes.push(w.time);
  if(w.shots>oldShots)shotTimes.push(w.time);
 }
 if(w.phase!=='done')throw Error(`Mission stalled: seed ${seed}, round ${c.rounds}, phase ${w.phase}, time ${w.time}`);
 if(w.oreClaims.size)throw Error(`Ghost claims: seed ${seed}, round ${c.rounds}: ${w.oreClaims.size}`);
 const mass=c.ores.length+w.extracted, accounted=w.deliveredFragments+w.ores.length+w.drones.reduce((n,d)=>n+d.cargo,0)+w.haulers.reduce((n,h)=>n+h.cargo,0);
 if(mass!==accounted)throw Error(`Mass imbalance: seed ${seed}, round ${c.rounds}: ${mass} != ${accounted}`);
 const result:Result={delivered:w.delivered,extracted:w.extracted,impacts:w.collisions,shots:w.shots,collected:w.minerPickups+w.haulerPickups,attacks:w.attacks,hp:w.drones[0].hp,cooldownTime,idle:w.idleTime,haulerStalled:w.haulerStalledTime,minerReturn:w.minerReturnTime,recall:w.time-ROUND_TIME,end:w.time,lost:w.lost,floating:w.ores.length,claims:w.claimsAssigned,releases:w.claimsReleased,handoffs:w.transferred,deaths:[...w.drones,...w.haulers].filter(d=>d.state==='dead').length,haulerDeliveries:w.haulerDelivered,tech:w.pendingTech.length};
 return {w,result,ramTimes,shotTimes};
}
const average=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
const stats=(xs:number[])=>({mean:+average(xs).toFixed(2),median:xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)],min:Math.min(...xs),max:Math.max(...xs)});
const sum=(xs:Result[],key:keyof Result)=>+xs.reduce((n,x)=>n+x[key],0).toFixed(2);
function fixture(seed:number,composition:{impactMiner:number;laserMiner:number;hauler:number;escort:number},options:{far?:boolean;hostile?:boolean;salvage?:boolean;recovery?:boolean;cooling?:boolean}={}):Company{
 let c={...freshCompany(),worldSeed:seed,fleetCapacity:6};
 const discoveries:DiscoveryId[]=['abandoned_research_station','experimental_probe_salvaged','abandoned_cargo_relay','first_rival_contact','far_belt_charted','first_rich_sample','outpost_site_surveyed','derelict_freight_shuttle','automated_sorting_archive'];
 c=awardTech(c,discoveries);c={...c,progress:{...c.progress,rivalSeen:true}};
 for(const id of ['laserMining',...(options.recovery?['impactRecovery']:[]),...(options.cooling?['rapidCooling']:[]),'haulerOperation','escortProgram'] as const){const next=research(c,id);if(!next)throw Error(`Fixture research ${id}`);c=next;}
 c={...c,fleetComposition:{impactMiner:composition.impactMiner,laserMiner:composition.laserMiner,hauler:composition.hauler,escort:composition.escort,scout:0,miningRig:0},progress:{...c.progress,richSampled:!!options.hostile,rivalSeen:!!options.hostile},outpost:!!options.far,launchSite:options.far?'far':'home',ores:options.salvage?Array.from({length:32},(_,i)=>({x:460+i%8*15,y:620+Math.floor(i/8)*15,value:1 as const,rich:false})):[]};
 return c;
}
// Entitlements in fleet comparisons are controlled fixtures. Only progression
// below earns discoveries and spends Tech Points through actual settlement.
function progression(seed:number,strategy:'impact'|'mixed'|'logistics'){
 let c={...freshCompany(),worldSeed:seed},milestones:number[]=[],incomes:number[]=[],spentTech=0,peakOre=0;
 for(let round=1;round<=85&&c.fleetCapacity<6;round++){
  if(strategy!=='impact'){
   if(!researched(c,'laserMining')&&c.techPointsAvailable>=1){const r=research(c,'laserMining');if(r){c=r;spentTech++;}}
   if(strategy==='logistics'&&researched(c,'laserMining')&&!researched(c,'haulerOperation')&&c.techPointsAvailable>=1){const r=research(c,'haulerOperation');if(r){c=r;spentTech++;}}
  }
  const {w}=mission(c,seed);incomes.push(w.delivered);c=settle(c,w);peakOre=Math.max(peakOre,c.ores.length);
  if(c.fleetCapacity<6&&c.credits>=cost(c,'fleetSlot')){
   c=buy(c,'fleetSlot')!;milestones.push(round);
   const type=strategy==='mixed'&&researched(c,'laserMining')&&c.fleetComposition.laserMiner<Math.ceil(c.fleetCapacity/2)?'laserMiner':strategy==='logistics'&&researched(c,'haulerOperation')&&c.fleetComposition.hauler<Math.max(1,Math.floor(c.fleetCapacity/3))?'hauler':'impactMiner';
   c=changeFleet(c,type,1)??changeFleet(c,'impactMiner',1)!;
  }
 }
 return {seed,strategy,milestones,deltas:milestones.map((n,i)=>n-(milestones[i-1]??0)),rounds:c.rounds,credits:c.credits,total:c.total,techEarned:c.techPointsEarned,spentTech,ore:c.ores.length,peakOre,remainingRock:Math.round(createWorld(c,seed).rocks.reduce((n,r)=>n+r.hp,0)),incomes};
}
function main(){
 const singles=seeds.map(seed=>mission({...freshCompany(),worldSeed:seed},seed));
 const recovery=seeds.map(seed=>mission(fixture(seed,{impactMiner:1,laserMiner:0,hauler:0,escort:0},{recovery:true}),seed));
 const lasers=seeds.map(seed=>mission(fixture(seed,{impactMiner:0,laserMiner:1,hauler:0,escort:0}),seed));
 const cooling=seeds.map(seed=>mission(fixture(seed,{impactMiner:0,laserMiner:1,hauler:0,escort:0},{cooling:true}),seed));
 const summaries=Object.fromEntries([['impact',singles],['impactRecovery',recovery],['laser',lasers],['rapidCooling',cooling]].map(([name,runs])=>{
  const rs=runs as typeof singles,all=rs.flatMap(m=>name.toString().startsWith('impact')?m.ramTimes:m.shotTimes);
  const intervals=rs.flatMap(m=>{const t=name.toString().startsWith('impact')?m.ramTimes:m.shotTimes;return t.slice(1).map((n,i)=>n-t[i]);});
  return [name,{delivered:stats(rs.map(m=>m.result.delivered)),impacts:stats(rs.map(m=>m.result.impacts)),collected:stats(rs.map(m=>m.result.collected)),shots:stats(rs.map(m=>m.result.shots)),hp:stats(rs.map(m=>m.result.hp)),cooldownTime:stats(rs.map(m=>m.result.cooldownTime)),idle:stats(rs.map(m=>m.result.idle)),minerReturn:stats(rs.map(m=>m.result.minerReturn)),recall:stats(rs.map(m=>m.result.recall)),end:stats(rs.map(m=>m.result.end)),events:all.length,cycle:stats(intervals)}];
 }));
 const fleets=[];
 for(const slots of [2,3,4,5,6])for(const [kind,build,options] of [
  ['impact',{impactMiner:slots,laserMiner:0,hauler:0,escort:0},{}],
  ['laser',{impactMiner:0,laserMiner:slots,hauler:0,escort:0},{}],
  ['mixed',{impactMiner:Math.ceil(slots/2),laserMiner:Math.floor(slots/2),hauler:0,escort:0},{}],
  ['farImpact',{impactMiner:slots,laserMiner:0,hauler:0,escort:0},{far:true,salvage:true}],
  ['hauler',{impactMiner:slots-1,laserMiner:0,hauler:1,escort:0},{far:true,salvage:true}],
  ['hostileImpact',{impactMiner:slots,laserMiner:0,hauler:0,escort:0},{hostile:true}],
  ['escort',{impactMiner:slots-1,laserMiner:0,hauler:0,escort:1},{hostile:true}],
 ] as const){
  const runs=[1,3,7].map(seed=>mission(fixture(seed,build,options),seed).result);
  fleets.push({slots,kind,delivered:+average(runs.map(r=>r.delivered)).toFixed(1),safe:sum(runs,'deaths')===0,lost:sum(runs,'lost'),attacks:sum(runs,'attacks'),floating:+average(runs.map(r=>r.floating)).toFixed(1),claims:sum(runs,'claims'),releases:sum(runs,'releases'),handoffs:sum(runs,'handoffs'),haulerStalled:sum(runs,'haulerStalled'),idle:sum(runs,'idle'),end:+average(runs.map(r=>r.end)).toFixed(1)});
 }
 const progress=['impact','mixed','logistics'].flatMap(strategy=>[1,7,10].map(seed=>progression(seed,strategy as 'impact'|'mixed'|'logistics')));
 console.log(JSON.stringify({seeds,shift:ROUND_TIME,prices:FLEET_SLOT_PRICES,summaries,fleets,progress},null,2));
}
main();
