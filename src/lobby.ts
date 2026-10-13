import {cost,unlocked,createWorld,type Company,type Purchase} from './sim.ts';
import {DOCTRINES,doctrineIds} from './doctrines.ts';
import {fleetError,usedSlots,MAX_FLEET_CAPACITY,type FleetType,type FleetComposition,typeAvailable} from './fleet.ts';
import {effectiveDirective,missionObjectiveName,missionObjectives} from './mission-plan.ts';

export type LobbyTab='workshop'|'hangar';
export type LobbyView={tab:LobbyTab;doctrineOpen:boolean;planOpen:boolean;error:string;storageOK:boolean};
const fmt=(n:number)=>n.toLocaleString('en-US');
const names:Record<Purchase,string>={fleetSlot:'Fleet Slot',turret:'HQ Turret',outpost:'Outer Outpost'};
const descriptions:Record<Purchase,string>={fleetSlot:'Room for one more autonomous liability.',turret:'Fixed defense near HQ.',outpost:'Launch and unload in the Outer Reach.'};
const icons:Record<Purchase,string>={fleetSlot:'⬡',turret:'⌖',outpost:'⌂'};
const labels:Record<FleetType,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Escort',hauler:'Hauler',miningRig:'Mobile Mining Rig'};

function workshop(c:Company){return `<div class="workshop-groups"><section class="upgrade-group"><div class="section-line"><span>PHYSICAL EXPANSION</span></div><div class="upgrades">${(['fleetSlot','turret','outpost'] as Purchase[]).map(item=>{
 const maxed=item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:c[item],locked=!unlocked(c,item),price=cost(c,item),affordable=c.credits>=price;
 const state=maxed?'INSTALLED':locked?'LOCKED':affordable?`BUY ◆ ${price}`:`◆ ${price} NEEDED`;
 const detail=item==='fleetSlot'?`${c.fleetCapacity} / ${MAX_FLEET_CAPACITY} SLOTS`:maxed?'BUILT':'NOT BUILT';
 const reason=locked?item==='turret'?' Rival contact required.':' Survey the Outer Reach site.':'';
 return `<button class="upgrade ${maxed?'installed':''}" data-buy="${item}" ${maxed||locked||!affordable?'disabled':''} aria-label="${names[item]}, ${detail}, ${state}"><span class="upgrade-icon">${icons[item]}</span><span class="upgrade-copy"><b>${names[item]}</b><small>${detail} · ${descriptions[item]}${reason}</small></span><span class="price">${state}</span></button>`;
 }).join('')}</div></section></div>`;}
