// Internal Reva SMS support
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLEmail, sendGHLSMS } from '@/lib/ghl/ghlClient'

function digitsOnly(phone: string | null | undefined): string {
  return String(phone || '').replace(/\D/g, '')
}

/** Read GHL id from JSONB contact (snake_case or camelCase). */
function ghlIdFromContactRaw(c: Record<string, unknown>): string {
  const a = c.ghl_contact_id
  const b = c.ghlContactId
  const s = (a != null ? String(a) : b != null ? String(b) : '').trim()
  return s
}

/**
 * Prefer id on the resolved contact; if missing, find another party on the same deal
 * with the same normalized phone that has a GHL id.
 */
type DealContact = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  ghl_contact_id?: string | null
  ghlContactId?: string | null
}

function findContactOnDeal(
  contactsRaw: unknown[],
  transactionContactId: string,
  contactRole: string
): DealContact | null {
  const allContacts = contactsRaw as DealContact[]
  if (transactionContactId) {
    const byInternal =
      allContacts.find((c) => c.id === transactionContactId) ?? null
    if (byInternal) return byInternal
    return (
      allContacts.find(
        (c) =>
          (c.ghl_contact_id && c.ghl_contact_id === transactionContactId) ||
          (c.ghlContactId && c.ghlContactId === transactionContactId)
      ) ?? null
    )
  }
  if (contactRole) {
    return (
      allContacts.find(
        (c) => c.role?.toLowerCase() === contactRole.toLowerCase()
      ) ?? null
    )
  }
  return null
}

