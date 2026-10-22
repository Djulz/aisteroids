import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,STEP,visibleAt,sensedAt,updateKnowledge,settle,planMinerWork,planHaulerWork,unlocked,type Enemy,type Company,type World} from '../src/sim.ts';
import {patrolSites,ENEMY_TYPES,type EnemyKind} from '../src/patrols.ts';
import {generateUniverse,regionAt} from '../src/universe.ts';
import {clearSegment,navigationStats} from '../src/navigation.ts';
import {parseSave} from '../src/storage.ts';
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const run=(w:World,seconds:number)=>{for(let i=0;i<seconds/STEP&&w.phase!=='done';i++)step(w);};
function arena(kind:EnemyKind='patrol'){
 const w=createWorld({...freshCompany(),rounds:1}),home={x:2050,y:2700};w.rocks=[];
 const enemy:Enemy={id:9000,...home,vx:0,vy:0,hp:ENEMY_TYPES[kind].hp,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,kind,mode:'patrol',home,
  patrol:{id:0,home,biome:'scrap_fields',radius:235,route:[{x:2050,y:2700},{x:2100,y:2760},{x:1990,y:2760}],kinds:[kind]},routeIndex:1};
 w.enemies=[enemy];Object.assign(w.drones[0],{x:home.x+60,y:home.y,state:'full',hp:50,maxHp:50});return {w,enemy,d:w.drones[0]};
}

test('all patrols exist at launch, scale by territory, and retain seed routes across shifts',()=>{
 const a=createWorld(freshCompany(7)),b=createWorld({...freshCompany(7),fleetCapacity:6,rounds:8});
 assert.equal(a.enemies.length,23);assert.equal(b.enemies.length,a.enemies.length);
 assert.deepEqual(a.enemies.map(e=>[e.id,e.kind,e.patrol]),b.enemies.map(e=>[e.id,e.kind,e.patrol]));
 assert.notDeepEqual(a.enemies.map(e=>[e.x,e.y]),b.enemies.map(e=>[e.x,e.y]));
 const ids=a.enemies.map(e=>e.id),start=a.enemies.map(e=>({x:e.x,y:e.y}));
 a.drones[0].state='full';a.company.rounds=1;run(a,20);
 assert.deepEqual(a.enemies.map(e=>e.id),ids,'no timed replacements or reinforcements');
 assert.ok(a.enemies.every(e=>e.hp>0));assert.ok(a.enemies.some((e,i)=>distance(e,start[i])>25),'off-screen patrols move');
 a.enemies[0].hp=0;run(a,4);assert.equal(a.enemies[0].hp,0);assert.equal(a.enemies.length,23);
 assert.equal(createWorld(freshCompany(7)).enemies[0].hp,ENEMY_TYPES.patrol.hp,'next shift restores its population');
 assert.ok(navigationStats(a.rocks).calls<30,'idle patrol triangles do not trigger distant global pathfinding');
});

test('patrol geometry is clear and biome-specific across seeds, with no Home Belt or Dead Zone ships',()=>{
 for(const seed of [0,1,7,17,42,99,300,4294967295]){
  const u=generateUniverse(seed),sites=patrolSites(u),rocks=u.deposits.map(r=>({...r,hp:1}));
  assert.equal(sites.length,13);assert.equal(sites.filter(s=>s.biome==='scrap_fields').length,4);
  for(const site of sites)for(let i=0;i<site.route.length;i++){
   const p=site.route[i],q=site.route[(i+1)%site.route.length];
   assert.equal(regionAt(seed,p.x,p.y),site.biome);assert.ok(clearSegment(p,q,rocks,-1,18));
   assert.ok(distance(p,u.hq)>635);assert.ok(distance(p,u.outpost)>245);
  }
 }
 assert.notDeepEqual(patrolSites(generateUniverse(7)),patrolSites(generateUniverse(17)));
});

test('charted space stays live without sensors, while black space stays hidden and contact remains physical',()=>{
 const w=createWorld(freshCompany()),e=w.enemies[0];assert.equal(visibleAt(w,e),false);
 w.explored.fill(255);w.visible.fill(0);assert.equal(visibleAt(w,e),true);assert.equal(sensedAt(w,e),false);
 updateKnowledge(w);assert.equal(visibleAt(w,e),true);assert.equal(w.progress.rivalSeen,false);
 assert.equal(w.pendingTech.some(e=>e.id==='first_rival_contact'),false);
 Object.assign(w.drones[0],{x:e.x+30,y:e.y});updateKnowledge(w);
 assert.equal(w.progress.rivalSeen,true);assert.equal(w.pendingTech.filter(e=>e.id==='first_rival_contact').length,1);
 updateKnowledge(w);const c=settle(w.company,w);assert.ok(c.unlockedTypes.includes('escort'));
 const loaded=parseSave(JSON.stringify(c));assert.equal(loaded.worldSeed,c.worldSeed);assert.equal(loaded.explored,c.explored);
 assert.equal(createWorld(loaded).progress.rivalSeen,true);
});

test('early Scout expeditions make real contact across seeds without attacking the starter HQ',()=>{
 for(const seed of [0,17,42]){
  let c:Company={...freshCompany(seed),rounds:5,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],fleetCapacity:2,enduranceLevel:1,
   fleetComposition:{...freshCompany().fleetComposition,scout:1},focuses:{mining:null,scout:{x:800,y:3420}}};
  let contact=false;
  for(let shift=0;shift<2&&!contact;shift++){
   const w=createWorld(c);run(w,200);assert.equal(w.phase,'done');
   assert.equal(w.drones.filter(d=>d.state==='dead').length,0,`starter worker at seed ${seed}`);
   assert.equal(w.progress.hqIntrusion,false);contact=w.progress.rivalSeen;c=settle(c,w);
  }
  assert.equal(contact,true,`physical first contact at seed ${seed}`);assert.ok(c.unlockedTypes.includes('escort'));
 }
});

