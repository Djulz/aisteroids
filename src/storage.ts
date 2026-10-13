import {W,H,freshCompany, type Company, type Progress, type StoredOre} from './sim.ts';
import {validDoctrine} from './doctrines.ts';
import {fleetForCounts} from './fleet.ts';
// The key stays the same so older local companies migrate in place.
export const SAVE_KEY='aisteroids-company-v1';
export function parseSave(raw:string|null):Company{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||![1,2,3,4,5,6].includes(v.version)||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isInteger(v.drones)||v.drones<1||v.drones>6||typeof v.scanner!=='boolean'||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isSafeInteger(v.total)||v.total<0)return freshCompany();
  if(v.version===1&&typeof v.blaster!=='boolean'||v.version>=2&&(typeof v.laser!=='boolean'||typeof v.hull!=='boolean'))return freshCompany();
  if(v.version>=3&&(typeof v.cargoBay!=='boolean'||typeof v.prospector!=='boolean'||typeof v.drive!=='boolean'||typeof v.outpost!=='boolean'||!Number.isInteger(v.guards)||v.guards<0||v.guards>2||!['home','far'].includes(v.launchSite)||v.launchSite==='far'&&!v.outpost))return freshCompany();
  if(v.version>=4){
   if(!Number.isSafeInteger(v.worldSeed)||v.worldSeed<0||v.worldSeed>4294967295||!v.rockHp||typeof v.rockHp!=='object'||Array.isArray(v.rockHp)||!Array.isArray(v.ores)||v.ores.length>10000||!v.progress||typeof v.progress!=='object'||!['auto','surveyFar','surveyOutpost'].includes(v.directive))return freshCompany();
   if(Object.entries(v.rockHp).some(([id,hp])=>!/^([0-9]|[12][0-9])$/.test(id)||typeof hp!=='number'||!Number.isInteger(hp)||hp<0||hp>(v.version===4?150:600)))return freshCompany();
   if(v.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||!Number.isInteger(o.value)||o.value<(v.version===4?2:1)||o.value>18||v.version===4&&o.value%2||typeof o.rich!=='boolean'))return freshCompany();
   if(['farSurveyed','richSampled','rivalSeen','outpostSurveyed'].some(k=>typeof v.progress[k]!=='boolean'))return freshCompany();
  }
  const base=freshCompany();
  const owned=v.version>=3?{cargoBay:v.cargoBay,prospector:v.prospector,drive:v.drive,guards:v.guards,outpost:v.outpost,launchSite:v.launchSite}:{};
  const progress:Progress=v.version>=4?v.progress:{farSurveyed:!!(v.cargoBay||v.prospector||v.drive||v.guards||v.outpost),richSampled:!!(v.cargoBay||v.prospector||v.drive||v.guards||v.outpost),rivalSeen:!!(v.guards||v.outpost),outpostSurveyed:!!v.outpost};
  const laser=v.version>=2?v.laser:v.blaster;
  // Old roles were fixed by purchased type. Version 6 keeps these IDs but allows
  // their equipped roles to change independently of the entitlement that made them.
  const savedFleet=v.version<6&&Array.isArray(v.fleet)?v.fleet.map((d:Record<string,unknown>)=>({...d,role:typeof d?.id==='string'&&d.id.startsWith('escort-')?'escort':'miner',frame:'standard',modules:[null,null]})):v.fleet;
  return {...base,credits:v.credits,drones:v.drones,scanner:v.scanner,hull:v.version>=2?v.hull:false,laser,turret:v.turret===true,rounds:v.rounds,total:v.total,...owned,progress,...(v.version>=4?{worldSeed:v.worldSeed,rockHp:v.version===4?Object.fromEntries(Object.entries(v.rockHp).map(([id,hp])=>[id,(hp as number)*4])):v.rockHp,ores:v.ores,directive:v.directive}:{}),doctrine:validDoctrine(v.doctrine),fleet:fleetForCounts(v.drones,v.version>=3?v.guards:0,savedFleet,laser)};
 }catch{return freshCompany();}
}
