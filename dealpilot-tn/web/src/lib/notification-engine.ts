import { createClient } from '@supabase/supabase-js'

export async function getUpcomingDeadlineAlerts(dealId: string, db: any){
  const today = new Date()
  const rows = await db.from('deal_deadlines').select('*').eq('deal_id', dealId)
  const deadlines = (rows.data || []).filter((d: any)=>{
    const due = new Date(d.due_date)
    const diff = Math.ceil((due.getTime()-today.getTime())/(1000*60*60*24))
    return [0,1,3,7].includes(diff)
  }).map((d: any)=>{
    const due = new Date(d.due_date)
    const diff = Math.ceil((due.getTime()-today.getTime())/(1000*60*60*24))
    let alert_level = 'info'
    if(diff<=0) alert_level='critical'
    else if(diff<=1) alert_level='warning'
    return { ...d, days_until: diff, alert_level }
  })
  return deadlines
}

export function formatDeadlineAlert(deadline: any){
  return `${deadline.title || 'Deadline'} due ${deadline.due_date} (${deadline.alert_level.toUpperCase()})`
}
