import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    // For now use simple supabase client if env available; otherwise mock
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    let count = 0
    let urgentDeal = null
    let riskDeal = null

    if(SUPABASE_URL && SUPABASE_KEY){
      const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data } = await sb.from('transactions').select('id,address,closing,binding,status').eq('status','active').limit(100)
      count = data?.length || 0
      if(count>0){
        urgentDeal = data[0]
        if(data[0].binding) riskDeal = data[0]
      }
    } else {
      // mock data
      count = 3
      urgentDeal = { id:'1', address:'123 Elm St', binding: new Date(Date.now()+5*24*3600*1000).toISOString() }
      riskDeal = { id:'2', address:'45 Oak Ave', binding: new Date(Date.now()-2*24*3600*1000).toISOString() }
    }

    const inDays = urgentDeal && urgentDeal.binding ? Math.ceil((new Date(urgentDeal.binding).getTime()-Date.now())/(1000*60*60*24)) : null
    const message = `Good afternoon! You have ${count} active deals. ${urgentDeal ? `${urgentDeal.address} has a binding date in ${inDays} days.` : ''} ${riskDeal ? `${riskDeal.address} needs attention (binding missed).` : ''} Want me to prioritize your day?`
    const chips = ['Prioritize deals','Generate brief','Export CSV']
    return NextResponse.json({ message, chips })
  }catch(err:any){
    return NextResponse.json({ message: 'EVA briefing unavailable.' , chips: [] }, { status:500 })
  }
}
