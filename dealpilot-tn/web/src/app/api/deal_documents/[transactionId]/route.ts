export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: Request, { params }: { params: { transactionId: string } }){
  try{
    const supabase = createRouteHandlerClient({ cookies })
    const transactionId = Number(params.transactionId)
    const { data, error } = await supabase.from('deal_documents').select('*').eq('deal_id', transactionId).order('uploaded_at', { ascending: false })
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  }catch(err:any){ return NextResponse.json({ error: err.message || String(err) }, { status: 500 }) }
}
