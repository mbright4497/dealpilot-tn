export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { composeMessage } from '@/lib/eva/message-composer'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(()=>({})) as any
    const txId = body.transactionId
    if(!txId) return NextResponse.json({ error: 'transactionId required' }, { status: 400 })

    const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).single()
    if(!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    const dealContext = {
      id: tx.id,
      address: tx.property_address || tx.address || '',
      client_name: tx.client_name || tx.client || '',
      status: tx.status || '',
      closing_date: tx.closing_date || null,
      agent_name: user.user_metadata?.full_name || user.email || 'Your Agent',
      brokerage: 'iHome Team',
    }

    const draft = await composeMessage({ dealContext, contactName: body.contactName || dealContext.client_name, contactRole: body.contactRole || 'buyer', messageType: body.messageType || 'sms', purpose: body.purpose || 'custom', customPrompt: body.customPrompt })

    return NextResponse.json({ ...draft, contactName: body.contactName, messageType: body.messageType })
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
