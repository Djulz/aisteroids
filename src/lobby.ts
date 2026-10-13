import {cost,unlocked,createWorld,type Company,type Purchase} from './sim.ts';
import {DOCTRINES,doctrineIds} from './doctrines.ts';
import {fleetForCounts,type FleetDrone} from './fleet.ts';

export type LobbyTab='workshop'|'hangar';
export type LobbyView={tab:LobbyTab;selectedId:string;editing:boolean;doctrineOpen:boolean;error:string;storageOK:boolean};
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

function droneCard(d:FleetDrone,selected:boolean){return `<button class="drone-card" data-drone="${d.id}" aria-pressed="${selected}"><canvas data-mini="${d.id}" width="72" height="72" aria-hidden="true"></canvas><span><b>${escapeHtml(d.name)}</b><small>${d.role==='miner'?'MINER':'ESCORT'} · READY</small></span></button>`;}

function hangar(c:Company,view:LobbyView){
 const fleet=fleetForCounts(c.drones,c.guards,c.fleet);
 const selected=fleet.find(d=>d.id===view.selectedId)??fleet[0];
 const guarded=c.progress.rivalSeen;
 const survey=c.scanner?createWorld(c,c.worldSeed).rocks.filter(r=>r.hp>0):[];
 const rich=survey.filter(r=>r.rich);
 const detail=view.editing?`<section class="drone-detail editor"><button class="text-button" id="back-hangar">← BACK TO HANGAR</button><div class="eyebrow">EDIT DRONE · ${selected.role.toUpperCase()}</div><div class="drone-hero"><canvas id="drone-preview" width="128" height="112" aria-label="${selected.role} drone preview"></canvas><div><h2>${escapeHtml(selected.name)}</h2><p>Permanent fleet unit · Repairs are free between shifts.</p></div></div><form id="rename-form"><label for="drone-name">DISPLAY NAME</label><div class="rename-row"><input id="drone-name" name="name" maxlength="24" autocomplete="off" value="${escapeHtml(selected.name)}" required><button type="submit">SAVE NAME</button></div>${view.error?`<p class="form-error" role="alert">${escapeHtml(view.error)}</p>`:''}</form><div class="equipment-list"><div><span>ROLE</span><b>${selected.role==='miner'?'Miner':'Escort'}</b><small>Role switching is not available yet.</small></div><div><span>FRAME</span><b>Unavailable</b><small>Frame engineering is coming later.</small></div><div><span>MODULES</span><b>Unavailable</b><small>Equipment slots are not active in this build.</small></div></div></section>`
 :`<section class="drone-detail"><div class="eyebrow">SELECTED DRONE · ${selected.role.toUpperCase()}</div><div class="drone-hero"><canvas id="drone-preview" width="128" height="112" aria-label="${selected.role} drone preview"></canvas><div><h2>${escapeHtml(selected.name)}</h2><p>${selected.role==='miner'?(c.laser?'Fleet Mining Laser equipped.':'Collision mining active.'):'Bodyguard blaster active.'} Ready for the next mission.</p></div></div><div class="drone-facts"><span>ROLE <b>${selected.role==='miner'?'Miner':'Escort'}</b></span><span>FRAME <b>Not configurable</b></span><span>MODULES <b>Not available yet</b></span></div><button class="edit-drone" id="edit-drone">EDIT / TINKER <span>↗</span></button></section>`;
 return `<div class="hangar-content"><div class="section-line"><span>YOUR FLEET</span><span>${c.drones} / 6 MINER SLOTS · ${c.guards} / 2 ESCORTS</span></div><div class="drone-list">${fleet.map(d=>droneCard(d,selected.id===d.id)).join('')}${c.drones<6?`<div class="drone-card empty-slot"><span class="slot-symbol">+</span><span><b>NEXT MINER</b><small>WORKSHOP · ◆ ${cost(c,'drone')}</small></span></div>`:''}</div>${!guarded?'<p class="hangar-hint">Escort program unlocks after rival contact.</p>':c.guards<2?'<p class="hangar-hint">Bodyguard drones are acquired in Workshop.</p>':''}${detail}
 ${c.outpost?`<div class="launch-select"><div class="eyebrow">LAUNCH SITE</div><button data-site="home" aria-pressed="${c.launchSite==='home'}">HQ · HOME FIELD</button><button data-site="far" aria-pressed="${c.launchSite==='far'}">OUTPOST · OUTER REACH</button></div>`:''}
 ${c.scanner?`<div class="directive"><div class="eyebrow">GEOLOGICAL SURVEY · LIVE FIELD</div><div class="survey-readout"><span>ACTIVE DEPOSITS <b>${survey.length}</b></span><span>RICH SIGNALS <b>${rich.length}</b></span><span>ORE REMAINING <b>≈${fmt(survey.reduce((n,r)=>n+r.hp*(r.rich?2:1),0))}</b></span></div><div class="eyebrow directive-heading">SURVEY DIRECTIVE · NEXT SHIFT</div><button data-directive="auto" aria-pressed="${c.directive==='auto'}">Mine freely</button>${!c.progress.richSampled?`<button data-directive="surveyFar" aria-pressed="${c.directive==='surveyFar'}">Survey Far Belt</button>`:''}${c.progress.rivalSeen&&!c.progress.outpostSurveyed?`<button data-directive="surveyOutpost" aria-pressed="${c.directive==='surveyOutpost'}">Survey Outpost site</button>`:''}<small>Teal marks reveal rich deposits and remaining resources during the mission.</small></div>`:''}</div>`;
}

