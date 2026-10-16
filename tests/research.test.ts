import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,settle,lockTarget,clearTarget,updateKnowledge,STEP,visibleAt,type Company,type World} from '../src/sim.ts';
import {POIS,decodeMap,mapCount} from '../src/knowledge.ts';
import {awardTech,discoveryIds,research,researchReason,TECH_DISCOVERIES} from '../src/research.ts';
import {changeFleet} from '../src/fleet.ts';
import {loadCompany,parseSave,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';

const store=(initial:Record<string,string>={})=>{const map=new Map(Object.entries(initial));const storage:SaveStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}};return {map,storage};};
const run=(w:World)=>{for(let i=0;i<12000&&w.phase!=='done';i++)step(w);assert.equal(w.phase,'done');return w;};
const legacy=(version:7|8|9,changes:Record<string,unknown>={})=>{const c=freshCompany();return JSON.stringify({...c,version,fleetComposition:{impactMiner:1,laserMiner:0,escort:0,hauler:0,miningRig:0},unlockedTypes:['impactMiner'],directive:'investigateFreight',...changes});};

test('v9 company migrates credits, rock/ore, infrastructure, research and legacy directive without a reset',()=>{
 const base=freshCompany(),rich=awardTech({...base,progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:true}},['far_belt_charted','first_rich_sample','first_rival_contact','outpost_site_surveyed','abandoned_research_station']);
 const original={...rich,version:9,fleetCapacity:3,fleetComposition:{impactMiner:1,laserMiner:0,escort:1,hauler:0,miningRig:0},unlockedTypes:['impactMiner','escort'],credits:81,total:213,rounds:14,turret:true,outpost:true,launchSite:'far',rockHp:{0:17,13:49},ores:[{x:350,y:400,value:1,rich:true}],doctrine:'convoy',directive:'investigateFreight'};
 const owned=research(original as unknown as Company,'escortProgram')!;
 const {map,storage}=store({'aisteroids-company-v9':JSON.stringify({...owned,version:9,directive:'investigateFreight',fleetComposition:original.fleetComposition}),unrelated:'keep'});
 const c=loadCompany(storage);
 assert.equal(c.version,14);assert.equal(c.credits,81);assert.equal(c.total,213);assert.equal(c.rounds,14);assert.equal(c.fleetCapacity,3);assert.equal(c.fleetComposition.escort,1);assert.equal(c.fleetComposition.scout,0);
 assert.equal(c.rockHp[0],17);assert.equal(c.ores[0].rich,true);assert.equal(c.outpost,true);assert.equal(c.turret,true);assert.equal(c.launchSite,'far');assert.equal(c.doctrine,'convoy');
 assert.equal(c.uniqueTechDiscoveries.includes('abandoned_research_station'),true);assert.equal(c.discoveredPois.includes('abandoned_research_station'),true);
 assert.ok(mapCount(decodeMap(c.explored)!)<9984);assert.equal(createWorld(c).activeTarget,null);assert.equal(map.get('unrelated'),'keep');assert.equal(map.has('aisteroids-company-v9'),false);assert.deepEqual(loadCompany(storage),c);
});
test('v7 and v8 still migrate through validated ledgers and unrelated storage survives',()=>{
 const v7=legacy(7,{directive:'auto',credits:31,total:48,rounds:8,fleetCapacity:2,fleetComposition:{impactMiner:1,laserMiner:0,escort:1,hauler:0,miningRig:0},progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:false}});
 const a=loadCompany(store({'aisteroids-company-v7':v7}).storage);assert.equal(a.version,14);assert.equal(a.credits,31);assert.equal(a.grandfatheredEscort,true);assert.equal(a.techPointsEarned,3);assert.equal(a.techPointsAvailable,3);
 const v8=legacy(8,{directive:'surveyFar',credits:72,rounds:7});const b=loadCompany(store({'aisteroids-company-v8':v8}).storage);assert.equal(b.version,14);assert.equal(b.credits,72);assert.equal(b.rounds,7);
 for(let v=1;v<=6;v++)assert.deepEqual(parseSave(JSON.stringify({...freshCompany(),version:v})),freshCompany());
});
test('v10 validates compact map, POI IDs, fleet keys, counts and Tech budget',()=>{
 const c=freshCompany();assert.deepEqual(parseSave(JSON.stringify(c)),c);
 for(const altered of [{...c,explored:'bad'},{...c,discoveredPois:['unknown']},{...c,fleetComposition:{...c.fleetComposition,scout:8}},{...c,fleetComposition:{...c.fleetComposition,unknown:1}},{...c,unlockedTypes:['impactMiner','unknown']},{...c,techPointsAvailable:5}])assert.deepEqual(parseSave(JSON.stringify(altered)),freshCompany());
 assert.equal(SAVE_KEY,'aisteroids-company-v14');
});
test('research costs, prerequisites, Scout entitlement and one-time discoveries remain bounded',()=>{
 let c=freshCompany();assert.match(researchReason(c,'escortProgram')!,/Encounter/);assert.equal(research(c,'laserMining'),null);assert.equal(changeFleet(c,'scout',1),null);
 c=awardTech(c,['far_belt_charted','far_belt_charted']);assert.equal(c.techPointsEarned,1);c=research(c,'laserMining')!;assert.ok(c.unlockedTypes.includes('laserMiner'));assert.equal(research(c,'rapidCooling'),null);
 c={...c,fleetCapacity:2};c=changeFleet(c,'laserMiner',1)!;assert.equal(createWorld(c).drones[1].kind,'laserMiner');assert.deepEqual(parseSave(JSON.stringify(c)),c);
 const html=renderLobby(c,{tab:'hangar',doctrineOpen:false,planOpen:false,researchOpen:true,error:'',storageOK:true});assert.match(html,/Laser Mining/);assert.match(html,/RESEARCHED/);
 assert.equal(discoveryIds.length,9);assert.equal(Object.keys(TECH_DISCOVERIES).length,9);
});
test('sensor detection alone never awards Tech; Escort dwell awards once after settlement',()=>{
 let c=freshCompany();c={...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,escort:1},unlockedTypes:['impactMiner','escort'],progress:{...c.progress,rivalSeen:true}};
 const site=POIS[0],w=createWorld(c);assert.equal(lockTarget(w,site.id).ok,false);
 w.guards[0].x=site.x+30;w.guards[0].y=site.y;updateKnowledge(w);assert.ok(w.discoveredPois.has(site.id));assert.equal(w.pendingTech.some(e=>e.id===site.id),false);
 assert.equal(lockTarget(w,site.id).ok,true);
 for(let i=0;i<1500&&w.activeTarget;i++)step(w,STEP);
 assert.equal(w.activeTarget,null);assert.equal(w.pendingTech.filter(e=>e.id===site.id).length,1);assert.equal(c.techPointsEarned,0);
 const settled=settle(c,w);assert.ok(settled.uniqueTechDiscoveries.includes(site.id));assert.equal(settled.techPointsEarned,w.pendingTech.length);
 const next=createWorld(settled);assert.equal(next.activeTarget,null);assert.equal(lockTarget(next,site.id).ok,false);assert.equal(next.pendingTech.length,0);
});
test('clear target, recall and Abort leave an incomplete investigation uncredited',()=>{
 const c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,escort:1},unlockedTypes:['impactMiner','escort'],progress:{...freshCompany().progress,rivalSeen:true}};
 const w=createWorld(c),site=POIS[0];w.discoveredPois.add(site.id);assert.equal(lockTarget(w,site.id).ok,true);step(w);clearTarget(w);assert.equal(w.investigationTime,0);assert.equal(w.pendingTech.length,0);
 lockTarget(w,site.id);w.time=30;step(w);assert.equal(w.activeTarget,null);assert.equal(w.pendingTech.length,0);
 const aborted=createWorld(c);assert.equal(aborted.discoveredPois.has(site.id),false);assert.equal(c.uniqueTechDiscoveries.length,0);
});
test('stored exploration persists after settlement; live visibility is rebuilt from physical sensors',()=>{
 const c=freshCompany(),w=createWorld(c),p=POIS[4];assert.equal(visibleAt(w,p),false);
 w.drones[0].x=p.x;w.drones[0].y=p.y;updateKnowledge(w);assert.ok(w.discoveredPois.has(p.id));assert.equal(w.pendingTech.some(e=>e.id===p.id),false);
 const saved=settle(c,w),next=createWorld(saved);assert.ok(next.discoveredPois.has(p.id));assert.equal(visibleAt(next,p),false);assert.ok(mapCount(next.explored)>mapCount(createWorld(c).explored));
});
