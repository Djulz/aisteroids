export type DroneRole='miner'|'escort';
export type FrameId='standard'|'light'|'heavy';
export type ModuleId='impactProw'|'kineticRegulator'|'extendedOptics'|'emergencyThrusters'|'reinforcedPlating'|'targetingComputer'|'longBarrel';
export type WorkshopEquipment={drones:number;guards:number;hull:boolean;drive:boolean;laser:boolean;cargoBay:boolean};
export type Loadout={role:DroneRole;frame:FrameId;modules:[ModuleId|null,ModuleId|null]};
export const FRAMES:Record<FrameId,{name:string;benefit:string;tradeoff:string;hull:number;mobility:number}>={
 standard:{name:'Standard',benefit:'Factory handling',tradeoff:'No specialization',hull:0,mobility:1},
 light:{name:'Light',benefit:'18% quicker acceleration and turning',tradeoff:'−1 hull',hull:-1,mobility:1.18},
 heavy:{name:'Heavy',benefit:'+2 hull',tradeoff:'15% slower acceleration and turning',hull:2,mobility:.85},
};
export const MODULES:Record<ModuleId,{name:string;role:DroneRole|'any';benefit:string;tradeoff:string;requiresLaser?:boolean}>={
 impactProw:{name:'Impact Prow',role:'miner',benefit:'+1 impact extraction (+2 rich)',tradeoff:'15% slower turning'},
 kineticRegulator:{name:'Kinetic Regulator',role:'miner',benefit:'Quicker recovery after impact',tradeoff:'12% lower cruise speed'},
 extendedOptics:{name:'Extended Optics',role:'miner',requiresLaser:true,benefit:'28% longer laser standoff',tradeoff:'23% slower laser pulses'},
 emergencyThrusters:{name:'Emergency Thrusters',role:'miner',benefit:'40% quicker threat disengagement',tradeoff:'3 fewer cargo slots'},
 reinforcedPlating:{name:'Reinforced Plating',role:'any',benefit:'+1 hull',tradeoff:'11% lower cruise speed'},
 targetingComputer:{name:'Targeting Computer',role:'escort',benefit:'Prioritizes threats to miners',tradeoff:'18% slower blaster cadence'},
 longBarrel:{name:'Long Barrel',role:'escort',benefit:'23% longer blaster range',tradeoff:'20% slower blaster cadence'},
};
export const moduleIds=Object.keys(MODULES) as ModuleId[];
export const frameIds=Object.keys(FRAMES) as FrameId[];
export function equipmentReason(c:WorkshopEquipment,role:DroneRole,frame:FrameId,modules:readonly (ModuleId|null)[]):string|undefined{
 if(role!=='miner'&&role!=='escort')return 'Unknown role.';
 if(role==='escort'&&!c.guards)return 'Purchase a Bodyguard Drone to unlock Escort.';
 if(!Object.hasOwn(FRAMES,frame))return 'Unknown frame.';
 if(c.drones<2&&(frame!=='standard'||modules.some(Boolean)))return 'Buy the first Extra Drone to unlock frame and module engineering.';
 if(modules.length!==2)return 'Each drone has two module slots.';
 if(modules[0]&&modules[0]===modules[1])return 'A module can only be installed once per drone.';
 for(const id of modules){if(!id)continue;
  if(!Object.hasOwn(MODULES,id))return 'Unknown module.';
  const module=MODULES[id];
  if(module.role!=='any'&&module.role!==role)return `${module.name} is only for ${module.role}s.`;
  if(module.requiresLaser&&!c.laser)return 'Extended Optics requires the Workshop Mining Laser.';
 }
}
export function resolveEquipment(c:WorkshopEquipment,loadout:Loadout){
 const frame=FRAMES[loadout.frame],has=(id:ModuleId)=>loadout.modules.includes(id);
 const mobility=frame.mobility;
 return {
  maxHp:Math.max(1,(loadout.role==='miner'?(c.hull?7:4):6)+frame.hull+(has('reinforcedPlating')?1:0)),
  speed:(loadout.role==='miner'&&c.drive?1.35:1)*(has('kineticRegulator')?.88:1)*(has('reinforcedPlating')?.89:1),
  accel:mobility,turn:mobility*(has('impactProw')?.85:1),
  cargo:loadout.role==='miner'?12+(c.cargoBay?6:0)-(has('emergencyThrusters')?3:0):0,
  ramDamage:has('impactProw')?5:4,
  ramRecoil:has('kineticRegulator')?.38:.55,
  ramCooldown:has('kineticRegulator')?.65:.8,
  laserStandoff:has('extendedOptics')?1.28:1,
  laserRange:has('extendedOptics')?110:85,
  laserCooldown:has('extendedOptics')?1.1*1.23:1.1,
  retreatAccel:has('emergencyThrusters')?1.4:1,
  guardRange:has('longBarrel')?135*1.23:135,
  guardCooldown:1.05*(has('targetingComputer')?1.18:1)*(has('longBarrel')?1.2:1),
  guardTargeting:has('targetingComputer'),
 };
}
export type EffectiveEquipment=ReturnType<typeof resolveEquipment>;
