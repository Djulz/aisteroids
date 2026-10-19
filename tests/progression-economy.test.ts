import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,settle,buy,cost,nextOffers,missionDuration,STEP,type Company} from '../src/sim.ts';
import {awardTech,research,categoryRequirement} from '../src/research.ts';
import {readCompany,SAVE_KEY,parseSave} from '../src/storage.ts';

function shift(c:Company){
 const w=createWorld(c);let ticks=0;
 while(w.phase!=='done'&&ticks++<12600)step(w,STEP);
 assert.equal(w.phase,'done','physical recall must finish within 210 seconds');
 return {w,company:settle(c,w)};
}

test('short initial shifts earn the first 3 Credits by physical cargo and recall across seeds',()=>{
 for(let seed=0;seed<60;seed++){
  const start=freshCompany(seed),{w,company}=shift(start);
  assert.equal(w.delivered,3,`seed ${seed}: first purchase must be reachable`);
  assert.equal(w.deliveredByMineral.ferrite,3);
  assert.equal(company.credits,3);
  assert.deepEqual(company.shopOffers,['cargoAwareness']);
  assert.equal(start.credits,0);
  assert.ok(w.time>=10&&w.time<100);
 }
});

test('basic workshop offers occur one per preparation phase with real purchases',()=>{
 let c=freshCompany(7);
 assert.deepEqual(c.shopOffers,[]);assert.equal(buy(c,'cargoAwareness'),null);
 c=shift(c).company;
 c=buy(c,'cargoAwareness')!;assert.equal(c.credits,0);
 assert.equal(buy(c,'navigationAssist'),null);
 assert.deepEqual(c.shopOffers,['cargoAwareness']);
 assert.equal(createWorld(c).drones[0].gear.cargo,3);
 c=shift(c).company;assert.deepEqual(c.shopOffers,['navigationAssist']);
 assert.ok(c.credits>=6);c=buy(c,'navigationAssist')!;
 assert.equal(createWorld(c).drones[0].gear.turn,1);
 c=shift(c).company;assert.deepEqual(c.shopOffers,['workPlanner']);
 for(let attempts=0;c.credits<12&&attempts<12;attempts++)c=shift(c).company;
 assert.ok(c.credits>=12,'basic income must fund Work Planner within the bounded trial');
 c=buy(c,'workPlanner')!;
 assert.equal(c.basicUpgrades.length,3);
 assert.equal(categoryRequirement(c,'miner'),undefined);
 assert.deepEqual(c.shopOffers,['workPlanner']);
 c=shift(c).company;assert.equal(c.shopOffers[0],'fleetSlot');assert.ok(c.shopOffers.length<=2);
 assert.equal(cost(c,'fleetSlot'),24);
 assert.equal(parseSave(JSON.stringify(c)).credits,c.credits);
});

