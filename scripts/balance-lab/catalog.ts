import {createHash} from 'node:crypto';
import {TALENTS,talentOptions,categories,type TalentId} from '../../src/research.ts';
import type {Company} from '../../src/sim.ts';
import {freshComposition,usedSlots,type FleetComposition} from '../../src/fleet.ts';
import type {Build,Job,Terrain} from './types.ts';

export const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const fleetName=(f:FleetComposition)=>[[f.impactMiner,'M'],[f.hauler,'H'],[f.escort,'F'],[f.miningRig,'R'],[f.scout,'S']].filter(([n])=>n).map(([n,label])=>n+String(label)).join(' ');
const build=(id:string,label:string,talents:TalentId[]):Build=>({id,label,talents,cost:talents.reduce((n,id)=>n+TALENTS[id].level,0)});
export const builds:Build[]=[
 build('basic','Basic / 0 Tech',[]),
 build('ram-recovery','Ram + Rapid Recovery',['ramSplitter','rapidRecovery']),
 build('laser-range','Laser + Long Range',['laserCutter','longRangeOptics']),
 build('bulk-cart','Bulk + Cart',['bulkCarrier','geminiCart']),
 build('express-cart','Express + Cart',['expressDelivery','geminiCart']),
 build('express-jump','Express + Jump',['expressDelivery','precisionJump']),
 build('rig-gantry','Wide Drill + Gantry',['wideAreaDrilling','loadingGantry']),
 build('ram-guardian','Ram + Guardian + Thrusters',['ramSplitter','guardianFrame','efficientThrusters']),
];
function allPaths(){
 const paths:Build[]=[];
 for(const category of categories){
  const visit=(talents:TalentId[])=>{
   if(talents.length===3){paths.push(build(category+'-'+talents.join('-'),talents.map(id=>TALENTS[id].name).join(' / '),talents));return;}
   for(const id of talentOptions({talents} as Company,category))visit([...talents,id]);
  };visit([]);
 }
 return paths;
}
export const completePaths=allPaths();
const categoryPresent=(f:FleetComposition,category:string)=>category==='general'||category==='miner'&&f.impactMiner>0||category==='hauler'&&f.hauler>0||category==='fighter'&&f.escort>0||category==='rig'&&f.miningRig>0||category==='scout'&&f.scout>0;
export const relevant=(f:FleetComposition,b:Build)=>b.talents.every(id=>categoryPresent(f,TALENTS[id].category));
export function enumerateFleets(slots:number):FleetComposition[]{
 const out:FleetComposition[]=[];
 for(let m=0;m<=slots;m++)for(let h=0;h<=slots-m;h++)for(let f=0;f<=slots-m-h;f++)for(let r=0;r<=slots-m-h-f;r++){
  const s=slots-m-h-f-r;if(!m&&!r)continue;
  out.push({impactMiner:m,laserMiner:0,hauler:h,escort:f,miningRig:r,scout:s});
 }return out;
}
export type Options={profile:string;seeds:number[];terrains?:Terrain[];duration?:number;shifts?:number;maxJobs:number;shard:[number,number];combat?:'patrols'|'quiet';campaign:boolean;campaignOnly?:boolean;summaryOnly?:boolean;buildIds?:string[];fleetFamily?:'miner'|'rig'};
export function plan(options:Options){
 const smoke=options.profile==='smoke',full=options.profile==='exhaustive',standard=options.profile==='standard';
 const terrains=options.terrains??(smoke?['nickel']:full||standard?['home_dense','home_sparse','nickel','aurite','storm','void']:['home_dense','nickel']) as Terrain[];
 const standardFleets=[
  {...freshComposition(),impactMiner:3},
  {...freshComposition(),impactMiner:2,escort:1},
  {...freshComposition(),hauler:1,escort:1},
  {...freshComposition(),impactMiner:0,miningRig:1,hauler:1,escort:1},
 ];
 const fleets=full?[2,3,4,5,6].flatMap(enumerateFleets):standard?[...standardFleets,...[4,5,6].flatMap(n=>[
  {...freshComposition(),impactMiner:n-1,escort:1},
  {...freshComposition(),impactMiner:n-2,hauler:1,escort:1},
  {...freshComposition(),impactMiner:0,miningRig:1,hauler:n-2,escort:1},
 ])]:smoke?[standardFleets[2],standardFleets[3]]:standardFleets;
 const candidates=full||standard?[...builds,...completePaths]:smoke?builds.filter(b=>['basic','bulk-cart','express-jump'].includes(b.id)):builds;
 const phases=full?[0,1,2]:[0],durations=options.duration?[options.duration]:full?[30,60,90]:[smoke?30:45];
 const combats=options.combat?[options.combat]:full?['patrols','quiet'] as const:['patrols'] as const;
 const jobs:Job[]=[];let total=0,selected=0;
 const add=(input:Omit<Job,'id'|'caseKey'>)=>{
  total++;
  if(options.summaryOnly&&jobs.length>=12){selected++;return;}
  const {seed,phase,...pair}=input,caseKey=hash(pair).slice(0,20),id=hash({...input,caseKey}).slice(0,24);
  if(parseInt(id.slice(0,8),16)%options.shard[1]!==options.shard[0])return;
  selected++;if(jobs.length<options.maxJobs)jobs.push({...input,caseKey,id});
 };
 if(!options.campaignOnly)for(const terrain of terrains)for(const fleet of fleets)for(const b of candidates){
  if(options.buildIds&&!options.buildIds.includes(b.id)||options.fleetFamily==='rig'&&!fleet.miningRig||options.fleetFamily==='miner'&&!fleet.impactMiner)continue;
  if(!relevant(fleet,b))continue;
  for(const duration of durations)for(const combat of combats)for(const seed of options.seeds)for(const phase of phases)
   add({kind:'fixture',seed,phase,terrain,duration,shifts:options.shifts??(smoke?1:3),fleet,build:b,combat});
 }
 if(options.campaign)for(const policy of ['ram','laser','bulk-cart','express-jump','rig'])for(const seed of options.seeds)
  add({kind:'campaign',seed,phase:0,terrain:'nickel',duration:0,shifts:options.shifts??32,fleet:freshComposition(),build:build(policy,policy,[]),combat:'patrols',policy});
 return {jobs,total,selected,truncated:selected>jobs.length,paths:completePaths.length,fleets:fleets.length};
}
