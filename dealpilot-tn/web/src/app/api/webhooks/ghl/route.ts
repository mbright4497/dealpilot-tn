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

    // Extract common fields (structure may vary by GHL webhook)
    const contactId = payload?.contactId || payload?.contact?.id || payload?.data?.contactId || null
    const typeRaw = (payload?.type || payload?.event || payload?.message?.type || '')
    const type = String(typeRaw).toLowerCase()
    const body = payload?.message?.body || payload?.data?.body || payload?.body || ''
    const direction = (payload?.direction || payload?.message?.direction || 'inbound')
    const locationId = payload?.locationId || payload?.data?.locationId || payload?.location || null

    if (!locationId) return NextResponse.json({ error: 'locationId missing' }, { status: 400 })

    // Find tenant by GHL location id
    const { data: tenants, error: tenantErr } = await supabase.from('tenants').select('*').eq('ghl_location_id', String(locationId)).limit(1)
    if (tenantErr) {
      console.error('Tenant lookup error', tenantErr)
      return NextResponse.json({ error: 'Tenant lookup failed' }, { status: 500 })
    }
    if (!tenants || tenants.length === 0) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    const tenant = tenants[0]

    // Attempt to find matching transaction by recipient/contact info
    // Try matching by contact id in transactions.external_contact_id or by client name
    let dealRow: any = null
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

    const dealId = dealRow ? (dealRow.deal_id || dealRow.id) : null

    // Compose channel
    const channel = type.includes('sms') ? 'ghl_sms' : type.includes('email') ? 'ghl_email' : type.includes('call') ? 'ghl_call' : `ghl_${type}`

    // Insert into deal_communications
    const { data: inserted, error: insertErr } = await supabase.from('deal_communications').insert({
      deal_id: dealId,
      user_id: tenant.owner_user_id,
      comm_type: channel,
      direction: direction || 'inbound',
      recipient: contactIdentifier || null,
      subject: payload?.subject || null,
      body: body || null,
      status: 'received',
      metadata: payload || {},
      created_at: new Date().toISOString()
    }).select().single()

    if (insertErr) {
      console.error('Insert comm error', insertErr)
      return NextResponse.json({ error: 'Failed to save communication' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
