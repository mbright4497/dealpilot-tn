export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'
import { deliverViaGhl } from '../utils'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const contact_id = body.contact_id || body.contactId
    const deal_id = body.deal_id || body.dealId || null
    const recipient = body.recipient || body.to || ''
    const message = body.message || body.body || ''
    const subject = body.subject || ''

    if (!contact_id || !recipient || !message) {
      return NextResponse.json({ error: 'contact_id, recipient, and message are required' }, { status: 400 })
    }

    const supabase = getSupabaseSafe()
    const sentAt = new Date().toISOString()

    const delivery = await deliverViaGhl({ channel: 'email', recipient, message, subject })

    const payload: any = {
      contact_id,
      deal_id,
      channel: 'email',
      recipient,
      subject,
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
