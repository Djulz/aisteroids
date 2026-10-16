import {step,STEP,type World} from './sim.ts';

export const RECALL_VISIBLE_SECONDS=4;
export const RECALL_STEP_LIMIT=18000;
// The same fixed-step rules as visible flight. This helper is also usable by
// deterministic tests without Canvas or wall-clock timing.
export function resolveRecall(w:World,maxSteps=RECALL_STEP_LIMIT):number{
 if(w.phase!=='recall'&&w.phase!=='aftermath'&&w.phase!=='done')throw Error('Recall has not begun');
 let steps=0;while(w.phase!=='done'&&steps<maxSteps){step(w,STEP);steps++;}
 if(w.phase!=='done')throw Error(`Recall exceeded ${maxSteps} fixed steps`);
 return steps;
}
// Yield between small CPU slices so a long physical return does not lock the
// browser. Timer slices still progress on visible tabs with a throttled canvas
// frame rate; hidden tabs wait for visibility before advancing simulation.
export function finishRecall(w:World,state:()=> 'run'|'pause'|'cancel'):Promise<{steps:number;cpuMs:number}>{
 return new Promise((resolve,reject)=>{
  let steps=0,cpuMs=0;
  const batch=()=>{
   const status=state();if(status==='cancel'){reject(Error('Stale recall cancelled'));return;}
   if(status==='pause'){requestAnimationFrame(batch);return;}
   const start=performance.now();
   try{
    while(w.phase!=='done'&&steps<RECALL_STEP_LIMIT&&performance.now()-start<9){step(w,STEP);steps++;}
    cpuMs+=performance.now()-start;
    if(w.phase==='done'){resolve({steps,cpuMs});return;}
    if(steps>=RECALL_STEP_LIMIT){reject(Error('Recall exceeded fixed-step limit'));return;}
    setTimeout(batch,0);
   }catch(error){reject(error);}
  };
  setTimeout(batch,0);
 });
}
