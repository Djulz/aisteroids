import {type Camera,newCamera} from './camera.ts';
import { HOME, W, H, ORE_PICKUP_DELAY, visibleAt, exploredAt, investigated, type World } from './sim.ts';
import {CELL,COLS,ROWS} from './knowledge.ts';
import {drawShip,drawMother,drawOutpost,drawTurret,drawRock,rockArtTier,drawPoi,rockPalette,drawMineral,drawMiningRig,drawCargoCart,type RockPalette} from './art.ts';
import {BIOMES,biomeAt} from './biomes.ts';
import {newTrailState,updateTrails,drawTrails,type TrailSource,type TrailState} from './trails.ts';
import {MINERALS} from './minerals.ts';
import {focusRoles,markerOffset,type FocusRole} from './focus.ts';
import {ENEMY_TYPES,isLifeform} from './patrols.ts';
const gold='#f5b743';
const rockPalettes=new WeakMap<object,RockPalette>();
const trailStates=new WeakMap<World,TrailState>();
function activeTrails(w:World):TrailSource[]{
 const sources:TrailSource[]=[];
 for(const d of w.drones)if(d.state==='mine'||d.state==='return')sources.push({id:`miner:${d.id}`,kind:d.kind,x:d.x,y:d.y,angle:d.angle});
 for(const h of w.haulers)if(h.state==='work'||h.state==='return')sources.push({id:`hauler:${h.id}`,kind:'hauler',x:h.x,y:h.y,angle:h.angle});
 for(const g of w.guards)if(g.hp>0)sources.push({id:`escort:${g.id}`,kind:'escort',x:g.x,y:g.y,angle:g.angle});
 for(const s of w.scouts)if(s.state==='exploring'||s.state==='avoiding'||s.state==='return')sources.push({id:`scout:${s.id}`,kind:'scout',x:s.x,y:s.y,angle:s.angle});
 for(const e of w.enemies)if(e.hp>0&&e.kind!=='sentry'&&e.kind!=='spore'&&visibleAt(w,e))sources.push({id:`enemy:${e.id}`,kind:ENEMY_TYPES[e.kind??'patrol'].art,x:e.x,y:e.y,angle:Math.hypot(e.vx,e.vy)>.01?Math.atan2(e.vy,e.vx):-Math.PI/2});
 return sources;
}
let biomeCanvas:HTMLCanvasElement|undefined,biomeSeed=-1;
function biomeImage(seed:number){
 if(biomeCanvas&&biomeSeed===seed)return biomeCanvas;
 const image=document.createElement('canvas');image.width=200;image.height=174;
 const ctx=image.getContext('2d')!;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  const px=(x+.5)*W/image.width,py=(y+.5)*H/image.height,color=[0,0,0];
  // A one-time spatial filter gives organic ~100-unit transitions without
  // a per-frame pixel pass or biome-sized square seams at Fog cells.
  for(const ox of [-50,0,50])for(const oy of [-50,0,50]){
   const sample=BIOMES[biomeAt(px+ox,py+oy,seed)].color;
   for(let channel=0;channel<3;channel++)color[channel]+=sample[channel]/9;
  }
  ctx.fillStyle=`rgb(${color.map(Math.round).join(',')})`;ctx.fillRect(x,y,1,1);
 }
 biomeCanvas=image;biomeSeed=seed;return image;
}
const fogCache=new WeakMap<World,{revision:number;bits:Uint8Array;canvas:HTMLCanvasElement}>();
function fogImage(w:World){
 let cached=fogCache.get(w);
 if(cached?.revision===w.mapRevision)return cached.canvas;
 if(!cached){const canvas=document.createElement('canvas');canvas.width=COLS;canvas.height=ROWS;
  const c=canvas.getContext('2d')!;c.fillStyle='#050d16';c.fillRect(0,0,COLS,ROWS);
  cached={revision:-1,bits:new Uint8Array(w.explored.length),canvas};fogCache.set(w,cached);
 }
 const c=cached.canvas.getContext('2d')!;
 for(let i=0;i<w.explored.length;i++){
  const added=w.explored[i]&~cached.bits[i];if(!added)continue;
  for(let bit=0;bit<8;bit++)if(added&(1<<bit)){
   const cell=i*8+bit,col=cell%COLS,row=Math.floor(cell/COLS);
   if(row<ROWS)c.clearRect(col,row,1,1);
  }
  cached.bits[i]=w.explored[i];
 }
 cached.revision=w.mapRevision;return cached.canvas;
}
export function render(canvas: HTMLCanvasElement, w: World, selected = -1, camera:Camera=newCamera(),selectedEnemy:number|null=null) {
 const c = canvas.getContext('2d')!; const VIEW_W=camera.width,VIEW_H=camera.height;const sx=canvas.width/VIEW_W, sy=canvas.height/VIEW_H;
 c.setTransform(sx,0,0,sy,0,0);c.fillStyle='#07121b';c.fillRect(0,0,VIEW_W,VIEW_H);c.save();c.translate(VIEW_W/2,VIEW_H/2);c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);c.fillStyle='#0a1a25';c.fillRect(0,0,W,H);
 const left=Math.max(0,Math.floor(camera.x-VIEW_W/(2*camera.zoom)-30)),top=Math.max(0,Math.floor(camera.y-VIEW_H/(2*camera.zoom)-30));
 const right=Math.min(W,Math.ceil(camera.x+VIEW_W/(2*camera.zoom)+30)),bottom=Math.min(H,Math.ceil(camera.y+VIEW_H/(2*camera.zoom)+30));
 const bw=Math.max(0,right-left),bh=Math.max(0,bottom-top);
 if(bw&&bh){const image=biomeImage(w.definition.seed);c.imageSmoothingEnabled=true;c.drawImage(image,left*image.width/W,top*image.height/H,bw*image.width/W,bh*image.height/H,left,top,bw,bh);}
 // Inert, sparse region texture sits below Fog and every game object.
 for(let i=0;i<165;i++){
  const x=(i*947+131)%W,y=(i*631+47)%H,id=biomeAt(x,y,w.definition.seed);
  if(id==='scrap_fields'){c.strokeStyle='#978f6640';c.beginPath();c.moveTo(x-3,y+1);c.lineTo(x+3,y-1);c.stroke();}
  else if(id==='contested'){c.fillStyle='#9e626735';c.fillRect(x,y,2,2);}
  else if(id==='ion_storm'){c.strokeStyle='#707aab38';c.beginPath();c.moveTo(x-6,y+3);c.lineTo(x+5,y-2);c.stroke();}
  else if(id==='dead_zone'){c.fillStyle='#77795f38';c.fillRect(x,y,2,1);}
 }
 c.strokeStyle='#26404d35';c.lineWidth=.6; c.beginPath(); for(let x=0;x<W;x+=25){c.moveTo(x,0);c.lineTo(x,H);}for(let y=0;y<H;y+=25){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();
 for(let i=0;i<144;i++){c.fillStyle=i%4===0?'#71929a66':'#71929a2b';c.fillRect((i*137+19)%W,(i*83+41)%H,i%4===0?1.4:1,1);}
 c.strokeStyle='#68828c3b';for(let i=0;i<9;i++){const x=35+i%3*165,y=34+Math.floor(i/3)*230;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}
 c.font='8px monospace'; c.fillStyle='#557280'; c.fillText('HOME BELT',HOME.x-100,HOME.y-400);c.fillText('SCRAP FIELDS',HOME.x+900,HOME.y-700);c.strokeStyle='#47616b';c.strokeRect(1,1,W-2,H-2);
 // Only unexplored cells are black. Charted space always shows live activity.
 const mask=fogImage(w);if(bw&&bh){c.imageSmoothingEnabled=false;c.drawImage(mask,left/CELL,top/CELL,bw/CELL,bh/CELL,left,top,bw,bh);}
 for(const site of w.definition.pois){if(!w.discoveredPois.has(site.id))continue;
  const done=investigated(w,site.id),locked=w.activeTarget===site.id;
  drawPoi(c,site.id,site.x,site.y,done,locked);
  if(!done&&w.activeInvestigations.has(site.id)){c.fillStyle='#24424a';c.fillRect(site.x-17,site.y+26,34,3);c.fillStyle='#91d8cc';c.fillRect(site.x-17,site.y+26,34*Math.min(1,(w.poiProgress[site.id]??0)/4),3);}
  if(visibleAt(w,site)){c.font='8px monospace';c.textAlign='center';c.fillStyle='#b6dfd6';c.fillText(done?'INVESTIGATED':locked?'TARGET LOCKED':'SIGNAL',site.x,site.y-28);}
 }
 for(const r of w.rocks){
  if(!exploredAt(w,r)||r.hp<=0||r.x+r.r<left||r.x-r.r>right||r.y+r.r<top||r.y-r.r>bottom)continue;
  const impact=w.effects.find(e=>e.type==='hit'&&e.x===r.x&&e.y===r.y),pulse=impact?impact.life/impact.max:0;
  let palette=rockPalettes.get(r);if(!palette){palette=rockPalette(biomeAt(r.x,r.y,w.definition.seed));rockPalettes.set(r,palette);}
  drawRock(c,r,rockArtTier(r,w.identifiedRocks.has(r.id)),pulse,palette);
 }
 let trails=trailStates.get(w);if(!trails){trails=newTrailState();trailStates.set(w,trails);}
 updateTrails(trails,w.time,activeTrails(w));
 drawTrails(c,trails,w.time,left,top,right,bottom);
 for(const o of w.ores){if(!exploredAt(w,o))continue;const age=o.age??1,t=Math.min(1,age/ORE_PICKUP_DELAY),flight=1-(1-t)*(1-t);
  const originX=o.originX??o.x,originY=o.originY??o.y,dx=o.x-originX,dy=o.y-originY;
  const x=originX+dx*flight,y=originY+dy*flight;
  if(t<1){c.strokeStyle=MINERALS[o.mineral].color;c.globalAlpha=.55;c.lineWidth=1.5;c.beginPath();c.moveTo(x-dx*(1-t)*.18,y-dy*(1-t)*.18);c.lineTo(x,y);c.stroke();c.globalAlpha=1;}
  const direction=Math.atan2(dy,dx),spread=Math.sin(t*Math.PI)*(o.id%2?6:-6);
  c.save();c.translate(x-Math.sin(direction)*spread,y+Math.cos(direction)*spread);c.rotate(.4+Math.min(age,.5)*5);drawMineral(c,o.mineral,0,0,5);c.restore();}
 const arrivals=w.effects.filter(e=>e.type==='transfer');
 const bounce=Math.max(0,...arrivals.map(e=>{const t=e.max-e.life-.26;return t>0?Math.sin(t/.09*Math.PI)*.065:0;}));
 if(w.base.x===w.definition.outpost.x){drawMother(c,w.time,0,HOME.x,HOME.y);drawOutpost(c,w.definition.outpost.x,w.definition.outpost.y,true,w.time*.6,bounce);}
 else {drawMother(c,w.time,bounce,HOME.x,HOME.y);if(w.company.outpost)drawOutpost(c,w.definition.outpost.x,w.definition.outpost.y,false,w.time*.6);}
 if(w.company.turret){const target=w.enemies.filter(e=>e.hp>0&&visibleAt(w,e)).sort((a,b)=>Math.hypot(a.x-w.base.x,a.y-w.base.y)-Math.hypot(b.x-w.base.x,b.y-w.base.y))[0];drawTurret(c,w.base.x,w.base.y-15,target?Math.atan2(target.y-w.base.y,target.x-w.base.x)+Math.PI/2:w.time*.35);}
 for(const d of w.drones){
   if(d.state==='dead'){ c.strokeStyle='#7d5350';c.lineWidth=2;c.beginPath();c.moveTo(d.x-5,d.y-5);c.lineTo(d.x+5,d.y+5);c.moveTo(d.x-5,d.y+5);c.lineTo(d.x+5,d.y-5);c.stroke();continue;}
   if(selected===d.id){c.strokeStyle='#f5b74388';c.lineWidth=1;c.beginPath();c.arc(d.x,d.y,21,0,7);c.stroke();}
   drawShip(c,d.kind,d.x,d.y,d.angle,{time:w.time,thrust:d.state==='mine'||d.state==='return'});
   if(d.state==='full'){c.fillStyle='#f5b743';c.font='bold 16px Barlow Condensed';c.textAlign='center';c.fillText('?',d.x,d.y-22);}
   if(d.hp<d.maxHp){c.fillStyle='#1a2933';c.fillRect(d.x-10,d.y+24,20,2);c.fillStyle=d.hp/d.maxHp>.4?'#72b5a4':'#db795c';c.fillRect(d.x-10,d.y+24,20*d.hp/d.maxHp,2);}
 }
 for(const h of w.haulers){
   if(h.state==='dead'){c.strokeStyle='#69807c';c.beginPath();c.moveTo(h.x-7,h.y-7);c.lineTo(h.x+7,h.y+7);c.moveTo(h.x-7,h.y+7);c.lineTo(h.x+7,h.y-7);c.stroke();continue;}
   if(selected===h.id){c.strokeStyle='#9bd5cb99';c.beginPath();c.arc(h.x,h.y,22,0,7);c.stroke();}
   drawShip(c,'hauler',h.x,h.y,h.angle,{cargo:h.cargo,capacity:h.capacity,time:w.time,thrust:h.state==='work'||h.state==='return'});
   if(h.hp<h.maxHp){c.fillStyle='#102a34';c.fillRect(h.x-11,h.y+23,22,2);c.fillStyle='#9bd5cb';c.fillRect(h.x-11,h.y+23,22*h.hp/h.maxHp,2);}
 }
 for(const rig of w.rigs){if(rig.state==='dead')continue;
  drawMiningRig(c,rig.x,rig.y,rig.angle,rig.state,rig.cargo,rig.capacity,w.time);
  if(rig.state==='deploy'||rig.state==='pack'){c.strokeStyle='#eeb950';c.lineWidth=2;c.beginPath();c.arc(rig.x,rig.y,29,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,rig.setup/2));c.stroke();}
 }
 for(const cart of w.carts)if(!cart.destroyed)drawCargoCart(c,cart.x,cart.y,cart.cargo,cart.capacity,cart.hp,cart.maxHp);
 if(w.service){const buoy=w.service;c.save();c.translate(buoy.x,buoy.y);c.strokeStyle='#72c7bd';c.lineWidth=2;c.strokeRect(-11,-11,22,22);c.fillStyle='#1b3640';c.fillRect(-7,-7,14,14);c.fillStyle='#72c7bd';c.fillRect(-2,-5,4,10);c.fillRect(-5,-2,10,4);if(buoy.cargoItems.length){c.fillStyle='#f5b743';c.fillRect(-8,14,16*buoy.cargoItems.length/12,2);}c.restore();}
 for(const b of w.beacons){c.strokeStyle='#72c7bd99';c.lineWidth=1;c.beginPath();c.arc(b.x,b.y,8,0,7);c.stroke();c.fillStyle='#72c7bd';c.fillRect(b.x-2,b.y-2,4,4);}
 for(const d of w.decoys){c.strokeStyle='#e69c30';c.beginPath();c.arc(d.x,d.y,8+(d.expires-w.time)*3,0,7);c.stroke();}
 for(const s of w.shields){const worker=[...w.drones,...w.haulers,...w.rigs].find(d=>d.id===s.targetId&&d.state!=='dead');if(!worker)continue;c.strokeStyle='#8bded0aa';c.lineWidth=1.3;c.beginPath();c.arc(worker.x,worker.y,24,0,7);c.stroke();}
 for(const g of w.guards){if(g.hp<=0){c.strokeStyle='#558b86';c.beginPath();c.moveTo(g.x-5,g.y-5);c.lineTo(g.x+5,g.y+5);c.moveTo(g.x-5,g.y+5);c.lineTo(g.x+5,g.y-5);c.stroke();continue;}if(selected===-1000-g.id){c.strokeStyle='#8ee3cc';c.beginPath();c.arc(g.x,g.y,21,0,7);c.stroke();}drawShip(c,'escort',g.x,g.y,g.angle);if(g.hp<g.maxHp){c.fillStyle='#0b2029';c.fillRect(g.x-8,g.y+17,16,2);c.fillStyle='#8ee3cc';c.fillRect(g.x-8,g.y+17,g.hp/g.maxHp*16,2);}}
 for(const s of w.scouts){if(s.state==='dead'||s.state==='docked')continue;
  drawShip(c,'scout',s.x,s.y,s.angle,{time:w.time,thrust:s.state==='exploring'||s.state==='return'});
  if(selected===s.id){c.strokeStyle='#f5b74388';c.beginPath();c.arc(s.x,s.y,20,0,7);c.stroke();}
 }
 for(const foe of w.enemies){if(foe.hp<=0||!visibleAt(w,foe))continue;
  const stats=ENEMY_TYPES[foe.kind??'patrol'];
  if(foe.id===selectedEnemy){
   // Segment clipping prevents a selected patrol from revealing its hidden route.
   const line=(a:{x:number;y:number},b:{x:number;y:number})=>{
    const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/10));
    for(let i=0;i<n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n},q={x:a.x+(b.x-a.x)*(i+1)/n,y:a.y+(b.y-a.y)*(i+1)/n};
     if(visibleAt(w,p)&&visibleAt(w,q)){c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}}
   };
   c.strokeStyle='#ed859066';c.lineWidth=1;c.setLineDash([5,5]);c.beginPath();
   for(const [center,radius] of [[foe,stats.sensors],...(foe.patrol?[[foe.patrol.home,foe.patrol.radius]]:[])] as [{x:number;y:number},number][])
    for(let i=0;i<80;i++)line({x:center.x+Math.cos(i/80*Math.PI*2)*radius,y:center.y+Math.sin(i/80*Math.PI*2)*radius},{x:center.x+Math.cos((i+1)/80*Math.PI*2)*radius,y:center.y+Math.sin((i+1)/80*Math.PI*2)*radius});
   c.stroke();c.setLineDash([]);c.strokeStyle='#ed859088';c.beginPath();
   foe.patrol?.route.forEach((p,i,route)=>line(p,route[(i+1)%route.length]));c.stroke();
   c.beginPath();c.arc(foe.x,foe.y,23,0,7);c.stroke();
  }
  drawShip(c,stats.art,foe.x,foe.y,Math.hypot(foe.vx,foe.vy)>.01?Math.atan2(foe.vy,foe.vx):-Math.PI/2);
  if(foe.mode==='alert'){c.font='bold 19px Barlow Condensed';c.textAlign='center';c.fillStyle='#ffc363';c.fillText('!',foe.x,foe.y-25);}
  if(foe.hp<stats.hp){c.fillStyle='#261d28';c.fillRect(foe.x-10,foe.y+20,20,2);c.fillStyle=isLifeform(foe.kind)?'#b6d780':'#ee8590';c.fillRect(foe.x-10,foe.y+20,20*Math.max(0,foe.hp/stats.hp),2);}
 }
 for(const e of w.effects){if(!visibleAt(w,e)&&e.type!=='transfer'&&e.type!=='handoff')continue;const a=e.life/e.max;c.globalAlpha=a;
   if(e.type==='transfer'||e.type==='handoff'){
    const t=1-a,travel=Math.min(1,t/.78),ease=travel*travel*(3-2*travel),x=e.x+(e.tx!-e.x)*ease,y=e.y+(e.ty!-e.y)*ease-Math.sin(travel*Math.PI)*14;
    c.globalAlpha=travel<1?1:a*3;
    const items=e.items??[{mineral:'ferrite' as const}];
    const samples=items.length<=3?items:[items[0],items[Math.floor(items.length/2)],items.at(-1)!];
    samples.forEach((item,i)=>{const shift=(i-(samples.length-1)/2)*7;c.save();c.translate(x+shift,y+shift*.35);c.rotate(t*3);drawMineral(c,item.mineral,0,0,4);c.restore();});
    if(travel===1){c.strokeStyle='#a4e0cc';c.beginPath();c.arc(e.tx!,e.ty!,4+(t-.78)*70,0,7);c.stroke();}
   }
   else if(e.type==='enemyShot'||e.type==='creatureStrike'||e.type==='guardShot'||e.type==='turretShot'){c.strokeStyle=e.type==='creatureStrike'?'#b6d780':e.type==='enemyShot'?'#f5848d':e.type==='turretShot'?'#f5b743':'#8af0dc';c.lineWidth=3*a+1;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.fillStyle=c.strokeStyle;c.beginPath();c.arc(e.tx!,e.ty!,3+(1-a)*8,0,7);c.fill();}
   else if(e.type==='laser'){c.strokeStyle='#67d9ce';c.lineWidth=4;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.strokeStyle='#eaffec';c.lineWidth=1.2;c.stroke();}
   else if(e.type==='phase'){c.strokeStyle='#f5b743';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.setLineDash([]);}
   else if(e.type==='ore'&&e.max-e.life<.25&&e.tx!==undefined){
    const t=1-Math.exp(-(e.max-e.life)*16),x=e.tx+(e.x-e.tx)*t,y=e.ty!+(e.y-e.ty!)*t;
    c.globalAlpha=1;c.save();c.translate(x,y);c.rotate(t*4);drawMineral(c,e.items?.[0]?.mineral??'ferrite',0,0,4);c.restore();
   }
   else if(e.type==='deposit'||e.type==='ore'){c.font=`bold ${e.type==='deposit'?16:10}px monospace`;c.textAlign='center';c.fillStyle=e.type==='deposit'?'#a4e0cc':gold;c.fillText(`+${e.amount}`,e.x,e.y-(1-a)*23);c.textAlign='left';}
   else if(e.type==='hit'){
    c.strokeStyle='#ffe3a1';c.lineWidth=1.4*a;c.beginPath();c.arc(e.x,e.y,3+(1-a)*17,0,7);c.stroke();
    for(let j=0;j<3;j++){const angle=j*2.399+(e.x%9),radius=5+(1-a)*(11+j*2);drawMineral(c,e.items?.[0]?.mineral??'ferrite',e.x+Math.cos(angle)*radius,e.y+Math.sin(angle)*radius,2);}
   }
   else {c.strokeStyle=e.type==='dead'||e.type==='enemyDead'?'#ee845e':gold;c.lineWidth=1.5;for(let i=0;i<7;i++){const angle=i*.898;const r=(1-a)*25+5;c.beginPath();c.moveTo(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r);c.lineTo(e.x+Math.cos(angle)*(r+5),e.y+Math.sin(angle)*(r+5));c.stroke();}}
   c.globalAlpha=1;
 }
 // Player-authored pins sit above fog without revealing any hidden entity.
 const overlap=!!w.focuses.mining&&!!w.focuses.scout&&Math.hypot(w.focuses.mining.x-w.focuses.scout.x,w.focuses.mining.y-w.focuses.scout.y)*camera.zoom<32;
 for(const role of focusRoles){const p=w.focuses[role];if(!p)continue;
  const x=p.x+markerOffset(role,overlap)/camera.zoom,y=p.y;
  const active=w.phase==='mining'&&focusWorking(w,role,p);
  c.save();c.translate(x,y);c.scale(1/camera.zoom,1/camera.zoom);
  const color=role==='mining'?'#f5b743':'#8ee3d3';
  c.fillStyle='#0a1a25ee';c.strokeStyle=color;c.lineWidth=1.5;
  c.beginPath();c.arc(0,0,13,0,7);c.fill();c.stroke();
  if(active){c.save();c.rotate(w.time*.8);c.beginPath();c.arc(0,0,17,-.55,.8);c.stroke();c.restore();}
  else {c.globalAlpha=.55;c.beginPath();c.arc(0,0,17,0,7);c.stroke();c.globalAlpha=1;}
  c.strokeStyle=color;c.lineWidth=2;c.lineCap='round';
  if(role==='mining'){
   c.beginPath();c.moveTo(-5,5);c.lineTo(5,-5);c.moveTo(-7,-5);c.lineTo(-3,-7);c.lineTo(7,3);c.stroke();
  }else{
   c.beginPath();c.arc(0,0,4,0,7);c.moveTo(0,-8);c.lineTo(0,-5);c.moveTo(0,5);c.lineTo(0,8);c.stroke();
  }
  c.restore();
 }
 c.restore();
}
export function focusWorking(w:World,role:FocusRole,p:{x:number;y:number}){
 if(role==='mining')return w.drones.some(d=>d.state==='mine'&&(w.rocks.some(r=>r.id===d.targetRock&&r.hp>0&&w.identifiedRocks.has(r.id)&&Math.hypot(r.x-p.x,r.y-p.y)<330)||d.oreQueue.some(id=>w.ores.some(o=>o.id===id&&Math.hypot(o.x-p.x,o.y-p.y)<330))));
 return w.scouts.some(s=>s.state==='exploring'&&Math.hypot(s.targetX-p.x,s.targetY-p.y)<Math.hypot(s.x-p.x,s.y-p.y)-12);
}
