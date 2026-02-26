import type { Transaction } from '@/app/chat/page'

export type Recommendation = {
  action: string
  reason: string
  urgency: 'low'|'medium'|'high'
  transactionId: number
}

export function getRecommendations(transactions: Transaction[], currentDate: Date = new Date()): Recommendation[]{
  const recs: Recommendation[] = []
  const now = currentDate
  transactions.forEach(t=>{
    if(t.closing){
      const d = new Date(t.closing)
      const days = Math.ceil((d.getTime()-now.getTime())/(1000*60*60*24))
      if(days <= 14){ recs.push({ action: 'Prepare for closing', reason: `Closing in ${days} days`, urgency: days <=3? 'high':'medium', transactionId: t.id }) }
    }
    if(t.binding){
      const b = new Date(t.binding)
      if(b.getTime() < now.getTime() && t.status === 'Pending'){
        recs.push({ action: 'Confirm binding status', reason: 'Binding date passed but status still Pending', urgency: 'high', transactionId: t.id })
      }
    }
    if((t.contacts?.length||0) < 2){
      recs.push({ action: 'Add contacts', reason: 'Fewer than 2 contacts on deal', urgency: 'medium', transactionId: t.id })
    }
  })
  // sort by urgency high->medium->low
  const order = { high: 0, medium: 1, low: 2 }
  recs.sort((a,b)=> order[a.urgency] - order[b.urgency])
  return recs
}
