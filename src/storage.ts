import { freshCompany, type Company } from './sim.ts';
export const SAVE_KEY='aisteroids-company-v1';
export function parseSave(raw: string | null): Company {
 try {const v=JSON.parse(raw||'null');
 if(!v || v.version!==1 || !Number.isSafeInteger(v.credits)||v.credits<0 || !Number.isInteger(v.drones)||v.drones<1||v.drones>6 || typeof v.scanner!=='boolean'||typeof v.blaster!=='boolean' || !Number.isSafeInteger(v.rounds)||v.rounds<0 || !Number.isSafeInteger(v.total)||v.total<0) return freshCompany();
 return {version:1,credits:v.credits,drones:v.drones,scanner:v.scanner,blaster:v.blaster,rounds:v.rounds,total:v.total};
 }catch{return freshCompany();}
}
