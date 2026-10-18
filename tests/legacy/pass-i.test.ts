import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,biomeAt,environmentAt,ENVIRONMENT_UPGRADES,environmentIds,movementFactor,radiationRate,sensorFactor} from '../../src/biomes.ts';
import {buyEnvironment,clearSurvey,clearTarget,createWorld,focusSurvey,freshCompany,knownBiomeAt,lockTarget,settle,step,updateKnowledge,STEP,HOME,FAR,type Company} from '../../src/sim.ts';
import {POIS,blankMap,hasCell,mapCount} from '../../src/knowledge.ts';
import {parseSave,loadCompany,SAVE_KEY} from '../../src/storage.ts';
import {renderLobby} from '../../src/lobby.ts';

const regionPoint:Record<keyof typeof BIOMES,[number,number]>={home_belt:[200,550],scrap_fields:[1000,700],contested:[1770,675],ion_storm:[1200,1900],dead_zone:[2440,1950]};
test('five fixed contiguous regions cover the original map and retain coordinates',()=>{
 const counts=Object.fromEntries(Object.keys(BIOMES).map(id=>[id,0]));
 for(let y=25;y<2400;y+=50)for(let x=25;x<2600;x+=50){const id=biomeAt(x,y);assert.ok(id in BIOMES);counts[id]++;}
 for(const [id,[x,y]] of Object.entries(regionPoint)){assert.equal(biomeAt(x,y),id);assert.ok(counts[id]>150,`${id}: ${counts[id]}`);}
 assert.equal(environmentAt(HOME,false),'home_belt');assert.equal(environmentAt(FAR,true),'home_belt');
 const a=createWorld(freshCompany()),b=createWorld(freshCompany());assert.deepEqual(a.rocks,b.rocks);assert.equal(a.rocks.length,168);assert.equal(POIS.length,5);
});
test('Fog gates region identification and temporary focus cannot select deep unknown territory',()=>{
 const w=createWorld({...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,scout:1}});
 assert.equal(knownBiomeAt(w,{x:1770,y:675}),null);assert.equal(focusSurvey(w,{x:1770,y:675}),true);
 assert.deepEqual(w.newRegions,[]);assert.deepEqual([...w.knownRegions],['home_belt']);
 assert.equal(focusSurvey(w,{x:HOME.x+50,y:HOME.y}),true);assert.ok(w.surveyFocus);
 const old=mapCount(w.explored);clearSurvey(w);assert.equal(w.surveyFocus,null);assert.equal(mapCount(w.explored),old);
 w.explored=blankMap();assert.equal(knownBiomeAt(w,HOME),null);
});
test('Ion interference derives from unchanged base movement and installed equipment',()=>{
 const ion={x:1200,y:1900};assert.equal(biomeAt(ion.x,ion.y),'ion_storm');
 assert.equal(sensorFactor(ion,[],false),.6);assert.equal(sensorFactor(ion,['navigationStabilizers'],false),.9);
 assert.equal(movementFactor(ion,[],false),.82);assert.equal(movementFactor(ion,['navigationStabilizers'],false),.95);
 assert.equal(movementFactor(HOME,['navigationStabilizers'],false),1);
 const c=freshCompany(),w=createWorld(c);w.scouts=[];assert.equal(w.company.environmentUpgrades.length,0);
});
test('actual sensor contact reveals only local Ion terrain and installed modifiers increase range',()=>{
 const base=freshCompany(),scouting={...base,fleetCapacity:2,fleetComposition:{...base.fleetComposition,scout:1}};
 const observe=(upgrades:Company['environmentUpgrades'])=>{
  const w=createWorld({...scouting,environmentUpgrades:upgrades}),s=w.scouts[0];s.x=1200;s.y=1900;updateKnowledge(w);return w;
 };
 const raw=observe([]),stabilized=observe(['navigationStabilizers']);
 assert.equal(hasCell(raw.visible,1330,1900),false);assert.equal(hasCell(stabilized.visible,1330,1900),true);
 assert.equal(raw.newRegions.includes('ion_storm'),true);
 assert.equal(knownBiomeAt(raw,{x:2440,y:1950}),null);
});
test('radiation uses fixed simulated time, shielding mitigates and station harbors are safe',()=>{
 const dead={x:2440,y:1950};assert.equal(biomeAt(dead.x,dead.y),'dead_zone');
 assert.equal(radiationRate(dead,[],false),.5);assert.equal(radiationRate(dead,['radiationShielding'],false),.06);
 assert.equal(radiationRate(HOME,[],false),0);assert.equal(radiationRate(FAR,[],true),0);
 const base=freshCompany();
 const run=(shielded:boolean)=>{const c={...base,environmentUpgrades:shielded?['radiationShielding' as const]:[]};const w=createWorld(c);const d=w.drones[0];d.x=dead.x;d.y=dead.y;d.hp=10;d.state='return';for(let i=0;i<60;i++)step(w,STEP);return d.hp;};
 const without=run(false),withShield=run(true);assert.ok(without<9.55&&without>9.45,`${without}`);assert.ok(withShield>9.9&&withShield<10);
 const destroyed=createWorld(base),miner=destroyed.drones[0];miner.x=dead.x;miner.y=dead.y;miner.hp=.001;miner.cargo=2;miner.state='return';step(destroyed,STEP);
 assert.equal(miner.state,'dead');assert.equal(destroyed.ores.length,2);assert.equal(destroyed.delivered,0);
});
test('physical investigation unlocks a paid fleet-wide blueprint, never extra Tech',()=>{
 for(const id of environmentIds){const spec=ENVIRONMENT_UPGRADES[id],base=freshCompany();
  assert.equal(buyEnvironment({...base,credits:1000},id),null);
  const c={...base,credits:spec.cost+11,uniqueTechDiscoveries:[spec.site],techPointsEarned:1,techPointsAvailable:1};
  const lobby=renderLobby(c,{tab:'workshop',error:'',storageOK:true});assert.match(lobby,new RegExp(spec.name));
  const bought=buyEnvironment(c,id)!;assert.equal(bought.credits,11);assert.equal(bought.techPointsEarned,c.techPointsEarned);assert.equal(bought.techPointsAvailable,c.techPointsAvailable);
  assert.equal(buyEnvironment(bought,id),null);assert.doesNotMatch(renderLobby(bought,{tab:'workshop',error:'',storageOK:true}),new RegExp(spec.name));
 }
});
test('v11 migration preserves world, fleet, Tech, Outpost and Endurance without grants',()=>{
 const initial=freshCompany();const v11={...initial,version:11,environmentUpgrades:undefined,enduranceLevel:3,credits:701,total:802,rounds:15,rockHp:{0:20},outpost:true,launchSite:'far',doctrine:'convoy'};
 const c=parseSave(JSON.stringify(v11));assert.equal(c.version,14);assert.deepEqual(c.environmentUpgrades,[]);assert.equal(c.enduranceLevel,3);
 for(const key of ['credits','total','rounds','outpost','launchSite','doctrine','explored','worldSeed'] as const)assert.deepEqual(c[key],v11[key]);
 assert.equal(c.rockHp[0],20);assert.equal(Object.keys(c.rockHp).length,168);assert.deepEqual(parseSave(JSON.stringify(c)),c);
 const values=new Map([[`aisteroids-company-v11`,JSON.stringify(v11)],['unrelated','keep']]);
 const store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 assert.deepEqual(loadCompany(store as Storage),c);assert.equal(values.get('unrelated'),'keep');assert.ok(values.get(SAVE_KEY));
 assert.deepEqual(parseSave(JSON.stringify({...c,environmentUpgrades:['bad']})),freshCompany());
 assert.deepEqual(parseSave(JSON.stringify({...c,environmentUpgrades:['advancedSensors']})),freshCompany());
});
test('Scout area focus and Escort POI target coexist and clear independently',()=>{
 const base=freshCompany(),c:Company={...base,fleetCapacity:3,fleetComposition:{...base.fleetComposition,scout:1,escort:1},unlockedTypes:['impactMiner','scout','escort'],progress:{...base.progress,rivalSeen:true}};
 const w=createWorld(c),site=POIS[0];w.discoveredPois.add(site.id);
 assert.equal(focusSurvey(w,{x:230,y:550}),true);assert.equal(lockTarget(w,site.id).ok,true);
 clearSurvey(w);assert.equal(w.activeTarget,site.id);assert.equal(w.surveyFocus,null);
 focusSurvey(w,{x:230,y:550});clearTarget(w);assert.ok(w.surveyFocus);assert.equal(w.activeTarget,null);
 const noScouts=createWorld(c);focusSurvey(noScouts,{x:230,y:550});noScouts.scouts[0].state='dead';step(noScouts);assert.equal(noScouts.surveyFocus,null);
 w.time=w.missionDuration;step(w);assert.equal(w.surveyFocus,null);assert.equal(w.activeTarget,null);
 assert.equal(createWorld(settle(c,w)).surveyFocus,null);
});
test('territorial rival remains bounded, without invading the fresh home shift',()=>{
 const w=createWorld(freshCompany());for(let i=0;i<1800;i++)step(w);
 assert.ok(w.enemies.length<=1);assert.equal(w.progress.rivalSeen,false);
 assert.ok(w.enemies.every(e=>e.home&&Math.hypot(e.x-e.home.x,e.y-e.home.y)<300));
});
