export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    let transactions: any[] = []

    if(SUPABASE_URL && SUPABASE_KEY){
      const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data, error } = await sb.from('transactions').select('id,address,client,binding,closing,status,notes')
      if(data && Array.isArray(data)) transactions = data
    } else {
      transactions = [
        { id:'1', address:'123 Elm St', client:'Alice', binding: new Date(Date.now()+5*24*3600*1000).toISOString(), closing: null, status:'active' },
        { id:'2', address:'45 Oak Ave', client:'Bob', binding: new Date(Date.now()-2*24*3600*1000).toISOString(), closing: null, status:'active' }
      ]
    }

    const counts: Record<string,number> = {}
    for(const t of transactions){ counts[t.status] = (counts[t.status]||0)+1 }

    const today = Date.now()
    // fetch deadlines
    const { data: deadlines } = await sb.from('deal_deadlines').select('deal_id,key,label,date,status')
    const upcoming: any[] = []
    const needsAttention: any[] = []

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

    const message = `Good afternoon! You have ${transactions.length} total deals. ${urgent? `${urgent.address} has a binding deadline in ${urgent.days} days.`: ''} ${risk? `${risk.address} needs attention (${risk.reason}).`: ''} Want me to prioritize your day?`
    const chips = ['Prioritize deals','Generate brief','Export CSV']
    return NextResponse.json({ message, chips })
  }catch(err:any){
    return NextResponse.json({ message: 'EVA briefing unavailable.' , chips: [] }, { status:500 })
  }
}
