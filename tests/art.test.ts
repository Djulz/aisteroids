import {test} from 'node:test';
import assert from 'node:assert/strict';
import {poiArt,rockArtTier,rockArtTiers,shipArt} from '../src/art.ts';
import {POIS} from '../src/knowledge.ts';
import {createWorld,freshCompany} from '../src/sim.ts';

test('art gallery covers the canonical discoveries and all current/future silhouettes',()=>{
 assert.deepEqual([...poiArt].sort(),POIS.map(p=>p.id).sort());
 assert.deepEqual(rockArtTiers,[1,2,3,4,5]);
 for(const type of ['impactMiner','laserMiner','escort','scout','hauler','enemyScout','enemyFighter','enemyEnforcer','enemySentry','enemyLurker','enemySpore'])assert.ok(shipArt.includes(type as typeof shipArt[number]));
});
test('rock art follows identified physical mineral families',()=>{
 const world=createWorld(freshCompany());
 assert.ok(world.rocks.some(r=>r.rich)&&world.rocks.some(r=>!r.rich));
 for(const rock of world.rocks){
  assert.equal(rockArtTier(rock,false),1);
  assert.equal(rockArtTier(rock,true),({ferrite:1,nickel:2,aurite:3,cryonite:4,voidite:5} as const)[rock.mineral]);
 }
});
