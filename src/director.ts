import {sensedAt,type Company,type World} from './sim.ts';

export const DIRECTOR_LINES={
 welcome:{priority:20,text:'Welcome to Rock Bottom Robotics. We have one Miner and a generous interpretation of a business plan. Deploy when ready.'},
 cargo_full:{priority:30,text:'Cargo hold full. It has elected to remain full. Cargo Awareness will improve this arrangement.'},
 cargo_awareness:{priority:40,text:'Returning cargo is now part of the business model.'},
 navigation_assist:{priority:35,text:'We have distinguished mining from most other collisions.'},
 work_planner:{priority:45,text:'A working Miner. Research is now available. Please note that our technical decisions are permanent.'},
 fleet_expanded:{priority:35,text:'Additional fleet capacity approved. Assign a Scout or another Miner in the Hangar.'},
 first_contact:{priority:100,text:'Contact confirmed. Apparently, we’re not the only company with a questionable business model. Fighter blueprint available.'},
 hauler_unlocked:{priority:85,text:'Hauler blueprint recovered. We can now move cargo without asking the mining department to do everything.'},
 rig_unlocked:{priority:85,text:'Mining Rig blueprint recovered. Industrial output. Industrial dependence on a Hauler.'},
 nickel_delivered:{priority:75,text:'Nickel delivered. The frontier is officially a source of revenue. Further expansion and research are available.'},
 aurite_delivered:{priority:80,text:'Aurite delivered. Our working area has become considerably more valuable. Remarkable.'},
 outpost_built:{priority:70,text:'Outer Outpost built. The next launch starts from its harbor. Bring Aurite back there to make the investment work.'},
 outpost_operational:{priority:82,text:'Aurite received at the Outpost. The frontier now has a working supply line. Apparently, distance was an expense.'},
 storm_entered:{priority:50,text:'Ion Storm entered. Interference affects movement and sensors. Navigation Stabilizers improve both.'},
 cryonite_delivered:{priority:80,text:'Cryonite delivered. Dead Zone preparation is now our next investment.'},
 dead_zone_entered:{priority:65,text:'Dead Zone entered. Radiation affects the entire fleet. Shielding reduces exposure; it does not remove it.'},
 native_contact:{priority:75,text:'Movement in the radiation field. Native lifeforms, apparently. They warn before striking; a Fighter can clear a route.'},
 voidite_delivered:{priority:90,text:'Voidite delivered. We have reached the current frontier milestone. Silent Core operations are not yet available.'},
 failed_shift:{priority:60,text:'No cargo delivered and ships lost. Check your next objective and prepare a safer route before redeploying.'},
} as const;
export type DialogueId=keyof typeof DIRECTOR_LINES;
export const dialogueIds=Object.keys(DIRECTOR_LINES) as DialogueId[];
export function validDialogueId(value:unknown):value is DialogueId{
 return typeof value==='string'&&Object.hasOwn(DIRECTOR_LINES,value);
}
export function normalizeDialogueHistory(value:unknown):DialogueId[]{
 return Array.isArray(value)?[...new Set(value.filter(validDialogueId))]:[];
}
/** Small, deterministic, presentation-only queue. Taking a line records display. */
export class DirectorQueue{
 private seen:Set<DialogueId>;
 private pending:DialogueId[]=[];
 constructor(history:unknown=[]){this.seen=new Set(normalizeDialogueHistory(history));}
 enqueue(ids:readonly DialogueId[]){
  for(const id of ids)if(!this.seen.has(id)&&!this.pending.includes(id))this.pending.push(id);
  this.pending.sort((a,b)=>DIRECTOR_LINES[b].priority-DIRECTOR_LINES[a].priority);
  this.pending=this.pending.slice(0,8);
 }
 take(exclude:readonly DialogueId[]=[]):DialogueId|undefined{
  const index=this.pending.findIndex(id=>!exclude.includes(id));
  const id=index<0?undefined:this.pending.splice(index,1)[0];
  if(id)this.remember(id);
  return id;
 }
 remember(id:DialogueId){this.seen.add(id);this.pending=this.pending.filter(value=>value!==id);}
 history(){return [...this.seen];}
}
export const blueprintDialogue={hauler:'hauler_unlocked',escort:'first_contact',miningRig:'rig_unlocked'} as const;
/** Existing companies inherit past milestones without replaying the introduction. */
export function completedDialogue(c:Company):DialogueId[]{
 const ids:DialogueId[]=[];
 const has=(id:string)=>c.uniqueTechDiscoveries.some(value=>value===id);
 if(c.rounds>0)ids.push('welcome','cargo_full');
 if(c.basicUpgrades.includes('cargoAwareness'))ids.push('cargo_awareness');
 if(c.basicUpgrades.includes('navigationAssist'))ids.push('navigation_assist');
 if(c.basicUpgrades.includes('workPlanner'))ids.push('work_planner');
 if(c.fleetCapacity>1)ids.push('fleet_expanded');
 if(c.progress.rivalSeen)ids.push('first_contact');
 if(c.unlockedTypes.includes('hauler'))ids.push('hauler_unlocked');
 if(c.unlockedTypes.includes('miningRig'))ids.push('rig_unlocked');
 if(has('first_nickel_delivery'))ids.push('nickel_delivered');
 if(has('first_aurite_delivery'))ids.push('aurite_delivered');
 if(c.outpost)ids.push('outpost_built');
 if(c.progress.outpostOperated)ids.push('outpost_operational');
 if(has('first_cryonite_delivery'))ids.push('storm_entered','cryonite_delivered');
 if(has('first_voidite_delivery'))ids.push('dead_zone_entered','native_contact','voidite_delivered');
 return ids;
}
export function preparationDialogue(before:Company,after:Company):DialogueId[]{
 return completedDialogue(after).filter(id=>!completedDialogue(before).includes(id));
}
/** Uses actual simulation events and station deliveries, never deployment count. */
export function missionDialogue(w:World):DialogueId[]{
 const ids:DialogueId[]=[];
 if(!w.company.basicUpgrades.includes('cargoAwareness')&&w.drones.some(d=>d.state!=='dead'&&d.cargo>=d.gear.cargo))ids.push('cargo_full');
 for(const b of ['hauler','escort','miningRig'] as const){
  const event=b==='hauler'?'abandoned_cargo_relay':b==='escort'?'first_rival_contact':'derelict_excavation_platform';
  if(w.pendingTech.some(item=>item.id===event))ids.push(blueprintDialogue[b]);
 }
 if(w.deliveredByMineral.nickel>0)ids.push('nickel_delivered');
 if(w.deliveredByMineral.aurite>0)ids.push('aurite_delivered');
 if(w.deliveredByMineral.aurite>0&&w.company.outpost&&w.company.launchSite==='far'&&!w.company.progress.outpostOperated)ids.push('outpost_operational');
 if(w.deliveredByMineral.cryonite>0)ids.push('cryonite_delivered');
 if(w.deliveredByMineral.voidite>0)ids.push('voidite_delivered');
 if(w.newRegions.includes('ion_storm'))ids.push('storm_entered');
 if(w.newRegions.includes('dead_zone'))ids.push('dead_zone_entered');
 if(w.enemies.some(e=>e.hp>0&&(e.kind==='lurker'||e.kind==='spore')&&sensedAt(w,e)))ids.push('native_contact');
 if(w.phase==='done'&&w.delivered===0&&(
  [...w.drones,...w.haulers,...w.rigs,...w.scouts].some(unit=>unit.state==='dead')||w.guards.some(unit=>unit.hp<=0)))ids.push('failed_shift');
 return ids;
}
export function directorMessage(id:DialogueId){
 return '<aside class="director-briefing" data-dialogue="'+id+'" aria-label="Company AI"><span>COMPANY AI</span><p>'+DIRECTOR_LINES[id].text+'</p></aside>';
}
