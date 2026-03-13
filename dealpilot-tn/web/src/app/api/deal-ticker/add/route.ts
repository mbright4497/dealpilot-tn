import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try{
    const body = await req.json()
    const supabase = createServerSupabaseClient()
    const { transactionId, event_type, message, metadata } = body
    const { data, error } = await supabase.from('deal_ticker_events').insert([{ transaction_id: transactionId, event_type: event_type || 'note', message: message || '', metadata: metadata || {} }]).select('*').single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, event: data })
  }catch(e:any){ console.error('deal-ticker add error', e); return NextResponse.json({ error: e?.message||'invalid' }, { status: 400 }) }
}
