import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,settle,type Company} from '../src/sim.ts';
import {effectiveDirective,missionObjectives} from '../src/mission-plan.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';
const view:LobbyView={tab:'hangar',doctrineOpen:false,planOpen:true,error:'',storageOK:true};

test('early plan offers reachable Far Belt exploration without Hangar controls',()=>{
 const html=renderLobby(freshCompany(),view);assert.match(html,/HQ · Free Mining/);assert.match(html,/data-directive="chartFar"/);assert.doesNotMatch(html,/data-site=/);
});
test('Far Belt discovery unlocks interim scanner and rich objective without Workshop purchase',()=>{
 const c={...freshCompany(),progress:{...freshCompany().progress,farSurveyed:true}};
 assert.deepEqual(missionObjectives(c).map(o=>o.id),['auto','surveyFar','investigateFreight']);
 const html=renderLobby(c,view);assert.match(html,/SCANNER INTEL/);assert.match(html,/data-directive="surveyFar"/);
});
test('rival and outpost survey objectives normalize after completion, with HQ/Outpost controls',()=>{
 const c:Company={...freshCompany(),outpost:true,launchSite:'far',directive:'surveyOutpost',progress:{farSurveyed:true,richSampled:true,rivalSeen:true,outpostSurveyed:false}};
 assert.equal(effectiveDirective(c),'surveyOutpost');assert.equal(createWorld(c).company.directive,'surveyOutpost');
 const html=renderLobby(c,view);assert.match(html,/data-site="home"/);assert.match(html,/data-site="far"/);assert.match(html,/data-directive="surveyOutpost"/);
 const done={...c,progress:{...c.progress,outpostSurveyed:true}};assert.equal(effectiveDirective(done),'auto');assert.equal(settle(c,createWorld(done)).directive,'auto');
});
