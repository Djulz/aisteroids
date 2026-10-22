import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,STEP,settle,buy,planMinerWork,OUTPOST_COST,type Company} from '../src/sim.ts';
import {patrolSites,ENEMY_TYPES} from '../src/patrols.ts';
import {generateUniverse,regionAt} from '../src/universe.ts';
import {mineralForRock} from '../src/minerals.ts';
import {parseSave} from '../src/storage.ts';
import {currentObjective} from '../src/progression.ts';

const run=(w:ReturnType<typeof createWorld>,seconds:number)=>{for(let i=0;i<seconds/STEP&&w.phase!=='done';i++)step(w);};
const prepared=():Company=>({...freshCompany(7),rounds:5,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],deflectorShields:true});

test('two fixed Sentries guard actual Aurite pockets; Enforcers replace two Contested escorts',()=>{
 for(const seed of [0,7,17,42,99,4294967295]){
  const u=generateUniverse(seed),sites=patrolSites(u),sentries=sites.filter(s=>s.kinds.includes('sentry'));
  assert.equal(sentries.length,2);
  assert.equal(sites.filter(s=>s.kinds.includes('enforcer')).length,2);
  assert.ok(sentries.every(s=>s.route.length===1&&regionAt(seed,s.home.x,s.home.y)==='contested'&&
   u.deposits.some(r=>mineralForRock(r.id,r.x,r.y,seed)==='aurite'&&Math.hypot(r.x-s.home.x,r.y-s.home.y)<120)));
 }
 const w=createWorld(freshCompany(7));w.rocks=[];const sentry=w.enemies.find(e=>e.kind==='sentry')!;
 w.enemies=[sentry];w.drones[0].state='full';const origin={x:sentry.x,y:sentry.y};run(w,5);
 assert.deepEqual({x:sentry.x,y:sentry.y},origin,'fixed gun does not wander');
 assert.equal(ENEMY_TYPES.enforcer.hp>ENEMY_TYPES.interceptor.hp,true);
});

test('Sentry warns before firing and remains anchored while targeting nearby cargo',()=>{
 const w=createWorld({...prepared(),rounds:5});w.rocks=[];
 const sentry=w.enemies.find(e=>e.kind==='sentry')!;w.enemies=[sentry];
 const d=w.drones[0];Object.assign(d,{x:sentry.x+85,y:sentry.y,hp:50,maxHp:50,state:'full'});
 const origin={x:sentry.x,y:sentry.y};step(w);
 assert.equal(sentry.mode,'alert');assert.equal(d.hp,50);
 run(w,1.5);assert.equal(d.hp,50);
 run(w,1.5);assert.ok(d.hp<50);assert.deepEqual({x:sentry.x,y:sentry.y},origin);
});

test('a known Contested Aurite focus directs a prepared Miner beyond local Nickel',()=>{
 for(const seed of [7,17,42]){
  const c={...prepared(),worldSeed:seed},initial=createWorld(c),rock=initial.rocks.filter(r=>r.mineral==='aurite')
   .sort((a,b)=>Math.hypot(a.x-initial.base.x,a.y-initial.base.y)-Math.hypot(b.x-initial.base.x,b.y-initial.base.y))[0];
  const ready:Company={...c,enduranceLevel:2,extractionUpgrades:['highPowerOptics'],fleetCapacity:2,
   fleetComposition:{...c.fleetComposition,escort:1},unlockedTypes:['impactMiner','scout','escort'],progress:{...c.progress,rivalSeen:true},
   identifiedRocks:initial.rocks.map(r=>r.id),explored:'ff'.repeat(initial.explored.length),focuses:{mining:{x:rock.x,y:rock.y},scout:null}};
  const w=createWorld(ready),job=planMinerWork(w,w.drones[0]);
  assert.equal(job?.kind,'rock',`seed ${seed}`);if(job?.kind==='rock')assert.equal(job.rock.id,rock.id,`seed ${seed}`);
 }
});

