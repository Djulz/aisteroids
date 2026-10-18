import {W,H,HOME,FAR} from './geometry.ts';
import type {BiomeId} from './biomes.ts';

export const GENERATOR_VERSION=1;
export type Place={x:number;y:number};
export type WorldPoiId='abandoned_research_station'|'experimental_probe_salvaged'|'abandoned_cargo_relay'|'derelict_freight_shuttle'|'automated_sorting_archive';
export type Deposit={id:number;x:number;y:number;r:number;shape:number[];rich:boolean};
export type Universe={seed:number;generatorVersion:number;width:number;height:number;hq:Place;outpost:Place;silentCore:Place;pois:readonly (Place&{id:WorldPoiId;name:string})[];deposits:readonly Deposit[];rivalHomes:readonly Place[]};
const cache=new Map<number,Universe>();
function random(seed:number){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
// Smooth angular warp gives a stable, irregular layered frontier. It never
// depends on mission count or the order in which objects are generated.
export function regionAt(seed:number,x:number,y:number):BiomeId{
 const dx=x-HOME.x,dy=(y-HOME.y)*1.13,angle=Math.atan2(dy,dx);
 const warp=1+.075*Math.sin(angle*3+(seed%101)*.037)+.043*Math.cos(angle*7+(seed%313)*.019);
 const radius=Math.hypot(dx,dy)/warp;
 return radius<620?'home_belt':radius<1700?'scrap_fields':radius<2700?'contested':radius<3600?'ion_storm':'dead_zone';
}
export function generateUniverse(seed:number):Universe{
 seed=seed>>>0;const cached=cache.get(seed);if(cached)return cached;
 const places=random(seed^0x48f0a19),rocks=random(seed^0x27b8c5d);
 const jitter=(x:number,y:number,amount:number):Place=>({x:clamp(x+(places()-.5)*amount,120,W-120),y:clamp(y+(places()-.5)*amount,120,H-120)});
 const outpost=jitter(FAR.x,FAR.y,90);
 const pois:Universe['pois']=[
  {id:'abandoned_research_station',name:'Derelict Research Station',...jitter(1690,2300,160)},
  {id:'abandoned_cargo_relay',name:'Abandoned Cargo Relay',...jitter(2140,2990,180)},
  {id:'experimental_probe_salvaged',name:'Experimental Probe',...jitter(2470,2010,180)},
  {id:'derelict_freight_shuttle',name:'Derelict Freight Shuttle',...jitter(3110,2060,210)},
  {id:'automated_sorting_archive',name:'Automated Sorting Archive',...jitter(4240,3720,240)},
 ];
 const rivalHomes=[jitter(850,3270,90),jitter(2110,2980,120),jitter(2300,2370,150)];
 const centers:readonly (readonly [number,number,number])[]=[
  [1130,2510,16],[1400,2450,15],[1040,2860,13],[1520,2890,12],[1330,3160,10],
  [760,3450,16],[1820,2660,19],[2050,3250,18],[2300,2080,19],[2660,2850,19],[1940,1800,14],
  [3100,2180,16],[3460,3370,16],[3900,1840,17],[2930,4010,16],
  [4720,2330,17],[4800,4200,15],[5400,3500,17],[5120,1100,16],
 ];
 const deposits:Deposit[]=[];
 for(const [cx,cy,count] of centers)for(let i=0,tries=0;i<count&&tries<1600;tries++){
  const x=cx+(rocks()-.5)*480,y=cy+(rocks()-.5)*430,r=20+rocks()*16;
  if(x<65||x>W-65||y<65||y>H-65||[HOME,outpost,...pois].some(p=>Math.hypot(p.x-x,p.y-y)<r+(p===outpost?125:90))||
    deposits.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+r+27))continue;
  const id=deposits.length;deposits.push({id,x,y,r,rich:regionAt(seed,x,y)!=='home_belt'&&id%4===0,shape:Array.from({length:11},()=>.77+rocks()*.23)});i++;
 }
 const definition:Universe={seed,generatorVersion:GENERATOR_VERSION,width:W,height:H,hq:HOME,outpost,silentCore:{x:5630,y:770},pois,deposits,rivalHomes};
 if(cache.size>=8)cache.delete(cache.keys().next().value!);
 cache.set(seed,definition);return definition;
}
