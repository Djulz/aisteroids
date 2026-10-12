import { freshCompany, type Company } from './sim.ts';
// Keep the key so existing players retain their company. Payload migrates to v2.
export const SAVE_KEY='aisteroids-company-v1';
export function parseSave(raw:string|null):Company{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||![1,2].includes(v.version)||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isInteger(v.drones)||v.drones<1||v.drones>6||typeof v.scanner!=='boolean'||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isSafeInteger(v.total)||v.total<0)return freshCompany();
  if(v.version===1&&typeof v.blaster!=='boolean'||v.version===2&&(typeof v.laser!=='boolean'||typeof v.hull!=='boolean'))return freshCompany();
  return {version:2,credits:v.credits,drones:v.drones,scanner:v.scanner,hull:v.version===2?v.hull:false,laser:v.version===2?v.laser:v.blaster,rounds:v.rounds,total:v.total};
 }catch{return freshCompany();}
}
