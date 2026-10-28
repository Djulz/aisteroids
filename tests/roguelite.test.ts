import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,stepRun,buySlot,buyHull,buyTurret,chooseTech,units,alive,usedCapacity,ECONOMY,TECH,ROGUE_SAVE_KEY,serializeRun,restoreRun,spawnEnemy,hasIncomeRoute,checkResult,eligibleTech,raidsReady,threat,type Run,type Tech} from '../src/roguelite.ts';
import {STEP,HOME,step,dockingSpots} from '../src/sim.ts';
import {ENEMY_TYPES} from '../src/patrols.ts';
import {SAVE_KEY} from '../src/storage.ts';
const advance=(r:Run,n:number)=>{for(let i=0;i<n;i++)stepRun(r);};
const install=(r:Run,id:Tech)=>{r.draft=[id];assert.equal(chooseTech(r,id),true);};
test('rogue starter is free exactly once, while replacements cost fixed Credits and capacity survives deaths',()=>{
 const r=newRun();assert.equal(r.credits,0);assert.equal(usedCapacity(r),1);r.world.drones[0].hp=0;r.world.drones[0].state='dead';assert.equal(buyHull(r,'miner'),false);r.credits=20;assert.equal(buyHull(r,'miner'),true);assert.equal(r.credits,0);assert.equal(r.slots,1);assert.equal(usedCapacity(r),1);
 r.credits=100;assert.equal(buySlot(r),true);assert.equal(r.slots,2);assert.equal(r.credits,80);assert.equal(buyHull(r,'fighter'),true);assert.equal(r.credits,25);r.world.guards[0].hp=0;assert.equal(r.slots,2);assert.equal(usedCapacity(r),1);r.credits=55;assert.equal(buyHull(r,'fighter'),true);assert.equal(r.credits,0);
 assert.equal(newRun().world.drones.length,1);
});
test('all hulls have immutable specialization and fixed prices independent of living fleet counts',()=>{
 const r=newRun();r.credits=1000;buySlot(r);buySlot(r);const miner=r.world.drones[0];assert.equal(buyHull(r,'fighter'),true);assert.equal(r.hulls[miner.id],'miner');assert.equal(r.hulls[r.world.guards[0].id],'fighter');const before=r.credits;assert.equal(buyHull(r,'fighter'),true);assert.equal(before-r.credits,55);assert.equal(buyHull(r,'fighter'),false);assert.equal(r.world.drones[0].kind,'impactMiner');assert.equal(buyHull(r,'laserMiner' as never),false);
});
test('physical deposit happens before Credit, and ordinary ore never drafts Tech',()=>{
 const r=newRun(),d=r.world.drones[0];d.cargo=3;d.state='return';assert.equal(r.credits,0);advance(r,1);assert.equal(r.credits,0);
 d.state='unload';d.unloadTime=0;d.unloadCargo=3;advance(r,20);assert.equal(r.credits,0);advance(r,100);assert.equal(r.credits,3);assert.equal(r.draft.length,0);assert.equal(r.items.length,0);
});
test('a docked damaged Miner repairs for real time and redeploys only at full health',()=>{
 const r=newRun(),d=r.world.drones[0];d.hp=3;d.state='docked';advance(r,60);assert.equal(d.state,'docked');assert.ok(d.hp>4.9&&d.hp<5.1);advance(r,360);assert.notEqual(d.state,'docked');assert.ok(d.hp>=14);
});
test('Tech caches must be physically collected and delivered, then draft once and freeze clock',()=>{
 const r=newRun(),d=r.world.drones[0];r.items=[{id:0,x:d.x,y:d.y,state:'ground',carrier:null}];advance(r,1);assert.equal(r.items[0].state,'carried');assert.equal(r.draft.length,0);
 const spot=dockingSpots(HOME)[0];d.x=spot.x;d.y=spot.y;d.state='unload';d.unloadCargo=0;advance(r,1);assert.equal(r.items[0].state,'delivered');assert.equal(r.draft.length,3);assert.equal(new Set(r.draft).size,3);const t=r.world.time;advance(r,100);assert.equal(r.world.time,t);assert.equal(chooseTech(r,'twin'),false);const chosen=r.draft[0];assert.equal(chooseTech(r,chosen),true);advance(r,2);assert.equal(r.draft.length,0);assert.equal(r.tech.length,1);assert.equal(chooseTech(r,chosen),false);
});
test('a destroyed Tech carrier loses its unique discovery without a reward',()=>{
 const r=newRun(),d=r.world.drones[0];r.items=[{id:0,x:d.x,y:d.y,state:'carried',carrier:d.id}];d.hp=0;d.state='dead';advance(r,1);assert.equal(r.items[0].state,'lost');assert.equal(r.draft.length,0);assert.equal(r.tech.length,0);
});
test('enemy archetypes have fixed stats and a real two-hardpoint attack doubles damage',()=>{
 const single=newRun(7),twin=newRun(7);let hp:number[]=[];
 for(const [r,kind] of [[single,'rogueRaider'],[twin,'rogueTwin']] as const){
  const w=r.world,d=w.drones[0];w.rocks=[];w.scouts=[];w.guards=[];d.state='mine';d.hp=d.maxHp=100;d.x=HOME.x;d.y=HOME.y;
  w.enemies=[{id:999,kind,x:HOME.x,y:HOME.y-95,vx:0,vy:0,hp:ENEMY_TYPES[kind].hp,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,mode:'pursue',targetKey:'miner:0',alertUntil:0}];
  stepRun(r);hp.push(d.hp);const shots=w.effects.filter(e=>e.type==='enemyShot');assert.equal(shots.length,kind==='rogueTwin'?2:1);if(shots.length===2)assert.notEqual(shots[0].x,shots[1].x);
 }
 assert.equal(100-hp[1],(100-hp[0])*2);
 const r=newRun();spawnEnemy(r,'rogueTwin');const a=r.world.enemies.at(-1)!;r.world.time=800;r.tech=['chain','kinetic','nanite','reactive'];spawnEnemy(r,'rogueTwin');const b=r.world.enemies.at(-1)!;assert.equal(a.hp,b.hp);assert.equal(b.hp,ENEMY_TYPES.rogueTwin.hp);
});
test('bankruptcy includes Fighter-only operations but never preempts a pending viable deposit',()=>{
 const r=newRun();r.credits=75;buySlot(r);buyHull(r,'fighter');r.world.drones[0].hp=0;r.world.drones[0].state='dead';assert.equal(r.world.guards.length,1);assert.equal(hasIncomeRoute(r),false);r.world.effects.push({type:'transfer',x:HOME.x,y:HOME.y,tx:HOME.x,ty:HOME.y,life:.1,max:.35,amount:20,items:Array.from({length:20},()=>({mineral:'ferrite'}))});assert.equal(hasIncomeRoute(r),true);advance(r,10);assert.equal(r.credits,20);assert.equal(r.result,null);assert.equal(buyHull(r,'miner'),true);
});
test('a repairable empty Miner and an affordable replacement are viable income routes',()=>{
 const r=newRun();r.world.drones[0].state='docked';r.world.drones[0].hp=1;assert.equal(hasIncomeRoute(r),true);r.world.drones[0].hp=0;r.world.drones[0].state='dead';assert.equal(hasIncomeRoute(r),false);r.credits=20;assert.equal(hasIncomeRoute(r),true);r.credits=19;checkResult(r);assert.equal(r.result,'Bankruptcy');
});
test('pause, inactive tabs, Tech choice and save/resume stop threat without offline catch-up',()=>{
 const r=newRun();advance(r,10);const before=r.world.time;r.paused=true;advance(r,120);assert.equal(r.world.time,before);r.paused=false;stepRun(r,STEP,false);assert.equal(r.world.time,before);r.draft=['chain','nanite','relay'];advance(r,120);assert.equal(r.world.time,before);
 const loaded=restoreRun(serializeRun(r))!;assert.ok(loaded);assert.equal(loaded.world.time,before);assert.deepEqual(loaded.draft,r.draft);assert.equal(loaded.paused,true);advance(loaded,120);assert.equal(loaded.world.time,before);assert.notEqual(ROGUE_SAVE_KEY,SAVE_KEY);assert.notEqual(ROGUE_SAVE_KEY,'aisteroids-roguelite-pass01-v1');assert.equal(restoreRun('{bad'),null);assert.equal(restoreRun('{}'),null);
});
test('mid-trip save restores physical cargo, ledgers, repair, seed and deterministic next steps',()=>{
 const r=newRun(42);advance(r,1500);r.draft=[];r.world.drones[0].cargo=2;const copy=restoreRun(serializeRun(r))!;assert.ok(copy);copy.paused=false;advance(r,180);advance(copy,180);assert.equal(copy.world.time,r.world.time);assert.equal(copy.credits,r.credits);assert.equal(copy.world.drones[0].cargo,r.world.drones[0].cargo);assert.ok(Math.abs(copy.world.drones[0].x-r.world.drones[0].x)<5);assert.equal(copy.seed,42);
});
test('victory stops the run and New Run resets all run power, director state and free starter',()=>{
 const r=newRun();r.bossId=999;r.world.enemies=[{id:999,kind:'rogueBoss',x:1000,y:1000,vx:0,vy:0,hp:0,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0}];checkResult(r);assert.equal(r.result,'Victory');const t=r.world.time;advance(r,120);assert.equal(r.world.time,t);const n=newRun(r.seed);assert.equal(n.tech.length,0);assert.equal(n.credits,0);assert.equal(n.slots,1);assert.equal(n.bossId,null);assert.equal(n.world.time,0);assert.equal(units(n).filter(alive).length,1);
});
test('eligible drafts contain only functional owned hull upgrades, all twelve implementations exist',()=>{
 const r=newRun();assert.equal(Object.keys(TECH).length,12);assert.ok(!eligibleTech(r).includes('twin'));assert.ok(!eligibleTech(r).includes('echo'));r.credits=200;buySlot(r);buyHull(r,'fighter');assert.ok(eligibleTech(r).includes('twin'));install(r,'overdrive');assert.equal(r.world.drones[0].maxHp,12);assert.ok(r.world.drones[0].gear.speed>1);install(r,'kinetic');assert.ok(r.world.drones[0].gear.ramCooldown<1);assert.ok(r.world.company.talents.includes('heavyHead'));assert.ok(!eligibleTech(r).includes('kinetic'));
});
test('magnetic collection pulls physical fragments and Scout Echo reveals a wider real area',()=>{
 const r=newRun(),d=r.world.drones[0];r.world.rocks=[];r.world.ores=[{id:555,x:d.x+70,y:d.y,value:1,mineral:'ferrite',age:1}];install(r,'magnetic');stepRun(r);assert.ok(r.world.ores[0].x<d.x+70);assert.equal(r.credits,0);
 r.credits=100;buySlot(r);buyHull(r,'scout');const s=r.world.scouts[0];install(r,'echo');stepRun(r);assert.ok(hasCell(r.world.visible,s.x+300,s.y));
});
import {hasCell} from '../src/knowledge.ts';
test('Fighter Twin Guns, Escort Drones and Reactive Hull each deal actual distinct damage',()=>{
 for(const tech of ['twin','drones','reactive'] as const){
  const r=newRun();r.credits=100;buySlot(r);buyHull(r,'fighter');const w=r.world,d=w.drones[0],g=w.guards[0];w.rocks=[];d.x=HOME.x;d.y=HOME.y;d.hp=d.maxHp=100;g.x=HOME.x;g.y=HOME.y;g.cooldown=tech==='drones'?100:0;
  const e={id:999,kind:'rogueRaider' as const,x:HOME.x,y:HOME.y-95,vx:0,vy:0,hp:100,cooldown:tech==='reactive'?0:100,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,mode:'pursue' as const,targetKey:'miner:0',alertUntil:0};w.enemies=[e];install(r,tech);stepRun(r);
  if(tech==='twin'){assert.equal(e.hp,98);const shots=w.effects.filter(e=>e.type==='guardShot');assert.equal(shots.length,2);assert.ok(Math.hypot(shots[0].x-shots[1].x,shots[0].y-shots[1].y)>10);}
  if(tech==='drones'){assert.equal(e.hp,99);assert.equal(w.effects.filter(e=>e.type==='guardShot').length,2);}
  if(tech==='reactive'){assert.ok(e.hp<=97);assert.ok(Object.keys(r.reactiveReady).length>0);assert.ok(e.disabledUntil>w.time);}
 }
});
test('Nanite Delivery repairs physical unloading, Cargo Relay shortens it, and Emergency Retreat changes return behavior',()=>{
 const nanite=newRun(),d=nanite.world.drones[0];d.state='unload';d.unloadTime=1.14;d.unloadCargo=3;d.cargo=0;d.hp=5;install(nanite,'nanite');stepRun(nanite);assert.equal(d.hp,9);assert.equal(d.state,'docked');
 const plain=newRun(),relay=newRun();for(const r of [plain,relay]){const m=r.world.drones[0];m.state='unload';m.unloadTime=0;m.unloadCargo=3;m.cargo=3;}install(relay,'relay');advance(plain,40);advance(relay,40);assert.equal(plain.world.drones[0].state,'unload');assert.notEqual(relay.world.drones[0].state,'unload');
 const retreat=newRun(),m=retreat.world.drones[0];install(retreat,'emergency');m.hp=7;stepRun(retreat);assert.equal(m.state,'return');assert.equal(m.gear.returnSpeed,1.4);
});
test('Salvage Bonus creates collectable physical Nickel instead of instant Credits',()=>{
 const r=newRun();install(r,'salvage');r.world.enemies=[{id:999,kind:'rogueRaider',x:HOME.x+80,y:HOME.y-40,vx:0,vy:0,hp:0,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0}];stepRun(r);assert.equal(r.world.ores.filter(o=>o.mineral==='nickel').length,3);assert.equal(r.credits,0);stepRun(r);assert.equal(r.world.ores.filter(o=>o.mineral==='nickel').length,3);
});
test('Chain Shatter actually mines a second asteroid and Kinetic Ram extracts four primary fragments',()=>{
 for(const tech of ['chain','kinetic'] as const){
  const r=newRun(),w=r.world,d=w.drones[0],shape=w.rocks[0].shape;
  w.rocks=[{id:900,x:HOME.x+100,y:HOME.y-150,r:16,hp:20,max:20,shape,mineral:'ferrite'},{id:901,x:HOME.x+165,y:HOME.y-150,r:16,hp:20,max:20,shape,mineral:'ferrite'}];
  w.explored.fill(255);d.x=HOME.x+35;d.y=HOME.y-150;d.angle=0;d.vx=60;d.vy=0;install(r,tech);
  for(let i=0;i<600&&w.collisions===0;i++)stepRun(r);
  assert.ok(w.collisions>0);
  if(tech==='chain'){assert.equal(w.rocks[0].hp,17);assert.equal(w.rocks[1].hp,19);assert.equal(w.extracted,4);}
  else{assert.equal(w.rocks[0].hp,16);assert.equal(w.extracted,4);}
 }
});
test('the active enemy budget stays bounded even when the Captain arrives',()=>{
 const r=newRun();r.world.rocks=[];for(let i=0;i<20;i++)spawnEnemy(r,'rogueRaider');assert.equal(r.world.enemies.filter(e=>e.hp>0).length,ECONOMY.maxEnemies);assert.ok(spawnEnemy(r,'rogueBoss'));assert.equal(r.world.enemies.filter(e=>e.hp>0).length,ECONOMY.maxEnemies);
});
test('seed 7 can afford and deploy its first Fighter before the opening raid',()=>{
 const r=newRun(7);let firstEnemyAt:number|null=null,firstFighterAt:number|null=null;
 for(let tick=0;tick<60*360&&!r.result&&firstEnemyAt===null;tick++){
  if(r.draft.length)chooseTech(r,r.draft[0]);
  if(r.slots===1&&r.credits>=20)buySlot(r);
  if(r.slots===2&&!r.world.guards.some(alive)&&r.credits>=55){buyHull(r,'fighter');firstFighterAt=r.world.time;}
  stepRun(r);
  if(r.world.enemies.some(e=>e.hp>0))firstEnemyAt=r.world.time;
 }
 assert.ok(firstFighterAt!==null&&firstFighterAt>=ECONOMY.firstRaid);
 assert.ok(firstEnemyAt!==null&&firstEnemyAt>=firstFighterAt);
 assert.equal(r.lost,0);
});
test('opening grace follows delivered economy, and threat ramps from the first raid window',()=>{
 const r=newRun(42);r.world.time=ECONOMY.firstRaid;
 assert.equal(raidsReady(r),false);assert.equal(threat(r).tier,1);
 r.deliveredCredits=145;assert.equal(raidsReady(r),true);
 r.deliveredCredits=160;r.world.time+=90;assert.equal(threat(r).tier,2);
 r.deliveredCredits=280;r.world.time+=120;assert.equal(threat(r).tier,3);
 const slow=newRun(1337);slow.world.time=479;assert.equal(raidsReady(slow),false);slow.world.time=480;assert.equal(raidsReady(slow),true);
});
test('near rocks shatter quickly while surveyed outer Nickel supports a second economy',()=>{
 const r=newRun(7),near=r.world.rocks.filter(x=>Math.hypot(x.x-HOME.x,x.y-HOME.y)<350),outer=r.world.rocks.filter(x=>Math.hypot(x.x-HOME.x,x.y-HOME.y)>700);
 assert.ok(near.length>15&&near.every(x=>x.hp<=10));
 assert.ok(outer.length>20&&outer.every(x=>x.mineral==='nickel'));
 assert.ok(outer.reduce((n,x)=>n+x.hp*3,0)>near.reduce((n,x)=>n+x.hp,0));
});
test('Captain progress counts physical outer cargo, not nearby Nickel',()=>{
 const r=newRun(7),w=r.world,d=w.drones[0];w.rocks=[];d.state='unload';d.unloadTime=1.14;d.unloadCargo=2;d.cargoItems=[{mineral:'nickel',originDistance:500},{mineral:'nickel',originDistance:820}];
 advance(r,30);assert.equal(w.deliveredByMineral.nickel,2);assert.equal(w.rogueOuterDelivered,1);assert.equal(r.deliveredCredits,6);
});
test('Scout has a separate recon bay, and HQ Turret is a paid defensive route',()=>{
 const r=newRun(7);r.credits=100;
 assert.equal(buyHull(r,'scout'),true);assert.equal(usedCapacity(r),1);assert.equal(buyHull(r,'scout'),false);
 assert.equal(buyTurret(r),true);assert.equal(r.credits,40);assert.equal(r.world.company.turret,true);assert.equal(buyTurret(r),false);
 r.world.time=ECONOMY.firstRaid;assert.equal(raidsReady(r),true);
});
test('pirates keep firing distance and attack a vulnerable HQ',()=>{
 const close=newRun(7),far=newRun(7);
 for(const [r,offset] of [[close,25],[far,100]] as const){
  const w=r.world;w.rocks=[];w.drones[0].x=HOME.x+600;w.drones[0].y=HOME.y;w.enemies=[{id:999,kind:'rogueRaider',x:HOME.x,y:HOME.y-offset,vx:0,vy:0,hp:4,cooldown:0,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,mode:'pursue',targetKey:'hq',alertUntil:0}];stepRun(r);
 }
 assert.equal(close.world.hqHp,40);assert.ok((far.world.hqHp??40)<40);
 const lost=newRun();lost.world.hqHp=0;checkResult(lost);assert.equal(lost.result,'HQ Lost');
});
test('a Fighter returns to intercept a pirate threatening HQ while the Miner works elsewhere',()=>{
 const r=newRun(7),w=r.world;r.credits=75;buySlot(r);buyHull(r,'fighter');
 w.rocks=[];w.ores=[{id:900,x:HOME.x+600,y:HOME.y,value:1,mineral:'ferrite',age:1}];
 w.drones[0].x=HOME.x+600;w.drones[0].y=HOME.y;
 const g=w.guards[0];g.x=HOME.x;g.y=HOME.y;
 const e={id:999,kind:'rogueRaider' as const,x:HOME.x+180,y:HOME.y,vx:0,vy:0,hp:4,cooldown:100,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,home:{x:HOME.x+180,y:HOME.y},mode:'patrol' as const};w.enemies=[e];
 advance(r,480);assert.ok(w.intercepts>0);assert.ok(e.hp<4);
});
test('exhausted unique Tech choices offer working levels and never strand the cache carrier',()=>{
 const r=newRun(),d=r.world.drones[0];r.tech=['chain','magnetic','kinetic','nanite','emergency','relay','overdrive','salvage','reactive'];
 assert.equal(eligibleTech(r).length,3);assert.equal(new Set(eligibleTech(r)).size,3);
 d.x=HOME.x;d.y=HOME.y-72;d.state='unload';d.unloadCargo=3;d.cargo=3;d.unloadTime=0;d.hp=1;
 r.items=[{id:0,x:d.x,y:d.y,state:'carried',carrier:d.id}];stepRun(r);assert.equal(r.items[0].state,'delivered');assert.equal(r.draft.length,3);assert.ok(r.draft.includes('nanite'));assert.equal(chooseTech(r,'nanite'),true);
 d.unloadTime=1.14;stepRun(r);assert.equal(d.hp,9);assert.equal(r.draft.length,0);assert.equal(r.items[0].state,'delivered');
});
