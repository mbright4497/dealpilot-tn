export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    let transactions: any[] = []

    let sb: any = null
    if(SUPABASE_URL && SUPABASE_KEY){
      sb = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data, error } = await sb.from('transactions').select('id,address,client,binding,closing,status,notes')
      if(data && Array.isArray(data)) transactions = data
    } else {
      transactions = [
        { id:'1', address:'123 Elm St', client:'Alice', binding: new Date(Date.now()+5*24*3600*1000).toISOString(), closing: null, status:'active' },
        { id:'2', address:'45 Oak Ave', client:'Bob', binding: new Date(Date.now()-2*24*3600*1000).toISOString(), closing: null, status:'active' }
      ]
    }

    // filter out Closed/Cancelled for active count
    const activeTransactions = transactions.filter((t:any)=>{ const s = (t.status||t.current_state||'').toString().toLowerCase(); return s !== 'closed' && s !== 'cancelled' })
    const counts: Record<string,number> = {}
    for(const t of activeTransactions){ counts[t.status || t.current_state || 'active'] = (counts[t.status || t.current_state || 'active']||0)+1 }

    const today = Date.now()
    const upcoming: any[] = []
    const needsAttention: any[] = []
    // fetch deadlines if sb available
    if(sb){
      try{
        const { data: deadlines } = await sb.from('deal_deadlines').select('deal_id,key,label,date,status')
        // we don't strictly need deadlines for now beyond future work
      }catch(e){ /* ignore */ }
    }

    for(const t of transactions){
      if(t.binding){
        const diff = Math.ceil((new Date(t.binding).getTime()-today)/(1000*60*60*24))
        if(diff <=7 && diff >=0) upcoming.push({id:t.id,address:t.address,days:diff,kind:'binding'})
        if(diff < 0) needsAttention.push({id:t.id,address:t.address,reason:'binding missed'})
      }
      // naive missing docs check
      if(!t.notes || t.notes.length<10) needsAttention.push({id:t.id,address:t.address,reason:'missing notes/docs'})
    }

    const urgent = upcoming[0]
    const risk = needsAttention[0]

    // time-aware greeting in America/New_York
    let hour = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })
    hour = String(hour)
    let h = Number(hour.match(/\d+/)?.[0] ?? new Date().getHours())
    let greeting = 'Good afternoon'
    if(h>=5 && h<=11) greeting = 'Good morning'
    else if(h>=12 && h<=17) greeting = 'Good afternoon'
    else if(h>=18 && h<=23) greeting = 'Good evening'
    else greeting = 'Hey there'

    const activeCount = activeTransactions.length
    const message = `${greeting}! You have ${activeCount} active deals. ${urgent? `${urgent.address} has a binding deadline in ${urgent.days} days.`: ''} ${risk? `${risk.address} needs attention (${risk.reason}).`: ''} Want me to prioritize your day?`
    const chips = ['Prioritize deals','Generate brief','Export CSV']
    return NextResponse.json({ message, chips })
  }catch(err:any){
    return NextResponse.json({ message: 'EVA briefing unavailable.' , chips: [] }, { status:500 })
  }
}
