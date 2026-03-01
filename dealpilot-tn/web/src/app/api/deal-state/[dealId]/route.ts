import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Phase 2: Allowed lifecycle states
const ALLOWED_STATES = [
  'draft',
  'binding',
  'inspection_period',
  'post_inspection',
  'appraisal_pending',
  'clear_to_close',
  'closed',
  'terminated',
] as const

type LifecycleState = typeof ALLOWED_STATES[number]

// Phase 2: Deterministic state computation
function computeLifecycleState(row: {
  binding_date: string | null
  inspection_end_date: string | null
  closing_date: string | null
}): LifecycleState {
  if (!row.binding_date) return 'draft'

  const today = new Date().toISOString().split('T')[0]

  if (
    row.inspection_end_date &&
    today <= row.inspection_end_date
  ) {
    return 'inspection_period'
  }

  if (
    row.inspection_end_date &&
    row.closing_date &&
    today > row.inspection_end_date &&
    today < row.closing_date
  ) {
    return 'post_inspection'
  }

  if (row.closing_date && today >= row.closing_date) {
    return 'closed'
  }

  return 'binding'
}

// Phase 2: Build derived timeline
function buildTimeline(row: {
  inspection_end_date: string | null
  closing_date: string | null
}) {
  const timeline: { event: string; date: string }[] = []
  if (row.inspection_end_date) {
    timeline.push({
      event: 'Inspection Ends',
      date: row.inspection_end_date,
    })
  }
  if (row.closing_date) {
    timeline.push({
      event: 'Closing Date',
      date: row.closing_date,
    })
  }
  return timeline
}

export async function GET(
  req: Request,
  { params }: { params: { dealId: string } }
) {
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) {
    return NextResponse.json(
      { error: 'Invalid deal_id' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('deal_state')
    .select('*')
    .eq('deal_id', dealId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Deal state not found', details: error?.message },
      { status: 404 }
    )
  }

  // Phase 2: Compute lifecycle state
  const computed = computeLifecycleState(data)

  // Update DB if state changed
  if (computed !== data.current_state) {
    await supabase
      .from('deal_state')
      .update({
        current_state: computed,
        updated_at: new Date().toISOString(),
      })
      .eq('deal_id', dealId)
  }

  // Phase 2: Build timeline
  const timeline = buildTimeline(data)

  return NextResponse.json({
    deal_id: data.deal_id,
    binding_date: data.binding_date,
    purchase_price: data.purchase_price,
    earnest_money: {
      amount: data.earnest_money_amount,
      due_date: data.earnest_money_due_date,
    },
    financing: {
      type: data.financing_type,
    },
    inspection_period_days: data.inspection_period_days,
    inspection_end_date: data.inspection_end_date,
    appraisal_contingency: data.appraisal_contingency,
    closing_date: data.closing_date,
    possession_date: data.possession_date,
    current_state: computed,
    timeline,
  })
}
