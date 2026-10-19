import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,settle,buy,updateKnowledge,validJump,STEP,type Company} from '../src/sim.ts';
import {awardTech,research,talentOptions,categoryRequirement,TALENTS,categories,oldTechSpent} from '../src/research.ts';
import {readCompany,SAVE_KEY,parseSave} from '../src/storage.ts';
import {changeFleet,usedSlots,fleetError} from '../src/fleet.ts';
import {generateUniverse,regionAt} from '../src/universe.ts';
import {HOME} from '../src/geometry.ts';
import {canExtract} from '../src/minerals.ts';
import {renderLobby} from '../src/lobby.ts';
const run=(w:ReturnType<typeof createWorld>,n:number)=>{for(let i=0;i<n&&w.phase!=='done';i++)step(w,STEP);};
const finish=(w:ReturnType<typeof createWorld>)=>{run(w,12600);assert.equal(w.phase,'done');};
const funded=(seed=7)=>awardTech({...freshCompany(seed),rounds:1,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],progress:{...freshCompany(seed).progress,rivalSeen:true}},['first_shift_delivered','first_fleet_expansion','home_belt_surveyed','first_nickel_delivery','derelict_excavation_platform','first_rival_contact','abandoned_cargo_relay','experimental_probe_salvaged','first_aurite_delivery']);

test('lobby keeps one Miner assignment, role gates, and weighted Rig controls',()=>{
 const view={tab:'hangar' as const,error:'',storageOK:true};
 const fresh=renderLobby(freshCompany(),view);
 assert.match(fresh,/data-type="impactMiner"/);assert.doesNotMatch(fresh,/data-type="laserMiner"|data-type="hauler"|data-type="escort"|data-type="miningRig"/);
 const ready=renderLobby({...funded(),fleetCapacity:3},view);
 assert.match(ready,/data-type="hauler"/);assert.match(ready,/data-type="escort"/);
 assert.doesNotMatch(ready,/Mining Rig · 2 slots/);
 const research=renderLobby(funded(),{...view,tab:'research'});
 assert.match(research,/data-upgrade="miner"/);assert.match(research,/TECH AVAILABLE/);
});

