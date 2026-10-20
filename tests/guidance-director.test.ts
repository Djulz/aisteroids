import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCompany,createWorld,progressionHint,type Company} from '../src/sim.ts';
import {awardTech} from '../src/research.ts';
import {currentObjective} from '../src/progression.ts';
import {DirectorQueue,DIRECTOR_LINES,completedDialogue,preparationDialogue,missionDialogue,normalizeDialogueHistory,directorMessage} from '../src/director.ts';
import {parseSave,SAVE_KEY,readCompany} from '../src/storage.ts';
import {renderLobby} from '../src/lobby.ts';

const ready=():Company=>({...freshCompany(),rounds:5,total:30,credits:9,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],fleetCapacity:2});
const late=():Company=>awardTech({...ready(),fleetCapacity:6,enduranceLevel:3,outpost:true,launchSite:'far',deflectorShields:true,
 progress:{...freshCompany().progress,rivalSeen:true,farSurveyed:true,outpostSurveyed:true,protectedAuriteDelivery:true},
 environmentUpgrades:['advancedSensors','navigationStabilizers','radiationShielding'],extractionUpgrades:['highPowerOptics','resonanceMining']},
 ['abandoned_cargo_relay','abandoned_research_station','experimental_probe_salvaged','first_nickel_delivery','first_aurite_delivery','first_cryonite_delivery','automated_sorting_archive']);

test('objective, empty Workshop and lobby share the same current requirement',()=>{
 const c=ready(),objective=currentObjective(c),html=renderLobby(c,{tab:'workshop',error:'',storageOK:true});
 assert.equal(progressionHint(c),objective.detail);
 assert.ok(html.includes('NEXT · '+objective.title));assert.ok(html.includes(objective.detail));
 assert.equal(currentObjective({...c,rounds:999}).id,objective.id,'missions played do not unlock a story chapter');
});

test('first cargo and purchased basic systems give actionable goals without offering an owned system',()=>{
 let c=freshCompany();assert.equal(currentObjective(c).id,'first_cargo');
 c={...c,total:3,credits:3,rounds:1,shopOffers:['cargoAwareness']};
 assert.equal(currentObjective(c).id,'cargoAwareness');assert.match(currentObjective(c).detail,/Buy it.*3 Credits/);
 c={...c,basicUpgrades:['cargoAwareness'],shopPurchases:['cargoAwareness']};
 assert.equal(currentObjective(c).id,'navigationAssist');assert.match(currentObjective(c).detail,/Complete a shift/);
 assert.match(currentObjective({...c,shopPurchases:[],shopOffers:['navigationAssist'],credits:1}).detail,/5 more Credits/);
});

test('Aurite progression guides protected delivery, survey, construction and actual Outpost launch',()=>{
 const c=awardTech({...ready(),deflectorShields:true},['first_aurite_delivery']);
 assert.equal(currentObjective(c).id,'protected_aurite');
 const delivered={...c,progress:{...c.progress,protectedAuriteDelivery:true}};
 assert.equal(currentObjective(delivered).id,'outpost_survey');
 assert.equal(currentObjective({...delivered,progress:{...delivered.progress,outpostSurveyed:true}}).id,'outpost');
 const prepared=late();assert.equal(currentObjective({...prepared,uniqueTechDiscoveries:prepared.uniqueTechDiscoveries.filter(id=>id!=='first_cryonite_delivery'),launchSite:'home'}).id,'frontier_launch');
});

test('late objectives skip completed and optional discoveries and do not invent a playable boss',()=>{
 const c=late();assert.equal(currentObjective(c).id,'voidite');
 assert.equal(currentObjective({...c,environmentUpgrades:[]}).id,'radiationShielding');
 assert.equal(currentObjective({...c,extractionUpgrades:['highPowerOptics']}).id,'resonanceMining');
 const finished=awardTech(c,['first_voidite_delivery']);
 assert.equal(currentObjective(finished).id,'frontier_complete');assert.match(currentObjective(finished).detail,/not available/);
 assert.doesNotMatch(currentObjective(finished).detail,/Investigate the Sorting Archive/);
});

