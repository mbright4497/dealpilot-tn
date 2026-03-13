import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('deal_ticker_events').select('*').order('created_at', { ascending: false }).limit(100)
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ events: data || [] })
  }catch(e:any){ console.error('deal-ticker get error', e); return NextResponse.json({ error: e?.message||'failed' }, { status: 500 }) }
}