test('enemy detection uses its own sensors and line of sight, with a warning before damage',()=>{
 const {w,enemy,d}=arena();w.visible.fill(0);w.explored.fill(0);step(w);
 assert.equal(enemy.mode,'alert');assert.equal(d.hp,50);assert.equal(w.attacks,0);
 run(w,1);assert.equal(d.hp,50);run(w,1.5);assert.ok(w.attacks>0);assert.ok(d.hp<50);
 const blocked=arena();blocked.w.rocks=[{id:1,x:2080,y:2700,r:18,hp:10,max:10,shape:Array(11).fill(1),mineral:'ferrite'}];
 step(blocked.w);assert.equal(blocked.enemy.targetKey,undefined);assert.equal(blocked.w.attacks,0);
});

test('losing a target searches its last position, then returns instead of chasing into Home Belt',()=>{
 const {w,enemy,d}=arena();run(w,2);const last={...enemy.lastSeen!};
 Object.assign(d,{x:w.base.x,y:w.base.y});step(w);
 assert.equal(enemy.mode,'search');assert.deepEqual(enemy.lastSeen,last);assert.equal(enemy.targetKey,undefined);
 run(w,7);assert.ok(enemy.mode==='patrol'||enemy.mode==='return');assert.ok(distance(enemy,enemy.home!)<250);
 assert.equal(regionAt(7,enemy.x,enemy.y),'scrap_fields');assert.equal(d.hp,48);
});

test('a Fighter wins a single patrol encounter and keeps away from distant chart-visible enemies',()=>{
 const {w,enemy,d}=arena();d.hp=15;d.maxHp=15;
 const c:Company={...freshCompany(),rounds:1,fleetCapacity:2,unlockedTypes:['impactMiner','scout','escort'],fleetComposition:{...freshCompany().fleetComposition,escort:1},progress:{...freshCompany().progress,rivalSeen:true}};
 const protectedWorld=createWorld(c);protectedWorld.rocks=[];protectedWorld.enemies=[structuredClone(enemy)];
 Object.assign(protectedWorld.drones[0],{x:d.x,y:d.y,state:'full'});Object.assign(protectedWorld.guards[0],{x:d.x+10,y:d.y+10});
 run(w,8);run(protectedWorld,8);assert.ok(enemy.hp>0);assert.equal(protectedWorld.enemies[0].hp,0);
 assert.ok(protectedWorld.drones[0].hp>d.hp);assert.ok(protectedWorld.guards[0].hp>0);
 const remote=createWorld(c);remote.rocks=[];remote.explored.fill(255);remote.drones[0].state='full';
 const start={...remote.guards[0]};run(remote,5);assert.ok(distance(remote.guards[0],start)<200,'map visibility does not cause a distant pursuit');
});

test('unprotected workers avoid occupied jobs, while a nearby Fighter makes the patch viable',()=>{
 const {w,enemy,d}=arena();w.explored.fill(255);d.state='mine';Object.assign(d,{x:1900,y:2700});
 w.rocks=[{id:1,x:2070,y:2700,r:20,hp:15,max:15,shape:Array(11).fill(1),mineral:'ferrite'},
  {id:2,x:1750,y:2700,r:20,hp:15,max:15,shape:Array(11).fill(1),mineral:'ferrite'}];w.identifiedRocks=new Set([1,2]);
 const job=planMinerWork(w,d);assert.equal(job?.kind,'rock');if(job?.kind==='rock')assert.equal(job.rock.id,2);
 const protectedUnit=createWorld({...freshCompany(),fleetCapacity:2,unlockedTypes:['impactMiner','escort'],fleetComposition:{...freshCompany().fleetComposition,escort:1},progress:{...freshCompany().progress,rivalSeen:true}}).guards[0];
 Object.assign(protectedUnit,{x:enemy.x+20,y:enemy.y});w.guards=[protectedUnit];w.rocks=w.rocks.slice(0,1);
 assert.equal(planMinerWork(w,d)?.kind,'rock');
 const hWorld=createWorld({...freshCompany(),fleetCapacity:2,unlockedTypes:['impactMiner','hauler'],fleetComposition:{...freshCompany().fleetComposition,hauler:1}}),h=hWorld.haulers[0];
 hWorld.enemies=[enemy];hWorld.explored.fill(255);Object.assign(h,{x:1900,y:2700});
 hWorld.ores=[{id:1,x:enemy.x+20,y:enemy.y,value:1,mineral:'nickel',age:1}];
 assert.equal(planHaulerWork(hWorld,h),undefined,'known unsafe freight is not a job');
});

test('Station Turret is an Outpost purchase and fires from the current launch station',()=>{
 const c:Company={...freshCompany(),rounds:1,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner']};
 assert.equal(unlocked(c,'turret'),false);assert.equal(unlocked({...c,outpost:true},'turret'),true);
 const w=createWorld({...c,turret:true,outpost:true,launchSite:'far'});w.rocks=[];w.drones[0].state='full';
 const enemy={...arena().enemy,patrol:undefined,home:undefined,x:w.base.x+220,y:w.base.y};w.enemies=[enemy];
 step(w);const shot=w.effects.find(e=>e.type==='turretShot');assert.ok(shot);
 assert.equal(shot.x,w.base.x);assert.equal(shot.y,w.base.y-10);assert.equal(enemy.hp,2);
});
