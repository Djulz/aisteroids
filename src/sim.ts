import { route, clearSegment, type Point } from './navigation.ts';
// Fixed-step seeded simulation: independent of browser and rendering.
export const W=800,H=930,ROUND_TIME=45,STEP=1/60,CAPACITY=12;
export const HOME={x:200,y:550};
export type Company={version:2;credits:number;drones:number;scanner:boolean;hull:boolean;laser:boolean;rounds:number;total:number};
export const freshCompany=():Company=>({version:2,credits:0,drones:1,scanner:false,hull:false,laser:false,rounds:0,total:0});
export type Purchase='drone'|'hull'|'scanner'|'laser';
export function cost(c:Company,item:Purchase){return item==='drone'?c.drones*10:item==='hull'?10:item==='scanner'?30:40;}
export function buy(c:Company,item:Purchase):Company|null{
 if(c.credits<cost(c,item)||(item==='drone'?c.drones>=6:c[item]))return null;
 return {...c,credits:c.credits-cost(c,item),...(item==='drone'?{drones:c.drones+1}:{[item]:true})};
}
export type Rock={id:number;x:number;y:number;r:number;hp:number;max:number;shape:number[]};
export type Ore={id:number;x:number;y:number;value:number;originX?:number;originY?:number;age?:number};
export type Drone={id:number;x:number;y:number;angle:number;hp:number;maxHp:number;cargo:number;cooldown:number;targetX:number;targetY:number;wander:number;vx:number;vy:number;recoil:number;armed:boolean;lastRock:number;path:Point[];pathKey:string;pathAge:number;unloadTime:number;unloadCargo:number;state:'mine'|'unload'|'return'|'docked'|'dead'};
export type Effect={type:'transfer'|'hit'|'laser'|'ore'|'deposit'|'dead';x:number;y:number;tx?:number;ty?:number;life:number;max:number;amount?:number};
export type World={time:number;phase:'mining'|'recall'|'done';company:Company;rocks:Rock[];ores:Ore[];drones:Drone[];effects:Effect[];delivered:number;lost:number;collisions:number;shots:number;mined:number;rng:()=>number;nextId:number};
export function random(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function createWorld(company:Company,seed=7):World{
 const rng=random(seed);
 const w:World={time:0,phase:'mining',company:{...company},rocks:[],ores:[],drones:[],effects:[],delivered:0,lost:0,collisions:0,shots:0,mined:0,rng,nextId:100};
 const locations=[[200,440],[74,100],[285,91],[160,165],[337,224],[60,281],[242,309],[119,377],[337,419],[50,461],[296,165],[157,65]];
 locations.forEach(([x,y],id)=>{const r=id===0?18:21+rng()*15,hp=id===0?3:r>29?4:3;w.rocks.push({id,x:x+(id?(rng()-.5)*18:0),y,r,hp,max:hp,shape:Array.from({length:11},()=>.77+rng()*.23)});});
 // Extended test field: original starting pocket plus two outer resource clusters.
 const outer=[[470,90],[650,130],[535,240],[730,310],[445,395],[600,430],[710,530],[465,610],[620,690],[745,810],[490,835],[315,755],[140,820],[75,655],[290,650],[360,870],[575,560],[700,70]];
 const outerRng=random(seed^0x5142);
 outer.forEach(([x,y],i)=>{const r=22+outerRng()*15,hp=r>29?4:3;w.rocks.push({id:12+i,x,y,r,hp,max:hp,shape:Array.from({length:11},()=>.77+outerRng()*.23)});});
 // Keep navigable gaps: no drone-sized pockets between touching collision circles.
 for(let i=1;i<w.rocks.length;i++){
  const r=w.rocks[i];let attempts=0;
  const room=Math.min(...w.rocks.slice(0,i).map(p=>Math.hypot(r.x-p.x,r.y-p.y)-p.r-26));
  if(room>=14)r.r=Math.min(r.r,room);
  while(w.rocks.slice(0,i).some(p=>Math.hypot(r.x-p.x,r.y-p.y)<r.r+p.r+26)&&attempts++<100){r.y+=12;if(r.y>H-45){r.y=45;r.x=Math.min(W-45,r.x+55);}}
 }
 for(let i=0;i<company.drones;i++){
  const maxHp=company.hull?7:4;
  w.drones.push({id:i,x:HOME.x+(i-(company.drones-1)/2)*18,y:HOME.y-27,angle:-Math.PI/2,hp:maxHp,maxHp,cargo:0,cooldown:0,targetX:200+i*25,targetY:90,wander:3.5,vx:0,vy:0,recoil:0,armed:true,lastRock:-1,path:[],pathKey:'',pathAge:0,unloadTime:0,unloadCargo:0,state:'mine'});
 }
 return w;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function effect(w:World,e:Omit<Effect,'life'|'max'>,life=.5){w.effects.push({...e,life,max:life});}
function hit(w:World,r:Rock,d:Drone){
 r.hp--;w.mined++;effect(w,{type:'hit',x:r.x,y:r.y,tx:d.x,ty:d.y,amount:r.hp<=0?2:1},.45);
 for(let j=0;j<2;j++){
  const a=Math.atan2(d.y-r.y,d.x-r.x)+(j?.17:-.17);
  w.ores.push({id:w.nextId++,x:r.x+Math.cos(a)*(r.r+24),y:r.y+Math.sin(a)*(r.r+24),value:2,originX:r.x,originY:r.y,age:0});
 }
}
function waypoint(w:World,d:Drone,target:Point,key:string,ignore=-1){
 d.pathAge+=STEP;
 if(d.pathKey!==key||d.pathAge>1.5||!d.path.length){d.path=route(d,target,w.rocks,ignore,W,H);d.pathKey=key;d.pathAge=0;}
 while(d.path.length>1&&distance(d,d.path[0])<9)d.path.shift();
 // Only skip a corner after the drone has a clear line, not merely because it's close.
 if(d.path.length>1&&clearSegment(d,d.path[1],w.rocks,ignore,10))d.path.shift();
 return d.path[0]??{x:d.x,y:d.y};
}
export function step(w:World,dt=STEP){
 if(w.phase==='done')return;
 w.time+=dt;w.effects.forEach(e=>{e.life-=dt;if(e.type==='transfer'&&e.life<=0){w.delivered+=e.amount??0;}});w.effects=w.effects.filter(e=>e.life>0);
 for(const o of w.ores)o.age=(o.age??1)+dt;
 if(w.time>=ROUND_TIME)w.phase='recall';
 for(const d of w.drones){
  if(d.state==='dead'||d.state==='docked')continue;
  if(d.state==='unload'){
   d.unloadTime+=dt;
   const duration=.7, sent=Math.min(d.unloadCargo,Math.floor(d.unloadTime/duration*d.unloadCargo/2)*2);
   const amount=d.cargo-(d.unloadCargo-sent);
   if(amount>0){d.cargo-=amount;effect(w,{type:'transfer',x:d.x,y:d.y,tx:HOME.x,ty:HOME.y+7,amount},.35);}
   if(d.unloadTime>=1.15){
    if(w.phase==='recall'||!w.rocks.some(r=>r.hp>0)&&!w.ores.length)d.state='docked';
    else{d.state='mine';d.wander=0;d.pathKey='';}
   }
   continue;
  }
  d.cooldown=Math.max(0,d.cooldown-dt);
  if(w.phase==='recall'||d.cargo>=CAPACITY||(!w.rocks.some(r=>r.hp>0)&&!w.ores.length))d.state='return';
  let target:Point,controlled=false;
  if(d.state==='return'){target=waypoint(w,d,{x:HOME.x+(d.id-(w.drones.length-1)/2)*25,y:HOME.y-62},'home');controlled=true;}
  else{
   const ore=w.ores.filter(o=>distance(d,o)<130).sort((a,b)=>distance(d,a)-distance(d,b))[0];
   if(ore){target=waypoint(w,d,ore,'ore'+ore.id);controlled=true;}
   else{
    const r=w.company.scanner?w.rocks.filter(r=>r.hp>0).sort((a,b)=>distance(d,a)-distance(d,b))[0]:undefined;
    if(r){target=waypoint(w,d,r,'rock'+r.id,r.id);}
    else{
     d.wander-=dt;
     if(d.wander<=0||distance(d,{x:d.targetX,y:d.targetY})<18){if(w.company.laser||w.delivered>0){d.targetX=Math.max(30,Math.min(W-30,d.x+(w.rng()-.42)*560));d.targetY=Math.max(45,Math.min(H-45,d.y+(w.rng()-.55)*540));}else{d.targetX=30+w.rng()*340;d.targetY=45+w.rng()*450;}d.wander=1.5+w.rng()*2.5;}
     target={x:d.targetX,y:d.targetY};
    }
   }
  }
  if(w.company.laser&&d.state==='mine'&&d.cooldown<=0){
   const r=w.rocks.filter(r=>r.hp>0&&distance(d,r)<r.r+85&&clearSegment(d,r,w.rocks,r.id,0)).sort((a,b)=>distance(d,a)-distance(d,b))[0];
   if(r){hit(w,r,d);w.shots++;d.cooldown=.8;effect(w,{type:'laser',x:d.x,y:d.y,tx:r.x,ty:r.y},.35);}
  }
  if(d.recoil>0){
   // Motor cannot cancel the impulse. This creates visible clearance for a fresh run-up.
   d.recoil=Math.max(0,d.recoil-dt);d.vx*=Math.exp(-1.1*dt);d.vy*=Math.exp(-1.1*dt);
  }else{
   const wobble=controlled?0:Math.sin(w.time*2.1+d.id*1.7)*.55;
   const desired=Math.atan2(target.y-d.y,target.x-d.x)+wobble;
   const delta=Math.atan2(Math.sin(desired-d.angle),Math.cos(desired-d.angle));
   // Cargo navigation is reliable; unassisted exploration oversteers and wanders.
   const turn=controlled?3.2:1.6;
   d.angle+=Math.max(-dt*turn,Math.min(dt*turn,delta));
   const speed=(d.state==='return'?82:controlled?67:58)*Math.max(controlled?.12:.4,Math.cos(delta));
   const desiredSpeed=Math.min(speed,distance(d,target)*4);
   const response=controlled?8:2.2;
   const docking=d.state==='return'&&distance(d,target)<24;
   d.vx+=((docking?(target.x-d.x)*2:Math.cos(d.angle)*desiredSpeed)-d.vx)*Math.min(1,response*dt);
   d.vy+=((docking?(target.y-d.y)*2:Math.sin(d.angle)*desiredSpeed)-d.vy)*Math.min(1,response*dt);
  }
  if(!d.armed&&d.recoil===0&&w.rocks.every(r=>r.id!==d.lastRock||r.hp<=0||distance(d,r)>r.r+25))d.armed=true;
  d.x+=d.vx*dt;d.y+=d.vy*dt;
  d.x=Math.max(10,Math.min(W-10,d.x));d.y=Math.max(10,Math.min(H-10,d.y));
  // Physical collisions apply to EVERY active state, including full cargo and recall.
  for(let pass=0;pass<3;pass++)for(const r of w.rocks){
   const dist=distance(d,r);if(r.hp<=0||dist>=r.r+8)continue;
   const nx=dist?(d.x-r.x)/dist:0,ny=dist?(d.y-r.y)/dist:1;
   const approach=-(d.vx*nx+d.vy*ny);
   if(d.state==='mine'&&!w.company.laser&&d.armed&&d.cooldown===0&&approach>30){
    hit(w,r,d);d.hp--;w.collisions++;d.armed=false;d.lastRock=r.id;d.cooldown=.8;d.recoil=.55;d.vx=nx*145;d.vy=ny*145;d.pathKey='';
    if(!w.company.scanner){d.wander=0;}
    if(d.hp<=0){d.hp=0;w.lost+=d.cargo;d.cargo=0;d.state='dead';effect(w,{type:'dead',x:d.x,y:d.y},1);}
   }else{
    const inward=d.vx*nx+d.vy*ny;if(inward<0){d.vx-=inward*nx;d.vy-=inward*ny;}
    if(d.state==='mine'&&!controlled){d.wander=0;}
   }
   d.x=r.x+nx*(r.r+8.2);d.y=r.y+ny*(r.r+8.2);
  }
  if(d.state==='dead')continue;
  // Pickup continues while recalling, but never adds cargo after destruction.
  for(let i=w.ores.length-1;i>=0;i--){const ore=w.ores[i];if(distance(d,ore)<18&&d.cargo+ore.value<=CAPACITY){d.cargo+=ore.value;effect(w,{type:'ore',x:ore.x,y:ore.y,amount:ore.value,tx:(ore.age??1)<STEP*2?ore.originX:undefined,ty:ore.originY},.7);w.ores.splice(i,1);}}
  const berth={x:HOME.x+(d.id-(w.drones.length-1)/2)*25,y:HOME.y-62};
  if(d.state==='return'&&distance(d,berth)<2&&Math.hypot(d.vx,d.vy)<8){
   d.state='unload';d.unloadTime=0;d.unloadCargo=d.cargo;d.vx=0;d.vy=0;
  }
 }
 if(w.drones.every(d=>d.state==='dead'||d.state==='docked'))w.phase='done';
}
export function settle(c:Company,w:World):Company{return {...c,credits:c.credits+w.delivered,total:c.total+w.delivered,rounds:c.rounds+1};}
