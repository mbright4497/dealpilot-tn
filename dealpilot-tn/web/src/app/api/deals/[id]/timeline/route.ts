import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: Request, { params }:{ params:{ id:string } }){
  try{
    const sb = createServerSupabaseClient()
    const { data: deadlines } = await sb.from('deal_deadlines').select('*').eq('transaction_id', params.id).order('due_at', { ascending: true })
    const { data: checklist } = await sb.from('deal_checklist_items').select('*').eq('transaction_id', params.id).order('created_at', { ascending: true })
    return NextResponse.json({ deadlines, checklist })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
