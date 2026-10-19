import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,settle,nextOffers,buy,planMinerWork,planHaulerWork,type Company,type World,STEP} from '../src/sim.ts';
import {generateUniverse,regionAt} from '../src/universe.ts';
import {pendingBlueprints,acknowledgeBlueprint,renderBlueprintCard} from '../src/discoveries.ts';
import {awardTech} from '../src/research.ts';
import {parseSave,readCompany,SAVE_KEY} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';

const basics:Company['basicUpgrades']=['cargoAwareness','navigationAssist','workPlanner'];
function run(w:World,seconds:number){for(let i=0;i<seconds/STEP&&w.phase!=='done';i++)step(w);}
function quiet(w:World){w.explored.fill(255);w.rocks.forEach(r=>w.identifiedRocks.add(r.id));w.wave=1;w.nextRaid=Infinity;}
function laser(){return createWorld({...freshCompany(7),rounds:9,basicUpgrades:basics,talents:['laserCutter']});}

test('two-slot Home Belt company can buy its next capacity and Endurance without first contact',()=>{
 const c:Company={...freshCompany(),rounds:20,basicUpgrades:basics,fleetCapacity:2,credits:350,shopOffers:[]};
 assert.equal(c.progress.rivalSeen,false);assert.deepEqual(nextOffers(c),['fleetSlot','endurance']);
 const data=new Map([[SAVE_KEY,JSON.stringify(c)]]),io={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const loaded=readCompany(io).company!;assert.equal(loaded.credits,350);
 assert.equal(buy(loaded,'fleetSlot')?.fleetCapacity,3);assert.equal(buy(loaded,'endurance')?.enduranceLevel,1);
 const gated={...c,fleetCapacity:3,shopOffers:[],credits:500};
 assert.match(renderLobby(gated,{tab:'workshop',error:'',storageOK:true}),/Send a Scout toward the Scrap Fields/);
 assert.equal(buy(gated,'highPowerOptics'),null,'real later blueprint gates remain');
});

test('focused Nickel Laser fills cargo and physically delivers instead of shooting the entire shift',()=>{
 const w=laser(),d=w.drones[0];w.rocks=w.rocks.slice(0,1);const rock=w.rocks[0];
 Object.assign(rock,{x:w.base.x+700,y:w.base.y+130,r:24,hp:30,max:30,mineral:'nickel'});
 Object.assign(d,{x:rock.x,y:rock.y+85,angle:-Math.PI/2});w.focuses.mining={x:rock.x,y:rock.y};quiet(w);
 run(w,30);
 assert.ok(w.minerPickups>=3,`picked ${w.minerPickups}, shot ${w.shots}`);
 assert.ok(w.deliveredByMineral.nickel>=3,'credits require physical return and unloading');
 assert.ok(w.shots<12,`shot ${w.shots} times without closing the work loop`);
 assert.equal(w.delivered,3*w.deliveredByMineral.nickel);
 const inventory=w.ores.length+d.cargo+w.deliveredFragments+w.effects.filter(e=>e.type==='transfer').reduce((sum,e)=>sum+(e.amount??0),0);
 assert.equal(w.extracted,inventory,'no synthetic pickup or duplicate delivery');
});

test('a full local load of eligible salvage outranks another mining pulse even at a focus pin',()=>{
 const w=laser(),d=w.drones[0];w.rocks=w.rocks.slice(0,1);const rock=w.rocks[0];
 Object.assign(rock,{x:w.base.x+700,y:w.base.y+130,r:24,hp:30,max:30,mineral:'nickel'});
 Object.assign(d,{x:rock.x,y:rock.y+85,targetRock:rock.id,approachX:rock.x,approachY:rock.y+79});
 w.focuses.mining={x:rock.x,y:rock.y};quiet(w);
 for(let i=0;i<3;i++)w.ores.push({id:w.nextId++,x:d.x+20+i*7,y:d.y+15,value:1,mineral:'nickel',age:1});
 assert.equal(planMinerWork(w,d)?.kind,'ore');run(w,1);assert.equal(w.shots,0);
});

test('unloading clears the old remote patch so equal-grade work restarts near HQ',()=>{
 const w=laser(),d=w.drones[0];w.rocks=w.rocks.slice(0,2);const [near,far]=w.rocks;
 Object.assign(near,{x:w.base.x+130,y:w.base.y-20,r:20,hp:12,max:12,mineral:'ferrite'});
 Object.assign(far,{x:w.base.x+550,y:w.base.y-20,r:20,hp:12,max:12,mineral:'ferrite'});quiet(w);
 Object.assign(d,{state:'unload',unloadTime:1.15,unloadCargo:0,targetRock:far.id,x:w.base.x,y:w.base.y});
 step(w);assert.equal(d.targetRock,-1);const job=planMinerWork(w,d);
 assert.equal(job?.kind,'rock');if(job?.kind==='rock')assert.equal(job.rock.id,near.id);
});

test('Hauler collects known salvage and returns before a distant empty Rig arrives',()=>{
 const c=awardTech({...freshCompany(),rounds:9,basicUpgrades:basics,fleetCapacity:3,enduranceLevel:2,talents:['expressDelivery'] as Company['talents'],fleetComposition:{...freshCompany().fleetComposition,impactMiner:0,miningRig:1,hauler:1}},['abandoned_cargo_relay','derelict_excavation_platform']);
 const w=createWorld(c),h=w.haulers[0],rig=w.rigs[0];w.rocks=w.rocks.slice(0,1);
 Object.assign(w.rocks[0],{x:w.base.x+1000,y:w.base.y+100,r:22,hp:30,max:30,mineral:'ferrite'});quiet(w);
 for(let i=0;i<3;i++)w.ores.push({id:w.nextId++,x:w.base.x+290+i*5,y:w.base.y+55,value:1,mineral:'ferrite',age:1});
 assert.equal(planHaulerWork(w,h)?.kind,'ore');run(w,8);
 assert.equal(rig.state,'travel');assert.equal(w.haulerPickups,3);assert.equal(w.haulerDelivered,3);assert.equal(w.delivered,3);
 assert.equal(h.cargo,0);assert.equal(w.ores.length,0);
});

test('Hauler waits without escorting an empty Rig, then serves real stationary cargo',()=>{
 const c=awardTech({...freshCompany(),rounds:9,basicUpgrades:basics,fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,impactMiner:0,miningRig:1,hauler:1}},['abandoned_cargo_relay','derelict_excavation_platform']);
 const w=createWorld(c),h=w.haulers[0],rig=w.rigs[0];quiet(w);
 Object.assign(rig,{state:'travel',x:w.base.x+800,y:w.base.y+30});assert.equal(planHaulerWork(w,h),undefined);
 Object.assign(rig,{state:'drill',x:w.base.x+200});rig.cargoItems.push({mineral:'nickel'});
 const job=planHaulerWork(w,h);assert.equal(job?.kind,'rig');
});

