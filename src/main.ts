import {newCamera,followCamera,fleetCenter,screenToWorld,resizeCamera,zoomAt,showFollow} from './camera.ts';
import {MapGestures} from './gestures.ts';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import {buy,createWorld,freshCompany,settle,step,STEP,lockTarget,clearTarget,canTarget,investigated,type Company,type Purchase,type World} from './sim.ts';
import {render} from './render.ts';
import {loadCompany,SAVE_KEY} from './storage.ts';
import {renderLobby,type LobbyTab} from './lobby.ts';
import {changeFleet,fleetError,type FleetType} from './fleet.ts';
import {POIS,type PoiId} from './knowledge.ts';
import {TECH_DISCOVERIES,research,type TechnologyId} from './research.ts';

const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company=freshCompany(),storageOK=true;
try{company=loadCompany(localStorage);}catch{storageOK=false;}
let world:World=createWorld(company),screen:'workshop'|'mission'='workshop',speed=1,accumulator=0,last=0,debriefShown=false;
let activeTab:LobbyTab='workshop',researchOpen=false,selectedPoi:PoiId|null=null,poiSheetKey='',followVisible=false,returning=false;
try{activeTab=localStorage.getItem('aisteroids-lobby-tab')==='hangar'?'hangar':'workshop';}catch{}
let canvas:HTMLCanvasElement|null=null,camera=newCamera(),observer:ResizeObserver|null=null;
const fmt=(n:number)=>n.toLocaleString('en-US');
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(company));}catch{storageOK=false;}}
function showWorkshop(){
 screen='workshop';observer?.disconnect();observer=null;canvas=null;
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">AI<span>↗</span></div><h1><em>AI</em>steroid Mining</h1></header>${renderLobby(company,{tab:activeTab,researchOpen,error:'',storageOK})}<footer class="legal">AIsteroid Mining · Alpha 0.17.0</footer></main>`;
 for(const tab of ['workshop','hangar'] as const)document.querySelector(`#tab-${tab}`)?.addEventListener('click',()=>{
  activeTab=tab;researchOpen=false;try{localStorage.setItem('aisteroids-lobby-tab',tab);}catch{}showWorkshop();
 });
 document.querySelector('#open-research')?.addEventListener('click',()=>{researchOpen=true;showWorkshop();});
 document.querySelector('#close-research')?.addEventListener('click',()=>{researchOpen=false;showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-research]').forEach(b=>b.onclick=()=>{const next=research(company,b.dataset.research as TechnologyId);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{const next=buy(company,b.dataset.buy as Purchase);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-type][data-delta]').forEach(b=>b.onclick=()=>{const next=changeFleet(company,b.dataset.type as FleetType,Number(b.dataset.delta) as -1|1);if(next){company=next;save();showWorkshop();}});
 document.querySelector('#toggle-site')?.addEventListener('click',()=>{if(!company.outpost)return;company={...company,launchSite:company.launchSite==='far'?'home':'far'};save();showWorkshop();});
 document.querySelector('#fix-fleet')?.addEventListener('click',()=>{activeTab='hangar';researchOpen=false;showWorkshop();});
 document.querySelector('#launch')?.addEventListener('click',()=>{if(!fleetError(company))launch();});
 document.querySelector('#reset')?.addEventListener('click',()=>{if(confirm('Reset the entire company?')){company=freshCompany();researchOpen=false;save();world=createWorld(company);showWorkshop();}});
}
function launch(){
 world=createWorld(company,company.worldSeed);screen='mission';speed=1;accumulator=0;selectedPoi=null;poiSheetKey='';debriefShown=false;followVisible=false;returning=false;
 camera=newCamera();camera.x=world.base.x;camera.y=world.base.y;
 app.innerHTML=`<main class="mission"><canvas id="field" aria-label="Asteroid field. Drag to pan, pinch to zoom, tap a discovered signal to inspect."></canvas><div class="mission-hud"><div><span>TIME LEFT</span><b id="timer">00:30</b></div><div class="ore-count"><span>DELIVERED</span><b>◆ <span id="delivered">0</span></b></div></div><div class="poi-sheet" id="poi-sheet" hidden></div><button id="follow" class="follow-control" hidden>◎ FOLLOW FLEET</button><button id="speed" class="speed-control" aria-label="Speed 1 times. Toggle to 2 times">1×</button></main>`;
 const field=document.querySelector<HTMLCanvasElement>('#field')!;canvas=field;resize();
 observer=new ResizeObserver(resize);observer.observe(field);
 const gestures=new MapGestures(camera),coords=(e:PointerEvent)=>{const r=field.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*camera.width,y:(e.clientY-r.top)/r.height*camera.height};};
 field.onpointerdown=e=>{gestures.down(e.pointerId,coords(e));field.setPointerCapture(e.pointerId);};
 field.onpointermove=e=>{gestures.move(e.pointerId,coords(e));};
 field.onpointerup=e=>{const point=gestures.up(e.pointerId,coords(e));if(point){const q=screenToWorld(camera,point.x,point.y);const site=POIS.find(p=>world.discoveredPois.has(p.id)&&Math.hypot(p.x-q.x,p.y-q.y)<Math.max(24,28/camera.zoom));selectedPoi=site?.id??null;updateHUD();}};
 field.onpointercancel=e=>gestures.cancel(e.pointerId);
 field.onlostpointercapture=e=>gestures.cancel(e.pointerId);
 field.addEventListener('wheel',e=>{e.preventDefault();const r=field.getBoundingClientRect();zoomAt(camera,Math.exp(-e.deltaY*.001),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 document.querySelector('#follow')!.addEventListener('click',()=>{camera.follow=true;returning=true;selectedPoi=null;updateHUD();});
 document.querySelector('#speed')!.addEventListener('click',()=>{speed=speed===1?2:1;const b=document.querySelector<HTMLButtonElement>('#speed')!;b.textContent=`${speed}×`;b.setAttribute('aria-label',`Speed ${speed} times. Toggle to ${speed===1?2:1} times`);});
 updateHUD();
}
function resize(){if(!canvas||screen!=='mission')return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;resizeCamera(camera,r.width,r.height);const dpr=Math.min(devicePixelRatio||1,2);const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}}
window.addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{accumulator=0;last=performance.now();});
function updateHUD(){if(screen!=='mission')return;
 const remaining=Math.max(0,Math.ceil(world.missionDuration-world.time));
 document.querySelector('#timer')!.textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 document.querySelector('#delivered')!.textContent=String(world.delivered);
 const button=document.querySelector<HTMLButtonElement>('#follow')!;followVisible=showFollow(camera,world,followVisible);button.hidden=!followVisible||!!selectedPoi;
 const sheet=document.querySelector<HTMLElement>('#poi-sheet')!,poi=POIS.find(p=>p.id===selectedPoi);sheet.hidden=!poi;
 if(poi){const done=investigated(world,poi.id),reason=canTarget(world,poi.id),key=`${poi.id}:${done}:${world.activeTarget}:${reason}`;
  if(key!==poiSheetKey){poiSheetKey=key;sheet.innerHTML=`<div><b>${poi.name}</b><button id="close-poi" aria-label="Close signal details">×</button></div><small>${done?'INVESTIGATED':world.activeTarget===poi.id?'ESCORT EN ROUTE':'SIGNAL DISCOVERED'}</small>${!done?`<button id="target-action" ${world.activeTarget===poi.id?'':reason?'disabled':''}>${world.activeTarget===poi.id?'CLEAR TARGET':'LOCK TARGET'}</button>${reason&&world.activeTarget!==poi.id?`<small>${reason}</small>`:''}`:''}`;
   sheet.querySelector('#close-poi')?.addEventListener('click',()=>{selectedPoi=null;updateHUD();});
   sheet.querySelector('#target-action')?.addEventListener('click',()=>{if(world.activeTarget===poi.id)clearTarget(world);else lockTarget(world,poi.id);updateHUD();});
  }
 }else poiSheetKey='';
}
function showDebrief(settled:Company){
 const minerLosses=world.drones.filter(d=>d.state==='dead').length,haulerLosses=world.haulers.filter(h=>h.state==='dead').length;
 const scoutLosses=world.scouts.filter(s=>s.state==='dead').length,escortLosses=world.guards.filter(g=>g.hp<=0).length;
 const fleetLost=minerLosses===world.drones.length&&haulerLosses===world.haulers.length;
 const lossParts=[minerLosses&&`${minerLosses} Miner${minerLosses===1?'':'s'}`,haulerLosses&&`${haulerLosses} Hauler${haulerLosses===1?'':'s'}`,scoutLosses&&`${scoutLosses} Scout${scoutLosses===1?'':'s'}`,escortLosses&&`${escortLosses} Escort${escortLosses===1?'':'s'}`].filter(Boolean);
 const milestones=([['farSurveyed','Far Belt charted'],['richSampled','Rich sample delivered'],['rivalSeen','Rival scout encountered'],['outpostSurveyed','Outpost site surveyed']] as const).filter(([key])=>world.progress[key]&&!world.company.progress[key]).map(([,name])=>name);
 const discovery=[...new Set([...milestones,...world.pendingTech.filter(e=>!['far_belt_charted','first_rich_sample','first_rival_contact','outpost_site_surveyed'].includes(e.id)).map(e=>TECH_DISCOVERIES[e.id]),...world.newSignals.flatMap(id=>{const site=POIS.find(p=>p.id===id);return site?[site.name]:[];})])];
 const result=document.createElement('div');result.className='debrief-backdrop';
 result.innerHTML=`<section class="debrief" role="dialog" aria-label="Mission report"><div class="eyebrow">MISSION ${String(company.rounds+1).padStart(2,'0')} · FINAL REPORT</div><h2 class="${fleetLost?'loss':''}">${fleetLost?'Fleet lost.':'Shift complete.'}</h2><div class="debrief-grid"><div class="result-delivered"><span>DELIVERED MINERALS</span><b>◆ ${fmt(world.delivered)}</b></div><div><span>FLEET LOSSES</span><b>${lossParts.length?lossParts.join(' · '):'0'}</b></div><div><span>TECH POINTS EARNED</span><b>◈ +${settled.techPointsEarned-company.techPointsEarned}</b></div></div>${discovery.length?`<div class="new-discovery"><strong>NEW</strong><p>${discovery.join(' · ')}</p></div>`:''}<button id="continue" class="primary">RETURN TO MISSION CONTROL <span>↗</span></button></section>`;
 app.querySelector('.mission')!.append(result);
 result.querySelector('#continue')!.addEventListener('click',()=>showWorkshop());
}
let hudTime=0;
function frame(time:number){const dt=last?Math.min((time-last)/1000,.1):0;last=time;
 if(screen==='mission'&&!document.hidden){
  accumulator+=dt*(world.phase==='aftermath'?1:speed);
  while(accumulator>=STEP){if(world.phase==='done')break;step(world);accumulator-=STEP;}
  if(world.phase==='done'&&!debriefShown){debriefShown=true;const next=settle(company,world);showDebrief(next);company=next;save();}
  if(canvas){followCamera(camera,world,dt,returning);const target=fleetCenter(world);if(returning&&Math.hypot(camera.x-target.x,camera.y-target.y)<8)returning=false;render(canvas,world,-1,camera);hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0;}}
 }
 requestAnimationFrame(frame);
}
showWorkshop();requestAnimationFrame(frame);
