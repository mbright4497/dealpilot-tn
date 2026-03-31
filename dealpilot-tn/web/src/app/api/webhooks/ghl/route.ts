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

    // Contact caller ID — search all transactions' contacts JSONB for this phone
    let contactProfile: {
      name: string
      role: string
      email: string | null
      ghl_contact_id: string | null
      dealAddress: string
      dealId: number
      agentUserId: string
    } | null = null

    if (!agentProfile && normalizedFrom) {
      const { data: allTx } = await supabase
        .from('transactions')
        .select('id, address, user_id, contacts')
        .not('contacts', 'is', null)

      if (allTx) {
        for (const tx of allTx) {
          const contacts = Array.isArray(tx.contacts) ? tx.contacts : []
          const match = contacts.find((c: any) => {
            const normalized = (c.phone || '').replace(/\D/g, '').replace(/^1/, '')
            return normalized === normalizedFrom
          })
          if (match) {
            contactProfile = {
              name: match.name,
              role: match.role,
              email: match.email || null,
              ghl_contact_id: match.ghl_contact_id || null,
              dealAddress: tx.address,
              dealId: tx.id,
              agentUserId: tx.user_id,
            }
            break
          }
        }
      }
    }

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
      console.log('[DEBUG] sample contacts:', 
        JSON.stringify(agentTransactions[0]?.contacts))
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

    // Match a transaction row; communications.deal_id references transactions(id)
    const contactIdentifier =
      payload?.contact?.phone ||
      payload?.contact?.email ||
      payload?.contact?.name ||
      payload?.from ||
      payload?.sender ||
      null

    let matchedTx: Record<string, unknown> | null = null

    const txQueryWithOr = (orClause: string) => {
      let q = supabase.from('transactions').select('*').or(orClause).limit(1)
      if (resolvedUserId) q = q.eq('user_id', resolvedUserId)
      return q
    }

    if (contactId) {
      const { data: txs } = await txQueryWithOr(
        `external_contact_id.eq.${contactId},client.ilike.%${contactId}%`
      )
      if (txs?.length) matchedTx = txs[0] as Record<string, unknown>
    }

    if (!matchedTx && contactIdentifier) {
      const likeVal = `%${contactIdentifier}%`
      const { data: txs } = await txQueryWithOr(
        `client.ilike.${likeVal},address.ilike.${likeVal}`
      )
      if (txs?.length) matchedTx = txs[0] as Record<string, unknown>
    }

    if (!matchedTx && contactId) {
      const { data: ds } = await supabase
        .from('deal_state')
        .select('transaction_id')
        .eq('external_contact_id', contactId)
        .limit(1)
      const tid = ds?.[0]?.transaction_id
      const txIdNum =
        typeof tid === 'number'
          ? tid
          : typeof tid === 'string' && /^\d+$/.test(tid)
            ? Number(tid)
            : null
      if (txIdNum != null) {
        let q = supabase.from('transactions').select('*').eq('id', txIdNum).limit(1)
        if (resolvedUserId) q = q.eq('user_id', resolvedUserId)
        const { data: txs } = await q
        if (txs?.length) matchedTx = txs[0] as Record<string, unknown>
      }
    }

    let dealId: number | string | null = null
    if (matchedTx) {
      const id = matchedTx.id
      if (typeof id === 'number' && Number.isFinite(id)) dealId = id
      else if (typeof id === 'string' && /^\d+$/.test(id)) dealId = id
    }

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
      deal_id: dealId ? Number(dealId) : null,
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
            dealId: contactProfile?.dealId || agentTransactions[0]?.id || null,
            userId: contactProfile?.agentUserId || resolvedUserId,
            skipHistory: false,
            agentContext: contactProfile
              ? `CONTACT CONTEXT (from SMS caller ID):
You are currently texting with ${contactProfile.name}, 
the ${contactProfile.role} on ${contactProfile.dealAddress}.
Address them by name. Be warm and helpful.
Their deal ID is ${contactProfile.dealId}.`
              : agentContext,
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
          // Notify the agent that their contact just texted Vera
          if (contactProfile) {
            const { data: agentProfileData } = await supabase
              .from('profiles')
              .select('phone, full_name')
              .eq('id', contactProfile.agentUserId)
              .maybeSingle()

            const agentPhone = agentProfileData?.phone
            if (agentPhone) {
              const notifyMsg = `📬 ${contactProfile.name} (${contactProfile.role}) just texted Vera: "${body.slice(0, 80)}${body.length > 80 ? '...' : ''}"`
              await sendGHLSMS(
                process.env.GHL_API_KEY || '',
                agentPhone,
                process.env.GHL_SMS_NUMBER || '',
                notifyMsg,
                null,
                locationId,
                null
              )
              console.log('[webhook/ghl] Agent notified:', agentPhone, 'about', contactProfile.name)
            }
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
