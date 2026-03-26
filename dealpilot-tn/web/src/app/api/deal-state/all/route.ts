import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export const dynamic = 'force-dynamic'

type LifecycleState =
  | 'draft'
  | 'binding'
  | 'inspection_period'
  | 'post_inspection'
  | 'closed'

function computeLifecycleState(row: {
  binding_date: string | null
  inspection_end_date: string | null
  closing_date: string | null
}): LifecycleState {
  if (!row.binding_date) return 'draft'
  const today = new Date().toISOString().split('T')[0]
  if (row.inspection_end_date && today <= row.inspection_end_date)
    return 'inspection_period'
  if (
    row.inspection_end_date &&
    row.closing_date &&
    today > row.inspection_end_date &&
    today < row.closing_date
  )
    return 'post_inspection'
  if (row.closing_date && today >= row.closing_date)
    return 'closed'
  return 'binding'
}

function validateLifecycleIntegrity(row: {
  binding_date: string | null
  inspection_end_date: string | null
  closing_date: string | null
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (row.binding_date && !row.inspection_end_date) {
    errors.push('Missing inspection_end_date')
  }
  if (row.inspection_end_date && !row.binding_date) {
    errors.push('Inspection date without binding')
  }
  if (row.closing_date && !row.binding_date) {
    errors.push('Closing date without binding')
  }
  if (
    row.inspection_end_date &&
    row.closing_date &&
    row.inspection_end_date > row.closing_date
  ) {
    errors.push('Inspection ends after closing')
  }
  if (
    row.closing_date &&
    row.binding_date &&
    row.closing_date < row.binding_date
  ) {
    errors.push('Closing before binding')
  }

  return { valid: errors.length === 0, errors }
}

const STATE_LABELS: Record<LifecycleState, string> = {
  draft: 'Draft',
  binding: 'Binding',
  inspection_period: 'Inspection Period Active',
  post_inspection: 'Post-Inspection Phase',
  closed: 'Closed',
}

export async function GET() {
  const supabase = getSupabase()
  const { data: txns, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .order('id')

  if (txErr) {
    return NextResponse.json(
      { error: txErr.message },
      { status: 500 }
    )
  }
  if (!txns || txns.length === 0) {
    return NextResponse.json([])
  }

  // Filter out ghost transactions that have neither address nor client
  const filtered = txns.filter(t => (t.address && String(t.address).trim()) || (t.client && String(t.client).trim()))
  if (filtered.length === 0) return NextResponse.json([])

  const dealIds = filtered.map((t) => t.id)
  const { data: states } = await supabase
    .from('deal_state')
    .select('*')
    .in('deal_id', dealIds)

  const stateMap = new Map(
    (states || []).map((s) => [s.deal_id, s])
  )

  const results = filtered.map((tx) => {
    const ds = stateMap.get(tx.id)
    let lifecycle: LifecycleState = 'draft'
    let timeline: { event: string; date: string }[] = []
    let bindingDate: string | null = null
    let closingDate: string | null = null
    let inspectionEndDate: string | null = null
    let purchasePrice = 0
    let integrity = { valid: true, errors: [] as string[] }
    // additional fields from transactions table
    let buyer_names: string | null = (tx as any).buyer_names || null
    let seller_names: string | null = (tx as any).seller_names || null
    let earnest_money: number | null = (tx as any).earnest_money || null
    let value: any = (tx as any).value || null

    if (ds) {
      lifecycle = computeLifecycleState(ds)
      // prefer deal_state values but fall back to transactions table fields
      bindingDate = ds.binding_date || (tx as any).binding || null
      closingDate = ds.closing_date || (tx as any).closing || null
      inspectionEndDate = ds.inspection_end_date || (tx as any).inspection_end_date || null
      purchasePrice = (tx as any).purchase_price || ds.purchase_price || (tx as any).value || 0
      buyer_names = ds.buyer_names || buyer_names
      seller_names = ds.seller_names || seller_names
      earnest_money = ds.earnest_money || earnest_money
      value = ds.value || value

      // Run lifecycle integrity validation
      integrity = validateLifecycleIntegrity(ds)

      // Flag mismatch between computed lifecycle from timeline and stored current_state
      if (ds.current_state && ds.current_state !== lifecycle) {
        integrity.valid = false
        integrity.errors.push(`State mismatch: current_state is '${ds.current_state}' but timeline implies '${lifecycle}'`)
      }

      if (ds.inspection_end_date) {
        timeline.push({
          event: 'Inspection Ends',
          date: ds.inspection_end_date,
        })
      }
      if (ds.closing_date) {
        timeline.push({
          event: 'Closing Date',
          date: ds.closing_date,
        })
      }
      timeline.sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      )

      // If mismatch, update stored current_state to computed lifecycle
      if (lifecycle !== ds.current_state) {
        supabase
          .from('deal_state')
          .update({
            current_state: lifecycle,
            updated_at: new Date().toISOString(),
          })
          .eq('deal_id', tx.id)
          .then()
      }
    } else {
      // No deal_state row — fallback entirely to transactions table
      bindingDate = (tx as any).binding || null
      closingDate = (tx as any).closing || null
      inspectionEndDate = (tx as any).inspection_end_date || null
      purchasePrice = (tx as any).purchase_price || (tx as any).value || 0
      lifecycle = computeLifecycleState({ binding_date: bindingDate, inspection_end_date: inspectionEndDate, closing_date: closingDate })
      // build timeline from transaction fields
      if (inspectionEndDate) timeline.push({ event: 'Inspection Ends', date: inspectionEndDate })
      if (closingDate) timeline.push({ event: 'Closing Date', date: closingDate })
      timeline.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return {
      id: tx.id,
      address: tx.address,
      client: tx.client,
      type: tx.type,
      status: tx.status || null,
      notes: tx.notes || null,
      contacts: tx.contacts || [],
      current_state: lifecycle,
      state_label: STATE_LABELS[lifecycle],
      binding_date: bindingDate,
      closing_date: closingDate,
      inspection_end_date: inspectionEndDate,
      purchase_price: purchasePrice,
      buyer_names: buyer_names,
      seller_names: seller_names,
      earnest_money: earnest_money,
      value: value,
      timeline,
      lifecycle_integrity: integrity,
    }
  })

  return NextResponse.json(results)
}
