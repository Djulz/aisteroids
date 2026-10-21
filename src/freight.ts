import type {World,Hauler,Cart} from './sim.ts';
import type {CargoItem} from './minerals.ts';

/** Only physically attached, surviving carts extend the owner's hold. */
export function freightRoom(w:World,h:Hauler){
 return h.capacity-h.cargo+w.carts.filter(c=>c.ownerId===h.id&&c.attached&&!c.destroyed).reduce((n,c)=>n+c.capacity-c.cargo,0);
}
export function freightCargo(w:World,h:Hauler){
 return h.cargo+w.carts.filter(c=>c.ownerId===h.id&&c.attached&&!c.destroyed).reduce((n,c)=>n+c.cargo,0);
}
/** Moves real manifest items once; never converts value into cargo places. */
export function loadFreight(w:World,h:Hauler,source:CargoItem[],limit=source.length){
 let moved=0;
 for(const hold of [h,...w.carts.filter(c=>c.ownerId===h.id&&c.attached&&!c.destroyed)]){
  const amount=Math.min(source.length,hold.capacity-hold.cargo,limit-moved);
  if(amount>0){hold.cargoItems.push(...source.splice(0,amount));if(hold!==h)w.cartLoaded+=amount;moved+=amount;}
 }
 return moved;
}
export function cartReady(w:World,c:Cart){
 if(c.destroyed||c.attached||!c.cargo)return false;
 // Retrieve a partial field load before the worker stops producing at recall.
 if(w.phase!=='mining'||c.cargo>=Math.min(8,c.capacity)||w.missionDuration-w.time<=5)return true;
 // Do not keep collecting the first fragment from a working field buffer.
 return ![...w.rigs.filter(r=>r.state==='drill'||r.state==='blocked'),...w.drones.filter(d=>d.state==='mine')]
  .some(unit=>Math.hypot(unit.x-c.x,unit.y-c.y)<90);
}
