import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROCK_PALETTES,rockPalette,rockDetails,mineralColor,rockArtTier} from '../src/art.ts';
import {BIOMES,biomeAt} from '../src/biomes.ts';
import {newTrailState,updateTrails,TRAIL_CAP,TRAIL_LIFE,type TrailSource} from '../src/trails.ts';
import {createWorld,freshCompany,step} from '../src/sim.ts';

const locations={home_belt:[200,550],scrap_fields:[1000,700],contested:[1770,675],ion_storm:[1200,1900],dead_zone:[2440,1950]} as const;
test('all real region positions choose distinct, dark stone palettes with neutral Home Belt intact',()=>{
 const seen=new Set<string>();
 for(const id of Object.keys(BIOMES) as (keyof typeof BIOMES)[]){
  const [x,y]=locations[id],palette=rockPalette(biomeAt(x,y));
  assert.equal(palette,ROCK_PALETTES[id]);
  assert.match(palette.fill,/^#[0-9a-f]{6}$/i);seen.add(palette.fill);
  const rgb=[1,3,5].map(i=>parseInt(palette.fill.slice(i,i+2),16));
  assert.ok(Math.max(...rgb)<95&&Math.max(...rgb)-Math.min(...rgb)<35,`${id} should remain quiet stone`);
 }
 assert.equal(seen.size,5);
 assert.deepEqual(rockPalette('home_belt'),{fill:'#34434e',edge:'#81909b',crater:'#23323d'});
});
test('rock geometry and mineral inclusions do not inherit the regional stone palette',()=>{
 const r={id:31,r:25,rich:true};
 const expected=rockDetails(r,2);
 for(const id of Object.keys(BIOMES) as (keyof typeof BIOMES)[]){
  assert.deepEqual(rockDetails(r,2),expected);
  assert.notEqual(rockPalette(id).fill,mineralColor[2]);
 }
 assert.equal(expected.craters.length,5);assert.equal(expected.inclusions.length,3);
 assert.equal(rockDetails(r,1).inclusions.length,1);
 assert.equal(rockArtTier(r,false),1);assert.equal(rockArtTier(r,true),2);
 assert.equal(new Set(Object.values(mineralColor)).size,5);
});
test('movement yields a short capped breadcrumb of small rear-facing squares in simulated time',()=>{
 const state=newTrailState(),source:TrailSource={id:'miner:0',kind:'impactMiner',x:0,y:0,angle:0};
 updateTrails(state,0,[source]);
 for(let i=1;i<=40;i++)updateTrails(state,i*.02,[{...source,x:i*1.4}]);
 assert.ok(state.puffs.length>=2&&state.puffs.length<=4);
 assert.ok(state.puffs.every(p=>p.x<56&&p.size>=2&&p.size<=3));
 const prior=state.puffs.map(p=>({...p}));
 updateTrails(state,.8,[{...source,x:56,angle:Math.PI/2}]);
 assert.deepEqual(state.puffs,prior,'turning without translation does not emit or rotate old puffs');
 updateTrails(state,.9,[{...source,x:56,y:10,angle:Math.PI/2}]);
 assert.ok(state.puffs.some(p=>p.y<10));
 updateTrails(state,.9,[{...source,x:56,y:10,angle:Math.PI/2}]);
 assert.ok(state.puffs.every(p=>p.born<=.9),'a second render of one simulation step is inert');
 updateTrails(state,.9+TRAIL_LIFE+.01,[{...source,x:56,y:10,angle:Math.PI/2}]);
 assert.equal(state.puffs.length,0);
});
test('missing/hidden ships, mission rewind and position jumps cannot leave ghost trails',()=>{
 const state=newTrailState(),enemy:TrailSource={id:'enemy:4',kind:'enemyScout',x:0,y:0,angle:0};
 updateTrails(state,0,[enemy]);updateTrails(state,.1,[{...enemy,x:16}]);assert.ok(state.puffs.length);
 updateTrails(state,.12,[]);assert.equal(state.puffs.length,0);assert.equal(state.tracks.size,0);
 updateTrails(state,.14,[enemy]);updateTrails(state,.22,[{...enemy,x:10}]);
 updateTrails(state,.24,[{...enemy,x:400}]);assert.equal(state.puffs.length,0);
 updateTrails(state,.25,[{...enemy,x:410}]);assert.ok(state.puffs.length);
 updateTrails(state,0,[enemy]);assert.equal(state.puffs.length,0);
});
test('a large fleet stays bounded and visual sampling never touches simulation or RNG',()=>{
 const a=createWorld(freshCompany()),b=createWorld(freshCompany());
 const before=JSON.stringify(a),state=newTrailState();
 for(let i=0;i<50;i++)updateTrails(state,i*.02,Array.from({length:80},(_,j)=>({id:`ship:${j}`,kind:'hauler' as const,x:i*2+j,y:j*5,angle:0})));
 assert.ok(state.puffs.length<=TRAIL_CAP);
 assert.equal(JSON.stringify(a),before);
 step(a);step(b);assert.equal(a.delivered,b.delivered);assert.equal(a.rng(),b.rng());
});
