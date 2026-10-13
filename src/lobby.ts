import {cost,unlocked,createWorld,type Company,type Purchase} from './sim.ts';
import {DOCTRINES,doctrineIds} from './doctrines.ts';
import {fleetForCounts,type FleetDrone} from './fleet.ts';
import {FRAMES,MODULES,frameIds,moduleIds,resolveEquipment,type DroneRole} from './engineering.ts';
import {fleetError} from './fleet.ts';
import {effectiveDirective,missionObjectiveName,missionObjectives} from './mission-plan.ts';

export type LobbyTab='workshop'|'hangar';
export type LobbyView={tab:LobbyTab;selectedId:string;editing:boolean;draft?:FleetDrone|null;doctrineOpen:boolean;planOpen?:boolean;error:string;storageOK:boolean};
export const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));

const names:Record<Purchase,string>={drone:'Extra Drone',hull:'Reinforced Hull',scanner:'Asteroid Scanner',laser:'Mining Laser',cargoBay:'Expanded Cargo',prospector:'Deep Prospecting',drive:'Ion Drive',guard:'Bodyguard Drone',turret:'HQ Turret',outpost:'Outer Outpost'};
const descriptions:Record<Purchase,string>={drone:'We hired another liability.',hull:'Survive 6 impacts instead of 3. Fleet-wide.',scanner:'Reveal rich deposits, remaining ore and survey directives.',laser:'Fleet-wide. Safe, but each pulse extracts less than a headbutt.',cargoBay:'Each miner hauls 18 instead of 12.',prospector:'Requires Scanner. Prioritizes rich deposits.',drive:'Fleet-wide travel speed +35%.',guard:'Mobile escort. One scout is manageable; two are trouble.',turret:'Defends HQ nearby. Does not travel with the fleet.',outpost:'Launch and unload at the outer reach.'};
const icons:Record<Purchase,string>={drone:'⬡',hull:'▣',scanner:'◎',laser:'↗',cargoBay:'▤',prospector:'◇',drive:'➤',guard:'✥',turret:'⌖',outpost:'⌂'};
const groups:[string,Purchase[]][]=[['FLEET CAPACITY',['drone']],['MINING TECHNOLOGY',['scanner','laser','cargoBay','prospector']],['DRONE TECHNOLOGY',['hull','drive']],['COMBAT & DEFENSE',['turret','guard']],['HQ / OUTPOST',['outpost']]];
const fmt=(n:number)=>n.toLocaleString('en-US');

function workshop(c:Company){
 return `<div class="workshop-groups">${groups.map(([label,items])=>`<section class="upgrade-group"><div class="section-line"><span>${label}</span></div><div class="upgrades">${items.map(item=>{
  const maxed=item==='drone'?c.drones>=6:item==='guard'?c.guards>=2:c[item];
  const locked=!unlocked(c,item)||item==='prospector'&&!c.scanner;
  const price=cost(c,item),affordable=c.credits>=price;
  const state=maxed?(item==='drone'?`${c.drones} / 6`:item==='guard'?`${c.guards} / 2`:'INSTALLED'):locked?`LOCKED · ◆ ${price}`:affordable?`BUY ◆ ${price}`:`◆ ${price} NEEDED`;
  const level=item==='drone'?`${c.drones} / 6 MINERS`:item==='guard'?`${c.guards} / 2 ESCORTS`:c[item]?'OWNED':'NOT OWNED';
  const requirement=locked?` ${item==='prospector'&&c.progress.richSampled?'Scanner required.':item==='outpost'?'Survey the Outer Reach site.':item==='guard'||item==='turret'?'Rival contact required.':'Rich mineral sample required.'}`:'';
  return `<button class="upgrade ${maxed?'installed':''}" data-buy="${item}" ${maxed||locked||!affordable?'disabled':''} aria-label="${names[item]}, ${level}, ${state}"><span class="upgrade-icon">${icons[item]}</span><span class="upgrade-copy"><b>${names[item]}</b><small>${level} · ${descriptions[item]}${requirement}</small></span><span class="price">${state}</span></button>`;
 }).join('')}</div></section>`).join('')}</div>`;
}

