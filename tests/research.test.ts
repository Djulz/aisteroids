import {LOGISTICS_SITES} from '../src/logistics-sites.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,settle,STEP,RESEARCH_STATION,EXPERIMENTAL_PROBE,FAR,type Company,type World} from '../src/sim.ts';
import {awardTech,discoveryIds,research,researchReason,TECH_DISCOVERIES} from '../src/research.ts';
import {changeFleet} from '../src/fleet.ts';
import {loadCompany,parseSave,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';
import {clearSegment} from '../src/navigation.ts';

function run(w:World){for(let i=0;i<12000&&w.phase!=='done';i++)step(w);assert.equal(w.phase,'done');return w;}
const store=(initial:Record<string,string>={})=>{const map=new Map(Object.entries(initial));const storage:SaveStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}};return {map,storage};};
const old=(changes:Partial<Company>={})=>JSON.stringify({...freshCompany(),...changes,version:7,unlockedTypes:['impactMiner'],techPointsAvailable:0,techPointsEarned:0,uniqueTechDiscoveries:[],unlockedTechnologies:[]});

test('v7 progress and Escort fleet migrate once; old milestones grant Tech without charging a grandfathered entitlement',()=>{
 const v7=old({credits:31,total:48,rounds:8,fleetCapacity:3,fleetComposition:{impactMiner:2,laserMiner:0,escort:1,hauler:0,miningRig:0},turret:true,outpost:true,launchSite:'far',directive:'surveyOutpost',doctrine:'convoy',rockHp:{0:17,13:51},ores:[{x:350,y:400,value:1,rich:true}],progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:false}});
 const {map,storage}=store({'aisteroids-company-v7':v7,'unrelated':'keep'});
 const c=loadCompany(storage);assert.equal(c.version,9);assert.equal(c.credits,31);assert.equal(c.total,48);assert.equal(c.rounds,8);assert.equal(c.fleetCapacity,3);assert.equal(c.fleetComposition.escort,1);assert.equal(c.rockHp[0],17);assert.deepEqual(c.ores,[{x:350,y:400,value:1,rich:true}]);
 assert.equal(c.outpost,true);assert.equal(c.launchSite,'far');assert.equal(c.directive,'surveyOutpost');assert.equal(c.doctrine,'convoy');
 assert.equal(c.grandfatheredEscort,true);assert.deepEqual(c.unlockedTechnologies,['escortProgram']);assert.equal(c.techPointsEarned,3);assert.equal(c.techPointsAvailable,3);
 assert.equal(map.has('aisteroids-company-v7'),false);assert.equal(map.get('unrelated'),'keep');assert.deepEqual(loadCompany(storage),c);assert.equal(createWorld(c).guards.length,1);
});
test('v8 ledger validates spent balance, duplicate IDs, type unlocks and reload idempotence',()=>{
 const start=loadCompany(store().storage);const earned=awardTech(start,['far_belt_charted','abandoned_research_station','far_belt_charted']);
 assert.equal(earned.techPointsEarned,2);const laser=research(earned,'laserMining')!;assert.equal(laser.techPointsAvailable,1);assert.equal(research(laser,'laserMining'),null);
 const {storage}=store({[SAVE_KEY]:JSON.stringify(laser)});assert.deepEqual(loadCompany(storage),laser);
 assert.deepEqual(parseSave(JSON.stringify({...laser,techPointsAvailable:8})),freshCompany());
 assert.deepEqual(parseSave(JSON.stringify({...laser,uniqueTechDiscoveries:['far_belt_charted','far_belt_charted']})),freshCompany());
 assert.deepEqual(parseSave(JSON.stringify({...laser,unlockedTechnologies:['rapidCooling']})),freshCompany());
 assert.deepEqual(parseSave(JSON.stringify({...laser,fleetComposition:{...laser.fleetComposition,hauler:1}})),freshCompany());
});
test('Research prerequisites, costs and Hangar deployment share one entitlement',()=>{
 let c=freshCompany();assert.match(researchReason(c,'escortProgram')!,/Encounter/);assert.equal(research(c,'laserMining'),null);
 c=awardTech(c,['far_belt_charted']);c=research(c,'laserMining')!;assert.ok(c.unlockedTypes.includes('laserMiner'));
 assert.equal(research(c,'rapidCooling'),null);assert.equal(changeFleet(c,'laserMiner',1),null);
 c={...c,fleetCapacity:2};c=changeFleet(c,'laserMiner',1)!;assert.equal(createWorld(c).drones[1].kind,'laserMiner');assert.ok(c.fleetComposition.impactMiner===1);
 const html=renderLobby(c,{tab:'hangar',doctrineOpen:false,planOpen:false,researchOpen:true,error:'',storageOK:true});
 assert.match(html,/Laser Mining/);assert.match(html,/RESEARCHED/);assert.equal((html.match(/id="tab-/g)??[]).length,2);assert.match(html,/data-research="haulerOperation"/);
 assert.deepEqual(parseSave(JSON.stringify(c)),c);
});
test('nine POIs and milestones emit one pending event each, then settle exactly once',()=>{
 const c=freshCompany(),w=createWorld(c),d=w.drones[0];
 for(const p of [RESEARCH_STATION,EXPERIMENTAL_PROBE,FAR,...LOGISTICS_SITES]){d.x=p.x;d.y=p.y;d.vx=0;d.vy=0;step(w,STEP);}
 assert.ok(w.pendingTech.some(e=>e.id==='abandoned_research_station'));assert.ok(w.pendingTech.some(e=>e.id==='experimental_probe_salvaged'));
 assert.ok(w.pendingTech.some(e=>e.id==='far_belt_charted'));assert.ok(w.pendingTech.some(e=>e.id==='outpost_site_surveyed'));
 w.effects.push({type:'transfer',x:200,y:480,life:.001,max:.001,amount:1,richAmount:1});w.time=11;step(w,STEP);
 assert.ok(w.pendingTech.some(e=>e.id==='first_rich_sample'));assert.ok(w.pendingTech.some(e=>e.id==='first_rival_contact'));
 for(let i=0;i<60;i++)step(w,STEP);
 assert.deepEqual(new Set(w.pendingTech.map(e=>e.id)),new Set(discoveryIds));assert.equal(c.techPointsAvailable,0);
 const saved=settle(c,w);assert.equal(saved.techPointsEarned,9);assert.equal(saved.techPointsAvailable,9);assert.equal(settle(saved,w).techPointsEarned,9);
 const next=createWorld(saved);assert.equal(next.pendingTech.length,0);
 assert.equal(Object.keys(TECH_DISCOVERIES).length,9);
});
test('abort leaves pending Tech and POI unclaimed; completed loss settles a find',()=>{
 const c=freshCompany(),w=createWorld(c);w.drones[0].x=RESEARCH_STATION.x;w.drones[0].y=RESEARCH_STATION.y;step(w);
 assert.equal(w.pendingTech[0]?.id,'abandoned_research_station');assert.equal(c.techPointsAvailable,0);
 const retry=createWorld(c);retry.drones[0].x=RESEARCH_STATION.x;retry.drones[0].y=RESEARCH_STATION.y;step(retry);
 retry.drones[0].hp=1;retry.enemies.push({id:90,x:retry.drones[0].x+20,y:retry.drones[0].y-15,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});
 run(retry);assert.equal(retry.drones[0].state,'dead');assert.equal(settle(c,retry).techPointsAvailable,1);
});
test('research improves only relevant type capabilities and keeps Miner cargo three',()=>{
 const base=freshCompany(),a=research(awardTech(base,['abandoned_research_station']),'impactRecovery')!;
 const fastLaser=research(awardTech(research(awardTech(base,['far_belt_charted']),'laserMining')!,['first_rich_sample','first_rival_contact']),'rapidCooling')!;
 assert.ok(createWorld(a).drones[0].gear.ramCooldown<createWorld(base).drones[0].gear.ramCooldown);
 assert.equal(createWorld(a).drones[0].gear.laserCooldown,createWorld(base).drones[0].gear.laserCooldown);
 const laser=(c:Company)=>({...c,fleetComposition:{...c.fleetComposition,impactMiner:0,laserMiner:1}});
 const w=run(createWorld(laser(fastLaser))),slow=run(createWorld(laser({...fastLaser,unlockedTechnologies:['laserMining']})));
 assert.ok(w.shots>slow.shots);assert.ok(w.delivered>=slow.delivered);assert.ok(w.drones.every(d=>d.gear.cargo===3));
 const threat=research(awardTech({...base,progress:{...base.progress,rivalSeen:true}},['first_rival_contact']), 'escortProgram')!;
 const tracked=research(awardTech(threat,['far_belt_charted']),'threatTracking')!;
 const shot=(c:Company)=>{const w=createWorld({...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,escort:1}});w.enemies.push(
  {id:1,x:120,y:445,vx:0,vy:0,hp:3,cooldown:9,path:[],pathKey:'',pathAge:0},
  {id:2,x:230,y:525,vx:0,vy:0,hp:3,cooldown:9,path:[],pathKey:'',pathAge:0});
  step(w);return w.effects.find(e=>e.type==='guardShot')?.tx;};
 assert.ok(shot(threat)!<150,'baseline attacks the closest irrelevant enemy');
 assert.ok(shot(tracked)!>200,'Threat Tracking attacks the closer threat to the miner');
});
test('actual autonomous exploration reaches early and distant finds; POIs occupy navigable free space',()=>{
 for(let seed=1;seed<=10;seed++){const w=createWorld(freshCompany(),seed);for(const p of [RESEARCH_STATION,EXPERIMENTAL_PROBE])assert.ok(clearSegment(p,p,w.rocks,-1,15),`seed ${seed} has blocked POI`);}
 let c=freshCompany();const chart=run(createWorld({...c,directive:'chartFar'}));assert.ok(chart.pendingTech.some(e=>e.id==='far_belt_charted'));c=settle(c,chart);
 const sample=run(createWorld({...c,directive:'surveyFar'}));assert.ok(sample.pendingTech.some(e=>e.id==='first_rich_sample'));c=settle(c,sample);
 const site=run(createWorld({...c,directive:'surveyOutpost'}));assert.ok(site.pendingTech.some(e=>e.id==='outpost_site_surveyed'));assert.ok(site.pendingTech.some(e=>e.id==='experimental_probe_salvaged'));
});
