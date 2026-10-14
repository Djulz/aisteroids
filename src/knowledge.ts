import {LOGISTICS_SITES} from './logistics-sites.ts';
import type {DiscoveryId} from './research.ts';

export const MAP_W=800, MAP_H=930, CELL=25, COLS=32, ROWS=38, CELLS=COLS*ROWS, MAP_BYTES=Math.ceil(CELLS/8);
export const POIS=[
 {id:'abandoned_research_station',name:'Derelict Research Station',x:260,y:390},
 {id:'experimental_probe_salvaged',name:'Experimental Probe',x:420,y:700},
 ...LOGISTICS_SITES.map(s=>({...s,name:s.name})),
] as const satisfies readonly {id:DiscoveryId;name:string;x:number;y:number}[];
export type PoiId=(typeof POIS)[number]['id'];
export type Sensor={x:number;y:number;radius:number};
export const blankMap=()=>new Uint8Array(MAP_BYTES);
export function mapCell(x:number,y:number){return Math.max(0,Math.min(ROWS-1,Math.floor(y/CELL)))*COLS+Math.max(0,Math.min(COLS-1,Math.floor(x/CELL)));}
export function hasCell(bits:Uint8Array,x:number,y:number){if(x<0||x>=MAP_W||y<0||y>=MAP_H)return false;const i=mapCell(x,y);return !!(bits[i>>3]&(1<<(i&7)));}
export function setCell(bits:Uint8Array,x:number,y:number){const i=mapCell(x,y);bits[i>>3]|=1<<(i&7);}
export function reveal(bits:Uint8Array,sensors:Sensor[]){bits.fill(0);for(const s of sensors){
 const left=Math.max(0,Math.floor((s.x-s.radius)/CELL)),right=Math.min(COLS-1,Math.floor((s.x+s.radius)/CELL));
 const top=Math.max(0,Math.floor((s.y-s.radius)/CELL)),bottom=Math.min(ROWS-1,Math.floor((s.y+s.radius)/CELL));
 for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
  const x=(col+.5)*CELL,y=Math.min(MAP_H-1,(row+.5)*CELL);
  if(Math.hypot(s.x-x,s.y-y)<=s.radius+CELL*.55)setCell(bits,x,y);
 }
}}
export function mergeMap(explored:Uint8Array,visible:Uint8Array){for(let i=0;i<MAP_BYTES;i++)explored[i]|=visible[i];}
export function encodeMap(bits:Uint8Array){return Array.from(bits,b=>b.toString(16).padStart(2,'0')).join('');}
export function decodeMap(value:string){if(typeof value!=='string'||!new RegExp(`^[0-9a-f]{${MAP_BYTES*2}}$`).test(value))return null;return Uint8Array.from({length:MAP_BYTES},(_,i)=>parseInt(value.slice(i*2,i*2+2),16));}
export function mapCount(bits:Uint8Array){let n=0;for(const b of bits){let k=b;while(k){k&=k-1;n++;}}return n;}
export function seededMap(progress:{farSurveyed:boolean;outpostSurveyed:boolean},outpost:boolean,investigated:readonly string[]=[]){
 const bits=blankMap(),v=blankMap();reveal(v,[{x:200,y:550,radius:115},...(outpost?[{x:535,y:770,radius:115}]:[]),...(progress.farSurveyed?[{x:430,y:500,radius:55}]:[]),...(progress.outpostSurveyed?[{x:535,y:770,radius:55}]:[]),...POIS.filter(p=>investigated.includes(p.id)).map(p=>({...p,radius:45}))]);mergeMap(bits,v);return encodeMap(bits);
}
