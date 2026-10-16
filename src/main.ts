import {newCamera,followCamera,fleetCenter,screenToWorld,resizeCamera,zoomAt,showFollow} from './camera.ts';
import {MapGestures} from './gestures.ts';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import {buy,buyEnvironment,createWorld,freshCompany,settle,step,STEP,lockTarget,clearTarget,canTarget,investigated,setFocus,type Company,type Purchase,type World} from './sim.ts';
import {render} from './render.ts';
import {readCompany,SAVE_KEY} from './storage.ts';
import {renderLobby,type LobbyTab} from './lobby.ts';
import {changeFleet,fleetError,usedSlots,type FleetType} from './fleet.ts';
import {POIS,type PoiId} from './knowledge.ts';
import {TECH_DISCOVERIES,research,type TechnologyId} from './research.ts';
import {mountArtGallery} from './art-gallery.ts';
import {BIOMES,type EnvironmentUpgrade} from './biomes.ts';
import {MINERALS,canExtract} from './minerals.ts';
import {withFocus,hitFocus,validFocusPoint,type FocusRole} from './focus.ts';
import {parseSeed,nextSeed} from './seed.ts';
import {finishRecall} from './recall.ts';
import {mountMenuScene} from './menu.ts';
import {readMotion,reducedMotion,saveMotion,type MotionChoice} from './preferences.ts';

