export function isWeekend(d: Date){ const day = d.getDay(); return day===0 || day===6 }

// naive addDays skipping weekends; TN holidays handled elsewhere
export function addDays(start: Date, days: number){
  const res = new Date(start)
  let added = 0
  while(added<days){ res.setDate(res.getDate()+1); if(!isWeekend(res)) added++ }
  return res
}
