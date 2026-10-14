import type {Company} from './sim.ts';
import {POIS,type PoiId} from './knowledge.ts';

export const TECH_DISCOVERIES={
 far_belt_charted:'Far Belt Charted',
 first_rich_sample:'First Rich Sample',
 first_rival_contact:'First Contact: Rival Scout',
 outpost_site_surveyed:'Outpost Site Surveyed',
 abandoned_research_station:'Abandoned Research Station',
 experimental_probe_salvaged:'Experimental Probe Salvaged',
 abandoned_cargo_relay:'Abandoned Cargo Relay',
 derelict_freight_shuttle:'Derelict Freight Shuttle',
 automated_sorting_archive:'Automated Sorting Archive',
} as const;
export type DiscoveryId=keyof typeof TECH_DISCOVERIES;
export const discoveryIds=Object.keys(TECH_DISCOVERIES) as DiscoveryId[];
export const TECH={
 laserMining:{name:'Laser Mining',branch:'Extraction',cost:1,description:'Unlock Laser Miners: ranged one-fragment extraction, cargo 3.',requires:[]},
 impactRecovery:{name:'Impact Recovery',branch:'Extraction',cost:1,description:'Ram cooldown 1.0 → 0.65s; quicker physical recovery.',requires:[]},
 rapidCooling:{name:'Rapid Cooling',branch:'Extraction',cost:2,description:'Laser interval 2.0 → 1.6s; one fragment per shot.',requires:['laserMining']},
 escortProgram:{name:'Escort Program',branch:'Security',cost:1,description:'Assign Escorts to purchased fleet slots after rival contact.',requires:[]},
 threatTracking:{name:'Threat Tracking',branch:'Security',cost:1,description:'Escorts prioritize hostiles closest to miners.',requires:['escortProgram']},
 haulerOperation:{name:'Hauler Operation',branch:'Logistics',cost:1,description:'Unlock Haulers: collect loose ore, accept Miner cargo and deliver up to 10.',requires:[]},
 expandedHauler:{name:'Expanded Hauler',branch:'Logistics',cost:2,description:'Every Hauler carries 14 fragments instead of 10. Miners still carry 3.',requires:['haulerOperation']},
} as const;
export type TechnologyId=keyof typeof TECH;
export const technologyIds=Object.keys(TECH) as TechnologyId[];
export const researched=(c:Company,id:TechnologyId)=>c.unlockedTechnologies.includes(id);
export const techSpent=(ids:readonly string[],grandfatheredEscort=false)=>ids.reduce((n,id)=>n+(id==='escortProgram'&&grandfatheredEscort?0:TECH[id as TechnologyId]?.cost??0),0);
export function researchReason(c:Company,id:TechnologyId):string|undefined{
 if(researched(c,id))return 'Already researched.';
 if(id==='escortProgram'&&!c.progress.rivalSeen)return 'Encounter a rival scout first.';
 const prerequisite=TECH[id].requires.find(required=>!researched(c,required));
 if(prerequisite)return `Requires ${TECH[prerequisite].name}.`;
 if(c.techPointsAvailable<TECH[id].cost)return `Requires ${TECH[id].cost} Tech Point${TECH[id].cost===1?'':'s'}.`;
}
export function research(c:Company,id:TechnologyId):Company|null{
 if(!Object.hasOwn(TECH,id)||researchReason(c,id))return null;
 const unlockedTechnologies=[...c.unlockedTechnologies,id];
 return {...c,unlockedTechnologies,techPointsAvailable:c.techPointsAvailable-TECH[id].cost,
  unlockedTypes:['impactMiner','scout',...(unlockedTechnologies.includes('laserMining')?['laserMiner'] as const:[]),...(unlockedTechnologies.includes('escortProgram')?['escort'] as const:[]),...(unlockedTechnologies.includes('haulerOperation')?['hauler'] as const:[])]};
}
export function awardTech(c:Company,ids:readonly DiscoveryId[]):Company{
 const unique=ids.filter((id,i)=>Object.hasOwn(TECH_DISCOVERIES,id)&&ids.indexOf(id)===i&&!c.uniqueTechDiscoveries.includes(id));
 const sites=unique.filter((id):id is PoiId=>POIS.some(p=>p.id===id));
 return {...c,discoveredPois:[...new Set([...c.discoveredPois,...sites])],uniqueTechDiscoveries:[...c.uniqueTechDiscoveries,...unique],techPointsEarned:c.techPointsEarned+unique.length,techPointsAvailable:c.techPointsAvailable+unique.length};
}
