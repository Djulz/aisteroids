import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCompany,SAVE_KEY,type SaveStore} from '../src/storage.ts';
import {freshCompany} from '../src/sim.ts';
import {nextSeed,parseSeed} from '../src/seed.ts';
import {MOTION_KEY,readMotion,reducedMotion,saveMotion} from '../src/preferences.ts';

test('title boot reads a current company without writing or recreating it',()=>{
 const original={...freshCompany(0),credits:57,rounds:4};
 const values=new Map([[SAVE_KEY,JSON.stringify(original)]]);
 let writes=0;
 const store:SaveStore={getItem:k=>values.get(k)??null,setItem:()=>{writes++;},removeItem:()=>{writes++;}};
 assert.deepEqual(readCompany(store),{company:original,issue:null,storageOK:true});
 assert.equal(writes,0);
});

test('empty, corrupt and unreadable storage remain distinct without writes',()=>{
 const values=new Map<string,string>();let writes=0;
 const store:SaveStore={getItem:k=>values.get(k)??null,setItem:()=>{writes++;},removeItem:()=>{writes++;}};
 assert.deepEqual(readCompany(store),{company:null,issue:null,storageOK:true});
 values.set(SAVE_KEY,'{bad');
 assert.deepEqual(readCompany(store),{company:null,issue:'corrupt',storageOK:true});
 assert.equal(values.get(SAVE_KEY),'{bad');assert.equal(writes,0);
 assert.throws(()=>readCompany({...store,getItem:()=>{throw new Error('blocked');}}));
});

test('supported legacy save migrates, and write failure retains the old key',()=>{
 const previous={...freshCompany(7),version:13,credits:42};
 const key='aisteroids-company-v13';
 const values=new Map([[key,JSON.stringify(previous)]]);
 const store:SaveStore={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}};
 assert.equal(readCompany(store).company?.credits,42);
 assert.ok(values.has(SAVE_KEY));assert.ok(!values.has(key));
 values.delete(SAVE_KEY);values.set(key,JSON.stringify(previous));
 const failed=readCompany({...store,setItem:()=>{throw new Error('quota');}});
 assert.equal(failed.company?.credits,42);assert.equal(failed.storageOK,false);
 assert.ok(values.has(key));assert.ok(!values.has(SAVE_KEY));
});

test('explicit seed boundaries and rerolls avoid both the active seed and prior candidate',()=>{
 for(const value of ['0','7','4294967295'])assert.notEqual(parseSeed(value),null);
 for(const value of ['', '-1','2.5','1e4','4294967296'])assert.equal(parseSeed(value),null);
 assert.equal(nextSeed(7,8,()=>8),9);
 assert.equal(nextSeed(4294967295,0,()=>0),1);
 assert.equal(nextSeed(7,8,()=>11),11);
});

test('motion follows the device until overridden and remains separate from company storage',()=>{
 const data=new Map<string,string>();
 const store={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 assert.equal(readMotion(store),'system');assert.equal(reducedMotion('system',true),true);
 assert.equal(reducedMotion('system',false),false);
 assert.equal(saveMotion(store,'reduce'),true);assert.equal(readMotion(store),'reduce');
 data.set(SAVE_KEY,JSON.stringify(freshCompany(0)));
 assert.equal(readMotion(store),'reduce');assert.equal(data.get(MOTION_KEY),'reduce');
 assert.equal(saveMotion({setItem:()=>{throw new Error('blocked');}},'full'),false);
});
