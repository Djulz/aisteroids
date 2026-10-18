import {W,H,HOME,FAR} from './geometry.ts';
import {regionAt,generateUniverse} from './universe.ts';

export const BIOMES={
 home_belt:{name:'Home Belt',tier:1,risk:'LOW RISK',color:[10,26,37]},
 scrap_fields:{name:'Scrap Fields',tier:2,risk:'MODERATE',color:[25,31,31]},
 contested:{name:'Contested Territory',tier:3,risk:'HOSTILE ACTIVITY',color:[30,22,35]},
 ion_storm:{name:'Ion Storm',tier:4,risk:'SIGNAL INTERFERENCE',color:[19,24,44]},
 dead_zone:{name:'Dead Zone',tier:5,risk:'RADIATION',color:[22,30,26]},
} as const;
export type BiomeId=keyof typeof BIOMES;
export type EnvironmentUpgrade='advancedSensors'|'navigationStabilizers'|'radiationShielding';
export const ENVIRONMENT_UPGRADES={
 advancedSensors:{name:'Wide-Area Scanner',cost:125,site:'abandoned_cargo_relay',detail:'Double Scout scan radius: 165 → 330'},
 navigationStabilizers:{name:'Navigation Stabilizers',cost:240,site:'experimental_probe_salvaged',detail:'Reduce Ion Storm interference'},
 radiationShielding:{name:'Radiation Shielding',cost:350,site:'derelict_freight_shuttle',detail:'Reduce Dead Zone exposure'},
} as const;
export const environmentIds=Object.keys(ENVIRONMENT_UPGRADES) as EnvironmentUpgrade[];
export const scoutScanRadius=(upgrades:readonly EnvironmentUpgrade[])=>upgrades.includes('advancedSensors')?330:165;
type Point={x:number;y:number};
export const biomeAt=(x:number,y:number,seed=7):BiomeId=>regionAt(seed,x,y);
export function safeHarbor(p:Point,outpost:boolean,seed=7){return Math.hypot(p.x-HOME.x,p.y-HOME.y)<155||outpost&&Math.hypot(p.x-generateUniverse(seed).outpost.x,p.y-generateUniverse(seed).outpost.y)<165;}
export function environmentAt(p:Point,outpost:boolean,seed=7){return safeHarbor(p,outpost,seed)?'home_belt':biomeAt(p.x,p.y,seed);}
export function sensorFactor(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean,seed=7){return environmentAt(p,outpost,seed)==='ion_storm'?(upgrades.includes('navigationStabilizers')?.9:.6):1;}
export function movementFactor(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean,seed=7){return environmentAt(p,outpost,seed)==='ion_storm'?(upgrades.includes('navigationStabilizers')?.95:.82):1;}
export function radiationRate(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean,seed=7){return environmentAt(p,outpost,seed)==='dead_zone'?(upgrades.includes('radiationShielding')?.06:.5):0;}
export const inWorld=(p:Point)=>p.x>=0&&p.x<W&&p.y>=0&&p.y<H;
