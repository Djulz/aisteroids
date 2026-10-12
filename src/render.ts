import { HOME, W, H, type World } from './sim.ts';
const gold = '#f5b743', cream = '#e7e2cf';
function polygon(c: CanvasRenderingContext2D, pts: number[][]) { c.beginPath(); pts.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); }
export function drawDrone(c: CanvasRenderingContext2D, x: number, y: number, angle: number, cargo = 0, laser = false, time = 0) {
 c.save(); c.translate(x,y); c.rotate(angle + Math.PI / 2);
 c.fillStyle = '#83caca'; c.globalAlpha = .7; polygon(c,[[-4,12],[0,21 + Math.sin(time*30)*3],[4,12]]); c.fill(); c.globalAlpha = 1;
 c.fillStyle='#182b36'; c.strokeStyle=gold; c.lineWidth=1.4; c.fillRect(-12,-4,6,15); c.strokeRect(-12,-4,6,15); c.fillRect(6,-4,6,15); c.strokeRect(6,-4,6,15);
 c.fillStyle=gold; polygon(c,[[-7,10],[-8,-5],[-4,-11],[4,-11],[8,-5],[7,10]]); c.fill();
 c.fillStyle='#14232b'; c.fillRect(-4,-6,8,6); c.fillStyle=cream; c.fillRect(-3,3,6,3);
 c.fillStyle='#68c4c1'; for(let i=0;i<Math.ceil(cargo/4);i++) c.fillRect(-5+i*4,7,3,3);
 if(laser){ c.fillStyle=cream; c.fillRect(-11,-13,3,9); c.fillRect(8,-13,3,9); }
 c.restore();
}
export function drawMother(c: CanvasRenderingContext2D, t:number) {
 c.save(); c.translate(HOME.x,HOME.y);
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
export function render(canvas: HTMLCanvasElement, w: World, selected = -1) {
 const c = canvas.getContext('2d')!; const sx=canvas.width/W, sy=canvas.height/H;
 c.setTransform(sx,0,0,sy,0,0); c.clearRect(0,0,W,H);c.fillStyle='#0a1a25';c.fillRect(0,0,W,H);
 c.strokeStyle='#26404d35';c.lineWidth=.6; c.beginPath(); for(let x=0;x<W;x+=25){c.moveTo(x,0);c.lineTo(x,H);}for(let y=0;y<H;y+=25){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();
 for(let i=0;i<48;i++){c.fillStyle=i%4===0?'#71929a66':'#71929a2b';c.fillRect((i*137+19)%W,(i*83+41)%H,i%4===0?1.4:1,1);}
 c.strokeStyle='#68828c3b';for(let i=0;i<9;i++){const x=35+i%3*165,y=34+Math.floor(i/3)*230;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}
 c.font='8px monospace'; c.fillStyle='#557280'; c.fillText('EXTRACTION ZONE / 01',16,20);
 for(const r of w.rocks){
   if(r.hp<=0) continue;
   c.save();c.translate(r.x,r.y);c.rotate(r.id*.73);
   const points=r.shape.map((n,i)=>[Math.cos(i/r.shape.length*Math.PI*2)*r.r*n,Math.sin(i/r.shape.length*Math.PI*2)*r.r*n]);
   polygon(c,points); c.fillStyle='#34434d';c.fill();c.strokeStyle='#71808a';c.lineWidth=1;c.stroke();
   for(let i=0;i<5;i++){const a=i*2.4+r.id;const radius=r.r*(i%2?.42:.2);const x=Math.cos(a)*radius,y=Math.sin(a)*radius; c.fillStyle='#23343f';c.beginPath();c.ellipse(x,y,r.r*.14,r.r*.11,a,0,7);c.fill();c.strokeStyle='#53636c';c.lineWidth=.6;c.beginPath();c.arc(x,y,r.r*.14,0,2.5);c.stroke();}
   if(r.hp<r.max){c.strokeStyle='#0a1a25';c.lineWidth=1.8;c.beginPath();c.moveTo(-r.r*.7,0);c.lineTo(-3,3);c.lineTo(3,-5);c.lineTo(r.r*.5,-r.r*.55);c.stroke();}
   c.restore();
 }
 for(const o of w.ores){c.save();c.translate(o.x,o.y);c.rotate(.4);c.fillStyle=gold;polygon(c,[[0,-4],[4,0],[1,4],[-3,2],[-4,-1]]);c.fill();c.restore();}
 drawMother(c,w.time);
 for(const d of w.drones){
   if(d.state==='docked') continue;
   if(d.state==='dead'){ c.strokeStyle='#7d5350';c.lineWidth=2;c.beginPath();c.moveTo(d.x-5,d.y-5);c.lineTo(d.x+5,d.y+5);c.moveTo(d.x-5,d.y+5);c.lineTo(d.x+5,d.y-5);c.stroke();continue;}
   if(selected===d.id){c.strokeStyle='#f5b74388';c.lineWidth=1;c.beginPath();c.arc(d.x,d.y,21,0,7);c.stroke();}
   drawDrone(c,d.x,d.y,d.angle,d.cargo,w.company.laser,w.time);
   if(d.hp<d.maxHp){c.fillStyle='#1a2933';c.fillRect(d.x-10,d.y+24,20,2);c.fillStyle=d.hp/d.maxHp>.4?'#72b5a4':'#db795c';c.fillRect(d.x-10,d.y+24,20*d.hp/d.maxHp,2);}
 }
 for(const e of w.effects){const a=e.life/e.max;c.globalAlpha=a;
   if(e.type==='laser'){c.strokeStyle='#67d9ce';c.lineWidth=4;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.tx!,e.ty!);c.stroke();c.strokeStyle='#eaffec';c.lineWidth=1.2;c.stroke();}
   else if(e.type==='deposit'||e.type==='ore'){c.font=`bold ${e.type==='deposit'?16:10}px monospace`;c.textAlign='center';c.fillStyle=e.type==='deposit'?'#a4e0cc':gold;c.fillText(`+${e.amount}`,e.x,e.y-(1-a)*23);c.textAlign='left';}
   else {c.strokeStyle=e.type==='dead'?'#ee845e':gold;c.lineWidth=1.5;for(let i=0;i<7;i++){const angle=i*.898;const r=(1-a)*25+5;c.beginPath();c.moveTo(e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r);c.lineTo(e.x+Math.cos(angle)*(r+5),e.y+Math.sin(angle)*(r+5));c.stroke();}}
   c.globalAlpha=1;
 }
}
