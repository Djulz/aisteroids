import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,cost,createWorld,freshCompany,missionDuration,settle,step,STEP,W,H,FAR,ENDURANCE_DURATIONS,type World} from '../src/sim.ts';
import {blankMap,CELLS,COLS,decodeMap,encodeMap,hasCell,mapCount,POIS,setCell} from '../src/knowledge.ts';
import {loadCompany,parseSave,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {render} from '../src/render.ts';
import {newCamera} from '../src/camera.ts';

function run(w:World){for(let i=0;i<18000&&w.phase!=='done';i++)step(w,STEP);assert.equal(w.phase,'done');return w;}
const scouting=()=>{const c=freshCompany();return {...c,fleetCapacity:2,fleetComposition:{...c.fleetComposition,scout:1}};};

test('frontier geometry preserves legacy rocks, leaves clear sites and persists depleted new rocks',()=>{
 assert.deepEqual([W,H,COLS,CELLS],[2600,2400,104,9984]);
 const c=freshCompany(),w=createWorld(c),again=createWorld(c);
 assert.equal(w.rocks.length,168);assert.deepEqual(w.rocks.slice(0,30),again.rocks.slice(0,30));
 for(const site of [FAR,...POIS])assert.ok(w.rocks.every(r=>Math.hypot(site.x-r.x,site.y-r.y)>r.r+40));
 const frontier=w.rocks[80];frontier.hp-=3;
 const next=createWorld(settle(c,w));assert.equal(next.rocks[80].hp,frontier.hp);
});

test('endurance upgrades are sequential, priced, saved and used by each shift',()=>{
 let c={...freshCompany(),credits:655};
 assert.deepEqual(ENDURANCE_DURATIONS,[30,45,60,90]);
 for(const [level,price] of [75,180,400].entries()){
  assert.equal(cost(c,'endurance'),price);c=buy(c,'endurance')!;
  assert.equal(c.enduranceLevel,level+1);assert.equal(createWorld(c).missionDuration,ENDURANCE_DURATIONS[level+1]);
  assert.deepEqual(parseSave(JSON.stringify(c)),c);
 }
 assert.equal(c.credits,0);assert.equal(buy(c,'endurance'),null);assert.equal(missionDuration(c),90);
});

test('v10 bitset converts exact old cell coordinates and carries earned assets into v11',()=>{
 const c=freshCompany(),old=new Uint8Array(152),points=[[31,37],[17,12],[0,0]];
 for(const [col,row] of points){const i=row*32+col;old[i>>3]|=1<<(i&7);}
 const save={...c,version:10,enduranceLevel:undefined,credits:411,total:991,rounds:25,outpost:true,launchSite:'far',
  progress:{...c.progress,outpostSurveyed:true},explored:encodeMap(old),discoveredPois:[POIS[0].id],rockHp:{80:createWorld(c).rocks[80].max-2}};
 const data=new Map([['aisteroids-company-v10',JSON.stringify(save)],['unrelated','retained']]);
 const storage:SaveStore={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}};
 const migrated=loadCompany(storage),bits=decodeMap(migrated.explored)!;
 assert.equal(migrated.version,11);assert.equal(migrated.enduranceLevel,0);assert.equal(migrated.credits,411);assert.equal(migrated.rounds,25);
 assert.equal(migrated.outpost,true);assert.equal(migrated.launchSite,'far');assert.equal(migrated.rockHp[80],save.rockHp[80]);
 assert.equal(migrated.discoveredPois[0],POIS[0].id);assert.equal(data.get('unrelated'),'retained');assert.ok(data.has(SAVE_KEY));
 for(const [col,row] of points)assert.ok(hasCell(bits,(col+.5)*25,(row+.5)*25));
 assert.ok(hasCell(bits,FAR.x,FAR.y));assert.ok(hasCell(bits,POIS[0].x,POIS[0].y));
 assert.equal(hasCell(bits,1200,2100),false);
 assert.equal(createWorld(migrated).base.x,FAR.x);
 assert.deepEqual(parseSave(JSON.stringify(migrated)),migrated);
});

test('Scout maps persistent distant territory and returns physically at every duration',()=>{
 let c=scouting(),previous=0;
 for(const duration of ENDURANCE_DURATIONS){
  c={...c,enduranceLevel:ENDURANCE_DURATIONS.indexOf(duration)};
  const w=createWorld(c);w.drones[0].hp=1000;run(w); // Isolate navigation from the hostile encounter.
  assert.equal(w.missionDuration,duration);assert.equal(w.recallFailures,0);
  assert.equal(w.scouts[0].state,'docked');assert.ok(Math.hypot(w.scouts[0].x-w.base.x,w.scouts[0].y-w.base.y)<24);
  assert.ok(mapCount(w.explored)>previous);previous=mapCount(w.explored);
  c=settle(c,w);assert.equal(mapCount(decodeMap(c.explored)!),previous);
 }
 assert.ok(previous>4500);assert.ok(c.progress.outpostSurveyed);
});

test('charted rock and ore stay full field artwork while unknown objects stay hidden',()=>{
 const w=createWorld(freshCompany());w.rocks=w.rocks.slice(0,2);
 const hidden=w.rocks[1];w.explored=blankMap();setCell(w.explored,w.rocks[0].x,w.rocks[0].y);
 w.ores=[{id:500,x:w.rocks[0].x+3,y:w.rocks[0].y+3,value:1,age:1},{id:501,x:hidden.x,y:hidden.y,value:1,age:1}];
 const events:Array<{op:string;x?:number;y?:number;style?:string}>=[];
 const context=new Proxy({fillStyle:'',strokeStyle:''} as Record<string,unknown>,{
  get(target,key){if(key in target)return target[key as string];return (...args:number[])=>{if(key==='translate'||key==='fillRect')events.push({op:String(key),x:args[0],y:args[1],style:String(target.fillStyle)});};},
  set(target,key,value){target[String(key)]=value;return true;}
 });
 const canvas={width:400,height:620,getContext:()=>context} as unknown as HTMLCanvasElement;
 const original=globalThis.document;
 Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>context})}});
 try{render(canvas,w,-1,newCamera());}finally{Object.assign(globalThis,{document:original});}
 assert.ok(events.some(e=>e.op==='translate'&&Math.abs((e.x??0)-w.rocks[0].x)<3&&Math.abs((e.y??0)-w.rocks[0].y)<3));
 assert.ok(!events.some(e=>e.op==='translate'&&Math.abs((e.x??0)-hidden.x)<3&&Math.abs((e.y??0)-hidden.y)<3));
 assert.ok(events.some(e=>e.op==='fillRect'&&e.style==='#f5b743'));
});
