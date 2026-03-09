export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    const { transactionId, contactId, role } = body || {}
    if(!transactionId || !contactId || !role) return NextResponse.json({ error: 'transactionId, contactId and role required' }, { status: 400 })
    const supabase = createServerSupabaseClient({ request: req as any, response: undefined as any })
    const { data, error } = await supabase.from('deal_contacts').insert({ deal_id: transactionId, contact_id: contactId, role }).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    // return the linked contact for UI
    const { data: contact } = await supabase.from('contacts').select('id,name,email,phone,company,ghl_contact_id').eq('id', contactId).single()
    return NextResponse.json({ saved: true, contact })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status: 500 }) }
}
