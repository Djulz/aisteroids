import {W,H,freshCompany,type Company,type Progress,type StoredOre} from './sim.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY,type FleetComposition} from './fleet.ts';
import {validDoctrine} from './doctrines.ts';
export const SAVE_KEY='aisteroids-company-v7';
const oldKeys=['aisteroids-company-v1','aisteroids-company-v2','aisteroids-company-v3','aisteroids-company-v4','aisteroids-company-v5','aisteroids-company-v6'];
export type SaveStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function parseSave(raw:string|null):Company{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||v.version!==7||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isSafeInteger(v.total)||v.total<0||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isInteger(v.fleetCapacity)||v.fleetCapacity<1||v.fleetCapacity>MAX_FLEET_CAPACITY||!v.fleetComposition||typeof v.fleetComposition!=='object'||Array.isArray(v.fleetComposition))return freshCompany();
  if(!v.progress||['farSurveyed','richSampled','rivalSeen','outpostSurveyed'].some(k=>typeof v.progress[k]!=='boolean')||typeof v.turret!=='boolean'||typeof v.outpost!=='boolean'||!['home','far'].includes(v.launchSite)||v.launchSite==='far'&&!v.outpost||!Number.isSafeInteger(v.worldSeed)||v.worldSeed>4294967295||v.worldSeed<0)return freshCompany();
  if(!v.rockHp||typeof v.rockHp!=='object'||Array.isArray(v.rockHp)||Object.entries(v.rockHp).some(([id,hp])=>!/^([0-9]|[12][0-9])$/.test(id)||!Number.isInteger(hp)||Number(hp)<0||Number(hp)>200))return freshCompany();
  if(!Array.isArray(v.ores)||v.ores.length>20000||v.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||o.value!==1||typeof o.rich!=='boolean'))return freshCompany();
  if(!['auto','surveyFar','surveyOutpost'].includes(v.directive))return freshCompany();
  // Pass A has no research UI. A forged Laser unlock in localStorage does not
  // grant technology; only deterministic test fixtures may supply it directly.
  const composition: FleetComposition={...freshComposition(),...v.fleetComposition};
  const progress:Progress=v.progress;
  const company:Company={...freshCompany(),credits:v.credits,total:v.total,rounds:v.rounds,fleetCapacity:v.fleetCapacity,fleetComposition:composition,progress,turret:v.turret,outpost:v.outpost,launchSite:v.launchSite,worldSeed:v.worldSeed,rockHp:v.rockHp,ores:v.ores,directive:v.directive,doctrine:validDoctrine(v.doctrine),techPointsAvailable:0,techPointsEarned:0,uniqueTechDiscoveries:[],unlockedTechnologies:[]};
  if(fleetError(company))return freshCompany();
  return company;
 }catch{return freshCompany();}
}
export function loadCompany(store:SaveStore):Company{
 for(const key of oldKeys)store.removeItem(key);
 const raw=store.getItem(SAVE_KEY),company=parseSave(raw);
 if(!raw||JSON.stringify(company)!==raw)store.setItem(SAVE_KEY,JSON.stringify(company));
 return company;
}
