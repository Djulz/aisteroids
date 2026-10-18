import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,freshCompany} from '../../src/sim.ts';
import {renderLobby,type LobbyView} from '../../src/lobby.ts';
const view:LobbyView={tab:'hangar',error:'',storageOK:true};

test('Deploy omits orders, doctrine and universal launch-site selector',()=>{
 const c=freshCompany(),html=renderLobby(c,view);
 assert.match(html,/DEPLOY FLEET/);
 assert.doesNotMatch(html,/data-directive|MISSION OBJECTIVE|SCANNER INTEL|FLEET DOCTRINE|LAUNCH ·/);
 assert.equal(createWorld(c).activeTarget,null);
});
test('built Outpost keeps the saved site and a contextual switch',()=>{
 const c={...freshCompany(),outpost:true,launchSite:'far' as const};
 const html=renderLobby(c,view);
 assert.match(html,/LAUNCH · OUTPOST/);assert.match(html,/id="toggle-site"/);
 assert.equal(createWorld(c).base.x,1900);assert.equal(createWorld(c).activeTarget,null);
});
