import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,canTarget,createWorld,freshCompany,handoff,prioritizePoi,settle,step,STEP,type Company} from '../src/sim.ts';
import {MINERALS,mineralIds,canExtract,cargoValue} from '../src/minerals.ts';
import {POIS} from '../src/knowledge.ts';
import {parseSave} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';
import {biomeAt} from '../src/biomes.ts';

const run=(w:ReturnType<typeof createWorld>)=>{for(let i=0;i<15000&&w.phase!=='done';i++)step(w);assert.equal(w.phase,'done');return w;};
test('five physical minerals retain distinct integer credit prices and extraction gates',()=>{
 assert.deepEqual(mineralIds,['ferrite','nickel','aurite','cryonite','voidite']);
 assert.deepEqual(mineralIds.map(id=>MINERALS[id].credits),[1,3,10,30,100]);
 assert.deepEqual(mineralIds.map(id=>canExtract('impactMiner',id,[])),[true,true,false,false,false]);
 assert.deepEqual(mineralIds.map(id=>canExtract('laserMiner',id,[])),[true,true,false,true,false]);
 assert.equal(canExtract('laserMiner','aurite',['highPowerOptics']),true);
 assert.equal(canExtract('laserMiner','voidite',['highPowerOptics']),false);
 assert.equal(canExtract('laserMiner','voidite',['highPowerOptics','resonanceMining']),true);
 assert.equal(cargoValue([{mineral:'ferrite'},{mineral:'nickel'},{mineral:'voidite'}]),104);
});
test('mineral assignments and reserves are stable through depletion and Outpost purchase',()=>{
 const c=freshCompany(),rocks=createWorld(c).rocks;
 assert.equal(rocks.length,168);
 assert.deepEqual(rocks.map(r=>r.mineral),createWorld({...c,outpost:true}).rocks.map(r=>r.mineral));
 for(const id of mineralIds)assert.ok(rocks.some(r=>r.mineral===id));
 assert.ok(rocks.filter(r=>biomeAt(r.x,r.y)==='home_belt').every(r=>r.mineral==='ferrite'));
 const depleted={...c,rockHp:{[rocks[0].id]:0,[rocks[25].id]:3}};
 const next=createWorld(depleted).rocks;assert.equal(next[0].hp,0);assert.equal(next[25].hp,3);
 assert.deepEqual(next.map(r=>r.mineral),rocks.map(r=>r.mineral));
});
test('mixed cargo hands off physically and awards value once after station arrival',()=>{
 const base=freshCompany(),c={...base,fleetCapacity:2,fleetComposition:{...base.fleetComposition,hauler:1},unlockedTypes:['impactMiner','scout','hauler'] as Company['unlockedTypes']};
 const w=createWorld(c),d=w.drones[0],h=w.haulers[0];
 d.cargoItems=[{mineral:'ferrite'},{mineral:'nickel'},{mineral:'voidite'}];h.x=d.x+10;h.y=d.y;
 assert.equal(handoff(w,d,h),3);assert.equal(d.cargo,0);assert.equal(h.cargo,3);assert.equal(w.delivered,0);
 h.state='unload';h.unloadCargo=3;for(let i=0;i<100;i++)step(w,STEP);
 assert.equal(h.cargo,0);assert.equal(w.deliveredFragments,3);assert.equal(w.delivered,104);
 assert.equal(w.deliveredByMineral.ferrite,1);assert.equal(w.deliveredByMineral.nickel,1);assert.equal(w.deliveredByMineral.voidite,1);
 const saved=settle(c,w);assert.equal(saved.credits,104);assert.equal(settle(saved,w).credits,104);
});
test('fourth Voidite does not fit Miner; expanded Hauler carries fourteen for 1400',()=>{
 const w=createWorld(freshCompany()),d=w.drones[0];d.cargoItems=Array.from({length:3},()=>({mineral:'voidite'}));
 assert.equal(d.gear.cargo-d.cargo,0);assert.equal(cargoValue(d.cargoItems),300);
 const c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,hauler:1},unlockedTechnologies:['haulerOperation','expandedHauler'],unlockedTypes:['impactMiner','scout','hauler'] as Company['unlockedTypes']};
 const v=createWorld(c),h=v.haulers[0];h.cargoItems=Array.from({length:14},()=>({mineral:'voidite'}));
 assert.equal(h.capacity,14);h.state='unload';h.unloadCargo=14;for(let i=0;i<100;i++)step(v,STEP);
 assert.equal(v.delivered,1400);assert.equal(v.deliveredFragments,14);assert.equal(v.deliveredByMineral.voidite,14);
});
test('legacy v12 snapshots every untouched rock without replenishment and keeps one-credit salvage',()=>{
 const baseline=createWorld(freshCompany()).rocks;
 const old={...freshCompany(),version:12,rockHp:{0:0,12:4},ores:[{x:320,y:500,value:1,rich:true}],credits:217,total:341,rounds:9};
 const migrated=parseSave(JSON.stringify(old));assert.equal(migrated.version,14);
 assert.equal(migrated.credits,217);assert.equal(migrated.total,341);
 assert.equal(migrated.rockHp[0],0);assert.equal(migrated.rockHp[12],4);
 assert.equal(migrated.rockHp[1],baseline[1].legacyMax);
 assert.deepEqual(migrated.ores[0].mineral,'ferrite');assert.equal(migrated.ores[0].rich,true);
 assert.deepEqual(parseSave(JSON.stringify(migrated)),migrated);
});
test('second purchased slot causes sensor contact once across deterministic seeds',()=>{
 for(const seed of [7,19,41]){
  let c={...freshCompany(),worldSeed:seed};const calm=run(createWorld(c,seed));assert.equal(calm.progress.rivalSeen,false);
  c=buy({...c,credits:28},'fleetSlot')!;
  for(let i=0;i<2&&!c.progress.rivalSeen;i++)c=settle(c,run(createWorld(c,seed)));
  assert.equal(c.progress.rivalSeen,true,`seed ${seed}`);
  assert.equal(c.uniqueTechDiscoveries.filter(id=>id==='first_rival_contact').length,1);
 }
});
test('Scout investigates a POI without Escort and resumes saved partial work',()=>{
 const base=freshCompany(),c:Company={...base,fleetCapacity:2,fleetComposition:{...base.fleetComposition,scout:1}};
 const site=POIS[0],w=createWorld(c),scout=w.scouts[0];scout.x=site.x+28;scout.y=site.y;w.discoveredPois.add(site.id);
 assert.match(canTarget(w,site.id)!,/Escort/);assert.equal(prioritizePoi(w,site.id),true);
 for(let i=0;i<95;i++)step(w,STEP);
 assert.ok((w.poiProgress[site.id]??0)>0);assert.ok((w.poiProgress[site.id]??0)<4);
 assert.equal(c.poiProgress[site.id],undefined,'Abort has no effect on company');
 const saved=parseSave(JSON.stringify(settle(c,w)));assert.ok((saved.poiProgress[site.id]??0)>0);
 const next=createWorld(saved),nextScout=next.scouts[0];nextScout.x=site.x+28;nextScout.y=site.y;
 for(let i=0;i<550&&!next.pendingTech.some(e=>e.id===site.id);i++)step(next,STEP);
 assert.equal(next.pendingTech.filter(e=>e.id===site.id).length,1);
 const done=settle(saved,next);assert.equal(done.uniqueTechDiscoveries.filter(id=>id===site.id).length,1);
 assert.equal(settle(done,next).techPointsEarned,done.techPointsEarned);
});
test('two Scouts claim separate sites without stacking or duplicate Tech',()=>{
 const base=freshCompany(),c={...base,fleetCapacity:3,fleetComposition:{...base.fleetComposition,scout:2}};
 const w=createWorld(c),[a,b]=POIS;w.discoveredPois.add(a.id);w.discoveredPois.add(b.id);
 w.scouts[0].x=a.x+20;w.scouts[0].y=a.y;w.scouts[1].x=b.x+20;w.scouts[1].y=b.y;
 for(let i=0;i<370;i++)step(w,STEP);
 assert.equal(w.pendingTech.filter(e=>e.id===a.id).length,1);
 assert.equal(w.pendingTech.filter(e=>e.id===b.id).length,1);
 assert.ok((w.poiProgress[a.id]??0)<=4&&(w.poiProgress[b.id]??0)<=4);
});
test('wreck salvage and reload retain each mixed fragment and unearned value',()=>{
 const c=freshCompany(),w=createWorld(c),d=w.drones[0];d.cargoItems=[{mineral:'ferrite'},{mineral:'nickel'},{mineral:'voidite'}];
 d.x=2440;d.y=1950;d.hp=.001;d.state='return';step(w,STEP);
 assert.equal(d.state,'dead');assert.equal(w.lost,3);assert.equal(w.lostValue,104);
 assert.equal(w.delivered,0);
 const salvage=w.ores.map(o=>o.mineral);assert.deepEqual(salvage,['ferrite','nickel','voidite']);
 const saved=parseSave(JSON.stringify(settle(c,w)));assert.deepEqual(saved.ores.map(o=>o.mineral),salvage);
 assert.equal(saved.credits,0);
});
test('empty slots show actual count and buying a slot leaves assignment unchanged',()=>{
 const c=buy({...freshCompany(),credits:28},'fleetSlot')!;
 assert.equal(c.capacityReminder,1);assert.equal(c.fleetComposition.impactMiner,1);
 const html=renderLobby(c,{tab:'hangar',error:'',storageOK:true});
 assert.match(html,/1 unused slots/);assert.match(html,/Fleet 1\/2/);
});
