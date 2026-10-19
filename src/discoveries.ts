import type {Company} from './sim.ts';
import type {DiscoveryId} from './research.ts';

export type BlueprintId='hauler'|'escort'|'miningRig';
export const BLUEPRINTS:readonly {id:BlueprintId;event:DiscoveryId;name:string;source:string;description:string}[]=[
 {id:'hauler',event:'abandoned_cargo_relay',name:'Hauler',source:'CARGO RELAY · SCAVENGED',description:'Collects loose ore and transports cargo from working Miners and Mining Rigs.'},
 {id:'escort',event:'first_rival_contact',name:'Fighter',source:'FIRST CONTACT · CONFIRMED',description:'Protects your working fleet from hostile ships. Assign it before your next expedition.'},
 {id:'miningRig',event:'derelict_excavation_platform',name:'Mining Rig',source:'EXCAVATION PLATFORM · SCAVENGED',description:'Deploys a powerful stationary drill. Pair it with a Hauler to bring the production home.'},
];
export function pendingBlueprints(c:Company,events:readonly DiscoveryId[]=[]){
 return BLUEPRINTS.filter(b=>!(c.seenUnlocks??[]).includes(b.id)&&(c.unlockedTypes.includes(b.id)||events.includes(b.event)));
}
export function acknowledgeBlueprint(c:Company,id:BlueprintId):Company{
 if(!c.unlockedTypes.includes(id)||(c.seenUnlocks??[]).includes(id))return c;
 return {...c,seenUnlocks:[...(c.seenUnlocks??[]),id]};
}
export function renderBlueprintCard(b:typeof BLUEPRINTS[number]){
 return `<section role="dialog" aria-modal="true" aria-labelledby="blueprint-title" class="capacity-dialog blueprint-dialog"><div class="eyebrow">NEW DISCOVERY</div><p class="blueprint-source">${b.source}</p><canvas width="480" height="320" class="blueprint-preview" role="img" aria-label="${b.name} drone"></canvas><div class="eyebrow">NEW DRONE TYPE</div><h2 id="blueprint-title">${b.name} unlocked</h2><p>${b.description}</p><p class="blueprint-hint">1 fleet slot · Assign in Hangar${b.id==='escort'?'':' · No blueprint fee'}</p><p class="form-error" hidden>Could not save. Please try again.</p><button class="primary" id="acknowledge-blueprint">GOT IT</button></section>`;
}
