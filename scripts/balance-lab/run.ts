import {fork,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {availableParallelism} from 'node:os';
import {createHash} from 'node:crypto';
import {plan,hash,type Options} from './catalog.ts';
import {SCHEMA,type Meta,type Result,type Dataset} from './types.ts';
import {pairedComparison} from './statistics.ts';
import {writeReport} from './report.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),arg=(name:string,fallback:string)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1]??fallback;},flag=(name:string)=>args.includes('--'+name);
const profile=arg('profile','screen');if(!['smoke','screen','standard','exhaustive'].includes(profile))throw Error('Unknown profile');
const number=(key:string,fallback:number,min=1,max=1000000)=>{const n=Number(arg(key,String(fallback)));if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Invalid --'+key);return n;};
const seeds=arg('seeds',profile==='smoke'?'7':profile==='exhaustive'?'7,17,42,99,123,314,2718,65537':'7,17,42').split(',').map(Number);
if(!seeds.length||new Set(seeds).size!==seeds.length||seeds.some(n=>!Number.isSafeInteger(n)||n<0||n>4294967295))throw Error('Seeds must be distinct uint32 integers');
const shard=arg('shard','0/1').split('/').map(Number) as [number,number];if(shard.length!==2||!shard.every(Number.isSafeInteger)||shard[0]<0||shard[1]<1||shard[0]>=shard[1])throw Error('Invalid --shard index/count');
const terrainText=arg('terrains',''),terrains=terrainText?terrainText.split(','):undefined;
if(terrains?.some(t=>!['home_dense','home_sparse','nickel','aurite','storm','void'].includes(t)))throw Error('Unknown terrain');
const combat=arg('combat','');if(combat&&!['quiet','patrols'].includes(combat))throw Error('Unknown combat mode');
if(flag('summary-only')&&(!flag('plan-only')||shard[1]!==1))throw Error('--summary-only requires --plan-only and no sharding');
const buildIds=args.includes('--only-builds')?arg('only-builds','').split(','):undefined,fleetFamily=arg('only-fleet','');
if(fleetFamily&&!['rig','miner'].includes(fleetFamily))throw Error('Invalid --only-fleet');
const options:Options={profile,seeds,terrains:terrains as Options['terrains'],duration:args.includes('--duration')?number('duration',45):undefined,shifts:args.includes('--shifts')?number('shifts',3,1,500):undefined,maxJobs:number('max-jobs',profile==='exhaustive'?2000:10000),shard,combat:combat as Options['combat']||undefined,campaign:flag('campaign')||flag('campaign-only'),campaignOnly:flag('campaign-only'),summaryOnly:flag('summary-only'),buildIds,fleetFamily:fleetFamily as Options['fleetFamily']||undefined};
const planned=plan(options),out=resolve(arg('out',resolve(root,'balance-results',profile))),engineRoot=resolve(arg('engine',root));mkdirSync(out,{recursive:true});
if(!planned.selected)throw Error('No cases match the selected experiment filters');
function git(command:string[]){try{return execFileSync('git',command,{cwd:engineRoot,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return 'unknown';}}
const fingerprint=(folder:string,files:string[])=>{const h=createHash('sha256');for(const f of files.sort()){h.update(f);h.update(readFileSync(resolve(folder,f)));}return h.digest('hex');};
const simFiles=['sim','fleet','freight','research','minerals','navigation','geometry','knowledge','universe','biomes','work','focus','doctrines','patrols','progression'].map(p=>'src/'+p+'.ts').filter(p=>existsSync(resolve(engineRoot,p)));
const harnessFiles=readdirSync(dirname(fileURLToPath(import.meta.url))).filter(f=>f.endsWith('.ts')).map(f=>'scripts/balance-lab/'+f);
const config={...options,totalPlanJobs:planned.total,selectedShardJobs:planned.selected,truncated:planned.truncated},configHash=hash(config);
let meta:Meta={schema:SCHEMA,profile,created:new Date().toISOString(),revision:git(['rev-parse','HEAD']),engineRoot,engineHash:fingerprint(engineRoot,simFiles),harnessHash:fingerprint(root,harnessFiles),dirty:!!git(['status','--porcelain','--','src']),config,configHash,planned:planned.jobs.length};
const ledger=resolve(out,'results.jsonl'),results:Result[]=[];
if(flag('resume')&&existsSync(ledger)){
 const rows=readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)),old=rows.shift()?.meta as Meta;
 if(!old||old.schema!==SCHEMA||old.engineHash!==meta.engineHash||old.harnessHash!==meta.harnessHash||old.configHash!==configHash)throw Error('Resume fingerprint mismatch: use a fresh output directory');
 meta=old;const latest=new Map<string,Result>();for(const row of rows)if(row.result)latest.set(row.result.job.id,row.result);results.push(...[...latest.values()].filter(r=>!flag('retry-failed')||r.status==='ok'));
}else if(existsSync(ledger))throw Error('Output exists: use --resume or a fresh --out directory');
writeFileSync(resolve(out,'plan.json'),JSON.stringify({meta,...planned},null,2));
console.log(JSON.stringify({out,total:planned.total,selected:planned.selected,scheduled:planned.jobs.length,truncated:planned.truncated,completeRolePaths:planned.paths,fleets:planned.fleets,source:meta.revision,engineHash:meta.engineHash}));
if(flag('plan-only'))process.exit(0);
if(planned.truncated&&!flag('allow-partial'))throw Error('Plan exceeds --max-jobs. Narrow the suite, shard it, or explicitly use --allow-partial. No silent sampling.');
if(!existsSync(ledger))writeFileSync(ledger,JSON.stringify({meta})+'\n');
const done=new Set(results.map(r=>r.job.id)),jobs=planned.jobs.filter(j=>!done.has(j.id));
const workers=Math.min(number('workers',Math.min(2,availableParallelism()),1,8),8),timeout=number('job-timeout',30,1,3600)*1000,totalLimit=number('wall-limit',600,1,86400)*1000,started=Date.now();
let index=0,stopping=false;const children=new Set<ReturnType<typeof fork>>();
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{stopping=true;process.exitCode=130;for(const child of children)child.kill();});
async function consume(){while(!stopping&&index<jobs.length&&Date.now()-started<totalLimit){const job=jobs[index++];
 const result=await new Promise<Result>(resolveResult=>{
  const child=fork(resolve(root,'scripts/balance-lab/worker.ts'),[],{execArgv:['--experimental-strip-types'],stdio:['ignore','ignore','pipe','ipc']});
  children.add(child);let settled=false,partial:Result|undefined,stderr='';
  child.stderr?.on('data',data=>{stderr=(stderr+data).slice(-4000);});
  const finish=(r:Result)=>{if(settled)return;settled=true;clearTimeout(timer);children.delete(child);child.kill();resolveResult(r);};
  const fail=(reason:string,status:Result['status']='error')=>finish({...partial,job,status,reason,shifts:partial?.shifts??[],trace:partial?.trace??[],wallMs:timeout,grants:partial?.grants??[],purchases:partial?.purchases??[],milestones:partial?.milestones??{}});
  const timer=setTimeout(()=>fail('Hard per-job wall timeout','timeout'),Math.min(timeout,Math.max(1,totalLimit-(Date.now()-started))));
  child.on('message',(m:{partial?:Result;result?:Result;error?:string})=>{if(m.partial)partial=m.partial;if(m.result)finish(m.result);if(m.error)fail(m.error);});
  child.on('error',e=>fail(e.message));child.on('exit',code=>{if(!settled)fail('Worker exit '+code+': '+stderr);});
  child.send({job,root:engineRoot});
 });
 results.push(result);appendFileSync(ledger,JSON.stringify({result})+'\n');
 console.log(results.length+'/'+planned.jobs.length+' '+result.status+' '+job.kind+' seed='+job.seed+' '+job.terrain+' '+job.build.id);
}}
await Promise.all(Array.from({length:workers},consume));
const dataset:Dataset={meta,results};writeFileSync(resolve(out,'results.json'),JSON.stringify(dataset));
const baseline=args.includes('--compare')?JSON.parse(readFileSync(resolve(arg('compare','')),'utf8')):undefined;
const comparison=baseline?pairedComparison(dataset,baseline.dataset??baseline):undefined;
if(comparison)writeFileSync(resolve(out,'comparison.json'),JSON.stringify(comparison,null,2));
writeReport(dataset,resolve(out,'report.html'),comparison);
const pending=planned.jobs.length-results.length,failed=results.filter(r=>r.status!=='ok').length;console.log(JSON.stringify({completed:results.length,planned:planned.jobs.length,pending,failed,report:resolve(out,'report.html')}));
if(flag('assert')){
 const drop=number('max-drop-percent',10,0,100),regressions=comparison?.cases.filter(c=>c.seeds>=3&&c.percent!==null&&c.percent< -drop&&c.ci95&&c.ci95[1]!==null&&c.ci95[1]<0)??[];
 if(pending||failed||comparison?.invalid.length||comparison?.unmatched.length||regressions.length)process.exitCode=1;
}
