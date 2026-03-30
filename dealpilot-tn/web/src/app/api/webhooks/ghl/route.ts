export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toDealUuid(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return UUID_RE.test(s) ? s : null
}

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
    let dealRow: { deal_id?: string; id?: string } | null = null
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

    const dealId = toDealUuid(dealRow ? (dealRow.deal_id ?? dealRow.id) : null)

    // Compose channel (ghl_* for downstream logic; DB `type` is sms | email | call)
    // GHL may send message type as a number (e.g. 2) instead of the string "SMS"
    const channel =
      type.includes('sms') || type === '2' || type === '1'
        ? 'ghl_sms'
        : type.includes('email') || type === '3'
          ? 'ghl_email'
          : type.includes('call') || type === '4'
            ? 'ghl_call'
            : `ghl_${type}`
    const commType =
      type.includes('sms') ? 'sms' : type.includes('email') ? 'email' : type.includes('call') ? 'call' : 'sms'

    const { error: insertErr } = await supabase.from('communications').insert({
      deal_id: dealId,
      user_id: userId,
      type: commType,
      direction: direction || 'inbound',
      contact_name: payload?.contact?.name || null,
      subject: payload?.subject || null,
      message: body || null,
      status: 'received',
      triggered_by_reva: false,
      created_at: new Date().toISOString(),
    })

    if (insertErr) {
      console.error('Insert comm error', insertErr)
      return NextResponse.json({ error: 'Failed to save communication' }, { status: 500 })
    }
    console.log('[webhook] inbound check:', {
      direction,
      channel,
      hasBody: !!body,
      body: body?.slice(0, 50),
      hasSecret: !!process.env.REVA_INTERNAL_SECRET,
    })

    // If inbound message with body, call Reva and reply (SMS channel or legacy numeric ghl_*)
    if (
      direction === 'inbound' &&
      body &&
      (channel === 'ghl_sms' || channel === 'ghl_2' || channel === 'ghl_1')
    ) {
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
        console.log('[webhook] Reva fetch status:', revaRes.status)
        console.log('[webhook] Reva reply:', revaReply?.slice(0, 100))

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
            console.log('[webhook] SMS reply sent to:', fromPhone)
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
