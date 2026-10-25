export type HistoryPeriod = 'today' | 'yesterday' | 'week';
export function historyDates(period:HistoryPeriod,now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(name:string)=>Number(parts.find((item)=>item.type===name)?.value);
  const today=Date.UTC(part('year'),part('month')-1,part('day'));
  const date=(offset:number)=>new Date(today+offset*86_400_000).toISOString().slice(0,10);
  return {from:date(period==='week' ? -6 : period==='yesterday' ? -1 : 0),to:date(period==='yesterday' ? -1 : 0)};
}
export const historyTime=(date:string|number)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date));
export const historyDay=(date:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',day:'2-digit',month:'short'}).format(new Date(date));
