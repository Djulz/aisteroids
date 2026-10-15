import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,cost,freshCompany,createWorld,type Company} from '../src/sim.ts';
import {changeFleet,fleetError,usedSlots} from '../src/fleet.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';
import {awardTech,research} from '../src/research.ts';
const view:LobbyView={tab:'hangar',doctrineOpen:false,planOpen:false,error:'',storageOK:true};
const rich=(c:Company)=>({...c,credits:500,progress:{...c.progress,rivalSeen:true,outpostSurveyed:true}});

test('one slot, one Impact Miner; slots cost minerals but do not spawn or purchase individuals',()=>{
 const c=freshCompany();assert.equal(c.version,12);assert.equal(c.fleetCapacity,1);assert.equal(c.fleetComposition.impactMiner,1);
 assert.equal(changeFleet(c,'escort',1),null);assert.equal(changeFleet(c,'impactMiner',1),null);assert.equal(changeFleet(c,'impactMiner',-1),null);
 const paid=buy({...c,credits:cost(c,'fleetSlot')},'fleetSlot')!;assert.equal(paid.fleetCapacity,2);assert.equal(paid.fleetComposition.impactMiner,1);assert.equal(paid.credits,0);
 const expanded=changeFleet(paid,'impactMiner',1)!;assert.equal(usedSlots(expanded.fleetComposition),2);assert.equal(createWorld(expanded).drones.length,2);
 assert.equal(changeFleet(expanded,'impactMiner',1),null);
});
test('rival encounter plus Escort Program unlocks role without unit purchase; capacity stays valid',()=>{
 const c=research(awardTech(rich({...freshCompany(),fleetCapacity:3}),['first_rival_contact']),'escortProgram')!;const mix=changeFleet(c,'escort',1)!;
 assert.equal(mix.fleetComposition.escort,1);assert.equal(mix.credits,500);assert.equal(createWorld(mix).guards.length,1);
 assert.equal(changeFleet(mix,'impactMiner',-1),null);assert.equal(changeFleet(mix,'escort',1)?.fleetComposition.escort,2);
 assert.equal(changeFleet({...c,progress:{...c.progress,rivalSeen:false}},'escort',1),null);
});
test('Laser fixture is real but ordinary players cannot equip locked technology',()=>{
 const base={...freshCompany(),fleetCapacity:2};assert.equal(changeFleet(base,'laserMiner',1),null);
 const fixture:Company={...base,unlockedTypes:['impactMiner','laserMiner'],fleetComposition:{...base.fleetComposition,impactMiner:0,laserMiner:1}};
 assert.equal(fleetError(fixture),undefined);assert.equal(createWorld(fixture).drones[0].kind,'laserMiner');
 assert.match(fleetError({...base,fleetComposition:fixture.fleetComposition})!,/locked/);
});
test('Workshop shows relevant purchases; Hangar hides locked types and keeps two tabs',()=>{
 const c=freshCompany();const h=renderLobby(c,view),w=renderLobby(c,{...view,tab:'workshop'});
 assert.match(h,/1 \/ 1 SLOTS/);assert.match(h,/Impact Miner/);assert.doesNotMatch(h,/Laser Miner|Mobile Mining Rig|LOCKED/);
 assert.doesNotMatch(h,/TINKER|MODULE A|DISPLAY NAME|data-site=|data-directive=/);
 assert.match(w,/Fleet Slot/);assert.match(w,/Shift Endurance/);assert.doesNotMatch(w,/HQ Turret|Outer Outpost/);
 assert.doesNotMatch(w,/Reinforced Hull|Mining Laser|Expanded Cargo|Ion Drive|Bodyguard Drone|data-buy="scanner"/);
 assert.equal((h.match(/id="tab-/g)??[]).length,2);
 const entitled=research(awardTech(rich({...c,fleetCapacity:3}),['first_rival_contact']),'escortProgram')!;
 const later=renderLobby(changeFleet(entitled,'escort',1)!,view);
 assert.match(later,/2 \/ 3 SLOTS/);assert.match(later,/data-type="escort" data-delta="1"/);
 assert.match(later,/Escort/);
 const unlocked=renderLobby(entitled,{...view,tab:'workshop'});assert.match(unlocked,/HQ Turret|Outer Outpost/);
});
test('turret and outpost keep their physical unlock gates',()=>{
 const c={...freshCompany(),credits:500};assert.equal(buy(c,'turret'),null);assert.equal(buy(c,'outpost'),null);
 const revealed=rich(c),turret=buy(revealed,'turret')!,outpost=buy(turret,'outpost')!;
 assert.equal(turret.turret,true);assert.equal(outpost.outpost,true);assert.equal(outpost.credits,500-cost(c,'turret')-cost(c,'outpost'));
});
