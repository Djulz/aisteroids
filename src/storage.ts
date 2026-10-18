import {W,H,createWorld,freshCompany,type Company,type StoredOre} from './sim.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY} from './fleet.ts';
import {validDoctrine} from './doctrines.ts';
import {discoveryIds,TECH,techSpent,technologyIds} from './research.ts';
import {POIS,decodeMap} from './knowledge.ts';
import {mineralIds} from './minerals.ts';
import {ENVIRONMENT_UPGRADES,environmentIds} from './biomes.ts';
import {validFocuses} from './focus.ts';
import {GENERATOR_VERSION} from './universe.ts';

export const SAVE_KEY='aisteroids-company-v15';
const previousKeys=Array.from({length:14},(_,i)=>`aisteroids-company-v${i+1}`);
export type SaveStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
function decodeSave(raw:string|null):Company|null{
 try{
  const c=JSON.parse(raw||'null') as Company;
  if(!c||c.version!==15||!Number.isSafeInteger(c.worldSeed)||c.worldSeed<0||c.worldSeed>4294967295||
   !Number.isSafeInteger(c.credits)||c.credits<0||!Number.isSafeInteger(c.total)||c.total<0||!Number.isSafeInteger(c.rounds)||c.rounds<0||
   !Number.isInteger(c.fleetCapacity)||c.fleetCapacity<1||c.fleetCapacity>MAX_FLEET_CAPACITY||!c.fleetComposition||
   Object.keys(c.fleetComposition).sort().join()!==Object.keys(freshComposition()).sort().join()||
   !Array.isArray(c.unlockedTypes)||!Array.isArray(c.unlockedTechnologies)||!Array.isArray(c.uniqueTechDiscoveries)||
   !Array.isArray(c.environmentUpgrades)||!Array.isArray(c.extractionUpgrades)||!Array.isArray(c.identifiedRocks)||
   !Array.isArray(c.discoveredPois)||!validFocuses(c.focuses)||!validDoctrine(c.doctrine)||
   !Number.isInteger(c.enduranceLevel)||c.enduranceLevel<0||c.enduranceLevel>3||
   !Number.isInteger(c.capacityReminder)||c.capacityReminder<1||c.capacityReminder>c.fleetCapacity||
   typeof c.turret!=='boolean'||typeof c.outpost!=='boolean'||!['home','far'].includes(c.launchSite)||c.launchSite==='far'&&!c.outpost||
   !c.progress||['farSurveyed','richSampled','rivalSeen','outpostSurveyed'].some(k=>typeof c.progress[k as keyof typeof c.progress]!=='boolean')||
   !decodeMap(c.explored)||!c.rockHp||typeof c.rockHp!=='object'||!c.poiProgress||typeof c.poiProgress!=='object'||
   c.unlockedTechnologies.some(id=>!technologyIds.includes(id as never)||TECH[id as keyof typeof TECH].requires.some(req=>!c.unlockedTechnologies.includes(req)))||
   c.grandfatheredEscort!==false||c.unlockedTypes.slice().sort().join()!==[
    'impactMiner','scout',...(c.unlockedTechnologies.includes('laserMining')?['laserMiner']:[]),
    ...(c.unlockedTechnologies.includes('escortProgram')?['escort']:[]),
    ...(c.unlockedTechnologies.includes('haulerOperation')?['hauler']:[]),
   ].sort().join()||c.unlockedTechnologies.includes('escortProgram')&&!c.progress.rivalSeen||
   c.uniqueTechDiscoveries.some(id=>!discoveryIds.includes(id))||
   c.discoveredPois.some(id=>!POIS.some(p=>p.id===id))||
   c.environmentUpgrades.some(id=>!environmentIds.includes(id)||!c.uniqueTechDiscoveries.includes(ENVIRONMENT_UPGRADES[id].site))||
   c.extractionUpgrades.some(id=>!['highPowerOptics','resonanceMining'].includes(id))||
   [c.uniqueTechDiscoveries,c.unlockedTechnologies,c.discoveredPois,c.environmentUpgrades,c.extractionUpgrades,c.identifiedRocks].some(list=>new Set<unknown>(list).size!==list.length)||
   c.techPointsEarned!==c.uniqueTechDiscoveries.length||c.techPointsAvailable!==c.techPointsEarned-techSpent(c.unlockedTechnologies as never,c.grandfatheredEscort)||
   !Array.isArray(c.ores)||c.ores.length>20000||c.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||o.value!==1||!mineralIds.includes(o.mineral))||
   fleetError(c))return null;
  const rocks=createWorld(freshCompany(c.worldSeed)).rocks;
  if(c.identifiedRocks.some(id=>!Number.isInteger(id)||id<0||id>=rocks.length)||
   Object.entries(c.rockHp).some(([id,hp])=>!/^\d+$/.test(id)||!rocks[Number(id)]||!Number.isInteger(hp)||hp<0||hp>rocks[Number(id)].max)||
   Object.entries(c.poiProgress).some(([id,seconds])=>!POIS.some(p=>p.id===id)||typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0||seconds>4))return null;
  return c;
 }catch{return null;}
}
export const parseSave=(raw:string|null):Company=>decodeSave(raw)??freshCompany();
export type CompanyRead={company:Company|null;issue:'corrupt'|'reset'|null;storageOK:boolean};
/** The user authorized one incompatible universe epoch. Persist the new seed
 * before removing old company keys; valid v15 always wins on reload. */
export function readCompany(store:SaveStore,seed=7):CompanyRead{
 const raw=store.getItem(SAVE_KEY);
 if(raw!==null){const company=decodeSave(raw);return {company,issue:company?null:'corrupt',storageOK:true};}
 const old=previousKeys.some(key=>store.getItem(key)!==null);
 if(!old)return {company:null,issue:null,storageOK:true};
 const company=freshCompany(seed);
 try{store.setItem(SAVE_KEY,JSON.stringify(company));for(const key of previousKeys)store.removeItem(key);return {company,issue:'reset',storageOK:true};}
 catch{return {company:null,issue:'reset',storageOK:false};}
}
export function loadCompany(store:SaveStore):Company{
 const read=readCompany(store),company=read.company??freshCompany();
 store.setItem(SAVE_KEY,JSON.stringify(company));
 if(read.storageOK)for(const key of previousKeys)store.removeItem(key);
 return company;
}
export {GENERATOR_VERSION};
