import { freshCompany, type Company } from './sim.ts';
// Keep the key so existing players retain their company across payload migrations.
export const SAVE_KEY='aisteroids-company-v1';
export function parseSave(raw:string|null):Company{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||![1,2,3].includes(v.version)||!Number.isSafeInteger(v.credits)||v.credits<0||!Number.isInteger(v.drones)||v.drones<1||v.drones>6||typeof v.scanner!=='boolean'||!Number.isSafeInteger(v.rounds)||v.rounds<0||!Number.isSafeInteger(v.total)||v.total<0)return freshCompany();
  if(v.version===1&&typeof v.blaster!=='boolean'||v.version>=2&&(typeof v.laser!=='boolean'||typeof v.hull!=='boolean'))return freshCompany();
  if(v.version===3&&(typeof v.cargoBay!=='boolean'||typeof v.prospector!=='boolean'||typeof v.drive!=='boolean'||typeof v.outpost!=='boolean'||!Number.isInteger(v.guards)||v.guards<0||v.guards>2||!['home','far'].includes(v.launchSite)||v.launchSite==='far'&&!v.outpost))return freshCompany();
  const base=freshCompany();
  return {...base,credits:v.credits,drones:v.drones,scanner:v.scanner,hull:v.version>=2?v.hull:false,laser:v.version>=2?v.laser:v.blaster,rounds:v.rounds,total:v.total,...(v.version===3?{cargoBay:v.cargoBay,prospector:v.prospector,drive:v.drive,guards:v.guards,outpost:v.outpost,launchSite:v.launchSite}:{})};
 }catch{return freshCompany();}
}
