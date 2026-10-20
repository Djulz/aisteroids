import {HOME,W,H} from './geometry.ts';
import {regionAt,type Universe} from './universe.ts';
import {clearSegment,type Point} from './navigation.ts';
import type {BiomeId} from './biomes.ts';

export type EnemyKind='patrol'|'interceptor';
export type EnemyMode='patrol'|'alert'|'pursue'|'search'|'return';
export const ENEMY_TYPES={
 patrol:{name:'Patrol Drone',art:'enemyScout',hp:3,speed:64,sensors:150,range:125,damage:2,cooldown:2.1,warning:1.5},
 interceptor:{name:'Interceptor',art:'enemyFighter',hp:6,speed:94,sensors:190,range:135,damage:2.5,cooldown:1.8,warning:1.2},
} as const;
export type PatrolSite={id:number;biome:BiomeId;home:Point;route:readonly Point[];radius:number;kinds:readonly EnemyKind[]};
const cache=new WeakMap<Universe,readonly PatrolSite[]>();
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
// An independent content overlay. Deposits, POI identities and save ledgers stay stable.
export function patrolSites(u:Universe):readonly PatrolSite[]{
 const cached=cache.get(u);if(cached)return cached;
 const rocks=u.deposits.map(r=>({...r,hp:1})),sites:PatrolSite[]=[];
 const candidates:readonly [BiomeId,Point,readonly EnemyKind[]][]=[
  ['scrap_fields',u.rivalHomes[0],['patrol']],
  ['scrap_fields',{x:2130,y:2980},['patrol']],
  ['scrap_fields',{x:1500,y:1900},['patrol']],
  ['scrap_fields',{x:480,y:2450},['patrol']],
  ['contested',{x:3100,y:2180},['patrol','interceptor']],
  ['contested',{x:2300,y:1100},['patrol','interceptor']],
  ['contested',{x:2780,y:4050},['patrol','interceptor']],
  ['contested',{x:3350,y:3000},['interceptor','interceptor']],
  ['ion_storm',{x:4540,y:2700},['patrol','interceptor','interceptor']],
  ['ion_storm',{x:3910,y:1100},['patrol','interceptor','interceptor']],
  ['ion_storm',{x:3800,y:4300},['patrol','interceptor','interceptor']],
 ];
 const allowed=(p:Point,biome:BiomeId)=>p.x>60&&p.x<W-60&&p.y>60&&p.y<H-60&&regionAt(u.seed,p.x,p.y)===biome&&
  distance(p,HOME)>635&&distance(p,u.outpost)>245&&u.pois.every(site=>distance(p,site)>85)&&clearSegment(p,p,rocks,-1,28);
 for(const [biome,desired,kinds] of candidates){
  let found:PatrolSite|undefined;
  for(let ring=0;ring<18&&!found;ring++)for(let side=0;side<16&&!found;side++){
   const angle=(side+(u.seed%17)/17)*Math.PI/8,home={x:desired.x+ring*28*Math.cos(angle),y:desired.y+ring*28*Math.sin(angle)};
   if(!allowed(home,biome)||sites.some(site=>distance(home,site.home)<390))continue;
   // Clear triangles need no global path search while idly patrolling, even off screen.
   for(const radius of [100,80,60]){
    const route=Array.from({length:3},(_,i)=>({x:home.x+Math.cos(angle+i*Math.PI*2/3)*radius,y:home.y+Math.sin(angle+i*Math.PI*2/3)*radius}));
    if(!route.every((p,i)=>allowed(p,biome)&&clearSegment(p,route[(i+1)%3],rocks,-1,20)))continue;
    found={id:sites.length,biome,home,route,radius:biome==='scrap_fields'?235:300,kinds};break;
   }
  }
  if(!found)throw Error(`No clear ${biome} patrol site for seed ${u.seed}`);
  sites.push(found);
 }
 cache.set(u,sites);return sites;
}

export function segmentDistance(p:Point,a:Point,b:Point){
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
