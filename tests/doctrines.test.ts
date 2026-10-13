import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,step,ROUND_TIME,type Company} from '../src/sim.ts';
import {parseSave} from '../src/storage.ts';
import {doctrineIds,validDoctrine} from '../src/doctrines.ts';

test('all four doctrine choices save, invalid choices default, and a launched mission snapshots the choice',()=>{
 assert.equal(doctrineIds.length,4);
 for(const doctrine of doctrineIds){
  const company={...freshCompany(),doctrine};
  assert.equal(parseSave(JSON.stringify(company)).doctrine,doctrine);
  const mission=createWorld(company);company.doctrine='standard';
  assert.equal(mission.doctrine,doctrine);
 }
 assert.equal(validDoctrine('mystery'),'standard');
 assert.equal(parseSave(JSON.stringify({...freshCompany(),doctrine:'mystery'})).doctrine,'standard');
 const {doctrine:_,...oldSave}=freshCompany();
 assert.equal(parseSave(JSON.stringify(oldSave)).doctrine,'standard');
});

test('full contact uses actual ram impacts even with fleet lasers, standard retains ranged mining',()=>{
 const setup=(doctrine:Company['doctrine'])=>createWorld({...freshCompany(),laser:true,hull:true,doctrine});
 const baseline=setup('standard'),aggressive=setup('fullContact');
 for(let i=0;i<1200;i++){step(baseline);step(aggressive);}
 assert.equal(baseline.collisions,0);
 assert.ok(aggressive.collisions>0);
 assert.ok(aggressive.shots>0,'the fleet-wide laser remains usable after ramming is unsafe');
 assert.ok(aggressive.extracted>0);
});

test('careful miners select the safer viable rock and disengage from close hostiles',()=>{
 const c={...freshCompany(),laser:true};
 const setup=(doctrine:Company['doctrine'])=>{
  const w=createWorld({...c,doctrine}),d=w.drones[0];
  w.rocks=[{id:40,x:310,y:400,r:22,hp:60,max:60,shape:[]},{id:41,x:100,y:400,r:22,hp:60,max:60,shape:[]}];
  Object.assign(d,{x:205,y:400,hp:2});
  w.wave=1;w.enemies=[{id:0,x:345,y:405,vx:0,vy:0,hp:3,cooldown:5,path:[],pathKey:'',pathAge:0}];
  step(w);return w;
 };
 const standard=setup('standard'),careful=setup('careful');
 assert.equal(standard.drones[0].pathKey,'rock40');
 assert.equal(careful.drones[0].pathKey,'retreat');
 assert.ok(careful.disengagements>0);
 const safe=createWorld({...c,doctrine:'careful'});step(safe);
 assert.ok(safe.drones[0].pathKey.startsWith('rock'),'no threat means productive mining');
 const choose=(doctrine:Company['doctrine'])=>{
  const w=createWorld({...c,doctrine}),d=w.drones[0];
  w.rocks=[{id:40,x:310,y:400,r:22,hp:60,max:60,shape:[]},{id:41,x:100,y:400,r:22,hp:60,max:60,shape:[]}];
  Object.assign(d,{x:215,y:400,hp:4});
  w.wave=1;w.enemies=[{id:0,x:415,y:405,vx:0,vy:0,hp:3,cooldown:5,path:[],pathKey:'',pathAge:0}];
  step(w);return d.pathKey;
 };
 assert.equal(choose('standard'),'rock40');
 assert.equal(choose('careful'),'rock41');
});

test('convoy miners prefer a peer region, while standard spreads to its closest target',()=>{
 const setup=(doctrine:Company['doctrine'])=>{
  const w=createWorld({...freshCompany(),drones:2,laser:true,doctrine});
  w.rocks=[{id:40,x:100,y:400,r:20,hp:100,max:100,shape:[]},{id:41,x:285,y:400,r:20,hp:100,max:100,shape:[]}];
  Object.assign(w.drones[0],{x:98,y:500,targetRock:40,targetHold:0});
  Object.assign(w.drones[1],{x:220,y:500,targetRock:-1});
  step(w);return w;
 };
 assert.equal(setup('standard').drones[1].pathKey,'rock41');
 assert.equal(setup('convoy').drones[1].pathKey,'rock40');
});

test('convoy escorts prioritize a threat to miners but still fire at available foes',()=>{
 const setup=(doctrine:Company['doctrine'])=>{
  const w=createWorld({...freshCompany(),guards:1,doctrine});w.rocks=[];w.wave=2;
  Object.assign(w.drones[0],{x:710,y:510,cargo:4});Object.assign(w.guards[0],{x:430,y:510,cooldown:0});
  w.enemies=[{id:0,x:395,y:510,vx:0,vy:0,hp:3,cooldown:5,path:[],pathKey:'',pathAge:0},
    {id:1,x:675,y:510,vx:0,vy:0,hp:3,cooldown:5,path:[],pathKey:'',pathAge:0}];
  step(w);return w;
 };
 const standard=setup('standard'),convoy=setup('convoy');
 assert.ok(standard.guards[0].vx<0,'standard moves to the closest foe');
 assert.ok(convoy.guards[0].vx>0,'convoy moves to the threat near miners');
 assert.equal(convoy.enemies[0].hp,2,'available in-range enemy is still engaged');
});

test('each doctrine resolves outpost recall and total fleet destruction',()=>{
 for(const doctrine of doctrineIds){
  const c={...freshCompany(),doctrine,drones:6,laser:true,outpost:true,launchSite:'far' as const};
  const returned=createWorld(c);returned.time=ROUND_TIME;
  for(const d of returned.drones){d.cargo=12;d.state='return';d.x=535;d.y=600;}
  for(let i=0;i<1200&&returned.phase!=='done';i++)step(returned);
  assert.equal(returned.phase,'done',doctrine);assert.equal(returned.delivered,72);
  const lost=createWorld({...c,drones:1});lost.drones[0].state='dead';
  for(let i=0;i<200&&lost.phase!=='done';i++)step(lost);
  assert.equal(lost.phase,'done',doctrine);
 }
});

test('identical advanced fleet and seed yield different autonomous decisions',()=>{
 const base={...freshCompany(),drones:4,laser:true,hull:true,guards:1,outpost:true,launchSite:'far' as const,
  progress:{...freshCompany().progress,richSampled:true,outpostSurveyed:true}};
 const results=doctrineIds.map(doctrine=>{
  const w=createWorld({...base,doctrine},7);
  for(let n=0;n<4900&&w.phase!=='done';n++)step(w);
  assert.equal(w.phase,'done');
  return {doctrine,ram:w.collisions,disengagements:w.disengagements,delivered:w.delivered,intercepts:w.intercepts};
 });
 const standard=results.find(r=>r.doctrine==='standard')!,contact=results.find(r=>r.doctrine==='fullContact')!,careful=results.find(r=>r.doctrine==='careful')!;
 assert.equal(standard.ram,0);assert.ok(contact.ram>0);
 assert.ok(careful.disengagements>0);
 assert.ok(new Set(results.map(r=>r.delivered)).size>=3,JSON.stringify(results));
});
