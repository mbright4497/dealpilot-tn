export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { evaComposeAndSend } from '@/lib/eva/send-hub'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(()=>({})) as any
    const { dealId, contactId, channel, templateKey, customMessage } = body
    if(!dealId || !contactId || !channel || !templateKey) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const res = await evaComposeAndSend(dealId, contactId, channel, templateKey, { customPrompt: customMessage, contactName: body.contactName, contactRole: body.contactRole })
    return NextResponse.json({ success: true, draft: res.draft, sendResult: res.sendResult })
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