test('Cargo Relay is an actual safe exploration destination, not an HQ attachment',()=>{
 for(let seed=0;seed<40;seed++){
  const u=generateUniverse(seed),relay=u.pois.find(p=>p.id==='abandoned_cargo_relay')!;
  const distance=Math.hypot(relay.x-u.hq.x,relay.y-u.hq.y);
  assert.ok(distance>=339&&distance<=461,`${seed}: ${distance}`);
  assert.equal(regionAt(seed,relay.x,relay.y),'home_belt');
  assert.ok(u.deposits.every(r=>Math.hypot(relay.x-r.x,relay.y-r.y)>r.r+45));
 }
});

test('blueprint completion has a truthful explicit acknowledgement without duplicate rewards',()=>{
 const c=freshCompany(),live=pendingBlueprints(c,['abandoned_cargo_relay']);
 assert.equal(pendingBlueprints(c).length,0);assert.equal(live[0].name,'Hauler');
 assert.match(renderBlueprintCard(live[0]),/NEW DISCOVERY/);assert.match(renderBlueprintCard(live[0]),/Hauler unlocked/);
 assert.match(renderBlueprintCard(live[0]),/canvas/);assert.match(renderBlueprintCard(live[0]),/GOT IT/);
 assert.equal(acknowledgeBlueprint(c,'hauler'),c,'a popup cannot unlock or spend anything');
 const unlocked=awardTech(c,['abandoned_cargo_relay']),seen=acknowledgeBlueprint(unlocked,'hauler');
 assert.equal(pendingBlueprints(seen).length,0);assert.equal(acknowledgeBlueprint(seen,'hauler'),seen);
 assert.equal(seen.techPointsAvailable,unlocked.techPointsAvailable);assert.equal(seen.credits,unlocked.credits);
 assert.deepEqual(parseSave(JSON.stringify(seen)).seenUnlocks,['hauler']);
 assert.equal(pendingBlueprints(parseSave(JSON.stringify(seen))).length,0);
 const aborted=createWorld(c);aborted.pendingTech.push({id:'abandoned_cargo_relay',time:1});
 assert.equal(c.uniqueTechDiscoveries.length,0,'live preview does not settle an abandoned shift');
 const settled=settle(c,aborted);assert.equal(pendingBlueprints(settled)[0].id,'hauler');
});
