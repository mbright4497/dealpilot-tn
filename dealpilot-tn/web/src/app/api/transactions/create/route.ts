import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json().catch(() => ({})) as any
    const parsed = body || {}
    const fields = parsed.fields || {}

    // map fields
    const contractType = (fields.contractType || '').toLowerCase()
    const buyerNames = Array.isArray(fields.buyerNames) ? fields.buyerNames.join(', ') : (fields.buyerNames || '')
    const sellerNames = Array.isArray(fields.sellerNames) ? fields.sellerNames.join(', ') : (fields.sellerNames || '')

    const txInsert: any = {
      user_id: user?.id || null,
      property_address: fields.propertyAddress || '',
      client_name: contractType === 'buyer' ? buyerNames : sellerNames || buyerNames || '',
      client_type: contractType || 'unknown',
      status: 'active',
      closing_date: fields.closingDate || null,
      purchase_price: fields.purchasePrice ?? null,
      earnest_money: fields.earnestMoney ?? null,
      binding_date: fields.bindingDate || null,
      inspection_end_date: fields.inspectionEndDate || null,
      financing_contingency_date: fields.financingContingencyDate || null,
      special_stipulations: fields.specialStipulations || null,
      buyer_names: buyerNames,
      seller_names: sellerNames,
    }

    const { data: txData, error: txError } = await supabase.from('transactions').insert(txInsert).select().single()
    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

    const txId = txData?.id

    // insert timeline events into deal_events
    const timeline = parsed.timeline || []
    if (Array.isArray(timeline) && timeline.length > 0) {
      const events = timeline.map((t: any) => ({ transaction_id: txId, label: t.label || t.name || 'Event', date: t.date || null, status: t.status || 'pending' }))
      await supabase.from('deal_events').insert(events)
    }

    // insert deal_deadlines for inspection end, financing contingency, closing
    const deadlines: any[] = []
    if (fields.inspectionEndDate) deadlines.push({ transaction_id: txId, label: 'Inspection End', due_date: fields.inspectionEndDate, status: 'pending' })
    if (fields.financingContingencyDate) deadlines.push({ transaction_id: txId, label: 'Financing Contingency', due_date: fields.financingContingencyDate, status: 'pending' })
    if (fields.closingDate) deadlines.push({ transaction_id: txId, label: 'Closing Date', due_date: fields.closingDate, status: 'pending' })
    if (deadlines.length > 0) await supabase.from('deal_deadlines').insert(deadlines)

    return NextResponse.json({ id: txId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
