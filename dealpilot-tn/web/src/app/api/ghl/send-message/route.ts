import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { sendSmsViaGhl, sendEmailViaGhl } from '@/lib/ghl-messaging'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(()=>({})) as any
    const contactId = body?.contactId
    const type = body?.type
    const message = body?.message
    const subject = body?.subject || ''
    if(!contactId || !type || !message) return NextResponse.json({ error: 'contactId,type,message required' }, { status: 400 })

    let res:any
    if(type==='sms') res = await sendSmsViaGhl(contactId, message)
    else res = await sendEmailViaGhl(contactId, subject, message)

    // log to deal_activity_log table if present
    try{
      await supabase.from('deal_activity_log').insert([{ user_id: user.id, contact_id: contactId, channel: type, message: message, meta: res || null }])
    }catch(e){/* ignore logging errors */}

    return NextResponse.json({ success: true, messageId: res?.id || null })
  }catch(err:any){
    return NextResponse.json({ error: err.message||String(err) }, { status: 500 })
  }
}
