export type WorkEstimate={credits:number;pieces:number;travel:number;returnDistance:number;actionSeconds:number;risk:number;focusDistance?:number;peers?:number;areaDistance?:number};
// Expected delivered Credits per second of the whole trip. Cargo capacity and
// finite reserves are supplied as `pieces` by the caller; no rarity bonus cap.
export function workRate(job:WorkEstimate):number{
 if(job.pieces<=0||job.credits<=0)return 0;
 const time=2+job.travel/66+job.actionSeconds+job.returnDistance/82+job.risk;
 const preference=job.focusDistance===undefined?1:1+.38*Math.max(0,1-job.focusDistance/330);
 // Readable local work costs more than its raw flight seconds suggest.
 const locality=1+(job.travel/200)**2+(job.returnDistance/450)**2+((job.areaDistance??0)/180)**2;
 return job.credits*job.pieces/time*preference/(1+(job.peers??0)*.42)/locality;
}
