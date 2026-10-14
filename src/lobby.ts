import {cost,unlocked,type Company,type Purchase} from './sim.ts';
import {DOCTRINES,doctrineIds} from './doctrines.ts';
import {fleetError,usedSlots,MAX_FLEET_CAPACITY,type FleetType,type FleetComposition,typeAvailable} from './fleet.ts';
import {TECH,technologyIds,researched,researchReason} from './research.ts';

export type LobbyTab='workshop'|'hangar';
export type LobbyView={tab:LobbyTab;doctrineOpen:boolean;planOpen:boolean;researchOpen?:boolean;error:string;storageOK:boolean};
const fmt=(n:number)=>n.toLocaleString('en-US');
const names:Record<Purchase,string>={fleetSlot:'Fleet Slot',turret:'HQ Turret',outpost:'Outer Outpost'};
const descriptions:Record<Purchase,string>={fleetSlot:'Room for one more autonomous liability.',turret:'Fixed defense near HQ.',outpost:'Launch and unload in the Outer Reach.'};
const icons:Record<Purchase,string>={fleetSlot:'⬡',turret:'⌖',outpost:'⌂'};
const labels:Record<FleetType,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Escort',hauler:'Hauler',scout:'Scout',miningRig:'Mobile Mining Rig'};

function workshop(c:Company){return `<div class="workshop-groups"><section class="upgrade-group"><div class="section-line"><span>PHYSICAL EXPANSION</span></div><div class="upgrades">${(['fleetSlot','turret','outpost'] as Purchase[]).map(item=>{
 const maxed=item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:c[item],locked=!unlocked(c,item),price=cost(c,item),affordable=c.credits>=price;
 const state=maxed?'INSTALLED':locked?'LOCKED':affordable?`BUY ◆ ${price}`:`◆ ${price} NEEDED`;
 const detail=item==='fleetSlot'?`${c.fleetCapacity} / ${MAX_FLEET_CAPACITY} SLOTS`:maxed?'BUILT':'NOT BUILT';
 const reason=locked?item==='turret'?' Rival contact required.':' Survey the Outer Reach site.':'';
 return `<button class="upgrade ${maxed?'installed':''}" data-buy="${item}" ${maxed||locked||!affordable?'disabled':''} aria-label="${names[item]}, ${detail}, ${state}"><span class="upgrade-icon">${icons[item]}</span><span class="upgrade-copy"><b>${names[item]}</b><small>${detail} · ${descriptions[item]}${reason}</small></span><span class="price">${state}</span></button>`;
 }).join('')}</div></section></div>`;}