function resolveGhlContactIdForOutbound(
  target: Record<string, unknown>,
  allRaw: unknown[]
): string | null {
  const direct = ghlIdFromContactRaw(target)
  if (direct) return direct
  const targetDigits = digitsOnly(
    target.phone != null ? String(target.phone) : null
  )
  if (!targetDigits) return null
  for (const item of allRaw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (digitsOnly(o.phone != null ? String(o.phone) : null) !== targetDigits)
      continue
    const id = ghlIdFromContactRaw(o)
    if (id) return id
  }
  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const cookieSupabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await cookieSupabase.auth.getUser()

    const triggeredByReva = body?.triggeredByReva === true
    const internalSecret = req.headers.get('x-internal-reva-secret')
    const expectedSecret = process.env.REVA_INTERNAL_SECRET || ''
    const bodyUserId = body?.userId ? String(body.userId) : ''
    const internalRevaOk =
      Boolean(
        triggeredByReva &&
          expectedSecret &&
          internalSecret === expectedSecret &&
          bodyUserId
      )

    let supabase = cookieSupabase
    let effectiveUserId: string | null = user?.id ?? null

    if (!effectiveUserId && internalRevaOk) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
      if (!url || !key) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      effectiveUserId = bodyUserId
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const type = body?.type as 'email' | 'sms'
    const dealIdRaw = body?.dealId
    const dealIdFromBody =
      dealIdRaw != null && dealIdRaw !== ''
        ? parseInt(String(dealIdRaw), 10)
        : NaN
    const hasValidDealId = Number.isFinite(dealIdFromBody)
    const contactRole = String(body?.contactRole || '')
    const transactionContactId = body?.transactionContactId
      ? String(body.transactionContactId)
      : ''
    const subject = String(body?.subject || '')
    const message = String(body?.message || '')

    type ProfileRow = {
      ghl_api_key?: string | null
      ghl_location_id?: string | null
      email?: string | null
      full_name?: string | null
    } | null

    let profile: ProfileRow = null
    if (!(body?.triggeredByReva && !user)) {
      const { data } = await supabase
        .from('profiles')
        .select('ghl_api_key, ghl_location_id, email, full_name')
        .eq('id', effectiveUserId)
        .single()
      profile = data as ProfileRow
    }

    const ghlApiKey =
      process.env.GHL_API_KEY ||
      (body?.ghlApiKey ? String(body.ghlApiKey) : '') ||
      profile?.ghl_api_key ||
      ''
    const locationId =
      process.env.GHL_LOCATION_ID ||
      (body?.ghlLocationId ? String(body.ghlLocationId) : '') ||
      profile?.ghl_location_id ||
      ''
    const smsFrom =
      process.env.GHL_SMS_NUMBER ||
      (body?.ghlSmsNumber ? String(body.ghlSmsNumber) : '') ||
      profile?.ghl_location_id ||
      ''
    if (!ghlApiKey) {
      return NextResponse.json(
        { error: 'Connect GHL in Settings to send communications' },
        { status: 400 }
      )
    }

    if (!hasValidDealId && !transactionContactId) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }

    let contactName = ''
    let contactEmail: string | null = null
    let contactPhone: string | null = null
    let contactRoleLabel = ''

    let resolvedDealId: number | null = hasValidDealId ? dealIdFromBody : null
    let contactsRaw: unknown[] = []

    if (hasValidDealId) {
      const { data: tx } = await supabase
        .from('transactions')
        .select('contacts')
        .eq('id', dealIdFromBody)
        .eq('user_id', effectiveUserId)
        .maybeSingle()
      contactsRaw = Array.isArray(tx?.contacts) ? tx!.contacts : []
    }

    let target = findContactOnDeal(
      contactsRaw,
      transactionContactId,
      contactRole
    )

    if (!target && transactionContactId) {
      const { data: allTx } = await supabase
        .from('transactions')
        .select('id, contacts')
        .eq('user_id', effectiveUserId)
        .neq('status', 'deleted')

      for (const row of allTx || []) {
        const rowContacts = Array.isArray(row.contacts) ? row.contacts : []
        const hit = findContactOnDeal(
          rowContacts,
          transactionContactId,
          ''
        )
        if (hit) {
          resolvedDealId = row.id
          contactsRaw = rowContacts
          target = hit
          break
        }
      }
    }

    const allContacts = contactsRaw as DealContact[]

    if (resolvedDealId == null) {
      return NextResponse.json(
        { error: 'Could not resolve deal for this contact' },
        { status: 400 }
      )
    }

    if (type === 'sms' && transactionContactId) {
      console.log('[communications/send] SMS transactionContactId resolution', {
        dealId: resolvedDealId,
        dealIdFromRequest: hasValidDealId ? dealIdFromBody : null,
        transactionContactId,
        effectiveUserId,
        transactionRowFound: contactsRaw.length > 0,
        resolvedContact: target
          ? {
              id: target.id,
              name: target.name,
              role: target.role,
              phone: target.phone ?? null,
              email: target.email ?? null,
              ghl_contact_id: target.ghl_contact_id ?? target.ghlContactId ?? null,
            }
          : null,
        contactsOnDeal: allContacts.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
        })),
      })
    }

    if (!target) {
      return NextResponse.json(
        { error: 'Contact not found for this transaction' },
        { status: 400 }
      )
    }

    contactName = target.name || ''
    contactEmail = target.email || null
    contactPhone = target.phone || null
    contactRoleLabel = target.role || ''

    if (type === 'email' && !contactEmail) {
      return NextResponse.json(
        { error: `${contactRoleLabel || 'Contact'} is missing email` },
        { status: 400 }
      )
    }
    const resolvedGhlId = resolveGhlContactIdForOutbound(
      target as unknown as Record<string, unknown>,
      contactsRaw as unknown[]
    )

    if (type === 'email') {
      if (!resolvedGhlId) {
        console.error('[communications/send] outbound email: no ghl_contact_id', {
          dealId: resolvedDealId,
          transactionContactId: transactionContactId || null,
          contactRole: contactRole || null,
          contactName: target.name,
        })
        return NextResponse.json(
          {
            error:
              'Contact is not synced to GHL yet (no ghl_contact_id on this party). Delete and re-add this contact to sync them.',
          },
          { status: 400 }
        )
      }
    }
    if (type === 'sms' && !contactPhone) {
      return NextResponse.json(
        { error: `${contactRoleLabel || 'Contact'} is missing phone` },
        { status: 400 }
      )
    }
    if (type === 'sms' && !resolvedGhlId) {
      console.error('[communications/send] outbound SMS blocked: missing ghl_contact_id', {
        dealId: resolvedDealId,
        transactionContactId: transactionContactId || null,
        contactRole: contactRole || null,
        contactName: contactName || contactRoleLabel,
        contactPhone: contactPhone ? `${digitsOnly(contactPhone).slice(0, 3)}…` : null,
      })
      return NextResponse.json(
        {
          error:
            'Cannot send SMS: this transaction contact has no ghl_contact_id in the deal’s contacts list. Sync the contact to GHL (or ensure ghl_contact_id is stored on that party) before sending.',
        },
        { status: 400 }
      )
    }

    let sendRes: {
      success: boolean
      messageId?: string
      fromNumber?: string
      fromEmail?: string
    } = { success: false }
    if (type === 'email') {
      const fromReva = { email: 'reva@ihomehq.com', name: 'Vera' }
      sendRes = await sendGHLEmail(
        ghlApiKey,
        {
          email: contactEmail!,
          name: contactName || contactRoleLabel,
          ghlContactId: resolvedGhlId!,
        },
        fromReva,
        subject,
        message,
        locationId
      )
    } else {
      sendRes = await sendGHLSMS(
        ghlApiKey,
        contactPhone!,
        smsFrom,
        message,
        resolvedGhlId,
        locationId
      )
    }
    if (!sendRes.success) {
      const detail =
        'error' in sendRes && sendRes.error
          ? sendRes.error
          : `Failed to send ${type} via GHL`
      return NextResponse.json({ error: detail }, { status: 502 })
    }

    let comm: { id: string } | null = null
    try {
      const { data: commRow, error: commErr } = await supabase
        .from('communications')
        .insert({
          deal_id: Number(resolvedDealId),
          user_id: effectiveUserId,
          type,
          direction: 'outbound',
          contact_name: contactName || contactRoleLabel,
          contact_role: contactRoleLabel,
          subject: type === 'email' ? subject : null,
          message,
          status: 'sent',
          triggered_by_reva: triggeredByReva,
          ghl_message_id: sendRes.messageId || null,
        })
        .select('id')
        .single()
      if (commErr) {
        console.warn('[communications/send] communications insert failed:', commErr.message)
      } else {
        comm = commRow
      }
    } catch (commCatch: unknown) {
      console.warn(
        '[communications/send] communications insert failed:',
        commCatch instanceof Error ? commCatch.message : String(commCatch)
      )
    }

    const title =
      type === 'sms'
        ? `SMS sent to ${contactName || contactRoleLabel || 'contact'}`
        : `Email sent to ${contactName || contactRoleLabel || 'contact'}`

    const { error: actErr } = await supabase.from('transaction_activity').insert({
      transaction_id: resolvedDealId,
      user_id: effectiveUserId,
      activity_type: type === 'sms' ? 'ghl_sms' : 'ghl_email',
      title,
      description: message.slice(0, 2000),
      metadata: {
        channel: type,
        contact_role: contactRoleLabel,
        triggered_by_reva: triggeredByReva,
        ghl_message_id: sendRes.messageId || null,
        sent_from_sms: type === 'sms' ? sendRes.fromNumber || smsFrom : null,
        sent_from_email: type === 'email' ? sendRes.fromEmail || profile?.email : null,
      },
    })
    if (actErr) {
      console.error('[communications/send] transaction_activity insert failed:', actErr.message)
    }

    const ghlFromNumber =
      type === 'sms' ? sendRes.fromNumber || smsFrom || null : null
    const sentFromEmail = type === 'email' ? sendRes.fromEmail || profile?.email || null : null

    return NextResponse.json({
      success: true,
      communicationId: comm?.id ?? null,
      ghlFromNumber,
      sentFromEmail,
      activityLogged: !actErr,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
