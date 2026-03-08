export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: Request, { params }:{ params:{ id:string } }){
  try{
    const sb = createServerSupabaseClient()
    const { data } = await sb.from('eva_daily_runs').select('*').eq('transaction_id', params.id).order('run_at', { ascending: false }).limit(1).single()
    return NextResponse.json({ latest: data || null })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
