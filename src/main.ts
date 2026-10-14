import {newCamera,panCamera,zoomCamera,overview,followCamera,screenToWorld,resizeCamera} from './camera.ts';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { buy, createWorld, freshCompany, settle, step, STEP, ROUND_TIME, type Company, type Purchase, type World } from './sim.ts';
import { render } from './render.ts';
import { loadCompany, SAVE_KEY } from './storage.ts';
import {DOCTRINES,validDoctrine} from './doctrines.ts';
import {renderLobby,type LobbyTab} from './lobby.ts';
import {changeFleet,fleetError,type FleetType} from './fleet.ts';
import {missionObjectives,missionObjectiveName} from './mission-plan.ts';
import {TECH_DISCOVERIES,research,type TechnologyId} from './research.ts';
const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company=freshCompany(), storageOK=true;
try{company=loadCompany(localStorage);}catch{storageOK=false;}
let world:World=createWorld(company), screen:'workshop'|'mission'='workshop', paused=false, speed=1, accumulator=0, last=0, selected=-1, debriefShown=false;
let activeTab:LobbyTab='workshop',doctrineOpen=false,planOpen=false,researchOpen=false,formError='';
let seenTechEvents=0,toastQueue:string[]=[],toastUntil=0;
try{activeTab=localStorage.getItem('aisteroids-lobby-tab')==='hangar'?'hangar':'workshop';}catch{}
let canvas:HTMLCanvasElement;
let camera=newCamera();
const fmt=(n:number)=>n.toLocaleString('en-US');
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(company));}catch{storageOK=false;} }
function mount(){
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">AI<span>↗</span></div><div><h1><em>AI</em>steroid <span>Mining</span></h1><p>AUTONOMOUS MINING DIVISION</p></div><span class="version">ALPHA<br>0.12.0</span></header><section id="content"></section><footer class="legal">INDEPENDENT OPERATIONS <span>EST. 2086</span></footer></main>`;
 showWorkshop();
}
function showWorkshop(){
 screen='workshop';paused=false;
 document.querySelector('#content')!.innerHTML=renderLobby(company,{tab:activeTab,doctrineOpen,planOpen,researchOpen,error:formError,storageOK});
 document.querySelector('#tab-workshop')!.addEventListener('click',()=>{activeTab='workshop';researchOpen=false;doctrineOpen=false;formError='';try{localStorage.setItem('aisteroids-lobby-tab',activeTab);}catch{}showWorkshop();window.scrollTo({top:0});});
 document.querySelector('#tab-hangar')!.addEventListener('click',()=>{activeTab='hangar';researchOpen=false;doctrineOpen=false;formError='';try{localStorage.setItem('aisteroids-lobby-tab',activeTab);}catch{}showWorkshop();window.scrollTo({top:0});});
 document.querySelector('#open-research')!.addEventListener('click',()=>{researchOpen=true;doctrineOpen=false;planOpen=false;showWorkshop();});
 document.querySelector('#close-research')?.addEventListener('click',()=>{researchOpen=false;showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-research]').forEach(b=>b.onclick=()=>{const next=research(company,b.dataset.research as TechnologyId);if(next){company=next;save();showWorkshop();}});
 document.querySelector('#launch')!.addEventListener('click',()=>{if(!fleetError(company))launch();});
 document.querySelector('#fix-fleet')?.addEventListener('click',()=>{activeTab='hangar';showWorkshop();});
 document.querySelector('#change-plan')?.addEventListener('click',()=>{planOpen=!planOpen;doctrineOpen=false;showWorkshop();document.querySelector<HTMLButtonElement>('#change-plan')?.focus();});
 document.querySelector('#change-doctrine')!.addEventListener('click',()=>{doctrineOpen=!doctrineOpen;planOpen=false;showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-doctrine]').forEach(b=>b.onclick=()=>{company={...company,doctrine:validDoctrine(b.dataset.doctrine)};doctrineOpen=false;save();showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{const next=buy(company,b.dataset.buy as Purchase);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-type][data-delta]').forEach(b=>b.onclick=()=>{const next=changeFleet(company,b.dataset.type as FleetType,Number(b.dataset.delta) as -1|1);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-directive]').forEach(b=>b.onclick=()=>{const directive=b.dataset.directive as Company['directive'];if(!missionObjectives(company).some(o=>o.id===directive))return;company={...company,directive};save();showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-site]').forEach(b=>b.onclick=()=>{const site=b.dataset.site;if(site!=='home'&&(site!=='far'||!company.outpost))return;company={...company,launchSite:site};save();showWorkshop();});
 document.querySelector('#reset')!.addEventListener('click',()=>{if(confirm('Reset the entire company?')){company=freshCompany();doctrineOpen=false;planOpen=false;formError='';save();world=createWorld(company);showWorkshop();}});
}
function launch(){
 if(fleetError(company))return;
 researchOpen=false;
 world=createWorld(company,company.worldSeed);screen='mission';paused=false;speed=1;accumulator=0;selected=-1;debriefShown=false;seenTechEvents=0;toastQueue=[];toastUntil=0;camera=newCamera();if(company.launchSite==='far'){camera.x=world.base.x;camera.y=world.base.y;}
 document.querySelector('#content')!.innerHTML=`<div class="mission"><div class="mission-hud"><div><span>MISSION</span><b>${String(company.rounds+1).padStart(2,'0')}</b></div><div class="time"><span id="phase">SHIFT TIME</span><b id="timer">00:45</b></div><div class="ore-count"><span>DELIVERED</span><b>◆ <span id="delivered">0</span></b><small class="mission-tech">◈ <span id="pending-tech">0</span> PENDING</small></div></div><div class="mission-doctrine">DOCTRINE · ${DOCTRINES[world.doctrine].name.toUpperCase()} · ${missionObjectiveName(world.company).toUpperCase()}</div><div class="field"><canvas id="field" aria-label="Autonomous drones mine asteroids. Drag to pan. Tap a drone for status."></canvas><div class="tech-toast" id="tech-toast" role="status" aria-live="polite" hidden></div><div id="pause-overlay" hidden>PAUSED<span>The fleet is taking a well-earned microbreak.</span></div><div class="camera-controls"><button id="follow" aria-pressed="true">Follow fleet</button><button id="overview">Overview</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button></div><div class="field-caption">LIVE TELEMETRY <span>●</span></div></div><div class="telemetry"><div><small>MINERS</small><b id="fleet">${world.drones.length}/${world.drones.length}</b></div><div><small>CARGO</small><b id="cargo">0 / ${world.drones.reduce((n,d)=>n+d.gear.cargo,0)}</b></div><button id="pause" aria-label="Pause mission">Ⅱ</button><button id="speed" aria-label="Change game speed">1×</button></div><div class="status"><span class="status-dot"></span><p id="status">${company.progress.farSurveyed?'Geological survey online. Rich signals are teal.':'Headbutting efficiency: acceptable.'}</p></div><button class="text-button mission-back" id="abort">Abort mission</button></div>`;
 canvas=document.querySelector<HTMLCanvasElement>('#field')!;resize();
 let drag:{id:number;x:number;y:number;startX:number;startY:number;moved:boolean}|null=null;
 const coords=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*camera.width,y:(e.clientY-r.top)/r.height*camera.height};};
 const refreshCamera=()=>{document.querySelector('#follow')!.setAttribute('aria-pressed',String(camera.follow));};
 canvas.onpointerdown=e=>{if(drag)return;const p=coords(e);drag={id:e.pointerId,x:p.x,y:p.y,startX:p.x,startY:p.y,moved:false};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=coords(e);if(Math.hypot(p.x-drag.startX,p.y-drag.startY)>5)drag.moved=true;if(drag.moved){panCamera(camera,p.x-drag.x,p.y-drag.y);refreshCamera();}drag.x=p.x;drag.y=p.y;};
 canvas.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved){const p=coords(e),q=screenToWorld(camera,p.x,p.y);selected=world.drones.find(d=>Math.hypot(d.x-q.x,d.y-q.y)<24/camera.zoom)?.id??-1;}drag=null;};
 canvas.onpointercancel=()=>{drag=null;};canvas.onlostpointercapture=()=>{drag=null;};
 document.querySelector('#follow')!.addEventListener('click',()=>{camera.follow=true;camera.zoom=1;refreshCamera();});
 document.querySelector('#overview')!.addEventListener('click',()=>{overview(camera);refreshCamera();});
 document.querySelector('#zoom-in')!.addEventListener('click',()=>zoomCamera(camera,1.25));
 document.querySelector('#zoom-out')!.addEventListener('click',()=>zoomCamera(camera,.8));
 document.querySelector('#pause')!.addEventListener('click',()=>{paused=!paused;updateHUD();});
 document.querySelector('#speed')!.addEventListener('click',()=>{speed=speed===1?2:1;document.querySelector('#speed')!.textContent=speed+'×';});
 document.querySelector('#abort')!.addEventListener('click',()=>{paused=true;updateHUD();if(confirm('Abort this mission? Mining and discoveries from this shift will be rolled back.'))showWorkshop();else {paused=false;updateHUD();}});
}
function resize(){if(!canvas||screen!=='mission')return;const r=canvas.getBoundingClientRect();resizeCamera(camera,r.width,r.height);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='mission'){paused=true;accumulator=0;updateHUD();}});
function updateHUD(){if(screen!=='mission')return;
 const remaining=Math.max(0,Math.ceil(ROUND_TIME-world.time));
 document.querySelector('#timer')!.textContent=world.phase==='done'?'REPORT':world.phase==='aftermath'?'SIGNAL LOST':world.phase==='recall'?'HOMEBOUND':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 document.querySelector('#phase')!.textContent=world.phase==='done'?'FINAL':world.phase==='aftermath'?'FLEET LOST':world.phase==='recall'?'RECALL':'SHIFT TIME';
 document.querySelector('#delivered')!.textContent=String(world.delivered);
 document.querySelector('#pending-tech')!.textContent=String(world.pendingTech.length);
 document.querySelector('#fleet')!.textContent=`${world.drones.filter(d=>d.state!=='dead').length}/${world.drones.length}`;
 document.querySelector('#cargo')!.textContent=`${world.drones.reduce((n,d)=>n+d.cargo,0)} / ${world.drones.reduce((n,d)=>n+d.gear.cargo,0)}`;
 document.querySelector('#pause')!.textContent=paused?'▶':'Ⅱ';
 document.querySelector('#pause')!.setAttribute('aria-label',paused?'Resume mission':'Pause mission');
 (document.querySelector('#pause-overlay') as HTMLElement).hidden=!paused;
 document.querySelector('.status')?.classList.toggle('hostile',world.enemies.some(e=>e.hp>0));
 const drone=world.drones.find(d=>d.id===selected);
 if(world.phase==='done')document.querySelector('#status')!.textContent='Final telemetry ready. Return to Mission Control when you are ready.';
 else if(world.phase==='aftermath')document.querySelector('#status')!.textContent='All miners lost. Recovering final telemetry…';
 else if(drone) document.querySelector('#status')!.textContent=`${drone.name} · ${Math.round(drone.hp/drone.maxHp*100)}% hull · Cargo ${drone.cargo}/${drone.gear.cargo} · ${{mine:'Mining',return:'Returning',unload:'Unloading',docked:'Docked',dead:'Destroyed'}[drone.state]}`;
 else if(world.phase==='recall')document.querySelector('#status')!.textContent='Shift over. The fleet is returning with its cargo.';
 else if(world.enemies.some(e=>e.hp>0))document.querySelector('#status')!.textContent=world.guards.some(g=>g.hp>0)?'Rival scouts are hunting the fleet. Escort engaging.':world.company.turret?'Rival scouts are hunting the fleet. HQ turret is standing by.':'Rival scouts are hunting the fleet, even near HQ.';
 else if(!world.company.progress.farSurveyed&&world.progress.farSurveyed)document.querySelector('#status')!.textContent='Far Belt charted. Find a teal mineral sample.';
 else if(!world.company.progress.richSampled&&world.progress.richSampled)document.querySelector('#status')!.textContent='Rich sample delivered. New technology awaits.';
 else if(!world.company.progress.outpostSurveyed&&world.progress.outpostSurveyed)document.querySelector('#status')!.textContent='Outer Reach site surveyed. Outpost plans ready.';
}
function showDebrief(settled:Company){
 const lost=world.drones.filter(d=>d.state==='dead').length;
 const discoveries=([['farSurveyed','Far Belt charted'],['richSampled','Rich sample delivered'],['rivalSeen','Rival scout encountered'],['outpostSurveyed','Outpost site surveyed']] as const).filter(([key])=>world.progress[key]&&!world.company.progress[key]).map(([,name])=>name);

 const field=document.querySelector('.field')!;
 field.insertAdjacentHTML('beforeend',`<div class="debrief-backdrop"><section class="debrief" role="dialog" aria-label="Mission report"><div class="eyebrow">MISSION ${String(company.rounds+1).padStart(2,'0')} · FINAL TELEMETRY</div><h2>${lost===world.drones.length?'Fleet lost.':'Shift complete.'}</h2><p>${DOCTRINES[world.doctrine].name} · ${lost===world.drones.length?'The last miner signal has faded. Repairs and replacements are ready for the next shift.':'The surviving fleet made it back.'}</p><div class="debrief-grid"><span>DELIVERED<b>◆ ${fmt(world.delivered)}</b></span><span>EXTRACTED<b>${fmt(world.extracted)}</b></span><span>RICH ORE<b>${fmt(world.richExtracted)}</b></span><span>MINERS LOST<b>${lost} / ${world.drones.length}</b></span></div><div class="debrief-tech"><span>TECH POINTS EARNED <b>◈ +${settled.techPointsEarned-company.techPointsEarned}</b></span><span>AVAILABLE AFTER MISSION <b>◈ ${settled.techPointsAvailable}</b></span>${world.pendingTech.length?`<small>NEW TECHNOLOGY FOUND · ${world.pendingTech.map(e=>TECH_DISCOVERIES[e.id]).join(' · ')}</small>`:''}</div><p class="debrief-detail">${world.lost?fmt(world.lost)+' cargo dropped for future salvage. ':''}${world.attacks?world.attacks+' hostile shots. ':''}${world.intercepts?world.intercepts+' defensive hits. ':''}${fmt(world.ores.reduce((n,o)=>n+o.value,0))} uncollected ore remains in the field.</p>${discoveries.length?`<p class="new-discovery">NEW · ${discoveries.join(' · ')}</p>`:''}<button id="continue" class="primary">MISSION CONTROL <span>↗</span></button></section></div>`);
 document.querySelector('#continue')!.addEventListener('click',()=>showWorkshop());
}
let hudTime=0;
function tickTechToast(time:number){
 while(seenTechEvents<world.pendingTech.length)toastQueue.push(TECH_DISCOVERIES[world.pendingTech[seenTechEvents++].id]);
 const toast=document.querySelector<HTMLElement>('#tech-toast');
 if(!toast)return;
 if(time>=toastUntil&&toastQueue.length){const label=toastQueue.shift()!;toast.innerHTML=`<span class="tech-glyph">◈</span><strong>TECHNOLOGY DISCOVERED</strong><b>+1 TECH POINT</b><small>${label}</small><em>Pending until shift completion</em>`;toast.hidden=false;toastUntil=time+2600;}
 else if(time>=toastUntil)toast.hidden=true;
}
function frame(time:number){const dt=Math.min((time-last)/1000,.1);last=time;
 if(screen==='mission'){
 if(!paused){accumulator+=dt*(world.phase==='aftermath'?1:speed);while(accumulator>=STEP){if(world.phase==='done')break;step(world);accumulator-=STEP;}}
 tickTechToast(time);
 if(world.phase==='done'&&!debriefShown){debriefShown=true;const next=settle(company,world);showDebrief(next);company=next;save();}
 if(screen==='mission'){followCamera(camera,world,dt);render(canvas,world,selected,camera);hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0;}}}
 requestAnimationFrame(frame);
}
mount();requestAnimationFrame(frame);
