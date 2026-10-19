// A single Miner role. The engine still calls the chosen specialization
// impactMiner/laserMiner; legacy counts are normalized at the save boundary.
export type FleetType='impactMiner'|'laserMiner'|'escort'|'hauler'|'scout'|'miningRig';
export type FleetComposition=Record<FleetType,number>;
export const MAX_FLEET_CAPACITY=6;
export const freshComposition=():FleetComposition=>({impactMiner:1,laserMiner:0,escort:0,hauler:0,scout:0,miningRig:0});
export const usedSlots=(fleet:FleetComposition)=>fleet.impactMiner+fleet.laserMiner+fleet.hauler+fleet.escort+fleet.scout+2*fleet.miningRig;
export type FleetOwner={fleetCapacity:number;fleetComposition:FleetComposition;unlockedTypes:FleetType[];progress:{rivalSeen:boolean}};
export const typeAvailable=(c:FleetOwner,type:FleetType)=>type==='impactMiner'||type==='scout'||type==='escort'&&c.progress.rivalSeen||type==='hauler'&&c.unlockedTypes.includes('hauler')||type==='miningRig'&&c.unlockedTypes.includes('miningRig');
export function fleetError(c:FleetOwner):string|undefined{
 const f=c.fleetComposition;
 if(!Number.isInteger(c.fleetCapacity)||c.fleetCapacity<1||c.fleetCapacity>MAX_FLEET_CAPACITY)return 'Invalid fleet capacity.';
 if((Object.keys(f) as FleetType[]).some(k=>!['impactMiner','laserMiner','escort','hauler','scout','miningRig'].includes(k)))return 'Unknown drone type.';
 for(const type of ['impactMiner','laserMiner','escort','hauler','scout','miningRig'] as const){
  if(!Number.isInteger(f[type])||f[type]<0)return 'Invalid drone count.';
  if(f[type]&&!typeAvailable(c,type))return `${type==='escort'?'Fighter':type==='hauler'?'Hauler':type==='miningRig'?'Mining Rig':type} is locked.`;
 }
 if(f.laserMiner)return 'Legacy Laser Miner count must be combined with Miners.';
 if(!f.impactMiner&&!f.miningRig)return 'At least one Miner or Mining Rig is required to deploy.';
 if(usedSlots(f)>c.fleetCapacity)return 'Fleet exceeds purchased drone slots.';
}
export function changeFleet<T extends FleetOwner>(c:T,type:FleetType,delta:-1|1):T|null{
 if((delta!==1&&delta!==-1)||!['impactMiner','escort','hauler','scout','miningRig'].includes(type)||!typeAvailable(c,type))return null;
 const next={...c,fleetComposition:{...c.fleetComposition,[type]:c.fleetComposition[type]+delta}};
 return fleetError(next)?null:next;
}
