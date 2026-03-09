import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeLifecycleState, validateLifecycleIntegrity } from '@/lib/deal-lifecycle'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

export async function GET(req: Request, { params }: { params: { dealId: string } }) {
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })

  const { data, error } = await supabase.from('deal_state').select('*').eq('deal_id', dealId).single()
  if (error || !data) return NextResponse.json({ error: 'Deal state not found', details: error?.message }, { status: 404 })

  const row = data as any
  const computed = computeLifecycleState(row)
  const integrity = validateLifecycleIntegrity(row)

  // Build base values
  const current_state = computed
  const binding_date = row.binding_date
  const inspection_end_date = row.inspection_end_date
  const closing_date = row.closing_date
  const purchase_price = row.purchase_price

  // Integrity override
  if (integrity && integrity.valid === false) {
    const first = (integrity.errors && integrity.errors.length>0) ? integrity.errors[0] : 'Integrity issue'
    return NextResponse.json([
      {
        title: 'Resolve contract date inconsistency',
        reason: first,
        urgency: 'high',
        consequence: 'Invalid contract logic may create compliance risk'
      }
    ])
  }

  const priorities: { title: string; reason: string; urgency: 'low'|'medium'|'high'; consequence: string }[] = []

  if (current_state === 'draft') {
    priorities.push({ title: 'Finalize and bind contract', reason: 'Deal is still in draft state', urgency: 'high', consequence: 'Without binding, deadlines cannot begin' })
  } else if (current_state === 'binding') {
    if (inspection_end_date) {
      priorities.push({ title: 'Schedule inspection', reason: 'Inspection period has begun', urgency: 'medium', consequence: 'Missing inspection may limit negotiation rights' })
    }
  } else if (current_state === 'inspection_period') {
    if (inspection_end_date) {
      const days = Math.ceil((new Date(inspection_end_date).getTime() - Date.now()) / (1000*60*60*24))
      if (days <= 2) {
        priorities.push({ title: 'Confirm inspection resolution', reason: 'Inspection period ending soon', urgency: 'high', consequence: 'Failure to respond may waive contingencies' })
      } else {
        priorities.push({ title: 'Monitor inspection timeline', reason: 'Inspection period active', urgency: 'medium', consequence: 'Missing deadline affects buyer protections' })
      }
    } else {
      priorities.push({ title: 'Monitor inspection timeline', reason: 'Inspection period active', urgency: 'medium', consequence: 'Missing deadline affects buyer protections' })
    }
  } else if (current_state === 'post_inspection') {
    if (closing_date) {
      const days = Math.ceil((new Date(closing_date).getTime() - Date.now()) / (1000*60*60*24))
      if (days <= 7) {
        priorities.push({ title: 'Prepare for closing', reason: 'Closing approaching', urgency: 'high', consequence: 'Unresolved items may delay funding' })
      } else {
        priorities.push({ title: 'Confirm lender & title readiness', reason: 'Post-inspection phase active', urgency: 'medium', consequence: 'Clear-to-close status required before settlement' })
      }
    } else {
      priorities.push({ title: 'Confirm lender & title readiness', reason: 'Post-inspection phase active', urgency: 'medium', consequence: 'Clear-to-close status required before settlement' })
    }
  } else if (current_state === 'closed') {
    // return empty
  }

  return NextResponse.json(priorities)
}
