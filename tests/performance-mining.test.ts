import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,planMinerWork,miningPlannerRuns,step,updateKnowledge,type Company} from '../src/sim.ts';
import {route,clearSegment,navigationStats,type Obstacle} from '../src/navigation.ts';
import {workRate} from '../src/work.ts';
import {scoutScanRadius} from '../src/biomes.ts';
import {hasCell} from '../src/knowledge.ts';

const laser=():Company=>({...freshCompany(),unlockedTypes:['impactMiner','scout','laserMiner'],fleetComposition:{...freshCompany().fleetComposition,impactMiner:0,laserMiner:1}});
test('route masks survive alternating mining targets and invalidate on depletion',()=>{
 const rocks:Obstacle[]=[{id:0,x:145,y:300,r:35,hp:3},{id:1,x:250,y:300,r:35,hp:3},
  {id:10,x:200,y:100,r:12,hp:3},{id:11,x:200,y:500,r:12,hp:3}];
 const start={x:50,y:300},goal={x:350,y:300};
 for(const ignore of [10,11,10,11]){
  const path=route(start,goal,rocks,ignore,400,620);assert.ok(path.length);
  let previous=start;for(const p of path){assert.ok(clearSegment(previous,p,rocks,ignore,8.1));previous=p;}
 }
 assert.equal(navigationStats(rocks).maskBuilds,2);
 rocks[0].hp=0;assert.ok(route(start,goal,rocks,10,400,620).length);
 assert.equal(navigationStats(rocks).maskBuilds,3);
 rocks[1].hp=0;assert.deepEqual(route(start,goal,rocks,10,400,620),[goal]);
});
test('local patch and station distance can outweigh a distant top-grade temptation',()=>{
 const common={pieces:2,actionSeconds:4,risk:0};
 const local=workRate({...common,credits:3,travel:50,returnDistance:150,areaDistance:30});
 const remote=workRate({...common,credits:60,travel:800,returnDistance:900,areaDistance:700});
 assert.ok(local>remote);
 assert.ok(workRate({...common,credits:60,travel:50,returnDistance:150})>local,'nearby valuable deposits still matter');
});
test('a Laser finishes the last fragment of its current asteroid before changing patch',()=>{
 const w=createWorld(laser()),d=w.drones[0];
 w.rocks=w.rocks.slice(0,2);const [current,other]=w.rocks;
 Object.assign(current,{x:200,y:440,r:18,hp:1,max:12,mineral:'ferrite'});
 Object.assign(other,{x:270,y:440,r:18,hp:12,max:12,mineral:'nickel'});
 w.explored.fill(255);w.identifiedRocks=new Set([current.id,other.id]);
 Object.assign(d,{x:200,y:500,targetRock:current.id,approachX:200,approachY:513});
 const job=planMinerWork(w,d);assert.equal(job?.kind,'rock');if(job?.kind==='rock')assert.equal(job.rock.id,current.id);
 step(w);assert.equal(current.hp,0);assert.equal(w.extracted,1);assert.equal(w.ores[0].mineral,'ferrite');
});
test('planning is bounded in quiet flight but depleted cached jobs invalidate immediately',()=>{
 const w=createWorld(laser()),d=w.drones[0];w.explored.fill(255);w.rocks.forEach(r=>w.identifiedRocks.add(r.id));
 d.cooldown=10;
 for(let i=0;i<60;i++)step(w);
 assert.ok(miningPlannerRuns(w)<12,`planner ran ${miningPlannerRuns(w)} times in one second`);
 const selected=w.rocks.find(r=>r.id===d.targetRock);assert.ok(selected);
 const count=miningPlannerRuns(w);selected.hp=0;step(w);
 assert.ok(miningPlannerRuns(w)>count);assert.notEqual(d.targetRock,selected.id);
});
test('owned Wide-Area Scanner doubles actual sensing, not just its label',()=>{
 assert.equal(scoutScanRadius([]),165);assert.equal(scoutScanRadius(['advancedSensors']),330);
 const c=freshCompany(),fleet={...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,scout:1}};
 const observe=(installed:boolean)=>{
  const w=createWorld({...fleet,environmentUpgrades:installed?['advancedSensors']:[]});
  Object.assign(w.scouts[0],{x:1000,y:600});updateKnowledge(w);return w;
 };
 assert.equal(hasCell(observe(false).visible,1280,600),false);
 assert.equal(hasCell(observe(true).visible,1280,600),true);
});
