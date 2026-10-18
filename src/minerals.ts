import {biomeAt,safeHarbor,type BiomeId} from './biomes.ts';

export const MINERALS={
 ferrite:{name:'Ferrite',credits:1,tier:1,color:'#a8adb2',description:'Ordinary impact ore',density:12,tool:'impact'},
 nickel:{name:'Nickel',credits:3,tier:2,color:'#b4b29a',description:'Dense, plentiful metal',density:18,tool:'impact'},
 aurite:{name:'Aurite',credits:8,tier:3,color:'#e9b34a',description:'Hard crust; high-power laser',density:12,tool:'highPowerOptics'},
 cryonite:{name:'Cryonite',credits:20,tier:4,color:'#a2c9e3',description:'Brittle ice crystal; laser',density:9,tool:'laser'},
 voidite:{name:'Voidite',credits:60,tier:5,color:'#b39bd4',description:'Resistant crystal; resonance laser',density:6,tool:'resonanceMining'},
} as const;
export type MineralId=keyof typeof MINERALS;
export const mineralIds=Object.keys(MINERALS) as MineralId[];
export type CargoItem={mineral:MineralId;legacyRich?:boolean};
export const cargoValue=(items:readonly CargoItem[])=>items.reduce((n,item)=>n+MINERALS[item.mineral].credits,0);
const distribution:Record<BiomeId,readonly MineralId[]>={
 home_belt:['ferrite'],
 scrap_fields:['ferrite','ferrite','ferrite','ferrite','ferrite','nickel','nickel','nickel','nickel','nickel','nickel'],
 contested:['ferrite','ferrite','nickel','nickel','nickel','nickel','aurite','aurite','aurite','aurite','aurite'],
 ion_storm:['ferrite','ferrite','ferrite','nickel','nickel','nickel','cryonite','cryonite','cryonite','cryonite','cryonite'],
 dead_zone:['ferrite','ferrite','ferrite','nickel','nickel','nickel','nickel','voidite','voidite','voidite','voidite'],
};
// Geometry and IDs do not change across missions. The assignment is a stable
// hash, independent of simulation RNG and depletion. No valuable deposit is
// placed in a station's harbor merely because its biome extends there.
export function mineralForRock(id:number,x:number,y:number,seed:number):MineralId{
 const region=biomeAt(x,y,seed),choices=distribution[region];
 if(region==='home_belt'||safeHarbor({x,y},true,seed))return 'ferrite';
 let hash=(Math.imul(id+1,0x9e3779b1)^(seed>>>0))>>>0;
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d)>>>0;hash^=hash>>>15;
 return choices[(hash>>>0)%choices.length];
}
export function canExtract(kind:'impactMiner'|'laserMiner',mineral:MineralId,upgrades:readonly string[]):boolean{
 const tool=MINERALS[mineral].tool;
 return tool==='impact'||kind==='laserMiner'&&(tool==='laser'||tool==='highPowerOptics'&&upgrades.includes('highPowerOptics')||tool==='resonanceMining'&&upgrades.includes('resonanceMining'));
}
export function depositReserve(mineral:MineralId,radius:number):number{
 return Math.max(3,Math.round(MINERALS[mineral].density*radius/29));
}
