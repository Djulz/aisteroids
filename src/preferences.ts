export const MOTION_KEY='rock-bottom-robotics-reduce-motion';
export type MotionChoice='system'|'reduce'|'full';
export function readMotion(store:Pick<Storage,'getItem'>):MotionChoice{
 const value=store.getItem(MOTION_KEY);
 return value==='reduce'||value==='full'?value:'system';
}
export function reducedMotion(choice:MotionChoice,systemReduced:boolean){
 return choice==='system'?systemReduced:choice==='reduce';
}
export function saveMotion(store:Pick<Storage,'setItem'>,choice:MotionChoice):boolean{
 try{store.setItem(MOTION_KEY,choice);return true;}catch{return false;}
}
