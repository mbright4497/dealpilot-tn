export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendGHLEmail, sendGHLSMS } from '@/lib/ghl/ghlClient'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const type = body?.type as 'email' | 'sms'
    const dealId = Number(body?.dealId)
    const contactRole = String(body?.contactRole || '')
    const transactionContactId = body?.transactionContactId
      ? String(body.transactionContactId)
      : ''
    const subject = String(body?.subject || '')
    const message = String(body?.message || '')
    const triggeredByReva = body?.triggeredByReva === true

    const { data: profile } = await supabase
      .from('profiles')
      .select('ghl_api_key, ghl_location_id, email, full_name')
      .eq('id', user.id)
      .single()
    const ghlApiKey = profile?.ghl_api_key || (body?.ghlApiKey as string | undefined)
    if (!ghlApiKey) {
      return NextResponse.json({ error: 'Connect GHL in Settings to send communications' }, { status: 400 })
    }

    if (!Number.isFinite(dealId)) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }

    let contactName = ''
    let contactEmail: string | null = null
    let contactPhone: string | null = null
    let contactRoleLabel = ''

    if (transactionContactId) {
      const { data: tc, error: tcErr } = await supabase
        .from('transaction_contacts')
        .select('id, name, email, phone, role')
        .eq('id', transactionContactId)
        .eq('transaction_id', dealId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (tcErr || !tc) {
        return NextResponse.json({ error: 'Contact not found for this transaction' }, { status: 400 })
      }
      contactName = String(tc.name || '').trim()
      contactEmail = tc.email ? String(tc.email).trim() : null
      contactPhone = tc.phone ? String(tc.phone).trim() : null
      contactRoleLabel = String(tc.role || '').trim()
    } else {
      const { data: links } = await supabase
        .from('deal_contacts')
        .select('role,contacts(name,email,phone)')
        .eq('deal_id', dealId)
      const target = (links || []).find(
        (l: { role?: string }) => String(l.role || '').toLowerCase() === contactRole.toLowerCase()
      )
      const contact = target?.contacts as
        | { name?: string | null; email?: string | null; phone?: string | null }
        | undefined
      if (!contact) {
        return NextResponse.json({ error: `No ${contactRole} contact found for this deal` }, { status: 400 })
      }
      contactName = String(contact.name || contactRole || '').trim()
      contactEmail = contact.email ? String(contact.email).trim() : null
      contactPhone = contact.phone ? String(contact.phone).trim() : null
      contactRoleLabel = contactRole
    }

    if (type === 'email' && !contactEmail) {
      return NextResponse.json(
        { error: `${contactRoleLabel || 'Contact'} is missing email` },
        { status: 400 }
      )
    }
    if (type === 'sms' && !contactPhone) {
      return NextResponse.json(
        { error: `${contactRoleLabel || 'Contact'} is missing phone` },
        { status: 400 }
      )
    }

    const smsFrom = String(profile?.ghl_location_id || '').trim()

    let sendRes: {
      success: boolean
      messageId?: string
      fromNumber?: string
      fromEmail?: string
    } = { success: false }
    if (type === 'email') {
      sendRes = await sendGHLEmail(
        ghlApiKey,
        { email: contactEmail!, name: contactName || contactRoleLabel },
        { email: profile?.email || 'noreply@dealpilot.local', name: profile?.full_name || 'DealPilot' },
        subject,
        message
      )
    } else {
      sendRes = await sendGHLSMS(ghlApiKey, contactPhone!, smsFrom, message)
    }
    if (!sendRes.success) return NextResponse.json({ error: `Failed to send ${type} via GHL` }, { status: 502 })

    const { data: comm, error: commErr } = await supabase
      .from('communications')
      .insert({
        deal_id: dealId,
        user_id: user.id,
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
      console.warn('[communications/send] communications insert skipped:', commErr.message)
    }

    const title =
      type === 'sms'
        ? `SMS sent to ${contactName || contactRoleLabel || 'contact'}`
        : `Email sent to ${contactName || contactRoleLabel || 'contact'}`

    const { error: actErr } = await supabase.from('transaction_activity').insert({
      transaction_id: dealId,
      user_id: user.id,
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
