import {performance} from 'node:perf_hooks';
import {loadEngine,fixture,prepareCampaign} from './engine.ts';
import {inventory,losses,finishMetrics} from './metrics.ts';
import type {Job,Result} from './types.ts';

export async function execute(job:Job,root:string,onProgress:(r:Result)=>void=()=>{}):Promise<Result>{
 const start=performance.now(),e=await loadEngine(root);
 const out:Result={job,status:'ok',shifts:[],trace:[],wallMs:0,grants:job.kind==='fixture'?['CONTROLLED FIXTURE: all research gates and blueprints; full chart; assigned slots and selected talents; terrain gear; selected shift duration; frontier base for outer regions. No economic feasibility claim.']:[],purchases:[],milestones:{}};
 let c=job.kind==='fixture'?fixture(e,job):e.sim.freshCompany(job.seed),gross=0,seconds=0,previousIncome:number[]=[];
 for(let round=1;round<=job.shifts;round++){
  let spending=0;
  if(job.kind==='campaign'){
   const prepared=prepareCampaign(e,c,job);c=prepared.company;
   for(const p of prepared.purchases){out.purchases.push({shift:round,...p});spending+=p.cost;}
  }
  const w=e.sim.createWorld(c),initial=inventory(w),duty:Record<string,number>={};let active=0,nextSample=0,steps=0;
  const nativeCartMetrics=typeof w.cartLoaded==='number',observed={cartLoaded:0,cartDelivered:0,cartDeployments:0,cartCollections:0};
  if(job.combat==='quiet')w.enemies=[];
  const sample=()=>out.trace.push({shift:round,seconds:seconds+w.time,gross:gross+w.delivered,cash:c.credits+w.delivered,delivered:w.delivered,mineral:{...w.deliveredByMineral},extracted:w.extracted,cartLoaded:w.cartLoaded??observed.cartLoaded,cartDelivered:w.cartDelivered??observed.cartDelivered,losses:losses(w)});
  while(w.phase!=='done'&&steps++<16200){
   if(w.phase==='mining')active+=e.sim.STEP;
   const previous=nativeCartMetrics?[]:w.carts.map(cart=>({id:cart.id,cargo:cart.cargo,attached:cart.attached}));
   e.sim.step(w,e.sim.STEP);
   if(!nativeCartMetrics)for(const cart of w.carts){const old=previous.find(p=>p.id===cart.id);if(!old)continue;
    observed.cartLoaded+=Math.max(0,cart.cargo-old.cargo);
    if(old.attached&&!cart.attached)observed.cartDeployments++;
    if(!old.attached&&cart.attached)observed.cartCollections++;
    if(old.attached&&!cart.destroyed&&w.haulers.some(h=>h.id===cart.ownerId&&h.state==='unload'))observed.cartDelivered+=Math.max(0,old.cargo-cart.cargo);
   }
   for(const h of w.haulers){const key='Hauler: '+(h.state==='work'?h.task:h.state);duty[key]=(duty[key]??0)+e.sim.STEP;}
   for(const cart of w.carts){const key='Cart: '+(cart.destroyed?'destroyed':cart.attached?cart.cargo?'towed loaded':'towed empty':cart.cargo?'field loaded':'field empty');duty[key]=(duty[key]??0)+e.sim.STEP;}
   if(w.time>=nextSample){sample();nextSample+=2;}
  }
  if(w.phase!=='done'){out.status='timeout';out.reason='270 simulated second / 16200 step limit';break;}
  sample();if(!nativeCartMetrics)Object.assign(w,observed);
  const m=finishMetrics(w,round,initial,active,duty,spending);out.shifts.push(m);
  if(m.ledgerError!==0){out.status='error';out.reason='Resource conservation failed: '+m.ledgerError;break;}
  c=e.sim.settle(c,w);gross+=w.delivered;seconds+=w.time;
  for(const id of c.uniqueTechDiscoveries)out.milestones[id]??=round;
  for(const [id,condition] of [['slot2',c.fleetCapacity>=2],['slot3',c.fleetCapacity>=3],['slot4',c.fleetCapacity>=4],['hauler',c.unlockedTypes.includes('hauler')],['rig',c.unlockedTypes.includes('miningRig')]] as const)if(condition)out.milestones[id]??=round;
  previousIncome=[...previousIncome,w.delivered].slice(-5);
  out.wallMs=performance.now()-start;onProgress(out);
  if(job.kind==='campaign'&&previousIncome.length===5&&previousIncome.every(v=>v===0)){out.status='stalled';out.reason='Five consecutive shifts without income';break;}
 }
 out.wallMs=performance.now()-start;return out;
}
if(process.send)process.on('message',async(message:{job:Job;root:string})=>{
 try{const result=await execute(message.job,message.root,partial=>process.send?.({partial}));process.send?.({result},()=>process.disconnect());}
 catch(error){process.send?.({error:error instanceof Error?error.stack:String(error)},()=>process.disconnect());}
});