function droneCard(d:FleetDrone,selected:boolean){return `<button class="drone-card" data-drone="${d.id}" aria-pressed="${selected}"><canvas data-mini="${d.id}" width="72" height="72" aria-hidden="true"></canvas><span><b>${escapeHtml(d.name)}</b><small>${FRAMES[d.frame].name.toUpperCase()} ${d.role.toUpperCase()} · READY</small></span></button>`;}

function editor(c:Company,fleet:FleetDrone[],selected:FleetDrone,view:LobbyView){
 const draft=view.draft??selected,gear=resolveEquipment(c,draft),engineering=c.drones>=2;
 const roles:DroneRole[]=['miner','escort'];
 const escortReason=!c.guards?'Purchase a Bodyguard Drone to unlock Escort.':fleet.filter(d=>d.id!==selected.id&&d.role==='escort').length>=c.guards?'All purchased Escort slots are occupied.':fleet.filter(d=>d.id!==selected.id&&d.role==='miner').length===0?'At least one Miner must remain.':'';
 const roleChoices=roles.map(role=>{
  const reason=role==='escort'?escortReason:'';
  return `<button type="button" data-role="${role}" aria-pressed="${draft.role===role}" ${reason?'disabled':''} title="${reason}">${role==='miner'?'Miner':'Escort'}</button>`;
 }).join('');
 const moduleField=(slot:0|1)=>{
  const fitted=draft.modules[slot],other=draft.modules[slot===0?1:0];
  return `<label class="module-field">MODULE ${slot===0?'A':'B'}<select data-module-slot="${slot}" ${!engineering?'disabled':''}><option value="">Empty</option>${moduleIds.map(id=>{
   const def=MODULES[id];
   const locked=!engineering||def.role!=='any'&&def.role!==draft.role||def.requiresLaser&&!c.laser||id===other;
   return `<option value="${id}" ${fitted===id?'selected':''} ${locked?'disabled':''}>${def.name}${def.requiresLaser&&!c.laser?' · needs Mining Laser':def.role!=='any'&&def.role!==draft.role?' · '+def.role+' only':id===other?' · already fitted':''}</option>`;
  }).join('')}</select></label>${fitted?`<p class="loadout-note">↑ ${MODULES[fitted].benefit}<br>↓ ${MODULES[fitted].tradeoff}</p>`:''}`;
 };
 return `<section class="drone-detail editor"><button class="text-button" id="back-hangar">← BACK TO HANGAR</button><div class="eyebrow">TINKERING · ${draft.role.toUpperCase()}</div><div class="drone-hero"><canvas id="drone-preview" width="128" height="112" aria-label="${draft.role} drone preview"></canvas><div><h2>${escapeHtml(draft.name)}</h2><p>Individual fleet unit · Free repairs between shifts.</p></div></div><form id="tinker-form"><label for="drone-name">DISPLAY NAME</label><input id="drone-name" name="name" maxlength="24" autocomplete="off" value="${escapeHtml(draft.name)}" required><div class="edit-section"><div class="eyebrow">ROLE</div><div class="choice-row">${roleChoices}</div>${escortReason?`<small>${escapeHtml(escortReason)}</small>`:''}</div><div class="edit-section"><div class="eyebrow">FRAME</div><div class="choice-row">${frameIds.map(id=>`<button type="button" data-frame="${id}" aria-pressed="${draft.frame===id}" ${!engineering?'disabled':''}>${FRAMES[id].name}</button>`).join('')}</div><small>↑ ${FRAMES[draft.frame].benefit} · ↓ ${FRAMES[draft.frame].tradeoff}</small></div><div class="edit-section"><div class="eyebrow">MODULES</div>${moduleField(0)}${moduleField(1)}${!engineering?'<small>Buy the first Extra Drone to unlock frame and module engineering.</small>':''}</div><div class="edit-section build-readout"><div class="eyebrow">CURRENT BUILD · PREVIEW</div><span>HULL <b>${gear.maxHp}</b></span><span>CRUISE <b>${Math.round(gear.speed*100)}%</b></span><span>HANDLING <b>${Math.round(gear.turn*100)}%</b></span>${draft.role==='miner'?`<span>RAM <b>${gear.ramDamage}</b></span><span>CARGO <b>${gear.cargo}</b></span>${c.laser?`<span>LASER <b>${Math.round(gear.laserRange)} range</b></span>`:''}`:`<span>BLASTER <b>${Math.round(gear.guardRange)} range</b></span><span>CADENCE <b>${gear.guardCooldown.toFixed(2)}s</b></span>`}</div>${view.error?`<p class="form-error" role="alert">${escapeHtml(view.error)}</p>`:''}<button class="primary save-build" type="submit">APPLY CONFIGURATION <span>↗</span></button><small class="edit-footnote">Changes are applied only when you save. Back discards this draft.</small></form></section>`;
}

