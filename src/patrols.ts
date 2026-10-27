import {HOME,W,H} from './geometry.ts';
import {regionAt,type Universe} from './universe.ts';
import {clearSegment,type Point} from './navigation.ts';
import {mineralForRock} from './minerals.ts';
import type {BiomeId} from './biomes.ts';

export type EnemyKind='patrol'|'interceptor'|'enforcer'|'sentry'|'lurker'|'spore';
export const isLifeform=(kind:EnemyKind|undefined)=>kind==='lurker'||kind==='spore';
export type EnemyMode='patrol'|'alert'|'pursue'|'search'|'return';
export const ENEMY_TYPES={
 patrol:{name:'Patrol Drone',art:'enemyScout',hp:3,speed:64,sensors:225,range:125,damage:2,cooldown:2.1,warning:1.5},
 interceptor:{name:'Interceptor',art:'enemyFighter',hp:6,speed:94,sensors:260,range:135,damage:2.5,cooldown:1.8,warning:1.2},
 enforcer:{name:'Enforcer',art:'enemyEnforcer',hp:12,speed:48,sensors:275,range:155,damage:3.2,cooldown:2.4,warning:1.8},
 sentry:{name:'Sentry',art:'enemySentry',hp:9,speed:0,sensors:225,range:175,damage:2.4,cooldown:2.6,warning:2.0},
 lurker:{name:'Rift Lurker',art:'enemyLurker',hp:7,speed:68,sensors:215,range:75,damage:2.6,cooldown:2.7,warning:1.8},
 spore:{name:'Radiant Spore',art:'enemySpore',hp:6,speed:0,sensors:205,range:150,damage:1.8,cooldown:3.2,warning:2.2},
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
  ['contested',{x:3100,y:2180},['patrol','enforcer']],
  ['contested',{x:2300,y:1100},['patrol','interceptor']],
  ['contested',{x:2780,y:4050},['patrol','enforcer']],
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
 // Fortifications are generated after the old routes, preserving their IDs and
 // asteroid ledgers. Each guards a real Aurite pocket, with room for an approach.
 const aurite=u.deposits.filter(r=>mineralForRock(r.id,r.x,r.y,u.seed)==='aurite'&&regionAt(u.seed,r.x,r.y)==='contested')
  .sort((a,b)=>distance(a,u.outpost)-distance(b,u.outpost)||a.id-b.id);
 const approach=aurite.slice(0,2);
 for(const rock of aurite.slice(2)){
  if(sites.filter(site=>site.kinds.includes('sentry')).length===2)break;
  if(approach.some(open=>distance(open,rock)<260))continue;
  if(sites.some(site=>site.kinds.includes('sentry')&&distance(site.home,rock)<550))continue;
  for(let side=0;side<16;side++){
   const angle=side*Math.PI/8,p={x:rock.x+Math.cos(angle)*105,y:rock.y+Math.sin(angle)*105};
   if(!allowed(p,'contested')||distance(p,u.outpost)<300||approach.some(open=>distance(open,p)<260)||sites.some(site=>distance(site.home,p)<130)||!clearSegment(p,rock,rocks,rock.id,12))continue;
   sites.push({id:sites.length,biome:'contested',home:p,route:[p],radius:220,kinds:['sentry']});break;
  }
 }
 if(sites.filter(site=>site.kinds.includes('sentry')).length!==2)throw Error(`No guarded Aurite pockets for seed ${u.seed}`);
 // Native life is anchored to real Voidite, outside ordinary ship territory.
 const voidite=u.deposits.filter(r=>mineralForRock(r.id,r.x,r.y,u.seed)==='voidite'&&regionAt(u.seed,r.x,r.y)==='dead_zone')
  .sort((a,b)=>distance(a,u.outpost)-distance(b,u.outpost)||a.id-b.id);
 for(const kind of ['lurker','spore','lurker'] as const){
  let home:Point|undefined;
  for(const separation of [430,220,0]){
   for(const rock of voidite){
    if(sites.some(site=>site.biome==='dead_zone'&&distance(site.home,rock)<separation))continue;
    for(let side=0;side<16&&!home;side++){
     const angle=side*Math.PI/8,p={x:rock.x+Math.cos(angle)*95,y:rock.y+Math.sin(angle)*95};
     if(allowed(p,'dead_zone')&&clearSegment(p,rock,rocks,rock.id,12))home=p;
    }
    if(home)break;
   }
   if(home)break;
  }
  if(!home)throw Error(`No clear Dead Zone habitat for seed ${u.seed}`);
  sites.push({id:sites.length,biome:'dead_zone',home,route:[home],radius:kind==='spore'?185:270,kinds:[kind]});
 }
 cache.set(u,sites);return sites;
}

export function segmentDistance(p:Point,a:Point,b:Point){
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
