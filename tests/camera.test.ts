import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCamera,panCamera,zoomCamera,overview,followCamera,screenToWorld,resizeCamera,VIEW_W,VIEW_H} from '../src/camera.ts';
import {W,H,createWorld,freshCompany,step,ROUND_TIME} from '../src/sim.ts';
test('larger world contains three view areas and resource clusters outside starter pocket',()=>{assert.equal(W*H/(VIEW_W*VIEW_H),3);const w=createWorld(freshCompany());assert.ok(w.rocks.some(r=>r.x>400));assert.ok(w.rocks.some(r=>r.y>620));});
test('pan disables follow, clamps edges and preserves coordinate conversion',()=>{const c=newCamera();panCamera(c,-80,-40);assert.equal(c.follow,false);assert.deepEqual(screenToWorld(c,200,310),{x:c.x,y:c.y});assert.equal(c.x,280);panCamera(c,-9999,-9999);assert.ok(c.x+VIEW_W/c.zoom/2<=W);assert.ok(c.y+VIEW_H/c.zoom/2<=H);zoomCamera(c,99);assert.equal(c.zoom,1.5);});
test('overview contains the entire world and manual mode does not drift',()=>{const c=newCamera();overview(c);assert.ok(VIEW_W/c.zoom>=W&&VIEW_H/c.zoom>=H);const before={...c};followCamera(c,createWorld(freshCompany()),1);assert.deepEqual(c,before);});
test('follow camera eases toward outer fleet without affecting simulation',()=>{const c=newCamera(),w=createWorld(freshCompany());w.drones[0].x=650;w.drones[0].y=760;followCamera(c,w,.1);assert.ok(c.x>200&&c.x<650);assert.equal(w.time,0);assert.equal(w.drones[0].x,650);});
test('recall from outer field docks with cargo and avoids outer obstacles',()=>{const w=createWorld(freshCompany());const d=w.drones[0];d.x=760;d.y=880;d.cargo=8;w.time=ROUND_TIME;for(let i=0;i<2400&&w.phase!=='done';i++){step(w);for(const r of w.rocks)assert.ok(Math.hypot(d.x-r.x,d.y-r.y)>=r.r+7.9);}assert.equal(w.phase,'done');assert.equal(w.delivered,8);});

test('responsive viewport preserves proportions, coordinates and full overview',()=>{
 for(const [width,height] of [[390,570],[480,310],[320,650]]){
  const c=newCamera();resizeCamera(c,width,height);
  assert.ok(Math.abs(c.width/c.height-width/height)<1e-10);
  assert.deepEqual(screenToWorld(c,c.width/2,c.height/2),{x:c.x,y:c.y});
  overview(c);assert.ok(c.width/c.zoom>=W-.001&&c.height/c.zoom>=H-.001);
 }
});
