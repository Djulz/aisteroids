// Coarse route planning plus exact circle/segment checks. Shared by cargo and recall.
export type Point = { x: number; y: number };
export type Obstacle = Point & { r: number; hp: number; id: number };
const CELL = 18;
export function clearSegment(a: Point, b: Point, rocks: Obstacle[], ignore = -1, margin = 11) {
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
 return rocks.every(r=>{
  if(r.hp<=0||r.id===ignore)return true;
  const t=len?Math.max(0,Math.min(1,((r.x-a.x)*dx+(r.y-a.y)*dy)/len)):0;
  return Math.hypot(a.x+dx*t-r.x,a.y+dy*t-r.y)>=r.r+margin;
 });
}
export function route(start:Point,goal:Point,rocks:Obstacle[],ignore=-1,width=400,height=620):Point[]{
 const COLS=Math.floor(width/CELL)-1,ROWS=Math.floor(height/CELL)-1;
 const point=(id:number):Point=>({x:10+(id%COLS)*CELL,y:10+Math.floor(id/COLS)*CELL});
 // A collision settles at radius+8.2, just inside route-grid clearance.
 // Move outward first so grid search cannot strand a ship at an asteroid's edge.
 const near=rocks.find(r=>r.hp>0&&r.id!==ignore&&Math.hypot(start.x-r.x,start.y-r.y)<r.r+11.5);
 if(near){const len=Math.hypot(start.x-near.x,start.y-near.y)||1;const escape={x:near.x+(start.x-near.x)/len*(near.r+12),y:near.y+(start.y-near.y)/len*(near.r+12)};
  if(escape.x>=8&&escape.x<=width-8&&escape.y>=8&&escape.y<=height-8&&clearSegment(start,escape,rocks,ignore,8.01))return [escape,...route(escape,goal,rocks,ignore,width,height)];
 }
 if(clearSegment(start,goal,rocks,ignore))return [goal];
 const openCell=new Uint8Array(COLS*ROWS);
 for(let id=0;id<openCell.length;id++)openCell[id]=+clearSegment(point(id),point(id),rocks,ignore);
 const nearest=(p:Point)=>{let best=-1,bestDist=Infinity;for(let id=0;id<openCell.length;id++){if(!openCell[id])continue;const q=point(id),dist=Math.hypot(q.x-p.x,q.y-p.y);if(dist<bestDist&&clearSegment(p,q,rocks,ignore,8.1)){best=id;bestDist=dist;}}return best;};
 const from=nearest(start),to=nearest(goal);if(from<0||to<0)return [];
 const parent=new Int32Array(openCell.length).fill(-1),queue=[from];parent[from]=from;
 for(let head=0;head<queue.length&&parent[to]<0;head++){
  const id=queue[head],x=id%COLS,y=Math.floor(id/COLS);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[-1,1],[1,1]]){
   const nx=x+dx,ny=y+dy,n=ny*COLS+nx;
   if(nx<0||nx>=COLS||ny<0||ny>=ROWS||!openCell[n]||parent[n]>=0||!clearSegment(point(id),point(n),rocks,ignore))continue;
   parent[n]=id;queue.push(n);
  }
 }
 if(parent[to]<0)return [];
 const raw:Point[]=[goal];for(let id=to;id!==from;id=parent[id])raw.push(point(id));raw.push(point(from));raw.reverse();
 // Shorten the grid route without cutting through a collision circle.
 const result:Point[]=[];let cursor=start,index=0;
 while(index<raw.length){let far=index;while(far+1<raw.length&&clearSegment(cursor,raw[far+1],rocks,ignore,8.1))far++;result.push(raw[far]);cursor=raw[far];index=far+1;}
 return result;
}
