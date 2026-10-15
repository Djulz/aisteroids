import type {Rock} from './sim.ts';
import type {PoiId} from './knowledge.ts';

// Local ship coordinates point forward/up. The simulation's angle is an
// atan2 heading, so the common wrapper rotates by angle + PI/2.
const gold='#f5b743',amber='#e69c30',cream='#eee8d5',hull='#122935',teal='#72c7bd';
const slate='#34434e',edge='#81909b',crater='#23323d',coral='#f06468';
type C=CanvasRenderingContext2D;
type Point=[number,number];
export type RockArtTier=1|2|3|4|5;
export type ShipArt='impactMiner'|'laserMiner'|'escort'|'scout'|'hauler'|'enemyScout'|'enemyFighter';
export const shipArt:readonly ShipArt[]=['impactMiner','laserMiner','escort','scout','hauler','enemyScout','enemyFighter'];
export const rockArtTiers:readonly RockArtTier[]=[1,2,3,4,5];
export const poiArt:readonly PoiId[]=['abandoned_research_station','experimental_probe_salvaged','abandoned_cargo_relay','derelict_freight_shuttle','automated_sorting_archive'];

function path(c:C,points:readonly Point[]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function poly(c:C,points:readonly Point[],fill:string,stroke?:string,width=1){path(c,points);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function rect(c:C,x:number,y:number,w:number,h:number,fill:string,stroke?:string,width=1){c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.strokeRect(x,y,w,h);}}
function ring(c:C,x:number,y:number,r:number,color:string,width=1){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function thruster(c:C,time:number,size=4){poly(c,[[-size,11],[0,17+Math.sin(time*24)*1.5],[size,11]],teal);}

export function drawShip(c:C,kind:ShipArt,x:number,y:number,angle:number,options:{time?:number;thrust?:boolean;cargo?:number;capacity?:number}={}){
 c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);
 const time=options.time??0;
 if(options.thrust&&kind!=='enemyScout'&&kind!=='enemyFighter')thruster(c,time,kind==='hauler'?5:kind==='scout'?2:4);
 switch(kind){
  case 'impactMiner':case 'laserMiner':{
   // Compact impact body and separate rectangular braces from the approved sheet.
   rect(c,-13,-5,5,15,hull,gold,1.4);rect(c,8,-5,5,15,hull,gold,1.4);
   poly(c,[[-8,9],[-8,-7],[-4,-12],[4,-12],[8,-7],[8,9],[4,12],[-4,12]],gold);
   rect(c,-4,-7,8,6,hull);rect(c,-3,3,6,3,cream);
   if(kind==='laserMiner'){rect(c,-2,-15,4,7,cream,gold,1);rect(c,-1,-17,2,3,teal);}
   break;
  }
  case 'hauler':{
   // Broad, separated cargo pods are the silhouette; the miner has only thin bars.
   rect(c,-19,-9,10,21,cream,gold,1.5);rect(c,9,-9,10,21,cream,gold,1.5);
   rect(c,-17,-12,6,3,amber);rect(c,11,-12,6,3,amber);
   rect(c,-17,11,6,2,amber);rect(c,11,11,6,2,amber);
   poly(c,[[-8,-14],[8,-14],[10,-9],[10,12],[-10,12],[-10,-9]],gold);
   rect(c,-6,-11,12,10,hull);rect(c,-6,2,12,7,hull,cream,.8);
   const filled=Math.min(3,Math.ceil(3*(options.cargo??0)/Math.max(1,options.capacity??10)));
   for(let i=0;i<filled;i++)rect(c,-4+i*3,4,2,3,amber);
   break;
  }
  case 'escort':{
   // Open triangular guard with a central reinforced spine.
   poly(c,[[-13,9],[-3,-11],[0,-15],[3,-11],[13,9],[7,8],[4,-1],[4,8],[-4,8],[-4,-1],[-7,8]],gold);
   poly(c,[[-2,-7],[0,-13],[2,-7],[3,4],[-3,4]],cream);
   rect(c,-2,4,4,7,hull);break;
  }
  case 'scout':{
   poly(c,[[-9,8],[0,-13],[9,8],[3,5],[0,-3],[-3,5]],gold);
   poly(c,[[-2,5],[0,0],[2,5]],cream);break;
  }
  case 'enemyScout':case 'enemyFighter':{
   const spread=kind==='enemyFighter'?12:8,tip=kind==='enemyFighter'?-15:-12;
   poly(c,[[-spread,9],[-2,tip+4],[0,tip],[2,tip+4],[spread,9],[spread-5,7],[3,-1],[3,7],[-3,7],[-3,-1],[-spread+5,7]],coral);
   rect(c,-2,-5,4,7,'#402630');
   if(kind==='enemyFighter')rect(c,-3,7,6,3,'#f19b95');
   break;
  }
 }
 c.restore();
}

export function drawMother(c:C,t:number,bounce=0,x=200,y=440){
 c.save();c.translate(x,y);c.scale(1+bounce,1+bounce);
 c.setLineDash([3,6]);ring(c,0,0,62,'#5d78834d');c.setLineDash([]);
 poly(c,[[-35,-22],[-22,-35],[22,-35],[35,-22],[35,29],[22,40],[-22,40],[-35,29]],'#142733','#596773');
 poly(c,[[-26,-22],[-15,-33],[15,-33],[26,-22],[26,28],[13,35],[-13,35],[-26,28]],cream);
 rect(c,-10,-36,20,26,'#223540',gold,2);
 for(const side of [-1,1]){const left=side<0?-42:24;rect(c,left,-17,18,40,'#1a2d37',gold);rect(c,left+4,-12,10,28,cream);for(let i=0;i<3;i++)rect(c,left+6,1+i*4,6,2,'#1d2b33');rect(c,side*18-2,-17,4,8,gold);}
 c.beginPath();c.arc(0,7,17,0,7);c.fillStyle='#162a36';c.fill();c.strokeStyle='#ac8544';c.lineWidth=3;c.stroke();
 c.beginPath();c.arc(0,7,10,t*.25,t*.25+Math.PI*1.5);c.strokeStyle='#78b7b5';c.lineWidth=2;c.stroke();c.restore();
}
export function drawOutpost(c:C,x:number,y:number,active:boolean,t:number,bounce=0){
 c.save();c.translate(x,y);c.scale(1+bounce,1+bounce);
 c.setLineDash([4,8]);ring(c,0,0,47,active?'#6db4ad77':'#557f8788');c.setLineDash([]);
 // Round remote platform and horizontal cargo outriggers. HQ remains a tall
 // octagon with vertical bars; the Outpost reads as a separate station.
 rect(c,-39,-4,78,8,'#374b53',gold,1);
 poly(c,[[-25,-12],[-16,-24],[16,-24],[25,-12],[25,12],[16,24],[-16,24],[-25,12]],'#263844','#70848c');
 poly(c,[[-20,-10],[-12,-19],[12,-19],[20,-10],[20,10],[12,19],[-12,19],[-20,10]],cream);
 rect(c,-7,-34,14,13,hull,gold,1.8);rect(c,-4,-31,8,4,amber);
 for(const side of [-1,1]){const left=side<0?-46:34;rect(c,left,-12,12,24,hull,gold,1.6);rect(c,left+3,-8,6,16,cream);for(let i=0;i<2;i++)rect(c,left+4,-4+i*6,4,2,'#314550');}
 poly(c,[[-17,22],[-12,28],[-7,27],[-8,21]],gold);poly(c,[[17,22],[12,28],[7,27],[8,21]],gold);
 c.beginPath();c.arc(0,0,13,0,7);c.fillStyle=hull;c.fill();c.strokeStyle=amber;c.lineWidth=2.5;c.stroke();
 c.beginPath();c.arc(0,0,8,t,t+Math.PI*1.45);c.strokeStyle=active?'#8bd4c7':'#578e91';c.lineWidth=1.8;c.stroke();c.restore();
}
export function drawTurret(c:C,x:number,y:number,t=0){c.save();c.translate(x,y);c.fillStyle='#193741';c.strokeStyle='#9fe2d5';c.lineWidth=1.6;c.beginPath();c.arc(0,0,11,0,7);c.fill();c.stroke();c.rotate(t);rect(c,-3,-16,6,15,'#263f48','#9fe2d5',1.6);rect(c,-2,-4,4,4,teal);c.restore();}

// Only canonical distinctions select art in the live world. Future economic
// tiers 3–5 are drawn in the gallery without assigning invented payouts.
export function rockArtTier(r:Pick<Rock,'rich'>,richRevealed:boolean):RockArtTier{return r.rich&&richRevealed?2:1;}
const markerColor:Record<RockArtTier,string>={1:'#a8adb2',2:'#9eac95',3:'#e9b34a',4:'#a2c9e3',5:'#b39bd4'};
export function drawRock(c:C,r:Pick<Rock,'id'|'x'|'y'|'r'|'hp'|'max'|'shape'>,tier:RockArtTier,pulse=0){
 c.save();c.translate(r.x+Math.sin(pulse*24)*pulse*2,r.y+Math.cos(pulse*19)*pulse*2);c.rotate(r.id*.73);c.scale(1+pulse*.07,1+pulse*.07);
 const points=r.shape.map((n,i)=>[Math.cos(i/r.shape.length*Math.PI*2)*r.r*n,Math.sin(i/r.shape.length*Math.PI*2)*r.r*n] as Point);
 poly(c,points,pulse>.75?'#879096':slate,pulse>.4?'#c1b9aa':edge,1.1);
 for(let i=0;i<5;i++){const angle=i*2.4+r.id,radius=r.r*(i%2?.43:.23),x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
  c.beginPath();c.arc(x,y,r.r*(i%3===0?.18:.095),0,7);c.fillStyle=crater;c.fill();}
 const count=tier===1?1:3;
 for(let i=0;i<count;i++){const a=r.id*.71+i*2.3+1.1,radius=r.r*(i%2?.49:.36),x=Math.cos(a)*radius,y=Math.sin(a)*radius;
  c.beginPath();c.arc(x,y,tier===1?1.1:1.65,0,7);c.fillStyle=markerColor[tier];c.fill();}
 const damage=1-r.hp/r.max;
 if(damage>.12){c.strokeStyle='#182833';c.lineWidth=1.2+damage*2;c.beginPath();c.moveTo(-r.r*.7,0);c.lineTo(-3,3);c.lineTo(3,-5);c.lineTo(r.r*.5,-r.r*.55);c.stroke();}
 if(damage>.45){c.beginPath();c.moveTo(-3,3);c.lineTo(-r.r*.12,r.r*.46);c.lineTo(r.r*.18,r.r*.66);c.stroke();}
 if(damage>.7){c.strokeStyle='#d2a35f';c.beginPath();c.moveTo(3,-5);c.lineTo(r.r*.21,-r.r*.33);c.stroke();}
 c.restore();
}

export function drawPoi(c:C,id:PoiId,x:number,y:number,done=false,locked=false){
 c.save();c.translate(x,y);
 const muted=done?'#73868b':teal;
 c.setLineDash(done?[2,5]:[4,6]);ring(c,0,0,locked?23:21,locked?gold:muted,1);c.setLineDash([]);
 switch(id){
  case 'abandoned_research_station':
   rect(c,-10,-10,20,20,slate,edge);for(const side of [-1,1])rect(c,side*13-3,-7,6,14,amber);
   rect(c,-6,-6,12,12,hull);rect(c,-4,-3,8,6,teal);break;
  case 'experimental_probe_salvaged':
   poly(c,[[0,-16],[5,-4],[3,7],[0,12],[-3,7],[-5,-4]],slate,edge);
   poly(c,[[-12,4],[-4,1],[-4,8],[-12,10]],amber);poly(c,[[12,4],[4,1],[4,8],[12,10]],amber);
   rect(c,-3,-5,6,6,teal);break;
  case 'abandoned_cargo_relay':
   rect(c,-9,-9,18,18,slate,edge);rect(c,-5,-5,10,10,hull);rect(c,-16,-4,7,8,cream,amber);rect(c,9,-4,7,8,amber);
   rect(c,-2,-13,4,4,teal);break;
  case 'derelict_freight_shuttle':
   c.rotate(-.42);poly(c,[[-13,-7],[-5,-12],[10,-10],[13,3],[5,11],[-11,8]],slate,edge);
   poly(c,[[-8,-8],[-3,-10],[2,7],[-3,8]],amber);rect(c,3,-6,6,7,hull);
   rect(c,-17,7,6,5,'#788791');rect(c,12,-11,4,6,'#788791');break;
  case 'automated_sorting_archive':
   c.strokeStyle=edge;c.lineWidth=5;c.beginPath();c.arc(0,0,13,-2.6,-.55);c.arc(0,0,13,.4,2.5);c.stroke();
   c.strokeStyle=amber;c.lineWidth=2;c.beginPath();c.arc(0,0,13,-.45,.25);c.stroke();
   ring(c,0,0,8,'#4d6972',2);rect(c,-3,-3,6,6,hull,teal);break;
 }
 if(locked){c.strokeStyle=gold;c.lineWidth=2;c.beginPath();c.arc(0,0,25,-Math.PI*.55,Math.PI*.05);c.stroke();}
 c.restore();
}
