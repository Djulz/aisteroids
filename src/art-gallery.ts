import {drawShip,drawMother,drawOutpost,drawRock,drawPoi,rockPalette,shipArt,rockArtTiers,poiArt,type ShipArt} from './art.ts';
import {POIS} from './knowledge.ts';
import {BIOMES,type BiomeId} from './biomes.ts';
import {drawTrails,newTrailState,updateTrails} from './trails.ts';

// Direct URL test scene only. No game navigation points here, and no company
// data or simulation state is changed by opening the gallery.
export function mountArtGallery(host:HTMLElement){
 const labels:Record<string,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Escort',scout:'Scout',hauler:'Hauler',enemyScout:'Enemy Scout',enemyFighter:'Enemy Fighter',abandoned_research_station:'Derelict Research Station',experimental_probe_salvaged:'Experimental Probe',abandoned_cargo_relay:'Abandoned Cargo Relay',derelict_freight_shuttle:'Derelict Freight Shuttle',automated_sorting_archive:'Automated Sorting Archive'};
 const entries=[...shipArt.map(kind=>({id:kind,label:labels[kind],draw:(c:CanvasRenderingContext2D)=>drawShip(c,kind,0,0,-Math.PI/2,{thrust:true,cargo:5,capacity:10})})),
  {id:'hq',label:'HQ',draw:(c:CanvasRenderingContext2D)=>drawMother(c,0,0,0,0)},
  {id:'outpost',label:'Outpost',draw:(c:CanvasRenderingContext2D)=>drawOutpost(c,0,0,true,0)},
  ...rockArtTiers.map(tier=>({id:`tier-${tier}`,label:`Rock T${tier}${tier>2?' · future art':''}`,draw:(c:CanvasRenderingContext2D)=>drawRock(c,{id:0,x:0,y:0,r:29,hp:50,max:50,shape:[.89,.83,.98,.9,.85,.97,.8,.94,.9,.98,.78]},tier)})),
  ...poiArt.map(id=>({id,label:labels[id]??POIS.find(p=>p.id===id)!.name,draw:(c:CanvasRenderingContext2D)=>drawPoi(c,id,0,0)}))];
 const biomeIds=Object.keys(BIOMES) as BiomeId[];
 const moving:ShipArt[]=['impactMiner','laserMiner','scout','escort','hauler','enemyScout'];
 host.innerHTML=`<main class="asset-gallery"><h1>AIsteroid Mining · Art test scene</h1><p>Shapes near their in-game size. Future motifs do not spawn in the current game.</p><div class="gallery-grid">${entries.map(entry=>`<figure><figcaption>${entry.label}</figcaption><canvas width="180" height="86" aria-label="${entry.label}"></canvas></figure>`).join('')}</div><h2>Moving exhaust · actual scale</h2><p>Compare each moving ship with its stationary sample above. The separated squares stay in world space through a turn.</p><div class="gallery-grid">${moving.map(kind=>`<figure><figcaption>${labels[kind]} · moving</figcaption><canvas class="moving-sample" width="180" height="86" aria-label="${labels[kind]} with square exhaust" data-kind="${kind}"></canvas></figure>`).join('')}</div><h2>Same rock · five regions</h2><p>Same ID, shape, HP and radius in every column. T1 and revealed T2 retain the same inclusion colors across stone palettes.</p><div class="gallery-viewport"><div class="gallery-biomes">${biomeIds.map(id=>`<b>${BIOMES[id].name}</b>`).join('')}${[1,2].map(tier=>biomeIds.map(id=>`<canvas width="72" height="75" data-biome="${id}" data-tier="${tier}" aria-label="${BIOMES[id].name} T${tier} rock"></canvas>`).join('')).join('')}</div></div><p>Row 1: common (T1). Row 2: revealed rich (T2). T3–T5 above are future art under the neutral Home Belt palette.</p></main>`;
 const canvases=host.querySelectorAll<HTMLCanvasElement>('.gallery-grid:first-of-type canvas');
 entries.forEach((entry,i)=>{const canvas=canvases[i],dpr=Math.min(devicePixelRatio||1,2);canvas.width=180*dpr;canvas.height=86*dpr;
  const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,90*dpr,43*dpr);entry.draw(c);
 });
 for(const canvas of Array.from(host.querySelectorAll<HTMLCanvasElement>('.gallery-biomes canvas'))){
  const dpr=Math.min(devicePixelRatio||1,2),id=canvas.dataset.biome as BiomeId,tier=Number(canvas.dataset.tier) as 1|2;
  canvas.width=72*dpr;canvas.height=75*dpr;
  const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,36*dpr,37*dpr);
  drawRock(c,{id:31,x:0,y:0,r:25,hp:50,max:50,shape:[.89,.83,.98,.9,.85,.97,.8,.94,.9,.98,.78]},tier,0,rockPalette(id));
 }
 const samples=Array.from(host.querySelectorAll<HTMLCanvasElement>('.moving-sample')).map((canvas,i)=>{
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=180*dpr;canvas.height=86*dpr;
  return {canvas,c:canvas.getContext('2d')!,dpr,kind:moving[i],trail:newTrailState()};
 });
 const start=performance.now();
 function animate(now:number){
  const t=(now-start)/1000;
  for(const sample of samples){const {canvas,c,dpr,kind,trail}=sample;
   const x=25+(t*55)%132,y=43+10*Math.sin(t*1.6),angle=Math.atan2(16*Math.cos(t*1.6),55);
   c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
   updateTrails(trail,t,[{id:kind,kind,x,y,angle}]);drawTrails(c,trail,t,0,0,180,86);
   drawShip(c,kind,x,y,angle,{time:t,thrust:true,cargo:5,capacity:10});
  }
  requestAnimationFrame(animate);
 }
 requestAnimationFrame(animate);
}
