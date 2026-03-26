export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLEmail, sendGHLSMS } from '@/lib/ghl/ghlClient'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const type = body?.type as 'email' | 'sms'
    const dealId = Number(body?.dealId)
    const contactRole = String(body?.contactRole || '')
    const subject = String(body?.subject || '')
    const message = String(body?.message || '')
    const triggeredByReva = body?.triggeredByReva === true

    const { data: profile } = await supabase.from('profiles').select('ghl_api_key, ghl_location_id, email, full_name').eq('id', user.id).single()
    const ghlApiKey = profile?.ghl_api_key || body?.ghlApiKey
    if (!ghlApiKey) {
      return NextResponse.json({ error: 'Connect GHL in Settings to send communications' }, { status: 400 })
    }

    const { data: links } = await supabase.from('deal_contacts').select('role,contacts(name,email,phone)').eq('deal_id', dealId)
    const target = (links || []).find((l: any) => String(l.role || '').toLowerCase() === contactRole.toLowerCase())
    const contact = target?.contacts
    if (!contact) return NextResponse.json({ error: `No ${contactRole} contact found for this deal` }, { status: 400 })
    if (type === 'email' && !contact.email) return NextResponse.json({ error: `${contactRole} contact is missing email` }, { status: 400 })
    if (type === 'sms' && !contact.phone) return NextResponse.json({ error: `${contactRole} contact is missing phone` }, { status: 400 })

    let sendRes: { success: boolean; messageId?: string } = { success: false }
    if (type === 'email') {
      sendRes = await sendGHLEmail(
        ghlApiKey,
        { email: contact.email, name: contact.name || contactRole },
        { email: profile?.email || 'noreply@dealpilot.local', name: profile?.full_name || 'DealPilot' },
        subject,
        message
      )
    } else {
      sendRes = await sendGHLSMS(ghlApiKey, contact.phone, profile?.ghl_location_id || '', message)
    }
    if (!sendRes.success) return NextResponse.json({ error: `Failed to send ${type} via GHL` }, { status: 502 })

    const { data: comm, error: commErr } = await supabase.from('communications').insert({
      deal_id: dealId,
      user_id: user.id,
      type,
      direction: 'outbound',
      contact_name: contact.name || contactRole,
      contact_role: contactRole,
      subject: type === 'email' ? subject : null,
      message,
      status: 'sent',
      triggered_by_reva: triggeredByReva,
      ghl_message_id: sendRes.messageId || null,
    }).select('id').single()
    if (commErr) return NextResponse.json({ error: commErr.message }, { status: 500 })
    return NextResponse.json({ success: true, communicationId: comm.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
