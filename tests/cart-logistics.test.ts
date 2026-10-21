import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,handoff,STEP,type Company} from '../src/sim.ts';
import {awardTech} from '../src/research.ts';
import {freightRoom,loadFreight,cartReady} from '../src/freight.ts';
import {inventory} from '../scripts/balance-lab/metrics.ts';
function company():Company{return awardTech({...freshCompany(),rounds:3,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],fleetCapacity:3,enduranceLevel:2,talents:['bulkCarrier','geminiCart'],fleetComposition:{impactMiner:1,laserMiner:0,hauler:1,miningRig:0,escort:0,scout:0}},['abandoned_cargo_relay','first_nickel_delivery']);}

test('attached cart holds real overflow cargo and accepts passing Miner handoffs',()=>{
 const w=createWorld(company()),h=w.haulers[0],d=w.drones[0],cart=w.carts[0];
 const items=Array.from({length:20},()=>({mineral:'nickel' as const}));
 assert.equal(loadFreight(w,h,items),20);assert.equal(items.length,0);assert.equal(h.cargo,15);assert.equal(cart.cargo,5);assert.equal(freightRoom(w,h),7);
 d.cargoItems.push({mineral:'aurite'},{mineral:'ferrite'});d.x=h.x;d.y=h.y;
 assert.equal(handoff(w,d,h),2);assert.equal(d.cargo,0);assert.equal(cart.cargo,7);assert.equal(cart.cargoItems[5].mineral,'aurite');
 cart.attached=false;assert.equal(freightRoom(w,h),0,'detached capacity cannot be used remotely');
});

test('a partially loaded working field cart waits for useful collection or recall',()=>{
 const w=createWorld(company()),cart=w.carts[0];cart.attached=false;cart.cargoItems.push({mineral:'nickel'});
 Object.assign(w.drones[0],{x:cart.x,y:cart.y,state:'mine'});assert.equal(cartReady(w,cart),false);
 w.time=w.missionDuration-4;assert.equal(cartReady(w,cart),true,'retrieve the partial load before the shift ends');
 w.phase='recall';assert.equal(cartReady(w,cart),true);
});

test('Rig cart is physically deployed, loaded, retrieved and delivered without duplicating ore',()=>{
 const c=awardTech({...company(),fleetComposition:{impactMiner:0,laserMiner:0,hauler:1,miningRig:1,escort:0,scout:0}},['derelict_excavation_platform']);
 const w=createWorld(c),rig=w.rigs[0],h=w.haulers[0];w.enemies=[];w.rocks=w.rocks.slice(0,1);w.explored.fill(255);w.identifiedRocks.add(w.rocks[0].id);
 Object.assign(rig,{x:w.base.x+300,y:w.base.y,state:'drill',targetRock:w.rocks[0].id});
 Object.assign(w.rocks[0],{x:rig.x+80,y:rig.y,r:20,hp:40,max:40,mineral:'nickel'});
 rig.cargoItems.push(...Array.from({length:6},()=>({mineral:'nickel' as const})));Object.assign(h,{x:rig.x+24,y:rig.y+15});
 const initial=inventory(w);let count=0;while(w.phase!=='done'&&count++<16200)step(w,STEP);
 assert.equal(w.phase,'done');assert.ok(w.cartDeployments>0,'must drop within physical loading range');assert.ok(w.cartLoaded>=8,'cart must actually be used');
 assert.ok(w.cartCollections>0);assert.ok(w.cartDelivered>0,'loaded cart must reach the station');assert.equal(inventory(w),initial);
 assert.ok(w.haulerDelivered>=w.cartDelivered);assert.equal(w.delivered,w.deliveredByMineral.nickel*3);
});
