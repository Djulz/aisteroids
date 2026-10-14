import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,STEP,ORE_PICKUP_DELAY,ROUND_TIME,settle,type World} from '../src/sim.ts';
import {changeFleet} from '../src/fleet.ts';
import {awardTech,research} from '../src/research.ts';
import {loadCompany,SAVE_KEY,type SaveStore} from '../src/storage.ts';

function fleet(miners:number,hauler=false){
 let c={...freshCompany(),fleetCapacity:miners+(hauler?1:0)};
 for(let i=1;i<miners;i++)c=changeFleet(c,'impactMiner',1)!;
 if(hauler){c=research(awardTech(c,['abandoned_cargo_relay']),'haulerOperation')!;c=changeFleet(c,'hauler',1)!;}
 return c;
}
const ore=(id:number,x:number,y:number)=>({id,x,y,value:1 as const,rich:false,age:1});
function claimsValid(w:World){
 const ids=new Set(w.ores.map(o=>o.id));
 for(const [id,owner] of w.oreClaims){assert.ok(ids.has(id));if(owner.ownerKind==='miner'){const d=w.drones.find(d=>d.id===owner.ownerId)!;assert.ok(d.oreQueue.includes(id));assert.equal(d.state,'mine');}else assert.equal(w.haulers.find(h=>h.id===owner.ownerId)?.targetOre,id);}
 for(const d of w.drones)assert.ok(d.oreQueue.length<=3-d.cargo,`${d.name}: ${d.oreQueue} with ${d.cargo} cargo`);
}

test('three Miners distribute ten ore claims, bounded by free cargo, and replay exactly',()=>{
 const run=()=>{
  const w=createWorld(fleet(3));w.ores=Array.from({length:10},(_,i)=>ore(500+i,255+i%5*13,485+Math.floor(i/5)*18));
  step(w);claimsValid(w);
  const queues=w.drones.map(d=>[...d.oreQueue]);
  assert.ok(new Set(queues.flat()).size>=3,JSON.stringify(queues));
  assert.equal(new Set(queues.flat()).size,queues.flat().length);
  for(let i=0;i<180;i++){step(w);claimsValid(w);}
  return [queues,w.drones.map(d=>d.cargo),w.ores.map(o=>o.id),w.claimsAssigned,w.claimsReleased];
 };
 assert.deepEqual(run(),run());
});

test('2/3 cargo has one claim; incidental pickup releases it for another Miner',()=>{
 const w=createWorld(fleet(2)),[a,b]=w.drones;
 a.cargo=2;a.x=210;a.y=520;b.x=40;b.y=800;
 w.ores=[ore(500,267,530)];step(w);assert.deepEqual(a.oreQueue,[500]);claimsValid(w);
 w.ores.push(ore(501,a.x,a.y));step(w);
 assert.equal(a.cargo,3);assert.equal(w.ores.some(o=>o.id===501),false);assert.equal(a.oreQueue.length,0);assert.equal(w.oreClaims.has(500),false);
 b.x=230;b.y=530;step(w);assert.equal(w.oreClaims.get(500)?.ownerId,b.id);claimsValid(w);
});

test('reserved ore cannot be stolen in transit; pickup clears claim once',()=>{
 const w=createWorld(fleet(2)),[a,b]=w.drones;a.x=240;a.y=530;b.x=110;b.y=550;
 w.ores=[ore(500,270,530)];step(w);assert.equal(w.oreClaims.get(500)?.ownerId,a.id);
 b.x=w.ores[0].x;b.y=w.ores[0].y;b.state='return';b.vx=b.vy=0;step(w);
 assert.equal(w.ores.length,1);assert.equal(b.cargo,0);assert.equal(w.oreClaims.get(500)?.ownerId,a.id);
 a.x=w.ores[0].x;a.y=w.ores[0].y;a.vx=a.vy=0;step(w);
 assert.equal(w.ores.length,0);assert.equal(a.cargo,1);assert.equal(w.oreClaims.has(500),false);claimsValid(w);
});

test('Hauler honors a Miner claim even when it crosses pickup radius',()=>{
 const w=createWorld(fleet(1,true)),d=w.drones[0],h=w.haulers[0];
 d.x=235;d.y=530;h.x=500;h.y=680;w.ores=[ore(700,270,530)];
 step(w);assert.deepEqual(w.oreClaims.get(700),{ownerKind:'miner',ownerId:d.id});
 h.x=270;h.y=530;h.vx=h.vy=0;step(w);
 assert.equal(h.cargo,0);assert.equal(w.ores.length,1);assert.deepEqual(w.oreClaims.get(700),{ownerKind:'miner',ownerId:d.id});
 d.x=270;d.y=530;d.vx=d.vy=0;step(w);
 assert.equal(d.cargo,1);assert.equal(h.cargo,0);assert.equal(w.ores.length,0);assert.equal(w.oreClaims.size,0);
});

