import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,handoff,step,settle,updateKnowledge,lockTarget,STEP,ORE_PICKUP_DELAY,dockingSpots,type Company,type World} from '../src/sim.ts';
import {awardTech,research,researchReason,discoveryIds,TECH} from '../src/research.ts';
import {changeFleet,fleetError,usedSlots} from '../src/fleet.ts';
import {parseSave,loadCompany,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';
import {LOGISTICS_SITES} from '../src/logistics-sites.ts';
import {clearSegment} from '../src/navigation.ts';

function run(w:World){for(let i=0;i<12000&&w.phase!=='done';i++)step(w,STEP);assert.equal(w.phase,'done');return w;}
function logistics(upgraded=false):Company{
 let c={...freshCompany(),fleetCapacity:3};c=awardTech(c,['far_belt_charted','abandoned_cargo_relay','derelict_freight_shuttle']);
 c=research(c,'haulerOperation')!;if(upgraded)c=research(c,'expandedHauler')!;
 return changeFleet(c,'hauler',1)!;
}
function store(initial:Record<string,string>={}){const map=new Map(Object.entries(initial));const api:SaveStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}};return {map,api};}

test('research unlocks one-slot Haulers, and capacity upgrade touches no Miner',()=>{
 const c=freshCompany();assert.equal(changeFleet({...c,fleetCapacity:2},'hauler',1),null);
 assert.equal(researchReason(c,'haulerOperation'),'Requires 1 Tech Point.');
 assert.match(researchReason(c,'expandedHauler')!,/Requires Hauler Operation/);
 const ready=logistics();assert.equal(ready.techPointsAvailable,2);assert.equal(ready.fleetCapacity,3);
 assert.equal(usedSlots(ready.fleetComposition),2);assert.equal(createWorld(ready).haulers[0].capacity,10);
 assert.equal(changeFleet(ready,'impactMiner',-1),null);
 assert.equal(fleetError({...ready,fleetCapacity:1}), 'Fleet exceeds purchased drone slots.');
 const expanded=research(ready,'expandedHauler')!;
 assert.equal(expanded.techPointsAvailable,0);assert.equal(createWorld(expanded).haulers[0].capacity,14);
 assert.equal(createWorld(expanded).drones[0].gear.cargo,3);
 assert.equal(research(expanded,'expandedHauler'),null);
 assert.equal(changeFleet(expanded,'hauler',1)?.fleetComposition.hauler,2);
 const html=renderLobby(expanded,{tab:'hangar',error:'',storageOK:true});
 assert.match(html,/data-type="hauler" data-delta="1"/);assert.match(html,/Hauler/);assert.equal((html.match(/id="tab-/g)??[]).length,2);
});

test('physical rendezvous transfers unit cargo and rich subset without credit',()=>{
 const w=createWorld(logistics()),d=w.drones[0],h=w.haulers[0];d.cargo=3;d.richCargo=2;
 h.x=d.x+12;h.y=d.y;step(w);
 assert.equal(d.state,'mine');assert.equal(d.cargo,0);assert.equal(h.cargo,3);assert.equal(h.richCargo,2);
 assert.equal(w.transferred,3);assert.equal(w.delivered,0);assert.equal(w.progress.richSampled,false);
 assert.equal(handoff(w,d,h),0);assert.equal(w.transferred,3);
 h.cargo=9;h.richCargo=0;d.cargo=3;d.richCargo=2;
 assert.equal(handoff(w,d,h),1);assert.equal(h.cargo,10);assert.equal(h.richCargo,1);
 assert.equal(d.cargo,2);assert.equal(d.richCargo,1);
 assert.equal(handoff(w,d,h),0);assert.equal(w.delivered,0);
});

test('unassisted full Miner returns; a destroyed Hauler drops every rich fragment',()=>{
 const w=createWorld(logistics()),d=w.drones[0],h=w.haulers[0];d.cargo=3;h.x=740;h.y=850;step(w);assert.equal(d.state,'return');
 h.x=d.x+35;h.y=d.y;h.cargo=4;h.richCargo=2;h.hp=1;d.x=100;d.y=100;
 w.enemies.push({id:99,x:h.x+19,y:h.y-5,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});step(w);
 assert.equal(h.state,'dead');assert.equal(h.cargo,0);assert.equal(w.ores.length,4);assert.equal(w.ores.filter(o=>o.rich).length,2);
 assert.ok(w.ores.every(o=>o.value===1));
 const saved=settle(w.company,run(w));assert.equal(saved.ores.filter(o=>o.rich).length,2);
});

test('a Miner abandons a failed rendezvous when the assigned Hauler dies or times out',()=>{
 const w=createWorld(logistics()),d=w.drones[0],h=w.haulers[0];
 d.cargo=3;h.x=d.x+125;h.y=d.y;step(w);
 assert.equal(d.state,'handoff');assert.equal(h.assignedMiner,d.id);
 h.hp=0;h.state='dead';step(w);assert.equal(d.state,'return');assert.equal(d.cargo,3);
 const retry=createWorld(logistics()),miner=retry.drones[0],carrier=retry.haulers[0];
 miner.cargo=3;carrier.x=miner.x+125;carrier.y=miner.y;step(retry);
 miner.handoffUntil=retry.time;step(retry);assert.equal(miner.state,'return');assert.equal(carrier.assignedMiner,-1);
});

test('Hauler gathers existing salvage after pickup delay and can deliver rich cargo after last Miner loss',()=>{
 const c=logistics(),w=createWorld({...c,ores:[{x:220,y:590,value:1,rich:true}]});
 const h=w.haulers[0],ore=w.ores[0];w.drones[0].x=710;w.drones[0].y=800;h.x=ore.x;h.y=ore.y;h.vx=h.vy=0;step(w);
 assert.equal(h.cargo,1);assert.equal(h.richCargo,1);assert.equal(w.haulerPickups,1);assert.equal(w.ores.length,0);
 w.drones[0].state='dead';h.cargo=3;h.richCargo=1;run(w);
 assert.equal(w.haulerDelivered,3);assert.equal(w.delivered,3);
 assert.equal(w.progress.richSampled,true);assert.equal(w.pendingTech.filter(e=>e.id==='first_rich_sample').length,1);
 assert.equal(settle(c,w).credits,3);assert.equal(settle(settle(c,w),w).credits,3);
});

test('fresh fragments stay visible before collection; two Haulers cannot take the same one',()=>{
 let c=logistics();c=changeFleet(c,'hauler',1)!;
 const w=createWorld(c),[a,b]=w.haulers;w.drones[0].x=710;w.drones[0].y=800;
 const ore={id:900,x:a.x,y:a.y,value:1 as const,rich:false,age:0};w.ores.push(ore);
 step(w);assert.equal(a.cargo+b.cargo,0);assert.equal(w.ores.length,1);
 ore.age=ORE_PICKUP_DELAY;a.x=b.x=ore.x;a.y=b.y=ore.y;a.vx=b.vx=a.vy=b.vy=0;
 step(w);assert.equal(a.cargo+b.cargo,1);assert.equal(w.ores.length,0);assert.equal(w.haulerPickups,1);
});

test('direct rich handoff followed by Hauler unloading grants the sample only at station',()=>{
 const c=logistics(),w=createWorld(c),d=w.drones[0],h=w.haulers[0];
 d.cargo=3;d.richCargo=1;h.x=d.x+12;h.y=d.y;
 assert.equal(handoff(w,d,h),3);assert.equal(w.progress.richSampled,false);assert.equal(w.delivered,0);
 d.state='dead';run(w);
 assert.equal(w.haulerDelivered,3);assert.equal(w.progress.richSampled,true);
 assert.equal(w.pendingTech.filter(e=>e.id==='first_rich_sample').length,1);
 assert.equal(settle(c,w).credits,3);
});

test('enemies can hit Haulers, while Escort protects the cargo fleet',()=>{
 let c=logistics();c={...c,progress:{...c.progress,rivalSeen:true}};
 c=research(awardTech(c,['first_rival_contact']),'escortProgram')!;c=changeFleet(c,'escort',1)!;
 const w=createWorld(c),d=w.drones[0],h=w.haulers[0],g=w.guards[0];
 d.x=60;d.y=120;h.x=200;h.y=490;g.x=205;g.y=500;g.cooldown=0;
 w.enemies.push({id:94,x:215,y:470,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});
 step(w);assert.ok(w.effects.some(e=>e.type==='guardShot'),'Escort fired at a threat near Hauler');
 g.hp=0;w.enemies[0].cooldown=0;step(w);
 assert.ok(w.effects.some(e=>e.type==='enemyShot'),'enemy engaged the Hauler');
 assert.ok(h.hp<h.maxHp);
});

test('four real types deploy together; a full Hauler unloads at the selected Outpost',()=>{
 let c=logistics();c=research(awardTech(c,['experimental_probe_salvaged']),'laserMining')!;
 c={...c,fleetCapacity:4,outpost:true,launchSite:'far',progress:{...c.progress,rivalSeen:true}};
 c=research(awardTech(c,['first_rival_contact']),'escortProgram')!;
 c=changeFleet(c,'laserMiner',1)!;c=changeFleet(c,'escort',1)!;
 const w=createWorld(c),h=w.haulers[0];
 assert.deepEqual(w.drones.map(d=>d.kind),['impactMiner','laserMiner']);assert.equal(w.guards.length,1);assert.equal(w.haulers.length,1);
 assert.equal(new Set([...w.drones,...w.haulers].map(d=>d.id)).size,3);assert.deepEqual(w.base,{x:1900,y:1620});
 h.cargo=10;h.richCargo=1;const berth=dockingSpots(w.base)[0];h.x=berth.x;h.y=berth.y;h.vx=h.vy=0;
 step(w);assert.equal(h.state,'unload');
 for(let i=0;i<75;i++)step(w);
 assert.equal(h.cargo,0);assert.equal(w.haulerDelivered,10);assert.equal(h.state,'work');assert.equal(w.progress.richSampled,true);
});

test('v8 max-spent companies migrate intact, new nodes and fleet counts persist; v1-v6 stay rejected',()=>{
 let c={...freshCompany(),progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:true},fleetCapacity:4,credits:37,total:143,rounds:12,outpost:true,launchSite:'far' as const,rockHp:{0:9,12:35},ores:[{x:500,y:620,value:1 as const,rich:true}],doctrine:'convoy' as const,directive:'surveyFar' as const};
 c=awardTech(c,['far_belt_charted','first_rich_sample','first_rival_contact','outpost_site_surveyed','abandoned_research_station','experimental_probe_salvaged']);
 for(const id of ['laserMining','impactRecovery','rapidCooling','escortProgram','threatTracking'] as const)c=research(c,id)!;
 c=changeFleet(c,'laserMiner',1)!;c=changeFleet(c,'escort',1)!;
 assert.equal(c.techPointsAvailable,0);
 const legacy={...c,version:8,fleetComposition:{impactMiner:c.fleetComposition.impactMiner,laserMiner:c.fleetComposition.laserMiner,escort:c.fleetComposition.escort,hauler:0,miningRig:0}};const {api,map}=store({'aisteroids-company-v8':JSON.stringify(legacy),'unrelated':'keep'});
 let migrated=loadCompany(api);assert.equal(migrated.version,11);assert.equal(migrated.techPointsAvailable,0);
 assert.equal(migrated.credits,37);assert.equal(migrated.rounds,12);assert.equal(migrated.fleetCapacity,4);
 assert.equal(migrated.fleetComposition.escort,1);assert.equal(migrated.fleetComposition.laserMiner,1);
 assert.equal(migrated.rockHp[0],9);assert.equal(migrated.ores[0].rich,true);
 assert.equal(migrated.outpost,true);assert.equal(migrated.launchSite,'far');assert.equal(migrated.doctrine,'convoy');
 assert.deepEqual(migrated.unlockedTechnologies,c.unlockedTechnologies);assert.equal(map.get('unrelated'),'keep');assert.equal(map.has('aisteroids-company-v8'),false);
 migrated=awardTech(migrated,['abandoned_cargo_relay','derelict_freight_shuttle','automated_sorting_archive']);
 migrated=research(migrated,'haulerOperation')!;migrated=research(migrated,'expandedHauler')!;
 migrated=changeFleet(migrated,'hauler',1)!;api.setItem(SAVE_KEY,JSON.stringify(migrated));
 assert.deepEqual(loadCompany(api),migrated);assert.equal(createWorld(migrated).haulers[0].capacity,14);
 assert.deepEqual(parseSave(JSON.stringify({...migrated,techPointsAvailable:9})),freshCompany());
 assert.deepEqual(parseSave(JSON.stringify({...migrated,unlockedTechnologies:['expandedHauler']})),freshCompany());
 for(let v=1;v<=6;v++)assert.deepEqual(parseSave(JSON.stringify({...legacy,version:v})),freshCompany());
});

test('three freight signals require Escort investigation and remain one-time and abortable',()=>{
 for(let seed=1;seed<=20;seed++){const w=createWorld(freshCompany(),seed);for(const p of LOGISTICS_SITES)assert.ok(clearSegment(p,p,w.rocks,-1,15),`${p.name} blocked on seed ${seed}`);}
 let c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,escort:1},progress:{...freshCompany().progress,rivalSeen:true},unlockedTypes:['impactMiner','escort']};
 for(const site of LOGISTICS_SITES){
  const w=createWorld(c);w.guards[0].x=site.x+25;w.guards[0].y=site.y;updateKnowledge(w);
  assert.ok(w.discoveredPois.has(site.id));assert.equal(w.pendingTech.some(e=>e.id===site.id),false);
  assert.equal(lockTarget(w,site.id).ok,true);
  for(let i=0;i<300&&w.activeTarget;i++)step(w,STEP);
  assert.ok(w.pendingTech.some(e=>e.id===site.id),`${site.name} not investigated physically`);
  assert.equal(c.uniqueTechDiscoveries.includes(site.id),false,'abort leaves source unclaimed');
  c=settle(c,w);assert.equal(createWorld(c).activeTarget,null);
 }
 assert.equal(c.uniqueTechDiscoveries.filter(id=>LOGISTICS_SITES.some(s=>s.id===id)).length,3);
 assert.equal(discoveryIds.length,9);assert.equal(Object.values(TECH).reduce((n,v)=>n+v.cost,0),9);
 const later=createWorld(c);for(const site of LOGISTICS_SITES)assert.equal(lockTarget(later,site.id).ok,false);
});

