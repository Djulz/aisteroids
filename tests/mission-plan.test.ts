import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany,settle,type Company} from '../src/sim.ts';
import {effectiveDirective,missionObjectiveName,missionObjectives} from '../src/mission-plan.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';

const view:LobbyView={tab:'hangar',selectedId:'miner-1',editing:false,doctrineOpen:false,planOpen:false,error:'',storageOK:true};
const withProgress=(c:Company,updates:Partial<Company['progress']>):Company=>({...c,progress:{...c.progress,...updates}});

test('early lobby keeps Mission Plan compact; Hangar no longer owns launch and survey controls',()=>{
 const c=freshCompany();
 const html=renderLobby(c,view);
 assert.match(html,/MISSION PLAN · NEXT SHIFT/);
 assert.match(html,/HQ · Free Mining/);
 assert.doesNotMatch(html,/data-site=/);
 assert.doesNotMatch(html,/data-directive=/);
 assert.doesNotMatch(html,/SURVEY DIRECTIVE/);
 assert.doesNotMatch(html,/id="change-plan"/,'no editable settings before discovery');
});

test('scanner unlock makes the rich sample a mission objective, not a fleet doctrine',()=>{
 const c={...freshCompany(),scanner:true,directive:'surveyFar' as const};
 assert.deepEqual(missionObjectives(c).map(o=>o.id),['auto','surveyFar']);
 assert.equal(missionObjectiveName(c),'Recover Rich Sample');
 const html=renderLobby(c,{...view,planOpen:true});
 assert.match(html,/data-directive="surveyFar"/);
 assert.match(html,/SCANNER INTEL/);
 assert.match(html,/ACTIVE DEPOSITS/);
 assert.doesNotMatch(html,/data-site=/);
 assert.doesNotMatch(html,/SURVEY DIRECTIVE/);
});

test('outpost launch site is available after construction, regardless of the Hangar tab',()=>{
 const c={...freshCompany(),outpost:true,launchSite:'far' as const};
 for(const tab of ['workshop','hangar'] as const){
  const html=renderLobby(c,{...view,tab,planOpen:true});
  assert.match(html,/data-site="home"/);
  assert.match(html,/data-site="far"/);
  assert.match(html,/OUTPOST · Free Mining/);
 }
 const world=createWorld(c);
 assert.equal(world.company.launchSite,'far');
});

test('outpost survey becomes available after rival contact and disappears when completed',()=>{
 const base={...freshCompany(),scanner:true};
 const c=withProgress(base,{richSampled:true,rivalSeen:true});
 assert.deepEqual(missionObjectives(c).map(o=>o.id),['auto','surveyOutpost']);
 const selected={...c,directive:'surveyOutpost' as const};
 assert.equal(createWorld(selected).company.directive,'surveyOutpost');
 const completed=withProgress(selected,{outpostSurveyed:true});
 assert.equal(effectiveDirective(completed),'auto');
 assert.deepEqual(missionObjectives(completed).map(o=>o.id),['auto']);
 assert.equal(createWorld(completed).company.directive,'auto');
 assert.equal(settle(selected,createWorld(completed)).directive,'auto');
});

test('old or locked objectives never change deployed AI while doctrine remains intact',()=>{
 const c={...freshCompany(),directive:'surveyOutpost' as const,doctrine:'careful' as const};
 assert.equal(effectiveDirective(c),'auto');
 const w=createWorld(c);
 assert.equal(w.company.directive,'auto');
 assert.equal(w.doctrine,'careful');
 assert.equal(c.directive,'surveyOutpost','world creation must not modify saved company');
});
