import {cost,unlocked,missionDuration,ENDURANCE_DURATIONS,type Company,type Purchase} from './sim.ts';
import {fleetError,usedSlots,MAX_FLEET_CAPACITY,type FleetType,typeAvailable} from './fleet.ts';
import {TECH,technologyIds,researched,researchReason,type TechnologyId} from './research.ts';
import {ENVIRONMENT_UPGRADES,environmentIds} from './biomes.ts';

export type LobbyTab='workshop'|'hangar'|'research';
export type LobbyView={tab:LobbyTab;researchOpen?:boolean;error:string;storageOK:boolean};
const fmt=(n:number)=>n.toLocaleString('en-US');
const labels:Record<FleetType,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Fighter',hauler:'Hauler',scout:'Scout',miningRig:'Mobile Mining Rig'};
const icons:Record<FleetType,string>={impactMiner:'⬡',laserMiner:'↗',escort:'✥',hauler:'▣',scout:'◇',miningRig:'▤'};
const shortEffects:Record<TechnologyId,string>={laserMining:'Unlock ranged Laser Miners',impactRecovery:'Ram again sooner · 1.0 → 0.65 s',rapidCooling:'Laser fires faster · 2.0 → 1.6 s',escortProgram:'Unlock Fighters',threatTracking:'Fighters protect miners more effectively',haulerOperation:'Unlock Haulers',expandedHauler:'Hauler capacity · 10 → 14'};
function workshop(c:Company){
 const items:Purchase[]=['fleetSlot','endurance','highPowerOptics','resonanceMining','turret','outpost'];
 const available=items.filter(item=>unlocked(c,item)&&!(item==='fleetSlot'?c.fleetCapacity>=MAX_FLEET_CAPACITY:item==='endurance'?c.enduranceLevel>=3:item==='highPowerOptics'||item==='resonanceMining'?c.extractionUpgrades.includes(item):c[item]));
 const purchaseRow=(item:Purchase,featured=false)=>{
  const price=cost(c,item),affordable=c.credits>=price;
  const title=item==='fleetSlot'?'Fleet Slot':item==='endurance'?'Shift Endurance':item==='highPowerOptics'?'High-Power Optics':item==='resonanceMining'?'Resonance Mining':item==='turret'?'HQ Turret':'Outer Outpost';
  const detail=item==='fleetSlot'?`${c.fleetCapacity} / ${MAX_FLEET_CAPACITY} slots`:item==='endurance'?`${missionDuration(c)} → ${ENDURANCE_DURATIONS[c.enduranceLevel+1]} sec`:item==='highPowerOptics'?'Laser Miners can mine Aurite':item==='resonanceMining'?'Laser Miners can mine Voidite':item==='turret'?'Defend HQ':'Launch from the frontier';
  return `<div class="upgrade${featured?' upgrade-featured':''}">${featured?'<span class="upgrade-milestone">NEXT MILESTONE</span>':''}<span class="upgrade-icon" aria-hidden="true">${{fleetSlot:'⬡',endurance:'◷',highPowerOptics:'◈',resonanceMining:'◉',turret:'⌖',outpost:'⌂'}[item]}</span><div class="upgrade-copy"><b>${title}</b><small>${detail}</small></div><button data-buy="${item}" ${affordable?'':'disabled'} aria-label="Buy ${title} for ${price} Credits">BUY · ◆${fmt(price)}</button></div>`;
 };
 const outpost=available.includes('outpost')?purchaseRow('outpost',true):'';
 const rows=available.filter(item=>item!=='outpost').map(item=>purchaseRow(item)).join('');
 const environment=environmentIds.filter(id=>c.uniqueTechDiscoveries.includes(ENVIRONMENT_UPGRADES[id].site)&&!c.environmentUpgrades.includes(id)).map(id=>{
  const upgrade=ENVIRONMENT_UPGRADES[id];return `<div class="upgrade"><span class="upgrade-icon" aria-hidden="true">◇</span><div class="upgrade-copy"><b>${upgrade.name}</b><small>${upgrade.detail}</small></div><button data-environment="${id}" ${c.credits<upgrade.cost?'disabled':''} aria-label="Buy ${upgrade.name} for ${upgrade.cost} Credits">BUY · ◆${fmt(upgrade.cost)}</button></div>`;
 }).join('');
 return `<section class="tab-content" aria-label="Workshop">${outpost}${rows||environment?'<h2 class="upgrade-group">OTHER UPGRADES</h2>':''}${rows}${environment}${outpost||rows||environment?'':'<p class="empty-note">All available upgrades installed.</p>'}</section>`;
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
 const available=nodes.filter(id=>!researched(c,id)),completed=nodes.filter(id=>researched(c,id));
 const row=(id:TechnologyId,owned:boolean)=>{
  const node=TECH[id],reason=researchReason(c,id);
  return `<details class="research-node"><summary><span class="research-copy"><b>${node.name}</b><small>${shortEffects[id]}</small></span><span class="research-cost">${owned?'DONE':`◈ ${node.cost}`}</span></summary><div class="research-detail"><small>${node.branch} · ${node.description}</small>${owned?'':`<button data-research="${id}" ${reason?'disabled':''} aria-label="Research ${node.name}, cost ${node.cost} Tech Point${node.cost===1?'':'s'}">${reason?'SAVE ◈':`RESEARCH · ◈ ${node.cost}`}</button>`}${reason?`<small class="research-reason">${reason}</small>`:''}</div></details>`;
 };
 return `<section class="research-panel" aria-label="Technology research"><div class="research-balance">◈ ${c.techPointsAvailable} <span>RESEARCH POINT${c.techPointsAvailable===1?'':'S'}</span></div><h2>AVAILABLE RESEARCH</h2>${available.map(id=>row(id,false)).join('')||'<p class="empty-note">No research available yet.</p>'}<details class="completed-research"><summary>COMPLETED (${completed.length})</summary>${completed.map(id=>row(id,true)).join('')||'<p class="empty-note">No completed research yet.</p>'}</details></section>`;
}
export function renderLobby(c:Company,view:LobbyView){
 const slots=usedSlots(c.fleetComposition),error=fleetError(c);
 const objective=!c.progress.farSurveyed?'Reach the Scrap Fields':!c.progress.richSampled?'Deliver a valuable mineral sample':!c.progress.rivalSeen?'Make contact in Scrap Fields':!c.progress.outpostSurveyed?'Survey the Outer Reach':!c.outpost?'Build the Outer Outpost':'Explore the frontier';
 const researchTab=view.tab==='research'||view.researchOpen===true;
 return `<div class="lobby"><div class="wallet"><strong><i>◆</i> ${fmt(c.credits)} <span>Credits</span></strong><p>NEXT · ${objective}</p></div>
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'&&!researchTab?'page':'false'}"><span class="tab-name">WORKSHOP</span><span class="tab-sub">◆ ${fmt(c.credits)}</span></button><button id="tab-hangar" aria-current="${view.tab==='hangar'&&!researchTab?'page':'false'}"><span class="tab-name">HANGAR</span><span class="tab-sub"><small>${slots}/${c.fleetCapacity}</small>${c.fleetCapacity>slots?`<span class="slot-badge" aria-label="${c.fleetCapacity-slots} unused slots">${c.fleetCapacity-slots}</span>`:''}</span></button><button id="tab-research" aria-current="${researchTab?'page':'false'}"><span class="tab-name">RESEARCH</span><span class="tab-sub">◈ ${c.techPointsAvailable}</span></button></nav>
 ${researchTab?researchPanel(c):view.tab==='workshop'?workshop(c):hangar(c)}
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress may be lost on reload.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect minerals and return to HQ or your Outpost. Exploration and discoveries persist after each completed shift.</p></details><div class="company-tools"><span>Seed: <span id="current-seed">${c.worldSeed}</span></span><button id="copy-seed" aria-label="Copy current world seed">COPY</button><button id="new-game">NEW GAME</button><button id="main-menu">MAIN MENU</button></div>
 <div class="lobby-dock">${c.outpost?`<button class="site-context" id="toggle-site" aria-label="Current launch site ${c.launchSite==='far'?'Outpost':'HQ'}. Switch launch site">LAUNCH · ${c.launchSite==='far'?'OUTPOST':'HQ'} <span>CHANGE</span></button>`:''}<button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${slots<c.fleetCapacity?`<small class="fleet-usage">Fleet ${slots}/${c.fleetCapacity}</small>`:''}${error?`<p class="form-error">${error} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div></div>`;
}
