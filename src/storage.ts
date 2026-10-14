import {W,H,freshCompany,type Company,type Progress,type StoredOre} from './sim.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY,type FleetComposition,type FleetType} from './fleet.ts';
import {validDoctrine} from './doctrines.ts';
import {awardTech,discoveryIds,TECH,techSpent,technologyIds,type DiscoveryId,type TechnologyId} from './research.ts';
export const SAVE_KEY='aisteroids-company-v8';
const previousKey='aisteroids-company-v7';
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
  if(!v||![7,8].includes(v.version)||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isSafeInteger(v.total)||v.total<0||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isInteger(v.fleetCapacity)||v.fleetCapacity<1||v.fleetCapacity>MAX_FLEET_CAPACITY||!v.fleetComposition||typeof v.fleetComposition!=='object'||Array.isArray(v.fleetComposition))return freshCompany();
  if(!v.progress||['farSurveyed','richSampled','rivalSeen','outpostSurveyed'].some(k=>typeof v.progress[k]!=='boolean')||typeof v.turret!=='boolean'||typeof v.outpost!=='boolean'||!['home','far'].includes(v.launchSite)||v.launchSite==='far'&&!v.outpost||!Number.isSafeInteger(v.worldSeed)||v.worldSeed>4294967295||v.worldSeed<0)return freshCompany();
  if(!v.rockHp||typeof v.rockHp!=='object'||Array.isArray(v.rockHp)||Object.entries(v.rockHp).some(([id,hp])=>!/^([0-9]|[12][0-9])$/.test(id)||!Number.isInteger(hp)||Number(hp)<0||Number(hp)>200))return freshCompany();
  if(!Array.isArray(v.ores)||v.ores.length>20000||v.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||o.value!==1||typeof o.rich!=='boolean'))return freshCompany();
  if(!['auto','chartFar','surveyFar','surveyOutpost'].includes(v.directive)||v.version===7&&v.directive==='chartFar')return freshCompany();
  const composition:FleetComposition={...freshComposition(),...v.fleetComposition};
  const progress:Progress={...v.progress};
  if(v.version===7){
   const grandfatheredEscort=composition.escort>0&&progress.rivalSeen;
   const company:Company={...freshCompany(),credits:v.credits,total:v.total,rounds:v.rounds,fleetCapacity:v.fleetCapacity,fleetComposition:composition,progress,turret:v.turret,outpost:v.outpost,launchSite:v.launchSite,worldSeed:v.worldSeed,rockHp:v.rockHp,ores:v.ores,directive:v.directive,doctrine:validDoctrine(v.doctrine),grandfatheredEscort,unlockedTechnologies:grandfatheredEscort?['escortProgram']:[],unlockedTypes:['impactMiner',...(grandfatheredEscort?['escort'] as const:[])]};
   if(fleetError(company))return freshCompany();
   return awardTech(company,historical(progress));
  }
  if(!Array.isArray(v.uniqueTechDiscoveries)||v.uniqueTechDiscoveries.some((id:unknown)=>typeof id!=='string'||!discoveryIds.includes(id as DiscoveryId))||new Set(v.uniqueTechDiscoveries).size!==v.uniqueTechDiscoveries.length||!Array.isArray(v.unlockedTechnologies)||v.unlockedTechnologies.some((id:unknown)=>typeof id!=='string'||!technologyIds.includes(id as TechnologyId))||new Set(v.unlockedTechnologies).size!==v.unlockedTechnologies.length||typeof v.grandfatheredEscort!=='boolean')return freshCompany();
  if(v.unlockedTechnologies.some((id:TechnologyId)=>TECH[id].requires.some(required=>!v.unlockedTechnologies.includes(required)))||v.unlockedTechnologies.includes('escortProgram')&&!progress.rivalSeen||v.grandfatheredEscort&&!v.unlockedTechnologies.includes('escortProgram'))return freshCompany();
  const earned=v.uniqueTechDiscoveries.length,spent=techSpent(v.unlockedTechnologies,v.grandfatheredEscort);
  if(earned!==v.techPointsEarned||earned-spent!==v.techPointsAvailable||earned<spent)return freshCompany();
  const unlockedTypes:FleetType[]=['impactMiner',...(v.unlockedTechnologies.includes('laserMining')?['laserMiner'] as const:[]),...(v.unlockedTechnologies.includes('escortProgram')?['escort'] as const:[])];
  const company:Company={...freshCompany(),credits:v.credits,total:v.total,rounds:v.rounds,fleetCapacity:v.fleetCapacity,fleetComposition:composition,progress,turret:v.turret,outpost:v.outpost,launchSite:v.launchSite,worldSeed:v.worldSeed,rockHp:v.rockHp,ores:v.ores,directive:v.directive,doctrine:validDoctrine(v.doctrine),techPointsEarned:earned,techPointsAvailable:earned-spent,uniqueTechDiscoveries:v.uniqueTechDiscoveries,unlockedTechnologies:v.unlockedTechnologies,unlockedTypes,grandfatheredEscort:v.grandfatheredEscort};
  if(fleetError(company))return freshCompany();
  return company;
 }catch{return freshCompany();}
}
export function loadCompany(store:SaveStore):Company{
 const raw=store.getItem(SAVE_KEY);
 const previous=raw===null?store.getItem(previousKey):null;
 const company=parseSave(raw??previous);
 store.setItem(SAVE_KEY,JSON.stringify(company));
 for(const key of [...oldKeys,previousKey])store.removeItem(key);
 return company;
}
