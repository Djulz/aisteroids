import {W,H,HOME,FAR} from './geometry.ts';

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
 advancedSensors:{name:'Advanced Sensors',cost:125,site:'abandoned_cargo_relay',detail:'Scout scan radius +20%'},
 navigationStabilizers:{name:'Navigation Stabilizers',cost:240,site:'experimental_probe_salvaged',detail:'Reduce Ion Storm interference'},
 radiationShielding:{name:'Radiation Shielding',cost:350,site:'derelict_freight_shuttle',detail:'Reduce Dead Zone exposure'},
} as const;
export const environmentIds=Object.keys(ENVIRONMENT_UPGRADES) as EnvironmentUpgrade[];
type Point={x:number;y:number};
const anchors:readonly {id:BiomeId;x:number;y:number;scale:number}[]=[
 {id:'home_belt',x:210,y:490,scale:1.08},
 {id:'scrap_fields',x:1060,y:610,scale:1},
 {id:'contested',x:1890,y:590,scale:1.02},
 {id:'ion_storm',x:1300,y:1750,scale:1.04},
 {id:'dead_zone',x:2470,y:1950,scale:1.03},
];
// Spatially stable warped Voronoi: no mission seed or save fields can move a border.
export function biomeAt(x:number,y:number):BiomeId{
 if(Math.hypot(x-HOME.x,y-HOME.y)<245)return 'home_belt';
 const dx=46*Math.sin(y/171+x/530),dy=39*Math.sin(x/193-y/610);
 let best=Infinity,id:BiomeId='home_belt';
 for(const a of anchors){const score=((x+dx-a.x)**2+(y+dy-a.y)**2)*a.scale;if(score<best){best=score;id=a.id;}}
 return id;
}
export function safeHarbor(p:Point,outpost:boolean){return Math.hypot(p.x-HOME.x,p.y-HOME.y)<155||outpost&&Math.hypot(p.x-FAR.x,p.y-FAR.y)<165;}
export function environmentAt(p:Point,outpost:boolean){return safeHarbor(p,outpost)?'home_belt':biomeAt(p.x,p.y);}
export function sensorFactor(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean){return environmentAt(p,outpost)==='ion_storm'?(upgrades.includes('navigationStabilizers')?.9:.6):1;}
export function movementFactor(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean){return environmentAt(p,outpost)==='ion_storm'?(upgrades.includes('navigationStabilizers')?.95:.82):1;}
export function radiationRate(p:Point,upgrades:readonly EnvironmentUpgrade[],outpost:boolean){return environmentAt(p,outpost)==='dead_zone'?(upgrades.includes('radiationShielding')?.06:.5):0;}
export const inWorld=(p:Point)=>p.x>=0&&p.x<W&&p.y>=0&&p.y<H;
