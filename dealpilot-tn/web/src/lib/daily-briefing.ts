import type { Transaction } from '@/app/chat/page'

export type DailyBrief = {
  greeting: string
  activeDeals: number
  criticalDeadlines: { transactionId: number; type: string; date: string }[]
  pendingConfirmations: number
  upcomingClosings: { transactionId: number; date: string }[]
  riskAlerts: string[]
  recommendedAction: string
  urgencyLevel: 'green'|'yellow'|'red'
}

export function generateDailyBrief(userName: string, transactions: Transaction[], currentDate: Date = new Date()): DailyBrief{
  const activeDeals = transactions.filter(t=> t.status === 'Active' || t.status === 'Pending').length
  const criticalDeadlines: { transactionId:number; type:string; date:string }[] = []
  const upcomingClosings: { transactionId:number; date:string }[] = []
  const riskAlerts: string[] = []
  let pendingConfirmations = 0

  const now = currentDate
  const within = (dStr?: string, days=0)=>{
    if(!dStr) return false
    const d = new Date(dStr)
    const diff = (d.getTime() - now.getTime()) / (1000*60*60*24)
    return diff <= days && diff >= 0
  }

  transactions.forEach(t=>{
    if(t.contacts?.length === 0) riskAlerts.push(`Deal ${t.id} has no contacts`)
    if(within(t.binding,2)) criticalDeadlines.push({transactionId:t.id,type:'binding',date:t.binding})
    if(within(t.closing,2)) criticalDeadlines.push({transactionId:t.id,type:'closing',date:t.closing})
    if(within(t.closing,7)) upcomingClosings.push({transactionId:t.id,date:t.closing})
    if(t.status==='Pending' && t.closing){
      const closingDate = new Date(t.closing)
      const daysToClose = Math.ceil((closingDate.getTime()-now.getTime())/(1000*60*60*24))
      if(daysToClose < 14) riskAlerts.push(`Deal ${t.id} closing in ${daysToClose} days but still Pending`)
    }
    if(t.status==='Pending') pendingConfirmations++
  })

  let urgency: 'green'|'yellow'|'red' = 'green'
  if(criticalDeadlines.length>0 || riskAlerts.length>0) urgency = criticalDeadlines.length>0 ? 'red' : 'yellow'

  const recommendedAction = criticalDeadlines.length>0 ? `Call contacts for deal ${criticalDeadlines[0].transactionId} about ${criticalDeadlines[0].type}` : (riskAlerts.length>0? `Investigate: ${riskAlerts[0]}` : 'No immediate action')

  // Determine greeting based on Eastern time
  const easternNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = easternNow.getHours()
  const greeting = hour < 12 ? `Good morning, ${userName}` : hour < 17 ? `Good afternoon, ${userName}` : hour < 21 ? `Good evening, ${userName}` : `It's getting late but let's catch up, ${userName}`

  return {
    greeting,
    activeDeals,
    criticalDeadlines,
    pendingConfirmations,
    upcomingClosings,
    riskAlerts,
    recommendedAction,
    urgencyLevel: urgency
  }
}