function hangar(c:Company,view:LobbyView){
 const fleet=fleetForCounts(c.drones,c.guards,c.fleet,c.laser);
 const selected=fleet.find(d=>d.id===view.selectedId)??fleet[0];
 const detail=view.editing?editor(c,fleet,selected,view):`<section class="drone-detail"><div class="eyebrow">SELECTED DRONE · ${selected.role.toUpperCase()}</div><div class="drone-hero"><canvas id="drone-preview" width="128" height="112" aria-label="${selected.role} drone preview"></canvas><div><h2>${escapeHtml(selected.name)}</h2><p>${selected.role==='miner'?(c.laser?'Fleet Mining Laser available.':'Collision mining active.'):'Bodyguard blaster active.'} Ready for the next shift.</p></div></div><div class="drone-facts"><span>ROLE <b>${selected.role==='miner'?'Miner':'Escort'}</b></span><span>FRAME <b>${FRAMES[selected.frame].name}</b></span><span>MODULES <b>${selected.modules.filter(Boolean).length} / 2 fitted</b></span></div><button class="edit-drone" id="edit-drone">EDIT / TINKER <span>↗</span></button></section>`;
 return `<div class="hangar-content"><div class="section-line"><span>YOUR FLEET</span><span>${fleet.length} OWNED · ${c.guards} ESCORT SLOT${c.guards===1?'':'S'}</span></div>${view.editing?'':`<div class="drone-list">${fleet.map(d=>droneCard(d,selected.id===d.id)).join('')}${c.drones<6?`<div class="drone-card empty-slot"><span class="slot-symbol">+</span><span><b>NEXT MINER</b><small>WORKSHOP · ◆ ${cost(c,'drone')}</small></span></div>`:''}</div>`}${detail}</div>`;
}

