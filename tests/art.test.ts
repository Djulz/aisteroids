import {test} from 'node:test';
import assert from 'node:assert/strict';
import {poiArt,rockArtTier,rockArtTiers,shipArt} from '../src/art.ts';
import {POIS} from '../src/knowledge.ts';
import {createWorld,freshCompany} from '../src/sim.ts';

test('art gallery covers the canonical discoveries and all current/future silhouettes',()=>{
 assert.deepEqual([...poiArt].sort(),POIS.map(p=>p.id).sort());
 assert.deepEqual(rockArtTiers,[1,2,3,4,5]);
 for(const type of ['impactMiner','laserMiner','escort','scout','hauler','enemyScout','enemyFighter'])assert.ok(shipArt.includes(type as typeof shipArt[number]));
});
test('current rock art follows revealed rich status without inventing economic tiers',()=>{
 const world=createWorld(freshCompany());
 assert.ok(world.rocks.some(r=>r.rich)&&world.rocks.some(r=>!r.rich));
 for(const rock of world.rocks){
  assert.equal(rockArtTier(rock,false),1);
  assert.equal(rockArtTier(rock,true),rock.rich?2:1);
 }
});
