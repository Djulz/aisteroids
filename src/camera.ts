import {W,H,type World} from './sim.ts';
import {CELL,COLS,ROWS,hasCell} from './knowledge.ts';
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
export function zoomAt(c:Camera,factor:number,sx:number,sy:number){
 const before=screenToWorld(c,sx,sy);
 c.zoom*=factor;clampCamera(c);
 c.x=before.x-(sx-c.width/2)/c.zoom;c.y=before.y-(sy-c.height/2)/c.zoom;
 c.follow=false;clampCamera(c);
}
export function moveGesture(c:Camera,oldMid:{x:number;y:number},nextMid:{x:number;y:number},factor:number){
 panCamera(c,nextMid.x-oldMid.x,nextMid.y-oldMid.y);
 zoomAt(c,factor,nextMid.x,nextMid.y);
}
export function overview(c:Camera,w?:World){
 c.follow=false;
 if(!w){c.zoom=Math.min(c.width/W,c.height/H);c.x=W/2;c.y=H/2;clampCamera(c);return;}
 let left=W,right=0,top=H,bottom=0;
 for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
  const x=(col+.5)*CELL,y=(row+.5)*CELL;if(!hasCell(w.explored,x,y))continue;
  left=Math.min(left,col*CELL);right=Math.max(right,(col+1)*CELL);top=Math.min(top,row*CELL);bottom=Math.max(bottom,(row+1)*CELL);
 }
 if(left>=right){left=w.base.x-150;right=w.base.x+150;top=w.base.y-150;bottom=w.base.y+150;}
 c.zoom=Math.min(.75,c.width/(right-left+180),c.height/(bottom-top+180));c.x=(left+right)/2;c.y=(top+bottom)/2;clampCamera(c);
}
export function fleetCenter(w:World){
 const fleet=[...w.drones.filter(d=>d.state==='mine'||d.state==='handoff'||d.state==='return'||d.state==='unload'),...w.haulers.filter(h=>h.state==='work'||h.state==='return'||h.state==='unload')];
 const wrecks=[...w.drones,...w.haulers].filter(d=>d.state==='dead');
 const targets=fleet.length?fleet:wrecks.length===w.drones.length+w.haulers.length?wrecks:[w.base];
 const x=(Math.min(...targets.map(d=>d.x))+Math.max(...targets.map(d=>d.x)))/2;
 const y=(Math.min(...targets.map(d=>d.y))+Math.max(...targets.map(d=>d.y)))/2;
 return {x,y};
}
export function showFollow(c:Camera,w:World,previous=false){
 if(c.follow)return false;
 const target=fleetCenter(w),dx=(target.x-c.x)*c.zoom/c.width,dy=(target.y-c.y)*c.zoom/c.height;
 return Math.hypot(dx,dy)>(previous ? .28 : .42);
}
export function followCamera(c:Camera,w:World,dt:number,returning=false){
 if(!c.follow)return;
 const {x,y}=fleetCenter(w);
 // Ease toward the working fleet, never jump between individual incidents.
 const ease=1-Math.exp(-dt*(returning?8:1.8));c.x+=(x-c.x)*ease;c.y+=(y-c.y)*ease;clampCamera(c);
}

export function resizeCamera(c:Camera,width:number,height:number){c.width=width;c.height=height;clampCamera(c);}
