import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCamera,screenToWorld,zoomAt,showFollow,followCamera,resizeCamera} from '../../src/camera.ts';
import {MapGestures} from '../../src/gestures.ts';
import {createWorld,freshCompany,buy,cost} from '../../src/sim.ts';
import {renderLobby} from '../../src/lobby.ts';
import {awardTech,research} from '../../src/research.ts';
import {parseSave} from '../../src/storage.ts';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
test('pinch keeps the world point under its moving midpoint and handles finger lifting',()=>{
 const c={...newCamera(),x:1250,y:1250},g=new MapGestures(c);
 g.down(1,{x:120,y:300});g.down(2,{x:280,y:300});
 const anchor=screenToWorld(c,200,300);
 g.move(1,{x:110,y:320});g.move(2,{x:310,y:320});
 assert.ok(c.zoom>1);const at=screenToWorld(c,210,320);close(at.x,anchor.x);close(at.y,anchor.y);
 assert.equal(g.up(2,{x:310,y:320}),null);assert.equal(g.up(1,{x:110,y:320}),null);
 g.down(3,{x:190,y:200});assert.deepEqual(g.up(3,{x:190,y:200}),{x:190,y:200});
});
test('pan, cancel, bounds, and contextual follow remain stable across phone viewports',()=>{
 for(const width of [320,360,390,430]){
  const c={...newCamera(),x:1200,y:1200};resizeCamera(c,width,620);const g=new MapGestures(c);
  g.down(1,{x:120,y:200});g.move(1,{x:190,y:200});assert.equal(c.follow,false);assert.equal(g.up(1,{x:190,y:200}),null);
  g.down(2,{x:50,y:50});g.cancel(2);g.down(3,{x:50,y:50});assert.deepEqual(g.up(3,{x:50,y:50}),{x:50,y:50});
  zoomAt(c,10000,width/2,310);assert.equal(c.zoom,1.5);
  zoomAt(c,.000001,width/2,310);assert.ok(c.zoom>0&&c.zoom<=.5);
 }
 const w=createWorld(freshCompany()),c=newCamera();assert.equal(showFollow(c,w),false);
 c.follow=false;c.x=900;c.y=900;assert.equal(showFollow(c,w),true);
 c.follow=true;followCamera(c,w,.5,true);assert.ok(c.x<900);assert.equal(showFollow(c,w,true),false);
});
test('lobby hides future options, preserves save fields and reveals research and Outpost context',()=>{
 let c=freshCompany(),html=renderLobby(c,{tab:'workshop',error:'',storageOK:true});
 assert.match(html,/Shift Endurance/);assert.doesNotMatch(html,/HQ Turret|Outer Outpost|id="open-research"|id="toggle-site"|change-doctrine/);
 c=awardTech({...c,progress:{...c.progress,rivalSeen:true}},['far_belt_charted','first_rival_contact']);c=research(c,'escortProgram')!;
 c={...c,credits:500,progress:{...c.progress,rivalSeen:true,outpostSurveyed:true},outpost:true,launchSite:'far',doctrine:'convoy'};
 html=renderLobby(c,{tab:'workshop',error:'',storageOK:true});assert.match(html,/HQ Turret/);assert.match(html,/RESEARCH/);assert.match(html,/LAUNCH · OUTPOST/);
 assert.doesNotMatch(html,/FLEET DOCTRINE|data-doctrine|data-site=/);
 assert.equal(parseSave(JSON.stringify(c)).doctrine,'convoy');assert.equal(parseSave(JSON.stringify(c)).launchSite,'far');
 assert.equal(cost(c,'outpost'),450);assert.equal(buy(c,'endurance')?.enduranceLevel,1);
 const panel=renderLobby(c,{tab:'research',error:'',storageOK:true});assert.match(panel,/Technology research|Escort Program/);assert.match(panel,/id="tab-research" aria-current="page"/);assert.match(panel,/COMPLETED \(1\)/);
});
