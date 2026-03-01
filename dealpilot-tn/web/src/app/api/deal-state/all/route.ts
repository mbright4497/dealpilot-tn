import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type LifecycleState =
  | 'draft'
  | 'binding'
  | 'inspection_period'
  | 'post_inspection'
  | 'appraisal_pending'
  | 'clear_to_close'
  | 'closed'
  | 'terminated'

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

const STATE_LABELS: Record<LifecycleState, string> = {
  draft: 'Draft',
  binding: 'Binding',
  inspection_period: 'Inspection Period Active',
  post_inspection: 'Post-Inspection Phase',
  appraisal_pending: 'Appraisal Pending',
  clear_to_close: 'Clear to Close',
  closed: 'Closed',
  terminated: 'Terminated',
}

export async function GET() {
  // 1. Fetch all transactions
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

  // 2. Fetch all deal_state rows in one query
  const dealIds = txns.map((t) => t.id)
  const { data: states } = await supabase
    .from('deal_state')
    .select('*')
    .in('deal_id', dealIds)

  const stateMap = new Map(
    (states || []).map((s) => [s.deal_id, s])
  )

  // 3. Build enriched response
  const results = txns.map((tx) => {
    const ds = stateMap.get(tx.id)
    let lifecycle: LifecycleState = 'draft'
    let timeline: { event: string; date: string }[] = []
    let bindingDate: string | null = null
    let closingDate: string | null = null
    let inspectionEndDate: string | null = null
    let purchasePrice = 0

    if (ds) {
      lifecycle = computeLifecycleState(ds)
      bindingDate = ds.binding_date
      closingDate = ds.closing_date
      inspectionEndDate = ds.inspection_end_date
      purchasePrice = ds.purchase_price || 0

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

      // Update DB if state changed
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
    }

    return {
      id: tx.id,
      address: tx.address,
      client: tx.client,
      type: tx.type,
      current_state: lifecycle,
      state_label: STATE_LABELS[lifecycle],
      binding_date: bindingDate,
      closing_date: closingDate,
      inspection_end_date: inspectionEndDate,
      purchase_price: purchasePrice,
      timeline,
    }
  })

  return NextResponse.json(results)
}