test('chapter prices, real unlocks and at most two offers remain gated',()=>{
 let c:Company={...freshCompany(),rounds:1,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner']};
 assert.deepEqual(nextOffers(c),['fleetSlot']);
 assert.equal(buy({...c,credits:100},'turret'),null);
 assert.equal(buy({...c,credits:100},'fleetSlot'),null,'an unavailable purchase cannot skip the current offer');
 c={...c,fleetCapacity:2,credits:500,progress:{...c.progress,farSurveyed:true,rivalSeen:true},shopOffers:['fleetSlot','endurance']};
 assert.equal(cost(c,'fleetSlot'),48);assert.equal(cost(c,'endurance'),32);
 c=buy(c,'fleetSlot')!;assert.equal(c.fleetCapacity,3);
 assert.equal(buy(c,'endurance')?.enduranceLevel,1);
 assert.equal(buy(c,'fleetSlot'),null);
 assert.equal(cost({...c,fleetCapacity:3},'fleetSlot'),120);
 assert.equal(cost({...c,fleetCapacity:4},'fleetSlot'),320);
 assert.equal(cost({...c,fleetCapacity:5},'fleetSlot'),800);
 assert.equal(cost({...c,enduranceLevel:1},'endurance'),120);
 assert.equal(cost({...c,enduranceLevel:2},'endurance'),400);
 assert.equal(missionDuration({...c,enduranceLevel:3}),90);
 const mid=awardTech(c,['first_nickel_delivery','abandoned_research_station','abandoned_cargo_relay']);
 assert.ok(nextOffers(mid).length<=2);
 assert.equal(cost(mid,'deflectorShields'),180);
 assert.equal(cost(mid,'highPowerOptics'),240);
 assert.equal(cost(mid,'outpost'),600);
 assert.equal(cost(mid,'resonanceMining'),2400);
 const aurite=awardTech({...mid,fleetCapacity:4,progress:{...mid.progress,outpostSurveyed:true}},['first_aurite_delivery','experimental_probe_salvaged']);
 assert.equal(nextOffers(aurite)[0],'deflectorShields');
 assert.equal(nextOffers({...aurite,deflectorShields:true}).includes('outpost'),false);
 const prepared={...aurite,deflectorShields:true,outpost:true,progress:{...aurite.progress,protectedAuriteDelivery:true}};
 assert.equal(nextOffers(prepared)[0],'navigationStabilizers');
 const cryonite=awardTech({...prepared,environmentUpgrades:['navigationStabilizers'] as Company['environmentUpgrades'],extractionUpgrades:['highPowerOptics'],fleetCapacity:5},['first_cryonite_delivery','automated_sorting_archive']);
 assert.deepEqual(nextOffers(cryonite),['radiationShielding','resonanceMining']);
});

test('Tech is permanent; tier two requires Nickel and tier three Probe plus Aurite',()=>{
 let c:Company={...freshCompany(),basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],progress:{...freshCompany().progress,rivalSeen:true}};
 c=awardTech(c,['first_shift_delivered','first_fleet_expansion','home_belt_surveyed','abandoned_cargo_relay','first_rival_contact']);
 c=research(c,'ramSplitter')!;
 assert.match(categoryRequirement(c,'miner')!,/Nickel/);
 assert.equal(research(c,'rapidRecovery'),null);
 c=awardTech(c,['first_nickel_delivery']);c=research(c,'rapidRecovery')!;
 assert.match(categoryRequirement(c,'miner')!,/Probe/);
 assert.equal(research(c,'magneticRam'),null);
 c=awardTech(c,['experimental_probe_salvaged','first_aurite_delivery']);c=research(c,'magneticRam')!;
 assert.equal(research(c,'laserCutter'),null);
 assert.deepEqual(parseSave(JSON.stringify(c)).talents,c.talents);
});

test('valid v16 companies retain world, balances, selected Tech and infrastructure',()=>{
 const current=freshCompany(17);
 const v16={...current,version:16,credits:87,total:120,rounds:8,turret:true,outpost:true,launchSite:'far',
  rockHp:{0:2},talents:['ramSplitter'],techPointsEarned:1,techPointsAvailable:0,uniqueTechDiscoveries:['first_shift_delivered'],
  progress:{farSurveyed:true,richSampled:false,rivalSeen:false,outpostSurveyed:true}};
 for(const key of ['basicUpgrades','shopOffers','shopPurchases','deflectorShields'] as const)delete (v16 as Record<string,unknown>)[key];
 const data=new Map([['aisteroids-company-v16',JSON.stringify(v16)]]);
 const io={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
 const result=readCompany(io);
 assert.equal(result.issue,'migrated');assert.ok(result.company);
 assert.equal(result.company.credits,87);assert.equal(result.company.rounds,8);
 assert.deepEqual(result.company.rockHp,{0:2});assert.equal(result.company.outpost,true);
 assert.equal(result.company.progress.protectedAuriteDelivery,true,'existing built Outposts are grandfathered');
 assert.deepEqual(result.company.talents,['ramSplitter']);
 assert.deepEqual(result.company.basicUpgrades,['cargoAwareness','navigationAssist','workPlanner']);
 assert.ok(data.has(SAVE_KEY));assert.ok(!data.has('aisteroids-company-v16'));
 assert.deepEqual(readCompany(io).company,result.company);
});
