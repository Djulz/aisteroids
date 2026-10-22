import type {ShipArt} from './art.ts';

// Presentation-only state. Positions are world coordinates and time is the
// simulation clock; rendering the same step twice never emits twice.
export type TrailSource={id:string;kind:ShipArt;x:number;y:number;angle:number};
export type TrailPuff={owner:string;x:number;y:number;born:number;size:number;color:string};
type Track={x:number;y:number;angle:number;carry:number};
export type TrailState={time:number;tracks:Map<string,Track>;puffs:TrailPuff[]};
export const TRAIL_LIFE=.46;
export const TRAIL_CAP=220;
const PER_SHIP_CAP=4;
export function newTrailState():TrailState{return {time:-1,tracks:new Map(),puffs:[]};}
const exhaust=(kind:ShipArt)=>kind==='enemyScout'||kind==='enemyFighter'||kind==='enemyEnforcer'?
 {spacing:9,rear:16,size:2.5,color:'#df8581'}:kind==='hauler'?
 {spacing:9,rear:21,size:3.4,color:'#b6cfcb'}:kind==='scout'?
 {spacing:10,rear:17,size:2.3,color:'#adcbce'}:kind==='escort'?
 {spacing:8,rear:18,size:2.5,color:'#b4d5d1'}:
 {spacing:8,rear:20,size:2.8,color:'#b6ced0'};

export function updateTrails(state:TrailState,time:number,sources:readonly TrailSource[]):TrailState{
 if(time<state.time||time-state.time>.35){state.tracks.clear();state.puffs.length=0;}
 const elapsed=time-state.time;
 if(elapsed===0)return state;
 state.time=time;
 const active=new Set(sources.map(s=>s.id));
 for(const id of state.tracks.keys())if(!active.has(id))state.tracks.delete(id);
 state.puffs=state.puffs.filter(p=>active.has(p.owner)&&time-p.born<TRAIL_LIFE);
 if(elapsed<=0)return state;
 for(const s of sources){
  const prior=state.tracks.get(s.id);
  const current={x:s.x,y:s.y,angle:s.angle,carry:prior?.carry??0};
  state.tracks.set(s.id,current);
  if(!prior)continue;
  const dx=s.x-prior.x,dy=s.y-prior.y,distance=Math.hypot(dx,dy);
  if(distance>Math.max(70,elapsed*230)){current.carry=0;state.puffs=state.puffs.filter(p=>p.owner!==s.id);continue;}
  if(distance<.5)continue;
  const {spacing,rear,size,color}=exhaust(s.kind);
  const start=spacing-prior.carry;
  // Interpolate the ship's heading at each emission, then place the square
  // behind that heading. Existing squares stay at their original positions.
  const turn=Math.atan2(Math.sin(s.angle-prior.angle),Math.cos(s.angle-prior.angle));
  for(let at=start;at<=distance+.0001;at+=spacing){
   const t=at/distance,heading=prior.angle+turn*t;
   const born=state.time-elapsed*(1-t);
   state.puffs.push({owner:s.id,x:prior.x+dx*t-Math.cos(heading)*rear,y:prior.y+dy*t-Math.sin(heading)*rear,born,size,color});
   let count=0;
   for(let i=state.puffs.length-1;i>=0;i--)if(state.puffs[i].owner===s.id&&++count>PER_SHIP_CAP){state.puffs.splice(i,1);break;}
  }
  current.carry=(prior.carry+distance)%spacing;
 }
 if(state.puffs.length>TRAIL_CAP)state.puffs.splice(0,state.puffs.length-TRAIL_CAP);
 return state;
}

export function drawTrails(c:CanvasRenderingContext2D,state:TrailState,time:number,left:number,top:number,right:number,bottom:number){
 for(const p of state.puffs){
  if(p.x<left-5||p.x>right+5||p.y<top-5||p.y>bottom+5)continue;
  c.globalAlpha=.68*Math.max(0,1-(time-p.born)/TRAIL_LIFE);
  c.fillStyle=p.color;
  c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
 }
 c.globalAlpha=1;
}
