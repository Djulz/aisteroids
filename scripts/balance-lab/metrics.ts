import type {World} from '../../src/sim.ts';
import type {Shift} from './types.ts';
export function inventory(w:World){
 return w.rocks.reduce((n,r)=>n+r.hp,0)+w.ores.length+[...w.drones,...w.haulers,...w.rigs,...w.carts].reduce((n,h)=>n+h.cargo,0)+(w.service?.cargoItems.length??0)+w.deliveredFragments+w.effects.filter(e=>e.type==='transfer').reduce((n,e)=>n+(e.items?.length??e.amount??0),0);
}
export const losses=(w:World)=>[...w.drones,...w.haulers,...w.rigs,...w.scouts].filter(u=>u.state==='dead').length+w.guards.filter(g=>g.hp<=0).length;
export function finishMetrics(w:World,shift:number,initial:number,active:number,duty:Record<string,number>,spending:number):Shift{
 return {shift,credits:w.delivered,fragments:w.deliveredFragments,budgetSeconds:w.missionDuration,activeSeconds:active,seconds:w.time,losses:losses(w),extracted:w.extracted,cartLoaded:w.cartLoaded??0,cartDelivered:w.cartDelivered??0,cartDeployments:w.cartDeployments??0,cartCollections:w.cartCollections??0,haulerDelivered:w.haulerDelivered,ledgerError:inventory(w)-initial,remaining:w.rocks.reduce((n,r)=>n+r.hp,0),loose:w.ores.length,duty,milestones:w.pendingTech.map(e=>e.id),spending};
}
