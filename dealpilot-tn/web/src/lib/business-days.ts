import { TN_HOLIDAYS } from './tn-holidays'

export function isWeekend(d: Date){ const day = d.getDay(); return day===0 || day===6 }

function isHoliday(d: Date){
  const s = d.toISOString().slice(0,10)
  return TN_HOLIDAYS.includes(s)
}

// addDays skips weekends and TN holidays
export function addDays(start: Date, days: number){
  const res = new Date(start)
  let added = 0
  while(added<days){
    res.setDate(res.getDate()+1)
    if(!isWeekend(res) && !isHoliday(res)) added++
  }
  return res
}

