import {drawShip,drawMother,drawOutpost,drawRock,drawPoi,shipArt,rockArtTiers,poiArt} from './art.ts';
import {POIS} from './knowledge.ts';

// Direct URL test scene only. No game navigation points here, and no company
// data or simulation state is changed by opening the gallery.
export function mountArtGallery(host:HTMLElement){
 const labels:Record<string,string>={impactMiner:'Impact Miner',laserMiner:'Laser Miner',escort:'Escort',scout:'Scout',hauler:'Hauler',enemyScout:'Enemy Scout',enemyFighter:'Enemy Fighter',abandoned_research_station:'Derelict Research Station',experimental_probe_salvaged:'Experimental Probe',abandoned_cargo_relay:'Abandoned Cargo Relay',derelict_freight_shuttle:'Derelict Freight Shuttle',automated_sorting_archive:'Automated Sorting Archive'};
 const entries=[...shipArt.map(kind=>({id:kind,label:labels[kind],draw:(c:CanvasRenderingContext2D)=>drawShip(c,kind,0,0,-Math.PI/2,{thrust:true,cargo:5,capacity:10})})),
  {id:'hq',label:'HQ',draw:(c:CanvasRenderingContext2D)=>drawMother(c,0,0,0,0)},
  {id:'outpost',label:'Outpost',draw:(c:CanvasRenderingContext2D)=>drawOutpost(c,0,0,true,0)},
  ...rockArtTiers.map(tier=>({id:`tier-${tier}`,label:`Rock T${tier}${tier>2?' · future art':''}`,draw:(c:CanvasRenderingContext2D)=>drawRock(c,{id:0,x:0,y:0,r:29,hp:50,max:50,shape:[.89,.83,.98,.9,.85,.97,.8,.94,.9,.98,.78]},tier)})),
  ...poiArt.map(id=>({id,label:labels[id]??POIS.find(p=>p.id===id)!.name,draw:(c:CanvasRenderingContext2D)=>drawPoi(c,id,0,0)}))];
 host.innerHTML=`<main class="asset-gallery"><h1>AIsteroid Mining · Art test scene</h1><p>Shapes at 1 world unit per CSS pixel. Future motifs do not spawn in the current game.</p><div class="gallery-grid">${entries.map(entry=>`<figure><figcaption>${entry.label}</figcaption><canvas width="180" height="86" aria-label="${entry.label}"></canvas></figure>`).join('')}</div></main>`;
 const canvases=host.querySelectorAll<HTMLCanvasElement>('canvas');
 entries.forEach((entry,i)=>{const canvas=canvases[i],dpr=Math.min(devicePixelRatio||1,2);canvas.width=180*dpr;canvas.height=86*dpr;
  const c=canvas.getContext('2d')!;c.setTransform(dpr,0,0,dpr,90*dpr,43*dpr);entry.draw(c);
 });
}
