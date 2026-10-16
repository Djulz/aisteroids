import {drawRock,drawShip} from './art.ts';

// A fixed presentation scene. These coordinates never derive from a company
// seed, and no World or simulation RNG is created for the menu.
const stones:[number,number,number][]= [
 [-.03,.22,35],[.10,.08,33],[.44,.05,11],[.71,.10,9],[.96,.03,45],
 [.84,.25,34],[.26,.32,28],[.61,.31,17],[-.04,.39,27],[.04,.53,48],
 [.39,.49,12],[.53,.40,31],[.84,.48,21],[1.02,.47,32],
 [.19,.66,10],[.88,.67,13],[.37,.78,22],[-.05,.84,30],[.98,.88,35],
];
const shape=[.84,.93,.79,.95,.86,.91,.77,.96,.82,.94,.80];
const rocks=stones.map(([, ,r],id)=>({id,x:0,y:0,r,hp:1,max:1,shape}));
const drones:[number,number,number][]=[[-.05,.24,.2],[.92,.36,2.8],[.20,.73,-.7]];

export function mountMenuScene(canvas:HTMLCanvasElement,reduced:boolean):()=>void{
 const ctx=canvas.getContext('2d')!;
 let frame=0,disposed=false,drawnAt=0;
 const draw=(time=0)=>{
  if(disposed)return;
  const bounds=canvas.getBoundingClientRect(),w=bounds.width,h=bounds.height;
  if(!w||!h)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const pixelsW=Math.round(w*dpr),pixelsH=Math.round(h*dpr);
  if(canvas.width!==pixelsW||canvas.height!==pixelsH){canvas.width=pixelsW;canvas.height=pixelsH;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#071722';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#42616a18';ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<w;x+=42){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,h);}
  for(let y=0;y<h;y+=42){ctx.moveTo(0,y+.5);ctx.lineTo(w,y+.5);}
  ctx.stroke();
  // Restrained lower-corner variation, behind the artwork and controls.
  ctx.fillStyle='#10242b66';ctx.beginPath();ctx.moveTo(0,h*.79);ctx.lineTo(w*.19,h*.9);ctx.lineTo(0,h);ctx.fill();
  const scale=Math.min(1.4,Math.max(.8,w/390));
  for(const rock of rocks){
   const drift=reduced?0:Math.sin(time*.12+rock.id*2)*3;
   rock.x=stones[rock.id][0]*w+drift;
   rock.y=stones[rock.id][1]*h+Math.cos(time*.1+rock.id)*drift;
   rock.r=stones[rock.id][2]*scale;
   drawRock(ctx,rock,1);
  }
  drones.forEach(([x,y,heading],i)=>{
   const t=reduced?0:time;
   const px=x*w+Math.sin(t*.37+i)*13,py=y*h+Math.cos(t*.31+i)*10;
   const angle=heading+Math.PI/2;
   if(!reduced){
    ctx.fillStyle='#d99230';
    for(let j=1;j<=3;j++){
     const distance=18+j*11+((t*12)%11);
     ctx.globalAlpha=.46-j*.1;
     ctx.fillRect(px-Math.cos(angle)*distance,py-Math.sin(angle)*distance,3,3);
    }
    ctx.globalAlpha=1;
   }
   drawShip(ctx,'impactMiner',px,py,heading,{time:t,thrust:!reduced});
  });
 };
 const tick=(now:number)=>{if(disposed||document.hidden)return;if(now-drawnAt>=33){draw(now/1000);drawnAt=now;}frame=requestAnimationFrame(tick);};
 const visibility=()=>{cancelAnimationFrame(frame);if(!document.hidden){if(reduced)draw();else frame=requestAnimationFrame(tick);}};
 const resize=()=>{if(reduced||document.hidden)draw();};
 document.addEventListener('visibilitychange',visibility);
 window.addEventListener('resize',resize);
 if(reduced||document.hidden)draw();else frame=requestAnimationFrame(tick);
 return ()=>{disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);};
}
