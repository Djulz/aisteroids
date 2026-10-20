import type {Company,Offer} from './sim.ts';

export type Objective={id:string;title:string;detail:string};
/** Read-only guidance. Never changes offers, rewards, research or access rules. */
export function currentObjective(c:Company):Objective{
 const has=(id:string)=>c.uniqueTechDiscoveries.some(value=>value===id);
 const goal=(id:string,title:string,detail:string):Objective=>({id,title,detail});
 const purchase=(id:Offer,title:string,price:number,effect:string):Objective=>{
  const remaining=Math.max(0,price-c.credits);
  const available=c.shopOffers.includes(id)&&!c.shopPurchases.includes(id);
  const action=available?(remaining?'Deliver '+remaining+' more Credits, then buy it in Workshop.':'Buy it in Workshop for '+price+' Credits.'):
   c.shopPurchases.length?'Complete a shift to refresh Workshop offers.':'Advance the current Workshop offers; this system appears after a shift.';
  return goal(id,title,effect+' '+action);
 };
 if(c.total===0&&!c.basicUpgrades.includes('cargoAwareness'))
  return goal('first_cargo','Bring home your first cargo','Deploy your Miner. It mines and collects automatically; recall brings the cargo home.');
 if(!c.basicUpgrades.includes('cargoAwareness'))return purchase('cargoAwareness','Install Cargo Awareness',3,'Full cargo can return, unload and get back to work.');
 if(!c.basicUpgrades.includes('navigationAssist'))return purchase('navigationAssist','Install Navigation Assist',6,'Better turns and approaches make the Miner less enthusiastic about accidental collisions.');
 if(!c.basicUpgrades.includes('workPlanner'))return purchase('workPlanner','Install Work Planner',12,'Keep the Miner working a useful local patch. Research opens after this upgrade.');
 // A late company must not be sent back for optional early discoveries.
 if(has('first_voidite_delivery'))return goal('frontier_complete','Frontier milestone reached','Voidite delivered. Improve your fleet or try another build with New Game. The Silent Core encounter is not available in this build.');
 if(has('first_cryonite_delivery')){
  if(!has('automated_sorting_archive'))return goal('archive','Investigate the Sorting Archive','Use a Scout, or lock the discovered Archive for a Fighter, to investigate it physically in Ion Storm.');
  if(!c.environmentUpgrades.includes('radiationShielding'))return purchase('radiationShielding','Install Radiation Shielding',1600,'Prepare the fleet for Dead Zone exposure.');
  if(!c.extractionUpgrades.includes('highPowerOptics'))return purchase('highPowerOptics','Install Extraction Class II',240,'This shared extraction class is required before Resonance Extraction.');
  if(!c.extractionUpgrades.includes('resonanceMining'))return purchase('resonanceMining','Install Resonance Extraction',2400,'Unlock Voidite extraction for both Miner paths and the Mining Rig.');
  return goal('voidite','Deliver Voidite','Explore the Dead Zone with shielding, then focus mining on identified Voidite. Only cargo returned to a station counts.');
 }
 if(has('first_aurite_delivery')){
  if(!c.outpost){
   if(!c.deflectorShields)return purchase('deflectorShields','Install Deflector Shields',180,'Reduce hostile weapon damage before establishing the frontier base.');
   if(!c.progress.protectedAuriteDelivery)return goal('protected_aurite','Deliver Aurite with Deflector Shields','Deploy with Deflectors installed and return a real Aurite cargo. This prepares the Outer Outpost purchase.');
   if(!c.progress.outpostSurveyed)return goal('outpost_survey','Survey the Outer Outpost site','Explore beyond the Aurite frontier with a Scout. Reach the Outpost site physically to survey it.');
   return purchase('outpost','Build the Outer Outpost',600,'A frontier launch base shortens later journeys.');
  }
  if(!has('experimental_probe_salvaged'))return goal('probe','Investigate the Experimental Probe','Find and physically investigate the Probe for the Navigation Stabilizers blueprint.');
  if(!c.environmentUpgrades.includes('navigationStabilizers'))return purchase('navigationStabilizers','Install Navigation Stabilizers',600,'Reduce Ion Storm interference during the Cryonite expedition.');
  if(c.enduranceLevel<3)return purchase('endurance','Extend the storm expedition',c.enduranceLevel===0?32:c.enduranceLevel===1?120:400,'Longer shifts leave more working time after travel.');
  if(c.launchSite!=='far')return goal('frontier_launch','Launch from the Outer Outpost','Change the launch site beside Deploy to OUTPOST for the next expedition.');
  return goal('cryonite','Deliver Cryonite','Scout into Ion Storm, identify a Cryonite deposit and focus mining there. Bring the cargo back to your launch station.');
 }
 if(has('first_nickel_delivery')){
  if(!has('abandoned_research_station'))return goal('research_station','Investigate the Research Station','Physically investigate the Derelict Research Station in Scrap Fields for protection and extraction blueprints.');
  if(!c.deflectorShields)return purchase('deflectorShields','Install Deflector Shields',180,'Protect the working fleet against hostile weapons.');
  if(!c.extractionUpgrades.includes('highPowerOptics'))return purchase('highPowerOptics','Install Extraction Class II',240,'Let either Miner path and the Rig extract Aurite and Cryonite.');
  return goal('aurite','Deliver Aurite','Scout into Contested Territory, then focus a protected mining group on identified Aurite. Return the cargo to HQ.');
 }
 if(c.fleetCapacity<2)return purchase('fleetSlot','Expand to two fleet slots',24,'A second slot lets you try a Scout or another Miner. Assign roles in Hangar.');
 if(!c.progress.rivalSeen)return goal('first_contact','Make contact in Scrap Fields','A Scout can explore toward Scrap Fields. Actual friendly sensor contact unlocks the Fighter for the next expedition.');
 if(!c.fleetComposition.escort)return goal('assign_fighter','Prepare a protected Nickel expedition','Assign a Fighter in Hangar to protect your Miner. If needed, buy another slot or extend the shift in Workshop.');
 return goal('nickel','Deliver Nickel','Identify Nickel in Scrap Fields and tap the deposit to set MINING focus. Keep a Fighter near the working group; cargo must reach the station.');
}
