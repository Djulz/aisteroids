import {FRAMES,MODULES,equipmentReason,type WorkshopEquipment,type DroneRole,type FrameId,type ModuleId,type Loadout} from './engineering.ts';
export type {DroneRole,FrameId,ModuleId} from './engineering.ts';
export type FleetDrone={id:string;name:string}&Loadout;

const minerNames=['BOLT','SPARK','CLANK','RIVET','GEAR','NOVA'];
const defaultDrone=(role:DroneRole,index:number):FleetDrone=>({
 id:`${role}-${index+1}`,role,frame:'standard',modules:[null,null],
 name:`${role==='miner'?minerNames[index]??'MINER':'GUARD'}-${String(index+1).padStart(2,'0')}`,
});

// Purchased entitlements define IDs and roster size. A role change never changes an ID.
export function fleetForCounts(miners:number,guards:number,saved:unknown=[],laser=false):FleetDrone[]{
 const records=Array.isArray(saved)?saved:[];
 const expected=[...Array.from({length:miners},(_,i)=>defaultDrone('miner',i)),...Array.from({length:guards},(_,i)=>defaultDrone('escort',i))];
 const used=new Set<string>();let escorts=0;
 const c={drones:miners,guards,laser,hull:false,drive:false,cargoBay:false};
 return expected.map(base=>{
  const found=records.find((r:unknown)=>r&&typeof r==='object'&&(r as FleetDrone).id===base.id) as Partial<FleetDrone>|undefined;
  const candidate=typeof found?.name==='string'?found.name.trim():'';
  const preferred=candidate&&candidate.length<=24&&!/[\u0000-\u001f\u007f]/.test(candidate)&&!used.has(candidate.toLocaleLowerCase())?candidate:base.name;
  const name=used.has(preferred.toLocaleLowerCase())?`${base.name} ${base.id}`:preferred;
  used.add(name.toLocaleLowerCase());
  let role:DroneRole=found?.role==='miner'||found?.role==='escort'?found.role:base.role;
  if(role==='escort'&&escorts>=guards)role='miner';
  if(role==='escort')escorts++;
  let frame:FrameId=found?.frame&&Object.hasOwn(FRAMES,found.frame)?found.frame:'standard';
  const raw=Array.isArray(found?.modules)?found.modules:[];
  const modules:[ModuleId|null,ModuleId|null]=[0,1].map(i=>raw[i]&&Object.hasOwn(MODULES,raw[i])?raw[i] as ModuleId:null) as [ModuleId|null,ModuleId|null];
  if(miners<2)frame='standard';
  for(let i=0;i<2;i++)if(equipmentReason(c,role,frame,[i===0?modules[i]:null,i===1?modules[i]:null]))modules[i]=null;
  if(modules[0]===modules[1])modules[1]=null;
  return {...base,name,role,frame,modules};
 });
}

export function fleetError(c:WorkshopEquipment,fleet:FleetDrone[]):string|undefined{
 if(fleet.length!==c.drones+c.guards)return 'Roster does not match purchased drone capacity.';
 if(new Set(fleet.map(d=>d.id)).size!==fleet.length)return 'Duplicate drone identity.';
 const expected=new Set([...Array.from({length:c.drones},(_,i)=>`miner-${i+1}`),...Array.from({length:c.guards},(_,i)=>`escort-${i+1}`)]);
 if(fleet.some(d=>!expected.has(d.id)))return 'A drone identity does not belong to the purchased roster.';
 const escorts=fleet.filter(d=>d.role==='escort').length;
 if(escorts>c.guards)return `Only ${c.guards} purchased Escort slot${c.guards===1?' is':'s are'} available.`;
 if(escorts===fleet.length)return 'At least one Miner is required to deploy.';
 for(const d of fleet){const reason=equipmentReason(c,d.role,d.frame,d.modules);if(reason)return `${d.name}: ${reason}`;}
}
export function configureDrone(c:WorkshopEquipment,fleet:FleetDrone[],id:string,name:string,loadout:Loadout):{fleet?:FleetDrone[];error?:string}{
 const named=renameDrone(fleet,id,name);if(!named)return {error:'Enter a unique name, up to 24 characters.'};
 const changed=named.map(d=>d.id===id?{...d,...loadout,modules:[...loadout.modules] as [ModuleId|null,ModuleId|null]}:d);
 const error=fleetError(c,changed);return error?{error}:{fleet:changed};
}

export function renameDrone(fleet:FleetDrone[],id:string,name:string):FleetDrone[]|null{
 const clean=name.trim();
 if(clean.length<1||clean.length>24||/[\u0000-\u001f\u007f]/.test(clean)||!fleet.some(d=>d.id===id)||fleet.some(d=>d.id!==id&&d.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))return null;
 return fleet.map(d=>d.id===id?{...d,name:clean}:d);
}
