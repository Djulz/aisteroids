import { route, clearSegment, type Point } from './navigation.ts';
import {DOCTRINE_AI,validDoctrine,type DoctrineId} from './doctrines.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY,type FleetComposition,type FleetType} from './fleet.ts';
import {awardTech,TECH_DISCOVERIES,researched,type DiscoveryId} from './research.ts';
import {POIS,blankMap,decodeMap,encodeMap,hasCell,mapCount,mergeMap,reveal,type PoiId,type Sensor,CELL,COLS,ROWS,MAP_W,MAP_H} from './knowledge.ts';
// Fixed-step seeded simulation: independent of browser and rendering.
export const W=800,H=930,ROUND_TIME=30,STEP=1/60,CAPACITY=3;
export const HOME={x:200,y:550}, FAR={x:535,y:770};
export type LaunchSite='home'|'far';
export type Progress={farSurveyed:boolean;richSampled:boolean;rivalSeen:boolean;outpostSurveyed:boolean};
export const freshProgress=():Progress=>({farSurveyed:false,richSampled:false,rivalSeen:false,outpostSurveyed:false});
export type StoredOre={x:number;y:number;value:1;rich:boolean};
export type Company={version:10;credits:number;fleetCapacity:number;fleetComposition:FleetComposition;unlockedTypes:FleetType[];techPointsAvailable:number;techPointsEarned:number;uniqueTechDiscoveries:DiscoveryId[];unlockedTechnologies:string[];grandfatheredEscort:boolean;turret:boolean;rounds:number;total:number;outpost:boolean;launchSite:LaunchSite;worldSeed:number;rockHp:Record<string,number>;ores:StoredOre[];progress:Progress;explored:string;discoveredPois:PoiId[];doctrine:DoctrineId};
export const freshCompany=():Company=>({version:10,credits:0,fleetCapacity:1,fleetComposition:freshComposition(),unlockedTypes:['impactMiner','scout'],techPointsAvailable:0,techPointsEarned:0,uniqueTechDiscoveries:[],unlockedTechnologies:[],grandfatheredEscort:false,turret:false,rounds:0,total:0,outpost:false,launchSite:'home',worldSeed:7,rockHp:{},ores:[],progress:freshProgress(),explored:encodeMap(blankMap()),discoveredPois:[],doctrine:'standard'});
export type Purchase='fleetSlot'|'turret'|'outpost';
export function unlocked(c:Company,item:Purchase){return item==='turret'?c.progress.rivalSeen:item==='outpost'?c.progress.outpostSurveyed:true;}
export const FLEET_SLOT_PRICES=[0,28,58,155,340,480] as const;
export function cost(c:Company,item:Purchase){return item==='fleetSlot'?FLEET_SLOT_PRICES[c.fleetCapacity]??Infinity:item==='turret'?18:38;}
export function buy(c:Company,item:Purchase):Company|null{
 if(!['fleetSlot','turret','outpost'].includes(item)||!unlocked(c,item)||c.credits<cost(c,item)||(item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:c[item]))return null;
 return {...c,credits:c.credits-cost(c,item),...(item==='fleetSlot'?{fleetCapacity:c.fleetCapacity+1}:{[item]:true})};
}
export const capacity=()=>CAPACITY;
export const baseFor=(c:Company)=>c.outpost&&c.launchSite==='far'?FAR:HOME;
export type Rock={id:number;x:number;y:number;r:number;hp:number;max:number;shape:number[];rich?:boolean};
export type Ore={id:number;x:number;y:number;value:1;rich?:boolean;originX?:number;originY?:number;age?:number};
export type MinerType='impactMiner'|'laserMiner';
export type MinerCapabilities={cargo:3;speed:number;accel:number;turn:number;ramDamage:2;ramRecoil:number;ramCooldown:number;laserRange:number;laserCooldown:number;retreatAccel:number};
export type GuardCapabilities={speed:number;accel:number;guardRange:number;guardCooldown:number;threatTracking:boolean};
const minerCapabilities=(c:Company):MinerCapabilities=>({cargo:3,speed:1,accel:1,turn:1,ramDamage:2,ramRecoil:researched(c,'impactRecovery')?.4:.55,ramCooldown:researched(c,'impactRecovery')?.65:1,laserRange:85,laserCooldown:researched(c,'rapidCooling')?1.6:2,retreatAccel:1});
const guardCapabilities=(c:Company):GuardCapabilities=>({speed:1,accel:1,guardRange:135,guardCooldown:1.05,threatTracking:researched(c,'threatTracking')});
export type Drone={id:number;kind:MinerType;name:string;gear:MinerCapabilities;x:number;y:number;angle:number;hp:number;maxHp:number;cargo:number;richCargo:number;oreQueue:number[];cooldown:number;targetX:number;targetY:number;wander:number;vx:number;vy:number;recoil:number;armed:boolean;lastRock:number;targetRock:number;targetHold:number;approachX:number;approachY:number;recoveryX:number;recoveryY:number;ramTarget:boolean;berth:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;meetX:number;meetY:number;handoffUntil:number;haulerId:number;state:'mine'|'handoff'|'unload'|'return'|'docked'|'dead'};
export type Hauler={id:number;name:string;x:number;y:number;vx:number;vy:number;angle:number;hp:number;maxHp:number;cargo:number;richCargo:number;capacity:10|14;berth:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;assignedMiner:number;targetOre:number;blockedOre:number;blockedUntil:number;lastWork:number;state:'work'|'return'|'unload'|'docked'|'dead';task:'Collecting'|'Rendezvous'|'Returning'|'Unloading'|'Assisting'|'Docked'|'Destroyed'};
export type Enemy={id:number;x:number;y:number;vx:number;vy:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number};
export type Guard={id:number;name:string;gear:GuardCapabilities;maxHp:number;x:number;y:number;vx:number;vy:number;angle:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number};
export type Scout={id:number;name:string;x:number;y:number;vx:number;vy:number;angle:number;hp:number;maxHp:number;targetX:number;targetY:number;targetUntil:number;path:Point[];pathKey:string;pathAge:number;state:'exploring'|'avoiding'|'return'|'docked'|'dead'};
export type Effect={type:'transfer'|'handoff'|'hit'|'laser'|'ore'|'deposit'|'dead'|'enemyShot'|'guardShot'|'turretShot'|'enemyDead';x:number;y:number;tx?:number;ty?:number;life:number;max:number;amount?:number;richAmount?:number};
export type TechEvent={id:DiscoveryId;time:number};
export const RESEARCH_STATION={x:260,y:390}, EXPERIMENTAL_PROBE={x:420,y:700};
export type OreClaim={ownerKind:'miner'|'hauler';ownerId:number};
export type World={time:number;phase:'mining'|'recall'|'aftermath'|'done';aftermath:number;company:Company;doctrine:DoctrineId;progress:Progress;rocks:Rock[];ores:Ore[];oreClaims:Map<number,OreClaim>;claimsAssigned:number;claimsReleased:number;drones:Drone[];haulers:Hauler[];scouts:Scout[];enemies:Enemy[];guards:Guard[];effects:Effect[];pendingTech:TechEvent[];explored:Uint8Array;visible:Uint8Array;mapRevision:number;discoveredPois:Set<PoiId>;newSignals:PoiId[];activeTarget:PoiId|null;investigationTime:number;investigatorId:number;scanTicks:number;delivered:number;transferred:number;haulerPickups:number;minerPickups:number;haulerDelivered:number;minerReturnTime:number;haulerStalledTime:number;extracted:number;richExtracted:number;lost:number;collisions:number;shots:number;mined:number;attacks:number;intercepts:number;disengagements:number;idleTime:number;wave:number;base:typeof HOME;rng:()=>number;nextId:number;turretCooldown:number};
export function discover(w:World,id:DiscoveryId){if(!Object.hasOwn(TECH_DISCOVERIES,id)||w.company.uniqueTechDiscoveries.includes(id)||w.pendingTech.some(e=>e.id===id))return;w.pendingTech.push({id,time:w.time});}
export function random(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function createWorld(company:Company,seed=7):World{
 const rng=random(seed^Math.imul(company.rounds,7919)),rocksRng=random(seed);
 const base=baseFor(company);
 const doctrine=validDoctrine(company.doctrine);
 if(fleetError(company))throw new Error(fleetError(company));
 const composition={...company.fleetComposition};
 const w:World={time:0,phase:'mining',aftermath:0,company:{...company,fleetComposition:composition,unlockedTypes:[...company.unlockedTypes],doctrine},doctrine,progress:{...company.progress},rocks:[],ores:company.ores.map((o,i)=>({...o,id:100+i,age:1})),oreClaims:new Map(),claimsAssigned:0,claimsReleased:0,drones:[],haulers:[],scouts:[],enemies:[],guards:[],effects:[],pendingTech:[],explored:decodeMap(company.explored)??blankMap(),visible:blankMap(),mapRevision:0,discoveredPois:new Set(company.discoveredPois),newSignals:[],activeTarget:null,investigationTime:0,investigatorId:-1,scanTicks:0,delivered:0,transferred:0,haulerPickups:0,minerPickups:0,haulerDelivered:0,minerReturnTime:0,haulerStalledTime:0,extracted:0,richExtracted:0,lost:0,collisions:0,shots:0,mined:0,attacks:0,intercepts:0,disengagements:0,idleTime:0,wave:0,base,rng,nextId:100+company.ores.length,turretCooldown:0};
 const locations=[[200,440],[74,100],[285,91],[160,165],[337,224],[60,281],[242,309],[119,377],[337,419],[50,461],[296,165],[157,65]];
 locations.forEach(([x,y],id)=>{const r=id===0?18:21+rocksRng()*15,max=id===0?45:38+Math.round(r*.45);w.rocks.push({id,x:x+(id?(rocksRng()-.5)*18:0),y,r,hp:company.rockHp[id]??max,max,shape:Array.from({length:11},()=>.77+rocksRng()*.23)});});
 // Extended test field: original starting pocket plus two outer resource clusters.
 const outer=[[470,90],[650,130],[535,240],[730,310],[445,395],[600,430],[710,530],[465,610],[620,690],[745,810],[490,835],[315,755],[140,820],[75,655],[290,650],[360,870],[575,560],[700,70]];
 const outerRng=random(seed^0x5142);
 outer.forEach(([x,y],i)=>{const r=22+outerRng()*15,rich=i%3!==1,max=rich?72+Math.round(r*.45):40+Math.round(r*.4);w.rocks.push({id:12+i,x,y,r,hp:company.rockHp[12+i]??max,max,rich,shape:Array.from({length:11},()=>.77+outerRng()*.23)});});
 // Keep navigable gaps: no drone-sized pockets between touching collision circles.
 for(let i=1;i<w.rocks.length;i++){
  const r=w.rocks[i];let attempts=0;
  const room=Math.min(...w.rocks.slice(0,i).map(p=>Math.hypot(r.x-p.x,r.y-p.y)-p.r-26));
  if(room>=14)r.r=Math.min(r.r,room);
  while(w.rocks.slice(0,i).some(p=>Math.hypot(r.x-p.x,r.y-p.y)<r.r+p.r+26)&&attempts++<100){r.y+=12;if(r.y>H-45){r.y=45;r.x=Math.min(W-45,r.x+55);}}
 }
 const types:MinerType[]=[...Array.from({length:composition.impactMiner},()=> 'impactMiner' as const),...Array.from({length:composition.laserMiner},()=> 'laserMiner' as const)];
 for(let i=0;i<types.length;i++){
  const kind=types[i],gear=minerCapabilities(company),maxHp=kind==='impactMiner'?15:10;
  w.drones.push({id:i,kind,name:kind==='impactMiner'?`Impact ${i+1}`:`Laser ${i+1}`,gear,x:base.x+(i-(types.length-1)/2)*18,y:base.y-27,angle:-Math.PI/2,hp:maxHp,maxHp,cargo:0,richCargo:0,oreQueue:[],cooldown:0,targetX:200+i*25,targetY:90,wander:3.5,vx:0,vy:0,recoil:0,armed:true,lastRock:-1,targetRock:-1,targetHold:0,approachX:0,approachY:0,recoveryX:0,recoveryY:0,ramTarget:false,berth:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,meetX:0,meetY:0,handoffUntil:0,haulerId:-1,state:'mine'});
 }
 for(let i=0;i<composition.hauler;i++)w.haulers.push({id:types.length+i,name:`Hauler ${i+1}`,x:base.x+(i-(composition.hauler-1)/2)*17,y:base.y+32,vx:0,vy:0,angle:-Math.PI/2,hp:5,maxHp:5,cargo:0,richCargo:0,capacity:researched(company,'expandedHauler')?14:10,berth:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,assignedMiner:-1,targetOre:-1,blockedOre:-1,blockedUntil:0,lastWork:0,state:'work',task:'Assisting'});
 for(let i=0;i<composition.escort;i++){const gear=guardCapabilities(company);w.guards.push({id:i,name:`Escort ${i+1}`,gear,maxHp:6,x:base.x+(i?24:-24),y:base.y-85,vx:0,vy:0,angle:-Math.PI/2,hp:6,cooldown:0,path:[],pathKey:'',pathAge:0});}
 for(let i=0;i<composition.scout;i++)w.scouts.push({id:1000+i,name:`Scout ${i+1}`,x:base.x+(i?22:-22),y:base.y+55,vx:0,vy:0,angle:-Math.PI/2,hp:6,maxHp:6,targetX:base.x,targetY:base.y,targetUntil:0,path:[],pathKey:'',pathAge:0,state:'exploring'});
 updateKnowledge(w);
 return w;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const visibleAt=(w:World,p:Point)=>hasCell(w.visible,p.x,p.y);
export const exploredAt=(w:World,p:Point)=>hasCell(w.explored,p.x,p.y);
export const investigated=(w:World,id:PoiId)=>w.company.uniqueTechDiscoveries.includes(id)||w.pendingTech.some(e=>e.id===id);
export function canTarget(w:World,id:PoiId):string|undefined{
 if(w.phase!=='mining')return 'Shift is ending.';
 if(!POIS.some(p=>p.id===id)||!w.discoveredPois.has(id))return 'Signal not discovered.';
 if(investigated(w,id))return 'Already investigated.';
 if(!w.guards.some(g=>g.hp>0))return 'Requires Escort patrol.';
}
export function lockTarget(w:World,id:PoiId){const reason=canTarget(w,id);if(reason)return {ok:false,reason};w.activeTarget=id;w.investigatorId=-1;w.investigationTime=0;for(const g of w.guards)g.pathKey='';return {ok:true};}
export function clearTarget(w:World){w.activeTarget=null;w.investigatorId=-1;w.investigationTime=0;for(const g of w.guards)g.pathKey='';}
function sensors(w:World):Sensor[]{return [
 {x:HOME.x,y:HOME.y,radius:115},...(w.company.outpost?[{x:FAR.x,y:FAR.y,radius:115}]:[]),
 ...w.drones.filter(d=>d.state!=='dead'&&d.state!=='docked').map(d=>({x:d.x,y:d.y,radius:90})),
 ...w.haulers.filter(h=>h.state!=='dead'&&h.state!=='docked').map(h=>({x:h.x,y:h.y,radius:78})),
 ...w.guards.filter(g=>g.hp>0).map(g=>({x:g.x,y:g.y,radius:100})),
 ...w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked').map(s=>({x:s.x,y:s.y,radius:165})),
];}
export function updateKnowledge(w:World){
 w.mapRevision++;
 const sources=sensors(w);reveal(w.visible,sources);mergeMap(w.explored,w.visible);
 for(const p of POIS)if(!w.discoveredPois.has(p.id)&&sources.some(s=>distance(s,p)<=s.radius)){
  w.discoveredPois.add(p.id);w.newSignals.push(p.id);
 }
 const friendly=[...w.drones.filter(d=>d.state!=='dead'&&d.state!=='docked'),...w.haulers.filter(h=>h.state!=='dead'&&h.state!=='docked'),...w.guards.filter(g=>g.hp>0),...w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked')];
 if(!w.progress.farSurveyed&&friendly.some(d=>d.x>405||d.y>650)){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}
 if(!w.progress.outpostSurveyed&&friendly.some(d=>distance(d,FAR)<('targetUntil' in d?180:'kind' in d?105:'assignedMiner' in d?93:115))){w.progress.outpostSurveyed=true;discover(w,'outpost_site_surveyed');}
 if(!w.progress.rivalSeen&&w.enemies.some(e=>e.hp>0&&sources.some(s=>distance(s,e)<=s.radius))){w.progress.rivalSeen=true;discover(w,'first_rival_contact');}
}
function frontier(w:World,unit:Point,radius:number,peerTargets:Point[]=[]):Point|undefined{
 let best:Point|undefined,score=-Infinity;
 for(let row=1;row<ROWS-1;row+=2)for(let col=1;col<COLS-1;col+=2){
  const p={x:(col+.5)*CELL,y:(row+.5)*CELL};
  if(exploredAt(w,p)||w.rocks.some(r=>r.hp>0&&distance(p,r)<r.r+12))continue;
  const travel=distance(unit,p),uncovered=[[-radius,0],[radius,0],[0,-radius],[0,radius],[0,0]].filter(([dx,dy])=>!exploredAt(w,{x:p.x+dx,y:p.y+dy})).length;
  const peer=peerTargets.some(t=>distance(t,p)<radius*1.25)?175:0;
  const value=uncovered*32-travel*.25-peer;
  if(value>score){score=value;best=p;}
 }
 return best;
}
function updateScouts(w:World,dt:number){
 for(const s of w.scouts){if(s.state==='dead'||s.state==='docked')continue;
  if(w.phase!=='mining')s.state='return';
  const foe=w.enemies.filter(e=>e.hp>0&&distance(e,s)<95).sort((a,b)=>distance(a,s)-distance(b,s))[0];
  if(foe&&s.state==='exploring')s.state='avoiding';else if(!foe&&s.state==='avoiding')s.state='exploring';
  if(s.state==='exploring'&&w.time>=s.targetUntil){
   const peers=w.scouts.filter(p=>p!==s&&p.state==='exploring').map(p=>({x:p.targetX,y:p.targetY}));
   const target=frontier(w,s,165,peers)??w.base;s.targetX=target.x;s.targetY=target.y;s.targetUntil=w.time+Math.max(2,distance(s,target)/95+1);s.pathKey='';
  }
  const target=s.state==='return'?w.base:s.state==='avoiding'&&foe?{x:Math.max(20,Math.min(W-20,s.x+(s.x-foe.x)*2)),y:Math.max(20,Math.min(H-20,s.y+(s.y-foe.y)*2))}:{x:s.targetX,y:s.targetY};
  const point=clearSegment(s,target,w.rocks,-1,9)?target:waypoint(w,s,target,`${s.state}:${Math.round(target.x)}:${Math.round(target.y)}`);
  const dx=point.x-s.x,dy=point.y-s.y,len=Math.hypot(dx,dy),speed=s.state==='avoiding'?150:125;
  s.vx+=(dx/Math.max(1,len)*Math.min(speed,len*3)-s.vx)*Math.min(1,dt*5);s.vy+=(dy/Math.max(1,len)*Math.min(speed,len*3)-s.vy)*Math.min(1,dt*5);
  s.x=Math.max(10,Math.min(W-10,s.x+s.vx*dt));s.y=Math.max(10,Math.min(H-10,s.y+s.vy*dt));separateRock(w,s);
  if(Math.hypot(s.vx,s.vy)>2)s.angle=Math.atan2(s.vy,s.vx);
  if(s.state==='return'&&(distance(s,w.base)<24||w.time>ROUND_TIME+25))s.state='docked';
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
 r.hp-=damage;w.mined++;w.extracted+=amount;if(r.rich)w.richExtracted+=amount;effect(w,{type:'hit',x:r.x,y:r.y,tx:d.x,ty:d.y,amount:laser?0.45:r.hp<=0?2:1},.45);
 const pieces=amount,baseAngle=w.rng()*Math.PI*2;
 for(let j=0;j<pieces;j++){
  let landing:Point={x:r.x+r.r+25,y:r.y};
  for(let attempt=0;attempt<12;attempt++){
   const angle=baseAngle+j*Math.PI+(w.rng()-.5)*.45+attempt*.55,radius=r.r+20+w.rng()*14;
   const candidate={x:Math.max(12,Math.min(W-12,r.x+Math.cos(angle)*radius)),y:Math.max(12,Math.min(H-12,r.y+Math.sin(angle)*radius))};
   landing=candidate;
   if(w.rocks.every(other=>other.id===r.id||other.hp<=0||distance(candidate,other)>=other.r+10))break;
  }
  w.ores.push({id:w.nextId++,x:landing.x,y:landing.y,value:1,rich:!!r.rich,originX:r.x,originY:r.y,age:0});
 }
}
function waypoint(w:World,d:Pick<Drone,'x'|'y'|'path'|'pathKey'|'pathAge'>,target:Point,key:string,ignore=-1){
 d.pathAge+=STEP;
 if(d.pathKey!==key||d.pathAge>1.5||!d.path.length){d.path=route(d,target,w.rocks,ignore,W,H);d.pathKey=key;d.pathAge=0;}
 while(d.path.length>1&&distance(d,d.path[0])<9)d.path.shift();
 // Only skip a corner after the drone has a clear line, not merely because it's close.
 if(d.path.length>1&&clearSegment(d,d.path[1],w.rocks,ignore,10))d.path.shift();
 return d.path[0]??{x:d.x,y:d.y};
}
// An ejected fragment may sit inside an asteroid's navigation clearance while
// still being reachable by the pickup radius. Navigate to a clear pickup point
// instead of routing to the fragment's blocked center.
function oreApproach(w:World,d:Drone|Hauler,ore:Ore):Point|undefined{
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
 w.lost+=d.cargo;
 for(let j=0;j<d.cargo;j++){
  const offset=w.nextId%7-3,rich=j<d.richCargo;
  w.ores.push({id:w.nextId++,x:Math.max(8,Math.min(W-8,d.x+offset*3)),y:Math.max(8,Math.min(H-8,d.y-offset*2)),value:1,rich,age:1});
 }
 d.cargo=0;d.richCargo=0;d.berth=-1;
}
// Cargo is an integer count plus its rich subset. Only station transfers create
// income; a handoff changes ownership atomically and never spawns a second ore.
export function handoff(w:World,d:Drone,h:Hauler):number{
 if(d.state==='dead'||h.state==='dead'||h.state==='docked'||h.state==='unload'||distance(d,h)>22)return 0;
 const amount=Math.min(d.cargo,h.capacity-h.cargo);
 if(amount<=0)return 0;
 const rich=Math.min(amount,d.richCargo);
 d.cargo-=amount;d.richCargo-=rich;h.cargo+=amount;h.richCargo+=rich;
 trimMinerClaims(w,d);
 h.lastWork=w.time;w.transferred+=amount;
 effect(w,{type:'handoff',x:d.x,y:d.y,tx:h.x,ty:h.y,amount},.45);
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
   if(amount>0){const richAmount=Math.min(amount,h.richCargo);h.cargo-=amount;h.richCargo-=richAmount;w.haulerDelivered+=amount;effect(w,{type:'transfer',x:h.x,y:h.y,tx:w.base.x,ty:w.base.y+7,amount,richAmount},.35);}
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
    const relevant=w.ores.filter(o=>visibleAt(w,o)&&(o.age??1)>=ORE_PICKUP_DELAY&&distance(h,o)<(h.cargo>=h.capacity-1?110:235)&&!(o.id===h.blockedOre&&w.time<h.blockedUntil)&&availableTo(w,o.id,'hauler',h.id)&&
      (w.doctrine!=='convoy'||w.drones.some(d=>d.state==='mine'&&distance(d,o)<195)));
    relevant.sort((a,b)=>distance(h,a)-distance(h,b)||a.id-b.id);
    const selected=relevant.find(o=>o.id===h.targetOre)??relevant[0];
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
  h.vx+=(((hold?dx*2:dx/Math.max(1,len)*Math.min(92,len*3)))-h.vx)*Math.min(1,dt*6);
  h.vy+=(((hold?dy*2:dy/Math.max(1,len)*Math.min(92,len*3)))-h.vy)*Math.min(1,dt*6);
  h.x=Math.max(10,Math.min(W-10,h.x+h.vx*dt));h.y=Math.max(10,Math.min(H-10,h.y+h.vy*dt));separateRock(w,h,11);
  if(Math.hypot(h.vx,h.vy)>3)h.angle=Math.atan2(h.vy,h.vx);
  if(h.state==='work'){
   for(let i=w.ores.length-1;i>=0&&h.cargo<h.capacity;i--){const o=w.ores[i];if((o.age??1)<ORE_PICKUP_DELAY||distance(h,o)>=18||!availableTo(w,o.id,'hauler',h.id))continue;
    h.cargo++;if(o.rich){h.richCargo++;if(!w.progress.farSurveyed){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}}
    w.haulerPickups++;h.lastWork=w.time;effect(w,{type:'ore',x:o.x,y:o.y,amount:1},.7);w.ores.splice(i,1);releaseClaim(w,o.id);
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
function miningTarget(w:World,d:Drone,room:number):Rock|undefined{
 const choices=w.rocks.filter(r=>r.hp>0&&room>0&&exploredAt(w,r));
 const ai=DOCTRINE_AI[w.doctrine];
 const threats=w.enemies.filter(e=>e.hp>0&&visibleAt(w,e));
 const peers=w.drones.filter(p=>p!==d&&p.state==='mine');
 const score=(r:Rock)=>{
  const travel=Math.max(0,distance(d,r)-r.r);
  const danger=threats.reduce((risk,e)=>risk+Math.max(0,260-distance(r,e))*Math.max(0,1-distance(d,e)/420),0);
  const nearby=peers.length?Math.min(...peers.map(p=>p.targetRock===r.id?0:distance(p,r))):260;
  const productiveImpact=w.doctrine==='fullContact'&&d.kind==='impactMiner'&&r.rich&&d.hp>1&&travel<200?48:0;
  return travel*ai.near+danger*ai.threat+Math.max(0,nearby-65)*ai.group-productiveImpact;
 };
 const preferred=choices.reduce<Rock|undefined>((best,r)=>!best||score(r)<score(best)?r:best,undefined);
 const locked=choices.find(r=>r.id===d.targetRock);
 // A route remains stable until a clearly better target appears; depleted targets unlock immediately.
 const selected=locked&&preferred&&(w.time-d.targetHold<1.2||score(locked)<=score(preferred)+35+ai.commit*30)?locked:preferred;
 if(selected&&selected.id!==d.targetRock){
  d.targetRock=selected.id;d.targetHold=w.time;
  const len=distance(d,selected)||1;
  d.approachX=selected.x+(d.x-selected.x)/len*(selected.r+DOCTRINE_AI[w.doctrine].standoff);
  d.approachY=selected.y+(d.y-selected.y)/len*(selected.r+DOCTRINE_AI[w.doctrine].standoff);
 }
 return selected;
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
 if(w.phase==='mining'&&(w.progress.richSampled&&w.time>=11&&w.wave===0 || w.progress.outpostSurveyed&&w.time>=30&&w.wave===1)){
  const miners=w.drones.filter(d=>d.state==='mine'||d.state==='handoff'||d.state==='return'||d.state==='unload');
  const target=miners.sort((a,b)=>b.x-a.x)[0];
  const side=w.wave%2?1:-1;
  w.enemies.push({id:w.wave++,x:Math.max(430,Math.min(W-25,(target?.x??620)+side*140)),y:Math.max(90,Math.min(H-25,(target?.y??360)-70)),vx:0,vy:0,hp:3,cooldown:1.1,path:[],pathKey:'',pathAge:0});
 }
 for(const e of w.enemies){
  if(e.hp<=0)continue;
  const miners=[...w.drones.filter(d=>d.state==='mine'||d.state==='handoff'||d.state==='return'||d.state==='unload'),...w.haulers.filter(h=>h.state==='work'||h.state==='return'||h.state==='unload')];
  const guards=w.guards.filter(g=>g.hp>0).sort((a,b)=>distance(e,a)-distance(e,b));
  const miner=miners.sort((a,b)=>distance(e,a)-distance(e,b))[0];
  const scout=w.scouts.filter(s=>s.state!=='dead'&&s.state!=='docked').sort((a,b)=>distance(e,a)-distance(e,b))[0];
  const target=guards[0]&&distance(e,guards[0])<145?guards[0]:scout&&distance(e,scout)<95?scout:miner??scout??guards[0];
  if(!target){e.vx*=.96;e.vy*=.96;continue;}
  const dist=distance(e,target),point=clearSegment(e,target,w.rocks,-1,10)?target:waypoint(w,e,target,'pursue'+('state' in target?'miner':'guard')+target.id);
  const pathDist=distance(e,point),dx=(point.x-e.x)/Math.max(1,pathDist),dy=(point.y-e.y)/Math.max(1,pathDist);
  const desired=dist>105?82:dist<70?-35:0;
  e.vx+=(dx*desired-e.vx)*Math.min(1,dt*2);e.vy+=(dy*desired-e.vy)*Math.min(1,dt*2);
  e.x=Math.max(12,Math.min(W-12,e.x+e.vx*dt));e.y=Math.max(12,Math.min(H-12,e.y+e.vy*dt));separateRock(w,e);
  e.cooldown-=dt;
  if(distance(e,target)<145&&e.cooldown<=0&&clearSegment(e,target,w.rocks,-1,0)){
   if(!w.progress.rivalSeen){w.progress.rivalSeen=true;discover(w,'first_rival_contact');}
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
  const site=w.activeTarget&&w.phase==='mining'?POIS.find(p=>p.id===w.activeTarget):undefined;
  if(site&&w.investigatorId<0){const eligible=w.guards.filter(p=>p.hp>0).sort((a,b)=>distance(a,site)-distance(b,site)||a.id-b.id);w.investigatorId=eligible[0]?.id??-1;}
  const patrol=!!site&&w.investigatorId===g.id;
  const urgent=!!foe&&(distance(foe,g)<115||miners.some(d=>distance(foe,d)<100));
  const protect=miners.length?(foe?miners.reduce((best,d)=>distance(d,foe)<distance(best,foe)?d:best):miners[g.id%miners.length]):w.base;
  const anchor=foe&&distance(foe,protect)<(w.doctrine==='convoy'?205:320)?foe:protect;
  const offset=foe?35:25;
  const goal=patrol&&!urgent?site!:{x:anchor.x+Math.cos(w.time*1.5+g.id*Math.PI)*offset,y:anchor.y+Math.sin(w.time*1.5+g.id*Math.PI)*offset};
  const point=clearSegment(g,goal,w.rocks,-1,10)?goal:waypoint(w,g,goal,patrol&&!urgent?'investigate:'+site!.id:'guard'+(foe?.id??-1)+':'+('id' in protect?protect.id:-1));
  const dx=point.x-g.x,dy=point.y-g.y,len=Math.hypot(dx,dy);
  g.vx+=(dx/Math.max(1,len)*Math.min(150,len*3)*g.gear.speed-g.vx)*Math.min(1,dt*4*g.gear.accel);g.vy+=(dy/Math.max(1,len)*Math.min(150,len*3)*g.gear.speed-g.vy)*Math.min(1,dt*4*g.gear.accel);
  g.x=Math.max(10,Math.min(W-10,g.x+g.vx*dt));g.y=Math.max(10,Math.min(H-10,g.y+g.vy*dt));separateRock(w,g);
  if(len>2)g.angle=Math.atan2(g.vy,g.vx);
  g.cooldown-=dt;
  const inRange=active.filter(e=>distance(g,e)<g.gear.guardRange&&clearSegment(g,e,w.rocks,-1,0));
  const shot=w.doctrine==='convoy'||g.gear.threatTracking?inRange.sort((a,b)=>Math.min(...miners.map(d=>distance(a,d)),300)-Math.min(...miners.map(d=>distance(b,d)),300))[0]:inRange.find(e=>e===foe)??inRange[0];
  if(shot&&g.cooldown<=0){
   effect(w,{type:'guardShot',x:g.x,y:g.y,tx:shot.x,ty:shot.y},.3);shot.hp--;w.intercepts++;g.cooldown=g.gear.guardCooldown;
   if(shot.hp<=0)effect(w,{type:'enemyDead',x:shot.x,y:shot.y},.8);
  }
  if(patrol){
   if(!urgent&&distance(g,site!)<24)w.investigationTime+=dt;else w.investigationTime=0;
   if(w.investigationTime>=1.25){discover(w,site!.id);clearTarget(w);}
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
 w.time+=dt;w.effects.forEach(e=>{e.life-=dt;if(e.type==='transfer'&&e.life<=0){w.delivered+=e.amount??0;if(e.richAmount&&!w.progress.richSampled){w.progress.richSampled=true;discover(w,'first_rich_sample');}}});w.effects=w.effects.filter(e=>e.life>0);
 for(const o of w.ores)o.age=(o.age??1)+dt;
 if(w.phase==='aftermath'){w.aftermath+=dt;if(w.aftermath>=2.5&&!w.effects.some(e=>e.type==='transfer'))w.phase='done';return;}
 if(w.time>=ROUND_TIME&&w.phase==='mining'){w.phase='recall';clearTarget(w);}
 updateRivals(w,dt);
 updateScouts(w,dt);
 if(++w.scanTicks%6===0)updateKnowledge(w);
 for(const d of w.drones){
  if(d.state==='dead'||d.state==='docked'){releaseMinerClaims(w,d);continue;}
  if(d.state==='unload'){
   releaseMinerClaims(w,d);
   d.unloadTime+=dt;
   const duration=.7, sent=Math.min(d.unloadCargo,Math.floor(d.unloadTime/duration*d.unloadCargo));
   const amount=d.cargo-(d.unloadCargo-sent);
   if(amount>0){const richAmount=Math.min(amount,d.richCargo);d.cargo-=amount;d.richCargo-=richAmount;effect(w,{type:'transfer',x:d.x,y:d.y,tx:w.base.x,ty:w.base.y+7,amount,richAmount},.35);}
   if(d.unloadTime>=1.15){
    if(w.phase==='recall'||!w.rocks.some(r=>r.hp>0)&&!w.ores.length)d.state='docked';
    else{d.state='mine';d.berth=-1;d.wander=0;d.pathKey='';}
   }
   continue;
  }
  d.cooldown=Math.max(0,d.cooldown-dt);
  trimMinerClaims(w,d,w.phase==='mining'&&d.state==='mine'?d.gear.cargo-d.cargo:0);
  const room=d.gear.cargo-d.cargo;
  const extractable=w.rocks.some(r=>r.hp>0&&room>0);
  const collectable=w.ores.some(o=>o.value<=room);
  const mustReturn=w.phase==='recall'||room===0||d.cargo>0&&!extractable&&!collectable||!w.rocks.some(r=>r.hp>0)&&!w.ores.length||d.kind==='impactMiner'&&d.hp<=1&&!w.ores.some(o=>o.value<=room&&distance(d,o)<130);
  if(d.state==='handoff'&&(w.time>=d.handoffUntil||!w.haulers.some(h=>h.id===d.haulerId&&h.state==='work'&&h.capacity>h.cargo))){
   const h=w.haulers.find(h=>h.id===d.haulerId);if(h)h.assignedMiner=-1;d.haulerId=-1;d.state='return';
  }
  if(d.state==='mine'&&mustReturn){
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
   const r=d.kind==='impactMiner'&&d.hp<=1?undefined:miningTarget(w,d,room);
   const ores=w.ores.filter(o=>visibleAt(w,o)&&(o.age??1)>=ORE_PICKUP_DELAY&&o.value<=room&&(distance(d,o)<130||!r)&&availableTo(w,o.id,'miner',d.id)).sort((a,b)=>distance(d,a)-distance(d,b)||a.id-b.id);
   const retreat=dangerRetreat(w,d);
   if(retreat)releaseMinerClaims(w,d);
   const prospecting=w.company.rounds>=4&&w.company.rounds%5===4&&w.time<9&&d.cargo===0;
   if(retreat){if(d.pathKey!=='retreat')w.disengagements++;target=waypoint(w,d,retreat,'retreat');controlled=true;retreating=true;}
   else if(prospecting){
    if(!d.pathKey.startsWith('survey:')){const next=frontier(w,d,90,w.drones.filter(p=>p!==d).map(p=>({x:p.targetX,y:p.targetY})));if(next){d.targetX=next.x;d.targetY=next.y;}d.pathKey='';}
    target=waypoint(w,d,{x:d.targetX,y:d.targetY},`survey:${d.targetX}:${d.targetY}`);controlled=true;
   }
   else{
    let oreGoal:Point|undefined,oreId=-1;
    const selected=assignMinerOre(w,d,ores);
    if(selected){oreGoal=oreApproach(w,d,selected);oreId=selected.id;}
    if(oreGoal){target=waypoint(w,d,oreGoal,'ore'+oreId);controlled=true;}
    else if(r){
     d.ramTarget=d.kind==='impactMiner';
     const recovering=d.kind==='impactMiner'&&(d.cooldown>0||!d.armed);
     const point=d.kind==='laserMiner'?{x:d.approachX,y:d.approachY}:recovering?{x:d.recoveryX,y:d.recoveryY}:r;
     target=waypoint(w,d,point,'rock'+r.id+(recovering?':recover':''),recovering?-1:r.id);
     controlled=true;aim=d.kind==='laserMiner'?r:undefined;
    }
    else{
     w.idleTime+=dt;
     d.wander-=dt;
     if(d.wander<=0||distance(d,{x:d.targetX,y:d.targetY})<20||exploredAt(w,{x:d.targetX,y:d.targetY})){
      const next=frontier(w,d,90,w.drones.filter(p=>p!==d&&p.state==='mine').map(p=>({x:p.targetX,y:p.targetY})))??w.base;
      d.targetX=next.x;d.targetY=next.y;d.wander=3;d.pathKey='';
     }
     target=waypoint(w,d,{x:d.targetX,y:d.targetY},'prospect'+d.targetX+':'+d.targetY);controlled=true;
    }
    }
  }
  if(d.kind==='laserMiner'&&!retreating&&d.state==='mine'&&d.cooldown<=0){
   const r=w.rocks.filter(r=>r.hp>0&&distance(d,r)<r.r+d.gear.laserRange&&clearSegment(d,r,w.rocks,r.id,0)).sort((a,b)=>distance(d,a)-distance(d,b))[0];
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
   const speed=(d.state==='return'?82:controlled?67:58)*d.gear.speed*Math.max(controlled?.12:.4,Math.cos(delta));
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
   if(d.state==='mine'&&d.kind==='impactMiner'&&d.hp>1&&d.armed&&d.cooldown===0&&approach>30){
    hit(w,r,d,false);d.hp--;w.collisions++;d.armed=false;d.lastRock=r.id;d.cooldown=d.gear.ramCooldown;d.recoil=d.gear.ramRecoil;d.vx=nx*145;d.vy=ny*145;d.pathKey='';
    d.targetRock=r.id;d.targetHold=w.time;d.recoveryX=Math.max(12,Math.min(W-12,r.x+nx*(r.r+55)));d.recoveryY=Math.max(12,Math.min(H-12,r.y+ny*(r.r+55)));
    if(!w.company.progress.farSurveyed){d.wander=0;}
    if(d.hp<=0){d.hp=0;dropCargo(w,d);d.state='dead';effect(w,{type:'dead',x:d.x,y:d.y},1);}
   }else{
    const inward=d.vx*nx+d.vy*ny;if(inward<0){d.vx-=inward*nx;d.vy-=inward*ny;}
    // A slow brush at the rock boundary cannot build enough normal speed to
    // become a valid ram. Back out to a fixed run-up point, then re-arm.
    if(d.ramTarget&&d.targetRock===r.id&&d.armed&&d.cooldown===0&&approach<=30){
     d.armed=false;d.lastRock=r.id;d.pathKey='';
     d.recoveryX=Math.max(12,Math.min(W-12,r.x+nx*(r.r+55)));
     d.recoveryY=Math.max(12,Math.min(H-12,r.y+ny*(r.r+55)));
    }
    if(d.state==='mine'&&!controlled){d.wander=0;}
   }
   d.x=r.x+nx*(r.r+8.2);d.y=r.y+ny*(r.r+8.2);
  }
  if(d.state==='dead')continue;
  // Pickup continues while recalling, but never adds cargo after destruction.
  for(let i=w.ores.length-1;i>=0;i--){const ore=w.ores[i];if((ore.age??1)>=ORE_PICKUP_DELAY&&distance(d,ore)<18&&d.cargo+ore.value<=d.gear.cargo&&availableTo(w,ore.id,'miner',d.id)){d.cargo+=ore.value;w.minerPickups++;if(ore.rich){d.richCargo+=ore.value;if(!w.progress.farSurveyed){w.progress.farSurveyed=true;discover(w,'far_belt_charted');}}effect(w,{type:'ore',x:ore.x,y:ore.y,amount:ore.value},.7);w.ores.splice(i,1);releaseClaim(w,ore.id);trimMinerClaims(w,d);}}
  if(d.state==='return'&&distance(d,berthFor(w,d))<2&&Math.hypot(d.vx,d.vy)<8){
   d.state='unload';d.unloadTime=0;d.unloadCargo=d.cargo;d.vx=0;d.vy=0;
  }
 }
 updateHaulers(w,dt);
 if(w.scanTicks%6===0)updateKnowledge(w);
 if(w.activeTarget&&!w.guards.some(g=>g.hp>0))clearTarget(w);
 const productive=[...w.drones,...w.haulers];
 if(productive.every(d=>d.state==='dead')){w.phase='aftermath';w.aftermath=0;}
 else if(productive.every(d=>d.state==='dead'||d.state==='docked')&&w.scouts.every(s=>s.state==='dead'||s.state==='docked')&&!w.effects.some(e=>e.type==='transfer'))w.phase='done';
}
export function settle(c:Company,w:World):Company{
 if(c.rounds>w.company.rounds)return c;
 const rockHp={...c.rockHp};for(const r of w.rocks)if(r.hp<r.max)rockHp[r.id]=r.hp;
 const ores=w.ores.map(o=>({x:o.x,y:o.y,value:1 as const,rich:!!o.rich}));
 const progress={...w.progress};
 return awardTech({...c,credits:c.credits+w.delivered,total:c.total+w.delivered,rounds:c.rounds+1,rockHp,ores,progress,explored:encodeMap(w.explored),discoveredPois:[...w.discoveredPois]},w.pendingTech.map(e=>e.id));
}
