import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,completePaths,enumerateFleets} from '../scripts/balance-lab/catalog.ts';
import {pairedComparison} from '../scripts/balance-lab/statistics.ts';
import {execute} from '../scripts/balance-lab/worker.ts';
import {fileURLToPath} from 'node:url';
import type {Dataset,Result} from '../scripts/balance-lab/types.ts';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const options={profile:'smoke',seeds:[7],maxJobs:100,shard:[0,1] as [number,number],campaign:false};

test('matrix covers all complete role paths and all legal six-slot compositions',()=>{
 assert.equal(completePaths.length,48);assert.equal(enumerateFleets(6).length,182);
 for(const f of enumerateFleets(6)){assert.equal(f.impactMiner+f.hauler+f.escort+f.scout+f.miningRig,6);assert.ok(f.impactMiner||f.miningRig);}
 const p=plan(options);assert.equal(p.total,6);assert.equal(new Set(p.jobs.map(j=>j.id)).size,6);
 const a=plan({...options,seeds:[7,17]}),b=plan({...options,seeds:[17,7]});assert.deepEqual(a.jobs.map(j=>j.id).sort(),b.jobs.map(j=>j.id).sort());
});

test('shards partition the same matrix without dropping or duplicating cases',()=>{
 const all=plan(options).jobs.map(j=>j.id).sort(),a=plan({...options,shard:[0,2]}).jobs,b=plan({...options,shard:[1,2]}).jobs;
 assert.deepEqual([...a,...b].map(j=>j.id).sort(),all);assert.equal(plan({...options,maxJobs:1}).truncated,true);
});

test('paired comparison clusters repeated patrol phases by seed and excludes failed jobs',()=>{
 const jobs=plan({...options,seeds:[7,17,42]}).jobs.filter(j=>j.build.id==='basic'&&j.fleet.impactMiner===1);
 const make=(delta:number):Dataset=>({meta:{schema:1,revision:'test',engineHash:'test'} as Dataset['meta'],results:jobs.map(j=>({job:j,status:'ok',shifts:[{credits:10+delta,seconds:30,budgetSeconds:30}],trace:[],wallMs:1,grants:[],purchases:[],milestones:{}} as Result))});
 const out=pairedComparison(make(5),make(0));assert.equal(out.cases[0].seeds,3);assert.equal(out.cases[0].meanDelta,5);assert.deepEqual(out.cases[0].ci95,[5,5]);
 const weighted=make(0),changed=make(0);
 weighted.results[0].shifts[0].credits=100;changed.results[0].shifts[0].credits=110;
 for(let phase=1;phase<=2;phase++)for(const data of [weighted,changed]){const first=data.results[0];data.results.push({...first,job:{...first.job,id:first.job.id+'phase'+phase,phase}});}
 const balanced=pairedComparison(changed,weighted).cases[0];assert.equal(balanced.before,40);assert.equal(balanced.after,40+10/3);assert.equal(balanced.meanDelta,10/3);
 const broken=make(0);broken.results[0].status='timeout';const other=pairedComparison(make(5),broken);assert.equal(other.invalid.length,1);assert.equal(other.cases[0].ci95,null);
});

test('fixture worker uses the real simulation and preserves the resource ledger',async()=>{
 const job=plan(options).jobs.find(j=>j.build.id==='bulk-cart'&&j.fleet.miningRig===1)!;
 const result=await execute({...job,duration:30,shifts:1},fileURLToPath(new URL('..',import.meta.url)));
 assert.equal(result.status,'ok',result.reason);assert.equal(result.shifts.length,1);assert.equal(result.shifts[0].ledgerError,0);assert.ok(result.trace.length>1);
 assert.ok(result.grants[0].startsWith('CONTROLLED FIXTURE'));
});

test('hard wall limit writes censored results and a usable report instead of hanging',()=>{
 const out=mkdtempSync(join(tmpdir(),'rbr-lab-deadline-'));
 try{
  assert.throws(()=>execFileSync(process.execPath,['--experimental-strip-types',fileURLToPath(new URL('../scripts/balance-lab/run.ts',import.meta.url)),'--profile','smoke','--shifts','50','--job-timeout','1','--wall-limit','1','--workers','1','--out',out,'--assert'],{timeout:10000,stdio:'pipe'}));
  const data=JSON.parse(readFileSync(join(out,'results.json'),'utf8'));
  assert.ok(data.results.length<data.meta.planned);assert.ok(data.results.some((r:Result)=>r.status==='timeout'));
  assert.match(readFileSync(join(out,'report.html'),'utf8'),/Ofullständig körning/);
 }finally{rmSync(out,{recursive:true,force:true});}
});