const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company,world:World,hasCompany=false,storageOK=true,bootIssue:'corrupt'|'storage'|null=null;
try{const saved=readCompany(localStorage);hasCompany=!!saved.company;if(saved.company)company=saved.company;storageOK=saved.storageOK;bootIssue=saved.issue;}
catch{storageOK=false;bootIssue='storage';}
let screen:'menu'|'workshop'|'mission'='menu',speed=1,accumulator=0,last=0,debriefShown=false,recallVisible=0,resolving=false,missionToken=0;
let activeTab:LobbyTab='workshop',researchOpen=false,selectedPoi:PoiId|null=null,selectedRock:number|null=null,focusPopup:{world:{x:number;y:number};screen:{x:number;y:number}}|null=null,poiSheetKey='',rockSheetKey='',followVisible=false,returning=false;
let regionNoticeCount=0,regionNoticeUntil=0;
try{const tab=localStorage.getItem('aisteroids-lobby-tab');activeTab=tab==='hangar'||tab==='research'?tab:'workshop';}catch{}
let canvas:HTMLCanvasElement|null=null,camera=newCamera(),observer:ResizeObserver|null=null;
let menuCleanup:(()=>void)|null=null,motionChoice:MotionChoice='system';
try{motionChoice=readMotion(localStorage);}catch{}
const media=matchMedia('(prefers-reduced-motion: reduce)');
const isReduced=()=>reducedMotion(motionChoice,media.matches);
media.addEventListener('change',()=>{if(screen==='menu'&&motionChoice==='system'){
 menuCleanup?.();menuCleanup=mountMenuScene(app.querySelector<HTMLCanvasElement>('#menu-scene')!,isReduced());
 const checkbox=app.querySelector<HTMLInputElement>('#reduce-motion');if(checkbox)checkbox.checked=isReduced();
}});
const fmt=(n:number)=>n.toLocaleString('en-US');
function saveCompany(next:Company){try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));storageOK=true;return true;}catch{storageOK=false;return false;}}
function save(){saveCompany(company);}
function showMenu(){
 menuCleanup?.();menuCleanup=null;screen='menu';observer?.disconnect();observer=null;canvas=null;
 app.innerHTML=`<main class="title-screen"><canvas id="menu-scene" aria-hidden="true"></canvas><div class="title-content"><h1>ROCK BOTTOM <span>ROBOTICS</span></h1><div class="title-actions">${hasCompany?'<button id="menu-continue" class="menu-button solid">CONTINUE</button>':''}<button id="menu-new" class="menu-button ${hasCompany?'outline':'solid'}">NEW GAME</button><button id="menu-settings" class="menu-button quiet">SETTINGS</button>${bootIssue?`<p class="menu-warning" role="status">${bootIssue==='corrupt'?'Your company save could not be read. Starting a new game will replace it.':'Storage is unavailable. Your saved company cannot be loaded or changed right now.'}</p>`:''}</div></div><small class="title-version">Alpha 0.24.0</small></main>`;
 menuCleanup=mountMenuScene(app.querySelector<HTMLCanvasElement>('#menu-scene')!,isReduced());
 app.querySelector('#menu-continue')?.addEventListener('click',()=>{if(hasCompany)showWorkshop();});
 app.querySelector('#menu-new')?.addEventListener('click',openNewGame);
 app.querySelector('#menu-settings')?.addEventListener('click',openSettings);
}
function showWorkshop(){
 if(!hasCompany)return;
 menuCleanup?.();menuCleanup=null;screen='workshop';observer?.disconnect();observer=null;canvas=null;
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">RB<span>↗</span></div><h1>Rock Bottom <em>Robotics</em></h1></header>${renderLobby(company,{tab:activeTab,researchOpen,error:'',storageOK})}<footer class="legal">Rock Bottom Robotics · Alpha 0.24.0</footer></main>`;
 for(const tab of ['workshop','hangar','research'] as const)document.querySelector(`#tab-${tab}`)?.addEventListener('click',()=>{
  activeTab=tab;researchOpen=false;try{localStorage.setItem('aisteroids-lobby-tab',tab);}catch{}showWorkshop();
 });
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
 document.querySelector('#new-game')?.addEventListener('click',openNewGame);
 document.querySelector('#main-menu')?.addEventListener('click',showMenu);
 document.querySelector('#copy-seed')?.addEventListener('click',()=>copySeed(app));
}
function openNewGame(){
 if((screen!=='workshop'&&screen!=='menu')||document.querySelector('#new-game-dialog'))return;
 const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const origin=screen,active=hasCompany?company.worldSeed:null;
 let candidate=nextSeed(active??7,active,()=>crypto.getRandomValues(new Uint32Array(1))[0]);
 const backdrop=document.createElement('div');backdrop.id='new-game-dialog';backdrop.className='capacity-backdrop';
 backdrop.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="new-game-title" class="capacity-dialog"><h2 id="new-game-title">New Game</h2>${hasCompany?'<p>Starting a new game replaces your current company and progress.</p>':bootIssue==='corrupt'?'<p>The saved company cannot be read. Starting a new game replaces that data.</p>':''}<label for="world-seed">World seed</label><div class="seed-input"><input id="world-seed" inputmode="numeric" autocomplete="off" value="${candidate}" aria-describedby="seed-error"><button id="reroll-seed" type="button" aria-label="Randomize seed">↻</button></div><p id="seed-error" class="form-error" role="alert" hidden>Enter a whole number from 0 to 4294967295.</p><button id="start-new" class="primary">START NEW COMPANY</button><button id="cancel-new">CANCEL</button></section>`;
 app.append(backdrop);
 const field=backdrop.querySelector<HTMLInputElement>('#world-seed')!,error=backdrop.querySelector<HTMLElement>('#seed-error')!;
 const close=()=>{backdrop.remove();if(opener?.isConnected)opener.focus();};
 backdrop.querySelector<HTMLButtonElement>('#reroll-seed')!.onclick=()=>{candidate=nextSeed(candidate,active,()=>crypto.getRandomValues(new Uint32Array(1))[0]);field.value=String(candidate);error.hidden=true;};
 backdrop.querySelector<HTMLButtonElement>('#cancel-new')!.onclick=close;
 let submitting=false;
 backdrop.querySelector<HTMLButtonElement>('#start-new')!.onclick=()=>{
  if(submitting||screen!==origin||!backdrop.isConnected)return;
  const seed=parseSeed(field.value);if(seed===null){error.hidden=false;field.focus();return;}
  submitting=true;
  const next=freshCompany(seed);
  if(!saveCompany(next)){submitting=false;error.hidden=false;error.textContent='Saving failed. Your current company is unchanged.';return;}
  missionToken++;company=next;hasCompany=true;bootIssue=null;researchOpen=false;focusPopup=null;debriefShown=false;backdrop.remove();showWorkshop();
 };
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
 trapDialog(backdrop,close);
 field.focus();field.select();
}
function trapDialog(backdrop:HTMLElement,close:()=>void){
 backdrop.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key!=='Tab')return;
  const items=Array.from(backdrop.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)!.focus();}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
 });
}
function openSettings(){
 if(screen!=='menu'||document.querySelector('#settings-dialog'))return;
 const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const backdrop=document.createElement('div');backdrop.id='settings-dialog';backdrop.className='capacity-backdrop';
 backdrop.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="settings-title" class="capacity-dialog"><h2 id="settings-title">Settings</h2><label class="motion-control"><input type="checkbox" id="reduce-motion" ${isReduced()?'checked':''}> Reduce motion</label><p class="settings-note">${motionChoice==='system'?'Using your device preference.':'Using your chosen preference.'}</p><p id="settings-error" class="form-error" role="status" hidden>Preference could not be saved; it works for this session.</p>${hasCompany?`<div class="settings-seed">World seed: <span id="current-seed">${company.worldSeed}</span> <button id="settings-copy-seed" aria-label="Copy current world seed">COPY</button></div>`:''}<button id="close-settings">BACK</button></section>`;
 app.append(backdrop);
 const close=()=>{backdrop.remove();if(opener?.isConnected)opener.focus();};
 const checkbox=backdrop.querySelector<HTMLInputElement>('#reduce-motion')!;
 checkbox.onchange=()=>{
  motionChoice=checkbox.checked?'reduce':'full';
  backdrop.querySelector<HTMLElement>('.settings-note')!.textContent='Using your chosen preference.';
  backdrop.querySelector<HTMLElement>('#settings-error')!.hidden=saveMotion(localStorage,motionChoice);
  menuCleanup?.();menuCleanup=mountMenuScene(app.querySelector<HTMLCanvasElement>('#menu-scene')!,isReduced());
 };
 backdrop.querySelector('#settings-copy-seed')?.addEventListener('click',()=>copySeed(backdrop));
 backdrop.querySelector('#close-settings')!.addEventListener('click',close);
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
 trapDialog(backdrop,close);checkbox.focus();
}
async function copySeed(scope:ParentNode){
 try{await navigator.clipboard.writeText(String(company.worldSeed));}
 catch{const value=scope.querySelector<HTMLElement>('#current-seed');if(value){const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(value);selection?.removeAllRanges();selection?.addRange(range);}}
}
function changeFocus(role:FocusRole,p:{x:number;y:number}|null){
 const next={...company,focuses:withFocus(company.focuses,role,p)};
 if(!saveCompany(next))return;
 company=next;setFocus(world,role,p);dismissFocus();updateHUD();
}
function dismissFocus(){focusPopup=null;const popup=document.querySelector<HTMLElement>('#focus-popup');if(popup)popup.hidden=true;}
function openFocus(screenPoint:{x:number;y:number},point:{x:number;y:number}){
 focusPopup={world:{...point},screen:{...screenPoint}};
 selectedPoi=null;selectedRock=null;
 const site=POIS.find(p=>world.discoveredPois.has(p.id)&&Math.hypot(p.x-point.x,p.y-point.y)<Math.max(24,28/camera.zoom));
 const rock=site?undefined:world.rocks.find(r=>r.hp>0&&world.identifiedRocks.has(r.id)&&Math.hypot(r.x-point.x,r.y-point.y)<r.r+Math.max(5,10/camera.zoom));
 const popup=document.querySelector<HTMLElement>('#focus-popup')!;
 popup.style.left=`${Math.max(8,Math.min(camera.width-226,screenPoint.x-105))}px`;
 popup.style.top=`${Math.max(78,Math.min(camera.height-205,screenPoint.y+15))}px`;
 popup.innerHTML=`<div class="focus-actions"><button data-focus="mining" aria-label="Set Mining focus here"><span class="focus-glyph mining" aria-hidden="true"></span>MINING</button><button data-focus="scout" aria-label="Set Scout focus here"><span class="focus-glyph scout" aria-hidden="true"></span>SCOUT</button></div>${site||rock?`<button id="inspect-focus">DETAILS · ${site?site.name:'MINERAL DEPOSIT'}</button>`:''}`;
 popup.hidden=false;
 popup.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button=>button.onclick=()=>{if(focusPopup)changeFocus(button.dataset.focus as FocusRole,focusPopup.world);});
 popup.querySelector<HTMLButtonElement>('#inspect-focus')?.addEventListener('click',()=>{selectedPoi=site?.id??null;selectedRock=rock?.id??null;dismissFocus();updateHUD();});
 updateHUD();
}
function launch(){
 world=createWorld(company,company.worldSeed);missionToken++;screen='mission';speed=1;accumulator=0;last=0;recallVisible=0;resolving=false;selectedPoi=null;selectedRock=null;focusPopup=null;poiSheetKey='';rockSheetKey='';regionNoticeCount=0;regionNoticeUntil=0;debriefShown=false;followVisible=false;returning=false;
 camera=newCamera();camera.x=world.base.x;camera.y=world.base.y;
 app.innerHTML=`<main class="mission"><canvas id="field" aria-label="Asteroid field. Drag to pan, pinch to zoom, tap anywhere to set Mining or Scout focus."></canvas><div class="mission-hud"><div><span>TIME LEFT</span><b id="timer">00:30</b></div><div class="ore-count"><span>DELIVERED CREDITS</span><b>◆ <span id="delivered">0</span></b></div></div><div id="region-notice" class="region-notice" hidden></div><div class="poi-sheet" id="poi-sheet" hidden></div><div class="poi-sheet" id="rock-sheet" hidden></div><div class="focus-popup" id="focus-popup" hidden></div><button id="follow" class="follow-control" hidden>◎ FOLLOW FLEET</button><button id="speed" class="speed-control" aria-label="Speed 1 times. Toggle to 2 times">1×</button></main>`;
 const field=document.querySelector<HTMLCanvasElement>('#field')!;canvas=field;resize();
 observer=new ResizeObserver(resize);observer.observe(field);
 const gestures=new MapGestures(camera),coords=(e:PointerEvent)=>{const r=field.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*camera.width,y:(e.clientY-r.top)/r.height*camera.height};};
 field.onpointerdown=e=>{gestures.down(e.pointerId,coords(e));field.setPointerCapture(e.pointerId);};
 field.onpointermove=e=>{gestures.move(e.pointerId,coords(e));};
 field.onpointerup=e=>{const point=gestures.up(e.pointerId,coords(e));if(!point)return;
  if(focusPopup){dismissFocus();return;}
  const role=hitFocus(world.focuses,camera,point);
  if(role){changeFocus(role,null);return;}
  const q=screenToWorld(camera,point.x,point.y);if(!validFocusPoint(q))return;
  openFocus(point,q);
 };
 field.onpointercancel=e=>gestures.cancel(e.pointerId);
 field.onlostpointercapture=e=>gestures.cancel(e.pointerId);
 field.addEventListener('wheel',e=>{e.preventDefault();const r=field.getBoundingClientRect();zoomAt(camera,Math.exp(-e.deltaY*.001),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 document.querySelector('#follow')!.addEventListener('click',()=>{camera.follow=true;returning=true;selectedPoi=null;selectedRock=null;focusPopup=null;dismissFocus();updateHUD();});
 document.querySelector('#speed')!.addEventListener('click',()=>{speed=speed===1?2:1;const b=document.querySelector<HTMLButtonElement>('#speed')!;b.textContent=`${speed}×`;b.setAttribute('aria-label',`Speed ${speed} times. Toggle to ${speed===1?2:1} times`);});
 updateHUD();
 requestAnimationFrame(frame);
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
 const button=document.querySelector<HTMLButtonElement>('#follow')!;followVisible=showFollow(camera,world,followVisible);button.hidden=!followVisible||!!selectedPoi||selectedRock!==null||!!focusPopup;

 const sheet=document.querySelector<HTMLElement>('#poi-sheet')!,poi=POIS.find(p=>p.id===selectedPoi);sheet.hidden=!poi;
 if(poi){const done=investigated(world,poi.id),reason=canTarget(world,poi.id),key=`${poi.id}:${done}:${world.activeTarget}:${reason}`;
  if(key!==poiSheetKey){poiSheetKey=key;sheet.innerHTML=`<div><b>${poi.name}</b><button id="close-poi" aria-label="Close signal details">×</button></div><small>${done?'INVESTIGATED':world.activeTarget===poi.id?'ESCORT EN ROUTE':'SIGNAL DISCOVERED'}</small>${!done&&world.guards.some(g=>g.hp>0)?`<button id="target-action" ${world.activeTarget===poi.id?'':reason?'disabled':''}>${world.activeTarget===poi.id?'CLEAR TARGET':'LOCK TARGET'}</button>`:''}`;
   sheet.querySelector('#close-poi')?.addEventListener('click',()=>{selectedPoi=null;updateHUD();});
   sheet.querySelector('#target-action')?.addEventListener('click',()=>{if(world.activeTarget===poi.id)clearTarget(world);else lockTarget(world,poi.id);updateHUD();});
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
function completeMission(){
 if(debriefShown||world.phase!=='done')return;
 debriefShown=true;const next=settle(company,world);
 saveCompany(next);showDebrief(next);company=next;
}
function startFastRecall(){
 if(resolving||debriefShown)return;
 resolving=true;accumulator=0;const current=world,token=missionToken;
 finishRecall(current,()=>token!==missionToken||screen!=='mission'||world!==current?'cancel':document.hidden?'pause':'run')
  .then(()=>{if(token!==missionToken||world!==current)return;resolving=false;completeMission();})
  .catch(error=>{if(token!==missionToken||world!==current)return;resolving=false;
   const mission=app.querySelector('.mission');if(!mission||mission.querySelector('#recall-error'))return;
   const notice=document.createElement('div');notice.id='recall-error';notice.className='recall-error';notice.innerHTML='<p>Finalizing the return took too long.</p><button>RETRY FINALIZATION</button>';
   notice.querySelector('button')!.addEventListener('click',()=>{notice.remove();startFastRecall();});mission.append(notice);
   console.error('Recall resolution',error);
  });
}
function frame(time:number){const raw=last?Math.max(0,(time-last)/1000):0,dt=Math.min(raw,.1);last=time;
 if(screen==='mission'&&!document.hidden){
  if(!resolving&&!debriefShown){
   // Keep fixed physics steps, but never let catch-up monopolize a mobile frame.
   // Excess wall time is already clamped above; bound the backlog as well.
   accumulator=Math.min(.2,accumulator+dt*(world.phase==='aftermath'?1:speed));
   const deadline=performance.now()+7;
   while(accumulator>=STEP&&performance.now()<deadline){if(world.phase==='done')break;step(world);accumulator-=STEP;}
   if(world.phase==='recall')recallVisible+=raw;
   else recallVisible=0;
   if(world.phase==='done')completeMission();
   else if(world.phase==='recall'&&recallVisible>=4)startFastRecall();
  }
  if(canvas&&!resolving&&!debriefShown){followCamera(camera,world,dt,returning);const target=fleetCenter(world);if(returning&&Math.hypot(camera.x-target.x,camera.y-target.y)<8)returning=false;render(canvas,world,-1,camera);hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0;}}
 }
 if(screen==='mission'&&!debriefShown)requestAnimationFrame(frame);
}
if(new URLSearchParams(location.search).has('assetGallery'))mountArtGallery(app);
else showMenu();
