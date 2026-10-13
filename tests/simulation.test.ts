import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,settle,buy,cost,ROUND_TIME,STEP,HOME,type Company,type World} from '../src/sim.ts';
import {parseSave} from '../src/storage.ts';
import {fleetForCounts} from '../src/fleet.ts';
function run(upgrades:Partial<Company>={},seed=7){const w=createWorld({...freshCompany(),...upgrades},seed);for(let n=0;n<4500&&w.phase!=='done';n++)step(w);assert.equal(w.phase,'done',JSON.stringify({seed,upgrades,drones:w.drones}));return w;}
function impactFixture(hull=false){const w=createWorld({...freshCompany(),hull,scanner:true});const r=w.rocks[0];r.hp=50;r.max=50;w.rocks=[r];const d=w.drones[0];d.x=r.x;d.y=r.y+r.r+8.5;d.vy=-67;d.angle=-Math.PI/2;return w;}
test('starter can deliver 12 with headbutts and fund its first purchase',()=>{const w=run();assert.equal(w.delivered,12);assert.ok(w.collisions>=3);assert.equal(w.shots,0);assert.ok(buy(settle(freshCompany(),w),'drone'));});
test('knockback produces clearance, fresh approach and a new impact',()=>{const w=impactFixture(),d=w.drones[0],r=w.rocks[0];step(w);assert.equal(d.hp,3);assert.ok(d.vy>100);const y=d.y;for(let i=0;i<30;i++)step(w);assert.ok(d.y-y>45,'ship must visibly bounce two lengths');assert.equal(w.collisions,1);for(let i=0;i<180&&w.collisions<2;i++)step(w);assert.equal(w.collisions,2);assert.ok(w.time>1,'impacts require a fresh approach');});
test('stationary unarmed contact cannot tick damage',()=>{const w=impactFixture(),d=w.drones[0],r=w.rocks[0];for(let i=0;i<120;i++){d.x=r.x;d.y=r.y+r.r+8;d.vx=d.vy=0;d.armed=false;d.cooldown=0;step(w);}assert.equal(w.collisions,0);assert.equal(d.hp,4);});
test('reinforced hull survives six hits and dies on seventh',()=>{const w=run({scanner:true,hull:true});assert.equal(w.collisions,7);assert.equal(w.delivered,24);assert.equal(w.drones[0].state,'dead');assert.equal(w.drones[0].maxHp,7);});
test('destroyed cargo falls into the field for a later shift; repairs remain free',()=>{const w=impactFixture(),d=w.drones[0];d.hp=1;d.cargo=6;step(w);assert.equal(d.state,'dead');assert.equal(d.cargo,0);assert.equal(w.lost,6);assert.equal(w.delivered,0);const next=settle(freshCompany(),w);assert.equal(next.drones,1);assert.equal(next.credits,0);assert.equal(next.ores.reduce((n,o)=>n+o.value,0),10);assert.equal(createWorld(next).drones[0].hp,4);assert.equal(createWorld(next).ores.length,5);});
function returnFixture(recall:boolean){const w=createWorld(freshCompany());w.time=recall?ROUND_TIME:0;w.rocks=[{id:42,x:200,y:400,r:48,hp:100,max:100,shape:[]}];const d=w.drones[0];Object.assign(d,{x:200,y:280,angle:Math.PI/2,cargo:recall?4:12});return w;}
for(const recall of [false,true])test((recall?'recall':'full cargo')+' routes around an obstructing asteroid',()=>{const w=returnFixture(recall),d=w.drones[0];let side=0;for(let i=0;i<1200&&w.delivered<(recall?4:12);i++){step(w);side=Math.max(side,Math.abs(d.x-200));for(const r of w.rocks)assert.ok(Math.hypot(d.x-r.x,d.y-r.y)>=r.r+7.9,'must not pass through asteroid');}assert.ok(side>55);assert.equal(w.delivered,recall?4:12);assert.equal(w.collisions,0);assert.equal(d.hp,4);});
test('recall starts at 45 seconds, not 60',()=>{const w=returnFixture(false);w.drones[0].cargo=2;w.time=ROUND_TIME-STEP;step(w);assert.equal(w.phase,'recall');assert.equal(w.drones[0].state,'return');});
test('laser mines with no hull damage and uses laser effects',()=>{const w=createWorld({...freshCompany(),laser:true,scanner:true});let seen=false;for(let i=0;i<4000&&w.phase!=='done';i++){step(w);seen ||= w.effects.some(e=>e.type==='laser');}assert.ok(seen);assert.ok(w.shots>0);assert.equal(w.collisions,0);assert.equal(w.drones[0].hp,4);assert.equal(w.phase,'done');assert.ok(w.delivered>12);});
test('new economy uses round prices and rejects duplicate/invalid purchases',()=>{const c={...freshCompany(),credits:12};assert.equal(cost(c,'drone'),10);assert.equal(cost(c,'hull'),10);assert.equal(cost(c,'scanner'),30);assert.equal(cost(c,'laser'),80);assert.equal(buy(c,'drone')!.credits,2);assert.equal(cost(buy(c,'drone')!,'drone'),30);const upgraded=buy(c,'hull')!;assert.equal(upgraded.hull,true);assert.equal(upgraded.credits,2);assert.equal(buy(upgraded,'hull'),null);assert.equal(buy(c,'scanner'),null);assert.equal(buy({...c,credits:999,drones:6},'drone'),null);});
test('legacy saves preserve economy, drones and technology',()=>{const old={version:1,credits:73,drones:3,scanner:true,blaster:true,rounds:8,total:213};assert.deepEqual(parseSave(JSON.stringify(old)),{...freshCompany(),credits:73,drones:3,scanner:true,laser:true,rounds:8,total:213,fleet:fleetForCounts(3,0)});});
test('v3 saves round-trip; malformed saves are rejected',()=>{const c={...freshCompany(),credits:22,hull:true};assert.deepEqual(parseSave(JSON.stringify(c)),c);for(const value of ['{oops',JSON.stringify({...c,credits:-1}),JSON.stringify({...c,hull:'yes'})])assert.deepEqual(parseSave(value),freshCompany());});
test('seeded worlds are deterministic',()=>{const a=run({},99),b=run({},99);assert.deepEqual(a.drones,b.drones);assert.equal(a.delivered,b.delivered);});
test('sampled fleet combinations finish; first upgrades improve earnings',()=>{let base=0,hull=0,fleet=0;for(let i=0;i<8;i++){const seed=7+i*7919;const b=run({},seed);base+=b.delivered;hull+=run({hull:true},seed).delivered;fleet+=run({drones:2},seed).delivered;}assert.ok(hull>base*1.2);assert.ok(fleet>base*1.5);for(const scanner of [false,true])for(const laser of [false,true])for(const hull of [false,true]){const w=run({drones:4,scanner,laser,hull});assert.ok(w.drones.every(d=>d.cargo===0&&d.hp>=0));}});

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
 assert.deepEqual(parseSave(JSON.stringify(v2)),{...freshCompany(),...v2,version:5,fleet:fleetForCounts(4,0)});
});
test('rich belt exists from the start and releases twice the ore value',()=>{
 const w=createWorld(freshCompany());const rock=w.rocks.find(r=>r.rich)!;
 const d=w.drones[0];d.x=rock.x;d.y=rock.y+rock.r+8.5;d.vy=-67;d.angle=-Math.PI/2;
 w.rocks=[rock];step(w);assert.equal(w.ores.reduce((n,o)=>n+o.value,0)+d.cargo,8);
});
test('laser extracts one quarter as much per pulse, while a ram retains its four mineral yield',()=>{
 const rock=createWorld(freshCompany()).rocks[0];
 const ram=impactFixture(),before=ram.rocks[0].hp;step(ram);
 assert.equal(before-ram.rocks[0].hp,4);assert.equal(ram.ores.reduce((n,o)=>n+o.value,0),4);
 const laser=createWorld({...freshCompany(),laser:true});laser.rocks=[rock];const d=laser.drones[0];d.x=rock.x;d.y=rock.y+rock.r+50;step(laser);
 assert.equal(rock.max-rock.hp,1);assert.equal(laser.ores.reduce((n,o)=>n+o.value,0)+d.cargo,1);
 assert.equal(rock.max,160,'persistent ore budget remains equal to the old 40 headbutt hits');
});
test('odd laser cargo unloads without losing a mineral',()=>{
 const w=returnFixture(true),d=w.drones[0];d.cargo=5;d.richCargo=2;
 for(let n=0;n<1400&&w.phase!=='done';n++)step(w);
 assert.equal(w.phase,'done');assert.equal(w.delivered,5);assert.equal(d.cargo,0);
});
test('v4 rock integrity migrates fourfold and keeps depleted deposits depleted',()=>{
 const old={...freshCompany(),version:4,rockHp:{0:7,1:0},ores:[{x:200,y:400,value:2,rich:false}]};
 const next=parseSave(JSON.stringify(old));assert.equal(next.version,5);assert.equal(next.rockHp[0],28);assert.equal(next.rockHp[1],0);assert.equal(createWorld(next).rocks[1].hp,0);
 const odd={...next,ores:[{x:200,y:400,value:1,rich:false}]};assert.deepEqual(parseSave(JSON.stringify(odd)),odd);
});
test('technology unlocks from discoveries and costs remain meaningful',()=>{
 let c={...freshCompany(),credits:500};
 assert.equal(buy(c,'cargoBay'),null);assert.equal(buy(c,'guard'),null);
 c={...c,rounds:99};assert.equal(buy(c,'cargoBay'),null);
 c={...c,progress:{...c.progress,richSampled:true}};assert.equal(buy(c,'prospector'),null);c=buy(c,'scanner')!;assert.equal(buy(c,'prospector')!.prospector,true);assert.equal(cost(c,'cargoBay'),120);assert.equal(buy(c,'cargoBay')!.cargoBay,true);assert.equal(buy(c,'drive')!.drive,true);
 assert.equal(buy(c,'guard'),null);c={...c,progress:{...c.progress,rivalSeen:true}};assert.equal(cost(c,'guard'),180);c=buy(c,'guard')!;assert.equal(c.guards,1);assert.equal(cost(c,'guard'),280);
 assert.equal(buy(c,'outpost'),null);c={...c,progress:{...c.progress,outpostSurveyed:true}};assert.equal(cost(c,'outpost'),300);
});
test('first rival appears after the reveal and attacks miners; guards defeat it',()=>{
 const c={...freshCompany(),progress:{...freshCompany().progress,richSampled:true},drones:1};const w=createWorld(c);w.rocks=[];w.ores=[];const d=w.drones[0];d.x=730;d.y=180;d.cargo=4;w.time=10.99;
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
 const base={...freshCompany(),progress:{...freshCompany().progress,richSampled:true,outpostSurveyed:true},outpost:true,launchSite:'far' as const,drones:3,scanner:true,hull:true,laser:true};
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
test('rock damage, depletion and loose minerals persist across completed shifts',()=>{
 const c=freshCompany(),w=createWorld(c);const original=w.rocks.map(r=>({id:r.id,x:r.x,y:r.y,max:r.max}));
 w.rocks[0].hp-=3;w.rocks[1].hp=0;w.ores.push({id:999,x:300,y:400,value:4,rich:true});
 const next=settle(c,w),later=createWorld(next);
 assert.equal(next.rockHp[0],w.rocks[0].max-3);assert.equal(next.rockHp[1],0);
 assert.equal(later.rocks[0].hp,next.rockHp[0]);assert.equal(later.rocks[1].hp,0);
 assert.deepEqual(later.rocks.map(r=>({id:r.id,x:r.x,y:r.y,max:r.max})),original);
 assert.equal(later.ores.at(-1)?.value,4);assert.equal(later.ores.at(-1)?.rich,true);
});
test('a miner with two free cargo slots stops circling rich ore worth four',()=>{
 const c={...freshCompany(),scanner:true,cargoBay:true},w=createWorld(c),d=w.drones[0];
 w.rocks.forEach(r=>r.hp=0);w.ores=[{id:400,x:490,y:810,value:4,rich:true,age:1}];
 Object.assign(d,{x:490,y:810,cargo:16,richCargo:16});
 step(w);assert.equal(d.state,'return');assert.equal(w.ores.length,1);
 for(let n=0;n<750&&w.delivered<16;n++)step(w);
 assert.ok(w.delivered>=16,'the partial load must reach HQ rather than orbit the ore');
});
test('scanner and mining laser ignore deposits that cannot fit the remaining cargo',()=>{
 const c={...freshCompany(),scanner:true,laser:true,cargoBay:true},w=createWorld(c),d=w.drones[0];
 w.rocks.forEach(r=>r.hp=0);
 const rich=w.rocks.find(r=>r.rich)!,ordinary=w.rocks[0];rich.hp=20;ordinary.hp=20;
 Object.assign(d,{x:rich.x,y:rich.y+rich.r+60,cargo:17,richCargo:17,cooldown:0});
 w.ores=[{id:999,x:d.x+10,y:d.y,value:4,rich:true,age:1}];
 step(w);assert.equal(rich.hp,20);assert.equal(w.shots,0);assert.equal(d.pathKey,'rock'+ordinary.id);
});
test('an unescorted scout destroys a basic miner in three clear shots',()=>{
 const c={...freshCompany(),laser:true,progress:{...freshCompany().progress,richSampled:true}},w=createWorld(c),d=w.drones[0];
 w.rocks=[{id:77,x:700,y:800,r:25,hp:50,max:50,shape:[]}];w.time=11;
 Object.assign(d,{x:450,y:180,cargo:4,angle:Math.PI});
 for(let n=0;n<1400&&d.state!=='dead';n++)step(w);
 assert.equal(d.state,'dead');assert.equal(w.attacks,3);assert.ok(w.lost>=4);
});
test('scouts pursue and attack miners near HQ, including during recall',()=>{
 const c={...freshCompany(),progress:{...freshCompany().progress,richSampled:true,rivalSeen:true}};
 const w=createWorld(c),d=w.drones[0];w.wave=1;w.enemies=[{id:0,x:300,y:550,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0}];d.x=210;d.y=550;w.time=ROUND_TIME;d.cargo=5;
 for(let i=0;i<200&&w.attacks===0;i++)step(w);
 assert.ok(w.attacks>0);assert.ok(d.hp<d.maxHp);
});
test('HQ turret is cheaper than a guard and fires only around home',()=>{
 const c={...freshCompany(),credits:200,progress:{...freshCompany().progress,rivalSeen:true}};
 assert.equal(cost(c,'turret'),90);assert.ok(cost(c,'turret')<cost(c,'guard'));
 const owned=buy(c,'turret')!;assert.equal(owned.turret,true);assert.equal(buy(owned,'turret'),null);
 const w=createWorld(owned);w.wave=2;w.enemies=[{id:0,x:290,y:550,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0}];
 for(let i=0;i<400&&w.enemies[0].hp>0;i++)step(w);
 assert.equal(w.enemies[0].hp,0);assert.ok(w.effects.some(e=>e.type==='turretShot')||w.intercepts>=3);
});
test('one escort beats one scout, while two scouts can defeat the escort',()=>{
 const fight=(count:number)=>{const w=createWorld({...freshCompany(),guards:1});w.wave=2;w.time=12;w.drones[0].x=210;w.drones[0].y=550;w.guards[0].x=490;w.guards[0].y=530;w.enemies=Array.from({length:count},(_,id)=>({id,x:540+id*24,y:530,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0}));for(let i=0;i<1100&&w.guards[0].hp>0&&w.enemies.some(e=>e.hp>0);i++)step(w);return w;};
 const solo=fight(1);assert.ok(solo.guards[0].hp>0);assert.equal(solo.enemies[0].hp,0);
 const pair=fight(2);assert.equal(pair.guards[0].hp,0);assert.ok(pair.enemies.some(e=>e.hp<=0));assert.ok(pair.enemies.some(e=>e.hp>0&&e.hp<3));
});
test('six miners can all dock at the outpost after recall',()=>{
 const c={...freshCompany(),drones:6,laser:true,outpost:true,launchSite:'far' as const,progress:{...freshCompany().progress,outpostSurveyed:true}};
 const w=createWorld(c);w.time=ROUND_TIME;for(const d of w.drones){d.cargo=12;d.state='return';d.x=535;d.y=600;}
 for(let i=0;i<1200&&w.phase!=='done';i++)step(w);
 assert.equal(w.phase,'done');assert.equal(w.delivered,72);assert.ok(w.drones.every(d=>d.state==='docked'));
});
test('a laser miner holds a visible standoff instead of orbiting the rock surface',()=>{
 const w=createWorld({...freshCompany(),laser:true});for(let i=0;i<1000;i++)step(w);
 const d=w.drones[0],r=w.rocks[0];assert.ok(w.shots>8);assert.equal(d.pathKey,'rock0');assert.ok(Math.hypot(d.x-r.x,d.y-r.y)>r.r+42);
});
test('fleet loss leaves wreckage on screen before the final report',()=>{
 const w=impactFixture(),d=w.drones[0];d.hp=1;step(w);assert.equal(d.state,'dead');assert.equal(w.phase,'aftermath');
 for(let i=0;i<120;i++)step(w);assert.equal(w.phase,'aftermath');
 for(let i=0;i<40;i++)step(w);assert.equal(w.phase,'done');
});
test('survey priorities lead to discoveries without mission count gates',()=>{
 let c={...freshCompany(),scanner:true,hull:true,drones:2,directive:'surveyFar' as const};
 const sample=createWorld(c);for(let n=0;n<5000&&sample.phase!=='done';n++)step(sample);
 c=settle(c,sample);assert.equal(c.progress.farSurveyed,true);assert.equal(c.progress.richSampled,true);assert.equal(c.progress.rivalSeen,true);assert.equal(c.directive,'auto');
 c={...c,directive:'surveyOutpost'};const site=createWorld(c);for(let n=0;n<5000&&site.phase!=='done';n++)step(site);
 const established=settle(c,site);assert.equal(established.progress.outpostSurveyed,true);assert.equal(established.directive,'auto');assert.ok(buy({...established,credits:300},'outpost'));
});
test('v3 save migration retains existing technology and does not infer progress from round count',()=>{
 const old={version:3,credits:3,drones:3,scanner:true,hull:true,laser:true,rounds:25,total:390,cargoBay:false,prospector:false,drive:false,guards:0,outpost:false,launchSite:'home'};
 const migrated=parseSave(JSON.stringify(old));assert.equal(migrated.rounds,25);assert.equal(migrated.progress.richSampled,false);assert.equal(migrated.credits,3);
 const advanced=parseSave(JSON.stringify({...old,guards:1,outpost:true}));assert.equal(advanced.guards,1);assert.equal(advanced.progress.rivalSeen,true);assert.equal(advanced.progress.outpostSurveyed,true);
 const c=freshCompany();assert.deepEqual(parseSave(JSON.stringify({...c,rockHp:{0:-1}})),freshCompany());
});
