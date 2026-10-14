import {type Camera,newCamera} from './camera.ts';
import { HOME, FAR, W, H, ORE_PICKUP_DELAY, RESEARCH_STATION, EXPERIMENTAL_PROBE, type World } from './sim.ts';
import {LOGISTICS_SITES} from './logistics-sites.ts';
const gold = '#f5b743', cream = '#e7e2cf';
function drawOutpost(c:CanvasRenderingContext2D,active:boolean,t:number,bounce=0){
 c.save();c.translate(FAR.x,FAR.y);c.scale(1+bounce,1+bounce);c.strokeStyle=active?'#83d8cf':'#598d94';c.fillStyle='#122e36';c.lineWidth=2;
 polygon(c,[[-24,-24],[24,-24],[34,-12],[34,26],[-34,26],[-34,-12]]);c.fill();c.stroke();
 c.fillStyle=active?'#83d8cf':'#5d8991';c.fillRect(-12,-12,24,18);c.fillStyle='#0d1f2a';c.fillRect(-8,-8,16,10);
 c.strokeStyle=active?'#83d8cf88':'#5d899188';c.setLineDash([4,6]);c.beginPath();c.arc(0,0,42,0,Math.PI*2);c.stroke();c.setLineDash([]);
 if(active){c.strokeStyle='#a5f3e3';c.beginPath();c.arc(0,0,14,t, t+1.7);c.stroke();}
 c.restore();
}
function polygon(c: CanvasRenderingContext2D, pts: number[][]) { c.beginPath(); pts.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); }
export function drawGuard(c:CanvasRenderingContext2D,x:number,y:number,angle:number){
 c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.strokeStyle='#8ee5d3';c.fillStyle='#1c4652';c.lineWidth=1.5;
 polygon(c,[[-9,9],[0,-13],[9,9],[0,5]]);c.fill();c.stroke();c.fillStyle='#a8eee3';c.fillRect(-2,-4,4,7);
 c.restore();
}
export function drawTurret(c:CanvasRenderingContext2D,x:number,y:number,t=0){
 c.save();c.translate(x,y);c.fillStyle='#193741';c.strokeStyle='#9fe2d5';c.lineWidth=1.6;c.beginPath();c.arc(0,0,11,0,7);c.fill();c.stroke();c.rotate(t);c.fillStyle='#263f48';c.fillRect(-3,-16,6,15);c.strokeRect(-3,-16,6,15);c.fillStyle='#8ee3cc';c.fillRect(-2,-4,4,4);c.restore();
}
export function drawDrone(c: CanvasRenderingContext2D, x: number, y: number, angle: number, cargo = 0, laser = false, time = 0, thrust = true) {
 c.save(); c.translate(x,y); c.rotate(angle + Math.PI / 2);
 if(thrust){c.fillStyle = '#83caca'; c.globalAlpha = .7; polygon(c,[[-4,12],[0,21 + Math.sin(time*30)*3],[4,12]]); c.fill(); c.globalAlpha = 1;}
 c.fillStyle='#182b36'; c.strokeStyle=gold; c.lineWidth=1.4; c.fillRect(-12,-4,6,15); c.strokeRect(-12,-4,6,15); c.fillRect(6,-4,6,15); c.strokeRect(6,-4,6,15);
 c.fillStyle=gold; polygon(c,[[-7,10],[-8,-5],[-4,-11],[4,-11],[8,-5],[7,10]]); c.fill();
 c.fillStyle='#14232b'; c.fillRect(-4,-6,8,6); c.fillStyle=cream; c.fillRect(-3,3,6,3);
 c.fillStyle='#68c4c1'; for(let i=0;i<cargo;i++) c.fillRect(-5+i*4,7,3,3);
 if(laser){ c.fillStyle=cream; c.fillRect(-11,-13,3,9); c.fillRect(8,-13,3,9); }
 c.restore();
}
export function drawHauler(c:CanvasRenderingContext2D,x:number,y:number,angle:number,cargo:number,capacity:number,time:number,thrust=true){
 c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);
 if(thrust){c.fillStyle='#79bebc99';polygon(c,[[-6,12],[0,18+Math.sin(time*22)*2],[6,12]]);c.fill();}
 c.fillStyle='#26343c';c.strokeStyle='#9bd5cb';c.lineWidth=1.5;
 polygon(c,[[-12,-8],[-7,-13],[7,-13],[12,-8],[12,11],[-12,11]]);c.fill();c.stroke();
 c.fillStyle='#132630';c.fillRect(-9,-5,18,13);c.strokeStyle='#688d92';c.strokeRect(-9,-5,18,13);
 c.fillStyle='#d3aa67';for(let i=0;i<Math.min(5,Math.ceil(cargo/Math.max(1,capacity/5)));i++)c.fillRect(-7+i*3,-2,2,7);
 c.fillStyle='#9bd5cb';c.fillRect(-4,-12,8,3);c.fillStyle='#556f78';c.fillRect(-14,2,3,9);c.fillRect(11,2,3,9);c.restore();
}
export function drawMother(c: CanvasRenderingContext2D, t:number,bounce=0,base=HOME) {
 c.save(); c.translate(base.x,base.y);c.scale(1+bounce,1+bounce);
 c.strokeStyle='#5d78834d'; c.lineWidth=1; c.setLineDash([3,6]); c.beginPath(); c.ellipse(0,0,66,52,0,0,Math.PI*2); c.stroke(); c.setLineDash([]);
 c.fillStyle='#142733'; c.strokeStyle='#596773';
 polygon(c,[[-35,-22],[-22,-35],[22,-35],[35,-22],[35,29],[22,40],[-22,40],[-35,29]]); c.fill(); c.stroke();
 c.fillStyle=cream; polygon(c,[[-26,-22],[-15,-33],[15,-33],[26,-22],[26,28],[13,35],[-13,35],[-26,28]]); c.fill();
 c.fillStyle='#223540'; c.fillRect(-10,-36,20,26); c.strokeStyle=gold; c.lineWidth=2; c.strokeRect(-10,-36,20,26);
 for(const s of [-1,1]) { c.fillStyle='#1a2d37'; c.fillRect(s*33-9,-17,18,40); c.strokeStyle=gold; c.strokeRect(s*33-9,-17,18,40); c.fillStyle=cream; c.fillRect(s*33-5,-12,10,28); c.fillStyle='#1d2b33'; for(let i=0;i<3;i++) c.fillRect(s*33-3,1+i*4,6,2); c.fillStyle=gold;c.fillRect(s*18-2,-17,4,8); }
 c.fillStyle='#162a36'; c.beginPath(); c.arc(0,7,17,0,7); c.fill(); c.strokeStyle='#ac8544'; c.lineWidth=3;c.stroke();
 c.strokeStyle='#78b7b5'; c.lineWidth=2; c.beginPath();c.arc(0,7,10,t*.25,t*.25+Math.PI*1.5);c.stroke();
 c.font='bold 7px monospace';c.textAlign='center';c.fillStyle='#243b47';c.fillText('01',0,31);
 c.restore();
}
export function render(canvas: HTMLCanvasElement, w: World, selected = -1, camera:Camera=newCamera()) {
 const c = canvas.getContext('2d')!; const VIEW_W=camera.width,VIEW_H=camera.height;const sx=canvas.width/VIEW_W, sy=canvas.height/VIEW_H;
 c.setTransform(sx,0,0,sy,0,0);c.fillStyle='#07121b';c.fillRect(0,0,VIEW_W,VIEW_H);c.save();c.translate(VIEW_W/2,VIEW_H/2);c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);c.fillStyle='#0a1a25';c.fillRect(0,0,W,H);
 c.strokeStyle='#26404d35';c.lineWidth=.6; c.beginPath(); for(let x=0;x<W;x+=25){c.moveTo(x,0);c.lineTo(x,H);}for(let y=0;y<H;y+=25){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();
 for(let i=0;i<144;i++){c.fillStyle=i%4===0?'#71929a66':'#71929a2b';c.fillRect((i*137+19)%W,(i*83+41)%H,i%4===0?1.4:1,1);}
 c.strokeStyle='#68828c3b';for(let i=0;i<9;i++){const x=35+i%3*165,y=34+Math.floor(i/3)*230;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}
 c.font='8px monospace'; c.fillStyle='#557280'; c.fillText('HOME FIELD',30,32);c.fillText('FAR BELT',460,32);c.fillText('OUTER REACH',400,720);c.strokeStyle='#47616b';c.strokeRect(1,1,W-2,H-2);
 // One-shot research POIs remain on the persistent map as completed sites.
 const stationDone=w.company.uniqueTechDiscoveries.includes('abandoned_research_station')||w.pendingTech.some(e=>e.id==='abandoned_research_station');
 c.save();c.translate(RESEARCH_STATION.x,RESEARCH_STATION.y);c.fillStyle=stationDone?'#304e52':'#174851';c.strokeStyle=stationDone?'#648080':'#8ee3d3';c.lineWidth=1.4;c.fillRect(-12,-9,24,18);c.strokeRect(-12,-9,24,18);c.fillStyle=stationDone?'#7a9b9c':'#a8f0e6';c.fillRect(-4,-5,8,5);c.fillRect(-16,8,32,3);c.font='8px monospace';c.textAlign='center';c.fillText(stationDone?'RESEARCH LOGGED':'RESEARCH SITE',0,-15);c.restore();
 const probeDone=w.company.uniqueTechDiscoveries.includes('experimental_probe_salvaged')||w.pendingTech.some(e=>e.id==='experimental_probe_salvaged');
 c.save();c.translate(EXPERIMENTAL_PROBE.x,EXPERIMENTAL_PROBE.y);c.fillStyle=probeDone?'#46656a':'#94e6d8';c.strokeStyle='#6cbeb2';c.lineWidth=1.2;c.beginPath();c.moveTo(0,-9);c.lineTo(9,0);c.lineTo(0,9);c.lineTo(-9,0);c.closePath();c.fill();c.stroke();c.fillStyle='#8cb7b8';c.font='8px monospace';c.textAlign='center';c.fillText(probeDone?'PROBE RECOVERED':'PROBE SIGNAL',0,-15);c.restore();
 for(const site of LOGISTICS_SITES){const done=w.company.uniqueTechDiscoveries.includes(site.id)||w.pendingTech.some(e=>e.id===site.id);
  c.save();c.translate(site.x,site.y);c.fillStyle=done?'#3b5e62':'#bdca9c';c.strokeStyle=done?'#587779':'#9be0d1';c.lineWidth=1.2;c.fillRect(-10,-6,20,12);c.strokeRect(-10,-6,20,12);c.fillStyle='#162d35';c.fillRect(-6,-3,12,6);c.font='7px monospace';c.textAlign='center';c.fillStyle=done?'#7c999b':'#b7e5d5';c.fillText(done?'RECOVERED':site.name.toUpperCase(),0,-13);c.restore();
 }
 for(const r of w.rocks){
   if(r.hp<=0) continue;
   const impact=w.effects.find(e=>e.type==='hit'&&e.x===r.x&&e.y===r.y);const pulse=impact?impact.life/impact.max:0;
   c.save();c.translate(r.x+Math.sin(pulse*24)*pulse*2,r.y+Math.cos(pulse*19)*pulse*2);c.rotate(r.id*.73);c.scale(1+pulse*.07,1+pulse*.07);
   const points=r.shape.map((n,i)=>[Math.cos(i/r.shape.length*Math.PI*2)*r.r*n,Math.sin(i/r.shape.length*Math.PI*2)*r.r*n]);
   const scanned=!!(r.rich&&w.company.progress.farSurveyed);
   polygon(c,points); c.fillStyle=scanned?(pulse>.75?'#b9d7c9':'#2b5559'):(pulse>.75?'#ac9f7e':'#34434d');c.fill();c.strokeStyle=scanned?(pulse>.4?'#e4fff0':'#79c9bf'):(pulse>.4?'#efd7a0':'#71808a');c.lineWidth=1;c.stroke();
   for(let i=0;i<5;i++){const a=i*2.4+r.id;const radius=r.r*(i%2?.42:.2);const x=Math.cos(a)*radius,y=Math.sin(a)*radius; c.fillStyle='#23343f';c.beginPath();c.ellipse(x,y,r.r*.14,r.r*.11,a,0,7);c.fill();c.strokeStyle='#53636c';c.lineWidth=.6;c.beginPath();c.arc(x,y,r.r*.14,0,2.5);c.stroke();}
   const damage=1-r.hp/r.max;
   if(damage>.12){c.strokeStyle='#0a1a25';c.lineWidth=1.2+damage*2;c.beginPath();c.moveTo(-r.r*.7,0);c.lineTo(-3,3);c.lineTo(3,-5);c.lineTo(r.r*.5,-r.r*.55);c.stroke();}
   if(damage>.45){c.beginPath();c.moveTo(-3,3);c.lineTo(-r.r*.12,r.r*.46);c.lineTo(r.r*.18,r.r*.66);c.stroke();}
   if(damage>.7){c.strokeStyle='#e5b877';c.beginPath();c.moveTo(3,-5);c.lineTo(r.r*.21,-r.r*.33);c.stroke();}
   if(scanned){c.fillStyle='#7bd4be';for(let i=0;i<3;i++){c.beginPath();c.arc(Math.cos(i*2.1)*r.r*.52,Math.sin(i*2.1)*r.r*.52,2.5,0,7);c.fill();}c.rotate(-r.id*.73);c.strokeStyle='#7bd4be88';c.lineWidth=1;c.beginPath();c.arc(0,0,r.r+6,-Math.PI/2,-Math.PI/2+Math.PI*2*r.hp/r.max);c.stroke();}
   c.restore();
 }
 for(const o of w.ores){const age=o.age??1,t=Math.min(1,age/ORE_PICKUP_DELAY),flight=1-(1-t)*(1-t);
  const originX=o.originX??o.x,originY=o.originY??o.y,dx=o.x-originX,dy=o.y-originY;
  const x=originX+dx*flight,y=originY+dy*flight;
  if(t<1){c.strokeStyle='#f5b74377';c.lineWidth=2;c.beginPath();c.moveTo(x-dx*(1-t)*.18,y-dy*(1-t)*.18);c.lineTo(x,y);c.stroke();}
  const direction=Math.atan2(dy,dx),spread=Math.sin(t*Math.PI)*(o.id%2?6:-6);
  c.save();c.translate(x-Math.sin(direction)*spread,y+Math.cos(direction)*spread);c.rotate(.4+Math.min(age,.5)*5);c.shadowColor=gold;c.shadowBlur=t<1?10:0;c.fillStyle=gold;polygon(c,[[0,-4],[4,0],[1,4],[-3,2],[-4,-1]]);c.fill();c.restore();}
 const arrivals=w.effects.filter(e=>e.type==='transfer');
 const bounce=Math.max(0,...arrivals.map(e=>{const t=e.max-e.life-.26;return t>0?Math.sin(t/.09*Math.PI)*.065:0;}));
 if(w.base.x===FAR.x){drawMother(c,w.time,0,HOME);drawOutpost(c,true,w.time*.6,bounce);}
 else {drawMother(c,w.time,bounce);if(w.company.outpost)drawOutpost(c,false,w.time*.6);}
 if(w.company.turret){const target=w.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-HOME.x,a.y-HOME.y)-Math.hypot(b.x-HOME.x,b.y-HOME.y))[0];drawTurret(c,HOME.x,HOME.y-15,target?Math.atan2(target.y-HOME.y,target.x-HOME.x)+Math.PI/2:w.time*.35);}
 if(w.company.directive==='surveyOutpost'&&!w.progress.outpostSurveyed){c.save();c.translate(FAR.x,FAR.y);c.strokeStyle='#8ee3cc';c.lineWidth=1.4;c.setLineDash([4,5]);c.beginPath();c.arc(0,0,28+Math.sin(w.time*3)*4,0,7);c.stroke();c.setLineDash([]);c.fillStyle='#a6ded4';c.font='9px monospace';c.textAlign='center';c.fillText('SURVEY SITE',0,-37);c.restore();}
 for(const d of w.drones){

   if(d.state==='dead'){ c.strokeStyle='#7d5350';c.lineWidth=2;c.beginPath();c.moveTo(d.x-5,d.y-5);c.lineTo(d.x+5,d.y+5);c.moveTo(d.x-5,d.y+5);c.lineTo(d.x+5,d.y-5);c.stroke();continue;}
   if(selected===d.id){c.strokeStyle='#f5b74388';c.lineWidth=1;c.beginPath();c.arc(d.x,d.y,21,0,7);c.stroke();}
   drawDrone(c,d.x,d.y,d.angle,d.cargo,d.kind==='laserMiner',w.time,d.state==='mine'||d.state==='return');
   if(d.hp<d.maxHp){c.fillStyle='#1a2933';c.fillRect(d.x-10,d.y+24,20,2);c.fillStyle=d.hp/d.maxHp>.4?'#72b5a4':'#db795c';c.fillRect(d.x-10,d.y+24,20*d.hp/d.maxHp,2);}
 }
 for(const h of w.haulers){
   if(h.state==='dead'){c.strokeStyle='#69807c';c.beginPath();c.moveTo(h.x-7,h.y-7);c.lineTo(h.x+7,h.y+7);c.moveTo(h.x-7,h.y+7);c.lineTo(h.x+7,h.y-7);c.stroke();continue;}
   if(selected===h.id){c.strokeStyle='#9bd5cb99';c.beginPath();c.arc(h.x,h.y,22,0,7);c.stroke();}
   drawHauler(c,h.x,h.y,h.angle,h.cargo,h.capacity,w.time,h.state==='work'||h.state==='return');
   if(h.hp<h.maxHp){c.fillStyle='#102a34';c.fillRect(h.x-11,h.y+23,22,2);c.fillStyle='#9bd5cb';c.fillRect(h.x-11,h.y+23,22*h.hp/h.maxHp,2);}
 }
 for(const g of w.guards){if(g.hp<=0){c.strokeStyle='#558b86';c.beginPath();c.moveTo(g.x-5,g.y-5);c.lineTo(g.x+5,g.y+5);c.moveTo(g.x-5,g.y+5);c.lineTo(g.x+5,g.y-5);c.stroke();continue;}drawGuard(c,g.x,g.y,g.angle);if(g.hp<g.maxHp){c.fillStyle='#0b2029';c.fillRect(g.x-8,g.y+17,16,2);c.fillStyle='#8ee3cc';c.fillRect(g.x-8,g.y+17,g.hp/g.maxHp*16,2);}}
 for(const foe of w.enemies){if(foe.hp<=0)continue;c.save();c.translate(foe.x,foe.y);c.rotate(w.time*.6);c.fillStyle='#7d3d4a';c.strokeStyle='#e6747d';c.lineWidth=1.5;polygon(c,[[0,-11],[10,0],[0,11],[-10,0]]);c.fill();c.stroke();c.fillStyle='#ff9393';c.fillRect(-2,-3,4,6);c.restore();}
 for(const e of w.effects){const a=e.life/e.max;c.globalAlpha=a;
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
   else {if(e.type==='hit'){
    c.strokeStyle='#ffe3a1';c.lineWidth=2*a;c.beginPath();c.arc(e.x,e.y,(1-a)*42*(e.amount??1)+3,0,7);c.stroke();
    for(let j=0;j<12;j++){const angle=j*2.399+(e.x%9),radius=(1-a)*((e.amount??1)*25+15+j%3*8);c.fillStyle=j%3?'#d8a05b':'#a9bab9';c.fillRect(e.x+Math.cos(angle)*radius,e.y+Math.sin(angle)*radius,2+a*2,2+a*2);}
   }c.strokeStyle=e.type==='dead'||e.type==='enemyDead'?'#ee845e':gold;c.lineWidth=1.5;for(let i=0;i<7;i++){const angle=i*.898;const r=(1-a)*25+5;c.beginPath();c.moveTo(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r);c.lineTo(e.x+Math.cos(angle)*(r+5),e.y+Math.sin(angle)*(r+5));c.stroke();}}
   c.globalAlpha=1;
 }
 c.restore();
 // Compact world overview, including viewport and off-screen fleet positions.
 const mx=VIEW_W-88,my=VIEW_H-112,mw=76,mh=88,kx=mw/W,ky=mh/H;
 c.fillStyle='#08131deb';c.fillRect(mx-4,my-4,mw+8,mh+8);c.strokeStyle='#52707d';c.lineWidth=.7;c.strokeRect(mx,my,mw,mh);
 for(const r of w.rocks){if(r.hp<=0)continue;c.fillStyle=w.company.progress.farSurveyed&&r.rich?'#7bd4be':'#60717e';c.fillRect(mx+r.x*kx,my+r.y*ky,w.company.progress.farSurveyed&&r.rich?2:1.5,w.company.progress.farSurveyed&&r.rich?2:1.5);}
 for(const [p,id] of [[RESEARCH_STATION,'abandoned_research_station'],[EXPERIMENTAL_PROBE,'experimental_probe_salvaged']] as const){c.fillStyle=w.company.uniqueTechDiscoveries.includes(id)||w.pendingTech.some(e=>e.id===id)?'#55797c':'#8ee3d3';c.fillRect(mx+p.x*kx-1.5,my+p.y*ky-1.5,3,3);}
 for(const site of LOGISTICS_SITES){c.fillStyle=w.company.uniqueTechDiscoveries.includes(site.id)||w.pendingTech.some(e=>e.id===site.id)?'#55797c':'#b9ddbc';c.fillRect(mx+site.x*kx-1.5,my+site.y*ky-1.5,3,3);}
 c.fillStyle='#e7e2cf';c.fillRect(mx+HOME.x*kx-2,my+HOME.y*ky-2,4,4);if(w.company.outpost){c.fillStyle='#83d8cf';c.fillRect(mx+FAR.x*kx-2,my+FAR.y*ky-2,4,4);}
 else if(w.company.directive==='surveyOutpost'&&!w.progress.outpostSurveyed){c.strokeStyle='#83d8cf';c.strokeRect(mx+FAR.x*kx-2,my+FAR.y*ky-2,4,4);}
 for(const d of w.drones){if(d.state==='dead'||d.state==='docked')continue;c.fillStyle=gold;c.beginPath();c.arc(mx+d.x*kx,my+d.y*ky,2,0,7);c.fill();}
 for(const h of w.haulers){if(h.state==='dead'||h.state==='docked')continue;c.fillStyle='#a9ded1';c.fillRect(mx+h.x*kx-2,my+h.y*ky-2,4,4);}
 for(const e of w.enemies){if(e.hp<=0)continue;c.fillStyle='#e6747d';c.fillRect(mx+e.x*kx-1.5,my+e.y*ky-1.5,3,3);}
 const left=Math.max(0,camera.x-VIEW_W/camera.zoom/2),top=Math.max(0,camera.y-VIEW_H/camera.zoom/2);
 const right=Math.min(W,camera.x+VIEW_W/camera.zoom/2),bottom=Math.min(H,camera.y+VIEW_H/camera.zoom/2);
 c.strokeStyle='#8fd6ca';c.strokeRect(mx+left*kx,my+top*ky,(right-left)*kx,(bottom-top)*ky);
 c.font='8px monospace';c.fillStyle='#9eb4be';c.fillText('DRAG TO EXPLORE',12,VIEW_H-28);
}
