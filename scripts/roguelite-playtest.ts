import {newRun,stepRun,buySlot,buyHull,buyTurret,chooseTech,units,alive,usedCapacity,ECONOMY,serializeRun,restoreRun,type Tech} from '../src/roguelite.ts';
import {HOME} from '../src/sim.ts';
const reckless=process.argv.includes('--reckless');
const scoutTurret=process.argv.includes('--scout-turret');
const turretOnly=process.argv.includes('--turret-only');
const seeds=process.argv.slice(2).filter(a=>!a.startsWith('--')).map(Number);if(!seeds.length)seeds.push(7,42,1337);
const start=performance.now();
for(const seed of seeds){
 const r=newRun(seed);let maxEnemies=0,damage=0,lastHp=15,firstShatter:number|null=null,firstOuterTrip:number|null=null,firstOuterDelivery:number|null=null,firstScout:number|null=null,firstTurret:number|null=null,lowestHQ=40;
 const priorities:Tech[]=['twin','drones','nanite','kinetic','chain','magnetic','reactive','emergency','relay','salvage','echo','overdrive'];
 for(let tick=0;tick<60*900&&!r.result;tick++){
  if(r.draft.length)chooseTech(r,priorities.find(t=>r.draft.includes(t))??r.draft[0]);
  if(tick%60===0){
   const live=units(r).filter(alive),miners=live.filter(u=>r.hulls[u.id]==='miner').length,fighters=live.filter(u=>r.hulls[u.id]==='fighter').length;
   if(scoutTurret&&firstScout===null&&r.credits>=ECONOMY.hulls.scout.price&&buyHull(r,'scout'))firstScout=r.world.time;
   if((scoutTurret||turretOnly)&&!r.world.company.turret&&r.credits>=ECONOMY.turret&&buyTurret(r))firstTurret=r.world.time;
   if(!miners)buyHull(r,'miner');
   else if(usedCapacity(r)<r.slots){if(miners<2)buyHull(r,'miner');else if(fighters<(scoutTurret?2:3)&&!reckless&&!turretOnly)buyHull(r,'fighter');else buyHull(r,'miner');}
   else if(r.credits>=(ECONOMY.slots[r.slots]??Infinity)+20)buySlot(r);
  }
  stepRun(r);maxEnemies=Math.max(maxEnemies,r.world.enemies.filter(e=>e.hp>0).length);
  if(firstShatter===null&&r.world.rocks.some(x=>x.hp<=0))firstShatter=r.world.time;
  if(firstOuterTrip===null&&r.world.drones.some(d=>alive(d)&&Math.hypot(d.x-HOME.x,d.y-HOME.y)>700))firstOuterTrip=r.world.time;
  if(firstOuterDelivery===null&&(r.world.rogueOuterDelivered??0)>0)firstOuterDelivery=r.world.time;
  lowestHQ=Math.min(lowestHQ,r.world.hqHp??40);
  const hp=units(r).filter(alive).reduce((n,u)=>n+u.hp,0);if(hp<lastHp)damage+=lastHp-hp;lastHp=hp;
 }
 const w=r.world;
 console.log(JSON.stringify({seed,policy:scoutTurret?'scout-turret':turretOnly?'turret-only':reckless?'unprotected-mining':'balanced',result:r.result,time:+w.time.toFixed(2),metrics:{...r.metrics,firstShatter,firstOuterTrip,firstOuterDelivery,firstScout,firstTurret},delivered:r.deliveredCredits,outerDelivered:w.rogueOuterDelivered,hqHp:w.hqHp,lowestHQ,effectiveCrPerMin:+(r.deliveredCredits/Math.max(1,w.time)*60).toFixed(2),credits:r.credits,slots:r.slots,tech:r.tech,items:r.items,losses:r.lost,extracted:w.extracted,maxEnemies,damage,ships:units(r).map(u=>({id:u.id,type:r.hulls[u.id],hp:+u.hp.toFixed(1),state:'state' in u?u.state:u.job??'escort',cargo:'cargoItems' in u?u.cargoItems.length:0,x:Math.round(u.x-w.base.x),y:Math.round(u.y-w.base.y)})),enemies:w.enemies.map(e=>({kind:e.kind,hp:e.hp,x:Math.round(e.x-w.base.x),y:Math.round(e.y-w.base.y)})),events:r.events,saveRestores:!!restoreRun(serializeRun(r))}));
}
console.log('simulation wall ms',performance.now()-start);
