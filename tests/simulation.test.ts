import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,settle,STEP,ORE_PICKUP_DELAY,FAR,dockingSpots,type Company,type World} from '../src/sim.ts';
import {parseSave,loadCompany,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {changeFleet} from '../src/fleet.ts';

function run(w:World,limit=12000){for(let i=0;i<limit&&w.phase!=='done';i++)step(w,STEP);return w;}
function impact(w:World,hp?:number){
 const d=w.drones[0],r=w.rocks[0];if(hp!==undefined)r.hp=hp;
 d.x=r.x;d.y=r.y+r.r+9;d.vx=0;d.vy=-130;d.angle=-Math.PI/2;d.recoil=0;d.cooldown=0;d.armed=true;d.state='mine';
 step(w,STEP);return {d,r};
}
function laserFixture():Company{let c=freshCompany();return {...c,unlockedTypes:['impactMiner','laserMiner'],fleetComposition:{...c.fleetComposition,impactMiner:0,laserMiner:1}};}

test('ram conserves exactly two separate unit fragments, including rich origin',()=>{
 const w=createWorld(freshCompany());const {r}=impact(w);assert.equal(w.collisions,1);assert.equal(w.extracted,2);assert.equal(r.max-r.hp,2);
 assert.deepEqual(w.ores.map(o=>o.value),[1,1]);assert.ok(w.ores.every(o=>o.age!<ORE_PICKUP_DELAY));
 const rich=createWorld(freshCompany());rich.rocks[0].rich=true;impact(rich);assert.equal(rich.richExtracted,2);assert.deepEqual(rich.ores.map(o=>[o.value,o.rich]),[[1,true],[1,true]]);
 const final=createWorld(freshCompany());const last=impact(final,1);assert.equal(last.r.hp,0);assert.equal(final.extracted,1);assert.deepEqual(final.ores.map(o=>o.value),[1]);
});
test('Laser Miner extracts exactly one separate unit per pulse without ram damage',()=>{
 const w=createWorld(laserFixture()),d=w.drones[0],r=w.rocks[0];d.x=r.x;d.y=r.y+r.r+48;step(w,STEP);
 assert.equal(w.shots,1);assert.equal(w.collisions,0);assert.equal(w.extracted,1);assert.equal(d.hp,d.maxHp);assert.deepEqual(w.ores.map(o=>o.value),[1]);
 assert.equal(d.gear.cargo,3);assert.equal(createWorld(freshCompany()).drones[0].gear.cargo,3);
});
test('2/3 cargo never blocks a two-unit impact; extra fragment remains collectable',()=>{
 const w=createWorld(freshCompany());w.drones[0].cargo=2;const {d}=impact(w);
 assert.equal(w.extracted,2);assert.equal(w.ores.length,2);assert.equal(d.cargo,2);
 // Place both at pickup radius once the short display lockout has elapsed.
 for(const o of w.ores){o.x=d.x;o.y=d.y;o.age=ORE_PICKUP_DELAY;}
 step(w,STEP);assert.equal(d.cargo,3);assert.equal(w.ores.length,1);assert.equal(w.ores[0].value,1);
 step(w,STEP);assert.equal(d.state,'return');assert.equal(d.cargo,3);
});
test('destroyed cargo becomes individual persistent salvage; partial rich sample can be delivered',()=>{
 const w=createWorld(freshCompany()),d=w.drones[0];d.cargo=3;d.richCargo=1;d.hp=1;
 w.enemies.push({id:99,x:d.x+55,y:d.y-25,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});step(w,STEP);
 assert.equal(d.state,'dead');assert.equal(d.cargo,0);assert.equal(w.ores.length,3);assert.ok(w.ores.every(o=>o.value===1));
 run(w);const saved=settle(freshCompany(),w);assert.equal(saved.ores.length,3);assert.ok(saved.ores.some(o=>o.rich));
 const next=createWorld(saved),miner=next.drones[0],ore=next.ores.find(o=>o.rich)!;miner.x=ore.x;miner.y=ore.y;step(next,STEP);assert.equal(miner.richCargo,1);
 miner.state='unload';miner.unloadCargo=miner.cargo;miner.unloadTime=0;for(let i=0;i<100;i++)step(next,STEP);
 assert.equal(next.progress.richSampled,true);assert.ok(next.delivered>=1);
});
test('complete missions account for mined, carried, delivered and loose unit ore without duplicate credits',()=>{
 const c=freshCompany(),w=run(createWorld(c));assert.equal(w.phase,'done');assert.ok(w.time>=45);
 assert.ok(w.ores.every(o=>o.value===1));assert.equal(w.extracted,w.delivered+w.ores.length+w.drones.reduce((n,d)=>n+d.cargo,0));
 const next=settle(c,w);assert.equal(next.credits,w.delivered);assert.equal(next.rounds,1);assert.deepEqual(next.fleetComposition,c.fleetComposition);
 assert.equal(next.techPointsAvailable,w.pendingTech.length);assert.equal(next.techPointsEarned,w.pendingTech.length);
 const restart=createWorld(next);assert.equal(restart.ores.length,w.ores.length);assert.equal(restart.rocks[0].hp,w.rocks[0].hp);
});
test('abort leaves the authoritative company untouched; docking and fatal final miner settle',()=>{
 const c=freshCompany(),w=createWorld(c);impact(w);assert.equal(c.credits,0);assert.equal(c.rockHp[0],undefined);
 assert.equal(dockingSpots(w.base).length,12);
 const dead=createWorld(c);dead.drones[0].hp=1;dead.enemies.push({id:99,x:dead.drones[0].x+45,y:dead.drones[0].y-20,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});run(dead);assert.equal(dead.phase,'done');assert.equal(dead.drones[0].state,'dead');
 const restarted=createWorld(settle(c,dead));assert.equal(restarted.drones.length,1);assert.equal(restarted.drones[0].state,'mine');
});
test('recovered starting AI completes shifts and first slot is affordable promptly',()=>{
 const rewards:number[]=[];for(let seed=1;seed<=10;seed++){const c={...freshCompany(),worldSeed:seed},w=run(createWorld(c,seed));assert.equal(w.phase,'done');rewards.push(w.delivered);}
 assert.ok(Math.min(...rewards)>=4&&Math.max(...rewards)<=6,`observed ${rewards}`);
 let c=freshCompany();for(let i=0;i<2;i++)c=settle(c,run(createWorld(c,c.worldSeed)));
 assert.ok(c.credits>=6,`two shifts earned ${c.credits}`);
});
test('Laser and Impact fixtures differ in actual same-seed extraction; both finish',()=>{
 const a=run(createWorld(freshCompany(),7)),b=run(createWorld(laserFixture(),7));assert.equal(a.phase,'done');assert.equal(b.phase,'done');
 assert.ok(a.collisions>0&&b.shots>0);assert.equal(a.shots,0);assert.equal(b.collisions,0);assert.ok(a.extracted>b.extracted);assert.ok(a.delivered>b.delivered);
 assert.equal(a.delivered,6);assert.equal(b.delivered,5);
 const repeated=run(createWorld(freshCompany(),7));assert.deepEqual([a.delivered,a.extracted,a.collisions,a.ores.length],[repeated.delivered,repeated.extracted,repeated.collisions,repeated.ores.length]);
});
test('far exploration, scanner, rich sample, rival contact and outpost remain reachable',()=>{
 let c=freshCompany();let w=createWorld(c);w.drones[0].x=FAR.x;w.drones[0].y=FAR.y;step(w,STEP);assert.equal(w.progress.farSurveyed,true);assert.equal(w.progress.outpostSurveyed,true);
 c=settle(c,w);assert.equal(c.progress.farSurveyed,true);assert.equal(c.progress.outpostSurveyed,true);
 const next=createWorld(c);next.progress.richSampled=true;next.time=11;step(next,STEP);assert.equal(next.progress.rivalSeen,true);assert.ok(next.enemies.length>0);
 const advanced:Company={...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,escort:1},unlockedTypes:['impactMiner','escort'],progress:{...c.progress,richSampled:true,rivalSeen:true,outpostSurveyed:false},directive:'surveyOutpost'};
 const surveyed=run(createWorld(advanced));assert.equal(surveyed.progress.outpostSurveyed,true);assert.equal(surveyed.phase,'done');
});

