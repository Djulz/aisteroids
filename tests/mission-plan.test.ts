import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany} from '../src/sim.ts';
import {renderLobby,type LobbyView} from '../src/lobby.ts';
const view:LobbyView={tab:'hangar',doctrineOpen:false,planOpen:true,error:'',storageOK:true};

test('Deploy has no objective picker, scanner oracle or stored target',()=>{
 const c=freshCompany(),html=renderLobby(c,view);
 assert.match(html,/MINE FREELY — NO TARGET SELECTED/);
 assert.doesNotMatch(html,/data-directive|MISSION OBJECTIVE|SCANNER INTEL/);
 assert.equal(createWorld(c).activeTarget,null);
});
test('built Outpost keeps a launch and unload site choice',()=>{
 const c={...freshCompany(),outpost:true,launchSite:'far' as const};
 const html=renderLobby(c,view);
 assert.match(html,/LAUNCH SITE/);assert.match(html,/data-site="home"/);assert.match(html,/data-site="far"/);
 assert.equal(createWorld(c).base.x,1900);assert.equal(createWorld(c).activeTarget,null);
});
