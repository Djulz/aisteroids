import {moveGesture,panCamera,type Camera} from './camera.ts';
export type ScreenPoint={x:number;y:number};
type Contact=ScreenPoint & {startX:number;startY:number;moved:boolean};
export class MapGestures{
 private points=new Map<number,Contact>();
 private suppressTap=false;
 private camera:Camera;
 constructor(camera:Camera){this.camera=camera;}
 down(id:number,p:ScreenPoint){
  this.points.set(id,{...p,startX:p.x,startY:p.y,moved:false});
  if(this.points.size>1)this.suppressTap=true;
 }
 move(id:number,p:ScreenPoint){
  const contact=this.points.get(id);if(!contact)return;
  if(this.points.size===1){
   if(Math.hypot(p.x-contact.startX,p.y-contact.startY)>5)contact.moved=true;
   if(contact.moved)panCamera(this.camera,p.x-contact.x,p.y-contact.y);
  }else if(this.points.size===2){
   const [a,b]=[...this.points.values()],oldMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},oldDist=Math.hypot(a.x-b.x,a.y-b.y);
   contact.x=p.x;contact.y=p.y;
   const nextMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},nextDist=Math.hypot(a.x-b.x,a.y-b.y);
   moveGesture(this.camera,oldMid,nextMid,oldDist>2?nextDist/oldDist:1);
  }
  contact.x=p.x;contact.y=p.y;
 }
 up(id:number,p:ScreenPoint):ScreenPoint|null{
  const contact=this.points.get(id);if(!contact)return null;
  const tap=this.points.size===1&&!this.suppressTap&&!contact.moved&&Math.hypot(p.x-contact.startX,p.y-contact.startY)<6?p:null;
  this.points.delete(id);
  if(this.points.size){this.suppressTap=true;for(const remaining of this.points.values()){remaining.startX=remaining.x;remaining.startY=remaining.y;remaining.moved=true;}}
  else this.suppressTap=false;
  return tap;
 }
 cancel(id:number){this.points.delete(id);if(this.points.size)this.suppressTap=true;else this.suppressTap=false;}
 reset(){this.points.clear();this.suppressTap=false;}
}
