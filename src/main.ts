import {newCamera,panCamera,zoomCamera,overview,followCamera,screenToWorld,resizeCamera} from './camera.ts';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { buy, cost, unlockRound, capacity, createWorld, freshCompany, settle, step, STEP, ROUND_TIME, type Company, type Purchase, type World } from './sim.ts';
import { render, drawDrone, drawMother, drawGuard } from './render.ts';
import { parseSave, SAVE_KEY } from './storage.ts';
const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company=freshCompany(), storageOK=true;
try{company=parseSave(localStorage.getItem(SAVE_KEY));}catch{storageOK=false;}
let world:World=createWorld(company), screen:'workshop'|'mission'|'result'='workshop', paused=false, speed=1, accumulator=0, last=0, selected=-1;
let canvas:HTMLCanvasElement;
let camera=newCamera();
const fmt=(n:number)=>n.toLocaleString('en-US');
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(company));}catch{storageOK=false;} }
function spriteIcon(kind:string){return ({drone:'⬡',hull:'▣',scanner:'◎',laser:'↗',cargoBay:'▤',prospector:'◇',drive:'➤',guard:'✥',outpost:'⌂'} as Record<string,string>)[kind];}
function mount(){
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">AI<span>↗</span></div><div><h1><em>AI</em>steroid <span>Mining</span></h1><p>AUTONOMOUS MINING DIVISION</p></div><span class="version">ALPHA<br>0.5.0</span></header><section id="content"></section><footer class="legal">INDEPENDENT OPERATIONS <span>EST. 2086</span></footer></main>`;
 showWorkshop();
}
function showWorkshop(result=false){
 screen=result?'result':'workshop';paused=false;
 const isFirst=company.rounds===0;
 const destroyed=world.drones.filter(d=>d.state==='dead').length;
 document.querySelector('#content')!.innerHTML=`<div class="workshop"><div class="section-line"><span>MISSION CONTROL</span><span class="online">● SYSTEM ONLINE</span></div>
 ${result?`<section class="report"><div class="eyebrow">MISSION ${String(company.rounds).padStart(2,'0')} / COMPLETE</div><h2>Shift complete.</h2><div class="report-numbers"><div><strong>+${world.delivered}</strong><span>MINERALS DELIVERED</span></div><div><strong>${destroyed}/${company.drones}</strong><span>DRONES LOST</span></div></div><p>${world.shots?'Faces saved. Mining laser pulses: '+world.shots+'.':world.collisions+' headbutts. Health and Safety has been notified.'} ${destroyed?'Free recovery and repairs completed.':''} ${world.attacks?'Hostile fire: '+world.attacks+'. Guard interceptions: '+world.intercepts+'.':''}</p></section>`:`<div class="intro"><div class="eyebrow">YOUR COMPANY. THEIR HEADACHE.</div><h2>${isFirst?'Big potential.<br>Questionable intelligence.':'The next shift<br>starts with you.'}</h2><p>${isFirst?'One drone. An asteroid field. A business plan based on collisions.':'Grow your fleet, upgrade your tech and let the drones do the heavy lifting.'}</p></div>`}
 <div class="hangar"><canvas id="hangar" aria-label="Fleet in the hangar"></canvas><div class="hangar-label"><span>FLEET / ${String(company.drones).padStart(2,'0')}</span><span>${company.laser?'MINING LASER ONLINE': 'RAMMING PROTOCOL'}</span></div></div>
 ${company.rounds>=3?`<div class="chapter"><b>${company.rounds>=8?'OUTER REACH':company.rounds>=6?'SECURITY DIVISION':company.rounds>=5?'UNINVITED COMPETITION':'FAR BELT DISCOVERED'}</b><span>${company.rounds>=8?'Establish a remote base and choose a launch point.':company.rounds>=6?'Rival scouts are armed. Escort your miners.':company.rounds>=5?'Unknown craft have entered the field.':'Rich deposits have appeared beyond the home field.'}</span></div>`:''}
 ${company.rounds<8?`<div class="milestone">NEXT · ${company.rounds<3?'FAR BELT AFTER MISSION 03':company.rounds<6?'SECURITY AFTER MISSION 06':'OUTER REACH AFTER MISSION 08'}</div>`:''}
 <div class="balance"><div><span class="eyebrow">AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(company.credits)}</strong></div><div class="lifetime">${fmt(company.total)} total<br>${company.rounds} missions</div></div>
 <div class="section-line upgrades-title"><span>WORKSHOP</span><span>FLEET AND EXPANSION</span></div><div class="upgrades">${(['drone','hull','scanner','laser','cargoBay','prospector','drive','guard','outpost'] as Purchase[]).filter(item=>company.rounds>=unlockRound(item)).map(item=>{
 const owned=item==='drone'?company.drones>=6:item==='guard'?company.guards>=2:company[item];const price=cost(company,item);const affordable=company.credits>=price&&(item!=='prospector'||company.scanner);
 const names:Record<Purchase,string>={drone:'Extra Drone',hull:'Reinforced Hull',scanner:'Asteroid Scanner',laser:'Mining Laser',cargoBay:'Expanded Cargo',prospector:'Deep Prospecting',drive:'Ion Drive',guard:'Bodyguard Drone',outpost:'Outer Outpost'};
 const desc:Record<Purchase,string>={drone:'We hired another liability.',hull:'Survive 6 impacts instead of 3. Fleet-wide.',scanner:'Finds nearby asteroids. Finally.',laser:'Mine from a distance. Spare your face.',cargoBay:'Each miner hauls 18 instead of 12.',prospector:'Requires Scanner. Prioritizes rich deposits.',drive:'Fleet-wide travel speed +35%.',guard:'An autonomous escort that shoots rival scouts.',outpost:'Launch and unload at the outer reach.'};
 return `<button class="upgrade ${owned?'installed':''}" data-buy="${item}" ${owned||!affordable?'disabled':''}><span class="upgrade-icon">${spriteIcon(item)}</span><span class="upgrade-copy"><b>${names[item]}</b><small>${desc[item]}</small></span><span class="price">${owned?(item==='drone'?'MAX 6':item==='guard'?'MAX 2':'✓ OWNED'):`◆ ${price}`}</span></button>`;
 }).join('')}</div>
 ${company.outpost?`<div class="launch-select"><div class="eyebrow">LAUNCH SITE</div><button data-site="home" aria-pressed="${company.launchSite==='home'}">HQ · HOME FIELD</button><button data-site="far" aria-pressed="${company.launchSite==='far'}">OUTPOST · OUTER REACH</button></div>`:''}
 <div class="launch-area"><button class="primary" id="launch">LAUNCH MISSION <span>↗</span></button><p>45 seconds · Fully autonomous · Free repairs</p></div>
 ${!storageOK?'<p class="save-warning">Saving is unavailable. Progress will be lost when you close this page.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine rocks, collect minerals and unload at the mothership. Full cargo means a trip home, then back to work.</p><p>Drag the map to explore, use Overview to see the whole field, or Follow fleet to return to automatic tracking. After 45 seconds, the fleet is recalled. Only delivered cargo earns minerals. Destroyed drones lose their cargo and are repaired for free.</p><p>Technology applies to every drone. Progress is saved in this browser after purchases and completed missions. Aborted missions earn nothing.</p><button class="text-button" id="reset">Reset company</button></details></div>`;
 document.querySelector('#launch')!.addEventListener('click',launch);
 document.querySelectorAll<HTMLButtonElement>('[data-site]').forEach(b=>b.onclick=()=>{company={...company,launchSite:b.dataset.site as Company['launchSite']};save();showWorkshop();});
 document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{const next=buy(company,b.dataset.buy as Purchase);if(next){company=next;save();showWorkshop();}});
 document.querySelector('#reset')!.addEventListener('click',()=>{if(confirm('Reset the entire company and all upgrades?')){company=freshCompany();save();world=createWorld(company);showWorkshop();}});
 // Hangar uses the same native art as gameplay, so fleet upgrades stay visually consistent.
 (()=>{const h=document.querySelector<HTMLCanvasElement>('#hangar');if(!h)return;h.width=800;h.height=260;const c=h.getContext('2d')!;c.scale(2,2);c.strokeStyle='#2b414b';c.lineWidth=.5;for(let x=0;x<400;x+=25){c.beginPath();c.moveTo(x,0);c.lineTo(x,130);c.stroke();}for(let y=0;y<130;y+=25){c.beginPath();c.moveTo(0,y);c.lineTo(400,y);c.stroke();}c.save();c.translate(-122,-485);drawMother(c,0);c.restore();for(let i=0;i<company.drones;i++)drawDrone(c,185+(i%3)*65,company.drones>3?40+Math.floor(i/3)*49:65,-Math.PI/2,0,company.laser);for(let i=0;i<company.guards;i++)drawGuard(c,228+i*45,106,-Math.PI/2);})();
}
function launch(){
 world=createWorld(company,7+company.rounds*7919);screen='mission';paused=false;speed=1;accumulator=0;selected=-1;camera=newCamera();if(company.launchSite==='far'){camera.x=world.base.x;camera.y=world.base.y;}
 document.querySelector('#content')!.innerHTML=`<div class="mission"><div class="mission-hud"><div><span>MISSION</span><b>${String(company.rounds+1).padStart(2,'0')}</b></div><div class="time"><span id="phase">SHIFT TIME</span><b id="timer">00:45</b></div><div class="ore-count"><span>DELIVERED</span><b>◆ <span id="delivered">0</span></b></div></div><div class="field"><canvas id="field" aria-label="Autonomous drones mine asteroids. Drag to pan. Tap a drone for status."></canvas><div id="pause-overlay" hidden>PAUSED<span>The fleet is taking a well-earned microbreak.</span></div><div class="camera-controls"><button id="follow" aria-pressed="true">Follow fleet</button><button id="overview">Overview</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button></div><div class="field-caption">LIVE TELEMETRY <span>●</span></div></div><div class="telemetry"><div><small>FLEET</small><b id="fleet">${company.drones}/${company.drones}</b></div><div><small>CARGO</small><b id="cargo">0 / ${company.drones*capacity(company)}</b></div><button id="pause" aria-label="Pause mission">Ⅱ</button><button id="speed" aria-label="Change game speed">1×</button></div><div class="status"><span class="status-dot"></span><p id="status">${company.scanner?'Asteroids located. This looks suspiciously like work.':'Headbutting efficiency: acceptable.'}</p></div><button class="text-button mission-back" id="abort">Abort mission</button></div>`;
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
 document.querySelector('#abort')!.addEventListener('click',()=>{paused=true;updateHUD();if(confirm('Abort this mission? All minerals from this mission will be lost.'))showWorkshop();else {paused=false;updateHUD();}});
}
function resize(){if(!canvas||screen!=='mission')return;const r=canvas.getBoundingClientRect();resizeCamera(camera,r.width,r.height);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='mission'){paused=true;accumulator=0;updateHUD();}});
function updateHUD(){if(screen!=='mission')return;
 const remaining=Math.max(0,Math.ceil(ROUND_TIME-world.time));
 document.querySelector('#timer')!.textContent=world.phase==='recall'?'HOMEBOUND':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 document.querySelector('#phase')!.textContent=world.phase==='recall'?'RECALL':'SHIFT TIME';
 document.querySelector('#delivered')!.textContent=String(world.delivered);
 document.querySelector('#fleet')!.textContent=`${world.drones.filter(d=>d.state!=='dead').length}/${company.drones}`;
 document.querySelector('#cargo')!.textContent=`${world.drones.reduce((n,d)=>n+d.cargo,0)} / ${company.drones*capacity(company)}`;
 document.querySelector('#pause')!.textContent=paused?'▶':'Ⅱ';
 document.querySelector('#pause')!.setAttribute('aria-label',paused?'Resume mission':'Pause mission');
 (document.querySelector('#pause-overlay') as HTMLElement).hidden=!paused;
 document.querySelector('.status')?.classList.toggle('hostile',world.enemies.some(e=>e.hp>0));
 const drone=world.drones.find(d=>d.id===selected);
 if(drone) document.querySelector('#status')!.textContent=`DRONE ${String(drone.id+1).padStart(2,'0')} · ${Math.round(drone.hp/drone.maxHp*100)}% hull · Cargo ${drone.cargo}/${capacity(company)} · ${{mine:'Mining',return:'Returning',unload:'Unloading',docked:'Docked',dead:'Destroyed'}[drone.state]}`;
 else if(world.phase==='recall')document.querySelector('#status')!.textContent='Shift over. The fleet is returning with its cargo.';
 else if(world.enemies.some(e=>e.hp>0))document.querySelector('#status')!.textContent=world.guards.length?'Rival scout detected. Bodyguards engaging.':'Hostile scout detected. Mining lasers cannot defend the fleet.';
}
let hudTime=0;
function frame(time:number){const dt=Math.min((time-last)/1000,.1);last=time;
 if(screen==='mission'){
 if(!paused){accumulator+=dt*speed;while(accumulator>=STEP&&world.phase!=='done'){step(world);accumulator-=STEP;}
 if(world.phase==='done'){company=settle(company,world);save();showWorkshop(true);}}
 if(screen==='mission'){followCamera(camera,world,dt);render(canvas,world,selected,camera);hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0;}}}
 requestAnimationFrame(frame);
}
mount();requestAnimationFrame(frame);
