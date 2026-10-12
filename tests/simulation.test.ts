import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,settle,buy,cost,ROUND_TIME,STEP,HOME,type Company,type World} from '../src/sim.ts';
import {parseSave} from '../src/storage.ts';
function run(upgrades:Partial<Company>={},seed=7){const w=createWorld({...freshCompany(),...upgrades},seed);for(let n=0;n<4500&&w.phase!=='done';n++)step(w);assert.equal(w.phase,'done',JSON.stringify({seed,upgrades,drones:w.drones}));return w;}
function impactFixture(hull=false){const w=createWorld({...freshCompany(),hull,scanner:true});const r=w.rocks[0];r.hp=50;r.max=50;w.rocks=[r];const d=w.drones[0];d.x=r.x;d.y=r.y+r.r+8.5;d.vy=-67;d.angle=-Math.PI/2;return w;}
test('starter delivers 12, then dies on the fourth impact',()=>{const w=run();assert.equal(w.delivered,12);assert.equal(w.collisions,4);assert.equal(w.drones[0].state,'dead');assert.equal(w.drones[0].hp,0);assert.equal(w.shots,0);assert.ok(w.time<45);});
test('knockback produces clearance, fresh approach and a new impact',()=>{const w=impactFixture(),d=w.drones[0],r=w.rocks[0];step(w);assert.equal(d.hp,3);assert.ok(d.vy>100);const y=d.y;for(let i=0;i<30;i++)step(w);assert.ok(d.y-y>45,'ship must visibly bounce two lengths');assert.equal(w.collisions,1);for(let i=0;i<180&&w.collisions<2;i++)step(w);assert.equal(w.collisions,2);assert.ok(w.time>1,'impacts require a fresh approach');});
test('stationary unarmed contact cannot tick damage',()=>{const w=impactFixture(),d=w.drones[0],r=w.rocks[0];for(let i=0;i<120;i++){d.x=r.x;d.y=r.y+r.r+8;d.vx=d.vy=0;d.armed=false;d.cooldown=0;step(w);}assert.equal(w.collisions,0);assert.equal(d.hp,4);});
test('reinforced hull survives six hits and dies on seventh',()=>{const w=run({scanner:true,hull:true});assert.equal(w.collisions,7);assert.equal(w.delivered,24);assert.equal(w.drones[0].state,'dead');assert.equal(w.drones[0].maxHp,7);});
test('destruction forfeits carried cargo; repairs do not charge company',()=>{const w=impactFixture(),d=w.drones[0];d.hp=1;d.cargo=6;step(w);assert.equal(d.state,'dead');assert.equal(d.cargo,0);assert.equal(w.lost,6);assert.equal(w.delivered,0);const next=settle(freshCompany(),w);assert.equal(next.drones,1);assert.equal(next.credits,0);assert.equal(createWorld(next).drones[0].hp,4);});
function returnFixture(recall:boolean){const w=createWorld(freshCompany());w.time=recall?ROUND_TIME:0;w.rocks=[{id:42,x:200,y:400,r:48,hp:100,max:100,shape:[]}];const d=w.drones[0];Object.assign(d,{x:200,y:280,angle:Math.PI/2,cargo:recall?4:12});return w;}
for(const recall of [false,true])test((recall?'recall':'full cargo')+' routes around an obstructing asteroid',()=>{const w=returnFixture(recall),d=w.drones[0];let side=0;for(let i=0;i<1200&&w.delivered<(recall?4:12);i++){step(w);side=Math.max(side,Math.abs(d.x-200));for(const r of w.rocks)assert.ok(Math.hypot(d.x-r.x,d.y-r.y)>=r.r+7.9,'must not pass through asteroid');}assert.ok(side>55);assert.equal(w.delivered,recall?4:12);assert.equal(w.collisions,0);assert.equal(d.hp,4);});
test('recall starts at 45 seconds, not 60',()=>{const w=returnFixture(false);w.drones[0].cargo=2;w.time=ROUND_TIME-STEP;step(w);assert.equal(w.phase,'recall');assert.equal(w.drones[0].state,'return');});
test('laser mines with no hull damage and uses laser effects',()=>{const w=createWorld({...freshCompany(),laser:true,scanner:true});let seen=false;for(let i=0;i<4000&&w.phase!=='done';i++){step(w);seen ||= w.effects.some(e=>e.type==='laser');}assert.ok(seen);assert.ok(w.shots>0);assert.equal(w.collisions,0);assert.equal(w.drones[0].hp,4);assert.equal(w.phase,'done');assert.ok(w.delivered>24);});
test('new economy uses round prices and rejects duplicate/invalid purchases',()=>{const c={...freshCompany(),credits:12};assert.equal(cost(c,'drone'),10);assert.equal(cost(c,'hull'),10);assert.equal(cost(c,'scanner'),30);assert.equal(cost(c,'laser'),40);assert.equal(buy(c,'drone')!.credits,2);assert.equal(cost(buy(c,'drone')!,'drone'),20);const upgraded=buy(c,'hull')!;assert.equal(upgraded.hull,true);assert.equal(upgraded.credits,2);assert.equal(buy(upgraded,'hull'),null);assert.equal(buy(c,'scanner'),null);assert.equal(buy({...c,credits:999,drones:6},'drone'),null);});
test('legacy saves preserve economy, drones and technology',()=>{const old={version:1,credits:73,drones:3,scanner:true,blaster:true,rounds:8,total:213};assert.deepEqual(parseSave(JSON.stringify(old)),{...freshCompany(),credits:73,drones:3,scanner:true,laser:true,rounds:8,total:213});});
test('v3 saves round-trip; malformed saves are rejected',()=>{const c={...freshCompany(),credits:22,hull:true};assert.deepEqual(parseSave(JSON.stringify(c)),c);for(const value of ['{oops',JSON.stringify({...c,credits:-1}),JSON.stringify({...c,hull:'yes'})])assert.deepEqual(parseSave(value),freshCompany());});
test('seeded worlds are deterministic',()=>{const a=run({},99),b=run({},99);assert.deepEqual(a.drones,b.drones);assert.equal(a.delivered,b.delivered);});
test('sampled fleet combinations finish; first upgrades improve earnings',()=>{let base=0,hull=0,fleet=0;for(let i=0;i<20;i++){const seed=7+i*7919;const b=run({},seed);base+=b.delivered;hull+=run({hull:true},seed).delivered;fleet+=run({drones:2},seed).delivered;assert.ok(b.delivered>=10,'starter must fund a purchase in these sample fields');}assert.ok(hull>base*1.2);assert.ok(fleet>base*1.5);for(const scanner of [false,true])for(const laser of [false,true])for(const hull of [false,true])for(let i=0;i<6;i++){const w=run({drones:6,scanner,laser,hull},7+i*7919);assert.ok(w.drones.every(d=>d.cargo===0&&d.hp>=0));}});

