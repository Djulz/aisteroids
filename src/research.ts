import type {Company} from './sim.ts';
import {POIS,type PoiId} from './knowledge.ts';

// Stable, once-only sources. Future regions get their own IDs only when live.
export const TECH_DISCOVERIES={
 first_shift_delivered:'First company delivery',
 first_fleet_expansion:'First fleet expansion',
 home_belt_surveyed:'Home Belt survey',
 far_belt_charted:'Scrap Fields charted',
 first_rich_sample:'First valuable sample',
 first_nickel_delivery:'First Nickel delivery',
 first_aurite_delivery:'First Aurite delivery',
 first_cryonite_delivery:'First Cryonite delivery',
 first_voidite_delivery:'First Voidite delivery',
 first_rival_contact:'First rival contact',
 outpost_site_surveyed:'Outpost site surveyed',
 abandoned_research_station:'Derelict Research Station',
 experimental_probe_salvaged:'Experimental Probe',
 abandoned_cargo_relay:'Abandoned Cargo Relay',
 derelict_freight_shuttle:'Derelict Freight Shuttle',
 automated_sorting_archive:'Automated Sorting Archive',
 derelict_excavation_platform:'Derelict Excavation Platform',
} as const;
export type DiscoveryId=keyof typeof TECH_DISCOVERIES;
export const discoveryIds=Object.keys(TECH_DISCOVERIES) as DiscoveryId[];
export const TECH_REWARDS:Record<DiscoveryId,number>={
 first_shift_delivered:1,first_fleet_expansion:1,home_belt_surveyed:1,
 far_belt_charted:1,first_rich_sample:1,first_nickel_delivery:1,
 first_aurite_delivery:1,first_cryonite_delivery:1,first_voidite_delivery:1,
 first_rival_contact:1,outpost_site_surveyed:1,
 abandoned_research_station:1,experimental_probe_salvaged:1,
 abandoned_cargo_relay:1,derelict_freight_shuttle:1,
 automated_sorting_archive:1,derelict_excavation_platform:1,
};
export type Category='miner'|'hauler'|'scout'|'fighter'|'rig'|'general';
export const categories=['miner','hauler','scout','fighter','rig','general'] as const;
export const categoryName:Record<Category,string>={miner:'Miner',hauler:'Hauler',scout:'Scout',fighter:'Fighter',rig:'Mining Rig',general:'Company Core'};
type Node={category:Category;level:1|2|3;name:string;effect:string;requires?:string};
const node=(category:Category,level:1|2|3,name:string,effect:string,requires?:string):Node=>({category,level,name,effect,requires});
export const TALENTS={
 laserCutter:node('miner',1,'Laser Cutter','Stand-off laser mining; replaces impact charges.'),
 ramSplitter:node('miner',1,'Ram Splitter','Up to 3 primary fragments and 1 from a second nearby rock.'),
 heavyPulse:node('miner',2,'Heavy Pulse','2 fragments per pulse; pulse interval +50%.','laserCutter'),
 longRangeOptics:node('miner',2,'Long-Range Optics','Laser reach +60%.','laserCutter'),
 heavyHead:node('miner',2,'Heavy Head','One extra primary fragment per charge.','ramSplitter'),
 rapidRecovery:node('miner',2,'Rapid Recovery','Ram cooldown −35% and shorter recoil.','ramSplitter'),
 piercingBeam:node('miner',3,'Piercing Beam','Extract 1 fragment from a second aligned rock.','laserCutter'),
 continuousCutting:node('miner',3,'Continuous Cutting','After 3 pulses on one rock, fire 50% faster.','laserCutter'),
 phaseRam:node('miner',3,'Phase Ram','Longer charge can split up to 3 nearby rocks.','ramSplitter'),
 magneticRam:node('miner',3,'Magnetic Ram','Pick up nearby unclaimed fragments during a charge.','ramSplitter'),
 bulkCarrier:node('hauler',1,'Bulk Carrier','Internal hold 10 → 15.'),
 expressDelivery:node('hauler',1,'Express Delivery','Internal hold 10 → 6; speed ×2.5.'),
 geminiCart:node('hauler',2,'Gemini Cart','Deploy a detachable 12-fragment cargo cart.'),
 precisionJump:node('hauler',2,'Precision Jump','Charted local work jump: 200 units, 10s cooldown.'),
 twinCartLogistics:node('hauler',3,'Twin Cart Logistics','Two independently loaded carts per Hauler.','geminiCart'),
 armoredFreight:node('hauler',3,'Armored Freight','Tougher cargo carts and towing protection.','geminiCart'),
 rapidCycling:node('hauler',3,'Rapid Cycling','Jump cooldown 10 → 6 seconds.','precisionJump'),
 longHaulJump:node('hauler',3,'Long Haul Jump','Jump reach 200 → 400 units.','precisionJump'),
 surveyArray:node('scout',1,'Survey Array','Sensor radius +50%.'),
 pathfinderEngines:node('scout',1,'Pathfinder Engines','Travel speed +60%.'),
 surveyBeacon:node('scout',2,'Survey Beacon','Deploy a 15-second stationary frontier sensor.'),
 lowSignature:node('scout',2,'Low Signature','Enemy Scout acquisition radius −40% outside investigations.'),
 beaconNetwork:node('scout',3,'Beacon Network','Maintain 2 active beacons per Scout.','surveyBeacon'),
 mineralSpectrometer:node('scout',3,'Mineral Spectrometer','Beacons identify nearby discovered deposits.','surveyBeacon'),
 ghostSurvey:node('scout',3,'Ghost Survey','Keep Low Signature during POI investigation.','lowSignature'),
 decoyBurst:node('scout',3,'Decoy Burst','Threat decoy and escape burst; 20s cooldown.','lowSignature'),
 guardianFrame:node('fighter',1,'Guardian Frame','Hull +50% and greater local intervention radius.'),
 interceptorEngines:node('fighter',1,'Interceptor Engines','Speed +40% and weapon reach +25%.'),
 shieldProjector:node('fighter',2,'Shield Projector','Shield one worker for 4 damage, 4s; 10s cooldown.'),
 suppressiveFire:node('fighter',2,'Suppressive Fire','Hits reduce enemy fire rate 30% briefly.'),
 umbrellaCoverage:node('fighter',3,'Umbrella Coverage','Protect up to 3 nearby workers for 2 damage each.','shieldProjector'),
 personalBodyguard:node('fighter',3,'Personal Bodyguard','Single-worker shield absorbs 7 damage.','shieldProjector'),
 disablingShot:node('fighter',3,'Disabling Shot','Disable one enemy weapon for 2s; 12s cooldown.','suppressiveFire'),
 crossfireControl:node('fighter',3,'Crossfire Control','Suppress 2 local enemies at reduced damage.','suppressiveFire'),
 wideAreaDrilling:node('rig',1,'Wide-Area Drilling','Drill footprint +50%.'),
 deepCoreDrill:node('rig',1,'Deep-Core Drill','Same-rock production ramps up to +40%.'),
 loadingGantry:node('rig',2,'Loading Gantry','Buffer 6 → 12 and quicker Hauler transfers.'),
 rapidDeployment:node('rig',2,'Rapid Deployment','Deploy/pack twice as fast; faster travel.'),
 dualLoadingArms:node('rig',3,'Dual Loading Arms','Two distinct loading berths.','loadingGantry'),
 industrialReserve:node('rig',3,'Industrial Reserve','Buffer 12 → 24.','loadingGantry'),
 rollingRestart:node('rig',3,'Rolling Restart','Retain ramp or gain a brief restart burst.','rapidDeployment'),
 emergencyFold:node('rig',3,'Emergency Fold','Fast threat packing and escape acceleration.','rapidDeployment'),
 reinforcedChassis:node('general',1,'Reinforced Chassis','All friendly hulls +25%.'),
 efficientThrusters:node('general',1,'Efficient Thrusters','All friendly speed +15%.'),
 fieldServiceBuoy:node('general',2,'Field Service Buoy','One local repair berth: 12 HP reserve, 2 HP/s.'),
 overclockNetwork:node('general',2,'Overclock Network','Every 20s: 4s of +25% work and hauling speed.'),
 mobileRepairStation:node('general',3,'Mobile Repair Station','Repair reserve 24 HP and rate 3 HP/s.','fieldServiceBuoy'),
 oreDepot:node('general',3,'Ore Depot','Local 12-fragment buffer for physical hauling.','fieldServiceBuoy'),
 extendedCycle:node('general',3,'Extended Cycle','Overclock burst lasts 6s.','overclockNetwork'),
 protectedOverdrive:node('general',3,'Protected Overdrive','Weapon damage −40% during the 4s burst.','overclockNetwork'),
} as const satisfies Record<string,Node>;
export type TalentId=keyof typeof TALENTS;
export const talentIds=Object.keys(TALENTS) as TalentId[];
export const talentCost=(level:number)=>level;
export const hasTalent=(c:Company,id:TalentId)=>c.talents.includes(id);
export function path(c:Company,category:Category){return c.talents.filter(id=>TALENTS[id].category===category);}
export function talentOptions(c:Company,category:Category):TalentId[]{
 const chosen=path(c,category),level=chosen.length+1;
 if(level>3)return [];
 return talentIds.filter(id=>{const n=TALENTS[id];return n.category===category&&n.level===level&&(!n.requires||chosen.includes(n.requires as TalentId));});
}
export function categoryRequirement(c:Company,category:Category):string|undefined{
 if(!c.basicUpgrades.includes('workPlanner'))return 'Complete the Miner workshop introduction first.';
 if(category==='fighter'&&!c.progress.rivalSeen)return 'Observe a rival with friendly sensors.';
 if(category==='hauler'&&!c.uniqueTechDiscoveries.includes('abandoned_cargo_relay')&&!c.unlockedTypes.includes('hauler'))return 'Investigate the Abandoned Cargo Relay.';
 if(category==='rig'&&!c.uniqueTechDiscoveries.includes('derelict_excavation_platform'))return 'Investigate the Derelict Excavation Platform.';
 const level=path(c,category).length+1;
 if(level===2&&!c.uniqueTechDiscoveries.includes('first_nickel_delivery'))return 'Deliver Nickel to HQ or Outpost first.';
 if(level===3&&(!c.uniqueTechDiscoveries.includes('experimental_probe_salvaged')||!c.uniqueTechDiscoveries.includes('first_aurite_delivery')))return 'Investigate the Probe and deliver Aurite first.';
}
export function researchReason(c:Company,id:TalentId):string|undefined{
 if(!Object.hasOwn(TALENTS,id))return 'Unknown talent.';
 const n=TALENTS[id],requirement=categoryRequirement(c,n.category);
 if(requirement)return requirement;
 if(!talentOptions(c,n.category).includes(id))return 'This choice is not available on your current path.';
 if(c.techPointsAvailable<n.level)return `Requires ${n.level} Tech.`;
}
export function research(c:Company,id:TalentId):Company|null{
 if(researchReason(c,id))return null;
 return {...c,talents:[...c.talents,id],techPointsAvailable:c.techPointsAvailable-TALENTS[id].level};
}
export function validTalents(c:Company){
 if(!Array.isArray(c.talents)||new Set(c.talents).size!==c.talents.length||c.talents.some(id=>!Object.hasOwn(TALENTS,id)))return false;
 for(const category of categories){const chosen=path(c,category);
  if(chosen.length>3||chosen.some((id,i)=>TALENTS[id].level!==i+1||TALENTS[id].requires&&!chosen.includes(TALENTS[id].requires as TalentId)))return false;
  if(chosen.length&&category==='fighter'&&!c.progress.rivalSeen||
   chosen.length&&category==='hauler'&&!c.unlockedTypes.includes('hauler')||
   chosen.length&&category==='rig'&&!c.uniqueTechDiscoveries.includes('derelict_excavation_platform')||
   chosen.length>=2&&!c.uniqueTechDiscoveries.includes('first_nickel_delivery')||
   chosen.length>=3&&!c.uniqueTechDiscoveries.includes('derelict_excavation_platform')&&(!c.uniqueTechDiscoveries.includes('experimental_probe_salvaged')||!c.uniqueTechDiscoveries.includes('first_aurite_delivery')))return false;
  if(chosen.some((id,i)=>i===1&&!talentIds.filter(t=>TALENTS[t].category===category&&TALENTS[t].level===2).includes(id)))return false;
 }
 return true;
}
export const talentSpent=(ids:readonly TalentId[])=>ids.reduce((n,id)=>n+(TALENTS[id]?.level??0),0);
// Historical prices are used exclusively by the v15 one-time refund.
export const OLD_TECH={laserMining:1,impactRecovery:1,rapidCooling:2,escortProgram:1,threatTracking:1,haulerOperation:1,expandedHauler:2} as const;
export const oldTechSpent=(ids:readonly string[],grandfathered=false)=>ids.reduce((n,id)=>n+(id==='escortProgram'&&grandfathered?0:OLD_TECH[id as keyof typeof OLD_TECH]??0),0);
export function awardTech(c:Company,ids:readonly DiscoveryId[]):Company{
 const unique=ids.filter((id,i)=>Object.hasOwn(TECH_DISCOVERIES,id)&&ids.indexOf(id)===i&&!c.uniqueTechDiscoveries.includes(id));
 const sites=unique.filter((id):id is PoiId=>POIS.some(p=>p.id===id));
 const points=unique.reduce((sum,id)=>sum+TECH_REWARDS[id],0);
 return {...c,discoveredPois:[...new Set([...c.discoveredPois,...sites])],uniqueTechDiscoveries:[...c.uniqueTechDiscoveries,...unique],techPointsEarned:c.techPointsEarned+points,techPointsAvailable:c.techPointsAvailable+points,
 unlockedTypes:[...new Set([...c.unlockedTypes,...(unique.includes('abandoned_cargo_relay')?['hauler' as const]:[]),...(unique.includes('derelict_excavation_platform')?['miningRig' as const]:[]),...(unique.includes('first_rival_contact')?['escort' as const]:[])])]};
}