test('old v1-v6 are discarded; v8 persists and only game company keys are removed',()=>{
 for(let version=1;version<=6;version++)assert.deepEqual(parseSave(JSON.stringify({...freshCompany(),version,credits:999})),freshCompany());
 const map=new Map([['unrelated-setting','keep'],...Array.from({length:6},(_,i)=>[`aisteroids-company-v${i+1}`,JSON.stringify({version:i+1,credits:999})] as [string,string])]);
 const storage:SaveStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}};
 let c=loadCompany(storage);assert.equal(c.credits,0);assert.equal(c.fleetComposition.impactMiner,1);for(let i=1;i<=6;i++)assert.equal(map.has(`aisteroids-company-v${i}`),false);assert.equal(map.get('unrelated-setting'),'keep');assert.ok(map.has(SAVE_KEY));
 c={...c,credits:7,rounds:1,fleetCapacity:2};c=changeFleet(c,'impactMiner',1)!;storage.setItem(SAVE_KEY,JSON.stringify(c));
 assert.deepEqual(loadCompany(storage),c);assert.equal(map.get('unrelated-setting'),'keep');
 assert.deepEqual(parseSave('{broken'),freshCompany());
 const forged={...c,unlockedTypes:['impactMiner','laserMiner'],fleetComposition:{...c.fleetComposition,impactMiner:0,laserMiner:1,escort:0}};
 assert.deepEqual(parseSave(JSON.stringify(forged)),freshCompany());
 assert.throws(()=>loadCompany({getItem:()=>{throw Error('blocked');},setItem:()=>{},removeItem:()=>{}}));
});
