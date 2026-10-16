import {type Camera,newCamera} from './camera.ts';
import { HOME, FAR, W, H, ORE_PICKUP_DELAY, visibleAt, exploredAt, investigated, type World } from './sim.ts';
import {POIS,CELL,COLS,ROWS} from './knowledge.ts';
import {drawShip,drawMother,drawOutpost,drawTurret,drawRock,rockArtTier,drawPoi,rockPalette,type RockPalette} from './art.ts';
import {BIOMES,biomeAt} from './biomes.ts';
import {newTrailState,updateTrails,drawTrails,type TrailSource,type TrailState} from './trails.ts';
import {MINERALS} from './minerals.ts';
const gold='#f5b743';
const rockPalettes=new WeakMap<object,RockPalette>();
const trailStates=new WeakMap<World,TrailState>();
function activeTrails(w:World):TrailSource[]{
 const sources:TrailSource[]=[];
 for(const d of w.drones)if(d.state==='mine'||d.state==='return')sources.push({id:`miner:${d.id}`,kind:d.kind,x:d.x,y:d.y,angle:d.angle});
 for(const h of w.haulers)if(h.state==='work'||h.state==='return')sources.push({id:`hauler:${h.id}`,kind:'hauler',x:h.x,y:h.y,angle:h.angle});
 for(const g of w.guards)if(g.hp>0)sources.push({id:`escort:${g.id}`,kind:'escort',x:g.x,y:g.y,angle:g.angle});
 for(const s of w.scouts)if(s.state==='exploring'||s.state==='avoiding'||s.state==='return')sources.push({id:`scout:${s.id}`,kind:'scout',x:s.x,y:s.y,angle:s.angle});
 for(const e of w.enemies)if(e.hp>0&&visibleAt(w,e))sources.push({id:`enemy:${e.id}`,kind:'enemyScout',x:e.x,y:e.y,angle:Math.hypot(e.vx,e.vy)>.01?Math.atan2(e.vy,e.vx):-Math.PI/2});
 return sources;
}
let biomeCanvas:HTMLCanvasElement|undefined;
function biomeImage(){
 if(biomeCanvas)return biomeCanvas;
 const image=document.createElement('canvas');image.width=130;image.height=120;
 const ctx=image.getContext('2d')!;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  const px=(x+.5)*W/image.width,py=(y+.5)*H/image.height,color=[0,0,0];
  // A one-time spatial filter gives organic ~100-unit transitions without
  // a per-frame pixel pass or biome-sized square seams at Fog cells.
  for(const ox of [-50,0,50])for(const oy of [-50,0,50]){
   const sample=BIOMES[biomeAt(px+ox,py+oy)].color;
   for(let channel=0;channel<3;channel++)color[channel]+=sample[channel]/9;
  }
  ctx.fillStyle=`rgb(${color.map(Math.round).join(',')})`;ctx.fillRect(x,y,1,1);
 }
 biomeCanvas=image;return image;
}
const fogCache=new WeakMap<World,{revision:number;bits:Uint8Array;canvas:HTMLCanvasElement}>();
function fogImage(w:World){
 let cached=fogCache.get(w);
 if(cached?.revision===w.mapRevision)return cached.canvas;
 if(!cached){const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const c=canvas.getContext('2d')!;c.fillStyle='#050d16';c.fillRect(0,0,W,H);
  cached={revision:-1,bits:new Uint8Array(w.explored.length),canvas};fogCache.set(w,cached);
 }
 const c=cached.canvas.getContext('2d')!;
 for(let i=0;i<w.explored.length;i++){
  const added=w.explored[i]&~cached.bits[i];if(!added)continue;
  for(let bit=0;bit<8;bit++)if(added&(1<<bit)){
   const cell=i*8+bit,col=cell%COLS,row=Math.floor(cell/COLS);
   if(row<ROWS)c.clearRect(col*CELL,row*CELL,CELL,CELL);
  }
  cached.bits[i]=w.explored[i];
 }
 cached.revision=w.mapRevision;return cached.canvas;
}
export function render(canvas: HTMLCanvasElement, w: World, selected = -1, camera:Camera=newCamera()) {
 const c = canvas.getContext('2d')!; const VIEW_W=camera.width,VIEW_H=camera.height;const sx=canvas.width/VIEW_W, sy=canvas.height/VIEW_H;
 c.setTransform(sx,0,0,sy,0,0);c.fillStyle='#07121b';c.fillRect(0,0,VIEW_W,VIEW_H);c.save();c.translate(VIEW_W/2,VIEW_H/2);c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);c.fillStyle='#0a1a25';c.fillRect(0,0,W,H);
 const left=Math.max(0,Math.floor(camera.x-VIEW_W/(2*camera.zoom)-30)),top=Math.max(0,Math.floor(camera.y-VIEW_H/(2*camera.zoom)-30));
 const right=Math.min(W,Math.ceil(camera.x+VIEW_W/(2*camera.zoom)+30)),bottom=Math.min(H,Math.ceil(camera.y+VIEW_H/(2*camera.zoom)+30));
 const bw=Math.max(0,right-left),bh=Math.max(0,bottom-top);
 if(bw&&bh){const image=biomeImage();c.imageSmoothingEnabled=true;c.drawImage(image,left*image.width/W,top*image.height/H,bw*image.width/W,bh*image.height/H,left,top,bw,bh);}
 // Inert, sparse region texture sits below Fog and every game object.
 for(let i=0;i<165;i++){
  const x=(i*947+131)%W,y=(i*631+47)%H,id=biomeAt(x,y);
  if(id==='scrap_fields'){c.strokeStyle='#978f6640';c.beginPath();c.moveTo(x-3,y+1);c.lineTo(x+3,y-1);c.stroke();}
  else if(id==='contested'){c.fillStyle='#9e626735';c.fillRect(x,y,2,2);}
  else if(id==='ion_storm'){c.strokeStyle='#707aab38';c.beginPath();c.moveTo(x-6,y+3);c.lineTo(x+5,y-2);c.stroke();}
  else if(id==='dead_zone'){c.fillStyle='#77795f38';c.fillRect(x,y,2,1);}
 }
 c.strokeStyle='#26404d35';c.lineWidth=.6; c.beginPath(); for(let x=0;x<W;x+=25){c.moveTo(x,0);c.lineTo(x,H);}for(let y=0;y<H;y+=25){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();
 for(let i=0;i<144;i++){c.fillStyle=i%4===0?'#71929a66':'#71929a2b';c.fillRect((i*137+19)%W,(i*83+41)%H,i%4===0?1.4:1,1);}
 c.strokeStyle='#68828c3b';for(let i=0;i<9;i++){const x=35+i%3*165,y=34+Math.floor(i/3)*230;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}
 c.font='8px monospace'; c.fillStyle='#557280'; c.fillText('HOME FIELD',30,32);c.fillText('FAR BELT',850,32);c.fillText('OUTER REACH',1700,1450);c.strokeStyle='#47616b';c.strokeRect(1,1,W-2,H-2);
 // Explored/visible bitsets drive the field. Unknown cells
 // never get object drawing; known terrain remains a subdued map memory.
 const mask=fogImage(w);if(bw&&bh)c.drawImage(mask,left,top,bw,bh,left,top,bw,bh);
 if(w.surveyFocus){c.strokeStyle='#8abdc499';c.setLineDash([5,8]);c.lineWidth=1;c.beginPath();c.arc(w.surveyFocus.x,w.surveyFocus.y,28,0,Math.PI*2);c.stroke();c.setLineDash([]);}
 for(const site of POIS){if(!w.discoveredPois.has(site.id))continue;
  const done=investigated(w,site.id),locked=w.activeTarget===site.id;
  drawPoi(c,site.id,site.x,site.y,done,locked);
  if(!done&&w.activeInvestigations.has(site.id)){c.fillStyle='#24424a';c.fillRect(site.x-17,site.y+26,34,3);c.fillStyle='#91d8cc';c.fillRect(site.x-17,site.y+26,34*Math.min(1,(w.poiProgress[site.id]??0)/4),3);}
  if(visibleAt(w,site)){c.font='8px monospace';c.textAlign='center';c.fillStyle='#b6dfd6';c.fillText(done?'INVESTIGATED':locked?'TARGET LOCKED':'SIGNAL',site.x,site.y-28);}
 }
 for(const r of w.rocks){
  if(!exploredAt(w,r)||r.hp<=0)continue;
  const impact=w.effects.find(e=>e.type==='hit'&&e.x===r.x&&e.y===r.y),pulse=impact?impact.life/impact.max:0;
  let palette=rockPalettes.get(r);if(!palette){palette=rockPalette(biomeAt(r.x,r.y));rockPalettes.set(r,palette);}
  drawRock(c,r,rockArtTier(r,w.identifiedRocks.has(r.id)),pulse,palette);
 }
 let trails=trailStates.get(w);if(!trails){trails=newTrailState();trailStates.set(w,trails);}
 updateTrails(trails,w.time,activeTrails(w));
 drawTrails(c,trails,w.time,left,top,right,bottom);
 for(const o of w.ores){if(!exploredAt(w,o))continue;const age=o.age??1,t=Math.min(1,age/ORE_PICKUP_DELAY),flight=1-(1-t)*(1-t);
  const originX=o.originX??o.x,originY=o.originY??o.y,dx=o.x-originX,dy=o.y-originY;
  const x=originX+dx*flight,y=originY+dy*flight;
  if(t<1){c.strokeStyle='#f5b74377';c.lineWidth=2;c.beginPath();c.moveTo(x-dx*(1-t)*.18,y-dy*(1-t)*.18);c.lineTo(x,y);c.stroke();}
  const direction=Math.atan2(dy,dx),spread=Math.sin(t*Math.PI)*(o.id%2?6:-6);
  c.save();c.translate(x-Math.sin(direction)*spread,y+Math.cos(direction)*spread);c.rotate(.4+Math.min(age,.5)*5);c.shadowColor=MINERALS[o.mineral??'ferrite'].color;c.shadowBlur=t<1?5:0;c.fillStyle=MINERALS[o.mineral??'ferrite'].color;c.beginPath();c.moveTo(0,-4);c.lineTo(4,0);c.lineTo(1,4);c.lineTo(-3,2);c.lineTo(-4,-1);c.closePath();c.fill();c.restore();}
 const arrivals=w.effects.filter(e=>e.type==='transfer');
 const bounce=Math.max(0,...arrivals.map(e=>{const t=e.max-e.life-.26;return t>0?Math.sin(t/.09*Math.PI)*.065:0;}));
 if(w.base.x===FAR.x){drawMother(c,w.time,0,HOME.x,HOME.y);drawOutpost(c,FAR.x,FAR.y,true,w.time*.6,bounce);}
 else {drawMother(c,w.time,bounce,HOME.x,HOME.y);if(w.company.outpost)drawOutpost(c,FAR.x,FAR.y,false,w.time*.6);}
 if(w.company.turret){const target=w.enemies.filter(e=>e.hp>0&&visibleAt(w,e)).sort((a,b)=>Math.hypot(a.x-HOME.x,a.y-HOME.y)-Math.hypot(b.x-HOME.x,b.y-HOME.y))[0];drawTurret(c,HOME.x,HOME.y-15,target?Math.atan2(target.y-HOME.y,target.x-HOME.x)+Math.PI/2:w.time*.35);}
 for(const d of w.drones){
   if(d.state==='dead'){ c.strokeStyle='#7d5350';c.lineWidth=2;c.beginPath();c.moveTo(d.x-5,d.y-5);c.lineTo(d.x+5,d.y+5);c.moveTo(d.x-5,d.y+5);c.lineTo(d.x+5,d.y-5);c.stroke();continue;}
   if(selected===d.id){c.strokeStyle='#f5b74388';c.lineWidth=1;c.beginPath();c.arc(d.x,d.y,21,0,7);c.stroke();}
   drawShip(c,d.kind,d.x,d.y,d.angle,{time:w.time,thrust:d.state==='mine'||d.state==='return'});
   if(d.hp<d.maxHp){c.fillStyle='#1a2933';c.fillRect(d.x-10,d.y+24,20,2);c.fillStyle=d.hp/d.maxHp>.4?'#72b5a4':'#db795c';c.fillRect(d.x-10,d.y+24,20*d.hp/d.maxHp,2);}
 }
 for(const h of w.haulers){
   if(h.state==='dead'){c.strokeStyle='#69807c';c.beginPath();c.moveTo(h.x-7,h.y-7);c.lineTo(h.x+7,h.y+7);c.moveTo(h.x-7,h.y+7);c.lineTo(h.x+7,h.y-7);c.stroke();continue;}
   if(selected===h.id){c.strokeStyle='#9bd5cb99';c.beginPath();c.arc(h.x,h.y,22,0,7);c.stroke();}
   drawShip(c,'hauler',h.x,h.y,h.angle,{cargo:h.cargo,capacity:h.capacity,time:w.time,thrust:h.state==='work'||h.state==='return'});
   if(h.hp<h.maxHp){c.fillStyle='#102a34';c.fillRect(h.x-11,h.y+23,22,2);c.fillStyle='#9bd5cb';c.fillRect(h.x-11,h.y+23,22*h.hp/h.maxHp,2);}
 }
 for(const g of w.guards){if(g.hp<=0){c.strokeStyle='#558b86';c.beginPath();c.moveTo(g.x-5,g.y-5);c.lineTo(g.x+5,g.y+5);c.moveTo(g.x-5,g.y+5);c.lineTo(g.x+5,g.y-5);c.stroke();continue;}if(selected===-1000-g.id){c.strokeStyle='#8ee3cc';c.beginPath();c.arc(g.x,g.y,21,0,7);c.stroke();}drawShip(c,'escort',g.x,g.y,g.angle);if(g.hp<g.maxHp){c.fillStyle='#0b2029';c.fillRect(g.x-8,g.y+17,16,2);c.fillStyle='#8ee3cc';c.fillRect(g.x-8,g.y+17,g.hp/g.maxHp*16,2);}}
 for(const s of w.scouts){if(s.state==='dead'||s.state==='docked')continue;
  drawShip(c,'scout',s.x,s.y,s.angle,{time:w.time,thrust:s.state==='exploring'||s.state==='return'});
  if(selected===s.id){c.strokeStyle='#f5b74388';c.beginPath();c.arc(s.x,s.y,20,0,7);c.stroke();}
 }
 for(const foe of w.enemies){if(foe.hp<=0||!visibleAt(w,foe))continue;
  drawShip(c,'enemyScout',foe.x,foe.y,Math.hypot(foe.vx,foe.vy)>.01?Math.atan2(foe.vy,foe.vx):-Math.PI/2);
 }
 for(const e of w.effects){if(!visibleAt(w,e)&&e.type!=='transfer'&&e.type!=='handoff')continue;const a=e.life/e.max;c.globalAlpha=a;
   if(e.type==='transfer'||e.type==='handoff'){
    const t=1-a,travel=Math.min(1,t/.78),ease=travel*travel*(3-2*travel),x=e.x+(e.tx!-e.x)*ease,y=e.y+(e.ty!-e.y)*ease-Math.sin(travel*Math.PI)*14;
    c.globalAlpha=travel<1?1:a*3;c.strokeStyle=e.type==='handoff'?'#d4b878':'#8ee3cc';c.lineWidth=2;c.beginPath();c.moveTo(x-(e.tx!-e.x)*.08,y-(e.ty!-e.y)*.08);c.lineTo(x,y);c.stroke();
    c.save();c.translate(x,y);c.rotate(t*5);c.fillStyle=gold;c.shadowColor=gold;c.shadowBlur=12;c.fillRect(-3,-3,6,6);c.restore();
    if(travel===1){c.strokeStyle='#a4e0cc';c.beginPath();c.arc(e.tx!,e.ty!,4+(t-.78)*70,0,7);c.stroke();}
   }
   else if(e.type==='enemyShot'||e.type==='guardShot'||e.type==='turretShot'){c.strokeStyle=e.type==='enemyShot'?'#f5848d':e.type==='turretShot'?'#f5b743':'#8af0dc';c.lineWidth=3*a+1;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.fillStyle=c.strokeStyle;c.beginPath();c.arc(e.tx!,e.ty!,3+(1-a)*8,0,7);c.fill();}
   else if(e.type==='laser'){c.strokeStyle='#67d9ce';c.lineWidth=4;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.strokeStyle='#eaffec';c.lineWidth=1.2;c.stroke();}
   else if(e.type==='ore'&&e.max-e.life<.25&&e.tx!==undefined){
    const t=1-Math.exp(-(e.max-e.life)*16),x=e.tx+(e.x-e.tx)*t,y=e.ty!+(e.y-e.ty!)*t;
    c.globalAlpha=1;c.fillStyle=gold;c.shadowColor=gold;c.shadowBlur=8;c.save();c.translate(x,y);c.rotate(t*4);c.fillRect(-3,-3,6,6);c.restore();c.shadowBlur=0;
   }
   else if(e.type==='deposit'||e.type==='ore'){c.font=`bold ${e.type==='deposit'?16:10}px monospace`;c.textAlign='center';c.fillStyle=e.type==='deposit'?'#a4e0cc':gold;c.fillText(`+${e.amount}`,e.x,e.y-(1-a)*23);c.textAlign='left';}
   else if(e.type==='hit'){
    c.strokeStyle='#ffe3a1';c.lineWidth=1.4*a;c.beginPath();c.arc(e.x,e.y,3+(1-a)*17,0,7);c.stroke();
    for(let j=0;j<3;j++){const angle=j*2.399+(e.x%9),radius=5+(1-a)*(11+j*2);c.fillStyle=j%2?'#d8a05b':'#a9bab9';c.fillRect(e.x+Math.cos(angle)*radius,e.y+Math.sin(angle)*radius,2.5,2.5);}
   }
   else {c.strokeStyle=e.type==='dead'||e.type==='enemyDead'?'#ee845e':gold;c.lineWidth=1.5;for(let i=0;i<7;i++){const angle=i*.898;const r=(1-a)*25+5;c.beginPath();c.moveTo(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r);c.lineTo(e.x+Math.cos(angle)*(r+5),e.y+Math.sin(angle)*(r+5));c.stroke();}}
   c.globalAlpha=1;
 }
 c.restore();
}
