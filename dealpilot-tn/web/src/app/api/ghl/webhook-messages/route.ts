import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function verifySignature(secret: string | undefined, payload: string, signatureHeader: string | null){
  if(!secret) return false
  if(!signatureHeader) return false
  try{
    const h = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signatureHeader))
  }catch(e){ return false }
}

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    let payload: any = null
    try { payload = raw ? JSON.parse(raw) : null } catch(e){ payload = null }

    const sig = req.headers.get('x-ghl-signature')
    const secret = process.env.GHL_WEBHOOK_SECRET || ''
    if (!verifySignature(secret, raw, sig)) {
      // reject if signature present but invalid; if secret not configured, allow but log
      if (secret) return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      console.warn('GHL webhook received without signature verification (no secret configured)')
    }

    if (!payload) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    // Extract fields
    const eventType = payload?.event || payload?.type || ''
    const data = payload?.data || payload
    const contactId = data?.contactId || data?.contact?.id || data?.fromContactId || null
    const locationId = data?.locationId || data?.location || payload?.locationId || null
    const direction = (data?.direction || payload?.direction || 'inbound')
    const body = data?.body || data?.message || data?.text || ''
    const channelType = (data?.type || payload?.message?.type || '').toLowerCase()

    // Find tenant by locationId
    if (!locationId) return NextResponse.json({ error: 'locationId missing' }, { status: 400 })
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('*').eq('ghl_location_id', String(locationId)).limit(1)
    if (tErr) { console.error('tenant lookup error', tErr); return NextResponse.json({ error: 'tenant lookup failed' }, { status: 500 }) }
    if (!tenants || tenants.length === 0) return NextResponse.json({ error: 'tenant not found' }, { status: 404 })
    const tenant = tenants[0]

    // Attempt to match a deal via transactions
    let dealRow: any = null
    if (contactId) {
      const { data: txs } = await supabase.from('transactions').select('*').or(`external_contact_id.eq.${contactId},client.ilike.%${contactId}%`).limit(1)
      if (txs && txs.length) dealRow = txs[0]
    }
    // fallback try by sender name/email/phone
    if (!dealRow && data?.from) {
      const likeVal = `%${data.from}%`
      const { data: txs } = await supabase.from('transactions').select('*').or(`client.ilike.${likeVal},address.ilike.${likeVal}`).limit(1)
      if (txs && txs.length) dealRow = txs[0]
    }

    const dealId = dealRow ? (dealRow.deal_id || dealRow.id) : null

    // determine comm_type
    const comm_type = channelType.includes('sms') ? 'ghl_sms' : channelType.includes('email') ? 'ghl_email' : channelType.includes('call') ? 'ghl_call' : 'ghl_message'

    const insert = {
      deal_id: dealId,
      user_id: tenant.owner_user_id,
      comm_type,
      direction: direction || 'inbound',
      recipient: data?.from || data?.sender || null,
      subject: data?.subject || null,
      body: body || null,
      status: 'received',
      metadata: payload || {},
      created_at: data?.timestamp || new Date().toISOString()
    }

    const { data: inserted, error: insertErr } = await supabase.from('deal_communications').insert(insert).select().single()
    if (insertErr) { console.error('insert comm error', insertErr); return NextResponse.json({ error: 'failed to save communication' }, { status: 500 }) }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('webhook-messages error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
