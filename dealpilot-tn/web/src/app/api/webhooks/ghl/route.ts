export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    // Extract common fields (structure may vary by GHL webhook)
    const contactId = payload?.contactId || payload?.contact?.id || payload?.data?.contactId || null
    const typeRaw = (payload?.type || payload?.event || payload?.message?.type || '')
    const type = String(typeRaw).toLowerCase()
    const body = payload?.message?.body || payload?.data?.body || payload?.body || ''
    const direction = (payload?.direction || payload?.message?.direction || 'inbound')
    const locationId = payload?.locationId || payload?.data?.locationId || payload?.location || null

    if (!locationId) return NextResponse.json({ error: 'locationId missing' }, { status: 400 })

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('ghl_location_id', String(locationId))
      .maybeSingle()

    if (profileErr) {
      console.error('Profile lookup error', profileErr)
      return NextResponse.json({ error: 'Profile lookup failed' }, { status: 500 })
    }

    const userId = profile?.id ?? null

    // Attempt to find matching transaction by recipient/contact info
    // Try matching by contact id in transactions.external_contact_id or by client name
    let dealRow: { deal_id?: number; id?: number } | null = null
    const contactIdentifier = payload?.contact?.phone || payload?.contact?.email || payload?.contact?.name || payload?.from || payload?.sender || null

    // First try matching by transaction.client
    if (contactIdentifier) {
      const likeVal = `%${contactIdentifier}%`
      const { data: txs } = await supabase.from('transactions').select('*').or(`client.ilike.${likeVal},address.ilike.${likeVal}`).limit(1)
      if (txs && txs.length) dealRow = txs[0]
    }

    // Fallback: if contactId provided, try to find deal_state with matching external id
    if (!dealRow && contactId) {
      const { data: ds } = await supabase.from('deal_state').select('*').eq('external_contact_id', contactId).limit(1)
      if (ds && ds.length) dealRow = ds[0]
    }

    const dealId = dealRow ? (dealRow.deal_id || dealRow.id) : null

    // Compose channel
    const channel = type.includes('sms') ? 'ghl_sms' : type.includes('email') ? 'ghl_email' : type.includes('call') ? 'ghl_call' : `ghl_${type}`

    // Insert into communications
    const { error: insertErr } = await supabase.from('communications').insert({
      deal_id: dealId,
      user_id: userId,
      comm_type: channel,
      direction: direction || 'inbound',
      recipient: contactIdentifier || null,
      subject: payload?.subject || null,
      body: body || null,
      status: 'received',
      metadata: payload || {},
      created_at: new Date().toISOString()
    }).select().single()

    if (insertErr) {
      console.error('Insert comm error', insertErr)
      return NextResponse.json({ error: 'Failed to save communication' }, { status: 500 })
    }

    // If inbound SMS, call Reva and reply
    if (direction === 'inbound' && channel === 'ghl_sms' && body && dealId) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealpilot-tn.vercel.app'

        // Call Reva chat with the inbound message
        const revaRes = await fetch(`${appUrl}/api/reva/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.REVA_INTERNAL_SECRET
              ? { 'x-internal-reva-secret': process.env.REVA_INTERNAL_SECRET }
              : {}),
          },
          body: JSON.stringify({
            message: body,
            dealId,
            userId,
            skipHistory: false,
          }),
        })
        const revaJson = await revaRes.json().catch(() => ({}))
        const revaReply = revaJson?.reply || revaJson?.message || null

        if (revaReply) {
          // Find contact phone to reply to
          const fromPhone =
            payload?.contact?.phone || payload?.from || payload?.sender || null

          if (fromPhone) {
            const { sendGHLSMS } = await import('@/lib/ghl/ghlClient')
            await sendGHLSMS(
              process.env.GHL_API_KEY || '',
              fromPhone,
              process.env.GHL_SMS_NUMBER || '',
              revaReply,
              contactId,
              locationId
            )
            console.log('[webhook/ghl] Reva replied via SMS to', fromPhone)
          }
        }
      } catch (revaErr) {
        console.error('[webhook/ghl] Reva reply failed', revaErr)
        // Don't fail the webhook — just log
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
