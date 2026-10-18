import { route, clearSegment, type Point } from './navigation.ts';
import {DOCTRINE_AI,validDoctrine,type DoctrineId} from './doctrines.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY,type FleetComposition,type FleetType} from './fleet.ts';
import {awardTech,TECH_DISCOVERIES,researched,type DiscoveryId} from './research.ts';
import {blankMap,decodeMap,encodeMap,hasCell,mapCount,mergeMap,reveal,type PoiId,type Sensor,CELL,COLS,ROWS,MAP_W,MAP_H} from './knowledge.ts';
import {W,H,HOME,FAR} from './geometry.ts';
import {biomeAt,environmentAt,sensorFactor,movementFactor,radiationRate,scoutScanRadius,ENVIRONMENT_UPGRADES,environmentIds,inWorld,type BiomeId,type EnvironmentUpgrade} from './biomes.ts';
import {MINERALS,mineralForRock,depositReserve,canExtract,cargoValue,type MineralId,type CargoItem} from './minerals.ts';
import {emptyFocuses,withFocus,validFocusPoint,type Focuses,type FocusRole} from './focus.ts';
import {workRate} from './work.ts';
import {generateUniverse,type Universe} from './universe.ts';
// Fixed-step seeded simulation: independent of browser and rendering.
export {W,H,HOME,FAR};
export const ROUND_TIME=30,STEP=1/60,CAPACITY=3,OUTPOST_COST=450;
export const ENDURANCE_DURATIONS=[30,45,60,90] as const,ENDURANCE_PRICES=[75,180,400] as const;
export type LaunchSite='home'|'far';
export type Progress={farSurveyed:boolean;richSampled:boolean;rivalSeen:boolean;outpostSurveyed:boolean};
export const freshProgress=():Progress=>({farSurveyed:false,richSampled:false,rivalSeen:false,outpostSurveyed:false});
export type StoredOre={x:number;y:number;value:1;rich:boolean;mineral:MineralId};
export type Company={version:15;focuses:Focuses;environmentUpgrades:EnvironmentUpgrade[];extractionUpgrades:('highPowerOptics'|'resonanceMining')[];enduranceLevel:number;credits:number;fleetCapacity:number;capacityReminder:number;fleetComposition:FleetComposition;unlockedTypes:FleetType[];techPointsAvailable:number;techPointsEarned:number;uniqueTechDiscoveries:DiscoveryId[];unlockedTechnologies:string[];grandfatheredEscort:boolean;turret:boolean;rounds:number;total:number;outpost:boolean;launchSite:LaunchSite;worldSeed:number;rockHp:Record<string,number>;ores:StoredOre[];progress:Progress;poiProgress:Partial<Record<PoiId,number>>;identifiedRocks:number[];explored:string;discoveredPois:PoiId[];doctrine:DoctrineId};
export const freshCompany=(worldSeed=7):Company=>({version:15,focuses:emptyFocuses(),environmentUpgrades:[],extractionUpgrades:[],enduranceLevel:0,credits:0,fleetCapacity:1,capacityReminder:1,fleetComposition:freshComposition(),unlockedTypes:['impactMiner','scout'],techPointsAvailable:0,techPointsEarned:0,uniqueTechDiscoveries:[],unlockedTechnologies:[],grandfatheredEscort:false,turret:false,rounds:0,total:0,outpost:false,launchSite:'home',worldSeed,rockHp:{},ores:[],progress:freshProgress(),poiProgress:{},identifiedRocks:[],explored:encodeMap(blankMap()),discoveredPois:[],doctrine:'standard'});
export const missionDuration=(c:Company)=>ENDURANCE_DURATIONS[c.enduranceLevel]??ROUND_TIME;
export type Purchase='fleetSlot'|'turret'|'outpost'|'endurance'|'highPowerOptics'|'resonanceMining';
export function unlocked(c:Company,item:Purchase){return item==='turret'?c.progress.rivalSeen:item==='outpost'?c.progress.outpostSurveyed:item==='highPowerOptics'?researched(c,'laserMining')&&c.progress.richSampled:item==='resonanceMining'?c.extractionUpgrades.includes('highPowerOptics')&&c.uniqueTechDiscoveries.includes('experimental_probe_salvaged'):true;}
export const FLEET_SLOT_PRICES=[0,28,58,155,340,480] as const;
export function cost(c:Company,item:Purchase){return item==='fleetSlot'?FLEET_SLOT_PRICES[c.fleetCapacity]??Infinity:item==='turret'?18:item==='outpost'?OUTPOST_COST:item==='highPowerOptics'?250:item==='resonanceMining'?2500:ENDURANCE_PRICES[c.enduranceLevel]??Infinity;}
export function buy(c:Company,item:Purchase):Company|null{
 if(!['fleetSlot','turret','outpost','endurance','highPowerOptics','resonanceMining'].includes(item)||!unlocked(c,item)||c.credits<cost(c,item)||(item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:item==='endurance'?c.enduranceLevel>=3:item==='highPowerOptics'||item==='resonanceMining'?c.extractionUpgrades.includes(item):c[item]))return null;
 return {...c,credits:c.credits-cost(c,item),...(item==='fleetSlot'?{fleetCapacity:c.fleetCapacity+1}:item==='endurance'?{enduranceLevel:c.enduranceLevel+1}:item==='highPowerOptics'||item==='resonanceMining'?{extractionUpgrades:[...c.extractionUpgrades,item]}:{[item]:true})};
}
export function buyEnvironment(c:Company,id:EnvironmentUpgrade):Company|null{
 if(!environmentIds.includes(id)||c.environmentUpgrades.includes(id))return null;
 const upgrade=ENVIRONMENT_UPGRADES[id];
 if(!c.uniqueTechDiscoveries.includes(upgrade.site)||c.credits<upgrade.cost)return null;
 return {...c,credits:c.credits-upgrade.cost,environmentUpgrades:[...c.environmentUpgrades,id]};
}
export const capacity=()=>CAPACITY;
export const baseFor=(c:Company)=>c.outpost&&c.launchSite==='far'?generateUniverse(c.worldSeed).outpost:HOME;
export type Rock={id:number;x:number;y:number;r:number;hp:number;max:number;shape:number[];rich?:boolean;legacyMax?:number;mineral:MineralId};
export type Ore={id:number;x:number;y:number;value:1;rich?:boolean;mineral:MineralId;originX?:number;originY?:number;age?:number};
export type MinerType='impactMiner'|'laserMiner';
export type MinerCapabilities={cargo:3;speed:number;accel:number;turn:number;ramDamage:2;ramRecoil:number;ramCooldown:number;laserRange:number;laserCooldown:number;retreatAccel:number};
export type GuardCapabilities={speed:number;accel:number;guardRange:number;guardCooldown:number;threatTracking:boolean};
const minerCapabilities=(c:Company):MinerCapabilities=>({cargo:3,speed:1,accel:1,turn:1,ramDamage:2,ramRecoil:researched(c,'impactRecovery')?.4:.55,ramCooldown:researched(c,'impactRecovery')?.65:1,laserRange:85,laserCooldown:researched(c,'rapidCooling')?1.6:2,retreatAccel:1});
const guardCapabilities=(c:Company):GuardCapabilities=>({speed:1,accel:1,guardRange:135,guardCooldown:1.05,threatTracking:researched(c,'threatTracking')});
export type CargoHold={cargoItems:CargoItem[];cargo:number;richCargo:number};
export type Drone=CargoHold&{id:number;kind:MinerType;name:string;gear:MinerCapabilities;x:number;y:number;angle:number;hp:number;maxHp:number;oreQueue:number[];cooldown:number;targetX:number;targetY:number;wander:number;vx:number;vy:number;recoil:number;armed:boolean;lastRock:number;targetRock:number;targetHold:number;approachX:number;approachY:number;recoveryX:number;recoveryY:number;ramTarget:boolean;berth:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;meetX:number;meetY:number;handoffUntil:number;haulerId:number;state:'mine'|'handoff'|'unload'|'return'|'docked'|'dead'};
export type Hauler=CargoHold&{id:number;name:string;x:number;y:number;vx:number;vy:number;angle:number;hp:number;maxHp:number;capacity:10|14;berth:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;assignedMiner:number;targetOre:number;blockedOre:number;blockedUntil:number;lastWork:number;state:'work'|'return'|'unload'|'docked'|'dead';task:'Collecting'|'Rendezvous'|'Returning'|'Unloading'|'Assisting'|'Docked'|'Destroyed'};
// The array is authoritative. Numeric accessors preserve the established
// diagnostics/fixture API while never storing a second unsynchronized count.
function hold<T extends {cargoItems:CargoItem[]}>(entity:T):T&CargoHold{
 Object.defineProperties(entity,{
  cargo:{get(){return entity.cargoItems.length;},set(n:number){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid cargo count');entity.cargoItems.splice(n);while(entity.cargoItems.length<n)entity.cargoItems.push({mineral:'ferrite'});},enumerable:false},
  richCargo:{get(){return entity.cargoItems.filter(item=>item.legacyRich).length;},set(n:number){entity.cargoItems.forEach((item,i)=>{item.legacyRich=i<n;});},enumerable:false},
 });return entity as T&CargoHold;
}
export type Enemy={id:number;x:number;y:number;vx:number;vy:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number;home?:Point;raid?:boolean;born?:number};
export type Guard={id:number;name:string;gear:GuardCapabilities;maxHp:number;x:number;y:number;vx:number;vy:number;angle:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number};
export type Scout={id:number;name:string;x:number;y:number;vx:number;vy:number;angle:number;hp:number;maxHp:number;targetX:number;targetY:number;targetUntil:number;path:Point[];pathKey:string;pathAge:number;state:'exploring'|'avoiding'|'return'|'docked'|'dead'};
export type Effect={type:'transfer'|'handoff'|'hit'|'laser'|'ore'|'deposit'|'dead'|'enemyShot'|'guardShot'|'turretShot'|'enemyDead';x:number;y:number;tx?:number;ty?:number;life:number;max:number;amount?:number;richAmount?:number;items?:CargoItem[]};
export type TechEvent={id:DiscoveryId;time:number};
export const RESEARCH_STATION=generateUniverse(7).pois[0], EXPERIMENTAL_PROBE=generateUniverse(7).pois[2];
export type OreClaim={ownerKind:'miner'|'hauler';ownerId:number};
export type World={definition:Universe;focuses:Focuses;time:number;missionDuration:number;recallFailures:number;phase:'mining'|'recall'|'aftermath'|'done';aftermath:number;company:Company;doctrine:DoctrineId;progress:Progress;poiProgress:Partial<Record<PoiId,number>>;identifiedRocks:Set<number>;investigatorClaims:Map<PoiId,number>;activeInvestigations:Set<PoiId>;scoutPriority:PoiId|null;rocks:Rock[];ores:Ore[];oreClaims:Map<number,OreClaim>;claimsAssigned:number;claimsReleased:number;drones:Drone[];haulers:Hauler[];scouts:Scout[];enemies:Enemy[];guards:Guard[];effects:Effect[];pendingTech:TechEvent[];explored:Uint8Array;visible:Uint8Array;mapRevision:number;knownRegions:Set<BiomeId>;newRegions:BiomeId[];discoveredPois:Set<PoiId>;newSignals:PoiId[];activeTarget:PoiId|null;surveyFocus:Point|null;investigationTime:number;investigatorId:number;scanTicks:number;delivered:number;deliveredFragments:number;deliveredByMineral:Record<MineralId,number>;extractedByMineral:Record<MineralId,number>;lostValue:number;transferred:number;haulerPickups:number;minerPickups:number;haulerDelivered:number;minerReturnTime:number;haulerStalledTime:number;extracted:number;richExtracted:number;lost:number;collisions:number;shots:number;mined:number;attacks:number;intercepts:number;disengagements:number;idleTime:number;wave:number;nextRaid:number;base:typeof HOME;rng:()=>number;nextId:number;turretCooldown:number};
export function discover(w:World,id:DiscoveryId){if(!Object.hasOwn(TECH_DISCOVERIES,id)||w.company.uniqueTechDiscoveries.includes(id)||w.pendingTech.some(e=>e.id===id))return;w.pendingTech.push({id,time:w.time});}
export function random(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function createWorld(company:Company,seed=company.worldSeed):World{
 const rng=random(seed^Math.imul(company.rounds,7919)),definition=generateUniverse(seed);
 const base=company.outpost&&company.launchSite==='far'?definition.outpost:definition.hq;
 const doctrine=validDoctrine(company.doctrine);
 if(fleetError(company))throw new Error(fleetError(company));
 const composition={...company.fleetComposition};
 const w:World={definition,focuses:{...company.focuses},time:0,missionDuration:missionDuration(company),recallFailures:0,phase:'mining',aftermath:0,company:{...company,worldSeed:seed,fleetComposition:composition,unlockedTypes:[...company.unlockedTypes],environmentUpgrades:[...company.environmentUpgrades],extractionUpgrades:[...company.extractionUpgrades],doctrine},doctrine,progress:{...company.progress},poiProgress:{...company.poiProgress},identifiedRocks:new Set(company.identifiedRocks),investigatorClaims:new Map(),activeInvestigations:new Set(),scoutPriority:null,rocks:[],ores:company.ores.map((o,i)=>({...o,mineral:o.mineral??'ferrite',id:100+i,age:1})),oreClaims:new Map(),claimsAssigned:0,claimsReleased:0,drones:[],haulers:[],scouts:[],enemies:[],guards:[],effects:[],pendingTech:[],explored:decodeMap(company.explored)??blankMap(),visible:blankMap(),mapRevision:0,knownRegions:new Set(),newRegions:[],discoveredPois:new Set(company.discoveredPois),newSignals:[],activeTarget:null,surveyFocus:company.focuses.scout,investigationTime:0,investigatorId:-1,scanTicks:0,delivered:0,deliveredFragments:0,deliveredByMineral:{ferrite:0,nickel:0,aurite:0,cryonite:0,voidite:0},extractedByMineral:{ferrite:0,nickel:0,aurite:0,cryonite:0,voidite:0},lostValue:0,transferred:0,haulerPickups:0,minerPickups:0,haulerDelivered:0,minerReturnTime:0,haulerStalledTime:0,extracted:0,richExtracted:0,lost:0,collisions:0,shots:0,mined:0,attacks:0,intercepts:0,disengagements:0,idleTime:0,wave:0,nextRaid:company.fleetCapacity>=2?(company.progress.rivalSeen?(company.fleetCapacity>=3?6+rng()*8:9+rng()*11):7+rng()*5):Infinity,base,rng,nextId:100+company.ores.length,turretCooldown:0};
 for(let cell=0;cell<COLS*ROWS;cell++)if(w.explored[cell>>3]&(1<<(cell&7)))w.knownRegions.add(biomeAt((cell%COLS+.5)*CELL,(Math.floor(cell/COLS)+.5)*CELL,seed));
 // The definition owns immutable rock geometry. Only hit points are company state.
 for(const deposit of definition.deposits){
  const mineral=mineralForRock(deposit.id,deposit.x,deposit.y,seed);
  const max=depositReserve(mineral,deposit.r),saved=company.rockHp[deposit.id];
  w.rocks.push({...deposit,mineral,max,hp:saved??max});
 }
 const types:MinerType[]=[...Array.from({length:composition.impactMiner},()=> 'impactMiner' as const),...Array.from({length:composition.laserMiner},()=> 'laserMiner' as const)];
 for(let i=0;i<types.length;i++){
  const kind=types[i],gear=minerCapabilities(company),maxHp=kind==='impactMiner'?15:10;
  w.drones.push(hold({id:i,kind,name:kind==='impactMiner'?`Impact ${i+1}`:`Laser ${i+1}`,gear,x:base.x+(i-(types.length-1)/2)*18,y:base.y-27,angle:-Math.PI/2,hp:maxHp,maxHp,cargoItems:[],oreQueue:[],cooldown:0,targetX:base.x+i*25,targetY:base.y-250,wander:3.5,vx:0,vy:0,recoil:0,armed:true,lastRock:-1,targetRock:-1,targetHold:0,approachX:0,approachY:0,recoveryX:0,recoveryY:0,ramTarget:false,berth:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,meetX:0,meetY:0,handoffUntil:0,haulerId:-1,state:'mine'} as unknown as Drone));
 }
 for(let i=0;i<composition.hauler;i++)w.haulers.push(hold({id:types.length+i,name:`Hauler ${i+1}`,x:base.x+(i-(composition.hauler-1)/2)*17,y:base.y+32,vx:0,vy:0,angle:-Math.PI/2,hp:5,maxHp:5,cargoItems:[],capacity:researched(company,'expandedHauler')?14:10,berth:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,assignedMiner:-1,targetOre:-1,blockedOre:-1,blockedUntil:0,lastWork:0,state:'work',task:'Assisting'} as unknown as Hauler));
 for(let i=0;i<composition.escort;i++){const gear=guardCapabilities(company);w.guards.push({id:i,name:`Fighter ${i+1}`,gear,maxHp:6,x:base.x+(i?24:-24),y:base.y-85,vx:0,vy:0,angle:-Math.PI/2,hp:6,cooldown:0,path:[],pathKey:'',pathAge:0});}
 for(let i=0;i<composition.scout;i++)w.scouts.push({id:1000+i,name:`Scout ${i+1}`,x:base.x+(i?22:-22),y:base.y+55,vx:0,vy:0,angle:-Math.PI/2,hp:6,maxHp:6,targetX:base.x,targetY:base.y,targetUntil:0,path:[],pathKey:'',pathAge:0,state:'exploring'});
 updateKnowledge(w);
 w.newRegions.length=0; // Home is known at launch, not an interrupting alert.
 return w;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const visibleAt=(w:World,p:Point)=>hasCell(w.visible,p.x,p.y);
export const exploredAt=(w:World,p:Point)=>hasCell(w.explored,p.x,p.y);
export const investigated=(w:World,id:PoiId)=>w.company.uniqueTechDiscoveries.includes(id)||w.pendingTech.some(e=>e.id===id);
export function canTarget(w:World,id:PoiId):string|undefined{
 if(w.phase!=='mining')return 'Shift is ending.';
 if(!w.definition.pois.some(p=>p.id===id)||!w.discoveredPois.has(id))return 'Signal not discovered.';
 if(investigated(w,id))return 'Already investigated.';
 if(!w.guards.some(g=>g.hp>0))return 'Requires Fighter patrol.';
}
export function lockTarget(w:World,id:PoiId){const reason=canTarget(w,id);if(reason)return {ok:false,reason};w.activeTarget=id;w.investigatorId=-1;w.investigationTime=0;for(const g of w.guards)g.pathKey='';return {ok:true};}
export function clearTarget(w:World){w.activeTarget=null;w.investigatorId=-1;w.investigationTime=0;for(const g of w.guards)g.pathKey='';}
export const INVESTIGATION_DURATION=4;
export function prioritizePoi(w:World,id:PoiId){
 if(w.phase!=='mining'||!w.discoveredPois.has(id)||investigated(w,id)||!w.scouts.some(s=>s.state==='exploring'))return false;
 w.scoutPriority=w.scoutPriority===id?null:id;
 for(const scout of w.scouts)scout.targetUntil=0;
 return true;
}
export function focusSurvey(w:World,p:Point){
 return setFocus(w,'scout',p);
}
export function setFocus(w:World,role:FocusRole,p:Point|null){
 if(p!==null&&!validFocusPoint(p))return false;
 w.focuses=withFocus(w.focuses,role,p);
 if(role==='scout'){w.surveyFocus=w.phase==='mining'?p:null;w.scoutPriority=null;for(const s of w.scouts)if(s.state==='exploring')s.targetUntil=0;}
 if(role==='mining')for(const d of w.drones){workDecisions.delete(d);if(d.state==='mine')d.targetHold=-Infinity;}
 return true;
}
export function clearSurvey(w:World){w.surveyFocus=null;for(const s of w.scouts)if(s.state==='exploring')s.targetUntil=0;}
export const knownBiomeAt=(w:World,p:Point)=>exploredAt(w,p)?biomeAt(p.x,p.y,w.company.worldSeed):null;
function sensors(w:World):Sensor[]{return [
 {x:HOME.x,y:HOME.y,radius:115},...(w.company.outpost?[{...w.definition.outpost,radius:115}]:[]),
 ...w.drones.filter(d=>d.state!=='dead'&&d.state!=='docked').map(d=>({x:d.x,y:d.y,radius:90*sensorFactor(d,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)})),
 ...w.haulers.filter(h=>h.state!=='dead'&&h.state!=='docked').map(h=>({x:h.x,y:h.y,radius:78*sensorFactor(h,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)})),
 ...w.guards.filter(g=>g.hp>0).map(g=>({x:g.x,y:g.y,radius:100*sensorFactor(g,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)})),
 ...w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked').map(s=>({x:s.x,y:s.y,radius:scoutScanRadius(w.company.environmentUpgrades)*sensorFactor(s,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)})),
];}
export function updateKnowledge(w:World){
 const sources=sensors(w);reveal(w.visible,sources);
 for(let i=0;i<w.explored.length;i++){
  const added=w.visible[i]&~w.explored[i];if(!added)continue;
  w.explored[i]|=added;w.mapRevision++;
  for(let bit=0;bit<8;bit++)if(added&(1<<bit)){
   const cell=i*8+bit;if(cell>=COLS*ROWS)continue;
   const id=biomeAt((cell%COLS+.5)*CELL,(Math.floor(cell/COLS)+.5)*CELL,w.company.worldSeed);
   if(!w.knownRegions.has(id)){w.knownRegions.add(id);w.newRegions.push(id);}
  }
 }
 for(const r of w.rocks)if(r.hp>0&&sources.some(source=>distance(source,r)<=source.radius))w.identifiedRocks.add(r.id);
 for(const p of w.definition.pois)if(!w.discoveredPois.has(p.id)&&sources.some(s=>distance(s,p)<=s.radius)){
  w.discoveredPois.add(p.id);w.newSignals.push(p.id);
 }
 const friendly=[...w.drones.filter(d=>d.state!=='dead'&&d.state!=='docked'),...w.haulers.filter(h=>h.state!=='dead'&&h.state!=='docked'),...w.guards.filter(g=>g.hp>0),...w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked')];
 if(!w.progress.farSurveyed&&friendly.some(d=>biomeAt(d.x,d.y,w.company.worldSeed)!=='home_belt')){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}
 if(!w.progress.outpostSurveyed&&friendly.some(d=>distance(d,w.definition.outpost)<('targetUntil' in d?180:'kind' in d?105:'assignedMiner' in d?93:115))){w.progress.outpostSurveyed=true;discover(w,'outpost_site_surveyed');}
 if(!w.progress.rivalSeen&&w.enemies.some(e=>e.hp>0&&sources.some(s=>distance(s,e)<=s.radius))){w.progress.rivalSeen=true;discover(w,'first_rival_contact');}
}
function frontier(w:World,unit:Point,radius:number,peerTargets:Point[]=[],speed=67):Point|undefined{
 let best:Point|undefined,score=-Infinity;
 const reach=Math.max(0,w.missionDuration-w.time-2)*speed;
 const left=Math.max(1,Math.floor((unit.x-reach)/CELL)),right=Math.min(COLS-2,Math.ceil((unit.x+reach)/CELL));
 const top=Math.max(1,Math.floor((unit.y-reach)/CELL)),bottom=Math.min(ROWS-2,Math.ceil((unit.y+reach)/CELL));
 const stride=4,nearby=w.rocks.filter(r=>r.hp>0&&Math.abs(r.x-unit.x)<reach+r.r+12&&Math.abs(r.y-unit.y)<reach+r.r+12);
 for(let row=top;row<=bottom;row+=stride)for(let col=left;col<=right;col+=stride){
  const p={x:(col+.5)*CELL,y:(row+.5)*CELL};
  if(exploredAt(w,p)||nearby.some(r=>Math.abs(p.x-r.x)<r.r+12&&Math.abs(p.y-r.y)<r.r+12&&distance(p,r)<r.r+12))continue;
  const travel=distance(unit,p),uncovered=[[-radius,0],[radius,0],[0,-radius],[0,radius],[0,0]].filter(([dx,dy])=>!exploredAt(w,{x:p.x+dx,y:p.y+dy})).length;
  if(travel>reach)continue;
  const peer=peerTargets.some(t=>distance(t,p)<radius*1.25)?175:0;
  // Unknown terrain is never classified for routing; only charted points and
  // the nearest observable boundary can contribute a known risk estimate.
  const toward={x:unit.x+(p.x-unit.x)*Math.min(1,radius/Math.max(1,travel)),y:unit.y+(p.y-unit.y)*Math.min(1,radius/Math.max(1,travel))};
  const known=knownBiomeAt(w,toward)??knownBiomeAt(w,unit);
  const shield=w.company.environmentUpgrades.includes('radiationShielding');
  const stabilizers=w.company.environmentUpgrades.includes('navigationStabilizers');
  const hazard=known==='dead_zone'?(shield?28:190):known==='contested'?w.guards.some(g=>g.hp>0&&distance(g,unit)<150)?38:100:known==='ion_storm'?(stabilizers?25:90):0;
  const observedThreat=w.enemies.some(e=>e.hp>0&&visibleAt(w,e)&&distance(e,p)<230)?w.guards.some(g=>g.hp>0&&distance(g,unit)<130)?70:165:0;
  // A directional pull works long before the endpoint itself is reachable.
  // The pin supplies only a vector; unknown biomes/rocks are never sampled.
  const focus=w.surveyFocus?Math.max(-1,Math.min(1,(distance(unit,w.surveyFocus)-distance(p,w.surveyFocus))/Math.max(80,travel)))*(known==='dead_zone'&&!shield||observedThreat?85:240):0;
  const value=uncovered*32-travel*.25-distance(w.base,p)*.025-peer-hazard-observedThreat+focus;
  if(value>score){score=value;best=p;}
 }
 return best;
}
function updateScouts(w:World,dt:number){
 for(const s of w.scouts){if(s.state==='dead'||s.state==='docked')continue;
  if(w.phase!=='mining')s.state='return';
  const foe=w.enemies.filter(e=>e.hp>0&&distance(e,s)<95).sort((a,b)=>distance(a,s)-distance(b,s))[0];
  const radiation=environmentAt(s,w.company.outpost,w.company.worldSeed)==='dead_zone'&&!w.company.environmentUpgrades.includes('radiationShielding');
  if(radiation&&s.hp<4.5&&s.state==='exploring'){s.state='return';s.pathKey='';}
  else if(foe&&s.state==='exploring'){s.state='avoiding';s.targetUntil=w.time+16;s.pathKey='';}
  else if(!foe&&s.state==='avoiding'&&w.time>s.targetUntil&&distance(s,w.base)<260){s.state='exploring';s.targetUntil=0;}
  // Exclusive per-shift claim; each Scout may resume a previously surveyed
  // unfinished site. Danger and recall release claims without erasing work.
  let site= s.state==='exploring'?w.definition.pois.filter(p=>w.discoveredPois.has(p.id)&&!investigated(w,p.id)&&!w.investigatorClaims.has(p.id)&&
    (w.missionDuration-w.time)>distance(s,p)/85+INVESTIGATION_DURATION-(w.poiProgress[p.id]??0)+1&&
    !w.enemies.some(e=>e.hp>0&&visibleAt(w,e)&&distance(e,p)<150))
    .sort((a,b)=>Number(b.id===w.scoutPriority)-Number(a.id===w.scoutPriority)||distance(s,a)-distance(s,b))[0]:undefined;
  if(site&&distance(s,site)>Math.max(800,(w.missionDuration-w.time)*85))site=undefined;
  if(site){w.investigatorClaims.set(site.id,s.id);s.targetX=site.x;s.targetY=site.y;s.targetUntil=w.time+Math.max(2,distance(s,site)/85+3);}
  if(s.state==='exploring'&&!site&&w.time>=s.targetUntil){
   const peers=w.scouts.filter(p=>p!==s&&p.state==='exploring').map(p=>({x:p.targetX,y:p.targetY}));
   const radius=scoutScanRadius(w.company.environmentUpgrades);
   const target=frontier(w,s,radius,peers,85)??w.base;s.targetX=target.x;s.targetY=target.y;s.targetUntil=w.time+Math.max(2,distance(s,target)/82+2);s.pathKey='';
  }
  const target=s.state==='return'||s.state==='avoiding'&&!foe?w.base:s.state==='avoiding'&&foe?{x:Math.max(20,Math.min(W-20,s.x+(s.x-foe.x)*2)),y:Math.max(20,Math.min(H-20,s.y+(s.y-foe.y)*2))}:{x:s.targetX,y:s.targetY};
  const point=clearSegment(s,target,w.rocks,-1,9)?target:waypoint(w,s,target,`${s.state}:${Math.round(target.x)}:${Math.round(target.y)}`);
  const dx=point.x-s.x,dy=point.y-s.y,len=Math.hypot(dx,dy),speed=(s.state==='avoiding'?105:85)*movementFactor(s,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed);
  s.vx+=(dx/Math.max(1,len)*Math.min(speed,len*3)-s.vx)*Math.min(1,dt*5);s.vy+=(dy/Math.max(1,len)*Math.min(speed,len*3)-s.vy)*Math.min(1,dt*5);
  s.x=Math.max(10,Math.min(W-10,s.x+s.vx*dt));s.y=Math.max(10,Math.min(H-10,s.y+s.vy*dt));separateRock(w,s);
  if(Math.hypot(s.vx,s.vy)>2)s.angle=Math.atan2(s.vy,s.vx);
  if(site&&s.state==='exploring'&&distance(s,site)<28&&Math.hypot(s.vx,s.vy)<35){
   w.activeInvestigations.add(site.id);
   w.poiProgress[site.id]=Math.min(INVESTIGATION_DURATION,(w.poiProgress[site.id]??0)+dt);
   if((w.poiProgress[site.id]??0)>=INVESTIGATION_DURATION){discover(w,site.id);if(w.scoutPriority===site.id)w.scoutPriority=null;s.targetUntil=0;}
  }
 if(s.state==='return'&&distance(s,w.base)<24){s.state='docked';s.vx=s.vy=0;}
 }
}
// Shared station geometry for HQ and the Outer Outpost. Each returning miner
// reserves its nearest free, rock-clear berth until it departs or is lost.
export function dockingSpots(base:Point):Point[]{
 const radius=base.x===HOME.x&&base.y===HOME.y?72:56;
 return Array.from({length:12},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/6;return {x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius};});
}
const berthFor=(w:World,d:Drone|Hauler):Point=>{
 const spots=dockingSpots(w.base);
 if(d.berth<0){
  const occupied=new Set([...w.drones,...w.haulers].filter(other=>other!==d&&other.berth>=0&&other.state!=='dead').map(other=>other.berth));
  const clear=(p:Point)=>p.x>=12&&p.x<=W-12&&p.y>=12&&p.y<=H-12&&w.rocks.every(r=>r.hp<=0||distance(p,r)>=r.r+12);
  const index=spots.map((_,i)=>i).filter(i=>!occupied.has(i)&&clear(spots[i])).sort((a,b)=>distance(d,spots[a])-distance(d,spots[b]))[0];
  d.berth=index??0;
 }
 return spots[d.berth];
};
export const ORE_PICKUP_DELAY=.55;
function effect(w:World,e:Omit<Effect,'life'|'max'>,life=.5){w.effects.push({...e,life,max:life});}
const yieldFor=(r:Rock,laser:boolean)=>Math.min(r.hp,laser?1:2);
function hit(w:World,r:Rock,d:Drone,laser:boolean){
 const damage=yieldFor(r,laser),amount=damage;
 r.hp-=damage;w.mined++;w.extracted+=amount;w.extractedByMineral[r.mineral]+=amount;if(r.rich)w.richExtracted+=amount;effect(w,{type:'hit',x:r.x,y:r.y,tx:d.x,ty:d.y,amount:laser?0.45:r.hp<=0?2:1,items:[{mineral:r.mineral}]},.45);
 const pieces=amount,baseAngle=w.rng()*Math.PI*2;
 for(let j=0;j<pieces;j++){
  let landing:Point={x:r.x+r.r+25,y:r.y};
  for(let attempt=0;attempt<12;attempt++){
   const angle=baseAngle+j*Math.PI+(w.rng()-.5)*.45+attempt*.55,radius=r.r+20+w.rng()*14;
   const candidate={x:Math.max(12,Math.min(W-12,r.x+Math.cos(angle)*radius)),y:Math.max(12,Math.min(H-12,r.y+Math.sin(angle)*radius))};
   landing=candidate;
   if(w.rocks.every(other=>other.id===r.id||other.hp<=0||distance(candidate,other)>=other.r+10))break;
  }
  w.ores.push({id:w.nextId++,x:landing.x,y:landing.y,value:1,mineral:r.mineral,rich:false,originX:r.x,originY:r.y,age:0});
 }
}
function waypoint(w:World,d:Pick<Drone,'x'|'y'|'path'|'pathKey'|'pathAge'>,target:Point,key:string,ignore=-1){
 d.pathAge+=STEP;
 if(d.pathKey!==key||d.pathAge>(d.path.length?1.5:.5)){d.path=route(d,target,w.rocks,ignore,W,H);d.pathKey=key;d.pathAge=0;}
 while(d.path.length>1&&distance(d,d.path[0])<9)d.path.shift();
 // Only skip a corner after the drone has a clear line, not merely because it's close.
 if(d.path.length>1&&clearSegment(d,d.path[1],w.rocks,ignore,10))d.path.shift();
 return d.path[0]??{x:d.x,y:d.y};
}
// An ejected fragment may sit inside an asteroid's navigation clearance while
// still being reachable by the pickup radius. Navigate to a clear pickup point
// instead of routing to the fragment's blocked center.
const unreachableOre=new WeakMap<Drone|Hauler,Map<number,number>>();
function oreApproach(w:World,d:Drone|Hauler,ore:Ore):Point|undefined{
 if((unreachableOre.get(d)?.get(ore.id)??0)>w.time)return;
 const key='ore'+ore.id;
 if(d.pathKey===key&&d.path.length){
  const goal=d.path[d.path.length-1];
  if(distance(goal,ore)<18)return goal;
 }
 const candidates:Point[]=[ore,...Array.from({length:16},(_,i)=>({
  x:ore.x+Math.cos(i*Math.PI/8)*14,y:ore.y+Math.sin(i*Math.PI/8)*14,
 }))];
 candidates.sort((a,b)=>distance(d,a)-distance(d,b));
 for(const p of candidates){
  if(p.x<10||p.x>W-10||p.y<10||p.y>H-10||!clearSegment(p,p,w.rocks,-1,11))continue;
  const path=route(d,p,w.rocks,-1,W,H);
  if(!path.length)continue;
  d.path=path;d.pathKey=key;d.pathAge=0;
  return p;
 }
 let blocked=unreachableOre.get(d);if(!blocked){blocked=new Map();unreachableOre.set(d,blocked);}
 if(blocked.size>=32)blocked.delete(blocked.keys().next().value!);
 blocked.set(ore.id,w.time+1);
 return undefined;
}
function releaseClaim(w:World,id:number){
 if(w.oreClaims.delete(id))w.claimsReleased++;
 for(const d of w.drones){const i=d.oreQueue.indexOf(id);if(i>=0)d.oreQueue.splice(i,1);}
 for(const h of w.haulers)if(h.targetOre===id)h.targetOre=-1;
}
function releaseMinerClaims(w:World,d:Drone){for(const id of [...d.oreQueue])releaseClaim(w,id);}
function releaseHaulerClaim(w:World,h:Hauler){if(h.targetOre>=0)releaseClaim(w,h.targetOre);}
function ownClaim(w:World,id:number,kind:OreClaim['ownerKind'],ownerId:number){
 const current=w.oreClaims.get(id);
 if(current)return current.ownerKind===kind&&current.ownerId===ownerId;
 w.oreClaims.set(id,{ownerKind:kind,ownerId});w.claimsAssigned++;return true;
}
function availableTo(w:World,id:number,kind:OreClaim['ownerKind'],ownerId:number){
 const current=w.oreClaims.get(id);return !current||current.ownerKind===kind&&current.ownerId===ownerId;
}
// Reconcile even when cargo changes through incidental pickup or physical handoff.
// Queue order is stable: keep the current navigation target, then older claims.
function trimMinerClaims(w:World,d:Drone,allowed=d.gear.cargo-d.cargo){
 for(const id of [...d.oreQueue])if(!w.ores.some(o=>o.id===id)||!availableTo(w,id,'miner',d.id))releaseClaim(w,id);
 for(const id of d.oreQueue.slice(Math.max(0,allowed)))releaseClaim(w,id);
}
function assignMinerOre(w:World,d:Drone,candidates:Ore[]):Ore|undefined{
 trimMinerClaims(w,d);
 for(const id of [...d.oreQueue])if(!candidates.some(o=>o.id===id))releaseClaim(w,id);
 for(const ore of candidates){
  if(d.oreQueue.length>=d.gear.cargo-d.cargo)break;
  if(d.oreQueue.includes(ore.id)||!availableTo(w,ore.id,'miner',d.id))continue;
  if(!oreApproach(w,d,ore))continue;
  ownClaim(w,ore.id,'miner',d.id);d.oreQueue.push(ore.id);
 }
 const current=w.ores.find(o=>o.id===d.oreQueue[0]);
 if(current&&!oreApproach(w,d,current)){releaseClaim(w,current.id);return assignMinerOre(w,d,candidates.filter(o=>o.id!==current.id));}
 return current;
}
function separateRock(w:World,agent:{x:number;y:number;vx:number;vy:number},radius=8){
 for(let pass=0;pass<3;pass++)for(const r of w.rocks){
  const dist=distance(agent,r);if(r.hp<=0||dist>=r.r+radius)continue;
  const nx=dist?(agent.x-r.x)/dist:1,ny=dist?(agent.y-r.y)/dist:0;
  agent.x=r.x+nx*(r.r+radius+.2);agent.y=r.y+ny*(r.r+radius+.2);
  const inward=agent.vx*nx+agent.vy*ny;if(inward<0){agent.vx-=inward*nx;agent.vy-=inward*ny;}
 }
}
function dropCargo(w:World,d:Drone|Hauler){
 if('oreQueue' in d)releaseMinerClaims(w,d);else releaseHaulerClaim(w,d);
 w.lost+=d.cargo;w.lostValue+=cargoValue(d.cargoItems);
 for(let j=0;j<d.cargo;j++){
  const offset=w.nextId%7-3,item=d.cargoItems[j];
  w.ores.push({id:w.nextId++,x:Math.max(8,Math.min(W-8,d.x+offset*3)),y:Math.max(8,Math.min(H-8,d.y-offset*2)),value:1,mineral:item.mineral,rich:!!item.legacyRich,age:1});
 }
 d.cargoItems.length=0;d.berth=-1;
}
// Cargo is an integer count plus its rich subset. Only station transfers create
// income; a handoff changes ownership atomically and never spawns a second ore.
export function handoff(w:World,d:Drone,h:Hauler):number{
 if(d.state==='dead'||h.state==='dead'||h.state==='docked'||h.state==='unload'||distance(d,h)>22)return 0;
 const amount=Math.min(d.cargo,h.capacity-h.cargo);
 if(amount<=0)return 0;
 h.cargoItems.push(...d.cargoItems.splice(0,amount));
 trimMinerClaims(w,d);
 h.lastWork=w.time;w.transferred+=amount;
 effect(w,{type:'handoff',x:d.x,y:d.y,tx:h.x,ty:h.y,amount,items:h.cargoItems.slice(-amount).map(item=>({...item}))},.45);
 return amount;
}
function updateHaulers(w:World,dt:number){
 for(const h of w.haulers){
  if(h.state==='dead'||h.state==='docked'){releaseHaulerClaim(w,h);continue;}
  if(h.state==='unload'){
   releaseHaulerClaim(w,h);
   h.unloadTime+=dt;
   const sent=Math.min(h.unloadCargo,Math.floor(h.unloadTime/.7*h.unloadCargo));
   const amount=h.cargo-(h.unloadCargo-sent);
   if(amount>0){const items=h.cargoItems.splice(0,amount);w.haulerDelivered+=amount;effect(w,{type:'transfer',x:h.x,y:h.y,tx:w.base.x,ty:w.base.y+7,amount,items},.35);}
   if(h.unloadTime>=1.15){h.state=w.phase==='recall'||w.drones.every(d=>d.state==='dead'||d.state==='docked')?'docked':'work';h.task=h.state==='docked'?'Docked':'Assisting';h.berth=-1;h.assignedMiner=-1;h.pathKey='';h.lastWork=w.time;}
   continue;
  }
  const threatened=w.doctrine==='careful'&&h.cargo>0&&w.enemies.some(e=>e.hp>0&&distance(e,h)<135);
  const noMiners=w.drones.every(d=>d.state==='dead'||d.state==='docked');
  if(w.phase==='recall'||h.cargo>=h.capacity||noMiners||threatened)h.state='return';
  if(h.state!=='work')releaseHaulerClaim(w,h);
  let target:Point|undefined;
  if(h.state==='work'){
   const miner=w.drones.find(d=>d.id===h.assignedMiner&&d.state==='handoff'&&d.haulerId===h.id&&w.time<d.handoffUntil);
   if(miner){target={x:miner.meetX,y:miner.meetY};h.task='Rendezvous';releaseHaulerClaim(w,h);}
   else{
    h.assignedMiner=-1;
    // Commit to a reachable fragment until it is collected or disappears.
    const relevant=w.ores.filter(o=>exploredAt(w,o)&&(o.age??1)>=ORE_PICKUP_DELAY&&distance(h,o)<(h.cargo>=h.capacity-1?110:235)&&!(o.id===h.blockedOre&&w.time<h.blockedUntil)&&availableTo(w,o.id,'hauler',h.id)&&
      (w.company.environmentUpgrades.includes('radiationShielding')||h.hp>3||knownBiomeAt(w,o)!=='dead_zone')&&
      (w.doctrine!=='convoy'||w.drones.some(d=>d.state==='mine'&&distance(d,o)<195)));
    const score=(o:Ore)=>workRate({credits:MINERALS[o.mineral??'ferrite'].credits,pieces:1,travel:distance(h,o),returnDistance:distance(o,w.base),actionSeconds:.8,risk:knownBiomeAt(w,o)==='dead_zone'&&!w.company.environmentUpgrades.includes('radiationShielding')?5:0,focusDistance:w.focuses.mining?distance(w.focuses.mining,o):undefined});
    let best:Ore|undefined,held:Ore|undefined,bestRate=-Infinity,heldRate=-Infinity;
    for(const ore of relevant){const rate=score(ore);if(rate>bestRate||rate===bestRate&&ore.id<(best?.id??Infinity)){best=ore;bestRate=rate;}if(ore.id===h.targetOre){held=ore;heldRate=rate;}}
    const selected=held&&heldRate>=bestRate*.82?held:best;
    if(h.targetOre>=0&&selected?.id!==h.targetOre)releaseHaulerClaim(w,h);
    if(selected){target=oreApproach(w,h,selected);if(target){ownClaim(w,selected.id,'hauler',h.id);h.targetOre=selected.id;}else{releaseHaulerClaim(w,h);h.blockedOre=selected.id;h.blockedUntil=w.time+7;}h.task='Collecting';}
    if(!target){releaseHaulerClaim(w,h);const worker=w.drones.filter(d=>d.state==='mine'||d.state==='handoff').sort((a,b)=>distance(h,a)-distance(h,b))[0];
     if(h.cargo>0&&w.time-h.lastWork>5){h.state='return';}
     else if(worker){target={x:worker.x+24,y:worker.y+24};h.task='Assisting';}
     else h.state='return';
    }
   }
  }
  if(h.state==='return'){releaseHaulerClaim(w,h);h.assignedMiner=-1;h.task='Returning';target=berthFor(w,h);}
  if(!target)target=w.base;
  const point=waypoint(w,h,target,h.state==='return'?`haulHome${h.berth}`:h.assignedMiner>=0?`haulMeet${h.assignedMiner}`:h.targetOre>=0?`ore${h.targetOre}`:`haulAssist${Math.round(target.x/35)}:${Math.round(target.y/35)}`);
  const dx=point.x-h.x,dy=point.y-h.y,len=Math.hypot(dx,dy),hold=len<11;
  const motor=movementFactor(h,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed);
  h.vx+=(((hold?dx*2:dx/Math.max(1,len)*Math.min(92,len*3))*motor)-h.vx)*Math.min(1,dt*6);
  h.vy+=(((hold?dy*2:dy/Math.max(1,len)*Math.min(92,len*3))*motor)-h.vy)*Math.min(1,dt*6);
  h.x=Math.max(10,Math.min(W-10,h.x+h.vx*dt));h.y=Math.max(10,Math.min(H-10,h.y+h.vy*dt));separateRock(w,h,11);
  if(Math.hypot(h.vx,h.vy)>3)h.angle=Math.atan2(h.vy,h.vx);
  if(h.state==='work'){
   for(let i=w.ores.length-1;i>=0&&h.cargo<h.capacity;i--){const o=w.ores[i];if((o.age??1)<ORE_PICKUP_DELAY||distance(h,o)>=18||!availableTo(w,o.id,'hauler',h.id))continue;
    h.cargoItems.push({mineral:o.mineral,legacyRich:o.rich});if(o.rich&&!w.progress.farSurveyed){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}
    w.haulerPickups++;h.lastWork=w.time;effect(w,{type:'ore',x:o.x,y:o.y,amount:1,items:[{mineral:o.mineral,legacyRich:o.rich}]},.7);w.ores.splice(i,1);releaseClaim(w,o.id);
   }
   const assigned=w.drones.find(d=>d.id===h.assignedMiner&&d.state==='handoff');
   if(assigned&&distance(h,assigned)<22){handoff(w,assigned,h);assigned.state=assigned.cargo?'return':'mine';assigned.haulerId=-1;h.assignedMiner=-1;h.lastWork=w.time;}
   // A loaded Miner passing by can exchange cargo without interrupting its work.
   for(const d of w.drones)if(d.state==='mine'&&d.cargo>=2&&distance(d,h)<19)handoff(w,d,h);
  }
  if(h.state==='work'&&distance(h,target)>25&&Math.hypot(h.vx,h.vy)<1)w.haulerStalledTime+=dt;
  if(h.state==='return'&&distance(h,berthFor(w,h))<2&&Math.hypot(h.vx,h.vy)<8){h.state='unload';h.task='Unloading';h.unloadTime=0;h.unloadCargo=h.cargo;h.vx=0;h.vy=0;}
 }
}
type MinerJob={kind:'rock';rock:Rock;rate:number}|{kind:'ore';ore:Ore;rate:number};
type WorkDecision={world:World;until:number;room:number;health:number;focus:Point|null;anchor:number;x:number;y:number;job:MinerJob|undefined;reserve:number;identified:boolean};
const workDecisions=new WeakMap<Drone,WorkDecision>();
type WaitingWork={checkAt:number};
const waitingForWork=new WeakMap<Drone,WaitingWork>();
const plannerCounts=new WeakMap<World,number>();
export const miningPlannerRuns=(w:World)=>plannerCounts.get(w)??0;
function minerWork(w:World,d:Drone,room:number):MinerJob|undefined{
 const cached=workDecisions.get(d),job=cached?.job;
 const valid=!job||(job.kind==='rock'?
  w.rocks.includes(job.rock)&&job.rock.hp===cached!.reserve&&job.rock.hp>0&&w.identifiedRocks.has(job.rock.id)===cached!.identified:
  w.ores.includes(job.ore)&&availableTo(w,job.ore.id,'miner',d.id));
 if(cached&&cached.world===w&&cached.until>w.time&&cached.room===room&&cached.health===Math.floor(d.hp)&&cached.focus===w.focuses.mining&&cached.anchor===d.targetRock&&Math.hypot(d.x-cached.x,d.y-cached.y)<60&&valid)return job;
 const next=planMinerWork(w,d,room);
 workDecisions.set(d,{world:w,until:w.time+.25+(d.id%4)*.025,room,health:Math.floor(d.hp),focus:w.focuses.mining,anchor:d.targetRock,x:d.x,y:d.y,job:next,reserve:next?.kind==='rock'?next.rock.hp:0,identified:next?.kind==='rock'&&w.identifiedRocks.has(next.rock.id)});
 return next;
}
// Exposed for bounded behavioral fixtures; this is the planner used in step().
export function planMinerWork(w:World,d:Drone,room=d.gear.cargo-d.cargo):MinerJob|undefined{
 plannerCounts.set(w,(plannerCounts.get(w)??0)+1);
 if(room<=0)return;
 const remaining=w.missionDuration-w.time,focus=w.focuses.mining;
 const area=w.rocks.find(r=>r.id===d.targetRock);
 const threats=w.enemies.filter(e=>e.hp>0&&visibleAt(w,e));
 const peers=w.drones.filter(p=>p!==d&&p.state==='mine');
 // Dense persistent salvage would make a scan of every fragment for every
 // rock and every other fragment quadratic on long-lived company saves.
 const cellSize=80,buckets=new Map<number,Ore[]>(),available:Ore[]=[];
 const cell=(x:number,y:number)=>Math.floor(y/cellSize)*Math.ceil(W/cellSize)+Math.floor(x/cellSize);
 for(const ore of w.ores)if(exploredAt(w,ore)&&availableTo(w,ore.id,'miner',d.id)&&(unreachableOre.get(d)?.get(ore.id)??0)<=w.time){
  available.push(ore);const key=cell(ore.x,ore.y),list=buckets.get(key);
  if(list)list.push(ore);else buckets.set(key,[ore]);
 }
 const nearbyCount=(p:Point,radius:number,mineral?:MineralId)=>{
  let found=0;
  for(let y=Math.floor((p.y-radius)/cellSize);y<=Math.floor((p.y+radius)/cellSize);y++)
   for(let x=Math.floor((p.x-radius)/cellSize);x<=Math.floor((p.x+radius)/cellSize);x++)
    for(const ore of buckets.get(y*Math.ceil(W/cellSize)+x)??[])if((mineral===undefined||ore.mineral===mineral)&&(ore.age??1)>=ORE_PICKUP_DELAY&&(ore.x-p.x)**2+(ore.y-p.y)**2<radius*radius){if(++found>=room)return found;}
  return found;
 };
 const risk=(p:Point)=>{
  const biome=knownBiomeAt(w,p),unshielded=biome==='dead_zone'&&!w.company.environmentUpgrades.includes('radiationShielding');
  return (unshielded?d.hp<5?12:5:biome==='ion_storm'?1.5:0)+threats.reduce((n,e)=>n+Math.max(0,200-distance(p,e))/42,0);
 };
 const jobs:MinerJob[]=[];
 for(const rock of w.rocks){
  if(d.kind==='impactMiner'&&d.hp<=1)break;
  if(rock.hp<=0||!exploredAt(w,rock))continue;
  const identified=w.identifiedRocks.has(rock.id);
  // Unknown deposits are assumed ordinary. Their hidden tool requirement is
  // neither used to filter nor to score; sensor identification resolves it.
  if(identified&&!canExtract(d.kind,rock.mineral,w.company.extractionUpgrades))continue;
  const travel=Math.max(0,distance(d,rock)-rock.r),returnDistance=distance(rock,w.base);
  // Work must fit before recall; the physical return happens AFTER this timer.
  const outbound=Math.max(0,travel-(d.kind==='laserMiner'?DOCTRINE_AI[w.doctrine].standoff:0));
  if(outbound/(66*movementFactor(d,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed))+(d.kind==='laserMiner'?.25:1)>remaining)continue;
  const pieces=Math.min(room,rock.hp,2);
  const price=identified?MINERALS[rock.mineral].credits:1;
  const nearPeers=peers.filter(p=>p.targetRock===rock.id).length;
  const loose=nearbyCount(rock,rock.r+65);
  // Mining only creates loose units. Account for the follow-up pickup and the
  // ram's clearance/run-up; otherwise a nearby loose unit is never collected.
  const actionSeconds=d.kind==='laserMiner'?pieces*(d.gear.laserCooldown+1.4):pieces*(d.gear.ramCooldown+2.4)+2;
  const tidying=rock.hp<=2&&rock.hp<rock.max?2.5:1;
  const focusDistance=focus?distance(focus,rock):Infinity;
  // A deliberate forward mining pin is an expedition order. The normal
  // locality preference remains for autonomous work and pins elsewhere.
  const expedition=identified&&focusDistance<300&&biomeAt(rock.x,rock.y,w.company.worldSeed)==='scrap_fields'?25:1;
  const rate=expedition*tidying*workRate({credits:price,pieces,travel,returnDistance,actionSeconds,risk:risk(rock),focusDistance:focus?focusDistance:undefined,peers:nearPeers+loose/Math.max(1,room),areaDistance:area?distance(area,rock):undefined});
  jobs.push({kind:'rock',rock,rate});
 }
 for(const ore of available){
  if((ore.age??1)<ORE_PICKUP_DELAY)continue;
  const travel=distance(d,ore),returnDistance=distance(ore,w.base);
  if(d.kind==='impactMiner'&&d.hp<=1&&travel>=130)continue;
  if(travel/(66*movementFactor(d,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed))+.55>remaining)continue;
  const pieces=nearbyCount(ore,65,ore.mineral),price=MINERALS[ore.mineral??'ferrite'].credits;
  const rate=workRate({credits:price,pieces,travel,returnDistance,actionSeconds:.55*pieces+.2,risk:risk(ore),focusDistance:focus?distance(focus,ore):undefined,areaDistance:area?distance(area,ore):undefined});
  jobs.push({kind:'ore',ore,rate});
 }
 const best=jobs.reduce<MinerJob|undefined>((a,b)=>!a||b.rate>a.rate||b.rate===a.rate&&(b.kind==='rock'?b.rock.id:b.ore.id)<(a.kind==='rock'?a.rock.id:a.ore.id)?b:a,undefined);
 // Finish the last one/two pieces of the deposit we are already working.
 // This is deliberate completion behavior, not a claim of optimal income.
 const finish=jobs.find(j=>j.kind==='rock'&&j.rock.id===d.targetRock&&j.rock.hp<=2&&j.rock.hp<j.rock.max&&distance(d,j.rock)-j.rock.r<220&&risk(j.rock)<2&&
  !(d.kind==='impactMiner'&&d.hp<=1)&&!peers.some(p=>p.targetRock===j.rock.id)&&(!focus||distance(focus,j.rock)<450));
 if(finish)return finish;
 const current=jobs.find(j=>j.kind==='rock'?j.rock.id===d.targetRock&&d.oreQueue.length===0:j.ore.id===d.oreQueue[0]);
 return current?.kind==='rock'&&(d.cooldown>0||!d.armed)?current:current&&best&&current.rate>=best.rate*.82?current:best;
}
function selectRock(d:Drone,r:Rock,w:World){
 if(r.id===d.targetRock)return;
 d.targetRock=r.id;d.targetHold=w.time;
 const p=workPosition(w,r,Math.atan2(d.y-r.y,d.x-r.x),DOCTRINE_AI[w.doctrine].standoff);
 d.approachX=p.x;d.approachY=p.y;
}
// Choose a fixed, clear point once, rather than parking forever at a standoff
// embedded in a neighbouring asteroid. Recovery points remain anchored too.
function workPosition(w:World,r:Rock,angle:number,offset:number):Point{
 for(const turn of [0,1,-1,2,-2,3,-3,4,-4,5,-5,6,-6,7,-7,8]){
  const a=angle+turn*Math.PI/8,p={x:r.x+Math.cos(a)*(r.r+offset),y:r.y+Math.sin(a)*(r.r+offset)};
  if(p.x>=12&&p.x<=W-12&&p.y>=12&&p.y<=H-12&&clearSegment(p,p,w.rocks,-1,11)&&clearSegment(p,r,w.rocks,r.id,0))return p;
 }
 return {x:r.x+Math.cos(angle)*(r.r+offset),y:r.y+Math.sin(angle)*(r.r+offset)};
}
function dangerRetreat(w:World,d:Drone):Point|undefined{
 if(w.doctrine!=='careful')return;
 const foe=w.enemies.filter(e=>e.hp>0&&visibleAt(w,e)).sort((a,b)=>distance(d,a)-distance(d,b))[0];
 if(!foe)return;
 const dist=distance(d,foe);
 const protectedByGuard=w.guards.some(g=>g.hp>0&&distance(d,g)<115);
 if(dist>DOCTRINE_AI.careful.retreat||protectedByGuard&&dist>110)return;
 if(d.hp>2.5&&dist>125)return;
 // Retreat toward the station or away from the threat when it lies between miner and station.
 const away={x:Math.max(20,Math.min(W-20,d.x+(d.x-foe.x)/Math.max(1,dist)*115)),y:Math.max(20,Math.min(H-20,d.y+(d.y-foe.y)/Math.max(1,dist)*115))};
 return distance(foe,w.base)>distance(d,w.base)?w.base:away;
}
function updateRivals(w:World,dt:number){
 const territory=w.definition.rivalHomes.find(home=>[...w.scouts,...w.drones,...w.guards].some(unit=>distance(unit,home)<440));
 if(w.phase==='mining'&&w.company.fleetCapacity>=2&&w.wave===0&&territory){
  w.enemies.push({id:0,x:territory.x,y:territory.y,vx:0,vy:0,hp:3,cooldown:1.1,path:[],pathKey:'',pathAge:0,home:territory});w.wave=1;
 }
 if(w.phase==='mining'&&w.company.fleetCapacity>=2&&w.time>=w.nextRaid){
  const active=w.enemies.filter(e=>e.hp>0).length;
  const expedition=[...w.drones,...w.haulers].find(unit=>unit.state!=='dead'&&unit.state!=='docked'&&biomeAt(unit.x,unit.y,w.company.worldSeed)==='scrap_fields');
  if(expedition&&active<Math.min(2,w.company.fleetCapacity>=3?2:1)){
   const home=w.definition.rivalHomes.reduce((best,p)=>distance(p,expedition)<distance(best,expedition)?p:best);
   w.enemies.push({id:w.nextId++,x:home.x,y:home.y,vx:0,vy:0,hp:3,cooldown:1.5,path:[],pathKey:'',pathAge:0,home,raid:true,born:w.time});
  }
  w.nextRaid=w.time+(w.progress.rivalSeen?(w.company.fleetCapacity>=3?12+w.rng()*11:17+w.rng()*16):22+w.rng()*10);
 }
 for(const e of w.enemies){
  if(e.hp<=0)continue;
  if(e.raid&&w.time-(e.born??0)>19){e.hp=0;continue;}
  const miners=[...w.drones.filter(d=>d.state==='mine'||d.state==='handoff'||d.state==='return'||d.state==='unload'),...w.haulers.filter(h=>h.state==='work'||h.state==='return'||h.state==='unload')];
  const guards=w.guards.filter(g=>g.hp>0).sort((a,b)=>distance(e,a)-distance(e,b));
  const miner=miners.sort((a,b)=>distance(e,a)-distance(e,b))[0];
  const scout=w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked').sort((a,b)=>distance(e,a)-distance(e,b))[0];
  let target:Drone|Hauler|Scout|Guard|undefined=guards[0]&&distance(e,guards[0])<145?guards[0]:scout&&distance(e,scout)<95?scout:miner??scout??guards[0];
  if(e.home&&(distance(e,e.home)>(e.raid?340:270)||!target||distance(e,target)>(e.raid?325:210)||distance(target,e.home)>(e.raid?360:310)||biomeAt(target.x,target.y,w.company.worldSeed)==='dead_zone'))target=undefined;
  if(!target&&!e.home){e.vx*=.96;e.vy*=.96;continue;}
  const goal=target??e.home!,dist=distance(e,goal),point=clearSegment(e,goal,w.rocks,-1,10)?goal:waypoint(w,e,goal,target?'pursue'+('state' in target?'miner':'guard')+target.id:'patrol');
  const pathDist=distance(e,point),dx=(point.x-e.x)/Math.max(1,pathDist),dy=(point.y-e.y)/Math.max(1,pathDist);
  const desired=!target?Math.min(70,dist*2):dist>105?82:dist<70?-35:0;
  e.vx+=(dx*desired-e.vx)*Math.min(1,dt*2);e.vy+=(dy*desired-e.vy)*Math.min(1,dt*2);
  e.x=Math.max(12,Math.min(W-12,e.x+e.vx*dt));e.y=Math.max(12,Math.min(H-12,e.y+e.vy*dt));separateRock(w,e);
  if(e.raid&&biomeAt(e.x,e.y,w.company.worldSeed)==='dead_zone'){e.hp=0;continue;}
  e.cooldown-=dt;
  if(target&&distance(e,target)<145&&e.cooldown<=0&&clearSegment(e,target,w.rocks,-1,0)){
   effect(w,{type:'enemyShot',x:e.x,y:e.y,tx:target.x,ty:target.y},.3);w.attacks++;
   const productive=target===miner;
   target.hp-='kind' in target?4:productive?1.5:1;
   if(target.hp<=0){target.hp=0;if(productive){const victim=target as Drone|Hauler;dropCargo(w,victim);victim.state='dead';if('assignedMiner' in victim){const d=w.drones.find(d=>d.id===victim.assignedMiner);if(d?.state==='handoff')d.handoffUntil=0;}}else if('targetUntil' in target)target.state='dead';effect(w,{type:'dead',x:target.x,y:target.y},1);}
   e.cooldown=1.8;
  }
 }
 if(w.investigatorId>=0&&!w.guards.some(g=>g.id===w.investigatorId&&g.hp>0)){w.investigatorId=-1;w.investigationTime=0;}
 for(const g of w.guards){
  if(g.hp<=0)continue;
  const active=w.enemies.filter(e=>e.hp>0&&(visibleAt(w,e)||distance(g,e)<g.gear.guardRange));
  const miners=[...w.drones.filter(d=>d.state==='mine'||d.state==='handoff'||d.state==='return'||d.state==='unload'),...w.haulers.filter(h=>h.state==='work'||h.state==='return'||h.state==='unload')];
  const foe=w.doctrine==='convoy'||g.gear.threatTracking?active.sort((a,b)=>{
   const urgency=(e:Enemy)=>Math.min(...miners.map(d=>distance(e,d)),300)*(g.gear.threatTracking?1.65:1.25)+distance(e,g)*.35;
   return urgency(a)-urgency(b);
  })[0]:active.sort((a,b)=>distance(a,g)-distance(b,g))[0];
  const site=w.activeTarget&&w.phase==='mining'?w.definition.pois.find(p=>p.id===w.activeTarget):undefined;
  if(site&&!w.investigatorClaims.has(site.id)&&w.investigatorId<0){const eligible=w.guards.filter(p=>p.hp>0).sort((a,b)=>distance(a,site)-distance(b,site)||a.id-b.id);w.investigatorId=eligible[0]?.id??-1;}
  const patrol=!!site&&w.investigatorId===g.id&&!w.investigatorClaims.has(site.id);
  const urgent=!!foe&&(distance(foe,g)<115||miners.some(d=>distance(foe,d)<100));
  const protect=miners.length?(foe?miners.reduce((best,d)=>distance(d,foe)<distance(best,foe)?d:best):miners[g.id%miners.length]):w.base;
  const anchor=foe&&distance(foe,protect)<(w.doctrine==='convoy'?205:320)?foe:protect;
  const offset=foe?35:25;
  const goal=patrol&&!urgent?site!:{x:anchor.x+Math.cos(w.time*1.5+g.id*Math.PI)*offset,y:anchor.y+Math.sin(w.time*1.5+g.id*Math.PI)*offset};
  const point=clearSegment(g,goal,w.rocks,-1,10)?goal:waypoint(w,g,goal,patrol&&!urgent?'investigate:'+site!.id:'guard'+(foe?.id??-1)+':'+('id' in protect?protect.id:-1));
  const dx=point.x-g.x,dy=point.y-g.y,len=Math.hypot(dx,dy);
  const motor=movementFactor(g,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed);
  g.vx+=(dx/Math.max(1,len)*Math.min(150,len*3)*g.gear.speed*motor-g.vx)*Math.min(1,dt*4*g.gear.accel);g.vy+=(dy/Math.max(1,len)*Math.min(150,len*3)*g.gear.speed*motor-g.vy)*Math.min(1,dt*4*g.gear.accel);
  g.x=Math.max(10,Math.min(W-10,g.x+g.vx*dt));g.y=Math.max(10,Math.min(H-10,g.y+g.vy*dt));separateRock(w,g);
  if(len>2)g.angle=Math.atan2(g.vy,g.vx);
  g.cooldown-=dt;
  const inRange=active.filter(e=>distance(g,e)<g.gear.guardRange&&clearSegment(g,e,w.rocks,-1,0));
  const shot=w.doctrine==='convoy'||g.gear.threatTracking?inRange.sort((a,b)=>Math.min(...miners.map(d=>distance(a,d)),300)-Math.min(...miners.map(d=>distance(b,d)),300))[0]:inRange.find(e=>e===foe)??inRange[0];
  if(shot&&g.cooldown<=0){
   effect(w,{type:'guardShot',x:g.x,y:g.y,tx:shot.x,ty:shot.y},.3);shot.hp--;w.intercepts++;g.cooldown=g.gear.guardCooldown;
   if(shot.hp<=0)effect(w,{type:'enemyDead',x:shot.x,y:shot.y},.8);
  }
  if(patrol&&!urgent&&distance(g,site!)<28){
   w.investigatorClaims.set(site!.id,-1-g.id);w.activeInvestigations.add(site!.id);
   w.poiProgress[site!.id]=Math.min(INVESTIGATION_DURATION,(w.poiProgress[site!.id]??0)+dt);
   if((w.poiProgress[site!.id]??0)>=INVESTIGATION_DURATION){discover(w,site!.id);clearTarget(w);}
  }
 }
 if(w.company.turret){
  w.turretCooldown=Math.max(0,w.turretCooldown-dt);
  const foe=w.enemies.filter(e=>e.hp>0&&distance(e,HOME)<180&&clearSegment(HOME,e,w.rocks,-1,0)).sort((a,b)=>distance(a,HOME)-distance(b,HOME))[0];
  if(foe&&w.turretCooldown<=0){effect(w,{type:'turretShot',x:HOME.x,y:HOME.y-10,tx:foe.x,ty:foe.y},.35);foe.hp--;w.intercepts++;w.turretCooldown=.8;if(foe.hp<=0)effect(w,{type:'enemyDead',x:foe.x,y:foe.y},.8);}
 }
}
export function step(w:World,dt=STEP){
 if(w.phase==='done')return;
 w.time+=dt;w.effects.forEach(e=>{e.life-=dt;if(e.type==='transfer'&&e.life<=0){const items=e.items??Array.from({length:e.amount??0},(_,i)=>({mineral:'ferrite' as const,legacyRich:i<(e.richAmount??0)}));w.delivered+=cargoValue(items);w.deliveredFragments+=items.length;for(const item of items)w.deliveredByMineral[item.mineral]++;if(items.some(item=>item.mineral!=='ferrite'||item.legacyRich)&&!w.progress.richSampled){w.progress.richSampled=true;discover(w,'first_rich_sample');}}});w.effects=w.effects.filter(e=>e.life>0);
 for(const o of w.ores)o.age=(o.age??1)+dt;
 if(w.phase==='aftermath'){w.aftermath+=dt;if(w.aftermath>=2.5&&!w.effects.some(e=>e.type==='transfer'))w.phase='done';return;}
 if(w.time>=w.missionDuration&&w.phase==='mining'){w.phase='recall';clearTarget(w);clearSurvey(w);}
 if(w.phase==='recall'&&w.time>w.missionDuration+180){
  for(const d of [...w.drones,...w.haulers])if(d.state!=='dead'&&d.state!=='docked'){dropCargo(w,d);d.state='dead';w.recallFailures++;}
  for(const s of w.scouts)if(s.state!=='dead'&&s.state!=='docked'){s.state='dead';w.recallFailures++;}
 }
 w.investigatorClaims.clear();w.activeInvestigations.clear();
 updateRivals(w,dt);
 updateScouts(w,dt);
 if(++w.scanTicks%6===0)updateKnowledge(w);
 for(const d of w.drones){
  const waiting=waitingForWork.get(d);
  if(d.state==='docked'&&waiting&&w.phase==='mining'&&w.time>=waiting.checkAt){
   waiting.checkAt=w.time+.5;
   // Claims can become free, fresh ore can mature, or sensors can identify a
   // deposit without changing the chart/ore count. Recheck actual work too.
   workDecisions.delete(d);
   if(minerWork(w,d,d.gear.cargo-d.cargo)){waitingForWork.delete(d);d.state='mine';d.berth=-1;d.pathKey='';d.wander=0;}
  }
  if(d.state==='dead'||d.state==='docked'){releaseMinerClaims(w,d);continue;}
  if(d.state==='unload'){
   releaseMinerClaims(w,d);
   d.unloadTime+=dt;
   const duration=.7, sent=Math.min(d.unloadCargo,Math.floor(d.unloadTime/duration*d.unloadCargo));
   const amount=d.cargo-(d.unloadCargo-sent);
   if(amount>0){const items=d.cargoItems.splice(0,amount);effect(w,{type:'transfer',x:d.x,y:d.y,tx:w.base.x,ty:w.base.y+7,amount,items},.35);}
   if(d.unloadTime>=1.15){
    if(w.phase==='recall'||waitingForWork.has(d)||!w.rocks.some(r=>r.hp>0)&&!w.ores.length)d.state='docked';
    else{d.state='mine';d.berth=-1;d.wander=0;d.pathKey='';}
   }
   continue;
  }
  d.cooldown=Math.max(0,d.cooldown-dt);
  trimMinerClaims(w,d,w.phase==='mining'&&d.state==='mine'?d.gear.cargo-d.cargo:0);
  const room=d.gear.cargo-d.cargo;
  const extractable=w.rocks.some(r=>r.hp>0&&room>0&&exploredAt(w,r)&&(!w.identifiedRocks.has(r.id)||canExtract(d.kind,r.mineral,w.company.extractionUpgrades)));
  const collectable=w.ores.some(o=>o.value<=room&&exploredAt(w,o));
  const hullExhausted=d.kind==='impactMiner'&&d.hp<=1&&!w.ores.some(o=>o.value<=room&&distance(d,o)<130);
  const mustReturn=w.phase==='recall'||room===0||d.cargo>0&&!extractable&&!collectable||!w.rocks.some(r=>r.hp>0)&&!w.ores.length||hullExhausted;
  if(d.state==='handoff'&&(w.time>=d.handoffUntil||!w.haulers.some(h=>h.id===d.haulerId&&h.state==='work'&&h.capacity>h.cargo))){
   const h=w.haulers.find(h=>h.id===d.haulerId);if(h)h.assignedMiner=-1;d.haulerId=-1;d.state='return';
  }
  if(d.state==='mine'&&mustReturn){
   if(hullExhausted)waitingForWork.set(d,{checkAt:w.time+.5});
   const h=d.cargo>0&&w.phase==='mining'&&d.hp>1?w.haulers.filter(h=>h.state==='work'&&h.capacity>h.cargo&&h.assignedMiner<0&&distance(d,h)<225).sort((a,b)=>distance(d,a)-distance(d,b))[0]:undefined;
   if(h){d.state='handoff';d.haulerId=h.id;d.meetX=d.x;d.meetY=d.y;d.handoffUntil=w.time+Math.min(5,1.8+distance(d,h)/60);h.assignedMiner=d.id;releaseHaulerClaim(w,h);d.pathKey='';}
   else d.state='return';
  }
  if(d.state!=='mine')releaseMinerClaims(w,d);
  let target:Point,controlled=false,aim:Point|undefined;
  let retreating=false;
  d.ramTarget=false;
  if(d.state==='return'){w.minerReturnTime+=dt;target=waypoint(w,d,berthFor(w,d),'home'+d.berth);controlled=true;}
  else if(d.state==='handoff'){target={x:d.meetX,y:d.meetY};controlled=true;}
   else{
   const job=minerWork(w,d,room);
   const retreat=dangerRetreat(w,d);
   if(retreat)releaseMinerClaims(w,d);
   if(retreat){if(d.pathKey!=='retreat')w.disengagements++;target=waypoint(w,d,retreat,'retreat');controlled=true;retreating=true;}
   else{
    let oreGoal:Point|undefined,oreId=-1;
    if(job?.kind!=='ore')releaseMinerClaims(w,d);
    const grouped=job?.kind==='ore'?w.ores.filter(o=>o.mineral===job.ore.mineral&&distance(o,job.ore)<65&&exploredAt(w,o)&&(o.age??1)>=ORE_PICKUP_DELAY).sort((a,b)=>Number(b.id===job.ore.id)-Number(a.id===job.ore.id)||distance(d,a)-distance(d,b)):[];
    const selected=job?.kind==='ore'?assignMinerOre(w,d,grouped):undefined;
    if(selected){oreGoal=oreApproach(w,d,selected);oreId=selected.id;}
    if(oreGoal){target=waypoint(w,d,oreGoal,'ore'+oreId);controlled=true;}
    else if(job?.kind==='rock'&&!(d.kind==='impactMiner'&&d.hp<=1)){
     const r=job.rock;selectRock(d,r,w);
     d.ramTarget=d.kind==='impactMiner'&&w.identifiedRocks.has(r.id);
     const recovering=d.kind==='impactMiner'&&(d.cooldown>0||!d.armed);
     const point=d.kind==='laserMiner'?{x:d.approachX,y:d.approachY}:recovering?{x:d.recoveryX,y:d.recoveryY}:r;
     target=waypoint(w,d,point,'rock'+r.id+(recovering?':recover':''),d.kind==='impactMiner'&&!recovering?r.id:-1);
     controlled=true;aim=d.kind==='laserMiner'?r:undefined;
    }
    else{
     w.idleTime+=dt;
     d.wander-=dt;
     if(d.wander<=0||!d.pathKey.startsWith('prospect')){
      const next=frontier(w,d,90,w.drones.filter(p=>p!==d&&p.state==='mine').map(p=>({x:p.targetX,y:p.targetY})));
      if(next){d.targetX=next.x;d.targetY=next.y;d.wander=3;d.pathKey='';}
      else{
       // No work or reachable frontier: finish this unit's shift honestly.
       // A later Scout discovery/new salvage can wake a parked unit again.
       waitingForWork.set(d,{checkAt:w.time+.5});
       d.state='return';releaseMinerClaims(w,d);d.pathKey='';
      }
     }
     target=d.state==='return'?waypoint(w,d,berthFor(w,d),'home'+d.berth):waypoint(w,d,{x:d.targetX,y:d.targetY},'prospect'+d.targetX+':'+d.targetY);controlled=true;
    }
    }
  }
  if(d.kind==='laserMiner'&&!retreating&&d.state==='mine'&&room>0&&d.cooldown<=0){
   const r=aim&&w.rocks.find(rock=>rock.id===d.targetRock&&rock.hp>0&&w.identifiedRocks.has(rock.id)&&canExtract(d.kind,rock.mineral,w.company.extractionUpgrades)&&distance(d,rock)<rock.r+d.gear.laserRange&&clearSegment(d,rock,w.rocks,rock.id,0));
   if(r){hit(w,r,d,true);w.shots++;d.cooldown=d.gear.laserCooldown;aim=r;effect(w,{type:'laser',x:d.x,y:d.y,tx:r.x,ty:r.y},.35);}
  }
  if(d.recoil>0){
   // Motor cannot cancel the impulse. This creates visible clearance for a fresh run-up.
   d.recoil=Math.max(0,d.recoil-dt);d.vx*=Math.exp(-1.1*dt);d.vy*=Math.exp(-1.1*dt);
  }else{
   const wobble=controlled&&d.state==='mine'&&d.kind==='impactMiner'?(w.doctrine==='fullContact'?0:Math.sin(w.time*2.1+d.id*1.7)*.1):controlled?0:Math.sin(w.time*2.1+d.id*1.7)*.3;
   const targetDistance=distance(d,target),holding=!!aim&&d.state==='mine'&&targetDistance<10;
   const look=holding?aim:targetDistance>6?target:undefined;
   const desired=look?Math.atan2(look.y-d.y,look.x-d.x)+wobble:d.angle;
   const delta=Math.atan2(Math.sin(desired-d.angle),Math.cos(desired-d.angle));
   // Cargo navigation is reliable; unassisted exploration oversteers and wanders.
   const turn=(controlled?3.2:1.6)*d.gear.turn;
   d.angle+=Math.max(-dt*turn,Math.min(dt*turn,delta));
   const speed=(d.state==='return'?82:controlled?67:58)*d.gear.speed*movementFactor(d,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)*Math.max(controlled?.12:.4,Math.cos(delta));
   const desiredSpeed=Math.min(speed,targetDistance*4);
   const response=(controlled?8:2.2)*d.gear.accel*(retreating?d.gear.retreatAccel:1);
   const docking=d.state==='return'&&distance(d,target)<24;
   // In recovery and at a laser standoff, steer to a stationary point and hold
   // the hull angle. A continuously moving radial point made the miner orbit.
   const stationKeep=d.state==='mine'&&controlled&&targetDistance<12;
   d.vx+=(((docking||holding||stationKeep)?(target.x-d.x)*2:Math.cos(d.angle)*desiredSpeed)-d.vx)*Math.min(1,response*dt);
   d.vy+=(((docking||holding||stationKeep)?(target.y-d.y)*2:Math.sin(d.angle)*desiredSpeed)-d.vy)*Math.min(1,response*dt);
  }
  if(!d.armed&&d.recoil===0&&w.rocks.every(r=>r.id!==d.lastRock||r.hp<=0||distance(d,r)>r.r+25))d.armed=true;
  d.x+=d.vx*dt;d.y+=d.vy*dt;
  d.x=Math.max(10,Math.min(W-10,d.x));d.y=Math.max(10,Math.min(H-10,d.y));
  // Physical collisions apply to EVERY active state, including full cargo and recall.
  for(let pass=0;pass<3;pass++)for(const r of w.rocks){
   const dist=distance(d,r);if(r.hp<=0||dist>=r.r+8)continue;
   const nx=dist?(d.x-r.x)/dist:0,ny=dist?(d.y-r.y)/dist:1;
   const approach=-(d.vx*nx+d.vy*ny);
   if(d.state==='mine'&&d.kind==='impactMiner'&&d.ramTarget&&d.targetRock===r.id&&d.hp>1&&d.armed&&d.cooldown===0&&approach>30&&canExtract(d.kind,r.mineral,w.company.extractionUpgrades)){
    hit(w,r,d,false);d.hp--;w.collisions++;d.armed=false;d.lastRock=r.id;d.cooldown=d.gear.ramCooldown;d.recoil=d.gear.ramRecoil;d.vx=nx*145;d.vy=ny*145;d.pathKey='';
    d.targetRock=r.id;d.targetHold=w.time;const recovery=workPosition(w,r,Math.atan2(ny,nx),55);d.recoveryX=recovery.x;d.recoveryY=recovery.y;
    if(!w.company.progress.farSurveyed){d.wander=0;}
    if(d.hp<=0){d.hp=0;dropCargo(w,d);d.state='dead';effect(w,{type:'dead',x:d.x,y:d.y},1);}
   }else{
    const inward=d.vx*nx+d.vy*ny;if(inward<0){d.vx-=inward*nx;d.vy-=inward*ny;}
    // A slow brush at the rock boundary cannot build enough normal speed to
    // become a valid ram. Back out to a fixed run-up point, then re-arm.
    if(d.ramTarget&&d.targetRock===r.id&&d.armed&&d.cooldown===0&&approach<=30&&canExtract(d.kind,r.mineral,w.company.extractionUpgrades)){
     d.armed=false;d.lastRock=r.id;d.pathKey='';
     const recovery=workPosition(w,r,Math.atan2(ny,nx),55);d.recoveryX=recovery.x;d.recoveryY=recovery.y;
    }
    if(d.state==='mine'&&!controlled){d.wander=0;}
   }
   d.x=r.x+nx*(r.r+8.2);d.y=r.y+ny*(r.r+8.2);
  }
  if(d.state==='dead')continue;
  // Pickup continues while recalling, but never adds cargo after destruction.
  for(let i=w.ores.length-1;i>=0;i--){const ore=w.ores[i];if((ore.age??1)>=ORE_PICKUP_DELAY&&distance(d,ore)<18&&d.cargo+ore.value<=d.gear.cargo&&availableTo(w,ore.id,'miner',d.id)){
   // Passing directly through an unclaimed fragment is free work. Preserve
   // another collector's reservation, and release any displaced queue slot.
   d.cargoItems.push({mineral:ore.mineral,legacyRich:ore.rich});w.minerPickups++;if(ore.rich&&!w.progress.farSurveyed){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}effect(w,{type:'ore',x:ore.x,y:ore.y,amount:ore.value,items:[{mineral:ore.mineral,legacyRich:ore.rich}]},.7);w.ores.splice(i,1);releaseClaim(w,ore.id);trimMinerClaims(w,d);
  }}
  if(d.state==='return'&&distance(d,berthFor(w,d))<2&&Math.hypot(d.vx,d.vy)<8){
   d.state='unload';d.unloadTime=0;d.unloadCargo=d.cargo;d.vx=0;d.vy=0;
  }
 }
 updateHaulers(w,dt);
 // Environmental exposure is fixed-step simulation damage, using the same
 // destruction and physical cargo-salvage path as combat.
 for(const d of w.drones)if(d.state!=='dead'&&d.state!=='docked'){
  d.hp-=radiationRate(d,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)*dt;
  if(d.hp<=0){d.hp=0;dropCargo(w,d);d.state='dead';effect(w,{type:'dead',x:d.x,y:d.y},1);}
 }
 for(const h of w.haulers)if(h.state!=='dead'&&h.state!=='docked'){
  h.hp-=radiationRate(h,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)*dt;
  if(h.hp<=0){h.hp=0;dropCargo(w,h);h.state='dead';releaseHaulerClaim(w,h);effect(w,{type:'dead',x:h.x,y:h.y},1);}
 }
 for(const s of w.scouts)if(s.state!=='dead'&&s.state!=='docked'){
  s.hp-=radiationRate(s,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)*dt;
  if(s.hp<=0){s.hp=0;s.state='dead';effect(w,{type:'dead',x:s.x,y:s.y},1);}
 }
 if(w.surveyFocus&&!w.scouts.some(s=>s.state!=='dead'&&s.state!=='docked'))w.surveyFocus=null;
 for(const g of w.guards)if(g.hp>0){g.hp=Math.max(0,g.hp-radiationRate(g,w.company.environmentUpgrades,w.company.outpost,w.company.worldSeed)*dt);if(g.hp===0)effect(w,{type:'dead',x:g.x,y:g.y},1);}
 if(w.scanTicks%6===0)updateKnowledge(w);
 if(w.activeTarget&&!w.guards.some(g=>g.hp>0))clearTarget(w);
 const productive=[...w.drones,...w.haulers];
 if(productive.every(d=>d.state==='dead')){w.phase='aftermath';w.aftermath=0;clearTarget(w);clearSurvey(w);}
 else if(productive.every(d=>d.state==='dead'||d.state==='docked')&&w.scouts.every(s=>s.state==='dead'||s.state==='docked')&&!w.effects.some(e=>e.type==='transfer')){w.phase='done';clearTarget(w);clearSurvey(w);}
}
export function settle(c:Company,w:World):Company{
 if(c.rounds>w.company.rounds)return c;
 const rockHp={...c.rockHp};for(const r of w.rocks)if(r.hp<r.max)rockHp[r.id]=r.hp;
 const ores=w.ores.map(o=>({x:o.x,y:o.y,value:1 as const,rich:!!o.rich,mineral:o.mineral}));
 const progress={...w.progress};
 return awardTech({...c,credits:c.credits+w.delivered,total:c.total+w.delivered,rounds:c.rounds+1,rockHp,ores,progress,poiProgress:{...w.poiProgress},identifiedRocks:[...w.identifiedRocks],explored:encodeMap(w.explored),discoveredPois:[...w.discoveredPois]},w.pendingTech.map(e=>e.id));
}
