import {BIOMES} from './biomes.ts';
import {generateUniverse,regionAt} from './universe.ts';
import {mineralForRock,MINERALS} from './minerals.ts';
import {patrolSites} from './patrols.ts';

/** Development inspection only; never linked from the player menu. */
export function mountDevMap(root:HTMLElement,seed:number){
 const universe=generateUniverse(seed);
 root.innerHTML='<main style="padding:16px;background:#07121b;color:#fff;min-height:100vh;font:14px monospace"><h1>WORLD AND PATROL INSPECTION</h1><p id="map-seed"></p><canvas id="dev-world-map" style="display:block;width:min(100%,800px);height:auto;border:1px solid #4c6570"></canvas><p>Gold: HQ / Outpost · Teal: POIs · Red: patrol routes and territory · Mineral points: deposit tier. Dev build only.</p></main>';
 root.querySelector('#map-seed')!.textContent=`Seed ${seed} · generator ${universe.generatorVersion} · ${universe.width} × ${universe.height} · ${universe.deposits.length} finite deposits`;
 const canvas=root.querySelector<HTMLCanvasElement>('#dev-world-map')!,ctx=canvas.getContext('2d')!;
 canvas.width=800;canvas.height=Math.round(800*universe.height/universe.width);
 const sx=canvas.width/universe.width,sy=canvas.height/universe.height;
 for(let y=0;y<canvas.height;y+=4)for(let x=0;x<canvas.width;x+=4){
  const color=BIOMES[regionAt(seed,(x+2)/sx,(y+2)/sy)].color;
  ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(x,y,4,4);
 }
 ctx.lineWidth=1;ctx.strokeStyle='#48616a';
 for(const rock of universe.deposits){
  ctx.fillStyle='#536471';ctx.beginPath();ctx.arc(rock.x*sx,rock.y*sy,Math.max(2,rock.r*sx),0,Math.PI*2);ctx.fill();
  ctx.fillStyle=MINERALS[mineralForRock(rock.id,rock.x,rock.y,seed)].color;ctx.fillRect(rock.x*sx-1,rock.y*sy-1,2,2);
 }
 for(const p of [universe.hq,universe.outpost]){ctx.strokeStyle='#f5b743';ctx.beginPath();ctx.arc(p.x*sx,p.y*sy,8,0,7);ctx.stroke();}
 ctx.fillStyle='#91d8cc';for(const p of universe.pois){ctx.fillRect(p.x*sx-3,p.y*sy-3,6,6);ctx.fillText(p.name,p.x*sx+7,p.y*sy);}
 for(const site of patrolSites(universe)){
  ctx.strokeStyle='#e75d6155';ctx.beginPath();ctx.arc(site.home.x*sx,site.home.y*sy,site.radius*sx,0,7);ctx.stroke();
  ctx.strokeStyle='#e75d61';ctx.beginPath();site.route.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x*sx,p.y*sy);else ctx.lineTo(p.x*sx,p.y*sy);});ctx.closePath();ctx.stroke();
  ctx.fillStyle='#f3a3ab';ctx.fillText(site.kinds.length+' ships',site.home.x*sx+5,site.home.y*sy);
 }
 ctx.fillStyle='#a2c9e3';ctx.fillText('SILENT CORE',universe.silentCore.x*sx-90,universe.silentCore.y*sy);
}
