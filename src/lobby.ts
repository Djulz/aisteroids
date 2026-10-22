import {cost,missionDuration,ENDURANCE_DURATIONS,BASIC_UPGRADES,introComplete,progressionHint,type Company,type Purchase} from './sim.ts';
import {fleetError,usedSlots,MAX_FLEET_CAPACITY,type FleetType,typeAvailable} from './fleet.ts';
import {TALENTS,categories,categoryName,categoryRequirement,path,type Category,type TalentId} from './research.ts';
import {ENVIRONMENT_UPGRADES,environmentIds} from './biomes.ts';
import {currentObjective} from './progression.ts';
import {directorMessage,type DialogueId} from './director.ts';

export type LobbyTab='workshop'|'hangar'|'research';
export type LobbyView={directorLine?:DialogueId;tab:LobbyTab;researchOpen?:boolean;error:string;storageOK:boolean};
const fmt=(n:number)=>n.toLocaleString('en-US');
const labels:Record<FleetType,string>={impactMiner:'Miner',laserMiner:'Miner',escort:'Fighter',hauler:'Hauler',scout:'Scout',miningRig:'Mining Rig'};
const icons:Record<FleetType,string>={impactMiner:'⬡',laserMiner:'↗',escort:'✥',hauler:'▣',scout:'◇',miningRig:'▤'};
function workshop(c:Company){
 const alreadyOwned=(item:Purchase)=>item in BASIC_UPGRADES?c.basicUpgrades.includes(item as keyof typeof BASIC_UPGRADES):item==='fleetSlot'?c.fleetCapacity>MAX_FLEET_CAPACITY:item==='endurance'?c.enduranceLevel>=3:item==='highPowerOptics'||item==='resonanceMining'?c.extractionUpgrades.includes(item):c[item as 'turret'|'outpost'|'deflectorShields'];
 const available=c.shopOffers.filter((item):item is Purchase=>!(item in ENVIRONMENT_UPGRADES)&&!c.shopPurchases.includes(item)&&!alreadyOwned(item as Purchase));
 const purchaseRow=(item:Purchase,featured=false)=>{
  const price=cost(c,item),affordable=c.credits>=price;
  const title=item in BASIC_UPGRADES?BASIC_UPGRADES[item as keyof typeof BASIC_UPGRADES].name:item==='fleetSlot'?'Fleet Slot':item==='endurance'?`Shift Endurance ${c.enduranceLevel+1}`:item==='highPowerOptics'?'Extraction Class II':item==='resonanceMining'?'Resonance Extraction':item==='deflectorShields'?'Deflector Shields':item==='turret'?'Station Turret':'Outer Outpost';
  const detail=item in BASIC_UPGRADES?BASIC_UPGRADES[item as keyof typeof BASIC_UPGRADES].effect:item==='fleetSlot'?`${c.fleetCapacity} → ${c.fleetCapacity+1} slots`:item==='endurance'?`${missionDuration(c)} → ${ENDURANCE_DURATIONS[c.enduranceLevel+1]} sec`:item==='highPowerOptics'?'Shared extraction: Aurite and Cryonite':item==='resonanceMining'?'Shared extraction: Voidite':item==='deflectorShields'?'Fleet weapon damage −40%':item==='turret'?'Defend your launch station · 260 range':'Frontier harbor · closer Aurite deliveries · next launch there';
  return `<div class="upgrade${featured?' upgrade-featured':''}">${featured?'<span class="upgrade-milestone">NEXT MILESTONE</span>':''}<span class="upgrade-icon" aria-hidden="true">${{cargoAwareness:'▣',navigationAssist:'⌁',workPlanner:'⌖',fleetSlot:'⬡',endurance:'◷',highPowerOptics:'◈',resonanceMining:'◉',deflectorShields:'◇',turret:'⌖',outpost:'⌂'}[item]}</span><div class="upgrade-copy"><b>${title}</b><small>${detail}</small></div><button data-buy="${item}" ${affordable?'':'disabled'} aria-label="Buy ${title} for ${price} Credits">BUY · ◆${fmt(price)}</button></div>`;
 };
 const outpost=available.includes('outpost')?purchaseRow('outpost',true):'';
 const rows=available.filter(item=>item!=='outpost').map(item=>purchaseRow(item)).join('');
 const environment=environmentIds.filter(id=>c.shopOffers.includes(id)&&!c.shopPurchases.includes(id)&&!c.environmentUpgrades.includes(id)).map(id=>{
  const upgrade=ENVIRONMENT_UPGRADES[id];return `<div class="upgrade"><span class="upgrade-icon" aria-hidden="true">◇</span><div class="upgrade-copy"><b>${upgrade.name}</b><small>${upgrade.detail}</small></div><button data-environment="${id}" ${c.credits<upgrade.cost?'disabled':''} aria-label="Buy ${upgrade.name} for ${upgrade.cost} Credits">BUY · ◆${fmt(upgrade.cost)}</button></div>`;
 }).join('');
 return `<section class="tab-content" aria-label="Workshop">${outpost}${rows}${environment}${outpost||rows||environment?'':`<p class="empty-note">${c.shopPurchases.length?'Your purchases are ready. Complete a shift for the next offers.':progressionHint(c)}</p>`}</section>`;
}
function hangar(c:Company){
 const f=c.fleetComposition,slots=usedSlots(f);
 const row=(type:FleetType)=>{
  if(!typeAvailable(c,type))return '';
  const weight=1;
  return `<div class="fleet-row"><span class="fleet-icon" aria-hidden="true">${icons[type]}</span><b>${labels[type]}${type==='impactMiner'?`<small> · ${c.talents.includes('laserCutter')?'Laser':'Impact'}</small>`:''}</b><div class="fleet-stepper"><button data-type="${type}" data-delta="-1" aria-label="Remove ${labels[type]}" ${f[type]&&!(type==='impactMiner'&&f[type]===1&&!f.miningRig||type==='miningRig'&&f[type]===1&&!f.impactMiner)?'':'disabled'}>−</button><strong>${f[type]}</strong><button data-type="${type}" data-delta="1" aria-label="Add ${labels[type]}" ${slots+weight<=c.fleetCapacity?'':'disabled'}>+</button></div></div>`;
 };
 return `<section class="tab-content" aria-label="Hangar"><div class="hangar-title"><h2>HANGAR</h2><span>${slots} / ${c.fleetCapacity} SLOTS</span></div><div class="capacity-meter"><span style="width:${slots/c.fleetCapacity*100}%"></span></div>${(['impactMiner','scout','hauler','escort','miningRig'] as const).map(row).join('')}${f.miningRig&&!f.hauler?'<p class="empty-note">A Hauler makes the Rig’s production deliverable. The Rig can still deploy without one.</p>':''}</section>`;
}
function researchPanel(c:Company){
 const card=(category:Category)=>{
  const chosen=path(c,category),level=chosen.length,requirement=categoryRequirement(c,category);
  const summary=chosen.map(id=>TALENTS[id].name).join(' · ')||'Basic systems';
  const future=Object.entries(TALENTS).filter(([,node])=>node.category===category&&node.level>level&&(!node.requires||!chosen.length||chosen.includes(node.requires as TalentId)))
   .map(([,node])=>`L${node.level} ${node.name}: ${node.effect}`);
  return `<article class="research-card"><div><b>${categoryName[category]}</b><small>LEVEL ${level}/3 · ${summary}</small>${requirement&&level<3?`<small class="research-reason">${requirement}</small>`:''}</div><div class="research-card-actions">${level===3?'<span>MAX</span>':`<button data-upgrade="${category}" ${requirement||c.techPointsAvailable<level+1?'disabled':''}>UPGRADE · ◈ ${level+1}</button>`}</div><details><summary>View path</summary><small>${future.join(' · ')||'Path complete.'}</small></details></article>`;
 };
 return `<section class="research-panel" aria-label="Technology research"><div class="research-balance">◈ ${c.techPointsAvailable} <span>TECH AVAILABLE</span></div>${c.migrationNotice?'<p class="empty-note">Previous research Tech was returned. Choose new role talents whenever you are ready.</p>':''}<h2>FLEET RESEARCH</h2>${categories.map(card).join('')}</section>`;
}
export function renderLobby(c:Company,view:LobbyView){
 const slots=usedSlots(c.fleetComposition),error=fleetError(c);
 const objective=currentObjective(c);
 const researchTab=introComplete(c)&&(view.tab==='research'||view.researchOpen===true);
 const meaningfulResearch=introComplete(c)&&categories.some(category=>path(c,category).length<3&&!categoryRequirement(c,category)&&c.techPointsAvailable>path(c,category).length);
 return `<div class="lobby"><div class="wallet"><strong><i>◆</i> ${fmt(c.credits)} <span>Credits</span></strong><details class="objective-guidance"><summary>NEXT · ${objective.title}</summary><p>${objective.detail}</p></details></div>${view.directorLine?directorMessage(view.directorLine):''}
 <nav class="lobby-tabs" aria-label="Mission Control"><button id="tab-workshop" aria-current="${view.tab==='workshop'&&!researchTab?'page':'false'}"><span class="tab-name">WORKSHOP</span><span class="tab-sub">◆ ${fmt(c.credits)}</span></button><button id="tab-hangar" aria-current="${view.tab==='hangar'&&!researchTab?'page':'false'}"><span class="tab-name">HANGAR</span><span class="tab-sub"><small>${slots}/${c.fleetCapacity}</small>${c.fleetCapacity>slots?`<span class="slot-badge" aria-label="${c.fleetCapacity-slots} unused slots">${c.fleetCapacity-slots}</span>`:''}</span></button>${introComplete(c)?`<button id="tab-research" aria-current="${researchTab?'page':'false'}"><span class="tab-name">RESEARCH</span><span class="tab-sub">◈ ${c.techPointsAvailable}${meaningfulResearch?' · AVAILABLE':''}</span></button>`:''}</nav>
 ${researchTab?researchPanel(c):view.tab==='hangar'?hangar(c):workshop(c)}
 ${!view.storageOK?'<p class="save-warning">Saving is unavailable. Progress may be lost on reload.</p>':''}
 <details class="instructions"><summary>How the job works</summary><p>Drones mine, collect minerals and return to HQ or your Outpost. Exploration and discoveries persist after each completed shift.</p></details><div class="company-tools"><span>Seed: <span id="current-seed">${c.worldSeed}</span></span><button id="copy-seed" aria-label="Copy current world seed">COPY</button><button id="new-game">NEW GAME</button><button id="main-menu">MAIN MENU</button></div>
 <div class="lobby-dock">${c.outpost?`<button class="site-context" id="toggle-site" aria-label="Current launch site ${c.launchSite==='far'?'Outpost':'HQ'}. Switch launch site">LAUNCH · ${c.launchSite==='far'?'OUTPOST':'HQ'} <span>CHANGE</span></button>`:''}<button class="primary" id="launch" ${error?'disabled':''}>DEPLOY FLEET <span>↗</span></button>${slots<c.fleetCapacity?`<small class="fleet-usage">Fleet ${slots}/${c.fleetCapacity}</small>`:''}${error?`<p class="form-error">${error} <button id="fix-fleet">OPEN HANGAR</button></p>`:''}</div></div>`;
}
