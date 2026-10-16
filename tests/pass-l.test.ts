import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyFocuses,hitFocus,withFocus} from '../src/focus.ts';
import {freshCompany,createWorld,setFocus,settle,step,STEP} from '../src/sim.ts';
import {parseSave,SAVE_KEY,loadCompany,type SaveStore} from '../src/storage.ts';
import {parseSeed,randomSeed,MAX_SEED} from '../src/seed.ts';
import {resolveRecall} from '../src/recall.ts';
import {workRate} from '../src/work.ts';
import {mineralMotif} from '../src/art.ts';
import {mineralIds} from '../src/minerals.ts';

test('expected delivered value combines grade, capacity, time and risk without a rarity cap',()=>{
 const base={credits:1,pieces:2,travel:100,returnDistance:150,actionSeconds:5,risk:0};
 assert.ok(workRate({...base,credits:3})>workRate(base));
 assert.ok(workRate({...base,pieces:1})<workRate(base));
 assert.ok(workRate({...base,travel:300,risk:10})<workRate(base));
 assert.ok(workRate({...base,focusDistance:0})>workRate({...base,focusDistance:400}));
 assert.equal(workRate({...base,pieces:0}),0);
});

test('both deep-fog focus markers coexist, stay tappable and persist across missions',()=>{
 const c=freshCompany(),w=createWorld(c),p={x:1700,y:960};
 setFocus(w,'mining',p);setFocus(w,'scout',p);
 assert.deepEqual(w.focuses,{mining:p,scout:p});
 const camera={x:p.x,y:p.y,zoom:1,width:390,height:700};
 assert.equal(hitFocus(w.focuses,camera,{x:179,y:350}),'mining');
 assert.equal(hitFocus(w.focuses,camera,{x:211,y:350}),'scout');
 const saved={...c,focuses:withFocus(withFocus(emptyFocuses(),'mining',p),'scout',p)};
 assert.deepEqual(createWorld(parseSave(JSON.stringify(saved))).focuses,w.focuses);
 setFocus(w,'mining',null);assert.deepEqual(w.focuses.scout,p);
});

test('v13 migration preserves company while v14 validates focus coordinates',()=>{
 const prior={...freshCompany(0),version:13,credits:37,rounds:2,launchSite:'home'};
 const map=new Map<string,string>([['aisteroids-company-v13',JSON.stringify(prior)]]);
 const store:SaveStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}};
 const migrated=loadCompany(store);
 assert.equal(migrated.version,14);assert.equal(migrated.credits,37);assert.equal(migrated.rounds,2);assert.equal(migrated.worldSeed,0);
 assert.deepEqual(migrated.focuses,emptyFocuses());assert.ok(map.has(SAVE_KEY));assert.ok(!map.has('aisteroids-company-v13'));
 assert.equal(parseSave(JSON.stringify({...migrated,focuses:{mining:{x:Infinity,y:20},scout:null}})).rounds,0);
});

test('new-game seed accepts zero and maximum, rejects fractions and out-of-range values',()=>{
 assert.equal(parseSeed('0'),0);assert.equal(parseSeed(String(MAX_SEED)),MAX_SEED);
 for(const bad of ['-1','1.5','4e2','4294967296','foo',''])assert.equal(parseSeed(bad),null);
 assert.equal(randomSeed(7,()=>7),8);
 assert.equal(createWorld(freshCompany(0)).company.worldSeed,0);
});

test('all five mineral types have separate pickup silhouettes',()=>{
 assert.equal(new Set(mineralIds.map(id=>mineralMotif[id])).size,5);
});

test('fixed-step recall completes and settlement is idempotent',()=>{
 const c=freshCompany(),w=createWorld(c);
 while(w.phase==='mining')step(w,STEP);
 const steps=resolveRecall(w);
 assert.ok(steps>0&&steps<18000);assert.equal(w.phase,'done');
 const once=settle(c,w),twice=settle(once,w);
 assert.deepEqual(twice,once);assert.equal(once.rounds,1);
});