test('fresh Miner, available Scout, and one-slot Rig fleet validation',()=>{
 const c=freshCompany();assert.equal(c.fleetCapacity,1);assert.equal(c.fleetComposition.impactMiner,1);
 assert.ok(changeFleet(c,'scout',1)===null);assert.ok(changeFleet(c,'escort',1)===null);
 let ready={...funded(),fleetCapacity:3};ready=changeFleet(ready,'miningRig',1)!;
 assert.equal(usedSlots(ready.fleetComposition),2);assert.ok(!fleetError(ready));
 ready=changeFleet(ready,'impactMiner',-1)!;assert.ok(!fleetError(ready));
 assert.equal(usedSlots(ready.fleetComposition),1);
});
test('relay is physically clear and a basic Miner investigates without Scout or Fighter',()=>{
 for(const seed of [0,7,17,42]){
  const c=freshCompany(seed),site=generateUniverse(seed).pois.find(p=>p.id==='abandoned_cargo_relay')!;
  assert.equal(regionAt(seed,site.x,site.y),'home_belt');assert.ok(Math.hypot(site.x-HOME.x,site.y-HOME.y)>=340);
  const w=createWorld(c);assert.equal(w.discoveredPois.has(site.id),false,'site is beyond the starting sensors');
  Object.assign(w.drones[0],{x:site.x+55,y:site.y});updateKnowledge(w);
  finish(w);assert.ok(w.pendingTech.some(e=>e.id===site.id));
  assert.ok(settle(c,w).unlockedTypes.includes('hauler'));
 }
});
test('first sensed contact grants Fighter separately from its once-only Tech',()=>{
 let c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,scout:1}};
 const w=createWorld(c);w.enemies.push({id:999,x:w.scouts[0].x+35,y:w.scouts[0].y,vx:0,vy:0,hp:3,cooldown:10,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0});
 updateKnowledge(w);assert.equal(w.progress.rivalSeen,true);assert.ok(w.pendingTech.some(e=>e.id==='first_rival_contact'));
 c=settle(c,w);assert.ok(c.unlockedTypes.includes('escort'));assert.equal(c.uniqueTechDiscoveries.filter(id=>id==='first_rival_contact').length,1);
 assert.equal(settle(c,w).techPointsEarned,c.techPointsEarned);
});
test('branch options are exactly two and committed choices are permanent',()=>{
 let c=funded();assert.equal(c.techPointsEarned,9);
 for(const category of categories)assert.equal(talentOptions(c,category).length,2);
 assert.equal(categoryRequirement(freshCompany(),'fighter'),'Complete the Miner workshop introduction first.');
 assert.equal(categoryRequirement({...freshCompany(),basicUpgrades:['cargoAwareness','navigationAssist','workPlanner']},'fighter'),'Observe a rival with friendly sensors.');
 const original=c.techPointsAvailable;c=research(c,'ramSplitter')!;
 assert.deepEqual(talentOptions(c,'miner'),['heavyHead','rapidRecovery']);
 c=research(c,'rapidRecovery')!;assert.deepEqual(talentOptions(c,'miner'),['phaseRam','magneticRam']);
 c=research(c,'magneticRam')!;assert.equal(c.techPointsAvailable,original-6);
 assert.equal(c.techPointsAvailable,original-6);assert.deepEqual(parseSave(JSON.stringify(c)),c);
 assert.equal(research(c,'laserCutter'),null);
 assert.equal(TALENTS.heavyPulse.level,2);
});
test('Laser and Ram share bought extraction class, with no laser blueprint tax',()=>{
 assert.equal(canExtract('impactMiner','aurite',[]),false);
 assert.equal(canExtract('impactMiner','aurite',['highPowerOptics']),true);
 assert.equal(canExtract('laserMiner','aurite',['highPowerOptics']),true);
 assert.equal(canExtract('miningRig','voidite',['resonanceMining']),true);
 const c=awardTech(funded(),['abandoned_research_station']);
 assert.equal(buy({...c,credits:240,shopOffers:['highPowerOptics']},'highPowerOptics')?.credits,0);
});
test('platform is a stable B2 physical investigation and grants a one-slot Rig',()=>{
 const c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,scout:1}};
 const w=createWorld(c),site=w.definition.pois.find(p=>p.id==='derelict_excavation_platform')!,scout=w.scouts[0];
 assert.equal(regionAt(c.worldSeed,site.x,site.y),'scrap_fields');
 assert.equal(w.discoveredPois.has(site.id),false);
 Object.assign(scout,{x:site.x+12,y:site.y,vx:0,vy:0,targetX:site.x,targetY:site.y,targetUntil:200});
 run(w,400);assert.ok(w.pendingTech.some(e=>e.id===site.id));assert.ok(settle(c,w).unlockedTypes.includes('miningRig'));
});
test('Rig physically deploys, depletes reserves, loads Hauler and eventually settles',()=>{
 let c={...funded(),fleetCapacity:4,fleetComposition:{impactMiner:0,laserMiner:0,scout:0,escort:0,hauler:2,miningRig:1}};
 const w=createWorld(c),rig=w.rigs[0],rock=w.rocks.find(r=>r.hp>5&&r.mineral==='ferrite'&&Math.hypot(r.x-HOME.x,r.y-HOME.y)<400)!;
 assert.ok(rock);w.explored.fill(255);w.identifiedRocks.add(rock.id);
 Object.assign(rig,{x:rock.x+rock.r+44,y:rock.y,state:'deploy',targetRock:rock.id,setup:0});
 const reserve=rock.hp;run(w,270);assert.ok(rock.hp<reserve);assert.ok(rig.cargo>0||w.haulers.some(h=>h.cargo>0));
 w.time=w.missionDuration;finish(w);c=settle(c,w);assert.ok(c.rockHp[rock.id]<reserve);assert.ok(c.ores.every(o=>o.value===1));
});
test('jump requires charted, clear same-biome geometry',()=>{
 const w=createWorld(freshCompany());w.explored.fill(255);
 assert.equal(validJump(w,{x:HOME.x,y:HOME.y},{x:HOME.x+80,y:HOME.y},200),true);
 assert.equal(validJump(w,{x:HOME.x,y:HOME.y},{x:HOME.x+410,y:HOME.y},200),false);
 assert.equal(validJump(w,{x:HOME.x+590,y:HOME.y},{x:HOME.x+710,y:HOME.y},200),false);
 w.explored.fill(0);assert.equal(validJump(w,{x:HOME.x,y:HOME.y},{x:HOME.x+80,y:HOME.y},200),false);
});
test('v15 company migration refunds recognized Tech once and preserves the entire world ledger',()=>{
 const base=freshCompany(17),old={...base,version:15,contentVersion:undefined,talents:undefined,migrationNotice:undefined,legacyHaulerAccess:undefined,
  credits:187,total:490,rounds:9,rockHp:{0:2},ores:[{x:1430,y:2800,value:1,rich:false,mineral:'ferrite'}],
  techPointsEarned:3,techPointsAvailable:0,uniqueTechDiscoveries:['far_belt_charted','first_rival_contact','abandoned_cargo_relay'],
  unlockedTechnologies:['laserMining','rapidCooling'],grandfatheredEscort:false,
  unlockedTypes:['impactMiner','scout','laserMiner'],fleetCapacity:2,fleetComposition:{...base.fleetComposition,impactMiner:0,laserMiner:1,scout:1},
  progress:{...base.progress,rivalSeen:true,farSurveyed:true}};
 // Old v15 ships were assigned separately and Tech prices total three.
 assert.equal(oldTechSpent(old.unlockedTechnologies),3);
 const data=new Map([['aisteroids-company-v15',JSON.stringify(old)]]);
 const io={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
 const read=readCompany(io);assert.equal(read.issue,'migrated');assert.ok(read.company);
 const next=read.company!;assert.equal(next.version,17);assert.equal(next.credits,187);assert.equal(next.worldSeed,17);
 assert.deepEqual(next.rockHp,{0:2});assert.deepEqual(next.ores,old.ores);assert.equal(next.explored,base.explored);
 assert.equal(next.techPointsAvailable,3);assert.equal(next.fleetComposition.impactMiner,1);assert.equal(next.fleetComposition.laserMiner,0);
 assert.ok(next.unlockedTypes.includes('hauler'));assert.ok(next.unlockedTypes.includes('escort'));
 assert.equal(data.has('aisteroids-company-v15'),false);assert.deepEqual(readCompany(io).company,next);assert.ok(data.has(SAVE_KEY));
});
test('capabilities derive from persistent chosen nodes',()=>{
 let c=funded();c=research(c,'laserCutter')!;c=research(c,'longRangeOptics')!;
 assert.equal(createWorld(c).drones[0].gear.laserRange,136);
 assert.equal(parseSave(JSON.stringify(c))?.talents.join(','),c.talents.join(','));
 let h=funded();h=research(h,'expressDelivery')!;h=research(h,'precisionJump')!;
 h={...h,fleetCapacity:2,fleetComposition:{...h.fleetComposition,hauler:1}};
 assert.equal(createWorld(h).haulers[0].capacity,6);
 assert.equal(createWorld(h).haulers[0].capacity,6);
 let f=funded();f=research(f,'guardianFrame')!;f=research(f,'shieldProjector')!;
 f={...f,fleetCapacity:2,fleetComposition:{...f.fleetComposition,escort:1}};
 assert.equal(createWorld(f).guards[0].maxHp,9);
 let s=funded();s=research(s,'surveyArray')!;s=research(s,'surveyBeacon')!;
 s={...s,fleetCapacity:2,fleetComposition:{...s.fleetComposition,scout:1}};
 assert.ok(createWorld(s).scouts.length===1);
});
test('detached cargo cart preserves mineral identity through destruction and save',()=>{
 let c=funded();c=research(c,'bulkCarrier')!;c=research(c,'geminiCart')!;
 c={...c,fleetCapacity:2,fleetComposition:{impactMiner:1,laserMiner:0,escort:0,hauler:1,scout:0,miningRig:0}};
 const w=createWorld(c),cart=w.carts[0];assert.ok(cart);
 cart.attached=false;cart.x=HOME.x+35;cart.y=HOME.y+80;cart.cargoItems.push({mineral:'nickel'},{mineral:'ferrite'});
 w.drones[0].x=HOME.x+250;w.drones[0].y=HOME.y-100;w.haulers[0].state='dead';
 w.enemies.push({id:999,x:cart.x+20,y:cart.y,vx:0,vy:0,hp:3,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0});
 for(let i=0;i<600&&cart.hp>0;i++)step(w,STEP);
 assert.equal(cart.destroyed,true);assert.equal(cart.cargo,0);
 const salvage=w.ores.filter(o=>o.mineral==='nickel'||Math.hypot(o.x-cart.x,o.y-cart.y)<30);
 assert.equal(salvage.length,2);assert.deepEqual(salvage.map(o=>o.mineral).sort(),['ferrite','nickel']);
 const next=settle(c,w);assert.deepEqual(parseSave(JSON.stringify(next)),next);
});
test('finite general service reserve and non-stacking shield absorb weapon damage only',()=>{
 const c={...funded(),fleetCapacity:2,fleetComposition:{...funded().fleetComposition,escort:1},talents:['guardianFrame','shieldProjector','reinforcedChassis','fieldServiceBuoy'] as Company['talents'],techPointsAvailable:7-6};
 const w=createWorld(c),d=w.drones[0],g=w.guards[0];
 assert.equal(d.maxHp,18.75);assert.equal(g.maxHp,11.25);
 d.x=HOME.x+100;d.y=HOME.y;g.x=d.x+10;g.y=d.y+10;d.hp=d.maxHp-4;
 w.enemies.push({id:988,x:d.x+38,y:d.y,vx:0,vy:0,hp:3,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0});
 step(w,STEP);assert.ok(w.shields.length<=1);assert.ok(w.shields.every(s=>s.remaining>=0&&s.remaining<=4));
 assert.ok(w.service===null||w.service.reserve<=12);
});
test('Ram branch extracts finite primary and secondary reserves in one nonrecursive charge',()=>{
 const c={...freshCompany(),talents:['ramSplitter'] as Company['talents']},w=createWorld(c);
 const make=(id:number,x:number,hp:number)=>({id,x,y:300,r:20,hp,max:12,shape:Array(11).fill(1),mineral:'ferrite' as const});
 w.rocks=[make(1,300,3),make(2,200,4)];w.ores=[];w.explored.fill(255);w.identifiedRocks=new Set([1,2]);
 const d=w.drones[0];Object.assign(d,{x:328.3,y:300,vx:-80,vy:0,angle:Math.PI,targetRock:1,armed:true,cooldown:0,state:'mine'});
 step(w,STEP);assert.deepEqual(w.rocks.map(r=>r.hp),[0,3]);assert.equal(w.extracted,4);assert.equal(w.collisions,1);
 assert.equal(w.ores.length,4);assert.equal(d.hp,d.maxHp-1);
});
test('Ram magnetic pickup respects another worker claim and cargo capacity',()=>{
 const c={...freshCompany(),talents:['ramSplitter','rapidRecovery','magneticRam'] as Company['talents']},w=createWorld(c);
 const make=(id:number,x:number,hp:number)=>({id,x,y:300,r:20,hp,max:12,shape:Array(11).fill(1),mineral:'ferrite' as const});
 w.rocks=[make(1,300,3),make(2,200,4)];w.ores=[{id:999,x:330,y:300,value:1,mineral:'ferrite',age:1}];w.oreClaims.set(999,{ownerKind:'miner',ownerId:88});
 w.explored.fill(255);w.identifiedRocks=new Set([1,2]);
 const d=w.drones[0];Object.assign(d,{x:328.3,y:300,vx:-80,vy:0,angle:Math.PI,targetRock:1,armed:true,cooldown:0,state:'mine'});
 step(w,STEP);assert.equal(w.extracted,4);assert.ok(d.cargo<=3);assert.equal(d.cargo+w.ores.length,5);
 assert.ok(w.ores.some(o=>o.id===999));assert.deepEqual(w.oreClaims.get(999),{ownerKind:'miner',ownerId:88});
});
test('new sites do not regenerate Pass O deposits or refill a depleted rock',()=>{
 const seed=7,c={...freshCompany(seed),rockHp:{0:1},poiProgress:{abandoned_cargo_relay:2},credits:91,rounds:4};
 const w=createWorld(c);assert.equal(w.rocks[0].hp,1);
 assert.equal(w.poiProgress.abandoned_cargo_relay,2);
 const next=settle(c,w);assert.equal(next.rockHp[0],1);assert.equal(next.credits,91);assert.equal(next.rounds,5);
 assert.equal(generateUniverse(seed).deposits[0].id,0);
});
