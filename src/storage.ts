import {W,H,createWorld,freshCompany,nextOffers,BASIC_UPGRADES,type Company,type StoredOre} from './sim.ts';
import {fleetError,freshComposition,MAX_FLEET_CAPACITY} from './fleet.ts';
import {validDoctrine} from './doctrines.ts';
import {discoveryIds,oldTechSpent,OLD_TECH,TECH_REWARDS,talentSpent,validTalents} from './research.ts';
import {POIS,decodeMap} from './knowledge.ts';
import {mineralIds} from './minerals.ts';
import {ENVIRONMENT_UPGRADES,environmentIds} from './biomes.ts';
import {validFocuses} from './focus.ts';
import {GENERATOR_VERSION} from './universe.ts';

export const SAVE_KEY='aisteroids-company-v17';
const V16_KEY='aisteroids-company-v16';
const V15_KEY='aisteroids-company-v15';
const previousKeys=Array.from({length:14},(_,i)=>`aisteroids-company-v${i+1}`);
export type SaveStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type Legacy=Omit<Company,'version'|'contentVersion'|'talents'|'migrationNotice'|'basicUpgrades'|'shopOffers'|'shopPurchases'|'deflectorShields'>&{version:15;unlockedTechnologies:string[];grandfatheredEscort:boolean};
function upgradeV16(raw:string|null):Company|null{
 try{
  const old=JSON.parse(raw||'null') as Company;
  if(!old||(old as {version:number}).version!==16)return null;
  const c:Company={...old,version:17,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],shopOffers:[],shopPurchases:[],deflectorShields:false,progress:{...old.progress,hqIntrusion:false,protectedAuriteDelivery:old.outpost}};
  c.shopOffers=nextOffers(c);
  return decodeSave(JSON.stringify(c));
 }catch{return null;}
}
function validWorld(c:Company){
 const rocks=createWorld(freshCompany(c.worldSeed)).rocks;
 return !c.identifiedRocks.some(id=>!Number.isInteger(id)||id<0||id>=rocks.length)&&
  !Object.entries(c.rockHp).some(([id,hp])=>!/^\d+$/.test(id)||!rocks[Number(id)]||!Number.isInteger(hp)||hp<0||hp>rocks[Number(id)].max)&&
  !Object.entries(c.poiProgress).some(([id,seconds])=>!POIS.some(p=>p.id===id)||typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0||seconds>4);
}
function decodeSave(raw:string|null):Company|null{
 try{
  const c=JSON.parse(raw||'null') as Company;
  if(!c||c.version!==17||![1,2].includes(c.contentVersion)||!Number.isSafeInteger(c.worldSeed)||c.worldSeed<0||c.worldSeed>4294967295||
   !Number.isSafeInteger(c.credits)||c.credits<0||!Number.isSafeInteger(c.total)||c.total<0||!Number.isSafeInteger(c.rounds)||c.rounds<0||
   !Number.isInteger(c.fleetCapacity)||c.fleetCapacity<1||c.fleetCapacity>MAX_FLEET_CAPACITY||!c.fleetComposition||
   Object.keys(c.fleetComposition).sort().join()!==Object.keys(freshComposition()).sort().join()||
   !Array.isArray(c.unlockedTypes)||!Array.isArray(c.uniqueTechDiscoveries)||!Array.isArray(c.environmentUpgrades)||
   !Array.isArray(c.extractionUpgrades)||!Array.isArray(c.identifiedRocks)||!Array.isArray(c.discoveredPois)||
   !validFocuses(c.focuses)||!validDoctrine(c.doctrine)||typeof c.migrationNotice!=='boolean'||typeof c.legacyHaulerAccess!=='boolean'||typeof c.deflectorShields!=='boolean'||
   (c.seenUnlocks!==undefined&&(!Array.isArray(c.seenUnlocks)||new Set(c.seenUnlocks).size!==c.seenUnlocks.length||c.seenUnlocks.some(id=>!['hauler','escort','miningRig'].includes(id)||!c.unlockedTypes.includes(id))))||
   !Array.isArray(c.basicUpgrades)||c.basicUpgrades.some((id,i)=>!Object.hasOwn(BASIC_UPGRADES,id)||(['cargoAwareness','navigationAssist','workPlanner'] as string[])[i]!==id)||
   !Array.isArray(c.shopOffers)||c.shopOffers.length>2||new Set(c.shopOffers).size!==c.shopOffers.length||c.shopOffers.some(id=>!['cargoAwareness','navigationAssist','workPlanner','fleetSlot','turret','outpost','endurance','deflectorShields','highPowerOptics','resonanceMining',...environmentIds].includes(id))||
   !Array.isArray(c.shopPurchases)||new Set(c.shopPurchases).size!==c.shopPurchases.length||c.shopPurchases.some(id=>!['cargoAwareness','navigationAssist','workPlanner','fleetSlot','turret','outpost','endurance','deflectorShields','highPowerOptics','resonanceMining',...environmentIds].includes(id))||
   !Number.isInteger(c.enduranceLevel)||c.enduranceLevel<0||c.enduranceLevel>3||
   !Number.isInteger(c.capacityReminder)||c.capacityReminder<1||c.capacityReminder>c.fleetCapacity||
   typeof c.turret!=='boolean'||typeof c.outpost!=='boolean'||!['home','far'].includes(c.launchSite)||c.launchSite==='far'&&!c.outpost||
   !c.progress||['farSurveyed','richSampled','rivalSeen','outpostSurveyed','hqIntrusion','protectedAuriteDelivery'].some(k=>typeof c.progress[k as keyof typeof c.progress]!=='boolean')||
   !decodeMap(c.explored)||!c.rockHp||typeof c.rockHp!=='object'||!c.poiProgress||typeof c.poiProgress!=='object'||
   !validTalents(c)||c.uniqueTechDiscoveries.some(id=>!discoveryIds.includes(id))||
   c.discoveredPois.some(id=>!POIS.some(p=>p.id===id))||
   c.environmentUpgrades.some(id=>!environmentIds.includes(id)||!c.uniqueTechDiscoveries.includes(ENVIRONMENT_UPGRADES[id].site))||
   c.extractionUpgrades.some(id=>!['highPowerOptics','resonanceMining'].includes(id))||
   [c.uniqueTechDiscoveries,c.talents,c.discoveredPois,c.environmentUpgrades,c.extractionUpgrades,c.identifiedRocks,c.unlockedTypes].some(list=>new Set<unknown>(list).size!==list.length)||
   c.unlockedTypes.some(id=>!['impactMiner','scout','escort','hauler','miningRig'].includes(id))||
   c.unlockedTypes.slice().sort().join()!==['impactMiner','scout',...(c.progress.rivalSeen?['escort']:[]),...(c.uniqueTechDiscoveries.includes('abandoned_cargo_relay')||c.legacyHaulerAccess?['hauler']:[]),...(c.uniqueTechDiscoveries.includes('derelict_excavation_platform')?['miningRig']:[])].sort().join()||
   c.techPointsEarned!==c.uniqueTechDiscoveries.reduce((sum,id)=>sum+TECH_REWARDS[id],0)||
   c.techPointsAvailable!==c.techPointsEarned-talentSpent(c.talents)||
   !Array.isArray(c.ores)||c.ores.length>20000||c.ores.some((o:StoredOre)=>!o||!Number.isFinite(o.x)||o.x<0||o.x>W||!Number.isFinite(o.y)||o.y<0||o.y>H||o.value!==1||!mineralIds.includes(o.mineral))||
   fleetError(c))return null;
  return validWorld(c)?{...c,contentVersion:2}:null;
 }catch{return null;}
}
// Validate the old economy before crediting a one-time refund. No world is
// regenerated, and the two new sites are deterministic content overlays.
function migrate(raw:string|null):Company|null{
 try{
  const old=JSON.parse(raw||'null') as Legacy;
  if(!old||old.version!==15||!Number.isSafeInteger(old.worldSeed)||old.worldSeed<0||old.worldSeed>4294967295||
   !Array.isArray(old.unlockedTechnologies)||new Set(old.unlockedTechnologies).size!==old.unlockedTechnologies.length||
   old.unlockedTechnologies.some(id=>!Object.hasOwn(OLD_TECH,id))||!Array.isArray(old.uniqueTechDiscoveries)||
   old.uniqueTechDiscoveries.some(id=>!discoveryIds.includes(id))||old.techPointsEarned!==old.uniqueTechDiscoveries.length||
   old.techPointsAvailable!==old.techPointsEarned-oldTechSpent(old.unlockedTechnologies,old.grandfatheredEscort)||
   old.unlockedTechnologies.includes('rapidCooling')&&!old.unlockedTechnologies.includes('laserMining')||old.unlockedTechnologies.includes('threatTracking')&&!old.unlockedTechnologies.includes('escortProgram')||old.unlockedTechnologies.includes('expandedHauler')&&!old.unlockedTechnologies.includes('haulerOperation')||old.unlockedTechnologies.includes('escortProgram')&&!old.progress?.rivalSeen||!old.fleetComposition||!Number.isInteger(old.fleetComposition.impactMiner)||!Number.isInteger(old.fleetComposition.laserMiner))return null;
  const fleet={...old.fleetComposition,impactMiner:old.fleetComposition.impactMiner+old.fleetComposition.laserMiner,laserMiner:0};
  const c:Company={...old,version:17,contentVersion:1,basicUpgrades:['cargoAwareness','navigationAssist','workPlanner'],shopOffers:[],shopPurchases:[],deflectorShields:false,progress:{...old.progress,hqIntrusion:false,protectedAuriteDelivery:old.outpost},talents:[],migrationNotice:old.unlockedTechnologies.length>0,legacyHaulerAccess:old.unlockedTechnologies.includes('haulerOperation')&&!old.uniqueTechDiscoveries.includes('abandoned_cargo_relay'),
   techPointsAvailable:old.techPointsAvailable+oldTechSpent(old.unlockedTechnologies,old.grandfatheredEscort),fleetComposition:fleet,
   unlockedTypes:['impactMiner','scout',...(old.progress.rivalSeen||old.unlockedTypes?.includes('escort')?['escort' as const]:[]),...(old.unlockedTypes?.includes('hauler')||old.uniqueTechDiscoveries.includes('abandoned_cargo_relay')?['hauler' as const]:[])],
   uniqueTechDiscoveries:old.uniqueTechDiscoveries as Company['uniqueTechDiscoveries']};
  delete (c as unknown as Record<string,unknown>).unlockedTechnologies;
  delete (c as unknown as Record<string,unknown>).grandfatheredEscort;
  c.shopOffers=nextOffers(c);
  return decodeSave(JSON.stringify(c));
 }catch{return null;}
}
export const parseSave=(raw:string|null):Company=>decodeSave(raw)??upgradeV16(raw)??migrate(raw)??freshCompany();
export type CompanyRead={company:Company|null;issue:'corrupt'|'reset'|'migrated'|null;storageOK:boolean};
/** Commit the new key first. A valid v17 always wins, even with stale keys. */
export function readCompany(store:SaveStore,seed=7):CompanyRead{
 const raw=store.getItem(SAVE_KEY);
 if(raw!==null){let company=decodeSave(raw);if(company&&!company.shopPurchases.length)company={...company,shopOffers:nextOffers(company)};return {company,issue:company?null:'corrupt',storageOK:true};}
 const oldV16=store.getItem(V16_KEY);
 if(oldV16!==null){const company=upgradeV16(oldV16);if(!company)return {company:null,issue:'corrupt',storageOK:true};
  try{store.setItem(SAVE_KEY,JSON.stringify(company));store.removeItem(V16_KEY);return {company,issue:'migrated',storageOK:true};}
  catch{return {company:null,issue:'migrated',storageOK:false};}
 }
 const previous=store.getItem(V15_KEY);
 if(previous!==null){const company=migrate(previous);if(!company)return {company:null,issue:'corrupt',storageOK:true};
  try{store.setItem(SAVE_KEY,JSON.stringify(company));store.removeItem(V15_KEY);return {company,issue:'migrated',storageOK:true};}
  catch{return {company:null,issue:'migrated',storageOK:false};}
 }
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
