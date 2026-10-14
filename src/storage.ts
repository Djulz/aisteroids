import {W,H,createWorld,freshCompany,type Company,type Progress,type StoredOre} from './sim.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY,type FleetComposition,type FleetType} from './fleet.ts';
import {validDoctrine} from './doctrines.ts';
import {awardTech,discoveryIds,TECH,techSpent,technologyIds,type DiscoveryId,type TechnologyId} from './research.ts';
import {POIS,decodeMap,encodeMap,migrateV10Map,seedKnown,seededMap,type PoiId} from './knowledge.ts';
export const SAVE_KEY='aisteroids-company-v11';
const previousKeys=['aisteroids-company-v10','aisteroids-company-v9','aisteroids-company-v8','aisteroids-company-v7'];
const oldKeys=Array.from({length:6},(_,i)=>`aisteroids-company-v${i+1}`);
export type SaveStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const historical=(p:Progress):DiscoveryId[]=>[
 ...(p.farSurveyed?['far_belt_charted' as const]:[]),
 ...(p.richSampled?['first_rich_sample' as const]:[]),
 ...(p.rivalSeen?['first_rival_contact' as const]:[]),
 ...(p.outpostSurveyed?['outpost_site_surveyed' as const]:[]),
];
export function parseSave(raw:string|null):Company{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||![7,8,9,10,11].includes(v.version)||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isSafeInteger(v.total)||v.total<0||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isInteger(v.fleetCapacity)||v.fleetCapacity<1||v.fleetCapacity>MAX_FLEET_CAPACITY||!v.fleetComposition||typeof v.fleetComposition!=='object'||Array.isArray(v.fleetComposition))return freshCompany();
  const allowed=v.version>=10?['impactMiner','laserMiner','escort','hauler','scout','miningRig']:['impactMiner','laserMiner','escort','hauler','miningRig'];
  if(Object.keys(v.fleetComposition).some(k=>!allowed.includes(k)))return freshCompany();
  if(v.version>=10&&(allowed.some(k=>!Object.hasOwn(v.fleetComposition,k))||!Array.isArray(v.unlockedTypes)||v.unlockedTypes.some((k:unknown)=>typeof k!=='string'||!allowed.includes(k))||new Set(v.unlockedTypes).size!==v.unlockedTypes.length))return freshCompany();
  if(!v.progress||['farSurveyed','richSampled','rivalSeen','outpostSurveyed'].some(k=>typeof v.progress[k]!=='boolean')||typeof v.turret!=='boolean'||typeof v.outpost!=='boolean'||!['home','far'].includes(v.launchSite)||v.launchSite==='far'&&!v.outpost||!Number.isSafeInteger(v.worldSeed)||v.worldSeed>4294967295||v.worldSeed<0)return freshCompany();
  if(!v.rockHp||typeof v.rockHp!=='object'||Array.isArray(v.rockHp)||Object.entries(v.rockHp).some(([id,hp])=>!/^([0-9]|[1-9][0-9]{1,2})$/.test(id)||!Number.isInteger(hp)||Number(hp)<0||Number(hp)>200))return freshCompany();
  if(!Array.isArray(v.ores)||v.ores.length>20000||v.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||o.value!==1||typeof o.rich!=='boolean'))return freshCompany();
  if(v.version<10&&(!['auto','chartFar','surveyFar','surveyOutpost',...(v.version===9?['investigateFreight']:[])].includes(v.directive)||v.version===7&&v.directive==='chartFar'))return freshCompany();
  if(v.version>=10&&(!(v.version===10?migrateV10Map(v.explored):decodeMap(v.explored))||!Array.isArray(v.discoveredPois)||v.discoveredPois.some((id:unknown)=>!POIS.some(p=>p.id===id))||new Set(v.discoveredPois).size!==v.discoveredPois.length))return freshCompany();
  if(v.version===11&&(!Number.isInteger(v.enduranceLevel)||v.enduranceLevel<0||v.enduranceLevel>3))return freshCompany();
  const composition:FleetComposition={...freshComposition(),...v.fleetComposition};
  if(v.version<9&&composition.hauler!==0)return freshCompany();
  const progress:Progress={...v.progress};
  const maxima=createWorld({...freshCompany(),worldSeed:v.worldSeed},v.worldSeed).rocks;
  if(Object.entries(v.rockHp).some(([id,hp])=>!maxima[Number(id)]||Number(hp)>maxima[Number(id)].max))return freshCompany();
  if(v.version===7){
   const grandfatheredEscort=composition.escort>0&&progress.rivalSeen;
   const company:Company={...freshCompany(),credits:v.credits,total:v.total,rounds:v.rounds,fleetCapacity:v.fleetCapacity,fleetComposition:composition,progress,turret:v.turret,outpost:v.outpost,launchSite:v.launchSite,worldSeed:v.worldSeed,rockHp:v.rockHp,ores:v.ores,explored:seededMap(progress,v.outpost),doctrine:validDoctrine(v.doctrine),grandfatheredEscort,unlockedTechnologies:grandfatheredEscort?['escortProgram']:[],unlockedTypes:['impactMiner','scout',...(grandfatheredEscort?['escort'] as const:[])]};
   if(fleetError(company))return freshCompany();
   return awardTech(company,historical(progress));
  }
  if(!Array.isArray(v.uniqueTechDiscoveries)||v.uniqueTechDiscoveries.some((id:unknown)=>typeof id!=='string'||!discoveryIds.includes(id as DiscoveryId))||new Set(v.uniqueTechDiscoveries).size!==v.uniqueTechDiscoveries.length||!Array.isArray(v.unlockedTechnologies)||v.unlockedTechnologies.some((id:unknown)=>typeof id!=='string'||!technologyIds.includes(id as TechnologyId))||new Set(v.unlockedTechnologies).size!==v.unlockedTechnologies.length||typeof v.grandfatheredEscort!=='boolean')return freshCompany();
  if(v.unlockedTechnologies.some((id:TechnologyId)=>TECH[id].requires.some(required=>!v.unlockedTechnologies.includes(required)))||v.unlockedTechnologies.includes('escortProgram')&&!progress.rivalSeen||v.grandfatheredEscort&&!v.unlockedTechnologies.includes('escortProgram'))return freshCompany();
  const earned=v.uniqueTechDiscoveries.length,spent=techSpent(v.unlockedTechnologies,v.grandfatheredEscort);
  if(earned!==v.techPointsEarned||earned-spent!==v.techPointsAvailable||earned<spent)return freshCompany();
  if(v.version<9&&v.unlockedTechnologies.some((id:TechnologyId)=>id==='haulerOperation'||id==='expandedHauler')||v.version<9&&v.uniqueTechDiscoveries.some((id:DiscoveryId)=>['abandoned_cargo_relay','derelict_freight_shuttle','automated_sorting_archive'].includes(id)))return freshCompany();
  const unlockedTypes:FleetType[]=['impactMiner','scout',...(v.unlockedTechnologies.includes('laserMining')?['laserMiner'] as const:[]),...(v.unlockedTechnologies.includes('escortProgram')?['escort'] as const:[]),...(v.unlockedTechnologies.includes('haulerOperation')?['hauler'] as const:[])];
  const investigated=v.uniqueTechDiscoveries.filter((id:string)=>POIS.some(p=>p.id===id)) as PoiId[];
  const company:Company={...freshCompany(),credits:v.credits,total:v.total,rounds:v.rounds,fleetCapacity:v.fleetCapacity,fleetComposition:composition,progress,turret:v.turret,outpost:v.outpost,launchSite:v.launchSite,worldSeed:v.worldSeed,rockHp:v.rockHp,ores:v.ores,explored:v.version===11?v.explored:v.version===10?seedKnown(migrateV10Map(v.explored)!,progress,v.outpost,[...v.discoveredPois,...investigated]):seededMap(progress,v.outpost,investigated),discoveredPois:v.version>=10?[...new Set([...v.discoveredPois,...investigated])] as PoiId[]:investigated,doctrine:validDoctrine(v.doctrine),techPointsEarned:earned,techPointsAvailable:earned-spent,uniqueTechDiscoveries:v.uniqueTechDiscoveries,unlockedTechnologies:v.unlockedTechnologies,unlockedTypes,grandfatheredEscort:v.grandfatheredEscort,enduranceLevel:v.version===11?v.enduranceLevel:0};
  if(fleetError(company))return freshCompany();
  return company;
 }catch{return freshCompany();}
}
export function loadCompany(store:SaveStore):Company{
 const raw=store.getItem(SAVE_KEY);
 const previous=raw===null?previousKeys.map(key=>store.getItem(key)).find(value=>value!==null)??null:null;
 const company=parseSave(raw??previous);
 store.setItem(SAVE_KEY,JSON.stringify(company));
 for(const key of [...oldKeys,...previousKeys])store.removeItem(key);
 return company;
}
