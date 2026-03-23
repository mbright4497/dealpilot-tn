export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { CommDeliveryResult, CommChannel, deliverViaGhl } from '../utils'
import { getSupabaseSafe } from '@/lib/supabase'

const VALID_CHANNELS: CommChannel[] = ['sms', 'email']

const safeInsert = async (supabase: any, table: string, payload: any) => {
  try {
    if (!supabase || typeof supabase.from !== 'function') throw new Error('supabase not initialized')
    return await supabase.from(table).insert(payload).select('*').single()
  } catch (err: any) {
    console.warn(`[communications.send] ${table} insert failed`, err?.message || err)
    return { data: null, error: err }
  }
}

const safeUpdate = async (supabase: any, table: string, id: string | null | undefined, payload: any) => {
  if (!id) return
  try {
    if (!supabase || typeof supabase.from !== 'function') throw new Error('supabase not initialized')
    await supabase.from(table).update(payload).eq('id', id)
  } catch (err: any) {
    console.warn(`[communications.send] ${table} update failed`, err?.message || err)
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any))
  const draft = body.draft || {}
  const contact_id = body.contact_id || body.contactId || draft.contact_id || draft.contactId || null
  const deal_id = body.deal_id || body.dealId || draft.deal_id || draft.dealId || null
  const channel = (body.channel || draft.channel || 'email').toLowerCase() as CommChannel
  const recipient = (body.recipient || body.to || draft.to || '').trim()
  const message = (body.message || body.body || draft.body || '').trim()
  const subject = (body.subject || draft.subject || '').trim()
  const rawMetadata = body.metadata || body.meta
  const metadata = rawMetadata && typeof rawMetadata === 'object' ? rawMetadata : {}
  const queueOnly = body.queueOnly === true || body.queue_only === true
  const skipDelivery = body.skipDelivery === true || body.no_delivery === true
  const shouldDeliver = !queueOnly && !skipDelivery

  if (!recipient || !message) {
    return NextResponse.json({ error: 'recipient and message/body are required' }, { status: 400 })
  }
  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'channel must be sms or email' }, { status: 400 })
  }

  const supabase = getSupabaseSafe()
  const queuedAt = new Date().toISOString()
  const queuePayload = {
    deal_id,
    contact_id,
    channel,
    to_address: recipient,
    subject: channel === 'email' ? subject : null,
    body: message,
    metadata,
    status: 'queued',
    queued_at: queuedAt,
    attempts: 0,
  }

  const queueResult = await safeInsert(supabase, 'communication_queue', queuePayload)
  const queueRow = queueResult.data || null
  const queueId = queueRow?.id || null

  const logPayload: any = {
    deal_id,
    contact_id,
    channel,
    recipient,
    subject: channel === 'email' ? subject : null,
    body: message,
    status: 'queued',
    queue_id: queueId,
    provider: 'queue',
    provider_response: null,
    created_at: queuedAt,
  }

  const logResult = await safeInsert(supabase, 'communication_log', logPayload)
  const logRow = logResult.data || null

  const responseBody: any = { ok: true, queue: queueRow, log: logRow }

  if (shouldDeliver) {
    const delivery: CommDeliveryResult = await deliverViaGhl({
      channel,
      recipient,
      message,
      subject,
    })
    const status = delivery.status === 'sent' ? 'sent' : 'failed'
    const sentAt = new Date().toISOString()
    responseBody.delivery = delivery

    await safeUpdate(supabase, 'communication_queue', queueId, {
      status,
      provider: delivery.provider,
      provider_response: delivery.provider_response,
      sent_at: sentAt,
      attempts: (queueRow?.attempts || 0) + 1,
      last_error: status === 'failed' ? (delivery.provider_response?.error || 'delivery failed') : null,
    })

    await safeUpdate(supabase, 'communication_log', logRow?.id, {
      status,
      provider: delivery.provider,
      provider_response: delivery.provider_response,
      sent_at: sentAt,
    })
  }

  return NextResponse.json(responseBody)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const contactId = url.searchParams.get('contact_id')
  const dealId = url.searchParams.get('deal_id')
  if (!contactId) return NextResponse.json({ error: 'missing contact_id' }, { status: 400 })

  const supabase = getSupabaseSafe()
  let query = supabase.from('communication_log').select('*').eq('contact_id', contactId)
  if (dealId) query = query.eq('deal_id', dealId)
  query = query.order('created_at', { ascending: true })
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, history: data })
}
