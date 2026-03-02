import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeLifecycleState, validateLifecycleIntegrity } from '@/lib/deal-lifecycle'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: Request, { params }: { params: { dealId: string } }){
  const dealId = parseInt(params.dealId, 10)
  if (isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal_id' }, { status: 400 })

  const { data, error } = await supabase.from('deal_state').select('*').eq('deal_id', dealId).single()
  if (error || !data) return NextResponse.json({ error: 'Deal state not found', details: error?.message }, { status: 404 })

  const row = data as any
  const current_state = computeLifecycleState(row)
  const integrity = validateLifecycleIntegrity(row)

  // Rule 1: integrity override
  if (integrity && integrity.valid === false) {
    const first = (integrity.errors && integrity.errors.length>0) ? integrity.errors[0] : 'Integrity issue'
    return NextResponse.json({ status: 'at_risk', score: 30, signals: [{ label: first, impact: 'high' }] })
  }

  // Rule 2: closed
  if (current_state === 'closed') {
    return NextResponse.json({ status: 'healthy', score: 100, signals: [] })
  }

  // Rule 3: draft
  if (current_state === 'draft') {
    return NextResponse.json({ status: 'attention', score: 60, signals: [{ label: 'Contract not yet bound', impact: 'medium' }] })
  }

  const signals: { label: string, impact: 'low'|'medium'|'high' }[] = []

  // helper: days past (positive if past due)
  const daysPast = (d?: string|null) => { if(!d) return 0; const t = new Date(d).getTime(); if(isNaN(t)) return 0; return Math.ceil((Date.now() - t)/(1000*60*60*24)) }

  // base score
  let score = 90

  // Rule 4: inspection_end_date within 2 days (FUTURE ONLY)
  if (row.inspection_end_date){
    const daysUntil = Math.ceil((new Date(row.inspection_end_date).getTime() - Date.now())/(1000*60*60*24))
    if (daysUntil >= 0 && daysUntil <= 2) {
      signals.push({ label: 'Inspection period ending soon', impact: 'medium' })
      score = Math.min(80, score)
      return NextResponse.json({ status: 'attention', score: 65, signals })
    }
  }

  // Rule: past-due inspection should penalize
  if (row.inspection_end_date){
    const past = daysPast(row.inspection_end_date)
    if (past > 0) {
      signals.push({ label: 'Inspection period overdue', impact: 'high' })
      score = Math.max(0, score - 25)
    }
  }

  // Rule 5: closing_date within 7 days (FUTURE ONLY)
  if (row.closing_date){
    const days = Math.ceil((new Date(row.closing_date).getTime() - Date.now())/(1000*60*60*24))
    if (days >= 0 && days <= 7) {
      signals.push({ label: 'Closing approaching', impact: 'medium' })
      score = Math.min(85, score)
      return NextResponse.json({ status: 'attention', score: 70, signals })
    }
  }

  // earnest money due past-due check (if earnest_money_due field exists)
  if (row.earnest_money_due){
    const past = daysPast(row.earnest_money_due)
    if (past > 0) {
      signals.push({ label: 'Earnest money overdue', impact: 'high' })
      score = Math.max(0, score - 20)
    }
  }

  // clamp score and determine status
  if (score < 0) score = 0
  let status = 'healthy'
  if (score < 60) status = 'at_risk'
  else if (score < 80) status = 'attention'

  return NextResponse.json({ status, score, signals })
}