test('director prioritizes contact, deduplicates observations and remembers displayed lines',()=>{
 const q=new DirectorQueue();q.enqueue(['cargo_full','first_contact','first_contact']);
 assert.equal(q.take(),'first_contact');q.enqueue(['first_contact']);assert.equal(q.take(),'cargo_full');assert.equal(q.take(),undefined);
 assert.equal(new DirectorQueue(q.history()).take(),undefined);
 const restored=new DirectorQueue(q.history());restored.enqueue(['first_contact','cargo_full']);assert.equal(restored.take(),undefined);
});

test('director queue is bounded and an unlock card consumes its own queued commentary',()=>{
 const q=new DirectorQueue();q.enqueue(Object.keys(DIRECTOR_LINES) as (keyof typeof DIRECTOR_LINES)[]);
 q.remember('first_contact');assert.notEqual(q.take(),'first_contact');
 let count=1;while(q.take())count++;assert.ok(count<=7);
});

test('historical companies inherit prior commentary while real purchases create new events',()=>{
 const c=ready();assert.ok(completedDialogue(c).includes('welcome'));assert.ok(completedDialogue(c).includes('work_planner'));
 const before=freshCompany(),after={...before,basicUpgrades:['cargoAwareness'] as Company['basicUpgrades']};
 assert.deepEqual(preparationDialogue(before,after),['cargo_awareness']);
 assert.deepEqual(preparationDialogue(after,after),[]);
});

test('mission dialogue requires physical delivery or real contact events, not chart visibility or extraction',()=>{
 const w=createWorld(freshCompany());w.explored.fill(255);w.extractedByMineral.nickel=9;
 assert.deepEqual(missionDialogue(w),[]);
 w.pendingTech.push({id:'first_rival_contact',time:1});assert.ok(missionDialogue(w).includes('first_contact'));
 w.deliveredByMineral.nickel=1;assert.ok(missionDialogue(w).includes('nickel_delivered'));
 assert.ok(!missionDialogue(w).includes('aurite_delivered'));
 w.drones[0].cargo=3;w.drones[0].state='return';assert.ok(missionDialogue(w).includes('cargo_full'),'full cargo is recognized during physical recall too');
});

test('failed-shift advice requires a settled loss without any delivered Credits',()=>{
 const w=createWorld(freshCompany());w.phase='done';assert.ok(!missionDialogue(w).includes('failed_shift'));
 w.drones[0].state='dead';assert.ok(missionDialogue(w).includes('failed_shift'));
 w.delivered=1;assert.ok(!missionDialogue(w).includes('failed_shift'));
});

test('dialogue history survives save/load without changing game state or resetting old saves',()=>{
 const c={...freshCompany(),aiSeen:['welcome','cargo_full']};
 assert.deepEqual(parseSave(JSON.stringify(c)),c);
 const old={...c};delete old.aiSeen;
 const store={getItem:(key:string)=>key===SAVE_KEY?JSON.stringify(old):null,setItem:()=>{},removeItem:()=>{}};
 assert.ok(readCompany(store).company);assert.equal(readCompany(store).issue,null);
 assert.deepEqual(normalizeDialogueHistory(['welcome','welcome','invalid',null]),['welcome']);
 assert.equal(parseSave(JSON.stringify({...c,aiSeen:'damaged presentation metadata'})).worldSeed,c.worldSeed);
 assert.deepEqual(parseSave(JSON.stringify({...c,aiSeen:'damaged presentation metadata'})).aiSeen,[]);
});

test('AI content has stable voice-ready IDs and renders English text without an audio dependency',()=>{
 const html=directorMessage('first_contact');
 assert.match(html,/data-dialogue="first_contact"/);assert.match(html,/Fighter blueprint available/);
 assert.doesNotMatch(html,/<audio|autoplay/);
 assert.equal(new Set(Object.keys(DIRECTOR_LINES)).size,17);
});
