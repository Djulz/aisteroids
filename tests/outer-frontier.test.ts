import test from 'node:test';
import assert from 'node:assert/strict';
import {canWorkMineral,createWorld,freshCompany,planMinerWork,planHaulerWork,settle,step,STEP,type Company} from '../src/sim.ts';
import {patrolSites} from '../src/patrols.ts';
import {generateUniverse,regionAt} from '../src/universe.ts';
import {mineralForRock,MINERALS} from '../src/minerals.ts';

const run=(w:ReturnType<typeof createWorld>,seconds:number)=>{for(let i=0;i<seconds/STEP&&w.phase!=='done';i++)step(w);};

test('native Dead Zone habitats guard physical Voidite and never enter the station harbor',()=>{
 for(let seed=0;seed<64;seed++){
  const u=generateUniverse(seed),sites=patrolSites(u).filter(s=>s.biome==='dead_zone');
  assert.deepEqual(sites.map(s=>s.kinds[0]),['lurker','spore','lurker']);
  for(const site of sites){
   assert.equal(regionAt(seed,site.home.x,site.home.y),'dead_zone');
   assert.ok(u.deposits.some(r=>mineralForRock(r.id,r.x,r.y,seed)==='voidite'&&Math.hypot(r.x-site.home.x,r.y-site.home.y)<120));
   assert.ok(Math.hypot(site.home.x-u.outpost.x,site.home.y-u.outpost.y)>245);
  }
 }
});

test('a Spore warns before a pulse; radiation shielding reduces the same attack',()=>{
 const exposure=(shielded:boolean)=>{
  const c:Company={...freshCompany(7),rounds:5,environmentUpgrades:shielded?['radiationShielding']:[]};
  const w=createWorld(c),spore=w.enemies.find(e=>e.kind==='spore')!;
  w.enemies=[spore];w.rocks=[];
  const d=w.drones[0];Object.assign(d,{x:spore.x,y:spore.y,hp:50,maxHp:50,state:'full'});
  const origin={x:spore.x,y:spore.y};step(w);
  assert.equal(spore.mode,'alert');assert.equal(w.attacks,0);assert.ok(d.hp>49.9);
  run(w,3.5);assert.ok(w.attacks>0);assert.deepEqual({x:spore.x,y:spore.y},origin);
  return 50-d.hp;
 };
 assert.ok(exposure(true)<exposure(false)*.6);
});

test('a prepared Fighter can clear a native habitat without removing its finite deposit',()=>{
 const start=freshCompany(7),c:Company={...start,rounds:5,fleetCapacity:2,unlockedTypes:['impactMiner','scout','escort'],progress:{...start.progress,rivalSeen:true},
  fleetComposition:{...start.fleetComposition,escort:1},environmentUpgrades:['radiationShielding']};
 const w=createWorld(c),spore=w.enemies.find(e=>e.kind==='spore')!,initial=w.rocks.find(r=>r.mineral==='voidite'&&Math.hypot(r.x-spore.x,r.y-spore.y)<120)!;
 w.enemies=[spore];w.rocks=[];
 Object.assign(w.drones[0],{x:spore.x+30,y:spore.y,state:'full',hp:80,maxHp:80});
 Object.assign(w.guards[0],{x:spore.x+65,y:spore.y,hp:30,maxHp:30});
 run(w,13);assert.ok(spore.hp<=0,'Fighter suppresses and clears the biological threat');
 assert.ok(initial.hp>0,'enemy defeat is not free mining');
});

test('Cryonite reserves can fund both Dead Zone upgrades across reference seeds',()=>{
 for(const seed of [7,17,42]){
  const stock=createWorld(freshCompany(seed)).rocks.filter(r=>r.mineral==='cryonite').reduce((n,r)=>n+r.hp,0)*MINERALS.cryonite.credits;
  assert.ok(stock>=4000,`seed ${seed}: ${stock} potential Credits`);
 }
});

