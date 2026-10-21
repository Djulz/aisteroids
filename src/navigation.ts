// Coarse route planning plus exact circle/segment checks. Shared by cargo and recall.
export type Point = { x: number; y: number };
export type Obstacle = Point & { r: number; hp: number; id: number };
const CELL = 18;
const SECTOR=100;
const indices=new WeakMap<Obstacle[],Map<string,Obstacle[]>>();
type Masks={signature:string;width:number;height:number;open:Map<string,Uint8Array>};
const routeMasks=new WeakMap<Obstacle[],Masks>();
const diagnostics=new WeakMap<Obstacle[],{calls:number;maskBuilds:number;expanded:number}>();
export const navigationStats=(rocks:Obstacle[])=>({...diagnostics.get(rocks)??{calls:0,maskBuilds:0,expanded:0}});
function spatial(rocks:Obstacle[]){
 let index=indices.get(rocks);if(index)return index;
 index=new Map();for(const r of rocks){
  const span=r.r+12;
  for(let x=Math.floor((r.x-span)/SECTOR);x<=Math.floor((r.x+span)/SECTOR);x++)
   for(let y=Math.floor((r.y-span)/SECTOR);y<=Math.floor((r.y+span)/SECTOR);y++){
    const key=x+':'+y,list=index.get(key)??[];list.push(r);index.set(key,list);
   }
 }
 indices.set(rocks,index);return index;
}
export function clearSegment(a: Point, b: Point, rocks: Obstacle[], ignore = -1, margin = 11) {
 const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
 const index=spatial(rocks);
 const left=Math.floor((Math.min(a.x,b.x)-margin)/SECTOR),right=Math.floor((Math.max(a.x,b.x)+margin)/SECTOR);
 const top=Math.floor((Math.min(a.y,b.y)-margin)/SECTOR),bottom=Math.floor((Math.max(a.y,b.y)+margin)/SECTOR);
 // The index already covers each circle's footprint. No per-edge Set/array.
 for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++)for(const r of index.get(x+':'+y)??[]){
  if(r.hp<=0||r.id===ignore)continue;
  const t=len?Math.max(0,Math.min(1,((r.x-a.x)*dx+(r.y-a.y)*dy)/len)):0;
  if((a.x+dx*t-r.x)**2+(a.y+dy*t-r.y)**2<(r.r+margin)**2)return false;
 }
 return true;
}
export function route(start:Point,goal:Point,rocks:Obstacle[],ignore=-1,width=400,height=620,clearance=11):Point[]{
 let stats=diagnostics.get(rocks);if(!stats){stats={calls:0,maskBuilds:0,expanded:0};diagnostics.set(rocks,stats);}stats.calls++;
 const COLS=Math.floor(width/CELL)-1,ROWS=Math.floor(height/CELL)-1;
 const point=(id:number):Point=>({x:10+(id%COLS)*CELL,y:10+Math.floor(id/COLS)*CELL});
 // A collision settles at radius+8.2, just inside route-grid clearance.
 // Move outward first so grid search cannot strand a ship at an asteroid's edge.
 const near=rocks.find(r=>r.hp>0&&r.id!==ignore&&Math.hypot(start.x-r.x,start.y-r.y)<r.r+clearance+.5);
 if(near){const len=Math.hypot(start.x-near.x,start.y-near.y)||1;const escape={x:near.x+(start.x-near.x)/len*(near.r+clearance+1),y:near.y+(start.y-near.y)/len*(near.r+clearance+1)};
  if(escape.x>=8&&escape.x<=width-8&&escape.y>=8&&escape.y<=height-8&&clearSegment(start,escape,rocks,ignore,8.01))return [escape,...route(escape,goal,rocks,ignore,width,height,clearance)];
 }
 if(clearSegment(start,goal,rocks,ignore,clearance))return [goal];
 const signature=rocks.map(r=>r.hp>0?'1':'0').join('');
 let mask=routeMasks.get(rocks);
 if(!mask||mask.signature!==signature||mask.width!==width||mask.height!==height){
  mask={signature,width,height,open:new Map()};routeMasks.set(rocks,mask);
 }
 const maskKey=`${ignore}:${clearance}`;
 let openCell=mask.open.get(maskKey);
 if(!openCell){
  openCell=new Uint8Array(COLS*ROWS).fill(1);
  // Rasterize only obstacle footprints, not ~19,000 spatial queries per target.
  for(const r of rocks){if(r.hp<=0||r.id===ignore)continue;const radius=r.r+clearance;
   const left=Math.max(0,Math.ceil((r.x-radius-10)/CELL)),right=Math.min(COLS-1,Math.floor((r.x+radius-10)/CELL));
   const top=Math.max(0,Math.ceil((r.y-radius-10)/CELL)),bottom=Math.min(ROWS-1,Math.floor((r.y+radius-10)/CELL));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if((10+x*CELL-r.x)**2+(10+y*CELL-r.y)**2<radius*radius)openCell[y*COLS+x]=0;
  }
  if(mask.open.size>=8)mask.open.delete(mask.open.keys().next().value!);
  mask.open.set(maskKey,openCell);stats.maskBuilds++;
 }else{mask.open.delete(maskKey);mask.open.set(maskKey,openCell);}
 const segmentClearance=clearance>11?clearance:8.1;
 const nearest=(p:Point)=>{
  const cx=Math.max(0,Math.min(COLS-1,Math.round((p.x-10)/CELL))),cy=Math.max(0,Math.min(ROWS-1,Math.round((p.y-10)/CELL)));
  for(let radius=0;radius<=15;radius++){
   let best=-1,bestDist=Infinity;
   for(let y=Math.max(0,cy-radius);y<=Math.min(ROWS-1,cy+radius);y++)for(let x=Math.max(0,cx-radius);x<=Math.min(COLS-1,cx+radius);x++){
    if(radius&&Math.max(Math.abs(x-cx),Math.abs(y-cy))!==radius)continue;
    const id=y*COLS+x;if(!openCell[id])continue;const q=point(id),dist=Math.hypot(q.x-p.x,q.y-p.y);
    if(dist<bestDist&&clearSegment(p,q,rocks,ignore,segmentClearance)){best=id;bestDist=dist;}
   }
   if(best>=0)return best;
  }
  return -1;
 };
 const from=nearest(start),to=nearest(goal);if(from<0||to<0)return [];
 const parent=new Int32Array(openCell.length).fill(-1),cost=new Float64Array(openCell.length).fill(Infinity),closed=new Uint8Array(openCell.length);
 const tx=to%COLS,ty=Math.floor(to/COLS),heuristic=(id:number)=>{const dx=Math.abs(id%COLS-tx),dy=Math.abs(Math.floor(id/COLS)-ty);return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);};
 const heap:{id:number;priority:number}[]=[];
 const less=(a:typeof heap[number],b:typeof heap[number])=>a.priority<b.priority||a.priority===b.priority&&a.id<b.id;
 const push=(id:number,priority:number)=>{const item={id,priority};let i=heap.length;heap.push(item);while(i>0){const p=(i-1)>>1;if(!less(item,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=item;};
 const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],last))break;heap[i]=heap[child];i=child;}heap[i]=last;}return first.id;};
 parent[from]=from;cost[from]=0;push(from,heuristic(from));
 while(heap.length){
  const id=pop();if(closed[id])continue;closed[id]=1;stats.expanded++;
  if(id===to)break;
  const x=id%COLS,y=Math.floor(id/COLS);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[-1,1],[1,1]]){
   const nx=x+dx,ny=y+dy,n=ny*COLS+nx;
   if(nx<0||nx>=COLS||ny<0||ny>=ROWS||!openCell[n]||closed[n])continue;
   const next=cost[id]+(dx&&dy?Math.SQRT2:1);
   if(next>=cost[n]||!clearSegment(point(id),point(n),rocks,ignore,clearance))continue;
   parent[n]=id;cost[n]=next;push(n,next+heuristic(n));
  }
 }
 if(!closed[to])return [];
 const raw:Point[]=[goal];for(let id=to;id!==from;id=parent[id])raw.push(point(id));raw.push(point(from));raw.reverse();
 // Shorten the grid route without cutting through a collision circle.
 const result:Point[]=[];let cursor=start,index=0;
 while(index<raw.length){let far=index;while(far+1<raw.length&&clearSegment(cursor,raw[far+1],rocks,ignore,segmentClearance))far++;result.push(raw[far]);cursor=raw[far];index=far+1;}
 return result;
}
