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

    const fromPhone =
      payload?.from ||
      payload?.phone ||
      payload?.contact_phone ||
      payload?.contact?.phone ||
      payload?.sender ||
      payload?.fromNumber ||
      null

    // Extract common fields (structure may vary by GHL webhook)
    const contactId =
      payload?.contactId ||
      payload?.contact_id ||
      payload?.contact?.id ||
      null
    const typeRaw = (payload?.type || payload?.event || payload?.message?.type || '')
    const type = String(typeRaw).toLowerCase()
    const body = payload?.message?.body || payload?.data?.body || payload?.body || ''
    const direction = (payload?.direction || payload?.message?.direction || 'inbound')
    const rawLocationId =
      payload?.locationId ||
      payload?.location_id ||
      payload?.location ||
      null
    const locationId = typeof rawLocationId === 'object'
      ? rawLocationId?.id || null
      : rawLocationId
    const conversationId =
      payload?.conversationId ||
      payload?.conversation_id ||
      payload?.customData?.conversationId ||
      payload?.triggerData?.conversationId ||
      payload?.workflow?.conversationId ||
      null

    if (!locationId) {
      console.log('[webhook] no locationId in payload')
    }

    let userId: string | null = null
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, ghl_location_id')
      .limit(10)

    // Try matching by ghl_location_id first
    if (profileData && locationId) {
      const match = profileData.find(
        (p) => p.ghl_location_id === String(locationId)
      )
      userId = match?.id || profileData[0]?.id || null
    } else if (profileData?.length) {
      userId = profileData[0].id
    }

    const normalizedFrom = fromPhone
      ? fromPhone.replace(/\D/g, '').replace(/^1/, '')
      : null

    let agentProfile: {
      id: string
      full_name: string | null
      email: string | null
    } | null = null

    if (normalizedFrom) {
      const { data: profileByPhone } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('phone', `%${normalizedFrom}%`)
        .maybeSingle()
      agentProfile = profileByPhone
    }

    const resolvedUserId = agentProfile?.id || userId

    let agentTransactions: Array<{
      id: number
      address: string
      client: string
      phase: string
      closing_date: string | null
      contacts: unknown
    }> = []

    if (resolvedUserId) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('id, address, client, phase, closing_date, contacts')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(10)
      agentTransactions = txs || []
    }

    const agentContext = agentProfile
      ? `AGENT CONTEXT (from SMS caller ID):
You are currently texting with ${agentProfile.full_name}, 
a licensed Tennessee real estate agent.

THEIR ACTIVE TRANSACTIONS:
${
  agentTransactions.length === 0
    ? 'No active transactions found.'
    : agentTransactions
        .map((t) => {
          const contacts = Array.isArray(t.contacts)
            ? t.contacts
                .map(
                  (c: {
                    name?: string
                    role?: string
                    phone?: string
                    email?: string
                    ghl_contact_id?: string
                  }) =>
                    `${c.name} (${c.role}) - ${c.phone || 'no phone'} - ${c.email || 'no email'} - GHL ID: ${c.ghl_contact_id || 'not synced'}`
                )
                .join(', ')
            : 'none'
          return `- Deal ID: ${t.id} | ${t.address} | Client: ${t.client} | Phase: ${t.phase} | Closing: ${t.closing_date || 'TBD'} | Contacts: ${contacts}`
        })
        .join('\n')
}

When the agent asks you to contact someone on a deal,
use the contact details above to execute REVA_ACTION.
You can send SMS and email to any contact listed above.
Always confirm the message before sending.`
      : null

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
    })

    // If inbound message with body, call Reva and reply (SMS channel or legacy numeric ghl_*)
    if (
      direction === 'inbound' &&
      body &&
      (channel === 'ghl_sms' || channel === 'ghl_2' || channel === 'ghl_1')
    ) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealpilot-tn.vercel.app'

        let smsThreadId: string | null = null
        if (fromPhone) {
          const { data: threadRow } = await supabase
            .from('reva_sms_threads')
            .select('thread_id')
            .eq('phone', fromPhone)
            .maybeSingle()
          smsThreadId = threadRow?.thread_id || null
        }

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
            dealId: agentTransactions[0]?.id || null,
            userId: resolvedUserId,
            skipHistory: false,
            agentContext,
            threadId: smsThreadId,
          }),
        })
        const revaJson = await revaRes.json().catch(() => ({}))
        const revaReply = revaJson?.reply || revaJson?.message || null

        const returnedThreadId = revaJson?.threadId || null
        if (fromPhone && returnedThreadId) {
          await supabase
            .from('reva_sms_threads')
            .upsert(
              {
                phone: fromPhone,
                thread_id: returnedThreadId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'phone' }
            )
        }

        if (revaReply && (fromPhone || contactId)) {
          const { sendGHLSMS } = await import('@/lib/ghl/ghlClient')
          // Look up conversationId from GHL if not in payload
          let resolvedConversationId = conversationId
          if (!resolvedConversationId && contactId && locationId) {
            const { getGHLConversation } = await import('@/lib/ghl/ghlClient')
            resolvedConversationId = await getGHLConversation(
              process.env.GHL_API_KEY || '',
              contactId,
              locationId
            )
          }
          await sendGHLSMS(
            process.env.GHL_API_KEY || '',
            fromPhone || '',
            process.env.GHL_SMS_NUMBER || '',
            revaReply,
            contactId,
            locationId,
            resolvedConversationId
          )
          console.log(
            '[webhook/ghl] Reva replied via SMS to',
            fromPhone || '(contactId only)'
          )
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