test('repeated disposable Voidite shifts cannot harvest or pick up without shielding',()=>{
 const seed=7,base=freshCompany(seed),first=createWorld(base),rock=first.rocks.find(r=>r.mineral==='voidite')!;
 let c:Company={...base,rounds:10,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],enduranceLevel:3,outpost:true,launchSite:'far',
  extractionUpgrades:['highPowerOptics','resonanceMining'],identifiedRocks:first.rocks.map(r=>r.id),explored:'ff'.repeat(first.explored.length),focuses:{mining:{x:rock.x,y:rock.y},scout:null}};
 assert.equal(canWorkMineral(c,'laserMiner','voidite'),false);
 for(let shift=0;shift<3;shift++){
  const w=createWorld(c);w.rocks=w.rocks.filter(r=>r.id===rock.id);w.ores=[{id:99999,x:rock.x+25,y:rock.y,value:1,mineral:'voidite',age:1}];
  w.enemies=[];assert.equal(planMinerWork(w,w.drones[0])?.kind,undefined);
  run(w,270);assert.equal(w.phase,'done');assert.equal(w.extractedByMineral.voidite,0);assert.equal(w.deliveredByMineral.voidite,0);
  c=settle(c,w);assert.equal(c.uniqueTechDiscoveries.includes('first_voidite_delivery'),false);
 }
 const equipped={...c,environmentUpgrades:['radiationShielding' as const]};
 assert.equal(canWorkMineral(equipped,'impactMiner','voidite'),true);
});

test('shielded two-Miner expedition physically docks Voidite from the Dead Zone',()=>{
 const seed=7,start=freshCompany(seed),u=generateUniverse(seed),first=createWorld(start);
 const target=first.rocks.filter(r=>r.mineral==='voidite').sort((a,b)=>{
  const density=(r:typeof a)=>first.rocks.filter(p=>Math.hypot(r.x-p.x,r.y-p.y)<180).length;
  return (Math.hypot(a.x-u.outpost.x,a.y-u.outpost.y)*.02-density(a))-(Math.hypot(b.x-u.outpost.x,b.y-u.outpost.y)*.02-density(b))||a.id-b.id;
 })[0];
 const c:Company={...start,rounds:4,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],outpost:true,launchSite:'far',enduranceLevel:3,
  fleetCapacity:3,fleetComposition:{...start.fleetComposition,impactMiner:2,escort:1},unlockedTypes:['impactMiner','scout','escort'],
  progress:{...start.progress,rivalSeen:true},environmentUpgrades:['navigationStabilizers','radiationShielding'],
  extractionUpgrades:['highPowerOptics','resonanceMining'],identifiedRocks:first.rocks.map(r=>r.id),explored:'ff'.repeat(first.explored.length),focuses:{mining:{x:target.x,y:target.y},scout:null}};
 const w=createWorld(c);run(w,270);
 assert.equal(w.phase,'done');assert.ok(w.extractedByMineral.voidite>0);assert.ok(w.deliveredByMineral.voidite>0);
 assert.ok(settle(c,w).uniqueTechDiscoveries.includes('first_voidite_delivery'));
});

test('Hauler cannot reclaim loose Voidite without shielding even outside its native biome',()=>{
 const initial=freshCompany(7),c:Company={...initial,rounds:5,fleetCapacity:2,unlockedTypes:['impactMiner','scout','hauler'],
  basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],fleetComposition:{...initial.fleetComposition,hauler:1}};
 const w=createWorld(c),h=w.haulers[0];w.rocks=[];w.enemies=[];w.explored.fill(255);
 w.ores=[{id:99999,x:h.x,y:h.y,value:1,mineral:'voidite',age:1}];
 assert.equal(planHaulerWork(w,h),undefined);run(w,1);
 assert.equal(w.haulerPickups,0);assert.equal(w.ores.length,1);
 w.company.environmentUpgrades.push('radiationShielding');
 assert.equal(planHaulerWork(w,h)?.kind,'ore');
});