function hangar(c:Company){
 const f=c.fleetComposition,slots=usedSlots(f);
 const row=(type:'impactMiner'|'laserMiner'|'escort'|'hauler'|'scout',description:string)=>{
  const available=typeAvailable(c,type),count=f[type],canRemove=available&&count>0&&(type==='escort'||type==='hauler'||type==='scout'||f.impactMiner+f.laserMiner>1),canAdd=available&&slots<c.fleetCapacity;
  const locked=type==='laserMiner'?'Research Laser Mining to unlock':type==='hauler'?'Research Hauler Operation to unlock':c.progress.rivalSeen?'Research Escort Program to unlock':'Encounter a rival scout, then research Escort Program';
  return `<div class="fleet-row"><span class="fleet-icon">${type==='escort'?'✥':type==='hauler'?'▣':type==='scout'?'◇':type==='laserMiner'?'↗':'⬡'}</span><div class="fleet-info"><b>${labels[type]}</b><small>${available?description:locked}</small></div>${available?`<div class="fleet-stepper"><button data-type="${type}" data-delta="-1" aria-label="Remove ${labels[type]}" ${canRemove?'':'disabled'}>−</button><strong>${count}</strong><button data-type="${type}" data-delta="1" aria-label="Add ${labels[type]}" ${canAdd?'':'disabled'}>+</button></div>`:'<span class="fleet-locked">LOCKED</span>'}</div>`;
 };
 return `<section class="fleet-builder"><div class="section-line"><span>YOUR FLEET</span><span>${slots} / ${c.fleetCapacity} DRONE SLOTS</span></div><div class="capacity-meter"><span style="width:${slots/c.fleetCapacity*100}%"></span></div>${row('impactMiner','15 HP · rams for 2 fragments · cargo 3')}${row('laserMiner','10 HP · 1 fragment per laser shot · cargo 3')}${row('scout','Explores unknown space · unarmed · no cargo')}${row('hauler',`Collects and accepts cargo · ${researched(c,'expandedHauler')?14:10} capacity`)}${row('escort','Intercepts hostiles · investigates signals')}<p class="hangar-hint">Mobile Mining Rig · future research.</p></section>`;
}
function researchPanel(c:Company){
 return `<section class="research-panel" aria-label="Technology research"><div class="research-head"><button id="close-research" aria-label="Back to Mission Control">← BACK</button><div><span class="eyebrow">RECOVERED KNOWLEDGE</span><b>◈ ${c.techPointsAvailable} TECH POINT${c.techPointsAvailable===1?'':'S'}</b></div></div>
 ${(['Extraction','Security','Logistics'] as const).map(branch=>`<div class="research-branch"><div class="section-line">${branch.toUpperCase()}</div>${technologyIds.filter(id=>TECH[id].branch===branch).map(id=>{
  const node=TECH[id],owned=researched(c,id),reason=researchReason(c,id);
  return `<div class="research-node"><div><b>${node.name}</b><small>${node.description}</small><span>${owned?'RESEARCHED':reason??'AVAILABLE'} · ${node.cost} ◈${c.grandfatheredEscort&&id==='escortProgram'?' · LEGACY ENTITLEMENT':''}</span></div><button data-research="${id}" ${reason?'disabled':''} aria-label="Research ${node.name}, cost ${node.cost} Tech Point${node.cost===1?'':'s'}">${owned?'OWNED':reason?'LOCKED':'RESEARCH'}</button></div>`;
 }).join('')}</div>`).join('')}</section>`;
}
export function renderLobby(c:Company,view:LobbyView){
 const chosen=DOCTRINES[c.doctrine],error=fleetError(c),slots=usedSlots(c.fleetComposition),f=c.fleetComposition;
 const milestone=!c.progress.farSurveyed?'Reach the Far Belt with a drone.':!c.progress.richSampled?'Bring a teal mineral sample home.':!c.progress.rivalSeen?'Investigate rival activity in the Far Belt.':!c.progress.outpostSurveyed?'Reach the marked Outer Reach site.':!c.outpost?'Build the Outer Outpost.':'Expand the company beyond the home field.';
 const summary=([['impactMiner',f.impactMiner],['laserMiner',f.laserMiner],['scout',f.scout],['hauler',f.hauler],['escort',f.escort]] as [FleetType,number][]).filter(([,n])=>n>0).map(([type,n])=>`${n} ${labels[type]}${n===1?'':'s'}`).join(' · ');
 return `<div class="workshop lobby"><div class="lobby-top"><div class="eyebrow">MISSION CONTROL · NEXT SHIFT ${String(c.rounds+1).padStart(2,'0')}</div><div class="balance"><div><span class="eyebrow">AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(c.credits)}</strong></div><div class="lifetime">${fmt(c.total)} earned<br>${c.rounds} mission${c.rounds===1?'':'s'}</div></div><div class="research-quick"><span>◈ ${c.techPointsAvailable} TECH POINT${c.techPointsAvailable===1?'':'S'}${technologyIds.some(id=>!researchReason(c,id))?' · RESEARCH AVAILABLE':''}</span><button id="open-research">RESEARCH ↗</button></div><div class="milestone">NEXT · ${milestone.toUpperCase()}</div></div>
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'?'page':'false'}">WORKSHOP <small>WHAT YOU OWN</small></button><button id="tab-hangar" aria-current="${view.tab==='hangar'?'page':'false'}">HANGAR <small>${slots} DRONE${slots===1?'':'S'}</small></button></nav>
 <div class="tab-content" id="lobby-content">${view.researchOpen?researchPanel(c):view.tab==='workshop'?workshop(c):hangar(c)}</div>
 <div class="lobby-dock"><div class="doctrine-quick"><div><span class="eyebrow">FLEET DOCTRINE</span><b>${chosen.name}</b><small>${chosen.flavor}</small></div><button id="change-doctrine" aria-expanded="${view.doctrineOpen}">${view.doctrineOpen?'CLOSE':'CHANGE'}</button></div>
 ${view.doctrineOpen?`<div class="doctrine-picker">${doctrineIds.map(id=>{const item=DOCTRINES[id];return `<button class="doctrine-option" data-doctrine="${id}" aria-pressed="${c.doctrine===id}"><b>${item.name}</b><small>${item.flavor}</small><span>↑ ${item.benefit}<br>↓ ${item.tradeoff}</span></button>`;}).join('')}</div>`:''}
 <section class="mission-plan" aria-label="Launch site"><div class="plan-quick"><div><span class="eyebrow">LAUNCH SITE · NEXT SHIFT</span><b>${c.launchSite==='far'&&c.outpost?'OUTPOST':'HQ'}</b><small>Start and unload location</small></div>${c.outpost?`<button id="change-plan" aria-expanded="${view.planOpen}" aria-controls="mission-plan-options">${view.planOpen?'CLOSE':'CHANGE'}</button>`:''}</div>
 ${view.planOpen&&c.outpost?`<div class="plan-options" id="mission-plan-options"><div class="plan-group"><div class="plan-site-options"><button data-site="home" aria-pressed="${c.launchSite==='home'}"><b>⌂ HQ</b><small>Home Field</small></button><button data-site="far" aria-pressed="${c.launchSite==='far'}"><b>⌖ OUTPOST</b><small>Outer Reach</small></button></div></div></div>`:''}</section>
 <div class="deploy-summary"><b>${slots} ACTIVE DRONE${slots===1?'':'S'}</b><span>${summary}</span></div><div class="plan-summary">${chosen.name} · ${c.launchSite==='far'&&c.outpost?'Outpost':'HQ'} · MINE FREELY — NO TARGET SELECTED</div><button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${error?`<p class="form-error">${error} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div>
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress will be lost when you close this page.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect one-mineral fragments and unload at HQ or an outpost. Mining, discoveries, asteroid depletion and loose minerals persist after completed shifts. Aborting discards that shift. Repairs are free.</p><button class="text-button" id="reset">Reset company</button></details></div>`;
}