function hangar(c:Company){
 const f=c.fleetComposition,slots=usedSlots(f);
 const row=(type:'impactMiner'|'laserMiner'|'escort',description:string)=>{
  const available=typeAvailable(c,type),count=f[type],canRemove=available&&count>0&&(type==='escort'||f.impactMiner+f.laserMiner>1),canAdd=available&&slots<c.fleetCapacity;
  return `<div class="fleet-row"><span class="fleet-icon">${type==='escort'?'✥':type==='laserMiner'?'↗':'⬡'}</span><div class="fleet-info"><b>${labels[type]}</b><small>${available?description:type==='laserMiner'?'Future Research unlock':'Encounter a rival scout to unlock'}</small></div>${available?`<div class="fleet-stepper"><button data-type="${type}" data-delta="-1" aria-label="Remove ${labels[type]}" ${canRemove?'':'disabled'}>−</button><strong>${count}</strong><button data-type="${type}" data-delta="1" aria-label="Add ${labels[type]}" ${canAdd?'':'disabled'}>+</button></div>`:'<span class="fleet-locked">LOCKED</span>'}</div>`;
 };
 return `<section class="fleet-builder"><div class="section-line"><span>YOUR FLEET</span><span>${slots} / ${c.fleetCapacity} DRONE SLOTS</span></div><div class="capacity-meter"><span style="width:${slots/c.fleetCapacity*100}%"></span></div>${row('impactMiner','Rams asteroids · 2 fragments · cargo 3')}${row('laserMiner','Ranged extraction · 1 fragment · cargo 3')}${row('escort','Intercepts hostiles · no cargo')}<p class="hangar-hint">Hauler and Mobile Mining Rig await future engineering.</p></section>`;
}
export function renderLobby(c:Company,view:LobbyView){
 const chosen=DOCTRINES[c.doctrine],error=fleetError(c),slots=usedSlots(c.fleetComposition),f=c.fleetComposition;
 const objectives=missionObjectives(c),objective=effectiveDirective(c),canEditPlan=c.outpost||objectives.length>1||c.progress.farSurveyed;
 const scanned=view.planOpen&&c.progress.farSurveyed?createWorld(c,c.worldSeed).rocks.filter(r=>r.hp>0):[],rich=scanned.filter(r=>r.rich);
 const milestone=!c.progress.farSurveyed?'Reach the Far Belt with a drone.':!c.progress.richSampled?'Bring a teal mineral sample home.':!c.progress.rivalSeen?'Investigate rival activity in the Far Belt.':!c.progress.outpostSurveyed?'Reach the marked Outer Reach site.':!c.outpost?'Build the Outer Outpost.':'Expand the company beyond the home field.';
 const summary=([['impactMiner',f.impactMiner],['laserMiner',f.laserMiner],['escort',f.escort]] as [FleetType,number][]).filter(([,n])=>n>0).map(([type,n])=>`${n} ${labels[type]}${n===1?'':'s'}`).join(' · ');
 return `<div class="workshop lobby"><div class="lobby-top"><div class="eyebrow">MISSION CONTROL · NEXT SHIFT ${String(c.rounds+1).padStart(2,'0')}</div><div class="balance"><div><span class="eyebrow">AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(c.credits)}</strong></div><div class="lifetime">${fmt(c.total)} earned<br>${c.rounds} mission${c.rounds===1?'':'s'}</div></div><div class="milestone">NEXT · ${milestone.toUpperCase()}</div></div>
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'?'page':'false'}">WORKSHOP <small>WHAT YOU OWN</small></button><button id="tab-hangar" aria-current="${view.tab==='hangar'?'page':'false'}">HANGAR <small>${slots} DRONE${slots===1?'':'S'}</small></button></nav>
 <div class="tab-content" id="lobby-content">${view.tab==='workshop'?workshop(c):hangar(c)}</div>
 <div class="lobby-dock"><div class="doctrine-quick"><div><span class="eyebrow">FLEET DOCTRINE</span><b>${chosen.name}</b><small>${chosen.flavor}</small></div><button id="change-doctrine" aria-expanded="${view.doctrineOpen}">${view.doctrineOpen?'CLOSE':'CHANGE'}</button></div>
 ${view.doctrineOpen?`<div class="doctrine-picker">${doctrineIds.map(id=>{const item=DOCTRINES[id];return `<button class="doctrine-option" data-doctrine="${id}" aria-pressed="${c.doctrine===id}"><b>${item.name}</b><small>${item.flavor}</small><span>↑ ${item.benefit}<br>↓ ${item.tradeoff}</span></button>`;}).join('')}</div>`:''}
 <section class="mission-plan" aria-label="Next mission plan"><div class="plan-quick"><div><span class="eyebrow">MISSION PLAN · NEXT SHIFT</span><b>${c.launchSite==='far'&&c.outpost?'OUTPOST':'HQ'} · ${missionObjectiveName(c)}</b><small>Start and unload location · Mission objective</small></div>${canEditPlan?`<button id="change-plan" aria-expanded="${view.planOpen}" aria-controls="mission-plan-options">${view.planOpen?'CLOSE':'CHANGE'}</button>`:''}</div>
 ${view.planOpen&&canEditPlan?`<div class="plan-options" id="mission-plan-options">
 ${c.outpost?`<div class="plan-group"><div class="eyebrow">START & UNLOAD</div><div class="plan-site-options"><button data-site="home" aria-pressed="${c.launchSite==='home'}"><b>⌂ HQ</b><small>Home Field</small></button><button data-site="far" aria-pressed="${c.launchSite==='far'}"><b>⌖ OUTPOST</b><small>Outer Reach</small></button></div></div>`:''}
 ${objectives.length>1?`<div class="plan-group"><div class="eyebrow">MISSION OBJECTIVE</div><div class="plan-objectives">${objectives.map(o=>`<button data-directive="${o.id}" aria-pressed="${objective===o.id}"><b>${o.title}</b><small>${o.description}</small></button>`).join('')}</div><p class="plan-hint">One-time exploration goals return to Free Mining when completed.</p></div>`:''}
 ${c.progress.farSurveyed?`<details class="scanner-intel"><summary>SCANNER INTEL · ${scanned.length} ACTIVE DEPOSITS</summary><div class="survey-readout"><span>ACTIVE DEPOSITS <b>${scanned.length}</b></span><span>RICH SIGNALS <b>${rich.length}</b></span><span>ORE REMAINING <b>≈${fmt(scanned.reduce((n,r)=>n+r.hp,0))}</b></span></div><p class="plan-hint">Rich deposits appear teal on the field radar.</p></details>`:''}
 </div>`:''}</section>
 <div class="deploy-summary"><b>${slots} ACTIVE DRONE${slots===1?'':'S'}</b><span>${summary}</span></div><div class="plan-summary">${chosen.name} · ${missionObjectiveName(c)} · ${c.launchSite==='far'&&c.outpost?'Outpost':'HQ'}</div><button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${error?`<p class="form-error">${error} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div>
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress will be lost when you close this page.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect one-mineral fragments and unload at HQ or an outpost. Mining, discoveries, asteroid depletion and loose minerals persist after completed shifts. Aborting discards that shift. Repairs are free.</p><button class="text-button" id="reset">Reset company</button></details></div>`;
}