test('claims release on recall, destruction, disappearance, and Hauler rendezvous',()=>{
 const w=createWorld(fleet(2,true));const [a,b]=w.drones,h=w.haulers[0];
 a.x=235;a.y=530;b.x=115;b.y=550;h.x=460;h.y=670;
 w.ores=[ore(500,270,530),ore(501,280,530)];step(w);assert.ok(a.oreQueue.length>0);
 a.hp=0;a.state='dead';step(w);assert.equal(a.oreQueue.length,0);
 const next=w.ores[0];b.x=230;b.y=530;step(w);assert.ok(w.oreClaims.has(next.id));
 w.ores=w.ores.filter(o=>o.id!==next.id);step(w);assert.equal(w.oreClaims.has(next.id),false);
 w.time=ROUND_TIME;step(w);assert.equal(w.oreClaims.size,0);
 const rendezvous=createWorld(fleet(1,true)),d=rendezvous.drones[0],carrier=rendezvous.haulers[0];
 d.x=100;d.y=100;carrier.x=530;carrier.y=700;rendezvous.ores=[ore(901,550,710)];
 step(rendezvous);assert.equal(carrier.targetOre,901);assert.equal(rendezvous.oreClaims.get(901)?.ownerKind,'hauler');
 d.cargo=3;d.x=carrier.x+40;d.y=carrier.y;step(rendezvous);
 assert.equal(d.state,'handoff');assert.equal(carrier.targetOre,-1);assert.equal(rendezvous.oreClaims.has(901),false);
});

test('locked combat and shift values apply; v9 reload retains company and Tech ledger',()=>{
 assert.equal(ROUND_TIME,30);
 const c=freshCompany(),w=createWorld(c),impact=w.drones[0];assert.equal(impact.maxHp,15);assert.equal(impact.gear.cargo,3);assert.equal(impact.gear.ramCooldown,1);
 let laser=research(awardTech(c,['experimental_probe_salvaged']),'laserMining')!;
 laser=changeFleet({...laser,fleetCapacity:2},'laserMiner',1)!;
 const l=createWorld(laser).drones[1];assert.equal(l.maxHp,10);assert.equal(l.gear.laserCooldown,2);
 const map=new Map([[SAVE_KEY,JSON.stringify({...laser,credits:83,rounds:4,rockHp:{0:22},ores:[{x:300,y:500,value:1,rich:false}]})]]);
 const store:SaveStore={getItem:key=>map.get(key)??null,setItem:(key,value)=>{map.set(key,value);},removeItem:key=>{map.delete(key);}};
 const first=loadCompany(store),again=loadCompany(store);assert.deepEqual(again,first);
 assert.equal(again.credits,83);assert.equal(again.rounds,4);assert.equal(again.techPointsEarned,1);assert.equal(again.rockHp[0],22);assert.equal(again.ores.length,1);
 const inProgress=createWorld(again);step(inProgress);assert.equal(again.credits,83,'abort leaves original untouched');
});

test('Scout deals exactly four damage per Miner hit: fresh Laser dies on third and Impact on fourth',()=>{
 for(const [kind,hits] of [['impactMiner',4],['laserMiner',3]] as const){
  const c=kind==='laserMiner'?{...freshCompany(),unlockedTypes:['impactMiner','laserMiner'] as ('impactMiner'|'laserMiner')[],fleetComposition:{...freshCompany().fleetComposition,impactMiner:0,laserMiner:1}}:freshCompany();
  const w=createWorld(c),d=w.drones[0];d.x=320;d.y=550;d.vx=d.vy=0;
  const enemy={id:99,x:350,y:550,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0};w.enemies.push(enemy);
  for(let i=1;i<=hits;i++){
   enemy.cooldown=0;const before=d.hp;step(w,STEP);assert.equal(d.hp,Math.max(0,before-4),`${kind} hit ${i}`);
   if(i<hits)assert.notEqual(d.state,'dead');
  }
  assert.equal(d.state,'dead');
 }
 const w=createWorld(freshCompany()),d=w.drones[0];d.hp=11;d.x=320;d.y=550;w.enemies.push({id:99,x:350,y:550,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});
 for(let i=0;i<3;i++){w.enemies[0].cooldown=0;step(w);}
 assert.equal(d.state,'dead','self damage before combat lowers the number of survivable scout hits');
});
