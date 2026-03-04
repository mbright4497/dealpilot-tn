import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: Request, { params }:{ params:{ id:string } }){
  try{
    const id = params.id
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('document_extractions').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).limit(1).single()
    if(!data) return NextResponse.json({ extraction: null })
    return NextResponse.json({ extraction: data })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
