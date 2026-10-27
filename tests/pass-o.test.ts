import test from 'node:test';
import assert from 'node:assert/strict';
import {generateUniverse,regionAt,GENERATOR_VERSION} from '../src/universe.ts';
import {W,H,HOME} from '../src/geometry.ts';
import {biomeAt,environmentAt} from '../src/biomes.ts';
import {MINERALS,mineralForRock} from '../src/minerals.ts';
import {freshCompany,createWorld,step,settle,buy,lockTarget,dockingSpots,STEP,type Company} from '../src/sim.ts';
import {readCompany,parseSave,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {decodeMap,hasCell} from '../src/knowledge.ts';
import {changeFleet} from '../src/fleet.ts';
import {research,awardTech} from '../src/research.ts';
import {trial} from '../scripts/pass-o-frontier-trial.ts';

const store=(initial:Record<string,string>={})=>{const data=new Map(Object.entries(initial));const io:SaveStore={getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}};return {data,io};};
function finish(w:ReturnType<typeof createWorld>){for(let i=0;w.phase!=='done'&&i<210/STEP;i++)step(w);assert.equal(w.phase,'done');}

test('seeded universe is stable across missions, diverse across seeds and navigably clear',()=>{
 for(const seed of [0,7,17,42,4294967295]){
  const u=generateUniverse(seed),again=generateUniverse(seed);
  assert.equal(u,again);assert.equal(u.generatorVersion,GENERATOR_VERSION);assert.equal(u.width,W);assert.equal(u.height,H);
  assert.ok(u.deposits.length>=250);assert.equal(new Set(u.deposits.map(r=>r.id)).size,u.deposits.length);
  for(const r of u.deposits){assert.ok(r.x>r.r&&r.x<W-r.r&&r.y>r.r&&r.y<H-r.r);for(const p of [u.hq,u.outpost,...u.pois])assert.ok(Math.hypot(p.x-r.x,p.y-r.y)>=r.r+(('id' in p&&p.id==='abandoned_cargo_relay')?45:85));}
  assert.deepEqual(createWorld({...freshCompany(seed),rounds:9}).rocks.map(r=>[r.id,r.x,r.y,r.mineral]),createWorld(freshCompany(seed)).rocks.map(r=>[r.id,r.x,r.y,r.mineral]));
 }
 assert.notDeepEqual(generateUniverse(7).deposits.map(r=>r.x),generateUniverse(17).deposits.map(r=>r.x));
});

test('five coherent layers and finite mineral values share one seed',()=>{
 for(const seed of [7,17,42]){
  const w=createWorld(freshCompany(seed));assert.equal(regionAt(seed,HOME.x,HOME.y),'home_belt');
  assert.equal(biomeAt(HOME.x+950,HOME.y,seed),'scrap_fields');
  assert.equal(regionAt(seed,HOME.x+2100,HOME.y),'contested');
  assert.equal(regionAt(seed,HOME.x+3200,HOME.y),'ion_storm');
  assert.equal(regionAt(seed,5800,180),'dead_zone');
  assert.ok(w.rocks.filter(r=>r.mineral==='ferrite'&&biomeAt(r.x,r.y,seed)==='home_belt').length>60);
  assert.ok(w.rocks.filter(r=>r.mineral==='nickel'&&biomeAt(r.x,r.y,seed)==='scrap_fields').length>35);
  for(const r of w.rocks)assert.equal(r.mineral,mineralForRock(r.id,r.x,r.y,seed));
 }
 assert.deepEqual(Object.fromEntries(Object.entries(MINERALS).map(([id,spec])=>[id,spec.credits])),{ferrite:1,nickel:3,aurite:8,cryonite:20,voidite:60});
});

test('one-time epoch reset writes first, preserves preferences, and prefers a valid new save',()=>{
 const oldKey='aisteroids-company-v14';const {data,io}=store({[oldKey]:JSON.stringify({...freshCompany(7),version:14,credits:999}), 'aisteroids-motion':'reduce'});
 const first=readCompany(io,42);assert.equal(first.issue,'reset');assert.equal(first.company?.version,17);assert.equal(first.company?.worldSeed,42);assert.equal(first.company?.credits,0);
 assert.equal(data.has(oldKey),false);assert.equal(data.get('aisteroids-motion'),'reduce');assert.deepEqual(readCompany(io,99).company,first.company);
 data.set(oldKey,'stale');assert.equal(readCompany(io,99).issue,null);assert.equal(readCompany(io,99).company?.worldSeed,42);
 assert.equal(parseSave(JSON.stringify({...first.company,version:14,credits:999})).credits,0);
 const blocked=store({[oldKey]:'old'});const read=readCompany({...blocked.io,setItem:()=>{throw Error('quota');}},17);
 assert.equal(read.storageOK,false);assert.equal(blocked.data.get(oldKey),'old');assert.equal(blocked.data.has(SAVE_KEY),false);
});

