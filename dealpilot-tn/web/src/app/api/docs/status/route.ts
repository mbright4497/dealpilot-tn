export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(()=>({})) as any
    const documentId = body?.documentId
    const status = body?.status
    if(!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    if(!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

    // attempt to update in documents table first
    let { data, error } = await supabase.from('documents').update({ doc_status: status }).eq('id', documentId).select().single().catch(()=>({ data:null, error: null }))
    if((error && error.message) || !data){
      // fall back to deal_documents
      const res = await supabase.from('deal_documents').update({ status }).eq('id', documentId).select().single().catch(()=>({ data:null, error:null }))
      if(res && res.data) return NextResponse.json(res.data)
      if(res && res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
      return NextResponse.json({ error: 'document not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
