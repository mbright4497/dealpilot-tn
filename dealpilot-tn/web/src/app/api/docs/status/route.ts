import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(()=>({})) as any
    const documentId = body?.documentId
    const status = body?.status
    if(!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    if(!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

    const { data, error } = await supabase.from('documents').update({ doc_status: status }).eq('id', documentId).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
