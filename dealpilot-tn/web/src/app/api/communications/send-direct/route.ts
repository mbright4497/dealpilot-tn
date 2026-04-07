export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLEmail, sendGHLSMS } from '@/lib/ghl/ghlClient'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, dealId, contactName, contactEmail, contactPhone, contactRole, subject, message } = body

    if (!type || !message) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('ghl_api_key, ghl_location_id, full_name')
      .eq('id', user.id)
      .single()

    const ghlApiKey = process.env.GHL_API_KEY || profile?.ghl_api_key || ''
    const locationId = process.env.GHL_LOCATION_ID || profile?.ghl_location_id || ''

    const { data: tx } = await supabase
      .from('transactions')
      .select('address, contacts')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .maybeSingle()

    const dealAddress = tx?.address || `deal #${dealId}`

    // Find ghl_contact_id from transaction contacts if available
    const contacts = Array.isArray(tx?.contacts) ? tx.contacts : []
    const match = contacts.find((c: any) => {
      const r = (c.role || '').toLowerCase()
      const target = (contactRole || '').toLowerCase()
      return r === target || r.includes(target) || target.includes(r)
    })
    const ghlContactId = match?.ghl_contact_id || ''

    let sendRes: { success: boolean; messageId?: string; fromEmail?: string; fromNumber?: string } = { success: false }

    if (type === 'email') {
      const emailSubject = subject || `Update on ${dealAddress}`
      if (ghlContactId && ghlApiKey) {
        sendRes = await sendGHLEmail(
          ghlApiKey,
          { email: contactEmail, name: contactName || contactRole, ghlContactId },
          { email: 'vera@ihomehq.com', name: 'Vera' },
          emailSubject,
          message,
          locationId
        )
      } else {
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) return NextResponse.json({ error: 'No email delivery method available' }, { status: 500 })
        const agentName = profile?.full_name || 'your agent'
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Vera <vera@ihomehq.com>',
            to: [contactEmail],
            subject: emailSubject,
            html: `<p>${message.replace(/\n/g, '<br>')}</p><br><p style="color:#666;font-size:12px">Sent by Vera, Transaction Coordinator for ${agentName}</p>`,
          }),
        })
        if (!emailRes.ok) {
          const err = await emailRes.text()
          return NextResponse.json({ error: `Email delivery failed: ${err}` }, { status: 502 })
        }
        sendRes = { success: true, fromEmail: 'vera@ihomehq.com' }
      }
    } else {
      const smsFrom = process.env.GHL_SMS_NUMBER || ''
      sendRes = await sendGHLSMS(ghlApiKey, contactPhone, smsFrom, message, ghlContactId, locationId)
    }

    if (!sendRes.success) return NextResponse.json({ error: 'Failed to send' }, { status: 502 })

    await supabase.from('transaction_activity').insert({
      transaction_id: Number(dealId),
      user_id: user.id,
      activity_type: type === 'sms' ? 'ghl_sms' : 'ghl_email',
      title: `${type === 'sms' ? 'SMS' : 'Email'} sent to ${contactName || contactRole}`,
      description: message.slice(0, 2000),
      metadata: { channel: type, contact_role: contactRole, triggered_by_reva: true },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
