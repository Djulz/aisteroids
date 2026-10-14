import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,step,STEP,type World} from '../src/sim.ts';
import {doctrineIds} from '../src/doctrines.ts';

function trace(w:World){
 const d=w.drones[0],impacts:number[]=[],keys:string[]=[];let slowMining=0,rotating=0,lastKey='';
 for(let i=0;i<12000&&w.phase!=='done';i++){
  const x=d.x,y=d.y,a=d.angle,collisions=w.collisions;
  step(w,STEP);
  if(w.collisions>collisions)impacts.push(w.time);
  if(d.pathKey!==lastKey){keys.push(d.pathKey);lastKey=d.pathKey;}
  const moved=Math.hypot(d.x-x,d.y-y);
  if(d.state==='mine'&&w.rocks.some(r=>r.hp>0)&&moved<.12){slowMining+=STEP;if(Math.abs(d.angle-a)>.025)rotating+=STEP;}
 }
 return {impacts,keys,slowMining,rotating};
}
test('seeded original 20-second recovery stall is gone across four doctrines',()=>{
 for(const doctrine of doctrineIds){
  const w=createWorld({...freshCompany(),doctrine},7),t=trace(w);
  assert.equal(w.phase,'done');assert.equal(w.drones[0].state,'docked');assert.ok(t.impacts.length>=2);
  assert.ok(t.impacts[1]-t.impacts[0]<12,`${doctrine} delayed second ram by ${t.impacts[1]-t.impacts[0]}`);
  assert.ok(t.slowMining<6,`${doctrine} stalled for ${t.slowMining.toFixed(2)}s`);
  assert.ok(t.rotating<1,`${doctrine} rotated without translation for ${t.rotating.toFixed(2)}s`);
  assert.ok(w.delivered>=4);assert.ok(t.keys.length<80);
 }
});
test('post-impact recovery waypoint is anchored at the collision, not recalculated from the moving miner',()=>{
 const w=createWorld(freshCompany()),d=w.drones[0];
 while(w.collisions===0)step(w);
 const point=[d.recoveryX,d.recoveryY];assert.ok(point.every(Number.isFinite));
 let furthest=0;for(let i=0;i<120;i++){step(w);furthest=Math.max(furthest,Math.hypot(d.x-w.rocks[0].x,d.y-w.rocks[0].y));}
 assert.deepEqual([d.recoveryX,d.recoveryY],point);assert.equal(d.armed,true);
 assert.ok(furthest>w.rocks[0].r+25);
});
