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
    const dealId = parseInt(String(body?.dealId), 10)
    if (isNaN(dealId)) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }
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
    console.log(
      '[send] ghl_api_key present:',
      !!profile?.ghl_api_key,
      'last4:',
      profile?.ghl_api_key?.slice(-4)
    )
    const ghlApiKey = profile?.ghl_api_key || (body?.ghlApiKey as string | undefined)
    if (!ghlApiKey) {
      return NextResponse.json({ error: 'Connect GHL in Settings to send communications' }, { status: 400 })
    }

    let contactName = ''
    let contactEmail: string | null = null
    let contactPhone: string | null = null
    let contactRoleLabel = ''

    const { data: tx } = await supabase
      .from('transactions')
      .select('contacts')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .maybeSingle()

    const allContacts = Array.isArray(tx?.contacts)
      ? (tx.contacts as Array<{
          id: string
          name: string
          role: string
          phone: string | null
          email: string | null
          ghl_contact_id?: string | null
        }>)
      : []

    const target = transactionContactId
      ? allContacts.find((c) => c.id === transactionContactId)
      : allContacts.find((c) => c.role?.toLowerCase() === contactRole.toLowerCase())

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

    console.log('[send] ghl_contact_id on target:', target?.ghl_contact_id)
    console.log('[send] contact email:', contactEmail)

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
      const ghlContactId = target.ghl_contact_id ? String(target.ghl_contact_id).trim() : ''
      const fromReva = { email: 'reva@ihomehq.com', name: 'Reva' }
      const fromProfile = {
        email: profile?.email || 'noreply@dealpilot.local',
        name: profile?.full_name || 'DealPilot',
      }
      sendRes = await sendGHLEmail(
        ghlApiKey,
        {
          email: contactEmail!,
          name: contactName || contactRoleLabel,
          ...(ghlContactId ? { ghlContactId } : {}),
        },
        ghlContactId ? fromReva : fromProfile,
        subject,
        message,
        profile?.ghl_location_id
      )
    } else {
      sendRes = await sendGHLSMS(ghlApiKey, contactPhone!, smsFrom, message)
    }
    console.log('[send] sendGHLEmail result:', JSON.stringify(sendRes))
    if (!sendRes.success) return NextResponse.json({ error: `Failed to send ${type} via GHL` }, { status: 502 })

    let comm: { id: string } | null = null
    try {
      const { data: commRow, error: commErr } = await supabase
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
