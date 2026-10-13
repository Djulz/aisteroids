export const DOCTRINES={
 standard:{name:'Standard Protocol',flavor:'Standard corporate operating procedures. Efficiency not guaranteed.',benefit:'Current balanced targeting and escort behavior.',tradeoff:'No special focus.'},
 fullContact:{name:'Full Contact Mining',flavor:'Safety margins are just unused productivity.',benefit:'Nearby targets and committed impact runs.',tradeoff:'More hull loss and hostile exposure.'},
 careful:{name:'Careful Prospectors',flavor:"Replacement drones are not in this quarter's budget.",benefit:'Safer targets, early disengagement and ranged mining.',tradeoff:'Longer routes and less aggressive extraction.'},
 convoy:{name:'Convoy Protocol',flavor:'Nobody mines alone. Nobody gets a lunch break.',benefit:'Shared mining areas and focused escort interception.',tradeoff:'Less map coverage.'},
} as const;
export type DoctrineId=keyof typeof DOCTRINES;
export const doctrineIds=Object.keys(DOCTRINES) as DoctrineId[];
export const validDoctrine=(value:unknown):DoctrineId=>typeof value==='string'&&Object.hasOwn(DOCTRINES,value)?value as DoctrineId:'standard';

// Behavioral priorities only. Fleet type determines the extraction method.
export const DOCTRINE_AI={
 standard:{near:1,threat:0,group:0,commit:0,retreat:0,standoff:55},
 fullContact:{near:1.45,threat:0.15,group:0,commit:1.8,retreat:0,standoff:55},
 careful:{near:0.85,threat:2.4,group:0,commit:1.1,retreat:180,standoff:69},
 convoy:{near:1,threat:0.45,group:1.1,commit:1.4,retreat:0,standoff:55},
} as const;
