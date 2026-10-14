import type {Company, Directive} from './sim.ts';
import {LOGISTICS_SITES} from './logistics-sites.ts';

export type MissionObjective={id:Directive;title:string;description:string};

// Exploration is a one-time mission goal, not a second fleet-wide AI doctrine.
// The unlocked options follow the original survey progression.
export function missionObjectives(c:Company):MissionObjective[]{
 const options:MissionObjective[]=[{id:'auto',title:'Free Mining',description:'Mine and collect minerals wherever the fleet finds them.'}];
 if(!c.progress.farSurveyed)options.push({id:'chartFar',title:'Chart Far Belt',description:'Send a drone to the Far Belt, then resume mining.'});
 if(c.progress.farSurveyed&&!c.progress.richSampled)options.push({id:'surveyFar',title:'Recover Rich Sample',description:'Prioritize rich deposits in the Far Belt.'});
 if(c.progress.farSurveyed&&c.progress.rivalSeen&&!c.progress.outpostSurveyed)options.push({id:'surveyOutpost',title:'Survey Outpost Site',description:'Travel to Outer Reach and chart the future outpost.'});
 const signal=LOGISTICS_SITES.find(site=>!c.uniqueTechDiscoveries.includes(site.id));
 if(signal)options.push({id:'investigateFreight',title:'Investigate Freight Signal',description:`Recover ${signal.name} for one unique Tech Point, then resume mining.`});
 return options;
}

export function effectiveDirective(c:Company):Directive{
 return missionObjectives(c).some(o=>o.id===c.directive)?c.directive:'auto';
}

export function missionObjectiveName(c:Company):string{
 const id=effectiveDirective(c);
 return missionObjectives(c).find(o=>o.id===id)!.title;
}
