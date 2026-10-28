import {createWorld,freshCompany,step,hold,STEP,HOME,updateKnowledge,setFocus,type World,type Drone,type Scout,type Guard,type Enemy} from './sim.ts';
import {ENEMY_TYPES,type EnemyKind} from './patrols.ts';
import {clearSegment,type Point} from './navigation.ts';
import {reveal,mergeMap,hasCell} from './knowledge.ts';
import type {TalentId} from './research.ts';

// A run owns its hulls, permanent capacity, discoveries and RNG. Classic's
// preparation, settlement and storage APIs are never used by this mode.
export const ROGUE_SAVE_KEY='aisteroids-roguelite-pass01-v1';
// Future hulls share the same model-specific price/slot accounting; only the
// three complete types below are purchasable in Pass 01.
export const HULL_CATALOG={miner:{name:'Miner',price:20,slots:1},scout:{name:'Scout',price:30,slots:1},hauler:{name:'Hauler',price:40,slots:1},fighter:{name:'Fighter',price:55,slots:1},rig:{name:'Mining Rig',price:100,slots:2}} as const;
export const ECONOMY={slots:[0,20,50,125,300,700],hulls:{miner:HULL_CATALOG.miner,scout:HULL_CATALOG.scout,fighter:HULL_CATALOG.fighter},repairPerSecond:2,firstRaid:240,bossAt:600,maxEnemies:10};
export type Hull=keyof typeof ECONOMY.hulls;
export const TECH={
 chain:{name:'Chain Shatter',effect:'Rams split a second nearby asteroid.',talent:'ramSplitter',hull:'miner'},
 magnetic:{name:'Magnetic Collection',effect:'Pull nearby unclaimed fragments into Miner collection range.',hull:'miner'},
 kinetic:{name:'Kinetic Ram',effect:'Four fragments per ram and 35% shorter recovery.',talent:'heavyHead',hull:'miner'},
 nanite:{name:'Nanite Delivery',effect:'Each cargo unload restores 4 HP per level before dock repair.'},
 emergency:{name:'Emergency Retreat',effect:'Miners retreat at 55% HP instead of 25%; 40% faster return.'},
 twin:{name:'Fighter Twin Guns',effect:'A second visible cannon fires another damaging shot.',hull:'fighter'},
 drones:{name:'Escort Drones',effect:'Two orbiting defenders per Fighter fire at nearby enemies.',hull:'fighter'},
 relay:{name:'Cargo Relay',effect:'Station unload rate +100% per level (first level halves unload time).'},
 echo:{name:'Scout Echo',effect:'Scout sensors reveal and identify a much wider area.',hull:'scout'},
 overdrive:{name:'Overdrive',effect:'All hulls fly 30% faster, but maximum HP falls 20%.'},
 salvage:{name:'Salvage Bonus',effect:'Destroyed pirates drop three valuable physical Nickel fragments.'},
 reactive:{name:'Reactive Hull',effect:'Taking enemy damage releases a short-range shockwave: 2 damage per level; 8s cooldown.'},
} as const;
export type Tech=keyof typeof TECH;
type Unit=Drone|Scout|Guard;
export type TechItem=Point&{id:number;state:'ground'|'carried'|'delivered'|'lost';carrier:number|null};
export type Run={version:1;seed:number;rngState:number;world:World;credits:number;slots:number;hulls:Record<string,Hull>;tech:Tech[];items:TechItem[];draft:Tech[];paused:boolean;result:'Victory'|'Bankruptcy'|null;nextRaid:number;bossId:number|null;nextTechAt:number;nextShipId:number;lost:number;deliveredCredits:number;income:{time:number;credits:number}[];events:string[];metrics:{firstTech:number|null;secondShip:number|null;firstLoss:number|null;boss:number|null};seenDead:number[];reactiveReady:Record<string,number>;droneReady:Record<string,number>};
export const units=(r:Run):Unit[]=>[...r.world.drones,...r.world.scouts,...r.world.guards];
export const alive=(u:Unit)=>u.hp>0&&(!('state' in u)||u.state!=='dead');
export const usedCapacity=(r:Run)=>units(r).filter(alive).reduce((n,u)=>n+ECONOMY.hulls[r.hulls[u.id]].slots,0);
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const has=(r:Run,t:Tech)=>r.tech.includes(t);
function rng(r:Run){r.rngState=(Math.imul(r.rngState,1664525)+1013904223)>>>0;return r.rngState/4294967296;}
export function note(r:Run,text:string){r.events.unshift(`${Math.floor(r.world.time/60)}:${String(Math.floor(r.world.time%60)).padStart(2,'0')} ${text}`);r.events.length=Math.min(r.events.length,8);}
function company(seed:number){const c=freshCompany(seed);c.basicUpgrades=['cargoAwareness','navigationAssist','workPlanner'];c.progress.rivalSeen=true;c.unlockedTypes=['impactMiner','scout','escort'];return c;}
export function newRun(seed=7):Run{
 const w=createWorld(company(seed));w.continuous=true;w.missionDuration=1e9;w.enemies=[];
 // One authored-size local belt, using existing seeded deposits, collision,
 // extraction and cargo systems. No five-biome campaign or recurring shifts.
 w.rocks=w.rocks.filter(rock=>dist(rock,HOME)<1050&&dist(rock,HOME)>115);
 for(const rock of w.rocks){rock.mineral='ferrite';rock.hp=rock.max=Math.max(20,rock.max*4);}
 w.definition={...w.definition,pois:[],scenery:w.definition.scenery.filter(p=>dist(p,HOME)<1100)};
 const r:Run={version:1,seed:seed>>>0,rngState:seed>>>0,world:w,credits:0,slots:1,hulls:{0:'miner'},tech:[],items:[],draft:[],paused:false,result:null,nextRaid:ECONOMY.firstRaid,bossId:null,nextTechAt:10,nextShipId:1,lost:0,deliveredCredits:0,income:[],events:[],metrics:{firstTech:null,secondShip:null,firstLoss:null,boss:null},seenDead:[],reactiveReady:{},droneReady:{}};
 w.rng=()=>rng(r);note(r,'One free Miner. Deliver cargo, buy capacity, then buy hulls.');return r;
}
export function buySlot(r:Run){const cost=ECONOMY.slots[r.slots];if(r.result||r.draft.length||cost===undefined||r.credits<cost)return false;r.credits-=cost;r.slots++;note(r,`Fleet capacity purchased: ${r.slots}`);return true;}
function applyHullTech(r:Run,u:Unit){
 if(has(r,'overdrive')){u.maxHp*=.8;u.hp=u.maxHp;if('gear' in u)u.gear.speed*=1.3;}
 if('oreQueue' in u){if(has(r,'kinetic')){u.gear.ramCooldown*=.65;u.gear.ramRecoil*=.65;}if(has(r,'emergency')){u.gear.retreatAccel*=1.4;u.gear.returnSpeed=1.4;}}
}
export function buyHull(r:Run,type:Hull){
 if(!Object.hasOwn(ECONOMY.hulls,type)||r.result||r.draft.length)return false;
 const spec=ECONOMY.hulls[type];if(r.credits<spec.price||usedCapacity(r)+spec.slots>r.slots)return false;
 const c=company(r.seed);c.fleetCapacity=2;c.talents=[...r.world.company.talents];c.fleetComposition={impactMiner:1,laserMiner:0,hauler:0,scout:0,escort:0,miningRig:0};if(type==='scout')c.fleetComposition.scout=1;if(type==='fighter')c.fleetComposition.escort=1;
 const template=createWorld(c),u=type==='miner'?template.drones[0]:type==='scout'?template.scouts[0]:template.guards[0];
 u.id=r.nextShipId++;u.name=`${spec.name} ${u.id+1}`;r.hulls[u.id]=type;applyHullTech(r,u);
 if(type==='miner')r.world.drones.push(u as Drone);else if(type==='scout')r.world.scouts.push(u as Scout);else r.world.guards.push(u as Guard);
 r.credits-=spec.price;r.metrics.secondShip??=r.world.time;note(r,`${spec.name} purchased · ${spec.price} Credits`);return true;
}
export const techLevel=(r:Run,id:Tech)=>r.tech.filter(t=>t===id).length;
export function eligibleTech(r:Run):Tech[]{
 const options=(Object.keys(TECH) as Tech[]).filter(id=>!has(r,id)&&(!('hull' in TECH[id])||units(r).some(u=>alive(u)&&r.hulls[u.id]===(TECH[id] as {hull:string}).hull)));
 // A Miner-only fleet can exhaust unique eligible choices. Functional levels
 // keep every physically delivered cache a real three-way decision, even if
 // a combat hull was lost while carrying it. Never strand a carrier at HQ.
 for(const id of ['nanite','relay','reactive'] as const)if(options.length<3&&!options.includes(id))options.push(id);
 return options;
}
function offer(r:Run){if(r.draft.length)return;const options=eligibleTech(r);while(r.draft.length<3&&options.length)r.draft.push(options.splice(Math.floor(rng(r)*options.length),1)[0]);}
export function chooseTech(r:Run,id:Tech){
 if(!r.draft.includes(id)||has(r,id)&&!['nanite','relay','reactive'].includes(id))return false;r.tech.push(id);r.draft=[];
 const def=TECH[id];if('talent' in def)r.world.company.talents.push(def.talent as TalentId);
 for(const u of units(r).filter(alive)){
  if(id==='overdrive'){u.maxHp*=.8;u.hp=Math.min(u.hp,u.maxHp);if('gear' in u)u.gear.speed*=1.3;}
  if('oreQueue' in u&&id==='emergency'){u.gear.returnSpeed=1.4;u.gear.retreatAccel*=1.4;}
  if('oreQueue' in u&&id==='kinetic'){u.gear.ramCooldown*=.65;u.gear.ramRecoil*=.65;}
 }
 note(r,`Tech installed: ${TECH[id].name}`);return true;
}
export function threat(r:Run){
 const age=Math.max(0,r.world.time-ECONOMY.firstRaid);
 return {budget:Math.min(ECONOMY.maxEnemies,1+Math.floor(age/85)+Math.floor(r.tech.length/3)),tier:r.deliveredCredits>=280&&age>=210?3:r.deliveredCredits>=160&&age>=90?2:1};
}
export function raidsReady(r:Run){return r.world.time>=ECONOMY.firstRaid&&(units(r).some(u=>alive(u)&&r.hulls[u.id]==='fighter')||r.deliveredCredits>=145||r.world.time>=480);}
export function spawnEnemy(r:Run,kind:EnemyKind):Enemy|null{
 const w=r.world;
 if(w.enemies.filter(e=>e.hp>0).length>=ECONOMY.maxEnemies){if(kind!=='rogueBoss')return null;const withdrawing=w.enemies.find(e=>e.hp>0&&e.id!==r.bossId);if(withdrawing)w.enemies=w.enemies.filter(e=>e!==withdrawing);}
 for(let attempt=0;attempt<32;attempt++){
  const angle=rng(r)*Math.PI*2,p={x:HOME.x+Math.cos(angle)*560,y:HOME.y+Math.sin(angle)*560};
  if(units(r).some(u=>alive(u)&&dist(p,u)<220)||!clearSegment(p,p,w.rocks,-1,35))continue;
  const enemy:Enemy={id:w.nextId++,kind,...p,vx:0,vy:0,hp:ENEMY_TYPES[kind].hp,cooldown:ENEMY_TYPES[kind].warning,suppressedUntil:0,disabledUntil:0,path:[],pathKey:'',pathAge:0,home:{x:HOME.x,y:HOME.y-150},mode:'patrol'};
  w.enemies.push(enemy);note(r,`${ENEMY_TYPES[kind].name} approaching`);return enemy;
 }return null;
}
function director(r:Run){const w=r.world,t=threat(r);
 if(w.time>=ECONOMY.bossAt&&r.bossId===null){const boss=spawnEnemy(r,'rogueBoss');if(boss){r.bossId=boss.id;r.metrics.boss=w.time;}}
 // Opening attacks wait for a defensible economy. A player can build a Fighter
 // first, or invest in mining and face the raid after earning enough to fund
 // that route. The time cap prevents waiting forever on a stalled seed.
 if(w.time>=r.nextRaid&&raidsReady(r)){
  if(w.enemies.filter(e=>e.hp>0).length<t.budget){const mix=rng(r);spawnEnemy(r,t.tier===3&&mix<.3?'rogueBulwark':t.tier>=2&&mix<.65?'rogueTwin':'rogueRaider');}
  r.nextRaid=w.time+Math.max(18,52-w.time/25);
 }
 // Cap abandoned enemies and old wrecks, keeping the boss and fresh attacks.
 w.enemies=w.enemies.filter(e=>e.hp>0||e.id===r.bossId);
}
function physicalTech(r:Run){const w=r.world;
 if(w.extracted>=r.nextTechAt&&r.items.length<8){
  const source=w.rocks.filter(p=>p.hp<p.max).sort((a,b)=>dist(a,w.drones.find(alive)??HOME)-dist(b,w.drones.find(alive)??HOME))[0];
  if(source){const id=r.items.length,p=w.ores.find(o=>dist(o,source)<90)??source;r.items.push({id,x:p.x,y:p.y,state:'ground',carrier:null});r.nextTechAt+=40;note(r,'Tech cache uncovered. Bring it home for a draft.');}
 }
 for(const item of r.items){
  if(item.state==='ground'){
   const u=units(r).filter(u=>alive(u)&&r.hulls[u.id]!=='fighter'&&!r.items.some(t=>t.state==='carried'&&t.carrier===u.id)).find(u=>dist(u,item)<55);
   if(u){item.state='carried';item.carrier=u.id;if('state' in u)u.state='return';note(r,`Tech cache ${item.id+1} collected`);}
  }else if(item.state==='carried'){
   const u=units(r).find(u=>u.id===item.carrier);
   if(!u||!alive(u)){item.state='lost';note(r,'Tech carrier destroyed. Discovery lost.');continue;}
   item.x=u.x;item.y=u.y;
   if(dist(u,HOME)<85&&('state' in u&&(u.state==='unload'||u.state==='docked'))){
    if(!r.draft.length&&eligibleTech(r).length>=3){item.state='delivered';r.metrics.firstTech??=w.time;offer(r);note(r,'Tech delivered. Simulation paused for your choice.');}
   }else if('state' in u&&u.state!=='docked'&&u.state!=='unload')u.state='return';
  }
 }
 for(const s of w.scouts.filter(s=>alive(s)&&s.state==='exploring')){
  const target=r.items.filter(i=>i.state==='ground'&&hasCell(w.explored,i.x,i.y)).sort((a,b)=>dist(s,a)-dist(s,b))[0];
  // Scouts survey the local belt. The prototype deliberately excludes distant campaign sites.
  if(target){s.targetX=target.x;s.targetY=target.y;s.targetUntil=w.time+2;}
  else if(dist(s,HOME)>850){s.targetX=HOME.x;s.targetY=HOME.y;s.targetUntil=w.time+15;}
 }
}
export function hasIncomeRoute(r:Run){
 const w=r.world;
 if(w.effects.some(e=>e.type==='transfer'&&e.items?.length))return true;
 const miners=w.drones.filter(alive);
 if(miners.some(d=>d.cargoItems.length>0))return true;
 // Remaining ore/reserves, a repairable living Miner, and affordable replacement
 // hulls are all real routes. Fighters and Scouts cannot manufacture income.
 const resources=w.ores.length>0||w.rocks.some(p=>p.hp>0);
 if(resources&&miners.length)return true;
 return resources&&r.credits>=ECONOMY.hulls.miner.price&&usedCapacity(r)<r.slots;
}
export function checkResult(r:Run){if(r.result)return;if(r.bossId!==null&&r.world.enemies.some(e=>e.id===r.bossId&&e.hp<=0)){r.result='Victory';note(r,'Siege Captain destroyed. Operation victorious.');}else if(!hasIncomeRoute(r)){r.result='Bankruptcy';note(r,'No viable income route or affordable Miner.');}}
export function stepRun(r:Run,dt=STEP,active=true){
 if(!active||r.paused||r.draft.length||r.result)return;
 const w=r.world,health=new Map(units(r).map(u=>[u.id,u.hp]));
 // Explicit retreat orders use the same physical return path as cargo.
 for(const d of w.drones.filter(alive)){
  if(d.state==='mine'&&d.hp<d.maxHp*(has(r,'emergency')?.55:.25))d.state='return';
  if(has(r,'relay')&&d.state==='unload')d.unloadTime+=dt*techLevel(r,'relay');
  if(has(r,'magnetic'))for(const o of w.ores)if(dist(d,o)<80&&!w.oreClaims.has(o.id)){
   const len=dist(d,o),amount=Math.min(len,95*dt);o.x+=(d.x-o.x)/Math.max(1,len)*amount;o.y+=(d.y-o.y)/Math.max(1,len)*amount;
  }
 }
 // Dock repairs are time costs, with no free credit debit that could strand a run.
 for(const d of w.drones.filter(d=>d.state==='docked'&&d.hp>0)){
  d.hp=Math.min(d.maxHp,d.hp+dt*ECONOMY.repairPerSecond);
  if(d.hp>=d.maxHp){d.state='mine';d.berth=-1;d.pathKey='';d.wander=0;}
 }
 for(const s of w.scouts.filter(alive)){
  if(s.state==='exploring'&&s.hp<s.maxHp*.5)s.state='return';
  if(s.state==='docked'){s.hp=Math.min(s.maxHp,s.hp+dt*ECONOMY.repairPerSecond);if(s.hp>=s.maxHp){s.state='exploring';s.targetUntil=0;}}
 }
 const unload=w.drones.filter(d=>d.state==='unload'&&d.unloadCargo>0).map(d=>d.id),intercepts=w.intercepts;
 step(w,dt);
 // Only completed physical transfers are income. Ordinary ore never drafts Tech.
 const delivered=w.delivered-r.deliveredCredits;
 if(delivered>0){r.credits+=delivered;r.deliveredCredits=w.delivered;r.income.push({time:w.time,credits:delivered});note(r,`Cargo delivered · +${delivered} Credits`);}
 r.income=r.income.filter(i=>i.time>w.time-60);
 if(has(r,'nanite'))for(const d of w.drones)if(unload.includes(d.id)&&d.state!=='unload'&&alive(d))d.hp=Math.min(d.maxHp,d.hp+4*techLevel(r,'nanite'));
 if(has(r,'twin')&&w.intercepts>intercepts)for(const g of w.guards.filter(g=>g.hp>0&&!g.job)){
  // Match only this Fighter's shot on this step, not every fleet intercept.
  const fired=w.effects.find(e=>e.type==='guardShot'&&e.life===e.max&&e.x===g.x&&e.y===g.y);
  const target=fired&&w.enemies.find(e=>e.hp>0&&e.x===fired.tx&&e.y===fired.ty);
  if(target){target.hp--;w.intercepts++;const a=g.angle;fired!.x=g.x+Math.cos(a)*19+Math.sin(a)*9;fired!.y=g.y+Math.sin(a)*19-Math.cos(a)*9;w.effects.push({type:'guardShot',x:g.x+Math.cos(a)*19-Math.sin(a)*9,y:g.y+Math.sin(a)*19+Math.cos(a)*9,tx:target.x,ty:target.y,life:.3,max:.3});}
 }
 if(has(r,'drones'))for(const g of w.guards.filter(g=>g.hp>0&&!g.job))for(let i=0;i<2;i++){
  const p=defenderPosition(w.time,g,i),target=w.enemies.find(e=>e.hp>0&&dist(e,p)<135&&clearSegment(p,e,w.rocks,-1,0)),key=`${g.id}:${i}`;
  if(target&&w.time>=(r.droneReady[key]??0)){target.hp-=.5;r.droneReady[key]=w.time+1.3;w.effects.push({type:'guardShot',...p,tx:target.x,ty:target.y,life:.3,max:.3});}
 }
 for(const u of units(r)){
  if(alive(u)&&has(r,'reactive')&&u.hp<(health.get(u.id)??u.hp)&&w.time>=(r.reactiveReady[u.id]??0)){
   const enemies=w.enemies.filter(e=>e.hp>0&&dist(e,u)<100);for(const e of enemies){e.hp-=2*techLevel(r,'reactive');e.disabledUntil=w.time+1;}
   r.reactiveReady[u.id]=w.time+8;w.effects.push({type:'phase',x:u.x,y:u.y,life:.4,max:.4});
  }
  if(!alive(u)&&!r.seenDead.includes(u.id)){r.seenDead.push(u.id);r.lost++;r.metrics.firstLoss??=w.time;note(r,`${u.name} destroyed · purchased slot retained`);}
 }
 if(has(r,'salvage'))for(const e of w.enemies)if(e.hp<=0&&!r.seenDead.includes(e.id)){
  r.seenDead.push(e.id);for(let i=0;i<3;i++)w.ores.push({id:w.nextId++,x:e.x+(i-1)*12,y:e.y,value:1,mineral:'nickel',age:1});
 }
 if(has(r,'echo')){reveal(w.visible,[{...HOME,radius:150},...units(r).filter(alive).map(u=>({...u,radius:r.hulls[u.id]==='scout'?340:130}))]);mergeMap(w.explored,w.visible);w.mapRevision++;for(const rock of w.rocks)if(w.scouts.some(s=>alive(s)&&dist(s,rock)<340))w.identifiedRocks.add(rock.id);}
 // Speed tech applies to Scout motion too (their speed has no gear object).
 if(has(r,'overdrive'))for(const s of w.scouts.filter(alive)){const old=health.has(s.id);if(old){const p={x:s.x+s.vx*dt*.3,y:s.y+s.vy*dt*.3};if(clearSegment(s,p,w.rocks,-1,10)){s.x=p.x;s.y=p.y;}}}
 physicalTech(r);checkResult(r);if(!r.result)director(r);
 // Classic discovery notifications never award rogue Tech or affect hull access.
 w.pendingTech=[];
}
export function defenderPosition(time:number,g:Point&{id:number},i:number){const a=time*2+g.id+i*Math.PI;return {x:g.x+Math.cos(a)*25,y:g.y+Math.sin(a)*25};}
export function orderFocus(r:Run,p:Point|null){setFocus(r.world,'mining',p);setFocus(r.world,'scout',p);note(r,p?'Mining and survey focus updated':'Autonomous local work resumed');}
export function serializeRun(r:Run){return JSON.stringify(r,(_key,value)=>value instanceof Set?{$set:[...value]}:value instanceof Map?{$map:[...value]}:value instanceof Uint8Array?{$bytes:[...value]}:value);}
export function restoreRun(raw:string):Run|null{
 try{
  if(raw.length>2_000_000)return null;
  const r=JSON.parse(raw,(_key,v)=>v?.$set?new Set(v.$set):v?.$map?new Map(v.$map):v?.$bytes?new Uint8Array(v.$bytes):v) as Run;
  if(r.version!==1||!Number.isSafeInteger(r.seed)||!Number.isFinite(r.world.time)||r.world.time<0||!Number.isFinite(r.credits)||r.credits<0||!Number.isInteger(r.slots)||r.slots<1||r.slots>6||!r.world.continuous||!Array.isArray(r.tech)||r.tech.some(t=>!Object.hasOwn(TECH,t))||!Array.isArray(r.draft)||r.draft.some(t=>!Object.hasOwn(TECH,t)))return null;
  if(!(r.world.explored instanceof Uint8Array)||!(r.world.oreClaims instanceof Map)||!Number.isInteger(r.rngState)||r.result!==null&&!['Victory','Bankruptcy'].includes(r.result))return null;
  for(const u of units(r))if(!Object.hasOwn(ECONOMY.hulls,r.hulls[u.id])||![u.hp,u.maxHp,u.x,u.y].every(Number.isFinite))return null;
  for(const d of r.world.drones)hold(d);
  r.world.rng=()=>rng(r);r.world.phase='mining';r.paused=true;
  updateKnowledge(r.world);return r;
 }catch{return null;}
}