test('a prepared four-slot HQ expedition extracts and returns real Aurite on seed 42',()=>{
 const seed=42,c={...prepared(),worldSeed:seed},first=createWorld(c);
 const rock=first.rocks.filter(r=>r.mineral==='aurite').sort((a,b)=>Math.hypot(a.x-first.base.x,a.y-first.base.y)-Math.hypot(b.x-first.base.x,b.y-first.base.y))[0];
 const ready:Company={...c,enduranceLevel:2,fleetCapacity:4,fleetComposition:{...c.fleetComposition,impactMiner:2,escort:1,scout:1},
  unlockedTypes:['impactMiner','scout','escort'],progress:{...c.progress,rivalSeen:true},extractionUpgrades:['highPowerOptics'],
  identifiedRocks:first.rocks.map(r=>r.id),explored:'ff'.repeat(first.explored.length),focuses:{mining:{x:rock.x,y:rock.y},scout:null}};
 const w=createWorld(ready);run(w,270);
 assert.equal(w.phase,'done');assert.ok(w.extractedByMineral.aurite>0);
 assert.ok(w.deliveredByMineral.aurite>0,'actual station cargo, not merely extracted fragments');
 assert.equal(settle(ready,w).progress.protectedAuriteDelivery,true);
});

test('shielded Aurite milestone requires real docking; extraction and lost holds do not count',()=>{
 const c={...prepared(),fleetCapacity:1};
 const empty=createWorld(c);empty.extractedByMineral.aurite=10;
 assert.equal(settle(c,empty).progress.protectedAuriteDelivery,false);
 const lost=createWorld(c);lost.drones[0].cargoItems.push({mineral:'aurite'});lost.drones[0].state='dead';
 assert.equal(settle(c,lost).progress.protectedAuriteDelivery,false);
 const w=createWorld(c);w.rocks=[];w.enemies=[];w.drones[0].cargoItems.push({mineral:'aurite'});w.drones[0].state='return';run(w,12);
 assert.equal(w.deliveredByMineral.aurite,1);
 assert.equal(settle(c,w).progress.protectedAuriteDelivery,true);
 const noShield={...c,deflectorShields:false};
 assert.equal(settle(noShield,{...w,company:noShield}).progress.protectedAuriteDelivery,false);
});

test('buying Outpost selects its harbor; the next goal requires an actual frontier delivery',()=>{
 const aurite=createWorld(prepared()).rocks.filter(r=>r.mineral==='aurite').sort((a,b)=>Math.hypot(a.x-generateUniverse(7).outpost.x,a.y-generateUniverse(7).outpost.y)-Math.hypot(b.x-generateUniverse(7).outpost.x,b.y-generateUniverse(7).outpost.y))[0];
 const start={...prepared(),credits:OUTPOST_COST,progress:{...freshCompany().progress,outpostSurveyed:true,protectedAuriteDelivery:true},shopOffers:['outpost' as const],identifiedRocks:[aurite.id],focuses:{mining:{x:800,y:3420},scout:null}};
 const bought=buy(start,'outpost');assert.ok(bought);
 assert.equal(bought!.credits,0);assert.equal(bought!.launchSite,'far');
 assert.deepEqual(bought!.focuses.mining,{x:aurite.x,y:aurite.y});
 assert.equal(currentObjective({...bought!,uniqueTechDiscoveries:['first_aurite_delivery']}).id,'outpost_operation');
 const w=createWorld(bought!);w.rocks=[];w.enemies=[];w.drones[0].cargoItems.push({mineral:'aurite'});w.drones[0].state='return';run(w,12);
 const delivered=settle(bought!,w);assert.equal(delivered.progress.outpostOperated,true);
 assert.equal(currentObjective(delivered).id,'probe');
 const old={...bought!} as unknown as Record<string,unknown>;
 old.progress={...bought!.progress};delete (old.progress as Record<string,unknown>).outpostOperated;
 assert.equal(parseSave(JSON.stringify(old)).outpost,true);
 assert.equal(parseSave(JSON.stringify(old)).progress.outpostOperated,false);
});