export function renderLobby(c:Company,view:LobbyView){
 const fleet=fleetForCounts(c.drones,c.guards,c.fleet,c.laser),error=fleetError(c,c.fleet);
 const chosen=DOCTRINES[c.doctrine];
 const objectives=missionObjectives(c),objective=effectiveDirective(c);
 const canEditPlan=c.outpost||objectives.length>1||c.scanner;
 const scanned=view.planOpen&&c.scanner?createWorld(c,c.worldSeed).rocks.filter(r=>r.hp>0):[];
 const rich=scanned.filter(r=>r.rich);
 const milestone=!c.progress.farSurveyed?'Reach the Far Belt with a drone.':!c.progress.richSampled?'Bring a teal mineral sample home.':!c.progress.rivalSeen?'Investigate rival activity in the Far Belt.':!c.progress.outpostSurveyed?'Reach the marked Outer Reach site.':!c.outpost?'Build the Outer Outpost.':'Expand the company beyond the home field.';
 const summary=fleet.map(d=>`${escapeHtml(d.name)} · ${FRAMES[d.frame].name} ${d.role==='miner'?'Miner':'Escort'}`).join(' / ');
 return `<div class="workshop lobby"><div class="lobby-top"><div class="eyebrow">MISSION CONTROL · NEXT SHIFT ${String(c.rounds+1).padStart(2,'0')}</div><div class="balance"><div><span class="eyebrow">AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(c.credits)}</strong></div><div class="lifetime">${fmt(c.total)} earned<br>${c.rounds} mission${c.rounds===1?'':'s'}</div></div><div class="milestone">NEXT · ${milestone.toUpperCase()}</div></div>
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'?'page':'false'}">WORKSHOP <small>WHAT YOU OWN</small></button><button id="tab-hangar" aria-current="${view.tab==='hangar'?'page':'false'}">HANGAR <small>${fleet.length} DRONE${fleet.length===1?'':'S'}</small></button></nav>
 <div class="tab-content" id="lobby-content">${view.tab==='workshop'?workshop(c):hangar(c,view)}</div>
 <div class="lobby-dock"><div class="doctrine-quick"><div><span class="eyebrow">FLEET DOCTRINE</span><b>${chosen.name}</b><small>${chosen.flavor}</small></div><button id="change-doctrine" aria-expanded="${view.doctrineOpen}">${view.doctrineOpen?'CLOSE':'CHANGE'}</button></div>
 ${view.doctrineOpen?`<div class="doctrine-picker">${doctrineIds.map(id=>{const item=DOCTRINES[id];return `<button class="doctrine-option" data-doctrine="${id}" aria-pressed="${c.doctrine===id}"><b>${item.name}</b><small>${item.flavor}</small><span>↑ ${item.benefit}<br>↓ ${item.tradeoff}</span></button>`;}).join('')}</div>`:''}
 <section class="mission-plan" aria-label="Next mission plan"><div class="plan-quick"><div><span class="eyebrow">MISSION PLAN · NEXT SHIFT</span><b>${c.launchSite==='far'&&c.outpost?'OUTPOST':'HQ'} · ${missionObjectiveName(c)}</b><small>Start and unload location · Mission objective</small></div>${canEditPlan?`<button id="change-plan" aria-expanded="${!!view.planOpen}" aria-controls="mission-plan-options">${view.planOpen?'CLOSE':'CHANGE'}</button>`:''}</div>
 ${view.planOpen&&canEditPlan?`<div class="plan-options" id="mission-plan-options">
 ${c.outpost?`<div class="plan-group"><div class="eyebrow">START & UNLOAD</div><div class="plan-site-options"><button data-site="home" aria-pressed="${c.launchSite==='home'}"><b>⌂ HQ</b><small>Home Field</small></button><button data-site="far" aria-pressed="${c.launchSite==='far'}"><b>⌖ OUTPOST</b><small>Outer Reach</small></button></div></div>`:''}
 ${objectives.length>1?`<div class="plan-group"><div class="eyebrow">MISSION OBJECTIVE</div><div class="plan-objectives">${objectives.map(o=>`<button data-directive="${o.id}" aria-pressed="${objective===o.id}"><b>${o.title}</b><small>${o.description}</small></button>`).join('')}</div><p class="plan-hint">One-time exploration goals return to Free Mining when completed.</p></div>`:''}
 ${c.scanner?`<details class="scanner-intel"><summary>SCANNER INTEL · ${scanned.length} ACTIVE DEPOSITS</summary><div class="survey-readout"><span>ACTIVE DEPOSITS <b>${scanned.length}</b></span><span>RICH SIGNALS <b>${rich.length}</b></span><span>ORE REMAINING <b>≈${fmt(scanned.reduce((n,r)=>n+r.hp*(r.rich?2:1),0))}</b></span></div><p class="plan-hint">Rich deposits appear teal on the field radar.</p></details>`:''}
 </div>`:''}</section>
 <div class="deploy-summary"><b>${fleet.length} ACTIVE DRONE${fleet.length===1?'':'S'}</b><span>${summary}</span></div><div class="plan-summary">${chosen.name} · ${missionObjectiveName(c)} · ${c.launchSite==='far'&&c.outpost?'Outpost':'HQ'}</div><button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${error?`<p class="form-error">${escapeHtml(error)} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div>
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress will be lost when you close this page.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect minerals and unload at HQ or an outpost. Mining, discoveries, damage to asteroids and loose minerals persist after a completed shift. Aborting discards that shift. Repairs are free between shifts.</p><button class="text-button" id="reset">Reset company</button></details></div>`;
}
