import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,createWorld,freshCompany,settle,step,STEP,type Company} from '../src/sim.ts';
import {configureDrone,fleetError,fleetForCounts,renameDrone} from '../src/fleet.ts';
import {resolveEquipment,type Loadout} from '../src/engineering.ts';
import {parseSave} from '../src/storage.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';

const equipped=(c:Company,id:string,loadout:Loadout,name?:string):Company=>{
 const result=configureDrone(c,c.fleet,id,name??c.fleet.find(d=>d.id===id)!.name,loadout);
 assert.equal(result.error,undefined);return {...c,fleet:result.fleet!};
};
const base=(c:Company,id:string)=>c.fleet.find(d=>d.id===id)!;
const two=()=>({...freshCompany(),drones:2,fleet:fleetForCounts(2,0)});
const advance=(w:ReturnType<typeof createWorld>,n:number)=>{for(let i=0;i<n&&w.phase!=='done';i++)step(w);};
test('v1–v5 companies retain purchases, world progress and names with standard gear',()=>{
 const legacy={...freshCompany(),version:5,credits:73,drones:3,guards:1,laser:true,scanner:true,hull:true,drive:true,cargoBay:true,rounds:9,total:330,rockHp:{0:23},ores:[{x:120,y:460,value:2,rich:false}],outpost:true,launchSite:'far',doctrine:'convoy',directive:'surveyOutpost',fleet:renameDrone(fleetForCounts(3,1),'miner-2','Pip')!};
 for(const version of [1,2,3,4,5]){
  const input:any={...legacy,version};
  if(version===1)input.blaster=true;
  const saved=parseSave(JSON.stringify(input));
  assert.equal(saved.version,6);assert.equal(saved.credits,73);assert.equal(saved.drones,3);
  if(version>=3){assert.equal(saved.guards,1);assert.equal(saved.fleet.length,4);}
  if(version>=4){assert.equal(saved.ores.length,1);assert.equal(saved.rockHp[0],version===4?92:23);assert.equal(saved.doctrine,'convoy');}
  if(version===5)assert.equal(saved.fleet[1].name,'Pip');
  assert.ok(saved.fleet.every(d=>d.frame==='standard'&&d.modules.every(m=>m===null)));
 }
 const migrated=parseSave(JSON.stringify(legacy));assert.deepEqual(parseSave(JSON.stringify(migrated)),migrated);
});
test('purchases create exactly one identity each; role swaps use paid escort capacity',()=>{
 let c={...freshCompany(),credits:1000,progress:{...freshCompany().progress,rivalSeen:true}};
 const first=c.fleet[0].id;c=buy(c,'drone')!;assert.deepEqual(c.fleet.map(d=>d.id),[first,'miner-2']);
 c=buy(c,'guard')!;assert.deepEqual(c.fleet.map(d=>d.id),[first,'miner-2','escort-1']);
 assert.equal(c.guards,1);assert.equal(c.fleet.length,3);
 const originallyEscorted=base(c,'escort-1');
 const blocked=configureDrone(c,c.fleet,'miner-2','SPARK-02',{role:'escort',frame:'standard',modules:[null,null]});
 assert.match(blocked.error!,/Escort slot/);
 c=equipped(c,'escort-1',{role:'miner',frame:'standard',modules:[null,null]});
 c=equipped(c,'miner-2',{role:'escort',frame:'standard',modules:[null,null]});
 assert.equal(base(c,'escort-1').id,originallyEscorted.id);assert.equal(base(c,'escort-1').name,originallyEscorted.name);
 assert.equal(createWorld(c).guards[0].identityId,'miner-2');
 assert.equal(createWorld(c).drones.length,2);assert.equal(c.drones+c.guards,3);
 const withoutMiner=c.fleet.map(d=>({...d,role:'escort' as const}));assert.match(fleetError(c,withoutMiner)!,/Escort slot/);
 assert.match(fleetError(c,[...c.fleet,{...c.fleet[0],id:'ghost'}].slice(1))!,/identity/);
});
test('frames and modules are validated, survive reload and remain individual',()=>{
 let c={...two(),guards:1,laser:true,progress:{...freshCompany().progress,rivalSeen:true},fleet:fleetForCounts(2,1)};
 c=equipped(c,'miner-1',{role:'miner',frame:'heavy',modules:['impactProw','extendedOptics']},'BULT-01');
 c=equipped(c,'miner-2',{role:'miner',frame:'light',modules:['emergencyThrusters','kineticRegulator']},'SPARK-02');
 c=equipped(c,'escort-1',{role:'escort',frame:'heavy',modules:['longBarrel','targetingComputer']});
 const world=createWorld(c);assert.equal(world.drones[0].name,'BULT-01');assert.equal(world.drones[0].maxHp,6);
 assert.equal(world.drones[1].maxHp,3);assert.equal(world.drones[1].gear.cargo,9);
 assert.equal(world.guards[0].gear.guardRange,135*1.23);
 assert.equal(world.guards[0].identityId,'escort-1');
 const saved=parseSave(JSON.stringify(c));assert.deepEqual(saved.fleet,c.fleet);
 const next=settle(saved,world);assert.deepEqual(next.fleet,c.fleet);
 assert.match(configureDrone(c,c.fleet,'miner-1','BULT-01',{role:'miner',frame:'standard',modules:['impactProw','impactProw']}).error!,/once/);
 assert.match(configureDrone({...c,laser:false},c.fleet,'miner-1','BULT-01',{role:'miner',frame:'standard',modules:['extendedOptics',null]}).error!,/Mining Laser/);
 assert.match(configureDrone(c,c.fleet,'escort-1','GUARD-01',{role:'escort',frame:'standard',modules:['impactProw',null]}).error!,/only for miner/);
 const forged=parseSave(JSON.stringify({...c,laser:false,fleet:c.fleet.map(d=>d.id==='miner-1'?{...d,modules:['extendedOptics','extendedOptics']}:d)}));
 assert.deepEqual(forged.fleet[0].modules,[null,null]);
 const poisoned=parseSave(JSON.stringify({...c,fleet:c.fleet.map(d=>d.id==='miner-1'?{...d,frame:'__proto__',modules:['__proto__',null]}:d)}));
 assert.equal(poisoned.fleet[0].frame,'standard');assert.deepEqual(poisoned.fleet[0].modules,[null,null]);
});
test('light and heavy frames change the movement response and hull of one miner',()=>{
 let c=two();c=equipped(c,'miner-1',{role:'miner',frame:'light',modules:[null,null]});c=equipped(c,'miner-2',{role:'miner',frame:'heavy',modules:[null,null]});
 const w=createWorld(c);w.rocks=[{...w.rocks[0],x:200,y:300}];
 const [light,heavy]=w.drones;Object.assign(light,{x:191,y:523});Object.assign(heavy,{x:191,y:523});
 step(w);assert.ok(Math.hypot(light.vx,light.vy)>Math.hypot(heavy.vx,heavy.vy));
 assert.equal(light.maxHp,3);assert.equal(heavy.maxHp,6);
 assert.equal(resolveEquipment(freshCompany(),freshCompany().fleet[0]).maxHp,4);
});
test('impact prow changes that miner’s legal extraction; regulator changes recovery',()=>{
 let c=two();c=equipped(c,'miner-1',{role:'miner',frame:'standard',modules:['impactProw','kineticRegulator']});
 const w=createWorld(c),r=w.rocks[0];r.hp=50;r.max=50;w.rocks=[r];
 const [fitted,normal]=w.drones;Object.assign(fitted,{x:r.x,y:r.y+r.r+8.5,vy:-67,angle:-Math.PI/2});Object.assign(normal,{x:350,y:550});
 step(w);assert.equal(w.extracted,5);assert.equal(r.hp,45);assert.equal(fitted.cooldown,fitted.gear.ramCooldown);
 assert.ok(fitted.gear.ramRecoil<normal.gear.ramRecoil);assert.ok(fitted.gear.speed<normal.gear.speed);
 const ordinary=createWorld(two()),ore=ordinary.rocks[0],d=ordinary.drones[0];ore.hp=50;ordinary.rocks=[ore];Object.assign(d,{x:ore.x,y:ore.y+ore.r+8.5,vy:-67,angle:-Math.PI/2});ordinary.drones[1].state='dead';step(ordinary);assert.equal(ordinary.extracted,4);
});
test('optics need a purchased laser and extend actual firing range with slower pulses',()=>{
 let c={...two(),laser:true};c=equipped(c,'miner-1',{role:'miner',frame:'standard',modules:['extendedOptics',null]});
 const w=createWorld(c),r=w.rocks[0],extended=w.drones[0],plain=w.drones[1];w.rocks=[r];
 Object.assign(extended,{x:r.x,y:r.y+r.r+99,cooldown:0});Object.assign(plain,{x:350,y:550,cooldown:0});
 step(w);assert.equal(w.shots,1);assert.equal(extended.cooldown,extended.gear.laserCooldown);assert.ok(extended.gear.laserCooldown>plain.gear.laserCooldown);
 const noLaser=parseSave(JSON.stringify({...c,laser:false}));assert.equal(noLaser.fleet[0].modules[0],null);
});
test('emergency thrusters accelerate a real Careful retreat while reducing only fitted cargo',()=>{
 let c={...two(),doctrine:'careful' as const};c=equipped(c,'miner-1',{role:'miner',frame:'standard',modules:['emergencyThrusters',null]});
 const w=createWorld(c);w.wave=1;w.rocks=[];w.ores=[{id:200,x:300,y:200,value:2,age:1}];
 const [fitted,plain]=w.drones;for(const d of w.drones)Object.assign(d,{x:400,y:550,hp:2,vx:0,vy:0,angle:Math.PI});
 w.enemies=[{id:0,x:500,y:550,vx:0,vy:0,hp:3,cooldown:100,path:[],pathKey:'',pathAge:0}];
 for(let i=0;i<6;i++)step(w);
 assert.equal(fitted.gear.cargo,9);assert.equal(plain.gear.cargo,12);
 assert.equal(fitted.pathKey,'retreat');assert.equal(plain.pathKey,'retreat');
 assert.ok(Math.hypot(fitted.vx,fitted.vy)>Math.hypot(plain.vx,plain.vy));
});
test('escort range and target computer alter only equipped guard combat',()=>{
 let c={...two(),guards:2,fleet:fleetForCounts(2,2)};
 c=equipped(c,'escort-1',{role:'escort',frame:'standard',modules:['longBarrel',null]});
 const w=createWorld(c);w.wave=2;w.rocks=[];w.ores=[{id:200,x:700,y:800,value:2,age:1}];
 const [long,plain]=w.guards;Object.assign(long,{x:300,y:550,cooldown:0});Object.assign(plain,{x:300,y:650,cooldown:0});
 w.enemies=[{id:0,x:450,y:550,vx:0,vy:0,hp:3,cooldown:100,path:[],pathKey:'',pathAge:0}];
 step(w);assert.equal(w.intercepts,1);assert.equal(long.cooldown,long.gear.guardCooldown);assert.equal(plain.cooldown,-STEP);
 assert.ok(long.gear.guardCooldown>plain.gear.guardCooldown);
 c=equipped(c,'escort-2',{role:'escort',frame:'standard',modules:['targetingComputer',null]});
 assert.equal(createWorld(c).guards[1].gear.guardTargeting,true);
});
test('targeting computer fires at the in-range threat nearest a miner',()=>{
 const ordinary={...two(),guards:1,fleet:fleetForCounts(2,1)};
 const improved=equipped(ordinary,'escort-1',{role:'escort',frame:'standard',modules:['targetingComputer',null]});
 const scenario=(c:Company)=>{
  const w=createWorld(c);w.wave=2;w.rocks=[];w.ores=[];
  w.guards[0].x=400;w.guards[0].y=550;
  for(const d of w.drones){d.x=500;d.y=550;}
  w.enemies=[385,480].map((x,id)=>({id,x,y:550,vx:0,vy:0,hp:3,cooldown:100,path:[],pathKey:'',pathAge:0}));
  step(w);return w;
 };
 const base=scenario(ordinary),targeted=scenario(improved);
 assert.equal(base.enemies[0].hp,2);assert.equal(base.enemies[1].hp,3);
 assert.equal(targeted.enemies[0].hp,3);assert.equal(targeted.enemies[1].hp,2);
});
test('configured seeded shifts finish, snapshot loadouts and preserve world resources',()=>{
 let c={...two(),guards:1,laser:true,outpost:true,launchSite:'far' as const,fleet:fleetForCounts(2,1)};
 c=equipped(c,'miner-1',{role:'miner',frame:'heavy',modules:['extendedOptics','reinforcedPlating']});
 c=equipped(c,'miner-2',{role:'miner',frame:'light',modules:['kineticRegulator','impactProw']});
 c=equipped(c,'escort-1',{role:'escort',frame:'light',modules:['targetingComputer','longBarrel']});
 for(const doctrine of ['standard','fullContact','careful','convoy'] as const){
  const a=createWorld({...c,doctrine}),b=createWorld({...c,doctrine});c.fleet[0].frame='standard';
  assert.equal(a.drones[0].frame,'heavy','a launched world owns its loadout snapshot');c.fleet[0].frame='heavy';
  advance(a,4800);advance(b,4800);
  assert.equal(a.phase,'done');assert.equal(a.delivered,b.delivered);assert.equal(a.extracted,b.extracted);
  assert.deepEqual(a.drones.map(d=>d.state),b.drones.map(d=>d.state));
  const saved=settle(c,a);assert.equal(saved.fleet[0].frame,'heavy');assert.ok(Object.keys(saved.rockHp).length>0);
 }
});
test('mobile lobby presents real builds, locked engineering and optional Mission Plan',()=>{
 const view:LobbyView={tab:'hangar',selectedId:'miner-1',editing:true,doctrineOpen:false,planOpen:true,error:'',storageOK:true};
 const early=renderLobby(freshCompany(),view);assert.match(early,/first Extra Drone/);assert.match(early,/data-frame="heavy"[^>]*disabled/);
 assert.match(early,/MISSION PLAN/);assert.match(early,/HQ · Free Mining/);assert.doesNotMatch(early,/data-directive=|data-site=|id="change-plan"/);
 let c={...two(),outpost:true,launchSite:'far' as const,scanner:true,doctrine:'convoy' as const};
 c=equipped(c,'miner-1',{role:'miner',frame:'heavy',modules:['impactProw',null]},'BULT-01');
 const html=renderLobby(c,{...view,editing:false});assert.match(html,/BULT-01 · Heavy Miner/);assert.match(html,/Convoy Protocol · Free Mining · Outpost/);assert.match(html,/SCANNER INTEL/);
 assert.equal((html.match(/id="tab-/g)??[]).length,2);assert.doesNotMatch(html,/SURVEY DIRECTIVE/);
});
