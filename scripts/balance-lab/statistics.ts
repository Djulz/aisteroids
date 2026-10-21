import type {Dataset,Result} from './types.ts';
export const quantile=(values:number[],p:number)=>{const a=[...values].sort((x,y)=>x-y);if(!a.length)return null;const k=(a.length-1)*p;return a[Math.floor(k)]+(a[Math.ceil(k)]-a[Math.floor(k)])*(k%1);};
export function rates(r:Result){
 const gross=r.shifts.reduce((n,s)=>n+s.credits,0),seconds=r.shifts.reduce((n,s)=>n+s.seconds,0),budget=r.shifts.reduce((n,s)=>n+s.budgetSeconds,0);
 return {gross,perShift:r.shifts.length?gross/r.shifts.length:0,perMinute:seconds?gross/seconds*60:0,perBudgetMinute:budget?gross/budget*60:0,losses:r.shifts.reduce((n,s)=>n+s.losses,0),cartDelivered:r.shifts.reduce((n,s)=>n+s.cartDelivered,0)};
}
export function pairedComparison(current:Dataset,baseline:Dataset){
 if(current.meta.schema!==baseline.meta.schema)throw Error('Incompatible result schema');
 const old=new Map(baseline.results.map(r=>[r.job.id,r]));
 const grouped=new Map<string,{id:string;seed:number;delta:number;before:number;after:number}[]>();
 const unmatched:string[]=[],invalid:string[]=[];
 for(const r of current.results){const b=old.get(r.job.id);if(!b){unmatched.push(r.job.id);continue;}
  if(r.status!=='ok'||b.status!=='ok'||r.shifts.length!==r.job.shifts||b.shifts.length!==b.job.shifts){invalid.push(r.job.id);continue;}
  const a=rates(r).perShift,v=rates(b).perShift,list=grouped.get(r.job.caseKey)??[];list.push({id:r.job.id,seed:r.job.seed,delta:a-v,before:v,after:a});grouped.set(r.job.caseKey,list);
 }
 return {baselineRevision:baseline.meta.revision,baselineEngineHash:baseline.meta.engineHash,unmatched,invalid,cases:[...grouped].map(([key,pairs])=>{
  const seeds=[...new Set(pairs.map(p=>p.seed))],cluster=seeds.map(seed=>{const a=pairs.filter(p=>p.seed===seed);return a.reduce((n,p)=>n+p.delta,0)/a.length;}),mean=cluster.reduce((a,b)=>a+b,0)/cluster.length;
  let state=123456789;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const boot=Array.from({length:1000},()=>cluster.reduce(n=>n+cluster[Math.floor(rng()*cluster.length)],0)/cluster.length);
  const seedMean=(field:'before'|'after')=>seeds.reduce((total,seed)=>{const a=pairs.filter(p=>p.seed===seed);return total+a.reduce((n,p)=>n+p[field],0)/a.length;},0)/seeds.length;
  const before=seedMean('before');
  return {key,pairs:pairs.length,seeds:seeds.length,meanDelta:mean,percent:before?mean/before*100:null,ci95:seeds.length>=3?[quantile(boot,.025),quantile(boot,.975)]:null,before,after:seedMean('after')};
 })};
}
