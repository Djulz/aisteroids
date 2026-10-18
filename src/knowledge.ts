import type {DiscoveryId} from './research.ts';
import {W as MAP_W,H as MAP_H,CELL,COLS,ROWS,CELLS,MAP_BYTES,HOME,FAR} from './geometry.ts';
import {generateUniverse,type WorldPoiId} from './universe.ts';
export {MAP_W,MAP_H,CELL,COLS,ROWS,CELLS,MAP_BYTES};

export const POIS=[
 {id:'abandoned_research_station',name:'Derelict Research Station'},
 {id:'experimental_probe_salvaged',name:'Experimental Probe'},
 {id:'abandoned_cargo_relay',name:'Abandoned Cargo Relay'},
 {id:'derelict_freight_shuttle',name:'Derelict Freight Shuttle'},
 {id:'automated_sorting_archive',name:'Automated Sorting Archive'},
] as const satisfies readonly {id:DiscoveryId&WorldPoiId;name:string}[];
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
export function migrateV10Map(value:string){
 if(typeof value!=='string'||!/^[0-9a-f]{304}$/.test(value))return null;
 const old=Uint8Array.from({length:152},(_,i)=>parseInt(value.slice(i*2,i*2+2),16)),next=blankMap();
 for(let i=0;i<1216;i++)if(old[i>>3]&(1<<(i&7))){const col=i%32,row=Math.floor(i/32);setCell(next,(col+.5)*CELL,(row+.5)*CELL);}
 return next;
}
export function mapCount(bits:Uint8Array){let n=0;for(const b of bits){let k=b;while(k){k&=k-1;n++;}}return n;}
export function seedKnown(bits:Uint8Array,progress:{farSurveyed:boolean;outpostSurveyed:boolean},outpost:boolean,known:readonly string[]=[],seed=7){
 const definition=generateUniverse(seed),v=blankMap();reveal(v,[{...HOME,radius:115},...(outpost?[{...definition.outpost,radius:115}]:[]),...(progress.farSurveyed?[{x:HOME.x+500,y:HOME.y,radius:55}]:[]),...(progress.outpostSurveyed?[{...definition.outpost,radius:55}]:[]),...definition.pois.filter(p=>known.includes(p.id)).map(p=>({...p,radius:45}))]);mergeMap(bits,v);return encodeMap(bits);
}
export function seededMap(progress:{farSurveyed:boolean;outpostSurveyed:boolean},outpost:boolean,known:readonly string[]=[],seed=7){return seedKnown(blankMap(),progress,outpost,known,seed);}
