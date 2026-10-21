import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine,fixture} from './engine.ts';
import {plan} from './catalog.ts';
import {inventory,finishMetrics} from './metrics.ts';
import {clearSegment} from '../../src/navigation.ts';

// A bounded reference investigation. It does not modify the simulated engine.
const args=process.argv.slice(2),arg=(key:string,fallback:string)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1]??fallback;};
const root=resolve(arg('engine',resolve(dirname(fileURLToPath(import.meta.url)),'../..')));
const out=resolve(arg('out','balance-results/rig-diagnosis'));mkdirSync(out,{recursive:true});
const destination=resolve(out,'results.json');if(existsSync(destination))throw Error('Choose a fresh --out directory');
const engine=await loadEngine(root),records=[];
const fingerprint=createHash('sha256');
for(const name of ['sim','fleet','freight','research','minerals','navigation','geometry','knowledge','universe','biomes','work','focus','doctrines','patrols','progression'].map(p=>'src/'+p+'.ts').sort()){
 if(existsSync(resolve(root,name))){fingerprint.update(name);fingerprint.update(readFileSync(resolve(root,name)));}
}
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
for(const [seed,duration] of [[7,45],[17,45],[42,45],[42,60],[42,90]]){
 const job=plan({profile:'smoke',seeds:[seed],duration,shifts:3,maxJobs:100,shard:[0,1],campaign:false,buildIds:['bulk-cart'],fleetFamily:'rig',combat:'quiet'}).jobs[0];
 let company=fixture(engine,job);const shifts=[];
 for(let round=1;round<=job.shifts;round++){
  const w=engine.sim.createWorld(company);w.enemies=[];
  const initial=inventory(w),trace=[],duty:Record<string,number>={},events:Record<string,number>={};let next=0,active=0,count=0;
  while(w.phase!=='done'&&count++<16200){
   if(w.phase==='mining')active+=engine.sim.STEP;
   engine.sim.step(w,engine.sim.STEP);const rig=w.rigs[0],h=w.haulers[0];
   for(const [key,state] of [['Rig',rig.state],['Hauler',h.state==='work'?h.task:h.state]])duty[key+': '+state]=(duty[key+': '+state]??0)+engine.sim.STEP;
   events[rig.state]??=w.time;
   if(w.time>=next||w.phase==='done'){
    const rock=w.rocks.find(r=>r.id===rig.targetRock),point=rig.path[0];
    const dx=point?point.x-rig.x:0,dy=point?point.y-rig.y:0,length=dx*dx+dy*dy;
    const blockers=point?w.rocks.filter(r=>r.hp>0).map(r=>{const t=length?Math.max(0,Math.min(1,((r.x-rig.x)*dx+(r.y-rig.y)*dy)/length)):0;return {id:r.id,clearance:Math.hypot(rig.x+dx*t-r.x,rig.y+dy*t-r.y)-r.r};}).sort((a,b)=>a.clearance-b.clearance):[];
    // Local geometric probes are diagnostics; they never steer the engine.
    const navigation=point?{clearForShortcut8:clearSegment(rig,point,w.rocks,-1,8.1),clearForGrid11:clearSegment(rig,point,w.rocks,-1,11),clearForRig17:clearSegment(rig,point,w.rocks,-1,17),nearestSegmentObstacle:blockers[0]}:undefined;
    trace.push({time:w.time,phase:w.phase,rig:{state:rig.state,x:rig.x,y:rig.y,hp:rig.hp,speed:Math.hypot(rig.vx,rig.vy),cargo:rig.cargo,target:rig.targetRock,distance:rock?Math.hypot(rock.x-rig.x,rock.y-rig.y):null,path:rig.path.map(p=>({...p})),navigation},hauler:{state:h.state,task:h.task,x:h.x,y:h.y,cargo:h.cargo},rock:rock?{id:rock.id,x:rock.x,y:rock.y,r:rock.r,hp:rock.hp,mineral:rock.mineral}:null,extracted:w.extracted,credits:w.delivered});next+=5;
   }
  }
  if(w.phase!=='done')throw Error('Bounded diagnostic shift did not settle');
  const metrics=finishMetrics(w,round,initial,active,duty,0);if(metrics.ledgerError!==0)throw Error('Resource conservation failed');
  shifts.push({round,status:w.phase,events,metrics,trace});company=engine.sim.settle(company,w);
 }
 records.push({job,shifts});console.log(JSON.stringify({seed,duration,credits:shifts.map(s=>s.metrics.credits),firstDrill:shifts.map(s=>s.events.drill??null)}));
}
writeFileSync(destination,JSON.stringify({revision,engineHash:fingerprint.digest('hex'),combat:'quiet',sampleSeconds:5,records}));
console.log(destination);
