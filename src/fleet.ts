// Capacity and composition are the only fleet ownership state. The Laser unlock
// remains a typed seam for Pass B; normal saves cannot acquire it in Pass A.
// Hauler is reserved for 10 cargo (later 14 through Research); it has no AI or
// selectable slot here. Mining Rig has no assigned slot cost or implementation.
export type FleetType='impactMiner'|'laserMiner'|'escort'|'hauler'|'miningRig';
export type FleetComposition=Record<FleetType,number>;
export const MAX_FLEET_CAPACITY=6;
export const freshComposition=():FleetComposition=>({impactMiner:1,laserMiner:0,escort:0,hauler:0,miningRig:0});
export const usedSlots=(fleet:FleetComposition)=>fleet.impactMiner+fleet.laserMiner+fleet.escort;
export type FleetOwner={fleetCapacity:number;fleetComposition:FleetComposition;unlockedTypes:FleetType[];progress:{rivalSeen:boolean}};
export const typeAvailable=(c:FleetOwner,type:FleetType)=>type==='impactMiner'||type==='escort'&&c.progress.rivalSeen||type==='laserMiner'&&c.unlockedTypes.includes('laserMiner');
export function fleetError(c:FleetOwner):string|undefined{
 const f=c.fleetComposition;
 if(!Number.isInteger(c.fleetCapacity)||c.fleetCapacity<1||c.fleetCapacity>MAX_FLEET_CAPACITY)return 'Invalid fleet capacity.';
 if((Object.keys(f) as FleetType[]).some(k=>!['impactMiner','laserMiner','escort','hauler','miningRig'].includes(k)))return 'Unknown drone type.';
 for(const type of ['impactMiner','laserMiner','escort','hauler','miningRig'] as const){
  if(!Number.isInteger(f[type])||f[type]<0)return 'Invalid drone count.';
  if(f[type]&&!typeAvailable(c,type))return `${type==='laserMiner'?'Laser Miner':type==='escort'?'Escort':type} is locked.`;
 }
 if(!f.impactMiner&&!f.laserMiner)return 'At least one Miner is required to deploy.';
 if(usedSlots(f)>c.fleetCapacity)return 'Fleet exceeds purchased drone slots.';
}
export function changeFleet<T extends FleetOwner>(c:T,type:FleetType,delta:-1|1):T|null{
 if((delta!==1&&delta!==-1)||!['impactMiner','laserMiner','escort'].includes(type)||!typeAvailable(c,type))return null;
 const next={...c,fleetComposition:{...c.fleetComposition,[type]:c.fleetComposition[type]+delta}};
 return fleetError(next)?null:next;
}
