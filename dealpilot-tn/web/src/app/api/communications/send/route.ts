export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'
import { deliverViaGhl } from '../utils'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const contact_id = body.contact_id || body.contactId
    const deal_id = body.deal_id || body.dealId || null
    const channel = (body.channel || 'sms').toLowerCase()
    const recipient = body.recipient || body.to || ''
    const message = body.message || body.body || ''
    const subject = body.subject || ''

    if (!contact_id || !recipient || !message) {
      return NextResponse.json({ error: 'contact_id, recipient, and message are required' }, { status: 400 })
    }

    if (!['sms', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be sms or email' }, { status: 400 })
    }

    const supabase = getSupabaseSafe()
    const sentAt = new Date().toISOString()

    const delivery = await deliverViaGhl({ channel: channel as 'sms' | 'email', recipient, message, subject })

    const payload: any = {
      contact_id,
      deal_id,
      channel,
      recipient,
      subject: channel === 'email' ? subject : null,
      body: message,
      status: delivery.status,
      provider: delivery.provider,
      provider_response: delivery.provider_response,
      sent_at: sentAt,
    }

    const { data, error } = await supabase.from('communication_log').insert(payload).select().single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, log: data, ...delivery })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'invalid request' }, { status: 500 })
  }
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
