import {W,H,HOME,type World} from './sim.ts';
export const VIEW_W=400,VIEW_H=620,MIN_ZOOM=.5,MAX_ZOOM=1.5;
export type Camera={x:number;y:number;zoom:number;follow:boolean;width:number;height:number};
export function newCamera():Camera{return {x:200,y:310,zoom:1,follow:true,width:VIEW_W,height:VIEW_H};}
export function clampCamera(c:Camera){
 c.zoom=Math.max(Math.min(MIN_ZOOM,c.width/W,c.height/H),Math.min(MAX_ZOOM,c.zoom));
 const hw=c.width/c.zoom/2,hh=c.height/c.zoom/2;
 c.x=hw*2>=W?W/2:Math.max(hw,Math.min(W-hw,c.x));
 c.y=hh*2>=H?H/2:Math.max(hh,Math.min(H-hh,c.y));
}
export function screenToWorld(c:Camera,x:number,y:number){return {x:c.x+(x-c.width/2)/c.zoom,y:c.y+(y-c.height/2)/c.zoom};}
export function panCamera(c:Camera,dx:number,dy:number){c.follow=false;c.x-=dx/c.zoom;c.y-=dy/c.zoom;clampCamera(c);}
export function zoomCamera(c:Camera,factor:number){c.zoom*=factor;clampCamera(c);}
export function overview(c:Camera){c.follow=false;c.zoom=Math.min(c.width/W,c.height/H);c.x=W/2;c.y=H/2;clampCamera(c);}
export function followCamera(c:Camera,w:World,dt:number){
 if(!c.follow)return;
 const fleet=w.drones.filter(d=>d.state==='mine'||d.state==='return'||d.state==='unload');
 const targets=fleet.length?fleet:[HOME];
 const x=(Math.min(...targets.map(d=>d.x))+Math.max(...targets.map(d=>d.x)))/2;
 const y=(Math.min(...targets.map(d=>d.y))+Math.max(...targets.map(d=>d.y)))/2;
 // Ease toward the working fleet, never jump between individual incidents.
 const ease=1-Math.exp(-dt*1.8);c.x+=(x-c.x)*ease;c.y+=(y-c.y)*ease;clampCamera(c);
}

export function resizeCamera(c:Camera,width:number,height:number){c.width=VIEW_W;c.height=VIEW_W*height/width;clampCamera(c);}
