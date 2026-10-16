import {newCamera,followCamera,fleetCenter,screenToWorld,resizeCamera,zoomAt,showFollow} from './camera.ts';
import {MapGestures} from './gestures.ts';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import {buy,buyEnvironment,createWorld,freshCompany,settle,step,STEP,lockTarget,clearTarget,canTarget,investigated,prioritizePoi,focusSurvey,clearSurvey,knownBiomeAt,type Company,type Purchase,type World} from './sim.ts';
import {render} from './render.ts';
import {loadCompany,SAVE_KEY} from './storage.ts';
import {renderLobby,type LobbyTab} from './lobby.ts';
import {changeFleet,fleetError,usedSlots,type FleetType} from './fleet.ts';
import {POIS,type PoiId} from './knowledge.ts';
import {TECH_DISCOVERIES,research,type TechnologyId} from './research.ts';
import {mountArtGallery} from './art-gallery.ts';
import {BIOMES,type EnvironmentUpgrade} from './biomes.ts';
import {MINERALS,canExtract} from './minerals.ts';

const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company=freshCompany(),storageOK=true;
try{company=loadCompany(localStorage);}catch{storageOK=false;}
let world:World=createWorld(company),screen:'workshop'|'mission'='workshop',speed=1,accumulator=0,last=0,debriefShown=false;
let activeTab:LobbyTab='workshop',researchOpen=false,selectedPoi:PoiId|null=null,selectedRock:number|null=null,selectedArea:{x:number;y:number}|null=null,poiSheetKey='',rockSheetKey='',areaSheetKey='',followVisible=false,returning=false;
let regionNoticeCount=0,regionNoticeUntil=0;
try{activeTab=localStorage.getItem('aisteroids-lobby-tab')==='hangar'?'hangar':'workshop';}catch{}
let canvas:HTMLCanvasElement|null=null,camera=newCamera(),observer:ResizeObserver|null=null;
const fmt=(n:number)=>n.toLocaleString('en-US');
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(company));}catch{storageOK=false;}}
function showWorkshop(){
 screen='workshop';observer?.disconnect();observer=null;canvas=null;
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">AI<span>↗</span></div><h1><em>AI</em>steroid Mining</h1></header>${renderLobby(company,{tab:activeTab,researchOpen,error:'',storageOK})}<footer class="legal">AIsteroid Mining · Alpha 0.21.0</footer></main>`;
 for(const tab of ['workshop','hangar'] as const)document.querySelector(`#tab-${tab}`)?.addEventListener('click',()=>{
  activeTab=tab;researchOpen=false;try{localStorage.setItem('aisteroids-lobby-tab',tab);}catch{}showWorkshop();
 });
 document.querySelector('#open-research')?.addEventListener('click',()=>{researchOpen=true;showWorkshop();});
 document.querySelector('#close-research')?.addEventListener('click',()=>{researchOpen=false;showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-research]').forEach(b=>b.onclick=()=>{const next=research(company,b.dataset.research as TechnologyId);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{const next=buy(company,b.dataset.buy as Purchase);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-environment]').forEach(b=>b.onclick=()=>{const next=buyEnvironment(company,b.dataset.environment as EnvironmentUpgrade);if(next){company=next;save();showWorkshop();}});
 document.querySelectorAll<HTMLButtonElement>('[data-type][data-delta]').forEach(b=>b.onclick=()=>{const next=changeFleet(company,b.dataset.type as FleetType,Number(b.dataset.delta) as -1|1);if(next){company=usedSlots(next.fleetComposition)===next.fleetCapacity?{...next,capacityReminder:next.fleetCapacity}:next;save();showWorkshop();}});
 document.querySelector('#toggle-site')?.addEventListener('click',()=>{if(!company.outpost)return;company={...company,launchSite:company.launchSite==='far'?'home':'far'};save();showWorkshop();});
 document.querySelector('#fix-fleet')?.addEventListener('click',()=>{activeTab='hangar';researchOpen=false;showWorkshop();});
 document.querySelector('#launch')?.addEventListener('click',()=>{
  if(fleetError(company))return;
  const used=usedSlots(company.fleetComposition);
  if(company.capacityReminder>=company.fleetCapacity||used===company.fleetCapacity){launch();return;}
  if(document.querySelector('#capacity-dialog'))return;
  const dialog=document.createElement('div');dialog.id='capacity-dialog';dialog.className='capacity-backdrop';
  dialog.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="capacity-title" class="capacity-dialog"><h2 id="capacity-title">Unused fleet capacity</h2><p>You're using ${used} of ${company.fleetCapacity} fleet slots. Deploy anyway?</p><button id="open-hangar" class="primary">OPEN HANGAR</button><button id="deploy-anyway">DEPLOY ANYWAY</button><button id="cancel-deploy" aria-label="Cancel deployment">CANCEL</button></section>`;
  app.append(dialog);
  dialog.querySelector<HTMLButtonElement>('#open-hangar')!.onclick=()=>{dialog.remove();activeTab='hangar';showWorkshop();document.querySelector<HTMLButtonElement>('#tab-hangar')?.focus();};
  dialog.querySelector<HTMLButtonElement>('#deploy-anyway')!.onclick=()=>{dialog.remove();if(fleetError(company)||screen!=='workshop')return;company={...company,capacityReminder:company.fleetCapacity};save();launch();};
  dialog.querySelector<HTMLButtonElement>('#cancel-deploy')!.onclick=()=>dialog.remove();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.remove();});
  dialog.addEventListener('keydown',e=>{
   if(e.key==='Escape'){dialog.remove();document.querySelector<HTMLButtonElement>('#launch')?.focus();}
   if(e.key==='Tab'){
    const buttons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')),first=buttons[0],last=buttons.at(-1)!;
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  });
  dialog.querySelector<HTMLButtonElement>('#open-hangar')?.focus();
 });
 document.querySelector('#reset')?.addEventListener('click',()=>{if(confirm('Reset the entire company?')){company=freshCompany();researchOpen=false;save();world=createWorld(company);showWorkshop();}});
}
function launch(){
 world=createWorld(company,company.worldSeed);screen='mission';speed=1;accumulator=0;selectedPoi=null;selectedRock=null;selectedArea=null;poiSheetKey='';rockSheetKey='';areaSheetKey='';regionNoticeCount=0;regionNoticeUntil=0;debriefShown=false;followVisible=false;returning=false;
 camera=newCamera();camera.x=world.base.x;camera.y=world.base.y;
 app.innerHTML=`<main class="mission"><canvas id="field" aria-label="Asteroid field. Drag to pan, pinch to zoom, tap a discovered signal, rock or charted area to inspect."></canvas><div class="mission-hud"><div><span>TIME LEFT</span><b id="timer">00:30</b></div><div class="ore-count"><span>DELIVERED CREDITS</span><b>◆ <span id="delivered">0</span></b></div></div><div id="region-notice" class="region-notice" hidden></div><div class="poi-sheet" id="poi-sheet" hidden></div><div class="poi-sheet" id="rock-sheet" hidden></div><div class="poi-sheet" id="area-sheet" hidden></div><button id="focus-chip" class="focus-chip" hidden>SCOUT FOCUS · CLEAR</button><button id="follow" class="follow-control" hidden>◎ FOLLOW FLEET</button><button id="speed" class="speed-control" aria-label="Speed 1 times. Toggle to 2 times">1×</button></main>`;
 const field=document.querySelector<HTMLCanvasElement>('#field')!;canvas=field;resize();
 observer=new ResizeObserver(resize);observer.observe(field);
 const gestures=new MapGestures(camera),coords=(e:PointerEvent)=>{const r=field.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*camera.width,y:(e.clientY-r.top)/r.height*camera.height};};
 field.onpointerdown=e=>{gestures.down(e.pointerId,coords(e));field.setPointerCapture(e.pointerId);};
 field.onpointermove=e=>{gestures.move(e.pointerId,coords(e));};
 field.onpointerup=e=>{const point=gestures.up(e.pointerId,coords(e));if(point){const q=screenToWorld(camera,point.x,point.y);const site=POIS.find(p=>world.discoveredPois.has(p.id)&&Math.hypot(p.x-q.x,p.y-q.y)<Math.max(24,28/camera.zoom));const rock=site?undefined:world.rocks.find(r=>r.hp>0&&world.identifiedRocks.has(r.id)&&Math.hypot(r.x-q.x,r.y-q.y)<r.r+Math.max(5,10/camera.zoom));selectedPoi=site?.id??null;selectedRock=rock?.id??null;selectedArea=site||rock?null:world.scouts.some(s=>s.state!=='dead'&&s.state!=='docked')&&(knownBiomeAt(world,q)||[[-25,0],[25,0],[0,-25],[0,25]].some(([x,y])=>knownBiomeAt(world,{x:q.x+x,y:q.y+y})))?q:null;updateHUD();}};
 field.onpointercancel=e=>gestures.cancel(e.pointerId);
 field.onlostpointercapture=e=>gestures.cancel(e.pointerId);
 field.addEventListener('wheel',e=>{e.preventDefault();const r=field.getBoundingClientRect();zoomAt(camera,Math.exp(-e.deltaY*.001),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 document.querySelector('#follow')!.addEventListener('click',()=>{camera.follow=true;returning=true;selectedPoi=null;selectedRock=null;selectedArea=null;updateHUD();});
 document.querySelector('#focus-chip')!.addEventListener('click',()=>{clearSurvey(world);selectedArea=null;updateHUD();});
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
 const notice=document.querySelector<HTMLElement>('#region-notice')!;
 if(world.newRegions.length>regionNoticeCount){regionNoticeCount=world.newRegions.length;regionNoticeUntil=world.time+2.7;notice.textContent=`REGION DISCOVERED · ${BIOMES[world.newRegions.at(-1)!].name.toUpperCase()}`;}
 notice.hidden=world.time>=regionNoticeUntil||world.phase!=='mining';
 const button=document.querySelector<HTMLButtonElement>('#follow')!;followVisible=showFollow(camera,world,followVisible);button.hidden=!followVisible||!!selectedPoi||selectedRock!==null||!!selectedArea;
 document.querySelector<HTMLButtonElement>('#focus-chip')!.hidden=!world.surveyFocus||world.phase!=='mining';
 const area=document.querySelector<HTMLElement>('#area-sheet')!,id=selectedArea&&knownBiomeAt(world,selectedArea),areaKey=selectedArea?`${Math.round(selectedArea.x)}:${Math.round(selectedArea.y)}:${id}:${world.phase}`:'';
 area.hidden=!selectedArea||!!selectedPoi||selectedRock!==null||world.phase!=='mining';
 if(!area.hidden&&selectedArea&&areaKey!==areaSheetKey){areaSheetKey=areaKey;area.innerHTML=`<div><b>${id?BIOMES[id].name:'Uncharted edge'}</b><button id="close-area" aria-label="Close area details">×</button></div><small>${id?BIOMES[id].risk:'SURVEY AREA'}</small><button id="survey-action">FOCUS SCOUTING</button>`;
  area.querySelector('#close-area')?.addEventListener('click',()=>{selectedArea=null;updateHUD();});
  area.querySelector('#survey-action')?.addEventListener('click',()=>{if(selectedArea)focusSurvey(world,selectedArea);selectedArea=null;updateHUD();});
 }else if(area.hidden)areaSheetKey='';
 const sheet=document.querySelector<HTMLElement>('#poi-sheet')!,poi=POIS.find(p=>p.id===selectedPoi);sheet.hidden=!poi;
 if(poi){const done=investigated(world,poi.id),reason=canTarget(world,poi.id),key=`${poi.id}:${done}:${world.activeTarget}:${world.scoutPriority}:${world.scouts.some(s=>s.state==='exploring')}:${reason}`;
  if(key!==poiSheetKey){poiSheetKey=key;sheet.innerHTML=`<div><b>${poi.name}</b><button id="close-poi" aria-label="Close signal details">×</button></div><small>${done?'INVESTIGATED':world.activeTarget===poi.id?'ESCORT EN ROUTE':'SIGNAL DISCOVERED'}</small>${!done?`${world.scouts.some(s=>s.state==='exploring')?`<button id="scout-priority">${world.scoutPriority===poi.id?'CLEAR SCOUT PRIORITY':'PRIORITIZE SCOUT'}</button>`:''}${world.guards.some(g=>g.hp>0)?`<button id="target-action" ${world.activeTarget===poi.id?'':reason?'disabled':''}>${world.activeTarget===poi.id?'CLEAR TARGET':'LOCK TARGET'}</button>`:''}`:''}`;
   sheet.querySelector('#close-poi')?.addEventListener('click',()=>{selectedPoi=null;updateHUD();});
   sheet.querySelector('#target-action')?.addEventListener('click',()=>{if(world.activeTarget===poi.id)clearTarget(world);else lockTarget(world,poi.id);updateHUD();});
   sheet.querySelector('#scout-priority')?.addEventListener('click',()=>{prioritizePoi(world,poi.id);poiSheetKey='';updateHUD();});
  }
 }else poiSheetKey='';
 const rockSheet=document.querySelector<HTMLElement>('#rock-sheet')!,rock=world.rocks.find(r=>r.id===selectedRock&&r.hp>0);
 rockSheet.hidden=!rock||!!selectedPoi;
 if(rock){const spec=MINERALS[rock.mineral],available=world.drones.some(d=>d.state!=='dead'&&canExtract(d.kind,rock.mineral,world.company.extractionUpgrades));
  const requirement=spec.tool==='highPowerOptics'?'High-Power Optics':spec.tool==='resonanceMining'?'Resonance Mining':spec.tool==='laser'?'Laser Miner':'compatible Miner';
  const key=`${rock.id}:${rock.hp}:${available}`;
  if(key!==rockSheetKey){rockSheetKey=key;rockSheet.innerHTML=`<div><b>${spec.name} deposit</b><button id="close-rock" aria-label="Close deposit details">×</button></div><small>${rock.hp} fragments · ${spec.credits} Credits each${available?'':` · Requires ${requirement}`}</small>`;
   rockSheet.querySelector('#close-rock')?.addEventListener('click',()=>{selectedRock=null;updateHUD();});
  }
 }else rockSheetKey='';
}
function showDebrief(settled:Company){
 const minerLosses=world.drones.filter(d=>d.state==='dead').length,haulerLosses=world.haulers.filter(h=>h.state==='dead').length;
 const scoutLosses=world.scouts.filter(s=>s.state==='dead').length,escortLosses=world.guards.filter(g=>g.hp<=0).length;
 const fleetLost=minerLosses===world.drones.length&&haulerLosses===world.haulers.length;
 const lossParts=[minerLosses&&`${minerLosses} Miner${minerLosses===1?'':'s'}`,haulerLosses&&`${haulerLosses} Hauler${haulerLosses===1?'':'s'}`,scoutLosses&&`${scoutLosses} Scout${scoutLosses===1?'':'s'}`,escortLosses&&`${escortLosses} Escort${escortLosses===1?'':'s'}`].filter(Boolean);
 const milestones=([['farSurveyed','Far Belt charted'],['richSampled','Valuable sample delivered'],['rivalSeen','Rival scout encountered'],['outpostSurveyed','Outpost site surveyed']] as const).filter(([key])=>world.progress[key]&&!world.company.progress[key]).map(([,name])=>name);
 const discovery=[...new Set([...milestones,...world.newRegions.map(id=>`${BIOMES[id].name} charted`),...world.pendingTech.filter(e=>!['far_belt_charted','first_rich_sample','first_rival_contact','outpost_site_surveyed'].includes(e.id)).map(e=>TECH_DISCOVERIES[e.id]),...world.newSignals.flatMap(id=>{const site=POIS.find(p=>p.id===id);return site?[site.name]:[];})])];
 const result=document.createElement('div');result.className='debrief-backdrop';
 result.innerHTML=`<section class="debrief" role="dialog" aria-label="Mission report"><div class="eyebrow">MISSION ${String(company.rounds+1).padStart(2,'0')} · FINAL REPORT</div><h2 class="${fleetLost?'loss':''}">${fleetLost?'Fleet lost.':'Shift complete.'}</h2><div class="debrief-grid"><div class="result-delivered"><span>CREDITS EARNED</span><b>◆ ${fmt(world.delivered)}</b></div><div><span>FLEET LOSSES</span><b>${lossParts.length?lossParts.join(' · '):'0'}</b></div><div><span>TECH POINTS EARNED</span><b>◈ +${settled.techPointsEarned-company.techPointsEarned}</b></div></div>${discovery.length?`<div class="new-discovery"><strong>NEW</strong><p>${discovery.join(' · ')}</p></div>`:''}<button id="continue" class="primary">RETURN TO MISSION CONTROL <span>↗</span></button></section>`;
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
if(new URLSearchParams(location.search).has('assetGallery'))mountArtGallery(app);
else {showWorkshop();requestAnimationFrame(frame);}
