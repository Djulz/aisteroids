import {W,H} from './geometry.ts';
import type {Point} from './navigation.ts';

export const focusRoles=['mining','scout'] as const;
export type FocusRole=typeof focusRoles[number];
export type Focuses=Record<FocusRole,Point|null>;
export const emptyFocuses=():Focuses=>({mining:null,scout:null});
export const validFocusPoint=(p:unknown):p is Point=>!!p&&typeof p==='object'&&
 Number.isFinite((p as Point).x)&&Number.isFinite((p as Point).y)&&
 (p as Point).x>=0&&(p as Point).x<=W&&(p as Point).y>=0&&(p as Point).y<=H;
export function validFocuses(value:unknown):value is Focuses{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return Object.keys(v).length===focusRoles.length&&focusRoles.every(role=>Object.hasOwn(v,role)&&(v[role]===null||validFocusPoint(v[role])));
}
export function withFocus(focuses:Focuses,role:FocusRole,point:Point|null):Focuses{
 if(point!==null&&!validFocusPoint(point))throw Error('Focus outside the world');
 return {...focuses,[role]:point&&{x:point.x,y:point.y}};
}
// Screen-space offsets keep coincident markers separately tappable at any zoom.
export const markerOffset=(role:FocusRole,overlap:boolean)=>overlap?(role==='mining'?-16:16):0;
export function hitFocus(focuses:Focuses,camera:{x:number;y:number;zoom:number;width:number;height:number},screen:Point):FocusRole|null{
 const overlap=!!focuses.mining&&!!focuses.scout&&Math.hypot(focuses.mining.x-focuses.scout.x,focuses.mining.y-focuses.scout.y)*camera.zoom<32;
 const hits=focusRoles.flatMap(role=>{const p=focuses[role];if(!p)return [];
  const x=camera.width/2+(p.x-camera.x)*camera.zoom+markerOffset(role,overlap),y=camera.height/2+(p.y-camera.y)*camera.zoom;
  return [{role,distance:Math.hypot(screen.x-x,screen.y-y)}];
 }).sort((a,b)=>a.distance-b.distance);
 return hits[0]?.distance<=22?hits[0].role:null;
}
