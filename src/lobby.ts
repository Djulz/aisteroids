import {cost,unlocked,missionDuration,ENDURANCE_DURATIONS,type Company,type Purchase} from './sim.ts';
import {fleetError,usedSlots,MAX_FLEET_CAPACITY,type FleetType,typeAvailable} from './fleet.ts';
import {TECH,technologyIds,researched,researchReason} from './research.ts';
import {ENVIRONMENT_UPGRADES,environmentIds} from './biomes.ts';

export type LobbyTab='workshop'|'hangar';
export type LobbyView={tab:LobbyTab;researchOpen?:boolean;error:string;storageOK:boolean};
const fmt=(n:number)=>n.toLocaleString('en-US');
const labels:Record<FleetType,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Escort',hauler:'Hauler',scout:'Scout',miningRig:'Mobile Mining Rig'};
const icons:Record<FleetType,string>={impactMiner:'⬡',laserMiner:'↗',escort:'✥',hauler:'▣',scout:'◇',miningRig:'▤'};
function workshop(c:Company){
 const items:Purchase[]=['fleetSlot','endurance','turret','outpost'];
 const rows=items.filter(item=>unlocked(c,item)&&!(item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:item==='endurance'?c.enduranceLevel>=3:c[item])).map(item=>{
  const price=cost(c,item),affordable=c.credits>=price;
  const title=item==='fleetSlot'?'Fleet Slot':item==='endurance'?'Shift Endurance':item==='turret'?'HQ Turret':'Outer Outpost';
  const detail=item==='fleetSlot'?`${c.fleetCapacity} / ${MAX_FLEET_CAPACITY} slots`:item==='endurance'?`${missionDuration(c)} → ${ENDURANCE_DURATIONS[c.enduranceLevel+1]} sec`:item==='turret'?'Defend HQ':'Launch from the frontier';
  return `<div class="upgrade"><span class="upgrade-icon" aria-hidden="true">${{fleetSlot:'⬡',endurance:'◷',turret:'⌖',outpost:'⌂'}[item]}</span><div class="upgrade-copy"><b>${title}</b><small>${detail}</small></div><span class="price">◆ ${price}</span><button data-buy="${item}" ${affordable?'':'disabled'} aria-label="Buy ${title} for ${price} Minerals">BUY</button></div>`;
 }).join('');
 const environment=environmentIds.filter(id=>c.uniqueTechDiscoveries.includes(ENVIRONMENT_UPGRADES[id].site)&&!c.environmentUpgrades.includes(id)).map(id=>{
  const upgrade=ENVIRONMENT_UPGRADES[id];return `<div class="upgrade"><span class="upgrade-icon" aria-hidden="true">◇</span><div class="upgrade-copy"><b>${upgrade.name}</b><small>${upgrade.detail}</small></div><span class="price">◆ ${upgrade.cost}</span><button data-environment="${id}" ${c.credits<upgrade.cost?'disabled':''} aria-label="Buy ${upgrade.name} for ${upgrade.cost} Minerals">BUY</button></div>`;
 }).join('');
 return `<section class="tab-content" aria-label="Workshop"><h2>WORKSHOP</h2>${rows}${environment}${rows||environment?'':'<p class="empty-note">All available upgrades installed.</p>'}</section>`;
}
function hangar(c:Company){
 const f=c.fleetComposition,slots=usedSlots(f);
 const row=(type:Exclude<FleetType,'miningRig'>)=>{
  if(!typeAvailable(c,type))return '';
  const canRemove=f[type]>0&&(type==='impactMiner'||type==='laserMiner'?f.impactMiner+f.laserMiner>1:true);
  return `<div class="fleet-row"><span class="fleet-icon" aria-hidden="true">${icons[type]}</span><b>${labels[type]}</b><div class="fleet-stepper"><button data-type="${type}" data-delta="-1" aria-label="Remove ${labels[type]}" ${canRemove?'':'disabled'}>−</button><strong>${f[type]}</strong><button data-type="${type}" data-delta="1" aria-label="Add ${labels[type]}" ${slots<c.fleetCapacity?'':'disabled'}>+</button></div></div>`;
 };
 return `<section class="tab-content" aria-label="Hangar"><div class="hangar-title"><h2>HANGAR</h2><span>${slots} / ${c.fleetCapacity} SLOTS</span></div><div class="capacity-meter"><span style="width:${slots/c.fleetCapacity*100}%"></span></div>${(['impactMiner','laserMiner','scout','hauler','escort'] as const).map(row).join('')}</section>`;
}
function researchPanel(c:Company){
 const nodes=technologyIds.filter(id=>researched(c,id)||id!=='escortProgram'||c.progress.rivalSeen).filter(id=>researched(c,id)||TECH[id].requires.every(required=>researched(c,required)));
 return `<section class="research-panel" aria-label="Technology research"><div class="research-head"><button id="close-research" aria-label="Back to Mission Control">← BACK</button><b>RESEARCH · ◈ ${c.techPointsAvailable}</b></div>${nodes.map(id=>{
  const node=TECH[id],owned=researched(c,id),reason=researchReason(c,id);
  return `<div class="research-node"><div><b>${node.name}</b><small>${node.description}</small><span>${owned?'RESEARCHED':`${node.cost} ◈`}</span></div>${owned?'<span class="owned">OWNED</span>':`<button data-research="${id}" ${reason?'disabled':''} aria-label="Research ${node.name}, cost ${node.cost} Tech Point${node.cost===1?'':'s'}">${reason?'SAVE ◈':'RESEARCH'}</button>`}</div>`;
 }).join('')}</section>`;
}
export function renderLobby(c:Company,view:LobbyView){
 const slots=usedSlots(c.fleetComposition),error=fleetError(c);
 const objective=!c.progress.farSurveyed?'Reach the Far Belt':!c.progress.richSampled?'Deliver a rich mineral sample':!c.progress.rivalSeen?'Find a rival scout':!c.progress.outpostSurveyed?'Survey the Outer Reach':!c.outpost?'Build the Outer Outpost':'Explore the frontier';
 const researchUseful=c.techPointsEarned>0||c.unlockedTechnologies.length>0;
 return `<div class="lobby"><div class="wallet"><span>AVAILABLE MINERALS</span><strong><i>◆</i> ${fmt(c.credits)}</strong><p>NEXT · ${objective}</p></div>
 ${view.researchOpen?researchPanel(c):`<nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'?'page':'false'}">WORKSHOP</button><button id="tab-hangar" aria-current="${view.tab==='hangar'?'page':'false'}">HANGAR <small>${slots} / ${c.fleetCapacity}</small></button></nav>${view.tab==='workshop'?workshop(c):hangar(c)}${researchUseful?`<button id="open-research" class="research-entry">RESEARCH <span>◈ ${c.techPointsAvailable}</span></button>`:''}`}
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress may be lost on reload.</p>':''}
 ${view.researchOpen?'':`<details class="instructions"><summary>How the job works</summary><p>Drones mine, collect minerals and return to HQ or your Outpost. Exploration and discoveries persist after each completed shift.</p><button class="text-button" id="reset">Reset company</button></details>
 <div class="lobby-dock">${c.outpost?`<button class="site-context" id="toggle-site" aria-label="Current launch site ${c.launchSite==='far'?'Outpost':'HQ'}. Switch launch site">LAUNCH · ${c.launchSite==='far'?'OUTPOST':'HQ'} <span>CHANGE</span></button>`:''}<button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${error?`<p class="form-error">${error} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div>`}</div>`;
}
