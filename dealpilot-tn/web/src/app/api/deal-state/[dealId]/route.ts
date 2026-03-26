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

function buildTimeline(row: {
  inspection_end_date: string | null
  closing_date: string | null
}) {
  const timeline: { event: string; date: string }[] = []
  if (row.inspection_end_date) {
    timeline.push({ event: 'Inspection Ends', date: row.inspection_end_date })
  }
  if (row.closing_date) {
    timeline.push({ event: 'Closing Date', date: row.closing_date })
  }
  return timeline
}

async function resolveAgentName(userId?: string | null) {
  if (!userId) return null
  const { data: profile, error: profileErr } = await supabase
    .from('agent_profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()
  if (!profileErr && profile && profile.full_name) {
    const name = (profile.full_name || '').trim()
    if (name) return name
  }
  try {
    const { data: userData } = await getSupabase().auth.admin.getUserById(userId)
    if (userData && userData.user) {
      return userData.user.user_metadata?.full_name || userData.user.email || null
    }
  } catch (_e) {
    return null
  }
  return null
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
    // Fallback to transactions table when no deal_state row exists
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', dealId)
      .single()

    if (txErr || !tx) {
      // If no transaction/deal_state row, return empty JSON to avoid client JSON parsing errors
      return NextResponse.json({}, { status: 200 })
    }

    const bindingDate = (tx as any).binding || null
    const closingDate = (tx as any).closing || null
    const inspectionEndDate = (tx as any).inspection_end_date || null
    const purchasePrice = (tx as any).purchase_price || (tx as any).value || 0
    const computed = computeLifecycleState({ binding_date: bindingDate, inspection_end_date: inspectionEndDate, closing_date: closingDate })
    const timeline = buildTimeline({ inspection_end_date: inspectionEndDate, closing_date: closingDate })
    const integrity = validateLifecycleIntegrity({ binding_date: bindingDate, inspection_end_date: inspectionEndDate, closing_date: closingDate })
    const agent = await resolveAgentName((tx as any).user_id)

    return NextResponse.json({
      deal_id: tx.id,
      binding_date: bindingDate,
      agent: agent,
      closing_date: closingDate,
      inspection_end_date: inspectionEndDate,
      purchase_price: purchasePrice,
      buyer_names: (tx as any).buyer_names || null,
      seller_names: (tx as any).seller_names || null,
      earnest_money: { amount: (tx as any).earnest_money || null, due_date: null },
      financing: { type: null },
      inspection_period_days: null,
      appraisal_contingency: null,
      possession_date: null,
      current_state: computed,
      timeline,
      lifecycle_integrity: integrity,
    })
  }

  const computed = computeLifecycleState(data)
  const integrity = validateLifecycleIntegrity(data)
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', dealId)
    .single()
  const txRow = txErr ? null : tx
  const agent = await resolveAgentName((txRow as any)?.user_id)

  if (computed !== data.current_state) {
    await supabase
      .from('deal_state')
      .update({
        current_state: computed,
        updated_at: new Date().toISOString(),
      })
      .eq('deal_id', dealId)
  }

  const timeline = buildTimeline(data)

  return NextResponse.json({
    deal_id: data.deal_id,
    binding_date: data.binding_date,
    agent: agent,
    status: (txRow as any)?.status || null,
    purchase_price: (txRow as any)?.purchase_price || data.purchase_price || (txRow as any)?.value || 0,
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
    lifecycle_integrity: integrity,
  })
}