export function renderLobby(c:Company,view:LobbyView){
 const fleet=fleetForCounts(c.drones,c.guards,c.fleet);
 const chosen=DOCTRINES[c.doctrine];
 const milestone=!c.progress.farSurveyed?'Reach the Far Belt with a drone.':!c.progress.richSampled?'Bring a teal mineral sample home.':!c.progress.rivalSeen?'Investigate rival activity in the Far Belt.':!c.progress.outpostSurveyed?'Reach the marked Outer Reach site.':!c.outpost?'Build the Outer Outpost.':'Expand the company beyond the home field.';
 const summary=fleet.slice(0,2).map(d=>`${escapeHtml(d.name)} · ${d.role==='miner'?'Miner':'Escort'}`).join('  /  ')+(fleet.length>2?`  /  +${fleet.length-2} MORE`:'');
 return `<div class="workshop lobby"><div class="lobby-top"><div class="eyebrow">MISSION CONTROL · NEXT SHIFT ${String(c.rounds+1).padStart(2,'0')}</div><div class="balance"><div><span class="eyebrow">AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(c.credits)}</strong></div><div class="lifetime">${fmt(c.total)} earned<br>${c.rounds} mission${c.rounds===1?'':'s'}</div></div><div class="milestone">NEXT · ${milestone.toUpperCase()}</div></div>
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'?'page':'false'}">WORKSHOP <small>WHAT YOU OWN</small></button><button id="tab-hangar" aria-current="${view.tab==='hangar'?'page':'false'}">HANGAR <small>${fleet.length} DRONE${fleet.length===1?'':'S'}</small></button></nav>
 <div class="tab-content" id="lobby-content">${view.tab==='workshop'?workshop(c):hangar(c,view)}</div>
 <div class="lobby-dock"><div class="doctrine-quick"><div><span class="eyebrow">FLEET DOCTRINE</span><b>${chosen.name}</b><small>${chosen.flavor}</small></div><button id="change-doctrine" aria-expanded="${view.doctrineOpen}">${view.doctrineOpen?'CLOSE':'CHANGE'}</button></div>
 ${view.doctrineOpen?`<div class="doctrine-picker">${doctrineIds.map(id=>{const item=DOCTRINES[id];return `<button class="doctrine-option" data-doctrine="${id}" aria-pressed="${c.doctrine===id}"><b>${item.name}</b><small>${item.flavor}</small><span>↑ ${item.benefit}<br>↓ ${item.tradeoff}</span></button>`;}).join('')}</div>`:''}
 <div class="deploy-summary"><b>${fleet.length} ACTIVE DRONE${fleet.length===1?'':'S'}</b><span>${summary}</span></div><button class="primary" id="launch" ${fleet.length?'':'disabled'}>DEPLOY FLEET <span>↗</span></button>${!fleet.length?'<p class="form-error">Acquire a drone in Workshop before deploying.</p>':''}</div>
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress will be lost when you close this page.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect minerals and unload at HQ or an outpost. Mining, discoveries, damage to asteroids and loose minerals persist after a completed shift. Aborting discards that shift. Repairs are free between shifts.</p><button class="text-button" id="reset">Reset company</button></details></div>`;
}