test('ten seeded mixed missions recall, dock, conserve every fragment and remain deterministic',()=>{
 const base=logistics();for(let seed=1;seed<=10;seed++){
  const c={...base,worldSeed:seed,ores:[{x:185,y:460,value:1 as const,rich:false},{x:220,y:472,value:1 as const,rich:true}]};
  const w=run(createWorld(c,seed)),again=run(createWorld(c,seed));
  const inFlight=w.effects.filter(e=>e.type==='transfer').reduce((n,e)=>n+(e.amount??0),0);
  assert.equal(c.ores.length+w.extracted,w.delivered+w.ores.length+w.drones.reduce((n,d)=>n+d.cargo,0)+w.haulers.reduce((n,h)=>n+h.cargo,0)+inFlight,`seed ${seed}`);
  assert.ok([...w.drones,...w.haulers].every(d=>d.state==='docked'||d.state==='dead'));
  assert.deepEqual([w.delivered,w.extracted,w.transferred,w.haulerPickups,w.haulerDelivered,w.time],[again.delivered,again.extracted,again.transferred,again.haulerPickups,again.haulerDelivered,again.time]);
  assert.equal(new Set([...w.drones,...w.haulers].filter(d=>d.berth>=0).map(d=>d.berth)).size,[...w.drones,...w.haulers].filter(d=>d.berth>=0).length);
 }
 assert.equal(dockingSpots(createWorld(base).base).length,12);
});