test('new save round trips with persistent finite depletion, fog and launch site',()=>{
 let c=freshCompany(17),w=createWorld(c);finish(w);const next=settle(c,w);
 assert.equal(next.credits,w.delivered);assert.ok(next.credits>0);assert.equal(next.rounds,1);
 assert.ok(hasCell(decodeMap(next.explored)!,HOME.x,HOME.y));assert.ok(Object.keys(next.rockHp).length>0);
 assert.deepEqual(parseSave(JSON.stringify(next)),next);
 const later=createWorld(next),depleted=Number(Object.keys(next.rockHp)[0]);assert.equal(later.rocks[depleted].hp,next.rockHp[depleted]);
 c={...next,outpost:true,launchSite:'far'};assert.deepEqual(createWorld(c).base,generateUniverse(17).outpost);
 assert.equal(environmentAt(generateUniverse(17).outpost,true,17),'home_belt');
});

test('a real second slot charts Scrap Fields and earns one contact unlock, without starter raids',()=>{
 let c=freshCompany(7),start=createWorld(c);finish(start);assert.equal(start.attacks,0);assert.equal(start.progress.rivalSeen,false);
 c={...c,credits:24,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],shopOffers:['fleetSlot']};c=buy(c,'fleetSlot')!;c=changeFleet(c,'scout',1)!;
 c={...c,focuses:{...c.focuses,scout:{x:800,y:3420}}};
 const mission=createWorld(c);finish(mission);assert.equal(mission.progress.farSurveyed,true);assert.equal(mission.progress.rivalSeen,true);
 assert.equal(mission.drones.filter(d=>d.state==='dead').length,0);
 c=settle(c,mission);assert.equal(c.uniqueTechDiscoveries.filter(id=>id==='first_rival_contact').length,1);
 assert.ok(c.unlockedTypes.includes('escort'),'first sensed contact automatically grants the Fighter blueprint');
 const fighterWorld=createWorld({...c,fleetCapacity:3,fleetComposition:{...c.fleetComposition,escort:1}});
 assert.equal(fighterWorld.guards[0].name,'Fighter 1');
 const poi=fighterWorld.definition.pois[0];assert.equal(lockTarget(fighterWorld,poi.id).ok,fighterWorld.discoveredPois.has(poi.id));
});

test('POI disclosure and investigation remain physical and persisted',()=>{
 let c=freshCompany(42);c={...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,scout:1}};
 const w=createWorld(c),site=w.definition.pois[0],scout=w.scouts[0];
 assert.equal(w.discoveredPois.has(site.id),false);assert.equal(w.pendingTech.some(e=>e.id===site.id),false);
 scout.x=site.x+25;scout.y=site.y;scout.targetX=site.x;scout.targetY=site.y;scout.targetUntil=100;
 for(let i=0;i<60;i++)step(w);
 assert.ok(w.discoveredPois.has(site.id));assert.equal(w.pendingTech.some(e=>e.id===site.id),false);
 c=settle(c,w);assert.ok(c.discoveredPois.includes(site.id));
 assert.equal(c.uniqueTechDiscoveries.includes(site.id),false);
});

test('Hauler still unloads at the generated Outpost and only delivery credits cargo',()=>{
 let c:Company={...freshCompany(17),credits:24,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],shopOffers:['fleetSlot'],progress:{...freshCompany(17).progress,outpostSurveyed:true}};
 c=buy(c,'fleetSlot')!;c=awardTech(c,['abandoned_cargo_relay']);
 c=changeFleet(c,'hauler',1)!;c={...c,outpost:true,launchSite:'far'};
 const w=createWorld(c),h=w.haulers[0];assert.deepEqual(w.base,w.definition.outpost);
 h.cargoItems=[{mineral:'nickel'},{mineral:'ferrite'}];const berth=dockingSpots(w.base)[0];
 h.x=berth.x;h.y=berth.y;h.vx=h.vy=0;h.state='return';assert.equal(w.delivered,0);
 for(let i=0;i<120;i++)step(w);
 assert.equal(w.delivered,4);assert.equal(h.cargo,0);assert.equal(w.haulerDelivered,2);
});

test('new save rejects forged unlocks, map sizes and overspent research',()=>{
 const c=freshCompany(0);
 for(const forged of [
  {...c,unlockedTypes:[...c.unlockedTypes,'escort']},
  {...c,explored:'bad'},
  {...c,techPointsAvailable:10},
  {...c,rockHp:{0:99999}},
 ])assert.deepEqual(parseSave(JSON.stringify(forged)),freshCompany());
});

test('actual bought frontier campaign makes each protected Miner more productive',()=>{
 const result=trial(7);
 assert.ok(result.protected.nickel>=9,result.protected.nickel.toString());
 // The new standard AI disengages instead of repeatedly suiciding into patrols.
 // Protection must earn its slot through physical production, not mandatory deaths.
 assert.ok(result.protected.minerDeaths<=result.unprotected.minerDeaths);
 assert.ok(result.protected.nickel>result.unprotected.nickel/2);
 assert.ok(result.protected.delivered>result.unprotected.delivered/2);
});
