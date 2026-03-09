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

// Reuse priority logic inline (deterministic, same as deal-priorities)
function topPriorityForRow(row:any){
  const computed = computeLifecycleState(row)
  const integrity = validateLifecycleIntegrity(row)
  if (integrity && integrity.valid === false){
    const first = (integrity.errors && integrity.errors.length>0)? integrity.errors[0] : 'Integrity issue'
    return { title: 'Resolve contract date inconsistency', reason: first, urgency: 'high', consequence: 'Invalid contract logic may create compliance risk' }
  }
  if (computed === 'draft') return { title: 'Finalize and bind contract', reason: 'Deal is still in draft state', urgency: 'high', consequence: 'Without binding, deadlines cannot begin' }
  if (computed === 'binding'){
    if (row.inspection_end_date) return { title: 'Schedule inspection', reason: 'Inspection period has begun', urgency: 'medium', consequence: 'Missing inspection may limit negotiation rights' }
  }
  if (computed === 'inspection_period'){
    if (row.inspection_end_date){
      const days = Math.ceil((new Date(row.inspection_end_date).getTime() - Date.now())/(1000*60*60*24))
      if (days <= 2) return { title: 'Confirm inspection resolution', reason: 'Inspection period ending soon', urgency: 'high', consequence: 'Failure to respond may waive contingencies' }
      return { title: 'Monitor inspection timeline', reason: 'Inspection period active', urgency: 'medium', consequence: 'Missing deadline affects buyer protections' }
    }
    return { title: 'Monitor inspection timeline', reason: 'Inspection period active', urgency: 'medium', consequence: 'Missing deadline affects buyer protections' }
  }
  if (computed === 'post_inspection'){
    if (row.closing_date){
      const days = Math.ceil((new Date(row.closing_date).getTime() - Date.now())/(1000*60*60*24))
      if (days <= 7) return { title: 'Prepare for closing', reason: 'Closing approaching', urgency: 'high', consequence: 'Unresolved items may delay funding' }
      return { title: 'Confirm lender & title readiness', reason: 'Post-inspection phase active', urgency: 'medium', consequence: 'Clear-to-close status required before settlement' }
    }
    return { title: 'Confirm lender & title readiness', reason: 'Post-inspection phase active', urgency: 'medium', consequence: 'Clear-to-close status required before settlement' }
  }
  return null
}

export async function GET(req: Request, { params }: { params: { dealId: string } }){
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })

  const { data, error } = await supabase.from('deal_state').select('*').eq('deal_id', dealId).single()
  if (error || !data) return NextResponse.json({ error: 'Deal state not found', details: error?.message }, { status: 404 })

  const row = data as any
  const state = computeLifecycleState(row)
  // derive state_label mapping
  const labelMap:any = { draft: 'New', binding: 'Under Contract', inspection_period: 'Inspection', post_inspection: 'Post-Inspection', closed: 'Closed' }
  const state_label = labelMap[state] || state

  // health logic reuse (deterministic)
  let healthStatus = 'healthy'; let healthScore = 90; let healthSignals:any[] = []
  const integrity = validateLifecycleIntegrity(row)
  if (integrity && integrity.valid === false){
    healthStatus = 'at_risk'; healthScore = 30; healthSignals.push({ label: (integrity.errors && integrity.errors[0]) || 'Integrity issue', impact: 'high' })
  } else if (state === 'closed') { healthStatus = 'healthy'; healthScore = 100 }
  else if (state === 'draft') { healthStatus = 'attention'; healthScore = 60; healthSignals.push({ label: 'Contract not yet bound', impact: 'medium' }) }
  else if (row.inspection_end_date){ const days = Math.ceil((new Date(row.inspection_end_date).getTime() - Date.now())/(1000*60*60*24)); if (days <=2){ healthStatus='attention'; healthScore=65; healthSignals.push({ label: 'Inspection period ending soon', impact: 'medium' }) }}
  if (healthStatus === 'healthy' && row.closing_date){ const cdays = Math.ceil((new Date(row.closing_date).getTime() - Date.now())/(1000*60*60*24)); if (cdays <=7){ healthStatus='attention'; healthScore=70; healthSignals.push({ label: 'Closing approaching', impact: 'medium' }) }}

  // top priority
  const top = topPriorityForRow(row)
  const primary_focus = top ? top.title : 'No action required at this time.'

  const greeting = 'Good morning.'
  let summary = ''
  if (healthStatus === 'healthy') summary = `Deal is in ${state_label}. Overall health is stable.`
  else if (healthStatus === 'attention') summary = `Deal is in ${state_label}. This deal needs attention.`
  else summary = `Deal is in ${state_label}. There is a contract issue requiring review.`

  return NextResponse.json({ greeting, summary, primary_focus })
}
