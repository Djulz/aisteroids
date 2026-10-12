import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { buy, cost, createWorld, freshCompany, settle, step, STEP, ROUND_TIME, W, H, type Company, type Purchase, type World } from './sim.ts';
import { render, drawDrone, drawMother } from './render.ts';
import { parseSave, SAVE_KEY } from './storage.ts';
const app=document.querySelector<HTMLDivElement>('#app')!;
let company:Company=freshCompany(), storageOK=true;
try{company=parseSave(localStorage.getItem(SAVE_KEY));}catch{storageOK=false;}
let world:World=createWorld(company), screen:'workshop'|'mission'|'result'='workshop', paused=false, speed=1, accumulator=0, last=0, selected=-1;
let canvas:HTMLCanvasElement;
const fmt=(n:number)=>n.toLocaleString('sv-SE');
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(company));}catch{storageOK=false;} }
function spriteIcon(kind:string){return kind==='drone'?'⬡':kind==='scanner'?'◎':'↗';}
function mount(){
 app.innerHTML=`<main class="shell"><header class="brand"><div class="brand-mark">AI<span>↗</span></div><div><h1><em>AI</em>steroid <span>Mining</span></h1><p>AUTONOMOUS MINING DIVISION</p></div><span class="version">ALPHA<br>0.1.0</span></header><section id="content"></section><footer class="legal">INDEPENDENT OPERATIONS <span>EST. 2086</span></footer></main>`;
 showWorkshop();
}
function showWorkshop(result=false){
 screen=result?'result':'workshop';paused=false;
 const isFirst=company.rounds===0;
 const destroyed=world.drones.filter(d=>d.state==='dead').length;
 document.querySelector('#content')!.innerHTML=`<div class="workshop"><div class="section-line"><span>MISSION CONTROL</span><span class="online">● SYSTEM ONLINE</span></div>
 ${result?`<section class="report"><div class="eyebrow">UPPDRAG ${String(company.rounds).padStart(2,'0')} / AVSLUTAT</div><h2>Lasten är hemma.</h2><div class="report-numbers"><div><strong>+${world.delivered}</strong><span>LEVERERADE MINERAL</span></div><div><strong>${destroyed}/${company.drones}</strong><span>UTSLAGNA DRÖNARE</span></div></div><p>${world.shots?'Ansikten sparade. Blastern gjorde '+world.shots+' skott.':world.collisions+' huvudstötar. Arbetsmiljöavdelningen är informerad.'} ${destroyed?'Gratis bärgning och reparation utförd.':''}</p></section>`:`<div class="intro"><div class="eyebrow">DITT FÖRETAG. DERAS HUVUDVÄRK.</div><h2>${isFirst?'Stor potential.<br>Tveksam intelligens.':'Nästa skift<br>börjar med dig.'}</h2><p>${isFirst?'En drönare. Ett asteroidfält. En affärsplan som bygger på kollisioner.':'Bygg ut flottan, uppgradera tekniken och låt drönarna göra grovjobbet.'}</p></div>`}
 <div class="hangar"><canvas id="hangar" aria-label="Flottan i hangaren"></canvas><div class="hangar-label"><span>FLEET / ${String(company.drones).padStart(2,'0')}</span><span>${company.blaster?'BLASTER ONLINE': 'RAMMING PROTOCOL'}</span></div></div>
 <div class="balance"><div><span class="eyebrow">TILLGÄNGLIGA MINERAL</span><strong><i>◆</i> ${fmt(company.credits)}</strong></div><div class="lifetime">${fmt(company.total)} totalt<br>${company.rounds} uppdrag</div></div>
 <div class="section-line upgrades-title"><span>VERKSTAD</span><span>TEKNIK GÄLLER HELA FLOTTAN</span></div><div class="upgrades">${(['drone','scanner','blaster'] as Purchase[]).map(item=>{
 const owned=item==='drone'?company.drones>=6:company[item];const price=cost(company,item);const affordable=company.credits>=price;
 const names={drone:'En till drönare',scanner:'Asteroidscanner',blaster:'Blaster'};
 const desc={drone:'Fler anställda. Samma kvalifikationer.',scanner:'Hittar faktiskt asteroider. Aktiv målsökning.',blaster:'Bryter sten på avstånd. Sparar på ansiktet.'};
 return `<button class="upgrade ${owned?'installed':''}" data-buy="${item}" ${owned||!affordable?'disabled':''}><span class="upgrade-icon">${spriteIcon(item)}</span><span class="upgrade-copy"><b>${names[item]}</b><small>${desc[item]}</small></span><span class="price">${owned?(item==='drone'?'MAX 6':'✓ KLAR'):`◆ ${price}`}</span></button>`;
 }).join('')}</div>
 <div class="launch-area"><button class="primary" id="launch">STARTA UPPDRAG <span>↗</span></button><p>60 sekunder · Helt autonomt · Gratis reparation</p></div>
 ${!storageOK?'<p class="save-warning">Webbläsaren kan inte spara. Framstegen finns bara kvar tills sidan stängs.</p>':''}
 <details class="instructions"><summary>Så fungerar jobbet</summary><p>Drönarna bryter sten, samlar mineral och lossar i moderskeppet. Full last betyder en tur hem, sedan fortsätter de jobba.</p><p>Efter 60 sekunder återkallas flottan. Bara levererad last ger mineral. Utslagna drönare tappar lasten och repareras gratis.</p><p>Teknik gäller alla dina drönare. Framsteg sparas i den här webbläsaren efter köp och avslutade uppdrag. Ett avbrutet uppdrag ger ingen belöning.</p><button class="text-button" id="reset">Nollställ företaget</button></details></div>`;
 document.querySelector('#launch')!.addEventListener('click',launch);
 document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b=>b.onclick=()=>{const next=buy(company,b.dataset.buy as Purchase);if(next){company=next;save();showWorkshop();}});
 document.querySelector('#reset')!.addEventListener('click',()=>{if(confirm('Nollställ hela företaget och alla uppgraderingar?')){company=freshCompany();save();world=createWorld(company);showWorkshop();}});
 // Hangar uses the same native art as gameplay, so fleet upgrades stay visually consistent.
 (()=>{const h=document.querySelector<HTMLCanvasElement>('#hangar');if(!h)return;h.width=800;h.height=260;const c=h.getContext('2d')!;c.scale(2,2);c.strokeStyle='#2b414b';c.lineWidth=.5;for(let x=0;x<400;x+=25){c.beginPath();c.moveTo(x,0);c.lineTo(x,130);c.stroke();}for(let y=0;y<130;y+=25){c.beginPath();c.moveTo(0,y);c.lineTo(400,y);c.stroke();}c.save();c.translate(-122,-485);drawMother(c,0);c.restore();for(let i=0;i<company.drones;i++)drawDrone(c,185+(i%3)*65,company.drones>3?40+Math.floor(i/3)*49:65,-Math.PI/2,0,company.blaster);})();
}
function launch(){
 world=createWorld(company,7+company.rounds*7919);screen='mission';paused=false;speed=1;accumulator=0;selected=-1;
 document.querySelector('#content')!.innerHTML=`<div class="mission"><div class="mission-hud"><div><span>UPPDRAG</span><b>${String(company.rounds+1).padStart(2,'0')}</b></div><div class="time"><span id="phase">ARBETSTID</span><b id="timer">01:00</b></div><div class="ore-count"><span>LEVERERAT</span><b>◆ <span id="delivered">0</span></b></div></div><div class="field"><canvas id="field" aria-label="Autonoma drönare bryter asteroider. Tryck på en drönare för status."></canvas><div id="pause-overlay" hidden>PAUSAT<span>Flottan tar en välförtjänt mikropaus.</span></div><div class="field-caption">LIVE TELEMETRY <span>●</span></div></div><div class="telemetry"><div><small>FLOTTA</small><b id="fleet">${company.drones}/${company.drones}</b></div><div><small>LAST</small><b id="cargo">0 / ${company.drones*12}</b></div><button id="pause" aria-label="Pausa uppdrag">Ⅱ</button><button id="speed" aria-label="Byt spelhastighet">1×</button></div><div class="status"><span class="status-dot"></span><p id="status">${company.scanner?'Asteroider identifierade. Det här liknar ett jobb.':'Headbutting efficiency: acceptable.'}</p></div><button class="text-button mission-back" id="abort">Avbryt uppdrag</button></div>`;
 canvas=document.querySelector<HTMLCanvasElement>('#field')!;resize();
 canvas.onclick=e=>{const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W,y=(e.clientY-rect.top)/rect.height*H;const d=world.drones.find(d=>Math.hypot(d.x-x,d.y-y)<30);selected=d?.id??-1;};
 document.querySelector('#pause')!.addEventListener('click',()=>{paused=!paused;updateHUD();});
 document.querySelector('#speed')!.addEventListener('click',()=>{speed=speed===1?2:1;document.querySelector('#speed')!.textContent=speed+'×';});
 document.querySelector('#abort')!.addEventListener('click',()=>{paused=true;updateHUD();if(confirm('Avbryt? Mineral från det här uppdraget går förlorade.'))showWorkshop();else {paused=false;updateHUD();}});
}
function resize(){if(!canvas||screen!=='mission')return;const r=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='mission'){paused=true;accumulator=0;updateHUD();}});
function updateHUD(){if(screen!=='mission')return;
 const remaining=Math.max(0,Math.ceil(ROUND_TIME-world.time));
 document.querySelector('#timer')!.textContent=world.phase==='recall'?'HEMÅT':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 document.querySelector('#phase')!.textContent=world.phase==='recall'?'ÅTERKALLELSE':'ARBETSTID';
 document.querySelector('#delivered')!.textContent=String(world.delivered);
 document.querySelector('#fleet')!.textContent=`${world.drones.filter(d=>d.state!=='dead').length}/${company.drones}`;
 document.querySelector('#cargo')!.textContent=`${world.drones.reduce((n,d)=>n+d.cargo,0)} / ${company.drones*12}`;
 document.querySelector('#pause')!.textContent=paused?'▶':'Ⅱ';
 document.querySelector('#pause')!.setAttribute('aria-label',paused?'Fortsätt uppdrag':'Pausa uppdrag');
 (document.querySelector('#pause-overlay') as HTMLElement).hidden=!paused;
 const drone=world.drones.find(d=>d.id===selected);
 if(drone) document.querySelector('#status')!.textContent=`DRÖNARE ${String(drone.id+1).padStart(2,'0')} · ${Math.max(0,drone.hp)}% skick · Last ${drone.cargo}/12 · ${{mine:'Arbetar',return:'Återvänder',docked:'Dockad',dead:'Utslagen'}[drone.state]}`;
 else if(world.phase==='recall')document.querySelector('#status')!.textContent='Skiftet är slut. Flottan återvänder med lasten.';
}
let hudTime=0;
function frame(time:number){const dt=Math.min((time-last)/1000,.1);last=time;
 if(screen==='mission'){
 if(!paused){accumulator+=dt*speed;while(accumulator>=STEP&&world.phase!=='done'){step(world);accumulator-=STEP;}
 if(world.phase==='done'){company=settle(company,world);save();showWorkshop(true);}}
 if(screen==='mission'){render(canvas,world,selected);hudTime+=dt;if(hudTime>.1){updateHUD();hudTime=0;}}}
 requestAnimationFrame(frame);
}
mount();requestAnimationFrame(frame);
