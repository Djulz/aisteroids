export type DroneRole='miner'|'escort';
export type FleetDrone={id:string;name:string;role:DroneRole};

const minerNames=['BOLT','SPARK','CLANK','RIVET','GEAR','NOVA'];
const defaultDrone=(role:DroneRole,index:number):FleetDrone=>({
 id:`${role}-${index+1}`,role,
 name:`${role==='miner'?minerNames[index]??'MINER':'GUARD'}-${String(index+1).padStart(2,'0')}`,
});

// Existing owned counts are authoritative. IDs are stable ordinals because drones are
// never sold or permanently lost. A later equipment config can attach to this record.
export function fleetForCounts(miners:number,guards:number,saved:unknown=[]):FleetDrone[]{
 const records=Array.isArray(saved)?saved:[];
 const expected=[...Array.from({length:miners},(_,i)=>defaultDrone('miner',i)),...Array.from({length:guards},(_,i)=>defaultDrone('escort',i))];
 const used=new Set<string>();
 return expected.map(base=>{
  const found=records.find((r:unknown)=>r&&typeof r==='object'&&(r as FleetDrone).id===base.id&&(r as FleetDrone).role===base.role) as FleetDrone|undefined;
  const candidate=typeof found?.name==='string'?found.name.trim():'';
  const preferred=candidate&&candidate.length<=24&&!used.has(candidate.toLocaleLowerCase())?candidate:base.name;
  const name=used.has(preferred.toLocaleLowerCase())?`${base.name} ${base.id}`:preferred;
  used.add(name.toLocaleLowerCase());
  return {...base,name};
 });
}

export function renameDrone(fleet:FleetDrone[],id:string,name:string):FleetDrone[]|null{
 const clean=name.trim();
 if(clean.length<1||clean.length>24||/[\u0000-\u001f\u007f]/.test(clean)||!fleet.some(d=>d.id===id)||fleet.some(d=>d.id!==id&&d.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))return null;
 return fleet.map(d=>d.id===id?{...d,name:clean}:d);
}
