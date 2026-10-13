import { route, clearSegment, type Point } from './navigation.ts';
import {DOCTRINE_AI,validDoctrine,type DoctrineId} from './doctrines.ts';
import {effectiveDirective} from './mission-plan.ts';
import {fleetForCounts,type FleetDrone} from './fleet.ts';
// Fixed-step seeded simulation: independent of browser and rendering.
export const W=800,H=930,ROUND_TIME=45,STEP=1/60,CAPACITY=12;
export const HOME={x:200,y:550}, FAR={x:535,y:770};
export type LaunchSite='home'|'far';
export type Directive='auto'|'surveyFar'|'surveyOutpost';
export type Progress={farSurveyed:boolean;richSampled:boolean;rivalSeen:boolean;outpostSurveyed:boolean};
export const freshProgress=():Progress=>({farSurveyed:false,richSampled:false,rivalSeen:false,outpostSurveyed:false});
export type StoredOre={x:number;y:number;value:number;rich:boolean};
export type Company={version:5;credits:number;drones:number;scanner:boolean;hull:boolean;laser:boolean;turret:boolean;rounds:number;total:number;cargoBay:boolean;prospector:boolean;drive:boolean;guards:number;outpost:boolean;launchSite:LaunchSite;worldSeed:number;rockHp:Record<string,number>;ores:StoredOre[];progress:Progress;directive:Directive;doctrine:DoctrineId;fleet:FleetDrone[]};
export const freshCompany=():Company=>({version:5,credits:0,drones:1,scanner:false,hull:false,laser:false,turret:false,rounds:0,total:0,cargoBay:false,prospector:false,drive:false,guards:0,outpost:false,launchSite:'home',worldSeed:7,rockHp:{},ores:[],progress:freshProgress(),directive:'auto',doctrine:'standard',fleet:fleetForCounts(1,0)});
export type Purchase='drone'|'hull'|'scanner'|'laser'|'cargoBay'|'prospector'|'drive'|'guard'|'turret'|'outpost';
export function unlocked(c:Company,item:Purchase){return item==='cargoBay'||item==='prospector'||item==='drive'?c.progress.richSampled:item==='guard'||item==='turret'?c.progress.rivalSeen:item==='outpost'?c.progress.outpostSurveyed:true;}
export function cost(c:Company,item:Purchase){return item==='drone'?[0,10,30,70,140,240,360][c.drones]:item==='hull'?10:item==='scanner'?30:item==='laser'?80:item==='cargoBay'?120:item==='prospector'?130:item==='drive'?160:item==='guard'?180+c.guards*100:item==='turret'?90:300;}
export function buy(c:Company,item:Purchase):Company|null{
 if(!unlocked(c,item)||c.credits<cost(c,item)||(item==='drone'?c.drones>=6:item==='guard'?c.guards>=2:c[item])||item==='prospector'&&!c.scanner)return null;
 const next={...c,credits:c.credits-cost(c,item),...(item==='drone'?{drones:c.drones+1}:item==='guard'?{guards:c.guards+1}:{[item]:true})};
 return {...next,fleet:fleetForCounts(next.drones,next.guards,c.fleet)};
}
export const capacity=(c:Company)=>CAPACITY+(c.cargoBay?6:0);
export const baseFor=(c:Company)=>c.outpost&&c.launchSite==='far'?FAR:HOME;
export type Rock={id:number;x:number;y:number;r:number;hp:number;max:number;shape:number[];rich?:boolean};
export type Ore={id:number;x:number;y:number;value:number;rich?:boolean;originX?:number;originY?:number;age?:number};
export type Drone={id:number;identityId:string;name:string;x:number;y:number;angle:number;hp:number;maxHp:number;cargo:number;richCargo:number;cooldown:number;targetX:number;targetY:number;wander:number;vx:number;vy:number;recoil:number;armed:boolean;lastRock:number;targetRock:number;targetHold:number;ramTarget:boolean;berth:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;state:'mine'|'unload'|'return'|'docked'|'dead'};
export type Enemy={id:number;x:number;y:number;vx:number;vy:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number};
export type Guard={id:number;identityId:string;name:string;x:number;y:number;vx:number;vy:number;angle:number;hp:number;cooldown:number;path:Point[];pathKey:string;pathAge:number};
export type Effect={type:'transfer'|'hit'|'laser'|'ore'|'deposit'|'dead'|'enemyShot'|'guardShot'|'turretShot'|'enemyDead';x:number;y:number;tx?:number;ty?:number;life:number;max:number;amount?:number;richAmount?:number};
export type World={time:number;phase:'mining'|'recall'|'aftermath'|'done';aftermath:number;company:Company;doctrine:DoctrineId;progress:Progress;rocks:Rock[];ores:Ore[];drones:Drone[];enemies:Enemy[];guards:Guard[];effects:Effect[];delivered:number;extracted:number;richExtracted:number;lost:number;collisions:number;shots:number;mined:number;attacks:number;intercepts:number;disengagements:number;idleTime:number;wave:number;base:typeof HOME;rng:()=>number;nextId:number;turretCooldown:number};
export function random(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function createWorld(company:Company,seed=7):World{
 const rng=random(seed^Math.imul(company.rounds,7919)),rocksRng=random(seed);
 const base=baseFor(company);
 const doctrine=validDoctrine(company.doctrine);
 const fleet=fleetForCounts(company.drones,company.guards,company.fleet);
 const w:World={time:0,phase:'mining',aftermath:0,company:{...company,doctrine,directive:effectiveDirective(company)},doctrine,progress:{...company.progress},rocks:[],ores:company.ores.map((o,i)=>({...o,id:100+i,age:1})),drones:[],enemies:[],guards:[],effects:[],delivered:0,extracted:0,richExtracted:0,lost:0,collisions:0,shots:0,mined:0,attacks:0,intercepts:0,disengagements:0,idleTime:0,wave:0,base,rng,nextId:100+company.ores.length,turretCooldown:0};
 const locations=[[200,440],[74,100],[285,91],[160,165],[337,224],[60,281],[242,309],[119,377],[337,419],[50,461],[296,165],[157,65]];
 locations.forEach(([x,y],id)=>{const r=id===0?18:21+rocksRng()*15,max=4*(id===0?40:38+Math.round(r*1.1));w.rocks.push({id,x:x+(id?(rocksRng()-.5)*18:0),y,r,hp:company.rockHp[id]??max,max,shape:Array.from({length:11},()=>.77+rocksRng()*.23)});});
 // Extended test field: original starting pocket plus two outer resource clusters.
 const outer=[[470,90],[650,130],[535,240],[730,310],[445,395],[600,430],[710,530],[465,610],[620,690],[745,810],[490,835],[315,755],[140,820],[75,655],[290,650],[360,870],[575,560],[700,70]];
 const outerRng=random(seed^0x5142);
 outer.forEach(([x,y],i)=>{const r=22+outerRng()*15,rich=i%3!==1,max=4*(rich?80+Math.round(r*.6):42+Math.round(r));w.rocks.push({id:12+i,x,y,r,hp:company.rockHp[12+i]??max,max,rich,shape:Array.from({length:11},()=>.77+outerRng()*.23)});});
 // Keep navigable gaps: no drone-sized pockets between touching collision circles.
 for(let i=1;i<w.rocks.length;i++){
  const r=w.rocks[i];let attempts=0;
  const room=Math.min(...w.rocks.slice(0,i).map(p=>Math.hypot(r.x-p.x,r.y-p.y)-p.r-26));
  if(room>=14)r.r=Math.min(r.r,room);
  while(w.rocks.slice(0,i).some(p=>Math.hypot(r.x-p.x,r.y-p.y)<r.r+p.r+26)&&attempts++<100){r.y+=12;if(r.y>H-45){r.y=45;r.x=Math.min(W-45,r.x+55);}}
 }
 for(let i=0;i<company.drones;i++){
  const maxHp=company.hull?7:4;
  const identity=fleet[i];
  w.drones.push({id:i,identityId:identity.id,name:identity.name,x:base.x+(i-(company.drones-1)/2)*18,y:base.y-27,angle:-Math.PI/2,hp:maxHp,maxHp,cargo:0,richCargo:0,cooldown:0,targetX:200+i*25,targetY:90,wander:3.5,vx:0,vy:0,recoil:0,armed:true,lastRock:-1,targetRock:-1,targetHold:0,ramTarget:false,berth:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,state:'mine'});
 }
 for(let i=0;i<company.guards;i++){const identity=fleet[company.drones+i];w.guards.push({id:i,identityId:identity.id,name:identity.name,x:base.x+(i?24:-24),y:base.y-85,vx:0,vy:0,angle:-Math.PI/2,hp:6,cooldown:0,path:[],pathKey:'',pathAge:0});}
 return w;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
// Shared station geometry for HQ and the Outer Outpost. Each returning miner
// reserves its nearest free, rock-clear berth until it departs or is lost.
export function dockingSpots(base:Point):Point[]{
 const radius=base.x===HOME.x&&base.y===HOME.y?72:56;
 return Array.from({length:12},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/6;return {x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius};});
}
const berthFor=(w:World,d:Drone):Point=>{
 const spots=dockingSpots(w.base);
 if(d.berth<0){
  const occupied=new Set(w.drones.filter(other=>other!==d&&other.berth>=0&&other.state!=='dead').map(other=>other.berth));
  const clear=(p:Point)=>p.x>=12&&p.x<=W-12&&p.y>=12&&p.y<=H-12&&w.rocks.every(r=>r.hp<=0||distance(p,r)>=r.r+12);
  const index=spots.map((_,i)=>i).filter(i=>!occupied.has(i)&&clear(spots[i])).sort((a,b)=>distance(d,spots[a])-distance(d,spots[b]))[0];
  d.berth=index??0;
 }
 return spots[d.berth];
};
export const ORE_PICKUP_DELAY=.55;
const laserPosition=(d:Drone,r:Rock,standoff=55):Point=>{const length=distance(d,r)||1;return {x:r.x+(d.x-r.x)/length*(r.r+standoff),y:r.y+(d.y-r.y)/length*(r.r+standoff)};};
function effect(w:World,e:Omit<Effect,'life'|'max'>,life=.5){w.effects.push({...e,life,max:life});}
const yieldFor=(r:Rock,laser:boolean)=>Math.min(r.hp,laser?1:4)*(r.rich?2:1);
function hit(w:World,r:Rock,d:Drone,laser:boolean){
 const damage=Math.min(r.hp,laser?1:4),amount=damage*(r.rich?2:1);
 r.hp-=damage;w.mined++;w.extracted+=amount;if(r.rich)w.richExtracted+=amount;effect(w,{type:'hit',x:r.x,y:r.y,tx:d.x,ty:d.y,amount:laser?0.45:r.hp<=0?2:1},.45);
 const pieces=laser?1:Math.min(2,amount);
 for(let j=0;j<pieces;j++){
  let landing:Point={x:r.x+r.r+25,y:r.y};
  for(let attempt=0;attempt<12;attempt++){
   const angle=w.rng()*Math.PI*2,radius=r.r+20+w.rng()*14;
   const candidate={x:Math.max(12,Math.min(W-12,r.x+Math.cos(angle)*radius)),y:Math.max(12,Math.min(H-12,r.y+Math.sin(angle)*radius))};
   landing=candidate;
   if(w.rocks.every(other=>other.id===r.id||other.hp<=0||distance(candidate,other)>=other.r+10))break;
  }
  w.ores.push({id:w.nextId++,x:landing.x,y:landing.y,value:Math.floor(amount/pieces)+(j<amount%pieces?1:0),rich:!!r.rich,originX:r.x,originY:r.y,age:0});
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
function oreApproach(w:World,d:Drone,ore:Ore):Point|undefined{
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
function separateRock(w:World,agent:{x:number;y:number;vx:number;vy:number},radius=8){
 for(let pass=0;pass<3;pass++)for(const r of w.rocks){
  const dist=distance(agent,r);if(r.hp<=0||dist>=r.r+radius)continue;
  const nx=dist?(agent.x-r.x)/dist:1,ny=dist?(agent.y-r.y)/dist:0;
  agent.x=r.x+nx*(r.r+radius+.2);agent.y=r.y+ny*(r.r+radius+.2);
  const inward=agent.vx*nx+agent.vy*ny;if(inward<0){agent.vx-=inward*nx;agent.vy-=inward*ny;}
 }
}
function dropCargo(w:World,d:Drone){
 w.lost+=d.cargo;
 for(const [rich,total] of [[true,d.richCargo],[false,d.cargo-d.richCargo]] as const){
  for(let left=total;left>0;){
   const value=Math.min(left,rich?4:2),offset=w.nextId%7-3;
   w.ores.push({id:w.nextId++,x:Math.max(8,Math.min(W-8,d.x+offset*3)),y:Math.max(8,Math.min(H-8,d.y-offset*2)),value,rich,age:1});left-=value;
  }
 }
 d.cargo=0;d.richCargo=0;
 d.berth=-1;
}
function miningTarget(w:World,d:Drone,room:number,surveyFar:boolean):Rock|undefined{
 const eligible=w.rocks.filter(r=>r.hp>0&&yieldFor(r,w.company.laser)<=room);
 if(w.doctrine==='standard')return (surveyFar?eligible.filter(r=>r.rich):[]).sort((a,b)=>distance(d,a)-distance(d,b))[0]??eligible.sort((a,b)=>(distance(d,a)/(w.company.prospector&&a.rich?5:1))-(distance(d,b)/(w.company.prospector&&b.rich?5:1)))[0];
 const options=surveyFar?eligible.filter(r=>r.rich):eligible;
 const choices=options.length?options:eligible;
 const ai=DOCTRINE_AI[w.doctrine];
 const threats=w.enemies.filter(e=>e.hp>0);
 const peers=w.drones.filter(p=>p!==d&&p.state==='mine');
 const score=(r:Rock)=>{
  const travel=Math.max(0,distance(d,r)-r.r);
  const danger=threats.reduce((risk,e)=>risk+Math.max(0,260-distance(r,e))*Math.max(0,1-distance(d,e)/420),0);
  const nearby=peers.length?Math.min(...peers.map(p=>p.targetRock===r.id?0:distance(p,r))):260;
  const miningBias=w.company.prospector&&r.rich?travel*.8:0;
  const productiveImpact=w.doctrine==='fullContact'&&r.rich&&d.hp>1&&travel<200?48:0;
  return travel*ai.near+danger*ai.threat+Math.max(0,nearby-65)*ai.group-miningBias-productiveImpact;
 };
 const preferred=choices.reduce<Rock|undefined>((best,r)=>!best||score(r)<score(best)?r:best,undefined);
 const locked=choices.find(r=>r.id===d.targetRock);
 // A route remains stable until a clearly better target appears; depleted targets unlock immediately.
 const selected=locked&&preferred&&(w.time-d.targetHold<1.2||score(locked)<=score(preferred)+35+ai.commit*30)?locked:preferred;
 if(selected&&selected.id!==d.targetRock){d.targetRock=selected.id;d.targetHold=w.time;}
 return selected;
}
function dangerRetreat(w:World,d:Drone):Point|undefined{
 if(w.doctrine!=='careful')return;
 const foe=w.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(d,a)-distance(d,b))[0];
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
  const miners=w.drones.filter(d=>d.state==='mine'||d.state==='return'||d.state==='unload');
  const target=miners.sort((a,b)=>b.x-a.x)[0];
  const side=w.wave%2?1:-1;
  w.enemies.push({id:w.wave++,x:Math.max(430,Math.min(W-25,(target?.x??620)+side*140)),y:Math.max(90,Math.min(H-25,(target?.y??360)-70)),vx:0,vy:0,hp:3,cooldown:1.1,path:[],pathKey:'',pathAge:0});
  w.progress.rivalSeen=true;
 }
 for(const e of w.enemies){
  if(e.hp<=0)continue;
  const miners=w.drones.filter(d=>d.state==='mine'||d.state==='return'||d.state==='unload');
  const guards=w.guards.filter(g=>g.hp>0).sort((a,b)=>distance(e,a)-distance(e,b));
  const miner=miners.sort((a,b)=>distance(e,a)-distance(e,b))[0];
  const target=guards[0]&&distance(e,guards[0])<145?guards[0]:miner??guards[0];
  if(!target){e.vx*=.96;e.vy*=.96;continue;}
  const dist=distance(e,target),point=clearSegment(e,target,w.rocks,-1,10)?target:waypoint(w,e,target,'pursue'+('state' in target?'miner':'guard')+target.id);
  const pathDist=distance(e,point),dx=(point.x-e.x)/Math.max(1,pathDist),dy=(point.y-e.y)/Math.max(1,pathDist);
  const desired=dist>105?82:dist<70?-35:0;
  e.vx+=(dx*desired-e.vx)*Math.min(1,dt*2);e.vy+=(dy*desired-e.vy)*Math.min(1,dt*2);
  e.x=Math.max(12,Math.min(W-12,e.x+e.vx*dt));e.y=Math.max(12,Math.min(H-12,e.y+e.vy*dt));separateRock(w,e);
  e.cooldown-=dt;
  if(distance(e,target)<145&&e.cooldown<=0&&clearSegment(e,target,w.rocks,-1,0)){
   effect(w,{type:'enemyShot',x:e.x,y:e.y,tx:target.x,ty:target.y},.3);w.attacks++;
   const isMiner=target===miner;
   target.hp-=isMiner?1.5:1;
   if(target.hp<=0){target.hp=0;if(isMiner){const victim=target as Drone;dropCargo(w,victim);victim.state='dead';}effect(w,{type:'dead',x:target.x,y:target.y},1);}
   e.cooldown=1.8;
  }
 }
 for(const g of w.guards){
  if(g.hp<=0)continue;
  const active=w.enemies.filter(e=>e.hp>0);
  const miners=w.drones.filter(d=>d.state==='mine'||d.state==='return'||d.state==='unload');
  const foe=w.doctrine==='convoy'?active.sort((a,b)=>{
   const urgency=(e:Enemy)=>Math.min(...miners.map(d=>distance(e,d)),300)*1.25+distance(e,g)*.35;
   return urgency(a)-urgency(b);
  })[0]:active.sort((a,b)=>distance(a,g)-distance(b,g))[0];
  const protect=miners.length?(foe?miners.reduce((best,d)=>distance(d,foe)<distance(best,foe)?d:best):miners[g.id%miners.length]):w.base;
  const anchor=foe&&distance(foe,protect)<(w.doctrine==='convoy'?205:320)?foe:protect;
  const offset=foe?35:25;
  const goal={x:anchor.x+Math.cos(w.time*1.5+g.id*Math.PI)*offset,y:anchor.y+Math.sin(w.time*1.5+g.id*Math.PI)*offset};
  const point=clearSegment(g,goal,w.rocks,-1,10)?goal:waypoint(w,g,goal,'guard'+(foe?.id??-1)+':'+('id' in protect?protect.id:-1));
  const dx=point.x-g.x,dy=point.y-g.y,len=Math.hypot(dx,dy);
  g.vx+=(dx/Math.max(1,len)*Math.min(150,len*3)-g.vx)*Math.min(1,dt*4);g.vy+=(dy/Math.max(1,len)*Math.min(150,len*3)-g.vy)*Math.min(1,dt*4);
  g.x=Math.max(10,Math.min(W-10,g.x+g.vx*dt));g.y=Math.max(10,Math.min(H-10,g.y+g.vy*dt));separateRock(w,g);
  if(len>2)g.angle=Math.atan2(g.vy,g.vx);
  g.cooldown-=dt;
  const inRange=active.filter(e=>distance(g,e)<135&&clearSegment(g,e,w.rocks,-1,0));
  const shot=w.doctrine==='convoy'?inRange.sort((a,b)=>Math.min(...miners.map(d=>distance(a,d)),300)-Math.min(...miners.map(d=>distance(b,d)),300))[0]:inRange.find(e=>e===foe);
  if(shot&&g.cooldown<=0){
   effect(w,{type:'guardShot',x:g.x,y:g.y,tx:shot.x,ty:shot.y},.3);shot.hp--;w.intercepts++;g.cooldown=1.05;
   if(shot.hp<=0)effect(w,{type:'enemyDead',x:shot.x,y:shot.y},.8);
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
 w.time+=dt;w.effects.forEach(e=>{e.life-=dt;if(e.type==='transfer'&&e.life<=0){w.delivered+=e.amount??0;if(e.richAmount)w.progress.richSampled=true;}});w.effects=w.effects.filter(e=>e.life>0);
 for(const o of w.ores)o.age=(o.age??1)+dt;
 if(w.phase==='aftermath'){w.aftermath+=dt;if(w.aftermath>=2.5&&!w.effects.some(e=>e.type==='transfer'))w.phase='done';return;}
 if(w.time>=ROUND_TIME)w.phase='recall';
 updateRivals(w,dt);
 for(const d of w.drones){
  if(d.state==='dead'||d.state==='docked')continue;
  if(d.state==='unload'){
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
  const room=capacity(w.company)-d.cargo;
  const extractable=w.rocks.some(r=>r.hp>0&&yieldFor(r,w.company.laser)<=room);
  const collectable=w.ores.some(o=>o.value<=room);
  if(w.phase==='recall'||room===0||d.cargo>0&&!extractable&&!collectable||!w.rocks.some(r=>r.hp>0)&&!w.ores.length)d.state='return';
  let target:Point,controlled=false,aim:Point|undefined;
  let retreating=false;
  d.ramTarget=false;
  if(d.state==='return'){target=waypoint(w,d,berthFor(w,d),'home'+d.berth);controlled=true;}
   else{
   const surveyOutpost=w.company.directive==='surveyOutpost'&&!w.progress.outpostSurveyed;
   const surveyFar=w.company.directive==='surveyFar'&&!w.progress.richSampled;
   const r=miningTarget(w,d,room,surveyFar);
   const ores=w.ores.filter(o=>(o.age??1)>=ORE_PICKUP_DELAY&&o.value<=room&&(distance(d,o)<130||!r)&&(!surveyFar||o.rich)).sort((a,b)=>distance(d,a)-distance(d,b));
   const retreat=dangerRetreat(w,d);
   if(retreat){if(d.pathKey!=='retreat')w.disengagements++;target=waypoint(w,d,retreat,'retreat');controlled=true;retreating=true;}
   else if(surveyOutpost){target=waypoint(w,d,FAR,'surveyOutpost');controlled=true;}
   else{
    let oreGoal:Point|undefined,oreId=-1;
    for(const ore of ores){oreGoal=oreApproach(w,d,ore);if(oreGoal){oreId=ore.id;break;}}
    if(oreGoal){target=waypoint(w,d,oreGoal,'ore'+oreId);controlled=true;}
    else if(r){d.ramTarget=w.doctrine==='fullContact'&&w.company.laser&&d.hp>1&&yieldFor(r,false)<=room&&distance(d,r)<175;target=waypoint(w,d,w.company.laser&&!d.ramTarget?laserPosition(d,r,DOCTRINE_AI[w.doctrine].standoff):r,'rock'+r.id,r.id);controlled=true;aim=w.company.laser&&!d.ramTarget?r:undefined;}
    else{
     w.idleTime+=dt;
     d.wander-=dt;
     if(d.wander<=0||distance(d,{x:d.targetX,y:d.targetY})<18){if(w.company.laser||w.delivered>0){d.targetX=Math.max(30,Math.min(W-30,d.x+(w.rng()-.42)*560));d.targetY=Math.max(45,Math.min(H-45,d.y+(w.rng()-.55)*540));}else{d.targetX=30+w.rng()*340;d.targetY=45+w.rng()*450;}d.wander=1.5+w.rng()*2.5;}
     target={x:d.targetX,y:d.targetY};
    }
    }
  }
  if(w.company.laser&&!d.ramTarget&&!retreating&&d.state==='mine'&&d.cooldown<=0){
   const r=w.rocks.filter(r=>r.hp>0&&yieldFor(r,true)<=room&&distance(d,r)<r.r+85&&clearSegment(d,r,w.rocks,r.id,0)).sort((a,b)=>distance(d,a)/(w.company.prospector&&a.rich?5:1)-distance(d,b)/(w.company.prospector&&b.rich?5:1))[0];
   if(r){hit(w,r,d,true);w.shots++;d.cooldown=1.1;aim=r;effect(w,{type:'laser',x:d.x,y:d.y,tx:r.x,ty:r.y},.35);}
  }
  if(d.recoil>0){
   // Motor cannot cancel the impulse. This creates visible clearance for a fresh run-up.
   d.recoil=Math.max(0,d.recoil-dt);d.vx*=Math.exp(-1.1*dt);d.vy*=Math.exp(-1.1*dt);
  }else{
   const wobble=controlled&&d.state==='mine'&&!w.company.laser?(w.doctrine==='fullContact'?0:Math.sin(w.time*2.1+d.id*1.7)*.1):controlled?0:Math.sin(w.time*2.1+d.id*1.7)*.3;
   const targetDistance=distance(d,target),holding=!!aim&&d.state==='mine'&&targetDistance<10;
   const look=holding?aim:targetDistance>6?target:undefined;
   const desired=look?Math.atan2(look.y-d.y,look.x-d.x)+wobble:d.angle;
   const delta=Math.atan2(Math.sin(desired-d.angle),Math.cos(desired-d.angle));
   // Cargo navigation is reliable; unassisted exploration oversteers and wanders.
   const turn=controlled?3.2:1.6;
   d.angle+=Math.max(-dt*turn,Math.min(dt*turn,delta));
   const speed=(d.state==='return'?82:controlled?67:58)*(w.company.drive?1.35:1)*Math.max(controlled?.12:.4,Math.cos(delta));
   const desiredSpeed=Math.min(speed,targetDistance*4);
   const response=controlled?8:2.2;
   const docking=d.state==='return'&&distance(d,target)<24;
   d.vx+=(((docking||holding)?(target.x-d.x)*2:Math.cos(d.angle)*desiredSpeed)-d.vx)*Math.min(1,response*dt);
   d.vy+=(((docking||holding)?(target.y-d.y)*2:Math.sin(d.angle)*desiredSpeed)-d.vy)*Math.min(1,response*dt);
  }
  if(!d.armed&&d.recoil===0&&w.rocks.every(r=>r.id!==d.lastRock||r.hp<=0||distance(d,r)>r.r+25))d.armed=true;
  d.x+=d.vx*dt;d.y+=d.vy*dt;
  d.x=Math.max(10,Math.min(W-10,d.x));d.y=Math.max(10,Math.min(H-10,d.y));
  // Physical collisions apply to EVERY active state, including full cargo and recall.
  for(let pass=0;pass<3;pass++)for(const r of w.rocks){
   const dist=distance(d,r);if(r.hp<=0||dist>=r.r+8)continue;
   const nx=dist?(d.x-r.x)/dist:0,ny=dist?(d.y-r.y)/dist:1;
   const approach=-(d.vx*nx+d.vy*ny);
   if(d.state==='mine'&&(!w.company.laser||d.ramTarget)&&d.armed&&d.cooldown===0&&approach>30){
    hit(w,r,d,false);d.hp--;w.collisions++;d.armed=false;d.lastRock=r.id;d.cooldown=.8;d.recoil=.55;d.vx=nx*145;d.vy=ny*145;d.pathKey='';
    if(!w.company.scanner){d.wander=0;}
    if(d.hp<=0){d.hp=0;dropCargo(w,d);d.state='dead';effect(w,{type:'dead',x:d.x,y:d.y},1);}
   }else{
    const inward=d.vx*nx+d.vy*ny;if(inward<0){d.vx-=inward*nx;d.vy-=inward*ny;}
    if(d.state==='mine'&&!controlled){d.wander=0;}
   }
   d.x=r.x+nx*(r.r+8.2);d.y=r.y+ny*(r.r+8.2);
  }
  if(d.state==='dead')continue;
  // Pickup continues while recalling, but never adds cargo after destruction.
  for(let i=w.ores.length-1;i>=0;i--){const ore=w.ores[i];if((ore.age??1)>=ORE_PICKUP_DELAY&&distance(d,ore)<18&&d.cargo+ore.value<=capacity(w.company)){d.cargo+=ore.value;if(ore.rich){d.richCargo+=ore.value;w.progress.farSurveyed=true;}effect(w,{type:'ore',x:ore.x,y:ore.y,amount:ore.value},.7);w.ores.splice(i,1);}}
  if(d.x>405||d.y>650)w.progress.farSurveyed=true;
  if(distance(d,FAR)<74)w.progress.outpostSurveyed=true;
  if(d.state==='return'&&distance(d,berthFor(w,d))<2&&Math.hypot(d.vx,d.vy)<8){
   d.state='unload';d.unloadTime=0;d.unloadCargo=d.cargo;d.vx=0;d.vy=0;
  }
 }
 if(w.drones.every(d=>d.state==='dead')){w.phase='aftermath';w.aftermath=0;}
 else if(w.drones.every(d=>d.state==='dead'||d.state==='docked')&&!w.effects.some(e=>e.type==='transfer'))w.phase='done';
}
export function settle(c:Company,w:World):Company{
 const rockHp={...c.rockHp};for(const r of w.rocks)if(r.hp<r.max)rockHp[r.id]=r.hp;
 const ores=w.ores.map(o=>({x:o.x,y:o.y,value:o.value,rich:!!o.rich}));
 const progress={...w.progress};
 const directive=effectiveDirective({...c,progress});
 return {...c,credits:c.credits+w.delivered,total:c.total+w.delivered,rounds:c.rounds+1,rockHp,ores,progress,directive};
}
