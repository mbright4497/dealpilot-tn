export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'
import { resolveGhlConfig, sendViaGhl } from '@/lib/ghl'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const contact_id = body.contact_id || body.contactId
    const deal_id = body.deal_id || body.dealId || null
    const recipient = body.recipient || body.to || ''
    const message = body.message || body.body || ''

    if (!contact_id || !recipient || !message) {
      return NextResponse.json({ error: 'contact_id, recipient, and message are required' }, { status: 400 })
    }

    const supabase = getSupabaseSafe()
    const sentAt = new Date().toISOString()
    const channel = 'sms'

    let status: 'sent' | 'failed' | 'mock' = 'sent'
    let provider = 'ghl'
    let provider_response: any = null
    const config = resolveGhlConfig()

    if (!config) {
      status = 'mock'
      provider = 'mock'
      provider_response = { error: 'GHL credentials not configured' }
    } else {
      try {
        provider_response = await sendViaGhl({ channel: 'sms', to: recipient, message, retries: 2, credentials: config })
      } catch (err: any) {
        status = 'failed'
        provider_response = { error: err.message || 'failed to send SMS', details: err.body || null }
      }
    }

    const payload: any = {
      contact_id,
      deal_id,
      channel,
      recipient,
      body: message,
      status,
      provider,
      provider_response,
      sent_at: sentAt,
    }

    const { data, error } = await supabase.from('communication_log').insert(payload).select().single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, log: data, provider_response, provider, status, connected: !!config })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'invalid request' }, { status: 500 })
  }
}
