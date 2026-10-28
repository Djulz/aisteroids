import {newRun,stepRun,buySlot,buyHull,chooseTech,techLevel,units,alive,usedCapacity,ECONOMY,TECH,ROGUE_SAVE_KEY,serializeRun,restoreRun,threat,orderFocus,defenderPosition,type Run,type Hull,type Tech} from './roguelite.ts';
import {render} from './render.ts';
import {HOME,STEP,visibleAt} from './sim.ts';
import {ENEMY_TYPES,enemyHardpoints} from './patrols.ts';
import {newCamera,resizeCamera,zoomAt,screenToWorld,clampCamera} from './camera.ts';
import {MapGestures} from './gestures.ts';
import {parseSeed} from './seed.ts';
import './roguelite.css';
const time=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function mountRoguelite(app:HTMLDivElement){
 let run:Run|null=null,saved:Run|null=null,storageOK=true,speed=1,frameId=0,last=0,accumulator=0,hudClock=0,saveClock=0,observer:ResizeObserver|null=null;
 let canvas:HTMLCanvasElement,modal:HTMLElement|null=null,focusMode=false,selected:number|null=null;
 const camera=newCamera();camera.x=HOME.x;camera.y=HOME.y-100;camera.zoom=.85;
 try{const raw=localStorage.getItem(ROGUE_SAVE_KEY);if(raw){saved=restoreRun(raw);if(!saved)storageOK=false;}}catch{storageOK=false;}
 const save=()=>{if(!run)return;try{localStorage.setItem(ROGUE_SAVE_KEY,serializeRun(run));storageOK=true;}catch{storageOK=false;}};
 function menu(){
  cancelAnimationFrame(frameId);observer?.disconnect();run=null;modal=null;
  app.innerHTML=`<main class="rogue-menu"><p class="rogue-kicker">ROCK BOTTOM ROBOTICS · EXPERIMENTAL PASS 01</p><h1>AISTEROIDS<br><span>ROGUELITE</span></h1><p>One Miner. A growing fleet. Stay solvent.<br>Deliver physical cargo and Tech. Survive the Siege Captain.</p>${saved?'<button id="r-continue" class="primary">CONTINUE RUN</button>':''}<label for="r-seed">Run seed</label><input id="r-seed" inputmode="numeric" value="7"><p id="r-error" role="alert" hidden>Enter a seed from 0 to 4294967295.</p><button id="r-start" class="primary">NEW RUN</button><button id="r-classic">CLASSIC ALPHA</button><small>10–15 minute prototype · Separate run save<br>${storageOK?'Progress saves automatically.':'Saved run could not be loaded. New Run replaces only the prototype save.'}</small></main>`;
  app.querySelector<HTMLButtonElement>('#r-start')!.onclick=()=>{const seed=parseSeed(app.querySelector<HTMLInputElement>('#r-seed')!.value);if(seed===null){app.querySelector<HTMLElement>('#r-error')!.hidden=false;return;}start(newRun(seed));};
  app.querySelector<HTMLButtonElement>('#r-continue')?.addEventListener('click',()=>{if(saved)start(saved);});
  app.querySelector<HTMLButtonElement>('#r-classic')!.onclick=()=>{location.search='';};
 }
 function start(r:Run){
  run=r;last=0;accumulator=0;modal=null;speed=1;selected=null;camera.x=HOME.x;camera.y=HOME.y-100;
  app.innerHTML=`<main class="rogue-game"><header class="rogue-hud"><div class="rogue-brand">RB<span>↗</span> <b>ROGUELITE</b></div><div class="rogue-stats"><div><small>CREDITS</small><strong id="r-credits"></strong></div><div><small>FLEET</small><strong id="r-capacity"></strong></div><div><small>RUN</small><strong id="r-time"></strong></div><div><small>THREAT</small><strong id="r-threat"></strong></div></div><nav aria-label="Run controls"><button id="r-pause">PAUSE</button><button id="r-speed" aria-label="Simulation speed">1×</button><button id="r-menu">SAVE & MENU</button></nav></header><div class="rogue-map"><canvas id="r-canvas" tabindex="0" aria-label="Live autonomous mining map. Drag to pan, pinch or scroll to zoom. Use Focus to set a fleet target."></canvas><div class="rogue-map-tools"><button id="r-home" aria-label="Center home base">HOME</button><button id="r-follow">FLEET</button><button id="r-zoom-out" aria-label="Zoom out">−</button><button id="r-zoom-in" aria-label="Zoom in">+</button><button id="r-focus" aria-pressed="false">SET FOCUS</button><button id="r-auto">CLEAR FOCUS</button></div><div class="rogue-map-note" id="r-map-note"></div><div class="rogue-inspect" id="r-inspect" hidden></div></div><aside class="rogue-panel"><nav class="rogue-tabs" aria-label="Operations panel"><button data-panel="fleet" aria-pressed="true">FLEET</button><button data-panel="shop" aria-pressed="false">BUY</button><button data-panel="intel" aria-pressed="false">INTEL</button></nav><section id="r-fleet" class="rogue-tab"></section><section id="r-shop" class="rogue-tab" hidden><h2>Permanent fleet capacity</h2><p>Buy a Slot, then a hull. Slots survive losses.</p><button id="r-slot"></button><h2>Fixed-price hulls</h2>${(Object.keys(ECONOMY.hulls) as Hull[]).map(h=>`<button data-hull="${h}"><b>${ECONOMY.hulls[h].name}</b><span>${ECONOMY.hulls[h].price} Credits · ${ECONOMY.hulls[h].slots} Slot</span></button>`).join('')}<p>Only the starting Miner is free. Hulls cannot change type. Dock repair costs time.</p></section><section id="r-intel" class="rogue-tab" hidden><h2>Operation</h2><p>Mining is autonomous. Credits arrive only after physical unloading. Buy Slots and hulls under BUY. Keep enough income to replace lost Miners.</p><p>Tech caches appear in excavated asteroids. Miners collect nearby caches; Scouts retrieve revealed caches. Deliver one to pause for three upgrades. A destroyed carrier loses its cache.</p><p>Threat grows with active time and progress. Enemy stats stay fixed. The Siege Captain arrives at 10:00. Buy Fighters before then.</p><div id="r-tech"></div><p id="r-log" role="log"></p><button id="r-copy"></button><p id="r-storage" role="status"></p></section></aside><div class="rogue-announcement" id="r-announcement" role="status" aria-live="polite"></div></main>`;
  canvas=app.querySelector<HTMLCanvasElement>('#r-canvas')!;
  observer?.disconnect();observer=new ResizeObserver(()=>{const box=canvas.getBoundingClientRect();resizeCamera(camera,box.width,box.height);const ratio=Math.min(2,devicePixelRatio);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);});observer.observe(canvas);
  const gestures=new MapGestures(camera),position=(e:PointerEvent)=>{const b=canvas.getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top};};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);gestures.down(e.pointerId,position(e));};
  canvas.onpointermove=e=>gestures.move(e.pointerId,position(e));
  canvas.onpointerup=e=>{const tap=gestures.up(e.pointerId,position(e));if(!tap||!run)return;const p=screenToWorld(camera,tap.x,tap.y);if(focusMode){orderFocus(run,p);focusMode=false;app.querySelector('#r-focus')!.setAttribute('aria-pressed','false');save();}else selected=run.world.enemies.find(e=>e.hp>0&&visibleAt(run!.world,e)&&Math.hypot(e.x-p.x,e.y-p.y)<35/camera.zoom)?.id??null;hud();};
  canvas.onpointercancel=e=>gestures.cancel(e.pointerId);
  canvas.addEventListener('wheel',e=>{e.preventDefault();const b=canvas.getBoundingClientRect();zoomAt(camera,e.deltaY<0?1.1:1/1.1,e.clientX-b.left,e.clientY-b.top);},{passive:false});
  app.querySelector<HTMLButtonElement>('#r-pause')!.onclick=()=>{if(run){run.paused=!run.paused;accumulator=0;hud();save();}};
  app.querySelector<HTMLButtonElement>('#r-speed')!.onclick=()=>{speed=speed===1?2:1;app.querySelector('#r-speed')!.textContent=`${speed}×`;};
  app.querySelector<HTMLButtonElement>('#r-menu')!.onclick=()=>{if(run){run.paused=true;save();saved=run;menu();}};
  app.querySelector<HTMLButtonElement>('#r-home')!.onclick=()=>{camera.follow=false;camera.x=HOME.x;camera.y=HOME.y-100;clampCamera(camera);};
  app.querySelector<HTMLButtonElement>('#r-follow')!.onclick=()=>{camera.follow=true;};
  app.querySelector<HTMLButtonElement>('#r-zoom-in')!.onclick=()=>zoomAt(camera,1.2,camera.width/2,camera.height/2);
  app.querySelector<HTMLButtonElement>('#r-zoom-out')!.onclick=()=>zoomAt(camera,1/1.2,camera.width/2,camera.height/2);
  app.querySelector<HTMLButtonElement>('#r-focus')!.onclick=()=>{focusMode=!focusMode;app.querySelector('#r-focus')!.setAttribute('aria-pressed',String(focusMode));hud();};
  app.querySelector<HTMLButtonElement>('#r-auto')!.onclick=()=>{if(run){orderFocus(run,null);save();}};
  app.querySelector<HTMLButtonElement>('#r-slot')!.onclick=()=>{if(run){buySlot(run);hud();save();}};
  app.querySelectorAll<HTMLButtonElement>('[data-hull]').forEach(b=>b.onclick=()=>{if(run){buyHull(run,b.dataset.hull as Hull);hud();save();}});
  app.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.onclick=()=>{for(const name of ['fleet','shop','intel']){app.querySelector<HTMLElement>(`#r-${name}`)!.hidden=name!==b.dataset.panel;app.querySelector(`[data-panel="${name}"]`)!.setAttribute('aria-pressed',String(name===b.dataset.panel));}});
  app.querySelector<HTMLButtonElement>('#r-copy')!.onclick=async()=>{try{await navigator.clipboard.writeText(String(run!.seed));app.querySelector('#r-copy')!.textContent='SEED COPIED';}catch{app.querySelector('#r-copy')!.textContent=`Seed: ${run!.seed}`;}};
  hud();save();frameId=requestAnimationFrame(frame);
 }
 function hud(){if(!run)return;const r=run,w=r.world,t=threat(r);
  const set=(id:string,text:string)=>{const el=app.querySelector<HTMLElement>(`#r-${id}`);if(el&&el.textContent!==text)el.textContent=text;};
  set('credits',String(r.credits));set('capacity',`${usedCapacity(r)} / ${r.slots}`);set('time',time(w.time));set('threat',`${t.tier} · ${w.enemies.filter(e=>e.hp>0).length}/${t.budget}`);set('pause',r.paused?'RESUME':'PAUSE');
  set('map-note',r.paused?'PAUSED · Resume to continue':focusMode?'Tap the map to set mining and survey focus':`+${r.income.reduce((n,e)=>n+e.credits,0)} Cr / last min · ${r.items.filter(i=>i.state==='delivered').length} Tech delivered · ${time(Math.max(0,ECONOMY.bossAt-w.time))} to Captain`);
  const price=ECONOMY.slots[r.slots],slot=app.querySelector<HTMLButtonElement>('#r-slot')!;slot.textContent=price===undefined?'MAXIMUM CAPACITY':`BUY SLOT ${r.slots+1} · ${price} Credits`;slot.disabled=price===undefined||r.credits<price||!!r.result||!!r.draft.length;
  app.querySelectorAll<HTMLButtonElement>('[data-hull]').forEach(b=>{const h=ECONOMY.hulls[b.dataset.hull as Hull];b.disabled=r.credits<h.price||usedCapacity(r)+h.slots>r.slots||!!r.result||!!r.draft.length;});
  const rows=units(r).slice(-18).map(u=>{const live=alive(u),job=!live?'Destroyed':('job' in u&&u.job)?u.job:'state' in u?u.state==='docked'?'Repairing':u.state==='mine'?'Mining':u.state==='return'?'Returning':u.state==='unload'?'Unloading':u.state==='exploring'?'Surveying':u.state:'Escorting';return `<article class="rogue-ship ${live?'':'lost'}"><div><b>${u.name}</b><span>${job}</span></div><meter min="0" max="${u.maxHp}" value="${Math.max(0,u.hp)}" aria-label="${u.name} health"></meter><small>${Math.max(0,u.hp).toFixed(1)} / ${u.maxHp.toFixed(1)} HP${'cargoItems' in u?` · Cargo ${u.cargoItems.length} / ${u.gear.cargo}`:''}${r.items.some(i=>i.state==='carried'&&i.carrier===u.id)?' · ◇ TECH':''}</small></article>`;}).join('');
  const fleet=app.querySelector<HTMLElement>('#r-fleet')!;if(fleet.innerHTML!==rows)fleet.innerHTML=rows;
  app.querySelector('#r-tech')!.innerHTML=`<h2>Installed Tech · ${r.tech.length}</h2>${Array.from(new Set(r.tech)).map(id=>`<p><b>${TECH[id].name} · ${techLevel(r,id)}</b><br>${TECH[id].effect}</p>`).join('')}`;
  set('log',r.events.join('\n'));set('copy',`COPY SEED · ${r.seed}`);set('storage',storageOK?'Run saved automatically.':'Saving unavailable. Keep this tab open.');
  set('announcement',r.events[0]??'');
  const e=w.enemies.find(e=>e.id===selected&&e.hp>0&&visibleAt(w,e)),inspect=app.querySelector<HTMLElement>('#r-inspect')!;inspect.hidden=!e;if(e){const s=ENEMY_TYPES[e.kind??'patrol'];inspect.textContent=`${s.name} · ${e.hp.toFixed(0)}/${s.hp} HP · ${enemyHardpoints(e.kind).length} gun(s) × ${s.damage} damage / ${s.cooldown}s · Fixed stats`;}
  if(r.draft.length&&!modal)showDraft();else if(r.result&&!modal)showResult();
 }
 function dialog(html:string){
  const background=app.querySelector<HTMLElement>('.rogue-game')!;background.inert=true;modal=document.createElement('div');modal.className='rogue-modal';modal.innerHTML=html;app.append(modal);
  modal.addEventListener('keydown',e=>{if(e.key==='Tab'){const buttons=Array.from(modal!.querySelectorAll<HTMLButtonElement>('button')),first=buttons[0],last=buttons.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});modal.querySelector<HTMLButtonElement>('button')?.focus();
 }
 function showDraft(){if(!run)return;dialog(`<section role="dialog" aria-modal="true" aria-labelledby="r-draft-title"><p class="rogue-kicker">PHYSICAL TECH DELIVERED · CLOCK PAUSED</p><h2 id="r-draft-title">Choose one upgrade</h2>${run.draft.map(id=>`<button data-tech="${id}"><b>${TECH[id].name}${techLevel(run!,id)?` · Level ${techLevel(run!,id)+1}`:''}</b><span>${TECH[id].effect}</span></button>`).join('')}<p>Applies immediately to this run. Choose exactly one.</p></section>`);
  modal!.querySelectorAll<HTMLButtonElement>('[data-tech]').forEach(b=>b.onclick=()=>{if(run&&chooseTech(run,b.dataset.tech as Tech)){modal!.remove();modal=null;app.querySelector<HTMLElement>('.rogue-game')!.inert=false;last=0;accumulator=0;save();hud();app.querySelector<HTMLButtonElement>('#r-pause')!.focus();}});
 }
 function showResult(){if(!run)return;const r=run;save();dialog(`<section role="dialog" aria-modal="true" aria-labelledby="r-result-title"><p class="rogue-kicker">OPERATION COMPLETE</p><h2 id="r-result-title">${r.result}</h2><p>${r.result==='Victory'?'Siege Captain defeated. Your operation survived.':'No viable Credit-producing route remains.'}</p><dl><dt>Survival time</dt><dd>${time(r.world.time)}</dd><dt>Delivered Credits</dt><dd>${r.deliveredCredits}</dd><dt>Tech delivered / lost</dt><dd>${r.items.filter(i=>i.state==='delivered').length} / ${r.items.filter(i=>i.state==='lost').length}</dd><dt>Ships lost</dt><dd>${r.lost}</dd><dt>Seed</dt><dd>${r.seed}</dd></dl><button id="r-again" class="primary">NEW RUN · NEXT SEED</button><button id="r-back">RETURN TO MENU</button></section>`);
  modal!.querySelector<HTMLButtonElement>('#r-again')!.onclick=()=>start(newRun((r.seed+1)>>>0));modal!.querySelector<HTMLButtonElement>('#r-back')!.onclick=()=>{saved=run;menu();};
 }
 function overlay(){if(!run)return;const r=run,w=r.world,c=canvas.getContext('2d')!,ratio=canvas.width/camera.width;c.save();c.setTransform(ratio,0,0,ratio,0,0);c.translate(camera.width/2,camera.height/2);c.scale(camera.zoom,camera.zoom);c.translate(-camera.x,-camera.y);
  for(const item of r.items)if((item.state==='ground'&&visibleAt(w,item))||item.state==='carried'){
   c.save();c.translate(item.x,item.y-18);c.strokeStyle='#b6b0ff';c.fillStyle='#30294e';c.lineWidth=2;c.beginPath();c.moveTo(0,-10);c.lineTo(8,0);c.lineTo(0,10);c.lineTo(-8,0);c.closePath();c.fill();c.stroke();c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#ddd8ff';c.fillText('TECH',0,-15);c.restore();
  }
  for(const u of units(r).filter(alive)){
   const repair='state' in u&&u.state==='docked'||'job' in u&&u.job==='repair';
   if(repair){c.strokeStyle='#85e3bf';c.lineWidth=2;c.beginPath();c.arc(u.x,u.y,23,-Math.PI/2,-Math.PI/2+Math.PI*2*u.hp/u.maxHp);c.stroke();c.fillStyle='#b5ffe2';c.font='9px sans-serif';c.fillText('REPAIR',u.x-17,u.y-29);}
   if('gear' in u&&!('state' in u)&&r.tech.includes('twin')){c.save();c.translate(u.x,u.y);c.rotate(u.angle);c.fillStyle='#fff0ba';c.fillRect(6,-11,13,3);c.fillRect(6,8,13,3);c.restore();}
   if('gear' in u&&!('state' in u)&&r.tech.includes('drones'))for(let i=0;i<2;i++){const p=defenderPosition(w.time,u,i);c.fillStyle='#83e4cb';c.fillRect(p.x-4,p.y-3,8,6);}
   if(r.tech.includes('magnetic')&&'oreQueue' in u){c.strokeStyle='#a8d8ed66';c.beginPath();c.arc(u.x,u.y,55,0,7);c.stroke();}
  }
  c.restore();
 }
 function frame(now:number){if(!run)return;const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;
  if(!document.hidden){
   accumulator=Math.min(.2,accumulator+dt*speed);const deadline=performance.now()+7;
   while(accumulator>=STEP&&performance.now()<deadline){stepRun(run,STEP,true);accumulator-=STEP;if(run.draft.length||run.paused||run.result){accumulator=0;break;}}
   if(camera.follow){const live=run.world.drones.filter(alive),target=live.length?{x:live.reduce((n,u)=>n+u.x,0)/live.length,y:live.reduce((n,u)=>n+u.y,0)/live.length}:HOME;camera.x+=(target.x-camera.x)*(1-Math.exp(-dt*2));camera.y+=(target.y-camera.y)*(1-Math.exp(-dt*2));clampCamera(camera);}
   render(canvas,run.world,-1,camera,selected);overlay();hudClock+=dt;saveClock+=dt;
   if(hudClock>.2){hud();hudClock=0;}if(saveClock>5){save();saveClock=0;}
  }else accumulator=0;
  frameId=requestAnimationFrame(frame);
 }
 document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;if(document.hidden)save();});
 window.addEventListener('pagehide',save);
 window.addEventListener('keydown',e=>{if(run&&!modal&&(e.key==='Escape'||e.code==='Space'&&(e.target===document.body||e.target===canvas))){e.preventDefault();run.paused=!run.paused;accumulator=0;hud();save();}});
 menu();
}