test('unloading holds position, transfers cargo once and leaves without teleporting',()=>{
 const w=returnFixture(false),d=w.drones[0];let entered=false,left=false,position={x:0,y:0},previous={x:d.x,y:d.y};
 for(let i=0;i<1500&&!left;i++){
  step(w);assert.ok(Math.hypot(d.x-previous.x,d.y-previous.y)<3,'no frame may teleport the drone');
  if(d.state==='unload'){
   if(!entered){position={x:d.x,y:d.y};entered=true;assert.equal(w.delivered,0);assert.ok(Math.hypot(d.x-HOME.x,d.y-HOME.y)>50);}
   assert.equal(d.x,position.x);assert.equal(d.y,position.y);
   const inFlight=w.effects.filter(e=>e.type==='transfer').reduce((n,e)=>n+(e.amount??0),0);
   assert.equal(d.cargo+w.delivered+inFlight,12);
  }
  left=entered&&d.state==='mine';previous={x:d.x,y:d.y};
 }
 assert.ok(left);assert.equal(w.delivered,12);assert.equal(d.cargo,0);
});

test('v2 companies migrate with existing purchases and round history',()=>{
 const v2={version:2,credits:147,drones:4,scanner:true,hull:true,laser:true,rounds:8,total:371};
 assert.deepEqual(parseSave(JSON.stringify(v2)),{...freshCompany(),...v2,version:3});
});
test('rich belt unlocks later and releases twice the ore value',()=>{
 const early=createWorld(freshCompany()),later=createWorld({...freshCompany(),rounds:3});
 assert.ok(early.rocks.every(r=>!r.rich));
 const rock=later.rocks.find(r=>r.rich)!;
 const d=later.drones[0];d.x=rock.x;d.y=rock.y+rock.r+8.5;d.vy=-67;d.angle=-Math.PI/2;
 later.rocks=[rock];step(later);assert.equal(later.ores.reduce((n,o)=>n+o.value,0)+d.cargo,8);
});
test('later technology unlocks in stages and costs remain meaningful',()=>{
 let c={...freshCompany(),credits:500};
 assert.equal(buy(c,'cargoBay'),null);assert.equal(buy(c,'guard'),null);
 c={...c,rounds:3};assert.equal(buy(c,'prospector'),null);c=buy(c,'scanner')!;assert.equal(buy(c,'prospector')!.prospector,true);assert.equal(cost(c,'cargoBay'),60);assert.equal(buy(c,'cargoBay')!.cargoBay,true);assert.equal(buy(c,'drive'),null);
 c={...c,rounds:6};assert.equal(cost(c,'guard'),100);c=buy(c,'guard')!;assert.equal(c.guards,1);assert.equal(cost(c,'guard'),160);
 assert.equal(buy(c,'outpost'),null);c={...c,rounds:8};assert.equal(cost(c,'outpost'),220);
});
test('first rival appears after the reveal and attacks miners; guards defeat it',()=>{
 const c={...freshCompany(),rounds:5,drones:1};const w=createWorld(c);w.rocks=[];w.ores=[];const d=w.drones[0];d.x=730;d.y=180;d.cargo=4;w.time=10.99;
 for(let i=0;i<350&&w.attacks===0;i++)step(w);
 assert.ok(w.enemies.length>0);assert.ok(w.attacks>0);assert.ok(d.hp<d.maxHp);assert.equal(w.guards.length,0);
 const protectedWorld=createWorld({...c,guards:2});protectedWorld.rocks=[];protectedWorld.ores=[];const p=protectedWorld.drones[0];p.x=730;p.y=180;p.cargo=4;protectedWorld.time=10.99;
 for(let i=0;i<1000&&protectedWorld.enemies.every(e=>e.hp>0);i++)step(protectedWorld);
 assert.ok(protectedWorld.intercepts>=3);assert.ok(protectedWorld.enemies.some(e=>e.hp<=0));
});
test('far outpost changes spawn and unloading destination without changing HQ saves',()=>{
 const c={...freshCompany(),rounds:8,outpost:true,launchSite:'far' as const,laser:true};const w=createWorld(c);
 assert.equal(w.base.x,535);assert.ok(w.drones[0].x>500);
 assert.equal(parseSave(JSON.stringify(c)).launchSite,'far');
 const d=w.drones[0];d.cargo=12;d.state='return';w.time=45;
 for(let i=0;i<1500&&w.phase!=='done';i++)step(w);
 assert.equal(w.phase,'done');assert.equal(w.delivered,12);
});
test('bodyguards reduce incoming fire in a full contested shift',()=>{
 const base={...freshCompany(),rounds:6,drones:3,scanner:true,hull:true,laser:true};
 const unguarded=createWorld(base),escorted=createWorld({...base,guards:1});
 for(const w of [unguarded,escorted])for(let n=0;n<4500&&w.phase!=='done';n++)step(w);
 assert.equal(unguarded.phase,'done');assert.equal(escorted.phase,'done');
 assert.ok(unguarded.attacks>0);assert.ok(escorted.intercepts>=3);
 assert.ok(escorted.attacks<unguarded.attacks);
});
test('contested outpost missions with multiple miners finish and bank cargo',()=>{
 const company={...freshCompany(),rounds:9,outpost:true,launchSite:'far' as const,drones:4,scanner:true,hull:true,laser:true,guards:2};
 for(const seed of [7,8]){
  const w=createWorld(company,seed);
  for(let n=0;n<4500&&w.phase!=='done';n++)step(w);
  assert.equal(w.phase,'done');assert.ok(w.delivered>0);assert.ok(w.intercepts>0);
  assert.ok(w.drones.every(d=>d.cargo===0));
 }
});
