import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,createWorld,freshCompany,lockTarget,clearTarget,step,settle,updateKnowledge,visibleAt,exploredAt,ROUND_TIME,STEP,type World} from '../../src/sim.ts';
import {changeFleet,usedSlots,fleetError} from '../../src/fleet.ts';
import {POIS,mapCount,setCell} from '../../src/knowledge.ts';
const run=(w:World)=>{for(let i=0;i<9000&&w.phase!=='done';i++)step(w);assert.equal(w.phase,'done');return w;};
const fleet=(scouts:number,min=1)=>{const c=freshCompany();return {...c,fleetCapacity:min+scouts,fleetComposition:{...c.fleetComposition,impactMiner:min,scout:scouts}};};

test('fresh fog reveals near HQ but hides distant objects, independent of camera and render cadence',()=>{
 const w=createWorld(freshCompany());assert.ok(mapCount(w.explored)>0&&mapCount(w.explored)<300);
 assert.equal(visibleAt(w,w.rocks[0]),true);assert.equal(visibleAt(w,POIS[4]),false);
 assert.equal(exploredAt(w,POIS[4]),false);assert.equal(w.discoveredPois.has(POIS[4].id),false);
 const snapshot=[...w.explored];const camera={x:650,y:800,zoom:.5};camera.x=100;camera.zoom=1.5;
 assert.deepEqual([...w.explored],snapshot);
});
test('Scout consumes a slot, is unarmed and substantially extends survey with an income tradeoff',()=>{
 const c=freshCompany();assert.equal(usedSlots(c.fleetComposition),1);assert.equal(changeFleet(c,'scout',1),null);
 const expanded=buy({...c,credits:28},'fleetSlot')!;const withScout=changeFleet(expanded,'scout',1)!;
 assert.equal(usedSlots(withScout.fleetComposition),2);assert.equal(fleetError({...withScout,fleetComposition:{...withScout.fleetComposition,impactMiner:0}}),'At least one Miner is required to deploy.');
 const two=run(createWorld(fleet(0,2))),onePlus=run(createWorld(withScout));
 assert.ok(mapCount(onePlus.explored)>mapCount(two.explored)*2);
 assert.ok(two.delivered>onePlus.delivered);
 assert.ok(['docked','dead','exploring'].includes(onePlus.scouts[0].state));assert.equal(onePlus.scouts[0].hp,6);
 assert.equal(onePlus.shots,0);assert.equal(onePlus.scouts.length,1);
 assert.ok(onePlus.discoveredPois.size>=two.discoveredPois.size);
 assert.ok(onePlus.pendingTech.every(e=>!POIS.some(p=>p.id===e.id)));
});
test('two Scouts choose distinct frontier targets and survive bounded recall',()=>{
 const w=createWorld(fleet(2));for(let i=0;i<10;i++)step(w);
 assert.notDeepEqual([w.scouts[0].targetX,w.scouts[0].targetY],[w.scouts[1].targetX,w.scouts[1].targetY]);
 run(w);assert.ok(w.scouts.every(s=>s.state==='docked'||s.state==='dead'||w.phase==='done'));
 assert.ok(w.time<ROUND_TIME+180);assert.equal(w.recallFailures,0);
});
test('hostiles damage friendly Scouts; a surviving Scout cannot keep a lost productive fleet alive',()=>{
 const w=createWorld(fleet(1)),s=w.scouts[0],d=w.drones[0];s.hp=1;
 w.enemies.push({id:98,x:s.x+20,y:s.y-10,vx:0,vy:0,hp:3,cooldown:0,path:[],pathKey:'',pathAge:0});step(w);
 assert.equal(s.state,'dead');assert.equal(s.hp,0);
 const stranded=createWorld(fleet(1));stranded.drones[0].state='dead';step(stranded);
 assert.equal(stranded.phase,'aftermath');run(stranded);assert.equal(stranded.delivered,0);
});
test('hidden rocks never become exact Miner targets; local sensor finds new deposits',()=>{
 const w=createWorld(freshCompany());for(const r of w.rocks)if(visibleAt(w,r))r.hp=0;
 for(let i=0;i<20;i++)step(w);
 assert.equal(w.drones[0].targetRock,-1);
 const hidden=w.rocks.find(r=>r.hp>0&&!visibleAt(w,r))!;w.drones[0].x=hidden.x+hidden.r+40;w.drones[0].y=hidden.y;updateKnowledge(w);
 assert.equal(visibleAt(w,hidden),true);for(let i=0;i<20;i++)step(w);
 assert.ok(w.drones[0].targetRock>=0);assert.ok(visibleAt(w,w.rocks[w.drones[0].targetRock]));
});
test('a previously charted distant rock remains a legal Mine Freely destination',()=>{
 const w=createWorld(freshCompany()),d=w.drones[0],rock=w.rocks.find(r=>r.x>450&&r.y>600)!;
 for(const r of w.rocks)if(r!==rock)r.hp=0;
 assert.equal(visibleAt(w,rock),false);setCell(w.explored,rock.x,rock.y);
 for(let i=0;i<10;i++)step(w);
 assert.equal(d.targetRock,rock.id);assert.equal(w.pendingTech.some(e=>POIS.some(p=>p.id===e.id)),false);
});
test('live target can retarget and clear without influencing Miners or carrying into a new mission',()=>{
 const c={...freshCompany(),fleetCapacity:2,fleetComposition:{...freshCompany().fleetComposition,escort:1},unlockedTypes:['impactMiner','escort'],progress:{...freshCompany().progress,rivalSeen:true}};
 const w=createWorld(c),[a,b]=POIS;assert.equal(lockTarget(w,a.id).ok,false);w.discoveredPois.add(a.id);w.discoveredPois.add(b.id);
 assert.equal(lockTarget(w,a.id).ok,true);assert.equal(w.activeTarget,a.id);const miner=w.drones[0];const before=miner.targetRock;
 step(w);assert.equal(w.activeTarget,a.id);assert.equal(miner.state,'mine');assert.ok(miner.targetRock===before||miner.targetRock>=0);
 assert.equal(lockTarget(w,b.id).ok,true);assert.equal(w.activeTarget,b.id);assert.equal(w.investigationTime,0);
 clearTarget(w);assert.equal(w.activeTarget,null);assert.equal(w.pendingTech.length,0);assert.equal(settle(c,w).discoveredPois.length,2);
 assert.equal(createWorld(settle(c,w)).activeTarget,null);
});
test('early progression works from Mine Freely and same-step replays are deterministic',()=>{
 let c=freshCompany(),first:World|undefined;for(let i=0;i<5;i++){const w=run(createWorld(c,c.worldSeed));first??=w;c=settle(c,w);}
 assert.ok(c.credits>=28);assert.equal(c.rounds,5);assert.equal(first!.delivered>=8,true);
 const a=createWorld(fleet(1)),b=createWorld(fleet(1));for(let i=0;i<1800;i++){step(a);step(b);}
 assert.deepEqual([a.delivered,a.extracted,a.pendingTech,a.newSignals,[...a.explored],a.scouts.map(s=>[s.x,s.y,s.state])],[b.delivered,b.extracted,b.pendingTech,b.newSignals,[...b.explored],b.scouts.map(s=>[s.x,s.y,s.state])]);
});
test('autonomous Scout charts the frontier and investigates signals amid early rivals',()=>{
 let c=freshCompany(),slotRound=0,farRound=0,richRound=0,rivalRound=0,outpostRound=0;
 for(let round=1;round<=35;round++){
  c=settle(c,run(createWorld(c,c.worldSeed)));
  if(!slotRound&&c.credits>=28){slotRound=round;c=changeFleet(buy(c,'fleetSlot')!,'scout',1)!;}
  if(!farRound&&c.progress.farSurveyed)farRound=round;
  if(!richRound&&c.progress.richSampled)richRound=round;
  if(!rivalRound&&c.progress.rivalSeen)rivalRound=round;
  if(!outpostRound&&c.progress.outpostSurveyed)outpostRound=round;
 }
 assert.ok(slotRound>=2&&slotRound<=5);assert.ok(farRound&&richRound&&rivalRound);assert.ok(c.discoveredPois.length>=2);
 assert.equal(c.uniqueTechDiscoveries.includes('first_rival_contact'),true);
});
test('an ignored discovered signal survives a completed shift without becoming a Tech award',()=>{
 const c={...fleet(0),enduranceLevel:3},w=createWorld(c),site=POIS[0].id;w.drones[0].x=POIS[0].x;w.drones[0].y=POIS[0].y;updateKnowledge(w);run(w);assert.ok(w.discoveredPois.has(site));
 assert.equal(w.pendingTech.some(e=>e.id===site),false);
 const next=createWorld(settle(c,w));assert.equal(next.discoveredPois.has(site),true);
 assert.equal(next.activeTarget,null);assert.match(lockTarget(next,site).reason!,/Escort/);
});
