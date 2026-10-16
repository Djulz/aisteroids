export const MAX_SEED=4294967295;
export function parseSeed(value:string):number|null{
 const text=value.trim();
 if(!/^\d+$/.test(text))return null;
 const seed=Number(text);
 return Number.isSafeInteger(seed)&&seed>=0&&seed<=MAX_SEED?seed:null;
}
export function randomSeed(previous:number,draw:()=>number):number{
 for(let i=0;i<4;i++){const value=draw();if(Number.isSafeInteger(value)&&value>=0&&value<=MAX_SEED&&value!==previous)return value;}
 return previous===MAX_SEED?0:previous+1;
}
