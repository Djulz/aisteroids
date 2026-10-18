// Compatibility view for older tooling. The universe generator owns coordinates.
import {generateUniverse} from './universe.ts';
export const LOGISTICS_SITES=generateUniverse(7).pois.filter(p=>
 p.id==='abandoned_cargo_relay'||p.id==='derelict_freight_shuttle'||p.id==='automated_sorting_archive');
